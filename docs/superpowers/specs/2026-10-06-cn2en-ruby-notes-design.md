# cn2en-json Ruby Notes Design Specification

## Overview

为 `cn2en-json.html` 的每个 ruby 元素（CN 句子中以 `{{CN}}EN]]` 包裹的部分）增加用户备注。Alt+P 打开浮动窗列出当前 CN 句子的所有 ruby，每行配一个 3 行高的 textarea，鼠标悬浮在 `<ruby>` 上时跟随光标显示对应备注。备注按 (sentenceIndex, rubyText) 键存到 IndexedDB 的收藏上，关闭弹窗时一次性写入。

## Data Model

每个 IndexedDB favorite 记录新增可选字段：

```js
{
    id, hash, name, payload, createdAt,
    cards?: Array<[string, string]>,
    rubyNotes?: Array<Object<string, string>>   // NEW
}
```

- `rubyNotes[sentenceIndex][rubyText]` = 备注内容
- `sentenceIndex`：`entries` 中的位置（即 `currentIndex` 的值）
- `rubyText`：`{{CN}}EN]]` 中 `{{CN}}` 包裹的 CN 文本（即 `<ruby>` 元素的非 `<rt>` 部分 textContent）
- 缺字段视为 `[]`
- 同句内重复 rubyText 会共享同一份备注（v1 限制，不处理）

`payload` 与 `hash` 保持不变。`hash` 仍由 `payload` 计算。备注不参与 `hash`，不参与 JSON 导出（Alt+J）。

## Layout Structure

在 `cn2en-json.html` 已有 `cardsModal` 之后新增 `rubyNotesModal`：

```html
<div id="rubyNotesModal" class="fav-modal" hidden>
    <div id="rubyNotesModalBackdrop" class="fav-modal-backdrop"></div>
    <div class="fav-modal-panel">
        <div class="fav-modal-title">
            Ruby Notes · <span id="rubyNotesModalTitle"></span>
            <div id="rubyNotesModalSubtitle" class="ruby-notes-subtitle"></div>
        </div>
        <div id="rubyNotesList" class="ruby-notes-list"></div>
        <div class="fav-modal-actions">
            <button id="rubyNotesModalCancel" class="fav-btn-secondary">取消</button>
            <button id="rubyNotesModalSave" class="fav-btn-primary">保存</button>
        </div>
    </div>
</div>
<div id="rubyTooltip" class="ruby-tooltip" hidden></div>
```

复用 `.fav-modal` / `.fav-modal-backdrop` / `.fav-modal-panel` / `.fav-modal-title` / `.fav-modal-actions` 样式。

新增 CSS：

```css
.ruby-notes-subtitle {
    font-size: 12px;
    color: #888;
    font-weight: normal;
    margin-top: 4px;
}
.ruby-notes-list {
    width: 600px;
    max-width: calc(100vw - 80px);
    max-height: 60vh;
    overflow-y: auto;
    box-sizing: border-box;
    padding: 4px;
}
.ruby-notes-row {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 8px 0;
    border-bottom: 1px solid #2a2a2a;
}
.ruby-notes-row:last-child { border-bottom: none; }
.ruby-notes-ruby-label {
    flex: 0 0 auto;
    min-width: 80px;
    max-width: 160px;
    color: goldenrod;
    font-size: 18px;
    line-height: 1.5;
    padding-top: 8px;
    word-break: break-word;
    user-select: none;
}
.ruby-notes-textarea {
    flex: 1 1 auto;
    min-height: calc(1.5em * 3 + 16px);
    resize: vertical;
    font-size: 13px;
    line-height: 1.5;
    padding: 8px 10px;
    background: #2a2a2a;
    color: #e0e0e0;
    border: 1px solid #444;
    border-radius: 4px;
    box-sizing: border-box;
    font-family: inherit;
}
.ruby-notes-textarea:focus { outline: none; border-color: #5fa8d3; }
.ruby-tooltip {
    position: fixed;
    z-index: 200;
    pointer-events: none;
    background: #1e1e1e;
    color: #e0e0e0;
    border: 1px solid #5fa8d3;
    border-radius: 4px;
    padding: 6px 10px;
    font-size: 13px;
    line-height: 1.4;
    max-width: 320px;
    white-space: pre-wrap;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
}
```

## Behavior

### 打开（Alt+P）

仅当满足以下条件时响应：
- `currentFavId` 已设（必须有收藏）
- 当前 `entries[currentIndex]` 的 CN 含至少一个 `<ruby>` 元素（用 `cnText.querySelectorAll('ruby').length > 0` 判断）
- 所有现有弹窗（favSave / favList / note / jsonEdit / cnModal / cardsModal）都隐藏
- target 不是 INPUT / TEXTAREA

打开时：
- `currentRubyModalSentenceIdx = currentIndex`
- 拍快照 `rubyNotesInitialSnapshot = JSON.stringify(fav.rubyNotes || [])`，用于关闭时判断是否需要写库
- 标题显示收藏名
- 副标题显示 `1/N`（当前句子位置 / 总数）
- 列表渲染：cnText 的 `<ruby>` 元素，按 DOM 顺序逐个取出。每个 row：
  - 左：rubyText（CN 文本，通过剔除 `<rt>` 子节点的 textContent 得到）
  - 右：textarea，初始值 = `fav.rubyNotes?.[sentenceIdx]?.[rubyText] || ''`
- modal 显示后，第一个 textarea 获得焦点（`setTimeout(0)`）

### 输入备注

textarea 的 `input` 事件 → 仅更新内存：
```js
fav.rubyNotes[sentenceIdx] ||= {};
fav.rubyNotes[sentenceIdx][rubyText] = textarea.value;
```

不写 IndexedDB。

### 保存（关闭时一次性写）

`closeRubyNotesModal()`（Escape / Cancel 按钮 / backdrop 点击 / Save 按钮触发）：
1. 隐藏 modal
2. 比较 `JSON.stringify(fav.rubyNotes)` 与 `rubyNotesInitialSnapshot`
3. 若变化且 `currentFavId` 已设 → `updateFavorite(currentFavId, { rubyNotes: fav.rubyNotes })`
4. 若未变化 → 不写
5. 清空 `currentRubyModalSentenceIdx` 和 `rubyNotesInitialSnapshot`

`Save` 按钮和 `Cancel` 按钮行为相同（关闭 = 保存内存中所有改动），都触发 `closeRubyNotesModal()`。

### 鼠标悬浮 ruby 显示 tooltip

在 `cnText` 上挂 `mouseover` / `mouseout` 事件委托：

- `mouseover`：
  - 取最近 `<ruby>` 祖先
  - 若不是 cnText 子孙 → 忽略
  - 取该 `<ruby>` 在 `cnText.querySelectorAll('ruby')` 中的 index
  - 从 `entries[currentIndex][0]` 提取 rubyTexts 数组，取对应位置 rubyText
  - 从 `fav.rubyNotes?.[currentIndex]?.[rubyText]` 读 note
  - note 为空 → 隐藏 tooltip
  - note 非空 → 设置 `rubyTooltip.textContent = note`，位置 `(clientX + 8, clientY + 12)`，取消 hidden

- `mouseout`：
  - 取最近 `<ruby>` 祖先
  - 若 `e.relatedTarget` 仍是该 `<ruby>` 后代 → 不处理（DOM 内移动不触发）
  - 否则隐藏 tooltip

tooltip 用 `textContent` 而非 `innerHTML`，防 XSS。

### Hotkey gating

现有 5 处 `favSaveModal.hidden && noteModal.hidden && jsonEditModal.hidden` 模式，加上 `&& rubyNotesModal.hidden`：

按现有代码盘点需要插入的位置（实施时按 plan 步骤扫描每个匹配位置替换）。

## State

新增模块作用域变量：

```js
let currentRubyModalSentenceIdx = null;
let rubyNotesInitialSnapshot = null;
```

DOM 引用：

```js
const rubyNotesModal = document.getElementById('rubyNotesModal');
const rubyNotesModalBackdrop = document.getElementById('rubyNotesModalBackdrop');
const rubyNotesModalTitle = document.getElementById('rubyNotesModalTitle');
const rubyNotesModalSubtitle = document.getElementById('rubyNotesModalSubtitle');
const rubyNotesList = document.getElementById('rubyNotesList');
const rubyNotesModalCancel = document.getElementById('rubyNotesModalCancel');
const rubyNotesModalSave = document.getElementById('rubyNotesModalSave');
const rubyTooltip = document.getElementById('rubyTooltip');
```

## Functions

新增：

```js
function extractRubyTexts(cn) {
    const matches = [...cn.matchAll(/\{\{([^}]*)\}\}/g)].map(m => m[1]);
    return matches;
}

function getRubyTextFromElement(ruby) {
    // 剔除 <rt> 子节点，取剩余 textContent
    const clone = ruby.cloneNode(true);
    clone.querySelectorAll('rt').forEach(rt => rt.remove());
    return clone.textContent;
}

function openRubyNotesModal() {
    if (!currentFavId) return;
    if (cnText.querySelectorAll('ruby').length === 0) return;
    const fav = favorites.find(f => f.id === currentFavId);
    if (!fav) return;
    currentRubyModalSentenceIdx = currentIndex;
    if (!Array.isArray(fav.rubyNotes)) fav.rubyNotes = [];
    rubyNotesInitialSnapshot = JSON.stringify(fav.rubyNotes);
    rubyNotesModalTitle.textContent = fav.name || '(未命名)';
    rubyNotesModalSubtitle.textContent = `${currentIndex + 1}/${entries.length}`;
    renderRubyNotesList();
    rubyNotesModal.hidden = false;
    setTimeout(() => {
        const firstTextarea = rubyNotesList.querySelector('textarea');
        if (firstTextarea) firstTextarea.focus();
    }, 0);
}

function renderRubyNotesList() {
    rubyNotesList.innerHTML = '';
    const sentenceIdx = currentRubyModalSentenceIdx;
    const cn = entries[sentenceIdx][0];
    const rubyTexts = extractRubyTexts(cn);
    const notesMap = (currentFavId && Array.isArray(
        favorites.find(f => f.id === currentFavId)?.rubyNotes
    ) && favorites.find(f => f.id === currentFavId).rubyNotes[sentenceIdx]) || {};
    rubyTexts.forEach(rubyText => {
        const row = document.createElement('div');
        row.className = 'ruby-notes-row';
        const label = document.createElement('div');
        label.className = 'ruby-notes-ruby-label';
        label.textContent = rubyText;
        const ta = document.createElement('textarea');
        ta.className = 'ruby-notes-textarea';
        ta.spellcheck = false;
        ta.value = notesMap[rubyText] || '';
        ta.dataset.rubyText = rubyText;
        ta.addEventListener('input', () => {
            const fav = favorites.find(f => f.id === currentFavId);
            if (!fav) return;
            if (!Array.isArray(fav.rubyNotes)) fav.rubyNotes = [];
            if (!fav.rubyNotes[sentenceIdx]) fav.rubyNotes[sentenceIdx] = {};
            fav.rubyNotes[sentenceIdx][rubyText] = ta.value;
        });
        row.appendChild(label);
        row.appendChild(ta);
        rubyNotesList.appendChild(row);
    });
}

function closeRubyNotesModal() {
    rubyNotesModal.hidden = true;
    if (currentFavId && rubyNotesInitialSnapshot !== null) {
        const fav = favorites.find(f => f.id === currentFavId);
        if (fav) {
            const currentSnapshot = JSON.stringify(fav.rubyNotes || []);
            if (currentSnapshot !== rubyNotesInitialSnapshot) {
                updateFavorite(currentFavId, { rubyNotes: fav.rubyNotes });
            }
        }
    }
    currentRubyModalSentenceIdx = null;
    rubyNotesInitialSnapshot = null;
}

function showRubyTooltip(text, x, y) {
    rubyTooltip.textContent = text;
    rubyTooltip.hidden = false;
    rubyTooltip.style.left = `${x + 8}px`;
    rubyTooltip.style.top = `${y + 12}px`;
}

function hideRubyTooltip() {
    rubyTooltip.hidden = true;
}
```

### IndexedDB 持久化

复用现有 `updateFavorite(id, updates)` API（cn2en-json.html `updateFavorite` 函数）。

- 关闭 modal 时，对比初始快照，若变化则调用 `updateFavorite(currentFavId, { rubyNotes })` 一次性写库
- 写库失败 → `console.error`，内存保留（下次关闭再写一次）

### cnText 鼠标事件

在 cn2en-json.html 现有 `cnText.addEventListener('click', ...)` 之后追加：

```js
cnText.addEventListener('mouseover', (e) => {
    const ruby = e.target.closest('ruby');
    if (!ruby || !cnText.contains(ruby)) return;
    const rubies = Array.from(cnText.querySelectorAll('ruby'));
    const idx = rubies.indexOf(ruby);
    if (idx === -1) return;
    const rubyTexts = extractRubyTexts(entries[currentIndex][0]);
    const rubyText = rubyTexts[idx];
    if (!rubyText) return;
    const fav = favorites.find(f => f.id === currentFavId);
    const note = fav?.rubyNotes?.[currentIndex]?.[rubyText];
    if (!note) {
        hideRubyTooltip();
        return;
    }
    showRubyTooltip(note, e.clientX, e.clientY);
});

cnText.addEventListener('mouseout', (e) => {
    const ruby = e.target.closest('ruby');
    if (!ruby) return;
    if (e.relatedTarget && ruby.contains(e.relatedTarget)) return;
    hideRubyTooltip();
});

document.addEventListener('mousemove', (e) => {
    if (rubyTooltip.hidden) return;
    rubyTooltip.style.left = `${e.clientX + 8}px`;
    rubyTooltip.style.top = `${e.clientY + 12}px`;
});
```

事件委托挂 cnText 上，cnText 重新渲染（render 调用）后无需重绑。

`mousemove` 监听器挂在 document 上，用于持续跟随光标位置（mouseover 触发一次后，用 mousemove 更新位置）。

## Hotkey

在现有 keydown 处理器中新增 Alt+P 分支，沿用现有 modal-hidden 检查模式（加上 `rubyNotesModal.hidden`）：

```js
if (e.altKey && !e.ctrlKey && !e.shiftKey && e.code === 'KeyP') {
    if (!favSaveModal.hidden || !noteModal.hidden || !jsonEditModal.hidden || !cardsModal.hidden || !rubyNotesModal.hidden) return;
    if (cnText.querySelectorAll('ruby').length === 0) return;
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    e.preventDefault();
    openRubyNotesModal();
    return;
}
```

并在 Escape 分支加入 `!rubyNotesModal.hidden`：

```js
} else if (!rubyNotesModal.hidden) {
    e.preventDefault();
    closeRubyNotesModal();
}
```

Escape 关闭走 `closeRubyNotesModal`，触发一次性写库。

## Edge cases

- 无 `currentFavId` → 按 Alt+P：无任何响应。
- 当前 CN 无 `<ruby>` 元素 → 按 Alt+P：无任何响应。
- 当前 favorite 缺 `rubyNotes` 字段（老数据）→ 视为 `[]`，首次保存时初始化。
- 同一句内多个 ruby 有相同 rubyText → 共享同一份备注（按 content key 自然行为）。
- 输入框内容含 HTML 特殊字符 → tooltip 用 `textContent` 渲染，安全。
- 输入框内容含换行 → `<textarea>` 原生支持，tooltip CSS 用 `white-space: pre-wrap` 显示。
- modal 关闭后立刻在主区 hover ruby → mouseover 委托正常工作，tooltip 跟随。
- modal 打开时 hover 主区 ruby → tooltip 仍可显示（事件委托挂在 cnText 上，与 modal 状态无关）；这是符合预期的（用户一边看主区一边看弹窗）。
- 备注写库失败 → `console.error`，不阻塞关闭。
- 切换 favorite 路径已通过现有 ArrowLeft/Right modal-hidden 拦截（需要在 6 处加 `&& rubyNotesModal.hidden`），modal 打开时不能切句。

## Testing Notes

无自动化测试。手动验证：
1. 加载一篇含 `<ruby>` 的收藏（用带 `{{...}}...]]` 的 JSON 粘贴并落到 favorite）
2. 按 Alt+P → 弹窗显示所有 ruby 元素 + 空 textarea
3. 在第一行输入"发音练习"
4. 在第二行输入"常用搭配\n第二行"
5. Escape 关闭
6. 刷新页面 → 重新加载该收藏 → Alt+P → 两条笔记都还在
7. 鼠标 hover 在第一个 ruby 上 → 跟随光标显示"发音练习"
8. mousemove → tooltip 跟随
9. mouse leave → 隐藏
10. hover 没填的 ruby → 不显示 tooltip
11. 不含 ruby 的句子按 Alt+P → 无反应
12. 当前 favorite 没加载，按 Alt+P → 无反应
13. 鼠标 hover 在 ruby 上、按 Esc 关闭 modal → closeRubyNotesModal 正常保存