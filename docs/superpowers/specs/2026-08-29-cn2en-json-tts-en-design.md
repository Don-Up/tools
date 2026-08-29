# cn2en-json English TTS Design Specification

## Overview

为 `cn2en-json.html` 增加英文朗读能力：左上角第二行放置英文语音下拉与开关（默认关闭）。开关开启时，在中文朗读结束后自动衔接朗读英文。每个 toggle 独立控制：CN 关、EN 开仅读英文；CN 开、EN 关仅读中文。

## Layout Structure

```
┌────────────────────────────────────────┐
│ [▼ Microsoft Xxx] [☑ TTS]              │ ← 第一行 (CN)，top: 20px
│ [▼ Microsoft Yyy] [☐ EN TTS]           │ ← 第二行 (EN)，top: 60px
│                                        │
│                              1/6       │
│                                        │
│   编译型语言会预编译为机器码以提升执行速度    │
│                                        │
│   Compiled languages pre-compile to …  │
│                                        │
│   ← → 切换                              │
└────────────────────────────────────────┘
```

## Visual Design

| 元素 | 值 |
|------|-----|
| `#ttsControlsEn` | 复用 `.tts-controls` 样式（position fixed, left 20px, display flex, gap 10px, align-items center），但 `top: 60px` |
| `#voiceSelectEn` | 复用 `.voice-select` 样式（与 CN 下拉一致） |
| `#ttsToggleEn` | 复用 `.tts-toggle-label` 样式，文案 "EN TTS" |

## Functionality

### 英文语音列表

- 来源：`window.speechSynthesis.getVoices()`
- 过滤：`lang.startsWith("en-")`
- 初始化时尝试恢复 `cn2en-json:voiceEn`；找不到则 fallback 到 `voicesEN[0]`
- 与中文列表共享 `voiceschanged` 事件监听

### EN 开关

- 默认关闭（`ttsEnabledEn = false`）
- 状态持久化到 `cn2en-json:ttsEnabledEn`
- 关闭时 `speechSynthesis.cancel()` 终止当前所有朗读

### 朗读序列逻辑

重构 `speakCn()`：

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
```

新增 `speakEn()`：

```js
function speakEn() {
    if (!ttsEnabledEn || !selectedVoiceEn) return;
    const utterance = new SpeechSynthesisUtterance(entries[currentIndex][1]);
    utterance.voice = selectedVoiceEn;
    window.speechSynthesis.speak(utterance);
}
```

行为矩阵：

| CN toggle | EN toggle | 触发 speakCn() 时表现 |
|-----------|-----------|----------------------|
| 开 | 开 | 读 CN，CN 结束自动读 EN |
| 开 | 关 | 仅读 CN |
| 关 | 开 | 直接读 EN（跳过 CN） |
| 关 | 关 | 静默 |

### 点击 enText

```js
enText.addEventListener('click', () => {
    if (ttsEnabledEn && selectedVoiceEn) speakEn();
});
```

仅在 EN toggle 开启时朗读。

### 持久化

localStorage 新增键：
- `cn2en-json:voiceEn`：英文 voice.name
- `cn2en-json:ttsEnabledEn`："true" 或 "false"

`loadState()` 不读取这些键（属于 UI 设置而非数据）。`populateVoices()` 末尾读取并应用 voice；init 流程读取并应用 ttsEnabledEn。

## State

模块作用域追加：
- `let voicesEN = []`
- `let selectedVoiceEn = null`
- `let ttsEnabledEn = false`

localStorage 键常量追加：
- `STORAGE_KEY_VOICE_EN = 'cn2en-json:voiceEn'`
- `STORAGE_KEY_TTS_EN = 'cn2en-json:ttsEnabledEn'`

## Error Handling

| 情况 | 行为 |
|------|------|
| 无 en-* 语音 | selectedVoiceEn = null，speakEn 与 speakCn 中相关分支 no-op |
| CN onend 后 EN 触发失败 | 浏览器原生错误，console 输出，不影响后续 |
| 用户在 CN/EN 朗读中按 ArrowLeft/Right | cancel 整个队列，render 触发新一轮 |
| EN toggle 关闭时点击 enText | 无朗读（点击不绕过 toggle） |

## File

- Modify: `cn2en-json.html`：
  - body 增加 `<div id="ttsControlsEn" class="tts-controls">` 含 voiceSelectEn 与 ttsToggleEn
  - CSS 增加 `#ttsControlsEn { top: 60px; }`
  - JS 增加 voicesEN/selectedVoiceEn/ttsEnabledEn 状态、populateVoices 扩展 EN 部分、speakCn 重构、speakEn 新增、enText click 监听、voiceSelectEn 与 ttsToggleEn change 监听、init 流程读取 ttsEnabledEn

## Out of Scope

- 角色切换 / 双英文角色（cn2en.html 的 Role1/Role2 模式）
- 单独的 EN 朗读速率/音调
- 句子级高亮
- 自定义衔接延迟
- 翻译音频缓存