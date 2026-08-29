# cn2en-json TTS Design Specification

## Overview

为 `cn2en-json.html` 增加 Web Speech API 朗读功能：左上角放置中文语音下拉选择与 TTS 开关。每次条目变化（首次粘贴、左右键切换、循环）自动朗读当前条目的中文部分；点击中文文本可手动重读。

## Layout Structure

```
┌────────────────────────────────────────┐
│ [▼ Microsoft Xxx (Natural) …] [☑ TTS] │ ← 顶栏，新 UI（左上角）
│                                        │
│                              1/6       │ ← 右上角 counter保留
│                                        │
│   编译型语言会预编译为机器码以提升执行速度    │  ← 中文，64px，金色
│                                        │
│   Compiled languages pre-compile to …  │  ← 英文，48px，白色
│                                        │
│   ← → 切换                              │  ← 底部小字提示
└────────────────────────────────────────┘
```

## Visual Design

| 元素 | 值 |
|------|-----|
| Top-left 容器 `.tts-controls` | position fixed, top 20px, left 20px, z-index 5, display flex, gap 10px, align-items center |
| `.voice-select` | padding 4px 8px, font-size 14px, background #2c2c2c, color #e0e0e0, border 1px solid #444, border-radius 4px |
| `.tts-toggle` | 默认浏览器 checkbox 样式，width/height 16px |
| `.tts-toggle-label` | font-size 14px, color #888 |

## Functionality

### 语音列表

- 来源：`window.speechSynthesis.getVoices()`
- 过滤：`lang === "zh-CN" && !name.includes("PRC")`
- 监听 `voiceschanged` 事件重新填充
- 初始化时尝试恢复 `cn2en-json:voice` 中的语音；找不到则 fallback 到 `voicesCN[0]`

### TTS 开关

- 默认开启（`ttsEnabled = true`）
- 状态持久化到 `cn2en-json:ttsEnabled`
- 关闭时立即 `speechSynthesis.cancel()` 终止当前朗读

### 朗读触发

`render()` 末尾调用 `speakCn()`，条件：toggle 开且 `selectedVoice` 非空且 `entries` 非空。

```js
function speakCn() {
    if (!ttsEnabled || entries.length === 0 || !selectedVoice) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(entries[currentIndex][0]);
    utterance.voice = selectedVoice;
    speechSynthesis.speak(utterance);
}
```

`#cnText` 添加 click 监听：调用 `speakCn()`。作为手动覆盖，**不受 toggle 影响**（即使 toggle 关闭，点击仍触发朗读）。

### 朗读速率

固定 `rate = 1.0`。无控件。

### 持久化

localStorage 新增键：
- `cn2en-json:voice`：语音名称字符串
- `cn2en-json:ttsEnabled`："true" 或 "false"

`loadState()` 中读取 ttsEnabled（默认 true）；populateVoices() 中读取并应用 voice。

## State

模块作用域追加：
- `let voicesCN = []`
- `let selectedVoice = null`
- `let ttsEnabled = true`

localStorage 键常量：
- `STORAGE_KEY_VOICE = 'cn2en-json:voice'`
- `STORAGE_KEY_TTS = 'cn2en-json:ttsEnabled'`

## Error Handling

| 情况 | 行为 |
|------|------|
| `speechSynthesis` 不可用 | speakCn 静默 no-op，不报错 |
| 选中的 voice 已不可用 | populateVoices fallback 到 voicesCN[0] |
| 朗读过程中浏览器报错 | 浏览器原生 console 输出，不影响其它功能 |
| 用户拒绝语音权限 | 浏览器原生行为，speak 可能被静默忽略 |

## File

- Modify: `cn2en-json.html` — 在现有 HTML/CSS/JS 上扩展：
  - body 增加 `<div id="ttsControls" class="tts-controls">` 含 `<select id="voiceSelect">` 与 `<label><input type="checkbox" id="ttsToggle" checked> TTS</label>`
  - CSS 增加 `.tts-controls`、`.voice-select`、`.tts-toggle-label` 样式
  - JS 增加 voicesCN/selectedVoice/ttsEnabled 状态、populateVoices()、speakCn()；loadState 读取 ttsEnabled；render 末尾调用 speakCn；cnText click 监听；ttsToggle change 监听

## Out of Scope

- 朗读速率/音调/音量控件
- 英文部分朗读（仅朗读中文）
- 句子级高亮
- 录音 / 播放
- 多个语音角色（cn2en.html 的 Role1/Role2 模式）
- 暂停/恢复按钮（关闭 toggle 即可停止）