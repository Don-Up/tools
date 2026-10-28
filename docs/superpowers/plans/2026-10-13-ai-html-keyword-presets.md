# ai.html Keyword Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 3-preset keyword bar to the top of each conversation in `ai.html` — click triggers auto-send with `template_content + user_input`.

**Architecture:** New per-conversation field `keywordPresets: [{id, name, content}]` (length 3) stored in IDB `conversations`. New global default in `settings.defaultKeywordPresets` (also length 3). New keyword bar in main-area between conv header and messages. New edit modal mirroring the existing settings/convPrompt modal pattern. Click handler constructs combined text and routes through existing `send()`.

**Tech Stack:** Vanilla HTML/CSS/JS, IndexedDB (no library), no new dependencies.

---

## File Structure

Only one file changes:

- **Modify**: `ai.html` (single self-contained file). Estimated +200-260 lines added (constants + helpers ~30, keyword bar HTML/CSS/JS ~90, edit modal HTML/CSS/JS ~120, integration ~20).

Within `ai.html`, the new code fits in clearly-bounded sections:

1. New constant `DEFAULT_KEYWORD_PRESETS` near other constants
2. New helpers `getEffectiveKeywordPresets`, `ensureKeywordPresets` after `createConversation`
3. New HTML block `<div id="keywordBar">` between conv-header and messages
4. New CSS for `.keyword-bar`, `.keyword-btn`, edit modal inputs
5. New `renderKeywordBar`, `onKeywordClick` near other render functions
6. New edit modal HTML + CSS + open/save/reset/close functions
7. Wire into `setSendButtonState` and `switchConversation` / `createConversation` (new conv flow)

---

## Task 1: Data model + constants + helpers

**Files:**
- Modify: `ai.html` (add DEFAULT_KEYWORD_PRESETS constant; add getEffectiveKeywordPresets/ensureKeywordPresets helpers; update createConversation to seed keywordPresets; load defaultKeywordPresets in init)

- [ ] **Step 1: Add DEFAULT_KEYWORD_PRESETS constant**

Find the `IDB_VERSION` constant declaration block. Add this constant after `DEFAULT_SYSTEM_PROMPT` (around line 561):

```js
const DEFAULT_KEYWORD_PRESETS = [
    { id: 'k1', name: '翻译', content: '请将以下内容翻译成英文:\n' },
    { id: 'k2', name: '总结', content: '请用一段话总结以下内容的要点:\n' },
    { id: 'k3', name: '解释', content: '请解释以下内容的含义:\n' },
];
```

- [ ] **Step 2: Add helpers after createConversation**

Find the `createConversation` function (around line 487) and add the two helpers right after it (before `deleteConversation`):

```js
function getEffectiveKeywordPresets(conv) {
    if (conv && Array.isArray(conv.keywordPresets) && conv.keywordPresets.length === 3) {
        return conv.keywordPresets;
    }
    const settingsDefault = state.defaultKeywordPresets;
    if (Array.isArray(settingsDefault) && settingsDefault.length === 3) {
        return settingsDefault;
    }
    return DEFAULT_KEYWORD_PRESETS;
}

function ensureKeywordPresets(conv) {
    if (!conv) return;
    if (!Array.isArray(conv.keywordPresets) || conv.keywordPresets.length !== 3) {
        conv.keywordPresets = DEFAULT_KEYWORD_PRESETS.map(p => ({ ...p }));
    }
}
```

- [ ] **Step 3: Update createConversation to seed keywordPresets**

In `createConversation`, change the object literal to include `keywordPresets`. Find:

```js
async function createConversation() {
    const now = Date.now();
    const conv = {
        id: uuidv4(),
        title: '新对话',
        createdAt: now,
        updatedAt: now,
        systemPromptOverride: null,
        model: MODEL,
        messages: [],
    };
```

Replace with:

```js
async function createConversation() {
    const now = Date.now();
    const seedPresets = (Array.isArray(state.defaultKeywordPresets) && state.defaultKeywordPresets.length === 3)
        ? state.defaultKeywordPresets.map(p => ({ ...p }))
        : DEFAULT_KEYWORD_PRESETS.map(p => ({ ...p }));
    const conv = {
        id: uuidv4(),
        title: '新对话',
        createdAt: now,
        updatedAt: now,
        systemPromptOverride: null,
        model: MODEL,
        messages: [],
        keywordPresets: seedPresets,
    };
    if (state.idbAvailable) await convPut(conv);
    state.conversations.push(conv);
    return conv;
}
```

- [ ] **Step 4: Add state field for global default**

In the `state` object (around line 575), add a field. Find the line with `defaultSystemPrompt` and add a new field after it:

```js
            defaultSystemPrompt: localStorage.getItem('aiDefaultSystemPrompt') || DEFAULT_SYSTEM_PROMPT,
            defaultKeywordPresets: null,
```

- [ ] **Step 5: Load global default in init**

In the `init` async function, find the settings load block (around line 1265):

```js
            if (state.idbAvailable) {
                try {
                    const thinking = await settingsGet('showThinking');
                    if (thinking !== null) state.showThinking = String(thinking) === 'true';
                    const prompt = await settingsGet('defaultSystemPrompt');
                    if (prompt) state.defaultSystemPrompt = prompt;
                } catch (err) {
                    console.error('settings load failed:', err);
                }
            }
```

Add a new line to read `defaultKeywordPresets` after `defaultSystemPrompt`:

```js
            if (state.idbAvailable) {
                try {
                    const thinking = await settingsGet('showThinking');
                    if (thinking !== null) state.showThinking = String(thinking) === 'true';
                    const prompt = await settingsGet('defaultSystemPrompt');
                    if (prompt) state.defaultSystemPrompt = prompt;
                    const kp = await settingsGet('defaultKeywordPresets');
                    if (Array.isArray(kp) && kp.length === 3) state.defaultKeywordPresets = kp;
                } catch (err) {
                    console.error('settings load failed:', err);
                }
            }
```

- [ ] **Step 6: Manual verify**

Open `ai.html` in browser. Open DevTools console:

```js
// After init runs, state should have defaultKeywordPresets === null
// (we haven't written anything yet, but the helper should fall back to DEFAULT_KEYWORD_PRESETS)
const c = state.conversations[0];
console.log(c.keywordPresets);  // should print the 3 default presets
```

Click `+ 新对话` — new conv should also have `keywordPresets` array of 3.

- [ ] **Step 7: Commit**

```bash
git add ai.html
git commit -m "feat(ai.html): add keywordPresets data model and helpers"
```

---

## Task 2: Keyword bar UI + click-to-send

**Files:**
- Modify: `ai.html` (add HTML for keyword bar between conv-header and messages; add CSS; add renderKeywordBar + onKeywordClick; wire renderKeywordBar into init, createConversation, switchConversation, newConvBtn)

- [ ] **Step 1: Add keyword bar HTML**

Find the conv-header block (around line 656). It ends with `</header>` for topBar, then the `settingsRow`, then `errorBanner`, then `convHeader`, then `<section id="messages">`. Add the keyword bar between `</div>` of convHeader and the messages section:

```html
            <div id="keywordBar" class="keyword-bar"></div>
            <section id="messages" class="messages empty"></section>
```

- [ ] **Step 2: Add CSS for keyword bar**

Find `</style>` and insert just before it:

```css
.keyword-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    border-bottom: 1px solid #2a2a2a;
    margin-bottom: 12px;
}
.keyword-btn {
    padding: 5px 14px;
    font-size: 13px;
    color: #cfd8dc;
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
}
.keyword-btn:hover { background: #333; border-color: #4fc3f7; color: #4fc3f7; }
.keyword-btn:disabled { opacity: 0.4; cursor: default; }
.keyword-edit-btn { margin-left: auto; }
.keyword-bar:empty { display: none; }
```

- [ ] **Step 3: Add renderKeywordBar and onKeywordClick functions**

Find the `renderSidebar` function (around line 740) and add these two functions right before it:

```js
function renderKeywordBar() {
    const conv = state.conversations.find(c => c.id === state.currentConvId);
    if (!conv) {
        dom.keywordBar.innerHTML = '';
        return;
    }
    const presets = getEffectiveKeywordPresets(conv);
    dom.keywordBar.innerHTML = '';
    presets.forEach(preset => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'keyword-btn';
        btn.dataset.id = preset.id;
        btn.textContent = preset.name || `关键词 ${preset.id.slice(1)}`;
        btn.disabled = state.isStreaming;
        btn.addEventListener('click', () => onKeywordClick(preset.id));
        dom.keywordBar.appendChild(btn);
    });
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.id = 'keywordEditBtn';
    editBtn.className = 'btn secondary icon-only keyword-edit-btn';
    editBtn.title = '编辑关键词';
    editBtn.textContent = '⚙ 编辑';
    editBtn.addEventListener('click', openKeywordModal);
    editBtn.disabled = state.isStreaming;
    dom.keywordBar.appendChild(editBtn);
}

function onKeywordClick(presetId) {
    if (state.isStreaming) return;
    const conv = state.conversations.find(c => c.id === state.currentConvId);
    if (!conv) return;
    ensureKeywordPresets(conv);
    const preset = conv.keywordPresets.find(p => p.id === presetId);
    if (!preset) return;
    const userInput = dom.questionInput.value.trim();
    const content = (preset.content || '').replace(/\n+$/, '');
    const text = userInput ? `${userInput}\n${content}` : content;
    dom.questionInput.value = text;
    updateSendEnabled();
    dom.questionInput.focus();
}
```

- [ ] **Step 4: Add keywordBar DOM ref**

In the `dom` object (around line 705), add the new ref. Find the `messages: document.getElementById('messages')` line and add before it:

```js
            keywordBar: document.getElementById('keywordBar'),
            messages: document.getElementById('messages'),
```

- [ ] **Step 5: Wire renderKeywordBar into init / conv flows**

In the `init` async function, find the line that calls `renderMessages()` (around line 1313) and add a call before it:

```js
            renderSidebar();
            renderKeywordBar();
            renderMessages();
```

In the `newConvBtn` click handler (around line 1321), add the call:

```js
        dom.newConvBtn.addEventListener('click', async () => {
            const c = await createConversation();
            state.currentConvId = c.id;
            state.currentMessages = c.messages;
            renderSidebar();
            renderKeywordBar();
            renderMessages();
            dom.questionInput.focus();
        });
```

In `switchConversation` (around line 1100), add the call after `renderMessages()`:

```js
        async function switchConversation(id) {
            if (state.isStreaming && state.abortController) {
                state.abortController.abort();
                await new Promise(resolve => {
                    const check = () => {
                        if (!state.isStreaming) resolve();
                        else setTimeout(check, 50);
                    };
                    check();
                });
            }
            state.currentConvId = id;
            const conv = state.conversations.find(c => c.id === id);
            if (conv) state.currentMessages = conv.messages;
            renderSidebar();
            renderMessages();
            renderKeywordBar();
        }
```

- [ ] **Step 6: Update setSendButtonState to toggle keyword button disabled state**

Find `setSendButtonState` (around line 1240):

```js
        function setSendButtonState(streaming) {
            state.isStreaming = streaming;
            dom.sendBtn.textContent = streaming ? '停止' : '发送';
            dom.sendBtn.classList.toggle('secondary', streaming);
            dom.questionInput.disabled = streaming;
        }
```

Replace with:

```js
        function setSendButtonState(streaming) {
            state.isStreaming = streaming;
            dom.sendBtn.textContent = streaming ? '停止' : '发送';
            dom.sendBtn.classList.toggle('secondary', streaming);
            dom.questionInput.disabled = streaming;
            document.querySelectorAll('.keyword-btn, #keywordEditBtn').forEach(b => {
                b.disabled = streaming;
            });
        }
```

- [ ] **Step 7: Manual verify**

Open `ai.html` in browser. Confirm:

1. Three buttons appear above messages: `翻译`, `总结`, `解释`, plus a `⚙ 编辑` button on the right
2. Type "你好世界" in the input, click `翻译` — input is filled with `你好世界\n请将以下内容翻译成英文:` (no auto-send)
3. Clear input, click `总结` — input is filled with `请用一段话总结以下内容的要点:` (no auto-send)
4. Click `+ 新对话` — new conv also has 3 default buttons
5. Refresh page — buttons still show 3 defaults

- [ ] **Step 8: Commit**

```bash
git add ai.html
git commit -m "feat(ai.html): add keyword bar UI with click-to-send"
```

---

## Task 3: Edit modal for keyword presets

**Files:**
- Modify: `ai.html` (add edit modal HTML; add CSS for keyword edit modal fields; add openKeywordModal, closeKeywordModal, saveKeywordPresets, resetKeywordPresets; add DOM refs; wire to keywordEditBtn)

- [ ] **Step 1: Add edit modal HTML**

Find the existing settings modal (around line 720). Add the keyword edit modal just before it:

```html
    <div id="keywordModal" class="modal" hidden>
        <div id="keywordModalBackdrop" class="modal-backdrop"></div>
        <div class="modal-panel">
            <h2 class="modal-title">编辑关键词</h2>
            <div class="modal-field">
                <label>名称 1</label>
                <input id="kw1Name" class="modal-input" type="text" />
                <label>内容 1</label>
                <textarea id="kw1Content" class="modal-textarea" rows="3"></textarea>
            </div>
            <div class="modal-field">
                <label>名称 2</label>
                <input id="kw2Name" class="modal-input" type="text" />
                <label>内容 2</label>
                <textarea id="kw2Content" class="modal-textarea" rows="3"></textarea>
            </div>
            <div class="modal-field">
                <label>名称 3</label>
                <input id="kw3Name" class="modal-input" type="text" />
                <label>内容 3</label>
                <textarea id="kw3Content" class="modal-textarea" rows="3"></textarea>
            </div>
            <div class="modal-actions">
                <button id="kwResetBtn" class="btn secondary" type="button">恢复默认</button>
                <button id="kwOkBtn" class="btn" type="button">保存</button>
                <button id="kwCancelBtn" class="btn secondary" type="button">取消</button>
            </div>
        </div>
    </div>
```

- [ ] **Step 2: Add CSS for modal-input**

Find `</style>` and add (just before the modal-related CSS rules that already exist, or anywhere logical):

```css
.modal-input {
    background: #1e1e1e;
    color: #e0e0e0;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 6px 10px;
    font-size: 13px;
    font-family: inherit;
}
.modal-input:focus { outline: none; border-color: #4fc3f7; }
```

- [ ] **Step 3: Add DOM refs**

In the `dom` object, add the new refs. Find the `convPromptCancelBtn` line and add after it:

```js
            convPromptCancelBtn: document.getElementById('convPromptCancelBtn'),
            keywordModal: document.getElementById('keywordModal'),
            keywordModalBackdrop: document.getElementById('keywordModalBackdrop'),
            kw1Name: document.getElementById('kw1Name'),
            kw1Content: document.getElementById('kw1Content'),
            kw2Name: document.getElementById('kw2Name'),
            kw2Content: document.getElementById('kw2Content'),
            kw3Name: document.getElementById('kw3Name'),
            kw3Content: document.getElementById('kw3Content'),
            kwResetBtn: document.getElementById('kwResetBtn'),
            kwOkBtn: document.getElementById('kwOkBtn'),
            kwCancelBtn: document.getElementById('kwCancelBtn'),
```

- [ ] **Step 4: Add openKeywordModal, closeKeywordModal, saveKeywordPresets, resetKeywordPresets functions**

Find the convPrompt functions (around line 1115) and add the keyword modal functions right after them:

```js
function openKeywordModal() {
    const conv = state.conversations.find(c => c.id === state.currentConvId);
    if (!conv) return;
    ensureKeywordPresets(conv);
    const presets = conv.keywordPresets;
    dom.kw1Name.value = presets[0].name;
    dom.kw1Content.value = presets[0].content;
    dom.kw2Name.value = presets[1].name;
    dom.kw2Content.value = presets[1].content;
    dom.kw3Name.value = presets[2].name;
    dom.kw3Content.value = presets[2].content;
    dom.keywordModal.hidden = false;
}
function closeKeywordModal() {
    dom.keywordModal.hidden = true;
}
async function saveKeywordPresets() {
    const conv = state.conversations.find(c => c.id === state.currentConvId);
    if (!conv) return;
    conv.keywordPresets = [
        { id: 'k1', name: dom.kw1Name.value, content: dom.kw1Content.value },
        { id: 'k2', name: dom.kw2Name.value, content: dom.kw2Content.value },
        { id: 'k3', name: dom.kw3Name.value, content: dom.kw3Content.value },
    ];
    await convPut(conv).catch(() => {});
    renderKeywordBar();
    closeKeywordModal();
}
function resetKeywordPresets() {
    const defaults = DEFAULT_KEYWORD_PRESETS;
    dom.kw1Name.value = defaults[0].name;
    dom.kw1Content.value = defaults[0].content;
    dom.kw2Name.value = defaults[1].name;
    dom.kw2Content.value = defaults[1].content;
    dom.kw3Name.value = defaults[2].name;
    dom.kw3Content.value = defaults[2].content;
}
```

- [ ] **Step 5: Wire modal buttons**

Find the convPrompt button wiring block (around line 1130). Add the keyword modal wiring right after it:

```js
        dom.convPromptBtn.addEventListener('click', openConvPromptModal);
        dom.convPromptModalBackdrop.addEventListener('click', closeConvPromptModal);
        dom.convPromptCancelBtn.addEventListener('click', closeConvPromptModal);
        dom.convPromptOkBtn.addEventListener('click', saveConvPrompt);
        dom.convPromptClearBtn.addEventListener('click', clearConvPrompt);

        dom.keywordModalBackdrop.addEventListener('click', closeKeywordModal);
        dom.kwCancelBtn.addEventListener('click', closeKeywordModal);
        dom.kwOkBtn.addEventListener('click', saveKeywordPresets);
        dom.kwResetBtn.addEventListener('click', resetKeywordPresets);
```

- [ ] **Step 6: Manual verify**

1. Click `⚙ 编辑` in keyword bar → modal opens with 3 name + 3 content fields populated
2. Edit field 2: name = "代码审查", content = "请审查以下代码:\n", click `保存` → modal closes, button bar updates to show `代码审查`
3. Click `翻译` (now uses "请将以下内容翻译成英文:\n" — unchanged), then click `代码审查` (new) — both work
4. Open modal again, click `恢复默认` → all 3 fields reset to 翻译/总结/解释; click `保存` → bar shows defaults again
5. Create a new conv via `+ 新对话` — new conv has the 3 default buttons (independent of any edits to other convs)
6. Refresh page — edits are preserved

- [ ] **Step 7: Commit**

```bash
git add ai.html
git commit -m "feat(ai.html): add edit modal for per-conversation keyword presets"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Implemented in |
|---|---|
| Data model — global defaults | Task 1 (Step 1, 4, 5) |
| Data model — conv override | Task 1 (Step 2, 3) |
| Visual layout — keyword bar | Task 2 (Step 1, 2) |
| Click behavior (template + user input) | Task 2 (Step 3) |
| Streaming disable | Task 2 (Step 6) |
| Edit modal UI | Task 3 (Step 1, 2) |
| Edit modal save/reset | Task 3 (Step 4) |
| IDB persistence | Task 1 (Step 3), Task 3 (Step 4) |
| Edge case: old data without keywordPresets | Task 1 (Step 2 — getEffectiveKeywordPresets fallback) |
| Edge case: empty name/content | Task 2 (Step 3 — fallback to "关键词 N") |
| Edge case: streaming in progress | Task 2 (Step 6) |

**No placeholders detected.**

**Type consistency:**
- `DEFAULT_KEYWORD_PRESETS` defined in Task 1 Step 1, used by helpers in Step 2, by `createConversation` in Step 3, by `resetKeywordPresets` in Task 3 Step 4 — all reference the same shape.
- `getEffectiveKeywordPresets(conv)` signature consistent in Task 1 Step 2 and Task 2 Step 3.
- `onKeywordClick(presetId)` consistent.
- `openKeywordModal`, `closeKeywordModal`, `saveKeywordPresets`, `resetKeywordPresets` consistent.
- DOM ref `dom.keywordBar` added in Task 2 Step 4, used in Step 3 — consistent.
- `state.defaultKeywordPresets` field added in Task 1 Step 4, read in Step 3 and Step 5 — consistent.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-10-13-ai-html-keyword-presets.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
