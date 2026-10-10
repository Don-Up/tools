# Card Timer Sidebar Extension — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Commit note:** Per user preference, implementer subagents MUST NOT commit. Leave all files uncommitted for the user to review and commit manually.

**Goal:** Build an unpacked Microsoft Edge (Manifest V3) browser extension that displays `card-timer.html` on the right side of any web page, toggled by Ctrl+O, with Q/W/E forwarding the current text selection to card-timer.

**Architecture:** A single Manifest V3 content script (no background script, no popup) injects an `<iframe>` and matching CSS into every page. The content script captures keyboard shortcuts and the page's current selection, then sends them to the iframe via `postMessage` using the existing `cn-en-q` / `cn-en-append` / `cn-en-br` protocol already accepted by `card-timer.html`.

**Tech Stack:** Plain JavaScript (no build step), MV3 manifest, no dependencies.

**Spec:** `docs/superpowers/specs/2026-10-07-edge-cardtimer-sidebar-design.md`

---

## File Structure

```
card-timer-sidebar/      # new folder at repo root
├── manifest.json        # MV3 manifest (Task 1)
├── content.js           # content script: iframe + styles + keydown (Task 2)
└── README.md            # install instructions (Task 1)
```

Three files. No background script, no popup HTML, no icons (Edge shows a default placeholder for unpacked extensions). Each file has one responsibility: manifest declares, content.js injects, README documents.

---

### Task 1: Scaffold `manifest.json` and `README.md`

**Files:**
- Create: `card-timer-sidebar/manifest.json`
- Create: `card-timer-sidebar/README.md`

- [ ] **Step 1: Create the folder**

```bash
mkdir -p card-timer-sidebar
```

- [ ] **Step 2: Write `card-timer-sidebar/manifest.json`**

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

`document_idle` so the page DOM exists before `content.js` runs. No `host_permissions` or `web_accessible_resources` are needed — the iframe URL is a remote origin loaded directly by the iframe `src` attribute, not via `chrome.runtime.getURL`.

- [ ] **Step 3: Write `card-timer-sidebar/README.md`**

```markdown
# Card Timer Sidebar

Edge/Chrome extension that shows [card-timer](https://don-up.github.io/tools/card-timer) on the right side of any web page.

## Install (unpacked)

1. Open `edge://extensions/` (or `chrome://extensions/`).
2. Enable **Developer mode** (bottom-left toggle).
3. Click **Load unpacked** and select this `card-timer-sidebar/` folder.
4. (Optional) Pin the extension from the toolbar.

## Usage

| Shortcut | Action |
| --- | --- |
| `Ctrl+O` | Toggle the card-timer sidebar |
| `Q` | Send current text selection as the card name (focuses input) |
| `W` | Append `<br>{{selection}}` to the card input and auto-confirm |
| `E` | Append `<br>{selection}` to the card input without confirming |

Q/W/E are skipped while typing in `INPUT` or `TEXTAREA` elements.

State (favorites, recent cards) lives in IndexedDB inside the iframe and persists across sidebar toggles.

## Notes

- First time you press `Ctrl+O`, Edge may show a one-time notice that the extension is controlling the shortcut.
- On page reload, the iframe is reinjected; in-progress card editing is lost (same behavior as the iframe embedded in `cn2en-json.html`).
- Some sites with strict `frame-src` CSP may block the iframe; that's a site policy, not an extension bug.
```

- [ ] **Step 4: Validate the manifest parses as JSON**

Run:

```bash
python -m json.tool card-timer-sidebar/manifest.json
```

Expected: the JSON content echoed back to stdout with no errors.

---

### Task 2: Implement `content.js`

**Files:**
- Create: `card-timer-sidebar/content.js`

- [ ] **Step 1: Write the full `content.js`**

Create `card-timer-sidebar/content.js` with this exact content:

```js
(function () {
    'use strict';

    const IFRAME_ID = 'cardTimerSidebar';
    const STYLE_ID = 'card-timer-sidebar-styles';
    const BODY_CLASS = 'card-timer-sidebar-open';
    const IFRAME_SRC = 'https://don-up.github.io/tools/card-timer';

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
#${IFRAME_ID} {
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
#${IFRAME_ID}.shown { display: block; }
body.${BODY_CLASS} { padding-right: 40vw; }
`;
        document.documentElement.appendChild(style);
    }

    function injectIframe() {
        if (document.getElementById(IFRAME_ID)) return document.getElementById(IFRAME_ID);
        const root = document.body || document.documentElement;
        const iframe = document.createElement('iframe');
        iframe.id = IFRAME_ID;
        iframe.src = IFRAME_SRC;
        iframe.setAttribute('allow', '');
        root.appendChild(iframe);
        return iframe;
    }

    function wireKeydown(iframe) {
        document.addEventListener('keydown', (e) => {
            const tag = (e.target && e.target.tagName) || '';
            const inEditableField = tag === 'INPUT' || tag === 'TEXTAREA';

            if (e.ctrlKey && !e.shiftKey && !e.altKey && e.code === 'KeyO') {
                e.preventDefault();
                const shown = iframe.classList.toggle('shown');
                document.body.classList.toggle(BODY_CLASS, shown);
                return;
            }

            if (e.ctrlKey || e.altKey || e.metaKey || inEditableField) return;

            const sel = window.getSelection && window.getSelection().toString().trim();
            if (!sel) return;

            let type = null;
            if (e.key === 'q' || e.key === 'Q') type = 'cn-en-q';
            else if (e.key === 'w' || e.key === 'W') type = 'cn-en-append';
            else if (e.key === 'e' || e.key === 'E') type = 'cn-en-br';
            if (!type) return;

            e.preventDefault();
            iframe.contentWindow && iframe.contentWindow.postMessage(
                { type: type, content: sel }, '*');
        });
    }

    function init() {
        injectStyles();
        const iframe = injectIframe();
        wireKeydown(iframe);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
```

Key decisions baked in (matches spec):
- IIFE wrapper keeps variables out of the page's global scope.
- `injectStyles` / `injectIframe` are idempotent — safe against re-injection on SPA navigations or hot-reload.
- `z-index: 2147483647` (max int32) keeps the sidebar above page content.
- Default state: no `shown` class → sidebar is closed until the user presses Ctrl+O.
- Body class `card-timer-sidebar-open` (namespaced) avoids collision with cn2en-json's `side-panel-open`.
- Q/W/E check `tag === 'INPUT' || tag === 'TEXTAREA'` so shortcuts don't intercept typing.
- Empty selection short-circuits — no spurious postMessages.
- `init()` is called on `DOMContentLoaded` if the script runs while still parsing, or immediately otherwise (extra safety beyond `run_at: document_idle`).

- [ ] **Step 2: Validate JS syntax**

Run:

```bash
node --check card-timer-sidebar/content.js
```

Expected: no output, exit code 0.

- [ ] **Step 3: Confirm both files exist with the expected sizes**

Run:

```bash
ls -la card-timer-sidebar/
```

Expected output (approximate sizes):

```
README.md
content.js
manifest.json
```

`content.js` should be ~1.5–2 KB, `manifest.json` should be ~250 bytes, `README.md` should be ~1 KB.

---

### Task 3: Aggregate static validation

**Files:** none (validation only)

- [ ] **Step 1: Re-validate manifest JSON**

Run:

```bash
python -m json.tool card-timer-sidebar/manifest.json > /dev/null && echo "manifest.json OK"
```

Expected: prints `manifest.json OK`.

- [ ] **Step 2: Re-validate content.js syntax**

Run:

```bash
node --check card-timer-sidebar/content.js && echo "content.js OK"
```

Expected: prints `content.js OK`.

- [ ] **Step 3: Confirm the iframe URL is reachable (informational only — does not block)**

Run:

```bash
curl -sI -o /dev/null -w "%{http_code}\n" https://don-up.github.io/tools/card-timer
```

Expected: `200`. (If this fails, the network is down or the URL moved; the extension itself is still correct, just unreachable for testing.)

---

### Task 4: Manual verification (user)

This task is **not** delegated to a subagent — the implementer cannot click in a browser. The user performs these checks:

**Pre-flight: load the extension**

1. Open `edge://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked** → choose `card-timer-sidebar/`.
4. Confirm the extension appears with no error indicators.

**Test 1: Ctrl+O toggle on a plain page**

1. Navigate to `https://example.com/` (or any page with body content).
2. Press **Ctrl+O**. Expect: a dark 40vw sidebar appears on the right, page content shifts left by 40vw. Edge may show a one-time "this extension is controlling Ctrl+O" notice — accept it.
3. Press **Ctrl+O** again. Expect: sidebar hides, page returns to full width.

**Test 2: Q sends selection to card name input**

1. With sidebar open, on the test page, select any text (e.g. "Example Domain").
2. Press **Q**. Expect: card-timer's "card name" input now contains that text, and the input has focus.

**Test 3: W appends and auto-confirms**

1. Clear the card-timer card-name input.
2. Select different text on the page, press **W**. Expect: input now contains `<br>{{that text}}`, and card-timer clicks its confirm button (a card should be created / advanced).

**Test 4: E appends without confirming**

1. Clear the card-timer card-name input.
2. Select text on the page, press **E**. Expect: input contains `<br>{text}`, no confirm fired.

**Test 5: Q/W/E ignored while typing**

1. With sidebar open, click into any `INPUT` on the page (e.g. a search box).
2. Press **Q**. Expect: lowercase `q` is typed into the input, no postMessage fired.

**Test 6: Empty selection is a no-op**

1. With sidebar open, deselect all text, press **Q**. Expect: nothing happens (no errors in DevTools console).

**Test 7: Persistence across SPA navigation**

1. Open `https://github.com/` and click into a different repo (SPA navigation, no full reload).
2. Expect: sidebar stays open if it was open. If it closed, that's acceptable — sidebar state is per-content-script lifetime.

**DevTools check**

1. Open DevTools → Console.
2. Perform tests 1–6. Expect: no errors or warnings logged by the content script.

If any test fails, report back the test number and observed behavior; do not modify the extension without checking with the user first.
