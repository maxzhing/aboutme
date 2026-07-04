import unittest

from jarvis.agents.hermes import HermesAgent
from jarvis.llm.base import CompletionRequest, CompletionResponse
from jarvis.llm.providers.echo import EchoProvider
from jarvis.orchestrator.orchestrator import Orchestrator
from jarvis.agents.executor import ExecutorAgent
from jarvis.agents.planner import PlannerAgent


class _StubOrchestrator:
    """Records calls so we can assert Hermes delegates tasks."""

    def __init__(self):
        self.calls = []

    def run(self, goal, context=""):
        self.calls.append(goal)
        from jarvis.orchestrator.orchestrator import RunResult, TraceEntry
        from jarvis.orchestrator.task import Task, TaskStatus, TaskTree

        tree = TaskTree(Task(description=goal, status=TaskStatus.DONE))
        return RunResult(goal=goal, answer=f"did: {goal}", status="delivered",
                         tree=tree, trace=[TraceEntry("execute", "ok", 0.9)])


class HermesClassifyTest(unittest.TestCase):
    def test_chit_chat_is_not_task(self):
        self.assertFalse(HermesAgent.is_task("hey, how are you?"))
        self.assertFalse(HermesAgent.is_task("who are you"))

    def test_action_requests_are_tasks(self):
        for text in ["plan my week", "research the market", "open my browser",
                     "summarize this", "run the tests", "!ls"]:
            self.assertTrue(HermesAgent.is_task(text), text)


class HermesConverseTest(unittest.TestCase):
    def setUp(self):
        self.provider = EchoProvider("echo-1")
        self.orch = _StubOrchestrator()
        self.hermes = HermesAgent(self.provider, orchestrator=self.orch)

    def test_chat_does_not_delegate(self):
        reply = self.hermes.converse("hello there")
        self.assertEqual(reply.kind, "chat")
        self.assertEqual(self.orch.calls, [])

    def test_task_delegates_and_narrates(self):
        reply = self.hermes.converse("plan a party")
        self.assertEqual(reply.kind, "task")
        self.assertEqual(self.orch.calls, ["plan a party"])
        self.assertIsNotNone(reply.run_result)
        # Spoken output must be non-empty and not a raw Echo acknowledgement.
        self.assertTrue(reply.spoken)
        self.assertFalse(reply.spoken.startswith("Acknowledged"))

    def test_conversation_memory_accumulates(self):
        self.hermes.converse("hi")
        self.hermes.converse("plan a trip")
        # user+assistant for each of two turns
        self.assertEqual(len(self.hermes.memory.history()), 4)

    def test_clarification_is_spoken(self):
        class _ClarifyOrch(_StubOrchestrator):
            def run(self, goal, context=""):
                from jarvis.orchestrator.orchestrator import RunResult
                from jarvis.orchestrator.task import Task, TaskStatus, TaskTree
                tree = TaskTree(Task(description=goal, status=TaskStatus.NEEDS_CLARIFICATION))
                return RunResult(goal=goal, answer="q", status="needs_clarification",
                                 tree=tree, clarification="What is the deadline?")

        hermes = HermesAgent(self.provider, orchestrator=_ClarifyOrch())
        reply = hermes.converse("build me a plan")
        self.assertEqual(reply.kind, "clarify")
        self.assertIn("deadline", reply.spoken)


if __name__ == "__main__":
    unittest.main()
