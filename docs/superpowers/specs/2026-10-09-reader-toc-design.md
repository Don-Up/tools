# Reader TOC Sidebar — Design

**Goal:** Add a left-side table-of-contents panel to `reader.html` that lists h1–h5 headings parsed from pasted markdown, auto-shows when headings exist, supports `Alt+H` toggle, and smooth-scrolls to the heading on click.

---

## Decisions (confirmed with user)

| Question | Answer |
| --- | --- |
| TOC appearance | Sidebar on the left |
| Visibility model | Auto-show when document contains headings (h1–h5) |
| Manual override | `Alt+H` toggles hidden/shown, persists across reloads |
| Click behavior | Scroll only (no TTS playback on TOC click) |
| Updates | Rebuilt every time `processText()` runs (covers all three paste flows) |

---

## File changes

Only `reader.html` is touched. Three sections change:

1. **`<style>`** — add CSS for `#tocPanel`, `.toc-entry`, `.toc-target`, `body.toc-open`, `body.toc-hidden`.
2. **`<body>`** — add the `<div id="tocPanel">` placeholder inside `#wrapper`.
3. **`<script>`** — modify `processText()` to stamp `id` + `class` on headings and call a new `renderTOC()` at the end; add an `Alt+H` branch to the keydown listener; restore the hidden preference on page load.

No new file is created.

---

## HTML

Insert a single empty container as the first child of `#wrapper` (so it renders above the background but doesn't shift the existing structure):

```html
<aside id="tocPanel" aria-label="Table of contents"></aside>
```

`<aside>` matches its semantic role; `aria-label` for screen readers.

---

## CSS

```css
#tocPanel {
    position: fixed;
    top: 0;             /* full height */
    left: 0;
    bottom: 0;
    width: 220px;
    background: #1e1e1e;
    border-right: 1px solid #333;
    overflow-y: auto;
    padding: 88px 0 10px 0;   /* 88px top padding clears the fixed .controls bar (60px height + 10px+10px padding = 80px, plus 8px breathing room); bottom keeps a 10px gutter above the viewport edge */
    box-sizing: border-box;
    z-index: 40;        /* below the .controls bar (z-index: 1000) and the right sidePanel */
    display: none;
    scrollbar-width: thin;
    scrollbar-color: #555 transparent;
}
#tocPanel::-webkit-scrollbar { width: 6px; }
#tocPanel::-webkit-scrollbar-track { background: transparent; }
#tocPanel::-webkit-scrollbar-thumb { background: #555; border-radius: 3px; }
#tocPanel::-webkit-scrollbar-thumb:hover { background: #777; }
body.toc-open #tocPanel { display: block; }
body.toc-open .container { margin-left: max(220px, calc(50vw - 400px)); }

#tocPanel:empty { display: none; }   /* no headings → no panel even when body has toc-open */

.toc-entry {
    display: block;
    padding: 4px 10px;
    color: #dfe1e5;
    cursor: pointer;
    font-family: "Corbel", 'Segoe UI', Tahoma, Verdana, sans-serif;
    font-size: 14px;
    line-height: 1.4;
    overflow-wrap: anywhere;          /* long headings wrap rather than overflow */
    text-decoration: none;            /* suppress the <a> default underline */
    transition: background-color 0.15s ease, color 0.15s ease;
}
.toc-entry:hover {
    background: #2c2c2c;
    color: #00BFFF;
}
.toc-entry:focus-visible {
    outline: 2px solid #00BFFF;
    outline-offset: -2px;
}
.toc-level-1 { padding-left: 10px; font-weight: 600; }
.toc-level-2 { padding-left: 20px; color: #FFA500; }
.toc-level-3 { padding-left: 30px; font-size: 13px; }
.toc-level-4 { padding-left: 40px; font-size: 13px; color: #b0b0b0; }
.toc-level-5 { padding-left: 50px; font-size: 12px; color: #b0b0b0; }

.toc-target {
    scroll-margin-top: 88px;          /* leave room for the fixed .controls bar (60px height + 10px+10px padding = 80px, plus 8px breathing room) */
}
```

Z-index layering recap:
- `.controls`: `1000`
- `.modal-overlay`, `.container-anim`: `100`
- `#sidePanel`: `50`
- `#tocPanel`: `40` (below the right panel — if both are open and overlap horizontally, the right one wins)

The container margin shift uses `margin-left: max(220px, calc(50vw - 400px))` to keep the reading area visually centered when the viewport is wide enough. The reading area's natural centered position assumes an 800px (50vw − 400px) half-width; once the viewport is at least 1240px wide, the formula yields ≥ 220px (clears the TOC) and continues to grow, so the container stays centered. For viewports narrower than 1240px the formula falls back to 220px (just clears the TOC). Additive with the right-side `body.side-panel-open { padding-right: 40vw }` rule — both can be active simultaneously, and the centering rebalances against the right-panel padding automatically.

---

## JavaScript

### 1. Stamp headings in `processText()`

Inside the existing heading branch (line ~1228):

```js
const headingMatch = line.match(/^(#{1,5})\s+(.*)/);
if (headingMatch) {
    const level = headingMatch[1].length;
    const text = headingMatch[2];
    const heading = document.createElement(`h${level}`);
    heading.id = `heading-${index}`;            // 'index' is the line index from the lines.forEach
    heading.classList.add('toc-target');
    // ... existing onclick + dataset.originalText + innerHTML unchanged ...
    contentDiv.appendChild(heading);
    return;
}
```

`index` is already in scope from the `lines.forEach((line, index) => {...})` at the top of `processText()`. Using line index as the id keeps it unique within one render and reproducible across re-renders (the same line produces the same id), so any in-flight `scrollIntoView` won't break if the user pastes twice quickly.

### 2. New `renderTOC()` function

Add immediately after `processText()`:

```js
function renderTOC() {
    const panel = document.getElementById('tocPanel');
    const targets = document.querySelectorAll('#content .toc-target');
    panel.innerHTML = '';

    if (targets.length === 0) {
        document.body.classList.remove('toc-open');
        return;
    }

    targets.forEach((heading) => {
        const level = parseInt(heading.tagName.substring(1), 10);   // h1 → 1
        const entry = document.createElement('a');
        entry.className = `toc-entry toc-level-${level}`;
        entry.href = `#${heading.id}`;                              // fragment URL → keyboard focusable, Enter activates, fallback nav
        entry.textContent = heading.textContent.trim();
        entry.addEventListener('click', (e) => {
            e.preventDefault();                                     // skip native jump, run smooth scroll instead
            heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        panel.appendChild(entry);
    });

    // Respect manual hide preference
    if (localStorage.getItem('tocHidden') !== 'true') {
        document.body.classList.add('toc-open');
    }
}
```

Notes:
- Uses native `<a>` with `href="#${heading.id}"` for keyboard accessibility (focusable, Enter activates, native fragment fallback). `preventDefault()` in the click handler skips the native instant jump so we can run `scrollIntoView({behavior: 'smooth'})`.
- `text-decoration: none` and a `:focus-visible` outline are required because the element is an `<a>` (without them, browsers underline it and the focus ring gets hidden).
- `toc-open` is only added when there are headings AND the user hasn't hidden it. `renderTOC()` is the single source of truth for visibility.

### 3. Call `renderTOC()` from `processText()`

At the end of `processText()` (after the existing `setTimeout` for code-block buttons, line ~1294):

```js
renderTOC();
```

This ensures it runs once per `processText()` call regardless of which paste path triggered it (textarea, clipboard via `ArrowRight`, or iframe postMessage from the book picker).

### 4. `Alt+H` handler

Add a branch to the existing `document.addEventListener('keydown', ...)` (around line 798):

```js
} else if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.code === 'KeyH') {
    event.preventDefault();
    const hidden = !document.body.classList.contains('toc-hidden');
    document.body.classList.toggle('toc-hidden', hidden);
    localStorage.setItem('tocHidden', hidden ? 'true' : 'false');
    // If revealing, ensure toc-open is set when headings exist
    if (!hidden && document.querySelectorAll('#content .toc-target').length > 0) {
        document.body.classList.add('toc-open');
    }
}
```

CSS companion:

```css
body.toc-hidden #tocPanel { display: none; }
```

Both selectors have equal CSS specificity (one id + one class + one element). The `toc-hidden` rule is placed later in the stylesheet so source order makes it win when both classes are on `<body>` simultaneously. No `!important` needed.

`Alt+H` works whether the panel is currently shown or hidden. After unhiding, the `if (!hidden && ...)` block ensures `toc-open` is added without waiting for the next `processText()` run (so the user can toggle between paste cycles).

### 5. Restore preference on page load

Near the other `localStorage.getItem` initializations (e.g. where `hideReadCheckbox` is read, line ~559):

```js
if (localStorage.getItem('tocHidden') === 'true') {
    document.body.classList.add('toc-hidden');
}
```

`renderTOC()` runs on the initial `processText()` call (triggered by `if (localStorage.getItem('text"))` block at line ~957) and will skip adding `toc-open` because `tocHidden` is `true`. If the user later unhides with `Alt+H`, `toc-open` is added in the handler above.

---

## Behavior matrix

| State | `toc-open` class | `toc-hidden` class | Panel visible? |
| --- | --- | --- | --- |
| No headings in document | absent | absent | No (`#tocPanel:empty`) |
| Headings, default (never toggled) | present | absent | Yes |
| Headings, user pressed Alt+H once | absent | present | No |
| No headings, user pressed Alt+H | absent | present | No (`#tocPanel:empty` + `toc-hidden` both agree) |
| Headings, user pressed Alt+H twice (back to default) | present | absent | Yes |

The `:empty` selector handles the "no headings" case cleanly — no JS state tracking needed for it.

---

## Edge cases

- **Long heading text:** `overflow-wrap: anywhere` on `.toc-entry` so a 200-char heading wraps inside the 220px panel instead of overflowing.
- **TOC overflows viewport:** `#tocPanel` has `overflow-y: auto`, so the list scrolls independently of the main `#wrapper`.
- **Existing heading `onclick` (TTS):** preserved unchanged. TOC click does NOT trigger TTS. Direct click on the rendered heading inside `#content` still plays the heading text via TTS, as before.
- **Right sidePanel interaction:** when both are open, content area shrinks but stays readable. No new CSS needed; the existing `body.side-panel-open` rule composes with the new `body.toc-open` rule.
- **Mermaid / table nodes are not headings** — they aren't matched by `^(#{1,5})\s+`, so they don't appear in the TOC. Intentional.
- **Heading inside a list item** (`- # foo`) is not a markdown heading — won't appear in TOC. Matches the existing parser's behavior (it falls into the list branch first).
- **Same heading text twice:** line-index ids guarantee uniqueness; both TOC entries point to different DOM nodes and scroll to their respective positions.

---

## Out of scope

- IntersectionObserver-based "current heading" highlighting
- Collapsible sub-trees
- TOC search/filter
- Keyboard navigation within the TOC (Tab still works via `<a>` focusability, but no arrow-key handling)
- Syncing TOC scroll position with main content scroll