const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const FILE = path.join(__dirname, '..', 'focus-json.html');
const START = '// === prepCore 开始 ===';
const END = '// === prepCore 结束 ===';

// prepCore 是主 script 里靠注释哨兵圈出来的一段纯函数,单独编译出来测
function loadPrepCore() {
    const html = fs.readFileSync(FILE, 'utf8');
    const start = html.indexOf(START);
    const end = html.indexOf(END);
    assert.ok(start >= 0, FILE + ' 中必须存在 ' + START);
    assert.ok(end > start, FILE + ' 中必须存在 ' + END);
    const src = html.slice(start + START.length, end);
    // 在当前 realm 里编译,返回值才能和断言里的字符串/数组直接比较
    const factory = vm.runInThisContext(
        '(function (globalThis) {' + src +
        '\nreturn { dropTranslatedFromHeader, stripTranslateNoise, ensureSentenceEnd, prepareForTranslate, EN_SENTENCE_SPLIT_RE, CN_SENTENCE_SPLIT_RE };})',
        { filename: 'prepCore.js' }
    );
    return factory({});
}

const core = loadPrepCore();

// 用户报的原样文本:推文卡片,前面挂着一串头部
const CARD_LINES = [
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
];

test('粘贴:丢掉 Translated from 上方的头部,只留正文', () => {
    const card = CARD_LINES.join('\n');
    const body = card.slice(card.indexOf('Big gossip'));
    assert.equal(core.dropTranslatedFromHeader(card), body);
});

test('粘贴:用户报的整段挤成一行时也能切', () => {
    const oneLine = CARD_LINES.join(' ');
    const expected = CARD_LINES.slice(4).join(' ');
    // 短语分支只吃掉 "Translated from Chinese",它后面那个空格留在开头,
    // parsePlainText 会 trim,这里比掉
    assert.equal(core.dropTranslatedFromHeader(oneLine).trim(), expected);
});

test('粘贴:没有标注的普通文本原样保留', () => {
    const plain = 'Hello world.\nSecond line.';
    assert.equal(core.dropTranslatedFromHeader(plain), plain);
});

test('粘贴:标注后面没正文时不动原样', () => {
    const head = '@ndkywo\n·\n14h\nTranslated from Chinese\n';
    assert.equal(core.dropTranslatedFromHeader(head), head);
});

test('粘贴:大小写不敏感 / 多空格', () => {
    assert.equal(core.dropTranslatedFromHeader('@x\ntranslated  from  chinese\nHi.'), 'Hi.');
});

test('翻译前:星号去掉、连续感叹号收成一个', () => {
    assert.equal(core.stripTranslateNoise('a*b'), 'a b');
    // 每个 * 各换成一个空格,所以 ** 会留下两个,由 parsePlainText 的 \s+ → ' ' 收掉
    assert.equal(core.stripTranslateNoise('**a**').replace(/\s+/g, ' ').trim(), 'a');
    assert.equal(core.stripTranslateNoise('Wow!!! Great'), 'Wow! Great');
    assert.equal(core.stripTranslateNoise('Wow!! Great'), 'Wow! Great');
    assert.equal(core.stripTranslateNoise('single ! kept'), 'single ! kept');
});

test('分句前:行尾没有标点的补句号', () => {
    assert.equal(core.ensureSentenceEnd('no punctuation here'), 'no punctuation here.');
    assert.equal(core.ensureSentenceEnd('already done.'), 'already done.');
    assert.equal(core.ensureSentenceEnd('ends with bang!'), 'ends with bang!');
    // 全角标点同样算数
    assert.equal(core.ensureSentenceEnd('中文没有标点'), '中文没有标点.');
    assert.equal(core.ensureSentenceEnd('中文有标点。'), '中文有标点。');
    // 行尾有空白时先剥掉再判断,不然会被当成"有标点"
    assert.equal(core.ensureSentenceEnd('trailing space here   '), 'trailing space here.');
    // 空行 / 纯空白行不补
    assert.equal(core.ensureSentenceEnd('a\n\n   \nb'), 'a.\n\n   \nb.');
});

test('三步串起来:感叹号先收敛,补句号才看得见行尾', () => {
    // 顺序反过来会变成 'donkey.!',这条断言就是在盯顺序
    assert.equal(
        core.prepareForTranslate('Damn, this guy is a donkey!!!'),
        'Damn, this guy is a donkey!'
    );
    const out = core.prepareForTranslate('Gossip **alert** here\nlast line no punct');
    assert.equal(out.replace(/\s+/g, ' '), 'Gossip alert here. last line no punct.');
});

// 用户给的样例:英文单横线 / 中文双横线要跟 .?!; 和 。？！; 一样当断点
const EN_PAIR = 'The statement specifically names VPNs, proxy software, game accelerators, and foreign plugins, requiring that without approval from the relevant authorities, these tools must not be used to access restricted foreign websites; they must not be shared, lent out, or distributed—such as VPN tools, tutorials, or related accounts—and when discovering peers engaging in unauthorized VPN use, one should "timely and kindly advise them."';

const CN_PAIR = '该声明特别点名了vpn、代理软件、游戏加速器和国外插件，要求未经有关部门批准，不得使用这些工具访问受限制的国外网站；它们不能被分享、借出或分发——比如VPN工具、教程或相关帐户——当发现同伴参与未经授权的VPN使用时，应该“及时并友好地建议他们”。';

test('英文分句:横线算断点,横线后没空格也切得开', () => {
    const parts = EN_PAIR.split(core.EN_SENTENCE_SPLIT_RE).map(s => s.trim()).filter(Boolean);
    // 3 个断点(一个分号 + 两个横线)→ 4 段
    assert.equal(parts.length, 4);
    assert.ok(parts[0].endsWith('restricted foreign websites;'));
    assert.ok(parts[1].endsWith('lent out, or distributed—'));
    assert.ok(parts[2].endsWith('related accounts—'));
    assert.ok(parts[3].startsWith('and when discovering peers'));
});

test('中文分句:双横线算断点,而且只在第二个横线后切', () => {
    const parts = CN_PAIR.split(core.CN_SENTENCE_SPLIT_RE).map(s => s.trim()).filter(Boolean);
    assert.equal(parts.length, 4);
    assert.ok(parts[0].endsWith('国外网站；'));
    // "分发——" 完整留在前半段,不能被切成 "分发—" + "—比如"
    assert.ok(parts[1].endsWith('借出或分发——'));
    assert.ok(parts[2].endsWith('相关帐户——'));
    assert.ok(parts[3].startsWith('当发现同伴'));
});

test('分句:普通标点那套没被带坏', () => {
    assert.deepEqual(
        'One. Two! Three? Four;'.split(core.EN_SENTENCE_SPLIT_RE),
        ['One.', 'Two!', 'Three?', 'Four;']
    );
    assert.deepEqual(
        '一。二！三？四；'.split(core.CN_SENTENCE_SPLIT_RE),
        ['一。', '二！', '三？', '四；']
    );
});