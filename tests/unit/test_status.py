import pytest

from bookvie.domain.status import Status


@pytest.mark.parametrize(
    "status,target",
    [
        (Status.NEW, Status.IN_PROGRESS),
        (Status.NEW, Status.ABANDONED),
        (Status.IN_PROGRESS, Status.FINISHED),
        (Status.IN_PROGRESS, Status.ABANDONED),
        (Status.ABANDONED, Status.IN_PROGRESS),
    ]
)
def test_can_change_to(status: Status, target: Status):
    assert status.can_change_to(target)
