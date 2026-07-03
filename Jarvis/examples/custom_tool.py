"""Extending JARVIS: register a custom tool and let an agent use it.

Shows the whole tool contract in ~30 lines: subclass ``Tool``, declare a
schema and permission, implement ``run``, register it, and invoke it through
the framework (which validates args, checks permissions, times out, retries,
and logs — you write none of that).
"""

import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))


from jarvis.tools.base import Tool, ToolContext
from jarvis.tools.registry import ToolRegistry


class ReverseTool(Tool):
    name = "reverse"
    description = "Reverse a string."
    input_schema = {"text": {"type": "string", "required": True}}
    permission = ""  # pure function, no capability required

    def run(self, context: ToolContext, *, text: str) -> str:
        return text[::-1]


def main() -> None:
    registry = ToolRegistry([ReverseTool()])
    result = registry.invoke("reverse", text="JARVIS")
    print("ok:", result.ok, "output:", result.output)

    # Validation is automatic: a missing/extra arg fails before ``run`` is called.
    bad = None
    try:
        registry.invoke("reverse", wrong="x")
    except Exception as exc:  # ToolValidationError
        bad = type(exc).__name__
    print("validation caught:", bad)


if __name__ == "__main__":
    main()
