# ai.html Redesign Design Specification

> 在已有 `2026-10-10-ai-html-design.md` 之上扩展。保留单页文件结构与现有 SSE/流式/Markdown 渲染骨架,把"单轮 Q&A"升级为"通用 AI 对话页"。

## Goal

`ai.html` 从单轮 Q&A 升级为通用 AI 对话工具:支持多会话、IndexedDB 持久化、全局+会话级系统提示词、代码语法高亮、更完善的 Markdown 样式。模型选择、provider 切换暂不在本版范围。

## Visual Layout

```
┌──────────────┬────────────────────────────────────────────┐
│  [+ 新对话]   │  api   API Key: ●●●●●● [修改]   M3  ⚙ 设置 │
│  [搜索框]     ├────────────────────────────────────────────┤
│              │                                            │
│  ┌─────────┐ │  ┌─ 助手消息 (avatar 左) ─────────────┐    │
│  │ 会话 1   │ │  │ 思考▾                              │    │
│  │ 末条预览 │ │  │ 答复正文(Markdown,代码高亮)         │    │
│  │ 2h ago  │ │  └────────────────────────────────────┘    │
│  └─────────┘ │                                            │
│  ┌─────────┐ │  ┌─ 用户消息 (avatar 右) ──────────────┐    │
│  │ 会话 2   │ │  │ 文本...                              │    │
│  │ ...     │ │  └────────────────────────────────────┘    │
│  └─────────┘ │                                            │
│  ...         │                                            │
│              │                                            │
│              ├────────────────────────────────────────────┤
│              │  ┌─ textarea (3-8 行) ─────────────────┐  │
│              │  │ 输入你的问题...                       │  │
│              │  └────────────────────────────────────┘  │
│              │  [发送] [清空]   Ctrl+Enter  · Esc        │
│              └────────────────────────────────────────────┘
```

左栏 240px,中栏自适应;无右栏(避免拥挤,后续如需 token 用量再扩)。

## Data Model

### IndexedDB `aiChatDb` v1

| Store | Key | Value | 索引 |
|---|---|---|---|
| `conversations` | `id` (uuid v4) | `{ id, title, createdAt, updatedAt, systemPromptOverride?, model: 'MiniMax-M3', messages: [...] }` | `byUpdated` on `updatedAt` desc |
| `settings` | `key` (string) | `{ value }` | — |

#### Conversation shape

```ts
{
  id: string,                      // uuid v4
  title: string,                   // 默认取首条 user 消息前 20 字,trim 掉空白
  createdAt: number,               // ms epoch
  updatedAt: number,
  systemPromptOverride: string|null,  // null = 使用全局默认
  model: 'MiniMax-M3',             // 当前固定;留字段为以后多模型准备
  messages: [
    { role: 'user'|'assistant', content: string, thinking?: string, ts: number, stopReason?: string }
  ]
}
```

`messages` 数组按时间正序;每次追加/更新时同步 `updatedAt`。

#### Settings keys

| key | type | 说明 |
|---|---|---|
| `apiKey` | string | 从 localStorage 迁移过来 |
| `showThinking` | 'true'\|'false' | 默认 'true' |
| `defaultSystemPrompt` | string | 默认同当前硬编码 `SYSTEM_PROMPT` |

### localStorage 迁移

启动时:
1. 如果 `localStorage.aiApiKey` 存在且 IDB `settings.apiKey` 不存在 → 写入 IDB 并清除 ls。
2. 同样处理 `aiShowThinking` → `settings.showThinking`。
3. 加 `settings._migrated = 'v1'` 标志位防重迁。

迁移完成后,localStorage 不再被使用(留 `'ai.html:migrated'` 单一标志)。

## UI Components

### 顶部栏(沿用并扩展)

- 左:`ai` 标题(保持)
- 中:API Key 状态 + 修改按钮(沿用现有遮罩逻辑,值从 IDB `settings.apiKey` 读)
- 右:`模型: M3`(静态文字,点击不响应,标记"固定")、`⚙ 设置` 齿轮(打开全局设置模态)

### 设置齿轮 → 全局设置模态

- 默认 system prompt(多行 textarea,显示当前值,可恢复默认)
- 显示思考(checkbox,沿用)
- 「清空所有会话」危险操作(二次确认)

### 左栏(新)

- 头部:「+ 新对话」按钮(创建并切到新空会话);搜索框(过滤 title,实时,Esc 清空聚焦失焦)
- 列表:每项显示 `title`、`updatedAt` 相对时间(刚刚/N 分钟前/小时前/天前/MM-DD)、首条 user 消息前 30 字预览
- 当前会话高亮(`#2a2a2a` 背景)
- 列表项悬浮出现 ⋯ 按钮,点开操作菜单:重命名 / 删除(二次确认) / 复制 id
- 列表底部 100 条以内直接渲染全部;不引入虚拟滚动(估算用户不会攒上千)

### 中栏 — 消息区

- 顶:当前会话 title(可点击进入重命名);右侧:「本对话提示词」按钮(打开会话级 system prompt 编辑)
- 消息流:新会话空态显示「在新对话中向 AI 提问...」(沿用现有 empty 文案但改文案)
- 助手消息结构:
  ```
  ┌────────────────────────────────┐
  │ 思考▾   [复制整条] [重新生成]    │  <- 顶部小工具栏
  │ ┌──────────────────────────┐   │
  │ │ 思考内容(展开/折叠)        │   │  <- 仅当 showThinking && msg.thinking
  │ └──────────────────────────┘   │
  │ Markdown 渲染后的正文            │
  │ (代码块带复制按钮 + 语法高亮)    │
  └────────────────────────────────┘
  ```
- 用户消息:右对齐气泡(`#2c2c2c` 底)
- 滚动:新消息追加后自动滚到底;若用户已向上滚超过 100px,新消息不强制滚(避免抢焦点)

### 输入条(沿用)

- 现有 textarea + 发送/清空按钮 + 快捷键,无改动

## Streaming & Persistence

### 流式流程调整

- `state.textBuf` / `state.thinkingBuf` 不再挂在全局 `state`,改为挂在当前 assistant message 对象上(随 IDB 写盘)
- 启动 `send()`:
  1. push user message 到 `conversations[currentId].messages`,写 IDB
  2. 创建空的 assistant message `{ role:'assistant', content:'', thinking:'', ts:Date.now() }`,push 并写 IDB
  3. fetch + SSE,delta 追加到 `msg.content` / `msg.thinking`,更新 DOM
  4. **写盘策略**:`content_block_stop` 时写一次,`message_stop` 时再写一次(避免每 delta 写 IO)
  5. 流结束或 abort 后:从 IDB 读回最新会话(确保流期间的写盘已经合并)

### 切换会话

- 若 `state.isStreaming`:
  1. `abortController.abort()`(流自然停)
  2. 等 finally 分支跑完(`setSendButtonState(false)`)
  3. 再切
- 否则:从 IDB 读目标会话,渲染消息列表;`currentId` 更新
- 切换时 DOM 重置:thinkingSection / answerSection 清空

### 删除/重命名会话

- 删除:从 IDB `conversations` 删 store;若删的是当前会话,自动新建空会话并切过去
- 重命名:弹小输入框(行内 prompt 也行);写 IDB

## Markdown 增强

### 代码高亮

- 引入 `highlight.js`(CDN,common build 约 50KB gz)
- 通过 `marked-highlight` 集成:`new Marked(highlight.js.highlight, { langPrefix: 'hljs language-' })`
- 不需要 SSR;直接走客户端解析
- 在 `renderFinalAnswer()` 之前,如果 `msg.content` 含 ``` 代码块(以语言标签开头),highlight 生效
- 行内 code 不高亮(仅 `pre > code` 块)

### 样式增强

- `#answerSection`(实际改成 `.message-body`):
  - `h1/h2/h3`:加粗 + 颜色 `#cfd8dc`,加 margin
  - `p`:行高 1.7,段间距 12px
  - `ul/ol`:padding-left 24px,li 间距 4px
  - `blockquote`:左边框 3px `#4fc3f7`,内边距 8px 12px,底色 `#252525`
  - `table`:边框合并,th `#252525` 底,td 边框 `#333`
  - `pre`:底色 `#1a1a1a`,内边距 12px(已存在,微调)
  - `code`(行内 vs 块)用两套样式区分
- highlight.js 主题:选 `atom-one-dark`(颜色与现有深色主题协调,CDN 引入对应 css)

## Hotkeys

沿用 + 新增:

| 键 | 行为 | 范围 |
|---|---|---|
| `Ctrl+Enter` | 发送 | textarea focus |
| `Esc` | 清空输入 | textarea focus |
| `Ctrl+N` | 新建对话 | 全局(模态打开时不触发) |
| `Ctrl+K` | 聚焦搜索框 | 全局(模态打开时不触发) |
| `Ctrl+R` | 重新生成最后一条 assistant | 全局,非流时;不可用时按钮置灰 |
| `↑/↓` | 搜索结果上下选 | 搜索框 focus |

## Error Handling

沿用现有错误类型与提示文案。新增:

- IDB 打开失败 → "本地存储不可用,会话将无法保存(刷新后丢失)。请检查浏览器隐私模式。"
- 会话不存在(被另一标签页删除)→ 自动创建新空会话,显示 toast 提示"上一个会话已被删除"

## Edge Cases

1. **首次启动无任何会话** → 自动创建 1 个空会话,不显示空态
2. **localStorage 旧值迁移** → 见 Data Model 迁移段
3. **切换会话时流在飞** → abort 后再切,见切换会话段
4. **空会话发送按钮看起来 enabled** → 实际上 send() 检测到消息流为空(无任何 user/assistant 消息且无输入)时早返回,不发起请求
5. **搜索无结果** → 列表区显示「没有匹配的会话」占位
6. **assistant message 流式中断(网络断开)** → 保留已收到的 `content`/`thinking`,显示「(连接中断)」灰色注,写 IDB
7. **max_tokens 截断** → 沿用现有追加灰色注
8. **刷新页面** → 从 IDB 读取 `updatedAt` 最大的会话(上次最后编辑的)作为当前会话;若无任何会话,自动创建 1 个空会话
9. **跨标签页同步** → 监听 `storage` 事件检测 `ai.html:migrated` 标志;会话本身的实时同步不实现(单用户单设备场景)
10. **代码块无语言标签**(` ``` ` 后无内容) → 按纯文本处理,不高亮(已存在)

## Out of Scope (本版)

- 多模型选择(provider/model 下拉)
- 自定义 endpoint / 自建 base URL
- 文件/图片上传(multimodal)
- Token 用量统计 / 计费
- 导出/分享(markdown 下载、复制为图片)
- Markdown 源文本与渲染切换
- TTS 朗读答复
- 工具调用 / function calling
- 跨标签页会话实时同步
- 虚拟滚动(列表超过 100 条时)
- 暗/亮主题切换

## Files

- **Modify**: `ai.html` (单文件,所有 CSS/JS 内联,预计 +500-700 行)
- **No new files**;无依赖外部资源(除 highlight.js CDN)

## Testing Strategy

手动为主,核心场景:

1. **首次启动**:无 ls 旧值 → 创建 1 个空会话,自动选中
2. **迁移**:先在旧版设 apiKey,新版打开后 ls 清除、IDB 有值
3. **多会话**:新建 3 个会话各问 1 题,刷新页面后顺序/内容保留,最后编辑的高亮
4. **搜索**:输入关键字,实时过滤
5. **删除**:删当前会话 → 自动新建空会话
6. **重命名**:行内输入框,Enter 提交
7. **系统提示词**:
   - 全局:打开设置,改默认 prompt,新会话用新值
   - 会话级:打开会话设置,设覆盖,后续该会话发送用覆盖值(可点「恢复默认」清掉)
8. **代码高亮**:问"写一段 Python 排序",确认 ```python 块有语法颜色
9. **Markdown 样式**:问"给个表格对比",表格边框/表头底色正确
10. **切换时流在飞**:发长问题中途点别处会话,确认流 abort、新会话加载正确
11. **热键**:Ctrl+N / Ctrl+K / Ctrl+R / ↑↓ in 搜索
12. **错误路径**:清 apiKey 后发送 → 横幅;错误 key → 401 横幅;网络断开 → 灰色「(连接中断)」注
13. **IDB 失败**:浏览器隐私模式打开 → 提示存储不可用,但仍可发问(只是不持久化)
