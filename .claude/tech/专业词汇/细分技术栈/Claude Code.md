### 一、核心概念与运行机制（Core Concepts & Operation）

| 英文术语 | 核心含义 | 技术场景说明 |
| :--- | :--- | :--- |
| **Agentic coding** | 代理式编程（AI 主动执行任务的工作流） | 与只能回复文本的聊天机器人不同，Claude Code 可以自主读取文件、运行命令并直接进行更改。 |
| **Agentic harness** | 代理框架（将模型转化为代理的执行环境） | 提供文件访问、shell 执行、权限控制、内存加载等能力。Claude Code 是 harness，Claude 是其中的模型。 |
| **Agentic loop** | 代理循环（任务执行的循环过程） | 对每个任务执行“收集上下文 → 采取行动 → 验证结果”的循环，直到完成。Hook、Skill、MCP 都插入到该循环的特定阶段。 |
| **Context window** | 上下文窗口（会话的工作内存） | 保存对话历史、文件内容、命令输出、配置文件和技能等。填满后会触发 Compaction。 |
| **Compaction** | 上下文压缩（自动总结对话以释放空间） | 当上下文窗口接近上限时，自动清除旧工具输出并总结对话。运行 `/compact` 可手动触发。 |
| **Checkpoint** | 检查点（可恢复的文件快照） | 每次发送提示时创建，可回退代码和对话到较早的状态。按两次 Esc 或运行 `/rewind` 恢复。 |
| **Session** | 会话（一次完整的交互过程） | 从运行 `claude` 到退出的整个过程。会话会保存在本地，可以恢复或分叉。 |
| **Artifact** | 工件（从会话发布到网页的交互式输出） | 可将终端输出发布为 claude.ai 上的私有网页，便于可视化或分享。 |

### 二、配置与记忆（Configuration & Memory）

| 英文术语 | 核心含义 | 技术场景说明 |
| :--- | :--- | :--- |
| **CLAUDE.md** | 项目记忆文件（持久化指令） | Markdown 格式，存放项目约定、架构笔记和规则。每个会话开始时自动加载。 |
| **Auto memory** | 自动记忆（Claude 自己写的笔记） | 基于你的修正和偏好自动生成，存储在 `~/.claude/projects/` 下。与 `CLAUDE.md` 形成互补。 |
| **`.claude` directory** | 项目配置目录 | 存放 settings、hooks、skills、subagents 等配置。项目级在根目录，用户级在 `~/.claude/`。 |
| **Managed settings** | 托管设置（组织范围强制执行的配置） | 由 IT/DevOps 通过管理控制台推送，用户无法覆盖，用于安全策略和标准化工具。 |
| **Bare mode** | 裸模式（最小化启动） | 启动标志 `--bare`，跳过 hooks、plugins、MCP 等自动发现。推荐用于 CI 和脚本调用。 |

### 三、交互与命令（Interaction & Commands）

| 英文术语 | 核心含义 | 技术场景说明 |
| :--- | :--- | :--- |
| **Command** | 命令（以 `/` 开头的可复用指令） | 内置命令如 `/clear`、`/model` 控制会话；可在 `.claude/commands/` 中自定义。 |
| **Skill** | 技能（打包多步骤工作流的提示模板） | 推荐替代自定义命令的方式，如 `/code-review`、`/batch` 等捆绑技能。Claude 可在相关时自动调用。 |
| **Subagent** | 子代理（独立执行子任务的辅助实例） | 主会话可以生成子代理来处理独立的任务（如搜索代码库、运行测试），各自拥有独立的上下文窗口。 |
| **Plan mode** | 计划模式（只读探索，不编辑文件） | Claude 研究并提出方案，但不会修改源文件。用于大型变更前的方案审查。 |
| **Output style** | 输出风格（控制响应语气和格式） | 包括 Default、Proactive、Explanatory 等风格，可修改系统提示改变行为。 |
| **Extended thinking** | 扩展思考（模型响应前的推理过程） | 以灰色斜体显示模型的逐步推理，可通过 effort level 调整思考预算。 |

### 四、权限与安全（Permissions & Security）

| 英文术语 | 核心含义 | 技术场景说明 |
| :--- | :--- | :--- |
| **Permission mode** | 权限模式（会话的批准行为基线） | 包括 Manual、Accept edits、Plan、Auto 等模式。按 Shift+Tab 循环切换。 |
| **Permission rule** | 权限规则（精细控制工具调用） | 根据工具名称和参数模式允许、询问或拒绝调用。按 deny→ask→allow 顺序评估。 |
| **Auto mode** | 自动模式（后台分类器审查操作） | 分类器模型在后台审查操作，大多数操作无需批准提示即可运行。会阻止权限升级和提示注入。 |
| **Non-interactive mode** | 非交互模式（执行单次提示后退出的模式） | 使用 `-p` 或 `--print` 调用，适用于 CI、脚本和管道。运行仍保存为可恢复会话。 |

### 五、扩展与集成（Extensions & Integrations）

| 英文术语 | 核心含义 | 技术场景说明 |
| :--- | :--- | :--- |
| **MCP (Model Context Protocol)** | 模型上下文协议（连接外部工具的标准） | 开放标准，用于将 Slack、Jira、数据库等服务集成到 Claude Code 中。 |
| **MCP Tool Search** | MCP 工具搜索（延迟加载工具定义） | 启动时只加载工具名称，使用时才按需获取完整 schema，以节省上下文空间。 |
| **Channel** | 通道（推送事件的 MCP 服务器） | MCP 服务器将事件推送到会话，Claude 可对离开终端后发生的事情做出反应。支持双向通信。 |
| **Hook** | 钩子（在生命周期固定点自动执行的处理程序） | 可在工具运行前、文件编辑后、会话开始时等节点执行 shell 命令或调用 MCP 工具。 |
| **Agent teams** | 代理团队（多会话协同工作） | 多个独立的 Claude Code 会话，有共享任务列表和点对点消息传递。实验性功能，需开启环境变量。 |


### 快速速记表（新手指南）

以下术语是在 Claude Code 第一天中最常遇到的：

| 术语 | 一句话含义 |
| :--- | :--- |
| **CLAUDE.md** | 每个会话开始时自动加载的项目指令文件 |
| **Compaction** | 上下文快满时自动总结对话，释放空间 |
| **Checkpoint** | 每次编辑前的文件快照，可用于回退 |
| **Plan mode** | 只探索不编辑文件的模式，用于方案审查 |
| **Skill** | 通过 `/` 调用的可复用任务模板 |