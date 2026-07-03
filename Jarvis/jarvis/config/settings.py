"""Layered configuration for JARVIS.

Precedence, lowest to highest:

1. Built-in dataclass defaults (this file).
2. A YAML file (``defaults.yaml`` shipped here, or a user-supplied path).
3. Environment variables prefixed ``JARVIS_`` (e.g. ``JARVIS_LLM__PROVIDER``).

The double-underscore in an env var name is the nesting separator, so
``JARVIS_LLM__MODEL=claude-fable-5`` maps onto ``settings.llm.model``. YAML is
optional: if PyYAML is not installed we fall back to a tiny built-in parser
that handles the flat ``key: value`` subset our default file uses, so the core
never *requires* a third-party dependency.
"""

from __future__ import annotations

import os
from dataclasses import asdict, dataclass, field, fields, is_dataclass
from pathlib import Path
from typing import Any, Dict, Optional

from jarvis.core.errors import ConfigError

_ENV_PREFIX = "JARVIS_"
_NEST_SEP = "__"


@dataclass
class LLMConfig:
    provider: str = "echo"
    model: str = "echo-1"
    temperature: float = 0.7
    max_tokens: int = 1024
    timeout_s: float = 60.0
    api_key_env: str = ""  # name of the env var holding the key, not the key itself


@dataclass
class MemoryConfig:
    short_term_max_messages: int = 40
    vector_dim: int = 256
    decay_half_life_s: float = 7 * 24 * 3600.0  # one week
    persist_dir: str = ""  # empty => in-memory only


@dataclass
class OrchestratorConfig:
    max_retries: int = 2
    clarify_below_confidence: float = 0.4
    max_subtasks: int = 12
    parallelism: int = 4


@dataclass
class ToolsConfig:
    default_timeout_s: float = 30.0
    default_retries: int = 1
    # Root that filesystem tools are confined to. Empty => current working dir.
    workspace_dir: str = ""
    allow_shell: bool = False


@dataclass
class Settings:
    """Top-level settings tree."""

    llm: LLMConfig = field(default_factory=LLMConfig)
    memory: MemoryConfig = field(default_factory=MemoryConfig)
    orchestrator: OrchestratorConfig = field(default_factory=OrchestratorConfig)
    tools: ToolsConfig = field(default_factory=ToolsConfig)
    log_level: str = "INFO"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# --------------------------------------------------------------------------- #
# Loading helpers
# --------------------------------------------------------------------------- #

def _load_yaml(path: Path) -> Dict[str, Any]:
    try:
        import yaml  # type: ignore

        with path.open("r", encoding="utf-8") as fh:
            return yaml.safe_load(fh) or {}
    except ImportError:
        return _load_flat_yaml(path)


def _load_flat_yaml(path: Path) -> Dict[str, Any]:
    """Minimal YAML reader for the ``key: value`` / one-level-nested subset.

    Only used when PyYAML is unavailable. Supports two-space indentation for a
    single level of nesting, comments, and scalar values. This is deliberately
    limited — install PyYAML for anything richer.
    """
    result: Dict[str, Any] = {}
    current_section: Optional[str] = None
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.split("#", 1)[0].rstrip()
        if not line.strip():
            continue
        if not line.startswith(" "):
            key, _, value = line.partition(":")
            key = key.strip()
            value = value.strip()
            if value == "":
                result[key] = {}
                current_section = key
            else:
                result[key] = _coerce_scalar(value)
                current_section = None
        else:
            if current_section is None:
                raise ConfigError(f"Indented line without a section: {raw!r}")
            key, _, value = line.strip().partition(":")
            result[current_section][key.strip()] = _coerce_scalar(value.strip())
    return result


def _coerce_scalar(value: str) -> Any:
    if value.lower() in {"true", "false"}:
        return value.lower() == "true"
    if value.lower() in {"null", "none", "~", ""}:
        return None
    for cast in (int, float):
        try:
            return cast(value)
        except ValueError:
            continue
    return value.strip('"').strip("'")


def _apply_dict(target: Any, data: Dict[str, Any]) -> None:
    """Recursively overlay ``data`` onto a dataclass instance in place."""
    valid = {f.name: f for f in fields(target)}
    for key, value in data.items():
        if key not in valid:
            raise ConfigError(f"Unknown setting: {key!r}")
        current = getattr(target, key)
        if is_dataclass(current) and isinstance(value, dict):
            _apply_dict(current, value)
        else:
            setattr(target, key, _coerce_type(valid[key].type, current, value))


def _coerce_type(declared: Any, current: Any, value: Any) -> Any:
    """Best-effort coercion so env-var strings land as the right Python type."""
    if isinstance(current, bool):
        if isinstance(value, str):
            return value.strip().lower() in {"1", "true", "yes", "on"}
        return bool(value)
    if isinstance(current, int) and not isinstance(current, bool):
        return int(value)
    if isinstance(current, float):
        return float(value)
    return value


def _env_overlay() -> Dict[str, Any]:
    """Collect ``JARVIS_*`` env vars into a nested dict for :func:`_apply_dict`."""
    overlay: Dict[str, Any] = {}
    for name, value in os.environ.items():
        if not name.startswith(_ENV_PREFIX):
            continue
        path = name[len(_ENV_PREFIX):].lower().split(_NEST_SEP)
        cursor = overlay
        for part in path[:-1]:
            cursor = cursor.setdefault(part, {})
        cursor[path[-1]] = value
    return overlay


def load_settings(
    yaml_path: Optional[str | Path] = None,
    *,
    use_env: bool = True,
) -> Settings:
    """Build a :class:`Settings` from defaults, YAML, and environment overrides.

    ``yaml_path`` defaults to the ``defaults.yaml`` shipped alongside this
    module. Pass ``use_env=False`` in tests that must not be affected by the
    ambient environment.
    """
    settings = Settings()

    path = Path(yaml_path) if yaml_path else Path(__file__).with_name("defaults.yaml")
    if path.exists():
        _apply_dict(settings, _load_yaml(path))

    if use_env:
        env = _env_overlay()
        # ``log_level`` may be set as a top-level env var without nesting.
        _apply_dict(settings, env)

    return settings
