"""Quickstart: run JARVIS end-to-end with the offline Echo provider.

No API keys, no network — just::

    python examples/quickstart.py

Then edit ``jarvis/config/defaults.yaml`` (or set ``JARVIS_LLM__PROVIDER`` and
``JARVIS_LLM__MODEL``) to point at Claude, GPT, Ollama, etc.
"""

import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))


from jarvis.api import Jarvis


def main() -> None:
    jarvis = Jarvis()

    # Teach it something; this goes into long-term semantic memory.
    jarvis.remember("The user is building an AI operating system called JARVIS.")
    jarvis.remember("The user prefers concise, direct answers.")

    result = jarvis.ask("Please plan the next milestone for the JARVIS project.")

    print("STATUS:", result.status)
    print("\nANSWER:\n", result.answer)
    print("\nREASONING TRACE:")
    for entry in result.trace:
        print(f"  [{entry.phase}] (conf={entry.confidence:.2f}) {entry.detail}")

    print("\nTASK TREE:", result.tree.summary())
    print("MEMORY:", jarvis.memory.stats())


if __name__ == "__main__":
    main()
