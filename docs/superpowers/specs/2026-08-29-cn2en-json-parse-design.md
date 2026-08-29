# cn2en-json Parse & Navigate Design Specification

## Overview

扩展 `cn2en-json.html`：将 Ctrl+V 监听器从仅打印日志升级为完整解析-展示-导航流程。用户粘贴 JSON 对象后，页面居中显示当前条目的中文与英文，按左/右方向键切换条目并循环，序号显示 `当前/总数`。解析失败时页面顶部显示红色错误条。

## Layout Structure

```
┌───────────────────────────────────────┐
│ [错误条 - 仅错误时显示，红色]          │ 顶部，~40px
├───────────────────────────────────────┤
│                                       │
│                              1/6      │ 右上角
│                                       │
│   中文条目（64px，金色）               │
│                                       │
│   English entry (48px, white)         │
│                                       │
│   ← → 切换                            │ 底部小字提示
└───────────────────────────────────────┘
```

无数据时（首次访问、未粘贴过）：

```
┌───────────────────────────────────────┐
│                                       │
│                                       │
│        按 Ctrl+V 粘贴 JSON 数据         │ 灰白色居中提示
│                                       │
│                                       │
└───────────────────────────────────────┘
```

## Visual Design

| 元素 | 值 |
|------|-----|
| Body 背景 | `#121212` |
| 中文文本 | font-size 64px, color `#f5deb3` (wheat), font-family `华文细黑, 楷体, serif`, text-align center |
| 英文文本 | font-size 48px, color `#e0e0e0`, font-family `Arial, sans-serif`, text-align center |
| 序号 | font-size 18px, color `#888`, position fixed top-right |
| 底部提示 | font-size 14px, color `#666`, 仅在有数据时显示 |
| 空状态提示 | font-size 24px, color `#888`, text-align center |
| 错误条 | background `#7a1f1f`, color `#fff`, padding 10px, text-align center |

整体布局使用 flexbox column，items center，justify-content center，min-height 100vh。

## Functionality

### Ctrl+V 解析流程

1. 读取剪贴板文本（已有逻辑）
2. 尝试 `JSON.parse(text)`
3. 若抛错 → 显示错误条 `JSON 解析失败: <message>`
4. 若成功但非对象（数组、基本类型）→ 显示错误条 `JSON 格式错误：必须为对象`
5. 若成功但是空对象 `{}` → 显示错误条 `JSON 不能为空对象`
6. 若成功且为非空对象 → 将 `Object.entries(parsed)` 存入状态，currentIndex 重置为 0，渲染

成功后清除错误条。

### 导航

- `ArrowLeft`：currentIndex = (currentIndex - 1 + entries.length) % entries.length
- `ArrowRight`：currentIndex = (currentIndex + 1) % entries.length
- 每次按键：`preventDefault()` 阻止页面滚动，调用 `render()` 更新视图与 localStorage

首尾循环：在第一项按 ArrowLeft 跳到最后一项；在最后一项按 ArrowRight 跳到第一项。

### 错误条

- 显示位置：body 顶部
- 自动消失：3 秒后 fade out
- 清除时机：下次成功解析时立即清除（不等 3 秒）

### 持久化

- 解析成功时存储：
  - `cn2en-json:data` = JSON.stringify(Object.entries(parsed))
  - `cn2en-json:index` = "0"
- 每次导航后存储：`cn2en-json:index` = String(currentIndex)
- 页面加载时恢复：读取两个键，若都存在则恢复状态并 render()

### 渲染

固定 DOM 结构：

```html
<div id="errorBar" class="error-bar"></div>
<div id="counter" class="counter"></div>
<div id="cnText" class="cn-text"></div>
<div id="enText" class="en-text"></div>
<div id="hint" class="hint">← → 切换</div>
<div id="emptyState" class="empty-state">按 Ctrl+V 粘贴 JSON 数据</div>
```

`render()` 根据状态切换各元素的可见性与文本：
- 有数据：`emptyState` 隐藏，`counter`/`cnText`/`enText`/`hint` 显示
- 无数据：相反

## State

模块作用域内：
- `let entries = []` — `[ [cn, en], ... ]` 数组
- `let currentIndex = 0`
- `let errorTimer = null`

## Error Handling

| 来源 | 行为 |
|------|------|
| `navigator.clipboard.readText()` reject | 错误条：`剪贴板读取失败: <err>`，旧数据保留 |
| `JSON.parse()` 抛 SyntaxError | 错误条：`JSON 解析失败: <message>`，旧数据保留 |
| 解析结果不是对象 | 错误条：`JSON 格式错误：必须为对象`，旧数据保留 |
| 解析结果是空对象 | 错误条：`JSON 不能为空对象`，旧数据保留 |

任何错误都不会清空已有数据，错误条3 秒后自动消失。

## File

- Modify: `cn2en-json.html` — 在现有 scaffold 上扩展，保留 Ctrl+V 监听器，加入 parseAndLoad/render/showError/clearError/导航处理

## Out of Scope

- TTS 朗读（cn2en.html 现有功能）
- 录音 / 播放
- localStorage 之外的持久化
- 非对象 JSON（数组、数字）的特殊处理（仅显示错误）
- 翻页/跳转到指定条目
- 触摸手势支持（仅键盘）