"""JARVIS v2 — a modular, model-agnostic autonomous assistant framework.

Public entry points live in :mod:`jarvis.api`; the subsystems (``llm``,
``tools``, ``memory``, ``agents``, ``orchestrator``) are independently usable.
"""

from jarvis.version import __version__

__all__ = ["__version__"]
