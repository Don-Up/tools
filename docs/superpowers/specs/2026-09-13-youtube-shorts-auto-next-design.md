# YouTube Shorts Auto Next Edge Extension Design Specification

## Overview

在 `youtube/` 目录开发一个 Microsoft Edge（兼容 Chrome）Manifest V3 扩展，注入到 `https://www.youtube.com/shorts/*` 页面，监听当前 Short 播放进度；当视频接近结束（提前 N 秒，可配）时，模拟键盘 `ArrowDown` 跳到下一个 Short。提供 popup 开关、可配置提前秒数、以及 `Alt+N` 快捷键立即跳过。

## Layout Structure

无页面布局变化（扩展 UI 仅 popup）。

## Visual Design

无页面 CSS 变更。popup 极简：标题 + 复选框 + 数字输入。

## Architecture

四个职责分离的文件，单向数据流：

```
popup.html ──写入──> chrome.storage.sync ──读取──> content.js
                                                    │
                                                    │ dispatchEvent KeyDown
                                                    ▼
background.js ──chrome.commands Alt+N──> chrome.tabs.sendMessage ──> content.js
```

- **content.js**：DOM 检测 + 轮询 + 触发跳转（核心）
- **popup.html/js**：用户开关与配置
- **background.js**：监听 `chrome.commands`，转发 `SKIP_NOW` 消息
- **chrome.storage.sync**：唯一的持久化与跨组件通信介质

## Functionality

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "YouTube Shorts Auto Next",
  "version": "0.1.0",
  "description": "Auto-jump to the next Short when the current one ends.",
  "permissions": ["storage", "commands"],
  "host_permissions": ["*://www.youtube.com/shorts/*"],
  "action": { "default_popup": "popup.html" },
  "background": { "service_worker": "background.js" },
  "content_scripts": [{
    "matches": ["*://www.youtube.com/shorts/*"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }],
  "commands": {
    "skip-now": {
      "suggested_key": { "default": "Alt+N" },
      "description": "Skip to next Short immediately"
    }
  }
}
```

### content.js

模块内私有状态：

| 变量 | 类型 | 用途 |
|------|------|------|
| `state.enabled` | boolean | 总开关 |
| `state.leadSeconds` | number | 提前跳转秒数，clamp 到 [0, 5] |
| `currentVideo` | HTMLVideoElement \| null | 当前正在监听的视频元素 |
| `hasFiredForCurrent` | boolean | 当前 video 是否已触发过跳转（防重） |
| `rafId` | number \| null | requestAnimationFrame id |

启动流程：

1. `loadState()` 异步从 `chrome.storage.sync` 读取，未取到则用默认值 `{ enabled: true, leadSeconds: 0 }`
2. `setupStorageListener()` 注册 `chrome.storage.onChanged`，变化时合并回 `state`（不重启循环）
3. `setupVideoObserver()` 注册 `MutationObserver(document.body, { childList: true, subtree: true })`
4. `setupMessageListener()` 注册 `chrome.runtime.onMessage`，收到 `{ type: "SKIP_NOW" }` 立即调用 `triggerNext()`
5. 初次扫描：调用 `findVideo()` 找到当前 `<video>` 元素，若存在则 `attachToVideo(it)`

`onVideoAdded(video)`：

1. 若 `currentVideo === video` 直接返回
2. 若 `currentVideo` 存在则解绑（重置 hasFiredForCurrent、停止旧 raf）
3. `currentVideo = video`，`hasFiredForCurrent = false`，调用 `startLoop()`

`startLoop()`：

```js
function tick() {
  if (!state.enabled || !currentVideo) { rafId = requestAnimationFrame(tick); return; }
  const v = currentVideo;
  if (v.paused || v.ended) { rafId = requestAnimationFrame(tick); return; }
  const d = v.duration;
  if (!isFinite(d) || d <= 0) { rafId = requestAnimationFrame(tick); return; }
  const t = v.currentTime;
  if (!hasFiredForCurrent && t >= d - state.leadSeconds) {
    triggerNext();
  }
  rafId = requestAnimationFrame(tick);
}
```

- `paused / ended` 守卫：暂停或已结束时不再触发（用户手动重播后才进入下一轮，但 hasFiredForCurrent 仍守门，所以只跳一次）
- `duration > 0` 守卫：未加载完成时跳过

`triggerNext()`：

```js
function triggerNext() {
  hasFiredForCurrent = true;
  window.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'ArrowDown',
    code: 'ArrowDown',
    bubbles: true,
    cancelable: true,
    view: window
  }));
}
```

不派发 keyup —— YouTube next 只听 keydown。

`findVideo()`：返回 `document.querySelector('video')`，可能为 null（页面尚未挂载 video）。

`MutationObserver` 回调：

```js
function onMutate() {
  const v = findVideo();
  if (v && v !== currentVideo) onVideoAdded(v);
}
```

不做 `<video>` 移除检测 —— YouTube Shorts 通常复用同一 `<video>` 元素，仅切换 src；`currentTime` 重置由 tick 内的 `duration` 检查自然过滤。但若用户快速滚动跨过多个 Short 而 `<video>` 引用真的变更，`onVideoAdded` 会重新绑定并重置 `hasFiredForCurrent`。

### popup.html / popup.js

HTML 结构：

```html
<!doctype html>
<html><head><meta charset="utf-8"><style>
  body { font: 13px -apple-system,Segoe UI,sans-serif; width: 220px; padding: 12px; margin: 0; }
  h1 { font-size: 14px; margin: 0 0 10px; }
  label { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; cursor: pointer; }
  .row { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
  input[type=number] { width: 60px; }
</style></head><body>
  <h1>Shorts Auto Next</h1>
  <label><input type="checkbox" id="enabled" checked> 启用自动跳转</label>
  <div class="row">提前 <input type="number" id="lead" min="0" max="5" step="0.5" value="0"> 秒</div>
  <script src="popup.js"></script>
</body></html>
```

popup.js 行为：

```js
const $enabled = document.getElementById('enabled');
const $lead = document.getElementById('lead');

chrome.storage.sync.get({ enabled: true, leadSeconds: 0 }, (data) => {
  $enabled.checked = data.enabled;
  $lead.value = data.leadSeconds;
});

$enabled.addEventListener('change', () => {
  chrome.storage.sync.set({ enabled: $enabled.checked });
});
$lead.addEventListener('input', () => {
  let v = parseFloat($lead.value);
  if (!isFinite(v)) v = 0;
  v = Math.max(0, Math.min(5, v));
  chrome.storage.sync.set({ leadSeconds: v });
});
```

输入越界（>5）写入前 clamp 到 [0,5]，UI 不强制限制以允许临时输入小数。

### background.js

```js
chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== 'skip-now') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;
  if (!tab.url || !tab.url.includes('youtube.com/shorts')) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'SKIP_NOW' });
  } catch (_) {
    // content.js 未注入时静默忽略
  }
});
```

URL 白名单守卫：避免向非 Shorts 页面发送消息。

### icons 占位

`icons/16.png`, `icons/48.png`, `icons/128.png` 先用 1×1 透明 PNG 占位，确保 `chrome://extensions` 不报缺图标警告。后续替换为正式图标。

## 行为矩阵

| 情况 | 预期 |
|------|------|
| 安装后首次访问 `/shorts` | `enabled=true, leadSeconds=0`，自动生效 |
| 视频自然播到 `duration - leadSeconds` | 派发 ArrowDown，跳下一个 |
| 视频自然循环重播 | 不再触发（hasFiredForCurrent 守门） |
| 用户暂停中 | tick 内 paused 守卫跳过 |
| popup 关闭开关 | storage.onChanged 同步到 state，下一帧停止判定 |
| 用户改 leadSeconds | 当前视频的 hasFiredForCurrent 已 true，下一个视频按新值生效 |
| Alt+N 任意时刻 | 立即跳下一个；hasFiredForCurrent 不变（仍由 tick 控制当前视频是否再次触发） |
| 用户在 `youtube.com` 非 `/shorts` 路径 | content.js 不注入，无影响 |
| Tab 切到非 Shorts 页面 | 无影响 |
| Alt+N 在非 Shorts tab | URL 守卫静默忽略 |

## State

持久化（chrome.storage.sync）：
- `enabled: boolean` 默认 `true`
- `leadSeconds: number` 默认 `0`，clamp 到 [0, 5]

运行时（content.js 私有）：
- `currentVideo` / `hasFiredForCurrent` / `rafId` 三个本地变量

无新增 React / 组件状态机。

## Error Handling

| 情况 | 处理 |
|------|------|
| 页面无 `<video>` | MutationObserver 持续等待，不报错 |
| `video.duration` 非有限数或 ≤0 | tick 内 `isFinite && > 0` 守卫跳过 |
| ArrowDown 没让视频切换 | 不兜底，用户手动重试 |
| `chrome.storage.sync.get` 失败 / timeout | 用默认值 `{ enabled:true, leadSeconds:0 }` 兜底 |
| popup 输入越界 (>5 或负数) | 写入前 clamp |
| `chrome.tabs.query` 返回空数组 | 静默忽略 |
| `chrome.tabs.sendMessage` 抛错（content.js 未注入） | `try/catch` 静默忽略 |
| Alt+N 在非 Shorts tab | URL 白名单守卫静默忽略 |
| `currentVideo` 在 tick 中变为 null（DOM 卸载） | `if (!currentVideo)` 守卫跳过，下一次 MutationObserver 会重新绑定 |

## File

新增到 `youtube/`：
- `manifest.json`
- `content.js`
- `popup.html`
- `popup.js`
- `background.js`
- `icons/16.png`
- `icons/48.png`
- `icons/128.png`

## Testing

手动验证步骤（无法在本环境运行浏览器自动化）：

1. **加载扩展**：`edge://extensions/` → 开启"开发人员模式" → "加载解压缩的扩展" → 选 `youtube/` 目录
2. **首次访问**：打开 `https://www.youtube.com/shorts/<id>`，视频自动播放；播放到接近结束自动跳到下一个
3. **配置项**：
   - popup 中将 leadSeconds 改为 2，刷新页面观察视频在剩 2 秒时跳转
   - popup 中取消启用，观察视频播完后不再自动跳
4. **跳过快捷键**：在 Shorts 页按 `Alt+N`，立即跳下一个
5. **防重**：让视频自然循环 2 次，确认只跳一次
6. **暂停**：暂停视频，确认不触发跳转
7. **非 Shorts 路径**：访问 `https://www.youtube.com/`，确认扩展无动作
8. **跨标签**：在非 Shorts tab 按 `Alt+N`，确认无报错

## Out of Scope

- 反向跳转上一个 Short（ArrowUp）
- 黑名单频道 / 关键词过滤
- 暂停时自动跳
- 视频时长 ≤ N 秒时跳过
- 在非 `/shorts` 路由的 mini-player 上工作
- Firefox / Safari 兼容（仅 Edge + Chrome / Manifest V3）
- 自动重播 / 队列管理
- 历史记录 / 统计
- 自定义快捷键（仅 `Alt+N` 默认值）
- 多个视频元素同时监听（Shorts 页面只关心主播放器）
