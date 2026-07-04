"""Structured, JSON-capable logging for JARVIS.

The prompt requires that "everything is logged" — agents, tools, memory,
costs, latency, reasoning traces. Rather than scatter ``print`` calls, every
subsystem gets a logger from :func:`get_logger`. Setting the environment
variable ``JARVIS_LOG_JSON=1`` switches the output to line-delimited JSON,
which is what you want when shipping logs to a collector.
"""

from __future__ import annotations

import json
import logging
import os
import sys
from typing import Any

_CONFIGURED = False
_DEFAULT_LEVEL = os.environ.get("JARVIS_LOG_LEVEL", "INFO").upper()


class _JsonFormatter(logging.Formatter):
    """Render each record as a single JSON object.

    Any extra keyword arguments passed via ``logger.info(msg, extra={...})``
    are merged into the payload, so a tool can log ``latency_ms`` or an agent
    can log ``confidence`` without a bespoke format string.
    """

    _RESERVED = set(
        logging.LogRecord("", 0, "", 0, "", (), None).__dict__.keys()
    ) | {"message", "asctime"}

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        for key, value in record.__dict__.items():
            if key not in self._RESERVED and not key.startswith("_"):
                payload[key] = value
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def configure(level: str | None = None, json_output: bool | None = None) -> None:
    """Install a single root handler. Idempotent — safe to call repeatedly."""
    global _CONFIGURED
    root = logging.getLogger("jarvis")
    root.setLevel(level or _DEFAULT_LEVEL)
    root.handlers.clear()

    handler = logging.StreamHandler(sys.stderr)
    use_json = (
        json_output
        if json_output is not None
        else os.environ.get("JARVIS_LOG_JSON", "0") == "1"
    )
    if use_json:
        handler.setFormatter(_JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)-7s %(name)s | %(message)s")
        )
    root.addHandler(handler)
    root.addHandler(_MetricsBridge())  # mirror every record into the dashboard buffer
    root.propagate = False
    _CONFIGURED = True


class _MetricsBridge(logging.Handler):
    """Forward log records into the metrics ring buffer for the dashboard.

    Kept import-light: the metrics registry is imported lazily so ``logging``
    has no hard dependency on ``metrics`` (avoids an import cycle).
    """

    def emit(self, record: logging.LogRecord) -> None:
        try:
            from jarvis.core.metrics import METRICS

            fields = {
                k: v
                for k, v in record.__dict__.items()
                if k not in _JsonFormatter._RESERVED and not k.startswith("_")
            }
            source = record.name.replace("jarvis.", "", 1)
            METRICS.log(record.levelname, source, record.getMessage(), **fields)
        except Exception:  # never let logging break because of metrics
            pass


def get_logger(name: str) -> logging.Logger:
    """Return a namespaced logger, configuring the root handler on first use."""
    if not _CONFIGURED:
        configure()
    return logging.getLogger(f"jarvis.{name}")
