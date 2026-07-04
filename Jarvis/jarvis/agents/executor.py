"""The Executor agent: carries out a single plan step, using tools if needed.

The executor understands a compact tool-call convention so the offline Echo
provider and real LLMs alike can drive tools deterministically. A step whose
model output contains a line ``TOOL <name> {json-args}`` triggers that tool;
otherwise the step is treated as reasoning and the text is the result.
"""

from __future__ import annotations

import json
import re
from typing import Optional

from jarvis.agents.base import Agent, AgentConfig
from jarvis.agents.messages import AgentMessage, MessageKind
from jarvis.core.types import Confidence
from jarvis.llm.base import LLMProvider
from jarvis.tools.registry import ToolRegistry

_TOOL_RE = re.compile(r"TOOL\s+(?P<name>[a-zA-Z_][\w]*)\s*(?P<args>\{.*\})?", re.DOTALL)


class ExecutorAgent(Agent):
    def __init__(self, provider: LLMProvider, tools: Optional[ToolRegistry] = None, **kwargs) -> None:
        config = AgentConfig(
            name="executor",
            role="Execute individual plan steps and invoke tools",
            prompt_name="executor",
            permissions=frozenset(
                {"fs.read", "fs.write", "net.http", "shell.exec",
                 "system.read", "desktop.control"}
            ),
        )
        super().__init__(config, provider, tools=tools, **kwargs)

    def handle(self, message: AgentMessage) -> AgentMessage:
        step = message.content
        context = message.payload.get("context", "(none)")

        # If the caller pre-resolved a tool call, honor it directly. This lets
        # the orchestrator drive tools deterministically without the LLM.
        explicit = message.payload.get("tool")
        if explicit:
            return self._run_tool(message, explicit, message.payload.get("args", {}))

        system = self.render_prompt(
            step=step, context=context, tools=self.tools.describe() or "(none)"
        )
        raw = self.ask_llm(system, step, temperature=0.2)

        tool_match = _TOOL_RE.search(raw)
        if tool_match:
            name = tool_match.group("name")
            args = self._parse_args(tool_match.group("args"))
            return self._run_tool(message, name, args, reasoning=raw)

        if raw.strip().upper().startswith("BLOCKED:"):
            self.confidence = Confidence(0.3)
            return message.reply(raw, kind=MessageKind.ERROR, confidence=float(self.confidence))

        self.confidence = Confidence(0.7)
        return message.reply(raw, result=raw, confidence=float(self.confidence))

    def _run_tool(self, message: AgentMessage, name: str, args: dict, reasoning: str = "") -> AgentMessage:
        if not self.tools.has(name):
            self.confidence = Confidence(0.2)
            return message.reply(
                f"BLOCKED: tool {name!r} is not available",
                kind=MessageKind.ERROR,
                confidence=float(self.confidence),
            )
        result = self.use_tool(name, **args)
        if result.ok:
            self.confidence = Confidence(0.9)
            return message.reply(
                f"Ran {name}: {result.output}",
                confidence=float(self.confidence),
                tool=name,
                output=result.output,
                reasoning=reasoning,
            )
        self.confidence = Confidence(0.3)
        return message.reply(
            f"Tool {name} failed: {result.error}",
            kind=MessageKind.ERROR,
            confidence=float(self.confidence),
            tool=name,
            error=result.error,
        )

    @staticmethod
    def _parse_args(raw: Optional[str]) -> dict:
        if not raw:
            return {}
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {}
