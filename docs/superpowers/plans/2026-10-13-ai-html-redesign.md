# ai.html Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `ai.html` from a single-turn Q&A page to a multi-conversation AI chat tool with IndexedDB persistence, system prompt customization, and code syntax highlighting.

**Architecture:** Single self-contained `ai.html` file (no build step). New IndexedDB layer (`aiChatDb` v1) with `conversations` and `settings` stores replaces localStorage usage. Sidebar layout (240px left / fluid middle) introduced. SSE streaming refactored so each `textBuf`/`thinkingBuf` lives on the assistant message object and is written to IDB at `content_block_stop` and `message_stop`. `highlight.js` integrated via `marked-highlight` for code blocks; Markdown styles enhanced for tables/lists/blockquotes/headings.

**Tech Stack:** Vanilla HTML/CSS/JS, IndexedDB (no library), `marked@12.0.0` (already loaded), `marked-highlight` (new, ~1KB), `highlight.js@11.9.0` (CDN, common build, ~50KB gz), `atom-one-dark` theme (CDN).

**Test strategy:** Project has no JS test framework. Each task has manual browser verification steps. Engineer opens `ai.html` in browser, performs the listed actions, and confirms expected behavior before committing.

**Working directory:** Project root (`C:\Users\10691\Documents\GitHub\html-tools`). Engineer uses the file system to read the current `ai.html` (808 lines at spec time) before each task.

---

## File Structure

Only one file changes:

- **Modify**: `ai.html` — single self-contained file. Estimated +500-700 lines added (IDB layer ~120, sidebar UI ~150, system prompt modals ~80, Markdown CSS ~50, highlight.js integration ~10, hotkeys ~30, edge case polish ~50). Total file after redesign: ~1300-1500 lines.

Within `ai.html`, the `<script>` block should be organized into clearly-commented sections (no extraction to separate files — keeps self-contained). Section order at completion:

1. Constants (BASE_URL, MODEL, MAX_TOKENS, IDB name/version/store names)
2. State object
3. DOM refs (`dom` object)
4. IDB layer (openDb, get/put/delete for both stores, migration)
5. Conversation helpers (create, list, switch, delete, rename, search, persist)
6. Settings helpers (load/save global, modal open/close)
7. Streaming (callApi, parseSseStream, handleSsePayload, renderMessage helpers)
8. Markdown (marked setup with highlight.js, renderMessage, appendCodeCopyButtons)
9. Hotkeys (global keydown listener)
10. Init (run migration, open DB, load settings, load latest conversation or create empty, render sidebar, render messages, bind hotkeys)

---

## Task 1: IndexedDB layer + localStorage migration

**Files:**
- Modify: `ai.html` (add IDB constants near top of `<script>`, add IDB section before existing state code, add init call to migrate + open DB before `renderApiKey()` at line 463)

- [ ] **Step 1: Add IDB constants and DOM-free helper skeleton**

Find the `const` block at the top of the `<script>` (currently around line 343-346 with `BASE_URL`/`MODEL`/`MAX_TOKENS`/`SYSTEM_PROMPT`). Replace it with:

```js
const BASE_URL = 'https://next-reader-psi.vercel.app/api/minimax';
const MODEL = 'MiniMax-M3';
const MAX_TOKENS = 8192;
const DEFAULT_SYSTEM_PROMPT = '你是一个简洁、准确的助手。优先用中文回答,除非用户用其他语言提问。';

const IDB_NAME = 'aiChatDb';
const IDB_VERSION = 1;
const STORE_CONV = 'conversations';
const STORE_SETTINGS = 'settings';
```

Then find the `state` declaration (around line 348-363) and add these fields without removing existing ones:

```js
const state = {
    apiKey: localStorage.getItem('aiApiKey') || '',
    showThinking: (() => {
        const v = localStorage.getItem('aiShowThinking');
        return v === null ? true : v === 'true';
    })(),
    defaultSystemPrompt: localStorage.getItem('aiDefaultSystemPrompt') || DEFAULT_SYSTEM_PROMPT,
    question: '',
    thinkingBuf: '',
    textBuf: '',
    currentBlockType: null,
    currentBlockIndex: -1,
    stopReason: null,
    isStreaming: false,
    abortController: null,
    rawAnswerEl: null,
    // new
    db: null,
    idbAvailable: true,
    conversations: [],
    currentConvId: null,
    currentMessages: [],
    searchQuery: '',
};
```

Also find `function buildRequestBody(question)` (line 472) and change `system: SYSTEM_PROMPT` to `system: state.defaultSystemPrompt`.

- [ ] **Step 2: Add IDB open + migration function**

Add this function block immediately after the `state` declaration (before the `dom` object around line 365):

```js
function openDb() {
    return new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
            reject(new Error('IndexedDB not supported'));
            return;
        }
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_CONV)) {
                const s = db.createObjectStore(STORE_CONV, { keyPath: 'id' });
                s.createIndex('byUpdated', 'updatedAt', { unique: false });
            }
            if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
                db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function migrateFromLocalStorage() {
    // localStorage → IDB 一次性迁移
    const lsApiKey = localStorage.getItem('aiApiKey');
    const lsThinking = localStorage.getItem('aiShowThinking');
    const lsPrompt = localStorage.getItem('aiDefaultSystemPrompt');
    const writes = [];
    if (lsApiKey) writes.push({ key: 'apiKey', value: lsApiKey });
    if (lsThinking !== null) writes.push({ key: 'showThinking', value: lsThinking });
    if (lsPrompt) writes.push({ key: 'defaultSystemPrompt', value: lsPrompt });
    if (writes.length === 0) {
        localStorage.setItem('ai.html:migrated', 'v1');
        return Promise.resolve();
    }
    return settingsPutMany(writes).then(() => {
        localStorage.removeItem('aiApiKey');
        localStorage.removeItem('aiShowThinking');
        localStorage.removeItem('aiDefaultSystemPrompt');
        localStorage.setItem('ai.html:migrated', 'v1');
    });
}
```

- [ ] **Step 3: Add IDB read/write helper functions**

Add right after `migrateFromLocalStorage`:

```js
function txStore(storeName, mode) {
    return state.db.transaction(storeName, mode).objectStore(storeName);
}

function reqToPromise(req) {
    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function settingsGet(key) {
    return reqToPromise(txStore(STORE_SETTINGS, 'readonly').get(key))
        .then(r => (r ? r.value : null));
}
function settingsPut(key, value) {
    return reqToPromise(txStore(STORE_SETTINGS, 'readwrite').put({ key, value }));
}
function settingsPutMany(pairs) {
    const tx = state.db.transaction(STORE_SETTINGS, 'readwrite');
    const s = tx.objectStore(STORE_SETTINGS);
    pairs.forEach(p => s.put(p));
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

function convGetAll() {
    return reqToPromise(txStore(STORE_CONV, 'readonly').getAll());
}
function convGet(id) {
    return reqToPromise(txStore(STORE_CONV, 'readonly').get(id));
}
function convPut(conv) {
    return reqToPromise(txStore(STORE_CONV, 'readwrite').put(conv));
}
function convDelete(id) {
    return reqToPromise(txStore(STORE_CONV, 'readwrite').delete(id));
}
```

- [ ] **Step 4: Wire init — open DB, migrate, load settings**

Find the init code near the bottom of the `<script>` (currently around line 463, just before `renderApiKey()`). Replace the existing settings load lines with:

```js
// Init 流程:迁移 → 开 DB → 读 settings → 覆盖 state
(async function init() {
    try {
        if (!localStorage.getItem('ai.html:migrated')) {
            // migration needs DB to be open; open first
            state.db = await openDb();
            await migrateFromLocalStorage();
        } else {
            state.db = await openDb();
        }
    } catch (err) {
        console.error('IDB init failed:', err);
        state.idbAvailable = false;
        showError('本地存储不可用,会话将无法保存(刷新后丢失)。请检查浏览器隐私模式。');
    }

    if (state.idbAvailable) {
        try {
            const apiKey = await settingsGet('apiKey');
            if (apiKey) state.apiKey = apiKey;
            const thinking = await settingsGet('showThinking');
            if (thinking !== null) state.showThinking = String(thinking) === 'true';
            const prompt = await settingsGet('defaultSystemPrompt');
            if (prompt) state.defaultSystemPrompt = prompt;
        } catch (err) {
            console.error('settings load failed:', err);
        }
    }

    renderApiKey();
    dom.showThinkingToggle.checked = state.showThinking;
    dom.showThinkingToggle.addEventListener('change', () => {
        state.showThinking = dom.showThinkingToggle.checked;
        if (state.idbAvailable) settingsPut('showThinking', String(state.showThinking)).catch(() => {});
        dom.thinkingSection.style.display = state.showThinking ? '' : 'none';
    });
    dom.thinkingSection.style.display = state.showThinking ? '' : 'none';

    updateSendEnabled();
    dom.questionInput.focus();
})();
```

- [ ] **Step 5: Manual verify**

Open `ai.html` in browser. Open DevTools → Application → IndexedDB → confirm `aiChatDb` exists with `conversations` and `settings` stores. Reload page — still exists.

If you previously had `aiApiKey` in localStorage: confirm it's now gone from `Application → Local Storage` and present in `settings` store (value = `apiKey` row). The "API Key" input should still show the masked dots on load.

If you didn't have anything: nothing in localStorage; settings store has whatever you set later.

- [ ] **Step 6: Commit**

```bash
git add ai.html
git commit -m "feat(ai.html): add IndexedDB layer and localStorage migration"
```

---

## Task 2: Conversation data model + helpers

**Files:**
- Modify: `ai.html` (add conversation helpers after the IDB helpers; add `<div id="sidebar">` placeholder; add stub renderSidebar call in init)

- [ ] **Step 1: Add conversation helpers**

Add right after the `convDelete` function from Task 1:

```js
function uuidv4() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

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
    if (state.idbAvailable) await convPut(conv);
    state.conversations.push(conv);
    return conv;
}

async function deleteConversation(id) {
    if (state.idbAvailable) await convDelete(id);
    state.conversations = state.conversations.filter(c => c.id !== id);
}

async function renameConversation(id, newTitle) {
    const conv = state.conversations.find(c => c.id === id);
    if (!conv) return;
    conv.title = newTitle.trim() || conv.title;
    conv.updatedAt = Date.now();
    if (state.idbAvailable) await convPut(conv);
}

async function updateConvMessages(id, messages) {
    const conv = state.conversations.find(c => c.id === id);
    if (!conv) return;
    conv.messages = messages;
    conv.updatedAt = Date.now();
    if (state.idbAvailable) await convPut(conv);
}

async function loadAllConversations() {
    if (!state.idbAvailable) {
        state.conversations = [];
        return;
    }
    const all = await convGetAll();
    state.conversations = all.sort((a, b) => b.updatedAt - a.updatedAt);
}

function relativeTime(ts) {
    const diff = Date.now() - ts;
    if (diff < 60_000) return '刚刚';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
    if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`;
    const d = new Date(ts);
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
```

- [ ] **Step 2: Add sidebar skeleton HTML**

Find `<main id="app">` near line 310. Replace it with:

```html
<main id="app">
    <aside id="sidebar">
        <div class="sidebar-header">
            <button id="newConvBtn" class="btn" type="button">+ 新对话</button>
            <input id="convSearchInput" class="sidebar-search" type="text" placeholder="搜索会话..." />
        </div>
        <div id="convList" class="conv-list"></div>
    </aside>
    <div class="main-area">
        <header id="topBar">
            <h1>ai</h1>
            <label for="apiKeyInput" id="apiKeyLabel">API Key:</label>
            <input id="apiKeyInput" type="password" placeholder="点击此处设置 API Key">
            <button id="apiKeySaveBtn" class="btn secondary" type="button">保存</button>
            <span class="model-badge">M3</span>
            <button id="settingsBtn" class="btn secondary icon-only" type="button" title="设置">⚙</button>
        </header>
        <div id="settingsRow">
            <label>
                <input id="showThinkingToggle" type="checkbox">
                显示思考
            </label>
        </div>
        <div id="errorBanner"></div>
        <div id="convHeader" class="conv-header hidden">
            <h2 id="convTitle" class="conv-title"></h2>
            <button id="convPromptBtn" class="btn secondary" type="button">本对话提示词</button>
        </div>
        <section id="messages" class="messages empty"></section>
    </div>
</main>
```

(Note: `thinkingSection` is no longer top-level; thinking is now per-message — see Task 4.)

- [ ] **Step 3: Add CSS for layout + sidebar**

Find the `</style>` tag near line 307. Insert just before it:

```css
#app {
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 0;
    max-width: 1200px;
    padding: 0;
}

#sidebar {
    background: #1a1a1a;
    border-right: 1px solid #2a2a2a;
    display: flex;
    flex-direction: column;
    height: 100vh;
    position: sticky;
    top: 0;
    overflow: hidden;
}
.main-area {
    padding: 20px 24px 140px;
    max-width: 900px;
    width: 100%;
    margin: 0 auto;
}
.sidebar-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border-bottom: 1px solid #2a2a2a;
}
.sidebar-search {
    width: 100%;
    padding: 6px 10px;
    font-size: 13px;
    background: #1e1e1e;
    color: #e0e0e0;
    border: 1px solid #333;
    border-radius: 4px;
    font-family: inherit;
    box-sizing: border-box;
}
.sidebar-search:focus { outline: none; border-color: #4fc3f7; }
.conv-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
}
.conv-item {
    padding: 10px 12px;
    cursor: pointer;
    border-bottom: 1px solid #222;
    display: flex;
    flex-direction: column;
    gap: 2px;
    position: relative;
}
.conv-item:hover { background: #232323; }
.conv-item.active { background: #2a3a4a; }
.conv-item-title {
    font-size: 13px;
    color: #e0e0e0;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.conv-item-preview {
    font-size: 11px;
    color: #888;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.conv-item-time {
    font-size: 10px;
    color: #666;
}
.conv-item-menu {
    position: absolute;
    right: 8px;
    top: 8px;
    background: #333;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 11px;
    cursor: pointer;
    display: none;
}
.conv-item:hover .conv-item-menu { display: block; }
.conv-list-empty {
    padding: 20px 12px;
    text-align: center;
    color: #666;
    font-size: 12px;
}
.icon-only { padding: 4px 10px; }
.model-badge {
    color: #888;
    font-size: 12px;
    padding: 4px 8px;
    background: #2a2a2a;
    border-radius: 4px;
    margin-left: auto;
}
.conv-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid #2a2a2a;
    margin-bottom: 12px;
}
.conv-header.hidden { display: none; }
.conv-title {
    font-size: 15px;
    color: #cfd8dc;
    font-weight: 500;
    margin: 0;
    cursor: pointer;
}
.conv-title:hover { color: #4fc3f7; }
```

Also remove the existing `#topBar` `position: sticky` and `width: 100%` rules since the layout changed. Find those rules and delete them; the new header sits inside `.main-area` normally.

- [ ] **Step 4: Add DOM refs and stub render functions**

In the `dom` object (around line 365), add new refs:

```js
const dom = {
    apiKeyInput: document.getElementById('apiKeyInput'),
    apiKeySaveBtn: document.getElementById('apiKeySaveBtn'),
    showThinkingToggle: document.getElementById('showThinkingToggle'),
    errorBanner: document.getElementById('errorBanner'),
    questionInput: document.getElementById('questionInput'),
    sendBtn: document.getElementById('sendBtn'),
    clearBtn: document.getElementById('clearBtn'),
    // new
    sidebar: document.getElementById('sidebar'),
    newConvBtn: document.getElementById('newConvBtn'),
    convSearchInput: document.getElementById('convSearchInput'),
    convList: document.getElementById('convList'),
    settingsBtn: document.getElementById('settingsBtn'),
    convHeader: document.getElementById('convHeader'),
    convTitle: document.getElementById('convTitle'),
    convPromptBtn: document.getElementById('convPromptBtn'),
    messages: document.getElementById('messages'),
};
```

Add stub render functions after the IDB helpers:

```js
function renderSidebar() {
    const q = state.searchQuery.toLowerCase();
    const list = state.conversations.filter(c => !q || c.title.toLowerCase().includes(q));
    if (list.length === 0) {
        dom.convList.innerHTML = `<div class="conv-list-empty">${q ? '没有匹配的会话' : '还没有会话'}</div>`;
        return;
    }
    dom.convList.innerHTML = '';
    list.forEach(conv => {
        const item = document.createElement('div');
        item.className = 'conv-item' + (conv.id === state.currentConvId ? ' active' : '');
        item.dataset.id = conv.id;
        const firstUser = conv.messages.find(m => m.role === 'user');
        const preview = firstUser ? firstUser.content.slice(0, 30) : '(空)';
        item.innerHTML = `
            <div class="conv-item-title">${escapeHtml(conv.title)}</div>
            <div class="conv-item-preview">${escapeHtml(preview)}</div>
            <div class="conv-item-time">${relativeTime(conv.updatedAt)}</div>
            <button class="conv-item-menu" type="button">⋯</button>
        `;
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('conv-item-menu')) return;
            switchConversation(conv.id);
        });
        item.querySelector('.conv-item-menu').addEventListener('click', (e) => {
            e.stopPropagation();
            showConvMenu(conv.id, item);
        });
        dom.convList.appendChild(item);
    });
}

function renderMessages() {
    const conv = state.conversations.find(c => c.id === state.currentConvId);
    if (!conv) {
        dom.messages.classList.add('empty');
        dom.messages.innerHTML = '选择或创建一个对话';
        return;
    }
    if (conv.messages.length === 0) {
        dom.messages.classList.add('empty');
        dom.messages.innerHTML = '在新对话中向 AI 提问...';
    } else {
        dom.messages.classList.remove('empty');
        dom.messages.innerHTML = '';
        // Task 4 fills in actual rendering
    }
    dom.convHeader.classList.remove('hidden');
    dom.convTitle.textContent = conv.title;
}

async function switchConversation(id) {
    state.currentConvId = id;
    const conv = state.conversations.find(c => c.id === id);
    if (conv) state.currentMessages = conv.messages;
    renderSidebar();
    renderMessages();
}

function showConvMenu(id, anchor) {
    // Task 5 implements this; stub for now
    alert('操作菜单待实现');
}
```

- [ ] **Step 5: Wire init to load conversations and select latest**

In the init function added in Task 1, after the settings loading block and before `renderApiKey()`, add:

```js
    if (state.idbAvailable) {
        try {
            await loadAllConversations();
        } catch (err) {
            console.error('load conversations failed:', err);
        }
    }
    if (state.conversations.length === 0) {
        try {
            const c = await createConversation();
            state.currentConvId = c.id;
            state.currentMessages = c.messages;
        } catch (err) {
            console.error('create initial conversation failed:', err);
        }
    } else {
        state.currentConvId = state.conversations[0].id;
        state.currentMessages = state.conversations[0].messages;
    }
    renderSidebar();
    renderMessages();
```

And after the init function, add stub for `+ 新对话` button:

```js
dom.newConvBtn.addEventListener('click', async () => {
    const c = await createConversation();
    state.currentConvId = c.id;
    state.currentMessages = c.messages;
    renderSidebar();
    renderMessages();
    dom.questionInput.focus();
});

dom.convSearchInput.addEventListener('input', () => {
    state.searchQuery = dom.convSearchInput.value;
    renderSidebar();
});
```

- [ ] **Step 6: Manual verify**

Open `ai.html`. You should see a left sidebar with one entry "新对话" highlighted, an empty main area with "在新对话中向 AI 提问...", and a search box at the top. Type in the search box — list filters in real time. Click "+ 新对话" — a new entry appears at the top, switches to it.

- [ ] **Step 7: Commit**

```bash
git add ai.html
git commit -m "feat(ai.html): add sidebar with conversation list and helpers"
```

---

## Task 3: Message rendering (read-only, for loaded history)

**Files:**
- Modify: `ai.html` (replace `renderMessages` stub with real renderer; add `renderMessage` helper)

- [ ] **Step 1: Add CSS for messages and per-message thinking**

Insert just before `</style>` (after the Task 2 CSS block):

```css
.messages {
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-height: 200px;
}
.messages.empty {
    color: #666;
    text-align: center;
    padding: 60px 0;
    font-size: 14px;
}
.message {
    display: flex;
    gap: 10px;
    align-items: flex-start;
}
.message.user { flex-direction: row-reverse; }
.message-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #333;
    color: #cfd8dc;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    flex-shrink: 0;
}
.message.user .message-avatar { background: #2a4a6a; }
.message.assistant .message-avatar { background: #2a4a3a; }
.message-body {
    background: #252525;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 10px 14px;
    max-width: calc(100% - 50px);
    flex: 1;
    min-width: 0;
}
.message.user .message-body {
    background: #1e2a3a;
    border-color: #2a3a4a;
}
.message-thought {
    margin-bottom: 10px;
    padding: 8px 10px;
    background: #1e1e1e;
    border-left: 2px solid #4fc3f7;
    border-radius: 4px;
    font-size: 12px;
    color: #9aa5b1;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: 'Consolas', 'Monaco', monospace;
}
.message-thought summary {
    cursor: pointer;
    color: #888;
    font-size: 11px;
    list-style: none;
    margin-bottom: 6px;
}
.message-thought summary::-webkit-details-marker { display: none; }
.message-thought summary::before { content: '▸ '; }
.message-thought[open] summary::before { content: '▾ '; }
.message-actions {
    display: flex;
    gap: 6px;
    margin-top: 8px;
    font-size: 11px;
}
.message-actions button {
    background: transparent;
    border: 1px solid #444;
    color: #888;
    padding: 2px 8px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
    font-family: inherit;
}
.message-actions button:hover { color: #4fc3f7; border-color: #4fc3f7; }
.message.streaming .message-body::after {
    content: '▌';
    color: #4fc3f7;
    animation: blink 1s steps(2) infinite;
    margin-left: 2px;
}
```

- [ ] **Step 2: Implement `renderMessage` and replace `renderMessages` stub**

Replace the `renderMessages` function from Task 2 with:

```js
function renderMessage(msg, opts = {}) {
    const wrap = document.createElement('div');
    wrap.className = `message ${msg.role}${opts.streaming ? ' streaming' : ''}`;
    wrap.dataset.id = opts.id || '';
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = msg.role === 'user' ? '我' : 'AI';
    const body = document.createElement('div');
    body.className = 'message-body';
    if (msg.role === 'assistant' && msg.thinking && state.showThinking) {
        const details = document.createElement('details');
        details.className = 'message-thought';
        const summary = document.createElement('summary');
        summary.textContent = '思考过程';
        const pre = document.createElement('pre');
        pre.style.cssText = 'margin:0; white-space:pre-wrap; word-break:break-word; font-family:inherit; font-size:12px; color:#9aa5b1;';
        pre.textContent = msg.thinking;
        details.appendChild(summary);
        details.appendChild(pre);
        body.appendChild(details);
    }
    const content = document.createElement('div');
    content.className = 'message-content';
    if (msg.content) {
        if (msg.role === 'user') {
            content.textContent = msg.content;
        } else {
            try {
                content.innerHTML = marked.parse(msg.content);
            } catch (err) {
                content.textContent = msg.content;
            }
            appendCodeCopyButtons(content);
        }
    }
    body.appendChild(content);
    if (msg.role === 'assistant' && !opts.streaming) {
        const actions = document.createElement('div');
        actions.className = 'message-actions';
        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.textContent = '复制';
        copyBtn.addEventListener('click', () => copyMessageToClipboard(msg, copyBtn));
        const regenBtn = document.createElement('button');
        regenBtn.type = 'button';
        regenBtn.textContent = '重新生成';
        regenBtn.disabled = state.isStreaming;
        regenBtn.addEventListener('click', () => regenerateLast());
        actions.appendChild(copyBtn);
        actions.appendChild(regenBtn);
        body.appendChild(actions);
    }
    wrap.appendChild(avatar);
    wrap.appendChild(body);
    return wrap;
}

function renderMessages() {
    const conv = state.conversations.find(c => c.id === state.currentConvId);
    if (!conv) {
        dom.messages.classList.add('empty');
        dom.messages.innerHTML = '选择或创建一个对话';
        dom.convHeader.classList.add('hidden');
        return;
    }
    if (conv.messages.length === 0) {
        dom.messages.classList.add('empty');
        dom.messages.innerHTML = '在新对话中向 AI 提问...';
    } else {
        dom.messages.classList.remove('empty');
        dom.messages.innerHTML = '';
        conv.messages.forEach((msg, idx) => {
            const el = renderMessage(msg, { id: idx });
            dom.messages.appendChild(el);
        });
    }
    dom.convHeader.classList.remove('hidden');
    dom.convTitle.textContent = conv.title;
    dom.messages.scrollTop = dom.messages.scrollHeight;
}

async function copyMessageToClipboard(msg, btn) {
    try {
        await navigator.clipboard.writeText(msg.content || '');
    } catch (err) {
        const ta = document.createElement('textarea');
        ta.value = msg.content || '';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
    }
    const old = btn.textContent;
    btn.textContent = '✓';
    setTimeout(() => { btn.textContent = old; }, 1200);
}

async function regenerateLast() {
    // Task 4 wires this with streaming; stub here
    alert('重新生成待实现');
}
```

- [ ] **Step 3: Manual verify**

Refresh `ai.html`. Type a question in the textarea, but don't send (we'll wire send in Task 4). To pre-seed a conversation for testing, open DevTools console and run:

```js
(async () => {
    const c = (await indexedDB.open('aiChatDb')).result.transaction('conversations', 'readwrite').objectStore('conversations');
    const conv = { id: crypto.randomUUID(), title: '测试', createdAt: Date.now(), updatedAt: Date.now(), systemPromptOverride: null, model: 'MiniMax-M3', messages: [
        { role: 'user', content: '你好', ts: Date.now() },
        { role: 'assistant', content: '## 你好\n这是 **回复**。\n```js\nconsole.log(1);\n```', thinking: 'thinking...', ts: Date.now() }
    ]};
    c.put(conv);
    location.reload();
})();
```

After reload, you should see the seeded conversation with user message (right, blue) and assistant message (left, with title/bold/code block rendered, thinking folded).

- [ ] **Step 4: Commit**

```bash
git add ai.html
git commit -m "feat(ai.html): render messages with per-message thinking and actions"
```

---

## Task 4: Streaming with IDB writes

**Files:**
- Modify: `ai.html` (refactor streaming to attach to message + write IDB; replace `send` and related; remove top-level thinkingSection usage)

- [ ] **Step 1: Remove top-level thinkingSection from HTML and state**

In the body, remove `<details id="thinkingSection">` and `<div id="thinkingContent">` (already removed in Task 2's HTML rewrite, but verify).

In `state`, remove `thinkingBuf`, `textBuf`, `currentBlockType`, `currentBlockIndex`, `stopReason`, `rawAnswerEl`. Replace with:

```js
// streaming state (lives on assistant message during stream)
let streamingMsg = null;     // { role:'assistant', content:'', thinking:'', ts }
let streamingBubble = null;   // { content, thought, body }
```

- [ ] **Step 2: Add streaming helpers**

After `regenerateLast` from Task 3, add:

```js
function appendStreamBubble(msg) {
    streamingMsg = msg;
    const conv = state.conversations.find(c => c.id === state.currentConvId);
    if (conv) conv.messages.push(msg);
    streamingBubble = {
        content: document.createElement('div'),
        thought: document.createElement('pre'),
    };
    streamingBubble.content.className = 'message-content';
    streamingBubble.thought.style.cssText = 'margin:0; white-space:pre-wrap; word-break:break-word; font-family:inherit; font-size:12px; color:#9aa5b1;';

    const wrap = document.createElement('div');
    wrap.className = 'message assistant streaming';
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = 'AI';
    const body = document.createElement('div');
    body.className = 'message-body';
    if (state.showThinking) {
        const details = document.createElement('details');
        details.className = 'message-thought';
        details.open = true;
        const summary = document.createElement('summary');
        summary.textContent = '思考过程';
        details.appendChild(summary);
        details.appendChild(streamingBubble.thought);
        body.appendChild(details);
    }
    body.appendChild(streamingBubble.content);
    wrap.appendChild(avatar);
    wrap.appendChild(body);
    dom.messages.classList.remove('empty');
    dom.messages.appendChild(wrap);
    streamingBubble.body = body;
    streamingBubble.wrap = wrap;
}

function updateStreamDom() {
    if (!streamingBubble) return;
    streamingBubble.thought.textContent = streamingMsg.thinking;
    streamingBubble.content.textContent = streamingMsg.content;
    dom.messages.scrollTop = dom.messages.scrollHeight;
}

async function persistStreamingMsg() {
    if (!streamingMsg) return;
    const conv = state.conversations.find(c => c.id === state.currentConvId);
    if (conv) await updateConvMessages(conv.id, conv.messages);
}
```

- [ ] **Step 3: Refactor streaming SSE handlers to write into `streamingMsg`**

Find the existing SSE event handlers (`handleSsePayload` and the `content_block_delta` block around line 572-585). Replace the relevant parts to use `streamingMsg`:

```js
function handleSsePayload(eventName, payload) {
    switch (eventName) {
        case 'message_start':
            // no-op; stopReason read at end
            break;
        case 'content_block_start':
            // block type tracked implicitly via which buffer gets deltas
            break;
        case 'content_block_delta': {
            const delta = payload.delta || {};
            if (delta.type === 'text_delta' || typeof delta.text === 'string') {
                streamingMsg.content += delta.text || '';
                updateStreamDom();
            } else if (delta.type === 'thinking_delta' || typeof delta.thinking === 'string') {
                streamingMsg.thinking += (delta.thinking || delta.text || '');
                updateStreamDom();
            }
            break;
        }
        case 'content_block_stop':
            persistStreamingMsg();
            break;
        case 'message_delta':
            if (payload.delta && payload.delta.stop_reason) {
                streamingMsg.stopReason = payload.delta.stop_reason;
            }
            break;
        case 'message_stop':
            break;
        default:
            break;
    }
}
```

- [ ] **Step 4: Refactor `send()` to use new model**

Find `async function send()` (line 711) and replace it with:

```js
async function send() {
    if (state.isStreaming) {
        if (state.abortController) state.abortController.abort();
        return;
    }
    const question = dom.questionInput.value.trim();
    if (!question) return;
    if (!state.apiKey) {
        showError('请先在顶部设置 API Key。');
        dom.apiKeyInput.focus();
        return;
    }
    const conv = state.conversations.find(c => c.id === state.currentConvId);
    if (!conv) {
        showError('没有当前对话。');
        return;
    }
    showError(null);
    dom.questionInput.value = '';
    dom.questionInput.style.height = 'auto';
    updateSendEnabled();

    // push user message
    const userMsg = { role: 'user', content: question, ts: Date.now() };
    conv.messages.push(userMsg);
    if (conv.title === '新对话') {
        conv.title = question.slice(0, 20);
        dom.convTitle.textContent = conv.title;
    }
    await updateConvMessages(conv.id, conv.messages);
    renderSidebar();
    const userEl = renderMessage(userMsg, { id: conv.messages.length - 1 });
    dom.messages.classList.remove('empty');
    dom.messages.appendChild(userEl);

    // create assistant message and bubble
    const asstMsg = { role: 'assistant', content: '', thinking: '', ts: Date.now() };
    appendStreamBubble(asstMsg);
    await updateConvMessages(conv.id, conv.messages);

    state.abortController = new AbortController();
    setSendButtonState(true);

    try {
        await callApi(conv);
        if (!streamingMsg.content && streamingMsg.thinking) {
            streamingMsg.content = '（模型仅返回了思考过程,无最终答复。）';
            updateStreamDom();
        }
        // swap streaming bubble for final rendered message
        streamingBubble.wrap.remove();
        const final = renderMessage(streamingMsg, { id: conv.messages.length - 1 });
        dom.messages.appendChild(final);
        if (streamingMsg.stopReason === 'max_tokens') {
            const note = document.createElement('p');
            note.style.cssText = 'color:#888; font-size:12px; margin-top:8px; font-style:italic;';
            note.textContent = '…(响应被截断,达到 max_tokens 限制)';
            final.querySelector('.message-body').appendChild(note);
        }
        await updateConvMessages(conv.id, conv.messages);
    } catch (err) {
        if (err.name === 'AbortError') {
            // user cancelled; keep partial
            const note = document.createElement('p');
            note.style.cssText = 'color:#888; font-size:12px; margin-top:8px; font-style:italic;';
            note.textContent = '(已中止)';
            streamingBubble.body.appendChild(note);
        } else if (err.status) {
            const map = {
                401: 'API Key 无效或已过期。',
                403: '无权访问,请检查账户或区域。',
                404: '模型或接口路径错误。',
                429: '请求过于频繁,请稍后重试。',
            };
            showError(map[err.status] || `服务器错误 (${err.status}),请稍后重试。`);
        } else {
            showError(`网络错误: ${err.message || err}`);
        }
        streamingBubble.wrap.classList.remove('streaming');
        const final = renderMessage(streamingMsg, { id: conv.messages.length - 1 });
        streamingBubble.wrap.replaceWith(final);
        await updateConvMessages(conv.id, conv.messages);
    } finally {
        streamingMsg = null;
        streamingBubble = null;
        setSendButtonState(false);
        state.abortController = null;
        updateSendEnabled();
    }
}
```

- [ ] **Step 5: Update `callApi` to use conversation's effective system prompt**

Find `function buildRequestBody(question)` and replace with:

```js
function buildRequestBody(conv, question) {
    const prompt = conv.systemPromptOverride || state.defaultSystemPrompt;
    const body = {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: prompt,
        messages: [{ role: 'user', content: question }],
        stream: true,
    };
    if (state.showThinking) body.thinking = { type: 'enabled' };
    return body;
}

async function callApi(conv) {
    const body = buildRequestBody(conv, conv.messages[conv.messages.length - 2].content);
    const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: state.abortController.signal,
    });
    if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`);
        err.status = res.status;
        throw err;
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream')) {
        const json = await res.json();
        await handleNonStreaming(json);
        return;
    }
    await parseSseStream(res.body);
}
```

- [ ] **Step 6: Implement `regenerateLast` and `clearAll` updates**

Replace `regenerateLast` stub with:

```js
async function regenerateLast() {
    if (state.isStreaming) return;
    const conv = state.conversations.find(c => c.id === state.currentConvId);
    if (!conv || conv.messages.length < 2) return;
    // remove last assistant message
    const last = conv.messages[conv.messages.length - 1];
    if (last.role !== 'assistant') return;
    conv.messages.pop();
    await updateConvMessages(conv.id, conv.messages);
    // re-send last user
    const lastUser = conv.messages[conv.messages.length - 1];
    dom.questionInput.value = lastUser.content;
    await send();
}
```

Replace `clearAll` with:

```js
function clearAll() {
    if (state.isStreaming && state.abortController) {
        state.abortController.abort();
    }
    dom.questionInput.value = '';
    showError(null);
    updateSendEnabled();
    dom.questionInput.focus();
}
```

- [ ] **Step 7: Manual verify**

Open `ai.html`. Click "+ 新对话" to make a new conversation. Type "你好" and press Ctrl+Enter. Confirm:
- User message appears immediately (right side, blue)
- Assistant bubble appears with thinking (if enabled) and live text
- After stream ends, bubble is replaced with final rendered Markdown
- In DevTools → IndexedDB → conversations store, find the conversation, confirm it has both messages persisted
- Reload page → conversation still there, messages still rendered

- [ ] **Step 8: Commit**

```bash
git add ai.html
git commit -m "feat(ai.html): refactor streaming to persist messages to IDB"
```

---

## Task 5: Conversation rename and delete

**Files:**
- Modify: `ai.html` (replace `showConvMenu` stub; add rename + delete handlers)

- [ ] **Step 1: Implement `showConvMenu` with inline rename and delete**

Replace the stub `showConvMenu` with:

```js
function showConvMenu(id, anchor) {
    // remove any existing menu
    document.querySelectorAll('.conv-context-menu').forEach(m => m.remove());
    const menu = document.createElement('div');
    menu.className = 'conv-context-menu';
    menu.style.cssText = 'position:absolute; right:12px; top:' + (anchor.offsetTop + 30) + 'px; background:#2a2a2a; border:1px solid #444; border-radius:4px; padding:4px 0; z-index:100; min-width:120px; box-shadow:0 4px 8px rgba(0,0,0,0.4);';
    menu.innerHTML = `
        <div class="menu-item" data-act="rename">重命名</div>
        <div class="menu-item" data-act="delete" style="color:#ef5350;">删除</div>
    `;
    anchor.parentNode.appendChild(menu);
    menu.querySelectorAll('.menu-item').forEach(item => {
        item.style.cssText = 'padding:6px 12px; cursor:pointer; font-size:13px;';
        item.addEventListener('mouseenter', () => item.style.background = '#333');
        item.addEventListener('mouseleave', () => item.style.background = '');
        item.addEventListener('click', async () => {
            menu.remove();
            const act = item.dataset.act;
            if (act === 'rename') {
                const conv = state.conversations.find(c => c.id === id);
                if (!conv) return;
                const newTitle = prompt('重命名会话:', conv.title);
                if (newTitle !== null) {
                    await renameConversation(id, newTitle);
                    if (id === state.currentConvId) dom.convTitle.textContent = conv.title;
                    renderSidebar();
                }
            } else if (act === 'delete') {
                if (!confirm('确定删除此会话?')) return;
                await deleteConversation(id);
                if (id === state.currentConvId) {
                    if (state.conversations.length === 0) {
                        const c = await createConversation();
                        state.currentConvId = c.id;
                        state.currentMessages = c.messages;
                    } else {
                        state.currentConvId = state.conversations[0].id;
                        state.currentMessages = state.conversations[0].messages;
                    }
                    renderMessages();
                }
                renderSidebar();
            }
        });
    });
    const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
}
```

- [ ] **Step 2: Wire conv title click for inline rename**

Find where `dom.convTitle` is set up. Currently it's only set via `dom.convTitle.textContent = conv.title;`. Add a click handler in init (or in `renderMessages`):

```js
dom.convTitle.addEventListener('click', async () => {
    const conv = state.conversations.find(c => c.id === state.currentConvId);
    if (!conv) return;
    const newTitle = prompt('重命名会话:', conv.title);
    if (newTitle !== null) {
        await renameConversation(conv.id, newTitle);
        dom.convTitle.textContent = conv.title;
        renderSidebar();
    }
});
```

Add this once in init (not inside renderMessages, to avoid binding repeatedly).

- [ ] **Step 3: Manual verify**

Click ⋯ on a conversation → menu appears with 重命名 / 删除. Click 重命名 → prompt appears → type new name → list and conv title update. Click 删除 on a non-current conversation → confirm → removed. Click 删除 on the current conversation → confirm → it's removed and the next conversation is selected (or new empty one created if it was the last).

- [ ] **Step 4: Commit**

```bash
git add ai.html
git commit -m "feat(ai.html): add conversation rename and delete via context menu"
```

---

## Task 6: Settings modal (global default system prompt)

**Files:**
- Modify: `ai.html` (add settings modal HTML + CSS; wire gear button; persist default prompt)

- [ ] **Step 1: Add settings modal HTML**

Find `</main>` (end of main element) and add before it:

```html
<div id="settingsModal" class="modal" hidden>
    <div id="settingsModalBackdrop" class="modal-backdrop"></div>
    <div class="modal-panel">
        <h2 class="modal-title">设置</h2>
        <div class="modal-field">
            <label for="defaultPromptInput">默认系统提示词</label>
            <textarea id="defaultPromptInput" class="modal-textarea" rows="6"></textarea>
            <button id="resetPromptBtn" class="btn secondary" type="button">恢复默认</button>
        </div>
        <div class="modal-field">
            <button id="clearAllConvsBtn" class="btn danger" type="button">清空所有会话</button>
        </div>
        <div class="modal-actions">
            <button id="settingsOkBtn" class="btn" type="button">保存</button>
            <button id="settingsCancelBtn" class="btn secondary" type="button">取消</button>
        </div>
    </div>
</div>
```

- [ ] **Step 2: Add modal CSS**

Insert before `</style>`:

```css
.modal {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
}
.modal[hidden] { display: none; }
.modal-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
}
.modal-panel {
    position: relative;
    background: #252525;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 20px 24px;
    min-width: 400px;
    max-width: 600px;
    display: flex;
    flex-direction: column;
    gap: 14px;
}
.modal-title {
    font-size: 16px;
    color: #cfd8dc;
    margin: 0;
    font-weight: 600;
}
.modal-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.modal-field label {
    font-size: 12px;
    color: #888;
}
.modal-textarea {
    background: #1e1e1e;
    color: #e0e0e0;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 8px 10px;
    font-size: 13px;
    font-family: inherit;
    resize: vertical;
    min-height: 80px;
}
.modal-textarea:focus { outline: none; border-color: #4fc3f7; }
.modal-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}
.btn.danger {
    background: #7f1d1d;
    color: #fff;
}
.btn.danger:hover { background: #991b1b; }
```

- [ ] **Step 3: Add DOM refs and modal logic**

Add to `dom` object:

```js
settingsModal: document.getElementById('settingsModal'),
settingsModalBackdrop: document.getElementById('settingsModalBackdrop'),
defaultPromptInput: document.getElementById('defaultPromptInput'),
resetPromptBtn: document.getElementById('resetPromptBtn'),
clearAllConvsBtn: document.getElementById('clearAllConvsBtn'),
settingsOkBtn: document.getElementById('settingsOkBtn'),
settingsCancelBtn: document.getElementById('settingsCancelBtn'),
```

Add functions:

```js
function openSettingsModal() {
    dom.defaultPromptInput.value = state.defaultSystemPrompt;
    dom.settingsModal.hidden = false;
}
function closeSettingsModal() {
    dom.settingsModal.hidden = true;
}
async function saveSettings() {
    const v = dom.defaultPromptInput.value.trim();
    if (!v) {
        showError('默认系统提示词不能为空');
        return;
    }
    state.defaultSystemPrompt = v;
    if (state.idbAvailable) await settingsPut('defaultSystemPrompt', v);
    closeSettingsModal();
    showError(null);
}
```

Add init wiring:

```js
dom.settingsBtn.addEventListener('click', openSettingsModal);
dom.settingsModalBackdrop.addEventListener('click', closeSettingsModal);
dom.settingsCancelBtn.addEventListener('click', closeSettingsModal);
dom.settingsOkBtn.addEventListener('click', saveSettings);
dom.resetPromptBtn.addEventListener('click', () => {
    dom.defaultPromptInput.value = DEFAULT_SYSTEM_PROMPT;
});
dom.clearAllConvsBtn.addEventListener('click', async () => {
    if (!confirm('确定清空所有会话?此操作不可恢复。')) return;
    for (const c of [...state.conversations]) {
        await deleteConversation(c.id);
    }
    const fresh = await createConversation();
    state.currentConvId = fresh.id;
    state.currentMessages = fresh.messages;
    renderSidebar();
    renderMessages();
    closeSettingsModal();
});
```

- [ ] **Step 4: Manual verify**

Click ⚙ in top bar. Modal opens with current default prompt. Edit text, click "恢复默认" — reverts. Click "保存" — modal closes, new default applies to next new conversation (verify by clicking "+ 新对话" then sending — AI behavior matches the new prompt).

Click "清空所有会话" — confirm — all gone, one fresh empty conversation created and selected.

- [ ] **Step 5: Commit**

```bash
git add ai.html
git commit -m "feat(ai.html): add settings modal for default system prompt and clear all"
```

---

## Task 7: Per-conversation system prompt override

**Files:**
- Modify: `ai.html` (add per-conv prompt modal + "本对话提示词" button behavior)

- [ ] **Step 1: Add per-conversation prompt modal HTML**

Add right after the settings modal (before the closing `</main>` or wherever modals cluster):

```html
<div id="convPromptModal" class="modal" hidden>
    <div id="convPromptModalBackdrop" class="modal-backdrop"></div>
    <div class="modal-panel">
        <h2 class="modal-title">本对话提示词</h2>
        <div class="modal-field">
            <textarea id="convPromptInput" class="modal-textarea" rows="6" placeholder="留空则使用默认系统提示词"></textarea>
        </div>
        <div class="modal-actions">
            <button id="convPromptOkBtn" class="btn" type="button">保存</button>
            <button id="convPromptClearBtn" class="btn secondary" type="button">恢复默认</button>
            <button id="convPromptCancelBtn" class="btn secondary" type="button">取消</button>
        </div>
    </div>
</div>
```

- [ ] **Step 2: Add DOM refs and logic**

Add to `dom`:

```js
convPromptModal: document.getElementById('convPromptModal'),
convPromptModalBackdrop: document.getElementById('convPromptModalBackdrop'),
convPromptInput: document.getElementById('convPromptInput'),
convPromptOkBtn: document.getElementById('convPromptOkBtn'),
convPromptClearBtn: document.getElementById('convPromptClearBtn'),
convPromptCancelBtn: document.getElementById('convPromptCancelBtn'),
```

Add functions and wiring:

```js
function openConvPromptModal() {
    const conv = state.conversations.find(c => c.id === state.currentConvId);
    if (!conv) return;
    dom.convPromptInput.value = conv.systemPromptOverride || '';
    dom.convPromptModal.hidden = false;
}
function closeConvPromptModal() {
    dom.convPromptModal.hidden = true;
}
async function saveConvPrompt() {
    const conv = state.conversations.find(c => c.id === state.currentConvId);
    if (!conv) return;
    const v = dom.convPromptInput.value.trim();
    conv.systemPromptOverride = v || null;
    await updateConvMessages(conv.id, conv.messages);  // also bumps updatedAt
    await convPut(conv).catch(() => {});
    closeConvPromptModal();
}
async function clearConvPrompt() {
    const conv = state.conversations.find(c => c.id === state.currentConvId);
    if (!conv) return;
    conv.systemPromptOverride = null;
    await convPut(conv).catch(() => {});
    closeConvPromptModal();
}
```

Add init wiring:

```js
dom.convPromptBtn.addEventListener('click', openConvPromptModal);
dom.convPromptModalBackdrop.addEventListener('click', closeConvPromptModal);
dom.convPromptCancelBtn.addEventListener('click', closeConvPromptModal);
dom.convPromptOkBtn.addEventListener('click', saveConvPrompt);
dom.convPromptClearBtn.addEventListener('click', clearConvPrompt);
```

- [ ] **Step 3: Manual verify**

Open a conversation, click "本对话提示词". Modal shows current override (empty if none). Type a custom prompt like "只用英文回答", save. Send a question — AI responds in English. Open another conversation (different topic), no override — uses default.

- [ ] **Step 4: Commit**

```bash
git add ai.html
git commit -m "feat(ai.html): add per-conversation system prompt override"
```

---

## Task 8: Markdown CSS enhancements (no library changes)

**Files:**
- Modify: `ai.html` (add CSS for tables, lists, blockquotes, headings, paragraphs)

- [ ] **Step 1: Add Markdown body CSS**

Insert before `</style>`:

```css
.message-content { font-size: 14px; line-height: 1.7; color: #e0e0e0; }
.message-content h1, .message-content h2, .message-content h3 {
    color: #cfd8dc;
    font-weight: 600;
    margin: 18px 0 10px;
    line-height: 1.3;
}
.message-content h1 { font-size: 20px; }
.message-content h2 { font-size: 17px; }
.message-content h3 { font-size: 15px; }
.message-content p { margin: 8px 0; }
.message-content ul, .message-content ol { padding-left: 24px; margin: 8px 0; }
.message-content li { margin: 4px 0; }
.message-content blockquote {
    border-left: 3px solid #4fc3f7;
    background: #252525;
    margin: 10px 0;
    padding: 8px 12px;
    color: #b0bec5;
}
.message-content table {
    border-collapse: collapse;
    margin: 12px 0;
    width: auto;
    font-size: 13px;
}
.message-content th {
    background: #252525;
    color: #cfd8dc;
    text-align: left;
    padding: 6px 12px;
    border: 1px solid #333;
}
.message-content td {
    padding: 6px 12px;
    border: 1px solid #333;
}
.message-content pre {
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 6px;
    padding: 12px;
    margin: 10px 0;
    overflow-x: auto;
    position: relative;
}
.message-content :not(pre) > code {
    background: #2d2d2d;
    color: #ffb74d;
    padding: 1px 6px;
    border-radius: 3px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 0.9em;
}
.message-content pre code {
    background: transparent;
    color: inherit;
    padding: 0;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 13px;
}
```

- [ ] **Step 2: Manual verify**

Send a question asking for "一个表格对比 Python 和 JS 的差异". The table should have:
- Visible borders
- Header row with `#252525` background
- Cell padding

Also test a blockquote and a heading — visual styling should match the dark theme.

- [ ] **Step 3: Commit**

```bash
git add ai.html
git commit -m "feat(ai.html): enhance Markdown CSS for tables, lists, blockquotes"
```

---

## Task 9: Code syntax highlighting with highlight.js

**Files:**
- Modify: `ai.html` (add highlight.js CDN to `<head>`; add marked-highlight to script; reconfigure marked)

- [ ] **Step 1: Add CDN scripts**

Find the existing `<script src="https://cdn.jsdelivr.net/npm/marked@12.0.0/marked.min.js">` line. Add right before it:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/atom-one-dark.min.css">
<script src="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/common.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/marked-highlight@2.1.2/lib/index.umd.min.js"></script>
```

- [ ] **Step 2: Reconfigure marked to use highlight.js**

Find `marked.setOptions({ breaks: true, gfm: true });` (around line 378) and replace with:

```js
const hljs = window.hljs;
const { Marked } = window.MarkedHighlight || {};
if (Marked && hljs) {
    const m = new Marked(markedHighlight = {
        langPrefix: 'hljs language-',
        highlight(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                try { return hljs.highlight(code, { language: lang }).value; }
                catch (err) { return code; }
            }
            return code;
        },
    }));
    m.setOptions({ breaks: true, gfm: true });
    window.marked = m;  // shadow global marked with configured instance
}
marked.setOptions({ breaks: true, gfm: true });  // fallback if marked-highlight not loaded
```

Note: the simplest robust path is to use the global `marked` if marked-highlight isn't available. If it is, replace global. Then in `renderMessage` and `appendStreamBubble`, `marked.parse(...)` calls work either way.

- [ ] **Step 3: Manual verify**

Send a question like "写一个 Python 快速排序". The ```python code block should render with syntax colors (keywords like `def`, `if` in one color; strings in another; etc., per atom-one-dark theme).

Test a code block without language tag (` ```\nplaintext\n``` `) — should NOT highlight, just plain monospace text.

- [ ] **Step 4: Commit**

```bash
git add ai.html
git commit -m "feat(ai.html): integrate highlight.js for code block syntax highlighting"
```

---

## Task 10: Hotkeys (Ctrl+N, Ctrl+K, Ctrl+R, ↑↓ in search)

**Files:**
- Modify: `ai.html` (add global keydown listener)

- [ ] **Step 1: Add global keydown handler**

After the existing `dom.questionInput.addEventListener('keydown', ...)` blocks (around line 800), add:

```js
document.addEventListener('keydown', async (e) => {
    if (dom.settingsModal && !dom.settingsModal.hidden) return;
    if (dom.convPromptModal && !dom.convPromptModal.hidden) return;
    if (e.ctrlKey && !e.shiftKey && !e.altKey && e.code === 'KeyN') {
        e.preventDefault();
        const c = await createConversation();
        state.currentConvId = c.id;
        state.currentMessages = c.messages;
        renderSidebar();
        renderMessages();
        dom.questionInput.focus();
        return;
    }
    if (e.ctrlKey && !e.shiftKey && !e.altKey && e.code === 'KeyK') {
        e.preventDefault();
        dom.convSearchInput.focus();
        dom.convSearchInput.select();
        return;
    }
    if (e.ctrlKey && !e.shiftKey && !e.altKey && e.code === 'KeyR') {
        if (state.isStreaming) return;
        e.preventDefault();
        regenerateLast();
        return;
    }
});
```

Add the search ↑↓ handler in the conv search input's keydown:

```js
dom.convSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = Array.from(dom.convList.querySelectorAll('.conv-item'));
        if (items.length === 0) return;
        let activeIdx = items.findIndex(el => el.classList.contains('active'));
        let nextIdx;
        if (e.key === 'ArrowDown') nextIdx = Math.min(items.length - 1, activeIdx + 1);
        else nextIdx = Math.max(0, activeIdx - 1);
        if (activeIdx >= 0) items[activeIdx].style.outline = '';
        items[nextIdx].classList.add('active');
        items[nextIdx].style.outline = '2px solid #4fc3f7';
        items[nextIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
        e.preventDefault();
        const active = dom.convList.querySelector('.conv-item[style*="outline"]');
        if (active) active.click();
    } else if (e.key === 'Escape') {
        dom.convSearchInput.value = '';
        state.searchQuery = '';
        renderSidebar();
        dom.convSearchInput.blur();
    }
});
```

- [ ] **Step 2: Manual verify**

- Press Ctrl+N anywhere on page → new conversation created and selected
- Press Ctrl+K → search box focused; type; press ↓/↑ to highlight items; press Enter to switch
- Press Ctrl+R (when last msg is assistant, not streaming) → regenerates that response
- Press Escape in search box → clears search and blurs

- [ ] **Step 3: Commit**

```bash
git add ai.html
git commit -m "feat(ai.html): add global hotkeys for new/search/regenerate"
```

---

## Task 11: Edge case polish (search no-result, IDB failure, cross-tab sync)

**Files:**
- Modify: `ai.html` (already mostly done in earlier tasks; add final polish)

- [ ] **Step 1: Verify search empty state**

In `renderSidebar` (already handles `q ? '没有匹配的会话' : '还没有会话'`), verify the empty case. Open the page, type a non-matching string in search → "没有匹配的会话" appears. Clear search → list reappears.

- [ ] **Step 2: Verify IDB failure fallback**

Open DevTools → Application → Storage → "Clear site data" then immediately disable IndexedDB via DevTools (`Application → Storage` panel → uncheck IndexedDB). Reload page. Confirm:
- Top banner shows "本地存储不可用..."
- New conversation button still works (creates in-memory only)
- Reload page → state lost (no persistence, expected)

Restore IndexedDB and reload → all functionality back to normal.

- [ ] **Step 3: Add storage event listener for cross-tab migration sync**

After the init function, add:

```js
window.addEventListener('storage', (e) => {
    if (e.key === 'ai.html:migrated' && e.newValue === 'v1' && !state.idbAvailable) {
        location.reload();
    }
});
```

This handles the case where the user has the page open in one tab, opens it in another tab after migration runs in the first — second tab reloads to pick up IDB.

- [ ] **Step 4: Connection interrupted handling**

In `send()` catch block, add a specific branch for network errors (no `err.status`):

```js
} else if (err.name === 'AbortError') {
    // (existing) user cancelled
} else if (err.status) {
    // (existing) HTTP error
} else {
    showError(`网络错误: ${err.message || err}`);
    streamingBubble.body.insertAdjacentHTML('beforeend', '<p style="color:#888; font-size:12px; margin-top:8px; font-style:italic;">(连接中断)</p>');
}
```

- [ ] **Step 5: Manual verify**

Edge cases:
- Search non-match → "没有匹配的会话"
- IDB disabled → banner shows, app still usable
- Disable network mid-stream → "(连接中断)" gray note appears, partial content kept

- [ ] **Step 6: Commit**

```bash
git add ai.html
git commit -m "feat(ai.html): edge case polish (search empty, IDB fallback, conn interrupt)"
```

---

## Task 12: Self-review pass

**Files:**
- Modify: `ai.html` (read through; fix any inconsistencies)

- [ ] **Step 1: Spec coverage check**

Verify all spec sections are implemented:

| Spec section | Implemented in |
|---|---|
| Data model (conversations, settings) | Task 1 |
| localStorage migration | Task 1 |
| Sidebar layout | Task 2 |
| Search | Task 2 |
| New/rename/delete | Task 2 + Task 5 |
| Switch conversation | Task 2 + Task 4 |
| Streaming with IDB writes | Task 4 |
| Global default system prompt | Task 6 |
| Per-conversation override | Task 7 |
| Code highlighting | Task 9 |
| Markdown CSS | Task 8 |
| Hotkeys (Ctrl+N/K/R, ↑↓) | Task 10 |
| Error handling (IDB fail, conn interrupt) | Task 1 + Task 11 |
| Edge case: search no result | Task 11 |
| Edge case: refresh loads latest | Task 1 (init) |
| Edge case: switch mid-stream aborts | Task 2 (`switchConversation` needs abort) |

- [ ] **Step 2: Fix `switchConversation` to abort in-flight stream**

If not already done in Task 2, ensure `switchConversation` aborts any active stream before switching. Update the function:

```js
async function switchConversation(id) {
    if (state.isStreaming && state.abortController) {
        state.abortController.abort();
        // wait for send()'s finally to complete
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
}
```

- [ ] **Step 3: Manual smoke test of full flow**

Run through the spec's testing strategy (section "Testing Strategy") end-to-end. Note any glitches; fix and re-test.

- [ ] **Step 4: Final commit**

```bash
git add ai.html
git commit -m "chore(ai.html): self-review pass, fix switchConversation abort handling"
```

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-10-13-ai-html-redesign.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
