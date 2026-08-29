# cn2en-json Mode Toggle Design Specification

## Overview

为 `cn2en-json.html` 在 EN 语音下拉框下方新增 Mode 单选框组（Mode 1 / Mode 2）。Mode 1 为默认（当前行为，显示完整英文）。Mode 2 下英文按 `[a-zA-Z]+` 切词，仅保留每词首字母，其余字母替换为 `_`。按 `S` 键临时揭示当前句子的英文原文（仅当前句生效，导航后由 Mode 决定新句子的显示）。Mode 选择持久化到 localStorage。

## Layout Structure

```
┌────────────────────────────────────────┐
│ [▼ CN voice] [☑ TTS]                   │  ← top:20px（不变）
│ [▼ EN voice] [☐ EN TTS]                │  ← top:60px（不变）
│ (●) Mode 1  ( ) Mode 2                 │  ← top:100px 新增
│                              CN ━●━ 1.0│
│                              EN ━●━ 1.0│
│                                       1/6
└────────────────────────────────────────┘
```

新容器 `#modeControls`，与 `#ttsControls`/`#ttsControlsEn` 同样定位模式（`position:fixed; left:20px`），但 `top:100px`。

## Visual Design

| 元素 | 值 |
|------|-----|
| `#modeControls` | position fixed, top 100px, left 20px, z-index 5, display flex, gap 10px, align-items center |
| `.mode-radio-label` | font-size 14px, color #888, display flex, align-items center, gap 4px, cursor pointer |
| `.mode-radio-label input` | width 14px, height 14px, margin 0 |

## Functionality

### Mode 切换逻辑

`render()` 中根据 `currentMode` 与 `enRevealed` 决定 `enText.textContent`：

```js
function render() {
    // ... 保留现有空状态与显示控制 ...
    enRevealed = false;  // 导航即重置
    const [cn, en] = entries[currentIndex];
    const showFull = currentMode === 1 || enRevealed;
    enText.textContent = showFull ? en : maskEnText(en);
    // ...
}
```

### 打码函数

```js
function maskEnText(text) {
    return text.replace(/[a-zA-Z]+/g, (match) =>
        match[0] + '_'.repeat(match.length - 1)
    );
}
```

切词规则：`[a-zA-Z]+` 匹配连续字母串作为单词，非字母字符（标点/数字/空白/连字符/撇号）原样保留。每词首字母保留，其余字母替换为 `_`。

示例：
| 输入 | 输出 |
|------|------|
| `Compiled languages pre-compile to machine code for speed` | `C_______ l_______ p__-c______ t_ m______ c___ f__ s____` |
| `Modern JS engines blend both via JIT` | `M_____ J_ e______ b____ b___ v__ J__` |
| `don't` | `d__'t` |
| `a` | `a`（单字母词无下划线） |
| ` `（纯空白） | 原样 |

### S 键行为

keydown 监听新增分支：

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

- 仅在 `entries.length > 0` 时响应
- Mode 1 下视觉上无变化（始终全显）
- Mode 2 下切换 enRevealed 立即更新 enText.textContent
- 导航到下一句时 `render()` 重置 enRevealed = false

### Mode 单选框 change 监听

```js
modeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        if (radio.checked) {
            currentMode = parseInt(radio.value, 10);
            localStorage.setItem(STORAGE_KEY_MODE, String(currentMode));
            if (entries.length > 0) {
                const showFull = currentMode === 1 || enRevealed;
                enText.textContent = showFull
                    ? entries[currentIndex][1]
                    : maskEnText(entries[currentIndex][1]);
            }
        }
    });
});
```

切换 Mode 时立即重新计算 enText 显示。

### TTS 交互

`speakEn()` 与 `enText` 点击监听器均直接读取 `entries[currentIndex][1]`（原始英文），与显示层解耦。Masking 仅影响视觉，TTS 始终朗读完整原文。

### 持久化

localStorage 新增键：
- `cn2en-json:mode`：`"1"` 或 `"2"`

init 流程读取并应用：
- 默认 1
- 读取值为 "2" 时 currentMode = 2
- 同步更新两个 radio 的 checked 属性

## State

模块作用域追加：
- `let currentMode = 1`
- `let enRevealed = false`

localStorage 键常量追加：
- `STORAGE_KEY_MODE = 'cn2en-json:mode'`

DOM 引用追加：
- `const modeRadios = document.querySelectorAll('input[name="mode"]')`

## Error Handling

| 情况 | 行为 |
|------|------|
| localStorage mode 值非 "1" 或 "2" | fallback 到 1 |
| render 时 entries 为空 | enText 隐藏，不进入打码分支 |
| S 键在空数据时按下 | 早返回，无副作用 |
| 用户在 Mode 切换瞬间朗读中 | TTS 仍读原始英文，显示同步更新 |

## File

- Modify: `cn2en-json.html`：
  - body 新增 `<div id="modeControls" class="mode-controls">` 含两个 radio label
  - CSS 新增 `.mode-controls`、`.mode-radio-label`、`.mode-radio-label input` 样式
  - JS 新增 STORAGE_KEY_MODE、currentMode、enRevealed、modeRadios、maskEnText；render 内根据 currentMode/enRevealed 决定 enText 显示；keydown 监听 KeyS 分支；modeRadios change 监听；init 流程读取并恢复

## Out of Scope

- 单字母词（如 "a"、"I"）的特殊处理
- 自定义分隔符或多语言切词
- 字符级而非词级打码
- Mode 切换时的过渡动画
- 持久化 enRevealed 状态
- 打码文字的复制/选择行为定制
