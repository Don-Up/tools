const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const FILE = path.join(__dirname, '..', 'cn2en-json.html');
const START = '// === reviewCore 开始 ===';
const END = '// === reviewCore 结束 ===';

// reviewCore 靠注释哨兵圈出来,单独编译出来测。
// 它依赖外层的 entries / currentIndex,这里用 wrapper 提供并暴露 setter。
function loadCore() {
    const html = fs.readFileSync(FILE, 'utf8');
    const start = html.indexOf(START);
    const end = html.indexOf(END);
    assert.ok(start >= 0, FILE + ' 中必须存在 ' + START);
    assert.ok(end > start, FILE + ' 中必须存在 ' + END);
    const src = html.slice(start + START.length, end);
    const factory = vm.runInThisContext(
        '(function (globalThis) {' +
        '  let entries = []; let currentIndex = 0;' +
        src +
        '\n  return { replaceEntries, reviewPreTarget,' +
        '    setEntries: (e) => { entries = e; },' +
        '    setIndex: (i) => { currentIndex = i; },' +
        '    getPrev: () => prevLoadLastEntry };})',
        { filename: 'reviewCore.js' }
    );
    return factory({});
}

// 上一篇
const PREV = [['昨天第一句', 'Yesterday one'], ['昨天最后一句', 'Yesterday last']];
// 当前这份
const CUR = [['今天第一句', 'Today one'], ['今天第二句', 'Today two'], ['今天第三句', 'Today three']];

test('第一句 → 第二句:复习上一篇的最后一句', () => {
    const c = loadCore();
    c.replaceEntries(PREV);      // 第一次加载,上一篇还没有
    c.replaceEntries(CUR);       // 上一篇 = PREV
    c.setIndex(0);
    assert.deepEqual(c.reviewPreTarget(), ['昨天最后一句', 'Yesterday last']);
});

test('第一句 → 第二句:没有上一篇时不复习', () => {
    const c = loadCore();
    c.replaceEntries(CUR);       // 第一次加载,前面是空的
    c.setIndex(0);
    assert.equal(c.reviewPreTarget(), null);
});

test('其余句子仍复习当前这份的前一句', () => {
    const c = loadCore();
    c.replaceEntries(PREV);
    c.replaceEntries(CUR);
    c.setIndex(1);
    assert.deepEqual(c.reviewPreTarget(), ['今天第一句', 'Today one']);
    c.setIndex(2);
    assert.deepEqual(c.reviewPreTarget(), ['今天第二句', 'Today two']);
});

test('第一句复习的是上一篇,第二句就切回当前这份', () => {
    const c = loadCore();
    c.replaceEntries(PREV);
    c.replaceEntries(CUR);
    c.setIndex(0);
    assert.deepEqual(c.reviewPreTarget(), ['昨天最后一句', 'Yesterday last']);
    c.setIndex(1);
    assert.deepEqual(c.reviewPreTarget(), ['今天第一句', 'Today one']);
});

test('连着加载三份:上一篇只认紧挨着的那一份', () => {
    const c = loadCore();
    c.replaceEntries(PREV);
    c.replaceEntries(CUR);
    const third = [['第三份', 'Third']];
    c.replaceEntries(third);
    c.setIndex(0);
    assert.deepEqual(c.reviewPreTarget(), ['今天第三句', 'Today three']);
});

test('空内容不会把上一篇清掉', () => {
    const c = loadCore();
    c.replaceEntries(PREV);
    c.replaceEntries([]);
    c.setIndex(0);
    assert.deepEqual(c.reviewPreTarget(), ['昨天最后一句', 'Yesterday last']);
});

test('索引越界时返回 null', () => {
    const c = loadCore();
    c.replaceEntries(CUR);
    c.setIndex(99);
    assert.equal(c.reviewPreTarget(), null);
});
