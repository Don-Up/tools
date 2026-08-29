# cn2en-json Rate Sliders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `cn2en-json.html` 右侧新增两个语速滑块（CN/EN 独立），范围 1-3，默认 1.0，步长 0.1。新值实时更新显示与持久化到 localStorage，下一次朗读应用新语速。

**Architecture:** 在现有单文件 HTML 上扩展。新增模块作用域状态（cnRate, enRate），speakCn/speakEn 在构造 utterance 时读取对应 rate 变量。两个滑块 input 事件更新变量、显示与 localStorage。init 流程读取并恢复 saved 值。counter 从原独立位置移入 speed-controls 容器内。

**Tech Stack:** 纯 HTML/CSS/JS（vanilla），使用浏览器原生 HTML5 range input + SpeechSynthesisUtterance.rate + localStorage。

---

## File Structure

- Modify: `cn2en-json.html` — 单文件，在现有 HTML/CSS/JS 上扩展

无新增文件。

---

## Task 1: 添加滑块 UI、容器与 CSS（含 counter 移入）

**Files:**
- Modify: `cn2en-json.html`

- [ ] **Step 1: 调整 `.counter` 样式**

定位到 CSS 中的 `.counter { ... }` 块。当前内容为：

```css
        .counter {
            position: fixed;
            top: 20px;
            right: 20px;
            font-size: 18px;
            color: #888;
        }
```

将整个块替换为：

```css
        .counter {
            font-size: 18px;
            color: #888;
        }
```

（即移除 position fixed / top / right，由外层容器控制位置）

- [ ] **Step 2: 追加滑块控件样式**

定位到 CSS 中 `#ttsControlsEn { top: 60px; }` 这一行。在该行之后插入：

```css
        .speed-controls {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 5;
            display: flex;
            flex-direction: column;
            gap: 10px;
            align-items: flex-end;
        }
        .speed-row {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: #888;
        }
        .speed-label {
            font-size: 12px;
            color: #888;
            width: 24px;
        }
        .rate-slider {
            width: 100px;
            cursor: pointer;
        }
        .rate-value {
            min-width: 30px;
            text-align: right;
            font-variant-numeric: tabular-nums;
        }
```

- [ ] **Step 3: 移动 counter 至 speed-controls 容器**

定位到 body 中的 `<div id="counter" class="counter" hidden></div>` 这一行。将其替换为以下整块：

```html
    <div id="speedControls" class="speed-controls">
        <div class="speed-row">
            <span class="speed-label">CN</span>
            <input type="range" id="cnRate" min="1" max="3" value="1" step="0.1" class="rate-slider">
            <span id="cnRateValue" class="rate-value">1.0</span>
        </div>
        <div class="speed-row">
            <span class="speed-label">EN</span>
            <input type="range" id="enRate" min="1" max="3" value="1" step="0.1" class="rate-slider">
            <span id="enRateValue" class="rate-value">1.0</span>
        </div>
        <div id="counter" class="counter" hidden></div>
    </div>
```

- [ ] **Step 4: 手动验证 UI 显示**

在浏览器中打开 `cn2en-json.html`。

预期：右上角出现垂直三行布局——CN 滑块（显示"1.0"）+ EN 滑块（显示"1.0"）。counter 默认隐藏（无数据时）。所有滑块位于最小区间位置（值为 1）。

- [ ] **Step 5: 提交**

```bash
git add cn2en-json.html
git commit -m "Add rate slider UI and move counter into speed-controls"
```

---

## Task 2: 添加语速状态变量并应用到朗读

**Files:**
- Modify: `cn2en-json.html`

- [ ] **Step 1: 添加 localStorage 键常量**

定位到 script 块中 `const STORAGE_KEY_TTS_EN = 'cn2en-json:ttsEnabledEn';` 这一行。在该行之后插入：

```js
    const STORAGE_KEY_RATE_CN = 'cn2en-json:rateCn';
    const STORAGE_KEY_RATE_EN = 'cn2en-json:rateEn';
```

- [ ] **Step 2: 添加语速状态变量**

定位到 script 块中 `let ttsEnabledEn = false;` 这一行。在该行之后插入：

```js
    let cnRate = 1.0;
    let enRate = 1.0;
```

- [ ] **Step 3: 获取滑块 DOM 引用**

定位到 script 块中 `const ttsToggleEn = document.getElementById('ttsToggleEn');` 这一行。在该行之后插入：

```js
    const cnRateInput = document.getElementById('cnRate');
    const enRateInput = document.getElementById('enRate');
    const cnRateValue = document.getElementById('cnRateValue');
    const enRateValue = document.getElementById('enRateValue');
```

- [ ] **Step 4: 在 speakCn 中应用 cnRate**

定位到 script 块中 `function speakCn() {` 函数体内 `utterance.voice = selectedVoice;` 这一行。在 CN utterance 的该行之后（即在 `if (ttsEnabledEn && selectedVoiceEn) {` 这一行之前），插入：

```js
            utterance.rate = cnRate;
```

- [ ] **Step 5: 在 speakEn 中应用 enRate**

定位到 script 块中 `function speakEn() {` 函数体内 `utterance.voice = selectedVoiceEn;` 这一行。在该行之后插入：

```js
        utterance.rate = enRate;
```

- [ ] **Step 6: 手动验证滑块变化应用**

在浏览器中粘贴 6 元素 JSON，按 Ctrl+V。先听一次正常语速朗读。拖动 CN 滑块到 2.0，按 ArrowRight 触发新一轮朗读。

预期：CN 朗读明显变快（仍按 cnRate=2.0）。EN 朗读保持原速（仍 1.0）。

拖动 EN 滑块到 2.5，按 ArrowRight。

预期：CN 用 cnRate=2.0，EN 用 enRate=2.5，EN 明显更快。

- [ ] **Step 7: 提交**

```bash
git add cn2en-json.html
git commit -m "Apply rate variables to utterances and sliders"
```

---

## Task 3: 添加滑块持久化与初始化恢复

**Files:**
- Modify: `cn2en-json.html`

- [ ] **Step 1: 添加滑块 input 监听**

定位到 script 块中 `ttsToggleEn.addEventListener('change', () => {` 块结束后的闭合 `});`。在该行之后插入：

```js
    cnRateInput.addEventListener('input', () => {
        cnRate = parseFloat(cnRateInput.value);
        cnRateValue.textContent = cnRate.toFixed(1);
        localStorage.setItem(STORAGE_KEY_RATE_CN, String(cnRate));
    });
    enRateInput.addEventListener('input', () => {
        enRate = parseFloat(enRateInput.value);
        enRateValue.textContent = enRate.toFixed(1);
        localStorage.setItem(STORAGE_KEY_RATE_EN, String(enRate));
    });
```

- [ ] **Step 2: 在 init 流程中读取 saved rate 并应用**

定位到 script 末尾的：

```js
    loadState();
    ttsEnabled = localStorage.getItem(STORAGE_KEY_TTS) !== "false";
    ttsToggle.checked = ttsEnabled;
    ttsEnabledEn = localStorage.getItem(STORAGE_KEY_TTS_EN) === "true";
    ttsToggleEn.checked = ttsEnabledEn;
    populateVoices();
```

将后两行替换为：

```js
    ttsToggleEn.checked = ttsEnabledEn;
    const savedCnRate = parseFloat(localStorage.getItem(STORAGE_KEY_RATE_CN));
    if (!isNaN(savedCnRate) && savedCnRate >= 1 && savedCnRate <= 3) {
        cnRate = savedCnRate;
        cnRateInput.value = String(cnRate);
        cnRateValue.textContent = cnRate.toFixed(1);
    }
    const savedEnRate = parseFloat(localStorage.getItem(STORAGE_KEY_RATE_EN));
    if (!isNaN(savedEnRate) && savedEnRate >= 1 && savedEnRate <= 3) {
        enRate = savedEnRate;
        enRateInput.value = String(enRate);
        enRateValue.textContent = enRate.toFixed(1);
    }
    populateVoices();
```

- [ ] **Step 3: 手动验证持久化**

拖动 CN 滑块到 1.8，拖动 EN 滑块到 2.3。

预期：localStorage 中出现 `cn2en-json:rateCn` = "1.8" 与 `cn2en-json:rateEn` = "2.3"，显示值同步更新（"1.8"、"2.3"）。

刷新页面。

预期：CN 滑块回到 1.8 位置、显示"1.8"；EN 滑块回到 2.3 位置、显示"2.3"。

粘贴 6 元素 JSON 按 Ctrl+V。

预期：CN 用 1.8 语速读，EN 用 2.3 语速读。

清除 localStorage 中的 `cn2en-json:rateCn` 与 `cn2en-json:rateEn`，刷新。

预期：滑块回到默认 1.0 位置，显示"1.0"，cnRate/enRate 重置为 1.0。

- [ ] **Step 4: 手动验证无效值处理**

在 DevTools Console 执行：

```js
localStorage.setItem('cn2en-json:rateCn', 'invalid');
localStorage.setItem('cn2en-json:rateEn', '5.0');
```

刷新页面。

预期：滑块保持 1.0（无效值 fallback），显示"1.0"。

清除两个键。

- [ ] **Step 5: 提交**

```bash
git add cn2en-json.html
git commit -m "Persist rate slider values to localStorage"
```

---

## Task 4: 端到端手动验证

**Files:**
- 无文件修改（仅验证）

- [ ] **Step 1: 全新状态验证**

DevTools → Local Storage 清除所有 `cn2en-json:*` 键，刷新页面。

预期：右上角 CN 滑块在 1.0、EN 滑块在 1.0。中央空状态提示。counter 隐藏。

- [ ] **Step 2: 滑块调整与显示同步**

拖动 CN 滑块到 2.5，拖动 EN 滑块到 1.5。

预期：显示同步更新为"2.5"与"1.5"。

- [ ] **Step 3: 粘贴触发朗读**

复制下方 6 元素 JSON 后按 Ctrl+V：

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

预期：CN 用 2.5 语速读，EN 用 1.5 语速读（EN 明显慢于 CN）。

- [ ] **Step 4: 拖动滑块即时生效**

在朗读过程中拖动 CN 滑块从 2.5 到 1.0，按 ArrowRight。

预期：当前 CN 朗读完成后，下次 CN 用 1.0 语速。EN 仍用 1.5。

- [ ] **Step 5: 持久化恢复**

按 ArrowRight 到第 3 项，刷新页面。

预期：自动恢复第 3 项并按 cnRate=1.0/enRate=1.5 朗读；滑块位置与显示恢复。

- [ ] **Step 6: counter 在 speed-controls 内**

确认 counter 位置在右下区域，与滑块同列，垂直对齐。

预期：counter 显示在 EN 滑块下方，水平右对齐。

---

## 收尾

所有任务完成后，`cn2en-json.html` 支持 CN/EN 独立语速控制：右侧两滑块实时调整、显示同步、持久化恢复；speakCn/speakEn 应用新语速。