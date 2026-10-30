"""CLI flags, data folder creation, browser opening and the instance lock."""

import asyncio
import json
import os
import socket
import threading
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from bookvie import cli, instance
from bookvie.instance import LOCK_NAME

REAL_BIND = instance.bind_socket


class FakeServer:
    instances: list["FakeServer"] = []

    def __init__(self, config, *, release) -> None:
        self.config = config
        self.release = release
        self.started = False
        self.should_exit = False
        self.sockets = None
        self.lock_during_run: dict | None = None
        FakeServer.instances.append(self)

    def run(self, sockets=None) -> None:
        self.sockets = sockets
        self.started = True
        lock = Path(self.config.app.state.data_dir_for_tests) / LOCK_NAME
        self.lock_during_run = json.loads(lock.read_text())


@pytest.fixture(autouse=True)
def ephemeral_bind(monkeypatch: pytest.MonkeyPatch) -> None:
    """Never bind the real requested port; the conflict tests opt out."""
    monkeypatch.setattr(cli.instance, "bind_socket", lambda port: REAL_BIND(0))


@pytest.fixture(autouse=True)
def expose_data_dir(monkeypatch: pytest.MonkeyPatch) -> None:
    real = cli.create_app

    def create_app(static_dir, *, data_dir, port, dev, store=None):
        app = real(static_dir, data_dir=data_dir, port=port, dev=dev, store=store)
        app.state.data_dir_for_tests = data_dir
        return app

    monkeypatch.setattr(cli, "create_app", create_app)


@pytest.fixture
def fake_server(monkeypatch: pytest.MonkeyPatch) -> type[FakeServer]:
    FakeServer.instances = []
    monkeypatch.setattr(cli, "_Server", FakeServer)
    return FakeServer


@pytest.fixture
def opened(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    urls: list[str] = []
    monkeypatch.setattr(cli.webbrowser, "open", urls.append)
    return urls


def test_defaults(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("HOME", str(tmp_path))
    args = cli.parse_args([])
    assert args.data_dir == (tmp_path / "bookvie-data").resolve()
    assert args.port == 8765
    assert args.no_browser is False
    assert args.dev is False


@pytest.mark.parametrize("port", ["0", "-1", "65536", "99999999999999999999"])
def test_port_out_of_range_is_rejected(port: str, capsys: pytest.CaptureFixture[str]) -> None:
    with pytest.raises(SystemExit) as exc:
        cli.parse_args(["--port", port])
    assert exc.value.code == 2
    assert "--port must be between 1 and 65535" in capsys.readouterr().err


def test_flags(tmp_path: Path) -> None:
    args = cli.parse_args(
        ["--data-dir", str(tmp_path / "d"), "--port", "8799", "--no-browser", "--dev"]
    )
    assert args.data_dir == (tmp_path / "d").resolve()
    assert args.port == 8799
    assert args.no_browser is True
    assert args.dev is True


def test_data_dir_tilde_is_expanded(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("HOME", str(tmp_path))
    assert cli.parse_args(["--data-dir", "~/x"]).data_dir == (tmp_path / "x").resolve()


def test_start_creates_data_dir_and_opens_browser(
    tmp_path: Path, fake_server: type[FakeServer], opened: list[str]
) -> None:
    data_dir = tmp_path / "a" / "b" / "data"
    assert cli.main(["--data-dir", str(data_dir)]) == 0
    assert data_dir.is_dir()
    (server,) = fake_server.instances
    assert server.config.host == "127.0.0.1"
    assert server.config.port == 8765
    assert opened == ["http://127.0.0.1:8765/"]


def test_existing_data_dir_is_kept(
    tmp_path: Path, fake_server: type[FakeServer], opened: list[str]
) -> None:
    (tmp_path / "keep.txt").write_text("x")
    cli.main(["--data-dir", str(tmp_path), "--no-browser"])
    assert (tmp_path / "keep.txt").read_text() == "x"


def test_no_browser_skips_browser(
    tmp_path: Path, fake_server: type[FakeServer], opened: list[str]
) -> None:
    cli.main(["--data-dir", str(tmp_path / "d"), "--no-browser", "--port", "8799"])
    assert fake_server.instances[0].config.port == 8799
    assert opened == []


def test_browser_not_opened_when_server_never_starts(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, opened: list[str]
) -> None:
    class FailingServer(FakeServer):
        def run(self, sockets=None) -> None:
            self.should_exit = True

    monkeypatch.setattr(cli, "_Server", FailingServer)
    cli.main(["--data-dir", str(tmp_path / "d")])
    assert opened == []


def test_start_writes_nothing_to_stdout(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
    fake_server: type[FakeServer],
    opened: list[str],
) -> None:
    data_dir = tmp_path / "d"
    cli.main(["--data-dir", str(data_dir), "--no-browser", "--port", "8799"])
    captured = capsys.readouterr()
    assert captured.out == ""
    assert f"serving {data_dir.resolve()} at http://127.0.0.1:8799/" in captured.err


def test_logs_go_to_stderr() -> None:
    handlers = cli._log_config()["handlers"]
    assert handlers
    assert all(h["stream"] == "ext://sys.stderr" for h in handlers.values())


def test_main_serves_packaged_spa(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    fake_server: type[FakeServer],
    opened: list[str],
) -> None:
    static = tmp_path / "static"
    static.mkdir()
    (static / "index.html").write_text("<p>packaged spa</p>")
    monkeypatch.setattr(cli, "STATIC_DIR", static)
    cli.main(["--data-dir", str(tmp_path / "d"), "--no-browser"])
    (server,) = fake_server.instances
    response = TestClient(server.config.app, base_url="http://127.0.0.1:8765").get("/")
    assert response.status_code == 200
    assert response.text == "<p>packaged spa</p>"


# --- Story 1.2: one safe instance -----------------------------------------


def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _write_lock(data_dir: Path, pid: int, port: int, *, age: float = 0.0) -> None:
    data_dir.mkdir(parents=True, exist_ok=True)
    path = data_dir / LOCK_NAME
    path.write_text(json.dumps({"pid": pid, "port": port}))
    if age:
        import time

        stamp = time.time() - age
        os.utime(path, (stamp, stamp))


def test_lock_holds_pid_and_port_while_serving_and_is_removed_after(
    tmp_path: Path, fake_server: type[FakeServer], opened: list[str]
) -> None:
    data_dir = tmp_path / "d"
    assert cli.main(["--data-dir", str(data_dir), "--no-browser", "--port", "8799"]) == 0
    (server,) = fake_server.instances
    assert server.lock_during_run == {"pid": os.getpid(), "port": 8799}
    assert not (data_dir / LOCK_NAME).exists()


def test_server_runs_on_pre_bound_loopback_socket(
    tmp_path: Path, fake_server: type[FakeServer], opened: list[str]
) -> None:
    cli.main(["--data-dir", str(tmp_path / "d"), "--no-browser"])
    (server,) = fake_server.instances
    (sock,) = server.sockets
    assert sock.family == socket.AF_INET
    assert sock.fileno() == -1  # closed once the server is done


def test_app_gets_data_dir_port_and_dev(
    tmp_path: Path, fake_server: type[FakeServer], opened: list[str]
) -> None:
    data_dir = tmp_path / "d"
    cli.main(["--data-dir", str(data_dir), "--no-browser", "--port", "8799", "--dev"])
    app = fake_server.instances[0].config.app
    client = TestClient(app, base_url="http://127.0.0.1:8799")
    response = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert response.json() == {
        "app": "bookvie",
        "dataDir": str(data_dir.resolve()),
        "pid": os.getpid(),
    }


def test_app_rejects_dev_origin_without_dev(
    tmp_path: Path, fake_server: type[FakeServer], opened: list[str]
) -> None:
    cli.main(["--data-dir", str(tmp_path / "d"), "--no-browser", "--port", "8799"])
    app = fake_server.instances[0].config.app
    client = TestClient(app, base_url="http://127.0.0.1:8799")
    response = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert response.status_code == 403


def test_live_lock_opens_recorded_url_without_serving(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    fake_server: type[FakeServer],
    opened: list[str],
) -> None:
    data_dir = tmp_path / "d"
    _write_lock(data_dir, os.getpid(), 8111, age=60)
    monkeypatch.setattr(instance, "probe_health", lambda port, timeout=0.5: str(data_dir))
    assert cli.main(["--data-dir", str(data_dir), "--port", "8799"]) == 0
    assert fake_server.instances == []
    assert opened == ["http://127.0.0.1:8111/"]
    assert json.loads((data_dir / LOCK_NAME).read_text()) == {"pid": os.getpid(), "port": 8111}


def test_live_lock_with_no_browser_prints_url(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    fake_server: type[FakeServer],
    opened: list[str],
) -> None:
    data_dir = tmp_path / "d"
    _write_lock(data_dir, os.getpid(), 8111, age=60)
    monkeypatch.setattr(instance, "probe_health", lambda port, timeout=0.5: str(data_dir))
    assert cli.main(["--data-dir", str(data_dir), "--no-browser"]) == 0
    captured = capsys.readouterr()
    assert captured.out == ""
    assert "http://127.0.0.1:8111/" in captured.err
    assert opened == []
    assert fake_server.instances == []


def test_stale_lock_is_taken_over_and_served(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    fake_server: type[FakeServer],
    opened: list[str],
) -> None:
    data_dir = tmp_path / "d"
    _write_lock(data_dir, os.getpid(), 8111, age=60)
    monkeypatch.setattr(instance, "probe_health", lambda port, timeout=0.5: None)
    assert cli.main(["--data-dir", str(data_dir), "--no-browser", "--port", "8799"]) == 0
    (server,) = fake_server.instances
    assert server.lock_during_run == {"pid": os.getpid(), "port": 8799}


def test_starting_lock_without_answer_exits_1(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    fake_server: type[FakeServer],
    opened: list[str],
) -> None:
    data_dir = tmp_path / "d"
    _write_lock(data_dir, os.getpid(), 8111)
    monkeypatch.setattr(instance, "STARTING_SECONDS", 0.2)
    monkeypatch.setattr(instance, "POLL_SECONDS", 0.02)
    monkeypatch.setattr(instance, "probe_health", lambda port, timeout=0.5: None)
    assert cli.main(["--data-dir", str(data_dir)]) == 1
    assert "bookvie is starting in another window; try again." in capsys.readouterr().err
    assert fake_server.instances == []
    assert opened == []
    assert (data_dir / LOCK_NAME).exists()


def test_port_held_by_other_program_exits_1(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    fake_server: type[FakeServer],
    opened: list[str],
) -> None:
    """FND-API-009: a real non-bookvie listener holds the port."""
    monkeypatch.setattr(cli.instance, "bind_socket", REAL_BIND)
    holder = socket.socket()
    holder.bind(("127.0.0.1", 0))
    holder.listen()
    port = holder.getsockname()[1]
    data_dir = tmp_path / "d"
    try:
        assert cli.main(["--data-dir", str(data_dir), "--port", str(port)]) == 1
    finally:
        holder.close()
    err = capsys.readouterr().err
    assert f"port {port}" in err
    assert "--port" in err
    assert fake_server.instances == []
    assert opened == []
    assert not (data_dir / LOCK_NAME).exists()


def test_port_held_by_bookvie_for_other_folder_exits_1(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    fake_server: type[FakeServer],
    opened: list[str],
) -> None:
    monkeypatch.setattr(cli.instance, "bind_socket", REAL_BIND)
    other = tmp_path / "other"
    monkeypatch.setattr(instance, "probe_health", lambda port, timeout=0.5: str(other))
    holder = REAL_BIND(0)
    port = holder.getsockname()[1]
    data_dir = tmp_path / "d"
    try:
        assert cli.main(["--data-dir", str(data_dir), "--port", str(port)]) == 1
    finally:
        holder.close()
    err = capsys.readouterr().err
    assert f"bookvie is already running for {other}" in err
    assert fake_server.instances == []
    assert not (data_dir / LOCK_NAME).exists()


def test_port_held_by_bookvie_for_same_folder_opens_it(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    fake_server: type[FakeServer],
    opened: list[str],
) -> None:
    monkeypatch.setattr(cli.instance, "bind_socket", REAL_BIND)
    data_dir = tmp_path / "d"
    monkeypatch.setattr(instance, "probe_health", lambda port, timeout=0.5: str(data_dir))
    monkeypatch.setattr(instance, "probe_pid", lambda port, timeout=0.5: None)
    holder = REAL_BIND(0)
    port = holder.getsockname()[1]
    try:
        assert cli.main(["--data-dir", str(data_dir), "--port", str(port)]) == 0
    finally:
        holder.close()
    assert f"bookvie is already running, opening http://127.0.0.1:{port}/" in capsys.readouterr().err
    assert opened == [f"http://127.0.0.1:{port}/"]
    assert fake_server.instances == []
    assert not (data_dir / LOCK_NAME).exists()


def test_port_held_by_bookvie_for_same_folder_gets_its_lock_back(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    fake_server: type[FakeServer],
    opened: list[str],
) -> None:
    """This launch took over a slow server's lock; the lock must name it again."""
    monkeypatch.setattr(cli.instance, "bind_socket", REAL_BIND)
    data_dir = tmp_path / "d"
    running = os.getppid()
    monkeypatch.setattr(instance, "probe_health", lambda port, timeout=0.5: str(data_dir))
    monkeypatch.setattr(instance, "probe_pid", lambda port, timeout=0.5: running)
    holder = REAL_BIND(0)
    port = holder.getsockname()[1]
    try:
        assert cli.main(["--data-dir", str(data_dir), "--port", str(port), "--no-browser"]) == 0
    finally:
        holder.close()
    assert fake_server.instances == []
    assert json.loads((data_dir / LOCK_NAME).read_text()) == {"pid": running, "port": port}


def test_losing_bind_does_not_sweep_or_create_anything(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    fake_server: type[FakeServer],
    opened: list[str],
) -> None:
    """The store opens only after the bind: a launch that loses it touches nothing."""
    monkeypatch.setattr(cli.instance, "bind_socket", REAL_BIND)
    data_dir = tmp_path / "d"
    (data_dir / ".staging").mkdir(parents=True)
    (data_dir / ".staging" / "live.zip").write_text("restore in flight")
    (data_dir / "library.json.tmpLIVE").write_text("commit in flight")
    monkeypatch.setattr(instance, "probe_health", lambda port, timeout=0.5: str(data_dir))
    monkeypatch.setattr(instance, "probe_pid", lambda port, timeout=0.5: os.getppid())
    holder = REAL_BIND(0)
    port = holder.getsockname()[1]
    try:
        assert cli.main(["--data-dir", str(data_dir), "--port", str(port), "--no-browser"]) == 0
    finally:
        holder.close()
    assert fake_server.instances == []
    assert (data_dir / "library.json.tmpLIVE").read_text() == "commit in flight"
    assert (data_dir / ".staging" / "live.zip").read_text() == "restore in flight"
    assert not (data_dir / "library.json").exists()
    assert not (data_dir / "covers").exists()


def test_main_release_waits_for_write_lock(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, opened: list[str]
) -> None:
    data_dir = tmp_path / "d"
    checks: dict[str, bool] = {}

    class Releasing(FakeServer):
        def run(self, sockets=None) -> None:
            write_lock = self.config.app.state.write_lock
            write_lock.acquire()
            thread = threading.Thread(target=self.release)
            thread.start()
            thread.join(0.3)
            checks["blocked"] = thread.is_alive() and (data_dir / LOCK_NAME).exists()
            write_lock.release()
            thread.join(5)
            checks["finished"] = not thread.is_alive()
            checks["removed"] = not (data_dir / LOCK_NAME).exists()

    monkeypatch.setattr(cli, "_Server", Releasing)
    assert cli.main(["--data-dir", str(data_dir), "--no-browser"]) == 0
    assert checks == {"blocked": True, "finished": True, "removed": True}


def test_lock_released_when_server_raises(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, opened: list[str]
) -> None:
    class Boom(FakeServer):
        def run(self, sockets=None) -> None:
            raise RuntimeError("boom")

    monkeypatch.setattr(cli, "_Server", Boom)
    data_dir = tmp_path / "d"
    with pytest.raises(RuntimeError):
        cli.main(["--data-dir", str(data_dir), "--no-browser"])
    assert not (data_dir / LOCK_NAME).exists()


def test_release_keeps_a_lock_that_names_another_pid(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, opened: list[str]
) -> None:
    data_dir = tmp_path / "d"

    class Replaced(FakeServer):
        def run(self, sockets=None) -> None:
            (data_dir / LOCK_NAME).write_text(json.dumps({"pid": 4242, "port": 1}))

    monkeypatch.setattr(cli, "_Server", Replaced)
    cli.main(["--data-dir", str(data_dir), "--no-browser"])
    assert json.loads((data_dir / LOCK_NAME).read_text()) == {"pid": 4242, "port": 1}


def test_two_mains_racing_create_one_lock_and_one_server(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, opened: list[str]
) -> None:
    data_dir = tmp_path / "d"
    data_dir.mkdir()
    loser_done = threading.Event()
    created: list[str] = []
    real_acquire = instance.acquire_lock

    def acquire(d: Path, port: int):
        info = real_acquire(d, port)
        created.append("won" if info else "lost")
        return info

    class Blocking(FakeServer):
        def run(self, sockets=None) -> None:
            super().run(sockets)
            loser_done.wait(10)

    def probe(port: int, timeout: float = 0.5) -> str | None:
        servers = FakeServer.instances
        return str(data_dir) if servers and servers[0].started else None

    FakeServer.instances = []
    monkeypatch.setattr(cli, "_Server", Blocking)
    monkeypatch.setattr(instance, "acquire_lock", acquire)
    monkeypatch.setattr(instance, "probe_health", probe)
    barrier = threading.Barrier(2)
    codes: list[int] = []

    def launch() -> None:
        barrier.wait()
        code = cli.main(["--data-dir", str(data_dir), "--no-browser", "--port", "8799"])
        codes.append(code)
        if len(codes) == 1:
            loser_done.set()

    threads = [threading.Thread(target=launch) for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(15)
    assert created.count("won") == 1
    assert len(FakeServer.instances) == 1
    assert codes == [0, 0]
    assert not (data_dir / LOCK_NAME).exists()


def test_shutdown_waits_for_write_lock_then_removes_lock(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The real _Server: shutdown takes the write lock before releasing."""

    async def base_shutdown(self, sockets=None) -> None:
        return None

    monkeypatch.setattr(cli.uvicorn.Server, "shutdown", base_shutdown)
    data_dir = tmp_path / "d"
    data_dir.mkdir()
    assert instance.acquire_lock(data_dir, 8799) is not None
    write_lock = threading.Lock()

    def release() -> None:
        with write_lock:
            instance.release_lock(data_dir, os.getpid())

    config = cli.uvicorn.Config(lambda *a: None, host="127.0.0.1", port=8799)
    server = cli._Server(config, release=release)
    write_lock.acquire()
    done = threading.Event()
    thread = threading.Thread(target=lambda: (asyncio.run(server.shutdown()), done.set()))
    thread.start()
    assert not done.wait(0.3)
    assert (data_dir / LOCK_NAME).exists()
    write_lock.release()
    assert done.wait(5)
    thread.join()
    assert not (data_dir / LOCK_NAME).exists()


# --- Story 1.4: the one-file store ----------------------------------------

EMPTY_V1 = (
    b'{\n  "schemaVersion": 1,\n  "mainBookId": null,\n  "upNextBookId": null,\n'
    b'  "sideReadBookIds": [],\n  "books": []\n}\n'
)


def test_start_creates_library_and_wires_the_store(
    tmp_path: Path, fake_server: type[FakeServer], opened: list[str]
) -> None:
    data_dir = tmp_path / "d"
    assert cli.main(["--data-dir", str(data_dir), "--no-browser"]) == 0
    assert (data_dir / "library.json").read_bytes() == EMPTY_V1
    assert (data_dir / "covers").is_dir() and (data_dir / ".staging").is_dir()
    state = fake_server.instances[0].config.app.state
    assert state.store.data_dir == data_dir
    assert state.write_lock is state.store.lock


def test_newer_library_exits_1_without_serving(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
    fake_server: type[FakeServer],
    opened: list[str],
) -> None:
    data_dir = tmp_path / "d"
    data_dir.mkdir()
    raw = EMPTY_V1.replace(b'"schemaVersion": 1', b'"schemaVersion": 2')
    (data_dir / "library.json").write_bytes(raw)
    assert cli.main(["--data-dir", str(data_dir), "--no-browser"]) == 1
    err = capsys.readouterr().err.strip().splitlines()
    assert err == [
        f"bookvie: {data_dir / 'library.json'}: has schemaVersion 2, which is newer than "
        "this bookvie supports (1); update bookvie"
    ]
    assert (data_dir / "library.json").read_bytes() == raw
    assert fake_server.instances == []
    assert not (data_dir / LOCK_NAME).exists()
    assert sorted(p.name for p in data_dir.iterdir()) == ["library.json"]


def test_invalid_library_exits_1_and_releases_the_lock(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
    fake_server: type[FakeServer],
    opened: list[str],
) -> None:
    data_dir = tmp_path / "d"
    data_dir.mkdir()
    (data_dir / "library.json").write_bytes(b"{oops")
    assert cli.main(["--data-dir", str(data_dir), "--no-browser"]) == 1
    (line,) = capsys.readouterr().err.strip().splitlines()
    assert line.startswith(f"bookvie: {data_dir / 'library.json'}: is not valid JSON")
    assert (data_dir / "library.json").read_bytes() == b"{oops"
    assert not (data_dir / LOCK_NAME).exists()
    assert fake_server.instances == []


def test_unwritable_data_dir_exits_1_before_the_lock(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    fake_server: type[FakeServer],
    opened: list[str],
) -> None:
    claims: list[Path] = []
    monkeypatch.setattr(instance, "claim_lock", lambda d, p: claims.append(d))
    data_dir = tmp_path / "d"
    data_dir.mkdir()
    data_dir.chmod(0o500)
    try:
        assert cli.main(["--data-dir", str(data_dir), "--no-browser"]) == 1
    finally:
        data_dir.chmod(0o700)
    assert capsys.readouterr().err.strip() == f"bookvie: {data_dir}: is not writable"
    assert claims == []
    assert list(data_dir.iterdir()) == []


def test_unwritable_parent_exits_1(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
    fake_server: type[FakeServer],
    opened: list[str],
) -> None:
    parent = tmp_path / "p"
    parent.mkdir()
    parent.chmod(0o500)
    try:
        assert cli.main(["--data-dir", str(parent / "d"), "--no-browser"]) == 1
    finally:
        parent.chmod(0o700)
    assert str(parent / "d") in capsys.readouterr().err
    assert not (parent / "d").exists()


def test_losing_launch_does_not_sweep_the_live_servers_temp_files(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    fake_server: type[FakeServer],
    opened: list[str],
) -> None:
    data_dir = tmp_path / "d"
    _write_lock(data_dir, os.getpid(), 8111, age=60)
    (data_dir / "library.json.tmpLIVE").write_text("in flight")
    monkeypatch.setattr(instance, "probe_health", lambda port, timeout=0.5: str(data_dir))
    assert cli.main(["--data-dir", str(data_dir), "--no-browser"]) == 0
    assert (data_dir / "library.json.tmpLIVE").read_text() == "in flight"
    assert not (data_dir / "library.json").exists()


def test_real_process_start_on_empty_folder(tmp_path: Path) -> None:
    import signal
    import subprocess
    import sys
    import time

    data_dir = tmp_path / "data"
    port = _free_port()
    env = os.environ | {"HOME": str(tmp_path / "home")}
    cmd = [sys.executable, "-m", "bookvie.cli", "--no-browser",
           "--port", str(port), "--data-dir", str(data_dir)]  # fmt: skip
    server = subprocess.Popen(cmd, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        deadline = time.monotonic() + 20
        while not instance.same_folder(instance.probe_health(port, timeout=0.2), data_dir):
            assert server.poll() is None, server.stderr.read().decode()
            assert time.monotonic() < deadline, "server never answered health"
            time.sleep(0.1)
        assert (data_dir / "library.json").read_bytes() == EMPTY_V1
        assert (data_dir / "covers").is_dir()
        assert list((data_dir / ".staging").iterdir()) == []
        server.send_signal(signal.SIGTERM)
        server.wait(timeout=20)
    finally:
        if server.poll() is None:
            server.kill()
            server.wait()
    assert (data_dir / "library.json").read_bytes() == EMPTY_V1
    assert not list(data_dir.glob("library.json.tmp*"))
    assert not (data_dir / LOCK_NAME).exists()
