# cn2en-json Iframe Post CN|EN Design Specification

## Overview

`cn2en-json.html` 通过 `postMessage` 向 `sidePanel` iframe（`https://don-up.github.io/tools/card-timer`）发送 `{type: 'cn-en', content: '<CN>|<EN>'}`，子页面收到后写入 `#cnEnInput` 文本域。触发时机：首次 `render()` 与每次切换 entry 后。

## Layout Structure

无视觉变化。沿用现有 `#sidePanel` iframe。

## Visual Design

无 CSS 变更。

## Functionality

### postCnEnToChild 函数

新增：

```js
function postCnEnToChild() {
    if (entries.length === 0) return;
    const [cn, en] = entries[currentIndex];
    sidePanel.contentWindow?.postMessage(
        { type: 'cn-en', content: `${cn}|${en}` },
        'https://don-up.github.io'
    );
}
```

- `entries.length === 0` 静默早返回
- 使用 `cn|${en}` 格式（CN 与 EN 是 entries 原始值，不受 Mode 2/3 mask 影响）
- `sidePanel.contentWindow` 可选链访问 — 子页面未加载完时 `contentWindow` 存在但目标页脚本未运行，浏览器会缓冲消息但子页面 `message` 监听器未注册则丢弃，符合"未加载时丢弃"语义
- `targetOrigin` 限定为 `'https://don-up.github.io'`（满足安全要求；同协议同域名）

### render() 末尾触发

定位到 `function render() { ... }` 内 `speakCn();` 之后现有 `if (bgImages.length > 0) pickRandomBg();` 一行。在该行之后追加：

```js
postCnEnToChild();
```

- 页面首次 render（load 完 + entries 已恢复）触发一次
- 每次 ArrowLeft/Right/A/D 切换触发
- Ctrl+V 粘贴 JSON 后 render 触发

### 子页面侧代码（参考说明）

`card-timer` 子项目需自行注册 message 监听（本父页改动不修改子页）：

```js
window.addEventListener('message', (e) => {
    if (e.data?.type === 'cn-en' && e.data.content) {
        const inp = document.getElementById('cnEnInput');
        if (inp) inp.value = e.data.content;
    }
});
```

## 行为矩阵

| 操作 | 结果 |
|------|------|
| 页面首次加载（有 entries） | render 触发 → postMessage → 子页 #cnEnInput 显示 `CN|EN` |
| 页面首次加载（无 entries） | render 跳过 postMessage（entries.length === 0） |
| 切换 entry | render 触发 → postMessage → 子页文本域更新 |
| Ctrl+V 粘贴 JSON 后 | render 触发 → postMessage → 子页文本域更新 |
| 子页未加载完 | contentWindow.postMessage 调用静默无效；消息丢弃 |
| Mode 2/3 下 | postMessage 仍发原始 CN/EN（不受 mask 影响） |
| Ctrl+O 关闭后再开 iframe | 不重发（仅 render 触发；用户操作后未切条目则不发） |

## State

无新增状态变量。

## Error Handling

| 情况 | 行为 |
|------|------|
| entries 为空 | 早返回 |
| sidePanel.contentWindow 为 null | 可选链静默吞掉 |
| targetOrigin 不匹配 | 浏览器静默丢弃（无 throw） |
| 子页未注册 message 监听 | 消息丢弃（无副作用） |

## File

- Modify: `cn2en-json.html`：
  - 新增 `postCnEnToChild` 函数
  - `render()` 末尾追加 `postCnEnToChild()` 调用

## Out of Scope

- 子页 message 监听器代码（属于 card-timer 子项目）
- 双向消息、同步、自动滚动
- 多 iframe 广播
- 消息去抖/节流