# `jarvis.agents` — Role-specialized agents

Each agent has a role, a scoped tool registry, working memory (its context
window), optional long-term memory, a confidence score, and a health status.
Agents communicate only through `AgentMessage` envelopes routed by the
orchestrator.

- **`base.py`** — `Agent`, `AgentConfig`, `Health`; helpers `ask_llm`,
  `use_tool`, `recall`, `render_prompt`. `ask_llm`/`use_tool` also record
  token, cost, latency and call-count metrics for the dashboard.
- **`messages.py`** — `AgentMessage` (`request`/`result`/`clarify`/`error`).
- **`hermes.py`** — **Hermes**, the conversational front (the "talking" agent).
  Holds the dialogue, decides chit-chat vs. real work, delegates tasks to the
  orchestrator, and narrates results in short spoken-style language for voice.
- **`planner.py`** — goal → ordered steps (flags ambiguity as `CLARIFY:`).
- **`executor.py`** — runs one step; invokes tools deterministically.
- **`researcher.py`** — grounded answers from retrieved knowledge.
- **`reflection.py`** — scores outcomes, writes lessons to procedural memory.
- **`memory_agent.py`** — curates long-term memory (store / record / dedupe).

Each agent loads its prompt from `jarvis/prompts/library/<name>.md`.
