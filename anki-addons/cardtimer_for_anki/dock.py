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

        mw.addDockWidget(Qt.DockWidgetArea.RightDockWidgetArea, self.widget)

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