# cn2en-json Iframe Post CN|EN Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `cn2en-json.html` 中通过 `postMessage` 向 `sidePanel` iframe 发送当前 entry 的 `CN|EN`；每次 render（首次加载 + 切换条目 + 粘贴后）都触发。

**Architecture:** 单文件扩展。新增 `postCnEnToChild()` 函数封装 `sidePanel.contentWindow?.postMessage(...)`，在 `render()` 末尾（`pickRandomBg()` 之后）调用一次。targetOrigin 限定为 `'https://don-up.github.io'`。

**Tech Stack:** 纯 HTML/JS（vanilla），`window.postMessage` API。

---

## File Structure

- Modify: `cn2en-json.html` — 单文件，新增 1 函数 + 1 调用行

无新增文件。

---

## Task 1: 添加 postCnEnToChild 函数并在 render 中调用

**Files:**
- Modify: `cn2en-json.html`

- [ ] **Step 1: 添加 postCnEnToChild 函数**

定位到现有 `function pickRandomBg() { ... }` 函数定义块。在该块**之后**插入：

```js
function postCnEnToChild() {
    if (entries.length === 0) return;
    const [cn, en] = entries[currentIndex];
    sidePanel.contentWindow?.postMessage(
        { type: 'cn-en', content: `${cn}|${en}` },
        'https://don-up.github.io'
    );
}
```

- [ ] **Step 2: 在 render() 末尾追加调用**

定位到 `function render() { ... }` 函数末尾。在现有 `if (bgImages.length > 0) pickRandomBg();` 这一行之后追加：

```js
postCnEnToChild();
```

- [ ] **Step 3: 手动验证语法**

在浏览器 DevTools Console 跑：

```js
typeof postCnEnToChild === 'function'   // expect: true
```

预期：`true`。

- [ ] **Step 4: 手动验证 postMessage 发送（无 iframe 加载时）**

先确保 `sidePanel` 元素存在：

```js
typeof document.getElementById('sidePanel').contentWindow   // expect: 'object'
```

预期：`object`（哪怕 sidePanel 隐藏，contentWindow 也可访问）。

- [ ] **Step 5: 手动验证 Ctrl+O 打开 iframe 时收消息**

打开 `https://don-up.github.io/tools/card-timer`，在子页面 DevTools Console 临时注册监听器：

```js
window.addEventListener('message', e => console.log('MSG:', e.data, e.origin));
```

回到 cn2en-json.html，Ctrl+O 显示 iframe，粘贴 JSON。

预期：子页面 Console 出现 `MSG: {type: 'cn-en', content: '...|...'} https://don-up.github.io`。

按 ArrowRight 多次：每次切条目子页面 Console 多一行新消息。

- [ ] **Step 6: 提交**

```bash
git add cn2en-json.html
git commit -m "Post CN|EN to sidePanel iframe on render"
```

---

## Task 2: card-timer 子页面添加 message 监听（参考步骤，由用户在子项目操作）

> 注：本任务仅作参考，不在 `html-tools` 仓库执行。子项目 `Don-Up/tools` 仓库 `card-timer` 页面需手动添加：

```js
window.addEventListener('message', (e) => {
    if (e.data?.type === 'cn-en' && e.data.content) {
        const inp = document.getElementById('cnEnInput');
        if (inp) inp.value = e.data.content;
    }
});
```

预期：cn2en-json.html 切条目时，card-timer 的 `#cnEnInput` 文本域自动更新为 `CN|EN`。

---

## 收尾

父页实现完成。每次 render（首次 / 切条目 / 粘贴后）通过 postMessage 向 sidePanel iframe 发送当前 entry 的 `CN|EN`。子页面 card-timer 需自行注册 message 监听以接收并写入 `#cnEnInput`。