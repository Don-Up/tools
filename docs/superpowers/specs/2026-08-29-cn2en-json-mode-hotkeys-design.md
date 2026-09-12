# cn2en-json Mode Hotkeys Design Specification

## Overview

为 `cn2en-json.html` 新增数字键快捷切换 Mode 1/2/3：按 1/2/3 立即切换到对应 Mode，等效于点击对应 radio。同时更新底部 hint 文本告知用户。

## Layout Structure

底部 `#hint` 文本变更：

| 旧 | 新 |
|----|-----|
| `← → 切换` | `← → 切换 · 1-3 切 Mode · S 揭示` |

## Visual Design

无新增 CSS。

## Functionality

### 提取 applyMode 工具函数

原 modeRadios change 监听器内联了"设 currentMode + radio checked + localStorage + 更新 enText"的逻辑。新增 `applyMode(mode)` 工具函数复用：

```js
function applyMode(mode) {
    currentMode = mode;
    localStorage.setItem(STORAGE_KEY_MODE, String(mode));
    modeRadios.forEach(r => {
        r.checked = parseInt(r.value, 10) === mode;
    });
    if (entries.length > 0) {
        if (mode === 1) {
            enText.textContent = entries[currentIndex][1];
        } else {
            enText.textContent = maskEnText(entries[currentIndex][1], mode === 2);
        }
    }
}
```

### Mode change 监听器简化

现有监听器整块替换为：

```js
modeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        if (radio.checked) applyMode(parseInt(radio.value, 10));
    });
});
```

### keydown 新增数字键分支

在 keydown 监听中新增：

```js
if (!e.ctrlKey && !e.altKey && !e.shiftKey) {
    if (e.code === 'Digit1' || e.code === 'Numpad1') {
        e.preventDefault();
        applyMode(1);
    } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
        e.preventDefault();
        applyMode(2);
    } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
        e.preventDefault();
        applyMode(3);
    }
}
```

放在已有 S 键分支之后、ArrowLeft/Right 分支之前（顺序不影响功能，按阅读习惯排列）。

- 支持顶行 `Digit1/2/3` 与数字键盘 `Numpad1/2/3`
- `e.preventDefault()` 阻止浏览器默认行为（数字键无浏览器默认副作用，但保留以防万一）
- 无 Ctrl/Alt/Shift 修饰——避免与 Ctrl+1/2/3（切换标签页）等浏览器快捷键冲突

### Hint 文本

定位到 `<div id="hint" class="hint">← → 切换</div>`，替换 innerHTML 为：

```
← → 切换 · 1-3 切 Mode · S 揭示
```

## State

无新增状态变量。`currentMode` 行为不变。

## Error Handling

| 情况 | 行为 |
|------|------|
| entries 为空时按 1/2/3 | applyMode 仍执行（设 currentMode、checked、localStorage），enText 不更新（隐藏） |
| Ctrl+1 等组合 | 浏览器默认行为触发（不被我们的监听器拦截） |
| 焦点在 radio 上时按 1/2/3 | document 监听器先于 radio 行为触发；applyMode 设 checked 后 radio 不再冲突 |

## File

- Modify: `cn2en-json.html`：
  - 新增 `applyMode` 函数
  - 简化 modeRadios change 监听器调用 applyMode
  - keydown 监听新增数字键分支
  - `#hint` 文本更新

## Out of Scope

- 数字键以外的 Mode 切换方式（m、shift+m 等）
- 自定义键位绑定
- 长按数字键连发切换
- keydown 监听的重构（保留与现有 S/Arrow 分支并列）