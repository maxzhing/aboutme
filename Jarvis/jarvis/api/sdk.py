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
        *,
        full_access: bool = False,
    ) -> None:
        self.settings = settings or load_settings()
        configure(level=self.settings.log_level)
        self.full_access = full_access

        self.provider = provider or build_provider(self.settings.llm)
        self.prompts = PromptLibrary()

        embedder = HashingEmbedder(dim=self.settings.memory.vector_dim)
        self.memory = LongTermMemory(
            embedder=embedder,
            persist_dir=self.settings.memory.persist_dir or None,
            half_life_s=self.settings.memory.decay_half_life_s,
        )
        # full_access enables shell + desktop control; otherwise those tools
        # are present but inert.
        self.tools = default_registry(self.settings.tools, full_access=full_access)
        if full_access:
            _log.warning("FULL-ACCESS mode: shell and app-launch tools are ENABLED")

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
        """Run the full reasoning loop for ``goal``.

        As a convenience, a goal beginning with ``!`` is treated as a direct
        shell command and executed immediately (full-access only). This makes
        computer control tangible even with the offline model — ``!ls -la`` runs
        right now — while natural-language goals still go through the full
        plan→execute loop (which, with a real model, will choose tools itself).
        """
        if goal.startswith("!"):
            return self._run_command(goal[1:].strip())
        return self.orchestrator.run(goal, context=context)

    def _run_command(self, command: str) -> RunResult:
        """Execute a shell command directly and wrap it as a RunResult."""
        from jarvis.orchestrator.orchestrator import RunResult, TraceEntry
        from jarvis.orchestrator.task import Task, TaskStatus, TaskTree

        tree = TaskTree(Task(description=f"$ {command}"))
        if not self.full_access:
            tree.root.status = TaskStatus.FAILED
            return RunResult(
                goal=command,
                answer="Direct commands require full-access mode "
                       "(start with `jarvis-serve --full-access`).",
                status="failed",
                tree=tree,
                trace=[TraceEntry("execute", "blocked: not in full-access mode", 0.0)],
            )
        result = self.executor.use_tool("shell", command=command)
        if result.ok:
            out = result.output
            body = out.get("stdout") or out.get("stderr") or "(no output)"
            answer = f"$ {command}\n{body}".rstrip()
            if out.get("exit_code"):
                answer += f"\n[exit {out['exit_code']}]"
            tree.root.status = TaskStatus.DONE
            tree.root.result = answer
            status = "delivered"
        else:
            answer = f"$ {command}\nCommand failed: {result.error}"
            tree.root.status = TaskStatus.FAILED
            status = "failed"
        return RunResult(
            goal=command,
            answer=answer,
            status=status,
            tree=tree,
            trace=[TraceEntry("execute", f"ran shell: {command}", result.ok and 0.9 or 0.2)],
        )

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
            "full_access": self.full_access,
            "memory": self.memory.stats(),
            "tools": self.tools.names(),
            "agents": [
                a.status()
                for a in (self.planner, self.executor, self.researcher, self.reflection)
            ],
        }
