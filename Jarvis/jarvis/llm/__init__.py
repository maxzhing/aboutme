"""Model-agnostic LLM layer.

Typical use::

    from jarvis.config import load_settings
    from jarvis.llm import build_provider

    provider = build_provider(load_settings().llm)
    print(provider.chat([Message(Role.USER, "echo: hi")]).text)
"""

from jarvis.llm.base import (
    CompletionRequest,
    CompletionResponse,
    LLMProvider,
    estimate_tokens,
)
from jarvis.llm.registry import (
    available_providers,
    build_provider,
    register_provider,
)

__all__ = [
    "CompletionRequest",
    "CompletionResponse",
    "LLMProvider",
    "estimate_tokens",
    "available_providers",
    "build_provider",
    "register_provider",
]
