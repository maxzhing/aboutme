"""Exception hierarchy shared across every JARVIS subsystem.

Keeping all errors in one small module means callers can catch a broad
``JarvisError`` at process boundaries while still being able to react to
specific failures (a missing tool, a provider timeout) closer to the source.
"""

from __future__ import annotations


class JarvisError(Exception):
    """Base class for every error raised inside JARVIS."""


class ConfigError(JarvisError):
    """Raised when configuration is missing or invalid."""


class LLMError(JarvisError):
    """Base class for language-model provider failures."""


class LLMTimeoutError(LLMError):
    """Raised when a provider does not respond within its deadline."""


class LLMProviderNotAvailable(LLMError):
    """Raised when a provider is requested but its dependencies/keys are absent."""


class ToolError(JarvisError):
    """Base class for tool-execution failures."""


class ToolNotFound(ToolError):
    """Raised when a tool name cannot be resolved in the registry."""


class ToolPermissionDenied(ToolError):
    """Raised when a tool is invoked without the required permission grant."""


class ToolValidationError(ToolError):
    """Raised when tool arguments do not satisfy the declared input schema."""


class ToolTimeoutError(ToolError):
    """Raised when a tool exceeds its configured timeout."""


class MemoryError(JarvisError):
    """Base class for memory-subsystem failures."""


class AgentError(JarvisError):
    """Base class for agent failures."""


class OrchestratorError(JarvisError):
    """Raised when task decomposition or coordination fails."""
