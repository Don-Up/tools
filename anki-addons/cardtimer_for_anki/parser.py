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
