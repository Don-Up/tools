# focus-class Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `focus-class.html` — a single-file dark-theme page that accepts a pasted Mermaid `classDiagram`, parses it, and walks through it class-by-class using arrow keys, rendering only the focused class + its incident edges at full canvas scale.

**Architecture:** Vanilla HTML/CSS/JS in one file. A parser extracts `class Foo["Foo (desc)"] { body }` blocks and relationship lines into a module-scope model. On each arrow press, a fresh minimal Mermaid source string is built containing only the focused class and its edges, then rendered via the project's existing `mermaid@10` CDN. The dark theming, postMessage integration, and stage layout mirror `focus-mermaid.html`.

**Tech Stack:** HTML5, vanilla CSS, vanilla JavaScript (ES2020), Mermaid 10 via CDN. No build step, no external deps.

---

## File Structure

- **Create:** `focus-class.html` — the only file produced by this plan. Holds markup, styles, and the script. Roughly mirrors `focus-mermaid.html` structurally so the engineer can copy patterns from there.

Decomposition within the file (each is a section in the single `<script>` block):
- `parseClassDiagram(text)` — pure parser; no DOM access.
- `buildClassSource(model, index)` — pure builder; takes parsed model and an index, returns a Mermaid source string.
- `renderCurrent()` — async, drives `mermaid.render`, manages stage DOM and status text.
- `loadAndRender(text)` — entry point that calls parse → resets state → renderCurrent.
- `step(delta)` — keyboard navigation with wrap-around.
- `showHint()` / `showError(msg)` — stage DOM helpers.

Each helper has one clear responsibility; the engineer can swap one without touching others.

---

## Task 1: HTML skeleton + hint stage + CSS

**Files:**
- Create: `focus-class.html`

- [ ] **Step 1: Write the file skeleton**

Create `focus-class.html` with this exact content. The engineer should copy `focus-mermaid.html` blocks wholesale where noted — those styles are identical by design.

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>focus-class</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        html, body {
            height: 100%;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1e1e1e;
            color: #e0e0e0;
            overflow: hidden;
        }

        .stage {
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
        }

        .hint {
            color: #888;
            font-size: 24px;
            text-align: center;
            line-height: 1.8;
        }

        .hint kbd {
            display: inline-block;
            font-family: inherit;
            background: #2c2c2c;
            border: 1px solid #444;
            border-radius: 4px;
            padding: 2px 8px;
            color: #b0bec5;
        }

        .error {
            color: #ef5350;
            font-size: 16px;
            text-align: left;
            white-space: pre-wrap;
            max-width: 80%;
            background: #2c2c2c;
            border: 1px solid #444;
            border-radius: 6px;
            padding: 16px 20px;
            font-family: 'Consolas', 'Monaco', monospace;
        }

        .mermaid-container {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: auto;
        }

        .mermaid-container > svg {
            max-width: 100% !important;
            max-height: 100% !important;
            width: auto !important;
            height: auto !important;
        }

        .status {
            position: fixed;
            bottom: 16px;
            right: 20px;
            color: #666;
            font-size: 13px;
            font-family: 'Consolas', 'Monaco', monospace;
            pointer-events: none;
        }

        #closeBtn {
            position: fixed;
            top: 16px;
            right: 16px;
            width: 36px;
            height: 36px;
            padding: 0;
            background: rgba(40, 40, 40, 0.85);
            color: #e0e0e0;
            border: 1px solid #555;
            border-radius: 4px;
            cursor: pointer;
            font-size: 20px;
            line-height: 1;
            display: none;
            z-index: 100;
            font-family: inherit;
        }
        #closeBtn:hover {
            background: rgba(60, 60, 60, 0.95);
            color: #fff;
            border-color: #00BFFF;
        }
        #closeBtn.visible { display: block; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
</head>
<body>
    <button id="closeBtn" title="Close">×</button>
    <div class="stage" id="stage">
        <div class="hint">按 <kbd>Ctrl</kbd> + <kbd>V</kbd> 粘贴 mermaid 代码</div>
    </div>
    <div class="status" id="status"></div>

    <script>
        'use strict';

        // Tasks 2-6 fill the script body.

    </script>
</body>
</html>
```

- [ ] **Step 2: Verify the page loads as a hint page**

Open the file in a browser (e.g. `start focus-class.html` on Windows or `open focus-class.html` on macOS). The centered gray hint "按 Ctrl + V 粘贴 mermaid 代码" must appear. No script errors in console.

Acceptance: hint visible, page background is `#1e1e1e`, no errors.

- [ ] **Step 3: Commit**

```bash
git add focus-class.html
git commit -m "Add focus-class skeleton (hint stage + styles)"
```

---

## Task 2: Parser — `parseClassDiagram(text)`

**Files:**
- Modify: `focus-class.html` (only the `<script>` body — add the parser)

- [ ] **Step 1: Add the parser inside `<script>`**

Insert this directly above the comment `// Tasks 2-6 fill the script body.` (replace that comment):

```js
        const stage = document.getElementById('stage');
        const status = document.getElementById('status');
        const closeBtn = document.getElementById('closeBtn');

        function parseClassDiagram(text) {
            const lines = text.split('\n');
            const classes = [];
            const edges = [];
            const classByName = new Map();
            let i = 0;

            while (i < lines.length) {
                const line = lines[i];
                const trimmed = line.trim();

                // Skip directives and blanks.
                if (!trimmed || trimmed === 'classDiagram') {
                    i += 1;
                    continue;
                }

                // Class header: `class Foo["Foo (desc)"] {`
                const classHeaderMatch = line.match(/^\s*class\s+([A-Za-z_][\w]*)\s*(\[.*\])?\s*\{\s*$/);
                if (classHeaderMatch) {
                    const name = classHeaderMatch[1];
                    const display = classHeaderMatch[2] || '';
                    const bodyLines = [];
                    i += 1;
                    while (i < lines.length && !/^\s*\}\s*$/.test(lines[i])) {
                        bodyLines.push(lines[i]);
                        i += 1;
                    }
                    // skip the closing `}`
                    if (i < lines.length) i += 1;
                    const entry = { name, display, body: bodyLines.join('\n') };
                    classes.push(entry);
                    classByName.set(name, entry);
                    continue;
                }

                // Relationship line — any line containing an arrow token.
                const arrowMatch = line.match(/(--\|>|--|->|\.\.>|\.\.|\|\|\.\.|\.\.\|>)(\s*:.*)?$/);
                if (arrowMatch || /-->|\.\.>/.test(line)) {
                    // Extract: <from> <arrow> <to> [": label"]
                    const relMatch = line.match(/^\s*([A-Za-z_][\w]*)\s+(--\|>|--\>|-->|\.\.>|\.\.|\.\.\|>)\s+([A-Za-z_][\w]*)\s*(?::\s*(.*?))?\s*$/);
                    if (relMatch) {
                        const [, from, arrow, to, label] = relMatch;
                        edges.push({ from, arrow, to, label: (label || '').trim() });
                    }
                    i += 1;
                    continue;
                }

                // Anything else (comments, etc): skip.
                i += 1;
            }

            return { classes, edges, classByName };
        }

        let model = null;
        let currentIndex = 0;
        let renderCounter = 0;
        let latestRenderId = 0;
```

Remove the trailing `// Tasks 2-6 fill the script body.` comment if still present.

- [ ] **Step 2: Smoke-test the parser via a one-off Node script**

Create a temporary file `verify_parse.js` in the repo root (this script is NOT committed — it's a one-shot verifier):

```js
// verify_parse.js — one-off smoke test, delete after use.
const fs = require('fs');
const html = fs.readFileSync('focus-class.html', 'utf8');
// Extract the parseClassDiagram function source for evaluation.
const fnMatch = html.match(/function parseClassDiagram\([\s\S]*?\n        \}/);
if (!fnMatch) { console.error('parser not found'); process.exit(1); }
eval(fnMatch[0]);

const sample = `classDiagram
    class Foo["Foo (desc)"] {
        <<controller>>
        +bar() int
    }
    class Baz["Baz (desc)"] {
        +qux() void
    }
    Foo --> Baz : uses
    Baz ..> Foo : creates
`;

const parsed = parseClassDiagram(sample);
console.log(JSON.stringify(parsed, null, 2));
```

Run: `node verify_parse.js`

Expected output: an object with `classes` array length 2 (Foo, Baz — both with display strings and bodies), `edges` array length 2 (Foo→Baz `-->` with label "uses"; Baz→Foo `..>` with label "creates"). The body of Foo should contain `<<controller>>` and `+bar() int`.

- [ ] **Step 3: Remove the verifier and commit**

```bash
rm verify_parse.js
git add focus-class.html
git commit -m "Add parseClassDiagram (class+relationship parser)"
```

---

## Task 3: Builder — `buildClassSource(model, index)`

**Files:**
- Modify: `focus-class.html` (append inside the `<script>`)

- [ ] **Step 1: Add the builder**

Insert immediately after the parser block (after the `let latestRenderId = 0;` declaration):

```js
        function buildClassSource(model, index) {
            const target = model.classes[index];
            if (!target) return '';
            const incidentClassNames = new Set([target.name]);
            const incidentEdges = [];
            for (const e of model.edges) {
                const fromExists = model.classByName.has(e.from);
                const toExists = model.classByName.has(e.to);
                if (!fromExists || !toExists) continue;
                if (e.from === target.name || e.to === target.name) {
                    incidentEdges.push(e);
                    incidentClassNames.add(e.from);
                    incidentClassNames.add(e.to);
                }
            }

            const lines = ['classDiagram', '  direction LR'];
            for (const c of model.classes) {
                if (!incidentClassNames.has(c.name)) continue;
                if (c.display) {
                    lines.push(`  class ${c.name}${c.display} {`);
                } else {
                    lines.push(`  class ${c.name} {`);
                }
                if (c.body) {
                    for (const bl of c.body.split('\n')) lines.push(`    ${bl}`);
                }
                lines.push('  }');
            }
            for (const e of incidentEdges) {
                const labelPart = e.label ? ` : ${e.label}` : '';
                lines.push(`  ${e.from} ${e.arrow} ${e.to}${labelPart}`);
            }
            return lines.join('\n');
        }
```

- [ ] **Step 2: Smoke-test the builder**

Create a temporary `verify_build.js`:

```js
const fs = require('fs');
const html = fs.readFileSync('focus-class.html', 'utf8');
const m = html.match(/function parseClassDiagram[\s\S]*?function buildClassSource[\s\S]*?\n        \}/);
if (!m) { console.error('parsers not found'); process.exit(1); }
eval(m[0]);

const sample = `classDiagram
    class Foo["Foo (desc)"] {
        <<controller>>
        +bar() int
    }
    class Baz["Baz (desc)"] {
        +qux() void
    }
    Foo --> Baz : uses
`;

const model = parseClassDiagram(sample);
console.log('--- focused Foo (index 0) ---');
console.log(buildClassSource(model, 0));
console.log('--- focused Baz (index 1) ---');
console.log(buildClassSource(model, 1));
```

Run: `node verify_build.js`

Expected:
- For index 0 (Foo): output contains `direction LR`, a `class Foo[...]` block whose body includes `<<controller>>`, a `class Baz[...]` block, and exactly `Foo --> Baz : uses`. Nothing else.
- For index 1 (Baz): output contains `Foo --> Baz : uses` (incident edge), and both classes' bodies are emitted.

- [ ] **Step 3: Remove the verifier and commit**

```bash
rm verify_build.js
git add focus-class.html
git commit -m "Add buildClassSource (per-step Mermaid slice)"
```

---

## Task 4: Mermaid init, render, and `loadAndRender` flow

**Files:**
- Modify: `focus-class.html` (append inside the `<script>`)

- [ ] **Step 1: Add mermaid init and the render/lifecycle helpers**

Insert after `buildClassSource`:

```js
        if (window.mermaid) {
            window.mermaid.initialize({
                startOnLoad: false,
                theme: 'dark',
                securityLevel: 'strict',
                themeVariables: {
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    background: '#1e1e1e',
                    primaryColor: '#252525',
                    primaryTextColor: '#e0e0e0',
                    primaryBorderColor: '#4fc3f7',
                    lineColor: '#81c784',
                    secondaryColor: '#2c2c2c',
                    tertiaryColor: '#1e1e1e',
                },
            });
        }

        function showHint() {
            stage.innerHTML = '';
            const hint = document.createElement('div');
            hint.className = 'hint';
            hint.innerHTML = '按 <kbd>Ctrl</kbd> + <kbd>V</kbd> 粘贴 mermaid 代码';
            stage.appendChild(hint);
            status.textContent = '';
            model = null;
            currentIndex = 0;
        }

        function showError(msg) {
            stage.innerHTML = '';
            const err = document.createElement('div');
            err.className = 'error';
            err.textContent = msg;
            stage.appendChild(err);
            status.textContent = '';
        }

        async function renderCurrent() {
            if (!model) return;
            const target = model.classes[currentIndex];
            if (!target) return;
            const myId = 'mermaid-' + (++renderCounter);
            latestRenderId = myId;
            try {
                const result = await window.mermaid.render(myId, buildClassSource(model, currentIndex));
                if (myId !== latestRenderId) return; // a newer render started
                const svg = typeof result === 'string' ? result : result.svg;
                stage.innerHTML = '';
                const container = document.createElement('div');
                container.className = 'mermaid-container';
                container.innerHTML = svg;
                stage.appendChild(container);
                status.textContent = `${currentIndex + 1} / ${model.classes.length} · ${target.name}`;
            } catch (err) {
                if (myId !== latestRenderId) return;
                const message = (err && (err.message || err.str || err.toString())) || '未知错误';
                showError('mermaid 语法错误:\n\n' + message);
            }
        }

        function loadAndRender(text) {
            if (!text) return;
            if (!window.mermaid) {
                showError('mermaid.js 未加载,请检查网络');
                return;
            }
            const parsed = parseClassDiagram(text);
            if (parsed.classes.length === 0) {
                showError('未找到任何 class 定义');
                return;
            }
            model = parsed;
            currentIndex = 0;
            renderCurrent();
        }
```

- [ ] **Step 2: Verify parse-cleanliness**

Run:

```bash
node -e "const fs=require('fs');const html=fs.readFileSync('focus-class.html','utf8');const m=html.match(/<script>([\s\S]*?)<\/script>/);try{new Function(m[1]);console.log('parse OK')}catch(e){console.error('PARSE ERROR',e.message)}"
```

Expected: `parse OK`. If anything prints after "PARSE ERROR", fix and re-run.

- [ ] **Step 3: Commit**

```bash
git add focus-class.html
git commit -m "Add mermaid init, renderCurrent, loadAndRender"
```

---

## Task 5: Keyboard navigation (← / → / ↑ / ↓ / Esc) + close button + postMessage

**Files:**
- Modify: `focus-class.html` (append inside the `<script>`)

- [ ] **Step 1: Add navigation, paste, close, message handlers**

Insert at the bottom of the script body (before the closing `</script>` tag):

```js
        function step(delta) {
            if (!model || model.classes.length === 0) return;
            const n = model.classes.length;
            currentIndex = (currentIndex + delta + n) % n;
            renderCurrent();
        }

        document.addEventListener('paste', (e) => {
            const text = (e.clipboardData || window.clipboardData).getData('text');
            if (!text) return;
            e.preventDefault();
            loadAndRender(text.trim());
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                showHint();
                return;
            }
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                step(+1);
                return;
            }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                step(-1);
            }
        });

        closeBtn.addEventListener('click', () => {
            window.parent.postMessage({ type: 'focus-class-close' }, '*');
        });

        window.addEventListener('message', (e) => {
            const data = e.data;
            if (!data || typeof data !== 'object') return;
            if (data.type !== 'focus-class-load') return;
            if (typeof data.content !== 'string' || !data.content) return;
            loadAndRender(data.content.trim());
            closeBtn.classList.add('visible');
        });
```

- [ ] **Step 2: Verify parse-cleanliness**

Run:

```bash
node -e "const fs=require('fs');const html=fs.readFileSync('focus-class.html','utf8');const m=html.match(/<script>([\s\S]*?)<\/script>/);try{new Function(m[1]);console.log('parse OK')}catch(e){console.error('PARSE ERROR',e.message)}"
```

Expected: `parse OK`.

- [ ] **Step 3: Commit**

```bash
git add focus-class.html
git commit -m "Add keyboard nav, paste handler, postMessage integration"
```

---

## Task 6: Manual verification

This task is the user's manual verification pass — the engineer only needs to write down the checklist so the user has it; the engineer does not execute it.

**Files:**
- Modify: none (this task produces no code, only an inline confirmation)

- [ ] **Step 1: Print the manual test checklist for the user**

Display this in your reply:

> Manual verification of `focus-class.html`:
>
> 1. Open the page in a browser → centered hint "按 Ctrl + V 粘贴 mermaid 代码" visible.
> 2. Paste the 10-class example diagram (from the spec). First class renders large; status bottom-right shows `1 / 10 · ExportJobController`.
> 3. Press `→` 9 times. Each class renders, counter increments, status name updates each step.
> 4. Press `→` once more. Wraps back to `1 / 10 · ExportJobController`.
> 5. Press `←` from class 1. Wraps to `10 / 10 · ExportErrorCode`.
> 6. Press `↑` (forward), `↓` (back) — same effect as `←` / `→`.
> 7. Press `Esc` from any class. Returns to the centered hint.
> 8. Re-paste the diagram from the hint stage. Restarts at class 1.
> 9. Paste something that isn't `classDiagram`. Error box appears: "未找到任何 class 定义" or mermaid syntax error.
> 10. Host the page in an iframe; have the parent call `iframe.contentWindow.postMessage({ type: 'focus-class-load', content: '<mermaid text>' }, '*')`. The page renders the first class and the `×` button becomes visible.
> 11. Click `×`. Parent receives a `message` event whose `data.type` is `'focus-class-close'`.

- [ ] **Step 2: Confirm with the user**

Ask: "Manual verification done — anything to fix, or should I close out?"

The user is expected to either report issues (which become new tasks) or approve. Once approved, the implementation is complete.

---

## Self-Review Notes

I ran the writing-plans self-review against the spec:

**1. Spec coverage** — Every spec section maps to a task:
- HTML skeleton + dark CSS → Task 1.
- `parseClassDiagram` → Task 2.
- `buildClassSource` → Task 3.
- Mermaid init + render + `loadAndRender` → Task 4.
- `step` + paste + keydown + close + postMessage → Task 5.
- Manual test checklist → Task 6.

**2. Placeholder scan** — No "TBD", no vague requirements. The only "..." matches in the spec are JS spread syntax (`{ classes: [...] }`) and fenced code examples — not placeholders.

**3. Type consistency** — `model` is always shaped `{ classes: Array<{name, display, body}>, edges: Array<{from, arrow, to, label}>, classByName: Map }` across Tasks 2–5. `currentIndex` is always a class index into `model.classes`. `renderCounter` and `latestRenderId` are module-scope, only used inside `renderCurrent`. `loadAndRender` is the single entry point for both paste and postMessage (called from Task 5 handlers).
