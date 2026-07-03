import unittest

from jarvis.agents.executor import ExecutorAgent
from jarvis.agents.planner import PlannerAgent
from jarvis.agents.reflection import ReflectionAgent
from jarvis.config.settings import OrchestratorConfig
from jarvis.llm.base import CompletionRequest, CompletionResponse
from jarvis.llm.providers.echo import EchoProvider
from jarvis.orchestrator.orchestrator import Orchestrator
from jarvis.orchestrator.task import Task, TaskStatus, TaskTree


class TaskTreeTest(unittest.TestCase):
    def test_dependency_ordering(self):
        root = Task("root")
        tree = TaskTree(root)
        a = tree.add_child(root.id, "first")
        b = tree.add_child(root.id, "second", depends_on=[a.id])
        # Only 'a' is ready; 'b' waits on 'a'.
        ready_ids = [t.id for t in tree.ready_tasks()]
        self.assertIn(a.id, ready_ids)
        self.assertNotIn(b.id, ready_ids)
        a.status = TaskStatus.DONE
        self.assertIn(b.id, [t.id for t in tree.ready_tasks()])

    def test_priority_order(self):
        root = Task("root")
        tree = TaskTree(root)
        tree.add_child(root.id, "low", priority=9)
        tree.add_child(root.id, "high", priority=1)
        self.assertEqual(tree.ready_tasks()[0].description, "high")


def _orchestrator(provider=None):
    provider = provider or EchoProvider("echo-1")
    return Orchestrator(
        planner=PlannerAgent(provider),
        executor=ExecutorAgent(provider),
        reflection=ReflectionAgent(provider),
        config=OrchestratorConfig(max_retries=1),
    )


class _ClarifyProvider(EchoProvider):
    """Forces the planner to emit a CLARIFY step."""

    def complete(self, request: CompletionRequest) -> CompletionResponse:
        return CompletionResponse(
            text="1. CLARIFY: what is the deadline?",
            model=request.model,
        )


class _FailingExecutorProvider(EchoProvider):
    """Always blocks. Only wired to the executor, so the planner is unaffected."""

    def complete(self, request: CompletionRequest) -> CompletionResponse:
        return CompletionResponse(text="BLOCKED: cannot do this", model=request.model)


class OrchestratorTest(unittest.TestCase):
    def test_full_loop_delivers(self):
        result = _orchestrator().run("please plan my day")
        self.assertEqual(result.status, "delivered")
        self.assertIn("Completed", result.answer)
        self.assertTrue(any(e.phase == "reflect" for e in result.trace))

    def test_trace_has_all_phases(self):
        result = _orchestrator().run("please plan my day")
        phases = {e.phase for e in result.trace}
        for expected in ("understand", "plan", "execute", "deliver"):
            self.assertIn(expected, phases)

    def test_clarification_path(self):
        orch = _orchestrator(_ClarifyProvider("echo-1"))
        result = orch.run("do the thing")
        self.assertEqual(result.status, "needs_clarification")
        self.assertIn("deadline", result.clarification)

    def test_failure_reported(self):
        provider = _FailingExecutorProvider("echo-1")
        orch = Orchestrator(
            planner=PlannerAgent(EchoProvider("echo-1")),  # normal planner
            executor=ExecutorAgent(provider),               # failing executor
            config=OrchestratorConfig(max_retries=1),
        )
        result = orch.run("please plan and execute")
        self.assertEqual(result.status, "failed")


if __name__ == "__main__":
    unittest.main()
