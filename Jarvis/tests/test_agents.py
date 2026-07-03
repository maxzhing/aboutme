import tempfile
import unittest

from jarvis.agents.executor import ExecutorAgent
from jarvis.agents.memory_agent import MemoryAgent
from jarvis.agents.messages import AgentMessage, MessageKind
from jarvis.agents.planner import PlannerAgent
from jarvis.agents.reflection import ReflectionAgent
from jarvis.config.settings import ToolsConfig
from jarvis.llm.providers.echo import EchoProvider
from jarvis.memory.long_term import LongTermMemory
from jarvis.tools.builtins import default_registry


def _request(recipient, content, **payload):
    return AgentMessage(
        sender="test",
        recipient=recipient,
        kind=MessageKind.REQUEST,
        content=content,
        payload=payload,
    )


class PlannerTest(unittest.TestCase):
    def test_produces_steps(self):
        agent = PlannerAgent(EchoProvider("echo-1"))
        resp = agent.handle(_request("planner", "please plan a party"))
        self.assertTrue(resp.payload["steps"])
        self.assertGreater(resp.confidence, 0.5)

    def test_confidence_on_message(self):
        agent = PlannerAgent(EchoProvider("echo-1"))
        resp = agent.handle(_request("planner", "plan"))
        # The envelope's confidence field must mirror the agent's own value.
        self.assertEqual(resp.confidence, float(agent.confidence))
        self.assertGreater(resp.confidence, 0.5)


class ExecutorTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.tools = default_registry(ToolsConfig(workspace_dir=self.tmp))

    def test_explicit_tool_call(self):
        agent = ExecutorAgent(EchoProvider("echo-1"), tools=self.tools)
        resp = agent.handle(
            _request("executor", "write a file", tool="write_file",
                     args={"path": "x.txt", "content": "hi"})
        )
        self.assertEqual(resp.kind, MessageKind.RESULT)
        self.assertEqual(resp.payload["tool"], "write_file")

    def test_missing_tool_blocks(self):
        agent = ExecutorAgent(EchoProvider("echo-1"), tools=self.tools)
        resp = agent.handle(_request("executor", "do", tool="nope", args={}))
        self.assertEqual(resp.kind, MessageKind.ERROR)

    def test_plain_step_returns_result(self):
        agent = ExecutorAgent(EchoProvider("echo-1"), tools=self.tools)
        resp = agent.handle(_request("executor", "think about it"))
        self.assertEqual(resp.kind, MessageKind.RESULT)


class ReflectionTest(unittest.TestCase):
    def test_parses_default_report(self):
        agent = ReflectionAgent(EchoProvider("echo-1"))
        resp = agent.handle(_request("reflection", "goal", goal="g", result="r", trace="t"))
        self.assertIn("quality", resp.payload["report"])


class MemoryAgentTest(unittest.TestCase):
    def test_store_and_dedup(self):
        mem = LongTermMemory()
        agent = MemoryAgent(EchoProvider("echo-1"), long_term=mem)
        first = agent.handle(_request("memory", "The user likes tea", action="store"))
        self.assertTrue(first.payload["stored"])
        dup = agent.handle(_request("memory", "The user likes tea", action="store"))
        self.assertFalse(dup.payload["stored"])

    def test_record_event(self):
        mem = LongTermMemory()
        agent = MemoryAgent(EchoProvider("echo-1"), long_term=mem)
        resp = agent.handle(_request("memory", "user logged in", action="record_event"))
        self.assertTrue(resp.payload["stored"])
        self.assertEqual(len(mem.episodic), 1)


if __name__ == "__main__":
    unittest.main()
