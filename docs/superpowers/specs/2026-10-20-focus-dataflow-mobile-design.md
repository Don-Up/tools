# focus-dataflow-mobile 移动端定制设计

日期：2026-10-20
目标文件：`C:\Users\10691\Desktop\html\focus-dataflow-mobile.html`（本地文件，不进仓库）
来源：`focus-dataflow.html`（已回退到加「读取」按钮之前的原版）

## 背景

`focus-dataflow.html` 是桌面版：左右分栏、控件条一长条、AI 面板固定在左下角。手机浏览器没有 Ctrl+V 也没有键盘，而这些布局在 375px 宽度下会塌掉（AI 面板宽 18% ≈ 67px）。

2026-10-20 先做了「读取」按钮功能（读本地服务的 dataflow.txt）并验证通过，随后决定：**桌面版回退原样，读取功能与移动端定制一起放进独立的 `focus-dataflow-mobile.html`**。

## 范围

### 移除

| 功能 | 原因 |
|---|---|
| AI 问答面板 + 角色设定弹窗 + `marked` CDN | 手机上无用，还多一次 CDN 请求 |
| 背景图片（Ctrl+I + IndexedDB） | 手机上无用 |
| 关键字高亮（颜色配置弹窗） | 手机上无用 |
| 控件条（语音选择、倍速、Auto Play / Highlight / Use CN 开关、Read 按钮） | 控件条太长；朗读改为点文字触发 |
| 代码片段粘贴框（Ctrl+Alt+V） | 纯键盘交互，手机上用不到 |

### 保留

- 步骤卡片：中英文说明，**点文字朗读**（`speakText`，走系统默认语音）
- 代码片段区（`codeSnippets` / `codeStepLines` / `buildCodePane`），但改为覆盖层
- 复制按钮、关闭按钮、**读取按钮**（含 readCore 纯逻辑块）
- 键盘 ↑/↓/←/→/PageUp/PageDown 翻步（桌面调试用）
- 代码注释点击朗读（`speakComment`）

### 新增

1. **代码覆盖层**：点击当前步骤的标题行 → 全屏覆盖层显示代码片段，自动滚动到当前步骤的高亮行；关闭按钮 / 点背景 / Esc 关闭。
2. **相邻步骤点击跳转**：上方/下方的相邻步骤变为可点击，点一下跳到那一步。
3. **移动端布局**：单列全宽、字号与内边距收敛、触控目标 ≥44px。

## 关键设计决策

**为什么代码片段改覆盖层而不是并排**：并排两栏在 375px 下各占一半，两边都不可读。覆盖层符合「默认只显示步骤区」的要求。

**为什么不用底部导航条**：用户明确选择「点相邻步骤跳转」，不新增 UI。相邻步骤点击后重新渲染，新的相邻步骤随之出现，可以逐段走完。

**为什么朗读保留但去掉语音选择**：手机端点文字朗读是自然交互；语音下拉与倍速滑块在窄屏上放不下，且系统默认语音对中英文都够用。`pickTTSVoice` 简化为只判断语言，语速固定 1.0。

**文件放在 `Desktop/html` 而不是仓库**：用户要求「不提交，只本地用」。`serve.py` 的静态根就是 `Desktop/html`，把文件放进去即可用 `http://192.168.2.101:8000/focus-dataflow-mobile.html` 访问，**服务端零改动**，也不会在 public 仓库里留下悬空引用。

## 数据流

读取按钮的链路与桌面版一致，不受本次改造影响：

```
点击「读取」 → resolveSourceUrl() → fetch(url, {cache:'no-store'})
            → lastPastedText = text → loadText(text) → closeBtn.visible
```

`loadText` 负责 `---` 分隔的 JSON 讲解解析与代码片段提取（`loadCode`）。

## 布局改造对照

| 元素 | 桌面 | 移动 |
|---|---|---|
| `body` padding | `48px 5vw` | `60px 12px 96px`，顶部起始对齐 |
| `.stage` | `max-width: 1200px`，有代码时两栏 flex | 单列 `width: 100%` |
| `.step-pane`（无代码） | `width: 60vw` | `width: 100%` |
| `.card` padding | `44px 48px` | `16px 14px` |
| `.flow-line` | `28px` | `17px` |
| `.note-en` / `.note-cn` | `22px` / `17px` | `16px` / `15px` |
| `.sibling-step-wrap` 缩进 | `48px` | `12px` |
| `.hint` | `24px` | `15px` |
| `.ai-panel` | 固定左下 `width: 18%` | 已移除 |
| `.code-pane` | 右栏，`max-height: 72vh` | 覆盖层内，`max-height: none` |

## 已知限制

- 移动版只能通过 `http://192.168.2.101:8000/focus-dataflow-mobile.html` 访问。线上 HTTPS 页在手机上仍会被混合内容拦截（读取按钮用不了）。
- 不进版本控制，改动没有历史记录。
- `tests/focus-dataflow-read.test.js` 改为定位本地移动版文件（`FOCUS_DATAFLOW_MOBILE_HTML` 环境变量优先，否则 `~/Desktop/html/focus-dataflow-mobile.html`），文件不存在时跳过。

## 交付物

| 文件 | 动作 |
|---|---|
| `C:\Users\10691\Desktop\html\focus-dataflow-mobile.html` | 移动端定制后的页面（本地） |
| `tests/focus-dataflow-read.test.js` | 改为测试移动版 |
| `focus-dataflow.html` | 已回退原版并提交 |
| `tools/serve.py` | 无需改动 |
