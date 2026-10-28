const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML_PATH = path.join(__dirname, '..', 'docs', 'study', 'mybatis-dialog.html');

function readHtml() {
    return fs.readFileSync(HTML_PATH, 'utf8');
}

function loadCore() {
    const html = readHtml();
    const m = html.match(/<script id="core">([\s\S]*?)<\/script>/);
    assert.ok(m, 'HTML 中必须存在 <script id="core"> 块');
    const sandbox = { console };
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(m[1], sandbox);
    return sandbox.MyBatisCore || vm.runInContext('MyBatisCore', sandbox);
}

test('页面引入四个 CDN 依赖并使用深色主题', () => {
    const html = readHtml();
    assert.match(html, /cdn\.tailwindcss\.com/);
    assert.match(html, /daisyui@4[^"']*full\.min\.css/);
    assert.match(html, /alpinejs@3[^"']*cdn\.min\.js/);
    assert.match(html, /animejs@3[^"']*anime\.min\.js/);
    assert.match(html, /<html[^>]*data-theme="night"/);
});

test('页面包含三栏布局的容器 id', () => {
    const html = readHtml();
    for (const id of ['lesson-list', 'dialog-stage', 'art-stage', 'progress-bar']) {
        assert.match(html, new RegExp(`id="${id}"`), `缺少 id=${id}`);
    }
});

test('core 块导出 toSpeech / pickVoice / LESSONS / QUIZ', () => {
    const core = loadCore();
    assert.equal(typeof core.toSpeech, 'function');
    assert.equal(typeof core.pickVoice, 'function');
    assert.ok(Array.isArray(core.LESSONS));
    assert.ok(Array.isArray(core.QUIZ));
});

test('toSpeech 把代码符号转成口语说法', () => {
    const { toSpeech } = loadCore();
    assert.equal(toSpeech('参数用 #{} 占位'), '参数用 占位符 占位');
    assert.equal(toSpeech('a && b'), 'a 并且 b');
    assert.equal(toSpeech('x -> y'), 'x 指向 y');
    assert.equal(toSpeech('list != null'), 'list 不等于 null');
    assert.equal(toSpeech('a || b'), 'a 或者 b');
    assert.equal(toSpeech('a * b'), 'a 星号 b');
    assert.equal(toSpeech('foo()'), 'foo 括号');
});

test('toSpeech 把 ${} 标成美元占位符', () => {
    const { toSpeech } = loadCore();
    assert.match(toSpeech('${name}'), /美元占位符/);
});

test('pickVoice 学生优先 Xiaoxiao、老师优先 Yunjian', () => {
    const { pickVoice } = loadCore();
    const voices = [
        { name: 'Microsoft Yunjian Online (Natural) - Chinese (Mainland)', voiceURI: 'yunjian', lang: 'zh-CN' },
        { name: 'Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)', voiceURI: 'xiaoxiao', lang: 'zh-CN' },
        { name: 'Default Voice', voiceURI: 'def', lang: 'en-US' },
    ];
    assert.equal(pickVoice(voices, 'student').voiceURI, 'xiaoxiao');
    assert.equal(pickVoice(voices, 'teacher').voiceURI, 'yunjian');
});

test('pickVoice 缺微软音色时退回中文音色再退回第一个', () => {
    const { pickVoice } = loadCore();
    const en = [{ name: 'Alex', voiceURI: 'alex', lang: 'en-US' }];
    assert.equal(pickVoice(en, 'student').voiceURI, 'alex');
    const zh = [{ name: 'Huihui', voiceURI: 'huihui', lang: 'zh-CN' }];
    assert.equal(pickVoice(zh, 'teacher').voiceURI, 'huihui');
});

test('共 12 课，编号连续，每课有标题、目标与对话', () => {
    const { LESSONS } = loadCore();
    assert.equal(LESSONS.length, 12);
    LESSONS.forEach((l, i) => {
        assert.equal(l.id, i + 1);
        assert.ok(l.title && l.title.length > 1, `第 ${l.id} 课缺标题`);
        assert.ok(l.goal && l.goal.length > 4, `第 ${l.id} 课缺目标`);
        assert.ok(Array.isArray(l.turns), `第 ${l.id} 课缺 turns`);
    });
});

test('每课对话学生占比在 30% 到 55% 之间且至少 4 句', () => {
    const { LESSONS } = loadCore();
    for (const l of LESSONS) {
        if (l.turns.length === 0) continue;
        assert.ok(l.turns.length >= 4, `第 ${l.id} 课对话过少`);
        const stu = l.turns.filter(t => t.role === 'student').length;
        const ratio = stu / l.turns.length;
        assert.ok(ratio >= 0.3 && ratio <= 0.55, `第 ${l.id} 课学生占比 ${ratio}`);
    }
});

test('每句对话都有 role 与文本，且 art 类型合法', () => {
    const { LESSONS } = loadCore();
    const legal = ['compare', 'relation', 'flow', 'data', 'mapping', 'code'];
    for (const l of LESSONS) {
        for (const t of l.turns) {
            assert.ok(['student', 'teacher'].includes(t.role), `第 ${l.id} 课 role 非法`);
            assert.ok(t.text && t.text.length > 2, `第 ${l.id} 课有空文本`);
        }
        if (l.art) assert.ok(legal.includes(l.art.type), `第 ${l.id} 课 art 类型非法: ${l.art.type}`);
    }
});

test('测验为 6 题四选一且有唯一正确项', () => {
    const { QUIZ } = loadCore();
    assert.equal(QUIZ.length, 6);
    for (const q of QUIZ) {
        assert.equal(q.options.length, 4);
        assert.ok(q.answer >= 0 && q.answer < 4);
        assert.ok(q.explain && q.explain.length > 10, '解析过短');
        assert.ok(q.lesson >= 1 && q.lesson <= 12, '缺少关联课号');
    }
});

test('core 提供朗读文本转换入口 speakText', () => {
    const core = loadCore();
    assert.equal(typeof core.speakText, 'function');
    assert.equal(core.speakText('用 #{} 传参'), '用 占位符 传参');
});

test('内容自检无问题', () => {
    const core = loadCore();
    const issues = core.validateContent(core.LESSONS, core.QUIZ);
    assert.equal(issues.length, 0, issues.join(' | '));
});

test('每课 art 载荷字段齐全，渲染时不会取到 undefined', () => {
    const { LESSONS } = loadCore();
    for (const l of LESSONS) {
        const a = l.art;
        if (!a) continue;
        if (a.type === 'compare') {
            assert.ok(Array.isArray(a.left) && a.left.length, `第 ${l.id} 课 compare 缺 left`);
            assert.ok(Array.isArray(a.right) && a.right.length, `第 ${l.id} 课 compare 缺 right`);
        } else if (a.type === 'relation') {
            assert.ok(Array.isArray(a.nodes) && a.nodes.length, `第 ${l.id} 课 relation 缺 nodes`);
            assert.ok(Array.isArray(a.edges), `第 ${l.id} 课 relation 缺 edges`);
            assert.equal(a.edges.length, a.nodes.length - 1, `第 ${l.id} 课 edges 数量与 nodes 不匹配`);
            a.nodes.forEach(n => assert.ok(n.label, `第 ${l.id} 课 node 缺 label`));
        } else if (a.type === 'flow') {
            assert.ok(Array.isArray(a.steps) && a.steps.length, `第 ${l.id} 课 flow 缺 steps`);
            a.steps.forEach(s => assert.ok(s.label, `第 ${l.id} 课 step 缺 label`));
        } else if (a.type === 'data') {
            assert.ok(Array.isArray(a.headers) && a.headers.length, `第 ${l.id} 课 data 缺 headers`);
            assert.ok(Array.isArray(a.rows) && a.rows.length, `第 ${l.id} 课 data 缺 rows`);
            a.rows.forEach(r => assert.equal(r.length, a.headers.length, `第 ${l.id} 课 data 列数不齐`));
        } else if (a.type === 'mapping') {
            assert.ok(Array.isArray(a.rows) && a.rows.length, `第 ${l.id} 课 mapping 缺 rows`);
            a.rows.forEach(r => {
                assert.ok(r.col && r.prop, `第 ${l.id} 课 mapping 行缺 col/prop`);
            });
        } else if (a.type === 'code') {
            assert.ok(typeof a.code === 'string' && a.code.length > 10, `第 ${l.id} 课 code 内容过短`);
        }
    }
});

test('页面内联脚本语法正确', () => {
    const html = readHtml();
    const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
    assert.ok(scripts.length >= 2, '应至少有 core 与 app 两段内联脚本');
    for (const s of scripts) {
        assert.doesNotThrow(() => new Function(s), '内联脚本存在语法错误');
    }
});

test('模板里调用的组件方法都在 app 组件里定义', () => {
    const html = readHtml();
    const appSrc = html.slice(html.indexOf('function app()'));
    const called = new Set();
    for (const m of html.matchAll(/@(?:click|change|input)="(?<![.\w$])([a-zA-Z_$][\w$]*)\(/g)) called.add(m[1]);
    for (const m of html.matchAll(/x-(?:text|show|model|html)="[^"]*?(?<![.\w$])([a-zA-Z_$][\w$]*)\(/g)) called.add(m[1]);
    for (const name of called) {
        assert.ok(appSrc.includes(name + '('), `模板调用了未定义的方法: ${name}`);
    }
});

/* ---- 用最小 DOM 桩驱动 Alpine 组件，验证对话引擎与测验逻辑 ---- */

function fakeEl() {
    return {
        innerHTML: '',
        scrollTop: 0,
        scrollHeight: 0,
        querySelector: () => null,
        querySelectorAll: () => [],
    };
}

function loadApp(sharedStore) {
    const html = readHtml();
    const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
    const core = scripts.find(s => s.includes('MyBatisCore'));
    const appSrc = scripts[scripts.length - 1];
    const store = sharedStore || {};
    const sandbox = {
        console,
        window: { addEventListener: () => {} },
        localStorage: {
            getItem: k => (k in store ? store[k] : null),
            setItem: (k, v) => { store[k] = String(v); },
        },
    };
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(core, sandbox);
    vm.runInContext(appSrc, sandbox);
    const component = sandbox.window.app();
    component.$refs = { dialogScroll: fakeEl(), artRoot: fakeEl() };
    component.$nextTick = fn => fn();
    component.$watch = () => {};
    return component;
}

test('展开对话：一句一句来，按钮文案随之变化', () => {
    const c = loadApp();
    c.init();
    assert.equal(c.revealed, 0);
    assert.equal(c.nextLabel, '下一句 ↓');
    c.reveal();
    assert.equal(c.revealed, 1);
    const total = c.turns.length;
    for (let i = 1; i < total; i++) c.reveal();
    assert.equal(c.revealed, total);
    assert.equal(c.dialogueDone, true);
    assert.equal(c.nextLabel, '下一课 →');
});

test('下一句按钮：对话没完就展开，对话完了就翻课', () => {
    const c = loadApp();
    c.init();
    c.next();
    assert.equal(c.revealed, 1);
    assert.equal(c.lessonIndex, 0);
    for (let i = 0; i < c.turns.length; i++) c.next();
    assert.equal(c.lessonIndex, 1, '对话讲完后再按应进入下一课');
    assert.equal(c.revealed, 0, '换课后对话应重置');
});

test('收起：往上键能收回上一句', () => {
    const c = loadApp();
    c.init();
    c.reveal();
    c.reveal();
    c.collapse();
    assert.equal(c.revealed, 1);
    c.collapse();
    assert.equal(c.revealed, 0);
    c.collapse();
    assert.equal(c.revealed, 0, '已是最上面，不应变成负数');
});

test('翻页：左右键切课，越界不动', () => {
    const c = loadApp();
    c.init();
    c.goLesson(2);
    assert.equal(c.lessonIndex, 2);
    c.goLesson(-1);
    assert.equal(c.lessonIndex, 2, '不应越界到负数');
    c.goLesson(99);
    assert.equal(c.lessonIndex, 2, '不应越界');
    c.onKey({ key: 'ArrowRight', target: { tagName: 'BODY' }, preventDefault() {} });
    assert.equal(c.lessonIndex, 3);
    c.onKey({ key: 'ArrowLeft', target: { tagName: 'BODY' }, preventDefault() {} });
    assert.equal(c.lessonIndex, 2);
});

test('在输入框里按方向键不触发翻页', () => {
    const c = loadApp();
    c.init();
    c.onKey({ key: 'ArrowRight', target: { tagName: 'SELECT' }, preventDefault() {} });
    assert.equal(c.lessonIndex, 0);
});

test('测验：答题后即时判分，答满给复习建议', () => {
    const c = loadApp();
    c.init();
    c.goLesson(11);
    assert.equal(c.isQuizLesson, true);
    assert.equal(c.quizDone, false);
    c.answerQuiz(0, c.QUIZ[0].answer);
    assert.equal(c.quizChoice[0], c.QUIZ[0].answer);
    assert.equal(c.quizScore, 1);
    c.answerQuiz(0, 0);
    assert.equal(c.quizChoice[0], c.QUIZ[0].answer, '已答过的题不该被改写');
    for (let i = 1; i < c.QUIZ.length; i++) {
        c.answerQuiz(i, (c.QUIZ[i].answer + 1) % 4);
    }
    assert.equal(c.quizDone, true);
    assert.equal(c.quizScore, 1);
    assert.match(c.quizAdvice, /复习第/);
    c.answerQuiz(0, 0);
    assert.equal(c.quizChoice[0], c.QUIZ[0].answer);
});

test('测验课重新进入时清空作答', () => {
    const c = loadApp();
    c.init();
    c.goLesson(11);
    c.answerQuiz(0, 0);
    c.goLesson(0);
    c.goLesson(11);
    assert.equal(c.quizAnsweredCount, 0);
});

test('语速与音色选择会存进 localStorage 并能读回', () => {
    const store = {};
    const c = loadApp(store);
    c.init();
    c.rate = 1.5;
    c.studentVoiceURI = 'xiaoxiao';
    c.teacherVoiceURI = 'yunjian';
    c.saveSettings();
    const c2 = loadApp(store);
    c2.init();
    assert.equal(c2.rate, 1.5);
    assert.equal(c2.studentVoiceURI, 'xiaoxiao');
    assert.equal(c2.teacherVoiceURI, 'yunjian');
});
