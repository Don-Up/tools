# cn2en-json Alt+Click Copy Design Specification

## Overview

为 `cn2en-json.html` 添加按住 Alt 键点击 cnText 时将当前条目的中英文按 `CN|EN` 格式复制到剪贴板的功能。纯左键点击仍触发 TTS（沿用现有 click-bypass 行为），Alt 修饰时不触发 TTS。

## Layout Structure

无视觉变化。

## Visual Design

无变化。复制操作静默执行，无 toast/弹窗反馈。

## Functionality

### copyEntryToClipboard 函数

新增工具函数：

```js
function copyEntryToClipboard() {
    if (entries.length === 0) return;
    const [cn, en] = entries[currentIndex];
    navigator.clipboard.writeText(`${cn}|${en}`);
}
```

- 空数据时早返回
- 使用模板字符串拼接 `|` 分隔符
- 复制的是 `entries[currentIndex]` 中的原始 CN/EN（不受 Mode 2/3 mask 影响）
- 复制失败（权限拒绝、剪贴板 API 不可用）静默吞错——不阻塞其它流程

### cnText 点击监听更新

现有监听器：

```js
cnText.addEventListener('click', () => speakCn(true));
```

替换为：

```js
cnText.addEventListener('click', (e) => {
    if (e.altKey) {
        e.preventDefault();
        copyEntryToClipboard();
    } else {
        speakCn(true);
    }
});
```

- `e.altKey` 为 true 时：preventDefault + 复制（不触发 TTS）
- `e.altKey` 为 false 时：原 TTS 行为

## 行为矩阵

| 操作 | 结果 |
|------|------|
| 纯左键点击 cnText | 读 CN（与之前一致） |
| Alt+左键点击 cnText | 复制 `CN|EN` 到剪贴板，不读 CN |
| 纯左键点击 enText | 读 EN（不变） |
| Alt+左键点击 enText | 不复制（仅 cnText 触发复制） |

## State

无新增状态变量。

## Error Handling

| 情况 | 行为 |
|------|------|
| entries 为空 | copyEntryToClipboard 早返回 |
| navigator.clipboard 不可用（非 HTTPS 或 file:// 限制） | writeText reject 静默吞错 |
| Alt+点击 enText | 不触发任何动作（仅 cnText 注册复制） |
| Mode 2/3 下 Alt+点击 cnText | 仍复制**原文**（打码不影响剪贴板内容） |

## File

- Modify: `cn2en-json.html`：
  - 新增 `copyEntryToClipboard` 函数
  - cnText 点击监听器分支化（altKey 走复制，否则走 TTS）

## Out of Scope

- 复制成功的视觉/听觉反馈
- 复制失败的错误提示
- Alt+点击 enText 复制英文单语
- 自定义分隔符
- 复制内容包含 counter 或其它元信息
- 复制历史/最近复制条目