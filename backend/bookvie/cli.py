"""The ``bookvie`` command: start the local server and open the browser."""

import argparse
import copy
import sys
import threading
import time
import webbrowser
from collections.abc import Sequence
from pathlib import Path

import uvicorn

from bookvie.http.app import STATIC_DIR, create_app

HOST = "127.0.0.1"
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


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    args.data_dir.mkdir(parents=True, exist_ok=True)

    app = create_app(STATIC_DIR)
    url = f"http://{HOST}:{args.port}/"
    config = uvicorn.Config(app, host=HOST, port=args.port, log_config=_log_config())
    server = uvicorn.Server(config)
    print(f"bookvie: serving {args.data_dir} at {url}", file=sys.stderr)

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
        server.run()
    finally:
        done.set()
        if opener is not None:
            opener.join(timeout=1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
