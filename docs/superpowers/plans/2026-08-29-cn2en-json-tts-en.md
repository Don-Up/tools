# cn2en-json English TTS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `cn2en-json.html` 增加英文朗读能力：顶部第二行放置英文语音下拉与 EN TTS 开关（默认关闭）；EN 开启时，CN 朗读结束后自动衔接朗读 EN。每个 toggle 独立控制。点击 enText 朗读英文。

**Architecture:** 在现有单文件 HTML 上扩展。重构 speakCn() 处理四象限逻辑（CN/EN 各自开关组合）；新增 speakEn() 函数，CN 的 onend 回调触发 EN；populateVoices 扩展为同时填充中英文两个下拉。EN 控件持久化 voice 名称与 toggle 状态。

**Tech Stack:** 纯 HTML/CSS/JS（vanilla），使用浏览器原生 SpeechSynthesis API + localStorage。

---

## File Structure

- Modify: `cn2en-json.html` — 单文件，在现有 HTML/CSS/JS 上扩展

无新增文件。

---

## Task 1: 添加 EN TTS 控件 UI 与 CSS

**Files:**
- Modify: `cn2en-json.html`

- [ ] **Step 1: 在 CSS 中追加 EN 行 top 偏移**

定位到 CSS 中的 `.tts-toggle-label input { ... }` 块结束后的最后一个右花括号（即 `.tts-toggle-label input` 样式块末尾），在该右花括号之后追加：

```css
        #ttsControlsEn { top: 60px; }
```

- [ ] **Step 2: 在 body 中添加第二行控件容器**

定位到现有的 `<div id="ttsControls" class="tts-controls">` 整块（即从 `<div id="ttsControls"` 到其闭合 `</div>`）。在该块之后插入：

```html
    <div id="ttsControlsEn" class="tts-controls">
        <select id="voiceSelectEn" class="voice-select"></select>
        <label class="tts-toggle-label"><input type="checkbox" id="ttsToggleEn"> EN TTS</label>
    </div>
```

- [ ] **Step 3: 手动验证 UI 显示**

在浏览器中打开 `cn2en-json.html`。

预期：左上角出现两行控件。第一行（CN）保留：语音下拉 + "☑ TTS" 复选框（已勾选）。第二行（EN）：英文语音下拉 + "☐ EN TTS" 复选框（未勾选）。右上角 counter 与下方条目显示不变。

- [ ] **Step 4: 提交**

```bash
git add cn2en-json.html
git commit -m "Add EN TTS control row UI below CN row"
```

---

## Task 2: 添加英文语音列表与状态变量

**Files:**
- Modify: `cn2en-json.html`

- [ ] **Step 1: 添加常量与状态变量**

定位到 script 块中 `const STORAGE_KEY_TTS = 'cn2en-json:ttsEnabled';` 这一行。在该行之后插入：

```js
    const STORAGE_KEY_VOICE_EN = 'cn2en-json:voiceEn';
    const STORAGE_KEY_TTS_EN = 'cn2en-json:ttsEnabledEn';
```

定位到 script 块中 `let ttsEnabled = true;` 这一行。在该行之后插入：

```js
    let voicesEN = [];
    let selectedVoiceEn = null;
    let ttsEnabledEn = false;
```

- [ ] **Step 2: 获取 EN DOM 引用**

定位到 script 块中 `const ttsToggle = document.getElementById('ttsToggle');` 这一行。在该行之后插入：

```js
    const voiceSelectEn = document.getElementById('voiceSelectEn');
    const ttsToggleEn = document.getElementById('ttsToggleEn');
```

- [ ] **Step 3: 在 populateVoices 中追加 EN 列表填充**

定位到 `function populateVoices() {` 函数体的最后一行（即 `if (selectedVoice) voiceSelect.value = selectedVoice.name;` 这一行）。在该行之后插入：

```js
        voicesEN = voices.filter(v => v.lang.startsWith("en-"));
        voiceSelectEn.innerHTML = voicesEN
            .map(v => `<option value="${v.name}">${v.name}</option>`)
            .join("");
        const savedEn = localStorage.getItem(STORAGE_KEY_VOICE_EN);
        if (savedEn && voicesEN.find(v => v.name === savedEn)) {
            voiceSelectEn.value = savedEn;
            selectedVoiceEn = voicesEN.find(v => v.name === savedEn);
        } else {
            selectedVoiceEn = voicesEN[0] || null;
            if (selectedVoiceEn) voiceSelectEn.value = selectedVoiceEn.name;
        }
```

- [ ] **Step 4: 在 init 流程中读取 EN toggle 并绑定 EN change 监听**

定位到 script 末尾的：

```js
    loadState();
    ttsEnabled = localStorage.getItem(STORAGE_KEY_TTS) !== "false";
    ttsToggle.checked = ttsEnabled;
    populateVoices();
```

将后两行替换为：

```js
    ttsToggle.checked = ttsEnabled;
    ttsEnabledEn = localStorage.getItem(STORAGE_KEY_TTS_EN) === "true";
    ttsToggleEn.checked = ttsEnabledEn;
    populateVoices();
```

（即在 `ttsToggle.checked = ttsEnabled;` 后插入 EN toggle 恢复两行，保留 `populateVoices();` 行不动。CN 的 change 监听器沿用已有的，不需要重复添加。）

定位到现有的 CN ttsToggle change 监听器（即 `ttsToggle.addEventListener('change', () => {` 开头的整块，到其闭合 `});`）。在该块之后插入：

```js
    voiceSelectEn.addEventListener('change', () => {
        selectedVoiceEn = voicesEN.find(v => v.name === voiceSelectEn.value) || null;
        if (selectedVoiceEn) {
            localStorage.setItem(STORAGE_KEY_VOICE_EN, selectedVoiceEn.name);
        }
    });
    ttsToggleEn.addEventListener('change', () => {
        ttsEnabledEn = ttsToggleEn.checked;
        localStorage.setItem(STORAGE_KEY_TTS_EN, String(ttsEnabledEn));
        if (!ttsEnabledEn) window.speechSynthesis.cancel();
    });
```

- [ ] **Step 5: 手动验证 EN 下拉与持久化**

打开页面，等待约 1 秒让 voices 加载。

预期：
- EN 下拉填充所有 `lang.startsWith("en-")` 的语音，默认选中第一个
- EN 复选框未勾选
- localStorage 中未出现 `cn2en-json:voiceEn` 与 `cn2en-json:ttsEnabledEn`（首次访问）

在 EN 下拉中选第二个语音，勾选 EN 复选框。

预期：localStorage 中出现 `cn2en-json:voiceEn`（所选语音名）与 `cn2en-json:ttsEnabledEn` (`"true"`)。

刷新页面。

预期：EN 下拉保持上次选择，复选框保持勾选。

清除两个键，恢复初始状态。

- [ ] **Step 6: 提交**

```bash
git add cn2en-json.html
git commit -m "Populate EN voices and persist EN settings"
```

---

## Task 3: 重构 speakCn、添加 speakEn 与点击响应

**Files:**
- Modify: `cn2en-json.html`

- [ ] **Step 1: 替换 speakCn 实现并新增 speakEn**

定位到 script 块中的整个 `function speakCn() { ... }` 函数（包括 `function speakCn() {` 到其闭合 `}`）。将其替换为：

```js
    function speakCn() {
        if (entries.length === 0) return;
        if (ttsEnabled && selectedVoice) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(entries[currentIndex][0]);
            utterance.voice = selectedVoice;
            if (ttsEnabledEn && selectedVoiceEn) {
                utterance.onend = () => speakEn();
            }
            window.speechSynthesis.speak(utterance);
        } else if (ttsEnabledEn && selectedVoiceEn) {
            speakEn();
        }
    }

    function speakEn() {
        if (!ttsEnabledEn || !selectedVoiceEn) return;
        const utterance = new SpeechSynthesisUtterance(entries[currentIndex][1]);
        utterance.voice = selectedVoiceEn;
        window.speechSynthesis.speak(utterance);
    }
```

- [ ] **Step 2: 为 enText 添加 click 监听**

定位到 script 块中 `cnText.addEventListener('click', () => speakCn());` 这一行。在该行之后插入：

```js
    enText.addEventListener('click', () => {
        if (ttsEnabledEn && selectedVoiceEn) speakEn();
    });
```

- [ ] **Step 3: 手动验证四象限行为**

粘贴 Task 2（上一 plan）验证步骤中的 2 元素 JSON。

**象限 1：CN 开 + EN 开**

确认 CN 复选框勾选、EN 复选框勾选。

预期：听到先读 CN"编译型语言会预编译为机器码以提升执行速度"，结束后自动读 EN"Compiled languages pre-compile to machine code for speed"。

**象限 2：CN 开 + EN 关**

取消勾选 EN 复选框，按 ArrowLeft 回到第 1 项（重新触发 render）。

预期：仅读 CN，不读 EN。

**象限 3：CN 关 + EN 开**

取消勾选 CN 复选框，勾选 EN 复选框，按 ArrowRight（重新触发 render）。

预期：跳过 CN，直接读 EN。

**象限 4：CN 关 + EN 关**

取消勾选 EN 复选框，按 ArrowLeft（重新触发 render）。

预期：静默，无朗读。

**点击 cnText**：勾选回 CN（保留 EN 关），按 ArrowRight 触发 render，听到读 CN。点击 cnText。

预期：CN 被打断，重新读 CN。

**点击 enText**：勾选回 EN（保留 CN 关），按 ArrowRight 触发 render（仅读 EN）。在 EN 朗读过程中点击 enText。

预期：当前 EN 被取消，新 EN 重新朗读。

**enText 点击依赖 EN toggle**：取消勾选 EN，按 ArrowRight（静默）。点击 enText。

预期：点击无响应（EN toggle 关闭时不朗读）。

恢复所有 toggle 到勾选状态以继续后续任务。

- [ ] **Step 4: 提交**

```bash
git add cn2en-json.html
git commit -m "Chain EN after CN via onend; add enText click handler"
```

---

## Task 4: 端到端手动验证

**Files:**
- 无文件修改（仅验证）

- [ ] **Step 1: 全新状态验证**

DevTools → Local Storage 清除所有 `cn2en-json:*` 键，刷新页面。

预期：左上角两行控件显示。CN 行：中文下拉默认选第一个，TTS 复选框已勾选。EN 行：英文下拉默认选第一个，EN TTS 复选框未勾选。中央显示空状态提示。

- [ ] **Step 2: CN+EN 全开验证**

勾选 EN 复选框。复制下方 6 元素 JSON 后按 Ctrl+V：

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

预期：听到先读 CN 第 1 项，再自动读 EN 第 1 项。

- [ ] **Step 3: 导航触发完整序列**

按 ArrowRight 5 次。

预期：每次切换都先读新条目 CN，再自动读 EN。共循环 6 次完整序列。

按 ArrowRight 一次（应循环回第 1 项）。

预期：再次读第 1 项的 CN+EN。

- [ ] **Step 4: 切换语音**

从 EN 下拉选另一个英文语音，按 ArrowRight。

预期：CN 仍用之前选择的 CN 语音朗读，EN 用新选择的英文语音朗读。

- [ ] **Step 5: 关闭 EN 切换**

取消勾选 EN 复选框。

预期：当前朗读立即停止。按 ArrowRight：仅读 CN，不读 EN。

- [ ] **Step 6: 关闭 CN 切换**

取消勾选 CN 复选框，勾选 EN 复选框。按 ArrowRight。

预期：跳过 CN，直接读 EN。

- [ ] **Step 7: 点击 enText**

取消勾选 EN 复选框（仅 CN 开）。点击 enText。

预期：点击 enText 无响应（EN toggle 关闭）。

勾选回 EN。点击 enText。

预期：听到读 EN。

- [ ] **Step 8: 持久化**

勾选回 CN（CN+EN 全开），按 ArrowRight 到第 4 项。刷新页面。

预期：自动恢复第 4 项并朗读 CN+EN，两个下拉与两个 toggle 都保持上次状态。

- [ ] **Step 9: 替换数据**

粘贴一个 3 元素的新 JSON，按 Ctrl+V。

预期：替换为新数据并朗读新数据第 1 项的 CN+EN，序号"1/3"。

---

## 收尾

所有任务完成后，`cn2en-json.html` 支持独立控制的中英文双语朗读：CN/EN 各自语音选择与开关，EN 在 CN 朗读结束后自动衔接，点击对应文本可手动重读。