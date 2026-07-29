# English Mask Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-contained `english.html` that reads clipboard text on Ctrl+V and masks English words inside `(...)`, showing only the first letter until hovered.

**Architecture:** Single HTML file with inline CSS/JS, matching the repo's `en-reading.html` / `test.html` style. Three layers: a clipboard reader (with `<textarea>` fallback), a pure render function returning a `DocumentFragment`, and a CSS hover reveal. No tests are added (no test framework in the repo); verification is via a documented manual smoke test.

**Tech Stack:** Vanilla HTML/CSS/JS, `navigator.clipboard.readText()`.

---

## File Structure

- **Create:** `english.html` — only file touched. Self-contained; no other files modified.

---

## Task 1: Scaffold page shell with markup, theme, layout

**Files:**
- Create: `english.html`

- [ ] **Step 1: Write the HTML scaffold**

Write the following content to `english.html` (overwriting the current empty file). This is the structural shell — clipboard wiring and masking are added in later tasks.

```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>English Mask</title>
    <style>
        :root {
            --bg: #121212;
            --panel: #1e1e1e;
            --border: #333;
            --text: #e0e0e0;
            --muted: #aaa;
            --mask-bg: #454545;
            --accent: #6aa9ff;
        }
        * { box-sizing: border-box; }
        body {
            background: var(--bg);
            color: var(--text);
            font-family: Arial, sans-serif;
            margin: 0;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            padding: 32px 16px;
        }
        .app {
            max-width: 880px;
            width: 100%;
        }
        h1 {
            margin: 0 0 4px;
            font-size: 22px;
        }
        .hint {
            color: var(--muted);
            font-size: 14px;
            margin: 0 0 16px;
        }
        .result {
            background: var(--panel);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 20px 24px;
            min-height: 220px;
            font-size: 20px;
            line-height: 1.7;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .result:empty::before {
            content: "Press Ctrl+V to paste text. Words inside ( ... ) will be masked.";
            color: var(--muted);
            font-size: 16px;
        }
        .word {
            display: inline-block;
            border-radius: 2px;
            background: var(--mask-bg);
            color: transparent;
            user-select: none;
            transition: background-color .15s ease, color .15s ease;
        }
        .word:hover {
            background: transparent;
            color: inherit;
        }
        .fallback {
            margin-top: 16px;
        }
        .fallback textarea {
            width: 100%;
            min-height: 80px;
            background: var(--panel);
            color: var(--text);
            border: 1px solid var(--border);
            border-radius: 4px;
            padding: 10px;
            font-size: 16px;
            font-family: inherit;
        }
        .toast {
            position: fixed;
            left: 50%;
            bottom: 32px;
            transform: translateX(-50%);
            background: #2a2a2a;
            color: var(--text);
            padding: 10px 16px;
            border-radius: 4px;
            border: 1px solid var(--border);
            font-size: 14px;
            opacity: 0;
            pointer-events: none;
            transition: opacity .2s ease;
        }
        .toast.visible { opacity: 1; }
        [hidden] { display: none !important; }
    </style>
</head>
<body>
    <div class="app">
        <h1>English Mask</h1>
        <p class="hint">Press <kbd>Ctrl</kbd>+<kbd>V</kbd> (or <kbd>⌘</kbd>+<kbd>V</kbd>) anywhere on this page.</p>
        <div id="result" class="result"></div>
        <div id="fallback" class="fallback" hidden>
            <p class="hint">Clipboard API unavailable. Paste here instead:</p>
            <textarea id="fallback-input" placeholder="Paste with Ctrl+V..."></textarea>
        </div>
    </div>
    <div id="toast" class="toast" hidden></div>
    <script>
        // Clipboard wiring and renderer land in Tasks 2-3.
    </script>
</body>
</html>
```

- [ ] **Step 2: Verify the page renders**

Run: open `english.html` in a browser.

Expected: dark page with title "English Mask", hint text, an empty panel showing the placeholder message, no console errors.

- [ ] **Step 3: Commit**

```bash
git add english.html
git commit -m "Scaffold english.html shell with theme and layout"
```

---

## Task 2: Wire Ctrl+V to read clipboard with textarea fallback

**Files:**
- Modify: `english.html` (the empty `<script>` block)

- [ ] **Step 1: Implement clipboard reader and toast helper**

Replace the `<script>...</script>` block with:

```html
    <script>
        const resultEl = document.getElementById('result');
        const fallbackEl = document.getElementById('fallback');
        const fallbackInput = document.getElementById('fallback-input');
        const toastEl = document.getElementById('toast');
        let toastTimer = null;

        function showToast(msg, ms = 1500) {
            toastEl.textContent = msg;
            toastEl.hidden = false;
            requestAnimationFrame(() => toastEl.classList.add('visible'));
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => {
                toastEl.classList.remove('visible');
                setTimeout(() => { toastEl.hidden = true; }, 250);
            }, ms);
        }

        function showFallback(msg) {
            if (msg) showToast(msg, 2500);
            fallbackEl.hidden = false;
        }

        function hideFallback() {
            fallbackEl.hidden = true;
        }

        async function readClipboard() {
            if (!navigator.clipboard || !navigator.clipboard.readText) {
                showFallback('Clipboard API not available. Paste into the box below.');
                return null;
            }
            try {
                return await navigator.clipboard.readText();
            } catch (err) {
                showFallback('Clipboard read failed: ' + (err && err.message ? err.message : err));
                return null;
            }
        }

        async function handlePasteFromClipboard() {
            const text = await readClipboard();
            if (text === null) return;
            const trimmed = text.trim();
            if (trimmed === '') {
                showToast('Nothing to paste');
                return;
            }
            hideFallback();
            // MaskRenderer.render() is wired in Task 3.
            resultEl.innerHTML = '';
            resultEl.textContent = text; // placeholder until Task 3
        }

        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V') && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                handlePasteFromClipboard();
            }
        });

        fallbackInput.addEventListener('paste', (e) => {
            const text = (e.clipboardData || window.clipboardData).getData('text/plain');
            e.preventDefault();
            const trimmed = (text || '').trim();
            if (trimmed === '') {
                showToast('Nothing to paste');
                return;
            }
            hideFallback();
            resultEl.innerHTML = '';
            resultEl.textContent = text; // placeholder until Task 3
        });
    </script>
```

- [ ] **Step 2: Manual smoke test**

Run: open `english.html`, copy `Hello (world) test` to the clipboard, focus the page, press `Ctrl+V`.

Expected:
- The empty-state placeholder is replaced by `Hello (world) test` rendered as plain text.
- Copy empty string → press `Ctrl+V` → see toast "Nothing to paste", previous content remains.

Run: in DevTools console, run `navigator.clipboard = undefined`, then press `Ctrl+V`.

Expected: toast about Clipboard API, fallback `<textarea>` appears.

Run: click the fallback textarea, paste `Hello (world) test` into it.

Expected: result area shows the text plain.

- [ ] **Step 3: Commit**

```bash
git add english.html
git commit -m "Wire Ctrl+V clipboard reader with textarea fallback"
```

---

## Task 3: Implement MaskRenderer and replace the placeholder textContent write

**Files:**
- Modify: `english.html` (the `resultEl.textContent = text;` lines in both handlers, plus a new pure function above the handlers)

- [ ] **Step 1: Add the MaskRenderer function and switch handlers to use it**

In the `<script>` block, add a `MaskRenderer` object above the handlers, and replace both `resultEl.textContent = text;` lines with the renderer call. The function lives in the same `<script>` for self-containment; it has no side effects and only depends on the DOM `document` global.

Add this function near the top of the `<script>` (right after the `toastTimer = null;` line):

```js
        const MaskRenderer = {
            WORD_RE: /[A-Za-z]{2,}/,
            SPLIT_RE: /(\([^)]*\)|[A-Za-z]+|\s+|[^A-Za-z()\s])/g,

            tokenize(text) {
                const out = [];
                let m;
                this.SPLIT_RE.lastIndex = 0;
                while ((m = this.SPLIT_RE.exec(text)) !== null) {
                    out.push(m[0]);
                }
                return out;
            },

            renderInsideParens(groupText) {
                const frag = document.createDocumentFragment();
                const parts = groupText.split(/([A-Za-z]+|\s+|[^A-Za-z\s])/g).filter(Boolean);
                for (const part of parts) {
                    if (this.WORD_RE.test(part)) {
                        const span = document.createElement('span');
                        span.className = 'word';
                        span.dataset.w = part;
                        span.textContent = part;
                        frag.appendChild(span);
                    } else {
                        frag.appendChild(document.createTextNode(part));
                    }
                }
                return frag;
            },

            render(text) {
                const frag = document.createDocumentFragment();
                const tokens = this.tokenize(text);
                for (const tok of tokens) {
                    if (tok.startsWith('(') && tok.endsWith(')')) {
                        frag.appendChild(document.createTextNode('('));
                        frag.appendChild(this.renderInsideParens(tok.slice(1, -1)));
                        frag.appendChild(document.createTextNode(')'));
                    } else {
                        frag.appendChild(document.createTextNode(tok));
                    }
                }
                return frag;
            },
        };
```

Then in **both** the `handlePasteFromClipboard` and the `fallbackInput` paste handler, replace the placeholder line:

```js
            resultEl.textContent = text; // placeholder until Task 3
```

with:

```js
            resultEl.replaceChildren(MaskRenderer.render(text));
```

Verify there are no other occurrences of `resultEl.textContent = text;` in the file. Both handlers should be updated.

- [ ] **Step 2: Manual smoke test (per spec §6)**

Run: open `english.html`, paste `Hello (world this is) a test (3rd one) (A) (你好)`.

Expected:
- `Hello` and `a test` show fully.
- `world`, `this`, `is` show only first letter with dark mask background; hover reveals the full word.
- `3rd one` shows fully (digit, 1-letter `one`).
- `A` shows fully (1-letter).
- `你好` shows fully (non-Latin).
- Newlines from the clipboard are preserved (the panel uses `white-space: pre-wrap`).

Run: paste `see (foo) and (bar (baz))`.

Expected: `foo`, `bar`, `baz` all masked; both layers processed.

Run: paste `text () end`.

Expected: empty parens show as `()` with no mask span inside.

Run: select a masked span (e.g. `w###d`) with the mouse and try to copy.

Expected: selection skips the hidden letters (or appears empty) due to `user-select: none`.

Run: copy empty string, press `Ctrl+V`.

Expected: toast "Nothing to paste", previous content remains.

Run: paste again with different text.

Expected: previous content fully replaced.

- [ ] **Step 3: Commit**

```bash
git add english.html
git commit -m "Implement MaskRenderer for words inside parentheses"
```

---

## Task 4: Final cleanup pass

**Files:**
- Modify: `english.html` (no functional changes expected; only remove any leftover dev comments)

- [ ] **Step 1: Remove placeholder comments**

Search `english.html` for `placeholder until Task 3`. If any remain, delete them. Also remove the `// Clipboard wiring and renderer land in Tasks 2-3.` comment if still present.

Run: open `english.html` in a browser, re-run the manual smoke tests from Task 3.

Expected: identical behavior, no console warnings.

- [ ] **Step 2: Commit (only if changes were made)**

```bash
git add english.html
git diff --cached --quiet || git commit -m "Remove dev placeholder comments from english.html"
```

---

## Self-Review

- **Spec coverage:**
  - §2 architecture (ClipboardReader, MaskRenderer, HoverReveal) → Tasks 2, 3, 1 respectively.
  - §3 data flow → Task 2 wires the listener, Task 3 wires the renderer.
  - §4.1 mask CSS → Task 1 styles.
  - §4.2 word span structure → Task 3 renderer builds `<span class="word" data-w>`.
  - §4.3 word regex `A-Z]{2,}` → Task 3 `WORD_RE`.
  - §4.4 Ctrl+V keydown shape → Task 2 handler.
  - §4.5 fallback + empty + error handling → Task 2 `showFallback` / `showToast`.
  - §4.6 replace-each-paste → `resultEl.replaceChildren` in Task 3 + Task 2 innerHTML clear.
  - §6 manual smoke tests → Tasks 2 and 3 embed them.
  - §7 out-of-scope items (OCR, persistence, etc.) → not added.
- **Placeholder scan:** no TBD/TODO left after Task 4.
- **Type consistency:** `MaskRenderer.render(text)` consumed in both handlers; `resultEl`, `fallbackEl`, `fallbackInput`, `toastEl` references match definitions in Task 2.
