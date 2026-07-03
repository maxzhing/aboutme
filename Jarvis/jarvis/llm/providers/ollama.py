"""Ollama provider for locally-hosted open models.

Talks to a local Ollama daemon over HTTP using only the standard library, so
no extra Python package is needed — just a running ``ollama`` server. This is
the path for fully offline/self-hosted operation (Llama, Mistral, DeepSeek,
Qwen, etc.).
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Iterator

from jarvis.core.errors import LLMError, LLMProviderNotAvailable
from jarvis.core.types import Usage
from jarvis.llm.base import CompletionRequest, CompletionResponse, LLMProvider


class OllamaProvider(LLMProvider):
    name = "ollama"

    def __init__(
        self,
        model: str = "llama3",
        *,
        host: str = "http://localhost:11434",
        **options: object,
    ) -> None:
        super().__init__(model, **options)
        self.host = host.rstrip("/")

    def is_available(self) -> bool:
        try:
            with urllib.request.urlopen(f"{self.host}/api/tags", timeout=2) as resp:
                return resp.status == 200
        except Exception:
            return False

    def complete(self, request: CompletionRequest) -> CompletionResponse:
        payload = {
            "model": request.model,
            "messages": [m.to_dict() for m in request.messages],
            "stream": False,
            "options": {
                "temperature": request.temperature,
                "num_predict": request.max_tokens,
            },
        }
        data = self._post("/api/chat", payload)
        text = data.get("message", {}).get("content", "")
        usage = Usage(
            prompt_tokens=data.get("prompt_eval_count", 0),
            completion_tokens=data.get("eval_count", 0),
            cost_usd=0.0,  # local inference is free
        )
        return CompletionResponse(
            text=text,
            model=request.model,
            usage=usage,
            finish_reason=data.get("done_reason", "stop"),
            raw=data,
        )

    def stream(self, request: CompletionRequest) -> Iterator[str]:
        payload = {
            "model": request.model,
            "messages": [m.to_dict() for m in request.messages],
            "stream": True,
            "options": {"temperature": request.temperature},
        }
        req = urllib.request.Request(
            f"{self.host}/api/chat",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=self.options.get("timeout", 120)) as resp:
                for line in resp:
                    if not line.strip():
                        continue
                    chunk = json.loads(line)
                    piece = chunk.get("message", {}).get("content", "")
                    if piece:
                        yield piece
        except urllib.error.URLError as exc:  # pragma: no cover - network
            raise LLMProviderNotAvailable(f"Cannot reach Ollama at {self.host}") from exc

    def _post(self, path: str, payload: dict) -> dict:
        req = urllib.request.Request(
            f"{self.host}{path}",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=self.options.get("timeout", 120)) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.URLError as exc:  # pragma: no cover - network
            raise LLMProviderNotAvailable(f"Cannot reach Ollama at {self.host}") from exc
        except json.JSONDecodeError as exc:  # pragma: no cover
            raise LLMError("Malformed response from Ollama") from exc
