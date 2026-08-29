# cn2en-json TTS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `cn2en-json.html` 增加 Web Speech API 朗读中文功能：左上角放置中文语音下拉选择与 TTS 开关，条目变化（粘贴、导航、循环）时自动朗读中文，点击中文文本可手动重读，语音与开关状态持久化到 localStorage。

**Architecture:** 在现有单文件 HTML 上扩展。新增模块作用域状态（voicesCN, selectedVoice, ttsEnabled）、populateVoices() 初始化语音列表、speakCn() 单点朗读。render() 末尾调用 speakCn()；cnText 添加 click 监听。toggle 关闭时立即 cancel 当前朗读。

**Tech Stack:** 纯 HTML/CSS/JS（vanilla），使用浏览器原生 SpeechSynthesis API + localStorage。

---

## File Structure

- Modify: `cn2en-json.html` — 单文件，在现有 HTML/CSS/JS 上扩展

无新增文件。

---

## Task 1: 添加 TTS 控件 UI 与 CSS

**Files:**
- Modify: `cn2en-json.html`

- [ ] **Step 1: 在 `<style>` 块中追加 TTS 控件样式**

定位到 CSS 中的 `[hidden] { display: none; }` 这一行。在该行之后插入：

```css
        .tts-controls {
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 5;
            display: flex;
            gap: 10px;
            align-items: center;
        }
        .voice-select {
            padding: 4px 8px;
            font-size: 14px;
            background: #2c2c2c;
            color: #e0e0e0;
            border: 1px solid #444;
            border-radius: 4px;
        }
        .tts-toggle-label {
            font-size: 14px;
            color: #888;
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
        }
        .tts-toggle-label input {
            width: 16px;
            height: 16px;
            margin: 0;
        }
```

- [ ] **Step 2: 在 body 顶部添加 TTS 控件容器**

定位到 `<div id="errorBar" class="error-bar"></div>` 这一行。在该行之前插入：

```html
    <div id="ttsControls" class="tts-controls">
        <select id="voiceSelect" class="voice-select"></select>
        <label class="tts-toggle-label"><input type="checkbox" id="ttsToggle" checked> TTS</label>
    </div>
```

- [ ] **Step 3: 手动验证 UI 显示**

在浏览器中打开 `cn2en-json.html`。

预期：左上角出现深色下拉框（含当前系统可用的中文语音，初始可能为空直到 voices 加载）和"TTS"复选框（已勾选）。其他 UI（counter、cnText、enText、hint、emptyState）保持不变。

- [ ] **Step 4: 提交**

```bash
git add cn2en-json.html
git commit -m "Add TTS control UI and styles to top-left"
```

---

## Task 2: 添加语音列表初始化与持久化

**Files:**
- Modify: `cn2en-json.html` — 在 `<script>` 块中追加语音相关代码

- [ ] **Step 1: 添加常量与状态变量**

定位到 script 块中 `const STORAGE_KEY_DATA = 'cn2en-json:data';` 这一行。在该行之前插入：

```js
const STORAGE_KEY_VOICE = 'cn2en-json:voice';
const STORAGE_KEY_TTS = 'cn2en-json:ttsEnabled';

let voicesCN = [];
let selectedVoice = null;
let ttsEnabled = true;
```

定位到 script 块中 `const emptyState = document.getElementById('emptyState');` 这一行。在该行之后插入：

```js
    const voiceSelect = document.getElementById('voiceSelect');
    const ttsToggle = document.getElementById('ttsToggle');
```

- [ ] **Step 2: 添加 populateVoices 函数**

定位到 script 块中 `function render() {` 这一行。在该行之前插入：

```js
    function populateVoices() {
        const voices = window.speechSynthesis.getVoices();
        voicesCN = voices.filter(v => v.lang === "zh-CN" && !v.name.includes("PRC"));
        voiceSelect.innerHTML = voicesCN
            .map(v => `<option value="${v.name}">${v.name}</option>`)
            .join("");
        const saved = localStorage.getItem(STORAGE_KEY_VOICE);
        if (saved && voicesCN.find(v => v.name === saved)) {
            voiceSelect.value = saved;
            selectedVoice = voicesCN.find(v => v.name === saved);
        } else {
            selectedVoice = voicesCN[0] || null;
            if (selectedVoice) voiceSelect.value = selectedVoice.name;
        }
    }
```

- [ ] **Step 3: 在 init 流程中调用 populateVoices 并挂载 voiceschanged**

定位到 script 块末尾的：

```js
    loadState();
    render();
```

将其替换为：

```js
    loadState();
    ttsEnabled = localStorage.getItem(STORAGE_KEY_TTS) !== "false";
    ttsToggle.checked = ttsEnabled;
    populateVoices();
    window.speechSynthesis.onvoiceschanged = populateVoices;
    render();
```

- [ ] **Step 4: 手动验证下拉框填充**

打开页面，等待约 1 秒（下拉框应在 `voiceschanged` 事件后填充）。

预期：
- 下拉框显示系统中所有 `lang === "zh-CN"` 且不含 "PRC" 的语音名称
- 默认选中第一个
- DevTools → Application → Local Storage 中未出现 `cn2en-json:voice`（首次访问）

在 DevTools Console 中执行 `localStorage.setItem('cn2en-json:voice', '不存在的语音')`，刷新页面。

预期：下拉框回退到第一个可用语音。

清除该键，恢复正常状态。

- [ ] **Step 5: 提交**

```bash
git add cn2en-json.html
git commit -m "Populate zh-CN voices and select first by default"
```

---

## Task 3: 添加朗读函数与自动触发

**Files:**
- Modify: `cn2en-json.html` — 添加 speakCn() 并接入 render 与 cnText click

- [ ] **Step 1: 添加 speakCn 函数**

定位到 script 块中 `function parseAndLoad(text) {` 这一行。在该行之前插入：

```js
    function speakCn() {
        if (!ttsEnabled || entries.length === 0 || !selectedVoice) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(entries[currentIndex][0]);
        utterance.voice = selectedVoice;
        window.speechSynthesis.speak(utterance);
    }
```

- [ ] **Step 2: 在 render 末尾调用 speakCn**

定位到 `function render() {` 函数体的最后一行（即 `enText.textContent = en;` 这一行）。在该行之后插入：

```js
        speakCn();
```

注意：render() 有两个 return 分支（空状态分支在前面提前 return），所以这段代码只会在有数据时执行。

- [ ] **Step 3: 为 cnText 添加 click 监听**

定位到 script 块中 `const hint = document.getElementById('hint');` 这一行（实际上该行已在 Task 2 Step 1 之后存在）。在该 DOM 引用之后、任何函数定义之前的位置，定位到：

```js
    const emptyState = document.getElementById('emptyState');
```

在该行之后插入：

```js
    cnText.addEventListener('click', () => speakCn());
```

- [ ] **Step 4: 手动验证自动朗读**

粘贴 Task 2（上一 plan）验证步骤中的 2 元素 JSON，按 Ctrl+V。

预期：听到第 1 项的中文被朗读。

按 ArrowRight。

预期：第 1 项朗读被取消，改为朗读第 2 项。

按 ArrowLeft 两次（回到第 1 项）。

预期：朗读第 1 项。

点击 cnText 区域。

预期：当前条目的中文被重新朗读一次（即使之前正在朗读也会被 cancel 并重启）。

- [ ] **Step 5: 提交**

```bash
git add cn2en-json.html
git commit -m "Auto-speak CN on render; click cnText re-speaks"
```

---

## Task 4: 添加 TTS 开关与语音切换的持久化

**Files:**
- Modify: `cn2en-json.html` — 追加 change 监听

- [ ] **Step 1: 为 voiceSelect 添加 change 监听**

定位到 script 块中 `ttsToggle.checked = ttsEnabled;` 这一行。在该行之后插入：

```js
    voiceSelect.addEventListener('change', () => {
        selectedVoice = voicesCN.find(v => v.name === voiceSelect.value) || null;
        if (selectedVoice) {
            localStorage.setItem(STORAGE_KEY_VOICE, selectedVoice.name);
        }
    });
```

- [ ] **Step 2: 为 ttsToggle 添加 change 监听**

定位到上一条 change 监听之后，插入：

```js
    ttsToggle.addEventListener('change', () => {
        ttsEnabled = ttsToggle.checked;
        localStorage.setItem(STORAGE_KEY_TTS, String(ttsEnabled));
        if (!ttsEnabled) window.speechSynthesis.cancel();
    });
```

- [ ] **Step 3: 手动验证持久化**

在浏览器中：
1. 从下拉框选择第二个语音（如果有多个），听到新语音朗读当前条目
2. 取消勾选 TTS 复选框，停止当前朗读
3. DevTools → Local Storage 验证 `cn2en-json:voice` 和 `cn2en-json:ttsEnabled` 已写入
4. 刷新页面
5. 预期：下拉框保持上次选择的语音，TTS 复选框保持取消勾选状态

重新勾选 TTS，按 ArrowRight。

预期：恢复自动朗读。

- [ ] **Step 4: 提交**

```bash
git add cn2en-json.html
git commit -m "Persist voice choice and TTS toggle to localStorage"
```

---

## Task 5: 端到端手动验证

**Files:**
- 无文件修改（仅验证）

- [ ] **Step 1: 全新状态验证**

DevTools → Local Storage 清除所有 `cn2en-json:*` 键，刷新页面。

预期：左上角下拉框填充中文语音、默认选第一个，TTS 复选框已勾选，中央显示空状态提示。

- [ ] **Step 2: 粘贴触发朗读**

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

预期：听到第 1 项的中文"编译型语言会预编译为机器码以提升执行速度"被朗读，序号显示"1/6"。

- [ ] **Step 3: 导航触发朗读**

按 ArrowRight 5 次：依次朗读第 2-6 项。

按 ArrowRight 一次：朗读第 1 项（循环）。

按 ArrowLeft 一次：朗读第 6 项（反向循环）。

- [ ] **Step 4: 点击重读**

在朗读过程中点击 cnText。

预期：当前朗读被取消，新朗读开始。

- [ ] **Step 5: 关闭 TTS**

取消勾选 TTS 复选框。

预期：当前朗读立即停止，后续导航不朗读。点击 cnText 仍能朗读（手动覆盖）。

- [ ] **Step 6: 验证持久化**

勾选回 TTS，按 ArrowRight 到第 4 项。刷新页面。

预期：自动恢复第 4 项并朗读，下拉框保持上次选择，TTS 保持开启。

- [ ] **Step 7: 替换数据**

粘贴一个 3 元素的新 JSON，按 Ctrl+V。

预期：替换为新数据并朗读新数据的第 1 项，序号"1/3"。

---

## 收尾

所有任务完成后，`cn2en-json.html` 增加完整 TTS 能力：可选择中文语音、开关控制自动朗读、点击中文手动重读、设置跨刷新保留。