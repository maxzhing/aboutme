import tempfile
import unittest

from jarvis.core.errors import ToolPermissionDenied, ToolValidationError
from jarvis.config.settings import ToolsConfig
from jarvis.tools.base import Tool, ToolContext
from jarvis.tools.builtins import default_registry
from jarvis.tools.builtins.calculator import CalculatorTool


class _SlowTool(Tool):
    name = "slow"
    description = "sleeps"
    timeout_s = 0.05

    def run(self, context, **kwargs):
        import time

        time.sleep(1.0)
        return "done"


class _FlakyTool(Tool):
    name = "flaky"
    description = "fails once then succeeds"
    retries = 1

    def __init__(self):
        self.calls = 0

    def run(self, context, **kwargs):
        self.calls += 1
        if self.calls == 1:
            raise RuntimeError("transient")
        return "ok"


class ToolTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.registry = default_registry(ToolsConfig(workspace_dir=self.tmp))
        self.ctx = ToolContext(granted_permissions=frozenset({"fs.read", "fs.write"}))

    def test_calculator_safe_eval(self):
        result = CalculatorTool().invoke(expression="2 ** 10 + sqrt(9)")
        self.assertTrue(result.ok)
        self.assertEqual(result.output, 1027.0)

    def test_calculator_rejects_names(self):
        result = CalculatorTool().invoke(expression="__import__('os')")
        self.assertFalse(result.ok)

    def test_validation_missing_arg(self):
        with self.assertRaises(ToolValidationError):
            self.registry.invoke("write_file", self.ctx, path="x")  # no content

    def test_permission_enforced(self):
        with self.assertRaises(ToolPermissionDenied):
            self.registry.invoke("write_file", ToolContext(), path="a", content="b")

    def test_write_read_roundtrip(self):
        self.registry.invoke("write_file", self.ctx, path="dir/f.txt", content="hi")
        result = self.registry.invoke("read_file", self.ctx, path="dir/f.txt")
        self.assertEqual(result.output, "hi")

    def test_sandbox_escape_blocked(self):
        result = self.registry.invoke("read_file", self.ctx, path="../../../etc/passwd")
        self.assertFalse(result.ok)
        self.assertIn("escapes", result.error)

    def test_timeout(self):
        result = _SlowTool().invoke()
        self.assertFalse(result.ok)
        self.assertIn("exceeded", result.error)

    def test_retry_recovers(self):
        tool = _FlakyTool()
        result = tool.invoke()
        self.assertTrue(result.ok)
        self.assertEqual(result.attempts, 2)


if __name__ == "__main__":
    unittest.main()
