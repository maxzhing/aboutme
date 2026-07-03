"""The Researcher agent: answers questions grounded in retrieved knowledge."""

from __future__ import annotations

from typing import Optional

from jarvis.agents.base import Agent, AgentConfig
from jarvis.agents.messages import AgentMessage
from jarvis.core.types import Confidence
from jarvis.llm.base import LLMProvider
from jarvis.memory.long_term import LongTermMemory


class ResearcherAgent(Agent):
    def __init__(self, provider: LLMProvider, long_term: Optional[LongTermMemory] = None, **kwargs) -> None:
        config = AgentConfig(
            name="researcher",
            role="Retrieve and synthesize grounded answers",
            prompt_name="researcher",
            permissions=frozenset({"net.http"}),
        )
        super().__init__(config, provider, long_term=long_term, **kwargs)

    def handle(self, message: AgentMessage) -> AgentMessage:
        question = message.content
        hits = []
        if self.long_term is not None:
            hits = self.long_term.retrieve_all(question, k=message.payload.get("k", 4))

        knowledge = self._format_knowledge(hits)
        system = self.render_prompt(question=question, knowledge=knowledge)
        answer = self.ask_llm(system, question, temperature=0.2)

        # Confidence reflects how much grounding we actually had.
        self.confidence = Confidence(0.4 + min(0.5, 0.15 * len(hits)))
        return message.reply(
            answer,
            sources=[h.document.text for h in hits],
            grounded=bool(hits),
            confidence=float(self.confidence),
        )

    @staticmethod
    def _format_knowledge(hits) -> str:
        if not hits:
            return "(no retrieved knowledge)"
        return "\n".join(
            f"[{i}] {hit.document.text}" for i, hit in enumerate(hits)
        )
