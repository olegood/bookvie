"""Injected time (AD-20).

``domain/`` reads "now" and "today" only through a :class:`Clock`; nothing
else in the layer calls ``datetime.now``, ``date.today`` or ``time.time``
(``tests/test_clock.py`` enforces it). Dates are local calendar days.
"""

from datetime import date, datetime, time
from typing import Protocol


class Clock(Protocol):
    def now(self) -> datetime:
        """The current local time, timezone-aware."""
        ...

    def today(self) -> date:
        """The current local calendar day."""
        ...


class SystemClock:
    """The machine's clock in its local timezone."""

    def now(self) -> datetime:
        return datetime.now().astimezone()

    def today(self) -> date:
        return self.now().date()


class FakeClock:
    """A fixed local day (``--fake-today``, tests); ``now`` is local noon on it."""

    def __init__(self, today: date) -> None:
        self._today = today

    def now(self) -> datetime:
        return datetime.combine(self._today, time(12)).astimezone()

    def today(self) -> date:
        return self._today
