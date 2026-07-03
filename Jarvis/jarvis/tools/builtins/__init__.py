"""Built-in tools and a helper to assemble a default registry."""

from jarvis.config.settings import ToolsConfig
from jarvis.tools.builtins.calculator import CalculatorTool
from jarvis.tools.builtins.filesystem import ListDirTool, ReadFileTool, WriteFileTool
from jarvis.tools.builtins.http import HttpGetTool
from jarvis.tools.builtins.shell import ShellTool
from jarvis.tools.registry import ToolRegistry

__all__ = [
    "CalculatorTool",
    "ListDirTool",
    "ReadFileTool",
    "WriteFileTool",
    "HttpGetTool",
    "ShellTool",
    "default_registry",
]


def default_registry(config: ToolsConfig | None = None) -> ToolRegistry:
    """Build a registry of the safe built-in tools from configuration.

    The shell tool is included but only *enabled* when ``config.allow_shell`` is
    set, keeping the dangerous capability opt-in.
    """
    config = config or ToolsConfig()
    workspace = config.workspace_dir or None
    registry = ToolRegistry(
        [
            ReadFileTool(workspace),
            WriteFileTool(workspace),
            ListDirTool(workspace),
            CalculatorTool(),
            HttpGetTool(),
            ShellTool(enabled=config.allow_shell, workdir=workspace),
        ]
    )
    return registry
