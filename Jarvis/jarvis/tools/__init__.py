"""Tool framework: uniform, permissioned, schema-validated capabilities."""

from jarvis.tools.base import Tool, ToolContext, ToolResult
from jarvis.tools.builtins import default_registry
from jarvis.tools.registry import ToolRegistry

__all__ = [
    "Tool",
    "ToolContext",
    "ToolResult",
    "ToolRegistry",
    "default_registry",
]
