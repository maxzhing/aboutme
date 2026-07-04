# `jarvis.core` — Shared primitives

The bottom layer everything else builds on. No dependencies on other
subsystems.

- **`types.py`** — value types: `Message`/`Role`, `Confidence` (clamped
  `[0,1]`), `Usage` (token/cost accounting), `ToolCall`, `Document`, plus
  `new_id` / `now_ts`.
- **`errors.py`** — the exception hierarchy rooted at `JarvisError`.
- **`logging.py`** — `get_logger(name)`; set `JARVIS_LOG_JSON=1` for
  line-delimited JSON logs. Extra kwargs (`extra={...}`) are merged into the
  record, so tools log latency and agents log confidence uniformly. Every
  record is also mirrored into the metrics log buffer for the dashboard.
- **`metrics.py`** — `MetricsRegistry` (thread-safe counters, gauges, timers
  with labels + a bounded event log) and the process-wide `METRICS` instance.
  Agents record token/cost/latency/call counts here; the server exposes it at
  `/metrics` and `/logs`. OpenTelemetry-shaped, so it can be swapped for a real
  exporter behind the same interface.
