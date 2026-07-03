# `jarvis.llm` — Model-agnostic LLM layer

One interface, many backends. Agents depend on `LLMProvider`; the concrete
model is chosen from config, never imported directly.

- **`base.py`** — `LLMProvider`, `CompletionRequest/Response`, token estimation.
- **`registry.py`** — name → factory; `build_provider(config)` constructs and
  verifies the selected backend.
- **`providers/`** — `echo` (offline default, deterministic), `anthropic`,
  `openai` (also OpenRouter/DeepSeek/Mistral via `base_url`), `ollama` (local).

Add one: implement `LLMProvider`, then `register_provider("name", factory)`.
Provider SDK imports are lazy, so importing this package never requires them.

```python
from jarvis.config import load_settings
from jarvis.llm import build_provider
provider = build_provider(load_settings().llm)
```
