"""A guarded shell tool.

Running arbitrary shell is the highest-risk capability in the system, so this
tool is *off by default* (constructed with ``enabled=False``) and gated behind
the ``shell.exec`` permission. When enabled it:

* runs without a shell interpreter (``shell=False``) to avoid injection via
  metacharacters — the command is a list of argv tokens;
* enforces a timeout and captures both streams;
* refuses an empty command.

Even so, treat this as privileged. The orchestrator only grants ``shell.exec``
when the user has explicitly allowed shell in configuration.
"""

from __future__ import annotations

import shlex
import subprocess

from jarvis.core.errors import ToolError
from jarvis.tools.base import Tool, ToolContext


class ShellTool(Tool):
    name = "shell"
    description = (
        "Run a single non-interactive command (argv style, no shell pipes). "
        "Returns stdout, stderr and the exit code."
    )
    input_schema = {
        "command": {"type": "string", "required": True},
        "cwd": {"type": "string", "required": False},
    }
    permission = "shell.exec"
    timeout_s = 30.0

    def __init__(self, enabled: bool = False, workdir: str | None = None) -> None:
        self.enabled = enabled
        self.workdir = workdir

    def run(self, context: ToolContext, *, command: str, cwd: str | None = None) -> dict:
        if not self.enabled:
            raise ToolError("Shell tool is disabled by configuration")
        argv = shlex.split(command)
        if not argv:
            raise ToolError("Empty command")
        try:
            proc = subprocess.run(
                argv,
                cwd=cwd or self.workdir,
                capture_output=True,
                text=True,
                timeout=self.timeout_s,
                shell=False,
                check=False,
            )
        except FileNotFoundError as exc:
            raise ToolError(f"Command not found: {argv[0]}") from exc
        except subprocess.TimeoutExpired as exc:
            raise ToolError(f"Command timed out after {self.timeout_s}s") from exc
        return {
            "exit_code": proc.returncode,
            "stdout": proc.stdout[-10_000:],
            "stderr": proc.stderr[-10_000:],
        }
