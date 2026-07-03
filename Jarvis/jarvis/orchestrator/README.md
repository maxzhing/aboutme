# `jarvis.orchestrator` — Coordination & reasoning loop

- **`task.py`** — `Task` and `TaskTree`. Goals decompose into a tree; each node
  carries priority, dependencies, estimates, required tools/agent, confidence,
  and status. `ready_tasks()` yields dependency-satisfied leaves in priority
  order (the seam for parallelism).
- **`orchestrator.py`** — `Orchestrator.run(goal)` executes the loop:
  **understand → plan → clarify → execute → verify → reflect → deliver**,
  delegating each phase to an agent, retrying failed tasks, and recording a full
  `TraceEntry` list. Returns a `RunResult` (answer, status, tree, trace, usage,
  reflection).

Synchronous and deterministic so it is fully testable with the offline Echo
provider.
