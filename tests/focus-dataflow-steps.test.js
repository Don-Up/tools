const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 桌面版与移动版共用同一套 parseCore,两边的解析行为必须一致
const TARGETS = [
    { name: 'focus-dataflow.html', file: path.join(__dirname, '..', 'focus-dataflow.html') },
    { name: 'focus-dataflow-mobile.html', file: path.join(__dirname, '..', 'focus-dataflow-mobile.html') },
];

function loadParseCore(file) {
    const html = fs.readFileSync(file, 'utf8');
    const m = html.match(/<script id="parseCore">([\s\S]*?)<\/script>/);
    assert.ok(m, file + ' 中必须存在 <script id="parseCore"> 块');
    // 在当前 realm 里编译,返回值才能和断言里的数组用同一个 Array.prototype 比较
    const factory = vm.runInThisContext(
        '(function (globalThis) {' + m[1] + '\nreturn globalThis.ParseCore;})',
        { filename: 'parseCore.js' }
    );
    return factory({});
}

for (const target of TARGETS) {
    test(target.name + ': normalizeStepLabel 归一化各种编号写法', () => {
        const core = loadParseCore(target.file);
        assert.equal(core.normalizeStepLabel('1'), '1');
        assert.equal(core.normalizeStepLabel('01'), '1');
        assert.equal(core.normalizeStepLabel('1-1'), '1-1');
        assert.equal(core.normalizeStepLabel('1-01'), '1-1');
        assert.equal(core.normalizeStepLabel('12-3'), '12-3');
        assert.equal(core.normalizeStepLabel('abc'), null);
        assert.equal(core.normalizeStepLabel(''), null);
        assert.equal(core.normalizeStepLabel(null), null);
    });

    test(target.name + ': splitStepLine 拆出编号、箭头与正文', () => {
        const core = loadParseCore(target.file);
        const a = core.splitStepLine('1-2   → (persist 触发) zustand 的 persist 中间件发现 nodes 变了');
        assert.equal(a.label, '1-2');
        assert.equal(a.arrow, '→');
        assert.equal(a.content, '(persist 触发) zustand 的 persist 中间件发现 nodes 变了');

        const b = core.splitStepLine('1-3        ↳ [挑要存的] partialize 只挑 nodes');
        assert.equal(b.label, '1-3');
        assert.equal(b.arrow, '↳');
        assert.equal(b.content, '[挑要存的] partialize 只挑 nodes');

        const c = core.splitStepLine('普通一行没有编号');
        assert.equal(c.label, null);
        assert.equal(c.arrow, '');
        assert.equal(c.content, '普通一行没有编号');
    });

    test(target.name + ': 日期开头的步骤行不会被当成复合编号', () => {
        const core = loadParseCore(target.file);
        const parts = core.splitStepLine('2024-01-01 数据流上线');
        assert.equal(parts.label, '2024');
        assert.equal(parts.content, '-01-01 数据流上线');

        const items = core.parseInput(['2024-01-01 数据流上线', '---', '{ "2024-01-01": "讲一" }'].join('\n'));
        assert.deepEqual(items[0].notes, [], '复合编号对不上就该丢弃');
    });

    test(target.name + ': parseCodeMarker 认得 // 1-1 与 // 01,不误判日期注释', () => {
        const core = loadParseCore(target.file);
        assert.equal(core.parseCodeMarker('// 1-1 用户改标题'), '1-1');
        assert.equal(core.parseCodeMarker('  // 2-12 persist 触发'), '2-12');
        assert.equal(core.parseCodeMarker('// 01 用户改标题'), '1');
        assert.equal(core.parseCodeMarker('// 2024-01-01 提交日期'), null);
        assert.equal(core.parseCodeMarker('const a = 1;'), null);
    });

    test(target.name + ': splitFileRefParts 把文件名、字段名与方括号注释分成三段', () => {
        const core = loadParseCore(target.file);
        assert.deepStrictEqual(
            core.splitFileRefParts('canvas-store.ts: nodes[画布上所有节点] / config[节点上用户改过的配置]'),
            [
                { text: 'canvas-store.ts:', kind: 'name' },
                { text: ' nodes', kind: 'text' },
                { text: '[画布上所有节点]', kind: 'annot' },
                { text: ' / config', kind: 'text' },
                { text: '[节点上用户改过的配置]', kind: 'annot' },
            ]
        );
        assert.deepStrictEqual(core.splitFileRefParts('没有冒号也没有方括号'), [
            { text: '没有冒号也没有方括号', kind: 'text' },
        ]);
        assert.deepStrictEqual(core.splitFileRefParts('a.ts: b[c]'), [
            { text: 'a.ts:', kind: 'name' },
            { text: ' b', kind: 'text' },
            { text: '[c]', kind: 'annot' },
        ]);
        assert.deepStrictEqual(core.splitFileRefParts(''), []);
    });

    test(target.name + ': isSeparatorLine 认得分节注释行', () => {
        const core = loadParseCore(target.file);
        assert.equal(
            core.isSeparatorLine('// ===== 📂 apps/web/src/features/canvas/canvas-store.ts(画布 zustand store：节点树 + 撤销栈 + 持久化) ====='),
            true
        );
        assert.equal(core.isSeparatorLine('  // ==== 分节 ===='), true);
        assert.equal(core.isSeparatorLine('// 01 用户改标题'), false);
        assert.equal(core.isSeparatorLine('// 普通注释'), false);
        assert.equal(core.isSeparatorLine('const a = 1;'), false);
    });

    test(target.name + ': 复合编号的步骤行与讲解按编号对齐', () => {
        const core = loadParseCore(target.file);
        const text = [
            '1-1 (用户改标题) config 写进节点',
            '1-2   → (persist 触发) zustand 的 persist 中间件发现 nodes 变了',
            '1-3        ↳ [挑要存的] partialize 只挑 nodes + rootChildren',
            '2-1 (用户刷新) 浏览器重新加载页面',
            '---',
            '{ "1-1": "改完标题", "1-2": "触发持久化", "1-3": "挑字段", "2-1": "页面重载" }',
        ].join('\n');
        const items = core.parseInput(text);
        assert.equal(items.length, 4);
        assert.deepEqual(items.map(i => i.label), ['1-1', '1-2', '1-3', '2-1']);
        assert.deepEqual(items.map(i => i.notes), [['改完标题'], ['触发持久化'], ['挑字段'], ['页面重载']]);
    });

    test(target.name + ': 讲解编号对不上步骤行时丢弃这条讲解', () => {
        const core = loadParseCore(target.file);
        const text = [
            '1-1 (用户改标题) config 写进节点',
            '1-2   → (persist 触发) 触发写入',
            '2-1 (用户刷新) 页面重载',
            '---',
            '{ "1-1": "改完标题", "1-2": "触发持久化", "2-2": "这步不存在" }',
        ].join('\n');
        const items = core.parseInput(text);
        assert.equal(items.length, 3);
        assert.deepEqual(items[0].notes, ['改完标题']);
        assert.deepEqual(items[1].notes, ['触发持久化']);
        assert.deepEqual(items[2].notes, []);
    });

    test(target.name + ': 纯数字 key 在步骤行有编号时按编号匹配', () => {
        const core = loadParseCore(target.file);
        const text = ['01 第一步', '02 第二步', '03 第三步', '---', '{ "1": "讲一", "3": "讲三" }'].join('\n');
        const items = core.parseInput(text);
        assert.deepEqual(items.map(i => i.label), ['1', '2', '3']);
        assert.deepEqual(items.map(i => i.notes), [['讲一'], [], ['讲三']]);
    });

    test(target.name + ': 纯数字 key 在步骤行没编号时退回按位置匹配', () => {
        const core = loadParseCore(target.file);
        const text = ['第一步', '第二步', '第三步', '---', '{ "1": "讲一", "2": "讲二" }'].join('\n');
        const items = core.parseInput(text);
        assert.deepEqual(items.map(i => i.label), [null, null, null]);
        assert.deepEqual(items.map(i => i.notes), [['讲一'], ['讲二'], []]);
    });

    test(target.name + ': Summary 落到编号最大的那一步', () => {
        const core = loadParseCore(target.file);
        const text = [
            '1-1 a', '1-2 b', '2-1 c',
            '---',
            '{ "1-1": "讲一", "1-2": "讲二", "2-1": "讲三", "Summary": "整体小结" }',
        ].join('\n');
        const items = core.parseInput(text);
        assert.deepEqual(items[0].notes, ['讲一']);
        assert.deepEqual(items[1].notes, ['讲二']);
        assert.deepEqual(items[2].notes, ['讲三', '整体小结']);
    });

    test(target.name + ': 纯数字步骤时 Summary 同样落到最后一步', () => {
        const core = loadParseCore(target.file);
        const text = ['01 a', '02 b', '---', '{ "1": "讲一", "2": "讲二", "Summary": "小结" }'].join('\n');
        const items = core.parseInput(text);
        assert.deepEqual(items[1].notes, ['讲二', '小结']);
    });

    test(target.name + ': 只有 JSON 时 Summary 挂到最后一张卡,不再单独占一张', () => {
        const core = loadParseCore(target.file);
        const items = core.parseInput('{ "1-1": "讲一", "1-2": "讲二", "Summary": "小结" }');
        assert.equal(items.length, 2);
        assert.deepEqual(items.map(i => i.label), ['1-1', '1-2']);
        assert.deepEqual(items[0].notes, ['讲一']);
        assert.deepEqual(items[1].notes, ['讲二', '小结']);
    });

    test(target.name + ': 没有步骤行也没有讲解时返回空数组', () => {
        const core = loadParseCore(target.file);
        assert.deepEqual(core.parseInput(''), []);
    });
}

// 注音:[[基词]]注音}} → <ruby>基词<rt>注音</rt></ruby>,目前只在桌面版实现
const DESKTOP_FILE = TARGETS[0].file;

test('focus-dataflow.html: parseTokens 把 [[基词]]注音}} 拆成 ruby', () => {
    const core = loadParseCore(DESKTOP_FILE);
    assert.deepStrictEqual(core.parseTokens('PreviewItem [[onDragStart]]拖拽开始}} 走这里'), [
        { type: 'text', text: 'PreviewItem ' },
        { type: 'ruby', base: 'onDragStart', annot: '拖拽开始' },
        { type: 'text', text: ' 走这里' },
    ]);
});

test('focus-dataflow.html: 一行里多个注音与文件引用同时存在', () => {
    const core = loadParseCore(DESKTOP_FILE);
    const line = '1-01 (拖容器) PreviewItem [[onDragStart]]拖拽开始}} → e.dataTransfer'
        + '.[[setData]]往浏览器口袋写一份拖拽数据}}("application/x-lowcode-id", "flex") <{preview-item.tsx}>';
    const parts = core.splitStepLine(line);
    assert.equal(parts.label, '1-01');
    // 箭头只在行首(编号之后)才算步骤箭头,这行里的 → 是正文的一部分
    assert.equal(parts.arrow, '');
    assert.deepStrictEqual(core.parseTokens(parts.content), [
        { type: 'text', text: '(拖容器) PreviewItem ' },
        { type: 'ruby', base: 'onDragStart', annot: '拖拽开始' },
        { type: 'text', text: ' → e.dataTransfer.' },
        { type: 'ruby', base: 'setData', annot: '往浏览器口袋写一份拖拽数据' },
        { type: 'text', text: '("application/x-lowcode-id", "flex") ' },
        { type: 'ref', parts: [{ text: 'preview-item.tsx', kind: 'text' }] },
    ]);
});

test('focus-dataflow.html: 没写 }} 的 [[基词]]只留基词,不吐原始标记', () => {
    const core = loadParseCore(DESKTOP_FILE);
    assert.deepStrictEqual(core.parseTokens('a[[setData]]b'), [
        { type: 'text', text: 'a' },
        { type: 'ruby', base: 'setData', annot: '' },
        { type: 'text', text: 'b' },
    ]);
});

test('focus-dataflow.html: 注音里的 }} 之后的内容不会被二次解析', () => {
    const core = loadParseCore(DESKTOP_FILE);
    assert.deepStrictEqual(core.parseTokens('[[fn]]调用 setTimeout() 的回调}} 结束'), [
        { type: 'ruby', base: 'fn', annot: '调用 setTimeout() 的回调' },
        { type: 'text', text: ' 结束' },
    ]);
});

test('focus-dataflow.html: 没有注音时 token 序列与原来一致', () => {
    const core = loadParseCore(DESKTOP_FILE);
    assert.deepStrictEqual(core.parseTokens('e.setData(1) <{a.ts: b[c]}>'), [
        { type: 'text', text: 'e' },
        { type: 'method', text: 'setData' },
        { type: 'text', text: '(1) ' },
        {
            type: 'ref',
            parts: [
                { text: 'a.ts:', kind: 'name' },
                { text: ' b', kind: 'text' },
                { text: '[c]', kind: 'annot' },
            ],
        },
    ]);
    assert.deepStrictEqual(core.parseTokens(''), []);
    assert.deepStrictEqual(core.parseTokens(null), []);
});

test('focus-dataflow.html: 页面里存在 ruby 渲染与样式', () => {
    const html = fs.readFileSync(DESKTOP_FILE, 'utf8');
    assert.match(html, /document\.createElement\('ruby'\)/);
    assert.match(html, /document\.createElement\('rt'\)/);
    assert.match(html, /\.flow-line ruby\s*\{/);
    assert.match(html, /\.flow-line rt\s*\{/);
});
