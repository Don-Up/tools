const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const FILE = path.join(__dirname, '..', 'focus-table.html');
const START = '// === rubyCore 开始 ===';
const END = '// === rubyCore 结束 ===';

// rubyCore 是主 script 里靠注释哨兵圈出来的一段纯函数,单独编译出来测
function loadRubyCore() {
    const html = fs.readFileSync(FILE, 'utf8');
    const start = html.indexOf(START);
    const end = html.indexOf(END);
    assert.ok(start >= 0, FILE + ' 中必须存在 ' + START);
    assert.ok(end > start, FILE + ' 中必须存在 ' + END);
    const src = html.slice(start + START.length, end);
    const factory = vm.runInThisContext(
        '(function (globalThis) {' + src + '\nreturn { tokenizeCellText };})',
        { filename: 'rubyCore.js' }
    );
    return factory({});
}

const { tokenizeCellText } = loadRubyCore();

// 用户给的原样答案单元格
const ANSWER =
    'Really broken, but only half of it. The stretch style did land on the drop zone, ' +
    'and the boxes really did get taller. [[What]]stayed small}} was the ' +
    '[[button]]inside each box}}. ';

test('[[基词]]注音}} 拆成 ruby token', () => {
    assert.deepEqual(tokenizeCellText('[[What]]stayed small}}'), [
        { type: 'ruby', base: 'What', annot: 'stayed small' },
    ]);
});

test('注音里的 } 之后紧跟标点不会多吃', () => {
    assert.deepEqual(tokenizeCellText('the [[button]]inside each box}}.'), [
        { type: 'text', text: 'the ' },
        { type: 'ruby', base: 'button', annot: 'inside each box' },
        { type: 'text', text: '.' },
    ]);
});

test('用户给的整段:ruby 和普通文字交替', () => {
    const tokens = tokenizeCellText(ANSWER);
    const rubies = tokens.filter(t => t.type === 'ruby');
    assert.equal(rubies.length, 2);
    assert.deepEqual(rubies[0], { type: 'ruby', base: 'What', annot: 'stayed small' });
    assert.deepEqual(rubies[1], { type: 'ruby', base: 'button', annot: 'inside each box' });
    // 首尾的普通文字不能丢
    assert.equal(tokens[0].type, 'text');
    assert.ok(tokens[0].text.startsWith('Really broken'));
    // 第二个 ruby 后面还剩句号和空格
    assert.equal(tokens[tokens.length - 1].text, '. ');
});

test('反引号代码段没被带坏', () => {
    assert.deepEqual(tokenizeCellText('call `doThing()` now'), [
        { type: 'text', text: 'call ' },
        { type: 'code', text: 'doThing()' },
        { type: 'text', text: ' now' },
    ]);
});

test('ruby 和反引号混排', () => {
    assert.deepEqual(tokenizeCellText('a [[b]]c}} `d` e'), [
        { type: 'text', text: 'a ' },
        { type: 'ruby', base: 'b', annot: 'c' },
        { type: 'text', text: ' ' },
        { type: 'code', text: 'd' },
        { type: 'text', text: ' e' },
    ]);
});

test('注音可以跨换行(内容里带空格和换行)', () => {
    assert.deepEqual(tokenizeCellText('[[flex]]with no\nexplicit setting}}'), [
        { type: 'ruby', base: 'flex', annot: 'with no\nexplicit setting' },
    ]);
});

test('没闭合的 [[ 不当 ruby,原样留着', () => {
    assert.deepEqual(tokenizeCellText('an [[unclosed marker'), [
        { type: 'text', text: 'an [[unclosed marker' },
    ]);
});

test('空注音 [[基词]]}} 也能拆出来(渲染时降级成纯文字)', () => {
    assert.deepEqual(tokenizeCellText('x [[y]]}} z'), [
        { type: 'text', text: 'x ' },
        { type: 'ruby', base: 'y', annot: '' },
        { type: 'text', text: ' z' },
    ]);
});

test('没有标记的普通文本只出 text token', () => {
    assert.deepEqual(tokenizeCellText('plain text'), [{ type: 'text', text: 'plain text' }]);
    assert.deepEqual(tokenizeCellText(''), []);
});

test('连续调用不受正则 lastIndex 影响', () => {
    for (let i = 0; i < 3; i++) {
        assert.deepEqual(tokenizeCellText('[[a]]b}}'), [
            { type: 'ruby', base: 'a', annot: 'b' },
        ]);
    }
});