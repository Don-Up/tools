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