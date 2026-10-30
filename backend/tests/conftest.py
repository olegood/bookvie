"""Shared test setup.

Every test runs with ``HOME`` pointing at a fresh temp folder, so a default
``--data-dir`` (``~/bookvie-data``) can never reach the real library, in this
process or in any subprocess that inherits the environment. uv derives its
cache and Python install dir from ``HOME``, so those are pinned to the real
ones first: tests that call ``uv`` keep working offline.

Local time is pinned to ``Europe/Madrid`` (AD-20) for this process and every
subprocess, so date tests mean the same thing on every machine; ``npm run
check:py`` sets the same ``TZ`` before pytest starts.
"""

import os
import shutil
import subprocess
import time
from pathlib import Path

import pytest

from tests.builder import LibraryBuilder

TEST_TZ = "Europe/Madrid"
os.environ["TZ"] = TEST_TZ
time.tzset()


def _uv_dir(*args: str) -> str | None:
    uv = shutil.which("uv")
    if uv is None:
        return None
    try:
        out = subprocess.run([uv, *args], capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.SubprocessError):
        return None
    if out.returncode != 0:
        return None
    return out.stdout.strip() or None


@pytest.fixture(scope="session")
def _real_uv_dirs() -> dict[str, str]:
    dirs: dict[str, str] = {}
    for var, args in (
        ("UV_CACHE_DIR", ("cache", "dir")),
        ("UV_PYTHON_INSTALL_DIR", ("python", "dir")),
    ):
        value = os.environ.get(var) or _uv_dir(*args)
        if value:
            dirs[var] = value
    return dirs


@pytest.fixture(autouse=True)
def _isolated_home(
    tmp_path_factory: pytest.TempPathFactory,
    monkeypatch: pytest.MonkeyPatch,
    _real_uv_dirs: dict[str, str],
) -> Path:
    for var, value in _real_uv_dirs.items():
        monkeypatch.setenv(var, value)
    home = tmp_path_factory.mktemp("home")
    monkeypatch.setenv("HOME", str(home))
    assert Path("~").expanduser() == home
    return home


@pytest.fixture
def library_builder() -> LibraryBuilder:
    """A fresh :class:`tests.builder.LibraryBuilder` (TC-1)."""
    return LibraryBuilder()
