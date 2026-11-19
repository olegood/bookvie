"""Story 12.3: a write tool call in flight when a real server is told to exit (AD-4, AD-21).

Settles ``deferred-work.md``'s Story 12.1 entry on a call still running when
the lifespan's session manager exits. A real uvicorn server, run by the CLI's
own ``_Server`` in a thread on a free port, serves ``create_app`` with an
``update_page`` tool that blocks after it has been entered. The test calls
it, asks the server to exit, and only then lets the call go on: shutdown
waits for the call, the agent gets its answer, the page is committed, and the
lifespan (with the session manager) and the ``bookvie.lock`` release come
after it. Runs with ``HOME`` set to a temporary folder (``conftest.py``).
"""

import asyncio
import json
import os
import socket
import threading
from pathlib import Path
from typing import Any

import httpx

from bookvie import cli, instance
from bookvie.agent import TOOLS, AgentTool
from bookvie.domain.clock import FakeClock
from bookvie.http.app import create_app
from bookvie.store import Store
from tests.agent_client import McpClient
from tests.builder import LibraryBuilder
from tests.helpers import TODAY

MAIN = "a0000000-0000-4000-8000-000000000001"
WAIT = 10
# How long the test watches that shutdown is still waiting: a bound on a
# negative check, not a pause the outcome depends on.
STILL_WAITING = 0.5


def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class _Lifespan:
    """The app as ASGI, noting when its lifespan's shutdown completes."""

    def __init__(self, app: Any, events: list[str]) -> None:
        self.app = app
        self.events = events

    async def __call__(self, scope: Any, receive: Any, send: Any) -> None:
        if scope["type"] != "lifespan":
            await self.app(scope, receive, send)
            return

        async def noting(message: dict[str, Any]) -> None:
            if message["type"] == "lifespan.shutdown.complete":
                self.events.append("lifespan exited")
            await send(message)

        await self.app(scope, receive, noting)


class _Server(cli._Server):
    """The CLI's server, signalling once it listens."""

    def __init__(self, config: Any, *, release: Any) -> None:
        super().__init__(config, release=release)
        self.listening = threading.Event()

    async def startup(self, sockets: Any = None) -> None:
        await super().startup(sockets=sockets)
        self.listening.set()


def test_shutdown_waits_for_a_write_tool_call_in_flight(tmp_path: Path) -> None:
    folder = tmp_path / "library"
    builder = LibraryBuilder()
    builder.book(id=MAIN, title="Designing Data-Intensive Applications", pages=616)
    builder.reading(MAIN, start_date="2026-10-01", current_page=120)
    builder.main(MAIN)
    builder.write(folder)

    events: list[str] = []
    entered, go_on = threading.Event(), threading.Event()
    (update_page,) = [tool for tool in TOOLS if tool.name == "update_page"]

    def blocking_run(state: Any, arguments: dict[str, Any]) -> Any:
        entered.set()
        assert go_on.wait(WAIT), "the test never let the call go on"
        answer = update_page.run(state, arguments)
        events.append("call answered")
        return answer

    tools = [
        AgentTool(update_page.name, update_page.description, update_page.model, blocking_run)
        if tool is update_page
        else tool
        for tool in TOOLS
    ]
    port = _free_port()
    assert instance.acquire_lock(folder, port) is not None
    app = create_app(
        folder / "no-static",
        data_dir=folder,
        port=port,
        store=Store.open(folder),
        clock=FakeClock(TODAY),
        tools=tools,
    )

    def release() -> None:
        # What cli.main releases: bookvie.lock, under the AD-4 write lock.
        with app.state.write_lock:
            instance.release_lock(folder, os.getpid())
        events.append("lock released")

    config = cli.uvicorn.Config(
        _Lifespan(app, events), host="127.0.0.1", port=port, log_config=None, lifespan="on"
    )
    server = _Server(config, release=release)
    serving = threading.Thread(target=lambda: asyncio.run(server.serve()), daemon=True)
    serving.start()
    assert server.listening.wait(WAIT), "the server never started"

    with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=WAIT) as http:
        client = McpClient(http, data_dir=folder)
        client.initialize()
        answers: list[dict[str, Any]] = []
        calling = threading.Thread(
            target=lambda: answers.append(
                client.call_tool("update_page", {"bookId": MAIN, "page": 212})
            ),
            daemon=True,
        )
        calling.start()
        assert entered.wait(WAIT), "the tool call never reached the tool"

        server.should_exit = True
        # Shutdown waits for the call: the server keeps running and nothing has exited.
        serving.join(STILL_WAITING)
        assert serving.is_alive()
        assert events == []
        assert (folder / instance.LOCK_NAME).exists()

        go_on.set()
        calling.join(WAIT)
        serving.join(WAIT)
        assert not calling.is_alive() and not serving.is_alive()

    # The agent got the tool's answer, and the page was committed.
    assert len(answers) == 1, answers
    assert answers[0].get("isError") is not True, answers[0]
    assert answers[0]["structuredContent"] == {"ok": True}
    stored = json.loads((folder / "library.json").read_text(encoding="utf-8"))
    (book,) = [book for book in stored["books"] if book["id"] == MAIN]
    assert book["readings"][-1]["currentPage"] == 212, book["readings"]
    # The lifespan (with the session manager) exited after the call, then the lock was released.
    assert events == ["call answered", "lifespan exited", "lock released"]
    assert not (folder / instance.LOCK_NAME).exists()
