"""The agent base class.

Every agent has, per the spec: a role, its own tools, a context window (working
memory), long-term memory, objectives, permissions, a health status and a
confidence score. This base wires those together and gives subclasses a small
set of helpers — ``ask_llm``, ``use_tool``, ``recall`` — so a concrete agent is
usually just a prompt name plus a ``handle`` method.
"""

from __future__ import annotations

import abc
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Sequence

from jarvis.core.logging import get_logger
from jarvis.core.types import Confidence, Message, Role
from jarvis.llm.base import LLMProvider
from jarvis.memory.long_term import LongTermMemory
from jarvis.memory.short_term import WorkingMemory
from jarvis.prompts.template import PromptLibrary
from jarvis.tools.base import ToolContext, ToolResult
from jarvis.tools.registry import ToolRegistry
from jarvis.agents.messages import AgentMessage, MessageKind


class Health(str, Enum):
    OK = "ok"
    DEGRADED = "degraded"     # recent recoverable failures
    FAILED = "failed"         # last action failed hard


@dataclass
class AgentConfig:
    """Static description of an agent's role and capabilities."""

    name: str
    role: str
    prompt_name: str
    objectives: Sequence[str] = field(default_factory=tuple)
    permissions: frozenset[str] = frozenset()


class Agent(abc.ABC):
    """Base class for all JARVIS agents."""

    def __init__(
        self,
        config: AgentConfig,
        provider: LLMProvider,
        tools: Optional[ToolRegistry] = None,
        long_term: Optional[LongTermMemory] = None,
        prompts: Optional[PromptLibrary] = None,
        max_context_messages: int = 20,
    ) -> None:
        self.config = config
        self.provider = provider
        self.tools = tools or ToolRegistry()
        self.long_term = long_term
        self.prompts = prompts or PromptLibrary()
        self.memory = WorkingMemory(max_messages=max_context_messages)
        self.health = Health.OK
        self.confidence = Confidence(1.0)
        self._log = get_logger(f"agent.{config.name}")

    # Identity ------------------------------------------------------------ #

    @property
    def name(self) -> str:
        return self.config.name

    def status(self) -> dict:
        """Health snapshot the orchestrator/UI can display for this agent."""
        return {
            "name": self.name,
            "role": self.config.role,
            "health": self.health.value,
            "confidence": float(self.confidence),
            "tools": self.tools.names(),
        }

    # Core behaviour ------------------------------------------------------ #

    @abc.abstractmethod
    def handle(self, message: AgentMessage) -> AgentMessage:
        """Process an incoming message and return a response.

        Subclasses set :attr:`confidence` and :attr:`health` as they work so the
        orchestrator can react (retry, clarify, reassign).
        """

    # Helpers for subclasses --------------------------------------------- #

    def ask_llm(
        self,
        system: str,
        user: str,
        *,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> str:
        """Single-shot LLM call with a system + user message. Tracks health and
        records token/cost/latency metrics for the observability dashboard."""
        from jarvis.core.metrics import METRICS

        messages = [Message(Role.SYSTEM, system), Message(Role.USER, user)]
        try:
            with METRICS.timer("llm.latency_ms", agent=self.name):
                response = self.provider.chat(
                    messages, temperature=temperature, max_tokens=max_tokens
                )
            self.health = Health.OK
            METRICS.incr("llm.calls", agent=self.name)
            METRICS.incr("llm.tokens", response.usage.total_tokens, agent=self.name)
            METRICS.incr("llm.cost_usd", response.usage.cost_usd, agent=self.name)
            self._log.debug(
                "llm call",
                extra={"tokens": response.usage.total_tokens, "cost": response.usage.cost_usd},
            )
            return response.text
        except Exception as exc:  # noqa: BLE001
            self.health = Health.FAILED
            METRICS.incr("llm.errors", agent=self.name)
            self._log.error("llm call failed", extra={"error": str(exc)})
            raise

    def use_tool(self, name: str, **kwargs) -> ToolResult:
        """Invoke a tool with this agent's granted permissions."""
        from jarvis.core.metrics import METRICS

        context = ToolContext(granted_permissions=self.config.permissions)
        result = self.tools.invoke(name, context, **kwargs)
        METRICS.incr("tool.calls", tool=name, ok=str(result.ok).lower())
        METRICS.observe("tool.latency_ms", result.latency_ms, tool=name)
        if not result.ok:
            self.health = Health.DEGRADED
        return result

    def recall(self, query: str, k: int = 3) -> List[str]:
        """Pull relevant snippets from long-term memory, if configured."""
        if self.long_term is None:
            return []
        return [hit.document.text for hit in self.long_term.retrieve_all(query, k=k)]

    def render_prompt(self, **values) -> str:
        return self.prompts.render(self.config.prompt_name, **values)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Agent {self.name!r} role={self.config.role!r} health={self.health.value}>"
