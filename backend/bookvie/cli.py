"""The ``bookvie`` command: start the local server and open the browser."""

import argparse
import asyncio
import copy
import os
import sys
import threading
import time
import webbrowser
from collections.abc import Sequence
from pathlib import Path

import uvicorn

from bookvie import instance
from bookvie.http.app import STATIC_DIR, create_app
from bookvie.instance import HOST
from bookvie.store import StartupError, Store, ensure_writable

DEFAULT_PORT = 8765
DEFAULT_DATA_DIR = "~/bookvie-data"
_BROWSER_WAIT_SECONDS = 30.0


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="bookvie",
        description="Start bookvie on 127.0.0.1 and open it in the browser.",
    )
    parser.add_argument(
        "--data-dir",
        default=DEFAULT_DATA_DIR,
        help=f"folder that holds the library (default: {DEFAULT_DATA_DIR})",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=DEFAULT_PORT,
        help=f"port on 127.0.0.1 (default: {DEFAULT_PORT})",
    )
    parser.add_argument(
        "--no-browser",
        action="store_true",
        help="do not open the browser",
    )
    parser.add_argument(
        "--dev",
        action="store_true",
        help="development mode, used alongside the Vite dev server on :5173",
    )
    args = parser.parse_args(argv)
    if not 1 <= args.port <= 65535:
        parser.error(f"--port must be between 1 and 65535, got {args.port}")
    args.data_dir = Path(args.data_dir).expanduser().resolve()
    return args


def _log_config() -> dict:
    """Uvicorn's default logging, with every handler on stderr."""
    config = copy.deepcopy(uvicorn.config.LOGGING_CONFIG)
    for handler in config["handlers"].values():
        handler["stream"] = "ext://sys.stderr"
    return config


def _open_browser_when_started(
    server: uvicorn.Server, url: str, done: threading.Event
) -> None:
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


def _port_conflict(port: int, data_dir: Path, pid: int, no_browser: bool) -> int:
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
        _show(f"http://{HOST}:{port}/", no_browser)
        return 0
    else:
        _say(
            f"bookvie is already running for {reported} on port {port}. "
            f"Stop it, or start bookvie with --port <number> to use a different port."
        )
    return 1


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    data_dir: Path = args.data_dir
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
    try:
        try:
            sock = instance.bind_socket(args.port)
        except OSError:
            return _port_conflict(args.port, data_dir, pid, args.no_browser)

        # After the bind: a launch that loses to a live server never sweeps
        # that server's temp files.
        try:
            store = Store.open(data_dir)
        except StartupError as exc:
            sock.close()
            _say(f"bookvie: {exc}")
            return 1

        app = create_app(
            STATIC_DIR, data_dir=data_dir, port=args.port, dev=args.dev, store=store
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
        instance.release_lock(data_dir, pid)
    return 0


if __name__ == "__main__":
    sys.exit(main())
