# Reader TOC Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `reader.html` 左侧添加 TOC 侧栏，粘贴 markdown 后自动列出 h1–h5 标题，点击平滑滚动跳转；Alt+H 切换显示，偏好持久化。

**Architecture:** 单文件扩展。CSS 新增 `#tocPanel`、`.toc-entry`、`.toc-target`、`body.toc-open`、`body.toc-hidden`；HTML 新增 `<aside id="tocPanel">` 占位；JS 在 `processText()` 渲染 h1–h5 时打上 `id` + `toc-target` class，末尾调用新增的 `renderTOC()` 重建条目；keydown 监听里加 Alt+H 分支；localStorage 读写 `tocHidden`。

**Tech Stack:** 纯 HTML/CSS/JS（vanilla）。复用现有 `<aside>`、`localStorage` 模式。无新依赖。

---

## File Structure

- Modify: `reader.html` — 单文件扩展，分四块改动（HTML/CSS/JS heading stamping/JS TOC rebuild/JS toggle）。

无新增文件。

---

## Task 1: 添加 TOC 占位元素 + 基础样式

**Files:**
- Modify: `reader.html`

- [ ] **Step 1: 在 `<body>` 顶部插入 `<aside id="tocPanel">`**

定位到 `reader.html` 中 `<div id="wrapper">` 这一行（位于 `<body>` 之后第一个子元素）。在该行 **之前** 插入：

```html
<aside id="tocPanel" aria-label="Table of contents"></aside>
```

- [ ] **Step 2: 在 `<style>` 段末尾追加 `#tocPanel` 基础样式**

定位到现有 `</style>` 闭合标签（位于 `@keyframes pulse` 块之后、`.centered-text` 规则之后）。在 `</style>` 之前追加：

```css
#tocPanel {
    position: fixed;
    top: 60px;
    left: 0;
    bottom: 0;
    width: 220px;
    background: #1e1e1e;
    border-right: 1px solid #333;
    overflow-y: auto;
    padding: 10px 0;
    box-sizing: border-box;
    z-index: 40;
    display: none;
}
body.toc-open #tocPanel { display: block; }
body.toc-open .container { margin-left: 220px; }
#tocPanel:empty { display: none; }
```

> 注：`body.toc-open` 规则在 Task 3 中会被 `renderTOC()` 添加类时启用；此处先放好以保持 CSS 集中。

- [ ] **Step 3: 在浏览器中手动验证**

打开 `reader.html`，按 F12 打开开发者工具：
1. Console 执行 `document.getElementById('tocPanel')` → 应返回 `<aside>` 元素
2. Console 执行 `getComputedStyle(document.getElementById('tocPanel')).display` → 应返回 `"none"`
3. 页面没有视觉变化（侧栏隐藏）

期望：无 console 错误，无视觉回归。

- [ ] **Step 4: 提交**

```bash
git add reader.html
git commit -m "Add #tocPanel placeholder and base styles"
```

---

## Task 2: processText() 给 h1–h5 标题打 id + class

**Files:**
- Modify: `reader.html`

- [ ] **Step 1: 修改 heading 渲染分支**

定位到 `processText()` 函数内的 heading 处理块（位于 `const headingMatch = line.match(/^(#{1,5})\s+(.*)/);` 紧邻处），定位到 `const heading = document.createElement(`h${level}`);` 这一行。修改为：

```js
const heading = document.createElement(`h${level}`);
heading.id = `heading-${index}`;
heading.classList.add('toc-target');
heading.style.cursor = "pointer";
heading.dataset.originalText = line + (line.trim().endsWith(".") ? "" : ". ");
heading.onclick = function () {
    playText(this.dataset.originalText, this);
}
heading.innerHTML = text;
contentDiv.appendChild(heading);
```

> 注意：保留 `let text = headingMatch[2];`（在 `const heading = ...` 之上）和上方 `const level = headingMatch[1].length;` 两行不变。`heading.style.cursor`、`dataset.originalText`、`onclick`、`innerHTML`、`appendChild` 五行与原代码相同，仅在 `const heading = ...` 之后新增 `id` 与 `classList` 两行。不要重写后续逻辑。

完整改动后的 block 应是：

```js
const headingMatch = line.match(/^(#{1,5})\s+(.*)/);
if (headingMatch) {
    const level = headingMatch[1].length;
    let text = headingMatch[2];
    const heading = document.createElement(`h${level}`);
    heading.id = `heading-${index}`;
    heading.classList.add('toc-target');
    heading.style.cursor = "pointer";
    heading.dataset.originalText = line + (line.trim().endsWith(".") ? "" : ". ");
    heading.onclick = function () {
        playText(this.dataset.originalText, this);
    }
    heading.innerHTML = text;
    contentDiv.appendChild(heading);
    return;
}
```

- [ ] **Step 2: 追加 `.toc-target` CSS**

定位到现有 `</style>` 闭合标签。在 `</style>` 之前再追加：

```css
.toc-target {
    scroll-margin-top: 88px;
}
```

> 注：`.controls` 是 `height: 60px` + `padding: 10px 0`，默认 `content-box` 下视觉高度 = 80px。88px 留 8px 呼吸距离。如果实际渲染时不需要呼吸空间可改为 80px。

- [ ] **Step 3: 在浏览器中手动验证**

打开 `reader.html`，通过 Insert 按钮（按 V 键）粘贴以下测试 markdown：

```markdown
# Title A
## Sub A1
### Sub A1-1
text
## Sub A2
text
# Title B
```

等待渲染。在 Console 执行：

```js
const hs = document.querySelectorAll('#content h1, #content h2, #content h3, #content h4, #content h5');
console.log(hs.length, Array.from(hs).map(h => ({tag: h.tagName, id: h.id, cls: h.className})));
```

期望：5 个标题，依次输出形如 `[{tag:'H1', id:'heading-0', cls:'toc-target'}, ...]` 的对象，每个都有 `id` 以 `heading-` 开头，`cls` 包含 `toc-target`。

- [ ] **Step 4: 提交**

```bash
git add reader.html
git commit -m "Stamp heading id and toc-target class during render"
```

---

## Task 3: 实现 renderTOC() 并在 processText() 末尾调用

**Files:**
- Modify: `reader.html`

- [ ] **Step 1: 追加 `.toc-entry` 与 `.toc-level-N` CSS**

定位到现有 `</style>` 闭合标签。在 `</style>` 之前再追加：

```css
.toc-entry {
    display: block;
    padding: 4px 10px;
    color: #dfe1e5;
    cursor: pointer;
    font-family: "Corbel", 'Segoe UI', Tahoma, Verdana, sans-serif;
    font-size: 14px;
    line-height: 1.4;
    overflow-wrap: anywhere;
    text-decoration: none;
    transition: background-color 0.15s ease, color 0.15s ease;
}
.toc-entry:hover {
    background: #2c2c2c;
    color: #00BFFF;
}
.toc-entry:focus-visible {
    outline: 2px solid #00BFFF;
    outline-offset: -2px;
}
.toc-level-1 { padding-left: 10px; font-weight: 600; }
.toc-level-2 { padding-left: 20px; }
.toc-level-3 { padding-left: 30px; font-size: 13px; }
.toc-level-4 { padding-left: 40px; font-size: 13px; color: #b0b0b0; }
.toc-level-5 { padding-left: 50px; font-size: 12px; color: #b0b0b0; }
```

> 注：`.toc-entry` 是 `<a>` 元素，必须 `text-decoration: none` 去掉默认下划线，并加 `:focus-visible` 焦点环保证键盘可达性。

- [ ] **Step 2: 新增 `renderTOC()` 函数**

定位到 `processText()` 函数定义的最后 `}` 之前。在该 `}` 之前（即函数体内末尾）追加：

```js
renderTOC();
```

然后在 `processText()` 函数定义结束之后（即 processText 的 `}` 闭合大括号之后），新增一个空行后插入：

```js
function renderTOC() {
    const panel = document.getElementById('tocPanel');
    const targets = document.querySelectorAll('#content .toc-target');
    panel.innerHTML = '';

    if (targets.length === 0) {
        document.body.classList.remove('toc-open');
        return;
    }

    targets.forEach((heading) => {
        const level = parseInt(heading.tagName.substring(1), 10);
        const entry = document.createElement('a');
        entry.className = `toc-entry toc-level-${level}`;
        entry.href = `#${heading.id}`;
        entry.textContent = heading.textContent.trim();
        entry.addEventListener('click', (e) => {
            e.preventDefault();
            heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        panel.appendChild(entry);
    });

    if (localStorage.getItem('tocHidden') !== 'true') {
        document.body.classList.add('toc-open');
    }
}
```

- [ ] **Step 3: 在浏览器中手动验证**

复用 Task 2 的测试 markdown。

1. 期望：左侧出现 220px 宽的深色侧栏，包含 5 个条目：
   - `Title A`（h1，无缩进，加粗）
   - `Sub A1`（h2，缩进 10px）
   - `Sub A1-1`（h3，缩进 20px，字号 13px）
   - `Sub A2`（h2，缩进 10px）
   - `Title B`（h1，无缩进，加粗）
2. 期望：主内容区向右移动 220px，不与侧栏重叠
3. 点击 `Sub A1-1` 条目 → 主内容平滑滚动到对应 h3 处（标题不被顶部 controls 栏遮住，因为 `scroll-margin-top: 88px`）
4. 点击条目后没有 TTS 朗读
5. 直接点击主内容区中的 `Sub A1-1` 标题 → 仍然触发 TTS（原有行为不变）

- [ ] **Step 4: 测试无标题情况**

清空 localStorage（`localStorage.clear()`），刷新页面，重新粘贴一份不含任何 `#` 标题的纯文本：

```
line one
line two
line three
```

期望：
- 左侧没有侧栏（侧栏元素保持存在但 `display: none`）
- 主内容居中，不偏移
- Console：`document.querySelectorAll('#content .toc-target').length` 返回 `0`

- [ ] **Step 5: 提交**

```bash
git add reader.html
git commit -m "Render TOC entries from .toc-target headings"
```

---

## Task 4: Alt+H 切换 + localStorage 持久化

**Files:**
- Modify: `reader.html`

- [ ] **Step 1: 追加 `body.toc-hidden` CSS**

定位到现有 `</style>` 闭合标签。在 `</style>` 之前再追加：

```css
body.toc-hidden #tocPanel { display: none; }
```

> 注：该规则与 `body.toc-open #tocPanel { display: block; }` 特异性相同 (1,1,1)。靠 CSS 源码顺序覆盖即可, 不需要 `!important`。

- [ ] **Step 2: 在 keydown 监听器加 Alt+H 分支**

定位到 reader.html 中第一个 `document.addEventListener("keydown", function (event) { ... })`（处理 ArrowLeft/Right/Down/Up/Number1 的那个，约第 798 行起）。在该回调内最后一个 `else if (event.key === "1") { ... }` 块的闭合 `}` 之后再新增一个 `else if` 分支：

```js
        } else if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.code === "KeyH") {
            event.preventDefault();
            const hidden = !document.body.classList.contains("toc-hidden");
            document.body.classList.toggle("toc-hidden", hidden);
            localStorage.setItem("tocHidden", hidden ? "true" : "false");
            if (!hidden && document.querySelectorAll("#content .toc-target").length > 0) {
                document.body.classList.add("toc-open");
            }
        }
```

> 注：该分支必须放在 `} else if (event.key === "1") { ... }` 之后、`});` 闭合之前。注意缩进与上方 `else if` 链对齐（多一层缩进因为在 if/else 链中）。

- [ ] **Step 3: 页面加载时恢复偏好**

定位到 `hideReadCheckbox.checked = localStorage.getItem("hideRead") === "true";` 这一行（位于 `const hideReadCheckbox = document.getElementById("hideReadCheckbox");` 之后附近）。在该行之后追加：

```js
if (localStorage.getItem("tocHidden") === "true") {
    document.body.classList.add("toc-hidden");
}
```

- [ ] **Step 4: 在浏览器中手动验证**

复用 Task 2 测试 markdown，粘贴后侧栏应默认显示。

1. 按下 Alt+H → 侧栏消失；Console 检查 `document.body.classList.contains('toc-hidden')` 返回 `true`，`localStorage.getItem('tocHidden')` 返回 `"true"`
2. 再按一次 Alt+H → 侧栏重现；Console 检查 `toc-hidden` 类移除，`localStorage.tocHidden` 为 `"false"`
3. F5 刷新页面 → 侧栏仍显示（默认值）
4. 按 Alt+H 隐藏 → F5 刷新 → 侧栏保持隐藏（偏好持久化）
5. Console 清空 localStorage 后刷新 → 侧栏恢复默认显示
6. 测试三种粘贴路径下都生效：
   - V 键 → Insert 按钮粘贴（textarea）
   - → 键（ArrowRight）从剪贴板粘贴
   - 通过 iframe postMessage 选书后粘贴
   每种路径下，TOC 都应自动构建并显示（除非已通过 Alt+H 隐藏）

- [ ] **Step 5: 验证侧栏与右侧 sidePanel 共存**

按 Ctrl+O 打开右侧 sidePanel（iframe）。

期望：
- 左侧 TOC 侧栏与右侧 40vw sidePanel 同时显示
- 中间内容区被两侧挤压但仍可读
- 两个侧栏不互相干扰（z-index 40 vs 50，左侧在视觉下层但因位置不重叠无影响）

- [ ] **Step 6: 提交**

```bash
git add reader.html
git commit -m "Add Alt+H toggle with localStorage persistence"
```

---

## 自检 (Self-Review)

对照 spec 检查每个章节：

| Spec 章节 | 任务 |
| --- | --- |
| HTML `<aside id="tocPanel">` | Task 1 |
| CSS `#tocPanel` 基础 | Task 1 |
| CSS `.toc-target` + `scroll-margin-top` | Task 2 |
| CSS `.toc-entry` + `.toc-level-N` | Task 3 |
| CSS `body.toc-open` + `body.toc-hidden` | Task 1（toc-open）、Task 4（toc-hidden）|
| `processText()` heading 分支加 id + class | Task 2 |
| `renderTOC()` 函数 | Task 3 |
| `processText()` 末尾调用 `renderTOC()` | Task 3 |
| Alt+H keydown 分支 | Task 4 |
| 加载时从 localStorage 恢复 | Task 4 |
| 行为矩阵（5 种状态）| Task 3（empty）、Task 3（默认）、Task 4（toggle off/persisted） |
| 边界：长标题、TOC 溢出、heading onclick 保留、sidePanel 共存 | Task 3（长/短/onclick）、Task 4（sidePanel）|

所有 spec 章节已覆盖。