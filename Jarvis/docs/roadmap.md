# Roadmap & Extension Points

The core in this repository is complete and tested. The subsystems below are
described in the original vision but require hardware access or heavy external
dependencies, so they are deliberately **not** shipped as fake stubs. Each has
a defined seam so it can be built without disturbing the core. This page is the
honest boundary between "runs today" and "designed, not yet built".

## Runs today (implemented & tested)

Config · LLM abstraction (Echo/Anthropic/OpenAI-family/Ollama) · prompt
templates · tool framework + filesystem/calculator/http/shell · working &
long-term memory with RAG · Planner/Executor/Researcher/Reflection/Memory
agents · orchestrator reasoning loop with retries and reflection · SDK facade ·
REST API · **web chat UI** (responsive, theme-aware, self-contained; chat +
reasoning trace + agent/memory status + remember). **54 passing tests, zero
external dependencies.**

## Designed extension points (not yet built)

| Capability | Seam it plugs into | Interface to implement |
|-----------|--------------------|------------------------|
| **Voice** (wake word, STT, TTS, streaming) | A `VoiceAgent` + frontend | Feed transcribed text to `Jarvis.ask`; stream `provider.stream()` output to a TTS backend. No core change. |
| **Vision** (OCR, screenshots, screen understanding) | New tools | `ScreenshotTool`, `OcrTool` subclassing `Tool` with a `vision.*` permission; return text the Executor consumes. |
| **Computer control** (mouse/keyboard/windows) | New tools | `ClickTool`, `TypeTool`, etc., gated behind a `desktop.control` permission; disabled by default like the shell tool. |
| **Browser automation** | A tool wrapping Playwright | `BrowserTool.run` drives a page; Chromium is already available in supported environments. |
| **Desktop UI** (chat, agent monitor, task graph, token usage) | The SDK/REST surface | ✅ A responsive web chat UI now ships in `jarvis.ui` (chat, reasoning trace, agent health, memory stats). A richer task-graph/token-usage dashboard or native Electron shell is the natural next iteration on the same endpoints. |
| **Autonomous watchers** (folders, email, calendar, repos) | A scheduler loop | A `SchedulingAgent` polling a source and calling `Jarvis.ask` on triggers; each source is a tool. |
| **Knowledge graph** | Alongside the vector store | Add a `GraphMemory` next to the vector stores in `LongTermMemory`; `retrieve_all` merges results. |
| **Real embeddings / vector DB** | Behind existing interfaces | Implement `Embedder`; swap `VectorStore` for FAISS/Chroma/pgvector with the same `add`/`search`. |

## Why draw the line here

Shipping empty `pass`-body classes for voice and vision would inflate the file
count without adding capability, and would violate the project's own rule
against placeholders (`Never leave TODO placeholders`). Instead the core is
real and the boundaries are documented, so the next contributor knows exactly
where to build and against which interface.
