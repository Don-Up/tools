# cn2en-json `cards` Field + CardTimer Bulk Push

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users attach a multi-line `cards` field to each entry in cn2en-json; on loading a favorite that contains non-empty cards, push every line through the embedded `card-timer.html` iframe as cloze-formatted timers via a new `cn-en-cards-bulk` postMessage type that reuses the existing Ctrl+Click Confirm pipeline. Provide an Alt+C modal to edit the current entry's `cards` field.

**Architecture:**
- **card-timer.html (root, vendored also in `anki-addons/cardtimer_for_anki/web/`)** — receives `{type: 'cn-en-cards-bulk', cards: <multi-line string>}`, runs the existing `convertText` (multi-line `cn|~en with marks~~|` → single-line `cn::~en_cloze` joined by `|||`), then calls the existing `createTimersWithDelay` to create one timer per card. Does not touch `cardNameInput`.
- **cn2en-json.html** — adds a 4th tuple element `cards` per entry. Collects all non-empty cards on `loadFavorite`, joins them with `\n`, posts one `cn-en-cards-bulk` message. New `#cardsEditModal` opens with Alt+C, edits only the cards field for the current entry, persists into fav payload + hash on save.
- **Vendored copy** — keep both copies in sync (root + `anki-addons/cardtimer_for_anki/web/card-timer.html`).

**Tech Stack:** Plain JS (no framework), HTML iframes, postMessage.

---

## 1. Data shape

`cards` is a per-article string (one per favorite), independent of any individual entry. It lives on the favorite record:

```js
{
  id,
  name,
  payload: [[cn, en], ...],   // existing — entries unchanged
  hash,                          // existing — hash of CN+EN pairs only
  cards: '我长长舒了一口气|~I let out a long sigh of relief~~|\n修完的那一刻|~The moment I finished the fix~~|\n...'
}
```

Entries themselves remain `[[cn, en], ...]` arrays (length 2). `hashEntries` continues to hash only CN+EN — **cards does NOT contribute to the fav hash**, so editing cards does not lose the fav badge.

Format per line: `cn|~en with marks~~|` (single-line). Trailing `|` on the last line is optional (`convertText` handles it). Lines are joined with `\n` to form the `cards` string.

Example (entire `cards` for one article):

```
我长长舒了一口气|~I let out a long sigh of relief~~|
修完的那一刻|~The moment I finished the fix~~|
一旦并发上来就会出问题|and once concurrency ~picked up~~, it ~started to break~~|
当时|~At the time~~|
定位到|~pinpointed it~~|
线上日志|~production logs~~|
一行不起眼的报错|~an inconspicuous error line~~|
本地怎么都复现不出来|~I couldn't reproduce it locally no matter what~~|
那个困扰了我整整三天的 bug|~the bug that had been haunting me for three whole days~~|
```

## 2. card-timer.html changes

### 2.1 New postMessage handler

Add to the existing `window.addEventListener('message', ...)` block in `card-timer.html` (next to the existing `anki-push` / `cn-en-q-confirm` handlers). Mirrors the existing Ctrl+Click Confirm pipeline (`card-timer.html:995-1009`) but reads from `e.data.cards` instead of clipboard:

```js
if (e.data?.type === 'cn-en-cards-bulk' && typeof e.data.cards === 'string' && e.data.cards.trim()) {
    const converted = convertText(e.data.cards);
    const cardNames = converted.split('|||').filter(n => n);
    createTimersWithDelay(cardNames);
}
```

No input field reset (Ctrl+Click's reset of `cardNameInput` is intentionally NOT mirrored because cn2en doesn't expect input state to change).

### 2.2 Vendored copy sync

The same handler must be added to `anki-addons/cardtimer_for_anki/web/card-timer.html` (the Anki addon embeds its own copy). Both files are kept in lockstep for this feature.

## 3. cn2en-json.html changes

### 3.1 Favorite record shape

`loadFavorite(fav)` reads `entries = fav.payload` as before. A new helper `getCurrentFavCards()` returns the current favorite's `cards` string (or `''` if absent). A new helper `setCurrentFavCards(cards)` writes back to the current favorite in the in-memory `favorites` array and persists via `updateFavorite(currentFavId, { cards })`.

### 3.2 `loadFavorite` push

In `loadFavorite(fav)` after `entries = payload` and `render()`, before `setFavStatus(fav)`:

```js
pushCardsToChild();
```

`pushCardsToChild()` opens the side panel if hidden, then posts the current favorite's `cards` field (if non-empty):

```js
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

Only called from `loadFavorite`. Not invoked on `live`/`parse` paths (YAGNI: avoid duplicate pushes during paste/edit).

### 3.3 Alt+C modal

New modal following the `#noteModal` / `#jsonEditModal` pattern:

- Title: `卡片`
- Body: single `<textarea>` for the article's `cards` string (multi-line)
- Footer: 取消 / 确认 buttons
- Hidden by default; opens via Alt+C

Keyboard handler (added next to existing `KeyN` handler in the keydown listener):

```js
if (e.altKey && !e.ctrlKey && !e.shiftKey && e.code === 'KeyC'
    && favSaveModal.hidden && noteModal.hidden && jsonEditModal.hidden
    && cardsEditModal.hidden) {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (!currentFavId) return;
    e.preventDefault();
    openCardsEditModal();
}
```

`openCardsEditModal()` / `closeCardsEditModal()` / `saveCardsEdit()` follow the same lifecycle as the note modal:

- Open: load current favorite's `cards` into textarea; show modal; focus textarea.
- Cancel/Escape: close without writing.
- Save: write back via `setCurrentFavCards(textarea.value)`; close.

`Alt+C` only fires when `currentFavId` is set (i.e. a favorite is currently loaded). Without a loaded favorite there is no `cards` field to edit.

## 4. Escape handling

Extend the existing Escape handler block (`cn2en-json.html:1680-1754`) with a case for `cardsEditModal`:

```js
} else if (!cardsEditModal.hidden) {
    e.preventDefault();
    closeCardsEditModal();
}
```

## 5. What's intentionally NOT in this scope

- No changes to JSON edit modal (cards not exposed there)
- No hash recompute when cards change
- No per-entry cards (only per-article)
- No copy/move/delete individual cards within the modal
- No re-push hotkey (push is by-load only)
- No migration of old favorites (cards is optional; old favs without `cards` just skip push)

## 6. Files modified

- `card-timer.html` — add `cn-en-cards-bulk` handler
- `anki-addons/cardtimer_for_anki/web/card-timer.html` — same handler (kept in sync)
- `cn2en-json.html` — add `#cardsEditModal` HTML/CSS/handlers, `getCurrentFavCards()` / `setCurrentFavCards()` / `pushCardsToChild()`, Alt+C hotkey, Escape case, `loadFavorite` push call