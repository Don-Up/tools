# cn2en-json Ruby Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Alt+P floating modal + cursor-following tooltip that lets users attach per-ruby notes to each favorite, persisted to IndexedDB on modal close.

**Architecture:** Single-file change to `cn2en-json.html`. New `rubyNotesModal` reusing `.fav-modal` styling, plus a fixed-position `rubyTooltip` element. Data stored on favorite as `rubyNotes[sentenceIdx][rubyText]`. In-memory updates while editing; one `updateFavorite` write on close. Reuse existing `updateFavorite(id, updates)` IndexedDB helper.

**Tech Stack:** Vanilla JS, IndexedDB, existing fav-modal CSS. No new deps.

**Note on git:** Per user preference and project memory (`feedback_no_subagent_commits.md`), this plan contains **no `git commit` steps**. The implementer only edits files and runs `node --check` for syntax validation. The user commits manually after reviewing the diff.

**Spec:** `docs/superpowers/specs/2026-10-06-cn2en-ruby-notes-design.md`

---

## File map

All work lives in one file:

- **Modify:** `cn2en-json.html`
  - CSS: append after `.fav-btn-primary:hover` rule (line ~614)
  - HTML: append `rubyNotesModal` + `rubyTooltip` after cardsModal close (line ~752)
  - State: add `let currentRubyModalSentenceIdx = null; let rubyNotesInitialSnapshot = null;` near other state
  - DOM refs: add 8 rubyNotes* consts + `rubyTooltip` const next to other DOM refs (line ~842)
  - Pure helpers: add `extractRubyTexts(cn)` near other helpers
  - Modal lifecycle: add `openRubyNotesModal`, `closeRubyNotesModal`, `renderRubyNotesList` near `closeCardsModal` (line ~1460)
  - Tooltip: add `getRubyTextFromElement`, `showRubyTooltip`, `hideRubyTooltip` near modal lifecycle
  - Event wiring: bind buttons/backdrop near cards event wiring (~line 1651)
  - cnText mouseover/mouseout + document mousemove: append after existing cnText click listener (~line 1949)
  - Hotkey: Alt+P branch + Escape close near existing Alt+C branch (~line 2307)

No new files. No tests.

---

## Task 1: Add ruby notes CSS

**Files:**
- Modify: `cn2en-json.html:614` (CSS append after `.fav-btn-primary:hover`)

- [ ] **Step 1: Append CSS**

In `cn2en-json.html`, find the line containing `.fav-btn-primary:hover { background: #2f7ff5; }` (around line 614). Append immediately after the closing `}`:

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

- [ ] **Step 2: Verify CSS in browser:
1. Open `cn2en-json.html` in browser
2. Open DevTools → Elements → `<head><style>` and confirm the new rules exist
3. No console errors

---

## Task 2: Add rubyNotesModal + rubyTooltip HTML

**Files:**
- Modify: `cn2en-json.html:752` (HTML append after cardsModal close)

- [ ] **Step 1: Append HTML**

Find the closing `</div>` of `cardsModal` (around line 752) followed by another `</div>` (parent container). The block to find ends with this:

```html
        <div id="cardsModal" class="fav-modal" hidden>
            ...
            </div>
        </div>
    </div>
```

After that closing `</div>` (the one wrapping all modals), and BEFORE the `<iframe id="sidePanel" ...>` line (~755), insert:

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

- [ ] **Step 2: Verify HTML in browser:
1. Reload `cn2en-json.html`
2. Open DevTools → Elements → confirm `#rubyNotesModal` and `#rubyTooltip` exist (not visible by default)
3. No console errors

---

## Task 3: Add state, DOM refs, and pure helpers

**Files:**
- Modify: `cn2en-json.html:~857` (state, next to `let cardsModalOriginFocus = null;`)
- Modify: `cn2en-json.html:~842-848` (DOM refs, next to cardsModal refs)
- Modify: `cn2en-json.html:~1443-1446` (pure helper, after `textToCards` function ending)

- [ ] **Step 1: Add state variables**

Find the line `let cardsModalOriginFocus = null;` (~line 857). Append immediately after:

```js
let currentRubyModalSentenceIdx = null;
let rubyNotesInitialSnapshot = null;
```

- [ ] **Step 2: Add DOM references**

Find the block of cardsModal DOM refs (~lines 842-848). The block to anchor on is:

```js
const cardsModal = document.getElementById('cardsModal');
const cardsModalBackdrop = document.getElementById('cardsModalBackdrop');
const cardsModalTitle = document.getElementById('cardsModalTitle');
...
const cardsModalSave = document.getElementById('cardsModalSave');
```

After the last `cardsModalSave` line, append:

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

- [ ] **Step 3: Add `extractRubyTexts` helper**

Find the end of the `textToCards` function (the function returns an array, ending with `}` and a blank line, ~line 1445). Append immediately after that `}`:

```js
function extractRubyTexts(cn) {
    const matches = [...cn.matchAll(/\{\{([^}]*)\}\}/g)].map(m => m[1]);
    return matches;
}
```

- [ ] **Step 4: Verify pure helper via node**

Run:

```bash
node -e '
function extractRubyTexts(cn) {
    const matches = [...cn.matchAll(/\{\{([^}]*)\}\}/g)].map(m => m[1]);
    return matches;
}
// Empty
console.log(JSON.stringify(extractRubyTexts("")));
console.log(JSON.stringify(extractRubyTexts("no ruby here")));
// Single
console.log(JSON.stringify(extractRubyTexts("[教练] {{上车}}When you get in]]先调座椅和后视镜，系好{{安全带}}seatbelt]]再起步。")));
// Multiple
console.log(JSON.stringify(extractRubyTexts("a{{b}}c]]d{{e}}f]]g{{i}}j]]k")));
// Edge: nested braces are not allowed, so empty result
console.log(JSON.stringify(extractRubyTexts("{{outer {{inner}}}}")));
// Edge: gn with brackets inside
console.log(JSON.stringify(extractRubyTexts("{{a[b]c}}x]]")));
'
```

Expected output:

```
[]
[]
["上车","安全带"]
["b","e","i"]
[]
["a[b]c"]
```

- [ ] **Step 5: Validate JS syntax**

Run:

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('C:/Users/10691/Documents/GitHub/html-tools/cn2en-json.html','utf8');const m=s.match(/<script>([\s\S]*?)<\/script>/);fs.writeFileSync('C:/Users/10691/AppData/Local/Temp/cn2en_ruby_task3.js',m[1]);" && node --check "C:/Users/10691/AppData/Local/Temp/cn2en_ruby_task3.js" && echo OK
```

Expected: `OK`

---

## Task 4: Add modal lifecycle + tooltip functions

**Files:**
- Modify: `cn2en-json.html:~1460` (after `closeCardsModal` function)

- [ ] **Step 1: Add `openRubyNotesModal`, `closeRubyNotesModal`, `renderRubyNotesList`, `getRubyTextFromElement`, `showRubyTooltip`, `hideRubyTooltip`**

Find the end of `closeCardsModal` function. The function ends like:

```js
function closeCardsModal() {
    cardsModal.hidden = true;
    cardsModalError.textContent = '';
    if (cardsModalOriginFocus && cardsModalOriginFocus.focus) {
        cardsModalOriginFocus.focus();
    }
    cardsModalOriginFocus = null;
}
```

After the closing `}` of `closeCardsModal`, append a blank line then:

```js
function getRubyTextFromElement(ruby) {
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
    const fav = favorites.find(f => f.id === currentFavId);
    const notesMap = (fav && Array.isArray(fav.rubyNotes) && fav.rubyNotes[sentenceIdx]) || {};
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
            const f = favorites.find(x => x.id === currentFavId);
            if (!f) return;
            if (!Array.isArray(f.rubyNotes)) f.rubyNotes = [];
            if (!f.rubyNotes[sentenceIdx]) f.rubyNotes[sentenceIdx] = {};
            f.rubyNotes[sentenceIdx][rubyText] = ta.value;
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

- [ ] **Step 2: Verify modal lifecycle via console (before wiring buttons)**

1. Reload `cn2en-json.html`
2. Open DevTools console
3. Type: `typeof openRubyNotesModal` → should be `'function'`
4. Type: `typeof closeRubyNotesModal` → `'function'`
5. Type: `typeof renderRubyNotesList` → `'function'`
6. Type: `typeof showRubyTooltip` → `'function'`
7. Type: `typeof hideRubyTooltip` → `'function'`
8. With no favorite loaded, `openRubyNotesModal()` is a no-op (returns early due to `!currentFavId`).

- [ ] **Step 3: Validate JS syntax**

Run:

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('C:/Users/10691/Documents/GitHub/html-tools/cn2en-json.html','utf8');const m=s.match(/<script>([\s\S]*?)<\/script>/);fs.writeFileSync('C:/Users/10691/AppData/Local/Temp/cn2en_ruby_task4.js',m[1]);" && node --check "C:/Users/10691/AppData/Local/Temp/cn2en_ruby_task4.js" && echo OK
```

Expected: `OK`

---

## Task 5: Wire buttons, backdrop, cnText hover, document mousemove

**Files:**
- Modify: `cn2en-json.html:~1659` (after `cardsModalInput.addEventListener('keydown', ...)`)
- Modify: `cn2en-json.html:~1949` (after existing `cnText.addEventListener('click', ...)` block)

- [ ] **Step 1: Wire modal buttons and backdrop**

Find the block:

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

The block ends with the closing `});` after `cardsModalSave.click();`. After that, append:

```js
rubyNotesModalCancel.addEventListener('click', closeRubyNotesModal);
rubyNotesModalSave.addEventListener('click', closeRubyNotesModal);
rubyNotesModalBackdrop.addEventListener('click', closeRubyNotesModal);
```

- [ ] **Step 2: Wire cnText mouseover/mouseout and document mousemove**

Find the existing cnText click listener block ending around line 1949:

```js
cnText.addEventListener('click', (e) => {
    if (e.altKey) {
        e.preventDefault();
        copyEntryToClipboard();
    } else if (e.ctrlKey) {
        e.preventDefault();
        copyEntryWithTildes();
    }
});
enText.addEventListener('click', (e) => {
```

After the closing `});` of the cnText click listener and BEFORE the `enText.addEventListener('click', ...)` line, insert:

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

- [ ] **Step 3: Verify buttons are wired**

1. Reload `cn2en-json.html`
2. Load any favorite with a ruby-annotated CN sentence (paste JSON with `{{...}}...]]`)
3. Press Alt+P → modal opens
4. Cancel button → modal closes
5. Press Alt+P again → reopens
6. Click backdrop → modal closes
7. Reload page, repeat — both methods work

- [ ] **Step 4: Validate JS syntax**

Run:

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('C:/Users/10691/Documents/GitHub/html-tools/cn2en-json.html','utf8');const m=s.match(/<script>([\s\S]*?)<\/script>/);fs.writeFileSync('C:/Users/10691/AppData/Local/Temp/cn2en_ruby_task5.js',m[1]);" && node --check "C:/Users/10691/AppData/Local/Temp/cn2en_ruby_task5.js" && echo OK
```

Expected: `OK`

---

## Task 6: Add Escape branch + update modal-hidden checks + Alt+P hotkey

**Files:**
- Modify: `cn2en-json.html:1851-1855` (Escape branch, after `closeCardsModal()` line)
- Modify: `cn2en-json.html` (six modal-hidden checks: lines ~1861, 2241, 2250, 2280, 2288, 2308)
- Modify: `cn2en-json.html:~2307` (Alt+P branch, near existing Alt+C branch)

- [ ] **Step 1: Add Escape branch for `rubyNotesModal`**

Find the Escape block (around line 1851). The relevant part is:

```js
} else if (!cardsModal.hidden) {
    e.preventDefault();
    e.stopPropagation();
    closeCardsModal();
} else if (!cnModal.hidden) {
```

Insert a new branch between these two:

```js
} else if (!rubyNotesModal.hidden) {
    e.preventDefault();
    e.stopPropagation();
    closeRubyNotesModal();
} else if (!cnModal.hidden) {
```

- [ ] **Step 2: Update the inverted check at line ~1861**

Find:

```js
if (!favSaveModal.hidden || !noteModal.hidden || !jsonEditModal.hidden || !cardsModal.hidden) {
    return;
}
```

Replace with:

```js
if (!favSaveModal.hidden || !noteModal.hidden || !jsonEditModal.hidden || !cardsModal.hidden || !rubyNotesModal.hidden) {
    return;
}
```

- [ ] **Step 3: Update the five shared-mode checks**

There are five other lines that share the form:

```
... favSaveModal.hidden && noteModal.hidden && jsonEditModal.hidden && cardsModal.hidden
```

Located at approximately:
- Line 2241 (Ctrl+V)
- Line 2250 (Ctrl+X)
- Line 2280 (KeyZ)
- Line 2288 (block-start for Arrow/Number keys)
- Line 2308 (Alt+C branch's modal-hidden check)

For each, append ` && rubyNotesModal.hidden` so the condition becomes:

```
... favSaveModal.hidden && noteModal.hidden && jsonEditModal.hidden && cardsModal.hidden && rubyNotesModal.hidden
```

To do this safely, use `replace_all` on the exact substring:

```
"favSaveModal.hidden && noteModal.hidden && jsonEditModal.hidden && cardsModal.hidden"
```

Replace with:

```
"favSaveModal.hidden && noteModal.hidden && jsonEditModal.hidden && cardsModal.hidden && rubyNotesModal.hidden"
```

Edit tool with `replace_all: true` handles all five at once. After applying, run `grep -c "rubyNotesModal.hidden" cn2en-json.html` and ensure the count is **at least 7** (one Escape branch check + 6 modal-hidden checks: 1 inverted + 5 shared-mode + 1 in the new Escape branch).

Expected `grep -c` count: 7 (after this step).

- [ ] **Step 4: Add Alt+P hotkey branch**

Find the existing Alt+C branch (around line 2307):

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

After its closing `}` (the one that pairs with the `if` opening), insert:

```js
if (e.altKey && !e.ctrlKey && !e.shiftKey && e.code === 'KeyP') {
    if (!favSaveModal.hidden || !noteModal.hidden || !jsonEditModal.hidden || !cardsModal.hidden || !rubyNotesModal.hidden) return;
    if (!currentFavId) return;
    if (cnText.querySelectorAll('ruby').length === 0) return;
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    e.preventDefault();
    openRubyNotesModal();
    return;
}
```

- [ ] **Step 5: Validate JS syntax**

Run:

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('C:/Users/10691/Documents/GitHub/html-tools/cn2en-json.html','utf8');const m=s.match(/<script>([\s\S]*?)<\/script>/);fs.writeFileSync('C:/Users/10691/AppData/Local/Temp/cn2en_ruby_task6.js',m[1]);" && node --check "C:/Users/10691/AppData/Local/Temp/cn2en_ruby_task6.js" && echo OK
```

Expected: `OK`

- [ ] **Step 6: Confirm modal-hidden check count**

Run:

```bash
grep -c "rubyNotesModal.hidden" "C:/Users/10691/Documents/GitHub/html-tools/cn2en-json.html"
```

Expected: at least `7` (1 Escape branch + 1 inverted check at line ~1861 + 5 shared-mode checks).

---

## Task 7: Final manual verification

- [ ] **Step 1: End-to-end scenario**

1. Open `cn2en-json.html` in browser
2. Paste JSON containing ruby annotations (e.g., the spec's driving-example JSON)
3. Confirm it auto-matches an existing favorite (if not, save it via Ctrl+S first)
4. Press Alt+P — modal opens, list shows one row per `<ruby>` element with empty textareas
5. In the first row, type "发音练习"
6. In the second row, type "常用搭配\n第二行" (multi-line)
7. Press Escape — modal closes
8. Refresh page (F5), re-trigger hash match, press Alt+P — both notes present
9. Hover the first `<ruby>` in cnText — small tooltip follows cursor with "发音练习"
10. Move mouse — tooltip follows (via mousemove listener)
11. Move mouse off the ruby — tooltip hides
12. Hover an unfilled `<ruby>` — no tooltip
13. Press Alt+P on a sentence with NO ruby elements — no modal, no response
14. Without a favorite loaded, press Alt+P — no response
15. Press Escape while modal is open — modal closes, notes persisted

- [ ] **Step 2: Done**

If all checks pass, the implementation matches `docs/superpowers/specs/2026-10-06-cn2en-ruby-notes-design.md`.

---

## Reminder: no git operations

Implementers (whether subagents or the controller) must NOT run `git add`, `git commit`, `git push`, or any other git operation during plan execution. The user reviews the working tree and commits manually. See `memory/feedback_no_subagent_commits.md`.