# YouTube Shorts Auto Next Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `youtube/` 目录实现一个 Manifest V3 Edge 扩展，注入 `youtube.com/shorts/*`，轮询 `<video>` 接近结束时派发 `ArrowDown` keydown 跳下一个；提供 popup 开关、可配置提前秒数、`Alt+N` 立即跳过快捷键。

**Architecture:** 四个职责分离的文件（manifest / content / popup / background）+ `chrome.storage.sync` 作为唯一持久化介质。content.js 用 `MutationObserver` 监听 `<video>` 出现，用 `requestAnimationFrame` 轮询 `currentTime/duration`，命中阈值后 `dispatchEvent` 派发 `ArrowDown`。background.js 监听 `chrome.commands`，转发 `SKIP_NOW` 到当前活动 tab。popup 读写 storage，无 Save 按钮。

**Tech Stack:** Manifest V3、`chrome.storage.sync`、`chrome.commands`、MutationObserver、requestAnimationFrame、KeyboardEvent dispatchEvent、ES2020 模块脚本（无打包步骤）。

---

## File Structure

新建 `youtube/` 下的扩展文件：

- `youtube/manifest.json` — 扩展清单（MV3 必需）
- `youtube/content.js` — DOM 检测 + 轮询 + 触发跳转
- `youtube/popup.html` — popup UI
- `youtube/popup.js` — popup 行为
- `youtube/background.js` — `chrome.commands` 监听 + 消息转发
- `youtube/icons/16.png` — 占位图标
- `youtube/icons/48.png` — 占位图标
- `youtube/icons/128.png` — 占位图标

无现有文件被修改。

---

## Task 1: 创建 manifest.json

**Files:**
- Create: `youtube/manifest.json`

- [ ] **Step 1: 写入 manifest.json**

文件内容（UTF-8，无 BOM）：

```json
{
  "manifest_version": 3,
  "name": "YouTube Shorts Auto Next",
  "version": "0.1.0",
  "description": "Auto-jump to the next Short when the current one ends.",
  "permissions": ["storage", "commands"],
  "host_permissions": ["*://www.youtube.com/shorts/*"],
  "action": {
    "default_popup": "popup.html",
    "default_title": "Shorts Auto Next"
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["*://www.youtube.com/shorts/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "commands": {
    "skip-now": {
      "suggested_key": {
        "default": "Alt+N"
      },
      "description": "Skip to next Short immediately"
    }
  }
}
```

- [ ] **Step 2: 校验 JSON 合法性**

Run: `python -c "import json; json.load(open(r'C:/Users/10691/Documents/GitHub/html-tools/youtube/manifest.json', encoding='utf-8'))"`
Expected: 无输出（合法 JSON）。

- [ ] **Step 3: 提交**

```bash
git add youtube/manifest.json
git commit -m "Add YouTube Shorts Auto Next manifest.json"
```

---

## Task 2: 创建 popup.html 和 popup.js

**Files:**
- Create: `youtube/popup.html`
- Create: `youtube/popup.js`

- [ ] **Step 1: 写入 popup.html**

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>Shorts Auto Next</title>
  <style>
    body {
      font: 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      width: 220px;
      padding: 12px;
      margin: 0;
      color: #222;
      background: #fff;
    }
    h1 {
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 10px;
    }
    label {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
      cursor: pointer;
      user-select: none;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }
    input[type="number"] {
      width: 60px;
      padding: 2px 4px;
      font: inherit;
    }
    .hint {
      font-size: 11px;
      color: #888;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <h1>Shorts Auto Next</h1>
  <label><input type="checkbox" id="enabled" checked> 启用自动跳转</label>
  <div class="row">提前 <input type="number" id="lead" min="0" max="5" step="0.5" value="0"> 秒</div>
  <div class="hint">Alt+N 立即跳过当前</div>
  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: 写入 popup.js**

```js
const $enabled = document.getElementById('enabled');
const $lead = document.getElementById('lead');

const DEFAULTS = { enabled: true, leadSeconds: 0 };

chrome.storage.sync.get(DEFAULTS, (data) => {
  $enabled.checked = !!data.enabled;
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

- [ ] **Step 3: 校验 JSON / 文件存在**

Run: `ls "C:/Users/10691/Documents/GitHub/html-tools/youtube/popup.html" "C:/Users/10691/Documents/GitHub/html-tools/youtube/popup.js"`
Expected: 两行输出，文件存在。

- [ ] **Step 4: 提交**

```bash
git add youtube/popup.html youtube/popup.js
git commit -m "Add popup UI and storage bindings"
```

---

## Task 3: 创建 background.js

**Files:**
- Create: `youtube/background.js`

- [ ] **Step 1: 写入 background.js**

```js
chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== 'skip-now') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;
  if (!tab.url || !tab.url.includes('youtube.com/shorts')) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'SKIP_NOW' });
  } catch (_) {
    // content.js 未注入时静默忽略（用户在非 Shorts tab 触发）
  }
});
```

- [ ] **Step 2: 提交**

```bash
git add youtube/background.js
git commit -m "Add background service worker for skip-now command"
```

---

## Task 4: 创建 content.js（核心逻辑）

**Files:**
- Create: `youtube/content.js`

- [ ] **Step 1: 写入 content.js**

```js
(() => {
  const DEFAULTS = { enabled: true, leadSeconds: 0 };

  const state = {
    enabled: DEFAULTS.enabled,
    leadSeconds: DEFAULTS.leadSeconds,
  };

  let currentVideo = null;
  let hasFiredForCurrent = false;
  let rafId = null;

  function clampLead(v) {
    if (!isFinite(v)) return 0;
    return Math.max(0, Math.min(5, v));
  }

  function loadState() {
    try {
      chrome.storage.sync.get(DEFAULTS, (data) => {
        state.enabled = !!data.enabled;
        state.leadSeconds = clampLead(data.leadSeconds);
      });
    } catch (_) {
      state.enabled = DEFAULTS.enabled;
      state.leadSeconds = DEFAULTS.leadSeconds;
    }
  }

  function setupStorageListener() {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      if (changes.enabled) state.enabled = !!changes.enabled.newValue;
      if (changes.leadSeconds) state.leadSeconds = clampLead(changes.leadSeconds.newValue);
    });
  }

  function findVideo() {
    return document.querySelector('video');
  }

  function startLoop() {
    if (rafId !== null) return;
    const tick = () => {
      if (!state.enabled || !currentVideo) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      const v = currentVideo;
      if (v.paused || v.ended) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      const d = v.duration;
      if (!isFinite(d) || d <= 0) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      const t = v.currentTime;
      if (!hasFiredForCurrent && t >= d - state.leadSeconds) {
        triggerNext();
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function onVideoAdded(video) {
    if (currentVideo === video) return;
    currentVideo = video;
    hasFiredForCurrent = false;
    startLoop();
  }

  function setupVideoObserver() {
    const onMutate = () => {
      const v = findVideo();
      if (v && v !== currentVideo) onVideoAdded(v);
    };
    const observer = new MutationObserver(onMutate);
    observer.observe(document.body, { childList: true, subtree: true });
    // 初次扫描（页面已挂载 video 的情况）
    onMutate();
  }

  function triggerNext() {
    hasFiredForCurrent = true;
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      code: 'ArrowDown',
      bubbles: true,
      cancelable: true,
      view: window,
    }));
  }

  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.type === 'SKIP_NOW') {
        triggerNext();
      }
    });
  }

  // 启动
  loadState();
  setupStorageListener();
  setupMessageListener();
  setupVideoObserver();
})();
```

- [ ] **Step 2: 用 Python 做语法检查**

Run: `python -c "import esprima" 2>nul && python -c "import esprima; esprima.parseScript(open(r'C:/Users/10691/Documents/GitHub/html-tools/youtube/content.js', encoding='utf-8').read())" || python -c "import re; src=open(r'C:/Users/10691/Documents/GitHub/html-tools/youtube/content.js', encoding='utf-8').read(); assert src.count('{')==src.count('}'), 'brace mismatch'; print('ok')"`
Expected: 输出 `ok`（花括号配对通过）。

如果 `esprima` 可用，会做完整 AST 解析；不可用则退化为花括号配对检查（content.js 无字符串内的花括号，足够）。

- [ ] **Step 3: 提交**

```bash
git add youtube/content.js
git commit -m "Add content.js with video polling and skip dispatch"
```

---

## Task 5: 创建占位图标

**Files:**
- Create: `youtube/icons/16.png`
- Create: `youtube/icons/48.png`
- Create: `youtube/icons/128.png`

- [ ] **Step 1: 创建 icons 目录**

Run: `mkdir -p "C:/Users/10691/Documents/GitHub/html-tools/youtube/icons"`
Expected: 目录已存在或创建成功。

- [ ] **Step 2: 生成 1x1 透明 PNG 占位图标**

三种尺寸都用同一份最小 PNG（base64 解码得到）。Run:

```bash
python -c "
import base64, os
png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
for size in (16, 48, 128):
    p = rf'C:/Users/10691/Documents/GitHub/html-tools/youtube/icons/{size}.png'
    with open(p, 'wb') as f:
        f.write(png)
    print('wrote', p)
"
```

Expected: 三行 `wrote ...` 输出。

- [ ] **Step 3: 验证 PNG 文件**

Run: `ls -la "C:/Users/10691/Documents/GitHub/html-tools/youtube/icons/"`
Expected: 三个 .png 文件存在，每个大小约 70 字节。

- [ ] **Step 4: 提交**

```bash
git add youtube/icons/
git commit -m "Add placeholder icons (1x1 transparent PNGs)"
```

---

## Task 6: 在 Edge 加载并端到端手动验证

**Files:**
- 无文件修改

- [ ] **Step 1: 加载扩展**

打开 `edge://extensions/`，开启右上角"开发人员模式"，点击"加载解压缩的扩展"，选择 `C:/Users/10691/Documents/GitHub/html-tools/youtube/` 目录。

Expected: 扩展出现在列表中，名称为 "YouTube Shorts Auto Next"，无错误提示。

- [ ] **Step 2: 验证默认 auto-next 生效**

访问 `https://www.youtube.com/shorts/` （任意 Short）。等待当前 Short 播放至结束。
Expected: 视频一结束（或最后一帧）自动跳到下一个 Short（无需用户操作）。

- [ ] **Step 3: 验证 popup 关闭开关**

点击 Edge 工具栏扩展图标，取消"启用自动跳转"复选框。等待当前 Short 结束。
Expected: 视频播完后停在最后一帧，不跳转。

重新勾选复选框。
Expected: 下一次内容结束自动跳转（如果中间视频切换，hasFiredForCurrent 已重置）。

- [ ] **Step 4: 验证提前秒数生效**

popup 中将"提前"改为 2（秒）。访问新的 Short。
Expected: 视频在剩约 2 秒时跳转（不是最后一刻）。

将提前秒数改回 0。
Expected: 视频在最后一刻跳转。

- [ ] **Step 5: 验证输入 clamp**

popup 中将提前秒数改为 99，按 Enter。
Expected: storage 中写入 5（实际行为：键失焦后 input 会自动 clamp 到 max=5；如果未 clamp，可手动改回）。验证方式：`edge://extensions/` → service worker → console 输入 `chrome.storage.sync.get('leadSeconds', console.log)`，应得到 ≤5。

将提前秒数改为 -3。
Expected: clamp 到 0。

- [ ] **Step 6: 验证 Alt+N 跳过**

访问 `https://www.youtube.com/shorts/<id>`。按 `Alt+N`。
Expected: 立即跳到下一个 Short（无论视频进度）。

- [ ] **Step 7: 验证防重**

让一个 Short 自然播放到结束。视频应自动跳转下一个。等待第二个 Short 播放结束。
Expected: 第二个 Short 结束时跳转；后续循环重播不会触发新的跳转（即每个 video 只跳一次）。

- [ ] **Step 8: 验证暂停不触发**

访问 Short 后立即按 `k` 或点击视频暂停。等 60 秒。
Expected: 不会自动跳转。

恢复播放，等视频结束。
Expected: 仍然自动跳转（因为 hasFiredForCurrent 还没置位）。

- [ ] **Step 9: 验证非 Shorts 路径**

访问 `https://www.youtube.com/`（首页）。打开 DevTools Console。
Expected: console 中无来自 content.js 的日志（content.js 未注入）。

- [ ] **Step 10: 验证跨标签安全**

打开新标签访问 `https://www.example.com`。在 example.com 标签按 `Alt+N`。
Expected: 无任何反应（background.js URL 白名单守卫生效，无控制台错误）。

---

## 收尾

所有任务完成后，Edge 扩展可加载到 `edge://extensions/`，访问 `youtube.com/shorts` 时自动连续播放下一个 Short。通过 popup 可关闭 / 调整提前秒数；通过 `Alt+N` 可立即跳过当前。
