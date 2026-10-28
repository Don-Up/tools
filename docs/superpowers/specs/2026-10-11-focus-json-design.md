# focus-json.html Design Specification

## Goal

Add a single-file HTML page `focus-json.html` that accepts JSON in the shape
`{ "english sentence": "chinese sentence", ... }` (plain object, string → string
entries) and walks through it **one entry at a time**, in the same dark-theme,
"focused reading" style as the existing `focus-text.html`.

## Problem

The user wants to focus on one CN/EN pair at a time, with very large fonts for
comfortable reading on a projected screen / second-monitor reference. Pasting
arbitrary-length JSON should immediately give a focused reading experience with
arrow-key navigation, no setup, no settings.

## Approach

Mirror `focus-text.html` exactly. Replace the `parseText(...)` step with a JSON
parse + `Object.entries()` mapping. Keep the same card layout, divider, status
row, dark theme, no-settings minimalism. The only structural changes are
in `parseJson()` and slightly larger fonts (this page is "super large" per spec).

## Visual Layout

```
┌──────────────────────────────────────────────┐
│                                              │
│   ┌────────────────────────────────────────┐ │
│   │ The export tasks finally have a home   │ │  <- .en, 72px
│   │ in the UI                              │ │
│   ├────────────────────────────────────────┤ │
│   │ 导出任务终于在前端有自己的页面了        │ │  <- .cn, 40px
│   └────────────────────────────────────────┘ │
│                                              │
│         1 / 9    ← → 切换                   │
└──────────────────────────────────────────────┘
```

- Body: dark `#1e1e1e` background, centered column, padding `48px 5vw`.
- Stage: full-width centered container, max-width `1200px`.
- Card: `background: #252525`, `border: 1px solid #333`, `border-radius: 12px`,
  `padding: 60px 72px`, centered.
- EN (top): `font-size: 72px`, `line-height: 1.4`, `color: #e0e0e0`,
  `word-break: break-word`, `font-weight: 500`.
- Divider: `border-top: 1px solid #333`, `margin: 36px 0`.
- CN (bottom): `font-size: 40px`, `line-height: 1.5`, `color: #b0bec5`,
  `word-break: break-word`.
- Status row: `margin-top: 32px`, centered, `color: #888`, `font-size: 18px`,
  `font-family: 'Consolas', 'Monaco', monospace`. Inner `<kbd>` styled the
  same way as focus-text (inline-block, padding 2px 8px, bg `#2c2c2c`,
  border `#444`, radius 4px, color `#b0bec5`).

## Empty / Error States

Three mutually-exclusive render paths:

1. **No JSON pasted yet** (initial load or after Esc-clear): centered
   `.hint` div with HTML `按 <kbd>Ctrl</kbd> + <kbd>V</kbd> 粘贴 JSON`,
   `color: #888`, `font-size: 24px`, `line-height: 1.8`.
2. **JSON parse failure** (e.g. trailing comma, missing brace): centered
   `.error` div, `color: #ef5350`, `font-size: 20px`,
   text content = `'JSON 解析失败: ' + err.message`.
3. **Parsed successfully but entries is empty** (e.g. `{}` or non-object):
   centered `.error` div, `color: #ef5350`, `font-size: 20px`,
   text content = `'没有解析到任何条目'`.

## Architecture

Single-file HTML (`focus-json.html`) at repo root, mirroring `focus-text.html`:

```html
<head>
  <meta charset / viewport>
  <title>focus-json</title>
  <style>... dark-theme CSS ...</style>
</head>
<body>
  <div class="stage" id="stage">
    <div class="hint">按 Ctrl + V 粘贴 JSON</div>
  </div>
  <script>
    'use strict';
    let entries = [];   // [{ en, cn }, ...]
    let currentIndex = 0;
    const stage = document.getElementById('stage');

    function parseJson(text) { ... }     // text → entries
    function render() { ... }           // paint stage from entries + currentIndex
    function loadJson(text) { ... }     // parse + reset index + render

    document.addEventListener('paste', (e) => { ... });
    document.addEventListener('keydown', (e) => { ... });
  </script>
</body>
```

## Parsing

`parseJson(text)`:

1. `let obj; try { obj = JSON.parse(text); } catch (err) { throw new Error(err.message); }`
2. If `obj` is not a non-null object, throw `'输入不是 JSON 对象'`.
3. `entries = Object.entries(obj).map(([en, cn]) => ({ en: String(en), cn: String(cn) }))`.
   Both keys and values are coerced to string — JSON allows numbers / booleans /
   null; we stringify them so the renderer never has to worry about types.
4. Return `entries.length`.

`loadJson(text)`:

1. Wrap `parseJson(text)` in try / catch.
2. On error: `stage.innerHTML = ''`; append `.error` div with the message;
   clear `entries`, `currentIndex = 0`.
3. On success: if `entries.length === 0` → render the empty-entries error.
   Otherwise: `currentIndex = 0`, `render()`.

## Rendering

`render()`:

1. `stage.innerHTML = ''`.
2. If `entries.length === 0`: append the centered `.hint` (Ctrl+V paste) and
   return. (Used only when entries got cleared, which currently never happens —
   but defensive.)
3. Build `.card` div, append `.en` (textContent = `entries[i].en`), divider
   div, `.cn` (textContent = `entries[i].cn`). Append card to stage.
4. Build `.status` div, innerHTML = ``${currentIndex + 1} / ${entries.length}&nbsp;&nbsp;<kbd>←</kbd><kbd>→</kbd> 切换``.
   Append to stage.

## Keyboard Navigation

Single document-level keydown listener (matching focus-text):

- `ArrowRight` or `ArrowDown` → `currentIndex++` if not at last;
  `render()`.
- `ArrowLeft` or `ArrowUp` → `currentIndex--` if not at first; `render()`.
- No wrap-around (matches focus-text behavior).
- All other keys: ignored.

The listener bails immediately if `entries.length === 0`.

## Paste Handling

Document-level `paste` listener:

```js
document.addEventListener('paste', (e) => {
    const text = (e.clipboardData || window.clipboardData).getData('text');
    if (!text) return;
    e.preventDefault();
    loadJson(text);
});
```

`e.preventDefault()` is called so the paste doesn't also dump raw text into
the document. `loadJson()` handles all error / success paths.

## Error Handling

Single function path — no banner, no toast, no console-only failures:

| Trigger | UI |
|---|---|
| Invalid JSON syntax | Red `.error` div, message `'JSON 解析失败: ' + err.message` |
| Valid JSON but not an object (`null`, array, number) | Red `.error` div, `'输入不是 JSON 对象'` |
| Empty object `{}` | Red `.error` div, `'没有解析到任何条目'` |
| Any uncaught exception during render | Red `.error` div, message = `err.message` |

After any error path, the next valid paste replaces the error display
immediately via `loadJson()` → `render()`.

## Persistence

None. This matches `focus-text.html`: no `localStorage` writes for content.
A page reload clears entries and shows the initial Ctrl+V hint.

## Out of Scope

- TTS / Highlight controls (focus-text has them; not requested for this page)
- Settings / controls panel / Alt+H toggle
- localStorage persistence of entries or currentIndex
- Wrap-around navigation
- Editing or transforming JSON
- Nested JSON values (arrays, objects) — coerced to string via `String(value)`
- Multi-line / array / list-form JSON (only object-form `{"en": "cn"}`)
- iframe postMessage integration (focus-class has it; not requested here)
- Keyboard shortcut help modal

## Files

- **Create**: `focus-json.html` (single file, self-contained, ~150 lines)
- **No dependencies on other repo files**

## Testing Strategy

Manual only (project has no automated test stack):

1. Open `focus-json.html` in a browser. Verify initial state shows the centered
   "按 Ctrl + V 粘贴 JSON" hint.
2. Paste the spec example JSON. Verify:
   - All 9 entries parsed (status shows `1 / 9`).
   - First entry shows EN on top in large font, CN below in smaller font.
   - Card centered with dark theme.
3. Press `→` 8 times — verify status increments and content swaps each time.
4. Press `→` once more at the last entry — verify no-op (no wrap).
5. Press `←` to go back to the start. Press `←` again at first entry —
   verify no-op (no wrap).
6. Press `↓` and `↑` — verify they also navigate.
7. Paste a malformed JSON (e.g. `{"a": "b",`). Verify red error div with
   `JSON 解析失败: ...`.
8. Paste `[]` (array, not object). Verify red error `输入不是 JSON 对象`.
9. Paste `{}` (empty object). Verify red error `没有解析到任何条目`.
10. Paste valid JSON after an error — verify the error is replaced.
11. Refresh the page. Verify entries cleared and hint re-shown.
