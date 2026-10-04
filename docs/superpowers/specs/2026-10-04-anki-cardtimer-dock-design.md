# Anki CardTimer Dock Plugin Design

## 1. Overview

An Anki 25.x addon that embeds `card-timer.html` as a persistent `QWebEngineView` docked on the right side of the Anki main window. The dock survives Anki's reviewer HTML rebuilds on every card switch, providing a stable side-by-side workspace for timer management while reviewing.

The user manually pushes the current card name from inside an Anki card template (Front/Back) via a button; the plugin forwards the name to the dock, which fills the `cardNameInput`. The user then picks a duration and confirms the timer inside CardTimer. v1 is **one-way** (Anki → CardTimer); no reverse action.

**Goal:** Replace the existing copy-paste workflow with a single click inside the Anki card, without leaving the reviewer.

## 2. Architecture

```
┌──────────────────────── Anki Main Window ─────────────────────────┐
│ ┌────────────────────────┐  ┌────────────────────────────────────┐ │
│ │                        │  │  CardTimer Dock (QDockWidget)      │ │
│ │   Anki Reviewer        │  │                                    │ │
│ │   (QWebEngineView)     │  │  ┌──────────────────────────────┐  │ │
│ │                        │  │  │ QWebEngineView               │  │ │
│ │   [Send to CardTimer]  │  │  │   web/card-timer.html        │  │ │
│ │        │                │  │  │   - 监听 message 'anki-push' │  │ │
│ │                        │  │  │   - 填入 cardNameInput       │  │ │
│ └────────┼────────────────┘  │  └──────────────────────────────┘  │ │
│          │                  └────────────────▲───────────────────┘ │
│          │ pycmd("cardtimer:push:X")        │                      │
│          ▼                                   │                      │
│   aqt Reviewer._onBridgeCmd ─────────► runJavaScript(...)          │
│          │                                                          │
│          ▼                                                          │
│   gui_hooks.webview_did_receive_js_message                          │
│   (addon __init__.py)                                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Key invariants

- The dock is a sibling of the reviewer's webview, not a child. The reviewer's `webview.setHtml(...)` calls on every card switch do **not** touch the dock.
- The two webviews never share a frame hierarchy, so direct `parent.postMessage` between them is impossible. All communication is routed through the Python process via `runJavaScript`.
- CardTimer's IndexedDB lives under `file://` in the dock's webview; data is shared with any other QWebEngineView loading the same `file://` URL (none in this design), but isolated from the standalone `card-timer.html` opened in a regular browser since the addon's copy lives in `addons21/`.

## 3. File Structure

New addon directory under the project, copied to `~/Anki/addons21/` on install:

```
anki-addons/cardtimer_for_anki/
├── __init__.py             # entry, dock creation, hook registration, message routing
├── manifest.json           # {"package": "cardtimer_for_anki", "name": "CardTimer Dock", "version": "0.1.0"}
└── web/
    └── card-timer.html     # copy of ../card-timer.html + anki-push message handler branch
```

The root project `card-timer.html` is **not** modified. The addon ships its own copy under `web/`. This keeps the standalone version untouched and lets the addon evolve independently.

## 4. Components

### 4.1 `__init__.py`

Responsibilities:
1. **Dock creation** (on profile load): create a `QDockWidget`, instantiate `QWebEngineView`, load the bundled `web/card-timer.html` via `QUrl.fromLocalFile`. Add the dock to Anki's main window with `Qt.RightDockWidgetArea`.
2. **Toggle action**: register a `QAction` under Anki's View menu ("CardTimer Dock", toggleable). State persists via `mw.addonManager.writeConfig` / `getConfig`.
3. **Bridge command handler**: register a hook for `gui_hooks.webview_did_receive_js_message` (or the equivalent in 25.x) that filters messages on the `cardtimer` channel.
4. **Forwarding**: parse the card name, dispatch to dock webview via `page().runJavaScript(...)`. If the dock is hidden at push time, show it first.
5. **Init guard**: queue pushes that arrive before `loadFinished` fires; flush queue after the page is ready.

### 4.2 `web/card-timer.html`

Identical to the root `card-timer.html` with **one addition**: a new branch in the existing `window.message` listener.

```javascript
if (e.data?.type === 'anki-push' && e.data.name) {
    const inp = document.getElementById('cardNameInput');
    if (inp) {
        inp.value = e.data.name;
        inp.focus();
    }
}
```

The existing `cn-en`, `cn-en-no-focus`, `cn-en-q`, `cn-en-append`, `cn-en-br` branches remain untouched.

### 4.3 User-facing card template change

Users add a button to their Front/Back template (out of addon scope, documented in addon README):

```html
<button onclick="pycmd('cardtimer:push:' + encodeURIComponent('{{Front}}'))">
  Send to CardTimer
</button>
```

`{{Front}}` is replaced by Anki with the card's front text before render.

## 5. Data Flow

### 5.1 Push (Anki → CardTimer)

1. User clicks "Send to CardTimer" on the current card.
2. Button onclick calls `pycmd('cardtimer:push:' + encodeURIComponent(cardFrontText))`.
3. Anki delivers this to `aqt.reviewer.Reviewer._onBridgeCmd`, which broadcasts via `gui_hooks.webview_did_receive_js_message(webview, channel, msg, context)`.
4. Addon's hook handler:
   - Filters: `channel == "cardtimer"` (use a dedicated channel name) and `msg` starts with `push:`.
   - Decodes: `urllib.parse.unquote(msg[len("push:"):])`.
   - If dock hidden: `dock.show()`.
   - Builds JS string: `f"window.postMessage({{type:'anki-push', name:{json.dumps(name)}}}, '*')"`.
   - Calls `dock_webview.page().runJavaScript(js)`.
5. CardTimer's message listener receives the post, fills `cardNameInput`, focuses it.
6. User picks duration, clicks Confirm → timer created normally.

### 5.2 Init-guard queue

If a push arrives before the dock webview finishes loading:

```python
self._pending_pushes = []

def on_push(name):
    if not self._dock_webview_loaded:
        self._pending_pushes.append(name)
    else:
        self._do_push(name)

# in __init__.py
def on_load_finished(ok):
    self._dock_webview_loaded = True
    for name in self._pending_pushes:
        self._do_push(name)
    self._pending_pushes.clear()
```

`_dock_webview_loaded` is `False` until the dock webview emits `loadFinished(True)`.

## 6. Persistence

- **Dock visibility & position**: handled by Qt automatically via `QDockWidget.saveState()` / `restoreState()` invoked by Anki on close/open. No custom code needed beyond ensuring the dock object is registered.
- **Addon settings** (currently none needed beyond visibility, but reserved): `mw.addonManager.getConfig(__name__)` returns `{}` by default; no schema required for v1.
- **CardTimer state**: stored in the dock webview's IndexedDB at `addons21/cardtimer_for_anki/web/card-timer.html`'s origin. Independent of the standalone copy.

## 7. Error Handling

| Failure mode | Behavior |
|--------------|----------|
| Push command format malformed (no `push:` prefix) | Silently ignore |
| Card name contains control chars / newlines | Apply to `cardNameInput.value` as-is (Anki strips dangerous content from `{{Front}}`); no JS injection because we use `json.dumps` on the Python side |
| Dock webview not yet loaded | Queue; flush after `loadFinished` |
| Dock webview fails to load | Show QMessageBox warning; dock stays open but blank; subsequent pushes queue and time out after 10s |
| User clicks button before addon loaded | `pycmd` goes to Anki's default handler (does nothing); user must reinstall/restart Anki |
| Multiple rapid pushes | Each push posts a separate message; user-visible input gets the **last** one (intentional: latest card wins) |

## 8. Testing

### 8.1 Manual test plan

| Step | Expected |
|------|----------|
| Install addon, restart Anki | Right dock visible, CardTimer UI loads |
| Click "Show Answer" on a card | Reviewer re-renders, dock unaffected |
| Click "Send to CardTimer" button on Front | CardTimer `cardNameInput` filled with card front text |
| Pick 2min, click Confirm | Timer appears in CardTimer |
| Hide dock via View menu, then click button on another card | Dock reappears, input filled |
| Click button rapidly 5 times | Only the last card's name remains in input |
| Restart Anki | Dock position/visibility preserved; previous timers restored from IndexedDB |

### 8.2 Automated testing

None required for v1. The addon has no testable Python logic beyond Qt glue that requires a live Anki instance. CardTimer's JS behavior is unchanged from the standalone version (already tested manually).

## 9. Out of Scope (v1)

- Reverse direction: CardTimer timer ending does not change Anki card state.
- Auto-push on `reviewer_did_show_question` or `reviewer_did_show_answer`.
- Configurable dock position, shortcut keys, or auto-show/hide rules.
- Per-card-type button customization.
- Multi-window support (CardTimer in multiple Anki profiles simultaneously).
- Bundling the addon as a `.ankiaddon` zip (user installs by copying directory).

## 10. Open Decisions for Implementation Phase

1. Exact hook name in Anki 25.x — `gui_hooks.webview_did_receive_js_message` is the most likely candidate; verify against Anki source during implementation.
2. Whether to register the toggle action on `profileLoaded` (per-profile) or `MainWindow init` (global). v1 uses `profileLoaded` to avoid leaking state across profiles.
3. Whether to ship `card-timer.html` as a verbatim copy or with a small patch file applied at install time. v1 uses verbatim copy committed to `web/`; future changes to root `card-timer.html` require manual sync to the addon copy.
