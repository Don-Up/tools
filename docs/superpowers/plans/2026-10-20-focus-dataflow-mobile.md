# focus-dataflow-mobile 移动端定制实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `focus-dataflow.html` 裁剪成手机可用的独立页面 `focus-dataflow-mobile.html`：去掉桌面专属功能，代码片段改为点标题弹出的覆盖层，相邻步骤可点击跳转。

**Architecture:** 一次性 Python 改造脚本对 3000 行的 HTML 做定向切除与替换 —— 用「缩进层级」判定代码块边界（避开字符串里的花括号干扰），用「顶层 CSS 规则选择器前缀」批量剔除废弃样式。改造后再补移动端 CSS、覆盖层 HTML 与交互 JS。

**Tech Stack:** Python 3.13（改造脚本）、原生 HTML/CSS/JS、Node.js 24 `node:test`。

**设计文档：** `docs/superpowers/specs/2026-10-20-focus-dataflow-mobile-design.md`

---

## 关键约束

- 目标文件最终位于 `C:\Users\10691\Desktop\html\focus-dataflow-mobile.html`（`serve.py` 的静态根），**不进仓库**。
- 仓库里 `focus-dataflow-mobile.html` 已被 `git add` 过，搬走时必须 `git rm --cached`，否则会留在提交里。
- 仓库有大量不属于本任务的未提交改动，提交一律用 `git commit --only <文件>`。
- `focus-dataflow.html` 已回退原版并提交（`048c897`），本次不再改动它。

## 文件结构

| 文件 | 动作 | 职责 |
|---|---|---|
| `C:\Users\10691\Desktop\html\focus-dataflow-mobile.html` | 搬移 + 大改 | 移动端页面本体 |
| `tools/mobile_transform.py` | 新建（临时） | 一次性改造脚本，改造完可删 |
| `tests/focus-dataflow-read.test.js` | 修改 | 改为测试移动版 |
| `focus-dataflow.html` | 不动 | 桌面原版 |

---

## Task 1: 搬家并解除暂存

- [ ] **Step 1: 从 git 索引移除，搬到 Desktop/html**

```bash
cd "C:/Users/10691/Documents/GitHub/html-tools"
git rm --cached focus-dataflow-mobile.html
mv focus-dataflow-mobile.html "C:/Users/10691/Desktop/html/focus-dataflow-mobile.html"
```

- [ ] **Step 2: 确认仓库已无该文件，服务端可直接访问**

```bash
git status --short focus-dataflow-mobile.html
curl -s -o /dev/null -w "%{http_code}\n" http://192.168.2.101:8000/focus-dataflow-mobile.html
```

Expected: `git status` 无输出；curl 返回 `200`（`serve.py` 静态根就是 `Desktop/html`，无需改服务端）。

---

## Task 2: 改造脚本做定向切除

**Files:**
- Create: `tools/mobile_transform.py`

- [ ] **Step 1: 写改造脚本**

脚本核心是两个工具函数：

```python
def remove_block(lines, first_line):
    """删除从 first_line 开始、按缩进层级延续的整块（CSS 规则 / JS 语句）。"""
    idx = lines.index(first_line)
    base_indent = len(first_line) - len(first_line.lstrip())
    end = idx + 1
    while end < len(lines):
        line = lines[end]
        if not line.strip():
            nxt = end
            while nxt < len(lines) and not lines[nxt].strip():
                nxt += 1
            if nxt < len(lines) and (len(lines[nxt]) - len(lines[nxt].lstrip())) > base_indent:
                end = nxt
                continue
            break
        if (len(line) - len(line.lstrip())) > base_indent:
            end += 1
            continue
        break
    del lines[idx:end]


def strip_css_rules(css, prefixes):
    """按顶层规则的选择器前缀批量剔除 CSS 规则。"""
```

`strip_css_rules` 走顶层花括号配对，逐条规则取出 `selector`，命中任一前缀就丢弃。

要剔除的 CSS 前缀：

```python
CSS_PREFIXES = [
    '.kw-', '.bg-', '.ai-', '.fav-', '.controls', '.ctrl-row', '.tts-highlight',
    '.code-paste', '.code-hint', 'body.has-bg', '.note-textarea',
    '.stage.with-code', '.stage:not(.with-code)', 'body.with-code',
]
```

要删除的 HTML 区块（按起始行到结束行整段删）：

| 起 | 止 | 内容 |
|---|---|---|
| `    <div id="kwModal"` | 对应 `    </div>` | 关键字高亮弹窗 |
| `    <div id="bgModal"` | 对应 `    </div>` | 背景图弹窗 |
| `    <div id="aiPanel"` | 对应 `    </div>` | AI 面板 |
| `    <div id="aiAnswer"` | 同行 | AI 回答区 |
| `    <div id="systemPromptModal"` | 对应 `    </div>` | 角色设定弹窗 |
| `    <textarea id="codePaste"` | 同行 | 代码粘贴框 |
| `    <div id="codeHint"` | 同行 | 代码粘贴提示 |
| `    <script src="https://cdn.jsdelivr.net/npm/marked` | 同行 | marked CDN |

要删除的 JS 顶层块（用 `remove_block` 按首行文本定位）：

- 状态：`let selectedVoiceName = ...`、`let selectedCnVoiceName = ...`、`let speechSpeedEn = (() => {`、`let speechSpeedCn = (() => {`、`const KEYWORD_ROW_COUNT = 6;`、`const KEYWORD_DEFAULTS = [...]`、`let keywordColors = (() => {`、`let autoPlay = ...`、`let highlightEnabled = ...`、`let useCn = ...`、`let awaitingCodePaste = false;`、`let controlsVisible = false;`、`let availableVoices = [];`、`let isSpeaking = false;`、`const codePasteInput = ...`、`const codeHint = ...`、`let codeHintTimer = null;`
- 函数：`openCodePaste`、`closeCodePaste`、`requestCodePaste`、`buildKeywordRegexes`、`applyKeywordHighlights`、`buildToggle`、`clearHighlights`、`buildSpeed`、`buildControls`、`currentEnglishText`、`setReadButtonState`、`pickTTSVoice`、`speakCurrentStep`、`loadVoices`、`refreshKeywordHighlights`、`openKwModal`、`closeKwModal`
- AI 一整段：从 `        // --- AI 问答 ---` 到 `        // --- /AI 问答 ---` 之间全部内容，连同 `const AI_BASE_URL = ...` 等常量、`aiMessages`、`aiAbortController`、`isAiStreaming`、`aiPanelTitle`、`systemPrompt*`、`aiPanel`、`aiAnswer`、`aiQuestion`、`aiSend`、`aiToggle`、`STORAGE_KEY_AI_SYSTEM_PROMPT`、`DEFAULT_AI_SYSTEM_PROMPT`，以及 `openSystemPromptModal`、`closeSystemPromptModal`、`saveSystemPrompt`、`resetSystemPrompt`、`getCurrentSelectionText`、`buildAiMessages`、`appendAiBubble`、`copyAiMarkdown`、`toggleAiRead`、`finishAiRead`、`renderAiHistory`、`clearAiHistory`、`setAiStreaming`、`sendAiQuestion`、`insertSelectionIntoAi`、`showAiAnswer`、`hideAiAnswer`、`toggleAiAnswer`
- 背景图一整段：从 `        // --- Background image (Ctrl+I) ---` 到文件末尾之前的所有内容（`openBgDb`、`loadAllBg`、`addBg`、`deleteBg`、`applyBg`、`renderBgList`、`bgModal*`、`DB_NAME` 等）
- 事件绑定：`aiSend.addEventListener('click', sendAiQuestion);`、`aiQuestion.addEventListener('keydown', (e) => {`、`aiToggle.addEventListener('click', toggleAiAnswer);`、AI 的 `document.addEventListener('click', (e) => {`、kw 相关两个 `addEventListener`、bg 相关四个 `addEventListener`

- [ ] **Step 2: 运行脚本**

```bash
cd "C:/Users/10691/Documents/GitHub/html-tools"
python tools/mobile_transform.py
```

Expected: 打印每类删除的条数；文件行数从 3004 降到 ~1900。

- [ ] **Step 3: 语法检查**

```bash
cd "C:/Users/10691/Documents/GitHub/html-tools"
node -e "
const fs=require('fs');
const html=fs.readFileSync('C:/Users/10691/Desktop/html/focus-dataflow-mobile.html','utf8');
fs.mkdirSync('.tmp-syntax',{recursive:true});
[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>fs.writeFileSync('.tmp-syntax/s'+i+'.js',m[1]));
fs.writeFileSync('.tmp-syntax/core.js',html.match(/<script id=\"readCore\">([\s\S]*?)<\/script>/)[1]);
"
for f in .tmp-syntax/*.js; do node --check "$f" && echo "OK $f"; done
rm -rf .tmp-syntax
```

Expected: 两个脚本块都 `syntax OK`。

---

## Task 3: 补移动端样式、覆盖层与交互

**Files:**
- Modify: `C:\Users\10691\Desktop\html\focus-dataflow-mobile.html`

- [ ] **Step 1: 加移动端 CSS**

在 `<style>` 末尾（`</style>` 之前）追加：

```css
        /* ===== 移动端定制 ===== */
        body {
            padding: 60px 12px 96px;
            justify-content: flex-start;
        }
        .stage { width: 100%; max-width: 100%; }
        .card { padding: 16px 14px; border-radius: 8px; }
        .flow-line { font-size: 17px; line-height: 1.5; }
        .notes { margin-top: 16px; padding-top: 14px; }
        .note + .note { margin-top: 14px; }
        .note-en { font-size: 16px; }
        .note-cn { font-size: 15px; }
        .sibling-step-wrap { padding-left: 12px; }
        .sibling-step { font-size: 13px; }
        .hint { font-size: 15px; line-height: 1.7; }
        .pane-copy-btn { padding: 10px 16px; font-size: 14px; }

        .step-title {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            cursor: pointer;
        }
        .step-title .flow-line { flex: 1; min-width: 0; }
        .code-badge {
            flex: none;
            padding: 3px 10px;
            font-size: 12px;
            color: #4fc3f7;
            background: rgba(79, 195, 247, 0.12);
            border: 1px solid rgba(79, 195, 247, 0.4);
            border-radius: 10px;
        }
        .sibling-step.tappable { cursor: pointer; }
        .sibling-step.tappable:active { color: #4fc3f7; }

        .code-overlay {
            position: fixed;
            inset: 0;
            background: rgba(12, 12, 12, 0.97);
            z-index: 300;
            display: flex;
            flex-direction: column;
        }
        .code-overlay[hidden] { display: none; }
        .code-overlay-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 8px 12px;
            background: #252525;
            border-bottom: 1px solid #333;
        }
        .code-overlay-title { font-size: 14px; color: #cfd8dc; }
        .code-overlay-close {
            flex: none;
            min-width: 44px;
            height: 44px;
            font-size: 22px;
            line-height: 1;
            color: #e0e0e0;
            background: #2c2c2c;
            border: 1px solid #555;
            border-radius: 6px;
            cursor: pointer;
        }
        .code-overlay-body {
            flex: 1;
            min-height: 0;
            overflow: auto;
            -webkit-overflow-scrolling: touch;
        }
        .code-overlay-body .code-pane {
            border: none;
            border-radius: 0;
            max-height: none;
            background: transparent;
            padding: 12px;
        }
```

- [ ] **Step 2: 加覆盖层 HTML**

在 `    <div class="stage" id="stage">` 之前插入：

```html
    <div id="codeOverlay" class="code-overlay" hidden>
        <div class="code-overlay-bar">
            <div class="code-overlay-title" id="codeOverlayTitle">代码片段</div>
            <button id="codeOverlayClose" class="code-overlay-close" type="button" title="关闭">×</button>
        </div>
        <div class="code-overlay-body" id="codeOverlayBody"></div>
    </div>
```

- [ ] **Step 3: 步骤标题变为可点**

在 `render()` 中，把

```javascript
            card.appendChild(renderLine(step.line));
```

替换为

```javascript
            const titleWrap = document.createElement('div');
            titleWrap.className = 'step-title';
            titleWrap.appendChild(renderLine(step.line));
            if (codeSnippets) {
                const badge = document.createElement('span');
                badge.className = 'code-badge';
                badge.textContent = '代码';
                titleWrap.appendChild(badge);
            }
            titleWrap.addEventListener('click', (e) => {
                e.stopPropagation();
                openCodeOverlay();
            });
            card.appendChild(titleWrap);
```

- [ ] **Step 4: 相邻步骤可点击跳转**

把 `renderSiblingStep` 改成：

```javascript
        function renderSiblingStep(stepObj, index) {
            const wrap = document.createElement('div');
            wrap.className = 'sibling-step';
            if (!stepObj || !stepObj.line) {
                wrap.textContent = '—';
                return wrap;
            }
            const inner = renderLine(stepObj.line);
            while (inner.firstChild) wrap.appendChild(inner.firstChild);
            if (typeof index === 'number') {
                wrap.classList.add('tappable');
                wrap.addEventListener('click', () => goTo(index));
            }
            return wrap;
        }
```

并把 `render()` 中两处调用改为带索引：

```javascript
                prevWrap.appendChild(renderSiblingStep(steps[currentIndex - 1], currentIndex - 1));
                nextWrap.appendChild(renderSiblingStep(steps[currentIndex + 1], currentIndex + 1));
```

（`nextWrap` 那处原本是 `pane.appendChild(renderSiblingStep(steps[currentIndex + 1]))`，需确认实际变量名。）

- [ ] **Step 5: 加覆盖层 JS**

在 `render()` 函数之前插入：

```javascript
        // --- 代码覆盖层 ---
        const codeOverlay = document.getElementById('codeOverlay');
        const codeOverlayBody = document.getElementById('codeOverlayBody');
        const codeOverlayTitle = document.getElementById('codeOverlayTitle');
        const codeOverlayClose = document.getElementById('codeOverlayClose');

        function openCodeOverlay() {
            if (!codeSnippets) {
                showError('没有代码片段');
                return;
            }
            codeOverlayBody.innerHTML = '';
            codeOverlayBody.appendChild(buildCodePane());
            codeOverlayTitle.textContent = '代码片段 · 第 ' + (currentIndex + 1) + ' 步';
            codeOverlay.hidden = false;
            document.body.style.overflow = 'hidden';
            scrollHighlightIntoView(codeOverlayBody.querySelector('.code-pane'));
        }

        function closeCodeOverlay() {
            codeOverlay.hidden = true;
            codeOverlayBody.innerHTML = '';
            document.body.style.overflow = '';
        }

        codeOverlayClose.addEventListener('click', closeCodeOverlay);
        codeOverlay.addEventListener('click', (e) => {
            if (e.target === codeOverlay) closeCodeOverlay();
        });
```

- [ ] **Step 6: `scrollHighlightIntoView` 支持传入面板**

把

```javascript
        function scrollHighlightIntoView() {
            const codePane = stage.querySelector('.code-pane');
            if (!codePane) return;
```

改为

```javascript
        function scrollHighlightIntoView(pane) {
            const codePane = pane || stage.querySelector('.code-pane');
            if (!codePane) return;
```

- [ ] **Step 7: 修掉因删除功能而残留的引用**

逐项确认并删除或改写：

- `loadCode()` 里的 `closeCodePaste();` → 删除该行
- `document.addEventListener('paste', ...)` 里的 `if (awaitingCodePaste || e.target === codePasteInput) { loadCode(text); return; }` → 删除该分支
- `loadText()` 里的 `if (autoPlay) speakCurrentStep();` → 删除该行
- `goTo()` 里的 `if (autoPlay) speakCurrentStep();` 和 `hideAiAnswer();` → 删除这两行
- `render()` 里的 `pane.appendChild(buildControls());` → 删除该行
- `render()` 里的 `stage.classList.toggle('with-code', hasCode);` 和 `document.body.classList.toggle('with-code', hasCode);` → 删除这两行
- `keydown` 处理器里：删除 `kwModal` 的 Esc 分支、`requestCodePaste()` 分支、`codePasteInput` 的 Esc 分支、`controlsVisible` 的 Alt+H 分支、`openKwModal()` 的 Alt+C 分支、`insertSelectionIntoAi()` 的 S 键分支、`speakCurrentStep()` 的 PageDown 分支、`isAiTextarea` 相关判断；保留 ↑/↓/←/→/PageUp 翻步
- `if ('speechSynthesis' in window) { loadVoices(); ... }` → 删除整块
- `pickTTSVoice(text)` → 简化为只返回语言，不选具体 voice、不设 rate

- [ ] **Step 8: 语法检查 + 全文搜索残留引用**

```bash
cd "C:/Users/10691/Documents/GitHub/html-tools"
grep -n "aiPanel\|aiQuestion\|aiSend\|aiToggle\|aiAnswer\|systemPrompt\|kwModal\|kwRows\|bgModal\|bgList\|codePaste\|codeHint\|buildControls\|buildToggle\|buildSpeed\|applyKeywordHighlights\|keywordColors\|speakCurrentStep\|loadVoices\|controlsVisible\|autoPlay\|useCn\|highlightEnabled\|selectedVoiceName\|speechSpeed\|requestCodePaste\|openCodePaste\|closeCodePaste\|awaitingCodePaste\|marked\|isSpeaking\|currentEnglishText\|setReadButtonState\|hideAiAnswer\|showAiAnswer\|toggleAiAnswer\|insertSelectionIntoAi\|toggleAiRead\|AI_BASE_URL\|aiMessages" "C:/Users/10691/Desktop/html/focus-dataflow-mobile.html"
```

Expected: 无输出。

- [ ] **Step 9: 再次语法检查**

同 Step 3 的命令。Expected: 两个脚本块都 `syntax OK`。

---

## Task 4: 测试改造与端到端验证

**Files:**
- Modify: `tests/focus-dataflow-read.test.js`

- [ ] **Step 1: 测试改为定位本地移动版**

把文件头的路径解析改成：

```javascript
const MOBILE_PATH = process.env.FOCUS_DATAFLOW_MOBILE_HTML
    || path.join(process.env.USERPROFILE || '', 'Desktop', 'html', 'focus-dataflow-mobile.html');
const SKIP = fs.existsSync(MOBILE_PATH) ? false : '本地移动版文件不存在';
```

`readHtml()` 读 `MOBILE_PATH`；每个 `test(...)` 追加 `{ skip: SKIP }` 选项。

- [ ] **Step 2: 补移动端结构断言**

追加：

```javascript
test('移动版包含代码覆盖层与相邻步骤跳转', () => {
    const html = readHtml();
    assert.match(html, /id="codeOverlay"/);
    assert.match(html, /function openCodeOverlay\(\)/);
    assert.match(html, /renderSiblingStep\(steps\[currentIndex - 1\], currentIndex - 1\)/);
    assert.match(html, /className = 'step-title'/);
});

test('移动版已移除桌面专属功能', () => {
    const html = readHtml();
    for (const gone of ['id="aiPanel"', 'id="kwModal"', 'id="bgModal"', 'id="codePaste"']) {
        assert.ok(!html.includes(gone), `不应再包含 ${gone}`);
    }
    assert.ok(!html.includes('marked@12.0.0'), '不应再加载 marked CDN');
});
```

- [ ] **Step 3: 跑测试**

```bash
cd "C:/Users/10691/Documents/GitHub/html-tools"
node --test tests/focus-dataflow-read.test.js
```

Expected: 全部通过。

- [ ] **Step 4: 端到端验证**

```bash
curl -s -o /dev/null -w "mobile:%{http_code}\n" http://192.168.2.101:8000/focus-dataflow-mobile.html
curl -s http://192.168.2.101:8000/focus-dataflow-mobile.html | grep -c "codeOverlay\|step-title"
```

Expected: `mobile:200`，grep 计数 ≥ 2。

- [ ] **Step 5: 提交仓库内改动**

```bash
git add tests/focus-dataflow-read.test.js
git commit --only tests/focus-dataflow-read.test.js docs/superpowers/specs/2026-10-20-focus-dataflow-mobile-design.md docs/superpowers/plans/2026-10-20-focus-dataflow-mobile.md -m "..."
```

移动版页面本身不进仓库。

---

## 自查记录

- **规格覆盖**：移除清单、保留清单、新增功能、布局对照表、已知限制、交付物 —— 每项都有对应任务。
- **占位符检查**：无 TBD / TODO。Step 3.4 标注了 `nextWrap` 变量名需在实施时确认，这是刻意留的现场核对项而非占位符。
- **命名一致性**：`openCodeOverlay` / `closeCodeOverlay` / `codeOverlay` / `codeOverlayBody` / `codeOverlayTitle` / `codeOverlayClose` / `step-title` / `code-badge` / `tappable` 在 CSS、HTML、JS、测试中拼写一致。
