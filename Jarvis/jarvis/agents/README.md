# `jarvis.agents` — Role-specialized agents

Each agent has a role, a scoped tool registry, working memory (its context
window), optional long-term memory, a confidence score, and a health status.
Agents communicate only through `AgentMessage` envelopes routed by the
orchestrator.

- **`base.py`** — `Agent`, `AgentConfig`, `Health`; helpers `ask_llm`,
  `use_tool`, `recall`, `render_prompt`.
- **`messages.py`** — `AgentMessage` (`request`/`result`/`clarify`/`error`).
- **`planner.py`** — goal → ordered steps (flags ambiguity as `CLARIFY:`).
- **`executor.py`** — runs one step; invokes tools deterministically.
- **`researcher.py`** — grounded answers from retrieved knowledge.
- **`reflection.py`** — scores outcomes, writes lessons to procedural memory.
- **`memory_agent.py`** — curates long-term memory (store / record / dedupe).

Each agent loads its prompt from `jarvis/prompts/library/<name>.md`.
