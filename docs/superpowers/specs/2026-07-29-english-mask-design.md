# English Mask Tool 设计

## 1. 概述

一个独立的 `english.html` 页面，提供以下两个功能：

1. 按下 `Ctrl+V`（macOS 上为 `Cmd+V`）读取剪贴板纯文本内容并显示。
2. 对所有 `(...)` 内部的英文单词（仅 `[A-Za-z]{2,}`）进行处理：仅显示首字母，其余字母通过 CSS 遮盖；鼠标悬浮在遮盖的字母上时去除遮罩，露出完整单词。

每次粘贴都 **替换** 上一次渲染结果。

**输入示例：**
```
Hello (world this is) a test (3rd one) (A) (你好)
```

**预期输出（`#` 代表遮盖）**
```
Hello (w###d t##s i#) a test (3rd one) (A) (你好)
```
悬浮在 `w###d` 上时显示 `world`；`3rd`（含数字）、`A`（单字母）、`你好`（非拉丁）保持原样。

---

## 2. 架构

单文件 `english.html`，沿用仓库 `en-reading.html` / `test.html` 的「单页 HTML + 内联 CSS/JS」风格，不引入任何外部依赖。逻辑分为三层：

1. **ClipboardReader**：监听 `keydown`，拦截 `Ctrl/Cmd+V`，调用 `navigator.clipboard.readText()`，并提供回退 `<textarea>` 以应对不可用的 Clipboard API。
2. **MaskRenderer**：纯函数 `render(text) → DocumentFragment`，负责把输入文本转换为包含遮罩 `<span>` 的 DOM 片段。
3. **HoverReveal**：纯 CSS，通过 `color: transparent` + `background` 实现遮盖，`:hover` 还原。

### 2.1 模块边界

- `ClipboardReader` 只负责拿到字符串、报告错误、通知成功/空。
- `MaskRenderer` 只接收字符串、返回 `DocumentFragment`；无 DOM 副作用，便于单测（见 §6）。
- `HoverReveal` 是纯 CSS，与 JS 完全解耦。

---

## 3. 数据流

```
keydown(Ctrl/Cmd+V)
  → event.preventDefault()
  → navigator.clipboard.readText()   (失败时落到 <textarea> 回退)
  → 若 text.trim() 为空 → 短暂 toast「Nothing to paste」并 return
  → resultEl.innerHTML = ''
  → resultEl.appendChild(MaskRenderer.render(text))
```

渲染管线在 `MaskRenderer` 内部：

```
text
  → split by 顶层 /（[A-Za-z]{2,}）/（\s+|[^A-Za-z()\s]）/（\([^)]*\)）优先级 token 流
  → 对每个 (group)：
      - 渲染字面 '('
      - 对 group 内容再 split（同上）
      - [A-Za-z]{2,} → 构造 <span class="word" data-w="…">：首字母可见节点 + 隐藏字母节点
      - 其他内容（数字 / 1 字母 / 非拉丁 / 标点 / 空白）→ textNode
      - 渲染字面 ')'
  → 其余顶层 token：
      - [A-Za-z]{2+} 在 ( ) 之外不处理，直接 textNode
      - 其它 token 全部 textNode
```

---

## 4. 关键实现细节

### 4.1 遮罩 CSS

```css
.word {
  display: inline-block;
  border-radius: 2px;
  background: #454545;        /* 与 test.html 的 .word::before 配色一致 */
  color: transparent;
  user-select: none;          /* 防止选中和复制隐藏字母 */
  transition: background-color .15s ease, color .15s ease;
}
.word:hover {
  background: transparent;
  color: inherit;
}
```

`.word` 内部保留完整字符串（包括首字母），仅靠 `color: transparent` 把视觉隐藏。这样悬浮时直接用 `color: inherit` 即可还原，无需 JS 切换文本。

### 4.2 单词 span 结构

每个被遮罩的单词渲染为单个 `<span class="word" data-w="原词">原词</span>`，而非拆成「首字母 + 隐藏段」两个子节点。理由：
- 选择/复制/调试时 DOM 更清晰。
- 单词宽度自适应，无需计算前缀宽度。
- 配合 `user-select: none` 即可阻止复制隐藏内容。

### 4.3 单词判定

- 单词正则：`/([A-Za-z]{2,})/g` —— 仅匹配长度 ≥ 2 的纯拉丁字母串。
- 括号内出现的 `[A-Za-z]{2,}` 才进行遮罩；括号外的英文单词保持原样。
- `it's`、`don't` 等含撇号的词因含非字母字符，会被拆成 `it` / `s` / `don` / `t`；如希望整体识别，再迭代（YAGNI，先按本规则实现）。

### 4.4 拦截 Ctrl+V

```js
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V') && !e.shiftKey && !e.altKey) {
    e.preventDefault();
    handleClipboardRead();
  }
});
```

要求 `!e.shiftKey && !e.altKey` 以避免误吃 `Ctrl+Shift+V`（部分浏览器用其触发「无格式粘贴」）。

### 4.5 错误与回退

| 情况 | 行为 |
|------|------|
| `navigator.clipboard` 不存在（旧浏览器 / `file://`） | 隐藏 toast「Clipboard API not available」并显示 `<textarea>` 回退框，`<textarea>` 上挂 `paste` 事件走同一渲染管线。 |
| `readText()` reject（权限拒绝 / 用户取消） | 隐藏 toast「Clipboard read failed: <msg>」，显示回退 `<textarea>`。 |
| `text.trim() === ''` | 隐藏 toast「Nothing to paste」，1.5s 后自动消失；不清空已有内容。 |
| 渲染成功 | 隐藏任何提示和回退框。 |

### 4.6 多次粘贴

每次 `render` 前先 `resultEl.innerHTML = ''`，符合用户「每次替换」的偏好。

---

## 5. 文件结构

```
english.html
├── <head>
│   ├── meta + title
│   └── <style>  主题变量、布局、.word 遮罩样式、toast 动画
├── <body>
│   ├── 容器 .app
│   │   ├── <h1>English Mask</h1>
│   │   ├── <p class="hint">Press Ctrl+V to paste…</p>
│   │   ├── <div id="result" class="result"></div>
│   │   ├── <div id="fallback" hidden><textarea placeholder="…"></textarea></div>
│   │   └── <div id="toast" class="toast" hidden></div>
└── <script>
    ├── 监听 keydown
    ├── handleClipboardRead()  异步读剪贴板 + 错误分发
    ├── render(text)            纯函数，返回 DocumentFragment
    └── showToast(msg, ms)
```

无新增资源文件，不改其他文件。

---

## 6. 测试计划

本仓库无自动化测试框架，采用手动 smoke test。实现完成后需在 Chromium 浏览器下逐项验证：

1. **基础遮罩**：粘贴 `Hello (world this is) a test (3rd one) (A) (你好)`，确认：
   - `world` / `this` / `is` 仅显示首字母，悬浮显示完整单词。
   - `3rd`（含数字）、`A`（单字母）、`你好`（非拉丁）保持原样。
   - 括号外 `Hello`、`a test` 完全不处理。
2. **嵌套 / 多括号**：粘贴 `see (foo) and (bar (baz))` 确认每层只处理一层；`baz` 被遮罩。
3. **空括号**：粘贴 `text () end` → 渲染为 `text () end`（无遮罩 span）。
4. **多次粘贴**：先粘贴 A，再粘贴 B，确认 A 被完全替换。
5. **悬浮行为**：鼠标移入/移出 `world` → 颜色和文字在视觉上无缝切换。
6. **空剪贴板**：复制一个空字符串后按 `Ctrl+V` → 看到「Nothing to paste」toast，原内容保留。
7. **回退路径**：在 DevTools 中 `delete navigator.clipboard` 后按 `Ctrl+V` → 出现 `<textarea>`，在其中输入 ` (test) ` 并触发 `paste` 事件，确认遮罩生效。
8. **不可选中**：在 DevTools 中尝试框选 `w###d` 区域，确认 `user-select: none` 阻止选中（光标仍可见，但选取不包含隐藏字母）。

---

## 7. 范围外（YAGNI）

- 不做 OCR、语音、图片粘贴。
- 不做持久化（无 `localStorage`）。
- 不支持富文本粘贴（仅 `text/plain`）。
- 不处理撇号/连字符连接的复合词。
- 不提供「查看全部/全部隐藏」一键切换。
- 不做移动端触屏适配（仓库其他同类工具也未做）。
