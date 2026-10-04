"""Pure command parser for CardTimer dock push commands.

Each supported action maps to:
  - `prefix`: the pycmd prefix the card template sends (e.g. `cardtimer:q:`)
  - `msg_type`: the postMessage type card-timer.html listens for
  - `field`: payload field name (`name` for anki-push, `content` for the
    cn-en-* family — see card-timer.html's message listener)
  - `accepts_empty`: True if the action ignores the payload (payload may be
    empty). Used by `del`, which has no payload — it just triggers Ctrl+Del.

The Q/W/E actions mirror cn2en-json.html's keyboard handlers: they send the
currently-selected text in the card to the dock, which forwards it to the
embedded card-timer.html via window.postMessage.
`del` does NOT forward to the dock; the bridge handles it directly.
"""
from typing import Optional, Tuple
from urllib.parse import unquote

ACTIONS = {
    "push": {"prefix": "cardtimer:push:", "msg_type": "anki-push",        "field": "name"},
    "q":    {"prefix": "cardtimer:q:",    "msg_type": "cn-en-q",          "field": "content"},
    "w":    {"prefix": "cardtimer:w:",    "msg_type": "cn-en-append",     "field": "content"},
    "e":    {"prefix": "cardtimer:e:",    "msg_type": "cn-en-br",         "field": "content"},
    "send": {"prefix": "cardtimer:send:", "msg_type": "cn-en-q-confirm",  "field": "content"},
    "del":  {"prefix": "cardtimer:del:",  "accepts_empty": True},
}


def parse_command(raw: object) -> Optional[Tuple[str, str]]:
    """Parse a 'cardtimer:ACTION:NAME' command into (action, decoded_name).

    Returns None if the command is malformed, has an unknown prefix, or has
    an empty payload (unless the action declares `accepts_empty`).
    """
    if not isinstance(raw, str):
        return None
    for action, spec in ACTIONS.items():
        prefix = spec["prefix"]
        if raw.startswith(prefix):
            name = unquote(raw[len(prefix):])
            if name or spec.get("accepts_empty"):
                return (action, name)
            return None
    return None


def parse_push_command(raw: object) -> Optional[str]:
    """Backwards-compatible: returns the name for 'cardtimer:push:NAME', else None."""
    result = parse_command(raw)
    if result is None or result[0] != "push":
        return None
    return result[1]


def msg_type_for(action: str) -> Optional[str]:
    """Return the postMessage type card-timer.html listens for, or None."""
    return ACTIONS.get(action, {}).get("msg_type")


def field_for(action: str) -> Optional[str]:
    """Return the payload field name for the action (`name` or `content`)."""
    return ACTIONS.get(action, {}).get("field")
