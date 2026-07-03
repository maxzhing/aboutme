"""A deterministic, offline provider.

``EchoProvider`` is the default backend. It needs no API key and no network,
which makes the entire JARVIS stack runnable and testable out of the box. It is
*not* a language model — it applies a few transparent rules so that agents and
the orchestrator produce structured, predictable output during development and
CI:

* If the last user message asks it to "plan", it emits a short numbered plan.
* If given a JSON instruction to echo, it returns that JSON.
* Otherwise it reflects the last user message with a small acknowledgement.

Because behaviour is deterministic, tests can assert on exact output.
"""

from __future__ import annotations

from jarvis.core.types import Role, Usage
from jarvis.llm.base import (
    CompletionRequest,
    CompletionResponse,
    LLMProvider,
    estimate_tokens,
)


class EchoProvider(LLMProvider):
    name = "echo"

    def complete(self, request: CompletionRequest) -> CompletionResponse:
        last_user = _last_user_text(request)
        text = self._respond(last_user)

        prompt_tokens = estimate_tokens(request.messages)
        completion_tokens = estimate_tokens(text)
        usage = Usage(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            cost_usd=0.0,  # offline model is free
        )
        return CompletionResponse(
            text=text,
            model=request.model,
            usage=usage,
            finish_reason="stop",
        )

    @staticmethod
    def _respond(user_text: str) -> str:
        lowered = user_text.lower()
        if "plan" in lowered:
            return (
                "1. Understand the request.\n"
                "2. Gather the needed information.\n"
                "3. Execute the necessary steps.\n"
                "4. Verify the result.\n"
                "5. Deliver the answer."
            )
        if lowered.startswith("echo:"):
            return user_text[len("echo:"):].strip()
        return f"Acknowledged: {user_text}" if user_text else "Acknowledged."


def _last_user_text(request: CompletionRequest) -> str:
    for message in reversed(request.messages):
        if message.role == Role.USER:
            return message.content
    return request.messages[-1].content if request.messages else ""
