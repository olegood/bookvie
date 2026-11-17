"""The ``bookvie`` command: start the local server and open the browser."""

import argparse
import asyncio
import copy
import os
import re
import subprocess
import sys
import threading
import time
import unicodedata
import webbrowser
from collections.abc import Sequence
from datetime import date
from pathlib import Path

import uvicorn

from bookvie import __version__, instance
from bookvie.domain.clock import FakeClock, SystemClock
from bookvie.http.app import STATIC_DIR, create_app
from bookvie.instance import HOST
from bookvie.store import StartupError, Store, ensure_writable

DEFAULT_PORT = 8765
DEFAULT_DATA_DIR = "~/bookvie-data"
# `--dev` keeps to its own folder and port, so it never opens the real library (AD-16).
DEV_PORT = 8766
DEV_DATA_DIR = "~/bookvie-data-dev"
_REFUSAL = (
    f"bookvie: --dev won't use your real library ({DEFAULT_DATA_DIR}). "
    f"Leave out --data-dir to use {DEV_DATA_DIR}, or pass a scratch folder."
)
_GIT_TIMEOUT_SECONDS = 5.0
_BROWSER_WAIT_SECONDS = 30.0


def _local_date(value: str) -> date:
    try:
        if not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", value):
            raise ValueError(value)
        return date.fromisoformat(value)
    except ValueError:
        raise argparse.ArgumentTypeError(f"must be a date as YYYY-MM-DD, got {value!r}") from None


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="bookvie",
        description="Start bookvie on 127.0.0.1 and open it in the browser.",
    )
    parser.add_argument(
        "--data-dir",
        default=None,
        help=(
            f"folder that holds the library "
            f"(default: {DEFAULT_DATA_DIR}, or {DEV_DATA_DIR} with --dev)"
        ),
    )
    parser.add_argument(
        "--port",
        type=int,
        default=None,
        help=f"port on 127.0.0.1 (default: {DEFAULT_PORT}, or {DEV_PORT} with --dev)",
    )
    parser.add_argument(
        "--no-browser",
        action="store_true",
        help="do not open the browser",
    )
    parser.add_argument(
        "--dev",
        action="store_true",
        help=(
            "development mode, used alongside the Vite dev server on :5173; "
            f"refuses {DEFAULT_DATA_DIR}"
        ),
    )
    parser.add_argument(
        "--fake-today",
        type=_local_date,
        default=None,
        metavar="YYYY-MM-DD",
        help="pretend today is this local date (tests only; needs --no-browser)",
    )
    args = parser.parse_args(argv)
    if args.port is None:
        args.port = DEV_PORT if args.dev else DEFAULT_PORT
    if args.data_dir is None:
        args.data_dir = DEV_DATA_DIR if args.dev else DEFAULT_DATA_DIR
    if not 1 <= args.port <= 65535:
        parser.error(f"--port must be between 1 and 65535, got {args.port}")
    if args.fake_today is not None and not args.no_browser:
        parser.error("--fake-today is only allowed with --no-browser")
    args.data_dir = Path(args.data_dir).expanduser().resolve()
    return args


def _refuses_real_library(args: argparse.Namespace) -> bool:
    """True when ``--dev`` names the real library, in any form (``~``, symlinks, ``..``,
    a case or Unicode variant on a case-insensitive disk, a folder that doesn't exist
    yet). On a case-sensitive disk a case variant is another folder and is allowed."""
    if not args.dev:
        return False
    real = Path(DEFAULT_DATA_DIR).expanduser().resolve()
    if instance.same_folder(str(real), args.data_dir):
        return True
    # samefile can't compare a folder that doesn't exist yet, and resolve()
    # keeps the case it was given: compare case-insensitively on such a disk.
    return _folded(real) == _folded(args.data_dir) and _case_insensitive_disk(real)


def _folded(path: Path) -> str:
    return unicodedata.normalize("NFC", str(path)).casefold()


def _case_insensitive_disk(path: Path) -> bool:
    """Whether the disk holding ``path`` ignores case, probed on its nearest
    existing ancestor whose name has a letter; the platform's default when none.
    A probe that errors counts as case-insensitive, so the refusal fails closed."""
    for folder in (path, *path.parents):
        flipped = folder.name.swapcase()
        if flipped == folder.name or not folder.exists():
            continue
        twin = folder.with_name(flipped)
        try:
            return twin.exists() and os.path.samefile(folder, twin)
        except OSError:
            return True
    return sys.platform in ("darwin", "win32")


def _checkout_commit() -> str | None:
    """The short git hash of the checkout this package runs from, or None.

    Any failure (no git on PATH, not a checkout, a timeout, output that won't
    decode) gives None: the commit is shown for information and must never
    stop a start.
    """
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=Path(__file__).resolve().parent,
            capture_output=True,
            text=True,
            timeout=_GIT_TIMEOUT_SECONDS,
            check=True,
        )
    except OSError, subprocess.SubprocessError, ValueError:
        return None
    commit = result.stdout.strip()
    return commit or None


def _log_config() -> dict:
    """Uvicorn's default logging, with every handler on stderr."""
    config = copy.deepcopy(uvicorn.config.LOGGING_CONFIG)
    for handler in config["handlers"].values():
        handler["stream"] = "ext://sys.stderr"
    return config


def _open_browser_when_started(server: uvicorn.Server, url: str, done: threading.Event) -> None:
    deadline = time.monotonic() + _BROWSER_WAIT_SECONDS
    while not server.started:
        if done.is_set() or server.should_exit or time.monotonic() > deadline:
            return
        time.sleep(0.05)
    webbrowser.open(url)


class _Server(uvicorn.Server):
    """Releases ``bookvie.lock`` inside shutdown.

    uvicorn re-raises a captured SIGTERM after ``serve()`` returns, which ends
    the process before any ``finally`` in :func:`main` could run.
    """

    def __init__(self, config: uvicorn.Config, *, release) -> None:
        super().__init__(config)
        self._release = release

    async def shutdown(self, sockets=None) -> None:
        try:
            await super().shutdown(sockets=sockets)
        finally:
            await asyncio.to_thread(self._release)


def _say(message: str) -> None:
    print(message, file=sys.stderr)


def _show(url: str, no_browser: bool) -> None:
    if no_browser:
        _say(f"bookvie is already running at {url}")
    else:
        _say(f"bookvie is already running, opening {url}")
        webbrowser.open(url)


def _port_conflict(port: int, data_dir: Path, pid: int, no_browser: bool) -> tuple[int, bool]:
    """Return the exit code, and whether to skip releasing ``bookvie.lock``.

    True on the same-folder branch: after a hand-over the lock names the
    running server, and with no live pid to hand it to the lock is left as is.
    """
    reported = instance.probe_health(port)
    if reported is None:
        _say(
            f"bookvie: port {port} is in use by another program. "
            f"Start bookvie with --port <number> to use a different port."
        )
    elif instance.same_folder(reported, data_dir):
        # This launch took over the running server's lock; give it back.
        running = instance.probe_pid(port)
        if running is not None and instance.pid_alive(running):
            instance.hand_over_lock(data_dir, pid, instance.LockInfo(running, port))
        # With no live pid (a pre-1.2 bookvie) there is no one to hand the lock
        # to. Leave it rather than delete it; it names this launch, so it goes
        # stale when this launch exits and a later launch takes it over.
        _show(f"http://{HOST}:{port}/", no_browser)
        return 0, True
    else:
        _say(
            f"bookvie is already running for {reported} on port {port}. "
            f"Stop it, or start bookvie with --port <number> to use a different port."
        )
    return 1, False


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    data_dir: Path = args.data_dir
    # Before anything touches the folder: no lock, no store, no new files.
    if _refuses_real_library(args):
        _say(_REFUSAL)
        return 2
    try:
        ensure_writable(data_dir)
    except StartupError as exc:
        _say(f"bookvie: {exc}")
        return 1

    claim = instance.claim_lock(data_dir, args.port)
    if claim.kind == "running":
        _show(f"http://{HOST}:{claim.port}/", args.no_browser)
        return 0
    if claim.kind == "starting":
        _say("bookvie is starting in another window; try again.")
        return 1

    pid = os.getpid()
    keep_lock = False
    try:
        try:
            sock = instance.bind_socket(args.port)
        except OSError:
            code, keep_lock = _port_conflict(args.port, data_dir, pid, args.no_browser)
            return code

        # After the bind: a launch that loses to a live server never sweeps
        # that server's temp files.
        try:
            store = Store.open(data_dir)
        except StartupError as exc:
            sock.close()
            _say(f"bookvie: {exc}")
            return 1

        clock = FakeClock(args.fake_today) if args.fake_today is not None else SystemClock()
        app = create_app(
            STATIC_DIR,
            data_dir=data_dir,
            port=args.port,
            dev=args.dev,
            store=store,
            clock=clock,
            version=__version__,
            commit=_checkout_commit() if args.dev else None,
        )

        def release() -> None:
            with app.state.write_lock:
                instance.release_lock(data_dir, pid)

        url = f"http://{HOST}:{args.port}/"
        config = uvicorn.Config(app, host=HOST, port=args.port, log_config=_log_config())
        server = _Server(config, release=release)
        _say(f"bookvie: serving {data_dir} at {url}")

        done = threading.Event()
        opener = None
        if not args.no_browser:
            opener = threading.Thread(
                target=_open_browser_when_started,
                args=(server, url, done),
                daemon=True,
            )
            opener.start()
        try:
            with sock:
                server.run(sockets=[sock])
        finally:
            done.set()
            if opener is not None:
                opener.join(timeout=1)
    finally:
        if not keep_lock:
            instance.release_lock(data_dir, pid)
    return 0


if __name__ == "__main__":
    sys.exit(main())
