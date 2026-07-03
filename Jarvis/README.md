# JARVIS v2

A modular, model-agnostic framework for building an autonomous personal
assistant — a small **AI operating system** rather than a chatbot. It plans,
remembers, uses tools, coordinates multiple specialized agents, reflects on its
own work, and keeps improving.

The design follows a few hard rules: small modules, explicit interfaces, no
prompts buried in Python, every subsystem independently usable and tested, and
**zero required third-party dependencies for the core** — the whole stack runs
and is fully testable out of the box using a deterministic offline model.

```
pip install -e .          # or just run from the repo root
python examples/quickstart.py
python -m unittest discover -s tests
```

## What's inside

| Subsystem | Module | What it does |
|-----------|--------|--------------|
| **Config** | `jarvis.config` | Layered settings: dataclass defaults → YAML → `JARVIS_*` env vars. |
| **LLM abstraction** | `jarvis.llm` | One `LLMProvider` interface; Echo (offline), Anthropic, OpenAI/OpenRouter/DeepSeek/Mistral, Ollama. Switch via config only. |
| **Prompts** | `jarvis.prompts` | File-based `.md` templates with `${var}` injection and versioning. No prompts in code. |
| **Tools** | `jarvis.tools` | `Tool` base with input schema, permissions, timeout, retry, logging; sandboxed filesystem, safe calculator, HTTP, guarded shell. |
| **Memory** | `jarvis.memory` | Bounded working memory + a decaying long-term store (semantic / episodic / procedural) over a dependency-free vector index (RAG). |
| **Agents** | `jarvis.agents` | Planner, Executor, Researcher, Reflection, Memory — each with role, tools, memory, confidence, and health. |
| **Orchestrator** | `jarvis.orchestrator` | Task-tree decomposition and the `understand → plan → clarify → execute → verify → reflect → deliver` loop, with retries and cost accounting. |
| **API / SDK** | `jarvis.api` | The `Jarvis` facade and a dependency-free REST server. |

See [`docs/architecture.md`](docs/architecture.md) for the full design and
[`docs/developer_guide.md`](docs/developer_guide.md) to extend it.

## Quick usage

```python
from jarvis.api import Jarvis

jarvis = Jarvis()                       # offline Echo model by default
jarvis.remember("The user prefers concise answers.")
result = jarvis.ask("Plan the next milestone for my project.")

print(result.status)                    # "delivered" | "needs_clarification" | "failed"
print(result.answer)
for step in result.trace:               # full reasoning trace
    print(step.phase, step.detail)
```

## Using a real model

Nothing in the code hardcodes a model. Point at any provider via config or
environment variables:

```bash
export JARVIS_LLM__PROVIDER=anthropic
export JARVIS_LLM__MODEL=claude-fable-5
export ANTHROPIC_API_KEY=sk-...
pip install anthropic          # only needed for this provider
python examples/quickstart.py
```

Swap `anthropic` for `openai`, `openrouter`, `deepseek`, `mistral`, or
`ollama` (local, no key). The rest of the system is unchanged.

## Design status & roadmap

This repository implements the **core spine** described above as production-
quality, tested code. Subsystems that inherently require hardware or heavy
external dependencies — **voice** (wake word / STT / TTS), **vision** (OCR /
screen understanding), **computer control**, and the **desktop UI** — are
intentionally left as documented extension points rather than stubs, so the
core stays dependency-free and honest about what actually runs today. Each
plugs in through an existing seam: new backends via the tool framework, new
workers via the agent base, new frontends via the SDK/REST surface. The
extension points and their interfaces are described in
[`docs/roadmap.md`](docs/roadmap.md).

## Testing

```bash
python -m unittest discover -s tests -v
```

52 tests, no external dependencies, run in well under a second.
