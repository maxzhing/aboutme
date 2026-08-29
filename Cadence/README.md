# Cadence · JARVIS

One self-contained HTML file — [`../cadence-jarvis.html`](../cadence-jarvis.html) —
containing Cadence (calendar, tasks, notes, projects, goals, habits, planning)
with JARVIS as its assistant. No build step to run it, no server, no API key,
no network. Open the file.

## What was merged

Two codebases already in this repo:

| From | What it contributed |
|---|---|
| `cadence_3.html` | The whole app: data model, store with undo, recurrence, queries, NLP date parsing, the scheduling engine, and every view. |
| `/Jarvis` (Python) | The agent framework: memory, tools, agents, orchestrator — ported to JavaScript and rehomed on Cadence's data. |

JARVIS is not bolted on beside the app. Its tools call Cadence's own `A.*`
(mutations), `Q.*` (reads), `SCHED.*` (scheduling) and `NLP.*` (parsing)
modules, so the assistant and the buttons drive the same engine and cannot
drift apart.

## Architecture

```
js/jarvis/core.js          value types — ids, Confidence, AgentMessage envelopes, metrics
js/jarvis/memory.js        hashing embedder, vector store, semantic/episodic/procedural
                           memory with recency decay + reinforcement, working memory
js/jarvis/tools.js         Tool base: schema validation, permissions, timeout, retry;
                           ToolRegistry; the dry-run proposal contract
js/jarvis/toolbelt.js      23 tools over the user's calendar, tasks, notes and plans
js/jarvis/reasoner.js      the local reasoner — intent table + Cadence's NLP;
                           optional remote LLM provider (off by default)
js/jarvis/agents.js        planner, executor, reflection, memory
js/jarvis/orchestrator.js  task tree + the understand→plan→clarify→execute→
                           verify→reflect→deliver loop
js/jarvis/assistant.js     the facade: ask(), remember(), recall(), status()
js/ui/jarvis.js            the console — docked rail and full route
```

### Why there is no Echo provider

The Python JARVIS ran offline through an `EchoProvider` that echoed the prompt
back. That proves the plumbing works and answers nothing — inside a calendar it
would be useless. It is replaced by a **local reasoner** that maps an utterance
onto a plan of tool calls using an ordered intent table plus Cadence's existing
NLP parser. That is enough, because the hard reasoning already lives in
`SCHED`; the reasoner only has to decide which question is being asked.

A remote LLM can be attached (`settings.jarvisRemote`) for open-ended phrasing.
It is off unless explicitly configured — Cadence is local-first and its own
copy says nothing is sent anywhere.

### Propose, then apply

Cadence's assistant surfaces have always proposed and waited for a yes. JARVIS
does not get to break that. Tools declare `mutates: true`; under dry-run they
return a **proposal** — a description plus a deferred `commit` closure — instead
of changing anything. The console renders it and calls `commit` only on
approval. Auto-apply exists, is off by default, and the composer says which
mode is active. Everything remains undoable either way.

## Tools

Reads run freely: `agenda`, `find_time`, `what_now`, `list_tasks`, `priorities`,
`conflicts`, `workload`, `deadlines`, `week_review`, `search`, `recall`.

Writes propose first: `create_event`, `create_task`, `create_note`,
`create_deadline`, `capture`, `organize`, `schedule_task`, `complete_task`,
`break_down_task`, `plan_day`, `plan_week`, `remember`.

## Reaching it

`J` from anywhere · the **JARVIS** button in the top bar · the sidebar ·
`⌘K` → "Ask JARVIS" (plus direct "plan my day" / "what is overdue" commands).

## Design

See [`../DESIGN.md`](../DESIGN.md). Structure follows Linear; the agent layer
follows Claude's rule for spending a warm accent scarcely. Both were read from
the `design-md` skill in `.claude/skills/design-md`.

## Building

```
python3 Cadence/build.py
```

Splices `src/jarvis/*` into `src/cadence.html` and writes
`cadence-jarvis.html`. Every patch asserts it matched exactly once — a moved
anchor fails the build rather than silently shipping a file with a missing seam.

Edit the sources in `src/`, not the generated file.
