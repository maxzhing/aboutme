"""Built-in tools and a helper to assemble a default registry."""

from jarvis.config.settings import ToolsConfig
from jarvis.tools.builtins.calculator import CalculatorTool
from jarvis.tools.builtins.filesystem import ListDirTool, ReadFileTool, WriteFileTool
from jarvis.tools.builtins.http import HttpGetTool
from jarvis.tools.builtins.shell import ShellTool
from jarvis.tools.builtins.system import OpenAppTool, SystemInfoTool
from jarvis.tools.registry import ToolRegistry

__all__ = [
    "CalculatorTool",
    "ListDirTool",
    "ReadFileTool",
    "WriteFileTool",
    "HttpGetTool",
    "ShellTool",
    "SystemInfoTool",
    "OpenAppTool",
    "default_registry",
]


def default_registry(
    config: ToolsConfig | None = None, *, full_access: bool = False
) -> ToolRegistry:
    """Build a registry of the built-in tools from configuration.

    In the default (safe) mode the shell and desktop-control tools are present
    but disabled, so an agent literally cannot run commands or launch apps.

    ``full_access=True`` — or ``config.allow_shell`` — flips the dangerous
    capabilities on: the shell executes, and ``open_app`` can launch programs.
    This is the "give JARVIS my whole computer" switch and is always opt-in.
    """
    config = config or ToolsConfig()
    workspace = config.workspace_dir or None
    shell_on = full_access or config.allow_shell
    registry = ToolRegistry(
        [
            ReadFileTool(workspace),
            WriteFileTool(workspace),
            ListDirTool(workspace),
            CalculatorTool(),
            HttpGetTool(),
            SystemInfoTool(),
            ShellTool(enabled=shell_on, workdir=workspace, use_shell=full_access),
            OpenAppTool(enabled=full_access),
        ]
    )
    return registry
