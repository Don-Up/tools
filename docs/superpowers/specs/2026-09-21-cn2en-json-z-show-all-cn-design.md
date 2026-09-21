# cn2en-json Z Show All CN Design Specification

## Overview

为 `cn2en-json.html` 添加 Z 快捷键，弹出模态对话框显示当前所有 entry 的 CN 字段（用 `\n\n` 连接）。点击模态背景或按 ESC 关闭，再按 Z 重新打开。

## Layout Structure

新增模态层 DOM（`<body>` 末尾）：

```html
<div id="cnModal" class="cn-modal" hidden>
    <div id="cnModalBackdrop" class="cn-modal-backdrop"></div>
    <div id="cnModalPanel" class="cn-modal-panel">
        <div id="cnModalText" class="cn-modal-text"></div>
    </div>
</div>
```

## Visual Design

新增 CSS：

```css
.cn-modal {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
}
.cn-modal-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
}
.cn-modal-panel {
    position: relative;
    max-width: 80vw;
    max-height: 80vh;
    overflow-y: auto;
    background: #1e1e1e;
    padding: 30px;
    border-radius: 8px;
}
.cn-modal-text {
    font-size: 24px;
    color: wheat;
    line-height: 1.5;
    white-space: pre-wrap;
    font-family: 华文细黑, 楷体, serif;
}
```

- 黑底遮罩（`rgba(0,0,0,0.7)`）半透明覆盖
- 面板居中，最大宽 80vw / 高 80vh，超出滚动
- 文本沿用 cnText 风格（wheat + 华文细黑）

## Functionality

### Modal 元素引用

在现有 `const modeRadios = ...` 之后追加：

```js
const cnModal = document.getElementById('cnModal');
const cnModalBackdrop = document.getElementById('cnModalBackdrop');
const cnModalPanel = document.getElementById('cnModalPanel');
const cnModalText = document.getElementById('cnModalText');
```

### showAllCn / hideAllCn

```js
function showAllCn() {
    if (entries.length === 0) return;
    cnModalText.textContent = entries.map(e => e[0]).join('\n\n');
    cnModal.hidden = false;
}
function hideAllCn() {
    cnModal.hidden = true;
}
cnModalBackdrop.addEventListener('click', hideAllCn);
```

- `entries.length === 0` 时静默早返回（无模态弹出）
- 每次 `showAllCn` 重新拼接 CN，避免 entries 变更后内容过时
- 点击 `.cn-modal-backdrop`（遮罩）关闭，点击 `.cn-modal-panel`（面板）不关闭（事件不冒泡到 backdrop）

### keydown 新增 Z 分支

放在 `KeyE`/`PageDown` 分支之后、Digit1 分支之前：

```js
if (!e.ctrlKey && !e.altKey && !e.shiftKey && e.code === 'KeyZ') {
    if (entries.length === 0) return;
    if (cnModal.hidden) {
        showAllCn();
    } else {
        hideAllCn();
    }
}
```

- 无修饰键守卫
- `entries.length === 0` 静默早返回
- 切换语义：隐藏则显示，显示则隐藏（再次按 Z 关闭）

### Hint 文本更新

```html
<div id="hint" class="hint">← → 切换 · 1-3 切 Mode · S 揭示 · E/PgDn 读 EN · Z 全文</div>
```

## 行为矩阵

| 操作 | 结果 |
|------|------|
| Z（entries 非空，模态隐藏） | 显示所有 CN（用 `\n\n` 分隔） |
| Z（entries 非空，模态显示） | 关闭模态 |
| Z（entries 为空） | 静默，不弹出 |
| ESC（模态显示时） | 关闭模态 |
| 点击遮罩（模态显示时） | 关闭模态 |
| 点击面板内部 | 不关闭（事件不冒泡到 backdrop） |
| Ctrl+Z / Alt+Z / Shift+Z | 不触发（修饰键守卫拒绝） |
| Z（模态显示时）+ 切条目 | 模态内容保持旧；关闭后下次 showAllCn 重算 |

## State

无新增模块状态变量。模态开关依赖 DOM `hidden` 属性。

## Error Handling

| 情况 | 行为 |
|------|------|
| entries 为空 | Z 静默早返回 |
| 模态显示时切换条目（ArrowLeft/Right 等） | 模态内容不刷新；下次 showAllCn 重新拼接 |

## File

- Modify: `cn2en-json.html`：
  - 新增 modal DOM（`#cnModal` / `#cnModalBackdrop` / `#cnModalPanel` / `#cnModalText`）
  - 新增 modal CSS（`.cn-modal` / `.cn-modal-backdrop` / `.cn-modal-panel` / `.cn-modal-text`）
  - 新增 modal 元素引用与 `showAllCn`/`hideAllCn` 函数
  - 注册 backdrop click 监听
  - keydown 新增 Z 分支（toggle 行为）
  - `#hint` 文本追加 `· Z 全文`

## Out of Scope

- 复制按钮、字号缩放、滚动记忆
- ESC 键关闭（仅依赖 Z 切换与 backdrop 点击）
- 键盘在 modal 文本内导航
- Z 之外的全文查看快捷键