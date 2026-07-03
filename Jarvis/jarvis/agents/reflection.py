"""The Reflection agent: self-evaluates a completed task and records lessons.

This is the engine behind the "self reflection / self improvement" goals. After
a task, it scores quality, extracts reusable lessons, and (when long-term
memory is present) writes those lessons into procedural memory so future
planning benefits. It parses the LLM's JSON defensively and always returns a
usable structure even if the model's output is imperfect.
"""

from __future__ import annotations

import json
import re
from typing import Any, Dict

from jarvis.agents.base import Agent, AgentConfig
from jarvis.agents.messages import AgentMessage
from jarvis.core.types import Confidence
from jarvis.llm.base import LLMProvider

_JSON_RE = re.compile(r"\{.*\}", re.DOTALL)


class ReflectionAgent(Agent):
    def __init__(self, provider: LLMProvider, long_term=None, **kwargs) -> None:
        config = AgentConfig(
            name="reflection",
            role="Evaluate outcomes and capture lessons learned",
            prompt_name="reflection",
        )
        super().__init__(config, provider, long_term=long_term, **kwargs)

    def handle(self, message: AgentMessage) -> AgentMessage:
        goal = message.payload.get("goal", message.content)
        result = message.payload.get("result", "")
        trace = message.payload.get("trace", "")

        system = self.render_prompt(goal=goal, result=result, trace=trace)
        raw = self.ask_llm(system, "Evaluate the task.", temperature=0.2)
        report = self._parse(raw)

        # Persist lessons so the system genuinely improves over time.
        if self.long_term is not None and report.get("lessons"):
            for lesson in report["lessons"]:
                self.long_term.procedural.remember(lesson, source="reflection", goal=goal)

        self.confidence = Confidence(float(report.get("quality", 0.5)))
        return message.reply(
            raw,
            report=report,
            quality=report.get("quality", 0.5),
        )

    @staticmethod
    def _parse(text: str) -> Dict[str, Any]:
        """Extract the JSON object; degrade gracefully to a default report."""
        default = {"quality": 0.5, "issues": [], "lessons": [], "followups": []}
        match = _JSON_RE.search(text)
        if not match:
            return default
        try:
            parsed = json.loads(match.group(0))
        except json.JSONDecodeError:
            return default
        return {**default, **{k: parsed[k] for k in default if k in parsed}}
