"""Install the js-message hook that routes push commands to the dock."""
from typing import Any, Optional

from aqt import gui_hooks, mw

from .parser import parse_command


def install(dock: Any) -> None:
    """Register a hook that listens for `cardtimer:*` commands (push/q/w/e/send/del).

    Anki 26.x changed the `webview_did_receive_js_message` hook signature:
        old: hook(webview, channel, msg, context) -> None
        new: hook(handled, message, context) -> tuple[bool, Any]

    We support both for compatibility. The hook returns the (possibly mutated)
    `handled` tuple. If we consume the message, we return (True, None); if not,
    we return `handled` unchanged so other listeners and Anki's default handler
    see the original state.
    """
    gui_hooks.webview_did_receive_js_message.append(
        lambda *args: _on_message(dock, *args)
    )


def _on_message(
    dock: Any,
    *args: Any,
) -> Any:
    # Anki 26.x: (handled: tuple[bool, Any], message: str, context: Any)
    # Anki <=25.x: (webview, channel, msg, context=None)
    handled: Optional[tuple[bool, Any]] = None
    message: Any = None
    if len(args) == 3 and isinstance(args[0], tuple):
        handled, message, _context = args
    elif len(args) >= 3:
        _webview, _channel, message = args[0], args[1], args[2]
    else:
        return handled if handled is not None else None

    if not isinstance(message, str):
        return handled if handled is not None else None

    parsed = parse_command(message)
    if parsed is None:
        return handled if handled is not None else None

    action, name = parsed
    if action == "del":
        _trigger_delete_shortcut()
    else:
        if not dock.is_visible():
            dock.show()
        dock.push_action(name, action)

    if handled is not None:
        return (True, None)
    return None


def _trigger_delete_shortcut() -> None:
    """Trigger whatever Anki has bound to Ctrl+Del.

    Primary: find the QAction Anki has bound to "Ctrl+Del" and trigger it
    directly — no focus dependency.
    Fallback: synthesize a keypress on the main window for QShortcut bindings.
    """
    from aqt.qt import QKeySequence

    action = mw.actionForShortcut(QKeySequence("Ctrl+Del"))
    if action is not None:
        action.trigger()
        return

    from PyQt6.QtTest import QTest
    from aqt.qt import Qt

    mw.activateWindow()
    QTest.keyClick(mw, Qt.Key.Key_Delete, Qt.KeyboardModifier.ControlModifier)
