### Next.js 相关专业高频词汇速查表

#### 1. 核心概念（Core Concepts）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Next.js** | React 全栈框架 | *We use **Next.js** for server-side rendering and API routes.* |
| **App Router** | App 路由（基于 `app/` 目录的新路由系统） | *We **use** the **App Router** for the new project.* |
| **Pages Router** | Pages 路由（基于 `pages/` 目录的传统路由系统） | *The legacy project **uses** the **Pages Router**.* |
| **Server Components** | 服务端组件（在服务器上渲染的 React 组件） | *We **use** **Server Components** to **reduce** client-side JavaScript.* |
| **Client Components** | 客户端组件（在浏览器中渲染的 React 组件） | *We **add** `"use client"` to **mark** **Client Components**.* |
| **Server Actions** | 服务端动作（在服务器执行的异步函数） | *We **use** **Server Actions** to **handle** form submissions.* |
| **Middleware** | 中间件（在请求完成之前执行的代码） | *We **use** **Middleware** to **handle** authentication.* |

#### 2. 路由系统（Routing System）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **File-Based Routing** | 基于文件的路由（文件夹结构决定路由） | *Next.js uses **file-based routing** to **define** routes.* |
| **Page** | 页面（路由对应的组件） | *We **create** a **page** under `app/dashboard/page.js`.* |
| **Layout** | 布局（共享的 UI 包裹器） | *We **use** a **layout** to **share** the header and footer.* |
| **Nested Layout** | 嵌套布局（多层级布局） | *We **implement** **nested layouts** for the admin section.* |
| **Dynamic Route** | 动态路由（根据参数生成页面） | *We **use** `[id]` for **dynamic routes** like `app/blog/[id]/page.js`.* |
| **Catch-All Route** | 全捕获路由（匹配多级路径） | *We **use** `[...slug]` for **catch-all routes**.* |
| **Optional Catch-All** | 可选全捕获路由 | *We **use** `[[...slug]]` for **optional catch-all routes**.* |
| **Route Group** | 路由组（组织文件夹，不影响 URL） | *We **use** `(auth)` as a **route group** to **organize** pages.* |
| **Parallel Route** | 并行路由（同时渲染多个页面） | *We **use** `@analytics` and `@team` for **parallel routes**.* |
| **Intercepting Route** | 拦截路由（拦截并替换路由） | *We **use** `(.)` to **intercept** routes for modals.* |
| **Link Component** | 链接组件（客户端导航） | *We **use** `<Link>` to **navigate** between pages.* |
| **useRouter** | 路由器 Hook（获取路由信息） | *We **use** `useRouter` to **get** the current path.* |
| **usePathname** | 路径名 Hook（获取当前路径） | *We **use** `usePathname` to **highlight** the active link.* |
| **useSearchParams** | 搜索参数 Hook（获取 URL 查询参数） | *We **use** `useSearchParams` to **read** the `?page=` parameter.* |

#### 3. 渲染策略（Rendering Strategies）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **SSR (Server-Side Rendering)** | 服务端渲染（每次请求在服务端生成 HTML） | *We **use** **SSR** for pages with dynamic data.* |
| **SSG (Static Site Generation)** | 静态站点生成（构建时生成 HTML） | *We **use** **SSG** for blog posts.* |
| **ISR (Incremental Static Regeneration)** | 增量静态再生（在后台更新静态页面） | *We **use** **ISR** to **update** static pages without rebuilding.* |
| **CSR (Client-Side Rendering)** | 客户端渲染（在浏览器中渲染） | *We **use** **CSR** for dashboards that require user interaction.* |
| **RSC (React Server Components)** | React 服务端组件 | *We **use** **RSC** to **render** content on the server.* |
| **Streaming SSR** | 流式服务端渲染（分块发送 HTML） | *We **use** **streaming SSR** to **improve** TTFB.* |
| **Partial Prerendering** | 部分预渲染（静态壳 + 动态内容） | *We **use** **partial prerendering** to **combine** static and dynamic content.* |
| **Hydration** | 水合（为静态 HTML 添加交互性） | *React **hydrates** the HTML to **make** it interactive.* |
| **Hydration Mismatch** | 水合不匹配（服务端与客户端渲染不一致） | *We **fix** **hydration mismatch** errors by **ensuring** the two renders match.* |

#### 4. 数据获取（Data Fetching）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **fetch** | 原生数据获取函数 | *We **use** `fetch` to **fetch** data in Server Components.* |
| **getServerSideProps** | 服务端获取数据（Pages Router 中的 SSR 数据获取） | *We **use** `getServerSideProps` to **fetch** data on the server.* |
| **getStaticProps** | 静态数据获取（Pages Router 中的 SSG 数据获取） | *We **use** `getStaticProps` to **fetch** data at build time.* |
| **getStaticPaths** | 静态路径获取（定义哪些动态路径需要预生成） | *We **use** `getStaticPaths` to **generate** pages for each blog post.* |
| **Server Component Fetching** | 服务端组件数据获取 | *We **fetch** data directly in **Server Components** with `async/await`.* |
| **Client Side Fetching** | 客户端数据获取 | *We **use** `useEffect` or `react-query` for **client-side fetching**.* |
| **Caching** | 缓存（复用之前获取的数据） | *We **use** `cache()` to **deduplicate** fetch requests.* |
| **Revalidation** | 重新验证（重新获取数据） | *We **use** `revalidateTag` to **invalidate** cached data.* |
| **Cache Tag** | 缓存标签（标记缓存数据） | *We **add** `tags: ['posts']` to **invalidate** the cache later.* |
| **Draft Mode** | 草稿模式（预览未发布的文章） | *We **enable** **draft mode** to **preview** content.* |
| **SWR** | 数据缓存与重验证库 | *We **use** **SWR** for client-side data fetching.* |
| **React Query** | 服务端状态管理库 | *We **use** **React Query** for complex data synchronization.* |

#### 5. 优化与配置（Optimization & Configuration）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Bundle Size** | 打包体积 | *We **monitor** the **bundle size** to **avoid** bloating.* |
| **Tree Shaking** | 摇树优化（移除未使用的代码） | *We **enable** **tree shaking** to **remove** unused code.* |
| **Code Splitting** | 代码拆分（按路由拆分代码） | *Next.js **automatically** **splits** code by route.* |
| **Image Optimization** | 图片优化（自动调整图片大小和格式） | *We **use** the `<Image>` component for **image optimization**.* |
| **Font Optimization** | 字体优化（自动优化字体加载） | *We **use** the `next/font` module for **font optimization**.* |
| **Script Optimization** | 脚本优化（优化第三方脚本加载） | *We **use** the `<Script>` component for **script optimization**.* |
| **Static Asset** | 静态资源（图片、字体、样式） | *We **store** **static assets** under the `public/` directory.* |
| **Middleware Optimization** | 中间件优化（条件匹配） | *We **use** `matcher` to **apply** middleware only to specific paths.* |
| **Output** | 输出配置（`standalone` / `export` 等） | *We **use** `output: 'standalone'` to **deploy** with Docker.* |

#### 6. API 与中间件（API & Middleware）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **API Route** | API 路由（在 Next.js 中创建 API） | *We **create** an **API route** under `app/api/users/route.js`.* |
| **Route Handler** | 路由处理器（处理 HTTP 请求的函数） | *We **export** `GET`, `POST`, `PUT`, `DELETE` as **route handlers**.* |
| **Edge Runtime** | 边缘运行时（在 CDN 边缘执行代码） | *We **deploy** middleware to the **edge runtime** for lower latency.* |
| **Node.js Runtime** | Node.js 运行时（在服务器上执行代码） | *We **use** the **Node.js runtime** for CPU-intensive tasks.* |
| **Middleware** | 中间件（在路由处理之前执行的代码） | *We **use** **middleware** to **check** authentication.* |
| **Request** | 请求对象（包含 HTTP 请求信息） | *We **access** the **request** object in middleware.* |
| **Response** | 响应对象（包含 HTTP 响应信息） | *We **return** a **response** from middleware.* |
| **NextResponse** | Next.js 增强的响应对象 | *We **use** `NextResponse.redirect()` to **redirect**.* |
| **Rewrite** | 重写（将请求映射到另一个路径） | *We **use** `rewrites` to **proxy** API requests.* |
| **Redirect** | 重定向（将请求导向另一个 URL） | *We **use** `redirects` to **handle** old URLs.* |


### 深度拆解 + 避坑指南

#### 1. App Router vs Pages Router（新旧路由系统的核心差异）
| 对比维度 | **App Router (`app/`)** | **Pages Router (`pages/`)** |
| :--- | :--- | :--- |
| **路由定义** | 文件夹 + `page.js` | 文件直接作为路由 |
| **数据获取** | `fetch` 直接 `async/await` | `getServerSideProps` / `getStaticProps` |
| **组件类型** | **Server Components**（默认） | 所有组件默认是 Client Components |
| **布局系统** | 支持嵌套布局 | 只有 `_app.js` 和 `_document.js` |
| **性能** | 更优（流式 SSR） | 相对较慢（全量 SSR） |

- **技术场景**：*We switched to the **App Router** because it supports **Server Components** and **streaming SSR**.*
- **解释**：App Router 是新项目的最佳选择，Pages Router 仅用于维护旧项目。

#### 2. SSR vs SSG vs ISR vs CSR（渲染策略的选择）
| 策略 | 渲染时机 | 适用场景 | 性能（TTFB） | 新鲜度 |
| :--- | :--- | :--- | :--- | :--- |
| **SSR** | 每次请求 | 动态数据、个性化内容 | 慢 | 实时 |
| **SSG** | 构建时 | 博客、产品页 | 最快 | 需要重新构建才能更新 |
| **ISR** | 构建时 + 后台更新 | 定期更新的内容 | 快 | 后台定期更新 |
| **CSR** | 客户端 | 交互式仪表盘 | 最慢（需 JS 加载） | 实时 |

- **技术场景**：*We use **SSG** for product pages, **ISR** for the blog to update periodically, and **SSR** for the user dashboard.*
- **解释**：不同的页面类型选择不同的渲染策略，以平衡性能和新鲜度。

#### 3. Server Components vs Client Components（默认 vs 主动标记）
| 概念 | 定义 | 使用场景 |
| :--- | :--- | :--- |
| **Server Components** | 仅在服务器上渲染，不能使用交互功能 | 默认组件类型，数据获取、静态内容 |
| **Client Components** | 在浏览器中渲染，支持交互 | 有 `useState`、`useEffect`、事件处理器的组件 |

- **技术场景**：*Server Components are the **default**. To **use** interactivity, add `"use client"` at the top.*
- **解释**：App Router 中，默认所有组件都是 Server Components，只有在需要交互时才用 `"use client"`。


### 快速决策流（0.5 秒选择）

你在使用 Next.js 时——

- 新建项目，选择哪个路由系统？
  - 新项目 → **App Router**（`app/` 目录）
  - 维护旧项目 → **Pages Router**（`pages/` 目录）

- 选择渲染策略？
  - 静态内容 → **SSG**
  - 动态内容 → **SSR**
  - 需要定期更新 → **ISR**
  - 客户端交互 → **CSR**

- 数据放在哪里获取？
  - Server Components → 直接 **`async/await fetch`**
  - Pages Router → **`getServerSideProps`** 或 **`getStaticProps`**
  - 客户端 → **`useEffect`** 或 **SWR / React Query**

- 需要优化性能？
  - 图片 → 用 **`<Image>`**
  - 字体 → 用 **`next/font`**
  - 第三方脚本 → 用 **`<Script>`**

- 需要创建 API？
  - 用 `app/api/` 目录下的 **API Route** 和 **Route Handler**


### 技术场景组合示例（完整的 Next.js 项目描述）

> *We're building a new e-commerce platform with **Next.js 14** using the **App Router**. Product pages use **SSG** with `getStaticPaths` and `getStaticProps` to pre-render all product details. For the blog, we **enable** **ISR** to **update** posts periodically without a full rebuild. The user dashboard uses **SSR** to **fetch** real-time order data. We **use** **Server Components** by default for data fetching, and only **add** `"use client"` for interactive parts like the cart. Images are **optimized** with the `<Image>` component. The API is **handled** by **API Routes** under `app/api/`. Middleware **checks** authentication for protected routes.*

> （我们正在使用 **Next.js 14** 配合 **App Router** 构建一个新的电商平台。产品页面使用 **SSG**，通过 `getStaticPaths` 和 `getStaticProps` 预渲染所有产品详情。博客部分**启用**了 **ISR**，在不重新构建的情况下定期更新文章。用户仪表盘使用 **SSR** 获取实时订单数据。我们默认使用 **Server Components** 进行数据获取，仅对购物车等交互部分**添加** `"use client"`。图片通过 `<Image>` 组件**优化**。API 通过 `app/api/` 目录下的 **API Routes** **处理**。中间件**检查**受保护路由的认证状态。）