# Anki CardTimer Dock Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Anki 25.x addon that embeds `card-timer.html` as a persistent right-side dock and forwards manually-pushed card names from Anki cards to CardTimer.

**Architecture:** Single addon under `anki-addons/cardtimer_for_anki/`. Three source files (`__init__.py`, `dock.py`, `bridge.py`) plus one pure parser module (`parser.py`) for unit testing, one vendored HTML (`web/card-timer.html`), and `manifest.json`. The dock is a `QDockWidget` containing a `QWebEngineView`. Push goes Card → `pycmd` → `gui_hooks.webview_did_receive_js_message` → Python `runJavaScript` on dock → `window.postMessage` → card-timer.html's existing message listener (one new branch added).

**Tech Stack:** Python 3.11+, Qt6 (PyQt6 via Anki), Anki 25.x `aqt`/`aqt.gui_hooks`, QWebEngineView, pytest.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `anki-addons/cardtimer_for_anki/manifest.json` | Addon metadata |
| `anki-addons/cardtimer_for_anki/parser.py` | Pure function: parse `cardtimer:push:NAME` strings (unit-testable) |
| `anki-addons/cardtimer_for_anki/dock.py` | `CardTimerDock` class: QDockWidget + QWebEngineView setup, loadFinished handling, push queue, show/hide/toggle |
| `anki-addons/cardtimer_for_anki/bridge.py` | Installs `webview_did_receive_js_message` hook, uses parser, dispatches to dock |
| `anki-addons/cardtimer_for_anki/__init__.py` | Entry point: registers `profile_did_open` hook, constructs dock + bridge |
| `anki-addons/cardtimer_for_anki/web/card-timer.html` | Vendored copy of root `card-timer.html` with one new `anki-push` message branch |
| `anki-addons/cardtimer_for_anki/tests/test_parser.py` | pytest tests for parser |

The root project `card-timer.html` is **not modified**; the addon ships its own copy.

---

## Task 1: Scaffold addon directory and manifest

**Files:**
- Create: `anki-addons/cardtimer_for_anki/manifest.json`
- Create: `anki-addons/cardtimer_for_anki/__init__.py` (empty placeholder)
- Create: `anki-addons/cardtimer_for_anki/web/.gitkeep`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p anki-addons/cardtimer_for_anki/web
```

- [ ] **Step 2: Write `manifest.json`**

```json
{
    "package": "cardtimer_for_anki",
    "name": "CardTimer Dock",
    "version": "0.1.0",
    "ankiweb_id": "",
    "author": "",
    "conflicts": []
}
```

File: `anki-addons/cardtimer_for_anki/manifest.json`

- [ ] **Step 3: Create placeholder `__init__.py`**

```python
# CardTimer Dock addon - placeholder
```

File: `anki-addons/cardtimer_for_anki/__init__.py`

- [ ] **Step 4: Create `.gitkeep` so `web/` exists in git**

Create empty file `anki-addons/cardtimer_for_anki/web/.gitkeep`.

- [ ] **Step 5: Verify JSON parses**

Run: `python -c "import json; print(json.load(open('anki-addons/cardtimer_for_anki/manifest.json')))"`
Expected: `{'package': 'cardtimer_for_anki', 'name': 'CardTimer Dock', 'version': '0.1.0', 'ankiweb_id': '', 'author': '', 'conflicts': []}`

- [ ] **Step 6: Commit**

```bash
git add anki-addons/cardtimer_for_anki/manifest.json anki-addons/cardtimer_for_anki/__init__.py anki-addons/cardtimer_for_anki/web/.gitkeep
git commit -m "feat(anki-addon): scaffold cardtimer_for_anki directory and manifest"
```

---

## Task 2: Add `anki-push` handler to vendored card-timer.html

**Files:**
- Create: `anki-addons/cardtimer_for_anki/web/card-timer.html` (copy of root)
- Modify: `anki-addons/cardtimer_for_anki/web/card-timer.html` (add one branch to message listener)

- [ ] **Step 1: Copy the root card-timer.html into the addon**

Windows (cmd):
```cmd
copy card-timer.html anki-addons\cardtimer_for_anki\web\card-timer.html
```

POSIX (bash):
```bash
cp card-timer.html anki-addons/cardtimer_for_anki/web/card-timer.html
```

- [ ] **Step 2: Locate the message listener**

Run: `grep -n "e.data?.type === 'cn-en-br'" anki-addons/cardtimer_for_anki/web/card-timer.html`
Expected: a line number, e.g., `1849`.

- [ ] **Step 3: Add the `anki-push` branch**

Open the file and find this block (around line 1849):
```javascript
        if (e.data?.type === 'cn-en-br' && e.data.content) {
            const inp = document.getElementById('cardNameInput');
            if (inp) {
                inp.value = (inp.value || '') + `<br>${e.data.content}`;
                inp.focus();
            }
        }
    });
```

Add the following **immediately before** the closing `});` of the `window.addEventListener('message', ...)` handler:

```javascript
        if (e.data?.type === 'anki-push' && e.data.name) {
            const inp = document.getElementById('cardNameInput');
            if (inp) {
                inp.value = e.data.name;
                inp.focus();
            }
        }
```

Final shape:
```javascript
        if (e.data?.type === 'cn-en-br' && e.data.content) {
            const inp = document.getElementById('cardNameInput');
            if (inp) {
                inp.value = (inp.value || '') + `<br>${e.data.content}`;
                inp.focus();
            }
        }
        if (e.data?.type === 'anki-push' && e.data.name) {
            const inp = document.getElementById('cardNameInput');
            if (inp) {
                inp.value = e.data.name;
                inp.focus();
            }
        }
    });
```

- [ ] **Step 4: Verify the branch exists**

Run: `grep -n "anki-push" anki-addons/cardtimer_for_anki/web/card-timer.html`
Expected: one match with line number.

- [ ] **Step 5: Verify root file is unchanged**

Run: `git diff --stat card-timer.html`
Expected: empty output (no changes to root file).

- [ ] **Step 6: Commit**

```bash
git add anki-addons/cardtimer_for_anki/web/card-timer.html
git commit -m "feat(anki-addon): add anki-push message handler to vendored card-timer.html"
```

---

## Task 3: Implement pure parser module with unit tests

**Files:**
- Create: `anki-addons/cardtimer_for_anki/parser.py`
- Create: `anki-addons/cardtimer_for_anki/tests/__init__.py` (empty)
- Create: `anki-addons/cardtimer_for_anki/tests/test_parser.py`

- [ ] **Step 1: Create `tests/__init__.py`**

Empty file: `anki-addons/cardtimer_for_anki/tests/__init__.py`

- [ ] **Step 2: Write failing test file**

```python
import pytest
from cardtimer_for_anki.parser import parse_push_command


def test_parses_simple_name():
    assert parse_push_command("cardtimer:push:hello") == "hello"


def test_decodes_url_encoded_space():
    assert parse_push_command("cardtimer:push:hello%20world") == "hello world"


def test_returns_none_for_wrong_prefix():
    assert parse_push_command("other:push:hello") is None


def test_returns_none_for_missing_push_keyword():
    assert parse_push_command("cardtimer:send:hello") is None


def test_returns_none_for_empty_name():
    assert parse_push_command("cardtimer:push:") is None


def test_handles_unicode():
    assert parse_push_command("cardtimer:push:%E4%B8%AD%E6%96%87") == "中文"


def test_returns_none_for_non_string():
    assert parse_push_command(None) is None
    assert parse_push_command(123) is None
    assert parse_push_command([]) is None


def test_preserves_unreserved_chars():
    assert parse_push_command("cardtimer:push:hello-world_1.0") == "hello-world_1.0"
```

File: `anki-addons/cardtimer_for_anki/tests/test_parser.py`

- [ ] **Step 3: Run tests, verify failure**

Run: `cd anki-addons && python -m pytest cardtimer_for_anki/tests/test_parser.py -v`
Expected: ImportError or ModuleNotFoundError (parser doesn't exist yet).

- [ ] **Step 4: Implement `parser.py`**

```python
"""Pure command parser for CardTimer dock push commands."""
from typing import Optional
from urllib.parse import unquote

PUSH_PREFIX = "cardtimer:push:"


def parse_push_command(raw: object) -> Optional[str]:
    """Parse a 'cardtimer:push:NAME' command into a URL-decoded card name.

    Returns the decoded name string, or None if the command is malformed,
    has the wrong prefix, or has an empty payload.
    """
    if not isinstance(raw, str):
        return None
    if not raw.startswith(PUSH_PREFIX):
        return None
    name = unquote(raw[len(PUSH_PREFIX):])
    return name if name else None
```

File: `anki-addons/cardtimer_for_anki/parser.py`

- [ ] **Step 5: Run tests, verify pass**

Run: `cd anki-addons && python -m pytest cardtimer_for_anki/tests/test_parser.py -v`
Expected: 8 passed.

- [ ] **Step 6: Commit**

```bash
git add anki-addons/cardtimer_for_anki/parser.py anki-addons/cardtimer_for_anki/tests/
git commit -m "feat(anki-addon): implement push command parser with unit tests"
```

---

## Task 4: Implement `dock.py` (QWebEngineView wrapper)

**Files:**
- Create: `anki-addons/cardtimer_for_anki/dock.py`

This module depends on Qt and Anki's `aqt.qt`; it cannot be unit-tested without a live Anki. Verification is by Python syntax check and import attempt.

- [ ] **Step 1: Write `dock.py`**

```python
"""CardTimer dock: QDockWidget + QWebEngineView wrapper.

Owns the dock widget, the embedded webview, the loadFinished gate, and the
pending-push queue for messages that arrive before the page finishes loading.
"""
import json
import os
from typing import List

from aqt.qt import (
    QDockWidget,
    Qt,
    QUrl,
    QWebEngineView,
)
from aqt import mw


HTML_REL_PATH = os.path.join("web", "card-timer.html")


def _dock_html_path() -> str:
    addon_dir = os.path.dirname(__file__)
    return os.path.abspath(os.path.join(addon_dir, HTML_REL_PATH))


class CardTimerDock:
    """Persistent right-side dock hosting card-timer.html."""

    DOCK_OBJECT_NAME = "cardtimer_dock"
    DOCK_TITLE = "CardTimer"

    def __init__(self) -> None:
        self._loaded: bool = False
        self._pending: List[str] = []

        self.widget = QDockWidget(self.DOCK_TITLE, mw)
        self.widget.setObjectName(self.DOCK_OBJECT_NAME)

        self.webview = QWebEngineView()
        self.widget.setWidget(self.webview)

        self.webview.loadFinished.connect(self._on_load_finished)

        mw.addDockWidget(Qt.RightDockWidgetArea, self.widget)

        url = QUrl.fromLocalFile(_dock_html_path())
        self.webview.setUrl(url)

    def _on_load_finished(self, ok: bool) -> None:
        self._loaded = bool(ok)
        if not ok:
            return
        for name in self._pending:
            self._push_now(name)
        self._pending.clear()

    def is_loaded(self) -> bool:
        return self._loaded

    def is_visible(self) -> bool:
        return self.widget.isVisible()

    def show(self) -> None:
        self.widget.show()

    def hide(self) -> None:
        self.widget.hide()

    def toggle(self) -> None:
        if self.widget.isVisible():
            self.widget.hide()
        else:
            self.widget.show()

    def push(self, name: str) -> None:
        """Forward a card name to the embedded card-timer.html.

        If the webview hasn't finished loading, queue the name and flush on
        loadFinished. Otherwise dispatch immediately.
        """
        if not self._loaded:
            self._pending.append(name)
            return
        self._push_now(name)

    def _push_now(self, name: str) -> None:
        payload = json.dumps({"type": "anki-push", "name": name})
        js = f"window.postMessage({payload}, '*');"
        self.webview.page().runJavaScript(js)
```

File: `anki-addons/cardtimer_for_anki/dock.py`

- [ ] **Step 2: Verify Python syntax**

Run: `python -m py_compile anki-addons/cardtimer_for_anki/dock.py`
Expected: no output, exit code 0. (The imports of `aqt.qt` and `aqt` will only resolve inside Anki; syntax check just confirms parsing.)

- [ ] **Step 3: Commit**

```bash
git add anki-addons/cardtimer_for_anki/dock.py
git commit -m "feat(anki-addon): implement CardTimerDock with loadFinished queue"
```

---

## Task 5: Implement `bridge.py` (hook installation and dispatch)

**Files:**
- Create: `anki-addons/cardtimer_for_anki/bridge.py`

- [ ] **Step 1: Write `bridge.py`**

```python"""Install the js-message hook that routes push commands to the dock."""
from typing import Any, Optional

from aqt import gui_hooks

from .parser import parse_push_command


def install(dock: Any) -> None:
    """Register a hook that listens for `cardtimer:push:*` commands.

    The hook is appended to `gui_hooks.webview_did_receive_js_message`. Other
    listeners (and Anki's default handler) still see the message; we only
    act on commands that match the expected prefix.
    """
    gui_hooks.webview_did_receive_js_message.append(
        lambda webview, channel, msg, context=None: _on_message(dock, webview, channel, msg, context)
    )


def _on_message(
    dock: Any,
    webview: Any,
    channel: Any,
    msg: Any,
    context: Optional[Any],
) -> None:
    if not isinstance(msg, str):
        return
    name = parse_push_command(msg)
    if name is None:
        return
    if not dock.is_visible():
        dock.show()
    dock.push(name)
```

File: `anki-addons/cardtimer_for_anki/bridge.py`

- [ ] **Step 2: Verify Python syntax**

Run: `python -m py_compile anki-addons/cardtimer_for_anki/bridge.py`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add anki-addons/cardtimer_for_anki/bridge.py
git commit -m "feat(anki-addon): install webview_did_receive_js_message hook"
```

---

## Task 6: Wire `__init__.py` entry point

**Files:**
- Modify: `anki-addons/cardtimer_for_anki/__init__.py`

- [ ] **Step 1: Replace placeholder with real entry**

```python
"""CardTimer Dock addon entry point.

Creates the dock on profile load and installs the bridge command hook that
forwards manual card pushes from the Anki reviewer to the dock.
"""
from typing import Optional

from aqt import gui_hooks

from .bridge import install as install_bridge
from .dock import CardTimerDock


_dock: Optional[CardTimerDock] = None


def _on_profile_loaded() -> None:
    global _dock
    _dock = CardTimerDock()
    install_bridge(_dock)


gui_hooks.profile_did_open.append(_on_profile_loaded)
```

File: `anki-addons/cardtimer_for_anki/__init__.py`

- [ ] **Step 2: Verify Python syntax**

Run: `python -m py_compile anki-addons/cardtimer_for_anki/__init__.py`
Expected: no output, exit code 0.

- [ ] **Step 3: Run the parser test suite to confirm nothing regressed**

Run: `cd anki-addons && python -m pytest cardtimer_for_anki/tests/test_parser.py -v`
Expected: 8 passed.

- [ ] **Step 4: Commit**

```bash
git add anki-addons/cardtimer_for_anki/__init__.py
git commit -m "feat(anki-addon): wire addon entry point to profile_did_open"
```

---

## Task 7: Manual verification checklist

This task has no automated test. Run through the spec's §8.1 matrix inside a real Anki 25.x install.

**Pre-install:**
- [ ] Locate your Anki addons directory (Anki → Tools → Add-ons → "View Files" button). Usually `~/Anki/addons21/` on macOS/Linux, `%APPDATA%\Anki2\addons21\` on Windows.
- [ ] Copy the addon folder:
  ```bash
  cp -r anki-addons/cardtimer_for_anki <path-to-addons21>/
  ```
  Or on Windows: `xcopy /E /I anki-addons\cardtimer_for_anki <path-to-addons21>\cardtimer_for_anki`

**Smoke test:**
- [ ] Restart Anki. Expected: A new dock labeled "CardTimer" appears on the right side, showing the CardTimer UI.
- [ ] Click "Show Answer" on a review card. Expected: Reviewer re-renders, dock position and contents are unchanged.
- [ ] Move the dock to a different position, close Anki, reopen. Expected: Dock position persists.

**Push test (requires a one-time card template edit):**
- [ ] Open any note in the editor, switch to the Cards… template.
- [ ] Add this snippet to the Back template (anywhere you like):
  ```html
  <button onclick="pycmd('cardtimer:push:' + encodeURIComponent('{{Front}}'))">
    Send to CardTimer
  </button>
  ```
- [ ] Save the note.
- [ ] Review that card. Click "Show Answer" so the Back is rendered.
- [ ] Click the "Send to CardTimer" button.
- [ ] Expected: The dock's `cardNameInput` is filled with the card's Front text and receives focus.
- [ ] In the dock, pick a duration (e.g., 2 min) and click Confirm. Expected: Timer appears in the dock list and starts counting.

**Init-guard test:**
- [ ] Hide the dock via Anki's View menu (or the dock's close button).
- [ ] Click "Send to CardTimer" on a card.
- [ ] Expected: Dock reappears, input is filled.

**Multiple-push test:**
- [ ] Show the dock. Click "Send to CardTimer" on card A, then immediately on card B.
- [ ] Expected: Input shows card B's text (latest push wins). No errors in Anki's terminal output (if launched with `--debug`).

**Restart persistence:**
- [ ] Quit Anki. Reopen. Expected: Dock position preserved; previously created timers still listed (loaded from IndexedDB inside the dock webview).

If any check fails, capture the symptom and which step produced it before stopping; do not proceed past the failure.

---

## Self-Review Checklist

- [x] Spec coverage: §4.1 dock creation → Task 4; §4.2 vendored HTML edit → Task 2; §4.3 user template change → Task 7 verification; §5.1 push flow → Tasks 5+6; §5.2 init-guard queue → Task 4; §6 persistence → Task 4 (`setObjectName` enables Qt saveState); §7 error handling → Task 5 (silent ignore for malformed); §8 testing → Task 7 (manual) + Task 3 (parser unit); §9 out of scope → not implemented.
- [x] Placeholder scan: no TBD/TODO/"implement later" present.
- [x] Type consistency: `parse_push_command(raw)` returns `Optional[str]` in all tasks. `dock.push(name: str)` used consistently. `CardTimerDock` exposed via module-level `_dock` in `__init__.py`.
- [x] All open-decision items from spec §10 are explicitly handled: hook name uses `webview_did_receive_js_message` (verifiable in Task 5); `profile_did_open` chosen for per-profile lifetime (Task 6); HTML is committed verbatim under `web/` (Task 2).

---

## Out-of-Scope Reminders

Do **not** add any of these during implementation; the user can request them later:

- Reverse direction (CardTimer → Anki actions on timer end)
- Auto-push on `reviewer_did_show_question` / `reviewer_did_show_answer`
- Configurable shortcut keys, dock area, or auto-show rules
- `.ankiaddon` zip packaging / AnkiWeb upload
- Bundling card-timer.html via symlink instead of copy (would break on user machines)
