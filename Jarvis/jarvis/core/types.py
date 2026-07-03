"""Small, dependency-free value types shared across subsystems.

These are intentionally plain dataclasses rather than a heavier modelling
library so the core has *zero* third-party requirements and stays trivially
testable. Richer validation lives at the boundaries (tool schemas, config).
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


def new_id(prefix: str = "id") -> str:
    """Return a short, collision-resistant identifier with a readable prefix."""
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def now_ts() -> float:
    """Current wall-clock time as a float epoch. Wrapped so tests can patch it."""
    return time.time()


class Role(str, Enum):
    """Conversation roles, mirroring the common chat-completion vocabulary."""

    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


@dataclass
class Message:
    """A single turn in a conversation.

    ``name`` distinguishes multiple tools/agents that share the ``TOOL`` role.
    ``metadata`` carries provider- or agent-specific extras without polluting
    the core shape.
    """

    role: Role
    content: str
    name: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    id: str = field(default_factory=lambda: new_id("msg"))
    created_at: float = field(default_factory=now_ts)

    def to_dict(self) -> Dict[str, Any]:
        data: Dict[str, Any] = {"role": self.role.value, "content": self.content}
        if self.name:
            data["name"] = self.name
        return data


class Confidence(float):
    """A probability-like score in ``[0.0, 1.0]``.

    Subclassing ``float`` keeps arithmetic ergonomic while giving us a place to
    enforce the range and expose readable buckets used by the orchestrator when
    deciding whether to ask for clarification or retry.
    """

    def __new__(cls, value: float) -> "Confidence":
        clamped = max(0.0, min(1.0, float(value)))
        return super().__new__(cls, clamped)

    @property
    def is_low(self) -> bool:
        return self < 0.4

    @property
    def is_high(self) -> bool:
        return self >= 0.75


@dataclass
class Usage:
    """Token / cost accounting for a single LLM call."""

    prompt_tokens: int = 0
    completion_tokens: int = 0
    cost_usd: float = 0.0

    @property
    def total_tokens(self) -> int:
        return self.prompt_tokens + self.completion_tokens

    def __add__(self, other: "Usage") -> "Usage":
        return Usage(
            prompt_tokens=self.prompt_tokens + other.prompt_tokens,
            completion_tokens=self.completion_tokens + other.completion_tokens,
            cost_usd=self.cost_usd + other.cost_usd,
        )


@dataclass
class ToolCall:
    """A structured request from a model/agent to invoke a named tool."""

    tool: str
    arguments: Dict[str, Any] = field(default_factory=dict)
    id: str = field(default_factory=lambda: new_id("call"))


@dataclass
class Document:
    """A unit of retrievable knowledge stored in memory.

    ``score`` is populated by retrieval, not storage, and is therefore optional.
    """

    text: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    id: str = field(default_factory=lambda: new_id("doc"))
    created_at: float = field(default_factory=now_ts)
    score: Optional[float] = None


def messages_from_pairs(pairs: List[tuple]) -> List[Message]:
    """Convenience builder: ``[("user", "hi"), ("assistant", "yo")]`` → messages."""
    return [Message(role=Role(r), content=c) for r, c in pairs]
