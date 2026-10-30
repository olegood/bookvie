"""The injected Clock (AD-20): local days, DST, and no other time source in domain/."""

import ast
import time
from datetime import date, datetime, timedelta
from pathlib import Path

import pytest

from bookvie.domain import Clock, FakeClock, SystemClock
from tests.conftest import TEST_TZ

DOMAIN = Path(__file__).resolve().parents[1] / "bookvie" / "domain"

# The last Sundays of March and October 2026: Madrid switches to and from CEST.
DST_DAYS = [date(2026, 3, 29), date(2026, 10, 25)]


def test_tests_run_in_madrid_time() -> None:
    assert TEST_TZ == "Europe/Madrid"
    assert set(time.tzname) == {"CET", "CEST"}
    winter = datetime(2026, 1, 15, 12).astimezone()
    summer = datetime(2026, 7, 15, 12).astimezone()
    assert winter.utcoffset() == timedelta(hours=1)
    assert summer.utcoffset() == timedelta(hours=2)


@pytest.mark.parametrize("day", [date(2026, 10, 30), date(2026, 1, 1), *DST_DAYS])
def test_fake_clock_is_local_noon_on_its_day(day: date) -> None:
    clock: Clock = FakeClock(day)
    assert clock.today() == day
    now = clock.now()
    assert now.tzinfo is not None
    assert now.date() == day
    assert (now.hour, now.minute) == (12, 0)


@pytest.mark.parametrize("day", DST_DAYS)
def test_dst_days_keep_the_local_date(day: date) -> None:
    now = FakeClock(day).now()
    assert now.date() == day
    # Every wall-clock hour 0-23 on that day, including the skipped 02:00 in March,
    # resolves to a time on that same local date.
    for hour in range(24):
        assert datetime(day.year, day.month, day.day, hour).astimezone().date() == day
    before, after = (datetime.combine(day, datetime.min.time()) + timedelta(hours=h) for h in (1, 4))
    assert before.astimezone().utcoffset() != after.astimezone().utcoffset()


def test_system_clock_is_aware_and_local() -> None:
    clock: Clock = SystemClock()
    now = clock.now()
    assert now.tzinfo is not None
    assert abs(now - datetime.now().astimezone()) < timedelta(seconds=5)
    assert clock.today() in (now.date(), clock.now().date())


# --- domain/ reads time only through Clock --------------------------------------

_FORBIDDEN = {
    ("datetime", "now"),
    ("datetime", "utcnow"),
    ("datetime", "today"),
    ("date", "today"),
    ("time", "time"),
}


def _time_reads(source: str) -> list[str]:
    found = []
    for node in ast.walk(ast.parse(source)):
        if isinstance(node, ast.Attribute):
            owner = node.value
            name = owner.id if isinstance(owner, ast.Name) else getattr(owner, "attr", None)
            if (name, node.attr) in _FORBIDDEN:
                found.append(f"{name}.{node.attr}")
        if isinstance(node, ast.ImportFrom) and node.module in ("time", "datetime"):
            for alias in node.names:
                if (node.module, alias.name) in _FORBIDDEN:
                    found.append(f"from {node.module} import {alias.name}")
    return found


@pytest.mark.parametrize(
    "path",
    sorted(p for p in DOMAIN.rglob("*.py") if p.name != "clock.py"),
    ids=lambda p: p.name,
)
def test_domain_reads_time_only_through_clock(path: Path) -> None:
    assert _time_reads(path.read_text(encoding="utf-8")) == []


def test_time_scanner_catches_reads() -> None:
    source = (
        "import datetime, time\nfrom time import time as t\n"
        "a = datetime.datetime.now()\nb = date.today()\nc = time.time()\nd = datetime.utcnow()\n"
        "e = datetime.today()\n"
    )
    assert sorted(_time_reads(source)) == sorted(
        [
            "from time import time",
            "datetime.now",
            "date.today",
            "time.time",
            "datetime.utcnow",
            "datetime.today",
        ]
    )
