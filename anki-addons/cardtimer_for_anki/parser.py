"""Pure command parser for CardTimer dock push commands.

Each supported action maps to:
  - `prefix`: the pycmd prefix the card template sends (e.g. `cardtimer:q:`)
  - `msg_type`: the postMessage type card-timer.html listens for
  - `field`: payload field name (`name` for anki-push, `content` for the
    cn-en-* family — see card-timer.html's message listener)

The Q/W/E actions mirror cn2en-json.html's keyboard handlers: they send the
currently-selected text in the card to the dock, which forwards it to the
embedded card-timer.html via window.postMessage.
"""
from typing import Optional, Tuple
from urllib.parse import unquote

ACTIONS = {
    "push": {"prefix": "cardtimer:push:", "msg_type": "anki-push",    "field": "name"},
    "q":    {"prefix": "cardtimer:q:",    "msg_type": "cn-en-q",      "field": "content"},
    "w":    {"prefix": "cardtimer:w:",    "msg_type": "cn-en-append", "field": "content"},
    "e":    {"prefix": "cardtimer:e:",    "msg_type": "cn-en-br",     "field": "content"},
}


def parse_command(raw: object) -> Optional[Tuple[str, str]]:
    """Parse a 'cardtimer:ACTION:NAME' command into (action, decoded_name).

    Returns None if the command is malformed, has an unknown prefix, or has
    an empty payload.
    """
    if not isinstance(raw, str):
        return None
    for action, spec in ACTIONS.items():
        prefix = spec["prefix"]
        if raw.startswith(prefix):
            name = unquote(raw[len(prefix):])
            return (action, name) if name else None
    return None


def parse_push_command(raw: object) -> Optional[str]:
    """Backwards-compatible: returns the name for 'cardtimer:push:NAME', else None."""
    result = parse_command(raw)
    if result is None or result[0] != "push":
        return None
    return result[1]


def msg_type_for(action: str) -> Optional[str]:
    """Return the postMessage type card-timer.html listens for, or None."""
    spec = ACTIONS.get(action)
    return spec["msg_type"] if spec else None


def field_for(action: str) -> Optional[str]:
    """Return the payload field name for the action (`name` or `content`)."""
    spec = ACTIONS.get(action)
    return spec["field"] if spec else None
