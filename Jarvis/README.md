# JARVIS v2

A modular, model-agnostic framework for building an autonomous personal
assistant — a small **AI operating system** rather than a chatbot. It plans,
remembers, uses tools, coordinates multiple specialized agents through a
**Hermes** conversational front, reflects on its own work, controls your
computer, talks with you by voice, and reports on itself through a live
**Mission Control** dashboard.

The design follows a few hard rules: small modules, explicit interfaces, no
prompts buried in Python, every subsystem independently usable and tested, and
**zero required third-party dependencies for the core** — the whole stack runs
and is fully testable out of the box using a deterministic offline model.

```
pip install -e .          # or just run from the repo root
python examples/quickstart.py
python -m unittest discover -s tests      # 80 tests, no external deps
jarvis-serve                              # web UI at http://localhost:8080
```

## Run it with a real model (Claude, GPT, Ollama, …)

Nothing hardcodes a model — you pick one with two environment variables plus a
key, then start the server. The rest of the system is identical.

```bash
# Claude (recommended)
export JARVIS_LLM__PROVIDER=anthropic
export JARVIS_LLM__MODEL=claude-fable-5
export ANTHROPIC_API_KEY=sk-ant-...
pip install anthropic
jarvis-serve --host 0.0.0.0

# OpenAI / OpenRouter / DeepSeek / Mistral (same OpenAI wire format)
export JARVIS_LLM__PROVIDER=openai        # or openrouter | deepseek | mistral
export JARVIS_LLM__MODEL=gpt-4o
export OPENAI_API_KEY=sk-...
pip install openai

# Local, no key, fully offline (needs a running Ollama daemon)
export JARVIS_LLM__PROVIDER=ollama
export JARVIS_LLM__MODEL=llama3
```

Why the model matters: the offline **Echo** default lets everything *run*, but
it can't reason — so it won't hold a real conversation or pick tools on its
own. Point JARVIS at Claude or a local model and **Hermes** starts talking
naturally and the **Executor** starts choosing tools by itself. Until then,
use the `!command` prefix for direct computer control.

| Provider key | Model env | Key env | Install |
|---|---|---|---|
| `anthropic` | `claude-fable-5` | `ANTHROPIC_API_KEY` | `pip install anthropic` |
| `openai` | `gpt-4o` | `OPENAI_API_KEY` | `pip install openai` |
| `openrouter` | any OpenRouter id | `OPENROUTER_API_KEY` | `pip install openai` |
| `deepseek` | `deepseek-chat` | `DEEPSEEK_API_KEY` | `pip install openai` |
| `mistral` | `mistral-large-latest` | `MISTRAL_API_KEY` | `pip install openai` |
| `ollama` | `llama3`, `qwen2.5`, … | (none) | run `ollama serve` |
| `echo` | `echo-1` | (none) | built in, offline default |

## What's inside

| Subsystem | Module | What it does |
|-----------|--------|--------------|
| **Config** | `jarvis.config` | Layered settings: dataclass defaults → YAML → `JARVIS_*` env vars. |
| **LLM abstraction** | `jarvis.llm` | One `LLMProvider` interface; Echo (offline), Anthropic, OpenAI/OpenRouter/DeepSeek/Mistral, Ollama. Switch via config only. |
| **Prompts** | `jarvis.prompts` | File-based `.md` templates with `${var}` injection and versioning. No prompts in code. |
| **Tools** | `jarvis.tools` | `Tool` base with input schema, permissions, timeout, retry, logging; sandboxed filesystem, safe calculator, HTTP, guarded shell. |
| **Memory** | `jarvis.memory` | Bounded working memory + a decaying long-term store (semantic / episodic / procedural) over a dependency-free vector index (RAG). |
| **Agents** | `jarvis.agents` | **Hermes** (conversational front), Planner, Executor, Researcher, Reflection, Memory — each with role, tools, memory, confidence, and health. |
| **Observability** | `jarvis.core.metrics` | Token/cost/latency/call-count metrics + a live log buffer, exposed at `/metrics` and `/logs`. |
| **Dashboard** | `jarvis.ui` (`/dashboard`) | A **Mission Control** console: KPI summary, agent monitor, token-usage & tool charts, the Hermes agent-swarm graph, and a live log stream. |
| **Orchestrator** | `jarvis.orchestrator` | Task-tree decomposition and the `understand → plan → clarify → execute → verify → reflect → deliver` loop, with retries and cost accounting. |
| **API / SDK** | `jarvis.api` | The `Jarvis` facade and a dependency-free REST server. |
| **Web UI** | `jarvis.ui` | A self-contained, responsive, theme-aware **JARVIS HUD** with a voice-reactive reactor orb, served at `/`. Works on phone and desktop. |
| **Voice** | `jarvis.ui` (browser) | Talk to it and hear it back via the browser's Web Speech API — no server deps, no keys, works on mobile and desktop. |
| **Computer control** | `jarvis.tools` | `system_info`, a real shell (pipes/`&&`/redirects), and app-launch — off by default, enabled with `--full-access`. |

See [`docs/architecture.md`](docs/architecture.md) for the full design,
[`docs/developer_guide.md`](docs/developer_guide.md) to extend it, and
[`docs/full_access.md`](docs/full_access.md) for the computer-control security model.

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

### Mission Control dashboard

Open **<http://localhost:8080/dashboard>** (or tap **Dashboard** in the chat
header). It refreshes every two seconds and shows, live for your instance:

- **KPI row** — uptime, LLM calls, tokens, estimated cost, tool calls, model.
- **Agent monitor** — every agent's health and confidence, including Hermes.
- **Token usage by agent** and a **tool dashboard** (calls + average latency).
- **Agent swarm** — the Hermes → Orchestrator → specialists topology, colored
  by live health.
- **Live logs** — the structured reasoning/tool/error stream.

It's the same self-contained, theme-aware approach as the chat UI (no external
deps), and it reads only from this instance's `/status`, `/metrics`, `/logs`.

### Meet Hermes (the talking part)

**Hermes** is JARVIS's conversational front — the messenger between you and the
agent swarm. It holds the dialogue, decides whether what you said is small talk
or real work, delegates tasks to the orchestrator, and then *says the result in
plain spoken language* (ideal for voice). Everything the voice reads aloud is
Hermes's phrasing; the structured plan and reasoning trace are tucked into
expandable detail. Programmatically:

```python
from jarvis.api import Jarvis
j = Jarvis()
print(j.converse("hey, what can you do?").spoken)   # chit-chat, answered directly
r = j.converse("plan my launch week")               # delegated to the orchestrator
print(r.spoken)                                      # short spoken summary
print(r.run_result.answer)                           # full structured result
```

### Talk to it (voice)

The UI has voice built in — no setup, no API keys:

- **Tap the reactor orb** (or the 🎙 button) and speak. Your words are
  transcribed and sent as a goal. The orb turns green and pulses while it
  listens.
- Tap **🔊 Voice** in the header to have JARVIS **read its replies aloud**. The
  orb pulses while it speaks.

This uses your browser's built-in Web Speech API, which works in Chrome, Edge,
and Safari on both **desktop and mobile**. (On a phone you'll be asked for mic
permission the first time. Some browsers only enable speech recognition on
`https` or `localhost` — see the note in [`jarvis/ui/README.md`](jarvis/ui/README.md).)

### Let it control your computer (full-access)

By default JARVIS cannot touch your machine — the shell and app-launch tools
are present but inert. To give it real control, start with **`--full-access`**:

```bash
jarvis-serve --host 0.0.0.0 --full-access
```

Now you can:

- **Run commands directly** — prefix a message with `!`:
  `!ls ~/Downloads`, `!git status`, `!echo hi | tr a-z A-Z` (real shell, so
  pipes / `&&` / redirects all work).
- **Ask in natural language** — "what's my system info?", "open my browser",
  "find the biggest files in this folder" — and (with a **real model** like
  Claude or a local Ollama model) the Executor agent picks the right tool
  itself. The offline Echo model can't reason about tools, so use `!` for
  direct control until you point it at a real model.

**Security — read this.** Full-access means whoever can reach the server can
run code on your computer. So:

- On **localhost only** (default host) no token is needed — nothing else can
  reach it.
- The moment you expose it to your phone (`--host 0.0.0.0`) **with**
  `--full-access`, JARVIS auto-generates a **secret token** and prints it in
  the URL. Only that link works; open exactly it on your phone and don't share
  it. The static page loads without the token, but every *action* requires it.
- This is LAN-only. Do **not** put a full-access instance on the public
  internet without your own auth/TLS in front of it. Details and the threat
  model are in [`docs/full_access.md`](docs/full_access.md).

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
