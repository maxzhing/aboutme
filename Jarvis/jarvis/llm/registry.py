"""Provider registry and configuration-driven construction.

Callers ask for a provider by name (from config); the registry constructs it.
New backends register themselves with :func:`register_provider`, so adding
"gemini" or a future API is a one-file change with no edits to the core.
"""

from __future__ import annotations

from typing import Callable, Dict, Type

from jarvis.config.settings import LLMConfig
from jarvis.core.errors import LLMProviderNotAvailable
from jarvis.core.logging import get_logger
from jarvis.llm.base import LLMProvider
from jarvis.llm.providers.anthropic import AnthropicProvider
from jarvis.llm.providers.echo import EchoProvider
from jarvis.llm.providers.ollama import OllamaProvider
from jarvis.llm.providers.openai import OpenAIProvider

_log = get_logger("llm.registry")

# Factories receive the resolved LLMConfig and return a ready provider.
ProviderFactory = Callable[[LLMConfig], LLMProvider]

_REGISTRY: Dict[str, ProviderFactory] = {}


def register_provider(name: str, factory: ProviderFactory) -> None:
    """Register (or replace) a provider factory under ``name``."""
    _REGISTRY[name] = factory
    _log.debug("registered provider", extra={"provider": name})


def available_providers() -> list[str]:
    return sorted(_REGISTRY)


def build_provider(config: LLMConfig) -> LLMProvider:
    """Construct the provider named in ``config`` and verify it can run."""
    if config.provider not in _REGISTRY:
        raise LLMProviderNotAvailable(
            f"Unknown LLM provider {config.provider!r}. "
            f"Known: {', '.join(available_providers())}"
        )
    provider = _REGISTRY[config.provider](config)
    if not provider.is_available():
        raise LLMProviderNotAvailable(
            f"Provider {config.provider!r} is registered but not usable "
            "(missing dependency, API key, or local server)."
        )
    _log.info(
        "llm provider ready",
        extra={"provider": provider.name, "model": provider.model},
    )
    return provider


def _register_builtins() -> None:
    register_provider("echo", lambda c: EchoProvider(model=c.model))
    register_provider(
        "anthropic",
        lambda c: AnthropicProvider(
            model=c.model,
            api_key_env=c.api_key_env or "ANTHROPIC_API_KEY",
        ),
    )
    register_provider(
        "openai",
        lambda c: OpenAIProvider(
            model=c.model,
            api_key_env=c.api_key_env or "OPENAI_API_KEY",
        ),
    )
    # OpenRouter, DeepSeek and Mistral all speak the OpenAI wire format; they are
    # the same adapter with a different base_url and key env var.
    register_provider(
        "openrouter",
        lambda c: OpenAIProvider(
            model=c.model,
            api_key_env=c.api_key_env or "OPENROUTER_API_KEY",
            base_url="https://openrouter.ai/api/v1",
        ),
    )
    register_provider(
        "deepseek",
        lambda c: OpenAIProvider(
            model=c.model,
            api_key_env=c.api_key_env or "DEEPSEEK_API_KEY",
            base_url="https://api.deepseek.com",
        ),
    )
    register_provider(
        "mistral",
        lambda c: OpenAIProvider(
            model=c.model,
            api_key_env=c.api_key_env or "MISTRAL_API_KEY",
            base_url="https://api.mistral.ai/v1",
        ),
    )
    register_provider("ollama", lambda c: OllamaProvider(model=c.model))


_register_builtins()
