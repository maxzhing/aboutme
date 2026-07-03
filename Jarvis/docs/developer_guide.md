# Developer Guide

How to extend JARVIS. Every extension point is an interface that already exists
in the core; you implement it and register it, without editing the core.

## Add an LLM provider

1. Subclass `jarvis.llm.base.LLMProvider`, implement `complete` (and optionally
   `stream` / `is_available`).
2. Register a factory:

```python
from jarvis.llm.registry import register_provider
from mypkg import GeminiProvider

register_provider("gemini", lambda cfg: GeminiProvider(model=cfg.model))
```

3. Select it: `JARVIS_LLM__PROVIDER=gemini`.

The base class provides `chat()` and token estimation; you only handle the wire
format. Keep the SDK import lazy (inside `__init__`) so importing your module
never requires the dependency to be installed.

## Add a tool

```python
from jarvis.tools.base import Tool, ToolContext

class WeatherTool(Tool):
    name = "weather"
    description = "Get the current weather for a city."
    input_schema = {"city": {"type": "string", "required": True}}
    permission = "net.http"          # caller must be granted this
    timeout_s = 10.0
    retries = 1

    def run(self, context: ToolContext, *, city: str) -> dict:
        ...   # return any JSON-serializable value; raise to signal failure
```

You get argument validation, permission checks, timeout, retry, and structured
logging for free — `invoke()` wraps `run()`. Register the instance in a
`ToolRegistry` (or add it to `default_registry`). See
[`examples/custom_tool.py`](../examples/custom_tool.py).

**Permissions** are plain strings (`fs.read`, `net.http`, `shell.exec`, …).
An agent grants tools its `config.permissions`; a tool without a matching grant
cannot run. Design new capabilities as new permission strings.

## Add an agent

```python
from jarvis.agents.base import Agent, AgentConfig

class TranslatorAgent(Agent):
    def __init__(self, provider, **kw):
        super().__init__(
            AgentConfig(name="translator", role="translate text",
                        prompt_name="translator"),   # prompts/library/translator.md
            provider, **kw,
        )

    def handle(self, message):
        system = self.render_prompt(text=message.content)
        out = self.ask_llm(system, message.content)
        return message.reply(out, confidence=0.8)
```

Create `jarvis/prompts/library/translator.md` with `${text}`. Wire the agent
into `Orchestrator` (or drive it directly with `AgentMessage`s).

## Add a prompt

Drop a `.md` file in `jarvis/prompts/library/` using `${var}` placeholders.
`name.md` is current; `name.v2.md` pins a version. Render with
`PromptLibrary().render("name", var=...)`. Missing required variables raise
`PromptError`, so prompts fail loudly, not silently.

## Configuration

Three layers, highest wins: dataclass defaults → YAML → `JARVIS_*` env vars
(`__` separates nesting, e.g. `JARVIS_ORCHESTRATOR__MAX_RETRIES=3`). Add a
field to the relevant dataclass in `jarvis/config/settings.py` and it is
overridable everywhere automatically.

## Testing conventions

- Use `unittest`; no third-party test deps.
- Use `EchoProvider` for deterministic LLM behaviour; subclass it to script
  specific responses (see `tests/test_orchestrator.py`).
- Point filesystem tools at a `tempfile.TemporaryDirectory`.
- Run: `python -m unittest discover -s tests -v`.

## House style

- Small modules, one responsibility each; no file should need scrolling to
  understand its shape.
- Type hints on public functions; dataclasses for value types.
- Log through `jarvis.core.get_logger`, never `print`.
- Raise a specific error from `jarvis.core.errors`; catch broadly only at
  boundaries.
