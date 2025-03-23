在 Next.js 的 App Router 中，有一些特定的文件名称用于定义通用页面或特殊行为。这些文件名称是约定俗成的，Next.js 会自动识别它们并赋予特定的功能。以下是常见的通用页面文件及其用途：

---

### **1. 布局文件**
#### **`layout.tsx` (或 `layout.js`)**
- **用途**: 定义页面的共享布局。
- **说明**: 该文件用于包裹当前目录及其子目录中的所有页面。可以嵌套使用，支持多层级布局。
- **示例**:
  ```tsx
  export default function Layout({ children }: { children: React.ReactNode }) {
    return (
      <div>
        <header>My Header</header>
        <main>{children}</main>
        <footer>My Footer</footer>
      </div>
    );
  }
  ```

---

### **2. 页面文件**
#### **`page.tsx` (或 `page.js`)**
- **用途**: 定义页面的主要内容。
- **说明**: 每个路由目录下必须有一个 `page.tsx` 文件，用于渲染该路由的页面内容。
- **示例**:
  ```tsx
  export default function Home() {
    return <h1>Welcome to the Home Page!</h1>;
  }
  ```

---

### **3. 加载状态文件**
#### **`loading.tsx` (或 `loading.js`)**
- **用途**: 定义页面或路由的加载状态。
- **说明**: 当页面内容正在加载时，会显示该组件。
- **示例**:
  ```tsx
  export default function Loading() {
    return <p>Loading...</p>;
  }
  ```

---

### **4. 错误处理文件**
#### **`error.tsx` (或 `error.js`)**
- **用途**: 定义页面或路由的错误边界。
- **说明**: 当页面或组件抛出错误时，会显示该组件。
- **示例**:
  ```tsx
  'use client'; // 错误组件必须是客户端组件

  export default function Error({ error }: { error: Error }) {
    return <p>Something went wrong: {error.message}</p>;
  }
  ```

---

### **5. 未找到页面文件**
#### **`not-found.tsx` (或 `not-found.js`)**
- **用途**: 定义 404 页面。
- **说明**: 当用户访问不存在的路由时，会显示该组件。
- **示例**:
  ```tsx
  export default function NotFound() {
    return <h1>Page Not Found</h1>;
  }
  ```

---

### **6. 模板文件**
#### **`template.tsx` (或 `template.js`)**
- **用途**: 定义页面的模板。
- **说明**: 与 `layout.tsx` 类似，但每次导航时会重新挂载组件（适合需要重置状态的场景）。
- **示例**:
  ```tsx
  export default function Template({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  }
  ```

---

### **7. 默认文件**
#### **`default.tsx` (或 `default.js`)**
- **用途**: 定义并行路由（Parallel Routes）的默认内容。
- **说明**: 当并行路由未匹配到具体内容时，会显示该组件。
- **示例**:
  ```tsx
  export default function Default() {
    return <p>Default Content</p>;
  }
  ```

---

### **8. API 路由文件**
#### **`route.ts` (或 `route.js`)**
- **用途**: 定义 API 路由。
- **说明**: 用于创建 API 端点，支持 `GET`、`POST`、`PUT`、`DELETE` 等 HTTP 方法。
- **示例**:
  ```typescript
  export async function GET() {
    return new Response('Hello, World!');
  }
  ```

---

### **9. 中间件文件**
#### **`middleware.ts` (或 `middleware.js`)**
- **用途**: 定义全局或路由级别的中间件。
- **说明**: 用于在请求到达页面或 API 路由之前执行逻辑（如身份验证、重定向等）。
- **示例**:
  ```typescript
  import { NextResponse } from 'next/server';
  import type { NextRequest } from 'next/server';

  export function middleware(request: NextRequest) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  ```

---

### **10. 配置文件**
#### **`route-handler.ts` (或 `route-handler.js`)**
- **用途**: 定义路由处理程序。
- **说明**: 用于处理特定路由的逻辑（类似于 API 路由，但更灵活）。
- **示例**:
  ```typescript
  export async function POST(request: Request) {
    const data = await request.json();
    return Response.json({ message: 'Data received', data });
  }
  ```

---

### **11. 全局样式文件**
#### **`global.css`**
- **用途**: 定义全局样式。
- **说明**: 在根布局中引入，应用于整个应用。
- **示例**:
  ```css
  body {
    margin: 0;
    padding: 0;
  }
  ```

---

### **12. 元数据文件**
#### **`metadata.ts` (或 `metadata.js`)**
- **用途**: 定义页面的元数据（如标题、描述等）。
- **说明**: 用于 SEO 优化和页面信息配置。
- **示例**:
  ```typescript
  import { Metadata } from 'next';

  export const metadata: Metadata = {
    title: 'Home Page',
    description: 'Welcome to the home page!',
  };
  ```

---

### **总结**
Next.js 的 App Router 通过特定的文件名称（如 `layout.tsx`、`page.tsx`、`loading.tsx` 等）来实现通用页面的定义和功能扩展。这些文件名称是 Next.js 的约定，开发者只需按照规则创建文件即可实现相应的功能。