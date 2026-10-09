# focus-class Implementation Spec

## Goal

Add a single-file HTML page `focus-class.html` that takes a Mermaid `classDiagram` source as input and walks through it **one class at a time**. Each step renders ONLY the focused class — together with its incident relationship arrows — at full canvas scale, in the same dark-theme style as the existing `focus-*` pages.

## Problem

When a class diagram grows large (the reference example has 10 classes + 12 relationships), a single full-graph view is unreadable: edges cross, labels collide, and no single class fits on screen at a useful size. The user wants to focus on one class at a time while still seeing how it connects to its neighbors.

## Approach

A minimal Mermaid source string is built per step, containing:
- the focused class (with its full body — attributes, methods, stereotype decorators)
- every relationship whose source OR target is the focused class

`mermaid.render()` is called fresh for each navigation. Because each slice has at most ~5 nodes (focused class + its immediate neighbors appearing as small endpoint stubs in the relationship arrows), the result always fits comfortably at large scale.

### Why re-render per step

- The focused class IS the diagram for that step. Re-rendering produces a fresh SVG sized to the stage automatically — no manual zoom math.
- Mermaid's id generation is consistent per render, so id-based element lookup for highlighting is unnecessary.
- One source of truth (the parsed model), no DOM-level SVG surgery.

## User Experience

1. User opens `focus-class.html` → centered hint "按 Ctrl + V 粘贴 mermaid 代码".
2. User pastes a `classDiagram` text → first class renders large. Bottom-right status shows `1 / N · ClassName`. The `×` close button (top-right) appears for parent-window integration.
3. User presses `→` or `↓` → next class renders, status updates.
4. User presses `←` or `↑` → previous class renders.
5. Wrap-around: pressing `→` on the last class wraps to the first; pressing `←` on the first wraps to the last.
6. `Esc` → returns to the centered hint (graph discarded).
7. If the page is hosted inside an iframe (e.g. the project's existing pattern of postMessage-driven iframes), the parent can send `{ type: 'focus-class-load', content: '<mermaid text>' }` to pre-populate content.

## Architecture

Single-file HTML (`focus-class.html`) at repo root, following the established pattern from `focus-mermaid.html`:

```
<head>
  <meta> + dark-theme <style>
  <script src="mermaid@10"> (CDN, same as focus-mermaid.html)
</head>
<body>
  <button id="closeBtn">×</button>     <!-- parent postMessage close -->
  <div class="stage" id="stage">      <!-- centered hint or SVG -->
    <div class="hint">按 Ctrl + V 粘贴 mermaid 代码</div>
  </div>
  <div class="status" id="status"></div>
  <script>
    // parse + slice + render
  </script>
</body>
```

### Parsing

`parseClassDiagram(text) → { classes: [...], edges: [...] }`:

- Classes are extracted from lines of the form `class Foo["Foo (description)"] { ... }`. The body lines (until matching `}`) are captured verbatim as `body` text, then re-spliced into the per-step source.
- Lines containing `-->`, `..>`, `--|>`, `..|>`, `..` etc. are relationships: capture `from`, `arrow` (`-->` / `..>` / `--|>` / `..|>` / plain `--`), `to`, and optional `": label"`.
- Non-class / non-relationship lines (mermaid directives like `classDiagram`, comments) are ignored.
- Class decorators like `<<controller, V1.8c + V1.9>>` already live inside the `{ ... }` body and stay attached.

### Per-step source construction

`buildClassSource(model, index)` returns a string like:

```
classDiagram
  direction LR
  class FocusedClass["FocusedClass (description)"] {
    <<stereotype>>
    +method() ReturnType
  }
  FocusedClass --> OtherClass : label
  OtherClass ..> FocusedClass : label
```

The `direction LR` declaration keeps the diagram horizontal so it fills a wide stage. Each incident edge is emitted as-is from the original source (the original arrow type and label are preserved). If a relationship references a class not present in the input (rare but possible), it is dropped silently with a `console.warn`.

### Rendering

Identical to `focus-mermaid.html`:

1. Increment a render counter (`mermaid-${counter}`) for unique element ids.
2. Call `window.mermaid.render(id, source)`.
3. On success: clear stage, wrap returned SVG in `<div class="mermaid-container">`, append.
4. On error: show error box with the parser/render message.
5. After success: update `status.textContent` with `${index+1} / ${model.classes.length} · ${className}`.

### Theming

Reuse the same `themeVariables` block from `focus-mermaid.html`:

```
primaryColor: '#252525'
primaryTextColor: '#e0e0e0'
primaryBorderColor: '#4fc3f7'
lineColor: '#81c784'
secondaryColor: '#2c2c2c'
tertiaryColor: '#1e1e1e'
background: '#1e1e1e'
fontFamily: system stack
```

Theme initialization happens once at startup, guarded by `if (window.mermaid)`.

### Navigation

```js
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape')            { showHint(); return; }
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { step(+1); return; }
  if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { step(-1); return; }
});
```

`step(delta)` clamps with wrap-around:
```js
const next = (currentIndex + delta + classes.length) % classes.length;
currentIndex = next;
renderCurrent();
```

`currentIndex` is module-scope state, default `0`. Pasting new text calls `loadAndRender(text)`, which parses into the module-scope `model`, sets `currentIndex = 0`, and calls `renderCurrent()`.

Both the paste handler and the `focus-class-load` postMessage handler call the same `loadAndRender(text)` entry point. `renderCurrent()` is what `step(delta)` and `loadAndRender()` both call after changing `currentIndex`.

### Parent-window integration

Mirror `focus-mermaid.html` exactly:

- The `closeBtn` click posts `{ type: 'focus-class-close' }` to `window.parent`.
- A `message` listener accepts `{ type: 'focus-class-load', content: string }` and renders it. On receipt, the close button also becomes visible (so the user knows they're in iframe mode).

Both the paste handler and the message handler call the same `loadAndRender(text)` function.

## Edge Cases

| Case | Behavior |
|------|----------|
| Empty paste / no text | Do nothing (return from handler). |
| Paste that parses to 0 classes | Show error: "未找到任何 class 定义". |
| Mermaid render error | Show error box, keep stage clean. |
| Class with no incident edges | Show class alone (no relationship lines). Status still updates. |
| Relationship referencing undefined class | Drop the relationship, log warning. |
| `←` on first class | Wraps to last. |
| `→` on last class | Wraps to first. |
| Paste while another render is in flight | Increment counter; the older render resolves to a stale id and is discarded on arrival (guard via `if (renderId !== latestRenderId) return;`). |
| `mermaid` CDN fails to load | Detect via the same `if (!window.mermaid)` check in render; show "mermaid.js 未加载,请检查网络". |

## Files

- **Create:** `focus-class.html` — the entire feature in one file (no external assets beyond the CDN).

No other files are touched.

## Testing

Manual, matching `focus-code.html` / `focus-mermaid.html` policy:

1. Paste the reference 10-class diagram. Verify the first class renders large.
2. Press `→` 9 times — each class appears, status counter increments.
3. Press `→` once more — wraps back to the first class.
4. Press `←` from first class — wraps to the last.
5. Press `Esc` from any class — returns to the centered hint.
6. Re-paste the same text on the hint stage — restarts at the first class.
7. While a class is showing, embed the page in an iframe and postMessage a new classDiagram — should re-render the first class of the new model.
8. Click the `×` button — parent receives `focus-class-close` message.
9. Paste garbage that doesn't parse — error box appears.

Tests are manual because the page's logic is JS-with-DOM only; there's no test harness in this repo (`_verify_code.js` exists for one-off verification but not as a runnable suite).

## Out of Scope

- Search / jump-to-class.
- Showing the full graph mini-map.
- Persisting the diagram across page reloads (no localStorage).
- Editing the mermaid source in-place.
- Animation between steps (instant swap is fine).
- Click-to-speak on the class body text (this is a navigation tool, not a narration tool).
