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
js/jarvis/converse.js      the conversational engine — the default path when a
                           message is not a request to do something
js/jarvis/voice.js         microphone input and spoken replies, both on the
                           browser's own Web Speech API
js/jarvis/agents.js        planner, executor, reflection, memory
js/jarvis/orchestrator.js  task tree + the understand→plan→clarify→execute→
                           verify→reflect→deliver loop
js/jarvis/assistant.js     the facade: ask(), apply(), memory controls, status, state
js/ui/jarvis.js            the console — docked rail and full route
```

### Two modes, and conversation is the default

JARVIS is not a command parser. A message is only routed to the tools when it
is actually a request to do something; everything else is a conversation.

```
message → is this a request for an action?
            yes → tools (propose → verify → report)
            no  → conversation
```

There is no "not detected" branch, because that was the bug: an earlier build
sent anything unmatched to full-text search, so "I got a 5 on both my AP exams"
came back as *Nothing matches "I got a 5 on both my AP exams"*. The unmatched
path is now a conversation, and the least confident branch inside it is a
curious follow-up question — which is what a person would do.

`converse.js` handles greetings, good news, complaints, completions, reactions,
advice, plans-out-loud and the rest. Two things stop it reading as templated:

- **Register matching.** Energy is measured from the message (capitals,
  exclamation marks, slang) and the reply is drawn from a tier that matches, so
  shouted good news gets a matching reaction and a quiet remark gets a quiet one.
- **Continuity.** A question JARVIS asked stays open for exactly one turn, so a
  bare "Computer Science Principles" after "which exam was it?" is understood —
  but "I'm exhausted" two turns later is not mistaken for a late answer.

Replies can carry **chips**: one-tap follow-ups that run a real command, so a
conversation turns into calendar work without a mode switch.

Where the calendar genuinely helps, conversation uses it. "Do you think I should
study tonight?" checks your actual free time and your actual task ranking before
answering.

### Talking to it

Press the mic in the composer and speak; the words appear as they are
recognised and the request sends when you stop. Turn on **Read replies aloud**
in the JARVIS view (or the speaker button in the console header) and it talks
back. Both halves use the Web Speech API that is already in the browser — no
install, no key, no third-party service added by Cadence.

The two halves have very different privacy properties, and the app says so
rather than glossing it:

- **Speaking** is local. It uses voices your operating system already has and
  sends nothing anywhere.
- **Listening** is not. Chrome and Edge stream the audio to Google's speech
  service and send text back. That is a real departure for an app whose own
  copy says nothing leaves the page, so the mic is opt-in per use and the Voice
  panel states it plainly. Firefox has no support at all and is told so
  instead of being given a dead button.

### What it will not pretend to know

Offline there is no model and no network, so open-domain questions get an honest
answer rather than an invented one:

> That one's outside what I can answer — I run entirely inside this page, with no
> internet and no general knowledge model behind me, so I'd only be guessing.

Connect a model in the JARVIS view's **Language model** panel (Anthropic, OpenAI
or Ollama shapes) and it answers those properly, with your calendar as context.
Even then, calendar writes stay on the deterministic tool pipeline — the model
is told it cannot claim to have changed anything — so it can never hallucinate
an event into existence. If a configured model is unreachable, the local engine
answers and says the model could not be reached.

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

### What it does directly, and what it asks about

Not every change deserves a confirmation step. A tool declares `lowRisk` when
the person named the thing, it affects one item, and it is one keystroke from
being undone — "delete the dentist appointment", "mark the essay done", "add
gym tomorrow at 7". Those run immediately and report what actually changed,
with an **Undo** button sitting next to the confirmation.

Generative and bulk changes still propose first and change nothing until
approved: planning a day or a week, optimising the schedule, breaking a
deadline into sessions, moving a whole day's events, organising a brain dump.

### Editing

Every way of changing an event is one request, because that is how people say
it. `js/jarvis/edits.js` reads all of these out of a single sentence:

| | |
|---|---|
| absolute time | "change it to 5pm", "at 3:15", "half past four", "at noon" |
| absolute day | "to Tuesday", "next Friday" |
| relative move | "push it back an hour", "30 minutes earlier", "delay by two hours" |
| absolute length | "make it 30 minutes", "an hour long", "run for 90 mins" |
| relative length | "extend by 20", "shorten by a quarter of an hour" |
| rename | "rename it to X", "call it X" |
| travel time | "give me 20 minutes before it to get there" |

They combine: *"make my dentist appointment start at 4 and run for 90 minutes"*
is one edit with two dimensions. Tasks and deadlines take the same sentences
and read them against a due date instead of a span.

This replaced three overlapping intents and a clock parser that only understood
"at 4" — which is why *"move it to 4:30"* used to move the event to the wrong
day entirely.

### "It"

A person says "move my dentist appointment to 4" and then "actually make it an
hour" — the second sentence names nothing. Whatever was last acted on stays in
focus, so a pronoun resolves to it, and the record is re-read at use time so
the edit works off current times rather than a stale copy.

### Finding what you meant

"Remove the library books thing" should work whether that is an event, a task,
a deadline or a habit — the person naming it does not think in collections.
`findAnything` resolves a name across every collection at once, ranks by match
quality and how soon the thing is, and refuses when two candidates are too
close to call: *"I found more than one match … which did you mean?"* is better
than deleting the wrong one.

It also checks before deciding. "I finished the history essay" is a remark, but
if it names something actually on the list it is also a completion — so JARVIS
looks first, and ticks it off when it recognises it while staying purely
conversational when it does not.

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
