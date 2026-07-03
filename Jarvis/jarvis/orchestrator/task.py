"""The task tree.

Large goals decompose into a tree of :class:`Task` nodes. Each node carries the
scheduling metadata the spec calls for — priority, dependencies, estimated cost
and time, required tools/agents, confidence — and a status that advances as the
orchestrator runs it. The tree is a plain in-memory structure so it is easy to
inspect, serialize for the UI's workflow graph, and test.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional

from jarvis.core.types import new_id


class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"
    BLOCKED = "blocked"          # waiting on a dependency
    NEEDS_CLARIFICATION = "needs_clarification"


@dataclass
class Task:
    description: str
    id: str = field(default_factory=lambda: new_id("task"))
    parent_id: Optional[str] = None
    status: TaskStatus = TaskStatus.PENDING
    priority: int = 5                       # 1 (highest) .. 10 (lowest)
    depends_on: List[str] = field(default_factory=list)
    required_tools: List[str] = field(default_factory=list)
    required_agent: Optional[str] = None
    estimated_cost_usd: float = 0.0
    estimated_seconds: float = 0.0
    confidence: float = 0.0
    result: Optional[str] = None
    error: Optional[str] = None

    def to_dict(self) -> dict:
        data = dict(self.__dict__)
        data["status"] = self.status.value
        return data


class TaskTree:
    """A collection of tasks with parent/child and dependency relationships."""

    def __init__(self, root: Task) -> None:
        self._tasks: Dict[str, Task] = {}
        self.root_id = root.id
        self.add(root)

    def add(self, task: Task) -> Task:
        self._tasks[task.id] = task
        return task

    def add_child(self, parent_id: str, description: str, **kwargs) -> Task:
        if parent_id not in self._tasks:
            raise KeyError(f"Unknown parent task {parent_id!r}")
        child = Task(description=description, parent_id=parent_id, **kwargs)
        return self.add(child)

    def get(self, task_id: str) -> Task:
        return self._tasks[task_id]

    def children(self, task_id: str) -> List[Task]:
        return [t for t in self._tasks.values() if t.parent_id == task_id]

    def all(self) -> List[Task]:
        return list(self._tasks.values())

    @property
    def root(self) -> Task:
        return self._tasks[self.root_id]

    def ready_tasks(self) -> List[Task]:
        """Pending leaf tasks whose dependencies are all done, priority-ordered.

        The orchestrator pulls from here; a task is *ready* only when nothing it
        depends on is still outstanding, which is how dependency ordering and
        (potential) parallelism are expressed.
        """
        ready = []
        for task in self._tasks.values():
            if task.status != TaskStatus.PENDING:
                continue
            if self.children(task.id):  # only run leaves
                continue
            deps_done = all(
                self._tasks[d].status == TaskStatus.DONE
                for d in task.depends_on
                if d in self._tasks
            )
            if deps_done:
                ready.append(task)
        return sorted(ready, key=lambda t: t.priority)

    def is_complete(self) -> bool:
        return all(
            t.status in (TaskStatus.DONE, TaskStatus.FAILED)
            for t in self._tasks.values()
            if not self.children(t.id)
        )

    def summary(self) -> dict:
        counts: Dict[str, int] = {}
        for task in self._tasks.values():
            counts[task.status.value] = counts.get(task.status.value, 0) + 1
        return {"total": len(self._tasks), "by_status": counts}
