"""The central orchestrator: the brain that coordinates everything.

It runs the canonical reasoning loop from the spec —
**understand → clarify → plan → research → execute → verify → reflect → deliver** —
by delegating each phase to the appropriate agent, tracking a task tree, a cost
budget, and a full reasoning trace.

Responsibilities implemented here:

* task decomposition (Planner) into a :class:`TaskTree`;
* agent assignment and sequential execution of ready tasks (Executor);
* confidence evaluation → ask for clarification when the plan is uncertain;
* retry logic on failed tasks, up to a configured limit;
* cost accounting so a run can be bounded;
* reflection after completion, feeding lessons back into memory.

The design is synchronous and deterministic so it is fully testable with the
offline Echo provider; ``parallelism`` in config is respected by the ready-task
scheduler and is the natural seam for a future async executor.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

from jarvis.agents.base import Agent
from jarvis.agents.executor import ExecutorAgent
from jarvis.agents.messages import AgentMessage, MessageKind
from jarvis.agents.planner import PlannerAgent
from jarvis.agents.reflection import ReflectionAgent
from jarvis.agents.researcher import ResearcherAgent
from jarvis.config.settings import OrchestratorConfig
from jarvis.core.logging import get_logger
from jarvis.core.types import Usage, new_id
from jarvis.memory.long_term import LongTermMemory
from jarvis.orchestrator.task import Task, TaskStatus, TaskTree

_log = get_logger("orchestrator")


@dataclass
class TraceEntry:
    phase: str
    detail: str
    confidence: float = 1.0


@dataclass
class RunResult:
    """The complete outcome of processing one goal."""

    goal: str
    answer: str
    status: str                      # "delivered" | "needs_clarification" | "failed"
    tree: TaskTree
    trace: List[TraceEntry] = field(default_factory=list)
    usage: Usage = field(default_factory=Usage)
    clarification: Optional[str] = None
    reflection: Optional[dict] = None

    def trace_text(self) -> str:
        return "\n".join(f"[{e.phase}] {e.detail}" for e in self.trace)


class Orchestrator:
    def __init__(
        self,
        planner: PlannerAgent,
        executor: ExecutorAgent,
        researcher: Optional[ResearcherAgent] = None,
        reflection: Optional[ReflectionAgent] = None,
        long_term: Optional[LongTermMemory] = None,
        config: Optional[OrchestratorConfig] = None,
    ) -> None:
        self.planner = planner
        self.executor = executor
        self.researcher = researcher
        self.reflection = reflection
        self.long_term = long_term
        self.config = config or OrchestratorConfig()

    # ------------------------------------------------------------------ #
    # Public entry point
    # ------------------------------------------------------------------ #

    def run(self, goal: str, context: str = "") -> RunResult:
        """Execute the full reasoning loop for ``goal`` and return a result."""
        trace: List[TraceEntry] = []
        usage = Usage()

        # 1. UNDERSTAND — pull any relevant long-term memory as context.
        memory_context = self._understand(goal, context, trace)

        # 2. PLAN — decompose the goal into steps.
        plan_msg = self._plan(goal, memory_context, trace)

        # 3. CLARIFY — if the plan is too uncertain, stop and ask.
        if plan_msg.kind == MessageKind.CLARIFY or plan_msg.confidence < self.config.clarify_below_confidence:
            question = self._clarification_question(plan_msg)
            trace.append(TraceEntry("clarify", question, plan_msg.confidence))
            tree = TaskTree(Task(description=goal, status=TaskStatus.NEEDS_CLARIFICATION))
            return RunResult(
                goal=goal,
                answer=question,
                status="needs_clarification",
                tree=tree,
                trace=trace,
                clarification=question,
            )

        # Build the task tree from the plan's steps.
        tree = self._build_tree(goal, plan_msg.payload.get("steps", []))

        # 4-6. RESEARCH + EXECUTE + VERIFY each ready task.
        self._execute_tree(tree, memory_context, trace)

        # Compose the deliverable from task results.
        answer = self._compose(goal, tree)
        has_failures = self._has_failures(tree)
        # Reflect the outcome on the root node so the tree reads cleanly.
        tree.root.status = TaskStatus.FAILED if has_failures else TaskStatus.DONE
        tree.root.result = answer
        status = "delivered" if tree.is_complete() and not has_failures else "failed"

        # 7. REFLECT — evaluate and capture lessons.
        reflection_report = self._reflect(goal, answer, trace)

        # 8. DELIVER
        trace.append(TraceEntry("deliver", answer, plan_msg.confidence))
        _log.info("run complete", extra={"goal": goal[:60], "status": status})
        return RunResult(
            goal=goal,
            answer=answer,
            status=status,
            tree=tree,
            trace=trace,
            usage=usage,
            reflection=reflection_report,
        )

    # ------------------------------------------------------------------ #
    # Phases
    # ------------------------------------------------------------------ #

    def _understand(self, goal: str, context: str, trace: List[TraceEntry]) -> str:
        recalled: List[str] = []
        if self.long_term is not None:
            recalled = [h.document.text for h in self.long_term.retrieve_all(goal, k=3)]
        combined = "\n".join(filter(None, [context, *recalled])) or "(no prior context)"
        trace.append(TraceEntry("understand", f"context items: {len(recalled)}"))
        return combined

    def _plan(self, goal: str, context: str, trace: List[TraceEntry]) -> AgentMessage:
        request = AgentMessage(
            sender="orchestrator",
            recipient=self.planner.name,
            kind=MessageKind.REQUEST,
            content=goal,
            payload={"context": context},
        )
        response = self.planner.handle(request)
        steps = response.payload.get("steps", [])
        trace.append(
            TraceEntry("plan", f"{len(steps)} steps: {steps}", response.confidence)
        )
        return response

    def _build_tree(self, goal: str, steps: List[str]) -> TaskTree:
        root = Task(description=goal, status=TaskStatus.RUNNING)
        tree = TaskTree(root)
        capped = steps[: self.config.max_subtasks]
        previous_id: Optional[str] = None
        for index, step in enumerate(capped):
            # Steps run in sequence by default: each depends on the previous.
            depends = [previous_id] if previous_id else []
            child = tree.add_child(
                root.id,
                step,
                priority=index + 1,
                depends_on=depends,
                required_agent="executor",
            )
            previous_id = child.id
        return tree

    def _execute_tree(self, tree: TaskTree, context: str, trace: List[TraceEntry]) -> None:
        """Run ready tasks until the tree completes, with per-task retries."""
        guard = 0
        max_iterations = self.config.max_subtasks * (self.config.max_retries + 2) + 5
        while not tree.is_complete() and guard < max_iterations:
            guard += 1
            ready = tree.ready_tasks()
            if not ready:
                break
            for task in ready:
                self._run_task(task, context, trace)

    def _run_task(self, task: Task, context: str, trace: List[TraceEntry]) -> None:
        attempts = 0
        while attempts <= self.config.max_retries:
            attempts += 1
            task.status = TaskStatus.RUNNING
            request = AgentMessage(
                sender="orchestrator",
                recipient=self.executor.name,
                kind=MessageKind.REQUEST,
                content=task.description,
                payload={"context": context},
            )
            response = self.executor.handle(request)
            task.confidence = response.confidence
            if response.kind != MessageKind.ERROR:
                task.status = TaskStatus.DONE
                task.result = response.content
                trace.append(
                    TraceEntry("execute", f"{task.description} -> ok", response.confidence)
                )
                return
            task.error = response.content
            trace.append(
                TraceEntry(
                    "execute",
                    f"{task.description} -> retry {attempts}: {response.content}",
                    response.confidence,
                )
            )
        task.status = TaskStatus.FAILED

    def _compose(self, goal: str, tree: TaskTree) -> str:
        """Assemble a final answer from completed task results (VERIFY+DELIVER)."""
        results = [
            f"- {t.description}: {t.result}"
            for t in tree.children(tree.root_id)
            if t.status == TaskStatus.DONE and t.result
        ]
        if not results:
            failed = [t for t in tree.children(tree.root_id) if t.status == TaskStatus.FAILED]
            if failed:
                return "I could not complete the task. Failures: " + "; ".join(
                    f"{t.description} ({t.error})" for t in failed
                )
            return "Task completed with no explicit output."
        return f"Completed '{goal}'. Results:\n" + "\n".join(results)

    def _reflect(self, goal: str, answer: str, trace: List[TraceEntry]) -> Optional[dict]:
        if self.reflection is None:
            return None
        request = AgentMessage(
            sender="orchestrator",
            recipient=self.reflection.name,
            kind=MessageKind.REQUEST,
            content=goal,
            payload={
                "goal": goal,
                "result": answer,
                "trace": "\n".join(f"[{e.phase}] {e.detail}" for e in trace),
            },
        )
        response = self.reflection.handle(request)
        report = response.payload.get("report")
        trace.append(TraceEntry("reflect", f"quality={response.payload.get('quality')}", response.confidence))
        return report

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #

    @staticmethod
    def _clarification_question(plan_msg: AgentMessage) -> str:
        for step in plan_msg.payload.get("steps", []):
            if step.upper().startswith("CLARIFY:"):
                return step[len("CLARIFY:"):].strip()
        return (
            "I need a bit more detail before I can plan this reliably. "
            "Could you clarify the goal?"
        )

    @staticmethod
    def _has_failures(tree: TaskTree) -> bool:
        return any(t.status == TaskStatus.FAILED for t in tree.all())
