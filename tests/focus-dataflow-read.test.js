const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML_PATH = path.join(__dirname, '..', 'focus-dataflow.html');

function readHtml() {
    return fs.readFileSync(HTML_PATH, 'utf8');
}

function loadReadCore() {
    const html = readHtml();
    const m = html.match(/<script id="readCore">([\s\S]*?)<\/script>/);
    assert.ok(m, 'HTML 中必须存在 <script id="readCore"> 块');
    const sandbox = { console };
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(m[1], sandbox);
    return sandbox.ReadCore;
}

test('readCore 暴露约定的接口', () => {
    const core = loadReadCore();
    assert.equal(typeof core.resolveSourceUrl, 'function');
    assert.equal(typeof core.fetchText, 'function');
    assert.equal(typeof core.applyText, 'function');
    assert.equal(core.STORAGE_KEY, 'focusDataflowSource');
});

test('resolveSourceUrl 优先使用已保存的地址', () => {
    const core = loadReadCore();
    const loc = { protocol: 'http:', hostname: '192.168.2.101' };
    assert.equal(
        core.resolveSourceUrl('  http://10.0.0.1/a.txt  ', loc),
        'http://10.0.0.1/a.txt'
    );
});

test('resolveSourceUrl 在 http 局域网地址下返回相对路径', () => {
    const core = loadReadCore();
    const loc = { protocol: 'http:', hostname: '192.168.2.101' };
    assert.equal(core.resolveSourceUrl('', loc), 'dataflow.txt');
});

test('resolveSourceUrl 在非局域网来源下返回默认绝对地址', () => {
    const core = loadReadCore();
    const loc = { protocol: 'https:', hostname: 'don-up.github.io' };
    assert.equal(
        core.resolveSourceUrl('', loc),
        'http://192.168.2.101:8000/dataflow.txt'
    );
});

test('fetchText 成功时返回文本', async () => {
    const core = loadReadCore();
    const fake = async () => ({ ok: true, status: 200, text: async () => '01 hello' });
    const r = await core.fetchText('dataflow.txt', fake);
    assert.equal(r.ok, true);
    assert.equal(r.text, '01 hello');
});

test('fetchText 遇到非 2xx 返回错误', async () => {
    const core = loadReadCore();
    const fake = async () => ({ ok: false, status: 404, text: async () => '' });
    const r = await core.fetchText('missing.txt', fake);
    assert.equal(r.ok, false);
    assert.equal(r.error, 'HTTP 404');
});

test('fetchText 遇到空内容返回错误', async () => {
    const core = loadReadCore();
    const fake = async () => ({ ok: true, status: 200, text: async () => '   ' });
    const r = await core.fetchText('dataflow.txt', fake);
    assert.equal(r.ok, false);
    assert.equal(r.error, '内容为空');
});

test('fetchText 遇到网络异常返回错误信息', async () => {
    const core = loadReadCore();
    const fake = async () => { throw new Error('boom'); };
    const r = await core.fetchText('dataflow.txt', fake);
    assert.equal(r.ok, false);
    assert.equal(r.error, 'boom');
});

test('applyText 依次写入 lastPastedText、调用 loadText 并显示关闭按钮', () => {
    const core = loadReadCore();
    const calls = [];
    const r = core.applyText('01 hi', {
        setLastPasted: (v) => calls.push(['setLastPasted', v]),
        loadText: (v) => calls.push(['loadText', v]),
        showClose: () => calls.push(['showClose']),
    });
    assert.equal(r.ok, true);
    assert.deepEqual(calls, [
        ['setLastPasted', '01 hi'],
        ['loadText', '01 hi'],
        ['showClose'],
    ]);
});
