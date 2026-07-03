# `jarvis.tools` — Tool framework

Every action JARVIS can take is a `Tool`. Authors implement `run`; the
framework's `invoke` adds schema validation, permission checks, timeout, retry,
and structured logging.

- **`base.py`** — `Tool`, `ToolContext`, `ToolResult`.
- **`registry.py`** — `ToolRegistry` (an agent's allowed toolset).
- **`builtins/`** — sandboxed filesystem, safe AST calculator, HTTP GET,
  guarded shell (off by default). `default_registry(config)` assembles them.

Permissions are strings (`fs.read`, `net.http`, `shell.exec`). A tool runs only
if the caller's `ToolContext` was granted its `permission`. Filesystem tools are
confined to a workspace root; the calculator never uses `eval`.

See [`examples/custom_tool.py`](../../examples/custom_tool.py).
