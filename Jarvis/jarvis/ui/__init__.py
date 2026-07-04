"""The web UI: a single self-contained HTML chat app served by the REST server.

The page has no external dependencies (no CDN fonts/scripts/styles), so it works
offline and over a LAN. It talks to the same server's ``/ask``, ``/status`` and
``/remember`` endpoints via same-origin ``fetch`` — no CORS needed.
"""

from __future__ import annotations

from pathlib import Path

_UI_DIR = Path(__file__).parent
INDEX_PATH = _UI_DIR / "index.html"
DASHBOARD_PATH = _UI_DIR / "dashboard.html"


def index_html() -> str:
    """Return the chat UI's HTML. Read fresh so edits show on reload in dev."""
    return INDEX_PATH.read_text("utf-8")


def dashboard_html() -> str:
    """Return the observability dashboard's HTML."""
    return DASHBOARD_PATH.read_text("utf-8")


__all__ = ["index_html", "dashboard_html", "INDEX_PATH", "DASHBOARD_PATH"]
