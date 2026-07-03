# JARVIS v2 — Architecture

This document describes how the system is put together and why. The guiding
principle is **a small, readable core with explicit seams**: every subsystem is
usable on its own, depends only on interfaces (not concrete backends), and is
covered by tests that run with no external services.

## Layered view

```
                        ┌──────────────────────────────┐
                        │            api               │  Jarvis facade, REST server
                        └───────────────┬──────────────┘
                                        │
                        ┌───────────────▼──────────────┐
                        │        orchestrator          │  task tree + reasoning loop
                        └───────────────┬──────────────┘
                                        │ structured AgentMessages
        ┌───────────────┬───────────────┼───────────────┬───────────────┐
        ▼               ▼               ▼               ▼               ▼
    planner         executor        researcher       reflection       memory
        └───────────────┴───────┬───────┴───────────────┴───────────────┘
                                │ each agent uses…
        ┌───────────────┬───────┴───────┬───────────────┐
        ▼               ▼               ▼               ▼
      llm            tools           memory          prompts
   (provider)    (registry)     (short + long)     (templates)
        └───────────────┴───────────────┴───────────────┘
                                │ all built on…
                        ┌───────▼──────┐
                        │     core     │  types, errors, logging
                        └──────────────┘
                                │
                        ┌───────▼──────┐
                        │    config    │  defaults → YAML → env
                        └──────────────┘
```

Dependencies point **downward only**. The `core` and `config` layers know
nothing about agents; agents know nothing about the REST server. This is what
keeps each piece independently testable.

## The reasoning loop

`Orchestrator.run(goal)` implements the canonical loop. Each phase is a method
that delegates to an agent and appends to a reasoning trace:

1. **Understand** — retrieve relevant long-term memory as context.
2. **Plan** — the Planner decomposes the goal into ordered steps.
3. **Clarify** — if the plan's confidence is below `clarify_below_confidence`,
   or the planner emitted a `CLARIFY:` step, stop and ask the user. This is the
   "ask when uncertain" behaviour.
4. **Execute** — steps become a `TaskTree`; each ready task (dependencies met)
   is handed to the Executor, which may invoke tools. Failed tasks retry up to
   `max_retries`.
5. **Verify / Deliver** — results are composed into a final answer.
6. **Reflect** — the Reflection agent scores quality and writes reusable
   lessons into procedural memory, closing the self-improvement loop.

Every phase records a `TraceEntry` (phase, detail, confidence), so a run is
fully auditable — this is the "reasoning traces" logging requirement.

## Multi-agent coordination

Agents never call each other directly. They exchange `AgentMessage` envelopes
(`request` / `result` / `clarify` / `error`) through the orchestrator. Each
message carries a `confidence` the orchestrator uses to decide whether to
retry, clarify, or proceed. Because coordination is message-based, it is
inspectable and testable, and new agents slot in without touching existing
ones — the Hermes-style design the brief calls for.

Each agent (`jarvis.agents.base.Agent`) owns: a role, a scoped tool registry, a
bounded working memory (its context window), optional long-term memory, a
health status (`ok` / `degraded` / `failed`), and a confidence score.

## Model independence

`LLMProvider` is the only thing agents know about models. `build_provider`
constructs the configured backend and calls `is_available()` so a missing key
or package fails fast with a clear message instead of a stack trace deep in a
request. Adding a provider is a single-file change plus one `register_provider`
line; no core code changes. The default `EchoProvider` is deterministic and
offline, which is what makes the entire system runnable in CI.

## Memory model

- **Working memory** (`WorkingMemory`) — a bounded sliding window of recent
  turns plus a reasoning scratchpad. Non-persistent; the assistant's "RAM".
- **Long-term memory** (`LongTermMemory`) — three vector-backed stores:
  - *Semantic*: durable facts (very long half-life).
  - *Episodic*: time-stamped events (decays; recency-weighted retrieval).
  - *Procedural*: learned skills/workflows (durable).

  Retrieval ranks by cosine similarity **times an exponential recency decay**,
  and accessing a memory reinforces it. The vector index and embeddings are
  pure-Python (feature hashing) so RAG works with no model or service; swap in
  FAISS/Chroma and a real embedder behind the same interface for scale.

## Safety & permissions

Tools declare a `permission` string; the framework refuses to run a tool unless
the caller's `ToolContext` was granted that capability. Filesystem tools are
confined to a workspace root and reject path escapes. The shell tool is
disabled by default and runs without a shell interpreter. The calculator
evaluates via a whitelisted AST walk, never `eval`. These make "confirmation
before destructive actions / sandboxing / rate-limitable" concrete rather than
aspirational.

## Where hardware-bound subsystems attach

Voice, vision, computer-control and the desktop UI are not implemented here to
keep the core dependency-free; each has a defined seam (tool, agent, or SDK
frontend). See [`roadmap.md`](roadmap.md).
