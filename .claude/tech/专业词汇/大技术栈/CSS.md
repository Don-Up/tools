### CSS 相关专业高频词汇速查表

#### 1. 核心概念与盒模型（Core Concepts & Box Model）

| 英文术语                             | 核心含义                                            | 技术场景例句                                                                                      |
| :------------------------------- | :---------------------------------------------- | :------------------------------------------------------------------------------------------ |
| **CSS (Cascading Style Sheets)** | 层叠样式表                                           | *We use **CSS** to style the webpage.*                                                      |
| **Rule Set**                     | 规则集（选择器 + 声明块）                                  | *A **rule set** consists of a selector and a declaration block.*                            |
| **Selector**                     | 选择器（选择要应用样式的元素）                                 | *We use a class **selector** to target the button.*                                         |
| **Declaration**                  | 声明（属性 + 值）                                      | *Each **declaration** includes a property and a value.*                                     |
| **Property**                     | 属性（要设置的样式特征）                                    | *The `color` **property** sets the text color.*                                             |
| **Value**                        | 值（属性的具体取值）                                      | *The **value** `red` sets the text color to red.*                                           |
| **Box Model**                    | 盒模型（元素由 content + padding + border + margin 组成） | *The **box model** defines how elements are rendered.*                                      |
| **Content**                      | 内容区域                                            | *The **content** contains the actual text or child elements.*                               |
| **Padding**                      | 内边距（内容与边框之间的空间）                                 | *We **add** `padding` to **create** space inside the element.*                              |
| **Border**                       | 边框（围绕 padding 的边界）                              | *We **add** a `border` to **outline** the element.*                                         |
| **Margin**                       | 外边距（元素与外部的空间）                                   | *We **use** `margin` to **push** elements apart.*                                           |
| **Box Sizing**                   | 盒模型计算方式                                         | *We **use** `box-sizing: border-box` to **include** padding and border in the total width.* |

#### 2. 选择器与优先级（Selectors & Specificity）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Type Selector** | 类型选择器（标签名） | *We **use** a **type selector** like `div` to target all divs.* |
| **Class Selector** | 类选择器（`.`） | *We **use** a **class selector** like `.btn` to target all buttons.* |
| **ID Selector** | ID 选择器（`#`） | *We **use** an **ID selector** like `#header` for unique elements.* |
| **Attribute Selector** | 属性选择器（`[attr]`） | *We **use** an **attribute selector** like `[type="text"]`.* |
| **Pseudo-class** | 伪类（`:hover`, `:focus`） | *We **use** `:hover` to **change** the color when the user hovers.* |
| **Pseudo-element** | 伪元素（`::before`, `::after`） | *We **use** `::before` to **insert** content before the element.* |
| **Combinator** | 组合器（关系选择器） | *We **use** `>`, `+`, `~` as **combinators** to **select** elements based on their relationship.* |
| **Specificity** | 优先级（选择器的权重） | *The **specificity** determines which rule takes precedence.* |
| **Cascade** | 层叠（多个规则如何合并） | *The **cascade** determines the final value when multiple declarations conflict.* |
| **Inheritance** | 继承（子元素继承父元素的部分样式） | *The `color` property **inherits** from the parent element.* |

#### 3. 布局与定位（Layout & Positioning）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Display** | 显示模式（元素如何布局） | *We **set** `display: flex` to **enable** flexbox.* |
| **Block** | 块级元素 | *A `div` is a **block** element that takes the full width.* |
| **Inline** | 内联元素 | *A `span` is an **inline** element that wraps around text.* |
| **Inline-Block** | 行内块级元素 | *We **use** `display: inline-block` to **set** both width and height.* |
| **Float** | 浮动（让元素脱离文档流） | *We **use** `float: left` to **wrap** text around images.* |
| **Clear** | 清除浮动 | *We **use** `clear: both` to **prevent** floating elements from affecting the layout.* |
| **Position** | 定位（元素的定位方式） | *We **use** `position: absolute` to **position** the element.* |
| **Static** | 静态定位（默认） | *Most elements are **static** by default.* |
| **Relative** | 相对定位（相对于其正常位置） | *We **use** `position: relative` to **offset** the element.* |
| **Absolute** | 绝对定位（相对于最近的非 static 父元素） | *We **use** `position: absolute` to **place** the element exactly.* |
| **Fixed** | 固定定位（相对于视口） | *We **use** `position: fixed` for a sticky header.* |
| **Sticky** | 粘性定位（滚动时粘在顶部） | *We **use** `position: sticky` to **create** a sticky sidebar.* |
| **Z-Index** | 层叠顺序（控制元素的上下关系） | *We **set** a higher `z-index` to **bring** the element to the front.* |
| **Stacking Context** | 层叠上下文（渲染堆叠顺序） | *A new **stacking context** is created with `position: relative` and `z-index`.* |

#### 4. 弹性布局（Flexbox）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Flex Container** | Flex 容器 | *The parent element becomes a **flex container** with `display: flex`.* |
| **Flex Item** | Flex 项目 | *The child elements are **flex items**.* |
| **Main Axis** | 主轴（flex 方向） | *The **main axis** is the primary direction of the layout.* |
| **Cross Axis** | 交叉轴（垂直于主轴） | *The **cross axis** is perpendicular to the main axis.* |
| **Flex Direction** | 主轴方向（`row` / `column`） | *We **set** `flex-direction: column` to **stack** items vertically.* |
| **Justify Content** | 主轴对齐（水平分配空间） | *We **use** `justify-content: center` to **center** items on the main axis.* |
| **Align Items** | 交叉轴对齐（单行垂直对齐） | *We **use** `align-items: center` to **center** items on the cross axis.* |
| **Align Content** | 多行对齐（多行时的垂直对齐） | *We **use** `align-content: space-between` to **distribute** rows.* |
| **Flex Wrap** | 换行（超出时是否换行） | *We **use** `flex-wrap: wrap` to **allow** items to wrap.* |
| **Flex Grow** | 增长因子（项目如何拉伸） | *We **set** `flex-grow: 1` to **allow** the item to **grow**.* |
| **Flex Shrink** | 收缩因子（项目如何压缩） | *We **set** `flex-shrink: 0` to **prevent** the item from **shrinking**.* |
| **Flex Basis** | 基准尺寸 | *We **set** `flex-basis: 200px` to **set** the initial size.* |
| **Flex** | 简写属性（flex-grow + flex-shrink + flex-basis） | *We **use** `flex: 1` as a shorthand.* |
| **Order** | 顺序（控制项目的显示顺序） | *We **use** `order: -1` to **move** the item to the front.* |
| **Align Self** | 单个项目对齐 | *We **use** `align-self: flex-end` to **override** the container's alignment.* |
| **Gap** | 间距（flex/grid 项目之间的空隙） | *We **use** `gap: 1rem` to **add** space between flex items.* |

#### 5. 网格布局（Grid）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Grid Container** | Grid 容器 | *The parent element becomes a **grid container** with `display: grid`.* |
| **Grid Item** | Grid 项目 | *The child elements are **grid items**.* |
| **Grid Line** | 网格线（划分行列的分界线） | *We **position** items using **grid lines**.* |
| **Grid Track** | 网格轨道（两行线之间的空间） | *A **grid track** is the space between two grid lines.* |
| **Grid Cell** | 网格单元格（行列交叉处） | *Each **grid cell** can hold content.* |
| **Grid Area** | 网格区域（由多个单元格组成） | *We **use** `grid-area` to **span** multiple cells.* |
| **Grid Row** | 行轨道 | *We **define** the **grid rows** with `grid-template-rows`.* |
| **Grid Column** | 列轨道 | *We **define** the **grid columns** with `grid-template-columns`.* |
| **Grid Template** | 模板（定义行列结构） | *We **use** `grid-template-rows: 1fr 2fr` to **set** the row sizes.* |
| **fr Unit** | 弹性单位（剩余空间的分数） | *We **use** `1fr` to **allocate** a fraction of the available space.* |
| **Auto** | 自动（根据内容自适应） | *We **use** `auto` to **let** the browser **calculate** the size.* |
| **Repeat** | 重复（简化重复定义） | *We **use** `repeat(3, 1fr)` to **repeat** the pattern.* |
| **Minmax** | 最小最大（尺寸范围） | *We **use** `minmax(100px, 1fr)` to **set** a size range.* |
| **Auto Fill** | 自动填充 | *We **use** `repeat(auto-fill, 200px)` to **create** as many columns as possible.* |
| **Auto Fit** | 自动适配 | *We **use** `repeat(auto-fit, 200px)` to **fit** the columns.* |

#### 6. 响应式与媒体查询（Responsive & Media Queries）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Responsive Design** | 响应式设计（适应不同屏幕尺寸） | *We **use** **responsive design** for mobile-friendly pages.* |
| **Media Query** | 媒体查询（根据设备特性应用样式） | *We **use** a **media query** to **change** the layout on small screens.* |
| **Breakpoint** | 断点（切换布局的屏幕宽度） | *We **use** a **breakpoint** at 768px for mobile devices.* |
| **Mobile First** | 移动优先（先设计移动端，再扩展到大屏） | *We **follow** a **mobile-first** approach.* |
| **Desktop First** | 桌面优先（先设计桌面端，再适配移动端） | *We **used** a **desktop-first** approach for the admin dashboard.* |
| **Viewport** | 视口（用户可见的页面区域） | *We **set** `viewport` in the `<meta>` tag.* |
| **Device Pixel Ratio** | 设备像素比（高清屏适配） | *We **use** `min-resolution` for **device pixel ratio**.* |
| **Container Query** | 容器查询（根据容器大小调整样式） | *We **use** container queries to **style** components based on their parent width.* |

#### 7. 视觉效果与动画（Effects & Animations）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Transition** | 过渡（属性的平滑变化） | *We **use** `transition: 0.3s` to **smoothly** change the color.* |
| **Animation** | 动画（关键帧驱动的动画） | *We **use** `@keyframes` to **define** the **animation**.* |
| **Transform** | 变换（平移、旋转、缩放） | *We **use** `transform: rotate(45deg)` to **rotate** the element.* |
| **Translate** | 平移（`translate()`） | *We **use** `transform: translate(10px, 20px)` to **move** the element.* |
| **Scale** | 缩放（`scale()`） | *We **use** `transform: scale(1.2)` to **enlarge** the element.* |
| **Rotate** | 旋转（`rotate()`） | *We **use** `transform: rotate(90deg)` to **turn** the element.* |
| **Skew** | 斜切（`skew()`） | *We **use** `transform: skew(10deg)` to **skew** the element.* |
| **Opacity** | 透明度 | *We **set** `opacity: 0.5` to **make** the element semi-transparent.* |
| **Box Shadow** | 盒阴影（元素周围添加阴影） | *We **add** `box-shadow: 0 4px 6px rgba(0,0,0,0.1)` to **create** depth.* |
| **Text Shadow** | 文字阴影 | *We **add** `text-shadow` to **make** text stand out.* |
| **Border Radius** | 圆角 | *We **use** `border-radius: 50%` to **make** the element a circle.* |
| **Gradient** | 渐变 | *We **use** `linear-gradient()` to **create** a smooth gradient.* |
| **Filter** | 滤镜（图像效果） | *We **use** `filter: blur(4px)` to **blur** the image.* |

#### 8. 预处理器与工具（Preprocessors & Tools）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Preprocessor** | 预处理器（编译成 CSS） | *We **use** a **preprocessor** like SASS or LESS.* |
| **SASS / SCSS** | 最流行的 CSS 预处理器 | *We **use** **SCSS** for variables and nesting.* |
| **LESS** | CSS 预处理器 | *We **use** **LESS** for legacy projects.* |
| **PostCSS** | CSS 后处理器 | *We **use** **PostCSS** with autoprefixer.* |
| **CSS Variables** | CSS 自定义属性 | *We **use** **CSS variables** for theming.* |
| **Nesting** | 嵌套（选择器嵌套） | *We **use** **nesting** to **organize** styles.* |
| **Mixin** | 混入（可复用的样式块） | *We **use** a **mixin** to **reuse** common styles.* |
| **Extends** | 继承（共享样式） | *We **use** `@extend` to **share** styles between selectors.* |
| **BEM** | 命名规范（Block__Element--Modifier） | *We **follow** **BEM** for class naming.* |
| **OOCSS** | 面向对象的 CSS | *We **use** **OOCSS** for better separation of concerns.* |
| **CSS Modules** | CSS 模块化（局部作用域） | *We **use** **CSS modules** to **scope** styles.* |
| **Styled Components** | CSS-in-JS 方案 | *We **use** **styled-components** for React styling.* |
| **Tailwind CSS** | 原子化 CSS 框架 | *We **use** **Tailwind CSS** to **write** utility-first styles.* |
| **Autoprefixer** | 自动添加浏览器前缀 | *We **use** **autoprefixer** to **add** vendor prefixes.* |
| **Minification** | CSS 压缩 | *We **use** **minification** to **reduce** the CSS file size.* |
| **Source Map** | CSS 源映射（调试） | *We **generate** **source maps** for easier debugging.* |


### 深度拆解 + 避坑指南

#### 1. `display: none` vs `visibility: hidden` vs `opacity: 0`
| 属性 | 占据空间 | 可点击 | 动画性能 |
| :--- | :--- | :--- | :--- |
| **display: none** | 不占据 | 不可点击 | 触发回流，性能差 |
| **visibility: hidden** | 占据 | 不可点击 | 触发重绘，中等 |
| **opacity: 0** | 占据 | 可点击 | 只需合成，性能好 |

- **技术场景**：*Use `display: none` to remove elements, `visibility: hidden` to keep the layout, and `opacity: 0` for smooth fade animations.*

#### 2. Flexbox vs Grid（两种主流布局的区别）
| 特点 | **Flexbox** | **Grid** |
| :--- | :--- | :--- |
| **维度** | 一维（行或列） | 二维（行和列同时控制） |
| **适用场景** | 组件内部、导航栏、列表 | 整体页面布局、复杂网格 |
| **方向控制** | `flex-direction` | `grid-template-rows/columns` |
| **对齐** | `justify-content`（主轴），`align-items`（交叉轴） | `justify-items`（水平），`align-items`（垂直） |

- **技术场景**：*Use Flexbox for component-level layouts and Grid for page-level layouts.*

#### 3. `position: relative` vs `position: absolute` vs `position: fixed`
| 定位方式 | 参考点 | 是否脱离文档流 | 适用场景 |
| :--- | :--- | :--- | :--- |
| **Relative** | 元素原本位置 | 否 | 微调偏移，作为 absolute 的参考 |
| **Absolute** | 最近的非 static 父元素 | 是 | 创建下拉菜单、定位工具提示 |
| **Fixed** | 视口（viewport） | 是 | 固定头部、浮窗按钮 |
| **Sticky** | 父容器滚动边界 | 混合 | 粘性表头、侧边栏 |

- **技术场景**：*Use `relative` for positioning context, `absolute` for child positioning, `fixed` for viewport positioning, and `sticky` for scroll-to-fix effects.*


### 快速决策流（0.5 秒选择）

你在编写 CSS 时——

- 选择布局方式？
  - 一维布局 → 用 **Flexbox**
  - 二维网格 → 用 **Grid**
  - 传统兼容 → 用 **Float / Inline-Block**

- 选择定位方式？
  - 参考父元素 → 父 `relative` + 子 `absolute`
  - 固定在视口 → `position: fixed`
  - 滚动粘性 → `position: sticky`

- 隐藏元素？
  - 完全移除 → `display: none`
  - 保持占位 → `visibility: hidden`
  - 淡出动画 → `opacity: 0`

- 选择单位？
  - 相对于根字体 → `rem`（推荐）
  - 相对于父字体 → `em`
  - 相对于视口宽度 → `vw`
  - 相对于视口高度 → `vh`
  - 相对于容器 → `%`


### 技术场景组合示例

> *We use a mobile-first responsive design with CSS Grid for the page layout. The sidebar uses `position: sticky` to stay visible while scrolling. The card component uses Flexbox with `flex-direction: column` to stack content vertically. We use CSS variables for theming and SCSS for nesting and mixins. Cards have a subtle `box-shadow` and `border-radius: 8px` for better visual hierarchy. The navigation uses `display: flex` with `justify-content: space-between`. At the 768px breakpoint, the layout switches from two columns to a single column using a media query.*

> （我们采用移动优先的响应式设计，使用 CSS Grid 实现页面布局。侧边栏使用 `position: sticky` 在滚动时保持可见。卡片组件使用 Flexbox，通过 `flex-direction: column` 垂直堆叠内容。我们使用 CSS 变量进行主题化，使用 SCSS 实现嵌套和混入。卡片带有轻微的 `box-shadow` 和 `border-radius: 8px`，以增强视觉层次。导航使用 `display: flex` 配合 `justify-content: space-between`。在 768px 断点处，通过媒体查询将布局从两列切换为单列。）