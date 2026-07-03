"""Core primitives: shared types, structured logging, and the error hierarchy."""

from jarvis.core import errors, types
from jarvis.core.logging import configure, get_logger
from jarvis.core.types import (
    Confidence,
    Document,
    Message,
    Role,
    ToolCall,
    Usage,
    new_id,
    now_ts,
)

__all__ = [
    "errors",
    "types",
    "configure",
    "get_logger",
    "Confidence",
    "Document",
    "Message",
    "Role",
    "ToolCall",
    "Usage",
    "new_id",
    "now_ts",
]
