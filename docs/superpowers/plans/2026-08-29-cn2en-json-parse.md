# cn2en-json Parse & Navigate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 扩展 `cn2en-json.html`，使其能从剪贴板读取 JSON 对象，居中显示当前条目（中文在上、英文在下、超大字体），按左右方向键循环切换条目，序号显示 `当前/总数`，解析失败时显示顶部红色错误条，数据持久化到 localStorage。

**Architecture:** 单文件 HTML，使用 flex column 居中布局。状态（entries, currentIndex）在模块作用域内，render() 同步 DOM。Ctrl+V 与 ArrowLeft/Right 共享一个 keydown 监听器，按分支派发。错误条用 setTimeout 自动消失。所有 JS 内联，无依赖。

**Tech Stack:** 纯 HTML/CSS/JS（vanilla），使用浏览器原生 Clipboard API + localStorage。

---

## File Structure

- Modify: `cn2en-json.html` — 单文件，包含 HTML 结构、内联 CSS、内联 JS（扩展现有 scaffold）

无新增文件，无测试框架（无单元测试，验证靠手动浏览器操作）。

---

## Task 1: 添加 HTML 结构与 CSS

**Files:**
- Modify: `cn2en-json.html`

- [ ] **Step 1: 替换文件内容为完整布局**

将 `cn2en-json.html` 内容完全替换为：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>cn2en-json</title>
    <style>
        body {
            margin: 0;
            min-height: 100vh;
            background-color: #121212;
            color: #e0e0e0;
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .error-bar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #7a1f1f;
            color: #fff;
            padding: 10px;
            text-align: center;
            display: none;
            z-index: 10;
        }
        .counter {
            position: fixed;
            top: 20px;
            right: 20px;
            font-size: 18px;
            color: #888;
        }
        .cn-text {
            font-size: 64px;
            color: wheat;
            font-family: 华文细黑, 楷体, serif;
            text-align: center;
            padding: 20px;
            max-width: 90vw;
            line-height: 1.3;
        }
        .en-text {
            font-size: 48px;
            color: #e0e0e0;
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 20px;
            max-width: 90vw;
            line-height: 1.3;
        }
        .hint {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 14px;
            color: #666;
        }
        .empty-state {
            font-size: 24px;
            color: #888;
            text-align: center;
        }
        [hidden] { display: none; }
    </style>
</head>
<body>
    <div id="errorBar" class="error-bar"></div>
    <div id="counter" class="counter" hidden></div>
    <div id="cnText" class="cn-text" hidden></div>
    <div id="enText" class="en-text" hidden></div>
    <div id="hint" class="hint">← → 切换</div>
    <div id="emptyState" class="empty-state">按 Ctrl+V 粘贴 JSON 数据</div>
</body>
</html>
```

- [ ] **Step 2: 手动验证布局**

在浏览器中打开 `cn2en-json.html`。

预期：深灰色背景，页面中央显示"按 Ctrl+V 粘贴 JSON 数据"灰色提示文字，右上角和底部提示不可见（hidden），顶部无错误条。

- [ ] **Step 3: 提交**

```bash
git add cn2en-json.html
git commit -m "Add HTML structure and empty state for cn2en-json"
```

---

## Task 2: 添加 Ctrl+V JSON 解析与渲染（无导航、无错误条、无持久化）

**Files:**
- Modify: `cn2en-json.html` — 在 `</body>` 前插入 `<script>` 块

- [ ] **Step 1: 在 `</body>` 前插入 script 块**

定位到 `</body>` 这一行（HTML 末尾），在该行之前插入：

```html
<script>
    let entries = [];
    let currentIndex = 0;

    const counter = document.getElementById('counter');
    const cnText = document.getElementById('cnText');
    const enText = document.getElementById('enText');
    const hint = document.getElementById('hint');
    const emptyState = document.getElementById('emptyState');

    function render() {
        if (entries.length === 0) {
            emptyState.hidden = false;
            counter.hidden = true;
            cnText.hidden = true;
            enText.hidden = true;
            hint.hidden = true;
            return;
        }
        emptyState.hidden = true;
        counter.hidden = false;
        cnText.hidden = false;
        enText.hidden = false;
        hint.hidden = false;
        const [cn, en] = entries[currentIndex];
        counter.textContent = `${currentIndex + 1}/${entries.length}`;
        cnText.textContent = cn;
        enText.textContent = en;
    }

    function parseAndLoad(text) {
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (err) {
            console.error('JSON 解析失败:', err.message);
            return;
        }
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            console.error('JSON 格式错误：必须为对象');
            return;
        }
        const newEntries = Object.entries(parsed);
        if (newEntries.length === 0) {
            console.error('JSON 不能为空对象');
            return;
        }
        entries = newEntries;
        currentIndex = 0;
        render();
    }

    document.addEventListener('keydown', async function (e) {
        if (e.ctrlKey && !e.shiftKey && !e.altKey && e.code === 'KeyV') {
            e.preventDefault();
            try {
                const text = await navigator.clipboard.readText();
                parseAndLoad(text);
            } catch (err) {
                console.error('剪贴板读取失败:', err.message || err);
            }
        }
    });

    render();
</script>
```

- [ ] **Step 2: 手动验证 Ctrl+V 解析成功路径**

复制以下文本到剪贴板：
```json
{
    "编译型语言会预编译为机器码以提升执行速度": "Compiled languages pre-compile to machine code for speed",
    "但开发周期较长": "but have longer cycles"
}
```

打开 `cn2en-json.html`，按 Ctrl+V。

预期：
- 居中显示"编译型语言会预编译为机器码以提升执行速度"（金色，64px）
- 下方显示"Compiled languages pre-compile to machine code for speed"（白色，48px）
- 右上角显示"1/2"
- 底部显示"← → 切换"
- 顶部无错误条
- 中央"按 Ctrl+V 粘贴 JSON 数据"提示已消失

- [ ] **Step 3: 手动验证 Ctrl+V 错误路径（仅控制台）**

复制无效文本（如 `not json`）到剪贴板，按 Ctrl+V。

预期：页面无变化，DevTools Console 显示 `JSON 解析失败: ...`。

复制数组 `[1,2,3]` 到剪贴板，按 Ctrl+V。

预期：页面无变化，Console 显示 `JSON 格式错误：必须为对象`。

复制 `{}` 到剪贴板，按 Ctrl+V。

预期：页面无变化，Console 显示 `JSON 不能为空对象`。

- [ ] **Step 4: 提交**

```bash
git add cn2en-json.html
git commit -m "Add JSON parse and render on Ctrl+V"
```

---

## Task 3: 添加错误条显示

**Files:**
- Modify: `cn2en-json.html` — 替换 `<script>` 块

- [ ] **Step 1: 替换 script 块**

将现有的 `<script>...</script>` 整块替换为：

```html
<script>
    let entries = [];
    let currentIndex = 0;
    let errorTimer = null;

    const errorBar = document.getElementById('errorBar');
    const counter = document.getElementById('counter');
    const cnText = document.getElementById('cnText');
    const enText = document.getElementById('enText');
    const hint = document.getElementById('hint');
    const emptyState = document.getElementById('emptyState');

    function showError(msg) {
        errorBar.textContent = msg;
        errorBar.style.display = 'block';
        if (errorTimer) clearTimeout(errorTimer);
        errorTimer = setTimeout(() => {
            errorBar.style.display = 'none';
            errorTimer = null;
        }, 3000);
    }

    function clearError() {
        errorBar.style.display = 'none';
        if (errorTimer) {
            clearTimeout(errorTimer);
            errorTimer = null;
        }
    }

    function render() {
        if (entries.length === 0) {
            emptyState.hidden = false;
            counter.hidden = true;
            cnText.hidden = true;
            enText.hidden = true;
            hint.hidden = true;
            return;
        }
        emptyState.hidden = true;
        counter.hidden = false;
        cnText.hidden = false;
        enText.hidden = false;
        hint.hidden = false;
        const [cn, en] = entries[currentIndex];
        counter.textContent = `${currentIndex + 1}/${entries.length}`;
        cnText.textContent = cn;
        enText.textContent = en;
    }

    function parseAndLoad(text) {
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (err) {
            showError(`JSON 解析失败: ${err.message}`);
            return;
        }
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            showError('JSON 格式错误：必须为对象');
            return;
        }
        const newEntries = Object.entries(parsed);
        if (newEntries.length === 0) {
            showError('JSON 不能为空对象');
            return;
        }
        entries = newEntries;
        currentIndex = 0;
        clearError();
        render();
    }

    document.addEventListener('keydown', async function (e) {
        if (e.ctrlKey && !e.shiftKey && !e.altKey && e.code === 'KeyV') {
            e.preventDefault();
            try {
                const text = await navigator.clipboard.readText();
                parseAndLoad(text);
            } catch (err) {
                showError(`剪贴板读取失败: ${err.message || err}`);
            }
        }
    });

    render();
</script>
```

- [ ] **Step 2: 手动验证错误条**

按 Task 2 Step 3 触发三种错误，预期顶部出现红色错误条，3 秒后自动消失。

按 Task 2 Step 2 触发成功路径，预期错误条立即消失（若有）。

- [ ] **Step 3: 提交**

```bash
git add cn2en-json.html
git commit -m "Show red error bar on JSON parse failure"
```

---

## Task 4: 添加方向键导航（首尾循环）

**Files:**
- Modify: `cn2en-json.html` — 在 keydown 监听器中追加 ArrowLeft/ArrowRight 分支

- [ ] **Step 1: 在 keydown 监听器末尾添加导航分支**

定位到 script 块中的这一行：

```js
                showError(`剪贴板读取失败: ${err.message || err}`);
            }
        }
    });
```

将其替换为：

```js
                showError(`剪贴板读取失败: ${err.message || err}`);
            }
        }
        if (entries.length > 0) {
            if (e.code === 'ArrowLeft') {
                e.preventDefault();
                currentIndex = (currentIndex - 1 + entries.length) % entries.length;
                render();
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                currentIndex = (currentIndex + 1) % entries.length;
                render();
            }
        }
    });
```

- [ ] **Step 2: 手动验证导航**

粘贴 Task 2 Step 2 中的 2 元素 JSON，按 Ctrl+V 显示第 1 项。连续按 ArrowRight 两次：依次显示"2/2"和"1/2"（循环回到首项）。

连续按 ArrowLeft 三次：依次显示"2/2"、"1/2"、"2/2"。

- [ ] **Step 3: 提交**

```bash
git add cn2en-json.html
git commit -m "Add arrow key navigation with wrap-around"
```

---

## Task 5: 添加 localStorage 持久化

**Files:**
- Modify: `cn2en-json.html` — 添加 save/load 函数，在关键点调用

- [ ] **Step 1: 添加 saveState/loadState 函数并接入**

定位到 script 块中的 `function parseAndLoad(text) {` 这一行。在该行之前插入：

```js
    const STORAGE_KEY_DATA = 'cn2en-json:data';
    const STORAGE_KEY_INDEX = 'cn2en-json:index';

    function saveState() {
        localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(entries));
        localStorage.setItem(STORAGE_KEY_INDEX, String(currentIndex));
    }

    function loadState() {
        try {
            const data = localStorage.getItem(STORAGE_KEY_DATA);
            const index = localStorage.getItem(STORAGE_KEY_INDEX);
            if (data && index !== null) {
                entries = JSON.parse(data);
                currentIndex = parseInt(index, 10) || 0;
            }
        } catch (err) {
            console.error('恢复状态失败:', err);
        }
    }
```

定位到 `entries = newEntries;` 这一行，将其替换为：

```js
        entries = newEntries;
        currentIndex = 0;
        clearError();
        saveState();
        render();
```

定位到 script 块末尾的 `render();`（在 `</script>` 之前）这一行。将其替换为：

```js
    loadState();
    render();
```

定位到 `if (e.code === 'ArrowLeft') {` 这一行。在该分支中将：

```js
                currentIndex = (currentIndex - 1 + entries.length) % entries.length;
                render();
```

改为：

```js
                currentIndex = (currentIndex - 1 + entries.length) % entries.length;
                saveState();
                render();
```

定位到 `} else if (e.code === 'ArrowRight') {` 这一行。在该分支中将：

```js
                currentIndex = (currentIndex + 1) % entries.length;
                render();
```

改为：

```js
                currentIndex = (currentIndex + 1) % entries.length;
                saveState();
                render();
```

- [ ] **Step 2: 手动验证持久化**

粘贴 6 元素 JSON（用户提供的原始示例），按 ArrowRight 3 次到第 4 项。刷新页面。

预期：页面自动显示第 4 项，序号"4/6"。

- [ ] **Step 3: 提交**

```bash
git add cn2en-json.html
git commit -m "Persist entries and current index to localStorage"
```

---

## Task 6: 端到端手动验证

**Files:**
- 无文件修改（仅验证）

- [ ] **Step 1: 验证完整流程**

清除 localStorage（在 DevTools Application 面板删除 `cn2en-json:data` 和 `cn2en-json:index`），刷新页面。

预期：中央显示"按 Ctrl+V 粘贴 JSON 数据"。

复制以下 6 元素 JSON 到剪贴板，按 Ctrl+V：

```json
{
    "编译型语言会预编译为机器码以提升执行速度": "Compiled languages pre-compile to machine code for speed",
    "但开发周期较长":"but have longer cycles",
    "解释型语言则逐行执行代码":"Interpreted ones execute line by line",
    "可移植性更好":"offering better portability but slower speed",
    "但运行速度较慢":"but slower speed",
    "现代 JavaScript 引擎通过 JIT（即时编译）技术融合了两种方式的优势":"Modern JS engines blend both via JIT"
}
```

预期：显示第 1 项，序号"1/6"。

- [ ] **Step 2: 验证导航与循环**

按 ArrowRight 5 次：依次显示 2/6, 3/6, 4/6, 5/6, 6/6。

按 ArrowRight 一次：回到 1/6（循环）。

按 ArrowLeft：回到 6/6（反向循环）。

- [ ] **Step 3: 验证错误条**

复制 `not json` 到剪贴板，按 Ctrl+V。

预期：顶部出现红色错误条 `JSON 解析失败: ...`，3 秒后自动消失，已有数据保留。

- [ ] **Step 4: 验证持久化与替换**

刷新页面：第 1 项应保持显示（currentIndex=0）。

粘贴新 JSON（含 3 元素），按 Ctrl+V。

预期：替换为新数据，序号显示"1/3"，currentIndex 重置。

- [ ] **Step 5: 验证空状态清除**

清除 localStorage，刷新页面。

预期：回到空状态显示。

---

## 收尾

所有任务完成后，`cn2en-json.html` 是一个完整的 JSON 驱动的中英对照学习工具：粘贴 JSON、居中显示、方向键循环导航、错误提示、刷新后状态保留。