"""The Memory agent: the write-side custodian of long-term memory.

Where the researcher *reads* memory, this agent *curates* it: storing salient
facts, recording episodes, and merging near-duplicates so the store stays
clean. Keeping curation in one agent means memory-write policy lives in a
single, testable place.
"""

from __future__ import annotations

from typing import Optional

from jarvis.agents.base import Agent, AgentConfig
from jarvis.agents.messages import AgentMessage
from jarvis.core.types import Confidence
from jarvis.llm.base import LLMProvider
from jarvis.memory.long_term import LongTermMemory


class MemoryAgent(Agent):
    def __init__(self, provider: LLMProvider, long_term: LongTermMemory, **kwargs) -> None:
        config = AgentConfig(
            name="memory",
            role="Curate long-term memory: store, record, and de-duplicate",
            prompt_name="reflection",  # reused; memory agent is action-driven
        )
        super().__init__(config, provider, long_term=long_term, **kwargs)

    def handle(self, message: AgentMessage) -> AgentMessage:
        action = message.payload.get("action", "store")
        text = message.content
        if action == "record_event":
            doc_id = self.long_term.episodic.record_event(text, **message.payload.get("meta", {}))
        elif action == "learn_skill":
            doc_id = self.long_term.procedural.learn_skill(
                message.payload.get("skill", "unnamed"),
                message.payload.get("steps", []),
            )
        else:  # default: store a semantic fact, unless a near-duplicate exists
            if self._is_duplicate(text):
                self.confidence = Confidence(0.6)
                return message.reply("Skipped near-duplicate fact", stored=False, confidence=float(self.confidence))
            doc_id = self.long_term.semantic.remember(text, **message.payload.get("meta", {}))

        self.confidence = Confidence(0.9)
        return message.reply("Stored", stored=True, doc_id=doc_id, confidence=float(self.confidence))

    def _is_duplicate(self, text: str, threshold: float = 0.97) -> bool:
        hits = self.long_term.semantic.retrieve(text, k=1, reinforce=False)
        return bool(hits and hits[0].relevance >= threshold)
