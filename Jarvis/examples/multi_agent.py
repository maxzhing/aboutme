"""Driving individual agents directly and passing structured messages.

The orchestrator normally coordinates agents for you, but each agent is usable
on its own. This example runs the Planner, then hands one of its steps to the
Executor, then asks the Reflection agent to grade the outcome — the same
message-passing the orchestrator uses internally.
"""

import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))


from jarvis.agents import (
    AgentMessage,
    ExecutorAgent,
    MessageKind,
    PlannerAgent,
    ReflectionAgent,
)
from jarvis.llm.providers.echo import EchoProvider


def request(recipient: str, content: str, **payload) -> AgentMessage:
    return AgentMessage(
        sender="demo",
        recipient=recipient,
        kind=MessageKind.REQUEST,
        content=content,
        payload=payload,
    )


def main() -> None:
    provider = EchoProvider("echo-1")
    planner = PlannerAgent(provider)
    executor = ExecutorAgent(provider)
    reflection = ReflectionAgent(provider)

    plan = planner.handle(request("planner", "Please plan a product launch"))
    print("PLAN (confidence %.2f):" % plan.confidence)
    for step in plan.payload["steps"]:
        print("  -", step)

    first_step = plan.payload["steps"][0]
    done = executor.handle(request("executor", first_step))
    print("\nEXECUTED FIRST STEP:", done.content)

    review = reflection.handle(
        request("reflection", "launch", goal="Plan a product launch",
                result=done.content, trace="planned then executed one step")
    )
    print("\nREFLECTION quality:", review.payload["quality"])


if __name__ == "__main__":
    main()
