# Edge Card-Timer Sidebar Extension — Design

**Goal:** Build a Microsoft Edge (Manifest V3) browser extension that displays `card-timer.html` on the right side of any web page, with the same Ctrl+O toggle and Q/W/E selection-to-card interaction already used by `cn2en-json.html` and `code-explain.html`.

**Architecture:** A single content script injects an `<iframe>` and matching styles into every page. The content script captures keyboard shortcuts and selection, and talks to the iframe directly via `postMessage` using the existing protocol. No background script, no popup HTML.

**Tech Stack:** Plain JavaScript, no dependencies, no build step.

---

## Decisions (confirmed with user)

| Question | Answer |
| --- | --- |
| Trigger UX | Keyboard shortcut toggle (default closed) |
| Selection interaction | Full Q/W/E (matches cn2en-json/code-explain) |
| Layout when open | Push page content (40vw reserved for iframe) |
| Toggle shortcut | Ctrl+O (matches cn2en-json/code-explain) |
| Card-timer source | `https://don-up.github.io/tools/card-timer` (online URL) |
| Distribution | Local "Load unpacked" only |

---

## File layout

```
card-timer-sidebar/
├── manifest.json   # MV3 manifest
├── content.js      # injected on every page
└── README.md       # load-unpacked install steps
```

Lives at the repo root next to the other HTML utilities. No background script, no popup HTML, no icons (Edge shows a default placeholder for unpacked extensions).

---

## `manifest.json`

```json
{
  "manifest_version": 3,
  "name": "Card Timer Sidebar",
  "version": "0.1.0",
  "description": "Show card-timer.html on the right side of any web page.",
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }]
}
```

`document_idle` so the page DOM exists before the script runs. No `host_permissions` or `web_accessible_resources` are needed: the iframe URL is a remote origin (`https://don-up.github.io/tools/card-timer`), loaded directly by the iframe element rather than via `chrome.runtime.getURL`.

---

## `content.js`

The content script has one job: inject the iframe + styles on every page, and translate user input into `postMessage` calls to that iframe.

### 1. Style injection (idempotent)

Insert a `<style>` element with id `card-timer-sidebar-styles` containing:

```css
#cardTimerSidebar {
    position: fixed;
    top: 0;
    right: 0;
    width: 40vw;
    height: 100vh;
    border: none;
    background: #121212;
    z-index: 2147483647;
    display: none;
}
#cardTimerSidebar.shown { display: block; }
body.card-timer-sidebar-open { padding-right: 40vw; }
```

Notes:
- `z-index: 2147483647` is the max int32, ensuring the iframe stays above site content even on pages with high z-indexes.
- Class name on body is namespaced (`card-timer-sidebar-open`) to avoid colliding with cn2en-json/code-explain's `side-panel-open`.
- If a style element with the same id already exists, skip injection (handles re-injection on some SPA navigations).

### 2. Iframe injection (idempotent)

Insert `<iframe id="cardTimerSidebar" src="https://don-up.github.io/tools/card-timer"></iframe>` into `document.body` (or `document.documentElement` if `body` is missing) — skip if an element with that id already exists.

### 3. Keydown handler (single listener on `document`)

```js
document.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    const inEditableField = tag === 'INPUT' || tag === 'TEXTAREA';

    // Ctrl+O: toggle sidebar
    if (e.ctrlKey && !e.shiftKey && !e.altKey && e.code === 'KeyO') {
        e.preventDefault();
        const shown = iframe.classList.toggle('shown');
        document.body.classList.toggle('card-timer-sidebar-open', shown);
        return;
    }

    // Q/W/E: forward selection (skip while typing in inputs)
    if (!e.ctrlKey && !e.altKey && !e.metaKey && !inEditableField) {
        const sel = window.getSelection()?.toString().trim();
        if (!sel) return;
        let type;
        if (e.key === 'q' || e.key === 'Q') type = 'cn-en-q';
        else if (e.key === 'w' || e.key === 'W') type = 'cn-en-append';
        else if (e.key === 'e' || e.key === 'E') type = 'cn-en-br';
        if (!type) return;
        e.preventDefault();
        iframe.contentWindow?.postMessage({ type, content: sel }, '*');
    }
});
```

This mirrors the cn2en-json/code-explain handler (lines 2100–2128 and 2475–2480 in `cn2en-json.html`) so user muscle memory transfers.

### 4. `iframe` reference

Resolve the iframe element **after** injection:

```js
const iframe = document.getElementById('cardTimerSidebar');
```

The style/iframe injection and the keydown handler all run inside an `init()` function called once at the end of the content script. Because `run_at: document_idle` guarantees the DOM is parsed, `document.body` and `document.getElementById` work as expected.

---

## Reused protocol (no changes to `card-timer.html`)

| Direction | Message type | Purpose |
| --- | --- | --- |
| extension → iframe | `cn-en-q` | Set card name from selection, focus input |
| extension → iframe | `cn-en-append` | Append `<br>{{sel}}` and auto-confirm |
| extension → iframe | `cn-en-br` | Append `<br>{sel}` without confirm |

These are exactly the three selection-forwarding message types `cn2en-json.html` and `code-explain.html` already use. `card-timer.html` lines 1907–1928 already accept them — no changes required to the receiver. (Note: `cn-en` is not sent by the extension — its handler in `card-timer.html` is guarded by `e.data.content` and would silently ignore the empty payload, so there is no useful "wake" message to send on open. The iframe loads and initializes itself when its `src` is fetched.)

---

## Edge cases

- **State on navigation:** reloading the page tears down the iframe; in-progress card editing is lost. Same trade-off as cn2en-json's iframe (accepted).
- **CSP / `frame-src` restrictions:** sites with strict `frame-src` policies may block the remote iframe. Documented in README; not mitigated.
- **SPA navigation (e.g. YouTube, Twitter):** content scripts don't re-run on in-page route changes, so the iframe persists across SPA navigation within the same document. That's a feature, not a bug.
- **Multiple frames (iframes within the page):** content script only runs in the top-level document by default. Nested iframes are out of scope.
- **iframe load timing on Ctrl+O:** the first open may have a momentary blank panel while `card-timer.html` finishes loading on `https://don-up.github.io`. Loading starts at script injection time (not on open), so by the time the user presses Ctrl+O the iframe is usually cached. State (favorites, recent cards) persists via IndexedDB inside the iframe's origin.

---

## README.md

Brief install steps:

1. Open `edge://extensions/`.
2. Enable **Developer mode** (bottom-left toggle).
3. Click **Load unpacked** and select the `card-timer-sidebar/` folder.
4. Pin the extension from the toolbar (optional).
5. Press **Ctrl+O** on any web page to open the sidebar; **Q/W/E** to send the current text selection to card-timer.

Note: due to Chrome/Edge extension security, `Ctrl+O` may show a one-time "This extension is controlling the Ctrl+O shortcut" notice the first time it's pressed.

---

## Out of scope

- Toolbar icon / popup
- Options page (no settings needed)
- Chrome Web Store / Edge Add-ons submission
- Background service worker (not needed — content script handles everything)
- Cross-frame selection (only top-level `window.getSelection()`)
- Listening for outbound `cards` / `load-fav-by-name` messages from card-timer (not relevant for this extension's use case)
