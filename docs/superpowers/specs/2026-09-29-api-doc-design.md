# api-doc.html Design Specification

## Overview

在项目根目录的 `api-doc.html` 中实现一个单文件 HTML 工具。顶部提供"粘贴函数 DOC"按钮,点击后从剪贴板读取一段 JSDoc 注释文本(以 `/** ... */` 包裹,包含 `@param` / `@returns` / `@link` 等标签),解析后以卡片式布局渲染成深色主题的 HTML 视图。解析失败时顶部显示红色错误横幅。

工具服务于开发者快速审阅一个函数/组件的 JSDoc 文档——剪贴板里通常是 ChatGPT/Cursor 等生成的函数说明,文本格式不易扫读,本工具将其转换为视觉分块、tag 配色、示例独立的卡片视图。

## Layout Structure

```
┌────────────────────────────────────────┐
│ api-doc                                │
│ [粘贴函数 DOC]                         │  <- 顶部操作条
├────────────────────────────────────────┤
│ [红色错误横幅:仅解析失败时显示]         │
├────────────────────────────────────────┤
│ #output 容器(初始为空)                 │
│   ┌─ 描述区(浅灰底) ─────────────┐   │
│   │ 描述行 1                       │   │
│   │ 描述行 2                       │   │
│   └────────────────────────────────┘  │
│   ┌─ @param props.open  ━━ 蓝 ──┐    │
│   │ 描述文字                       │    │
│   │ ┌ 例如 ──────────────────┐    │    │
│   │ │ true                   │    │    │
│   │ └────────────────────────┘    │    │
│   └────────────────────────────────┘  │
│   ┌─ @param ...  ━━ 蓝 ────────┐    │
│   ...                                │
│   ┌─ @returns ━━ 绿 ──────────┐    │
│   │ 描述                       │    │
│   └────────────────────────────┘    │
│   ┌─ @link ━━ 紫 ─────────────┐    │
│   │ 1. 名称(...): 描述          │    │
│   │ 2. 名称(...): 描述          │    │
│   └────────────────────────────┘    │
└────────────────────────────────────────┘
```

## Visual Design

沿用项目已有的深色主题(与 `code-explain.html` 一致):

- 背景:`#1e1e1e`
- 主文字:`#e0e0e0`
- 强调色:`#4fc3f7`(@param 蓝)
- 辅助色 1:`#81c784`(@returns 绿)
- 辅助色 2:`#ba68c8`(@link 紫)
- 描述区底色:`#2d2d2d`
- 等宽字体:`Consolas, Monaco, monospace`
- 正文字体:`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

卡片样式:
- 圆角 `6px`,内边距 `12px 16px`,卡片间距 `12px`。
- 卡片左侧用 `border-left: 4px solid <tagColor>` 做色条区分。
- @param 卡片内"name"行(例如 `props.open`)使用等宽字体 + 半透明背景。
- "例如" 块:细边框(`1px solid #555`)、浅色背景(`#262626`)、等宽字体、内边距 `8px`。

按钮样式:
- 主按钮"粘贴函数 DOC":背景 `#4fc3f7`、文字 `#1e1e1e`、圆角 `6px`、hover 加深 10%。
- 错误横幅:背景 `#7f1d1d`、文字 `#fecaca`、圆角 `6px`、内边距 `10px 16px`。

## Architecture

单文件,无外部依赖。内部按职责分段:

```
api-doc.html
├── <style>      # 主题与卡片样式
├── <body>       # 按钮 + 错误横幅 + 输出容器
└── <script>
    ├── parseJsDoc(text)        -> 数据对象
    ├── renderToDOM(data)       -> 渲染到 #output
    ├── showError(message)      -> 显示/更新错误横幅
    └── onPaste() 事件处理器     -> 串起 readText + parse + render
```

## Functionality

### 解析 `parseJsDoc(text)`

输入:从剪贴板读取的字符串。
输出:`{ description: string[], params: Param[], returns: string|null, links: Link[] }`,其中:

```ts
type Param = { name: string, desc: string, example: string|null };
type Link  = { name: string, desc: string };
```

步骤:

1. **格式校验**:字符串以 `/**` 开头且以 `*/` 结尾,否则抛 `InvalidFormatError`。
2. **去前后包裹**:去掉开头的 `/**` 与结尾的 `*/`,按 `\n` 拆行。
3. **行规范化**:每行去掉开头的前缀(允许 ` * `、` *`、`* `、`*` 四种变体,空行保留)。
4. **逐行扫描构建对象**:
   - 行以 `@param ` 开头 → 提取 `name`(直到第一个空格)+ `desc` 起始。后续非空、非新 tag 的行追加到当前 param 的 `desc`。如果接下来的行以 `例如:` 开头(允许前后空格),把冒号后的文本(支持多行)作为 `example`。
   - 行以 `@returns ` 开头 → 累积到 `returns` 字符串(允许多行续行,直到下一个 `@xxx` 或 EOF)。
   - 行以 `@link` 开头(单独成行,后跟内容) → 进入 link 收集模式;后续每行匹配 `^\s*(\d+)\.\s*(.+)$`,捕获名称与描述。
   - 行以其他 `@xxx` 开头 → 跳过整段(`@xxx` 行本身 + 后续非 `@xxx` 行)直到下一个已知 tag 或 `*/`,`console.warn` 记录未知 tag 名。
   - 其他行 → 加入当前段的描述(`description` 数组,或当前 param 的 `desc` 续行)。

边界处理:
- 同一段 description 中的空行保留(渲染时合并为分段)。
- `@param` 没有 `例如:` 行时 `example = null`(卡片不渲染"例如"块)。
- `@returns` / `@link` 缺失时对应字段为 `null`(不渲染该卡片)。
- 多个 `@param` 顺序按出现顺序保留。

### 渲染 `renderToDOM(data)`

- 容器:`document.getElementById('output')`,先 `innerHTML = ''`。
- description 数组 → 一个 `.desc-card` 段落,每个元素是 `<p>`,空字符串渲染为分隔空行。
- params 数组 → 每个 param 一个 `.param-card` 卡片,蓝色左边条。
  - 卡片头:`<span class="tag">@param</span> <code class="name">props.open</code>`
  - 卡片体:`<p class="desc">{desc}</p>`
  - 有 example:追加 `<div class="example"><div class="example-label">例如</div><pre>{example}</pre></div>`
- returns 字符串 → 一个 `.returns-card` 卡片,绿色左边条。
- links 数组 → 一个 `.link-card` 卡片,紫色左边条,内嵌 `<ol>` 列表。每项:`<strong>{name}</strong>: {desc}`。

### 错误处理

全局错误显示函数 `showError(message)`:

- 设置 `#error` 元素 `textContent = message`、`style.display = 'block'`、添加 `.error-banner` 类。
- 调用 `parseJsDoc` 或 `navigator.clipboard.readText` 抛错时:
  - `InvalidFormatError` → "剪贴板内容不是有效的 JSDoc 注释(需以 `/**` 开头、`*/` 结尾)。"
  - `NotAllowedError` → "无法读取剪贴板,请检查浏览器权限。"
  - 其他异常 → 透传 `err.message`,前缀 `"读取失败: "`。
- 成功路径不调用 `showError`,但先把横幅 `display: none`(避免上一次错误残留)。
- 抛错时不替换 `#output`(保留上一次成功渲染),用户可继续看到旧内容便于对照。

### 按钮行为

```html
<button id="btn-paste">粘贴函数 DOC</button>
```

点击触发 `onPaste`:

```js
async function onPaste() {
  try {
    const text = await navigator.clipboard.readText();
    const data = parseJsDoc(text);
    renderToDOM(data);
    showError(null);   // 隐藏横幅
  } catch (err) {
    showError(humanizeError(err));
  }
}
```

按钮文案不变;不显示 loading 状态(剪贴板读取是微秒级)。

## Edge Cases

1. **空剪贴板**:`readText()` 返回 `""`,`parseJsDoc` 抛 `InvalidFormatError`(没有 `/**`)。
2. **多行 description 中含空行**:作为段落分隔,渲染成两个 `<p>`(中间留白)。
3. **param 描述中也含 `:`,被误识别为 example**:`例如:` 必须全等(忽略前后空格)才算 example 触发词,其他冒号不触发。
4. **link 行没有数字前缀**:忽略该行,继续下一行。
5. **未知 tag(如 `@example`、`@deprecated`)**:跳过整段直到下一个已知 tag 或 `*/`,并在 console 警告。
6. **`@param` 后面只有名字没有描述**:`desc` 为空字符串,卡片仍渲染,只显示 name。
7. **`@returns` 后直接是 `*/`**:仍渲染空白内容的 returns 卡片(保留 tag 位置),`returns` 为 `""`。
8. **剪贴板含前导/后随空白**:`parseJsDoc` 在校验前先 `.trim()`,容忍粘贴时多带的换行。

## Out of Scope

- 不提供 Markdown / HTML 字符串复制按钮(用户明确只要"转换为 HTML"渲染)。
- 不持久化最近一次解析结果(刷新页面即丢失)。
- 不支持多个 JSDoc 块批量解析(一次只处理一段)。
- 不做代码高亮(`@example` 中的代码不调用 prism 等)。
- 不做导出/分享功能。