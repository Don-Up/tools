"""Install the js-message hook that routes push commands to the dock."""
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