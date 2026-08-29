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
                           ToolRegistry; the dry-run proposal + verification contract
js/jarvis/domain.js        resolvers (name → real event/task/project), date phrases,
                           and the post-write verification helpers
js/jarvis/scheduler.js     session distribution — how work is *shaped* before it is
                           placed: sizing, spacing, per-day caps, preferred times
js/jarvis/projects.js      deadline → plan: phase templates, effort split, commit
js/jarvis/optimize.js      optimiser findings, morning brief, day review, insights
js/jarvis/toolbelt.js      the tools: calendar.* / plan.* / memory.*
js/jarvis/reasoner.js      the local reasoner — intent table + Cadence's NLP;
                           optional remote LLM provider (off by default)
js/jarvis/agents.js        planner, executor, reflection, memory
js/jarvis/orchestrator.js  task tree + the understand→plan→clarify→execute→
                           verify→reflect→deliver loop
js/jarvis/assistant.js     the facade: ask(), apply(), memory controls, status, state
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

### Verify, then report

A commit that throws no exception has confirmed nothing. Every proposal pairs
`commit` with a `verify` that re-reads the store — is the event actually there,
is it at the time we asked for, did the task's status really change — and the
console reports *that* result. A write that silently fails is reported as a
failure, in those words, with the calendar left alone. There is a test for this:
a proposal whose commit returns a fabricated id is reported as not applied.

### Memory you can read

`§23` is taken literally: the side panel lists every fact, skill and episode
JARVIS holds, each editable and individually deletable, with a switch that
detaches long-term memory from the agents entirely rather than merely hiding it.

## Tools

Reads run freely:

`calendar.get_day` · `get_events` · `get_week` · `get_month` · `find_free_time` ·
`find_conflicts` · `search` · `list_tasks` · `deadlines` · `workload` ·
`time_spent` — `plan.what_now` · `priorities` · `morning_brief` · `day_review` ·
`week_review` · `research` — `memory.recall`

Writes propose first, then verify:

`calendar.create_event` · `create_recurring_event` · `update_event` ·
`move_event` · `delete_event` · `move_range` · `create_task` ·
`create_deadline` · `create_note` · `complete_task` · `capture` · `organize` —
`plan.day` · `week` · `sessions` · `project` · `optimize` · `reschedule` ·
`break_down` — `memory.remember`

### Scheduling, not slot-filling

Asked for two hours of study, the naive answer is one two-hour block and the
useful answer is an hour on Tuesday and an hour on Thursday.
`js/jarvis/scheduler.js` decides the shape before `SCHED.freeSlots` decides the
place: it sizes sessions from the total, caps how many land on one day, spaces
them out, front-loads when a deadline is tight, prefers the time of day you
actually work (learned from your own history, and only when the evidence is a
real majority), and avoids days that are already heavy. Every choice appends a
human reason, which is what lets the console explain itself.

### Deadline → plan

`plan.project` turns "my physics project is due in two weeks" into a real
project, a real deadline, and work sessions arranged around what is already on
the calendar, split into phases (Research → Plan → Build → Review → Final).

Those phase structures are **built-in templates in `projects.js`**. They are not
researched, and the console says so on every proposal. JARVIS cannot browse the
web from here — the app runs entirely in your browser and sends nothing out —
and `plan.research` says exactly that rather than inventing a "researched" plan.

### Optimize

`plan.optimize` scans a window for conflicts, overloaded days, over-long
unbroken blocks, deadlines with no preparation booked, and urgent work with no
calendar time. Each finding carries its own apply and its own verification, so
the review card lets you take three of six and leave the rest.

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
