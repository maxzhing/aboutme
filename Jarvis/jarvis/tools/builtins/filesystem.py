"""Sandboxed filesystem tools.

Both tools confine every path to a configured ``workspace`` root. Attempts to
escape it (``..``, absolute paths outside the root, symlink tricks resolved by
``Path.resolve``) are rejected before any I/O happens. This is the single most
important guardrail for an autonomous agent touching a real disk.
"""

from __future__ import annotations

from pathlib import Path

from jarvis.core.errors import ToolError
from jarvis.tools.base import Tool, ToolContext


class _WorkspaceTool(Tool):
    """Shared path-confinement logic for filesystem tools."""

    def __init__(self, workspace: str | Path | None = None) -> None:
        self.workspace = Path(workspace or Path.cwd()).resolve()

    def _safe_path(self, relative: str) -> Path:
        candidate = (self.workspace / relative).resolve()
        # ``is_relative_to`` (3.9+) confirms the resolved path stays in-bounds.
        if not candidate.is_relative_to(self.workspace):
            raise ToolError(
                f"Path {relative!r} escapes the workspace {self.workspace}"
            )
        return candidate


class ReadFileTool(_WorkspaceTool):
    name = "read_file"
    description = "Read a UTF-8 text file from the workspace."
    input_schema = {"path": {"type": "string", "required": True}}
    permission = "fs.read"

    def run(self, context: ToolContext, *, path: str) -> str:
        target = self._safe_path(path)
        if not target.exists():
            raise ToolError(f"File not found: {path}")
        if not target.is_file():
            raise ToolError(f"Not a file: {path}")
        return target.read_text("utf-8")


class WriteFileTool(_WorkspaceTool):
    name = "write_file"
    description = "Create or overwrite a UTF-8 text file in the workspace."
    input_schema = {
        "path": {"type": "string", "required": True},
        "content": {"type": "string", "required": True},
    }
    permission = "fs.write"

    def run(self, context: ToolContext, *, path: str, content: str) -> dict:
        target = self._safe_path(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, "utf-8")
        return {"path": str(target.relative_to(self.workspace)), "bytes": len(content)}


class ListDirTool(_WorkspaceTool):
    name = "list_dir"
    description = "List the entries of a directory within the workspace."
    input_schema = {"path": {"type": "string", "required": False}}
    permission = "fs.read"

    def run(self, context: ToolContext, *, path: str = ".") -> list:
        target = self._safe_path(path)
        if not target.is_dir():
            raise ToolError(f"Not a directory: {path}")
        return sorted(
            f"{p.name}/" if p.is_dir() else p.name for p in target.iterdir()
        )
