# cn2en-json Cards Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional `cards` field to each cn2en-json favorite, editable via Alt+C modal. Stored in IndexedDB; not exported via the JSON edit modal.

**Architecture:** Reuse the existing `fav-modal` styling and `updateFavorite(id, updates)` IndexedDB helper. New modal `cardsModal` (mirrors `jsonEditModal`). Pure functions `cardsToText`/`textToCards` for serialization. Hotkey Alt+C mirrors Alt+J's modal-hidden check pattern.

**Tech Stack:** Vanilla JS, IndexedDB, existing `fav-modal` CSS. No new deps.

**Spec:** `docs/superpowers/specs/2026-10-05-cn2en-json-cards-design.md`

---

## File map

All work lives in one file:

- **Modify:** `cn2en-json.html`
  - CSS: append after `.json-edit-error` rules (~line 559)
  - HTML: append `cardsModal` after `jsonEditModal` (~line 686)
  - State: add `let cardsModalOriginFocus = null;` next to other state
  - DOM refs: add 7 cards-related consts next to other DOM refs (~line 770)
  - Pure functions: add `cardsToText` and `textToCards` (place near other helpers)
  - Modal lifecycle: add `openCardsModal`, `closeCardsModal`, `saveCardsModal` near `openJsonEditModal`/`closeJsonEditModal` (~line 1315)
  - Event wiring: bind buttons/backdrop near jsonEdit event wiring (~line 1487)
  - Hotkey: Alt+C branch + Escape close (~line 1680)

No new files. No tests.

---

## Task 1: Add cards modal HTML + CSS

**Files:**
- Modify: `cn2en-json.html:552-562` (CSS append)
- Modify: `cn2en-json.html:683-688` (HTML append after `jsonEditModal`)

- [ ] **Step 1: Append CSS after `.json-edit-error` block**

In `cn2en-json.html`, find the `.json-edit-error` rule ending at line 562 (the closing `}` after `white-space: pre-wrap;`). Append immediately after it:

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

- [ ] **Step 2: Append HTML for `cardsModal`**

Find `</div>` that closes `jsonEditModal` (~line 686). Append after it:

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

- [ ] **Step 3: Verify HTML/CSS in browser:
1. Open `cn2en-json.html` in browser
3. Confirm no console errors (CSS/JS paths resolve)
4. Cards modal not yet wired — clicking Alt+C does nothing yet. This is expected.

- [ ] **Step 4: Commit**

```bash
git add cn2en-json.html
git commit -m "feat(cn2en-json): add cards modal HTML and CSS"
```

---

## Task 2: Add state, DOM refs, and pure helpers

**Files:**
- Modify: `cn2en-json.html:770-775` (DOM refs)
- Modify: `cn2en-json.html` (add `cardsModalOriginFocus` state next to other `let` vars)
- Modify: `cn2en-json.html` (add pure functions near other helpers)

- [ ] **Step 1: Add state variable**

Find the block of `let bgImages = []; let currentBgId = -1; ...` (around line 771-775). Add a new line below that block:

```js
let cardsModalOriginFocus = null;
```

- [ ] **Step 2: Add DOM references**

Find the `jsonEditCancel` const (line 770). Append immediately after:

```js
const cardsModal = document.getElementById('cardsModal');
const cardsModalBackdrop = document.getElementById('cardsModalBackdrop');
const cardsModalTitle = document.getElementById('cardsModalTitle');
const cardsModalInput = document.getElementById('cardsModalInput');
const cardsModalError = document.getElementById('cardsModalError');
const cardsModalCancel = document.getElementById('cardsModalCancel');
const cardsModalSave = document.getElementById('cardsModalSave');
```

- [ ] **Step 3: Add `cardsToText` and `textToCards`**

Find `closeJsonEditModal` function (ends with `jsonEditModal.hidden = true;` around line 1329-1331). Add a blank line after it and insert:

```js
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
```

- [ ] **Step 4: Verify pure helpers via node**

Run:

```bash
node -e '
function cardsToText(cards) {
    if (!Array.isArray(cards) || cards.length === 0) return "";
    return cards.map(([cn, en]) => `${cn}|${en}`).join("\n");
}
function textToCards(text) {
    const out = [];
    for (const line of text.split("\n")) {
        const t = line.trim();
        if (!t) continue;
        const idx = t.indexOf("|");
        if (idx === -1) {
            out.push([t, ""]);
        } else {
            out.push([t.slice(0, idx), t.slice(idx + 1)]);
        }
    }
    return out;
}
// Round-trip test
const sample = [
    ["我长长舒了一口气", "~I let out a long sigh of relief~~"],
    ["修完的那一刻", "~The moment I finished the fix~~"],
];
const t = cardsToText(sample);
console.log(JSON.stringify(t));
const back = textToCards(t);
console.log(JSON.stringify(back));
console.log("match:", JSON.stringify(back) === JSON.stringify(sample));
// Empty / edge cases
console.log(JSON.stringify(textToCards("")));
console.log(JSON.stringify(textToCards("\n\n  \n")));
console.log(JSON.stringify(textToCards("only|no pipe|after")));
console.log(JSON.stringify(textToCards("nolinebreak")));
console.log(JSON.stringify(cardsToText(undefined)));
'
```

Expected output (exact):

```
"我长长舒了一口气|~I let out a long sigh of relief~~\n修完的那一刻|~The moment I finished the fix~~"
[["我长长舒了一口气","~I let out a long sigh of relief~~"],["修完的那一刻","~The moment I finished the fix~~"]]
match: true
[]
[]
[["only","no pipe|after"]]
[["nolinebreak",""]]
""
```

- [ ] **Step 5: Commit**

```bash
git add cn2en-json.html
git commit -m "feat(cn2en-json): add cards state, DOM refs, and pure helpers"
```

---

## Task 3: Add modal lifecycle + event wiring

**Files:**
- Modify: `cn2en-json.html` (add 3 functions near `closeJsonEditModal`)
- Modify: `cn2en-json.html:1487-1499` (add event wiring near jsonEdit wiring)

- [ ] **Step 1: Add `openCardsModal`, `closeCardsModal`, `saveCardsModal`**

Find the location where `cardsToText` and `textToCards` were added (Task 2 Step 3). After `textToCards`'s closing brace, append:

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

- [ ] **Step 2: Wire buttons and backdrop**

Find the `jsonEditInput.addEventListener('keydown', ...)` block ending at line 1498 (the `jsonEditInput.click()` call). Append immediately after its closing `});`:

```js
cardsModalCancel.addEventListener('click', closeCardsModal);
cardsModalSave.addEventListener('click', saveCardsModal);
cardsModalBackdrop.addEventListener('click', closeCardsModal);
cardsModalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        cardsModalSave.click();
    }
});
```

- [ ] **Step 3: Verify modal opens via console**

1. Reload browser
2. Open DevTools console, type: `openCardsModal(); cardsModal.hidden`
   - Expected: opens the modal, then console prints `false`
3. Type: `cardsModalCancel.click()` — modal closes
4. With no favorite loaded, `openCardsModal()` is a no-op (returns early due to `!currentFavId`)

- [ ] **Step 4: Commit**

```bash
git add cn2en-json.html
git commit -m "feat(cn2en-json): wire cards modal lifecycle and buttons"
```

---

## Task 4: Add Alt+C hotkey + Escape close

**Files:**
- Modify: `cn2en-json.html:1670-1690` (add Escape branch)
- Modify: `cn2en-json.html:1692-2130` (add `cardsModal.hidden` to existing hidden-checks + Alt+C branch)

- [ ] **Step 1: Add Escape branch for `cardsModal`**

Find the Escape block ending at line 1690 (the `hideAllCn();` line, then `} else { ... }`). The block looks like:

```js
} else if (!cnModal.hidden) {
    e.preventDefault();
    e.stopPropagation();
    hideAllCn();
}
```

Append a new branch before `} else if (!cnModal.hidden)` (i.e. after the `closeJsonEditModal()` block):

```js
} else if (!cardsModal.hidden) {
    e.preventDefault();
    e.stopPropagation();
    closeCardsModal();
}
```

- [ ] **Step 2: Add `cardsModal.hidden` to existing modal-hidden checks**

There are **six** existing modal-hidden checks in the keydown handler. Find and update each so the new `cardsModal.hidden` clause is included.

Five of them share the form `... favSaveModal.hidden && noteModal.hidden && jsonEditModal.hidden` and appear at:

- Line 2064
- Line 2073
- Line 2103
- Line 2111
- Line 2130

For each of these five, replace:

```js
favSaveModal.hidden && noteModal.hidden && jsonEditModal.hidden
```

with:

```js
favSaveModal.hidden && noteModal.hidden && jsonEditModal.hidden && cardsModal.hidden
```

The check at line 1692 has inverted syntax — it returns early if any modal is open:

```js
if (!favSaveModal.hidden || !noteModal.hidden || !jsonEditModal.hidden) {
```

Update it to:

```js
if (!favSaveModal.hidden || !noteModal.hidden || !jsonEditModal.hidden || !cardsModal.hidden) {
```

After applying both edits, the file has six checks total that gate all existing hotkeys on `cardsModal.hidden` being true.

- [ ] **Step 3: Add Alt+C hotkey**

Find a stable anchor near the existing hotkey branches (e.g. line 2111 or 2130). After the existing Alt-style hotkey block that handles `Digit1/2/3` (or after the modified ArrowLeft/Right block at line 2130), append:

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

The condition must appear in source before any branch that runs only when no modals are open — placing it after the existing Digit1/2/3 block is fine since the Digit block is already wrapped in the `&& cardsModal.hidden` check from Step 2.

- [ ] **Step 4: Verify hotkey end-to-end**

1. Reload browser
2. Load any favorite (Ctrl+L or via UI)
3. Press Alt+C → modal opens with current favorite's name in title
4. Type a few cards, click Save → modal closes
5. Reload page (Ctrl+R or F5), load the same favorite, press Alt+C → previous cards text reappears in textarea
7. With no favorite loaded, press Alt+C → nothing happens
8. With focus inside `cardsModalInput`, press Alt+C → modal does NOT re-open (input is in INPUT/TEXTAREA)
9. Press Escape while modal is open → closes
10. Click backdrop → closes
11. Click Cancel → closes

- [ ] **Step 5: Validate JS syntax**

Run:

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('C:/Users/10691/Documents/GitHub/html-tools/cn2en-json.html','utf8');const m=s.match(/<script>([\\s\\S]*?)<\\/script>/);fs.writeFileSync('C:/Users/10691/AppData/Local/Temp/cn2en_cards_check.js',m[1]);" && node --check "C:/Users/10691/AppData/Local/Temp/cn2en_cards_check.js" && echo OK
```

Expected: `OK`

- [ ] **Step 6: Commit**

```bash
git add cn2en-json.html
git commit -m "feat(cn2en-json): add Alt+C hotkey and Escape close for cards modal"
```

---

## Task 5: Final manual verification

- [ ] **Step 1: Open file in browser, run end-to-end scenario**

1. Load page
2. Load favorite "test" (or create one)
3. Press Alt+C — modal opens
4. Paste 8 lines from the spec example:
   ```
   我长长舒了一口气|~I let out a long sigh of relief~~|
   修完的那一刻|~The moment I finished the fix~~|
   ...
   ```
5. Click Save
6. Refresh, load same favorite, press Alt+C
7. Confirm all 8 lines reappear in order
9. Open JSON edit (Alt+J), confirm cards are NOT serialized (only `payload` entries appear)
10. Switch to a different favorite, press Alt+C — see that favorite's cards (or empty if unset)
11. Switch back — see first favorite's cards restored
12. Verify all 6 modal flow tests from Task 4 Step 4 still pass

- [ ] **Step 2: Done**

If all checks pass, the implementation matches `docs/superpowers/specs/2026-10-05-cn2en-json-cards-design.md`.