### TypeScript 相关专业高频词汇速查表

#### 1. 核心概念（Core Concepts）

| 英文术语                    | 核心含义                     | 技术场景例句                                                                        |
| :---------------------- | :----------------------- | :---------------------------------------------------------------------------- |
| **TypeScript (TS)**     | JavaScript 的超集，添加了静态类型系统 | *We use **TypeScript** to add type safety to our codebase.*                   |
| **Static Typing**       | 静态类型（在编译时检查类型）           | *TypeScript provides **static typing** to catch errors early.*                |
| **Type Safety**         | 类型安全（避免类型错误）             | *We gain **type safety** by using TypeScript.*                                |
| **Type Checker**        | 类型检查器（tsc 编译器）           | *The **type checker** validates type correctness during compilation.*         |
| **Compilation**         | 编译（将 TS 转换为 JS）          | *We **compile** TypeScript to JavaScript using the `tsc` command.*            |
| **Transpile**           | 转译（将 TS 转成 JS）           | *The TypeScript compiler **transpiles** TS code to JS.*                       |
| **Declaration File**    | 声明文件（描述 JS 库的类型，`.d.ts`） | *We **write** a **declaration file** for the third-party library.*            |
| **Ambient Declaration** | 环境声明（告诉 TS 存在某个外部变量）     | *We use `declare` for **ambient declarations**.*                              |
| **Type Inference**      | 类型推断（TS 自动推断类型）          | *TypeScript uses **type inference** when we don't explicitly specify a type.* |

#### 2. 基础类型（Basic Types）

| 英文术语               | 核心含义            | 技术场景例句                                                                                            |                          |
| :----------------- | :-------------- | :------------------------------------------------------------------------------------------------ | ------------------------ |
| **Primitive Type** | 原始类型            | *`string`, `number`, `boolean`, `null`, `undefined`, `symbol`, `bigint` are **primitive types**.* |                          |
| **Any**            | 任意类型（关闭类型检查）    | *We should **avoid** using `any` because it **disables** type checking.*                          |                          |
| **Unknown**        | 未知类型（安全的 `any`） | *We use `unknown` when the type is not known in advance.*                                         |                          |
| **Never**          | 永不返回的类型         | *A function that throws an error returns `never`.*                                                |                          |
| **Void**           | 无返回值            | *A function that doesn't return a value has a `void` return type.*                                |                          |
| **Array**          | 数组类型            | *We define an **array** using `type[]` or `Array<type>`.*                                         |                          |
| **Tuple**          | 元组（固定长度和类型的数组）  | *We use a `[string, number]` **tuple** to represent a key-value pair.*                            |                          |
| **Enum**           | 枚举（一组命名常量）      | *We use an `enum` for status values.*                                                             |                          |
| **Union Type**     | 联合类型（多个类型之一）    | *We use a **union type** `string                                                                  | number` for parameters.* |
| **Literal Type**   | 字面量类型（具体的值作为类型） | *We use **literal types** like `"success"                                                         | "error"`.*               |

#### 3. 高级类型（Advanced Types）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Intersection Type** | 交叉类型（合并多个类型） | *We use `A & B` to **combine** two types into one.* |
| **Type Guard** | 类型守卫（在运行时缩小类型范围） | *We use `typeof` and `instanceof` as **type guards**.* |
| **Narrowing** | 类型收窄（将宽类型缩小为更具体的类型） | *We use `if` statements to **narrow** the type.* |
| **Discriminated Union** | 可辨识联合（通过共同字段区分类型） | *We use a `type` field to create a **discriminated union**.* |
| **Mapped Type** | 映射类型（批量转换类型属性） | *We use **mapped types** like `Partial<T>` and `Readonly<T>`.* |
| **Conditional Type** | 条件类型（根据条件选择类型） | *We use `T extends U ? X : Y` for **conditional types**.* |
| **Indexed Access Type** | 索引访问类型（通过索引获取类型） | *We use `T[K]` to **access** the type of a property.* |
| **Template Literal Type** | 模板字面量类型（拼接字符串类型） | *We use `\`${string}-${string}\`` for **template literal types**.* |
| **Omit** | 省略（从类型中移除属性） | *We use `Omit<T, "id">` to **remove** the `id` property.* |
| **Pick** | 选取（从类型中选属性） | *We use `Pick<T, "name" | "age">` to **pick** specific properties.* |
| **Partial** | 部分（所有属性变为可选） | *We use `Partial<T>` to make all properties optional.* |
| **Required** | 必需（所有属性变为必需） | *We use `Required<T>` to make all properties required.* |
| **Readonly** | 只读（所有属性变为只读） | *We use `Readonly<T>` to make all properties immutable.* |
| **Record** | 记录（构造键值对类型） | *We use `Record<string, number>` for a dictionary.* |
| **Exclude** | 排除（从联合类型中移除某些类型） | *We use `Exclude<"a" | "b" | "c", "a">` to **exclude** `"a"`.* |
| **Extract** | 提取（从联合类型中提取某些类型） | *We use `Extract<"a" | "b" | "c", "a">` to **extract** `"a"`.* |
| **ReturnType** | 返回类型（获取函数的返回值类型） | *We use `ReturnType<typeof fn>` to **infer** the return type.* |
| **Parameters** | 参数类型（获取函数的参数类型） | *We use `Parameters<typeof fn>` to **infer** the parameter types.* |
| **NonNullable** | 非空（排除 `null` 和 `undefined`） | *We use `NonNullable<T>` to **remove** `null` and `undefined`.* |

#### 4. 类型操作符（Type Operators）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **`keyof`** | 键操作符（获取对象的所有键） | *We use `keyof T` to **get** all property names of `T`.* |
| **`typeof`** | 类型查询（获取值的类型） | *We use `typeof` to **get** the type of a variable.* |
| **`extends`** | 扩展/约束（泛型约束或条件判断） | *We use `T extends string` to **constrain** the generic type.* |
| **`infer`** | 推断（在条件类型中推断类型） | *We use `infer` to **extract** the return type of a function.* |
| **`as`** | 类型断言（告诉 TS 更具体的类型） | *We use `as` for **type assertions**.* |
| **`!` (Non-null Assertion)** | 非空断言（告诉 TS 值不是 `null` 或 `undefined`） | *We use `!` to **assert** that a value is not `null`.* |
| **`?` (Optional)** | 可选属性/参数 | *We use `?` to **mark** a property as optional.* |
| **`readonly`** | 只读属性 | *We use `readonly` to **prevent** reassignment.* |

#### 5. 类与装饰器（Classes & Decorators）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Abstract Class** | 抽象类（不能实例化的基类） | *We use an **abstract class** to **define** a base with shared methods.* |
| **Implements** | 实现（类实现接口） | *A class `implements` an interface to **satisfy** its contract.* |
| **Access Modifier** | 访问修饰符 | *We use `public`, `private`, and `protected` as **access modifiers**.* |
| **Public** | 公共（默认） | *`public` members are accessible everywhere.* |
| **Private** | 私有（只能在类内部访问） | *`private` members are not accessible outside the class.* |
| **Protected** | 受保护（只能在类或子类中访问） | *`protected` members are accessible in subclasses.* |
| **Readonly** | 只读 | *`readonly` properties can only be assigned during initialization.* |
| **Static** | 静态（属于类本身而非实例） | *We use `static` methods that are **called** on the class.* |
| **Decorator** | 装饰器（元编程，给类/方法添加元数据） | *We use **decorators** in NestJS and Angular.* |
| **Class Decorator** | 类装饰器 | *We use a **class decorator** to modify the class.* |
| **Method Decorator** | 方法装饰器 | *We use a **method decorator** to modify a method.* |
| **Property Decorator** | 属性装饰器 | *We use a **property decorator** to modify a property.* |
| **Parameter Decorator** | 参数装饰器 | *We use a **parameter decorator** to modify a parameter.* |
| **Metadata** | 元数据（附加在类/方法上的信息） | *Decorators **attach** **metadata** to classes.* |

#### 6. 配置与工具（Configuration & Tools）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **tsconfig.json** | TS 配置文件 | *We **configure** the project in `tsconfig.json`.* |
| **Compiler Options** | 编译器选项 | *We **set** `strict: true` in the **compiler options**.* |
| **Strict Mode** | 严格模式（启用所有严格检查） | *We **enable** `strict` mode for maximum type safety.* |
| **target** | 目标 JS 版本 | *We **set** `target: "ES2020"` in tsconfig.* |
| **lib** | 库文件（引入类型定义） | *We **include** `"dom"` in `lib` for browser APIs.* |
| **module** | 模块系统 | *We **set** `module: "commonjs"` for Node.js.* |
| **outDir** | 输出目录 | *We **specify** `outDir: "./dist"` for compiled files.* |
| **rootDir** | 根目录 | *We **set** `rootDir: "./src"` for source files.* |
| **esModuleInterop** | ES 模块互操作 | *We **enable** `esModuleInterop` for better module compatibility.* |
| **skipLibCheck** | 跳过库检查 | *We **use** `skipLibCheck` to **speed up** compilation.* |
| **Declaration** | 生成声明文件 | *We **generate** `.d.ts` files with `declaration: true`.* |
| **Source Map** | 源映射（调试时映射回 TS 源码） | *We **generate** source maps for easier debugging.* |
| **TSLint** | TS 代码检查工具 | *We **use** **TSLint** for code linting.* |
| **ESLint** | 通用的 JS/TS 代码检查工具 | *We **use** **ESLint** with TypeScript plugin.* |
| **Prettier** | 代码格式化工具 | *We **use** **Prettier** to format the codebase.* |
| **Node Types** | Node.js 类型定义 | *We **install** `@types/node` for Node.js types.* |
| **DefinitelyTyped** | 社区维护的声明文件仓库 | *We **find** types on **DefinitelyTyped**.* |


### 深度拆解 + 避坑指南

#### 1. `any` vs `unknown` vs `never`（类型安全的三个层次）
| 类型 | 特点 | 使用场景 |
| :--- | :--- | :--- |
| **`any`** | 完全关闭类型检查，最不安全 | *Avoid `any` unless migrating from JS.* |
| **`unknown`** | 安全版 `any`，使用前需要类型检查 | *Use `unknown` for external data.* |
| **`never`** | 不可能发生的类型 | *Use `never` for exhaustive checks.* |

- **技术场景**：*Prefer `unknown` over `any` when dealing with dynamic content, and use `never` for exhaustive conditionals.*

#### 2. `type` vs `interface`（类型定义的选择）
| 特性 | `type` | `interface` |
| :--- | :--- | :--- |
| **扩展方式** | `&` 交叉 | `extends` 继承 |
| **合并声明** | 不支持 | 支持（声明合并） |
| **适用类型** | 任何类型（联合、元组等） | 对象类型 |

- **技术场景**：*Use `interface` for object shapes that may be extended, and `type` for unions, tuples, and complex types.*

#### 3. `private` vs `#`（两种私有字段方式）
| 方式 | 特点 | 使用场景 |
| :--- | :--- | :--- |
| **`private`** | 编译时检查，运行时存在 | *Traditional TypeScript private fields.* |
| **`#`** | 原生私有字段，严格运行时私有 | *Use `#` for truly private fields in ES2022.* |

- **技术场景**：*Use `#` for runtime encapsulation and `private` for compile-time checks.*


### 快速决策流（0.5 秒选择）

你在使用 TypeScript 时——

- 定义变量类型？
  - JS 迁移 → 用 `any`
  - 外部数据 → 用 `unknown`
  - 不可能的值 → 用 `never`

- 定义对象形状？
  - 可以扩展 → 用 `interface`
  - 联合/复杂 → 用 `type`

- 处理泛型约束？
  - 用 `extends`

- 从类型中推导/提取？
  - 键 → 用 `keyof`
  - 值类型 → 用 `typeof`
  - 返回值 → 用 `ReturnType`

- 转换类型（Utility Types）？
  - 所有属性可选 → `Partial<T>`
  - 所有属性必需 → `Required<T>`
  - 所有属性只读 → `Readonly<T>`
  - 移除某些属性 → `Omit<T, K>`
  - 保留某些属性 → `Pick<T, K>`


### 技术场景组合示例

> *We use TypeScript for type safety in our codebase. All functions are strictly typed with explicit return types. We use `unknown` for external API responses and narrow them with type guards. For configuration objects, we use `interface` because it supports declaration merging. We use utility types like `Omit<T>` to remove sensitive fields before serialization. The project is configured with `strict: true` in `tsconfig.json`, and we use ESLint with TypeScript plugin for static analysis. All third-party types are installed from DefinitelyTyped.*

> （我们在代码库中使用 TypeScript 来保证类型安全。所有函数都有严格类型和显式返回类型。对于外部 API 响应，我们使用 `unknown` 并通过类型守卫收窄类型。对于配置对象，我们使用 `interface` 因为它支持声明合并。我们使用 `Omit<T>` 等工具类型在序列化前移除敏感字段。项目在 `tsconfig.json` 中配置了 `strict: true`，并使用 ESLint 配合 TypeScript 插件进行静态分析。所有第三方类型都从 DefinitelyTyped 安装。）