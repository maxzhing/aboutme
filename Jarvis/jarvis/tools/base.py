"""The tool framework.

Every capability JARVIS can *act* with — filesystem, shell, HTTP, a
calculator, and anything a user plugs in — is a :class:`Tool`. A tool declares:

* ``name`` / ``description`` — how agents discover and choose it.
* an **input schema** — a light JSON-Schema-style dict validated before the
  tool runs, so bad arguments fail with a clear error rather than a crash.
* ``permission`` — a capability string the caller must have been granted.
* ``timeout`` / ``retries`` — reliability policy applied by :meth:`invoke`.

Authors implement :meth:`run`; the framework wraps it with validation,
permission checks, timeout, retry, and structured logging via :meth:`invoke`.
This keeps individual tools tiny and uniform.
"""

from __future__ import annotations

import abc
import time
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, Optional

from jarvis.core.errors import (
    ToolPermissionDenied,
    ToolTimeoutError,
    ToolValidationError,
)
from jarvis.core.logging import get_logger
from jarvis.core.types import new_id, now_ts

_log = get_logger("tools")

# Recognised JSON-schema-ish primitive names mapped to Python types.
_TYPES = {
    "string": str,
    "number": (int, float),
    "integer": int,
    "boolean": bool,
    "array": list,
    "object": dict,
}


@dataclass
class ToolResult:
    """Uniform result envelope returned by :meth:`Tool.invoke`."""

    tool: str
    ok: bool
    output: Any = None
    error: Optional[str] = None
    latency_ms: float = 0.0
    attempts: int = 1
    call_id: str = field(default_factory=lambda: new_id("call"))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tool": self.tool,
            "ok": self.ok,
            "output": self.output,
            "error": self.error,
            "latency_ms": round(self.latency_ms, 2),
            "attempts": self.attempts,
        }


@dataclass
class ToolContext:
    """Ambient, per-invocation context the framework passes to a tool.

    Holds the set of permissions granted for this run and a free-form ``state``
    dict tools may use for cross-call data (rarely needed, but explicit).
    """

    granted_permissions: frozenset[str] = frozenset()
    state: Dict[str, Any] = field(default_factory=dict)

    def has(self, permission: str) -> bool:
        return permission in self.granted_permissions


class Tool(abc.ABC):
    """Base class for all tools."""

    name: str = "tool"
    description: str = ""
    #: JSON-schema-style dict: ``{"field": {"type": "string", "required": True}}``.
    input_schema: Dict[str, Dict[str, Any]] = {}
    #: Capability required to run this tool. Empty string => no permission needed.
    permission: str = ""
    timeout_s: float = 30.0
    retries: int = 0

    @abc.abstractmethod
    def run(self, context: ToolContext, **kwargs: Any) -> Any:
        """Perform the tool's work and return its raw output.

        Implementations receive already-validated ``kwargs``. Raise any
        exception to signal failure; the framework converts it into a failed
        :class:`ToolResult` (after exhausting retries).
        """

    # ------------------------------------------------------------------ #
    # Framework machinery
    # ------------------------------------------------------------------ #

    def validate(self, kwargs: Dict[str, Any]) -> None:
        """Check ``kwargs`` against :attr:`input_schema`; raise on mismatch."""
        schema = self.input_schema or {}
        for field_name, spec in schema.items():
            required = spec.get("required", False)
            if field_name not in kwargs:
                if required:
                    raise ToolValidationError(
                        f"{self.name}: missing required argument {field_name!r}"
                    )
                continue
            expected = spec.get("type")
            if expected and expected in _TYPES:
                if not isinstance(kwargs[field_name], _TYPES[expected]):
                    raise ToolValidationError(
                        f"{self.name}: argument {field_name!r} must be {expected}"
                    )
        unknown = set(kwargs) - set(schema)
        if schema and unknown:
            raise ToolValidationError(
                f"{self.name}: unexpected arguments {sorted(unknown)}"
            )

    def invoke(self, context: ToolContext | None = None, **kwargs: Any) -> ToolResult:
        """Validate, authorize, and run with timeout + retry. Never raises for
        tool-level failures — returns a :class:`ToolResult` with ``ok=False``.
        Framework misuse (bad args, denied permission) still raises so callers
        catch programming errors early.
        """
        context = context or ToolContext()
        self.validate(kwargs)

        if self.permission and not context.has(self.permission):
            raise ToolPermissionDenied(
                f"{self.name}: requires permission {self.permission!r}"
            )

        attempts = 0
        started = now_ts()
        last_error: Optional[str] = None
        while attempts <= self.retries:
            attempts += 1
            call_started = time.perf_counter()
            try:
                output = self._run_with_timeout(context, kwargs)
                latency = (time.perf_counter() - call_started) * 1000
                _log.info(
                    "tool ok",
                    extra={"tool": self.name, "latency_ms": round(latency, 2),
                           "attempt": attempts},
                )
                return ToolResult(
                    tool=self.name,
                    ok=True,
                    output=output,
                    latency_ms=(now_ts() - started) * 1000,
                    attempts=attempts,
                )
            except ToolTimeoutError as exc:
                last_error = str(exc)
                _log.warning("tool timeout", extra={"tool": self.name, "attempt": attempts})
            except Exception as exc:  # noqa: BLE001 - tools may raise anything
                last_error = f"{type(exc).__name__}: {exc}"
                _log.warning(
                    "tool error",
                    extra={"tool": self.name, "attempt": attempts, "error": last_error},
                )
        return ToolResult(
            tool=self.name,
            ok=False,
            error=last_error,
            latency_ms=(now_ts() - started) * 1000,
            attempts=attempts,
        )

    def _run_with_timeout(self, context: ToolContext, kwargs: Dict[str, Any]) -> Any:
        """Run ``run`` under a wall-clock timeout.

        Uses a worker thread so a slow tool cannot hang the caller. Note the
        underlying work is not force-killed (Python can't safely do that); the
        timeout bounds how long we *wait*, which is what agents care about.
        """
        import threading

        result: Dict[str, Any] = {}

        def worker() -> None:
            try:
                result["value"] = self.run(context, **kwargs)
            except Exception as exc:  # noqa: BLE001
                result["error"] = exc

        thread = threading.Thread(target=worker, daemon=True, name=f"tool-{self.name}")
        thread.start()
        thread.join(self.timeout_s)
        if thread.is_alive():
            raise ToolTimeoutError(f"{self.name}: exceeded {self.timeout_s}s")
        if "error" in result:
            raise result["error"]
        return result.get("value")

    def spec(self) -> Dict[str, Any]:
        """Machine-readable description agents/LLMs use to decide when to call."""
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.input_schema,
            "permission": self.permission or None,
        }
