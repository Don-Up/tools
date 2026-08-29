# cn2en-json Rate Sliders Design Specification

## Overview

为 `cn2en-json.html` 右侧新增两个语速滑块（CN 与 EN 各自独立），范围 1-3，默认 1.0，步长 0.1。新值持久化到 localStorage，下次朗读应用新语速。

## Layout Structure

```
┌────────────────────────────────────────┐
│ [CN-voice ▼] [☑ TTS]   [EN-voice ▼] [☐ EN TTS] │
│                              CN ━●━━━━━ 1.0   │
│                              EN ━●━━━━━ 1.0 1/6│  ← counter 移到此处
└────────────────────────────────────────┘
```

右侧 `#speedControls` 容器，三行垂直布局：
- 行 1：CN 滑块（label + range + value）
- 行 2：EN 滑块
- 行 3：counter（从原位置移入此容器）

## Visual Design

| 元素 | 值 |
|------|-----|
| `#speedControls` | position fixed, top 20px, right 20px, z-index 5, display flex, flex-direction column, gap 10px, align-items flex-end |
| `.speed-row` | display flex, align-items center, gap 6px, font-size 12px, color #888 |
| `.rate-slider` | width 100px, cursor pointer |
| `.rate-value` | min-width 30px, text-align right, font-variant-numeric tabular-nums |
| `.speed-label` | font-size 12px, color #888, width 24px |

`.counter` 的 position fixed 样式移除（因已纳入 `#speedControls` 容器内，使用容器内的样式）。

## Functionality

### 滑块属性

- 类型：`type="range"`
- 范围：`min="1" max="3"`
- 步长：`step="0.1"`
- 默认值：`value="1"`

### 实时更新与持久化

input 事件触发：
1. `parseFloat(value)` 更新对应 rate 变量（cnRate 或 enRate）
2. 更新对应 value 显示（保留 1 位小数：`toFixed(1)`）
3. 写入 localStorage

新值在**下次** speakCn/speakEn 时生效，不打断当前朗读。

### 朗读应用语速

```js
function speakCn() {
    // ... 省略其他逻辑
    const utterance = new SpeechSynthesisUtterance(entries[currentIndex][0]);
    utterance.voice = selectedVoice;
    utterance.rate = cnRate;
    // ...
}

function speakEn() {
    // ... 省略其他逻辑
    const utterance = new SpeechSynthesisUtterance(entries[currentIndex][1]);
    utterance.voice = selectedVoiceEn;
    utterance.rate = enRate;
    // ...
}
```

### 持久化与初始化

localStorage 新增键：
- `cn2en-json:rateCn`
- `cn2en-json:rateEn`

页面加载时读取并应用：
- 解析为数字，验证范围 [1, 3]
- 无效或缺失 → fallback 到 1.0
- 同步更新滑块 value 与显示

## State

模块作用域追加：
- `let cnRate = 1.0`
- `let enRate = 1.0`

localStorage 键常量追加：
- `STORAGE_KEY_RATE_CN = 'cn2en-json:rateCn'`
- `STORAGE_KEY_RATE_EN = 'cn2en-json:rateEn'`

## Error Handling

| 情况 | 行为 |
|------|------|
| localStorage 值非数字或越界 | fallback 到 1.0 |
| 拖动滑块超出范围 | HTML5 range input 自动 clamp |
| 用户快速拖动 | 每次 input 事件都更新显示与 localStorage（无节流，简单优先） |

## File

- Modify: `cn2en-json.html`：
  - body 将 `#counter` 移入新增的 `#speedControls` 容器；容器内含两个 `.speed-row`
  - CSS 增加 `.speed-controls`、`.speed-row`、`.rate-slider`、`.rate-value`、`.speed-label` 样式
  - JS 增加 cnRate/enRate 状态、cnRateInput/enRateInput input 监听、speakCn/speakEn 设置 utterance.rate、init 流程读取并应用 localStorage

## Out of Scope

- 语速滑块拖动时的预览朗读
- 全局语速 vs 单条语速
- 语音音调/音量控制
- 滑块以外的语速输入方式