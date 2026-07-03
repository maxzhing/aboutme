"""A registry of tools an agent is allowed to use.

Agents hold a :class:`ToolRegistry` scoped to exactly the tools they may call,
which is how the permission model composes with agent design: an agent without
the shell tool simply cannot run shell commands.
"""

from __future__ import annotations

from typing import Dict, Iterable, List

from jarvis.core.errors import ToolNotFound
from jarvis.core.logging import get_logger
from jarvis.tools.base import Tool, ToolContext, ToolResult

_log = get_logger("tools.registry")


class ToolRegistry:
    def __init__(self, tools: Iterable[Tool] | None = None) -> None:
        self._tools: Dict[str, Tool] = {}
        for tool in tools or []:
            self.register(tool)

    def register(self, tool: Tool) -> None:
        if tool.name in self._tools:
            _log.debug("overriding tool", extra={"tool": tool.name})
        self._tools[tool.name] = tool

    def unregister(self, name: str) -> None:
        self._tools.pop(name, None)

    def get(self, name: str) -> Tool:
        if name not in self._tools:
            raise ToolNotFound(f"No tool named {name!r}. Have: {self.names()}")
        return self._tools[name]

    def has(self, name: str) -> bool:
        return name in self._tools

    def names(self) -> List[str]:
        return sorted(self._tools)

    def specs(self) -> List[dict]:
        """All tool specs — feed these to an LLM so it knows what it can call."""
        return [self._tools[name].spec() for name in self.names()]

    def describe(self) -> str:
        """Compact human/LLM-readable listing for prompt injection."""
        lines = []
        for name in self.names():
            tool = self._tools[name]
            lines.append(f"- {name}: {tool.description}")
        return "\n".join(lines)

    def invoke(self, name: str, context: ToolContext | None = None, **kwargs) -> ToolResult:
        """Look up ``name`` and invoke it through the framework wrapper."""
        return self.get(name).invoke(context, **kwargs)

    def __len__(self) -> int:
        return len(self._tools)

    def __iter__(self):
        return iter(self._tools.values())
