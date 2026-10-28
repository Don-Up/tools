# Focus JSON Popup (Edge 扩展)

选中网页文本,按下 **Alt+Q**,在原页面内以 **iframe 全屏浮层** 弹出 `focus-json` 自动朗读,朗读完后自动关闭浮层。

## 安装

1. 打开 Edge 浏览器,地址栏输入 `edge://extensions/`
2. 打开右下角 **"开发人员模式"**
3. 点击 **"加载解压缩的扩展"**
4. 选择本目录 `focus-json-popup/`

## 使用

- 在任意网页用鼠标选中一段英文文本
- 按 **Alt+Q**
  - 自动复制到剪贴板
  - 当前页面浮出一层全屏 iframe 加载 `focus-json`,开始朗读
- 按 **Alt+W**
  - 自动复制到剪贴板
  - 浮出 iframe,先调 `https://next-reader-psi.vercel.app/api/translate` 把英文翻成中文(显示 `translating...`),自动按 `。？` 分句,与对应英文配对成 JSON,加载并自动朗读
- 按 **Ctrl+B**
  - 自动复制到剪贴板
  - 仅当选中文本不含中文字符时生效(纯英文)
  - 浮出 iframe,先调翻译 API 再分句配对成 JSON 加载并朗读
  - **不会朗读完自动关闭**,可继续在页面上查看,按 Esc 关闭
- 按 **Alt+Z**
  - 自动复制到剪贴板
  - 浮出 iframe,先调翻译 API 再分句配对成 JSON 加载并朗读
  - 浮层只占**视口右侧 36%**,左边原页面照常看得见、点得到
  - 地址带 `compact=1`,子窗口里中英文正文字号乘 0.8(28px / 16px)
  - **不会朗读完自动关闭**,按 Esc 关闭
  - 队列非空时按 Alt+Z:队列连同左上角计数一起丢弃,直接换成新选中的内容播
- 按 **Alt+X**(朗读队列)
  - 取父页面**当前选中的文本**(不走剪贴板)
  - **子窗口没开** → 效果同 Alt+Z:浮出右侧 37% 的子窗口,翻译后直接朗读
  - **子窗口开着** → 文本丢给它后台翻译排队
    - 当前没在播 → 等同 Alt+Z:旧队列整个丢掉,显示 `translating...`,翻好直接播,左上角不闪计数
    - 正在播 → **不打断当前朗读**,翻好后排进队列,这段读完自动接上,接完继续接下一条
    - 播放中浮层**左上角显示队列长度**,每读完一条减 1;翻译中的那条也算在计数里
  - 焦点在浮层里 / 在原页面,按 Alt+X 都生效(子窗口会回头向父页面要选区)
- 按 **Shift+Z** / **Shift+X**
  - 跟 Alt+Z / Alt+X 逻辑完全一样,**唯一区别是不调翻译 API**,直接读英文原文
  - Shift+Z:浮出右侧 36% 子窗口,直接朗读选中的英文(不显示 `translating...`)
  - Shift+X:子窗口开着就入队等当前这段读完自动接上,没开就同 Shift+Z
- **右键菜单「加入朗读队列」**(选中文字后右键)
  - 跟 Alt+X 完全一样:子窗口开着就入队等当前这段读完自动接上,没开就浮出右侧 36% 子窗口
  - 走 `chrome.contextMenus`,需要 `contextMenus` 权限 + `background.js`
- 朗读完毕 iframe 自动移除(原页面还在,无需重新加载)
- 按 **Esc** 可手动关闭浮层

> 在输入框、文本域、`contenteditable` 元素中按 Alt+Q / Alt+W / Alt+X / Alt+Z 不会触发,以免影响正常输入。
>
> 队列功能在 `focus-json.html` 里,得先推到 `don-up.github.io` 才生效;扩展本身不用更新,改完 `content.js` 记得在 `edge://extensions/` 重新加载扩展并刷新当前页面。

## 选区清理

所有快捷键在取到选区后都过一遍 `cleanSelection()`:

1. **丢掉 `Translated from …` 上方的全部内容** —— 推文卡片的选区常带着账号名、`@handle`、`13h`、`Translated from Chinese` 这几行,只留标注下面的正文(标注后面没有正文就当没有这个标注)
2. 去掉 `"` `"` `"` 和 `查看中文翻译`
3. `…` / `...` / `....` 统一变成 `. `

## 工作原理

- `content.js` 在所有页面(托管的 `focus-json` 页面除外)监听 Alt+Q
- 选中后:调 `navigator.clipboard.writeText` 复制,然后在当前页面 `document.body` 末尾插入一个 100vw × 100vh 的 iframe
- iframe 地址 `https://don-up.github.io/tools/focus-json?autoclose=1#<encoded text>`,跨域加载
- iframe 内的 `focus-json` 读 URL hash → 派发合成 paste 事件 → 走原 paste handler → `loadInput` 渲染条目 → 等 voices 加载完后用 `speakCombined(0, { force: true, onEnd })` 强制朗读
- 朗读结束(`autoclose=1` 且在 iframe 中)通过 `window.parent.postMessage({ type: 'focus-json-close' })` 通知父页面
- 父页面收到消息后移除 iframe

## 文件

- `manifest.json` — MV3 清单(background service worker + `contextMenus` 权限)
- `background.js` — 建右键菜单,把点击事件转给 content script
- `content.js` — Alt+Q/W/X/Z 监听 + 剪贴板复制 + 取选区入队 + 创建 iframe + 接收右键菜单的消息

## 右键菜单怎么走通的

1. `background.js` 用 `chrome.contextMenus.create({ contexts: ['selection'] })` 建「加入朗读队列」
2. 用户点了 → `chrome.contextMenus.onClicked` 拿到 `info.selectionText`(菜单给的那份选区,比页面里再取一次稳)
3. `chrome.tabs.sendMessage(tabId, { type: 'focus-json-enqueue-now', text })` 转给 content script
4. content script 收到后走 `cleanSelection()` → `enqueueOrOpen()`,跟 Alt+X 是同一个函数

> `focus-json` 那个页面本身没注入 content script(`exclude_matches`),所以在它上面点菜单不会有反应 —— 这是对的。

## 修改

修改 `focus-json.html`(仓库根目录)后,推送到 `don-up.github.io` 即可生效,扩展无需更新。

## 提示

- 重新加载扩展后,**当前已打开的页面需要刷新一下**,旧版本的 content script 会因上下文失效而无效。刷新页面即可。
