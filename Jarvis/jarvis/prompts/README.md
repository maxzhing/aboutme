# `jarvis.prompts` — File-based prompt templates

Prompts live as `.md` files in `library/`, never inside Python. Templates use
`${var}` placeholders (`string.Template` syntax, so JSON braces in a prompt are
safe).

- **`template.py`** — `PromptTemplate` (render + declared variables) and
  `PromptLibrary` (load / render / list from a directory).
- **`library/`** — `planner`, `executor`, `researcher`, `reflection`,
  `executive`.

Versioning is filename-based: `planner.md` is current, `planner.v2.md` pins a
version. Missing required variables raise `PromptError`. Point a `PromptLibrary`
at your own directory to override prompts without touching code.
