# cn2en-json Mode Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `cn2en-json.html` 在 EN 语音下拉下方新增 Mode 1/Mode 2 单选框。Mode 2 下英文按 `[a-zA-Z]+` 切词，仅保留首字母其余替换为 `_`。S 键临时揭示当前句原文。Mode 选择持久化到 localStorage。

**Architecture:** 单文件扩展。在已有 speed-controls 容器模式基础上，新增 `#modeControls` 容器（`position:fixed; top:100px`）含两个 radio。模块作用域追加 `currentMode`、`enRevealed` 状态与 `maskEnText` 纯函数。`render()` 中根据 `currentMode === 1 || enRevealed` 决定 enText 显示并重置 enRevealed。新增 S 键与 mode change 监听。init 流程读取 localStorage 恢复。

**Tech Stack:** 纯 HTML/CSS/JS（vanilla），HTML5 radio input + String.replace + localStorage。

---

## File Structure

- Modify: `cn2en-json.html` — 单文件，在现有 HTML/CSS/JS 上扩展

无新增文件。

---

## Task 1: 添加 Mode 单选框 UI 与 CSS

**Files:**
- Modify: `cn2en-json.html`

- [ ] **Step 1: 追加 Mode 控件 CSS**

定位到 CSS 中最后一个右花括号之前（`#rate-value { ... font-variant-numeric: tabular-nums; }` 块的闭合 `}` 之后，下一个 `</style>` 之前）。在该行之后插入：

```css
        .mode-controls {
            position: fixed;
            top: 100px;
            left: 20px;
            z-index: 5;
            display: flex;
            gap: 10px;
            align-items: center;
        }
        .mode-radio-label {
            font-size: 14px;
            color: #888;
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
        }
        .mode-radio-label input {
            width: 14px;
            height: 14px;
            margin: 0;
        }
```

- [ ] **Step 2: 在 body 中添加 Mode 控件容器**

定位到 `<div id="ttsControlsEn" class="tts-controls">...</div>` 块的闭合 `</div>` 之后。在该行之后插入：

```html
    <div id="modeControls" class="mode-controls">
        <label class="mode-radio-label"><input type="radio" name="mode" value="1" checked> Mode 1</label>
        <label class="mode-radio-label"><input type="radio" name="mode" value="2"> Mode 2</label>
    </div>
```

- [ ] **Step 3: 手动验证 UI 显示**

在浏览器中打开 `cn2en-json.html`。

预期：左上角出现三行控件——CN 行（不变）、EN 行（不变）、Mode 行（Mode 1 选中，Mode 2 未选中）。Mode 行在 EN 行下方垂直排列。

- [ ] **Step 4: 提交**

```bash
git add cn2en-json.html
git commit -m "Add Mode radio UI and CSS"
```

---

## Task 2: 添加状态、maskEnText 与 render 集成

**Files:**
- Modify: `cn2en-json.html`

- [ ] **Step 1: 添加 STORAGE_KEY 常量**

定位到 script 块中 `const STORAGE_KEY_RATE_EN = 'cn2en-json:rateEn';` 这一行。在该行之后插入：

```js
    const STORAGE_KEY_MODE = 'cn2en-json:mode';
```

- [ ] **Step 2: 添加状态变量**

定位到 script 块中 `let enRate = 1.0;` 这一行。在该行之后插入：

```js
    let currentMode = 1;
    let enRevealed = false;
```

- [ ] **Step 3: 添加 modeRadios DOM 引用**

定位到 script 块中 `const enRateValue = document.getElementById('enRateValue');` 这一行。在该行之后插入：

```js
    const modeRadios = document.querySelectorAll('input[name="mode"]');
```

- [ ] **Step 4: 添加 maskEnText 函数**

定位到 script 块中 `function showError(msg) {` 这一行。在该行之前（即 `clearError` 函数结束后的闭合 `}` 之后，`function showError(msg) {` 之前），插入：

```js
    function maskEnText(text) {
        return text.replace(/[a-zA-Z]+/g, (match) =>
            match[0] + '_'.repeat(match.length - 1)
        );
    }

```

- [ ] **Step 5: 在 render 中重置 enRevealed 并应用 mask 逻辑**

定位到 script 块中的 `function render() {` 函数体。具体找到这两行：

```js
        const [cn, en] = entries[currentIndex];
        counter.textContent = `${currentIndex + 1}/${entries.length}`;
        cnText.textContent = cn;
        enText.textContent = en;
        speakCn();
```

将后三行替换为：

```js
        const [cn, en] = entries[currentIndex];
        counter.textContent = `${currentIndex + 1}/${entries.length}`;
        cnText.textContent = cn;
        enRevealed = false;
        const showFull = currentMode === 1 || enRevealed;
        enText.textContent = showFull ? en : maskEnText(en);
        speakCn();
```

- [ ] **Step 6: 手动验证 render 集成**

打开浏览器，粘贴 6 元素 JSON 按 Ctrl+V。

预期：默认 Mode 1 下英文完整显示（与之前一致）。切换到 Mode 2 单选框（即使还没有监听器，状态已经变化），重新按 ArrowRight 触发 render。

预期：英文显示为打码形式（如 "C_______ l_______ p__-c______ t_ m______ c___ f__ s____"）。

注：此步骤仅验证 render 逻辑与 maskEnText 函数正确。Mode 切换的即时反应在 Task 3 完成。

- [ ] **Step 7: 提交**

```bash
git add cn2en-json.html
git commit -m "Wire maskEnText and currentMode into render"
```

---

## Task 3: 添加 S 键监听与 Mode change 监听

**Files:**
- Modify: `cn2en-json.html`

- [ ] **Step 1: 在 keydown 监听中添加 S 键分支**

定位到 script 块中的 `document.addEventListener('keydown', async function (e) {` 函数体。具体找到这段：

```js
        if (e.ctrlKey && !e.shiftKey && !e.altKey && e.code === 'KeyV') {
            e.preventDefault();
            try {
                const text = await navigator.clipboard.readText();
                parseAndLoad(text);
            } catch (err) {
                showError(`剪贴板读取失败: ${err.message || err}`);
            }
        }
        if (entries.length > 0) {
```

将 `}` 闭合（即 `catch (err) {...}` 块结束后的 `}`）之后、`if (entries.length > 0) {` 之前插入：

```js
        if (e.code === 'KeyS' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
            if (entries.length === 0) return;
            e.preventDefault();
            enRevealed = !enRevealed;
            const showFull = currentMode === 1 || enRevealed;
            enText.textContent = showFull
                ? entries[currentIndex][1]
                : maskEnText(entries[currentIndex][1]);
        }
```

- [ ] **Step 2: 添加 Mode change 监听**

定位到 script 末尾的 `enRateInput.addEventListener('input', () => {` 整块结束后的 `});`。在该行之后（即 enRate 输入监听闭合之后）插入：

```js
    modeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) {
                currentMode = parseInt(radio.value, 10);
                localStorage.setItem(STORAGE_KEY_MODE, String(currentMode));
                if (entries.length > 0) {
                    const showFull = currentMode === 1 || enRevealed;
                    enText.textContent = showFull
                        ? entries[currentIndex][1]
                        : maskEnText(entries[currentIndex][1]);
                }
            }
        });
    });
```

- [ ] **Step 3: 手动验证 S 键与 Mode 切换**

粘贴 6 元素 JSON，停留在第 1 项。

预期（默认 Mode 1）：英文完整显示。

点击 Mode 2 单选框。

预期：英文立即变为打码形式，无闪烁或闪烁可忽略。

按 S 键。

预期：英文恢复为完整原文。

再按 S 键。

预期：英文再次打码。

按 ArrowRight 到第 2 项。

预期：第 2 项英文默认打码（Mode 2 + 未揭示）。

按 S 键揭示，再按 ArrowRight 到第 3 项。

预期：第 3 项英文默认打码（enRevealed 已重置）。

- [ ] **Step 4: 提交**

```bash
git add cn2en-json.html
git commit -m "Add S key handler and Mode change listener"
```

---

## Task 4: 添加 Mode 持久化与初始化恢复

**Files:**
- Modify: `cn2en-json.html`

- [ ] **Step 1: 在 init 流程中读取 saved mode 并应用**

定位到 script 末尾的 init 代码块，具体找到这段：

```js
    ttsEnabledEn = localStorage.getItem(STORAGE_KEY_TTS_EN) === "true";
    ttsToggleEn.checked = ttsEnabledEn;
    const savedCnRate = parseFloat(localStorage.getItem(STORAGE_KEY_RATE_CN));
```

将 `ttsToggleEn.checked = ttsEnabledEn;` 这一行之后、`const savedCnRate` 之前插入：

```js
    const savedMode = localStorage.getItem(STORAGE_KEY_MODE);
    if (savedMode === "2") {
        currentMode = 2;
    }
    modeRadios.forEach(radio => {
        radio.checked = parseInt(radio.value, 10) === currentMode;
    });
```

- [ ] **Step 2: 手动验证 Mode 持久化**

选择 Mode 2，刷新页面。

预期：Mode 2 仍选中（radio checked）。

清除 `cn2en-json:mode` localStorage 键，刷新。

预期：回到 Mode 1。

在 DevTools Console 执行：

```js
localStorage.setItem('cn2en-json:mode', 'invalid');
```

刷新页面。

预期：fallback 到 Mode 1（无效值不应用）。

清除该键。

- [ ] **Step 3: 提交**

```bash
git add cn2en-json.html
git commit -m "Persist Mode selection to localStorage"
```

---

## Task 5: 端到端手动验证

**Files:**
- 无文件修改（仅验证）

- [ ] **Step 1: 全新状态验证**

DevTools → Local Storage 清除所有 `cn2en-json:*` 键，刷新页面。

预期：左上角三行控件——CN 行、EN 行、Mode 行（Mode 1 选中）。右上角两滑块（1.0）。中央空状态。

- [ ] **Step 2: Mode 1 行为不变**

粘贴 6 元素 JSON 按 Ctrl+V。

预期：英文完整显示（第 1 项）。按 S 无视觉变化。

- [ ] **Step 3: Mode 2 打码显示**

点击 Mode 2。

预期：当前英文立即打码为 "C_______ l_______ p__-c______ t_ m______ c___ f__ s____"。导航到第 2、3 项也均为打码形式。

- [ ] **Step 4: S 键临时揭示**

在第 2 项（打码状态）按 S。

预期：英文恢复完整。再按 S 再次打码。

- [ ] **Step 5: 揭示状态跨导航重置**

在第 2 项按 S 揭示，按 ArrowRight 到第 3 项。

预期：第 3 项默认打码（enRevealed 已重置）。

- [ ] **Step 6: TTS 不受打码影响**

勾选 EN TTS，Mode 2 下听第 1 项朗读。

预期：TTS 朗读完整英文原文（不是打码版本）。

- [ ] **Step 7: 点击 enText 不影响显示**

Mode 2 下，点击 enText（打码状态）。

预期：TTS 朗读完整英文；enText 显示保持打码（点击不改变 enRevealed）。

- [ ] **Step 8: 持久化跨刷新**

选择 Mode 2，刷新。

预期：Mode 2 仍选中；粘贴 JSON 后英文默认打码。

- [ ] **Step 9: Mode 1 回归正常**

切换回 Mode 1。

预期：英文立即恢复完整显示。

---

## 收尾

所有任务完成后，`cn2en-json.html` 支持 Mode 1/Mode 2 单选切换：Mode 2 下英文按 `[a-zA-Z]+` 打码（首字母保留，其余 `_`），S 键临时揭示当前句（导航后重置），Mode 选择持久化。TTS 与点击 enText 始终读取原始英文。
