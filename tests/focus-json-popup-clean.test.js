const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

// content.js 是浏览器 content script,模块顶层只 document.addEventListener,
// 先把用到的那几个全局桩掉再 require
global.document = { addEventListener() {}, removeEventListener() {}, getElementById() { return null; } };
global.window = { addEventListener() {}, removeEventListener() {} };
global.navigator = {};

const { cleanSelection, dropTranslatedFromHeader } = require(path.join(__dirname, '..', 'focus-json-popup', 'content.js'));

// 用户报的原样选区:推文卡片,前面挂着一串头部
const TWITTER_CARD = [
    '@ndkywo',
    '·',
    '14h',
    'Translated from Chinese',
    'Big gossip alert! Classic blue-collar dude, classic academic Daji!',
    '',
    'Academics rely on her blue-collar boyfriend, romance relies on her puppy-dog sweetie.',
    '',
    'Suggest Tencent directly hire her boyfriend—work his own job during the day, finish with his girlfriend at night, then tackle her work!',
    '',
    "Damn, this blue-collar guy's a nuclear-powered donkey, the king of kings among workhorses!!!",
].join('\n');

const BODY = TWITTER_CARD.slice(TWITTER_CARD.indexOf('Big gossip'));

test('换行排版的推文卡片:丢掉标注上方,只留正文', () => {
    assert.equal(cleanSelection(TWITTER_CARD), BODY);
});

test('没有标注的普通选区原样保留(只走原有的清理)', () => {
    const plain = 'Hello world.\nSecond line.';
    assert.equal(cleanSelection(plain), plain);
});

test('整段挤成一行(几个 span 拼的)也能切', () => {
    const oneLine = TWITTER_CARD.replace(/\n+/g, ' ');
    assert.equal(cleanSelection(oneLine), BODY.replace(/\n+/g, ' '));
});

test('标注大小写不敏感', () => {
    assert.equal(
        cleanSelection('@x\ntranslated from chinese\nHello there.'),
        'Hello there.'
    );
});

test('标注和语言名之间是多个空格 / 不换行空白', () => {
    assert.equal(
        cleanSelection('@x\nTranslated  from  Chinese\nHello there.'),
        'Hello there.'
    );
});

test('标注后面没有正文时不动原样(免得弹出空窗口)', () => {
    const onlyHead = '@ndkywo\n·\n14h\nTranslated from Chinese\n';
    assert.equal(dropTranslatedFromHeader(onlyHead), onlyHead);
    assert.equal(dropTranslatedFromHeader('@ndkywo\nTranslated from Chinese'), '@ndkywo\nTranslated from Chinese');
});

test('正文里出现 Translated from 时以第一个标注为准', () => {
    const two = '@x\nTranslated from Chinese\nFirst part.\nTranslated from Chinese\nSecond part.';
    assert.equal(cleanSelection(two), 'First part.\nTranslated from Chinese\nSecond part.');
});

test('中文标注(YouTube 那种)不受 Translated from 逻辑影响', () => {
    const out = cleanSelection('原标题\n查看中文翻译\n\n正文在这里。');
    assert.ok(!out.includes('查看中文翻译'));
    assert.ok(out.includes('原标题'));
    assert.ok(out.includes('正文在这里。'));
});

test('cleanSelection 顺手做掉的原有清理没被带坏', () => {
    assert.equal(cleanSelection('"quoted" text'), 'quoted text');
    assert.equal(cleanSelection('“quoted” text'), 'quoted text');
    assert.equal(cleanSelection('a…b'), 'a. b');
    assert.equal(cleanSelection('Wow....Great'), 'Wow. Great');
    // 原空格 + 替换出的空格会留两个,归一化发生在 focus-json 分句那步的 \s+ → ' '
    assert.equal(cleanSelection('Wow.... Great'), 'Wow.  Great');
    assert.ok(!cleanSelection('x 查看中文翻译 y').includes('查看中文翻译'));
});