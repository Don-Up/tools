# cn2en-json Cards Field Design Specification

## Overview

为 `cn2en-json.html` 的每个 favorite 增加一个可选 `cards` 字段（`Array<[cn, en]>`），通过 Alt+C 弹窗编辑。cards 仅是 favorite 自身的元数据，不参与 session 同步，不进入 JSON 导出。

## Data Model

每个 IndexedDB favorite 记录多一个可选字段：

```js
{
  id, hash, name, payload, createdAt,
  cards?: Array<[string, string]>   // NEW
}
```

- `payload` 与 `hash` 保持不变。`hash` 仍由 `payload` 计算。
- 改 cards 不重算 hash，不影响其他 favorite。
- JSON 编辑弹窗（Alt+J）只序列化 `payload`，不包含 cards。

## Layout Structure

在 `cn2en-json.html` 已有 `jsonEditModal` 之后新增：

```html
<div id="cardsModal" class="fav-modal" hidden>
    <div id="cardsModalBackdrop" class="fav-modal-backdrop"></div>
    <div class="fav-modal-panel">
        <div class="fav-modal-title">Cards · <span id="cardsModalTitle"></span></div>
        <textarea id="cardsModalInput" class="fav-input cards-modal-textarea" spellcheck="false"
                  placeholder="每行一张卡片：中文|英文&#10;隐藏部分用 ~...~~ 包裹"></textarea>
        <div id="cardsModalError" class="fav-modal-error"></div>
        <div class="fav-modal-actions">
            <button id="cardsModalCancel" class="fav-btn-secondary">取消</button>
            <button id="cardsModalSave" class="fav-btn-primary">保存</button>
        </div>
    </div>
</div>
```

复用现有 `.fav-modal` / `.fav-modal-backdrop` / `.fav-modal-panel` / `.fav-modal-title` / `.fav-input` / `.fav-modal-actions` 样式，不新增颜色变量。

新增 CSS：

```css
.cards-modal-textarea {
    width: 600px;
    max-width: calc(100vw - 80px);
    box-sizing: border-box;
    min-height: 280px;
    max-height: 60vh;
    resize: vertical;
    font-family: ui-monospace, 'Cascadia Mono', Menlo, Consolas, monospace;
    font-size: 13px;
    line-height: 1.5;
    padding: 10px 12px;
    margin: 0 auto;
    display: block;
    white-space: pre;
    overflow: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(95, 168, 211, 0.55) transparent;
}
.cards-modal-textarea::-webkit-scrollbar { width: 8px; height: 8px; }
.cards-modal-textarea::-webkit-scrollbar-track { background: transparent; }
.cards-modal-textarea::-webkit-scrollbar-thumb {
    background: rgba(95, 168, 211, 0.55);
    border-radius: 4px;
}
.cards-modal-textarea::-webkit-scrollbar-thumb:hover {
    background: rgba(95, 168, 211, 0.85);
}
.fav-modal-error {
    color: #f87171;
    font-size: 13px;
    min-height: 18px;
    text-align: center;
    white-space: pre-wrap;
}
.fav-btn-secondary {
    background: #2a2a2a;
    border: 1px solid #444;
    color: #ddd;
    padding: 6px 14px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}
.fav-btn-secondary:hover { background: #3a3a3a; }
.fav-btn-primary {
    background: #1f6feb;
    border: 1px solid #1f6feb;
    color: #fff;
    padding: 6px 14px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}
.fav-btn-primary:hover { background: #2f7ff5; }
```

## Behavior

### 打开（Alt+C）

- 仅当 `currentFavId` 已设且所有现有弹窗（favSave / favList / note / jsonEdit / cnModal）均隐藏时响应。
- target 不是 INPUT/TEXTAREA。
- 读取当前 favorite 的 `cards` 字段，转为文本（见「序列化」），填入 textarea，title 显示 favorite 名。
- 显示弹窗，setTimeout(0) 后 textarea focus。

### 保存

- 把 textarea 文本按行解析为 `Array<[cn, en]>`（见「解析」）。
- 调用 `updateFavoriteCards(id, cards)`，**只**更新该条 favorite 的 `cards` 字段。
- 关闭弹窗。
- **不做任何格式校验**（按用户确认）。解析失败也不会阻塞——空行被丢弃后剩余行直接成对。

### 关闭（不保存）

- Escape
- Cancel 按钮
- 点击 backdrop
- 调用 `closeCardsModal`，隐藏弹窗，清空 error 文本。

### 关闭后焦点

关闭时焦点回到打开弹窗前的焦点元素（与 cnModal 同样的处理：保存 origin.activeElement，关闭时 origin.focus()）。

### 加载/卸载联动

- `loadFavorite(id)` 后主 UI 不显示 cards。
- 切换 favorite 后，Alt+C 弹窗读的是当前 `currentFavId` 对应的 cards。

### 序列化（textarea → Array<[cn, en]>）

每行：
1. `trim()` 后若为空，丢弃
2. 否则查找首个 `|`：`[0, idx)` 为 CN，`(idx, end)` 为 EN（CN、EN 都不再 trim，保留原样空格）
3. CN / EN 中含 `~...~~` 字面文本保留，由后续消费方解释。

### 反序列化（Array<[cn, en]> → textarea）

无 cards：`''`
有 cards：
```
{cn1}|{en1}
{cn2}|{en2}
```
每行一对，相邻行用 `\n` 连接。不附加尾部换行。

## State

新增模块作用域变量：

```js
let cardsModalOriginFocus = null;  // 用于关闭时还原焦点
```

DOM 引用：

```js
const cardsModal = document.getElementById('cardsModal');
const cardsModalBackdrop = document.getElementById('cardsModalBackdrop');
const cardsModalTitle = document.getElementById('cardsModalTitle');
const cardsModalInput = document.getElementById('cardsModalInput');
const cardsModalError = document.getElementById('cardsModalError');
const cardsModalCancel = document.getElementById('cardsModalCancel');
const cardsModalSave = document.getElementById('cardsModalSave');
```

## Functions

新增：

```js
function openCardsModal() {
    if (!currentFavId) return;
    const fav = favorites.find(f => f.id === currentFavId);
    if (!fav) return;
    cardsModalOriginFocus = document.activeElement;
    cardsModalTitle.textContent = fav.name || '(未命名)';
    cardsModalInput.value = cardsToText(fav.cards);
    cardsModalError.textContent = '';
    cardsModal.hidden = false;
    setTimeout(() => { cardsModalInput.focus(); }, 0);
}

function closeCardsModal() {
    cardsModal.hidden = true;
    cardsModalError.textContent = '';
    if (cardsModalOriginFocus && cardsModalOriginFocus.focus) {
        cardsModalOriginFocus.focus();
    }
    cardsModalOriginFocus = null;
}

function cardsToText(cards) {
    if (!Array.isArray(cards) || cards.length === 0) return '';
    return cards.map(([cn, en]) => `${cn}|${en}`).join('\n');
}

function textToCards(text) {
    const out = [];
    for (const line of text.split('\n')) {
        const t = line.trim();
        if (!t) continue;
        const idx = t.indexOf('|');
        if (idx === -1) {
            out.push([t, '']);
        } else {
            out.push([t.slice(0, idx), t.slice(idx + 1)]);
        }
    }
    return out;
}

function saveCardsModal() {
    if (!currentFavId) {
        closeCardsModal();
        return;
    }
    const fav = favorites.find(f => f.id === currentFavId);
    if (!fav) {
        closeCardsModal();
        return;
    }
    const cards = textToCards(cardsModalInput.value);
    fav.cards = cards;
    updateFavorite(currentFavId, { cards });
    closeCardsModal();
}
```

### IndexedDB 持久化

复用 `updateFavorite(id, updates)` 现有 API（cn2en-json.html:957），按字段更新 favorites object store：

```js
function saveCardsModal() {
    if (!currentFavId) {
        closeCardsModal();
        return;
    }
    const fav = favorites.find(f => f.id === currentFavId);
    if (!fav) {
        closeCardsModal();
        return;
    }
    const cards = textToCards(cardsModalInput.value);
    fav.cards = cards;
    updateFavorite(currentFavId, { cards });
    closeCardsModal();
}
```

内存中 `fav.cards` 立即更新；`updateFavorite` 是 fire-and-forget 写库（与 JSON edit 保存流程一致，cn2en-json.html:1367）。若写库失败，in-memory 与 DB 暂时不一致，但下次 `refreshFavorites()` 会重新拉取。`refreshFavorites` 由其他操作间接触发（例如切换 favorite 时），无需在这里显式调用。

## Hotkey

在现有 `keydown` 处理器中新增 Alt+C 分支，沿用 Alt+J 的隐藏弹窗检查模式：

```js
if (e.altKey && !e.ctrlKey && !e.shiftKey && e.code === 'KeyC') {
    if (!favSaveModal.hidden || !noteModal.hidden || !jsonEditModal.hidden || !cardsModal.hidden) return;
    if (!currentFavId) return;
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    e.preventDefault();
    openCardsModal();
    return;
}
```

并在 Escape 分支加入 `!cardsModal.hidden`：

```js
} else if (!cardsModal.hidden) {
    e.preventDefault();
    closeCardsModal();
}
```

## Edge cases

- 无 currentFavId 时按 Alt+C：无任何响应。
- 已加载 favorite 但 `cards` 未设置：textarea 为空，可直接保存为空。
- textarea 全部为空行：保存为空 `[]`。
- textarea 仅含 `|`：`['', '']`。
- 取消编辑：内存中 `fav.cards` 不变；下次打开仍是旧值。
- 删除当前 favorite：现有 deleteFavorite 已删除整条记录，cards 随之消失，无需特殊处理。
- Alt+C 在 INPUT/TEXTAREA 焦点时不响应。
- Alt+C 在任一弹窗打开时不响应。

## Testing Notes

无自动化测试。手动验证：
1. 加载一个 favorite
2. 按 Alt+C，弹窗显示空 textarea）
3. 填入示例文本（8 行 cards），保存
4. 刷新页面，重新加载该 favorite
5. 再按 Alt+C，看到之前输入的文本回填
6. 在 favorite 列表中切换到另一个 favorite，按 Alt+C，看到另一份 cards（或空）
7. 按 Alt+C 时切换不同弹窗，确认优先级合理（任意现有弹窗打开时 Alt+C 不响应）