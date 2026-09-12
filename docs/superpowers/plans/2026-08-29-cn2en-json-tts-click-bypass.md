# cn2en-json TTS Click Bypass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 cn2en-json.html 的 cnText/enText 点击始终播放 TTS，不再受 toggle 控制；render() 自动播放仍保留 toggle 行为。

**Architecture:** 单文件扩展。speakCn 与 speakEn 增加 `force` 布尔参数：force=true 时绕过对应 toggle 检查播放对应语言。cnText/enText 点击监听器改为 `speakCn(true)` / `speakEn(true)`。render() 调用 speakCn()（无 force）保留原自动播放行为。链 EN 是自动播放专属——force=true 点击 CN 不链 EN。

**Tech Stack:** 纯 HTML/CSS/JS（vanilla），浏览器原生 SpeechSynthesis API + addEventListener。

---

## File Structure

- Modify: `cn2en-json.html` — 单文件，在现有 speakCn/speakEn 与点击监听上扩展

无新增文件。

---

## Task 1: 更新 speakCn/speakEn 与点击监听器

**Files:**
- Modify: `cn2en-json.html`

- [ ] **Step 1: 更新 speakCn 函数签名**

定位到 script 中的 `function speakCn() {` 整块。当前内容为：

```js
    function speakCn() {
        if (entries.length === 0) return;
        if (ttsEnabled && selectedVoice) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(entries[currentIndex][0]);
            utterance.voice = selectedVoice;
            utterance.rate = cnRate;
            if (ttsEnabledEn && selectedVoiceEn) {
                utterance.onend = () => speakEn();
            }
            window.speechSynthesis.speak(utterance);
        } else if (ttsEnabledEn && selectedVoiceEn) {
            speakEn();
        }
    }
```

将整块替换为：

```js
    function speakCn(force) {
        if (entries.length === 0) return;
        if (force || (ttsEnabled && selectedVoice)) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(entries[currentIndex][0]);
            utterance.voice = selectedVoice;
            utterance.rate = cnRate;
            if (!force && ttsEnabledEn && selectedVoiceEn) {
                utterance.onend = () => speakEn();
            }
            window.speechSynthesis.speak(utterance);
        } else if (ttsEnabledEn && selectedVoiceEn) {
            speakEn();
        }
    }
```

（即 `speakCn()` → `speakCn(force)`；条件改为 `force || (ttsEnabled && selectedVoice)`；链 EN 条件加 `!force && ...` 守卫。）

- [ ] **Step 2: 更新 speakEn 函数签名**

定位到 script 中的 `function speakEn() {` 整块。当前内容为：

```js
    function speakEn() {
        if (!ttsEnabledEn || !selectedVoiceEn) return;
        const utterance = new SpeechSynthesisUtterance(entries[currentIndex][1]);
        utterance.voice = selectedVoiceEn;
        utterance.rate = enRate;
        window.speechSynthesis.speak(utterance);
    }
```

将整块替换为：

```js
    function speakEn(force) {
        if (!selectedVoiceEn) return;
        if (!force && !ttsEnabledEn) return;
        const utterance = new SpeechSynthesisUtterance(entries[currentIndex][1]);
        utterance.voice = selectedVoiceEn;
        utterance.rate = enRate;
        window.speechSynthesis.speak(utterance);
    }
```

（即 `speakEn()` → `speakEn(force)`；将原单条件 `if (!ttsEnabledEn || !selectedVoiceEn) return;` 拆为：先检查 voice（无论 force 都要求 voice 存在），再按 force 决定是否要求 toggle 开。）

- [ ] **Step 3: 更新 cnText 点击监听器**

定位到 script 块中的 `cnText.addEventListener('click', () => speakCn());` 这一行。将其替换为：

```js
    cnText.addEventListener('click', () => speakCn(true));
```

- [ ] **Step 4: 更新 enText 点击监听器**

定位到 script 块中的现有 `enText.addEventListener('click', () => { if (ttsEnabledEn && selectedVoiceEn) speakEn(); });` 这两行。将其整块替换为：

```js
    enText.addEventListener('click', () => speakEn(true));
```

- [ ] **Step 5: 手动验证签名更新**

在浏览器 DevTools Console 执行：

```js
typeof speakCn === 'function'   // true
typeof speakEn === 'function'   // true
```

预期：均为 `true`（函数仍存在）。

- [ ] **Step 6: 提交**

```bash
git add cn2en-json.html
git commit -m "Bypass TTS toggle when clicking text"
```

---

## Task 2: 端到端手动验证

**Files:**
- 无文件修改（仅验证）

- [ ] **Step 1: 全新状态基线**

DevTools → Local Storage 清除所有 `cn2en-json:*` 键，刷新。

预期：左上角 CN 行（☑ TTS）、EN 行（☐ EN TTS）。中央空状态。

- [ ] **Step 2: 自动播放保留行为（CN 开 EN 关）**

粘贴 6 元素 JSON 按 Ctrl+V。

预期：自动读 CN；不读 EN；不链 EN。点击 cnText 仍触发重新读 CN。

- [ ] **Step 3: 点击 enText 在 EN toggle 关闭时播放**

EN toggle 仍为关。点击 enText。

预期：听到读 EN（toggle 关闭下点击仍生效）。点击 enText 期间 cancel 当前任何朗读，重新读 EN。

- [ ] **Step 4: 双 toggle 关闭下点击仍播放**

取消 CN toggle 与 EN toggle。点击 cnText。

预期：听到读 CN（toggle 全关下点击仍生效）。

点击 enText。

预期：听到读 EN。

- [ ] **Step 5: 自动播放双关仍静默**

双 toggle 关闭，按 ArrowRight 触发 render。

预期：静默，无朗读（自动播放仍受 toggle 控制）。

- [ ] **Step 6: 自动播放 CN 关 EN 开仍跳 CN 直读 EN**

勾选 EN toggle（保留 CN 关），按 ArrowRight。

预期：听到读 EN，跳过 CN。

- [ ] **Step 7: 点击 CN 不链 EN**

勾选回 CN toggle（双 toggle 开）。点击 cnText。

预期：仅读 CN。CN 结束后不自动读 EN（点击不链 EN）。若想读 EN 需点击 enText。

- [ ] **Step 8: render 自动播放链 EN 仍正常**

按 ArrowRight 触发 render（双 toggle 开）。

预期：读 CN 后自动链读 EN（render 触发的自动播放链行为保留）。

- [ ] **Step 9: 视觉与持久化无变化**

确认 CN/EN toggle、voice 下拉、滑块、Mode 单选框视觉与交互无变化。刷新页面所有设置保持。

---

## 收尾

所有任务完成后，`cn2en-json.html` 的点击行为与 toggle 行为职责分离：
- 点击文本：始终播放（不受 toggle 影响）
- 自动播放（render）：受 toggle 控制（CN toggle 决定是否读 CN，EN toggle 决定是否读 EN 或链 EN）
- 链 EN：自动播放专属行为；点击 CN 不再链 EN