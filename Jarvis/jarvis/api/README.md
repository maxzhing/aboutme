# `jarvis.api` — SDK facade & REST server

- **`sdk.py`** — `Jarvis`, the one class most users touch. It wires config →
  provider → memory → tools → agents → orchestrator with sensible defaults and
  exposes `ask(goal)`, `remember(fact)`, and `status()`.
- **`server.py`** — a dependency-free REST server (`http.server`) over a
  `Jarvis` instance:
  - `GET /health`, `GET /status`
  - `POST /ask` `{"goal": ...}` → answer + trace + task summary
  - `POST /remember` `{"fact": ...}`

Run it: `jarvis-serve --host 0.0.0.0 --port 8080` (or `python -m
jarvis.api.server`). For production, front the same `Jarvis` object with
FastAPI/uvicorn — the handlers map one-to-one onto routes.
