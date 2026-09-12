# cn2en-json Mode Hotkeys Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `cn2en-json.html` 中按数字键 1/2/3 立即切换到对应 Mode（顶行 Digit1/2/3 与数字键盘 Numpad1/2/3 均支持），同时更新底部 hint 提示用户。

**Architecture:** 单文件扩展。提取 `applyMode(mode)` 工具函数封装"设 currentMode + radio checked + localStorage + 更新 enText"，原 modeRadios change 监听器改为调用 applyMode；keydown 监听新增数字键分支也调用 applyMode。hint 文本扩展以告知用户新快捷键。

**Tech Stack:** 纯 HTML/CSS/JS（vanilla），keydown 事件 + querySelectorAll。

---

## File Structure

- Modify: `cn2en-json.html` — 单文件，在现有 Mode 实现上扩展

无新增文件。

---

## Task 1: 提取 applyMode 工具函数并简化 change 监听器

**Files:**
- Modify: `cn2en-json.html`

- [ ] **Step 1: 添加 applyMode 函数**

定位到 script 中的现有 modeRadios change 监听器块（位置约 470 行附近）。在监听器整块**之前**插入：

```js
    function applyMode(mode) {
        currentMode = mode;
        localStorage.setItem(STORAGE_KEY_MODE, String(mode));
        modeRadios.forEach(r => {
            r.checked = parseInt(r.value, 10) === mode;
        });
        if (entries.length > 0) {
            if (mode === 1) {
                enText.textContent = entries[currentIndex][1];
            } else {
                enText.textContent = maskEnText(entries[currentIndex][1], mode === 2);
            }
        }
    }
```

- [ ] **Step 2: 简化现有 modeRadios change 监听器**

定位到现有的整块监听器：

```js
    modeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) {
                currentMode = parseInt(radio.value, 10);
                localStorage.setItem(STORAGE_KEY_MODE, String(currentMode));
                if (entries.length > 0) {
                    if (currentMode === 1) {
                        enText.textContent = entries[currentIndex][1];
                    } else {
                        enText.textContent = maskEnText(entries[currentIndex][1], currentMode === 2);
                    }
                }
            }
        });
    });
```

将整块替换为：

```js
    modeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) applyMode(parseInt(radio.value, 10));
        });
    });
```

- [ ] **Step 3: 手动验证 applyMode 函数可调用**

在浏览器 DevTools Console 执行：

```js
typeof applyMode === 'function'   // expect: true
```

粘贴 6 元素 JSON 后在 Console 执行：

```js
applyMode(2);   // expect: Mode 2 选中，enText 显示打码形式
applyMode(3);   // expect: Mode 3 选中，enText 显示全打码
applyMode(1);   // expect: Mode 1 选中，enText 显示原文
```

预期：每次调用都立即更新 radio 选中状态与 enText 显示。

- [ ] **Step 4: 提交**

```bash
git add cn2en-json.html
git commit -m "Extract applyMode helper and simplify Mode change listener"
```

---

## Task 2: 添加 keydown 数字键分支

**Files:**
- Modify: `cn2en-json.html`

- [ ] **Step 1: 在 keydown 中插入数字键分支**

定位到 script 中的 keydown 监听函数体。找到 S 键分支（已有 `if (e.code === 'KeyS' && ...)` 整块）的闭合 `}` 之后、`if (entries.length > 0) {`（ArrowLeft/Right 分支）之前。在该位置插入：

```js
        if (!e.ctrlKey && !e.altKey && !e.shiftKey) {
            if (e.code === 'Digit1' || e.code === 'Numpad1') {
                e.preventDefault();
                applyMode(1);
            } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
                e.preventDefault();
                applyMode(2);
            } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
                e.preventDefault();
                applyMode(3);
            }
        }
```

（即在 S 键分支与 ArrowLeft/Right 分支之间插入新分支。）

- [ ] **Step 2: 手动验证数字键切换**

粘贴 6 元素 JSON。

按 2。
预期：Mode 2 选中（radio checked），英文打码为 `C_______ l_______ p__-c______ t_ m______ c___ f__ s____`。

按 3。
预期：Mode 3 选中，英文全打码 `________ _________ ___-_______ __ _______ ____ ___ _____`。

按 1。
预期：Mode 1 选中，英文恢复完整。

测试数字键盘：按 Numpad2。
预期：Mode 2 选中，与顶行 2 等效。

- [ ] **Step 3: 手动验证修饰键不触发**

按 Ctrl+1。
预期：浏览器切换到第一个标签页（如果有），Mode 不切换。

按 Shift+1。
预期：输入 `!`（或浏览器默认），Mode 不切换。

按 Alt+1。
预期：浏览器默认行为，Mode 不切换。

- [ ] **Step 4: 手动验证不影响其它键**

按 S。
预期：仍切换 enRevealed（Mode 不变）。

按 ArrowLeft/Right。
预期：仍切换条目。

按 Ctrl+V。
预期：仍粘贴 JSON。

- [ ] **Step 5: 提交**

```bash
git add cn2en-json.html
git commit -m "Add 1/2/3 digit hotkeys for Mode switching"
```

---

## Task 3: 更新 hint 文本

**Files:**
- Modify: `cn2en-json.html`

- [ ] **Step 1: 替换 hint 内容**

定位到 body 中的 `<div id="hint" class="hint">← → 切换</div>`。将其替换为：

```html
    <div id="hint" class="hint">← → 切换 · 1-3 切 Mode · S 揭示</div>
```

- [ ] **Step 2: 手动验证 hint 显示**

刷新页面。
预期：底部居中显示 `← → 切换 · 1-3 切 Mode · S 揭示`（灰色小字）。

- [ ] **Step 3: 提交**

```bash
git add cn2en-json.html
git commit -m "Update hint to mention Mode hotkeys and reveal key"
```

---

## Task 4: 端到端手动验证

**Files:**
- 无文件修改（仅验证）

- [ ] **Step 1: 全新状态基线**

清所有 `cn2en-json:*` localStorage 键，刷新。
预期：底部 hint 显示 `← → 切换 · 1-3 切 Mode · S 揭示`。Mode 1 选中。

- [ ] **Step 2: 数字键切换 Mode**

粘贴 6 元素 JSON。按 2 → Mode 2 选中，enText 打码；按 3 → Mode 3 选中，全打码；按 1 → Mode 1 选中，原文。

- [ ] **Step 3: 数字键盘支持**

按 Numpad2 / Numpad3 / Numpad1。
预期：分别切换到 Mode 2 / 3 / 1，与顶行键等效。

- [ ] **Step 4: 修饰键不触发 Mode 切换**

按 Ctrl+1 / Shift+1 / Alt+1。
预期：触发浏览器默认行为，Mode 不变。

- [ ] **Step 5: 与 S 键正交**

按 S。
预期：enRevealed 切换，Mode 不变（无论当前 Mode）。

- [ ] **Step 6: 与导航键正交**

按 ArrowRight / ArrowLeft。
预期：条目切换，Mode 不变。

- [ ] **Step 7: 空数据时按键**

清空 localStorage（包括 `cn2en-json:data`），刷新。Mode 1 选中。按 2。
预期：Mode 2 选中（radio + localStorage），enText 仍隐藏（无数据）。

- [ ] **Step 8: 持久化跨刷新**

按 3，刷新。
预期：Mode 3 选中；粘贴 JSON 后英文默认全打码。

---

## 收尾

所有任务完成后，`cn2en-json.html` 支持数字键 1/2/3（含 Numpad）切换 Mode，无需点击 radio。复用 applyMode 工具函数，radio change 与 keydown 共享同一行为。底部 hint 提示所有可用快捷键。