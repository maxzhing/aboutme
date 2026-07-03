"""The provider-agnostic language-model interface.

Nothing in JARVIS should ever import ``anthropic`` or ``openai`` directly.
Instead everything talks to :class:`LLMProvider`, and a concrete provider is
selected purely from configuration. This is what lets the same agent code run
against Claude, GPT, Gemini, a local Ollama model, or the offline
:class:`~jarvis.llm.providers.echo.EchoProvider` used in tests.
"""

from __future__ import annotations

import abc
from dataclasses import dataclass, field
from typing import Iterable, Iterator, List, Optional, Sequence

from jarvis.core.types import Message, Usage


@dataclass
class CompletionRequest:
    """Everything a provider needs to produce a completion.

    Kept separate from the provider so requests can be logged, cached, or
    replayed. ``stop`` and ``metadata`` are optional passthroughs.
    """

    messages: Sequence[Message]
    model: str
    temperature: float = 0.7
    max_tokens: int = 1024
    stop: Optional[Sequence[str]] = None
    metadata: dict = field(default_factory=dict)


@dataclass
class CompletionResponse:
    """A provider's answer, plus accounting the orchestrator uses for budgets."""

    text: str
    model: str
    usage: Usage = field(default_factory=Usage)
    finish_reason: str = "stop"
    raw: Optional[object] = None  # provider-native object, for debugging only


class LLMProvider(abc.ABC):
    """Base class every model backend implements.

    Subclasses must implement :meth:`complete`. Streaming has a default
    implementation that yields the full text once, so a provider only overrides
    :meth:`stream` if it supports true incremental output.
    """

    #: Human-readable provider key used in configuration, e.g. ``"anthropic"``.
    name: str = "base"

    def __init__(self, model: str, **options: object) -> None:
        self.model = model
        self.options = options

    @abc.abstractmethod
    def complete(self, request: CompletionRequest) -> CompletionResponse:
        """Return a single completion for ``request``. Must be implemented."""

    def stream(self, request: CompletionRequest) -> Iterator[str]:
        """Yield the completion incrementally.

        Default: fall back to a non-streaming ``complete`` and emit the whole
        string once. Providers with native streaming override this.
        """
        yield self.complete(request).text

    def is_available(self) -> bool:
        """Whether this provider can actually run (deps present, key set).

        The base implementation returns ``True``; network-backed providers
        override it so the registry can fail fast with a clear message.
        """
        return True

    # Convenience --------------------------------------------------------- #

    def chat(
        self,
        messages: Iterable[Message],
        *,
        temperature: float = 0.7,
        max_tokens: int = 1024,
        stop: Optional[Sequence[str]] = None,
    ) -> CompletionResponse:
        """Ergonomic wrapper around :meth:`complete` for ad-hoc calls."""
        request = CompletionRequest(
            messages=list(messages),
            model=self.model,
            temperature=temperature,
            max_tokens=max_tokens,
            stop=stop,
        )
        return self.complete(request)

    def __repr__(self) -> str:  # pragma: no cover - trivial
        return f"<{type(self).__name__} name={self.name!r} model={self.model!r}>"


def estimate_tokens(messages: Sequence[Message] | str) -> int:
    """Rough token estimate used for budgeting when a provider omits usage.

    Uses the well-known ~4-characters-per-token heuristic. Good enough for
    cost guards; not a substitute for a real tokenizer.
    """
    if isinstance(messages, str):
        text = messages
    else:
        text = "\n".join(m.content for m in messages)
    return max(1, len(text) // 4)
