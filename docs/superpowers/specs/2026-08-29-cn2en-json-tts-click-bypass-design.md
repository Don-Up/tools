# cn2en-json TTS Click Bypass Design Specification

## Overview

为 `cn2en-json.html` 修改 TTS 文本点击行为：点击 cnText 或 enText 时始终播放对应语言的 TTS，不再受 toggle 状态控制。toggle 状态仍仅影响自动播放（render 触发）行为——CN 关闭时不自动读 CN，EN 关闭时不链 EN。点击行为是手动触发的"我要听"，与 toggle 的"是否自动播放"职责分离。

## Layout Structure

无视觉变化。

## Visual Design

无变化。

## Functionality

### speakCn 新签名

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

- `force === true`：绕过 `ttsEnabled` 检查直接播放 CN；不触发 onend → speakEn（手动点击不链 EN）
- `force === false/undefined`：原行为（toggle 控制播放与链 EN）

### speakEn 新签名

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

- `force === true`：绕过 `ttsEnabledEn` 检查播放 EN
- `force === false/undefined`：原行为（toggle 控制播放）
- 始终保留 `selectedVoiceEn` null 检查（无语音时无可用资源）

### 点击处理器更新

```js
cnText.addEventListener('click', () => speakCn(true));
enText.addEventListener('click', () => speakEn(true));
```

替换现有的：

```js
cnText.addEventListener('click', () => speakCn());
enText.addEventListener('click', () => {
    if (ttsEnabledEn && selectedVoiceEn) speakEn();
});
```

### render() 自动播放不变

`render()` 仍以 `speakCn()`（无 force）调用，自动播放流程不变：
- CN toggle 开 + EN toggle 开 → 读 CN，链 EN
- CN toggle 开 + EN toggle 关 → 读 CN
- CN toggle 关 + EN toggle 开 → 跳 CN，直接读 EN
- 双关 → 静默

## 行为矩阵

| 场景 | CN toggle | EN toggle | 点击 CN | 点击 EN | render 触发 |
|------|-----------|-----------|---------|---------|-------------|
| 全开 | 开 | 开 | 读 CN | 读 EN | 读 CN 后链 EN |
| CN 开 EN 关 | 开 | 关 | 读 CN | 读 EN | 仅读 CN |
| CN 关 EN 开 | 关 | 开 | 读 CN | 读 EN | 跳 CN 直读 EN |
| 双关 | 关 | 关 | 读 CN | 读 EN | 静默 |

## State

无新增状态变量。

## Error Handling

| 情况 | 行为 |
|------|------|
| selectedVoice null 时点击 CN | utterance 用默认 voice；如系统无语音，浏览器静默 |
| selectedVoiceEn null 时点击 EN | speakEn 早返回（无语音可播） |
| 双 toggle 关闭时点击 CN | speakCn(true) 直接播放 CN（不受 toggle 影响） |
| 双 toggle 关闭时点击 EN | speakEn(true) 直接播放 EN（不受 toggle 影响） |

## File

- Modify: `cn2en-json.html`：
  - `speakCn` 函数签名加 `force` 参数，内部按 force 绕过 toggle 与跳过 onend 链
  - `speakEn` 函数签名加 `force` 参数，内部按 force 绕过 toggle
  - cnText 与 enText 点击监听器改为 `speakCn(true)` / `speakEn(true)`

## Out of Scope

- 点击时高亮当前朗读文本
- 点击时禁止 cancel 当前朗读（保留 cancel：手动点击打断自动播放，符合直觉）
- 长按或多击的连发逻辑
- toggle 关闭时的视觉反馈（如按钮置灰）
- 链 EN 行为在点击 CN 时启用（明确为自动播放专属）