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
| **Web UI** | `jarvis.ui` | A self-contained, responsive, theme-aware chat page served at `/`. Works on phone and desktop. |

See [`docs/architecture.md`](docs/architecture.md) for the full design and
[`docs/developer_guide.md`](docs/developer_guide.md) to extend it.

## Use it on your computer and phone

JARVIS ships a web chat UI. Start the server (no dependencies, offline by
default):

```bash
pip install -e .            # once, from the Jarvis/ directory
jarvis-serve --host 0.0.0.0 # 0.0.0.0 lets your phone connect too
```

You'll see:

```
  JARVIS is running.

    On this computer:  http://localhost:8080
    On your phone:     http://192.168.1.42:8080   (same Wi-Fi)
```

**On your computer** — open <http://localhost:8080> in any browser.

**On your phone** — make sure the phone is on the **same Wi-Fi** as the
computer, then open the `http://<your-computer-ip>:8080` address shown in the
banner (the server auto-detects your LAN IP). The page is responsive and
theme-aware, so it looks right on a phone screen.

> No `jarvis-serve` command? You didn't `pip install`. Either install, or run
> `python -m jarvis.api.server --host 0.0.0.0` from the `Jarvis/` directory.

The interface: type a goal and get a planned, executed answer; expand the
**Reasoning trace** to see each phase; tap **Status** for agent health and
memory; tap **Remember** to teach it a fact. It talks to the same server's
REST endpoints, so anything the UI does you can also script:

```bash
curl -s localhost:8080/ask -d '{"goal":"plan my week"}' -H 'Content-Type: application/json'
```

### Point it at a real model (optional)

Everything above runs on the offline Echo model. To use Claude/GPT/etc., set
the provider before starting the server:

```bash
export JARVIS_LLM__PROVIDER=anthropic
export JARVIS_LLM__MODEL=claude-fable-5
export ANTHROPIC_API_KEY=sk-...
pip install anthropic
jarvis-serve --host 0.0.0.0
```

### Run it in Docker

```bash
docker build -f docker/Dockerfile -t jarvis .
docker run -p 8080:8080 jarvis      # then open http://localhost:8080
```

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
