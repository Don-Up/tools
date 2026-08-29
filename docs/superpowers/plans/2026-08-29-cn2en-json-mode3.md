# cn2en-json Mode 3 Addition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `cn2en-json.html` Mode 单选框组新增 Mode 3，行为同 Mode 2 但首字母也替换为 `_`（即每词所有字母都打码）。

**Architecture:** 单文件扩展。HTML 在 `#modeControls` 内新增第三个 radio label。`maskEnText` 函数增加 `preserveFirst` 布尔参数。render、S 键监听、Mode change 监听中的 maskEnText 调用点按 `currentMode` 传参（Mode 2 传 true，Mode 3 传 false；Mode 1 直接用原文不走 mask）。init 流程扩展合法值集合为 `"2"` 与 `"3"`。`modeRadios` 通过 `querySelectorAll('input[name="mode"]')` 自动包含新 radio，无需改动监听器注册。

**Tech Stack:** 纯 HTML/CSS/JS（vanilla），HTML5 radio + String.replace + localStorage。

---

## File Structure

- Modify: `cn2en-json.html` — 单文件，在现有 Mode 实现上扩展

无新增文件。

---

## Task 1: 添加 Mode 3 radio 与 maskEnText 新签名

**Files:**
- Modify: `cn2en-json.html`

- [ ] **Step 1: 在 #modeControls 内新增 Mode 3 radio**

定位到 body 中的这段：

```html
    <div id="modeControls" class="mode-controls">
        <label class="mode-radio-label"><input type="radio" name="mode" value="1" checked> Mode 1</label>
        <label class="mode-radio-label"><input type="radio" name="mode" value="2"> Mode 2</label>
    </div>
```

将 `</div>` 之前插入：

```html
        <label class="mode-radio-label"><input type="radio" name="mode" value="3"> Mode 3</label>
```

（即在 Mode 2 label 之后、容器闭合 `</div>` 之前新增一行。）

- [ ] **Step 2: 更新 maskEnText 函数签名**

定位到 script 中的现有函数：

```js
    function maskEnText(text) {
        return text.replace(/[a-zA-Z]+/g, (match) =>
            match[0] + '_'.repeat(match.length - 1)
        );
    }
```

将其整块替换为：

```js
    function maskEnText(text, preserveFirst) {
        return text.replace(/[a-zA-Z]+/g, (match) =>
            preserveFirst
                ? match[0] + '_'.repeat(match.length - 1)
                : '_'.repeat(match.length)
        );
    }
```

- [ ] **Step 3: 手动验证签名更新**

在浏览器 DevTools Console 执行：

```js
maskEnText("Compiled", true)   // "C_______"
maskEnText("Compiled", false)  // "________"
maskEnText("JIT", false)        // "___"
maskEnText("don't", false)      // "____'t"
maskEnText("pre-compile", false) // "___-_______"
```

预期：返回值如注释所示。

注：此步骤不验证 UI 行为（仅验证函数本身可调用）。UI 集成在 Task 2 完成。

- [ ] **Step 4: 提交**

```bash
git add cn2en-json.html
git commit -m "Add Mode 3 radio and update maskEnText signature"
```

---

## Task 2: 更新 render、S 键与 Mode change 监听中的 maskEnText 调用

**Files:**
- Modify: `cn2en-json.html`

本任务修复现有三处 `maskEnText` 调用（参数必须更新以匹配新签名），并按 currentMode 决定 preserveFirst。

- [ ] **Step 1: 更新 render 中的 maskEnText 调用**

定位到 script 中的 `function render() {` 函数体，找到这段：

```js
        enRevealed = false;
        const showFull = currentMode === 1 || enRevealed;
        enText.textContent = showFull ? en : maskEnText(en);
        speakCn();
```

将最后两行替换为：

```js
        enRevealed = false;
        if (currentMode === 1) {
            enText.textContent = en;
        } else {
            enText.textContent = maskEnText(en, currentMode === 2);
        }
        speakCn();
```

（即 Mode 1 直接赋值原文；Mode 2/3 走 maskEnText，按 `currentMode === 2` 决定 preserveFirst。）

- [ ] **Step 2: 更新 S 键监听中的 maskEnText 调用**

定位到 keydown 监听中 `e.code === 'KeyS'` 分支，找到这段：

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

将最后两行替换为：

```js
        if (e.code === 'KeyS' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
            if (entries.length === 0) return;
            e.preventDefault();
            enRevealed = !enRevealed;
            if (currentMode === 1 || enRevealed) {
                enText.textContent = entries[currentIndex][1];
            } else {
                enText.textContent = maskEnText(entries[currentIndex][1], currentMode === 2);
            }
        }
```

- [ ] **Step 3: 更新 Mode change 监听中的 maskEnText 调用**

定位到 `modeRadios.forEach(radio => { radio.addEventListener('change', () => { ... }) });` 整块。找到内部这段：

```js
                if (entries.length > 0) {
                    const showFull = currentMode === 1 || enRevealed;
                    enText.textContent = showFull
                        ? entries[currentIndex][1]
                        : maskEnText(entries[currentIndex][1]);
                }
```

将其替换为：

```js
                if (entries.length > 0) {
                    if (currentMode === 1) {
                        enText.textContent = entries[currentIndex][1];
                    } else {
                        enText.textContent = maskEnText(entries[currentIndex][1], currentMode === 2);
                    }
                }
```

- [ ] **Step 4: 手动验证三处调用集成**

打开浏览器，粘贴 6 元素 JSON 按 Ctrl+V（默认 Mode 1）。

预期：英文完整显示。

切到 Mode 2。
预期：英文打码（首字母保留），如 `C_______ l_______ p__-c______ t_ m______ c___ f__ s____`。

切到 Mode 3。
预期：英文全打码（首字母也替换），如 `________ _________ ___-_______ __ _______ ____ ___ _____`。

按 S 键。
预期：英文恢复完整。

再按 S。
预期：恢复全打码（Mode 3）。

按 ArrowRight 到第 2 项。
预期：默认全打码（enRevealed 已重置，Mode 3 仍生效）。

- [ ] **Step 5: 提交**

```bash
git add cn2en-json.html
git commit -m "Update render and handlers to pass preserveFirst based on currentMode"
```

---

## Task 3: 扩展 init 流程合法值集合

**Files:**
- Modify: `cn2en-json.html`

- [ ] **Step 1: 更新 init 读取逻辑**

定位到 script 末尾的 init 代码块，找到这段：

```js
    const savedMode = localStorage.getItem(STORAGE_KEY_MODE);
    if (savedMode === "2") {
        currentMode = 2;
    }
    modeRadios.forEach(radio => {
        radio.checked = parseInt(radio.value, 10) === currentMode;
    });
```

将 `if` 条件替换为：

```js
    const savedMode = localStorage.getItem(STORAGE_KEY_MODE);
    if (savedMode === "2" || savedMode === "3") {
        currentMode = parseInt(savedMode, 10);
    }
    modeRadios.forEach(radio => {
        radio.checked = parseInt(radio.value, 10) === currentMode;
    });
```

- [ ] **Step 2: 手动验证 Mode 3 持久化**

选 Mode 3，刷新页面。
预期：Mode 3 仍选中（radio checked），粘贴 JSON 后英文默认全打码。

清除 `cn2en-json:mode` localStorage 键，刷新。
预期：回到 Mode 1。

在 DevTools Console 执行：

```js
localStorage.setItem('cn2en-json:mode', 'invalid');
```

刷新。
预期：fallback 到 Mode 1（无效值不应用）。

再执行：

```js
localStorage.setItem('cn2en-json:mode', '3');
```

刷新。
预期：Mode 3 选中。

清除该键。

- [ ] **Step 3: 提交**

```bash
git add cn2en-json.html
git commit -m "Accept Mode 3 in init persistence"
```

---

## Task 4: 端到端手动验证

**Files:**
- 无文件修改（仅验证）

- [ ] **Step 1: 全新状态**

DevTools → Local Storage 清除所有 `cn2en-json:*` 键，刷新。

预期：左上角三行控件；Mode 行三 radio，Mode 1 选中。中央空状态。

- [ ] **Step 2: Mode 1 行为不变**

粘贴 6 元素 JSON 按 Ctrl+V。

预期：英文完整显示（第 1 项）；按 S 无视觉变化。

- [ ] **Step 3: Mode 2 首字母保留打码**

切到 Mode 2。
预期：英文显示 `C_______ l_______ p__-c______ t_ m______ c___ f__ s____`。

- [ ] **Step 4: Mode 3 全打码**

切到 Mode 3。
预期：英文显示 `________ _________ ___-_______ __ _______ ____ ___ _____`（所有字母替换，首字母也无）。

- [ ] **Step 5: S 键在 Mode 3 下临时揭示**

按 S。
预期：英文恢复完整（不变按 S）。
预期：英文再次全打码。

- [ ] **Step 6: 揭示跨导航重置**

在第 1 项按 S 揭示，按 ArrowRight 到第 2 项。

预期：第 2 项默认全打码（enRevealed 已重置，Mode 3 仍生效）。

- [ ] **Step 7: TTS 与点击不受打码影响**

勾选 EN TTS，Mode 3 下听第 1 项。
预期：朗读完整英文（不是 `________ _________ ___-_______ ...`）。

Mode 3 下点击 enText。
预期：朗读完整英文；enText 显示保持全打码（点击不改变 enRevealed）。

- [ ] **Step 8: 三种 Mode 间切换即时生效**

依次 Mode 1 → Mode 2 → Mode 3 → Mode 1（无需刷新）。

预期：每次切换后 enText 立即重新计算（完整 / 首字母保留打码 / 全打码 / 完整）。

- [ ] **Step 9: 持久化跨刷新**

选 Mode 3，刷新。
预期：Mode 3 选中；粘贴 JSON 后英文默认全打码。

---

## 收尾

所有任务完成后，`cn2en-json.html` 的 Mode 三选项全部可用：Mode 1（完整）、Mode 2（首字母保留打码）、Mode 3（全打码）。S 键、Mode change 监听、render 集成、init 持久化全部按 currentMode 正确路由。TTS 与点击始终读取原始英文。
