"""The Planner agent: turns a goal into an ordered list of steps."""

from __future__ import annotations

import re
from typing import List

from jarvis.agents.base import Agent, AgentConfig
from jarvis.agents.messages import AgentMessage, MessageKind
from jarvis.core.types import Confidence
from jarvis.llm.base import LLMProvider

_STEP_RE = re.compile(r"^\s*\d+[.)]\s*(.+)$")


class PlannerAgent(Agent):
    def __init__(self, provider: LLMProvider, **kwargs) -> None:
        config = AgentConfig(
            name="planner",
            role="Decompose goals into minimal ordered plans",
            prompt_name="planner",
            objectives=("produce the smallest correct plan", "flag ambiguity early"),
        )
        super().__init__(config, provider, **kwargs)

    def handle(self, message: AgentMessage) -> AgentMessage:
        goal = message.content
        context = message.payload.get("context", "(none)")
        system = self.render_prompt(goal=goal, context=context)
        raw = self.ask_llm(system, goal, temperature=0.3)
        steps = self.parse_steps(raw)

        needs_clarification = any(s.upper().startswith("CLARIFY:") for s in steps)
        # Confidence drops if we produced no steps or asked to clarify.
        if not steps:
            self.confidence = Confidence(0.2)
        elif needs_clarification:
            self.confidence = Confidence(0.35)
        else:
            self.confidence = Confidence(0.85)

        kind = MessageKind.CLARIFY if needs_clarification else MessageKind.RESULT
        return message.reply(
            content=raw,
            kind=kind,
            steps=steps,
            confidence=float(self.confidence),
        )

    @staticmethod
    def parse_steps(text: str) -> List[str]:
        """Extract numbered steps; fall back to non-empty lines."""
        steps = []
        for line in text.splitlines():
            match = _STEP_RE.match(line)
            if match:
                steps.append(match.group(1).strip())
        if not steps:
            steps = [ln.strip("-* ").strip() for ln in text.splitlines() if ln.strip()]
        return steps
