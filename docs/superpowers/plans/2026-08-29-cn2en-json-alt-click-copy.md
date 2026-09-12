# cn2en-json Alt+Click Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `cn2en-json.html` 中按住 Alt 键点击 cnText 时，将当前条目的中英文按 `CN|EN` 格式复制到剪贴板；纯左键点击仍触发 TTS（force 模式，绕过 toggle）。

**Architecture:** 单文件扩展。新增 `copyEntryToClipboard()` 工具函数封装 `navigator.clipboard.writeText` 调用，cnText 点击监听器分支化：`e.altKey` 为 true 时复制（preventDefault），否则调 `speakCn(true)`。

**Tech Stack:** 纯 HTML/CSS/JS（vanilla），`navigator.clipboard.writeText` + click event 的 `altKey` 属性。

---

## File Structure

- Modify: `cn2en-json.html` — 单文件，在现有 cnText 点击监听上扩展

无新增文件。

---

## Task 1: 新增 copyEntryToClipboard 函数与 cnText 点击监听分支化

**Files:**
- Modify: `cn2en-json.html`

- [ ] **Step 1: 添加 copyEntryToClipboard 函数**

定位到 script 块中的现有 `cnText.addEventListener('click', () => speakCn(true));` 这一行（位于文件顶部约 210 行，紧接在 `const modeRadios = ...` 之后）。在该行**之前**插入：

```js
    function copyEntryToClipboard() {
        if (entries.length === 0) return;
        const [cn, en] = entries[currentIndex];
        navigator.clipboard.writeText(`${cn}|${en}`);
    }
```

- [ ] **Step 2: 更新 cnText 点击监听器**

定位到 `cnText.addEventListener('click', () => speakCn(true));` 这一行（Step 1 刚在其前插入了函数）。将其替换为：

```js
    cnText.addEventListener('click', (e) => {
        if (e.altKey) {
            e.preventDefault();
            copyEntryToClipboard();
        } else {
            speakCn(true);
        }
    });
```

- [ ] **Step 3: 手动验证函数与监听器注册**

在浏览器 DevTools Console 执行：

```js
typeof copyEntryToClipboard === 'function'   // expect: true
```

粘贴 6 元素 JSON。在 Console 执行：

```js
entries[currentIndex]   // expect: ['作用域链...', 'The scope chain...']
copyEntryToClipboard()  // expect: 静默；剪贴板含 '作用域链...|The scope chain...'
```

预期：`copyEntryToClipboard` 已定义；调用后剪贴板内容为 `作用域链是...|The scope chain is...`（管道符 `|` 分隔，无前后空格）。

- [ ] **Step 4: 手动验证 Alt+点击 cnText**

粘贴 6 元素 JSON（先清空 localStorage 数据键避免使用旧条目）。

按住 Alt，点击 cnText。

预期：
- 不读 CN（无 TTS 播放）
- 剪贴板内容为 `作用域链是 JavaScript...|The scope chain is the chain...`
- 无 console 错误

- [ ] **Step 5: 手动验证纯左键点击 cnText 不受影响**

松开 Alt，纯左键点击 cnText。

预期：触发 CN TTS 播放，剪贴板内容不变。

- [ ] **Step 6: 手动验证 Alt+点击 enText 不复制**

按住 Alt，点击 enText。

预期：触发 EN TTS 播放（沿用现有 `speakEn(true)` 行为），剪贴板不变。enText 未注册复制分支。

- [ ] **Step 7: 手动验证 Mode 2/3 下复制原文**

按 2 切到 Mode 2（英文显示打码）。按住 Alt，点击 cnText。

预期：剪贴板内容为完整原文（含打码隐藏的英文），如 `作用域链...|The scope chain is the chain...`。enText 仍显示打码，但剪贴板不受影响。

- [ ] **Step 8: 手动验证空数据时静默早返回**

清空 localStorage（包括 `cn2en-json:data`），刷新。按住 Alt，点击 cnText。

预期：无 TTS 播放，无剪贴板写入，无 console 错误。函数内部 `entries.length === 0` 早返回。

- [ ] **Step 9: 提交**

```bash
git add cn2en-json.html
git commit -m "Alt+click cnText copies entry as CN|EN to clipboard"
```

---

## Task 2: 端到端手动验证

**Files:**
- 无文件修改（仅验证）

- [ ] **Step 1: 全新状态基线**

DevTools → Local Storage 清除所有 `cn2en-json:*` 键，刷新。

预期：中央空状态提示粘贴 JSON。

- [ ] **Step 2: 纯左键点击读 CN**

粘贴 6 元素 JSON 按 Ctrl+V。

预期：自动读 CN。点击 cnText 重新读 CN。

- [ ] **Step 3: Alt+点击复制**

按住 Alt，点击 cnText。

预期：不读 CN；剪贴板内容为 `作用域链是 JavaScript 在解析变量标识符时向上遍历的嵌套作用域链|The scope chain is the chain of nested scopes that JavaScript traverses upward when resolving variable identifiers`（管道符分隔）。

- [ ] **Step 4: 纯左键点击读 CN（再次）**

松开 Alt，点击 cnText。

预期：读 CN；剪贴板保持上一步的复制内容不变。

- [ ] **Step 5: Alt+点击 enText 读 EN**

按住 Alt，点击 enText。

预期：读 EN；剪贴板不变。

- [ ] **Step 6: 切条目后复制新条目**

按 ArrowRight 切到下一条。按住 Alt，点击 cnText。

预期：剪贴板内容更新为新条目的 `CN|EN`。

- [ ] **Step 7: Mode 2/3 下复制不受 mask 影响**

按 2 切到 Mode 2（enText 显示打码 `T__ s____ c____ i_ t__ c____ o_ n______ s____ t___ J_______ t_________ u_______ w____ r_______ v_______ i__________`）。

按住 Alt，点击 cnText。

预期：剪贴板内容仍为完整原文（enText 视觉打码不影响剪贴板内容）。

- [ ] **Step 8: 持久化与其它功能无回归**

刷新页面。所有 `cn2en-json:*` 设置与 Mode 保持。再次按 2/3 数字键、ArrowLeft/Right、S 揭示、W 隐藏 EN、Ctrl+V 粘贴——所有既有行为不受影响。

---

## 收尾

所有任务完成后，`cn2en-json.html` 支持按住 Alt 键点击 cnText 将当前条目按 `CN|EN` 格式复制到剪贴板：

- 纯左键点击 cnText → 读 CN（沿用 force TTS 行为）
- Alt+左键点击 cnText → 复制（不读 CN）
- Alt+左键点击 enText → 读 EN（enText 未注册复制分支）
- Mode 2/3 视觉打码不影响剪贴板内容
- 空数据时静默早返回