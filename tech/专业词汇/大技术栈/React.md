### React 独有专业高频词汇速查表

#### 1. 核心概念（Core Concepts）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Component** | 组件（UI 的基本构建块） | *We **create** a **component** for the user profile.* |
| **Props** | 属性（父组件传入的数据） | *We **pass** **props** from the parent to the child.* |
| **State** | 状态（组件的内部数据） | *We **manage** the form data using **state**.* |
| **JSX** | JSX（JavaScript XML） | *We **write** UI using **JSX** syntax.* |
| **Virtual DOM** | 虚拟 DOM（内存中的 DOM 表示） | *React uses the **virtual DOM** to **optimize** updates.* |
| **Reconciliation** | 协调（对比新旧虚拟 DOM 的过程） | *React **performs** **reconciliation** to **determine** what changed.* |
| **Diffing** | 比对（找出两棵树的差异） | *The **diffing** algorithm **computes** the minimal set of changes.* |
| **Rendering** | 渲染（生成 UI） | *The component **re-renders** when the state changes.* |
| **Mount** | 挂载（将组件插入 DOM） | *The component **mounts** after the first render.* |
| **Unmount** | 卸载（从 DOM 中移除组件） | *We **clean up** subscriptions when the component **unmounts**.* |

#### 2. 组件与生命周期（Components & Lifecycle）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Functional Component** | 函数组件（用函数定义的组件） | *We use **functional components** for simplicity.* |
| **Class Component** | 类组件（用 ES6 class 定义的组件） | *We **migrate** **class components** to functional ones.* |
| **Pure Component** | 纯组件（浅比较 props 和 state） | *We use `React.PureComponent` to **avoid** unnecessary re-renders.* |
| **Stateless Component** | 无状态组件（不管理 state） | *We **prefer** **stateless components** for presentational logic.* |
| **Stateful Component** | 有状态组件（管理 state） | *We use **stateful components** for data fetching.* |
| **Container Component** | 容器组件（负责数据和逻辑） | *We **separate** **container components** from presentational ones.* |
| **Presentational Component** | 展示组件（只负责 UI 渲染） | *We **use** **presentational components** to **keep** UI logic separate.* |
| **HOC (Higher-Order Component)** | 高阶组件（接收组件返回新组件的函数） | *We **use** a **HOC** to **add** authentication logic.* |
| **Render Props** | 渲染属性（通过 props 传递渲染函数） | *We **use** **render props** to **share** logic between components.* |
| **Lifecycle Method** | 生命周期方法（组件在不同阶段执行的方法） | *We **use** `componentDidMount` to **fetch** data in class components.* |
| **ComponentDidMount** | 挂载后（组件首次渲染完成） | *We **fetch** data in `componentDidMount`.* |
| **ComponentDidUpdate** | 更新后（组件更新完成） | *We **call** `componentDidUpdate` to **react** to prop changes.* |
| **ComponentWillUnmount** | 卸载前（组件即将被移除） | *We **clean up** in `componentWillUnmount`.* |
| **ShouldComponentUpdate** | 是否更新（控制重渲染） | *We **use** `shouldComponentUpdate` to **optimize** performance.* |

#### 3. Hooks（React 16.8+ 核心特性）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Hook** | 钩子（函数组件中使用的特殊函数） | *We **use** **Hooks** to **add** state to functional components.* |
| **useState** | 状态钩子（管理 state） | *We **use** `useState` to **manage** the input value.* |
| **useEffect** | 副作用钩子（处理副作用） | *We **use** `useEffect` to **fetch** data on mount.* |
| **useContext** | 上下文钩子（消费 Context） | *We **use** `useContext` to **access** the theme.* |
| **useReducer** | 归约器钩子（复杂 state 管理） | *We **use** `useReducer` for state logic with multiple sub-values.* |
| **useCallback** | 回调钩子（记忆化函数） | *We **use** `useCallback` to **memoize** callbacks.* |
| **useMemo** | 记忆化钩子（记忆化计算结果） | *We **use** `useMemo` to **cache** expensive calculations.* |
| **useRef** | 引用钩子（保持 mutable 引用） | *We **use** `useRef` to **reference** the DOM node.* |
| **useLayoutEffect** | 布局副作用（在 DOM 更新后同步执行） | *We **use** `useLayoutEffect` to **measure** DOM nodes.* |
| **useImperativeHandle** | 命令式句柄（暴露子组件的方法） | *We **use** `useImperativeHandle` to **expose** a method to the parent.* |
| **useDebugValue** | 调试值钩子（在 DevTools 中显示标签） | *We **use** `useDebugValue` to **label** custom hooks.* |
| **Custom Hook** | 自定义钩子（复用逻辑） | *We **create** a **custom hook** to **encapsulate** data fetching logic.* |
| **Rules of Hooks** | Hook 规则（只在顶层调用，只在函数组件中调用） | *We **follow** the **Rules of Hooks** to **avoid** bugs.* |

#### 4. 状态管理（State Management）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Lifting State Up** | 状态提升（将 state 移到共同父组件） | *We **lift state up** to **share** it between siblings.* |
| **Context** | 上下文（全局数据传递，避免 props drilling） | *We **use** **Context** to **provide** the theme across the app.* |
| **Provider** | 提供者（Context 的数据提供方） | *We **wrap** the app in a **Provider** to **provide** the store.* |
| **Consumer** | 消费者（Context 的数据消费方） | *We **use** the **Consumer** to **access** context values.* |
| **Redux** | Redux（全局状态管理库） | *We **use** **Redux** for complex global state management.* |
| **Store** | 存储（Redux 中的全局状态对象） | *We **configure** the **store** with reducers and middleware.* |
| **Action** | 动作（描述发生了什么的普通对象） | *We **dispatch** an **action** to **update** the state.* |
| **Reducer** | 归约器（根据 action 计算新 state 的纯函数） | *The **reducer** **handles** different actions and **returns** the new state.* |
| **Dispatch** | 派发（发送 action 的触发方式） | *We **dispatch** an action to **trigger** a state update.* |
| **Middleware** | 中间件（处理副作用，如异步 action） | *We **add** **middleware** to **handle** async actions.* |
| **Selector** | 选择器（从 store 中提取数据的函数） | *We **use** **selectors** to **derive** data from the store.* |
| **Immer** | Immer（不可变更新工具） | *We **use** **Immer** to **write** simpler reducers.* |
| **Redux Toolkit** | Redux 官方工具集 | *We **use** **Redux Toolkit** to **simplify** Redux code.* |

#### 5. 性能优化（Performance Optimization）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Memoization** | 记忆化（缓存计算结果） | *We **use** **memoization** to **prevent** unnecessary re-renders.* |
| **React.memo** | 组件记忆化（防止 props 不变时的重渲染） | *We **wrap** the component with `React.memo` to **avoid** re-renders.* |
| **useCallback** | 记忆化回调（防止函数被重新创建） | *We **use** `useCallback` to **maintain** reference stability.* |
| **useMemo** | 记忆化值（防止重复计算） | *We **use** `useMemo` to **cache** the filtered list.* |
| **Lazy Loading** | 懒加载（按需加载组件） | *We **implement** **lazy loading** for the dashboard.* |
| **Code Splitting** | 代码拆分（将代码分割成更小的 chunks） | *We **use** **code splitting** to **reduce** the initial bundle size.* |
| **Suspense** | 悬停（等待异步组件加载的 fallback） | *We **wrap** lazy components in **Suspense** to **show** a loading indicator.* |
| **Concurrent Mode** | 并发模式（可中断渲染） | *We **experiment** with **Concurrent Mode** to **improve** responsiveness.* |
| **Transition** | 过渡（标记非紧急更新） | *We **use** `startTransition` to **mark** non-urgent state updates.* |
| **Deferred Value** | 延迟值（优先级较低的渲染） | *We **use** `useDeferredValue` to **defer** rendering of less important content.* |
| **React DevTools** | React 开发者工具 | *We **use** **React DevTools** to **profile** component performance.* |
| **Profiler** | 性能剖析器（记录渲染时间） | *We **use** the **Profiler** to **measure** render times.* |
| **Flamegraph** | 火焰图（性能分析可视化） | *We **view** the **flamegraph** in React DevTools to **identify** bottlenecks.* |

#### 6. 渲染与更新（Rendering & Updates）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Re-Render** | 重新渲染（组件因 state/props 变化再次渲染） | *The component **re-renders** when the state changes.* |
| **Render Phase** | 渲染阶段（计算虚拟 DOM） | *React **performs** the **render phase** to **compute** the new tree.* |
| **Commit Phase** | 提交阶段（将变更应用到真实 DOM） | *The **commit phase** **updates** the real DOM.* |
| **Batching** | 批处理（合并多次 setState） | *React **batches** state updates to **reduce** re-renders.* |
| **Pure Render** | 纯渲染（相同输入产生相同输出） | *A **pure render** function **returns** the same output for the same inputs.* |
| **Reconciliation** | 协调（对比新旧树） | *React **performs** **reconciliation** to **find** the differences.* |
| **Key** | 键（帮助 React 识别列表元素） | *We **provide** a stable **key** for each list item.* |
| **Children** | 子元素（组件中的嵌套内容） | *We **pass** **children** to **compose** components.* |
| **React Fiber** | React Fiber（新的协调引擎） | *React **uses** **Fiber** to **enable** concurrent rendering.* |

#### 7. 工具与生态（Tools & Ecosystem）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **React Router** | React Router（路由管理） | *We **use** **React Router** to **handle** navigation.* |
| **Next.js** | Next.js（React 框架，支持 SSR） | *We **use** **Next.js** for server-side rendering.* |
| **Gatsby** | Gatsby（静态站点生成器） | *We **use** **Gatsby** for static site generation.* |
| **CRA (Create React App)** | 官方脚手架工具 | *We **bootstrap** the app with **CRA**.* |
| **Vite** | Vite（现代构建工具） | *We **use** **Vite** for faster development.* |
| **Storybook** | Storybook（组件开发环境） | *We **use** **Storybook** to **develop** components in isolation.* |
| **React Native** | React Native（移动端框架） | *We **use** **React Native** for mobile development.* |


### 深度拆解 + 避坑指南

#### 1. Props vs State（组件的两种数据来源）
| 概念 | 定义 | 能否修改 | 技术场景 |
| :--- | :--- | :--- | :--- |
| **Props** | 父组件传入的数据 | **只读**，子组件不能修改 | *Props are read-only.* |
| **State** | 组件内部管理的数据 | **可写**，用 `setState` 修改 | *State is internal and mutable.* |

- **技术场景**：*Props are passed down from the parent, while state is managed within the component itself.*
- **解释**：Props 是“从外面传进来的”，State 是“自己家里管着的”。

#### 2. useMemo vs useCallback（记忆化的区别）
| Hook | 记忆化的内容 | 使用场景 |
| :--- | :--- | :--- |
| **useMemo** | **计算结果**（值） | 缓存昂贵的计算，避免重复执行 |
| **useCallback** | **函数本身**（引用） | 缓存函数引用，避免子组件因函数引用变化而重渲染 |

- **技术场景**：*Use `useMemo` to cache the computed value, and `useCallback` to cache the function reference.*
- **解释**：`useMemo` 缓存“结果”，`useCallback` 缓存“函数”。

#### 3. Virtual DOM vs Real DOM（性能优化的基础）
| 概念 | 定义 | 操作成本 |
| :--- | :--- | :--- |
| **Virtual DOM** | 内存中的 JavaScript 对象 | **快速**，纯 JS 操作 |
| **Real DOM** | 浏览器中的真实 DOM 节点 | **慢**，涉及重排和重绘 |

- **技术场景**：*React uses the virtual DOM to **minimize** direct manipulation of the real DOM.*
- **解释**：React 在内存中操作虚拟 DOM，计算出最小变更集，再一次性更新真实 DOM。


### 快速决策流（0.5 秒选择）

你在使用 React 时——

- 组件需要管理自己的数据？
  - 用 **useState** 或 **useReducer**

- 需要在组件挂载时执行副作用（如请求数据）？
  - 用 **useEffect** 配合空依赖数组 `[]`

- 需要跨组件传递数据，避免 props drilling？
  - 用 **Context + Provider/Consumer**

- 需要防止子组件不必要的重渲染？
  - 用 **React.memo** + **useCallback** + **useMemo**

- 需要按需加载大型组件？
  - 用 **React.lazy** + **Suspense**

- 需要全局状态管理（复杂应用）？
  - 用 **Redux** 或 **Redux Toolkit**

- 需要优化性能，分析渲染瓶颈？
  - 用 **React DevTools Profiler**


### 技术场景组合示例（完整的 React 开发描述）

> *We use **functional components** with **Hooks** for all new development. Each feature component **manages** its own state using **useState**, and we **fetch** data using **useEffect**. To **avoid** prop drilling, we **use** **Context** for global theme and user settings. For performance, we **wrap** expensive components with **React.memo** and **memoize** callbacks with **useCallback**. We **lazy load** the dashboard using **React.lazy** and **Suspense**. State management is handled with **Redux Toolkit** for complex global state. All components are **tested** with **unit tests** and **integration tests**.*

> （所有新开发我们使用 **函数组件** 配合 **Hooks**。每个功能组件使用 **useState** **管理**自己的状态，并使用 **useEffect** **获取**数据。为了**避免** props 层层传递，我们**使用** **Context** 来提供全局主题和用户设置。为了性能，我们**用** **React.memo** 包裹昂贵的组件，并用 **useCallback** **记忆化**回调函数。我们使用 **React.lazy** 和 **Suspense** **懒加载**仪表盘。状态管理使用 **Redux Toolkit** 处理复杂的全局状态。所有组件都通过 **单元测试** 和 **集成测试** 进行了**测试**。）