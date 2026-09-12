# cn2en-json Alt+E Play EN Design Specification

## Overview

为 `cn2en-json.html` 添加 Alt+E 快捷键直接播放当前条目的英文。行为与点击 enText 完全一致：调用 `speakEn(true)`，绕过 EN TTS toggle，保留 speak() 的 queue 行为（不取消当前播放）。

## Layout Structure

无视觉变化。

## Visual Design

无 CSS 变更。

## Functionality

### keydown 新增 Alt+E 分支

定位到 script 中的 keydown 监听函数体。在 `KeyW`/`ArrowUp` 分支之后、`Digit1`/`Numpad1` 分支之前插入：

```js
if (e.altKey && !e.ctrlKey && !e.shiftKey && e.code === 'KeyE') {
    if (entries.length === 0) return;
    speakEn(true);
}
```

- 仅 `altKey` 修饰即可触发；`ctrlKey` 或 `shiftKey` 共同按下时拒绝（避免与浏览器/IDE 快捷键冲突）
- `entries.length === 0` 时静默早返回（与现有 S/ArrowDown 分支一致）
- 调用 `speakEn(true)`：`force=true` 绕过 EN toggle；不调用 `cancel()`，与点击 enText 的 queue 行为一致

### Hint 文本更新

定位到 `<div id="hint" class="hint">← → 切换 · 1-3 切 Mode · S 揭示</div>`，替换为：

```html
<div id="hint" class="hint">← → 切换 · 1-3 切 Mode · S 揭示 · Alt+E 读 EN</div>
```

## 行为矩阵

| 操作 | 结果 |
|------|------|
| Alt+E（entries 非空） | 播放 EN，绕过 toggle |
| Alt+E（entries 为空） | 静默 |
| Ctrl+Alt+E | 不触发（ctrlKey 守卫拒绝） |
| Shift+Alt+E | 不触发（shiftKey 守卫拒绝） |
| 纯 E 键 | 不触发（无 altKey） |
| Alt+E（CN 正在自动播放） | EN 加入 speak 队列，CN 结束后播放（与点击 enText 一致） |

## State

无新增状态变量。

## Error Handling

| 情况 | 行为 |
|------|------|
| entries 为空 | 静默早返回 |
| selectedVoiceEn 为空（系统未安装 EN 语音） | speakEn(true) 内部 `if (!selectedVoiceEn) return;` 守卫静默退出 |
| EN toggle 关闭 | speakEn(true) 仍播放（force 绕过） |

## File

- Modify: `cn2en-json.html`：
  - keydown 监听新增 Alt+E 分支
  - `#hint` 文本追加 `Alt+E 读 EN`

## Out of Scope

- 键位自定义（keybinding 配置）
- Alt+点击 enText 触发复制
- Alt+E 之外的 Alt+字母绑定（如 Alt+R 重读）
- 取消当前播放（保留 speak() queue 行为，与点击一致）
- Alt+Shift+E 等组合键