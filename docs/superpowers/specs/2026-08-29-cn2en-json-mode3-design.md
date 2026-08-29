# cn2en-json Mode 3 Addition Design Specification

## Overview

为 `cn2en-json.html` 在 Mode 单选框组新增第三个选项 Mode 3。Mode 3 与 Mode 2 行为相同，唯一区别是首字母也替换为 `_`（即每个英文单词的所有字母均替换为下划线，仅非字母字符保留）。其它部分（容器位置、S 键行为、持久化机制、render 集成）沿用 Mode 1/2 的既有设计。

## Layout Structure

```
┌────────────────────────────────────────┐
│ [▼ CN voice] [☑ TTS]                   │  ← top:20px（不变）
│ [▼ EN voice] [☐ EN TTS]                │  ← top:60px（不变）
│ (●) Mode 1  ( ) Mode 2  ( ) Mode 3     │  ← top:100px 三选项
│                              CN ━●━ 1.0│
│                              EN ━●━ 1.0│
│                                       1/6
└────────────────────────────────────────┘
```

`#modeControls` 容器结构不变（`flex` + `gap:10px`），仅在第三个 label 处增加一个 radio。

## Visual Design

无新增 CSS 样式。三个 radio 共占约 210px 宽度，仍能容纳于 `left:20px` 起的可视区域内。

## Functionality

### 打码函数签名扩展

```js
function maskEnText(text, preserveFirst) {
    return text.replace(/[a-zA-Z]+/g, (match) =>
        preserveFirst
            ? match[0] + '_'.repeat(match.length - 1)
            : '_'.repeat(match.length)
    );
}
```

- `preserveFirst === true`：每词首字母保留，其余字母 → `_`（Mode 2 行为）
- `preserveFirst === false`：每词所有字母 → `_`（Mode 3 行为）

### render 调用点

`render()` 中根据 `currentMode` 决定调用：

```js
function render() {
    // ... 空状态处理与显示控制保留 ...
    enRevealed = false;
    if (currentMode === 1) {
        enText.textContent = entries[currentIndex][1];
    } else {
        enText.textContent = maskEnText(entries[currentIndex][1], currentMode === 2);
    }
    speakCn();
}
```

- Mode 1：直接赋值原文（避免不必要的字符串处理）
- Mode 2：`maskEnText(en, true)`
- Mode 3：`maskEnText(en, false)`

### S 键行为

不变。S 键仍仅切换 `enRevealed`：
- Mode 1 下视觉无变化
- Mode 2/3 下切换 enRevealed 立即更新 `enText.textContent` 为原文或重新打码（用对应 Mode 的 preserveFirst 参数）
- 导航到下一句时 `render()` 重置 enRevealed

### Mode change 监听

`modeRadios` 已通过 `document.querySelectorAll('input[name="mode"]')` 选中全部三个 radio，change 监听器无需改动：

```js
modeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        if (radio.checked) {
            currentMode = parseInt(radio.value, 10);
            localStorage.setItem(STORAGE_KEY_MODE, String(currentMode));
            if (entries.length > 0) {
                if (currentMode === 1) {
                    enText.textContent = entries[currentIndex][1];
                } else {
                    enText.textContent = maskEnText(entries[currentIndex][1], currentMode === 2);
                }
            }
        }
    });
});
```

### TTS 交互

`speakEn()` 与 `enText` 点击监听器仍直接读取 `entries[currentIndex][1]`，TTS 始终朗读完整原文。

### 持久化

`STORAGE_KEY_MODE = 'cn2en-json:mode'`，值集合 `{ "1", "2", "3" }`。

init 流程读取：

```js
const savedMode = localStorage.getItem(STORAGE_KEY_MODE);
if (savedMode === "2" || savedMode === "3") {
    currentMode = parseInt(savedMode, 10);
}
modeRadios.forEach(radio => {
    radio.checked = parseInt(radio.value, 10) === currentMode;
});
```

无效或缺失 fallback 到 1。

## State

`currentMode` 取值集合从 `{1, 2}` 扩展为 `{1, 2, 3}`。无新增状态变量。`enRevealed` 行为不变。

## 示例

| 输入 | Mode 1 | Mode 2 | Mode 3 |
|------|--------|--------|--------|
| `Compiled` | `Compiled` | `C_______` | `________` |
| `languages` | `languages` | `l_______` | `_________` |
| `JIT` | `JIT` | `J__` | `___` |
| `don't` | `don't` | `d__'t` | `____'t` |
| `pre-compile` | `pre-compile` | `p__-c______` | `___-_______` |
| `Compiled languages pre-compile to machine code for speed` | 原文 | `C_______ l_______ p__-c______ t_ m______ c___ f__ s____` | `________ _________ ___-_______ __ _______ ____ ___ _____` |

## Error Handling

| 情况 | 行为 |
|------|------|
| localStorage mode 值非 "1"/"2"/"3" | fallback 到 1 |
| render 时 entries 为空 | enText 隐藏，不进入打码分支 |
| S 键在空数据时按下 | 早返回，无副作用 |

## File

- Modify: `cn2en-json.html`：
  - body `#modeControls` 容器内新增第三个 radio label（Mode 3）
  - JS `maskEnText` 增加 `preserveFirst` 参数
  - render 与 Mode change 监听中按 `currentMode` 选择原文/Mode 2 mask/Mode 3 mask
  - init 流程扩展 valid 值集合为 `"2"` 与 `"3"`

## Out of Scope

- 单字母词的 Mode 3 特殊处理（"a" → "_"，与其它字母等长处理）
- 自定义打码字符（仅 `_`）
- Mode 切换时的过渡动画
- 字符级打码选项
- Mode 4+ 等更多模式
