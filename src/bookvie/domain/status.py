from enum import Enum

from .errors import InvalidStatusTransition


class Status(str, Enum):
    NEW = "New"
    IN_PROGRESS = "In Progress"
    FINISHED = "Finished"
    ABANDONED = "Abandoned"

    @property
    def is_open(self) -> bool:
        return self in _OPEN

    def can_change_to(self, target: "Status") -> bool:
        return target in _TRANSITIONS[self]

    def ensure_can_change_to(self, target: "Status") -> None:
        if not self.can_change_to(target):
            raise InvalidStatusTransition(f"{self.value} -> {target.value} is not allowed")


_OPEN = frozenset({Status.NEW, Status.IN_PROGRESS})

_TRANSITIONS: dict[Status, frozenset[Status]] = {
    Status.NEW: frozenset({Status.IN_PROGRESS, Status.ABANDONED}),
    Status.IN_PROGRESS: frozenset({Status.FINISHED, Status.ABANDONED}),
    Status.FINISHED: frozenset(),
    Status.ABANDONED: frozenset({Status.IN_PROGRESS}),
}
