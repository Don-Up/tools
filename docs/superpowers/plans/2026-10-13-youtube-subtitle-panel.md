# YouTube Subtitle Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Edge MV3 extension that injects a right-side bilingual subtitle panel on YouTube `/watch` pages with auto-scroll-to-center and click-to-seek.

**Architecture:** Single content script (no background, no popup). Reads `ytInitialPlayerResponse` for caption tracks, fetches JSON3 cues, polls `<video>.currentTime` at 10 Hz, renders a 360px right-column panel. State persisted via `chrome.storage.sync`. SPA navigation re-triggers fetch. Matches the `card-timer-sidebar/` pattern.

**Tech Stack:** Plain JavaScript (no build step, no deps), Chrome `storage` API, YouTube's `ytInitialPlayerResponse` (read-only), JSON3 caption format.

**Reference:** Spec at `docs/superpowers/specs/2026-10-13-youtube-subtitle-panel-design.md`. Architecture mirrors `card-timer-sidebar/` (same single-file content-script pattern).

---

## File Structure

```
youtube-subtitle-panel/
├── manifest.json   # MV3 — matches "*://www.youtube.com/watch*", storage permission only
├── content.js      # One IIFE — injectStyles, injectPanel, fetchTracklist, fetchCues,
│                   #             buildCueList, renderPanel, findActiveCue, tick loop,
│                   #             click-to-seek, Alt+S toggle, SPA observer, storage helpers
└── README.md       # Load-unpacked steps, shortcut, troubleshooting
```

Three files, each with one responsibility. No build step, no node_modules.

---

## Task 1: Scaffold extension + verify content script loads

**Files:**
- Create: `youtube-subtitle-panel/manifest.json`
- Create: `youtube-subtitle-panel/content.js`
- Create: `youtube-subtitle-panel/README.md`

- [ ] **Step 1: Create `youtube-subtitle-panel/` directory**

```bash
mkdir -p youtube-subtitle-panel
```

- [ ] **Step 2: Write `youtube-subtitle-panel/manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "YouTube Subtitle Panel",
  "version": "0.1.0",
  "description": "Right-side panel showing bilingual YouTube captions with auto-scroll and click-to-seek.",
  "permissions": ["storage"],
  "host_permissions": ["*://www.youtube.com/*"],
  "content_scripts": [{
    "matches": ["*://www.youtube.com/watch*"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }]
}
```

- [ ] **Step 3: Write `youtube-subtitle-panel/content.js` stub**

```js
(() => {
    'use strict';
    console.log('[ysp] content script loaded');
})();
```

- [ ] **Step 4: Write `youtube-subtitle-panel/README.md` (placeholder, expanded later)**

```markdown
# YouTube Subtitle Panel

Edge/Chrome extension that shows a right-side bilingual subtitle panel on YouTube `/watch` pages with auto-scroll and click-to-seek.

## Install (unpacked)

1. Open `edge://extensions/`.
2. Enable **Developer mode** (toggle bottom-left).
3. Click **Load unpacked** and select this folder.
4. Pin the extension (optional).
5. Open a YouTube video with captions. Press **Alt+S** to toggle the panel.
```

- [ ] **Step 5: Load extension in Edge**

1. Open `edge://extensions/`.
2. Enable Developer mode.
3. Click "Load unpacked", select `youtube-subtitle-panel/`.
4. Confirm "YouTube Subtitle Panel" appears in the list with no errors.

- [ ] **Step 6: Verify content script runs on `/watch`**

1. Open any YouTube video: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`.
2. Open DevTools → Console.
3. Expected: `[ysp] content script loaded` is printed.

- [ ] **Step 7: Commit**

```bash
git add youtube-subtitle-panel/
git commit -m "feat(yt-subtitle-panel): scaffold extension with manifest + content.js stub"
```

---

## Task 2: Inject CSS + panel DOM (hidden)

**Files:**
- Modify: `youtube-subtitle-panel/content.js`

- [ ] **Step 1: Replace `content.js` with panel scaffold**

```js
(() => {
    'use strict';

    const PANEL_ID = 'yt-subtitle-panel';
    const STYLE_ID = 'yt-subtitle-panel-styles';
    const PANEL_WIDTH = 360;

    const CSS = `
#yt-subtitle-panel {
    position: fixed;
    top: 0; right: 0;
    width: ${PANEL_WIDTH}px; height: 100vh;
    background: #1e1e1e;
    border-left: 1px solid #333;
    z-index: 2147483640;
    display: flex; flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #e0e0e0;
}
#yt-subtitle-panel.hidden { display: none; }
body.ysp-open { padding-right: ${PANEL_WIDTH}px; }
`;

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = CSS;
        document.head.appendChild(style);
    }

    function injectPanel() {
        if (document.getElementById(PANEL_ID)) return;
        const aside = document.createElement('aside');
        aside.id = PANEL_ID;
        aside.classList.add('hidden');
        aside.innerHTML = `
            <header class="ysp-header">
                <span class="ysp-title">字幕</span>
            </header>
            <div class="ysp-list"></div>
        `;
        document.body.appendChild(aside);
    }

    injectStyles();
    injectPanel();
    console.log('[ysp] panel DOM injected (hidden)');
})();
```

- [ ] **Step 2: Reload extension in Edge**

1. Open `edge://extensions/`.
2. Click "Reload" under "YouTube Subtitle Panel".

- [ ] **Step 3: Verify panel hidden on /watch**

1. Open `https://www.youtube.com/watch?v=dQw4w9WgXcQ`.
2. Open DevTools → Elements.
3. Expected: `<aside id="yt-subtitle-panel" class="hidden">` exists with the header and empty `.ysp-list` child.
4. Expected: page content is unchanged (panel has `display:none`).

- [ ] **Step 4: Commit**

```bash
git add youtube-subtitle-panel/content.js
git commit -m "feat(yt-subtitle-panel): inject CSS and hidden panel DOM"
```

---

## Task 3: Wire Alt+S toggle + body class + persistence

**Files:**
- Modify: `youtube-subtitle-panel/content.js`

- [ ] **Step 1: Add toggle helper, panel-open logic, and keydown handler**

Replace the `console.log('[ysp] panel DOM injected (hidden)');` line at the bottom of the IIFE with:

```js
    function togglePanel() {
        const panel = document.getElementById(PANEL_ID);
        const willOpen = panel.classList.contains('hidden');
        panel.classList.toggle('hidden', !willOpen);
        document.body.classList.toggle('ysp-open', willOpen);
        chrome.storage.sync.set({ panelOpen: willOpen });
    }

    function restorePanelState() {
        chrome.storage.sync.get(['panelOpen'], (data) => {
            if (data.panelOpen) {
                const panel = document.getElementById(PANEL_ID);
                panel.classList.remove('hidden');
                document.body.classList.add('ysp-open');
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        const tag = (e.target && e.target.tagName) || '';
        const editable = tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable;
        if (editable) return;
        if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.code === 'KeyS') {
            e.preventDefault();
            togglePanel();
        }
    });

    restorePanelState();
    console.log('[ysp] panel DOM injected; Alt+S wired');
```

- [ ] **Step 2: Reload extension and verify toggle on /watch**

1. Reload extension in `edge://extensions/`.
2. Open `https://www.youtube.com/watch?v=dQw4w9WgXcQ`.
3. Press `Alt+S`. Expected: panel slides into view on the right (360px wide), page content shifts left.
4. Press `Alt+S` again. Expected: panel hides, content shifts back.

- [ ] **Step 3: Verify focus on comment box doesn't hijack Alt+S**

1. Click the comment textarea on YouTube.
2. Press `Alt+S` while the textarea is focused.
3. Expected: nothing happens (handler skips editable elements).
4. Click outside any editable, press `Alt+S`. Expected: panel toggles.

- [ ] **Step 4: Verify state persists across reloads**

1. Press `Alt+S` to open the panel.
2. Reload the YouTube tab (F5).
3. Expected: panel reopens automatically (restored from `chrome.storage.sync`).
4. Edge → Settings → Profiles → Sync should show `panelOpen` synced if multiple devices are configured (optional — not blocking).

- [ ] **Step 5: Commit**

```bash
git add youtube-subtitle-panel/content.js
git commit -m "feat(yt-subtitle-panel): wire Alt+S toggle with storage persistence"
```

---

## Task 4: Find video element + read `ytInitialPlayerResponse`

**Files:**
- Modify: `youtube-subtitle-panel/content.js`

- [ ] **Step 1: Add video-element finder and tracklist reader (logged but not yet used)**

Append before `restorePanelState();` at the bottom of the IIFE:

```js
    let video = null;

    function findVideo() {
        return document.querySelector('.html5-main-video')
            || document.querySelector('#movie_player video')
            || document.querySelector('video');
    }

    function readTracklist() {
        // YouTube exposes the player response on window.ytInitialPlayerResponse.
        // It is re-set on each navigation; we re-read at load time.
        const resp = window.ytInitialPlayerResponse;
        if (!resp) return null;
        const tl = resp?.captions?.playerCaptionsTracklistRenderer;
        if (!tl) return { tracks: [], translations: [] };
        const tracks = (tl.captionTracks || []).map((t) => ({
            vssId: t.vssId,
            languageCode: t.languageCode,
            name: t.name?.simpleText || t.languageCode,
            baseUrl: t.baseUrl,
        }));
        const translations = (tl.translationLanguages || []).map((t) => ({
            languageCode: t.languageCode,
            name: t.languageName?.simpleText || t.languageCode,
        }));
        return { tracks, translations };
    }

    function bootstrap() {
        video = findVideo();
        if (!video) {
            console.warn('[ysp] video element not found');
            return;
        }
        const tracklist = readTracklist();
        if (!tracklist) {
            console.warn('[ysp] ytInitialPlayerResponse not available');
            return;
        }
        console.log('[ysp] tracklist:', tracklist);
    }

    bootstrap();
```

- [ ] **Step 2: Reload and inspect tracklist on /watch**

1. Reload extension.
2. Open `https://www.youtube.com/watch?v=dQw4w9WgXcQ` (any video with captions).
3. DevTools → Console.
4. Expected: `[ysp] tracklist: { tracks: [...], translations: [...] }` is logged, with at least 1 entry in `tracks`.

- [ ] **Step 3: Verify graceful fallback on videos without captions**

1. Open a video without CC (search YouTube for a video with no captions).
2. Expected: `[ysp] tracklist: { tracks: [], translations: [] }` (empty arrays, not null).

- [ ] **Step 4: Commit**

```bash
git add youtube-subtitle-panel/content.js
git commit -m "feat(yt-subtitle-panel): read caption tracks from ytInitialPlayerResponse"
```

---

## Task 5: Fetch JSON3 cues + parse

**Files:**
- Modify: `youtube-subtitle-panel/content.js`

- [ ] **Step 1: Add `fetchCues()` that fetches JSON3 and parses into cue objects**

Insert after the `readTracklist()` function:

```js
    async function fetchCues(track, { signal } = {}) {
        if (!track || !track.baseUrl) return [];
        const url = track.baseUrl + (track.baseUrl.includes('fmt=') ? '&' : '?') + 'fmt=json3';
        const res = await fetch(url, { signal, credentials: 'omit' });
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        const data = await res.json();
        // JSON3 format: { events: [ { tStartMs, dDurationMs, segs: [ { utf8: "..." } ] } ] }
        const cues = (data.events || [])
            .filter((e) => Array.isArray(e.segs) && e.segs.length > 0)
            .map((e) => ({
                startMs: e.tStartMs,
                endMs: e.tStartMs + (e.dDurationMs || 0),
                text: e.segs.map((s) => s.utf8 || '').join('').trim(),
            }))
            .filter((c) => c.text.length > 0);
        return cues;
    }
```

- [ ] **Step 2: Wire fetch into bootstrap to verify parsing**

Replace the existing `bootstrap()` function with:

```js
    async function bootstrap() {
        video = findVideo();
        if (!video) {
            console.warn('[ysp] video element not found');
            return;
        }
        const tracklist = readTracklist();
        if (!tracklist) {
            console.warn('[ysp] ytInitialPlayerResponse not available');
            return;
        }
        if (tracklist.tracks.length === 0) {
            console.log('[ysp] no caption tracks on this video');
            return;
        }
        try {
            const top = tracklist.tracks[0];
            const cues = await fetchCues(top);
            console.log(`[ysp] parsed ${cues.length} cues from "${top.name}" (${top.languageCode})`);
            console.log('[ysp] first 3 cues:', cues.slice(0, 3));
        } catch (err) {
            console.error('[ysp] fetchCues failed:', err);
        }
    }
```

- [ ] **Step 3: Reload and verify cue count on /watch**

1. Reload extension.
2. Open a captioned YouTube video.
3. DevTools → Console.
4. Expected: `[ysp] parsed N cues from "English" (en)` where N matches the video length (e.g., 50–300 cues).
5. Expected: `[ysp] first 3 cues: [...]` shows objects with `startMs`, `endMs`, `text`.

- [ ] **Step 4: Commit**

```bash
git add youtube-subtitle-panel/content.js
git commit -m "feat(yt-subtitle-panel): fetch and parse JSON3 caption cues"
```

---

## Task 6: Merge top + bot cues into a row list

**Files:**
- Modify: `youtube-subtitle-panel/content.js`

- [ ] **Step 1: Add `buildCueList()` that uses top track as skeleton**

Insert after `fetchCues()`:

```js
    function buildCueList(topCues, botCues) {
        // Top track defines row boundaries. For each topCue, find the botCue with
        // the largest time overlap, or fall back to closest start within ±2s.
        const rows = [];
        for (const top of topCues) {
            let best = null;
            let bestOverlap = 0;
            for (const bot of botCues) {
                const overlap = Math.min(top.endMs, bot.endMs) - Math.max(top.startMs, bot.startMs);
                if (overlap > bestOverlap) {
                    bestOverlap = overlap;
                    best = bot;
                }
            }
            if (!best) {
                let bestDist = Infinity;
                for (const bot of botCues) {
                    const dist = Math.abs(bot.startMs - top.startMs);
                    if (dist < bestDist) { bestDist = dist; best = bot; }
                }
                if (bestDist > 2000) best = null;
            }
            rows.push({
                startMs: top.startMs,
                endMs: top.endMs,
                topText: top.text,
                botText: best ? best.text : '',
            });
        }
        rows.sort((a, b) => a.startMs - b.startMs);
        return rows;
    }
```

- [ ] **Step 2: Wire into bootstrap to log merged rows**

Replace the try block in `bootstrap()` with:

```js
        try {
            const top = tracklist.tracks[0];
            const bot = tracklist.tracks[1] || null;
            const [topCues, botCues] = await Promise.all([
                fetchCues(top),
                bot ? fetchCues(bot) : Promise.resolve([]),
            ]);
            const rows = buildCueList(topCues, botCues);
            console.log(`[ysp] merged ${rows.length} rows (top=${topCues.length}, bot=${botCues.length})`);
            console.log('[ysp] first 3 rows:', rows.slice(0, 3));
        } catch (err) {
            console.error('[ysp] bootstrap failed:', err);
        }
```

- [ ] **Step 3: Reload and verify row count on a bilingual video**

1. Reload extension.
2. Open a YouTube video that has both English and Chinese captions (or any two languages).
3. DevTools → Console.
4. Expected: `[ysp] merged N rows (top=N1, bot=N2)` — N should approximately equal N1.
5. Expected: `[ysp] first 3 rows: [...]` — each row has `topText` and `botText`.

- [ ] **Step 4: Commit**

```bash
git add youtube-subtitle-panel/content.js
git commit -m "feat(yt-subtitle-panel): merge top and bot cues into row list"
```

---

## Task 7: Render rows in the panel

**Files:**
- Modify: `youtube-subtitle-panel/content.js`

- [ ] **Step 1: Add `renderRows()` and refine panel HTML structure**

Replace the `aside.innerHTML` in `injectPanel()` with:

```html
<header class="ysp-header">
    <span class="ysp-title">字幕</span>
    <select class="ysp-lang ysp-lang-top" data-slot="top"></select>
    <select class="ysp-lang ysp-lang-bot" data-slot="bot"></select>
</header>
<div class="ysp-list"></div>
<div class="ysp-empty hidden"></div>
```

Add to the `CSS` string (after the existing rules):

```css
.ysp-header {
    padding: 12px;
    border-bottom: 1px solid #333;
    display: flex; gap: 8px; align-items: center;
}
.ysp-title { font-size: 13px; color: #888; }
.ysp-lang {
    flex: 1;
    background: #252525; color: #cfd8dc;
    border: 1px solid #444; border-radius: 4px;
    padding: 4px 6px; font-size: 12px;
}
.ysp-lang:disabled { opacity: 0.5; cursor: not-allowed; }

.ysp-list {
    flex: 1; overflow-y: auto;
    padding: 12px 8px;
    scrollbar-width: thin;
    scrollbar-color: #3a3a3a transparent;
}
.ysp-list::-webkit-scrollbar { width: 8px; }
.ysp-list::-webkit-scrollbar-thumb {
    background: #3a3a3a; border-radius: 4px;
}
.ysp-row {
    padding: 8px 10px;
    border-radius: 4px;
    cursor: pointer;
    border-left: 4px solid transparent;
    transition: background 0.15s;
}
.ysp-row:hover { background: rgba(255,255,255,0.04); }
.ysp-line-top { color: #bbb; font-size: 13px; line-height: 1.5; }
.ysp-line-bot { color: #777; font-size: 13px; line-height: 1.5; }
.ysp-row.active {
    background: rgba(79,195,247,0.12);
    border-left-color: #4fc3f7;
}
.ysp-row.active .ysp-line-top { color: #fff; font-weight: 600; }
.ysp-row.active .ysp-line-bot { color: #cfd8dc; }

.ysp-empty {
    padding: 40px 20px;
    color: #888; font-size: 13px;
    text-align: center;
}
.ysp-empty.hidden { display: none; }
```

Insert after `buildCueList()`:

```js
    function renderRows(rows) {
        const list = document.querySelector(`#${PANEL_ID} .ysp-list`);
        const frag = document.createDocumentFragment();
        for (const row of rows) {
            const div = document.createElement('div');
            div.className = 'ysp-row';
            div.dataset.startMs = String(row.startMs);
            div.innerHTML = `
                <div class="ysp-line ysp-line-top"></div>
                <div class="ysp-line ysp-line-bot"></div>
            `;
            div.querySelector('.ysp-line-top').textContent = row.topText;
            div.querySelector('.ysp-line-bot').textContent = row.botText;
            frag.appendChild(div);
        }
        list.replaceChildren(frag);
    }
```

Replace the bottom of `bootstrap()` (the `console.log` line for first 3 rows) with:

```js
            renderRows(rows);
            console.log(`[ysp] rendered ${rows.length} rows`);
```

- [ ] **Step 2: Reload, open a captioned video, press Alt+S**

1. Reload extension.
2. Open a captioned YouTube video.
3. Press `Alt+S`.
4. Expected: panel slides in with a list of bilingual rows (one per cue from the top track), each row clickable, with the language selects empty at the top.

- [ ] **Step 3: Commit**

```bash
git add youtube-subtitle-panel/content.js
git commit -m "feat(yt-subtitle-panel): render cue rows in the panel"
```

---

## Task 8: Wire language selects (populate + persist + refetch on change)

**Files:**
- Modify: `youtube-subtitle-panel/content.js`

- [ ] **Step 1: Add `populateLangSelects()` and `applyLangSelection()`**

Insert after `renderRows()`:

```js
    let activeTopVssId = null;
    let activeBotVssId = null;

    function populateLangSelects(tracklist) {
        const topSel = document.querySelector(`#${PANEL_ID} .ysp-lang-top`);
        const botSel = document.querySelector(`#${PANEL_ID} .ysp-lang-bot`);
        topSel.innerHTML = '';
        botSel.innerHTML = '';
        for (const t of tracklist.tracks) {
            const opt1 = document.createElement('option');
            opt1.value = t.vssId;
            opt1.textContent = t.name;
            topSel.appendChild(opt1);
            const opt2 = opt1.cloneNode(true);
            botSel.appendChild(opt2);
        }
        if (tracklist.tracks.length < 2) {
            botSel.disabled = true;
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = '(无可用第二语言)';
            botSel.replaceChildren(placeholder);
        }
    }

    async function loadAndRender(tracks, topVssId, botVssId) {
        const top = tracks.find((t) => t.vssId === topVssId) || tracks[0];
        const bot = tracks.find((t) => t.vssId === botVssId && t.vssId !== top.vssId)
            || tracks.find((t) => t.vssId !== top.vssId);
        if (!top) return;
        activeTopVssId = top.vssId;
        activeBotVssId = bot ? bot.vssId : null;
        const [topCues, botCues] = await Promise.all([
            fetchCues(top),
            bot ? fetchCues(bot) : Promise.resolve([]),
        ]);
        const rows = buildCueList(topCues, botCues);
        renderRows(rows);
        const topSel = document.querySelector(`#${PANEL_ID} .ysp-lang-top`);
        const botSel = document.querySelector(`#${PANEL_ID} .ysp-lang-bot`);
        if (topSel) topSel.value = activeTopVssId;
        if (botSel) botSel.value = activeBotVssId || '';
    }
```

Add to the bottom of the IIFE (before `restorePanelState();`):

```js
    function wireLangSelects(tracks) {
        const topSel = document.querySelector(`#${PANEL_ID} .ysp-lang-top`);
        const botSel = document.querySelector(`#${PANEL_ID} .ysp-lang-bot`);
        if (!topSel || !botSel) return;
        topSel.addEventListener('change', () => {
            chrome.storage.sync.set({ topTrackVssId: topSel.value });
            loadAndRender(tracks, topSel.value, botSel.value).catch(console.error);
        });
        botSel.addEventListener('change', () => {
            chrome.storage.sync.set({ botTrackVssId: botSel.value });
            loadAndRender(tracks, topSel.value, botSel.value).catch(console.error);
        });
    }
```

Replace the `bootstrap()` function entirely with:

```js
    async function bootstrap() {
        video = findVideo();
        if (!video) { console.warn('[ysp] video not found'); return; }
        const tracklist = readTracklist();
        if (!tracklist) { console.warn('[ysp] ytInitialPlayerResponse missing'); return; }
        if (tracklist.tracks.length === 0) {
            showEmpty('本视频无字幕');
            return;
        }
        populateLangSelects(tracklist);
        wireLangSelects(tracklist);
        chrome.storage.sync.get(['topTrackVssId', 'botTrackVssId'], (data) => {
            loadAndRender(tracklist.tracks, data.topTrackVssId || '', data.botTrackVssId || '')
                .catch((err) => { console.error('[ysp] load failed:', err); showEmpty('字幕加载失败'); });
        });
    }
```

Insert before `bootstrap()`:

```js
    function showEmpty(msg) {
        const empty = document.querySelector(`#${PANEL_ID} .ysp-empty`);
        empty.textContent = msg;
        empty.classList.remove('hidden');
        document.querySelector(`#${PANEL_ID} .ysp-list`).replaceChildren();
    }
```

- [ ] **Step 2: Reload and verify language select on a bilingual video**

1. Reload extension.
2. Open a YouTube video with at least 2 caption tracks (English + Chinese).
3. Press `Alt+S` to open the panel.
4. Expected: top and bot `<select>` dropdowns are populated with track names.
5. Expected: rows render with the default top/bot selection.

- [ ] **Step 3: Verify changing language refetches and rerenders**

1. In the bot `<select>`, switch to a different language.
2. Expected: rows update within ~1 second to show the new bottom-row text.
3. Expected: the `botTrackVssId` is written to `chrome.storage.sync` (verify via `edge://extensions/` → service worker if needed, or just verify state by reloading).

- [ ] **Step 4: Verify no-captions message**

1. Open a YouTube video without CC.
2. Press `Alt+S`.
3. Expected: panel shows "本视频无字幕", list is empty.

- [ ] **Step 5: Commit**

```bash
git add youtube-subtitle-panel/content.js
git commit -m "feat(yt-subtitle-panel): wire language selects with persistence"
```

---

## Task 9: Tick loop + active line highlight + scrollIntoView centered

**Files:**
- Modify: `youtube-subtitle-panel/content.js`

- [ ] **Step 1: Add `findActiveCue()`, `updateActiveLine()`, and `startTickLoop()`**

Insert after `renderRows()`:

```js
    let currentActive = null;
    let manualScrollUntil = 0;
    let rowEls = [];

    function findActiveCue(rows, ms) {
        // rows is sorted by startMs. Find the last cue whose startMs <= ms.
        let lo = 0, hi = rows.length - 1, found = -1;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (rows[mid].startMs <= ms) { found = mid; lo = mid + 1; }
            else hi = mid - 1;
        }
        // Return only if ms is still before endMs.
        if (found >= 0 && ms < rows[found].endMs) return found;
        return -1;
    }

    function updateActiveLine(idx, rows) {
        const list = document.querySelector(`#${PANEL_ID} .ysp-list`);
        if (!list) return;
        if (currentActive !== null && rowEls[currentActive]) {
            rowEls[currentActive].classList.remove('active');
        }
        if (idx >= 0 && rowEls[idx]) {
            rowEls[idx].classList.add('active');
            if (Date.now() > manualScrollUntil) {
                rowEls[idx].scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
        }
        currentActive = idx;
    }
```

Update `renderRows()` to capture row elements:

```js
    function renderRows(rows) {
        const list = document.querySelector(`#${PANEL_ID} .ysp-list`);
        const frag = document.createDocumentFragment();
        rowEls = [];
        currentActive = null;
        for (const row of rows) {
            const div = document.createElement('div');
            div.className = 'ysp-row';
            div.dataset.startMs = String(row.startMs);
            div.innerHTML = `
                <div class="ysp-line ysp-line-top"></div>
                <div class="ysp-line ysp-line-bot"></div>
            `;
            div.querySelector('.ysp-line-top').textContent = row.topText;
            div.querySelector('.ysp-line-bot').textContent = row.botText;
            rowEls.push(div);
            frag.appendChild(div);
        }
        list.replaceChildren(frag);
    }
```

Insert after `renderRows()`:

```js
    let rowsRef = [];
    let tickRaf = null;

    function tick() {
        if (!video) { tickRaf = setTimeout(tick, 250); return; }
        const ms = Math.floor(video.currentTime * 1000);
        const idx = findActiveCue(rowsRef, ms);
        if (idx !== currentActive) updateActiveLine(idx, rowsRef);
        tickRaf = setTimeout(tick, 100);
    }

    function startTickLoop() {
        if (tickRaf) return;
        tick();
    }
```

Update `loadAndRender()` to set `rowsRef` and start the loop:

```js
        rowsRef = rows;
        renderRows(rows);
        startTickLoop();
```

- [ ] **Step 2: Wire manual-scroll pause**

Add to the bottom of the IIFE:

```js
    document.querySelector(`#${PANEL_ID} .ysp-list`).addEventListener('wheel', () => {
        manualScrollUntil = Date.now() + 3000;
    }, { passive: true });
```

- [ ] **Step 3: Reload and verify active line + auto-scroll**

1. Reload extension.
2. Open a captioned bilingual video.
3. Press `Alt+S`.
4. Expected: a single row is highlighted (accent border + soft background) — the cue matching the current playback time.
5. Press play. Expected: the highlighted row advances as time progresses; the panel auto-scrolls so the highlighted row stays roughly centered.
6. Pause at line N. Expected: line N stays highlighted; no further auto-scroll happens while paused.

- [ ] **Step 4: Verify manual-scroll pause**

1. While playing, manually scroll the panel using the mouse wheel.
2. Expected: auto-scroll stops for 3 seconds after the last scroll event.
3. Wait 3+ seconds without scrolling. Expected: auto-scroll resumes.

- [ ] **Step 5: Commit**

```bash
git add youtube-subtitle-panel/content.js
git commit -m "feat(yt-subtitle-panel): tick loop with centered auto-scroll and manual pause"
```

---

## Task 10: Click-to-seek

**Files:**
- Modify: `youtube-subtitle-panel/content.js`

- [ ] **Step 1: Add click handler via event delegation**

Add to the bottom of the IIFE:

```js
    document.querySelector(`#${PANEL_ID} .ysp-list`).addEventListener('click', (e) => {
        const row = e.target.closest('.ysp-row');
        if (!row || !video) return;
        const startMs = Number(row.dataset.startMs);
        if (!Number.isFinite(startMs)) return;
        video.currentTime = startMs / 1000;
    });
```

- [ ] **Step 2: Reload and verify click-to-seek**

1. Reload extension.
2. Open a captioned video, press `Alt+S`.
3. Click row 5.
4. Expected: video jumps to the timestamp of row 5's start (verify via the YouTube progress bar moving to that point, and the row 5 becoming the active highlight).
5. Click a row near the end while video is paused. Expected: video jumps to that timestamp; remains paused.

- [ ] **Step 3: Commit**

```bash
git add youtube-subtitle-panel/content.js
git commit -m "feat(yt-subtitle-panel): click row to seek video"
```

---

## Task 11: SPA navigation handling (debounced reload)

**Files:**
- Modify: `youtube-subtitle-panel/content.js`

- [ ] **Step 1: Add URL + video.src observer that triggers debounced reload**

Insert after `findVideo()`:

```js
    function observeNavigation(onNavigate) {
        let debounceTimer = null;
        let obs = null;
        const fire = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                video = findVideo();
                if (video) {
                    if (obs) obs.disconnect();
                    obs = new MutationObserver(() => { if (video && video.src) fire(); });
                    obs.observe(video, { attributes: true, attributeFilter: ['src'] });
                    onNavigate();
                }
            }, 500);
        };
        // Patch history methods to fire on pushState/replaceState.
        const origPush = history.pushState.bind(history);
        const origReplace = history.replaceState.bind(history);
        history.pushState = (...args) => { origPush(...args); fire(); };
        history.replaceState = (...args) => { origReplace(...args); fire(); };
        window.addEventListener('popstate', fire);
        fire(); // initial bind once video exists
    }
```

Insert before `bootstrap()`:

```js
    let loadAbort = null;

    async function onNavigate() {
        // Abort previous in-flight fetches.
        if (loadAbort) loadAbort.abort();
        loadAbort = new AbortController();
        const signal = loadAbort.signal;
        const tracklist = readTracklist();
        if (!tracklist || tracklist.tracks.length === 0) {
            showEmpty('本视频无字幕');
            return;
        }
        populateLangSelects(tracklist);
        wireLangSelects(tracklist);
        try {
            await loadAndRender(tracklist.tracks, activeTopVssId || '', activeBotVssId || '');
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('[ysp] reload failed:', err);
                showEmpty('字幕加载失败');
            }
        }
    }
```

Append to `bootstrap()` after the initial `loadAndRender`:

```js
        observeNavigation(onNavigate);
```

- [ ] **Step 2: Reload and verify navigation refetch**

1. Reload extension.
2. Open a captioned video.
3. Click a video in the YouTube recommendations sidebar (any other captioned video).
4. Expected: panel clears and reloads with new captions within 1 second; language selection persists if available on the new video.
5. DevTools → Console: `[ysp] rendered N rows` is logged again after navigation.

- [ ] **Step 3: Commit**

```bash
git add youtube-subtitle-panel/content.js
git commit -m "feat(yt-subtitle-panel): SPA navigation observer with debounced reload"
```

---

## Task 12: Fullscreen hide/show

**Files:**
- Modify: `youtube-subtitle-panel/content.js`

- [ ] **Step 1: Add fullscreen listener**

Add to the bottom of the IIFE:

```js
    document.addEventListener('fullscreenchange', () => {
        const panel = document.getElementById(PANEL_ID);
        if (!panel) return;
        const fs = !!document.fullscreenElement;
        panel.style.display = fs ? 'none' : '';
    });
```

- [ ] **Step 2: Reload and verify fullscreen behavior**

1. Reload extension.
2. Open a captioned video, press `Alt+S` to open the panel.
3. Click the YouTube fullscreen button on the player.
4. Expected: panel disappears when entering fullscreen.
5. Press Esc to exit fullscreen.
6. Expected: panel reappears.

- [ ] **Step 3: Commit**

```bash
git add youtube-subtitle-panel/content.js
git commit -m "feat(yt-subtitle-panel): hide panel in fullscreen, restore on exit"
```

---

## Task 13: README final polish

**Files:**
- Modify: `youtube-subtitle-panel/README.md`

- [ ] **Step 1: Replace README with full version**

```markdown
# YouTube Subtitle Panel

Edge/Chrome extension that shows a right-side bilingual subtitle panel on YouTube `/watch` pages. Reads YouTube's built-in caption tracks (no upload needed), keeps the currently-playing line centered, and lets you click any line to jump the video.

## Install (unpacked)

1. Open `edge://extensions/`.
2. Enable **Developer mode** (toggle bottom-left).
3. Click **Load unpacked** and select this folder.
4. (Optional) Pin the extension.

## Usage

1. Open any YouTube video: `https://www.youtube.com/watch?v=...`.
2. Press **Alt+S** to toggle the panel.
3. Pick the top-row and bottom-row languages from the dropdowns.
4. Press play. The current line stays vertically centered. Click any line to jump there.

State (panel open/closed + language choices) syncs across devices via `chrome.storage.sync`.

## Notes

- Only works on `/watch*` pages. Shorts, home, search, and channel pages are out of scope.
- First time you press `Alt+S`, Edge may show a one-time notice that the extension is controlling the shortcut.
- `Alt+S` is skipped while typing in comment boxes or any `INPUT`/`TEXTAREA`/contenteditable.
- The panel hides automatically while the video is in fullscreen and reappears when you exit.
- YouTube occasionally changes internal structures (`ytInitialPlayerResponse`). If captions stop loading, reload the extension and check DevTools Console for `[ysp]` errors.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Panel never appears | Verify URL starts with `https://www.youtube.com/watch`. The content script only matches `/watch*`. |
| `本视频无字幕` shown | The video has no YouTube-provided captions. There is no upload feature; pick another video. |
| Active line is stale / not updating | Open DevTools Console; if you see fetch errors, reload the page once (YouTube rate-limits occasionally). |
| `Alt+S` doesn't toggle | Click outside any comment box or input first, then try again. |
| Both this panel and `card-timer-sidebar` open | They coexist; the subtitle panel has lower z-index. Both push page content. |

## Tech

Plain JavaScript, no build step, no dependencies. Single content script in `content.js`.
```

- [ ] **Step 2: Commit**

```bash
git add youtube-subtitle-panel/README.md
git commit -m "docs(yt-subtitle-panel): expand README with usage, notes, troubleshooting"
```

---

## Task 14: Final manual test matrix pass

**Files:** none (verification only)

- [ ] **Step 1: Run full test matrix from spec**

Use the matrix from `docs/superpowers/specs/2026-10-13-youtube-subtitle-panel-design.md` "Testing" section. For each case, verify:

| Case | Expected |
| --- | --- |
| English-only video | Top row text only, bot row empty |
| Bilingual video | Both rows render |
| No captions | "本视频无字幕" placeholder |
| Pause / play | Active row stays highlighted while paused |
| Click-to-seek | Click row → video jumps to that timestamp |
| SPA navigation | Click related video → panel reloads, language persists if available |
| Toggle | `Alt+S` repeatedly → panel shows/hides, `body.ysp-open` toggles |
| State persistence | Set languages + open, reload page → languages + open state restored |
| Keyboard conflict | `Alt+S` in a comment box does nothing |
| Coexistence with card-timer-sidebar | Both visible, no overlap (subtitle panel lower z-index) |

- [ ] **Step 2: Confirm no `[ysp]` errors in Console**

Open DevTools Console on a captioned video. Verify there are no uncaught errors or repeated warnings during: opening the panel, changing languages, playing the video to the end, navigating to a new video, and toggling fullscreen.

- [ ] **Step 3: Final commit if any last-minute fixes were needed**

```bash
git status
git add youtube-subtitle-panel/
git commit -m "fix(yt-subtitle-panel): final adjustments from manual test pass"
```

(Skip this commit if `git status` shows no changes.)

---

## Self-Review Notes (for the planner, fixed inline before saving)

- **Spec coverage check:** Every requirement in the spec has a corresponding task: scaffold (T1), inject (T2), toggle (T3), tracklist (T4), fetch (T5), merge (T6), render (T7), language selects (T8), tick loop (T9), click-seek (T10), SPA (T11), fullscreen (T12), docs (T13), verification (T14). ✓
- **Placeholder scan:** No "TBD", "TODO", "implement later". All code blocks contain full implementations. ✓
- **Type/identifier consistency:** `PANEL_ID`, `PANEL_WIDTH`, `findVideo`, `readTracklist`, `fetchCues`, `buildCueList`, `renderRows`, `loadAndRender`, `populateLangSelects`, `wireLangSelects`, `findActiveCue`, `updateActiveLine`, `tick`, `startTickLoop`, `observeNavigation`, `onNavigate`, `showEmpty`, `togglePanel`, `restorePanelState` — all defined before use, all referenced consistently across tasks. ✓
- **No automated tests:** Plan relies on the spec's manual test matrix (consistent with the existing `card-timer-sidebar/` convention, which has no test harness).
