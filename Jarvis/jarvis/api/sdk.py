"""The high-level facade: ``Jarvis``.

This is the one class most users touch. It wires configuration → provider →
memory → tools → agents → orchestrator with sensible defaults, and exposes a
tiny surface: :meth:`ask` for a one-shot goal, :meth:`remember` to teach it a
fact, and :meth:`status` for introspection. Everything underneath remains
independently usable; this just assembles the common configuration.
"""

from __future__ import annotations

from typing import Optional

from jarvis.agents.executor import ExecutorAgent
from jarvis.agents.memory_agent import MemoryAgent
from jarvis.agents.planner import PlannerAgent
from jarvis.agents.reflection import ReflectionAgent
from jarvis.agents.researcher import ResearcherAgent
from jarvis.config.settings import Settings, load_settings
from jarvis.core.logging import configure, get_logger
from jarvis.llm.base import LLMProvider
from jarvis.llm.registry import build_provider
from jarvis.memory.embeddings import HashingEmbedder
from jarvis.memory.long_term import LongTermMemory
from jarvis.orchestrator.orchestrator import Orchestrator, RunResult
from jarvis.prompts.template import PromptLibrary
from jarvis.tools.builtins import default_registry

_log = get_logger("api.sdk")


class Jarvis:
    """Assembled JARVIS assistant."""

    def __init__(
        self,
        settings: Optional[Settings] = None,
        provider: Optional[LLMProvider] = None,
    ) -> None:
        self.settings = settings or load_settings()
        configure(level=self.settings.log_level)

        self.provider = provider or build_provider(self.settings.llm)
        self.prompts = PromptLibrary()

        embedder = HashingEmbedder(dim=self.settings.memory.vector_dim)
        self.memory = LongTermMemory(
            embedder=embedder,
            persist_dir=self.settings.memory.persist_dir or None,
            half_life_s=self.settings.memory.decay_half_life_s,
        )
        self.tools = default_registry(self.settings.tools)

        # Agents share the provider, prompts and memory.
        common = {"prompts": self.prompts}
        self.planner = PlannerAgent(self.provider, **common)
        self.executor = ExecutorAgent(self.provider, tools=self.tools, **common)
        self.researcher = ResearcherAgent(self.provider, long_term=self.memory, **common)
        self.reflection = ReflectionAgent(self.provider, long_term=self.memory, **common)
        self.memory_agent = MemoryAgent(self.provider, long_term=self.memory, **common)

        self.orchestrator = Orchestrator(
            planner=self.planner,
            executor=self.executor,
            researcher=self.researcher,
            reflection=self.reflection,
            long_term=self.memory,
            config=self.settings.orchestrator,
        )
        _log.info("jarvis ready", extra={"provider": self.provider.name})

    # ------------------------------------------------------------------ #

    def ask(self, goal: str, context: str = "") -> RunResult:
        """Run the full reasoning loop for ``goal`` and return the result."""
        return self.orchestrator.run(goal, context=context)

    def remember(self, fact: str, **metadata) -> str:
        """Store a semantic fact in long-term memory (de-duplicated)."""
        from jarvis.agents.messages import AgentMessage, MessageKind

        msg = AgentMessage(
            sender="user",
            recipient="memory",
            kind=MessageKind.REQUEST,
            content=fact,
            payload={"action": "store", "meta": metadata},
        )
        return self.memory_agent.handle(msg).payload.get("doc_id", "")

    def status(self) -> dict:
        """Snapshot of provider, memory, tools, and agent health."""
        return {
            "provider": self.provider.name,
            "model": self.provider.model,
            "memory": self.memory.stats(),
            "tools": self.tools.names(),
            "agents": [
                a.status()
                for a in (self.planner, self.executor, self.researcher, self.reflection)
            ],
        }
