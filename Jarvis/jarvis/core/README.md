# `jarvis.core` — Shared primitives

The bottom layer everything else builds on. No dependencies on other
subsystems.

- **`types.py`** — value types: `Message`/`Role`, `Confidence` (clamped
  `[0,1]`), `Usage` (token/cost accounting), `ToolCall`, `Document`, plus
  `new_id` / `now_ts`.
- **`errors.py`** — the exception hierarchy rooted at `JarvisError`.
- **`logging.py`** — `get_logger(name)`; set `JARVIS_LOG_JSON=1` for
  line-delimited JSON logs. Extra kwargs (`extra={...}`) are merged into the
  record, so tools log latency and agents log confidence uniformly.
