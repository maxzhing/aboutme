"""A dependency-free REST API over :class:`~jarvis.api.sdk.Jarvis`.

Built on ``http.server`` so it runs anywhere Python does, with no web
framework. It is intentionally small — a reference surface, not a production
gateway. For production you would front the same :class:`Jarvis` instance with
FastAPI/uvicorn; the handler logic below maps one-to-one onto route functions.

Endpoints:

* ``GET  /``                  → the web chat UI (works on phone and desktop)
* ``GET  /health``            → liveness probe
* ``GET  /status``            → full system snapshot
* ``POST /ask``  {"goal": …}  → run the reasoning loop, returns the answer
* ``POST /remember`` {"fact": …} → store a fact
"""

from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Optional

from jarvis.api.sdk import Jarvis
from jarvis.core.logging import get_logger
from jarvis.ui import index_html

_log = get_logger("api.server")


def _make_handler(app: Jarvis):
    class Handler(BaseHTTPRequestHandler):
        # Silence the default noisy stderr logging; we use our own logger.
        def log_message(self, *_args) -> None:  # noqa: D401
            pass

        def _send(self, status: int, payload: dict) -> None:
            body = json.dumps(payload, default=str).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _send_html(self, html: str, status: int = 200) -> None:
            body = html.encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _read_json(self) -> dict:
            length = int(self.headers.get("Content-Length", 0))
            if not length:
                return {}
            try:
                return json.loads(self.rfile.read(length).decode("utf-8"))
            except json.JSONDecodeError:
                return {}

        def do_GET(self) -> None:  # noqa: N802 (http.server naming)
            path = self.path.split("?", 1)[0]
            if path in ("/", "/ui", "/index.html"):
                self._send_html(index_html())
            elif path == "/health":
                self._send(200, {"status": "ok"})
            elif path == "/status":
                self._send(200, app.status())
            elif path == "/favicon.ico":
                self.send_response(204)  # no favicon; avoid noisy 404s
                self.end_headers()
            else:
                self._send(404, {"error": "not found"})

        def do_POST(self) -> None:  # noqa: N802
            data = self._read_json()
            if self.path == "/ask":
                goal = data.get("goal")
                if not goal:
                    return self._send(400, {"error": "missing 'goal'"})
                result = app.ask(goal, context=data.get("context", ""))
                self._send(
                    200,
                    {
                        "status": result.status,
                        "answer": result.answer,
                        "clarification": result.clarification,
                        "trace": [e.__dict__ for e in result.trace],
                        "tasks": result.tree.summary(),
                    },
                )
            elif self.path == "/remember":
                fact = data.get("fact")
                if not fact:
                    return self._send(400, {"error": "missing 'fact'"})
                doc_id = app.remember(fact)
                self._send(200, {"stored": True, "doc_id": doc_id})
            else:
                self._send(404, {"error": "not found"})

    return Handler


def serve(host: str = "127.0.0.1", port: int = 8080, app: Optional[Jarvis] = None) -> ThreadingHTTPServer:
    """Create and return a running-ready HTTP server. Call ``serve_forever``."""
    app = app or Jarvis()
    server = ThreadingHTTPServer((host, port), _make_handler(app))
    _log.info("serving", extra={"host": host, "port": port})
    return server


def _lan_ip() -> str:
    """Best-effort local network IP so a phone knows where to connect."""
    import socket

    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.connect(("8.8.8.8", 80))  # no packets sent; just picks the route
        ip = sock.getsockname()[0]
        sock.close()
        return ip
    except Exception:
        return "127.0.0.1"


def main() -> None:  # pragma: no cover - CLI entry
    import argparse

    parser = argparse.ArgumentParser(description="Run the JARVIS web UI + REST API")
    parser.add_argument("--host", default="127.0.0.1",
                        help="bind address; use 0.0.0.0 to allow phones on your Wi-Fi")
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()
    server = serve(args.host, args.port)

    print(f"\n  JARVIS is running.\n")
    print(f"    On this computer:  http://localhost:{args.port}")
    if args.host == "0.0.0.0":
        print(f"    On your phone:     http://{_lan_ip()}:{args.port}   (same Wi-Fi)")
    else:
        print(f"    For phone access, restart with:  jarvis-serve --host 0.0.0.0")
    print("\n  Press Ctrl+C to stop.\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()
        print("\n  Stopped.")


if __name__ == "__main__":  # pragma: no cover
    main()
