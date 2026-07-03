"""Structured messages agents exchange through the orchestrator.

Agents never call each other directly; they pass :class:`AgentMessage`
envelopes. Keeping the wire format explicit makes coordination inspectable and
lets the orchestrator log, route, and audit every hand-off — the backbone of
the Hermes-style multi-agent design.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, Optional

from jarvis.core.types import new_id, now_ts


class MessageKind(str, Enum):
    REQUEST = "request"      # "do this task"
    RESULT = "result"        # "here is the outcome"
    CLARIFY = "clarify"      # "I need more information"
    ERROR = "error"          # "I failed, here's why"


@dataclass
class AgentMessage:
    sender: str
    recipient: str
    kind: MessageKind
    content: str
    payload: Dict[str, Any] = field(default_factory=dict)
    confidence: float = 1.0
    id: str = field(default_factory=lambda: new_id("amsg"))
    created_at: float = field(default_factory=now_ts)

    def reply(
        self,
        content: str,
        kind: MessageKind = MessageKind.RESULT,
        *,
        confidence: Optional[float] = None,
        **payload: Any,
    ) -> "AgentMessage":
        """Build a response addressed back to this message's sender.

        ``confidence`` sets the envelope's field directly. If omitted it is
        taken from a ``confidence`` key in ``payload`` (a common convenience),
        so the message field always reflects the responder's true confidence.
        """
        resolved = confidence
        if resolved is None and "confidence" in payload:
            resolved = float(payload["confidence"])
        return AgentMessage(
            sender=self.recipient,
            recipient=self.sender,
            kind=kind,
            content=content,
            payload=payload,
            confidence=resolved if resolved is not None else 1.0,
        )
