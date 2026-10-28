# focus-dataflow 支持「数字-数字」步骤编号

目标文件：`focus-dataflow.html`（`C:\Users\10691\Documents\GitHub\html-tools\`）

## 背景

现在步骤行只认单段编号（`01`、`02`），讲解 JSON 的 key 也是纯数字，靠「第几个」对位：

```
01 用户在浏览器地址栏输入 /exports 并回车
02 前端发起请求
---
{ "1": "…讲解…", "2": "…讲解…" }
```

实际数据流经常分两段（用户操作 / 系统恢复），需要 `1-1`、`1-2`、`2-1` 这种两级编号：

```
1-1 (用户改标题) config 写进节点
1-2   → (persist 触发) zustand 的 persist 中间件发现 nodes 变了
2-1 (用户刷新) 浏览器重新加载页面
---
{ "1-1": "…", "1-2": "…", "2-1": "…", "Summary": "…" }
```

编号带连字符后，「按位置对位」不再成立，必须按编号本身匹配。

## 决策

| 问题 | 结论 |
| --- | --- |
| 页面怎么显示 | marker 显示成 `1-1`；步骤列表保持扁平，不做分组小标题；状态栏仍是 `第 N / 共 M 步` |
| 代码片段联动 | 支持，`// 1-1` 这样的注释行也认作步骤标记 |
| 讲解 key 对不上步骤编号 | 丢弃这条讲解，不做位置兜底 |
| 纯数字 key | 步骤行有编号就按编号匹配，没编号就退回旧的「第 N 行」位置匹配（旧内容行为不变） |
| 纯 JSON 输入 | `Summary` 从「自己占一张空白卡」改成「挂到最后一张卡」 |

## 设计

### 1. parseCore 脚本块

新增 `<script id="parseCore">`，只放纯函数（无 DOM 依赖），暴露 `globalThis.ParseCore`：

| 函数 | 职责 |
| --- | --- |
| `normalizeStepLabel(raw)` | `01` → `1`、`1-01` → `1-1`；不合法返回 `null` |
| `splitStepLine(raw)` | 拆出行首编号、箭头（`→` / `↳`）、正文 |
| `parseCodeMarker(line)` | 识别代码里的步骤标记，返回规范化编号或 `null` |
| `parseExplanations(jsonText)` | 解析讲解 JSON，返回 `[{key, value}]`（key 保留原样，`Summary` 也保留） |
| `parseInput(text)` | 产出 `[{line, label, notes}]` |

主脚本删掉自己的 `parseExplanations` / `parseInput`，改调 `ParseCore.*`。

### 2. 编号形态

- 认得：`1`、`01`、`1-1`、`1-12`、`12-3`
- 不认：`2024-01-01`（复合编号每段限 1–3 位；`2024-01` 落回纯数字分支）
- 代码标记额外要求纯数字分支仍是 2–3 位（`// 01`），复合分支每段 1–3 位（`// 1-1`），避免 `// 2024-01-01` 被误判

### 3. 讲解挂载规则

设 `labelIndex` = 规范化编号 → 步骤下标。

- 复合编号 key（`1-1`）：只认 `labelIndex` 里的精确命中，命中不了就丢弃
- 纯数字 key（`1`）：先查 `labelIndex`；查不到就退回 `第 N 行`（旧行为）
- `Summary`：挂到「编号最大的那一步」（编号比较按数字分段比，`2-5` > `2` > `1`）

`Summary` 在纯 JSON 模式下挂到最后一张卡。

### 4. 代码面板联动

`codeStepLines` 的 key 从数字改成规范化编号字符串；当前步骤的 key 取 `steps[currentIndex].label`，步骤行没编号时退回 `String(currentIndex + 1)`（旧行为）。

### 5. 步骤对象

`parseInput` 产出的每一步多一个 `label` 字段（规范化编号，`null` 表示步骤行没编号），供代码面板和匹配用。

## 附:`<{...}>` 标注的配色

步骤行里的 `<{canvas-store.ts: nodes[画布上所有节点] / config[节点上用户改过的配置]}>` 渲染成一个 `<small class="file-ref">`：

- 冒号前的文件名（`canvas-store.ts:`）→ 橙色 `#ff9800`
- 冒号后的字段名（`nodes`、` / config`）→ 保持 small 原本的蓝色 `#4fc3f7`
- 方括号及其内部文字（`[画布上所有节点]`）→ 灰色 `#888`

切分逻辑放在 `ParseCore.splitFileRefParts`（纯函数，可单测），返回 `name` / `text` / `annot` 三种段，渲染时分别包 `.ref-name`、纯文本、`.ref-annot`。

## 附:代码面板里的分节注释

代码片段中以 `// =====` 开头的注释行（`// ===== 📂 apps/web/src/features/canvas/canvas-store.ts(画布 zustand store：节点树 + 撤销栈 + 持久化) =====`）渲染成灰色 `#888`，普通注释仍是绿色 `#6a9955`。

判定放在 `ParseCore.isSeparatorLine`（纯函数，可单测），渲染时给这类行加 `.cmt-sep` 类。

## 附:步骤正文里的注音(`<ruby>`)

步骤正文支持注音写法 `[[基词]]注音}}`，渲染成 `<ruby>基词<rt>注音</rt></ruby>`：

```
1-01 (拖容器) PreviewItem [[onDragStart]]拖拽开始}} → e.dataTransfer.[[setData]]往浏览器口袋写一份拖拽数据}}("application/x-lowcode-id", "flex") <{preview-item.tsx}>
```

- `[[` → `<ruby>`，`]]` → `<rt>`，`}}` → `</rt></ruby>`
- 没写 `}}` 的 `[[基词]]` 照样渲染成 ruby（没有注音内容），不吐原始标记
- 注音内部的内容不会被再次解析（`}}` 之前的部分整体交给 ruby）
- 样式：`.flow-line ruby { ruby-position: over; ruby-align: center; line-height: 2.4 }`；`.flow-line rt { color: #888; font-size: 0.4em; 微软雅黑 }`。`ruby-align: center` 是必需的，Chrome 默认的 `space-between` 会把注音拉满整个基词宽度

拆 token 的逻辑放在 `ParseCore.parseTokens`（纯函数，可单测），返回 `text` / `method` / `ruby` / `ref` 四种 token；主脚本的 `appendTokens` 只负责建 DOM。

## 测试

新增 `tests/focus-dataflow-steps.test.js`（node:test）：从 HTML 里抠出 `parseCore` 块在 `vm` 里跑。

覆盖：

- 复合编号的步骤行与讲解按编号对齐
- 复合编号 key 对不上 → 丢弃
- 纯数字 key 的旧行为不变（步骤行有编号 / 没编号两种）
- `Summary` 落到编号最大的那一步
- 纯 JSON 输入时 `Summary` 挂到最后一张卡
- 代码标记识别 `// 1-1` / `// 01`，且不误判 `// 2024-01-01`
- `2024-01-01` 开头的步骤行不被当成编号
