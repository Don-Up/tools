"""Install the js-message hook that routes push commands to the dock."""
import os
import tempfile
from typing import Any, Optional

from aqt import gui_hooks

from .parser import parse_command

DEBUG_LOG = os.path.join(tempfile.gettempdir(), "cardtimer_debug.log")


def _log(msg: str) -> None:
    try:
        with open(DEBUG_LOG, "a", encoding="utf-8") as f:
            f.write(msg + "\n")
    except Exception:
        pass


def install(dock: Any) -> None:
    """Register a hook that listens for `cardtimer:*` commands (push/q/w/e).

    Anki 26.x changed the `webview_did_receive_js_message` hook signature:
        old: hook(webview, channel, msg, context) -> None
        new: hook(handled, message, context) -> tuple[bool, Any]

    We support both for compatibility. The hook returns the (possibly mutated)
    `handled` tuple. If we consume the message, we return (True, None); if not,
    we return `handled` unchanged so other listeners and Anki's default handler
    see the original state.
    """
    _log(f"[cardtimer] install() called, log file: {DEBUG_LOG}")
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
        _log(f"[cardtimer] hook fired with unexpected args: {args!r}")
        return handled if handled is not None else None

    _log(f"[cardtimer] hook fired, message={message!r}")
    if not isinstance(message, str):
        return handled if handled is not None else None

    parsed = parse_command(message)
    _log(f"[cardtimer] parsed={parsed!r}")
    if parsed is None:
        return handled if handled is not None else None

    action, name = parsed
    _log(f"[cardtimer] dispatch action={action!r} name={name!r}")
    if not dock.is_visible():
        dock.show()
    dock.push_action(name, action)
    _log(f"[cardtimer] push_action returned")

    if handled is not None:
        return (True, None)
    return None
