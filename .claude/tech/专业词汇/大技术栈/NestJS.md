### NestJS 相关专业高频词汇速查表
NestJS 是一个用于构建高效、可扩展的 Node.js 服务端应用的框架，融合了 OOP、FP 和 FRP 的元素，深受 Angular 启发。
#### 1. 核心概念与架构（Core Concepts & Architecture）

| 英文术语                          | 核心含义                       | 技术场景例句                                                                      |
| :---------------------------- | :------------------------- | :-------------------------------------------------------------------------- |
| **NestJS / Nest**             | Node.js 服务端应用框架            | *We use **NestJS** to build structured backend applications.*               |
| **Modular Architecture**      | 模块化架构（将应用组织成独立模块）          | *NestJS uses a **modular architecture** for better organization.*           |
| **Dependency Injection (DI)** | 依赖注入（自动提供所需的依赖）            | *The **Dependency Injection** system improves testability and reusability.* |
| **IoC Container**             | 控制反转容器（管理依赖关系）             | *Nest uses an **IoC container** to resolve dependencies automatically.*     |
| **TypeScript-first**          | TypeScript 优先（原生支持 TS）     | *NestJS is a **TypeScript-first** framework with full type safety.*         |
| **Progressive JavaScript**    | 渐进式 JavaScript（兼容 JS 和 TS） | *NestJS supports **progressive JavaScript** for flexibility.*               |

#### 2. 应用构建块（Application Building Blocks）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Controller** | 控制器（处理传入的 HTTP 请求） | *The **controller** handles incoming requests and returns responses.* |
| **Provider** | 提供者（可注入的类，如 Service） | *Providers are registered in modules and can be injected via DI.* |
| **Service** | 服务（包含业务逻辑） | *The **service** contains the business logic and interacts with the database.* |
| **Module** | 模块（应用的组织单元） | *Each feature is encapsulated in a **module**.* |
| **Middleware** | 中间件（在路由处理前执行的函数） | *We use **middleware** for logging and authentication.* |
| **Guard** | 守卫（负责认证和授权） | *The **guard** checks if the user has permission to access the route.* |
| **Interceptor** | 拦截器（拦截请求/响应，进行转换） | *We use an **interceptor** to format the response structure.* |
| **Pipe** | 管道（数据验证和转换） | *The **pipe** validates the incoming payload.* |
| **Exception Filter** | 异常过滤器（统一的异常处理） | *We use an **exception filter** to handle all errors globally.* |
| **Decorator** | 装饰器（为类/方法添加元数据） | *We use the `@Get()` **decorator** to define a route handler.* |

#### 3. 请求处理管道（Request Processing Pipeline）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Request** | 请求（从客户端发送到服务器） | *The **request** object contains the incoming HTTP data.* |
| **Response** | 响应（从服务器返回给客户端） | *The **response** is sent back to the client.* |
| **Route** | 路由（URL 路径映射到控制器方法） | *We define a **route** using the `@Get()` decorator.* |
| **Route Handler** | 路由处理器（处理特定路由的方法） | *The **route handler** executes when the route is hit.* |
| **Param** | 路径参数（URL 中的动态部分） | *We use `@Param()` to **extract** the route parameter.* |
| **Query** | 查询参数（URL 中的 `?key=value`） | *We use `@Query()` to get the query string parameters.* |
| **Body** | 请求体（POST/PUT 请求中的数据） | *We use `@Body()` to **parse** the request body.* |
| **Headers** | 请求头（HTTP 头部信息） | *We use `@Headers()` to **read** the request headers.* |

#### 4. 模块系统（Module System）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Root Module** | 根模块（应用的入口模块） | *The **root module** is the starting point of the application.* |
| **Feature Module** | 功能模块（封装特定功能） | *We create a **feature module** for each business capability.* |
| **Shared Module** | 共享模块（导出供其他模块使用的提供者） | *We use a **shared module** to provide common utilities.* |
| **Global Module** | 全局模块（提供者随处可用） | *We use `@Global()` to make a module **global**.* |
| **Dynamic Module** | 动态模块（运行时可配置的模块） | *We use a **dynamic module** to register providers dynamically.* |
| **Imports** | 导入（引入其他模块） | *We **import** the database module to use its providers.* |
| **Exports** | 导出（暴露提供者给其他模块） | *We **export** the service so other modules can use it.* |
| **Providers** | 提供者注册 | *We **register** the service as a **provider** in the module.* |

#### 5. 平台与配置（Platform & Configuration）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Express** | Express（默认的底层 HTTP 框架） | *NestJS uses **Express** as the default HTTP platform.* |
| **Fastify** | Fastify（高性能替代平台） | *We **switched** to **Fastify** for better performance.* |
| **Platform Adapter** | 平台适配器（连接 Nest 和底层框架） | *The **platform adapter** allows Nest to work with different HTTP libraries.* |
| **NestFactory** | Nest 工厂（创建应用实例） | *We use `NestFactory.create()` to bootstrap the app.* |
| **INestApplication** | 应用接口（应用实例的接口） | *The `INestApplication` interface provides methods for app configuration.* |
| **Nest CLI** | 命令行工具（生成代码） | *We use the **Nest CLI** to generate modules and services.* |
| **Bootstrap** | 启动（初始化并运行应用） | *We **bootstrap** the application in `main.ts`.* |
| **Lifecycle Event** | 生命周期事件（应用启动/关闭时的钩子） | *We use **lifecycle events** to run code on application startup.* |
| **Testing Module** | 测试模块（用于单元测试） | *We use the **testing module** to isolate components for unit tests.* |


### 深度拆解 + 避坑指南

#### 1. Controller vs Service vs Provider（职责分离）

| 概念 | 职责 | 是否可以注入其他组件 |
| :--- | :--- | :--- |
| **Controller** | 接收 HTTP 请求，调用 Service，返回 Response | 可以注入 Service，不应包含业务逻辑 |
| **Service** | 实现业务逻辑，操作数据库，调用外部 API | 可以注入其他 Service 或 Repository，不应包含 HTTP 层逻辑 |
| **Provider** | 广义概念，Service 是一种 Provider，其他可注入的类都是 Provider | Provider 是 DI 系统的基础，所有可注入的类都是 Provider |

- **技术场景**：*The controller handles the request and calls the service, which contains the business logic.*
- **解释**：Controller 只管接收和返回，Service 管核心业务，Provider 是 Nest 中对所有可注入类的统称。

#### 2. Guard vs Middleware vs Interceptor（执行顺序不同）

| 概念 | 执行阶段 | 主要用途 |
| :--- | :--- | :--- |
| **Middleware** | 最早执行（路由匹配之前） | 日志记录、请求体解析 |
| **Guard** | 路由匹配之后，处理器执行之前 | 认证授权 |
| **Interceptor** | 处理器执行前后（包裹请求/响应） | 响应格式化、日志、缓存 |

- **技术场景**：*Middleware runs first, then guards check permissions, then interceptors transform the response.*
- **解释**：三者构成了 NestJS 的请求处理管道，执行顺序为 Middleware → Guard → Interceptor（pre）→ Controller → Interceptor（post）。

#### 3. Module 封装 vs 全局模块（提供者的可见性）

| 概念 | 特点 | 使用方式 |
| :--- | :--- | :--- |
| **Module Encapsulation** | 默认每个模块的提供者只在模块内部可用 | 需要在 `exports` 中声明才能对外暴露 |
| **Global Module** | 被 `@Global()` 标记的模块，提供者全局可用 | 注册一次即可在所有模块注入，无需 `imports` |

- **技术场景**：*Providers are encapsulated in modules by default. Use `@Global()` to make them available everywhere.*
- **解释**：模块封装是 NestJS 的设计核心，默认提供者只在本模块可见，需要用 `exports` 暴露；全局模块用 `@Global()` 装饰即可。


### 快速决策流（0.5 秒选择）

你在使用 NestJS 时——

- 需要定义路由？
  - 用 **Controller** + 装饰器（`@Get()`, `@Post()`）

- 需要实现业务逻辑？
  - 用 **Service**（`@Injectable()`）

- 需要验证请求数据？
  - 用 **Pipe**（`ValidationPipe`）

- 需要身份认证？
  - 用 **Guard**

- 需要统一的异常响应格式？
  - 用 **Exception Filter**

- 需要格式化返回结果（如加 `{ code, data, msg }` 包装）？
  - 用 **Interceptor**

- 需要给多个模块共享服务？
  - 在模块的 **`exports`** 数组中声明

- 需要全局可用的服务（如数据库连接）？
  - 用 **Global Module**（`@Global()`）


### 技术场景组合示例

> *We're building a REST API with **NestJS**. The **controllers** handle incoming requests and delegate tasks to **services**, which contain the business logic. We use a **guard** for authentication and an **interceptor** to format the response. All exceptions are handled by a global **exception filter**. The app is organized into **feature modules** (e.g., UsersModule, OrdersModule), and common utilities are shared via a **shared module** using **exports**. The **root module** imports all feature modules. We run the app with Express as the default platform and use the **Nest CLI** to generate new components.*

> （我们正在使用 **NestJS** 构建一个 REST API。**控制器**处理传入请求，并将任务委托给包含业务逻辑的**服务**。我们使用**守卫**进行身份验证，使用**拦截器**格式化响应。所有异常都由全局的**异常过滤器**处理。应用按**功能模块**组织（如 UsersModule、OrdersModule），通用工具通过**共享模块**使用 **exports** 共享。**根模块**导入所有功能模块。我们使用 Express 作为默认平台运行应用，并使用 **Nest CLI** 生成新组件。）