# focus-dataflow 移动端「读取」按钮实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `focus-dataflow.html` 在手机浏览器上能点一个「读取」按钮，从本地 Python 服务的 `dataflow.txt` 拉取数据流文本并直接渲染成页面。

**Architecture:** 新增 `tools/serve.py`，把本地数据目录（`Desktop/html`）与 `focus-dataflow.html` 挂到**同一个 origin**（`http://192.168.2.101:8000`），使页面用相对路径 `fetch('dataflow.txt')` 天然同源，绕开 GitHub Pages(HTTPS) 页面对内网 http 资源的混合内容拦截。页面侧新增一个纯逻辑 `<script id="readCore">` 块（可被 node:test 提取到 vm 沙箱里测），主脚本负责按钮 UI 与把文本喂给现有的 `loadText`。

**Tech Stack:** Python 3.13 标准库（`http.server`、`unittest`）、Node.js 24 内置 `node:test` + `node:assert/strict`、原生 HTML/CSS/JS（无框架、无构建步骤）。

**设计文档：** `docs/superpowers/specs/2026-10-20-focus-dataflow-read-button-design.md`

---

## 环境与约束

- 仓库根：`C:\Users\10691\Documents\GitHub\html-tools`（下文所有相对路径以此为根）
- 数据目录：`C:\Users\10691\Desktop\html`（含 `dataflow.txt`、`viewer.html`）
- **仓库工作区有大量不属于本任务的未提交改动**（`alert.py` 已暂存、多个 `docs/`、`card-timer-sidebar/` 等）。每次提交必须用 `git commit --only <文件...>`，绝不能用 `git commit -a` 或裸 `git commit`（否则会把你暂存的内容一起提交）。已验证 `--only` 对新增文件同样有效。
- 当前有一个 `python -m http.server 8000` 在后台占用 8000 端口（上一个会话启动的），Task 4 需要先停掉它。
- 目标文件是 `focus-dataflow.html`；仓库里**没有** `focus-data.html`。

## 文件结构

| 文件 | 动作 | 职责 |
|---|---|---|
| `tools/serve.py` | 新建 | 同源静态服务器：静态根 + 固定路径映射 + CORS 头 |
| `tools/test_serve.py` | 新建 | serve.py 的单元测试（映射、CORS、预检、404） |
| `focus-dataflow.html` | 修改 | `<script id="readCore">` 纯逻辑块 + 读取按钮 UI + 主脚本接线 |
| `tests/focus-dataflow-read.test.js` | 新建 | readCore 逻辑测试 + 页面结构断言 |

---

## Task 1: 同源服务器 `tools/serve.py`

**Files:**
- Create: `tools/serve.py`
- Create: `tools/test_serve.py`

- [ ] **Step 1: 写失败测试 `tools/test_serve.py`**

```python
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import serve  # noqa: E402


class ServeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.data_root = Path(self.tmp.name)
        (self.data_root / "dataflow.txt").write_text("01 hello", encoding="utf-8")
        handler = partial(
            serve.CORSHandler,
            directory=str(self.data_root),
            extra_files=serve.EXTRA_FILES,
        )
        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        self.port = self.httpd.server_address[1]
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.thread.join(timeout=5)
        self.tmp.cleanup()

    def url(self, path):
        return f"http://127.0.0.1:{self.port}{path}"

    def test_serves_file_from_data_root(self):
        with urllib.request.urlopen(self.url("/dataflow.txt")) as r:
            self.assertEqual(r.status, 200)
            self.assertEqual(r.read().decode("utf-8"), "01 hello")

    def test_serves_mapped_file(self):
        target = serve.EXTRA_FILES["/focus-dataflow.html"]
        with urllib.request.urlopen(self.url("/focus-dataflow.html")) as r:
            self.assertEqual(r.status, 200)
            self.assertEqual(r.read(), target.read_bytes())

    def test_alias_path_serves_mapped_file(self):
        with urllib.request.urlopen(self.url("/focus-data.html")) as r:
            self.assertEqual(r.status, 200)

    def test_adds_cors_header(self):
        with urllib.request.urlopen(self.url("/dataflow.txt")) as r:
            self.assertEqual(r.headers.get("Access-Control-Allow-Origin"), "*")

    def test_options_preflight_returns_204(self):
        req = urllib.request.Request(self.url("/dataflow.txt"), method="OPTIONS")
        with urllib.request.urlopen(req) as r:
            self.assertEqual(r.status, 204)
            self.assertEqual(
                r.headers.get("Access-Control-Allow-Methods"), "GET, HEAD, OPTIONS"
            )

    def test_unknown_path_returns_404(self):
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(self.url("/nope.txt"))
        self.assertEqual(ctx.exception.code, 404)


@unittest.skipUnless(serve.DATA_ROOT.is_dir(), "本机数据目录不存在")
class DefaultConfigTests(unittest.TestCase):
    def test_default_data_root_contains_dataflow(self):
        self.assertTrue((serve.DATA_ROOT / "dataflow.txt").is_file())


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `python -m unittest discover -s tools -p "test_*.py" -v`
Expected: FAIL —— `ModuleNotFoundError: No module named 'serve'`

- [ ] **Step 3: 实现 `tools/serve.py`**

```python
"""同源静态服务器。

把「本地数据目录」(dataflow.txt、viewer.html 等) 与 focus-dataflow 页面挂到同一个
origin,使页面可以用相对路径 fetch('dataflow.txt')。

动机:focus-dataflow 部署在 GitHub Pages(HTTPS),HTTPS 页面 fetch 内网 http 资源会被
浏览器的混合内容策略拦截,加 CORS 头也无效。同源提供服务可以同时绕开混合内容与
跨域两个问题。

用法:
    python tools/serve.py [--host 0.0.0.0] [--port 8000] [--data-root DIR]
"""

from __future__ import annotations

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

TOOLS_DIR = Path(__file__).resolve().parent
REPO_ROOT = TOOLS_DIR.parent

# 本机数据目录:存放 dataflow.txt、viewer.html 等
DATA_ROOT = Path(r"C:\Users\10691\Desktop\html")

# URL 路径 -> 本地文件
EXTRA_FILES = {
    "/focus-dataflow.html": REPO_ROOT / "focus-dataflow.html",
    "/focus-data.html": REPO_ROOT / "focus-dataflow.html",
}


class CORSHandler(SimpleHTTPRequestHandler):
    """静态文件服务 + CORS 头 + 固定路径映射。"""

    def __init__(self, *args, directory, extra_files=None, **kwargs):
        # 必须在 super().__init__ 之前赋值:BaseHTTPRequestHandler.__init__ 会立刻
        # 调用 handle(),那时 translate_path 已经被用到了。
        self.extra_files = dict(extra_files or {})
        super().__init__(*args, directory=directory, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def translate_path(self, path):
        clean = unquote(urlparse(path).path)
        target = self.extra_files.get(clean)
        if target is not None:
            return str(target)
        return super().translate_path(path)


def build_server(host, port, data_root, extra_files):
    handler = partial(
        CORSHandler, directory=str(data_root), extra_files=extra_files
    )
    return ThreadingHTTPServer((host, port), handler)


def main():
    parser = argparse.ArgumentParser(description="focus-dataflow 同源静态服务器")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--data-root", default=str(DATA_ROOT))
    args = parser.parse_args()

    data_root = Path(args.data_root)
    if not data_root.is_dir():
        raise SystemExit(f"数据目录不存在: {data_root}")

    httpd = build_server(args.host, args.port, data_root, EXTRA_FILES)
    print(
        f"serving {data_root} + {len(EXTRA_FILES)} mapped file(s) "
        f"on http://{args.host}:{args.port}",
        flush=True,
    )
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `python -m unittest discover -s tools -p "test_*.py" -v`
Expected: PASS —— 7 个测试全部 OK（6 个 `ServeTests` + 1 个 `DefaultConfigTests`）

- [ ] **Step 5: 提交**

```bash
git add tools/serve.py tools/test_serve.py
git commit --only tools/serve.py tools/test_serve.py -m "Add same-origin static server for focus-dataflow

Serve the local data directory and focus-dataflow.html from one origin so
the page can fetch dataflow.txt without mixed-content or CORS issues."
```

---

## Task 2: `focus-dataflow.html` 的 readCore 纯逻辑块

**Files:**
- Create: `tests/focus-dataflow-read.test.js`
- Modify: `focus-dataflow.html`（在主 `<script>` 之前插入 `<script id="readCore">`）

- [ ] **Step 1: 写失败测试 `tests/focus-dataflow-read.test.js`**

```javascript
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
```

> 注：跨 vm realm 的对象原型不同，`assert.deepEqual` 只用于宿主 realm 里创建的 `calls` 数组；对 `fetchText`/`applyText` 的返回值一律用属性断言。

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test tests/focus-dataflow-read.test.js`
Expected: FAIL —— `HTML 中必须存在 <script id="readCore"> 块`（7 个测试中前 7 个全部失败）

- [ ] **Step 3: 在 `focus-dataflow.html` 插入 readCore 块**

在 `focus-dataflow.html` 中找到主脚本的起始行 `<script>`（紧跟 `<div id="codeHint" ...>` 之后那一行），在它**之前**插入：

```html
    <script id="readCore">
        (function () {
            'use strict';
            const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
            const DEFAULT_SOURCE_URL = 'http://192.168.2.101:8000/dataflow.txt';
            const RELATIVE_SOURCE = 'dataflow.txt';
            const STORAGE_KEY = 'focusDataflowSource';

            function resolveSourceUrl(saved, loc) {
                const raw = typeof saved === 'string' ? saved.trim() : '';
                if (raw) return raw;
                const protocol = (loc && loc.protocol) || '';
                const hostname = (loc && loc.hostname) || '';
                if (protocol === 'http:' && IPV4.test(hostname)) return RELATIVE_SOURCE;
                return DEFAULT_SOURCE_URL;
            }

            async function fetchText(url, fetchImpl) {
                const f = fetchImpl || (typeof fetch === 'function' ? fetch : null);
                if (!f) return { ok: false, error: '当前环境不支持 fetch' };
                let res;
                try {
                    res = await f(url, { cache: 'no-store' });
                } catch (err) {
                    return { ok: false, error: (err && err.message) || String(err) };
                }
                if (!res.ok) return { ok: false, error: 'HTTP ' + res.status };
                let text;
                try {
                    text = await res.text();
                } catch (err) {
                    return { ok: false, error: (err && err.message) || String(err) };
                }
                if (!text || !text.trim()) return { ok: false, error: '内容为空' };
                return { ok: true, text: text };
            }

            function applyText(text, deps) {
                if (!text || !text.trim()) return { ok: false, error: '内容为空' };
                deps.setLastPasted(text);
                deps.loadText(text);
                deps.showClose();
                return { ok: true };
            }

            globalThis.ReadCore = {
                DEFAULT_SOURCE_URL: DEFAULT_SOURCE_URL,
                RELATIVE_SOURCE: RELATIVE_SOURCE,
                STORAGE_KEY: STORAGE_KEY,
                resolveSourceUrl: resolveSourceUrl,
                fetchText: fetchText,
                applyText: applyText,
            };
        })();
    </script>
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `node --test tests/focus-dataflow-read.test.js`
Expected: PASS —— 7 tests passed

- [ ] **Step 5: 提交**

```bash
git add tests/focus-dataflow-read.test.js focus-dataflow.html
git commit --only tests/focus-dataflow-read.test.js focus-dataflow.html -m "Add readCore logic block for loading dataflow from a URL"
```

---

## Task 3: 读取按钮 UI 与接线

**Files:**
- Modify: `focus-dataflow.html`（CSS、HTML 按钮、toast 元素、主脚本接线、hint 文案）
- Modify: `tests/focus-dataflow-read.test.js`（追加结构断言）

- [ ] **Step 1: 追加失败测试**

在 `tests/focus-dataflow-read.test.js` 末尾追加：

```javascript
test('页面包含读取按钮、toast 与移动端媒体查询', () => {
    const html = readHtml();
    assert.match(html, /id="readBtn"/);
    assert.match(html, /id="readToast"/);
    assert.match(html, /@media \(max-width: 600px\)/);
    assert.match(html, /#readBtn\s*\{/);
    assert.match(html, /\.read-toast\s*\{/);
});

test('读取按钮绑定点击与长按事件', () => {
    const html = readHtml();
    assert.match(html, /readBtn\.addEventListener\('click'/);
    assert.match(html, /readBtn\.addEventListener\('pointerdown'/);
});

test('读取按钮走的是与粘贴相同的 loadText 逻辑', () => {
    const html = readHtml();
    const m = html.match(/function applyRemoteText\(text\)\s*\{([\s\S]*?)\n        \}/);
    assert.ok(m, '缺少 applyRemoteText 函数');
    assert.match(m[1], /setLastPasted/);
    assert.match(m[1], /loadText/);
    assert.match(m[1], /showClose/);
});

test('空状态提示提到读取按钮', () => {
    const html = readHtml();
    const m = html.match(/<div class="hint" id="hint">([\s\S]*?)<\/div>/);
    assert.ok(m, '缺少 hint 元素');
    assert.match(m[1], /读取/);
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test tests/focus-dataflow-read.test.js`
Expected: FAIL —— 4 个新测试失败（`id="readBtn"` 匹配不到）

- [ ] **Step 3: 加 CSS**

在 `focus-dataflow.html` 的 CSS 中，紧跟 `#closeBtn.visible { display: block; }` 这一行之后插入：

```css

        #readBtn {
            position: fixed;
            top: 16px;
            left: 16px;
            height: 36px;
            padding: 0 14px;
            background: rgba(40, 40, 40, 0.85);
            color: #e0e0e0;
            border: 1px solid #555;
            border-radius: 4px;
            cursor: pointer;
            font-size: 15px;
            line-height: 1;
            z-index: 100;
            font-family: inherit;
        }
        #readBtn:hover {
            background: rgba(60, 60, 60, 0.95);
            color: #fff;
            border-color: #00BFFF;
        }
        #readBtn:disabled {
            opacity: 0.6;
            cursor: default;
        }

        .read-toast {
            position: fixed;
            left: 50%;
            bottom: 28px;
            transform: translateX(-50%);
            max-width: 80vw;
            padding: 10px 16px;
            background: rgba(60, 30, 30, 0.92);
            color: #ffcdd2;
            border: 1px solid #7a3b3b;
            border-radius: 6px;
            font-size: 14px;
            z-index: 200;
            display: none;
        }
        .read-toast.show { display: block; }

        @media (max-width: 600px) {
            #readBtn {
                height: 44px;
                font-size: 16px;
                padding: 0 18px;
            }
        }
```

- [ ] **Step 4: 加按钮与 toast 元素**

在 `focus-dataflow.html` 的 `<button id="closeBtn" title="Close">×</button>` 这一行**之后**插入：

```html
    <button id="readBtn" type="button" title="读取本地数据流文件（长按可修改地址）">读取</button>
    <div id="readToast" class="read-toast"></div>
```

- [ ] **Step 5: 更新空状态提示**

把

```html
        <div class="hint" id="hint">按 <kbd>Ctrl</kbd> + <kbd>V</kbd> 粘贴数据流文本<br>可选:用 <kbd>---</kbd> 分隔后追加 JSON 讲解</div>
```

替换为

```html
        <div class="hint" id="hint">按 <kbd>Ctrl</kbd> + <kbd>V</kbd> 粘贴数据流文本<br>手机上点左上角<b>读取</b>按钮从本地服务加载<br>可选:用 <kbd>---</kbd> 分隔后追加 JSON 讲解</div>
```

- [ ] **Step 6: 主脚本接线**

在 `focus-dataflow.html` 的主脚本中，找到

```javascript
        closeBtn.addEventListener('click', () => {
            stopSpeaking();
            window.parent.postMessage({ type: 'focus-dataflow-close' }, '*');
        });
```

这一整块，**在它之后**插入：

```javascript

        // --- 读取按钮 ---
        const readBtn = document.getElementById('readBtn');
        const readToast = document.getElementById('readToast');
        const readCore = globalThis.ReadCore;
        let readToastTimer = null;
        let readLongPressTimer = null;
        let readLongPressFired = false;

        function readSavedSource() {
            try {
                return localStorage.getItem(readCore.STORAGE_KEY) || '';
            } catch (err) {
                return '';
            }
        }

        function currentSourceUrl() {
            return readCore.resolveSourceUrl(readSavedSource(), window.location);
        }

        function showReadToast(msg) {
            readToast.textContent = msg;
            readToast.classList.add('show');
            clearTimeout(readToastTimer);
            readToastTimer = setTimeout(() => readToast.classList.remove('show'), 3000);
        }

        function applyRemoteText(text) {
            return readCore.applyText(text, {
                setLastPasted: (v) => { lastPastedText = v; },
                loadText: (v) => loadText(v),
                showClose: () => closeBtn.classList.add('visible'),
            });
        }

        async function handleRead() {
            const url = currentSourceUrl();
            readBtn.disabled = true;
            readBtn.textContent = '读取中';
            const result = await readCore.fetchText(url);
            readBtn.disabled = false;
            readBtn.textContent = '读取';
            if (!result.ok) {
                showReadToast('读取失败：' + result.error);
                return;
            }
            const applied = applyRemoteText(result.text);
            if (!applied.ok) {
                showReadToast('读取失败：' + applied.error);
            }
        }

        function editSourceUrl() {
            const current = readSavedSource() || currentSourceUrl();
            const next = window.prompt('读取地址（留空则使用默认）', current);
            if (next === null) return;
            try {
                localStorage.setItem(readCore.STORAGE_KEY, next.trim());
            } catch (err) {}
            showReadToast(next.trim() ? '已保存读取地址' : '已恢复默认地址');
        }

        readBtn.addEventListener('click', () => {
            if (readLongPressFired) {
                readLongPressFired = false;
                return;
            }
            handleRead();
        });

        readBtn.addEventListener('pointerdown', () => {
            readLongPressFired = false;
            clearTimeout(readLongPressTimer);
            readLongPressTimer = setTimeout(() => {
                readLongPressFired = true;
                editSourceUrl();
            }, 600);
        });

        ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => {
            readBtn.addEventListener(ev, () => clearTimeout(readLongPressTimer));
        });
```

- [ ] **Step 7: 运行测试，确认通过**

Run: `node --test tests/focus-dataflow-read.test.js`
Expected: PASS —— 11 tests passed

- [ ] **Step 8: 提交**

```bash
git add focus-dataflow.html tests/focus-dataflow-read.test.js
git commit --only focus-dataflow.html tests/focus-dataflow-read.test.js -m "Add read button to focus-dataflow for mobile"
```

---

## Task 4: 端到端验证与推送

**Files:**
- 无代码改动

- [ ] **Step 1: 停掉占用 8000 端口的旧服务器**

结束占用 8000 端口、且命令行含 `http.server` 的进程（只匹配 `http.server`，不会误杀别的服务）：

```bash
for pid in $(netstat -ano | grep -E ':8000[[:space:]].*LISTENING' | awk '{print $NF}' | sort -u); do
  cmd=$(powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId=$pid').CommandLine" 2>/dev/null)
  case "$cmd" in
    *http.server*) echo "killing $pid: $cmd"; taskkill //PID "$pid" //F ;;
    *) echo "skip $pid: $cmd" ;;
  esac
done
```

> 若输出全是 `skip`，说明占用者不是旧的 `http.server`。改用 `python tools/serve.py --port 8001` 启动，并把后续 URL 的端口换成 8001。

- [ ] **Step 2: 启动 serve.py**

```bash
python tools/serve.py
```

Expected 输出：`serving C:\Users\10691\Desktop\html + 2 mapped file(s) on http://0.0.0.0:8000`

（这个命令会阻塞在前台。让它跑在后台，然后继续下一步。）

- [ ] **Step 3: 校验 HTTP 行为**

```bash
curl -s -o /dev/null -w "focus-dataflow:%{http_code}\n" http://192.168.2.101:8000/focus-dataflow.html
curl -s -o /dev/null -w "dataflow:%{http_code}\n" http://192.168.2.101:8000/dataflow.txt
curl -s -o /dev/null -w "alias:%{http_code}\n" http://192.168.2.101:8000/focus-data.html
curl -sI http://192.168.2.101:8000/dataflow.txt | grep -i "access-control-allow-origin"
```

Expected:
```
focus-dataflow:200
dataflow:200
alias:200
Access-Control-Allow-Origin: *
```

- [ ] **Step 4: 确认页面里的读取逻辑指向正确**

```bash
curl -s http://192.168.2.101:8000/focus-dataflow.html | grep -n "readCore\|readBtn\|focusDataflowSource" | head -10
```

Expected: 能匹配到 readCore 块、readBtn 按钮与 localStorage 键。

- [ ] **Step 5: 手机手测（需要用户操作）**

在手机浏览器打开 `http://192.168.2.101:8000/focus-dataflow.html`：

1. 确认左上角出现「读取」按钮
2. 点「读取」→ 页面应直接渲染出数据流步骤（无需再粘贴）
3. 长按「读取」→ 应弹出地址输入框

- [ ] **Step 6: 桌面回归**

在桌面浏览器打开同一地址，确认：
1. 原有 `Ctrl+V` 粘贴仍然工作
2. 代码片段粘贴（`requestCodePaste`）不受影响
3. `×` 关闭按钮行为不变

- [ ] **Step 7: 推送**

```bash
git push origin main
```

Expected: `main -> main`，快进推送（若被拒绝，用 `git pull --rebase` 后重试；**不要**用 `git push -f`）。

- [ ] **Step 8: 确认线上部署版已带上按钮**

GitHub Pages 部署通常由 push 触发。等 1-2 分钟后：

```bash
curl -s https://don-up.github.io/tools/focus-dataflow | grep -c "id=\"readBtn\""
```

Expected: 输出 `1`（或更大，非 0 即说明已上线）。

> 注意：线上版在**手机**上点「读取」仍会被混合内容拦截（这是设计文档里写明的限制）；手机端请用本地地址 `http://192.168.2.101:8000/focus-dataflow.html`。

---

## 自查记录

- **规格覆盖**：设计文档的每一节都有对应任务 —— serve.py 路由与 CORS 头（Task 1）、readCore 纯逻辑块（Task 2）、按钮/媒体查询/toast/长按/hint 文案（Task 3）、测试与推送（Task 4）。
- **占位符检查**：所有代码块均为完整可粘贴的代码，无 TBD / TODO / 「类似 Task N」。
- **命名一致性**：`resolveSourceUrl` / `fetchText` / `applyText` / `STORAGE_KEY` / `applyRemoteText` / `handleRead` / `showReadToast` / `editSourceUrl` 在测试与实现中拼写一致；`readCore` 在页面里通过 `globalThis.ReadCore` 取用，测试里通过 `sandbox.ReadCore` 取用。
- **跨 realm 注意**：`fetchText`/`applyText` 返回值来自 vm realm，测试只用属性断言；`applyText` 的 `calls` 数组在宿主 realm 创建，可用 `deepEqual`。
