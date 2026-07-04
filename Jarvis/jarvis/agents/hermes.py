"""Hermes — the conversational front of JARVIS (the "talking" agent).

In the Hermes-Agent tradition, Hermes is the messenger: it holds the natural
conversation with the user, decides whether a message is small talk or real
work, delegates work to the :class:`~jarvis.orchestrator.orchestrator.Orchestrator`,
and then *narrates the result in spoken language*. Everything the user hears
through voice comes from Hermes, so its output is deliberately short and
markdown-free — written for the ear, not the screen.

Hermes owns the conversation memory (working memory), giving JARVIS continuity
across turns without the orchestrator having to care about dialogue.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List, Optional

from jarvis.agents.base import Agent, AgentConfig
from jarvis.agents.messages import AgentMessage, MessageKind
from jarvis.core.types import Confidence, Message, Role
from jarvis.llm.base import LLMProvider

# Verbs/markers that signal the user wants *work done* rather than chit-chat.
_TASK_MARKERS = re.compile(
    r"\b(plan\w*|research\w*|find|search\w*|build\w*|make|create\w*|write|code|"
    r"fix\w*|refactor\w*|run|execute\w*|open\w*|launch\w*|summar\w*|schedul\w*|"
    r"remind\w*|analy\w*|generat\w*|draft|organiz\w*|calculat\w*|comput\w*|"
    r"list|show me|look up|check)\b",
    re.IGNORECASE,
)


@dataclass
class HermesReply:
    """What Hermes says, plus the structured work behind it (if any)."""

    spoken: str                    # natural-language text, safe to read aloud
    kind: str                      # "chat" | "task" | "clarify"
    confidence: float = 1.0
    run_result: Optional[object] = None  # the orchestrator RunResult for tasks


class HermesAgent(Agent):
    def __init__(
        self,
        provider: LLMProvider,
        orchestrator=None,
        long_term=None,
        **kwargs,
    ) -> None:
        config = AgentConfig(
            name="hermes",
            role="Converse naturally and route work to the agent swarm",
            prompt_name="hermes",
            objectives=("hold a natural conversation", "delegate real work",
                        "speak results for the ear"),
        )
        super().__init__(config, provider, long_term=long_term, **kwargs)
        self.orchestrator = orchestrator

    # -- classification --------------------------------------------------- #

    @staticmethod
    def is_task(text: str) -> bool:
        """Heuristic: does this utterance ask JARVIS to *do* something?

        Deterministic so the offline model and tests behave predictably; a
        direct ``!command`` is always a task.
        """
        stripped = text.strip()
        if stripped.startswith("!"):
            return True
        if "?" in stripped and not _TASK_MARKERS.search(stripped):
            return False  # a plain question is conversational
        return bool(_TASK_MARKERS.search(stripped))

    # -- main entry ------------------------------------------------------- #

    def converse(self, text: str) -> HermesReply:
        """Handle one user utterance end to end and return what to say."""
        self.memory.add_user(text)
        memory_snips = self.recall(text, k=3)

        if self.is_task(text) and self.orchestrator is not None:
            result = self.orchestrator.run(text)
            spoken = self._narrate(text, memory_snips, result)
            kind = "clarify" if result.status == "needs_clarification" else "task"
            self.confidence = Confidence(0.4 if kind == "clarify" else 0.85)
            reply = HermesReply(spoken, kind, float(self.confidence), result)
        else:
            spoken = self._chat(text, memory_snips)
            self.confidence = Confidence(0.7)
            reply = HermesReply(spoken, "chat", float(self.confidence))

        self.memory.add_assistant(reply.spoken)
        return reply

    def handle(self, message: AgentMessage) -> AgentMessage:
        """Message-bus entry point mirroring :meth:`converse`."""
        reply = self.converse(message.content)
        kind = MessageKind.CLARIFY if reply.kind == "clarify" else MessageKind.RESULT
        return message.reply(reply.spoken, kind=kind, confidence=reply.confidence,
                             conversation_kind=reply.kind)

    # -- generation helpers ----------------------------------------------- #

    def _history_text(self, limit: int = 6) -> str:
        turns = self.memory.history()[-limit:]
        if not turns:
            return "(no prior conversation)"
        speaker = {Role.USER: "User", Role.ASSISTANT: "Hermes"}
        return "\n".join(f"{speaker.get(m.role, m.role.value)}: {m.content}" for m in turns)

    def _chat(self, text: str, memory: List[str]) -> str:
        system = self.render_prompt(
            history=self._history_text(),
            message=text,
            memory="\n".join(f"- {m}" for m in memory) or "(nothing relevant)",
            result_block="",
        )
        return self.ask_llm(system, text, temperature=0.6, max_tokens=300).strip()

    def _narrate(self, text: str, memory: List[str], result) -> str:
        if result.status == "needs_clarification":
            # The orchestrator already produced a focused question; speak it.
            return result.clarification or "Could you tell me a bit more?"
        result_block = (
            "# Results of the task I ran for you\n"
            f"Status: {result.status}\n"
            f"Outcome: {result.answer}"
        )
        system = self.render_prompt(
            history=self._history_text(),
            message=text,
            memory="\n".join(f"- {m}" for m in memory) or "(nothing relevant)",
            result_block=result_block,
        )
        spoken = self.ask_llm(system, "Tell me how it went.", temperature=0.5, max_tokens=250).strip()
        # The offline Echo model just echoes; fall back to a clean spoken summary
        # so voice output is always sensible even without a real LLM.
        if not spoken or spoken.startswith("Acknowledged"):
            first_line = result.answer.splitlines()[0] if result.answer else "Done."
            return f"Done. {first_line}"
        return spoken
