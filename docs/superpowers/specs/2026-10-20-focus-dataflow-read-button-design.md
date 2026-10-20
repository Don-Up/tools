# focus-dataflow 移动端「读取」按钮设计

日期：2026-10-20
目标文件：`focus-dataflow.html`（`C:\Users\10691\Documents\GitHub\html-tools\`）
新增文件：`tools/serve.py`

## 背景

`focus-dataflow.html` 目前只支持 `Ctrl+V` 粘贴数据流文本。在手机上没有 Ctrl+V，实际不可用；需要人工从 `dataflow.txt` 复制再粘贴。

数据流文本由本地 Python 服务提供：`http://192.168.2.101:8000/dataflow.txt`（`Desktop/html/dataflow.txt`）。

`focus-dataflow.html` 已部署为 GitHub Pages 静态页 `https://don-up.github.io/tools/focus-dataflow`。

## 关键约束

### 1. 混合内容（mixed content）—— 决定性因素

GitHub Pages 强制 http→https 301 跳转（已用 `curl -I` 验证），线上页面永远是 HTTPS 源。HTTPS 页面 `fetch` 一个 `http://` 资源会被 Chrome/Safari 直接拦截，且拦截发生在 CORS 检查之前。

**结论：光加 `Access-Control-Allow-Origin: *` 无法让 github.io 页面在手机上读取本地 http 服务。**

内网 IP（192.168.x.x）不属于 W3C 的 "potentially trustworthy" 来源（只有 `localhost` / `127.0.0.1` 属于），因此没有豁免。

### 2. 方案选择

已确认采用**本地同源**方案：让本地服务器同时提供页面和 `dataflow.txt`，二者同源，绕开跨域与混合内容两个问题。

放弃的方案：
- 本地服务改用 HTTPS 自签证书：手机需手动信任证书（iOS 麻烦），且 Private Network Access 预检仍需 `Access-Control-Allow-Private-Network: true`，脆弱。
- 只加 CORS 头：手机端仍不可用，达不到目标。

### 3. 页面没有「移动版」

`focus-dataflow.html` 中没有任何 `@media` 查询，不存在独立的移动版布局。手机浏览器看到的就是同一套桌面 UI。因此「移动版网页」= 手机上访问的这个页面；本次只做移动端可用的入口 + 一条最小媒体查询，不做整体响应式改造。

## 架构

### A. `tools/serve.py`（新增）

替代 `python -m http.server` 的小服务器，把两个目录挂到**同一个 origin**。

| URL 路径 | 来源文件 |
|---|---|
| `/dataflow.txt` | `C:\Users\10691\Desktop\html\dataflow.txt` |
| `/viewer.html` | `C:\Users\10691\Desktop\html\viewer.html` |
| `/focus-dataflow.html` | `C:\Users\10691\Documents\GitHub\html-tools\focus-dataflow.html` |
| `/focus-data.html` | 同上（别名） |

要点：
- `ThreadingHTTPServer`，监听 `0.0.0.0:8000`
- 静态根 = `Desktop/html`；额外映射表把 `html-tools/focus-dataflow.html` 插到指定路径
- 响应头加 `Access-Control-Allow-Origin: *`、`Access-Control-Allow-Headers: *`、`Access-Control-Allow-Methods: GET, HEAD, OPTIONS`
- 处理 `OPTIONS` 预检请求，返回 204
- 路径常量集中在文件顶部并带注释，方便改 IP / 目录
- 提交进仓库（个人工具仓库，路径为本机绝对路径）

### B. `focus-dataflow.html`（修改，提交并推送）

1. 左上角新增固定定位的「读取」按钮，样式对齐现有 `#closeBtn`（`rgba(40,40,40,0.85)` 深底 + `#555` 描边 + 圆角）
   - 位置 `fixed; top:16px; left:16px`，宽 36px / 高 36px
   - `body` 的 `padding: 48px 5vw` 保证按钮不遮挡内容
2. 新增一条 `@media (max-width: 600px)`，把按钮放大到 44px 高（触控友好）——该文件目前唯一的一条媒体查询
3. 空状态提示语（`按 Ctrl+V 粘贴数据流文本…`）补一句「手机上点左上角『读取』」

## 数据流

```
点击「读取」
  → resolveSourceUrl()
  → fetch(url, { cache: 'no-store' })
  → res.text()
  → lastPastedText = text          // 与 paste 事件处理一致
  → loadText(text)                  // 同一函数，无需再手动粘贴
  → closeBtn.classList.add('visible')
```

复用现有 `loadText(text)`（`focus-dataflow.html:2069`），它已负责：`---` 分隔的 JSON 讲解解析、代码片段提取、解析失败时的 `showError`。

`lastPastedText = text` 对齐 `paste` 事件处理器（`:2503`）与 `postMessage` 加载器（`:2524`）的行为。

## 源地址解析

`resolveSourceUrl()` 优先级：

1. `localStorage['focusDataflowSource']` 非空 → 直接使用（用户覆盖值）
2. 页面由本地服务提供（`location.protocol === 'http:'` 且 hostname 是 IPv4）→ 返回相对路径 `dataflow.txt`
   - 同源，天然无 CORS 问题；**IP 变更也不需要改代码**
3. 其他情况（如 github.io）→ 返回 `http://192.168.2.101:8000/dataflow.txt`

**长按「读取」按钮**弹 `prompt` 输入框修改地址并存入 localStorage —— IP 变更时直接改，不必重新部署。

## 错误处理

| 情况 | 行为 |
|---|---|
| 网络失败 / 非 2xx / 内容为空 | 底部居中 toast 显示原因，3 秒自动消失，**不清空已加载内容** |
| 内容取到但解析不出步骤 | 走现有 `showError()`（沿用 app 已有行为） |

toast 为轻量 `position: fixed` 元素，与现有 `codeHint` 模式一致。

## 已知限制

- github.io 部署版在**手机**上点「读取」仍会被混合内容拦截。**手机上必须打开 `http://192.168.2.101:8000/focus-dataflow.html`**。这是同源方案的前提。
- 桌面 Chrome 打开 github.io 版本同样默认拦截混合内容，除非手动放开。
- 推送到 GitHub 的价值：线上版也带上该按钮（桌面端可用、代码同步），手机端仍走本地地址。

## 测试

1. `python tools/serve.py` 启动成功
2. `curl -I http://192.168.2.101:8000/focus-dataflow.html` → 200，且含 `Access-Control-Allow-Origin: *`
3. `curl http://192.168.2.101:8000/dataflow.txt` → 200，内容与源文件一致
4. 手机打开 `http://192.168.2.101:8000/focus-dataflow.html` → 点「读取」→ 数据流渲染
5. 回归：桌面 Ctrl+V 粘贴、代码片段粘贴（`requestCodePaste`）、`closeBtn` 行为均不受影响
6. `git commit` + `git push`

## 不做的事

- 不做整体响应式布局改造（只加一条媒体查询）
- 不改动 `loadText` / `parseInput` 等解析逻辑
- 不做 HTTPS 自签证书
- 不引入第三方依赖（仅标准库）
