"""Single-instance lock, loopback socket and health probe (AD-5).

``bookvie.lock`` in the data folder holds ``{"pid", "port"}`` and is created
with exclusive-create, so of two launches racing on one folder exactly one
wins. A lock is live only when its PID is alive and ``/api/health`` answers for
this folder. A lock younger than ``STARTING_SECONDS`` belongs to a server that
may still be starting, so the loser polls health instead of taking it over.
"""

import errno
import http.client
import json
import os
import socket
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

HOST = "127.0.0.1"
LOCK_NAME = "bookvie.lock"
STARTING_SECONDS = 5.0
POLL_SECONDS = 0.1
TAKEOVER_ATTEMPTS = 3
_PROBE_TIMEOUT = 0.5


@dataclass(frozen=True)
class LockInfo:
    pid: int
    port: int


@dataclass(frozen=True)
class Claim:
    """Outcome of :func:`claim_lock`.

    ``acquired``: this process owns the lock. ``running``: a live bookvie
    serves this folder on ``port``. ``starting``: another launch holds a young
    lock and never answered health.
    """

    kind: Literal["acquired", "running", "starting"]
    port: int


def lock_path(data_dir: Path) -> Path:
    return Path(data_dir) / LOCK_NAME


def acquire_lock(data_dir: Path, port: int) -> LockInfo | None:
    """Create the lock exclusively. Returns ``None`` when it already exists."""
    info = LockInfo(pid=os.getpid(), port=port)
    try:
        fd = os.open(lock_path(data_dir), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o644)
    except FileExistsError:
        return None
    try:
        os.write(fd, json.dumps({"pid": info.pid, "port": info.port}).encode())
        os.fsync(fd)
    finally:
        os.close(fd)
    return info


def _parse(raw: bytes) -> LockInfo | None:
    try:
        data = json.loads(raw)
        pid, port = data["pid"], data["port"]
    except (ValueError, TypeError, KeyError):
        return None
    if type(pid) is not int or type(port) is not int or pid <= 0 or not 0 < port < 65536:
        return None
    return LockInfo(pid=pid, port=port)


def read_lock(data_dir: Path) -> LockInfo | None:
    """The lock's contents, or ``None`` when missing or unreadable."""
    try:
        raw = lock_path(data_dir).read_bytes()
    except OSError:
        return None
    return _parse(raw)


def release_lock(data_dir: Path, pid: int) -> bool:
    """Remove the lock only if it still names ``pid``."""
    info = read_lock(data_dir)
    if info is None or info.pid != pid:
        return False
    try:
        lock_path(data_dir).unlink()
    except FileNotFoundError:
        return False
    return True


def hand_over_lock(data_dir: Path, own_pid: int, running: LockInfo) -> bool:
    """Replace this launch's lock with one naming a running server.

    Used when this launch took over the lock of a server that turned out to be
    alive, so that server keeps a lock naming it.
    """
    info = read_lock(data_dir)
    if info is None or info.pid != own_pid:
        return False
    path = lock_path(data_dir)
    tmp = path.with_name(f"{LOCK_NAME}.{own_pid}.tmp")
    tmp.write_text(json.dumps({"pid": running.pid, "port": running.port}))
    os.replace(tmp, path)
    return True


def pid_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    except (OSError, OverflowError):
        return False
    return True


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """Treat a 3xx as a failed probe instead of following it off loopback."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def _health(port: int, timeout: float) -> dict | None:
    url = f"http://{HOST}:{port}/api/health"
    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    # Never pick up an HTTP proxy from the environment: this is loopback only.
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), _NoRedirect())
    try:
        with opener.open(request, timeout=timeout) as response:
            if response.status != 200:
                return None
            data = json.loads(response.read(64 * 1024))
    except (OSError, ValueError, urllib.error.URLError, http.client.HTTPException):
        return None
    if not isinstance(data, dict) or data.get("app") != "bookvie":
        return None
    return data


def probe_health(port: int, timeout: float = _PROBE_TIMEOUT) -> str | None:
    """``dataDir`` reported by a bookvie on ``port``, or ``None``."""
    data = _health(port, timeout)
    data_dir = data.get("dataDir") if data else None
    return data_dir if isinstance(data_dir, str) else None


def probe_pid(port: int, timeout: float = _PROBE_TIMEOUT) -> int | None:
    """``pid`` reported by a bookvie on ``port``, or ``None``."""
    data = _health(port, timeout)
    pid = data.get("pid") if data else None
    return pid if type(pid) is int and pid > 0 else None


def same_folder(reported: str | None, data_dir: Path) -> bool:
    if reported is None:
        return False
    # samefile sees through case and Unicode variants on case-insensitive disks.
    try:
        return os.path.samefile(reported, data_dir)
    except (OSError, ValueError):
        pass
    try:
        return Path(reported).resolve() == Path(data_dir).resolve()
    except (OSError, ValueError):
        return False


def bind_socket(port: int) -> socket.socket:
    """A listening TCP socket on 127.0.0.1. Raises ``OSError`` if taken."""
    # On macOS, SO_REUSEADDR lets this bind succeed beside a 0.0.0.0 listener,
    # so first check that nothing already answers on the port.
    if port:
        try:
            probe = socket.create_connection((HOST, port), timeout=0.2)
        except OSError:
            pass
        else:
            probe.close()
            raise OSError(errno.EADDRINUSE, f"port {port} is already in use")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind((HOST, port))
        sock.listen(2048)
    except OSError:
        sock.close()
        raise
    return sock


def _answers_here(info: LockInfo | None, data_dir: Path) -> bool:
    return info is not None and same_folder(probe_health(info.port), data_dir)


def _take_over(data_dir: Path, raw: bytes) -> None:
    """Unlink a stale lock, but only if nobody rewrote it meanwhile."""
    path = lock_path(data_dir)
    try:
        if path.read_bytes() == raw:
            path.unlink()
    except FileNotFoundError:
        pass


def _wait_for_starter(data_dir: Path) -> Claim | None:
    """Poll a young lock's server. ``None`` means the lock went stale or away."""
    deadline = time.monotonic() + STARTING_SECONDS
    while True:
        try:
            raw = lock_path(data_dir).read_bytes()
        except FileNotFoundError:
            return None
        info = _parse(raw)
        if info is not None:
            if not pid_alive(info.pid):
                _take_over(data_dir, raw)
                return None
            if _answers_here(info, data_dir):
                return Claim("running", info.port)
        if time.monotonic() >= deadline:
            return Claim("starting", info.port if info else 0)
        time.sleep(POLL_SECONDS)


def claim_lock(data_dir: Path, port: int) -> Claim:
    """Resolve ``bookvie.lock`` for this launch (the AD-5 state machine)."""
    for _ in range(TAKEOVER_ATTEMPTS + 1):
        if acquire_lock(data_dir, port) is not None:
            return Claim("acquired", port)
        path = lock_path(data_dir)
        try:
            raw = path.read_bytes()
            age = time.time() - path.stat().st_mtime
        except FileNotFoundError:
            continue
        info = _parse(raw)
        if info is not None and not pid_alive(info.pid):
            _take_over(data_dir, raw)
            continue
        if age < STARTING_SECONDS:
            outcome = _wait_for_starter(data_dir)
            if outcome is not None:
                return outcome
            continue
        if _answers_here(info, data_dir):
            assert info is not None
            return Claim("running", info.port)
        _take_over(data_dir, raw)
    return Claim("starting", 0)
