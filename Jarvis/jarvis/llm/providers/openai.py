"""OpenAI-compatible provider.

Works with OpenAI itself and with any API that speaks the same
``/chat/completions`` shape (OpenRouter, DeepSeek, Mistral's OpenAI endpoint,
local servers) by passing a ``base_url``. Dependencies are imported lazily.
"""

from __future__ import annotations

import os
from typing import Iterator, List

from jarvis.core.errors import LLMProviderNotAvailable
from jarvis.core.types import Usage
from jarvis.llm.base import CompletionRequest, CompletionResponse, LLMProvider

_DEFAULT_PRICES = {"input_per_mtok": 0.5, "output_per_mtok": 1.5}


class OpenAIProvider(LLMProvider):
    name = "openai"

    def __init__(
        self,
        model: str = "gpt-4o-mini",
        *,
        api_key_env: str = "OPENAI_API_KEY",
        base_url: str | None = None,
        prices: dict | None = None,
        **options: object,
    ) -> None:
        super().__init__(model, **options)
        self.api_key_env = api_key_env
        self.base_url = base_url
        self.prices = {**_DEFAULT_PRICES, **(prices or {})}
        self._client = None

    def _ensure_client(self):
        if self._client is not None:
            return self._client
        try:
            import openai  # type: ignore
        except ImportError as exc:  # pragma: no cover
            raise LLMProviderNotAvailable(
                "The 'openai' package is not installed. Run: pip install openai"
            ) from exc
        api_key = os.environ.get(self.api_key_env)
        if not api_key:
            raise LLMProviderNotAvailable(
                f"Environment variable {self.api_key_env} is not set."
            )
        self._client = openai.OpenAI(api_key=api_key, base_url=self.base_url)
        return self._client

    def is_available(self) -> bool:
        try:
            import openai  # type: ignore  # noqa: F401
        except ImportError:
            return False
        return bool(os.environ.get(self.api_key_env))

    def complete(self, request: CompletionRequest) -> CompletionResponse:
        client = self._ensure_client()
        response = client.chat.completions.create(
            model=request.model,
            messages=[m.to_dict() for m in request.messages],
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            stop=list(request.stop) if request.stop else None,
        )
        choice = response.choices[0]
        usage = self._usage(response)
        return CompletionResponse(
            text=choice.message.content or "",
            model=request.model,
            usage=usage,
            finish_reason=choice.finish_reason or "stop",
            raw=response,
        )

    def stream(self, request: CompletionRequest) -> Iterator[str]:
        client = self._ensure_client()
        stream = client.chat.completions.create(
            model=request.model,
            messages=[m.to_dict() for m in request.messages],
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    def _usage(self, response) -> Usage:
        raw = getattr(response, "usage", None)
        prompt = getattr(raw, "prompt_tokens", 0) if raw else 0
        completion = getattr(raw, "completion_tokens", 0) if raw else 0
        cost = (
            prompt / 1_000_000 * self.prices["input_per_mtok"]
            + completion / 1_000_000 * self.prices["output_per_mtok"]
        )
        return Usage(prompt_tokens=prompt, completion_tokens=completion, cost_usd=cost)
