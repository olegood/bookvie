"""AD-5 lock, health probe and loopback socket (FND-API-005, FND-API-008)."""

import http.client
import json
import os
import signal
import socket
import subprocess
import sys
import threading
import time
from collections.abc import Callable
from pathlib import Path

import pytest

from bookvie import instance
from bookvie.instance import LOCK_NAME, LockInfo
from tests.servers import wait_for_health


def _dead_pid() -> int:
    proc = subprocess.Popen([sys.executable, "-c", "pass"])
    proc.wait()
    return proc.pid


def _write_lock(data_dir: Path, pid: int, port: int, *, age: float = 0.0) -> Path:
    path = data_dir / LOCK_NAME
    path.write_text(json.dumps({"pid": pid, "port": port}))
    if age:
        stamp = time.time() - age
        os.utime(path, (stamp, stamp))
    return path


@pytest.fixture
def fast(monkeypatch: pytest.MonkeyPatch) -> None:
    """Shrink the starting window so the 'no answer' path is quick."""
    monkeypatch.setattr(instance, "STARTING_SECONDS", 0.3)
    monkeypatch.setattr(instance, "POLL_SECONDS", 0.02)


@pytest.fixture
def health(monkeypatch: pytest.MonkeyPatch) -> dict[int, str]:
    """Fake ``probe_health``: maps port -> reported dataDir."""
    answers: dict[int, str] = {}
    monkeypatch.setattr(instance, "probe_health", lambda port, timeout=0.5: answers.get(port))
    return answers


# --- primitives -----------------------------------------------------------


def test_acquire_writes_pid_and_port(tmp_path: Path) -> None:
    info = instance.acquire_lock(tmp_path, 8799)
    assert info == LockInfo(pid=os.getpid(), port=8799)
    assert json.loads((tmp_path / LOCK_NAME).read_text()) == {"pid": os.getpid(), "port": 8799}
    assert instance.read_lock(tmp_path) == info


def test_acquire_is_exclusive(tmp_path: Path) -> None:
    assert instance.acquire_lock(tmp_path, 1) is not None
    before = (tmp_path / LOCK_NAME).read_bytes()
    assert instance.acquire_lock(tmp_path, 2) is None
    assert (tmp_path / LOCK_NAME).read_bytes() == before


def test_racing_acquires_exactly_one_wins(tmp_path: Path) -> None:
    barrier = threading.Barrier(16)
    results: list[LockInfo | None] = []

    def race(port: int) -> None:
        barrier.wait()
        results.append(instance.acquire_lock(tmp_path, port))

    threads = [threading.Thread(target=race, args=(9000 + i,)) for i in range(16)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    winners = [r for r in results if r is not None]
    assert len(winners) == 1
    assert instance.read_lock(tmp_path) == winners[0]


@pytest.mark.parametrize(
    "raw",
    [b"", b"{", b"[]", b'{"pid": 1}', b'{"pid": "1", "port": 2}', b'{"pid": 0, "port": 2}',
     b'{"pid": 1, "port": 70000}', b'{"pid": true, "port": 2}'],
)
def test_unreadable_lock_reads_as_none(tmp_path: Path, raw: bytes) -> None:
    (tmp_path / LOCK_NAME).write_bytes(raw)
    assert instance.read_lock(tmp_path) is None


def test_read_missing_lock_is_none(tmp_path: Path) -> None:
    assert instance.read_lock(tmp_path) is None


def test_release_only_removes_own_pid(tmp_path: Path) -> None:
    _write_lock(tmp_path, 4242, 1)
    assert instance.release_lock(tmp_path, os.getpid()) is False
    assert (tmp_path / LOCK_NAME).exists()
    assert instance.release_lock(tmp_path, 4242) is True
    assert not (tmp_path / LOCK_NAME).exists()
    assert instance.release_lock(tmp_path, 4242) is False


def test_pid_alive() -> None:
    assert instance.pid_alive(os.getpid()) is True
    assert instance.pid_alive(_dead_pid()) is False


def test_pid_alive_false_for_out_of_range_pid() -> None:
    assert instance.pid_alive(10**20) is False


def test_hand_over_lock_rewrites_only_own_lock(tmp_path: Path) -> None:
    _write_lock(tmp_path, os.getpid(), 8799)
    assert instance.hand_over_lock(tmp_path, os.getpid(), LockInfo(pid=4242, port=8799))
    assert instance.read_lock(tmp_path) == LockInfo(pid=4242, port=8799)
    assert not instance.hand_over_lock(tmp_path, os.getpid(), LockInfo(pid=1, port=1))
    assert instance.read_lock(tmp_path) == LockInfo(pid=4242, port=8799)
    assert [p.name for p in tmp_path.iterdir()] == [LOCK_NAME]


def test_pid_alive_permission_error_means_alive(monkeypatch: pytest.MonkeyPatch) -> None:
    def deny(pid: int, sig: int) -> None:
        raise PermissionError

    monkeypatch.setattr(instance.os, "kill", deny)
    assert instance.pid_alive(1) is True


def test_bind_socket_is_loopback_only() -> None:
    """FND-API-005: the server socket is bound to 127.0.0.1, never 0.0.0.0."""
    sock = instance.bind_socket(0)
    try:
        host, port = sock.getsockname()
        assert host == "127.0.0.1"
        assert port > 0
        assert sock.family == socket.AF_INET
    finally:
        sock.close()


def test_bind_socket_refuses_taken_port() -> None:
    held = instance.bind_socket(0)
    try:
        with pytest.raises(OSError):
            instance.bind_socket(held.getsockname()[1])
    finally:
        held.close()


def test_probe_health_none_when_nothing_listens() -> None:
    sock = instance.bind_socket(0)
    port = sock.getsockname()[1]
    sock.close()
    assert instance.probe_health(port, timeout=0.2) is None


def test_probe_health_none_for_non_http_listener() -> None:
    sock = instance.bind_socket(0)
    try:
        assert instance.probe_health(sock.getsockname()[1], timeout=0.2) is None
    finally:
        sock.close()


def test_probe_health_none_for_garbage_reply() -> None:
    sock = instance.bind_socket(0)

    def reply() -> None:
        conn, _ = sock.accept()
        with conn:
            conn.recv(4096)
            conn.sendall(b"GARBAGE\r\n\r\n")

    thread = threading.Thread(target=reply)
    thread.start()
    try:
        assert instance.probe_health(sock.getsockname()[1], timeout=2) is None
    finally:
        thread.join(5)
        sock.close()


def _serve_once(sock: socket.socket, reply: bytes) -> threading.Thread:
    def serve() -> None:
        sock.settimeout(5)
        try:
            conn, _ = sock.accept()
        except OSError:
            return
        with conn:
            conn.recv(4096)
            conn.sendall(reply)

    thread = threading.Thread(target=serve)
    thread.start()
    return thread


def _http_ok(body: dict) -> bytes:
    raw = json.dumps(body).encode()
    head = f"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {len(raw)}\r\n\r\n"
    return head.encode() + raw


def test_probe_pid_reads_health() -> None:
    sock = instance.bind_socket(0)
    thread = _serve_once(sock, _http_ok({"app": "bookvie", "dataDir": "/x", "pid": 4242}))
    try:
        assert instance.probe_pid(sock.getsockname()[1], timeout=2) == 4242
    finally:
        thread.join(5)
        sock.close()


def test_probe_health_does_not_follow_redirects() -> None:
    target = instance.bind_socket(0)
    target.settimeout(0.5)
    source = instance.bind_socket(0)
    location = f"http://127.0.0.1:{target.getsockname()[1]}/api/health"
    thread = _serve_once(
        source,
        f"HTTP/1.1 302 Found\r\nLocation: {location}\r\nContent-Length: 0\r\n\r\n".encode(),
    )
    try:
        assert instance.probe_health(source.getsockname()[1], timeout=2) is None
        with pytest.raises(OSError):
            target.accept()  # the redirect target was never contacted
    finally:
        thread.join(5)
        source.close()
        target.close()


def test_bind_socket_refuses_port_held_on_all_interfaces() -> None:
    held = socket.socket()
    held.bind(("0.0.0.0", 0))
    held.listen()
    try:
        with pytest.raises(OSError):
            instance.bind_socket(held.getsockname()[1])
    finally:
        held.close()


def test_same_folder_compares_resolved_paths(tmp_path: Path) -> None:
    (tmp_path / "a").mkdir()
    assert instance.same_folder(str(tmp_path / "b" / ".." / "a"), tmp_path / "a")
    assert not instance.same_folder(str(tmp_path / "b"), tmp_path / "a")
    assert not instance.same_folder(None, tmp_path)


def test_same_folder_sees_case_variant(tmp_path: Path) -> None:
    folder = tmp_path / "bookvie-data"
    folder.mkdir()
    variant = tmp_path / "Bookvie-Data"
    if not variant.exists():
        pytest.skip("case-sensitive file system")
    assert instance.same_folder(str(variant), folder)


# --- claim_lock: the matrix rows --------------------------------------------


def test_first_start_acquires(tmp_path: Path) -> None:
    assert instance.claim_lock(tmp_path, 8799) == instance.Claim("acquired", 8799)
    assert instance.read_lock(tmp_path) == LockInfo(os.getpid(), 8799)


def test_live_lock_reports_recorded_port(tmp_path: Path, health: dict[int, str]) -> None:
    _write_lock(tmp_path, os.getpid(), 8111, age=60)
    health[8111] = str(tmp_path)
    assert instance.claim_lock(tmp_path, 8799) == instance.Claim("running", 8111)
    assert instance.read_lock(tmp_path) == LockInfo(os.getpid(), 8111)


def test_dead_pid_is_taken_over_even_when_young(tmp_path: Path, health: dict[int, str]) -> None:
    _write_lock(tmp_path, _dead_pid(), 8111)
    assert instance.claim_lock(tmp_path, 8799).kind == "acquired"
    assert instance.read_lock(tmp_path) == LockInfo(os.getpid(), 8799)


def test_old_lock_without_health_is_taken_over(tmp_path: Path, health: dict[int, str]) -> None:
    _write_lock(tmp_path, os.getpid(), 8111, age=60)
    assert instance.claim_lock(tmp_path, 8799).kind == "acquired"
    assert instance.read_lock(tmp_path) == LockInfo(os.getpid(), 8799)


def test_old_lock_answering_for_other_folder_is_taken_over(
    tmp_path: Path, health: dict[int, str]
) -> None:
    data = tmp_path / "d"
    data.mkdir()
    _write_lock(data, os.getpid(), 8111, age=60)
    health[8111] = str(tmp_path / "elsewhere")
    assert instance.claim_lock(data, 8799).kind == "acquired"


def test_old_unreadable_lock_is_taken_over(tmp_path: Path, health: dict[int, str]) -> None:
    path = tmp_path / LOCK_NAME
    path.write_bytes(b"garbage")
    stamp = time.time() - 60
    os.utime(path, (stamp, stamp))
    assert instance.claim_lock(tmp_path, 8799).kind == "acquired"


def test_young_lock_waits_then_reports_running(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _write_lock(tmp_path, os.getpid(), 8111)
    calls: list[int] = []

    def probe(port: int, timeout: float = 0.5) -> str | None:
        calls.append(port)
        return str(tmp_path) if len(calls) >= 3 else None

    monkeypatch.setattr(instance, "probe_health", probe)
    assert instance.claim_lock(tmp_path, 8799) == instance.Claim("running", 8111)
    assert calls == [8111, 8111, 8111]


def test_young_lock_without_answer_gives_up(
    tmp_path: Path, fast: None, health: dict[int, str]
) -> None:
    path = _write_lock(tmp_path, os.getpid(), 8111)
    before = path.read_bytes()
    started = time.monotonic()
    assert instance.claim_lock(tmp_path, 8799).kind == "starting"
    assert time.monotonic() - started >= 0.3
    assert path.read_bytes() == before


def test_young_empty_lock_waits_then_gives_up(
    tmp_path: Path, fast: None, health: dict[int, str]
) -> None:
    (tmp_path / LOCK_NAME).write_bytes(b"")
    assert instance.claim_lock(tmp_path, 8799).kind == "starting"
    assert (tmp_path / LOCK_NAME).read_bytes() == b""


def _on_first_poll(monkeypatch: pytest.MonkeyPatch, change: Callable[[], None]) -> list[float]:
    """Run ``change`` in place of the first pause between lock polls.

    The lock then changes while ``claim_lock`` waits, at a known point and
    without racing a timer. Returns the pauses taken, so a test can check the
    change happened.
    """
    pauses: list[float] = []

    def pause(seconds: float) -> None:
        if not pauses:
            change()
        pauses.append(seconds)

    monkeypatch.setattr(instance.time, "sleep", pause)
    return pauses


def test_young_empty_lock_filled_in_while_waiting(
    tmp_path: Path, fast: None, health: dict[int, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    (tmp_path / LOCK_NAME).write_bytes(b"")
    health[8111] = str(tmp_path)
    pauses = _on_first_poll(
        monkeypatch,
        lambda: (tmp_path / LOCK_NAME).write_text(json.dumps({"pid": os.getpid(), "port": 8111})),
    )
    assert instance.claim_lock(tmp_path, 8799) == instance.Claim("running", 8111)
    assert len(pauses) == 1


def test_young_lock_removed_while_waiting_is_acquired(
    tmp_path: Path, fast: None, health: dict[int, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    path = _write_lock(tmp_path, os.getpid(), 8111)
    pauses = _on_first_poll(monkeypatch, path.unlink)
    assert instance.claim_lock(tmp_path, 8799).kind == "acquired"
    assert len(pauses) == 1
    assert instance.read_lock(tmp_path) == LockInfo(os.getpid(), 8799)


def test_takeover_leaves_a_rewritten_lock_alone(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    path = _write_lock(tmp_path, 4242, 8111)
    raw = path.read_bytes()
    path.write_text(json.dumps({"pid": 5353, "port": 8222}))
    instance._take_over(tmp_path, raw)
    assert instance.read_lock(tmp_path) == LockInfo(5353, 8222)


def test_takeover_gives_up_after_bounded_retries(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, health: dict[int, str]
) -> None:
    """A lock that keeps reappearing as stale is retried at most 3 times."""
    attempts: list[int] = []

    def acquire(data_dir: Path, port: int) -> LockInfo | None:
        attempts.append(port)
        _write_lock(tmp_path, 4242, 8111, age=60)  # always a fresh stale lock
        return None

    monkeypatch.setattr(instance, "acquire_lock", acquire)
    monkeypatch.setattr(instance, "pid_alive", lambda pid: False)
    assert instance.claim_lock(tmp_path, 8799).kind == "starting"
    assert len(attempts) == instance.TAKEOVER_ATTEMPTS + 1


# --- FND-API-008: real processes ------------------------------------------


def _launch(data_dir: Path, port: int) -> list[str]:
    return [sys.executable, "-m", "bookvie.cli", "--no-browser",
            "--port", str(port), "--data-dir", str(data_dir)]


@pytest.mark.parametrize("sig", [signal.SIGINT, signal.SIGTERM], ids=["SIGINT", "SIGTERM"])
def test_second_launch_finds_live_server_and_signal_removes_lock(
    tmp_path: Path, sig: signal.Signals
) -> None:
    data_dir = tmp_path / "data"
    sock = instance.bind_socket(0)
    port = sock.getsockname()[1]
    sock.close()
    env = os.environ | {"HOME": str(tmp_path / "home")}
    cmd = _launch(data_dir, port)
    server = subprocess.Popen(cmd, env=env, stderr=subprocess.PIPE, stdout=subprocess.PIPE)
    try:
        wait_for_health(server, port, data_dir)
        assert instance.read_lock(data_dir) == LockInfo(pid=server.pid, port=port)

        second = subprocess.run(cmd, env=env, capture_output=True, timeout=30)
        assert second.returncode == 0, second.stderr.decode()
        assert second.stdout == b""
        assert f"http://127.0.0.1:{port}/" in second.stderr.decode()
        assert "serving" not in second.stderr.decode()
        assert instance.read_lock(data_dir) == LockInfo(pid=server.pid, port=port)

        server.send_signal(sig)
        server.wait(timeout=20)
        # Logs go to stderr only; stdout stays clean for scripting.
        assert server.stdout.read() == b""
    finally:
        if server.poll() is None:
            server.kill()
            server.wait()
    assert not (data_dir / LOCK_NAME).exists()
    assert not (tmp_path / "home" / "bookvie-data").exists()
    assert instance.probe_health(port, timeout=0.2) is None


# --- no outbound calls ----------------------------------------------------

# Installed in the server process before bookvie is imported. Reports every
# socket.connect to an address that is not loopback (AF_UNIX paths are local).
_AUDIT = r"""
import ipaddress, os, sys

def _loopback(host):
    if isinstance(host, bytes):
        host = host.decode("latin-1")
    if not isinstance(host, str):
        return True  # None: getaddrinfo for a wildcard/passive address
    try:
        return ipaddress.ip_address(host.split("%", 1)[0]).is_loopback
    except ValueError:
        return host == "localhost"

def _hook(event, args):
    if event in ("socket.connect", "socket.sendto"):
        address = args[1]
        if not isinstance(address, tuple):
            return  # AF_UNIX paths are local
        host = address[0]
    elif event == "socket.getaddrinfo":
        host = args[0]
    else:
        return
    if not _loopback(host):
        os.write(2, f"OUTBOUND-{event} {host!r}\n".encode())

sys.addaudithook(_hook)
"""


def _audited(code: str) -> list[str]:
    return [sys.executable, "-c", _AUDIT + code]


def test_audit_hook_reports_a_non_loopback_connect() -> None:
    """The hook is not vacuous: each watched event is reported once for a
    TEST-NET host, and loopback stays silent."""
    probe = (
        "import socket\n"
        "for host in ('192.0.2.1', '127.0.0.1'):\n"
        "    s = socket.socket(); s.settimeout(0.01)\n"
        "    try: s.connect((host, 9))\n"
        "    except OSError: pass\n"
        "    s.close()\n"
        "    socket.getaddrinfo(host, 9)\n"
        "    u = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)\n"
        "    try: u.sendto(b'x', (host, 9))\n"
        "    except OSError: pass\n"
        "    u.close()\n"
        "socket.getaddrinfo('localhost', 9)\n"
    )
    result = subprocess.run(_audited(probe), capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, result.stderr
    for event in ("socket.connect", "socket.getaddrinfo", "socket.sendto"):
        assert result.stderr.count(f"OUTBOUND-{event} '192.0.2.1'") == 1, result.stderr
    assert result.stderr.count("OUTBOUND-") == 3, result.stderr


def test_server_makes_no_outbound_connections(tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    sock = instance.bind_socket(0)
    port = sock.getsockname()[1]
    sock.close()
    argv = ["--no-browser", "--port", str(port), "--data-dir", str(data_dir)]
    code = f"from bookvie.cli import main\nsys.exit(main({argv!r}))\n"
    server = subprocess.Popen(
        _audited(code), env=os.environ | {"HOME": str(tmp_path / "home")},
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    try:
        wait_for_health(server, port, data_dir)
        for path in ("/api/health", "/", "/catalog/x"):
            conn = http.client.HTTPConnection("127.0.0.1", port, timeout=5)
            try:
                conn.request("GET", path)
                conn.getresponse().read()
            finally:
                conn.close()
        server.send_signal(signal.SIGTERM)
        server.wait(timeout=20)
        stdout, stderr = server.stdout.read(), server.stderr.read().decode()
    finally:
        if server.poll() is None:
            server.kill()
            server.wait()
    assert stdout == b""
    assert "serving" in stderr  # the hook ran inside a real server
    assert "OUTBOUND-" not in stderr, stderr
