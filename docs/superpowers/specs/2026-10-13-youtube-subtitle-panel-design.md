# YouTube Subtitle Panel — Edge Extension Design

**Goal:** Build a Microsoft Edge (Manifest V3) browser extension that shows a fixed right-side panel on YouTube `/watch` pages. The panel renders bilingual subtitles (stacked: top row + bottom row) from YouTube's built-in caption tracks, auto-scrolls to keep the currently-playing line vertically centered, and supports click-to-seek.

---

## Decisions (confirmed with user)

| Question | Answer |
| --- | --- |
| Subtitle source | YouTube built-in captions (auto, read from `ytInitialPlayerResponse`) |
| Page scope | `/watch?v=*` only (Shorts excluded) |
| Display format | Bilingual stacked — top row + bottom row |
| Auto-scroll mode | Always centered on the current line |
| Toggle UX | Keyboard shortcut (`Alt+S`), closed by default |
| Click interaction | Click a line → seek video to that line's start time |
| State persistence | `chrome.storage.sync` — panel open/closed + top/bottom track selections |
| Highlight style | Subtle background + accent-color left border on the active row |
| Panel placement | Right fixed column (360px), pushes page content via `body` padding |
| Architecture | Single content script (no background, no popup) |

---

## File layout

```
youtube-subtitle-panel/
├── manifest.json   # MV3 manifest
├── content.js      # all logic — UI injection, caption loading, render loop
└── README.md       # load-unpacked install steps
```

Lives at the repo root next to `card-timer-sidebar/` and `youtube/`. No background script, no popup HTML, no icons.

---

## `manifest.json`

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

- `matches` is restricted to `/watch*` — `/shorts/*` and other YouTube pages are intentionally excluded.
- Only `storage` permission is requested.
- No `background` service worker, no `action` (toolbar popup), no `commands`.

---

## `content.js` — module layout

One IIFE, internally organized by responsibility:

```
(() => {
    const PANEL_ID = 'yt-subtitle-panel';
    const PANEL_WIDTH = 360;          // px
    const POLL_INTERVAL_MS = 100;     // 10 Hz
    const STORAGE_KEYS = {
        open: 'panelOpen',
        topTrack: 'topTrackVssId',
        botTrack: 'botTrackVssId',
    };

    // 1. injectStyles()      — idempotent CSS injection
    // 2. injectPanel()       — idempotent DOM injection
    // 3. fetchTracklist()    — read captionTracks[] from ytInitialPlayerResponse
    // 4. fetchCues(track)    — fetch baseUrl + '&fmt=json3' → [{startMs, endMs, text}]
    // 5. buildCueList(top, bot) — merge two tracks into a row list (top is skeleton)
    // 6. renderPanel(rows, topLabel, botLabel)
    // 7. updateActiveLine(currentMs) — toggle .active class, scrollIntoView centered
    // 8. tick()              — rAF + setTimeout(POLL_INTERVAL_MS) loop reading video.currentTime
    // 9. findActiveCue(cues, ms) — binary search
    // 10. wireInteractions() — Alt+S toggle, click row → seek, language select change
    // 11. observeNavigation() — SPA URL + video.src change → reload cues
    // 12. loadState()/saveState() — chrome.storage.sync wrappers
    // 13. init()             — orchestration

    init();
})();
```

### State machine

| State | Trigger | UI |
| --- | --- | --- |
| `closed` | default, or Alt+S off | `#yt-subtitle-panel.hidden` |
| `loading` | after navigation while fetching | panel shown, list empty, "加载字幕中..." |
| `ready` | cues loaded | list rendered, tick() finds active |
| `no-captions` | `captionTracks` is empty/missing | `.ysp-empty` shown: "本视频无字幕" |
| `error` | fetch/parse failure | `.ysp-empty` shown: "字幕加载失败" + retry button |

---

## Data flow

### Startup

```
init()
  ├─ injectStyles() / injectPanel()        (idempotent)
  ├─ loadState()                            (chrome.storage.sync)
  ├─ findVideo()                            (query '.html5-main-video' / '#movie_player video')
  ├─ observeNavigation()                    (URL + video.src)
  ├─ startTickLoop()                        (rAF + 100ms throttle)
  └─ loadTracklistAndCues()                 (first load)
        ├─ ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer.captionTracks
        ├─ if empty → state = 'no-captions'
        ├─ apply persisted top/bot track selection (fallback to defaults if vssId not on this video)
        ├─ Promise.all([fetchCues(top), fetchCues(bot)])   (parallel, JSON3 format)
        ├─ buildCueList(topCues, botCues) → row list
        └─ renderPanel(rows)
```

### Per-tick loop (~10 Hz)

```
tick()
  └─ ms = video.currentTime * 1000
        └─ newCue = findActiveCue(rows, ms)    // binary search, O(log n)
              └─ if newCue !== currentCue:
                     ├─ strip .active from previous row
                     ├─ add .active to new row
                     └─ row.scrollIntoView({ block: 'center', behavior: 'smooth' })
```

### Navigation handling (SPA)

- Patch `history.pushState` / `history.replaceState` and listen on `popstate` to fire a synthetic `urlchange` event.
- Observe `<video>` `src` attribute changes via `MutationObserver` (YouTube reuses the same element and just swaps `src` on navigation).
- Debounce re-fetch by 500 ms — fast scrubbing on the watch page triggers multiple URL mutations.
- On confirmed navigation: cancel in-flight fetches (AbortController), clear `.ysp-list`, set state = `loading`, then re-run `loadTracklistAndCues()`.

### Tracklist merging (`buildCueList`)

Top track is the skeleton. For each `topCue`:

- Find the `botCue` with the largest time overlap (or closest start within ±2 s).
- Emit `{ startMs, endMs, topText, botText, botCue | null }`.

Rows are sorted by `startMs`. Gaps where bot has no matching cue render only the top line.

### Click-to-seek

```js
row.addEventListener('click', () => {
    if (!video) return;
    video.currentTime = row.dataset.startMs / 1000;
});
```

Does not auto-play — respects the user's current play/pause state.

---

## UI structure

```html
<aside id="yt-subtitle-panel" class="hidden">
    <header class="ysp-header">
        <span class="ysp-title">字幕</span>
        <select class="ysp-lang ysp-lang-top" data-slot="top">
            <option value="">(上排)</option>
        </select>
        <select class="ysp-lang ysp-lang-bot" data-slot="bot">
            <option value="">(下排)</option>
        </select>
    </header>
    <div class="ysp-list" tabindex="0"></div>
    <div class="ysp-empty hidden">本视频无字幕</div>
</aside>
```

Each row:

```html
<div class="ysp-row" data-start-ms="12340">
    <div class="ysp-line ysp-line-top">When the bell rang...</div>
    <div class="ysp-line ysp-line-bot">在托儿所工作的第一天</div>
</div>
```

### Key CSS

```css
#yt-subtitle-panel {
    position: fixed;
    top: 0; right: 0;
    width: 360px; height: 100vh;
    background: #1e1e1e;
    border-left: 1px solid #333;
    z-index: 2147483640;          /* below card-timer-sidebar to avoid conflict */
    display: flex; flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
#yt-subtitle-panel.hidden { display: none; }
body.ysp-open { padding-right: 360px; }

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
```

---

## State persistence

`chrome.storage.sync` (multi-device sync):

| Key | Type | Default | Written when |
| --- | --- | --- | --- |
| `panelOpen` | bool | `false` | `Alt+S` toggles |
| `topTrackVssId` | string | `""` | `top` `<select>` change |
| `botTrackVssId` | string | `""` | `bot` `<select>` change |

Restore on startup: if persisted vssId exists in current video's `captionTracks`, use it; otherwise pick the first track for top, the second (different language code) for bot. If only one track is available, bot `<select>` is disabled with a "(无可用第二语言)" placeholder option.

---

## Keyboard shortcuts

`Alt+S` — toggle panel open/closed. Captured in a single `document` keydown listener:

```js
document.addEventListener('keydown', (e) => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.code === 'KeyS') {
        e.preventDefault();
        togglePanel();
    }
});
```

Skipped when typing in `INPUT` / `TEXTAREA` / `contenteditable` to avoid hijacking comment fields.

Edge will show a one-time notice the first time the shortcut is pressed.

---

## Edge cases

| Scenario | Behavior |
| --- | --- |
| Video has no captions | `state = 'no-captions'`, show `.ysp-empty`: "本视频无字幕" |
| Only one track available | Bot `<select>` disabled with "(无可用第二语言)" |
| `ytInitialPlayerResponse` not present at script start (rare) | Retry up to 3× at 500 ms intervals, then error state |
| Navigation mid-fetch | `AbortController` cancels in-flight fetches before starting the new one |
| YouTube changes response structure (future) | Parser fails → error state with retry button |
| User scrolls the panel manually | Pause auto-scroll for 3 s after the last manual scroll event, then resume |
| Video paused | Active row remains highlighted but `tick()` does not call `scrollIntoView` |
| Tab in background | `requestAnimationFrame` naturally throttles; no special handling |
| Fullscreen video | Panel hidden via CSS media query (`@media (display-mode: fullscreen)`); shown again on exit |
| Card-timer-sidebar also open | Both coexist: panel has lower z-index; both push page content (combined padding handled by each managing its own `body` class) |

---

## Out of scope

- `/shorts/*` support
- Custom subtitle file upload (SRT/VTT)
- TTS / translation / word lookup
- Export (subtitle file download, sharing)
- `chrome.commands` (shortcut is handled in content script keydown)
- Toolbar icon / popup
- Options page

---

## Testing

Manual test matrix (Edge, load-unpacked):

| Case | How to verify |
| --- | --- |
| English-only video | Open `/watch?v=...` with English CC; top row shows, bot row empty |
| Bilingual video | Open bilingual CC; both rows render |
| No captions | Open a video with no CC; "本视频无字幕" placeholder |
| Pause / play | Pause at line N → row N stays active, no scroll |
| Click-to-seek | Click row 5 → video jumps to that timestamp |
| Navigation (SPA) | Click a related video in the sidebar → panel reloads cues, language selection persists if available |
| Toggle | Press `Alt+S` repeatedly → panel shows/hides; `body.ysp-open` toggles |
| State persistence | Set languages, reload the page → languages restored; close panel, reload → still closed |
| Keyboard conflict | Verify `Alt+S` doesn't hijack text input in comments |
| Coexistence with card-timer-sidebar | Both open at once → both visible, no overlap |

Console: all logs prefixed `[ysp]`; no uncaught errors during the matrix.

---

## Open questions

None — all decisions confirmed in brainstorming before this spec was written.
