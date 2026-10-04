"""Pytest configuration: stub Anki's `aqt` package so tests can run outside Anki.

The addon's `__init__.py` imports `from aqt import gui_hooks`, and `dock.py`
imports `from aqt.qt import (...)`. Both succeed only inside a running Anki.

This conftest installs minimal `aqt`, `aqt.gui_hooks`, and `aqt.qt` stubs in
`sys.modules` before any test imports the addon, so collection succeeds
outside Anki. Inside Anki, the real modules take precedence.
"""
import sys
import types


def _make_pkg(name: str) -> types.ModuleType:
    pkg = types.ModuleType(name)
    pkg.__path__ = []  # marks as a package, not a leaf module
    pkg._cardtimer_stub = True
    return pkg


def _install_aqt_stub() -> None:
    if "aqt" in sys.modules and getattr(sys.modules.get("aqt"), "_cardtimer_stub", False):
        return

    aqt = _make_pkg("aqt")
    aqt.mw = None  # main window; CardTimerDock reads this at __init__ time
    gui_hooks = _make_pkg("aqt.gui_hooks")
    gui_hooks.profile_did_open = []
    gui_hooks.webview_did_receive_js_message = []

    qt = _make_pkg("aqt.qt")
    qt.Qt = None
    qt.QDockWidget = None
    qt.QUrl = None
    qt.QWebEngineView = None

    sys.modules["aqt"] = aqt
    sys.modules["aqt.gui_hooks"] = gui_hooks
    sys.modules["aqt.qt"] = qt


_install_aqt_stub()
