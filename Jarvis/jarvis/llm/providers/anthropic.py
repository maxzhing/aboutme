"""Anthropic (Claude) provider.

The ``anthropic`` SDK and an API key are only required if this provider is
actually selected — the import is deferred into ``__init__`` so importing the
module never fails on a machine without the dependency. ``is_available`` lets
the registry give a clear error instead of a stack trace.
"""

from __future__ import annotations

import os
from typing import Iterator, List

from jarvis.core.errors import LLMProviderNotAvailable
from jarvis.core.types import Role, Usage
from jarvis.llm.base import CompletionRequest, CompletionResponse, LLMProvider

# Published per-million-token prices; override via constructor if they change.
_DEFAULT_PRICES = {
    "input_per_mtok": 3.0,
    "output_per_mtok": 15.0,
}


class AnthropicProvider(LLMProvider):
    name = "anthropic"

    def __init__(
        self,
        model: str = "claude-fable-5",
        *,
        api_key_env: str = "ANTHROPIC_API_KEY",
        prices: dict | None = None,
        **options: object,
    ) -> None:
        super().__init__(model, **options)
        self.api_key_env = api_key_env
        self.prices = {**_DEFAULT_PRICES, **(prices or {})}
        self._client = None

    def _ensure_client(self):
        if self._client is not None:
            return self._client
        try:
            import anthropic  # type: ignore
        except ImportError as exc:  # pragma: no cover - depends on env
            raise LLMProviderNotAvailable(
                "The 'anthropic' package is not installed. "
                "Run: pip install anthropic"
            ) from exc
        api_key = os.environ.get(self.api_key_env)
        if not api_key:
            raise LLMProviderNotAvailable(
                f"Environment variable {self.api_key_env} is not set."
            )
        self._client = anthropic.Anthropic(api_key=api_key)
        return self._client

    def is_available(self) -> bool:
        try:
            import anthropic  # type: ignore  # noqa: F401
        except ImportError:
            return False
        return bool(os.environ.get(self.api_key_env))

    def _split_system(self, request: CompletionRequest):
        system_parts: List[str] = []
        turns = []
        for message in request.messages:
            if message.role == Role.SYSTEM:
                system_parts.append(message.content)
            else:
                role = "user" if message.role == Role.USER else "assistant"
                turns.append({"role": role, "content": message.content})
        return "\n\n".join(system_parts), turns

    def complete(self, request: CompletionRequest) -> CompletionResponse:
        client = self._ensure_client()
        system, turns = self._split_system(request)
        response = client.messages.create(
            model=request.model,
            system=system or None,
            messages=turns,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            stop_sequences=list(request.stop) if request.stop else None,
        )
        text = "".join(
            block.text for block in response.content if getattr(block, "type", "") == "text"
        )
        usage = self._usage(response)
        return CompletionResponse(
            text=text,
            model=request.model,
            usage=usage,
            finish_reason=getattr(response, "stop_reason", "stop") or "stop",
            raw=response,
        )

    def stream(self, request: CompletionRequest) -> Iterator[str]:
        client = self._ensure_client()
        system, turns = self._split_system(request)
        with client.messages.stream(
            model=request.model,
            system=system or None,
            messages=turns,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
        ) as stream:
            yield from stream.text_stream

    def _usage(self, response) -> Usage:
        raw = getattr(response, "usage", None)
        prompt = getattr(raw, "input_tokens", 0) if raw else 0
        completion = getattr(raw, "output_tokens", 0) if raw else 0
        cost = (
            prompt / 1_000_000 * self.prices["input_per_mtok"]
            + completion / 1_000_000 * self.prices["output_per_mtok"]
        )
        return Usage(prompt_tokens=prompt, completion_tokens=completion, cost_usd=cost)
