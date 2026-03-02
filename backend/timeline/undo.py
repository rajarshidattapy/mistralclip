from collections import defaultdict

from backend.timeline.model import Timeline


class UndoManager:
    def __init__(self, max_depth: int = 50) -> None:
        self.max_depth = max_depth
        self._stacks: dict[str, list[Timeline]] = defaultdict(list)

    def push(self, project_id: str, timeline: Timeline) -> None:
        stack = self._stacks[project_id]
        stack.append(timeline.model_copy(deep=True))
        if len(stack) > self.max_depth:
            stack.pop(0)

    def pop(self, project_id: str) -> Timeline | None:
        stack = self._stacks[project_id]
        if not stack:
            return None
        return stack.pop()

