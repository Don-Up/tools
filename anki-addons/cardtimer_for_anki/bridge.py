"""Install the js-message hook that routes push commands to the dock."""
from typing import Any, Optional

from aqt import gui_hooks

from .parser import parse_command


def install(dock: Any) -> None:
    """Register a hook that listens for `cardtimer:*` commands (push/q/w/e/send).

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
    if not dock.is_visible():
        dock.show()
    dock.push_action(name, action)

    if handled is not None:
        return (True, None)
    return None
