"""System-inspection and application-launch tools for computer control.

These are the read/act tools that make JARVIS a computer assistant rather than
just a chat box. They are still permission-gated and, like the shell tool, the
acting ones are only enabled in an explicit *full-access* mode (see
``default_registry`` and ``Jarvis(full_access=True)``).

* ``SystemInfoTool`` — read-only host facts (OS, CPU, memory, disk, cwd). Safe.
* ``OpenAppTool`` — launch an application / open a file with the OS default
  handler (``open`` on macOS, ``xdg-open`` on Linux, ``start`` on Windows).
"""

from __future__ import annotations

import os
import platform
import shutil
import subprocess
import sys

from jarvis.core.errors import ToolError
from jarvis.tools.base import Tool, ToolContext


class SystemInfoTool(Tool):
    name = "system_info"
    description = "Report host system facts: OS, CPU count, memory, disk, and cwd."
    input_schema = {}
    permission = "system.read"

    def run(self, context: ToolContext) -> dict:
        usage = shutil.disk_usage(os.getcwd())
        info = {
            "os": platform.system(),
            "os_release": platform.release(),
            "machine": platform.machine(),
            "python": sys.version.split()[0],
            "cpu_count": os.cpu_count(),
            "cwd": os.getcwd(),
            "user": os.environ.get("USER") or os.environ.get("USERNAME") or "unknown",
            "disk_total_gb": round(usage.total / 1e9, 1),
            "disk_free_gb": round(usage.free / 1e9, 1),
        }
        # Memory is best-effort: os.sysconf isn't available on Windows.
        try:
            total = os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES")
            info["memory_total_gb"] = round(total / 1e9, 1)
        except (ValueError, AttributeError, OSError):
            info["memory_total_gb"] = None
        return info


class OpenAppTool(Tool):
    name = "open_app"
    description = (
        "Open an application, file, folder, or URL with the OS default handler."
    )
    input_schema = {"target": {"type": "string", "required": True}}
    permission = "desktop.control"

    def __init__(self, enabled: bool = False) -> None:
        self.enabled = enabled

    def run(self, context: ToolContext, *, target: str) -> dict:
        if not self.enabled:
            raise ToolError("open_app is disabled; start JARVIS in full-access mode")
        opener = self._opener()
        try:
            if opener is None:  # Windows
                os.startfile(target)  # type: ignore[attr-defined]  # noqa: S606
            else:
                subprocess.Popen(
                    [opener, target],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
        except (OSError, FileNotFoundError) as exc:
            raise ToolError(f"Could not open {target!r}: {exc}") from exc
        return {"opened": target, "via": opener or "startfile"}

    @staticmethod
    def _opener() -> str | None:
        system = platform.system()
        if system == "Darwin":
            return "open"
        if system == "Windows":
            return None
        return "xdg-open"  # Linux / BSD
