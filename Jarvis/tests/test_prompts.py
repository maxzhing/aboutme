import tempfile
import unittest
from pathlib import Path

from jarvis.prompts.template import PromptError, PromptLibrary, PromptTemplate


class PromptTest(unittest.TestCase):
    def test_variables_detected(self):
        tpl = PromptTemplate("t", "current", "Hello ${name}, goal is ${goal}.")
        self.assertEqual(tpl.variables, ["name", "goal"])

    def test_render_substitutes(self):
        tpl = PromptTemplate("t", "current", "Hi ${name}")
        self.assertEqual(tpl.render(name="Zoe"), "Hi Zoe")

    def test_missing_variable_raises(self):
        tpl = PromptTemplate("t", "current", "Hi ${name}")
        with self.assertRaises(PromptError):
            tpl.render()

    def test_library_loads_builtin_prompts(self):
        lib = PromptLibrary()
        names = lib.list_prompts()
        for expected in ("planner", "executor", "researcher", "reflection"):
            self.assertIn(expected, names)

    def test_library_render_and_versioning(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / "greet.md").write_text("Hello ${who}")
            (Path(d) / "greet.v2.md").write_text("Greetings ${who}")
            lib = PromptLibrary(d)
            self.assertEqual(lib.render("greet", who="A"), "Hello A")
            self.assertEqual(lib.render("greet", "v2", who="A"), "Greetings A")

    def test_missing_prompt_file(self):
        lib = PromptLibrary()
        with self.assertRaises(PromptError):
            lib.load("nonexistent")


if __name__ == "__main__":
    unittest.main()
