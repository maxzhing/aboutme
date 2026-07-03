# `jarvis.config` — Layered configuration

`load_settings()` builds a `Settings` tree from three layers, highest wins:

1. dataclass defaults (`settings.py`)
2. YAML (`defaults.yaml`, or a path you pass)
3. `JARVIS_*` environment variables (`__` separates nesting)

```
JARVIS_LLM__PROVIDER=anthropic
JARVIS_LLM__MODEL=claude-fable-5
JARVIS_ORCHESTRATOR__MAX_RETRIES=3
```

PyYAML is optional — a small built-in parser handles the default file's subset
when it isn't installed, keeping the core dependency-free. Unknown keys raise
`ConfigError` so typos fail loudly.
