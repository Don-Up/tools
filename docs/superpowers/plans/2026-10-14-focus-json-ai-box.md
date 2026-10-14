# focus-json AI Box Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fixed top-left AI input box in `focus-json.html` that asks the AI for bilingual JSON per a hardcoded SKILL, then routes the response through the existing `loadJson` function (no copy-paste, no keypress simulation).

**Architecture:** Single-file change. HTML+CSS add a fixed-position input and error div at top-left. JS adds `AI_*` constants, three state vars, four small functions (`extractFirstJsonBlock`, `showAiError`, `hideAiError`, `askAi`), and DOM event wiring. Reuses the existing `loadJson(text)` entry point — both `Ctrl+V` paste and the AI box converge on it.

**Tech Stack:** Vanilla HTML/CSS/JS, no framework, no test runner. Manual verification in browser + DevTools.

**Reference spec:** `docs/superpowers/specs/2026-10-14-focus-json-ai-box-design.md`

---

## File Structure

| File | Change | Why |
|---|---|---|
| `focus-json.html` | Modify (insert HTML, CSS, JS) | All new behavior lives in this one file; matches existing single-file pattern |

No new files. No new dependencies.

---

## Task 1: Add HTML markup for the AI box

**Files:**
- Modify: `focus-json.html:327-330` (insert before `<div class="controls hidden" id="controls">`)

- [ ] **Step 1: Insert the HTML block**

Open `focus-json.html` and locate the body start (around line 327):

```html
<body>
    <button id="closeBtn" class="close-btn" hidden>×</button>

    <div class="controls hidden" id="controls">
```

Insert this new block between `<button id="closeBtn">` and `<div class="controls hidden" id="controls">`:

```html
    <div class="ai-box">
        <input id="aiInput" class="ai-input" type="text" autocomplete="off"
               placeholder="向 AI 提问… (Enter 发送)">
        <div id="aiError" class="ai-error" hidden></div>
    </div>
```

- [ ] **Step 2: Verify the box appears**

Open `focus-json.html` in a browser. Confirm:
- A single text input is visible in the top-left corner
- The placeholder text reads `向 AI 提问… (Enter 发送)`
- Clicking the input focuses it (no outline change yet — styles come in Task 2)
- The hint area (`按 Ctrl + V 粘贴 JSON`) and any card still render below the input

- [ ] **Step 3: Commit**

```bash
git add focus-json.html
git commit -m "feat(focus-json): scaffold AI box markup"
```

---

## Task 2: Add CSS for the AI box

**Files:**
- Modify: `focus-json.html:323-325` (insert before `</style>`)

- [ ] **Step 1: Insert the CSS block**

Open `focus-json.html` and locate the end of the `<style>` block (around line 323, immediately before `</style>`). Insert:

```css
        .ai-box {
            position: fixed;
            top: 16px;
            left: 16px;
            z-index: 100;
            width: 360px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            pointer-events: none;
        }
        .ai-input {
            pointer-events: auto;
            background: rgba(37,37,37,0.9);
            border: 1px solid #444;
            color: #e0e0e0;
            padding: 8px 12px;
            font-size: 14px;
            font-family: inherit;
            border-radius: 6px;
            outline: none;
        }
        .ai-input:focus { border-color: #4fc3f7; }
        .ai-input.ai-busy { opacity: 0.5; cursor: wait; }
        .ai-error {
            pointer-events: auto;
            color: #ef5350;
            font-size: 12px;
            background: rgba(37,37,37,0.9);
            border: 1px solid #ef5350;
            padding: 6px 8px;
            border-radius: 4px;
            max-height: 120px;
            overflow-y: auto;
            white-space: pre-wrap;
            word-break: break-all;
        }
```

- [ ] **Step 2: Verify styling**

Reload `focus-json.html` in the browser. Confirm:
- Input is dark (`#252525`-ish background), light gray text, 1px border
- Focusing the input turns the border blue (`#4fc3f7`)
- The input sits in the top-left corner, not overlapping the central hint/card area on a typical viewport (1280×800). If it does overlap, that's OK — the spec accepts that; users can press `Alt+H` to hide controls and the card stays readable through the box since `ai-box` is `pointer-events: none` (input still receives clicks)
- The error div is hidden (you'll only see it when JS shows it in later tasks)

- [ ] **Step 3: Commit**

```bash
git add focus-json.html
git commit -m "feat(focus-json): style AI box (top-left fixed, dark theme)"
```

---

## Task 3: Add JS constants, state, and `extractFirstJsonBlock` helper

**Files:**
- Modify: `focus-json.html:363-366` (insert after `let currentIndex = 0;`)

- [ ] **Step 1: Insert constants and state**

Open `focus-json.html` and locate line 364:

```js
        let entries = [];
        let currentIndex = 0;
```

Insert immediately after `let currentIndex = 0;` (i.e., before the next existing declaration):

```js
        const AI_BASE_URL = 'https://next-reader-psi.vercel.app/api/minimax';
        const AI_MODEL = 'MiniMax-M3';
        const AI_MAX_TOKENS = 4096;
        const AI_SYSTEM_PROMPT = `1. 以英文表达的顺序和内容为准,中文作为对应翻译,两者一一对应。
2. 最小切分单位:以分割意群的逗号 (,)、破折号 (— / ——)、分号 (;) 等作为最小 entry 单位切分;用于列举名词的逗号 (如 columns, create, list, detail, retry) 不切分,保留在同一 entry 内。
3. 中文必须与英文严格对应:英文 entry 中的每部分内容,中文翻译都必须完整对应,不得省略、漏译、合并或自行简化。
4. JSON 格式:
   - key 为英文原文片段,保留原文标点、大小写、代码标识符、路径、方法名等原样。
   - value 为对应的中文翻译。
   - 保持英文原文顺序。
5. 只返回 JSON,不要额外解释或包裹代码块以外的文字。`;
        let isAiBusy = false;
        let aiAbort = null;
        let aiErrorTimer = null;
```

- [ ] **Step 2: Add `extractFirstJsonBlock` helper**

Locate the end of the `loadJson` function (around line 653, after its closing `}`). Insert immediately after the `loadJson` function:

```js
    function extractFirstJsonBlock(text) {
        const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fence) return fence[1].trim();
        const start = text.indexOf('{');
        if (start < 0) return null;
        let depth = 0, inStr = false, esc = false;
        for (let i = start; i < text.length; i++) {
            const c = text[i];
            if (inStr) {
                if (esc) esc = false;
                else if (c === '\\') esc = true;
                else if (c === '"') inStr = false;
            } else {
                if (c === '"') inStr = true;
                else if (c === '{') depth++;
                else if (c === '}') { depth--; if (depth === 0) return text.slice(start, i + 1); }
            }
        }
        return null;
    }
```

- [ ] **Step 3: Verify constants and helper in the console**

Reload `focus-json.html`, open DevTools console, and run:

```js
AI_BASE_URL
// expected: "https://next-reader-psi.vercel.app/api/minimax"
AI_MODEL
// expected: "MiniMax-M3"
AI_SYSTEM_PROMPT.startsWith('1. 以英文表达的顺序和内容为准')
// expected: true
extractFirstJsonBlock('```json\n{"a": 1}\n```')
// expected: '{"a": 1}'
extractFirstJsonBlock('好的, 这是翻译: {"x": "y"}')
// expected: '{"x": "y"}'
extractFirstJsonBlock('翻译失败, 请稍后再试')
// expected: null
extractFirstJsonBlock('{"a": "}", "b": 2}')
// expected: '{"a": "}", "b": 2}'  (the inner } is inside a string, so the brace counter handles it correctly)
extractFirstJsonBlock('{"outer": {"inner": 1}}')
// expected: '{"outer": {"inner": 1}}'  (nested braces balanced)
```

All 6 expectations must hold. If any fails, fix the function and re-test before committing.

- [ ] **Step 4: Commit**

```bash
git add focus-json.html
git commit -m "feat(focus-json): add AI constants, state, and JSON extractor"
```

---

## Task 4: Add error display helpers

**Files:**
- Modify: `focus-json.html` (insert after `extractFirstJsonBlock` function)

- [ ] **Step 1: Insert `showAiError` and `hideAiError`**

Locate the just-added `extractFirstJsonBlock` function. Insert immediately after its closing `}`:

```js
    function showAiError(msg) {
        aiError.textContent = msg;
        aiError.hidden = false;
        clearTimeout(aiErrorTimer);
        aiErrorTimer = setTimeout(hideAiError, 5000);
    }
    function hideAiError() {
        aiError.hidden = true;
        aiError.textContent = '';
        clearTimeout(aiErrorTimer);
    }
```

- [ ] **Step 2: Verify helpers in the console**

Reload the page, open DevTools console, and run:

```js
aiError
// expected: <div id="aiError" class="ai-error" hidden></div>  (or null if step 1 wrong)
showAiError('hello world')
// expected: aiError becomes visible, text "hello world"; reload page to reset
hideAiError()
// expected: aiError becomes hidden, text cleared
```

Confirm by looking at the page: after `showAiError('hello world')` you should see a red box below the input with the text. After `hideAiError()` it disappears. The 5s auto-hide: re-run `showAiError('test')`, wait 5s, confirm it disappears on its own.

- [ ] **Step 3: Commit**

```bash
git add focus-json.html
git commit -m "feat(focus-json): add AI error display helpers"
```

---

## Task 5: Add `askAi` function and wire DOM event listeners

**Files:**
- Modify: `focus-json.html` (insert after `hideAiError` function, and add listeners near other init)

- [ ] **Step 1: Insert `askAi` function**

Locate the `hideAiError` function just added. Insert immediately after its closing `}`:

```js
    async function askAi() {
        if (isAiBusy) { aiAbort?.abort(); return; }
        const question = aiInput.value.trim();
        if (!question) return;
        isAiBusy = true;
        aiInput.classList.add('ai-busy');
        aiInput.placeholder = 'AI 思考中…';
        hideAiError();
        aiAbort = new AbortController();
        try {
            const res = await fetch(AI_BASE_URL, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: AI_MODEL,
                    max_tokens: AI_MAX_TOKENS,
                    stream: false,
                    system: AI_SYSTEM_PROMPT,
                    messages: [{ role: 'user', content: question }]
                }),
                signal: aiAbort.signal
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const text = data.content?.[0]?.text ?? '';
            if (!text) throw new Error('AI 返回为空');
            const json = extractFirstJsonBlock(text);
            if (!json) throw new Error('响应中找不到 JSON 块');
            loadJson(json);
        } catch (err) {
            if (err.name === 'AbortError') return;
            showAiError(err.message);
        } finally {
            isAiBusy = false;
            aiInput.classList.remove('ai-busy');
            aiInput.placeholder = '向 AI 提问… (Enter 发送)';
            aiAbort = null;
        }
    }
```

- [ ] **Step 2: Wire DOM event listeners**

Locate the block of `addEventListener` calls (around lines 692–727, near the `voiceSelect` change handler). Insert immediately after the `voiceSelect.addEventListener('change', ...)` block (i.e., before the `stopBtn.addEventListener('click', ...)`):

```js
        const aiInput = document.getElementById('aiInput');
        const aiError = document.getElementById('aiError');
        aiInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); askAi(); }
            else if (e.key === 'Escape') { e.preventDefault(); aiInput.value = ''; }
        });
        aiInput.addEventListener('input', hideAiError);
```

- [ ] **Step 3: Verify wiring in the console**

Reload, open DevTools console, and run:

```js
typeof askAi
// expected: "function"
aiInput
// expected: <input id="aiInput" ...>
aiError
// expected: <div id="aiError" ...>
isAiBusy
// expected: false
```

All four must return the expected values. If `aiInput` or `aiError` is `null`, the `getElementById` calls failed — check that Task 1's HTML actually made it into the file and that the script runs after the body.

- [ ] **Step 4: Commit**

```bash
git add focus-json.html
git commit -m "feat(focus-json): add askAi function and DOM event wiring"
```

---

## Task 6: End-to-end manual regression

No code changes. This task is a full pass through the spec's testing checklist to confirm nothing was missed.

- [ ] **Step 1: a. Basic path**

1. Open `focus-json.html` in a fresh browser tab
2. Confirm: input visible top-left, focusable, dark theme, blue focus border
3. Type a short English sentence into the input
4. Press Enter
5. Confirm: input dims (opacity 0.5), placeholder changes to "AI 思考中…"
6. Wait for response (a few seconds)
7. Confirm: page content is replaced with the new bilingual JSON entries (renders through the existing card UI), no red aiError shown, input returns to normal

- [ ] **Step 2: b. AI response tolerance**

In DevTools console, override the helper to test tolerance without burning real API calls:

```js
const realExtract = extractFirstJsonBlock;
window.extractFirstJsonBlock = (text) => realExtract(text);
// then in console:
loadJson(realExtract('```json\n{"hello": "你好"}\n```'))
// expected: page loads with one entry
loadJson(realExtract('好的, 这是翻译: {"foo": "栏"}'))
// expected: page loads with one entry
showAiError('响应中找不到 JSON 块')
// expected: red box appears; reload to clear
// (real askAi would call showAiError here)
```

For the actual "AI returns invalid JSON" case, ask the AI a deliberately off-topic question like "what's 2+2?" with no JSON. The AI should respond with text but no `{...}` block, triggering `aiError = "响应中找不到 JSON 块"`. Confirm the red box appears for 5s then disappears.

- [ ] **Step 3: c. Abort**

1. Type a question, press Enter (request starts)
2. While placeholder is "AI 思考中…", press Enter again
3. Confirm: input returns to normal immediately, NO red error box, page content unchanged
4. Type a question, press Enter (request starts)
5. Press Esc — confirm input value is cleared, request still in flight (placeholder still "AI 思考中…")
6. Wait for it to complete; input returns to normal, page loads new entries

- [ ] **Step 4: d. Regression of existing features**

For each, confirm behavior is identical to before this change:

- [ ] `Ctrl+V` paste of a valid bilingual JSON (e.g. `{"hello": "你好"}`) — page loads the card
- [ ] `Ctrl+V` paste of invalid JSON — central `.error` element shows the error (NOT aiError)
- [ ] ArrowRight / ArrowLeft / ArrowUp / ArrowDown — navigate entries, TTS reads if enabled
- [ ] Spacebar — stop TTS
- [ ] Copy button (top-right of card) — copies entry text
- [ ] Alt+H — toggles `.controls` visibility
- [ ] `Ctrl+I` — opens background image modal
- [ ] TTS toggle / Highlight toggle / Voice select — work as before
- [ ] DevTools Network tab shows `POST https://next-reader-psi.vercel.app/api/minimax`, request body has `"stream": false`, response is a single JSON object (not SSE chunks)

- [ ] **Step 5: e. Edge cases**

- [ ] Empty input + Enter — nothing happens, no network request
- [ ] Long question (>500 chars typed) — input doesn't visually overflow, request goes through
- [ ] Chinese question — sent as user content, response contains Chinese values

- [ ] **Step 6: No commit (verification only)**

If anything fails, fix the bug as a new commit (don't bundle unrelated changes) and re-run the failing step. If everything passes, this task is done — the feature is shipped.

---

## Self-Review Checklist (run before declaring done)

- [ ] All 6 tasks committed individually (or rolled back if last one is verification-only)
- [ ] Spec sections → implementation:
  - [ ] HTML: `<div class="ai-box">` with input + error — Task 1
  - [ ] CSS: `.ai-box`, `.ai-input`, `.ai-input:focus`, `.ai-input.ai-busy`, `.ai-error` — Task 2
  - [ ] Constants: `AI_BASE_URL`, `AI_MODEL`, `AI_MAX_TOKENS`, `AI_SYSTEM_PROMPT` — Task 3
  - [ ] State: `isAiBusy`, `aiAbort`, `aiErrorTimer` — Task 3
  - [ ] `extractFirstJsonBlock` (fence + brace-balance) — Task 3
  - [ ] `showAiError` / `hideAiError` (5s auto-hide, input clears on type) — Task 4
  - [ ] `askAi` (fetch, AbortController, no `disabled`, error mapping) — Task 5
  - [ ] DOM listeners: Enter triggers askAi, Esc clears, input event clears error — Task 5
  - [ ] `loadJson` is called from `askAi` with the same string `Ctrl+V` would feed it — Task 5
- [ ] No new files, no new dependencies
- [ ] No placeholder strings (TBD, TODO, "fill in later") in any task
- [ ] All console-test expectations in Task 3, 4, 5 pass
- [ ] All manual regression items in Task 6 pass
