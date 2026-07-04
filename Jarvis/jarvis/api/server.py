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
from jarvis.ui import dashboard_html, index_html

_log = get_logger("api.server")


def _make_handler(app: Jarvis, token: str = "", require_auth: bool = False):
    class Handler(BaseHTTPRequestHandler):
        # Silence the default noisy stderr logging; we use our own logger.
        def log_message(self, *_args) -> None:  # noqa: D401
            pass

        def _authorized(self) -> bool:
            """Token gate for action/data endpoints.

            Only enforced when ``require_auth`` is set (full-access + a non-local
            bind). The static UI page itself is always served so it can load and
            then supply the token from its URL. Uses ``hmac.compare_digest`` to
            avoid timing leaks.
            """
            if not require_auth:
                return True
            from urllib.parse import parse_qs, urlparse

            supplied = self.headers.get("X-Jarvis-Token", "")
            if not supplied:
                supplied = parse_qs(urlparse(self.path).query).get("token", [""])[0]
            import hmac

            return bool(supplied) and hmac.compare_digest(supplied, token)

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
            elif path == "/dashboard":
                self._send_html(dashboard_html())
            elif path == "/health":
                self._send(200, {"status": "ok"})
            elif path == "/status":
                if not self._authorized():
                    return self._send(401, {"error": "missing or invalid token"})
                self._send(200, app.status())
            elif path == "/metrics":
                if not self._authorized():
                    return self._send(401, {"error": "missing or invalid token"})
                self._send(200, app.metrics())
            elif path == "/logs":
                if not self._authorized():
                    return self._send(401, {"error": "missing or invalid token"})
                from urllib.parse import parse_qs, urlparse

                q = parse_qs(urlparse(self.path).query)
                limit = int(q.get("limit", ["100"])[0])
                level = q.get("level", [None])[0]
                self._send(200, {"events": app.logs(limit=limit, level=level)})
            elif path == "/favicon.ico":
                self.send_response(204)  # no favicon; avoid noisy 404s
                self.end_headers()
            else:
                self._send(404, {"error": "not found"})

        def do_POST(self) -> None:  # noqa: N802
            if not self._authorized():
                return self._send(401, {"error": "missing or invalid token"})
            data = self._read_json()
            route = self.path.split("?", 1)[0]
            if route == "/ask":
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
                        "tree": [t.to_dict() for t in result.tree.all()],
                    },
                )
            elif route == "/converse":
                text = data.get("text") or data.get("goal")
                if not text:
                    return self._send(400, {"error": "missing 'text'"})
                reply = app.converse(text)
                payload = {
                    "spoken": reply.spoken,
                    "kind": reply.kind,
                    "confidence": reply.confidence,
                }
                if reply.run_result is not None:
                    rr = reply.run_result
                    payload["answer"] = rr.answer
                    payload["status"] = rr.status
                    payload["trace"] = [e.__dict__ for e in rr.trace]
                    payload["tree"] = [t.to_dict() for t in rr.tree.all()]
                self._send(200, payload)
            elif route == "/remember":
                fact = data.get("fact")
                if not fact:
                    return self._send(400, {"error": "missing 'fact'"})
                doc_id = app.remember(fact)
                self._send(200, {"stored": True, "doc_id": doc_id})
            else:
                self._send(404, {"error": "not found"})

    return Handler


_LOCAL_HOSTS = {"127.0.0.1", "localhost", "::1", ""}


def serve(
    host: str = "127.0.0.1",
    port: int = 8080,
    app: Optional[Jarvis] = None,
    *,
    token: Optional[str] = None,
) -> ThreadingHTTPServer:
    """Create a running-ready HTTP server. Call ``serve_forever`` on it.

    Security: if the app runs in **full-access** mode *and* is bound beyond
    localhost, action/data endpoints require a secret token. One is generated
    automatically if not supplied and is stashed on ``server.access_token`` so
    the caller can print a ready-to-use URL. Without this, anyone on the network
    could run commands on the host.
    """
    app = app or Jarvis()
    remote = host not in _LOCAL_HOSTS
    require_auth = bool(getattr(app, "full_access", False) and remote)
    if require_auth and not token:
        import secrets

        token = secrets.token_urlsafe(16)
    server = ThreadingHTTPServer((host, port), _make_handler(app, token or "", require_auth))
    server.access_token = token or ""  # type: ignore[attr-defined]
    server.require_auth = require_auth  # type: ignore[attr-defined]
    _log.info("serving", extra={"host": host, "port": port, "auth": require_auth})
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
    parser.add_argument("--full-access", action="store_true",
                        help="let JARVIS run shell commands and launch apps on THIS machine")
    args = parser.parse_args()

    app = Jarvis(full_access=args.full_access)
    server = serve(args.host, args.port, app)
    token = getattr(server, "access_token", "")
    suffix = f"?token={token}" if token else ""
    lan = _lan_ip()

    print("\n  JARVIS is running.\n")
    print(f"    On this computer:  http://localhost:{args.port}{suffix}")
    if args.host == "0.0.0.0":
        print(f"    On your phone:     http://{lan}:{args.port}{suffix}   (same Wi-Fi)")
    else:
        print("    For phone access, restart with:  jarvis-serve --host 0.0.0.0")
    if args.full_access:
        print("\n  ⚠  FULL-ACCESS: JARVIS can run commands on this machine.")
        if token:
            print("     The token in the URL above is required — only share that link with yourself.")
        elif args.host != "127.0.0.1":
            print("     Bound to a public interface with no token — this is unsafe; prefer --host 0.0.0.0 (auto-token) or localhost.")
    print("\n  Press Ctrl+C to stop.\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()
        print("\n  Stopped.")


if __name__ == "__main__":  # pragma: no cover
    main()
