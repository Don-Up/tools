# cn2en-json Cards Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Attach an optional `cards` field to favorites in `cn2en-json.html`; on loading a favorite with non-empty cards, post one `cn-en-cards-bulk` message to the embedded `card-timer.html` iframe (re-using its existing `convertText` + `createTimersWithDelay` pipeline); expose Alt+C modal to edit the field.

**Architecture:**
- `card-timer.html` (root + vendored Anki copy) gains one new postMessage handler that mirrors its existing Ctrl+Click Confirm pipeline but reads cards from `e.data.cards` instead of the clipboard. No input-field manipulation.
- `cn2en-json.html` stores `cards` as a property on the favorite record (not on individual entries). `hashEntries` continues to hash only CN+EN pairs. `loadFavorite` calls a new `pushCardsToChild()` that opens the side panel and posts the message.
- New `#cardsEditModal` (Alt+C) edits the current favorite's `cards` field, persists via the existing `updateFavorite(id, { cards })` helper.

**Tech Stack:** Plain JS, IndexedDB, postMessage. No new dependencies. No test framework — verification is `node --check` for syntax + manual browser test.

---

## File map

| File | Change |
|---|---|
| `card-timer.html` | Add `cn-en-cards-bulk` postMessage handler |
| `anki-addons/cardtimer_for_anki/web/card-timer.html` | Sync same handler |
| `cn2en-json.html` | Add `#cardsEditModal` HTML+CSS, `pushCardsToChild()`, helpers, Alt+C hotkey, Escape case |

Total touch: 3 files. No new files.

---

## Task 1: `card-timer.html` — add `cn-en-cards-bulk` handler

**Files:**
- Modify: `card-timer.html:1830-1881` (the `window.addEventListener('message', ...)` block)

- [ ] **Step 1: Locate the message listener block**

Open `card-timer.html` and find the `window.addEventListener('message', ...)` block at lines 1830–1881. The handler ends with `if (e.data?.type === 'cn-en-q-confirm' ...` followed by `});`.

- [ ] **Step 2: Add the new handler**

Insert the following block immediately after the existing `cn-en-q-confirm` if-block (i.e., right before the closing `});` of the message listener):

```js
        if (e.data?.type === 'cn-en-cards-bulk' && typeof e.data.cards === 'string' && e.data.cards.trim()) {
            const converted = convertText(e.data.cards);
            const cardNames = converted.split('|||').filter(n => n);
            createTimersWithDelay(cardNames);
        }
```

The block reuses `convertText` (already defined at line 940) and `createTimersWithDelay` (line 1051) — both are part of the existing Ctrl+Click Confirm pipeline at line 995.

- [ ] **Step 3: Validate JS syntax**

Run:
```bash
node -e "const fs=require('fs');const s=fs.readFileSync('C:/Users/10691/Documents/GitHub/html-tools/card-timer.html','utf8');const m=s.match(/<script>([\s\S]*?)<\/script>/);fs.writeFileSync('C:/Users/10691/AppData/Local/Temp/ct_check.js',m[1]);" && node --check "C:/Users/10691/AppData/Local/Temp/ct_check.js" && echo OK
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add card-timer.html
git commit -m "feat(card-timer): accept cn-en-cards-bulk postMessage for bulk push"
```

---

## Task 2: Vendored `card-timer.html` — sync the handler

**Files:**
- Modify: `anki-addons/cardtimer_for_anki/web/card-timer.html:1830-1881` (same `message` listener)

- [ ] **Step 1: Locate the message listener block in the vendored copy**

Open `anki-addons/cardtimer_for_anki/web/card-timer.html` and find the `window.addEventListener('message', ...)` block. It is structurally identical to the root file's block at the same line range.

- [ ] **Step 2: Insert the same handler**

Insert the following block immediately after the existing `cn-en-q-confirm` if-block (right before the closing `});`):

```js
        if (e.data?.type === 'cn-en-cards-bulk' && typeof e.data.cards === 'string' && e.data.cards.trim()) {
            const converted = convertText(e.data.cards);
            const cardNames = converted.split('|||').filter(n => n);
            createTimersWithDelay(cardNames);
        }
```

The vendored copy must be byte-for-byte identical to the root for this block.

- [ ] **Step 3: Validate JS syntax**

Run:
```bash
node -e "const fs=require('fs');const s=fs.readFileSync('C:/Users/10691/Documents/GitHub/html-tools/anki-addons/cardtimer_for_anki/web/card-timer.html','utf8');const m=s.match(/<script>([\s\S]*?)<\/script>/);fs.writeFileSync('C:/Users/10691/AppData/Local/Temp/ct_vendored_check.js',m[1]);" && node --check "C:/Users/10691/AppData/Local/Temp/ct_vendored_check.js" && echo OK
```

Expected: `OK`

- [ ] **Step 4: Verify both copies have the same block**

Run:
```bash
diff <(grep -A3 'cn-en-cards-bulk' "C:/Users/10691/Documents/GitHub/html-tools/card-timer.html") <(grep -A3 'cn-en-cards-bulk' "C:/Users/10691/Documents/GitHub/html-tools/anki-addons/cardtimer_for_anki/web/card-timer.html")
```

Expected: no output (identical).

- [ ] **Step 5: Commit**

```bash
git add anki-addons/cardtimer_for_anki/web/card-timer.html
git commit -m "feat(card-timer): sync cn-en-cards-bulk handler to vendored copy"
```

---

## Task 3: `cn2en-json.html` — add `#cardsEditModal` HTML + CSS

**Files:**
- Modify: `cn2en-json.html` (HTML and CSS sections)

- [ ] **Step 1: Add the modal HTML**

Insert the following block immediately after the `</div>` closing `#jsonEditModal` (around line 685, before the line `<iframe id="sidePanel" ...>` at line 688):

```html
        <div id="cardsEditModal" class="fav-modal" hidden>
            <div id="cardsEditBackdrop" class="fav-modal-backdrop"></div>
            <div class="fav-modal-panel">
                <div class="fav-modal-title">卡片</div>
                <textarea id="cardsEditInput" class="fav-input cards-edit-textarea" placeholder="一行一条，格式：中文|~English with marks~~|"></textarea>
                <div class="fav-modal-actions">
                    <button id="cardsEditOk">保存</button>
                    <button id="cardsEditCancel">取消</button>
                </div>
            </div>
        </div>
```

- [ ] **Step 2: Add the CSS**

Insert the following block immediately after the existing `.json-edit-error { ... }` rule (around line 562):

```css
        .fav-input.cards-edit-textarea {
            width: 720px;
            max-width: calc(100vw - 80px);
            box-sizing: border-box;
            min-height: 260px;
            max-height: 60vh;
            resize: vertical;
            font-family: ui-monospace, 'Cascadia Mono', Menlo, Consolas, monospace;
            font-size: 13px;
            line-height: 1.5;
            padding: 10px 12px;
            margin: 0 auto;
            display: block;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
        }
```

- [ ] **Step 3: Validate JS syntax**

The HTML changes don't affect JS, but verify nothing got broken:

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('C:/Users/10691/Documents/GitHub/html-tools/cn2en-json.html','utf8');const m=s.match(/<script>([\s\S]*?)<\/script>/);fs.writeFileSync('C:/Users/10691/AppData/Local/Temp/cn2en_h3.js',m[1]);" && node --check "C:/Users/10691/AppData/Local/Temp/cn2en_h3.js" && echo OK
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add cn2en-json.html
git commit -m "feat(cn2en-json): add cardsEditModal HTML and CSS"
```

---

## Task 4: `cn2en-json.html` — DOM refs + favorite cards helpers + push + `loadFavorite` call

**Files:**
- Modify: `cn2en-json.html` (DOM ref section around line 760, helper functions, `loadFavorite` at line 1094)

- [ ] **Step 1: Add DOM refs**

Find the existing DOM refs block (the lines `const noteModal = ...; const jsonEditModal = ...;` around line 756-764). Add the new refs immediately after `jsonEditModal`:

```js
    const cardsEditModal = document.getElementById('cardsEditModal');
    const cardsEditBackdrop = document.getElementById('cardsEditBackdrop');
    const cardsEditInput = document.getElementById('cardsEditInput');
    const cardsEditOk = document.getElementById('cardsEditOk');
    const cardsEditCancel = document.getElementById('cardsEditCancel');
```

- [ ] **Step 2: Add the helpers and push function**

Find the existing `setFavStatus(fav)` function (around line 1121) and insert the following helpers and `pushCardsToChild()` immediately after it (before `favStatus.addEventListener('click', ...)` at line 1138):

```js
    function getCurrentFavCards() {
        if (!currentFavId) return '';
        const fav = favorites.find(f => f.id === currentFavId);
        return fav && typeof fav.cards === 'string' ? fav.cards : '';
    }

    async function setCurrentFavCards(cards) {
        if (!currentFavId) return;
        const fav = favorites.find(f => f.id === currentFavId);
        if (!fav) return;
        fav.cards = cards;
        await updateFavorite(currentFavId, { cards });
    }

    function pushCardsToChild() {
        const cards = getCurrentFavCards();
        if (!cards || !cards.trim()) return;
        if (!sidePanel.classList.contains('shown')) {
            sidePanel.classList.add('shown');
            document.body.classList.add('side-panel-open');
        }
        sidePanel.contentWindow?.postMessage({
            type: 'cn-en-cards-bulk',
            cards,
        }, '*');
    }
```

- [ ] **Step 3: Hook `pushCardsToChild` into `loadFavorite`**

In `loadFavorite(fav)` (around line 1094), add the call after `render()` and before `favListModal.hidden = true`. Find this block:

```js
        entries = payload;
        currentIndex = 0;
        saveState();
        render();
        favListModal.hidden = true;
```

Replace with:

```js
        entries = payload;
        currentIndex = 0;
        saveState();
        render();
        favListModal.hidden = true;
        pushCardsToChild();
```

- [ ] **Step 4: Validate JS syntax**

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('C:/Users/10691/Documents/GitHub/html-tools/cn2en-json.html','utf8');const m=s.match(/<script>([\s\S]*?)<\/script>/);fs.writeFileSync('C:/Users/10691/AppData/Local/Temp/cn2en_t4.js',m[1]);" && node --check "C:/Users/10691/AppData/Local/Temp/cn2en_t4.js" && echo OK
```

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add cn2en-json.html
git commit -m "feat(cn2en-json): favorite cards helpers + push on loadFavorite"
```

---

## Task 5: `cn2en-json.html` — modal open/close/save + Alt+C hotkey + Escape case

**Files:**
- Modify: `cn2en-json.html` (modal handlers, keydown listener)

- [ ] **Step 1: Add modal open/close/save functions**

Insert the following block immediately after the existing `jsonEditInput.addEventListener('keydown', ...)` block ends (around line 1498 — the closing `});` is followed by a blank line and then `function applyBg(...)`):

```js
    function openCardsEditModal() {
        if (!currentFavId) return;
        cardsEditInput.value = getCurrentFavCards();
        cardsEditModal.hidden = false;
        setTimeout(() => cardsEditInput.focus(), 0);
    }

    function closeCardsEditModal() {
        cardsEditModal.hidden = true;
    }

    async function saveCardsEdit() {
        await setCurrentFavCards(cardsEditInput.value);
        closeCardsEditModal();
    }

    cardsEditBackdrop.addEventListener('click', closeCardsEditModal);
    cardsEditOk.addEventListener('click', saveCardsEdit);
    cardsEditCancel.addEventListener('click', closeCardsEditModal);
```

- [ ] **Step 2: Add the Alt+C hotkey**

Find the `KeyN` handler block in the keydown listener (around line 2111-2116, the one starting with `if (e.code === 'KeyN' && noteModal.hidden && tag !== 'INPUT' && tag !== 'TEXTAREA')`). Insert the Alt+C handler immediately after that block (still inside the same outer `if`):

```js
            if (e.altKey && !e.ctrlKey && !e.shiftKey && e.code === 'KeyC'
                && favSaveModal.hidden && noteModal.hidden && jsonEditModal.hidden
                && cardsEditModal.hidden && favListModal.hidden) {
                if (tag === 'INPUT' || tag === 'TEXTAREA') return;
                if (!currentFavId) return;
                e.preventDefault();
                openCardsEditModal();
                return;
            }
```

- [ ] **Step 3: Add the Escape case**

Find the Escape `if (e.key === 'Escape')` block (around line 1665). It has a series of `else if (!xxxModal.hidden)` cases. Insert a new case for `cardsEditModal` immediately after the `jsonEditModal` case and before the `bgModal` case:

```js
            } else if (!cardsEditModal.hidden) {
                e.preventDefault();
                e.stopPropagation();
                closeCardsEditModal();
```

The full closing structure should remain valid: the existing `}` after the `bgModal` block closes the outer `if (e.key === 'Escape')`.

- [ ] **Step 4: Validate JS syntax**

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('C:/Users/10691/Documents/GitHub/html-tools/cn2en-json.html','utf8');const m=s.match(/<script>([\s\S]*?)<\/script>/);fs.writeFileSync('C:/Users/10691/AppData/Local/Temp/cn2en_t5.js',m[1]);" && node --check "C:/Users/10691/AppData/Local/Temp/cn2en_t5.js" && echo OK
```

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add cn2en-json.html
git commit -m "feat(cn2en-json): Alt+C opens cardsEditModal with save/Escape handling"
```

---

## Task 6: Manual end-to-end test

**Files:** none changed; this is verification.

- [ ] **Step 1: Open `cn2en-json.html` in a browser**

Open the page locally (or use a local file server). Confirm the page loads without console errors.

- [ ] **Step 2: Load a JSON with cards**

Paste this JSON into the page (use Ctrl+V):

```json
[["cat","猫"],["dog","狗"]]
```

Then save as a favorite (Alt+S). Then re-open it from the favorite list (Alt+F) — confirm the page shows "已收藏".

- [ ] **Step 3: Set cards via Alt+C**

Press Alt+C. The `cardsEditModal` should open with an empty textarea. Enter:

```
cat|~cat~~|
dog|~dog~~|
```

Click 保存. Open browser DevTools → Application → IndexedDB → `cn2en-json-fav` → `favorites`. The row's `cards` field should equal `"cat|~cat~~|\ndog|~dog~~"`.

- [ ] **Step 4: Reload favorite and verify push**

Reload the page. Open the favorite list (Alt+F) and click the favorite. Expected:
- side panel (CardTimer iframe) opens automatically
- CardTimer shows two timers: "cat::~cat~~" and "dog::~dog~~" with cloze highlighting on "cat" and "dog"
- DevTools console in the iframe should show no errors

- [ ] **Step 5: Edit cards and verify push**

With the favorite loaded, press Alt+C. Change the second line to `dog|~puppy~~|`. Click 保存. Expected: CardTimer now shows three timers (one new "cat", one new "dog" → "puppy"); the previous push's timers remain (push is additive — no clear).

- [ ] **Step 6: Edit CN/EN and confirm hash re-computes**

With the favorite loaded, edit one entry's CN (e.g., change "cat" to "CAT"). Expected: hash recomputes, fav status still shows "已收藏" (because hash matches).

- [ ] **Step 7: Edit cards only and confirm hash unchanged**

Reload favorite, press Alt+C, change cards content, save. Expected: fav status remains (hash is not affected by cards).

- [ ] **Step 8: Test Escape and backdrop**

Open Alt+C. Press Escape — modal closes without saving. Open again, click backdrop — modal closes. Open again, click 取消 — modal closes. Open, type something, click 保存 — modal closes and content persists.

- [ ] **Step 9: Commit verification log (if any fixes were needed)**

If any of the above failed and required code changes, make a final commit:

```bash
git add cn2en-json.html card-timer.html anki-addons/cardtimer_for_anki/web/card-timer.html
git commit -m "fix: post-manual-test fixes for cards field integration"
```

Otherwise no commit is needed.