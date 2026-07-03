"""Short-term / working memory.

A bounded sliding window of the recent conversation plus a scratchpad the
reasoning loop uses for intermediate notes. This is deliberately simple and
non-persistent — it is the "RAM" of the assistant, distinct from the durable
long-term store.
"""

from __future__ import annotations

from collections import deque
from typing import Deque, Dict, List

from jarvis.core.types import Message, Role


class WorkingMemory:
    def __init__(self, max_messages: int = 40) -> None:
        self.max_messages = max_messages
        self._messages: Deque[Message] = deque(maxlen=max_messages)
        self._scratchpad: Dict[str, str] = {}

    # Conversation window ------------------------------------------------- #

    def add(self, message: Message) -> None:
        self._messages.append(message)

    def add_user(self, text: str) -> None:
        self.add(Message(Role.USER, text))

    def add_assistant(self, text: str) -> None:
        self.add(Message(Role.ASSISTANT, text))

    def history(self) -> List[Message]:
        return list(self._messages)

    def last_user(self) -> str:
        for message in reversed(self._messages):
            if message.role == Role.USER:
                return message.content
        return ""

    # Reasoning scratchpad ------------------------------------------------ #

    def note(self, key: str, value: str) -> None:
        """Record a transient note the reasoning loop can read back later."""
        self._scratchpad[key] = value

    def recall(self, key: str, default: str = "") -> str:
        return self._scratchpad.get(key, default)

    def scratchpad(self) -> Dict[str, str]:
        return dict(self._scratchpad)

    def clear(self) -> None:
        self._messages.clear()
        self._scratchpad.clear()

    def __len__(self) -> int:
        return len(self._messages)
