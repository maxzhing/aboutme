"""A safe arithmetic calculator tool.

Evaluating math with ``eval`` is a classic footgun. Instead we walk Python's
own AST and permit only a whitelist of numeric operations, so an expression can
never call a function, read a name, or import anything. This makes it a genuine
example of a *safe* tool rather than a convenient-but-dangerous one.
"""

from __future__ import annotations

import ast
import math
import operator

from jarvis.core.errors import ToolError
from jarvis.tools.base import Tool, ToolContext

_BIN_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}
_UNARY_OPS = {ast.UAdd: operator.pos, ast.USub: operator.neg}
_CONSTS = {"pi": math.pi, "e": math.e, "tau": math.tau}
_FUNCS = {
    "sqrt": math.sqrt,
    "abs": abs,
    "round": round,
    "log": math.log,
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "floor": math.floor,
    "ceil": math.ceil,
}


class CalculatorTool(Tool):
    name = "calculator"
    description = (
        "Evaluate an arithmetic expression. Supports + - * / // % **, "
        "parentheses, the constants pi/e/tau, and functions like sqrt, log, sin."
    )
    input_schema = {"expression": {"type": "string", "required": True}}
    permission = ""  # pure computation, no capability needed

    def run(self, context: ToolContext, *, expression: str) -> float:
        try:
            tree = ast.parse(expression, mode="eval")
        except SyntaxError as exc:
            raise ToolError(f"Invalid expression: {exc.msg}") from exc
        return self._eval(tree.body)

    def _eval(self, node: ast.AST):
        if isinstance(node, ast.Constant):
            if isinstance(node.value, (int, float)):
                return node.value
            raise ToolError("Only numeric constants are allowed")
        if isinstance(node, ast.BinOp) and type(node.op) in _BIN_OPS:
            return _BIN_OPS[type(node.op)](self._eval(node.left), self._eval(node.right))
        if isinstance(node, ast.UnaryOp) and type(node.op) in _UNARY_OPS:
            return _UNARY_OPS[type(node.op)](self._eval(node.operand))
        if isinstance(node, ast.Name) and node.id in _CONSTS:
            return _CONSTS[node.id]
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            fn = _FUNCS.get(node.func.id)
            if fn is None:
                raise ToolError(f"Function not allowed: {node.func.id}")
            return fn(*[self._eval(arg) for arg in node.args])
        raise ToolError(f"Unsupported expression element: {type(node).__name__}")
