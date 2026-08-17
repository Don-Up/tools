### JavaScript 相关专业高频词汇速查表

#### 1. 核心概念与数据类型（Core Concepts & Data Types）

| 英文术语               | 核心含义   | 技术场景例句                                                                                                                   |
| :----------------- | :----- | :----------------------------------------------------------------------------------------------------------------------- |
| **Primitive Type** | 原始类型   | *JS has seven **primitive types** including `string`, `number`, `boolean`, `null`, `undefined`, `symbol`, and `bigint`.* |
| **Reference Type** | 引用类型   | *Objects and arrays are **reference types**; they are passed by reference.*                                              |
| **Type Coercion**  | 类型强制转换 | *We should **avoid** implicit **type coercion** to prevent bugs.*                                                        |
| **Falsy Value**    | 假值     | *`false`, `0`, `''`, `null`, `undefined`, and `NaN` are **falsy values**.*                                               |
| **Truthy Value**   | 真值     | *Everything not **falsy** is **truthy** in JavaScript.*                                                                  |
| **Dynamic Typing** | 动态类型   | *JavaScript uses **dynamic typing**, meaning a variable can hold any type.*                                              |
| **typeof**         | 类型操作符  | *We use `typeof` to **check** the type of a variable.*                                                                   |
| **instanceof**     | 实例操作符  | *We use `instanceof` to **check** if an object is an instance of a class.*                                               |

#### 2. 作用域与闭包（Scope & Closure）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Scope** | 作用域（变量的可见范围） | *Variables declared with `let` have **block scope**.* |
| **Global Scope** | 全局作用域 | *Avoid polluting the **global scope** with too many variables.* |
| **Function Scope** | 函数作用域 | *`var` is **function-scoped**, while `let` and `const` are block-scoped.* |
| **Block Scope** | 块作用域 | *`let` and `const` are **block-scoped** to `{}`.* |
| **Lexical Scope** | 词法作用域 | *JavaScript uses **lexical scoping**, so inner functions can access outer variables.* |
| **Closure** | 闭包（函数 + 其词法环境的组合） | *A **closure** allows a function to **remember** the variables from its outer scope.* |
| **Hoisting** | 变量提升 | *`var` declarations are **hoisted** to the top, but `let` and `const` are not initialized.* |
| **TDZ (Temporal Dead Zone)** | 暂时性死区（`let`/`const` 声明前不可访问） | *Accessing a `let` variable before declaration throws a **TDZ** error.* |

#### 3. 异步编程（Asynchronous Programming）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Callback** | 回调函数（异步操作完成时调用的函数） | *We **pass** a **callback** to `setTimeout` to **execute** it later.* |
| **Callback Hell** | 回调地狱（多层嵌套的回调） | *We **avoid** **callback hell** by using Promises and `async/await`.* |
| **Promise** | 承诺（异步操作的最终结果） | *We **return** a **Promise** to **handle** asynchronous operations.* |
| **Resolve** | 解决（Promise 成功完成） | *We **resolve** the Promise with the result.* |
| **Reject** | 拒绝（Promise 失败） | *We **reject** the Promise if an error occurs.* |
| **Pending** | 等待中（Promise 的初始状态） | *The Promise is **pending** until the async operation completes.* |
| **Fulfilled** | 已完成（Promise 成功解决） | *The Promise is **fulfilled** when the operation succeeds.* |
| **Settled** | 已敲定（Promise 已完成或拒绝） | *The Promise is **settled** when it's no longer pending.* |
| **Chaining** | 链式调用（串联多个 Promise） | *We **chain** Promises using `.then()` to **sequence** async operations.* |
| **Async/Await** | 异步/等待（语法糖，让异步代码看起来同步） | *We **use** `async/await` to **write** asynchronous code more cleanly.* |
| **Event Loop** | 事件循环（JS 的运行时模型） | *The **event loop** processes tasks from the callback queue.* |
| **Task Queue** | 任务队列（宏任务队列） | *The **task queue** holds macrotasks like `setTimeout` and I/O events.* |
| **Microtask Queue** | 微任务队列（Promise 回调等） | ***Microtasks** are processed before the next macrotask.* |
| **Macrotask** | 宏任务（`setTimeout`, `setInterval`, I/O） | *`setTimeout` adds a **macrotask** to the task queue.* |
| **Race Condition** | 竞争条件（异步操作的执行顺序不确定） | *We need to **avoid** **race conditions** when dealing with shared state.* |

#### 4. ES6+ 现代语法（Modern Syntax）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Arrow Function** | 箭头函数（简洁的函数语法，词法 `this`） | *We **use** **arrow functions** for short callbacks.* |
| **Template Literal** | 模板字符串（支持插值的字符串） | *We **use** **template literals** for string interpolation.* |
| **Destructuring** | 解构赋值（从对象/数组中提取值） | *We **use** **destructuring** to **extract** properties from objects.* |
| **Spread Operator** | 展开操作符（`...`，展开数组/对象） | *We **use** the **spread operator** to **copy** arrays and objects.* |
| **Rest Parameter** | 剩余参数（将剩余参数收集为数组） | *We **use** the **rest parameter** to **capture** all remaining arguments.* |
| **Default Parameter** | 默认参数（为函数参数提供默认值） | *We **set** a **default parameter** to **handle** missing arguments.* |
| **Enhanced Object Literal** | 增强的对象字面量（简写属性和方法） | *We **use** **enhanced object literals** to **write** cleaner code.* |
| **Optional Chaining** | 可选链（`?.`，安全访问嵌套属性） | *We **use** **optional chaining** to **avoid** `Cannot read property of undefined`.* |
| **Nullish Coalescing** | 空值合并（`??`，只有在 `null`/`undefined` 时使用默认值） | *We **use** `??` to **provide** a default value for `null` or `undefined`.* |
| **ES Module (ESM)** | ES 模块（原生模块系统） | *We **use** `import` and `export` for **ES modules**.* |
| **CommonJS** | CommonJS 模块（Node.js 的传统模块系统） | *Node.js uses **CommonJS** with `require()` and `module.exports`.* |

#### 5. 原型与对象（Prototype & Object）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Prototype** | 原型（对象的继承机制） | *Every object has a **prototype** that it inherits from.* |
| **Prototype Chain** | 原型链（对象到原型的链式继承） | *JavaScript uses the **prototype chain** for inheritance.* |
| **Prototypal Inheritance** | 原型继承 | *JavaScript uses **prototypal inheritance** instead of classical inheritance.* |
| **`__proto__`** | 内部原型引用 | *We can **access** an object's prototype via `__proto__`.* |
| **`Object.create()`** | 创建对象的工厂方法 | *We **use** `Object.create()` to **create** a new object with a specific prototype.* |
| **Class** | 类（语法糖，基于原型） | *We **use** the `class` syntax to **define** blueprints for objects.* |
| **Constructor** | 构造函数 | *The **constructor** is a special method for creating and initializing objects.* |
| **`this`** | 当前上下文 | *The value of `this` depends on how the function is called.* |
| **`bind()`** | 绑定（固定 `this` 的值） | *We **use** `bind()` to **fix** the value of `this`.* |
| **`call()`** | 调用（显式设置 `this` 并调用函数） | *We **use** `call()` to **invoke** a function with a specific `this`.* |
| **`apply()`** | 应用（类似于 `call`，但参数以数组传入） | *We **use** `apply()` to **call** a function with an array of arguments.* |

#### 6. 函数式编程（Functional Programming）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Higher-Order Function (HOF)** | 高阶函数（函数接收函数或返回函数） | *`map`, `filter`, and `reduce` are **higher-order functions**.* |
| **Array Methods** | 数组方法 | *We **use** `.map()`, `.filter()`, and `.reduce()` to **transform** arrays.* |
| **`.map()`** | 映射（将数组每个元素转换为新值） | *We **use** `.map()` to **transform** each element in the array.* |
| **`.filter()`** | 过滤（保留满足条件的元素） | *We **use** `.filter()` to **remove** unwanted elements.* |
| **`.reduce()`** | 归约（将数组归约为单个值） | *We **use** `.reduce()` to **accumulate** a single result.* |
| **`.forEach()`** | 遍历（对每个元素执行操作） | *We **use** `.forEach()` to **perform** side effects.* |
| **`.some()` / `.every()`** | 存在性/全称量词 | *We **use** `.some()` to **check** if any element satisfies a condition.* |
| **Immutability** | 不可变性（数据不被修改） | *We **prefer** **immutability** to **avoid** unexpected mutations.* |
| **Pure Function** | 纯函数（相同输入总是返回相同输出） | *We **write** **pure functions** for easier testing.* |
| **Side Effect** | 副作用（函数对外部状态的影响） | *We **avoid** **side effects** in pure functions.* |
| **Currying** | 柯里化（将多参数函数转换为单参数链） | *We **use** **currying** to **create** specialized functions.* |

#### 7. 浏览器与环境（Browser & Environment）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **DOM** | 文档对象模型（网页的树形结构） | *We **manipulate** the **DOM** using JavaScript.* |
| **BOM** | 浏览器对象模型 | *The **BOM** provides APIs for interacting with the browser.* |
| **Event** | 事件（用户操作或系统触发的动作） | *We **attach** an **event** listener to the button.* |
| **Event Listener** | 事件监听器 | *We **use** `.addEventListener()` to **register** an **event listener**.* |
| **Event Bubbling** | 事件冒泡（事件从目标向上传播） | *We **stop** **event bubbling** using `.stopPropagation()`.* |
| **Event Delegation** | 事件委托（将事件监听器放在父元素上） | *We **use** **event delegation** to **handle** events on dynamically added elements.* |
| **Rendering** | 渲染（浏览器绘制 UI） | *The browser **renders** the HTML and CSS.* |
| **Reflow** | 回流（重新计算布局） | *We **avoid** frequent **reflows** for better performance.* |
| **Repaint** | 重绘（重新绘制像素） | *A **repaint** occurs when visual properties change without layout changes.* |
| **Context** | 上下文（`this` 的值） | *The **context** of a function determines what `this` refers to.* |
| **Global Object** | 全局对象 | *In the browser, the **global object** is `window`; in Node.js, it's `global`.* |


### 深度拆解 + 避坑指南

#### 1. `null` vs `undefined` vs `undeclared`
| 概念 | 定义 | 技术场景 |
| :--- | :--- | :--- |
| **`null`** | 明确赋值为空 | *We **set** the variable to `null` to indicate the absence of value.* |
| **`undefined`** | 未赋值的变量 | *A variable is `undefined` if it's declared but not assigned.* |
| **`undeclared`** | 未声明的变量 | *An undeclared variable is not in the scope.* |

- **技术场景**：*Use `null` when you want to explicitly indicate "no value", and `undefined` for uninitialized variables.*
- **解释**：`null` 是程序员的主动选择，`undefined` 是系统的默认状态。

#### 2. `.call()` vs `.apply()` vs `.bind()`
| 方法 | 执行时机 | 参数传递 | 返回结果 |
| :--- | :--- | :--- | :--- |
| **`call(thisArg, arg1, arg2, ...)`** | 立即执行 | 逐个传入 | 函数返回值 |
| **`apply(thisArg, [arg1, arg2, ...])`** | 立即执行 | 数组传入 | 函数返回值 |
| **`bind(thisArg, arg1, arg2, ...)`** | 稍后执行 | 逐个传入（预填参数） | 新函数 |

- **技术场景**：*Use `call` for normal functions, `apply` for array arguments, and `bind` to fix the `this` context.*
- **解释**：三者都用于绑定 `this` 的值，`call` 和 `apply` 立即执行，`bind` 返回一个新函数。

#### 3. `==` vs `===`（相等性比较）
| 操作符 | 类型转换 | 技术场景 |
| :--- | :--- | :--- |
| **`==`** | 会进行类型转换 | *We avoid `==` because it does **type coercion**.* |
| **`===`** | 不进行类型转换 | *We always use `===` for **strict equality** to avoid bugs.* |

- **技术场景**：*Always use `===` unless you have a specific reason to use `==`.*
- **解释**：`===` 比较值和类型，`==` 会先转换类型再比较，容易导致意外结果。

#### 4. `var` vs `let` vs `const`（变量声明方式）
| 声明方式 | 作用域 | 可重新赋值 | 可重新声明 | 技术场景 |
| :--- | :--- | :--- | :--- | :--- |
| **`var`** | 函数作用域 | 是 | 是 | *We avoid `var` in modern codebases.* |
| **`let`** | 块作用域 | 是 | 否 | *We use `let` when the value may change.* |
| **`const`** | 块作用域 | 否 | 否 | *We use `const` for variables that won't change.* |

- **技术场景**：*Use `const` by default, `let` when reassignment is needed, and never use `var`.*
- **解释**：`const` 能防止意外重新赋值，使代码更可预测。


### 快速决策流（0.5 秒选择）

你在使用 JavaScript 时——

- 声明变量？
  - 默认 → `const`
  - 需要重新赋值 → `let`
  - 绝不 → `var`

- 比较值？
  - 一律用 `===`（严格相等）
  - 除非有特殊需要才用 `==`

- 处理异步操作？
  - 简单回调 → 普通回调函数
  - 单次异步 → `Promise` + `.then()`
  - 多次/复杂异步 → `async/await`

- 操作数组？
  - 转换数据 → `.map()`
  - 筛选数据 → `.filter()`
  - 归约聚合 → `.reduce()`
  - 检查条件 → `.some()` / `.every()`

- 访问嵌套属性（避免报错）？
  - 用 `?.`（可选链）

- 提供空值默认值？
  - 用 `??`（空值合并）


### 技术场景组合示例（完整的 JS 开发描述）

> *Our JavaScript codebase follows modern best practices. We use `const` by default and `let` when reassignment is needed. All async operations are handled using `async/await` to avoid callback hell. We use array methods like `.map()`, `.filter()`, and `.reduce()` to transform data in an immutable way. For deep property access, we use optional chaining (`?.`) and nullish coalescing (`??`). We always use `===` for strict equality comparisons. We avoid side effects by writing pure functions, and we leverage closures to create private state when needed.*

> （我们的 JavaScript 代码库遵循现代最佳实践。我们默认使用 `const`，在需要重新赋值时使用 `let`。所有异步操作都使用 `async/await` 处理，以避免回调地狱。我们使用 `.map()`、`.filter()` 和 `.reduce()` 等数组方法以不可变的方式转换数据。对于深层属性访问，我们使用可选链（`?.`）和空值合并（`??`）。我们始终使用 `===` 进行严格相等比较。我们通过编写纯函数来避免副作用，并在需要时利用闭包创建私有状态。）