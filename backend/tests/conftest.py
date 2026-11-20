"""Shared test setup.

Every test runs with ``HOME`` pointing at a fresh temp folder, so a default
``--data-dir`` (``~/bookvie-data``) can never reach the real library, in this
process or in any subprocess that inherits the environment. uv derives its
cache and Python install dir from ``HOME``, so those are pinned to the real
ones first: tests that call ``uv`` keep working offline.

Local time is pinned to ``Europe/Madrid`` (AD-20) for this process and every
subprocess, so date tests mean the same thing on every machine; ``npm run
check:py`` sets the same ``TZ`` before pytest starts.

The agent tools (AD-21) are tested through ``mcp_client``: an MCP client on a
real app, its lifespan running, over a fresh temporary data folder.
``connect_mcp`` builds more of them (another folder, ``--dev``, extra tools).
"""

import os
import shutil
import subprocess
import time
from collections.abc import Callable, Iterator, Sequence
from contextlib import ExitStack
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from bookvie.domain.clock import FakeClock
from bookvie.http.app import create_app
from bookvie.store import Store
from tests.agent_client import McpClient
from tests.builder import LibraryBuilder
from tests.helpers import BASE_URL, TODAY

TEST_TZ = "Europe/Madrid"
os.environ["TZ"] = TEST_TZ
time.tzset()


def _uv_dir(*args: str) -> str | None:
    uv = shutil.which("uv")
    if uv is None:
        return None
    try:
        out = subprocess.run([uv, *args], capture_output=True, text=True, timeout=30)
    except OSError, subprocess.SubprocessError:
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


@pytest.fixture
def connect_mcp(tmp_path: Path) -> Iterator[Callable[..., McpClient]]:
    """Build an app and return an :class:`McpClient` on its ``/mcp``, lifespan running.

    ``connect_mcp(data_dir=..., dev=..., tools=..., cover_fetcher=...)``: the
    data folder defaults to ``<tmp_path>/library`` (opened, so a new one is
    created), today is :data:`tests.helpers.TODAY`, and ``tools``, when given,
    is passed to ``create_app`` as the tools to register (AD-21).
    ``cover_fetcher``, when given, is passed to ``create_app`` as the
    downloader ``add_book`` and ``edit_book`` fetch a ``coverUrl`` with
    (Story 12.5). Every app built is shut down when the test ends. The client
    initializes on its first call.
    """
    with ExitStack() as apps:

        def connect(
            *,
            data_dir: Path | None = None,
            dev: bool = False,
            tools: Sequence[Any] | None = None,
            static_dir: Path | None = None,
            cover_fetcher: Any = None,
        ) -> McpClient:
            folder = data_dir if data_dir is not None else tmp_path / "library"
            # As the CLI does before it opens the store (`ensure_writable`).
            folder.mkdir(parents=True, exist_ok=True)
            extra: dict[str, Any] = {} if tools is None else {"tools": tools}
            if cover_fetcher is not None:
                extra["cover_fetcher"] = cover_fetcher
            app = create_app(
                static_dir if static_dir is not None else folder / "no-static",
                data_dir=folder,
                dev=dev,
                store=Store.open(folder),
                clock=FakeClock(TODAY),
                **extra,
            )
            http = apps.enter_context(TestClient(app, base_url=BASE_URL))
            return McpClient(http, data_dir=folder)

        yield connect


@pytest.fixture
def mcp_client(connect_mcp: Callable[..., McpClient]) -> McpClient:
    """An MCP client on a real app over a fresh temporary data folder (AD-21)."""
    return connect_mcp()
