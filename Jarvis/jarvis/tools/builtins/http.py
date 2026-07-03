"""HTTP fetch tool built on the standard library.

Kept dependency-free (``urllib``) and permission-gated behind ``net.http``.
Only ``http``/``https`` schemes are allowed, and the response body is truncated
so a rogue URL cannot flood memory. This is the seed of the broader web /
search / browser tooling; richer browsing plugs in as additional tools.
"""

from __future__ import annotations

import urllib.error
import urllib.request

from jarvis.core.errors import ToolError
from jarvis.tools.base import Tool, ToolContext

_MAX_BYTES = 200_000


class HttpGetTool(Tool):
    name = "http_get"
    description = "Fetch the body of an http(s) URL (GET). Returns truncated text."
    input_schema = {
        "url": {"type": "string", "required": True},
        "max_bytes": {"type": "integer", "required": False},
    }
    permission = "net.http"
    timeout_s = 20.0
    retries = 1

    def run(self, context: ToolContext, *, url: str, max_bytes: int = _MAX_BYTES) -> dict:
        if not url.startswith(("http://", "https://")):
            raise ToolError("Only http and https URLs are permitted")
        request = urllib.request.Request(url, headers={"User-Agent": "JARVIS/2.0"})
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_s) as resp:
                raw = resp.read(max_bytes + 1)
                truncated = len(raw) > max_bytes
                body = raw[:max_bytes].decode("utf-8", errors="replace")
                return {
                    "status": resp.status,
                    "url": resp.geturl(),
                    "truncated": truncated,
                    "body": body,
                }
        except urllib.error.HTTPError as exc:
            raise ToolError(f"HTTP {exc.code} for {url}") from exc
        except urllib.error.URLError as exc:
            raise ToolError(f"Could not reach {url}: {exc.reason}") from exc
