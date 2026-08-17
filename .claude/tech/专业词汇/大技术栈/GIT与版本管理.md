### Git 与版本管理相关专业高频词汇速查表

#### 1. 基础操作与工作流（Basic Operations & Workflow）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Repository / Repo** | 仓库（代码存储库） | *We **clone** the **repository** to our local machine.* |
| **Local Repo** | 本地仓库 | *My **local repo** is up to date with `main`.* |
| **Remote Repo** | 远程仓库 | *We **push** changes to the **remote repo**.* |
| **Origin** | 默认远程仓库别名 | *We **pull** the latest changes from **origin**.* |
| **Clone** | 克隆（首次复制仓库） | *We **clone** the repo using the HTTPS URL.* |
| **Init** | 初始化（创建新仓库） | *We **run** `git init` to **create** a new repository.* |
| **Fork** | 复刻（复制他人仓库到自己的账户） | *We **fork** the upstream repo to **contribute**.* |
| **Upstream** | 上游（原始仓库） | *We **sync** our fork with the **upstream** repo.* |

#### 2. 分支与合并（Branching & Merging）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Branch** | 分支（独立开发线） | *We **create** a new **branch** for each feature.* |
| **Main / Master** | 主分支（生产代码） | *We **merge** all features into **main**.* |
| **Develop / Dev** | 开发分支（集成分支） | *We **commit** changes to **dev** before merging to `main`.* |
| **Feature Branch** | 功能分支（单个功能） | *We **create** a **feature branch** for each ticket.* |
| **Hotfix Branch** | 热修复分支（紧急修复） | *We **create** a **hotfix branch** to **patch** the critical bug.* |
| **Release Branch** | 发布分支（准备发布） | *We **cut** a **release branch** to **stabilize** the version.* |
| **Checkout** | 切换（切换分支或恢复文件） | *We **checkout** the feature branch to **start** working.* |
| **Switch** | 切换（现代 Git 的切换命令） | *We `git switch` to **move** between branches.* |
| **Merge** | 合并（将另一分支的改动合并进来） | *We **merge** `feature` into `main`.* |
| **Merge Commit** | 合并提交（保留合并历史的提交） | *We **create** a **merge commit** to **preserve** history.* |
| **Squash and Merge** | 压缩合并（将多个提交压缩成一个） | *We **squash and merge** to **keep** a clean commit history.* |
| **Rebase** | 变基（将提交应用到最新的基分支上） | *We **rebase** our feature branch on top of `main`.* |
| **Interactive Rebase** | 交互式变基（重新整理历史） | *We **use** `git rebase -i` to **squash** commits.* |
| **Fast-Forward Merge** | 快进合并（直接移动指针） | *A **fast-forward merge** is possible when there are no diverging changes.* |
| **Three-Way Merge** | 三方合并（分叉时合并） | *A **three-way merge** is needed when both branches have new changes.* |

#### 3. 提交与历史（Commits & History）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Commit** | 提交（保存代码快照） | *We **commit** the changes with a clear message.* |
| **Commit Message** | 提交信息 | *We **write** a descriptive **commit message**.* |
| **HEAD** | 当前指向的提交 | *We **point** `HEAD` to the latest commit.* |
| **Parent Commit** | 父提交（前一个提交） | *We **reference** the **parent commit** to **view** changes.* |
| **Diff** | 差异（对比修改内容） | *We **view** the **diff** to **see** what changed.* |
| **Patch** | 补丁（一组修改） | *We **apply** the **patch** to the target branch.* |
| **Staging Area** | 暂存区（准备提交的文件） | *We **add** files to the **staging area** before committing.* |
| **Index** | 索引（暂存区的内部表示） | *The **index** tracks which changes will be committed.* |
| **Unstaged** | 未暂存（修改了但未添加） | *We **check** for **unstaged** changes before committing.* |
| **Staged** | 已暂存（已添加到暂存区） | *We **list** all **staged** changes.* |
| **Commit Hash (SHA)** | 提交哈希值（唯一标识） | *We **reference** a specific **commit hash** to **checkout**.* |
| **Log** | 日志（提交历史） | *We **view** the commit history with `git log`.* |
| **Blame** | 责任追溯（查看谁改了什么） | *We **use** `git blame` to **find** who changed this line.* |
| **Revert** | 回退（撤销某次提交） | *We **revert** the broken commit to **fix** the build.* |
| **Reset** | 重置（移动 HEAD 到指定提交） | *We **reset** to the previous commit to **undo** changes.* |
| **Soft Reset** | 软重置（保留暂存区） | *We **use** a **soft reset** to **keep** changes in the staging area.* |
| **Hard Reset** | 硬重置（丢弃所有改动） | *We **use** a **hard reset** to **discard** all uncommitted changes.* |
| **Amend** | 修正（修改最后一次提交） | *We **amend** the last commit to **add** a missing file.* |

#### 4. 协作与代码评审（Collaboration & Code Review）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Pull Request (PR) / Merge Request (MR)** | 拉取请求 / 合并请求（协作合入） | *We **open** a **PR** to **request** a code review.* |
| **Reviewer** | 评审人（审查代码的人） | *We **assign** two **reviewers** to this PR.* |
| **LGTM (Looks Good To Me)** | 看起来很行（表示批准） | *The reviewer **commented** **LGTM**.* |
| **Code Review** | 代码审查（检查代码质量） | *We **perform** **code review** on every PR.* |
| **Approve** | 批准（接受 PR） | *We **approve** the PR after reviewing the changes.* |
| **Request Changes** | 请求修改（要求作者修改） | *The reviewer **requested changes** on the PR.* |
| **Comment** | 评论（对代码提出疑问或建议） | *We **leave** a **comment** on the specific line.* |
| **Address Feedback** | 处理反馈（回应评审意见） | *We **address** all **feedback** before merging.* |
| **CI / CD (Continuous Integration / Continuous Deployment)** | 持续集成 / 持续部署（自动化检查） | *The PR **triggered** the **CI** pipeline.* |
| **CI Passed / Failed** | CI 通过 / 失败 | *We can't merge until the **CI** has passed.* |
| **Green Build** | 绿色构建（CI 成功） | *We **merge** only after we **get** a **green build**.* |

#### 5. 冲突与恢复（Conflicts & Recovery）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Conflict** | 冲突（同一部分代码被同时修改） | *We **resolve** the **conflict** manually.* |
| **Merge Conflict** | 合并冲突 | *We **handle** the **merge conflict** by **discarding** one version.* |
| **Conflict Resolution** | 冲突解决 | *We **document** the **conflict resolution** process.* |
| **Stash** | 暂存（临时保存未提交的改动） | *We **stash** our changes to **switch** branches.* |
| **Pop** | 弹出（恢复暂存的改动） | *We **pop** the **stash** after **checking out** the branch.* |
| **Cherry-Pick** | 挑选（将指定提交应用到当前分支） | *We **cherry-pick** the hotfix commit to `main`.* |
| **Bisect** | 二分查找（定位引入 bug 的提交） | *We **use** `git bisect` to **find** the bad commit.* |
| **Orphaned Commit** | 孤立提交（不再被任何分支引用） | *We **clean up** **orphaned commits**.* |

#### 6. 进阶操作与引用（Advanced Operations & References）

| 英文术语 | 核心含义 | 技术场景例句 |
| :--- | :--- | :--- |
| **Tag** | 标签（标记特定版本的提交） | *We **create** a **tag** for each release version.* |
| **Annotated Tag** | 附注标签（带注释的标签） | *We **create** an **annotated tag** with a message.* |
| **Ref** | 引用（指向提交的指针） | *We **update** the `HEAD` **ref** to the new commit.* |
| **Remote Tracking Branch** | 远程跟踪分支（与远程仓库对应的本地分支） | *We **fetch** updates for the **remote tracking branch**.* |
| **Fetch** | 抓取（下载远程更新，不合并） | *We **fetch** the latest changes from `origin`.* |
| **Pull** | 拉取（抓取并合并） | *We **pull** the latest changes before **starting** work.* |
| **Push** | 推送（上传本地提交） | *We **push** the feature branch to `origin`.* |
| **Push Force** | 强制推送（覆盖远程分支） | *We **avoid** `push --force` on shared branches.* |
| **Submodule** | 子模块（仓库中的仓库） | *We **update** the **submodule** to the latest commit.* |
| **Worktree** | 工作树（仓库的一个单独工作目录） | *We **create** a new **worktree** to **work** on multiple branches simultaneously.* |
| **Hook** | 钩子（Git 事件触发的脚本） | *We **configure** a pre-commit **hook** to **run** the linter.* |


### 深度拆解 + 避坑指南

#### 1. Merge vs Rebase（合并与变基的核心差异）
| 操作 | 特点 | 适用场景 |
| :--- | :--- | :--- |
| **Merge** | 保留完整历史，但会产生合并提交（Merge Commit） | 将功能分支合入 `main`，保留上下文 |
| **Rebase** | 线性历史，更清晰，但重写了提交 | 保持本地分支与 `main` 同步，减少冲突 |

- **技术场景**：*We **rebase** our feature branch on `main` to **keep** a linear history, then **merge** it with `--no-ff` to **preserve** the feature context.*
- **解释**：先变基保持干净历史，再用 `--no-ff` 创建一个合并提交来标记功能的起点和终点。

#### 2. Reset vs Revert（撤销的不同手段）
| 操作 | 效果 | 安全性 |
| :--- | :--- | :--- |
| **Reset** | 移动 HEAD，**直接删除**提交 | **危险**，会丢失未推送的提交 |
| **Revert** | 创建一个新提交来撤销旧提交 | **安全**，保留历史，适合已推送的提交 |

- **技术场景**：*If you haven't pushed yet, use `git reset`. If the commit is already pushed, use `git revert` to **avoid** rewriting public history.*
- **解释**：本地未推送的用 `reset`（快刀斩乱麻），已推送的用 `revert`（礼貌地撤回）。

#### 3. Squash and Merge vs Normal Merge（合并方式的区别）
| 方式 | 结果 | 适用场景 |
| :--- | :--- | :--- |
| **Normal Merge** | 保留所有提交 | 需要保留每个提交的上下文时 |
| **Squash and Merge** | 所有提交压缩成一个 | 保持 `main` 历史干净、可读 |

- **技术场景**：*We **squash and merge** feature branches to **keep** `main` clean, especially for small to medium features.*
- **解释**：压缩合并能让 `main` 上的提交历史显得很整洁（一个功能只对应一个提交）。


### 快速决策流（0.5 秒选择）

你在使用 Git 时——

- **开始一个新功能**？
  - 用 **`git checkout -b feature/xxx`**
  - 或 **`git switch -c feature/xxx`**

- **保存当前进度**？
  - 用 **`git add .`** + **`git commit -m "message"`**

- **同步主分支的最新代码**？
  - 用 **`git fetch origin`** + **`git rebase origin/main`**（推荐）
  - 或用 **`git pull origin main`**（等同 fetch + merge）

- **把改动上传到远程**？
  - 用 **`git push origin feature/xxx`**

- **处理 Merge Conflict**？
  - 用 **手动解决** → **`git add`** → **`git commit`**

- **取消本次合并（保持干净）**？
  - 用 **`git merge --abort`**

- **临时切分支，但又不想提交当前改动**？
  - 用 **`git stash`** → 切分支 → 回切后 **`git stash pop`**

- **紧急修正线上代码**？
  - 从 `main` **`git checkout -b hotfix/xxx`** → 修复 → 合并回 `main`

- **准备发布版本**？
  - 打标签 **`git tag -a v1.0.0 -m "release v1.0.0"`** + **`git push origin v1.0.0`**


### 技术场景组合示例（团队协作的标准流程）

> *We created a feature branch from `main` to work on the new payment integration. After we committed the changes, we opened a PR and assigned two reviewers. The CI pipeline ran and passed all the tests. One reviewer requested changes, so we addressed the feedback and pushed an update. After receiving LGTM and approval, we rebased the branch on `main` to resolve a minor merge conflict. Finally, we squashed and merged the PR into `main` and deleted the feature branch. The release was tagged with `v2.3.0`.*

> （我们从 `main` 创建了一个功能分支来开发新的支付集成。提交更改后，我们开了一个 PR 并指定了两位评审人。CI 流水线运行并通过了所有测试。一位评审人请求修改，因此我们处理了反馈并推送了更新。在收到 LGTM 和批准后，我们将分支变基到 `main` 以解决一个小的合并冲突。最后，我们将 PR 压缩合并到 `main` 并删除了功能分支。该发布被标记为 `v2.3.0`。）