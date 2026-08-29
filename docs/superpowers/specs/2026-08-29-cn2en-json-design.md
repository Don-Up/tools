# cn2en-json Scaffold Design Specification

## Overview

为 `cn2en-json.html` 建立最小可运行骨架：暗黑模式空页面 + 全局 Ctrl+V 监听器，从剪贴板读取文本并输出到 console。这是一个临时脚手架，为后续 JSON 驱动的中英对话练习功能做铺垫。

## Layout Structure

完全空白页面，无任何可见元素：

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│            (空，深色背景)                │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

## Visual Design

| 元素 | 值 |
|------|-----|
| Body 背景 | `#121212` |
| Body 文字色 | `#e0e0e0`（预留，便于后续添加元素时颜色协调） |
| Margin | 0 |
| Min-height | 100vh |

## Components

无组件。页面无可见 DOM 元素。

## Functionality

### Ctrl+V 监听

- 在 `document` 上注册 `keydown` 事件
- 触发条件：`ctrlKey === true && code === 'KeyV' && !shiftKey && !altKey`
- 处理流程：
  1. 调用 `event.preventDefault()` 阻止浏览器默认行为
  2. 调用 `navigator.clipboard.readText()` 读取文本
  3. `console.log` 输出文本内容（带 `剪贴板文本:` 前缀）
  4. 出错时 `console.error` 输出错误对象

### 错误处理

- `navigator.clipboard.readText()` 可能 reject 的情况：
  - 非安全上下文（非 HTTPS / 非 localhost）
  - 用户拒绝剪贴板权限
  - 剪贴板无文本内容
- 统一用 `console.error('读取剪贴板失败:', err)` 处理

## File

- `cn2en-json.html` — 单文件，包含内联 CSS 和 JS

## Out of Scope

本规格仅为脚手架，不涉及：
- JSON 解析逻辑
- 对话渲染 UI
- TTS / 录音 / 任何 cn2en.html 现有功能
- localStorage 持久化
- 多剪贴板格式处理（图片、富文本等）

后续功能将在新规格中定义。