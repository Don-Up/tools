# ai.html Design Specification

## Overview

在项目根目录的 `ai.html` 中实现一个单文件 AI 问答工具。基于 MiniMax M3 模型(国内 endpoint `api.minimaxi.com`),面向单轮 Q&A 场景:用户在底部输入问题,点击"发送"或按 `Ctrl+Enter`,页面以流式(SSE)方式显示模型答复,可选折叠展示思考(thinking)过程。

工具服务于个人本地快速问答——和 `api-doc.html`、`code-explain.html` 风格一致,自包含、无构建步骤,深色主题,API 密钥通过顶部输入框手动设置并 `localStorage` 持久化。

## Visual Layout

```
┌────────────────────────────────────────────┐
│  ai   API Key: ●●●●●●●●●●  [修改]          │  <- top bar (sticky)
├────────────────────────────────────────────┤
│  模型: M3 (固定)   ☑ 显示思考              │  <- settings row
├────────────────────────────────────────────┤
│                                            │
│  [▾] 思考过程 (折叠,默认展开)              │  <- only when toggle on
│  ┌──────────────────────────────────────┐ │
│  │ Let me think step by step...         │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  答复                                      │
│  ┌──────────────────────────────────────┐ │
│  │ ## Markdown 渲染后的内容             │ │
│  │ - 列表项 1                            │ │
│  │ - 列表项 2                            │ │
│  │ ```js                                │ │  <- code block + copy btn
│  │ console.log('hi')                    │ │
│  │ ```                                  │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  (流式时) 答复下方显示:▌ (闪烁光标)         │
│                                            │
│  错误横幅 (顶部,仅失败时):红色 7px 高        │
│                                            │
├────────────────────────────────────────────┤
│  ┌─ textarea (3-8 行,自动撑高) ────────┐  │
│  │ 输入你的问题...                       │  │
│  └────────────────────────────────────┘  │
│  [发送] [清空]   Ctrl+Enter 发送  Esc 清空  │
└────────────────────────────────────────────┘
```

## Visual Design

沿用项目已有的深色主题(与 `api-doc.html` / `code-explain.html` 一致):

- 背景:`#1e1e1e`
- 主文字:`#e0e0e0`
- 弱化文字:`#888`
- 强调色:`#4fc3f7`(链接、光标、按钮 hover)
- 错误色:`#ef5350` / `#7f1d1d` 背景
- 思考块底色:`#252525`,与代码块同色
- 等宽字体:`Consolas, Monaco, monospace`
- 正文字体:`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

按钮:
- 主按钮"发送":背景 `#4fc3f7`、文字 `#1e1e1e`、圆角 `6px`。
- 次按钮"清空":背景 `#3a3a3a`、文字 `#cfd8dc`、hover 加深。
- "修改" API 密钥:同次按钮。

代码块复制按钮:右上角小图标,`#3a3a3a` 底,hover `#4fc3f7`。

## Architecture

单文件,无构建步骤。内部按职责分段:

```
ai.html
├── <head>
│   └── <script src="marked.js CDN">  (仅 marked 库,流式解析用原生 fetch)
├── <body>
│   ├── #topBar        (标题 + API Key + 修改按钮)
│   ├── #settingsRow   (模型 + 思考开关)
│   ├── #errorBanner   (默认隐藏)
│   ├── #thinkingSection (折叠)
│   ├── #answerSection (Markdown 渲染区)
│   └── #inputBar      (textarea + 发送/清空)
└── <script>
    ├── state           (apiKey, showThinking, question, buffers, abortController, isStreaming)
    ├── readApiKey() / setApiKey()
    ├── send()
    │   ├── validate inputs
    │   ├── build body (with optional thinking block)
    │   ├── fetch with streaming + AbortController
    │   └── for each SSE event: parse, append to buffer, render
    ├── parseSSE(chunk) → events[]
    ├── renderThinking() / renderAnswer()  (marked for answer, plain <pre> for thinking)
    ├── appendCodeCopyButtons(root)
    ├── showError(msg) / hideError()
    └── bindUI()         (textarea auto-grow, hotkeys, button handlers)
```

## Data Flow

### Send lifecycle

1. 用户输入 → `Ctrl+Enter` 或点"发送" → `send()`。
2. `send()` 校验:`apiKey` 非空,`question.trim()` 非空。失败则 disable 按钮或 showError。
3. 构造请求体:
   ```js
   {
     model: "MiniMax-M3",
     max_tokens: 8192,
     system: "你是一个简洁、准确的助手。优先用中文回答,除非用户用其他语言提问。",
     messages: [{ role: "user", content: question }],
     stream: true,
     // 当 showThinking 为 true:
     thinking: { type: "enabled" }
   }
   ```
4. `fetch(BASE + '/v1/messages', { method, headers, body, signal })`。
   - `BASE = 'https://api.minimaxi.com/anthropic'`
   - `headers`: `x-api-key`, `anthropic-version: 2023-06-01`, `content-type`, `anthropic-dangerous-direct-browser-access: true` (因为从浏览器直连,这是 MiniMax 要求的)
5. 解析 SSE 流:
   - 通过 `response.body.getReader()` 逐块读 Uint8Array。
   - 文本解码用 `TextDecoder('utf-8', { stream: true })`,跨块保留半字符。
   - 缓存未完整行,按 `\n\n` 切分事件。
   - 每个事件解析 `event:` 头 + 多行 `data:` 合并为单个 JSON。
   - `data: [DONE]` 终止。
6. 事件分发:
   - `content_block_start` → 记录当前 block 索引的 `type`(`text` 或 `thinking`)。
   - `content_block_delta` → 按 index 找 buffer,追加 `delta.text` 或 `delta.thinking`。
   - `content_block_stop` → 当前 block 结束,如果是 text 块则 `renderAnswer()` 一次。
   - `message_delta` → 检查 `stop_reason`(`end_turn` / `max_tokens` / 其他)。
   - `message_stop` → 收尾:隐藏光标、恢复"发送"按钮。
7. 流式渲染策略:
   - **思考块**:流式过程中用 `<pre class="thinking-stream">thinkingBuf</pre>` 实时更新(纯文本,无 Markdown)。
   - **答复块**:流式过程中**不**渲染 Markdown(避免半截标签错乱),用 `<pre class="text-stream">textBuf ▌</pre>` 显示原始累积文本 + 闪烁光标;`content_block_stop` 时切到 `marked.parse(textBuf)` 渲染最终 HTML。
8. 复制按钮:每次 `renderAnswer()` 后,querySelectorAll `pre code` 注入复制按钮(避免重复注入用 `data-copy-attached` 标记)。
9. 清空 / Esc → `abortController.abort()`,复位 buffers,隐藏错误横幅。

## API Key Handling

- 首次打开:`localStorage.getItem('aiApiKey')` 为空 → 输入框显示 `placeholder="点击右侧修改设置 API Key"`,输入框可点击进入编辑态。
- 用户点击"修改"或首次点击输入框 → 切换到 `<input type="password">` 可编辑,右侧按钮变成"保存"。
- 保存:`localStorage.setItem('aiApiKey', key)`,并切回遮罩态(显示 `●●●●●●●●` 长度等于 key 长度,但不显示真实字符)。
- 始终不显示真实密钥;任何保存/读取仅通过 `apiKey` 变量(不写入 DOM 的 textContent 或 value 的明文)。

## Thinking Toggle

- 顶部 checkbox:`showThinking` 状态,默认 `true`。
- `localStorage.aiShowThinking` 持久化(字符串 `"true"` / `"false"`,默认空时按 `true`)。
- 控制两件事:
  1. **请求体**:`showThinking === true` 时附加 `thinking: { type: "enabled" }`;`false` 时不附加,响应中不会有 thinking block。
  2. **UI 显隐**:`showThinking === false` 时 `#thinkingSection` 整块 `display: none`(无论是否收到 thinking 块)。
- 折叠/展开:`<details><summary>思考过程</summary>...</details>` 元素,默认 `open`。

## Markdown Rendering

- 使用 marked.js (CDN: `https://cdn.jsdelivr.net/npm/marked@12.0.0/marked.min.js`)。
- 配置:`marked.setOptions({ breaks: true, gfm: true })`。
- 不做代码高亮(用户选择 "Markdown 渲染" 而非 "渲染+高亮")。
- 渲染后:
  - 给所有 `<pre>` 加 `position: relative`(用于绝对定位复制按钮)。
  - 注入复制按钮:右上角,点击调用 `navigator.clipboard.writeText(code)`,成功后在按钮上显示 ✓ 1.5s 后恢复。
  - 标记已处理:`pre.dataset.copyAttached = '1'`,二次 render 不重复注入。
- 流式阶段不调 marked(避免半截标签),仅 `content_block_stop` 时一次渲染。

## Error Handling

全局 `showError(msg)`:
- 写入 `#errorBanner` textContent,加 `.visible` 类显示。
- 调用栈:任何 catch / 任何 4xx-5xx 状态码。

错误类型与提示:
- API Key 缺失 → "请先在顶部设置 API Key。"
- 401 → "API Key 无效或已过期。"
- 403 → "无权访问,请检查账户或区域。"
- 404 → "模型或接口路径错误。"
- 429 → "请求过于频繁,请稍后重试。"
- 5xx → "服务器错误 (${status}),请稍后重试。"
- 网络错误(AbortError 除外) → "网络错误: ${err.message}"
- JSON 解析错误(异常 data 行) → 控制台 warn,不显示用户级错误(说明流式数据可能不标准)。
- AbortError(用户主动取消) → 不显示错误,直接清空。

成功路径不调用 showError,但每次 send() 开始时 `hideError()` 重置上一次的错误状态。

## Hotkeys

- `Ctrl+Enter` (textarea focus 时) → 触发 send()
- `Esc` (textarea focus 时) → 触发 clearAll() (中止流 + 清空输入和答复)
- 按钮 disabled 状态:isStreaming 时"发送"变 "停止",点击 abort;输入框 disable。

## Edge Cases

1. **空问题**:"发送"按钮 disabled(初始即如此,textarea 有内容才启用)。
2. **API Key 缺失**:用户点发送 → showError("请先设置 API Key"),不发起请求。
3. **响应只有 thinking 无 text**:仍然完成,显示"模型仅返回了思考过程,无最终答复。"作为 textBuf 兜底(放在 text 区域)。
4. **流中断(网络断开)**:onerror 触发 → showError("连接中断"),保留已收到的内容,光标消失,按钮恢复"发送"。
5. **max_tokens 截断**:`message_delta.stop_reason === 'max_tokens'` → 在 text 末尾追加灰色注 " …(响应被截断,达到 max_tokens 限制)"。
6. **API 返回非 SSE 格式**:如果 content-type 不是 `text/event-stream`,尝试一次性解析为 JSON,提取首个 text block,渲染并显示警告 "未能流式接收,以一次性结果展示"。
7. **API Key 含特殊字符**:直接走 header,无需 escape。
8. **textarea 超长**:`maxlength=10000`,达到后停止输入并轻微视觉提示(边框闪一下红)。
9. **页面刷新**:无任何状态持久化(答复、思考、当前请求全部丢失),只保留 API Key 和开关状态。
10. **响应中含 tool_use 等非 text/thinking block**:跳过(只处理 text/thinking)。

## Out of Scope

- 多轮对话 / 历史记录
- 多模型选择
- 自定义 system prompt
- 代码语法高亮(用户明确选择"Markdown 渲染"而不含"高亮")
- 文件/图片上传
- TTS 朗读答复
- Token 用量统计
- 导出/分享答复
- Markdown 源文本与渲染切换

## Files

- **Create**: `ai.html` (单文件,自包含)
- **No dependencies on other repo files** (api-doc.html 仅作为风格参考)

## Testing Strategy

由于此项目无自动化测试栈,本工具的验证以**手动测试**为主:

1. 打开 `ai.html`(需要本地静态服务器或 file://)。
2. 设置 API Key,确认 input 切换为遮罩态,刷新页面后保留。
3. 切换"显示思考"开关,刷新后保留。
4. 发送一个简单问题(中文),确认:
   - 流式打字机效果出现,光标闪烁
   - 思考块正确显示(可折叠)
   - 答复以 Markdown 渲染(标题、列表、代码块)
   - 代码块右上角复制按钮可点击,剪贴板写入正确
5. 发送一个含代码块的问题,确认代码块 ``` 标记不显示、复制按钮正常。
6. 测试错误路径:
   - 清空 API Key 后发送 → 红色横幅
   - 故意填错 API Key → 401 横幅
7. 测试 Esc 中断流:发送长问题后按 Esc,确认 fetch 被 abort、UI 复位。
8. 测试 max_tokens 截断:故意设置小 max_tokens(测试时可临时改成 200),确认末尾灰色注。
