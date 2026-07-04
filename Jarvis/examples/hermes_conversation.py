"""Talk to JARVIS through Hermes, the conversational front.

Hermes decides whether each utterance is small talk (answered directly) or real
work (delegated to the orchestrator), then replies in short, spoken-style
language. Run with the offline model::

    python examples/hermes_conversation.py

Point ``JARVIS_LLM__PROVIDER`` at a real model (Claude, Ollama, …) to see it
converse naturally instead of echoing.
"""

import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from jarvis.api import Jarvis


def main() -> None:
    jarvis = Jarvis()
    jarvis.remember("The user is launching a product next week.")

    turns = [
        "hey Hermes, what can you do?",   # small talk -> answered directly
        "plan my launch week",            # a task -> delegated to the swarm
        "summarize what we just decided",  # a task -> delegated
    ]
    for text in turns:
        reply = jarvis.converse(text)
        print(f"\n\U0001F464 you    : {text}")
        print(f"\U0001F5E3️  hermes : {reply.spoken}   [{reply.kind}]")
        if reply.run_result is not None:
            print(f"   └─ status: {reply.run_result.status}, "
                  f"tasks: {reply.run_result.tree.summary()['total']}")


if __name__ == "__main__":
    main()
