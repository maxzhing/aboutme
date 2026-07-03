"""File-based prompt templates with variable injection and versioning.

Design rule from the spec: **no prompts inside Python code**. Every agent
loads its system prompt from a ``.md`` file in ``prompts/library``. Templates
use ``${var}`` placeholders (``string.Template`` syntax) so they never collide
with the curly braces common in JSON examples inside a prompt.

Versioning is filename-based: ``planner.md`` is the current version, and
``planner.v2.md`` pins a specific one. :meth:`PromptLibrary.render` picks the
unversioned file unless a version is requested.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from string import Template
from typing import Dict, List

from jarvis.core.errors import JarvisError


class PromptError(JarvisError):
    """Raised when a prompt is missing or a required variable is absent."""


_VAR_RE = re.compile(r"\$\{(\w+)\}")


@dataclass
class PromptTemplate:
    """A named, versioned template with declared variables."""

    name: str
    version: str
    body: str

    @property
    def variables(self) -> List[str]:
        """Every ``${var}`` referenced in the body, in order of first use."""
        seen: Dict[str, None] = {}
        for match in _VAR_RE.finditer(self.body):
            seen.setdefault(match.group(1), None)
        return list(seen)

    def render(self, **values: object) -> str:
        """Substitute variables. Missing required variables raise loudly."""
        required = set(self.variables)
        missing = required - set(values)
        if missing:
            raise PromptError(
                f"Prompt {self.name!r} missing variables: {sorted(missing)}"
            )
        # ``safe_substitute`` avoids KeyErrors on stray ``$`` in examples while we
        # enforce required-variable presence ourselves above.
        return Template(self.body).safe_substitute(
            {k: str(v) for k, v in values.items()}
        )


class PromptLibrary:
    """Loads and renders prompt files from a directory.

    ``library`` defaults to the ``library/`` folder shipped with the package,
    but a project can point it anywhere to override prompts without touching
    code — supporting the "dynamic injection / versioning / evaluation" goals.
    """

    _NAME_RE = re.compile(r"^(?P<name>[a-zA-Z0-9_\-]+?)(?:\.(?P<version>v\d+))?\.md$")

    def __init__(self, directory: str | Path | None = None) -> None:
        self.directory = Path(directory) if directory else Path(__file__).with_name("library")

    def _resolve(self, name: str, version: str | None) -> Path:
        filename = f"{name}.md" if version is None else f"{name}.{version}.md"
        path = self.directory / filename
        if not path.exists():
            raise PromptError(f"Prompt file not found: {path}")
        return path

    def load(self, name: str, version: str | None = None) -> PromptTemplate:
        path = self._resolve(name, version)
        match = self._NAME_RE.match(path.name)
        resolved_version = (match.group("version") if match else None) or "current"
        return PromptTemplate(name=name, version=resolved_version, body=path.read_text("utf-8"))

    def render(self, name: str, version: str | None = None, **values: object) -> str:
        return self.load(name, version).render(**values)

    def list_prompts(self) -> List[str]:
        if not self.directory.exists():
            return []
        names = set()
        for file in self.directory.glob("*.md"):
            match = self._NAME_RE.match(file.name)
            if match:
                names.add(match.group("name"))
        return sorted(names)
