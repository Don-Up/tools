### HTML 相关专业高频词汇速查表

#### 1. 核心概念与文档结构（Core Concepts & Document Structure）

| 英文术语                                 | 核心含义                 | 技术场景例句                                                                 |
| :----------------------------------- | :------------------- | :--------------------------------------------------------------------- |
| **HTML (HyperText Markup Language)** | 超文本标记语言（网页的骨架）       | *We use **HTML** to structure the webpage content.*                    |
| **Element**                          | 元素（开始标签 + 内容 + 结束标签） | *A `div` is a block-level **element**.*                                |
| **Tag**                              | 标签（元素的标记符号）          | *We use the `<p>` **tag** to define a paragraph.*                      |
| **Opening Tag**                      | 开始标签（`<tag>`）        | *The **opening tag** marks the start of an element.*                   |
| **Closing Tag**                      | 结束标签（`</tag>`）       | *The **closing tag** marks the end of an element.*                     |
| **Self-Closing Tag**                 | 自闭合标签（`<img />`）     | *`<img>` is a **self-closing tag**.*                                   |
| **Attribute**                        | 属性（为元素提供额外信息）        | *We use the `href` **attribute** to specify the link URL.*             |
| **Value**                            | 属性值（属性的具体内容）         | *The `href` **value** is `"https://example.com"`.*                     |
| **Nesting**                          | 嵌套（元素包含其他元素）         | *We **nest** a `span` inside a `p`.*                                   |
| **Child Element**                    | 子元素（被包含在父元素中）        | *The `li` is a **child element** of the `ul`.*                         |
| **Parent Element**                   | 父元素（包含其他元素的元素）       | *The `ul` is the **parent element** of the `li`.*                      |
| **Sibling Element**                  | 兄弟元素（共享同一父级）         | *The two `li` elements are **siblings**.*                              |
| **Document Tree**                    | 文档树（元素的层级结构）         | *The **document tree** represents the relationships between elements.* |
| **DOCTYPE**                          | 文档类型声明               | *We **use** `<!DOCTYPE html>` to **declare** the document type.*       |
| **Root Element**                     | 根元素（`<html>`）        | *The `<html>` tag is the **root element** of the page.*                |

#### 2. 元素分类（Element Categories）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Block-Level Element** | 块级元素（独占一行） | *`<div>` is a **block-level element** that takes the full width.* |
| **Inline Element** | 内联元素（不换行） | *`<span>` is an **inline element** that wraps around text.* |
| **Inline-Block Element** | 行内块元素（内联但可设宽高） | *`<img>` is an **inline-block element**.* |
| **Void Element** | 空元素（不能有内容的元素） | *`<br>` and `<img>` are **void elements**.* |
| **Interactive Element** | 交互元素（用户可操作） | *`<button>` and `<a>` are **interactive elements**.* |
| **Phrasing Content** | 短语内容（文本级元素） | *`<strong>` and `<em>` are **phrasing content**.* |
| **Flow Content** | 流内容（大多数元素） | *`<p>` and `<div>` are **flow content**.* |
| **Sectioning Content** | 分节内容（定义文档结构） | *`<section>` and `<article>` are **sectioning content**.* |

#### 3. 常用标签与语义化（Common Tags & Semantics）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Semantic HTML** | 语义化 HTML（使用有意义的标签） | *We **use** **semantic HTML** for better SEO and accessibility.* |
| `<header>` | 页眉/头部 | *We **use** `<header>` for the page header.* |
| `<nav>` | 导航菜单 | *We **use** `<nav>` for navigation links.* |
| `<main>` | 主要内容区域 | *We **use** `<main>` for the primary content.* |
| `<article>` | 独立内容块 | *We **use** `<article>` for blog posts.* |
| `<section>` | 章节/分区 | *We **use** `<section>` to **group** related content.* |
| `<aside>` | 侧边栏/补充内容 | *We **use** `<aside>` for sidebars and related content.* |
| `<footer>` | 页脚 | *We **use** `<footer>` for the page footer.* |
| `<h1>` - `<h6>` | 标题标签 | *We **use** `<h1>` for the main heading.* |
| `<p>` | 段落 | *We **use** `<p>` to **wrap** each paragraph.* |
| `<a>` | 超链接 | *We **use** `<a>` with `href` to **create** links.* |
| `<img>` | 图片 | *We **use** `<img>` to **embed** images.* |
| `<ul>` / `<ol>` | 无序/有序列表 | *We **use** `<ul>` for **unordered lists** and `<ol>` for **ordered lists**.* |
| `<li>` | 列表项 | *Each item is a `<li>` inside the list.* |
| `<table>` | 表格 | *We **use** `<table>` for tabular data.* |
| `<form>` | 表单 | *We **use** `<form>` for user input.* |
| `<input>` | 输入框 | *We **use** `<input>` to **capture** user input.* |
| `<button>` | 按钮 | *We **use** `<button>` to **submit** the form.* |
| `<div>` | 通用块容器 | *We **use** `<div>` as a **generic container**.* |
| `<span>` | 通用行内容器 | *We **use** `<span>` for inline styling.* |
| `<br>` | 换行 | *We **use** `<br>` to **insert** a line break.* |
| `<hr>` | 水平分割线 | *We **use** `<hr>` to **separate** content.* |

#### 4. 属性与表单（Attributes & Forms）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| `id` | 唯一标识符 | *We **assign** a unique `id` to the element.* |
| `class` | CSS 类名 | *We **use** `class` to **apply** styles.* |
| `style` | 行内样式 | *We **use** `style` for inline CSS.* |
| `src` | 资源路径（图片、脚本） | *We **set** the `src` attribute to **load** the image.* |
| `href` | 超链接目标 | *We **set** `href` to **specify** the link destination.* |
| `alt` | 替代文本（图片无法加载时显示） | *We **always** **add** `alt` text for images.* |
| `title` | 提示文本（鼠标悬停时显示） | *We **use** `title` to **provide** extra information.* |
| `data-*` | 自定义数据属性 | *We **use** `data-id` to **store** custom data.* |
| `srcset` | 响应式图片源 | *We **use** `srcset` for **responsive images**.* |
| `sizes` | 图片尺寸 | *We **use** `sizes` to **specify** the image display size.* |
| `loading` | 懒加载属性 | *We **use** `loading="lazy"` to **defer** off-screen images.* |
| `rel` | 关系属性 | *We **use** `rel="noopener"` for security.* |
| `target` | 打开方式 | *We **use** `target="_blank"` to **open** in a new tab.* |
| `method` | 表单提交方式（GET / POST） | *We **set** `method="POST"` to **submit** data.* |
| `action` | 表单提交地址 | *We **set** `action="/submit"` to **send** the form data.* |
| `name` | 表单字段名称 | *We **use** `name` to **identify** form fields.* |
| `type` | 输入类型（text, password, checkbox） | *We **use** `type="email"` for email validation.* |
| `placeholder` | 占位文本 | *We **use** `placeholder` to **show** a hint.* |
| `required` | 必填字段 | *We **use** `required` to **make** the field mandatory.* |
| `disabled` | 禁用字段 | *We **use** `disabled` to **disable** the input.* |
| `readonly` | 只读字段 | *We **use** `readonly` to **prevent** editing.* |
| `checked` | 选中状态（复选框/单选按钮） | *We **use** `checked` to **pre-select** a checkbox.* |
| `selected` | 选中状态（下拉列表） | *We **use** `selected` to **pre-select** an option.* |
| `value` | 表单提交值 | *We **set** `value` to **specify** the submitted data.* |
| `autofocus` | 自动获得焦点 | *We **use** `autofocus` to **focus** the input on page load.* |
| `autocomplete` | 自动填充 | *We **use** `autocomplete` to **enable** browser autofill.* |
| `novalidate` | 禁用浏览器验证 | *We **use** `novalidate` to **skip** browser validation.* |

#### 5. 多媒体与嵌入（Media & Embedding）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| `<img>` | 图片 | *We **use** `<img>` to **embed** images.* |
| `<video>` | 视频 | *We **use** `<video>` to **embed** videos.* |
| `<audio>` | 音频 | *We **use** `<audio>` to **embed** audio.* |
| `<iframe>` | 内联框架（嵌入外部页面） | *We **use** `<iframe>` to **embed** a YouTube video.* |
| `<embed>` | 嵌入插件 | *We **use** `<embed>` for legacy plugins.* |
| `<object>` | 嵌入对象 | *We **use** `<object>` for PDFs and SVGs.* |
| `<canvas>` | 画布（用于图形绘制） | *We **use** `<canvas>` to **draw** graphics with JavaScript.* |
| `<svg>` | 可缩放矢量图形 | *We **use** `<svg>` for vector graphics.* |
| `<source>` | 媒体源（为 `<video>` 或 `<audio>` 指定多格式） | *We **use** `<source>` to **provide** multiple formats.* |
| `<track>` | 字幕轨道（视频的文本轨道） | *We **use** `<track>` to **add** subtitles.* |
| `<picture>` | 响应式图片容器 | *We **use** `<picture>` for **art direction** in responsive design.* |
| `<figure>` | 插图/图表容器 | *We **use** `<figure>` to **wrap** images with captions.* |
| `<figcaption>` | 插图标题 | *We **use** `<figcaption>` to **add** a caption.* |

#### 6. 可访问性与性能（Accessibility & Performance）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **A11y (Accessibility)** | 可访问性（让所有人都能使用） | *We **ensure** **A11y** for users with disabilities.* |
| **ARIA** | 可访问的富互联网应用 | *We **use** **ARIA** attributes to **improve** accessibility.* |
| **`role`** | ARIA 角色 | *We **set** `role="button"` to **indicate** a custom button.* |
| **`aria-label`** | 无障碍标签 | *We **use** `aria-label` to **label** an icon button.* |
| **`aria-hidden`** | 对屏幕阅读器隐藏 | *We **use** `aria-hidden="true"` to **hide** decorative elements.* |
| **`aria-expanded`** | 展开状态 | *We **use** `aria-expanded` to **indicate** the dropdown state.* |
| **`aria-controls`** | 控制的目标元素 | *We **use** `aria-controls` to **reference** the controlled element.* |
| **`aria-describedby`** | 描述元素 | *We **use** `aria-describedby` to **provide** a description.* |
| **`aria-live`** | 动态内容区域 | *We **use** `aria-live` to **announce** dynamic updates.* |
| **`tabindex`** | 键盘焦点顺序 | *We **use** `tabindex` to **control** the focus order.* |
| **`lang`** | 语言属性 | *We **set** `lang="en"` to **specify** the page language.* |
| **`charset`** | 字符编码 | *We **use** `charset="UTF-8"` for international characters.* |
| **`viewport`** | 视口设置（移动端适配） | *We **set** `viewport` for mobile responsiveness.* |
| **Preload** | 预加载（提前加载关键资源） | *We **use** `rel="preload"` to **load** critical resources early.* |
| **Prefetch** | 预取（在空闲时加载将来需要的资源） | *We **use** `rel="prefetch"` for the next page's resources.* |
| **DNS Prefetch** | DNS 预解析 | *We **use** DNS prefetch to **resolve** domain names early.* |
| **Defer** | 延迟执行（脚本加载后不立即执行） | *We **use** `defer` to **delay** script execution.* |
| **Async** | 异步执行（脚本加载完成后立即执行） | *We **use** `async` for independent scripts.* |
| **Lazy Loading** | 懒加载（按需加载） | *We **use** `loading="lazy"` for off-screen images.* |
| **Critical CSS** | 关键 CSS（首屏所需样式） | *We **inline** **critical CSS** for faster rendering.* |


### 深度拆解 + 避坑指南

#### 1. `Block` vs `Inline` vs `Inline-Block`（显示类型的区别）
| 显示类型 | 是否换行 | 可设宽高 | 适用元素 |
| :--- | :--- | :--- | :--- |
| **Block** | 是（独占一行） | 可以 | `<div>`, `<p>`, `<h1>`, `<section>` |
| **Inline** | 否（与文本在同一行） | 不可以 | `<span>`, `<a>`, `<strong>`, `<em>` |
| **Inline-Block** | 否（与文本同行） | 可以 | `<img>`, `<button>`, `<input>` |

- **技术场景**：*Use `display: block` for layout containers, `display: inline` for text-level elements, and `display: inline-block` for elements that need both inline behavior and size control.*

#### 2. `defer` vs `async`（脚本加载的区别）
| 属性 | 加载时机 | 执行时机 | 适用场景 |
| :--- | :--- | :--- | :--- |
| **`defer`** | 并行加载 | DOM 解析完成后执行，按顺序执行 | 需要按顺序执行的脚本（如 jQuery） |
| **`async`** | 并行加载 | 加载完成后立即执行，不按顺序 | 独立脚本（如第三方分析工具） |

- **技术场景**：*Use `defer` for scripts that depend on the DOM, and `async` for scripts that don't depend on other scripts.*

#### 3. `<article>` vs `<section>`（语义化标签的区别）
| 标签 | 定义 | 使用场景 |
| :--- | :--- | :--- |
| **`<article>`** | 独立、完整的内容块 | 博客文章、新闻、产品卡片 |
| **`<section>`** | 文档中的一个章节 | 页面中的独立部分，如介绍、联系信息 |

- **技术场景**：*Use `<article>` for self-contained content that could be distributed independently, and `<section>` for grouping related content within a page.*


### 快速决策流（0.5 秒选择）

你在编写 HTML 时——

- 选择结构标签？
  - 页面头部 → `<header>`
  - 导航菜单 → `<nav>`
  - 主要内容 → `<main>`
  - 侧边栏 → `<aside>`
  - 章节分区 → `<section>`
  - 独立内容 → `<article>`
  - 页面底部 → `<footer>`

- 选择容器标签？
  - 块级容器 → `<div>`
  - 行内容器 → `<span>`

- 添加属性？
  - CSS 样式 → `class`
  - 唯一标识 → `id`
  - 链接地址 → `href`
  - 图片描述 → `alt`
  - 自定义数据 → `data-*`

- 处理表单？
  - 输入框 → `<input>`
  - 多行文本 → `<textarea>`
  - 下拉列表 → `<select>` + `<option>`
  - 单选按钮 → `type="radio"`
  - 复选框 → `type="checkbox"`

- 优化性能？
  - 懒加载图片 → `loading="lazy"`
  - 延迟脚本 → `defer`
  - 独立脚本 → `async`
  - 预加载关键资源 → `rel="preload"`


### 技术场景组合示例

> *We use semantic HTML to build accessible and SEO-friendly pages. The layout includes a `<header>` with `<nav>`, a `<main>` section with `<article>` for blog posts, and an `<aside>` for related links. All images use the `alt` attribute for accessibility, and we use `loading="lazy"` to improve performance. For the search form, we use `<input>` with `type="search"` and `autocomplete="on"`. External scripts use `defer` to avoid blocking DOM rendering. We also use ARIA attributes like `aria-label` and `role` for custom interactive elements.*

> （我们使用语义化 HTML 来构建可访问且 SEO 友好的页面。布局包括带有 `<nav>` 的 `<header>`、带有 `<article>` 用于博客文章的 `<main>` 区域，以及用于相关链接的 `<aside>`。所有图片都使用 `alt` 属性保证可访问性，并使用 `loading="lazy"` 来提升性能。搜索表单使用 `<input>` 配合 `type="search"` 和 `autocomplete="on"`。外部脚本使用 `defer` 以避免阻塞 DOM 渲染。我们还对自定义交互元素使用 ARIA 属性，如 `aria-label` 和 `role`。）