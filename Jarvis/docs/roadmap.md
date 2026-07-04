# Roadmap & Extension Points

The core in this repository is complete and tested. The subsystems below are
described in the original vision but require hardware access or heavy external
dependencies, so they are deliberately **not** shipped as fake stubs. Each has
a defined seam so it can be built without disturbing the core. This page is the
honest boundary between "runs today" and "designed, not yet built".

## Runs today (implemented & tested)

Config · LLM abstraction (Echo/Anthropic/OpenAI-family/Ollama) · prompt
templates · tool framework + filesystem/calculator/http/shell/system-info/
app-launch · working & long-term memory with RAG · Planner/Executor/Researcher/
Reflection/Memory agents · orchestrator reasoning loop with retries and
reflection · SDK facade · REST API · **JARVIS HUD web UI** (voice-reactive orb,
chat, reasoning trace, agent/memory status) · **voice I/O** (browser Web Speech
API) · **full-access computer control** (real shell + app-launch, token-gated
when remote). **63 passing tests, zero external dependencies.**

## Designed extension points (not yet built)

| Capability | Seam it plugs into | Interface to implement |
|-----------|--------------------|------------------------|
| **Voice** (STT, TTS) | The web UI | ✅ Shipped via the browser Web Speech API (speak to send, read replies aloud). Server-side STT/TTS or a wake word (e.g. Porcupine, Whisper) is the next iteration — feed transcribed text to `Jarvis.ask`, stream `provider.stream()` to a TTS backend. |
| **Vision** (OCR, screenshots, screen understanding) | New tools | `ScreenshotTool`, `OcrTool` subclassing `Tool` with a `vision.*` permission; return text the Executor consumes. |
| **Computer control** (shell, app-launch) | New tools | ✅ Shipped: real `shell` (pipes/`&&`/redirects), `system_info`, and `open_app`, gated by `full_access`. Mouse/keyboard/window automation (e.g. via `pyautogui`) plugs in as more `desktop.control` tools. |
| **Browser automation** | A tool wrapping Playwright | `BrowserTool.run` drives a page; Chromium is already available in supported environments. |
| **Desktop UI** (chat, agent monitor, task graph, token usage) | The SDK/REST surface | ✅ Shipped: the JARVIS HUD chat *and* a Mission Control dashboard (`/dashboard`) with agent monitor, token-usage & tool charts, the agent-swarm graph, and live logs. A native Electron shell is the natural next iteration on the same endpoints. |
| **Conversational front / voice persona** | An agent | ✅ Shipped: **Hermes** holds the dialogue, routes chit-chat vs. work, and speaks results. |
| **Observability** (metrics, tracing) | `jarvis.core.metrics` | ✅ Shipped: counters/gauges/timers with labels + a log buffer, exposed at `/metrics` and `/logs`. OpenTelemetry export is a drop-in behind the registry. |
| **Autonomous watchers** (folders, email, calendar, repos) | A scheduler loop | A `SchedulingAgent` polling a source and calling `Jarvis.ask` on triggers; each source is a tool. |
| **Knowledge graph** | Alongside the vector store | Add a `GraphMemory` next to the vector stores in `LongTermMemory`; `retrieve_all` merges results. |
| **Real embeddings / vector DB** | Behind existing interfaces | Implement `Embedder`; swap `VectorStore` for FAISS/Chroma/pgvector with the same `add`/`search`. |

## Why draw the line here

Shipping empty `pass`-body classes for voice and vision would inflate the file
count without adding capability, and would violate the project's own rule
against placeholders (`Never leave TODO placeholders`). Instead the core is
real and the boundaries are documented, so the next contributor knows exactly
where to build and against which interface.
