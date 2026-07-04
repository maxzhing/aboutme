"""Lightweight, in-process observability: metrics + a log ring buffer.

This is the data behind the dashboard and satisfies the spec's "everything
logged — costs, latency, token usage, reasoning traces" requirement without
pulling in a metrics backend. The design is deliberately OpenTelemetry-shaped
(counters, gauges, timers with labels) so it can later be swapped for a real
exporter behind the same :class:`MetricsRegistry` interface.

A single process-wide :data:`METRICS` registry is the default sink; tests and
embedders can construct their own isolated registry instead.
"""

from __future__ import annotations

import threading
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Deque, Dict, List, Optional, Tuple


@dataclass
class Event:
    """One structured record kept in the rolling log buffer."""

    ts: float
    level: str
    source: str
    message: str
    fields: Dict[str, object] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "ts": self.ts,
            "level": self.level,
            "source": self.source,
            "message": self.message,
            **self.fields,
        }


class MetricsRegistry:
    """Thread-safe counters, gauges, timers, and a bounded event log.

    Labels are folded into the metric key as ``name{label=value,...}`` so the
    dashboard can group by, e.g., agent name or tool name without a full
    dimensional store.
    """

    def __init__(self, log_capacity: int = 500) -> None:
        self._lock = threading.Lock()
        self._counters: Dict[str, float] = {}
        self._gauges: Dict[str, float] = {}
        self._timers: Dict[str, List[float]] = {}
        self._events: Deque[Event] = deque(maxlen=log_capacity)
        self._started = time.time()

    # -- metric primitives ------------------------------------------------ #

    @staticmethod
    def _key(name: str, labels: Optional[Dict[str, str]]) -> str:
        if not labels:
            return name
        inner = ",".join(f"{k}={v}" for k, v in sorted(labels.items()))
        return f"{name}{{{inner}}}"

    def incr(self, name: str, value: float = 1.0, **labels: str) -> None:
        key = self._key(name, labels)
        with self._lock:
            self._counters[key] = self._counters.get(key, 0.0) + value

    def gauge(self, name: str, value: float, **labels: str) -> None:
        with self._lock:
            self._gauges[self._key(name, labels)] = value

    def observe(self, name: str, millis: float, **labels: str) -> None:
        """Record a latency sample (milliseconds) for a timer series."""
        key = self._key(name, labels)
        with self._lock:
            self._timers.setdefault(key, []).append(millis)

    def timer(self, name: str, **labels: str) -> "_Timer":
        """Context manager that observes wall-clock duration on exit."""
        return _Timer(self, name, labels)

    # -- log buffer ------------------------------------------------------- #

    def log(self, level: str, source: str, message: str, **fields: object) -> None:
        with self._lock:
            self._events.append(
                Event(time.time(), level.upper(), source, message, dict(fields))
            )

    def recent_events(self, limit: int = 100, level: Optional[str] = None) -> List[dict]:
        with self._lock:
            events = list(self._events)
        if level:
            events = [e for e in events if e.level == level.upper()]
        return [e.to_dict() for e in events[-limit:]]

    # -- snapshots -------------------------------------------------------- #

    def _timer_summary(self) -> Dict[str, dict]:
        summary: Dict[str, dict] = {}
        for key, samples in self._timers.items():
            if not samples:
                continue
            ordered = sorted(samples)
            summary[key] = {
                "count": len(ordered),
                "avg_ms": round(sum(ordered) / len(ordered), 2),
                "p50_ms": round(ordered[len(ordered) // 2], 2),
                "p95_ms": round(ordered[min(len(ordered) - 1, int(len(ordered) * 0.95))], 2),
                "max_ms": round(ordered[-1], 2),
            }
        return summary

    def snapshot(self) -> dict:
        """A JSON-serializable view of every metric, for the dashboard."""
        with self._lock:
            return {
                "uptime_s": round(time.time() - self._started, 1),
                "counters": dict(self._counters),
                "gauges": dict(self._gauges),
                "timers": self._timer_summary(),
            }

    def reset(self) -> None:
        with self._lock:
            self._counters.clear()
            self._gauges.clear()
            self._timers.clear()
            self._events.clear()
            self._started = time.time()


class _Timer:
    def __init__(self, registry: MetricsRegistry, name: str, labels: Dict[str, str]) -> None:
        self._registry = registry
        self._name = name
        self._labels = labels
        self._start = 0.0

    def __enter__(self) -> "_Timer":
        self._start = time.perf_counter()
        return self

    def __exit__(self, *exc) -> None:
        self._registry.observe(
            self._name, (time.perf_counter() - self._start) * 1000, **self._labels
        )


#: Process-wide default registry. Import and use directly for convenience.
METRICS = MetricsRegistry()
