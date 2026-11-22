"""The ``bookvie`` command: start the local server and open the browser."""

import argparse
import asyncio
import copy
import os
import plistlib
import re
import shutil
import subprocess
import sys
import threading
import time
import unicodedata
import webbrowser
from collections.abc import Sequence
from datetime import date, datetime
from pathlib import Path

import uvicorn

from bookvie import __version__, instance
from bookvie.domain.clock import FakeClock, SystemClock
from bookvie.http.app import STATIC_DIR, create_app
from bookvie.instance import HOST
from bookvie.intents import backups_folder
from bookvie.store import StartupError, Store, ensure_writable
from bookvie.views.app_info import display_path

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

# The daily backup job (AD-22 The schedule, Story 13.5).
AUTOBACKUP_LABEL = "com.bookvie.autobackup"
"""The launchd job's one label: the plist's name, install, uninstall and the probe."""
AUTOBACKUP_ALLOWED_TOOLS = (
    "mcp__bookvie__get_app_info",
    "mcp__bookvie__export_backup",
    "mcp__bookvie__record_backup_upload",
    "mcp__bookvie-dropbox__upload_backup",
)
"""What the headless run may call: ``bookvie-backup``'s ``allowed-tools``, MCP names only."""
AUTOBACKUP_DISALLOWED_TOOLS = (
    "mcp__bookvie__restore_backup",
    "mcp__bookvie-dev__restore_backup",
)
"""What the headless run may never call: the daily run never restores."""
AUTOBACKUP_SKILL = Path(".claude") / "skills" / "bookvie-backup" / "SKILL.md"
AUTOBACKUP_PROMPT = "/bookvie-backup"
LAUNCHCTL = "/bin/launchctl"
_AUTOBACKUP_COMMANDS = ("bookvie", "bookvie-dropbox", "claude")
_AUTOBACKUP_SYSTEM_PATH = ("/usr/bin", "/bin", "/usr/sbin", "/sbin")
_LAUNCHD_PROBE_TIMEOUT_SECONDS = 2.0
_LAUNCHCTL_TIMEOUT_SECONDS = 30.0
_AUTOBACKUP_HEALTH_WAIT_SECONDS = 60.0
_AUTOBACKUP_HEALTH_POLL_SECONDS = 0.25
_AUTOBACKUP_CLAUDE_TIMEOUT_SECONDS = 30 * 60.0
_AUTOBACKUP_STOP_WAIT_SECONDS = 30.0


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
    commands = parser.add_subparsers(dest="command", metavar="command")
    autobackup = commands.add_parser(
        "autobackup",
        help="install, uninstall or run the daily 09:00 backup to Dropbox (production only)",
        description=(
            "The daily 09:00 backup to Dropbox, as a launchd job. "
            "Production only: refused with --dev."
        ),
    )
    actions = autobackup.add_subparsers(dest="action", metavar="action", required=True)
    actions.add_parser(
        "install",
        help="install or replace the launchd job; run it from the main bookvie checkout",
    )
    actions.add_parser("uninstall", help="unload the launchd job and remove its plist")
    actions.add_parser(
        "run", help="what the job runs at 09:00: start bookvie if needed, then /bookvie-backup"
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


def _checkout_folder() -> Path:
    """The resolved folder the ``bookvie`` package runs from: a ``--dev``
    server's identity, so a launch from another checkout doesn't join it (AD-16)."""
    return Path(__file__).resolve().parent


def _checkout_commit() -> str | None:
    """The short git hash of the checkout this package runs from, or None.

    Any failure (no git on PATH, not a checkout, a timeout, output that won't
    decode) gives None: the commit is shown for information and must never
    stop a start.
    """
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=_checkout_folder(),
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


def _other_checkout(port: int, data_dir: Path) -> bool:
    """With ``--dev``: whether the live server on ``port`` runs from another
    checkout. One that reports no checkout counts as another (fails closed);
    when so, prints the refusal."""
    reported = instance.probe_checkout(port)
    if instance.same_folder(reported, _checkout_folder()):
        return False
    home = Path.home()
    checkout = display_path(Path(reported), home) if reported is not None else "an unknown checkout"
    _say(
        f"bookvie: a --dev server from another checkout ({checkout}) is already running "
        f"on port {port} with {display_path(data_dir, home)}. "
        f"Stop it, or start this one with --port <number> --data-dir <folder>."
    )
    return True


def _port_conflict(
    port: int, data_dir: Path, pid: int, no_browser: bool, dev: bool
) -> tuple[int, bool]:
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
        if dev and _other_checkout(port, data_dir):
            return 1, True
        _show(f"http://{HOST}:{port}/", no_browser)
        return 0, True
    else:
        _say(
            f"bookvie is already running for {reported} on port {port}. "
            f"Stop it, or start bookvie with --port <number> to use a different port."
        )
    return 1, False


def launchd_job_installed() -> bool:
    """Whether launchd knows the daily backup job: only ``launchctl print``'s exit status.

    Any error, a timeout, or a system that isn't macOS reads as not installed.
    """
    if sys.platform != "darwin":
        return False
    try:
        result = subprocess.run(
            [LAUNCHCTL, "print", f"gui/{os.getuid()}/{AUTOBACKUP_LABEL}"],
            capture_output=True,
            timeout=_LAUNCHD_PROBE_TIMEOUT_SECONDS,
            check=False,
        )
    except OSError, subprocess.SubprocessError, ValueError:
        return False
    return result.returncode == 0


def _launchctl(*args: str) -> subprocess.CompletedProcess | None:
    """``launchctl`` with ``args``; ``None`` when it can't be run or times out."""
    try:
        return subprocess.run(
            [LAUNCHCTL, *args],
            capture_output=True,
            text=True,
            timeout=_LAUNCHCTL_TIMEOUT_SECONDS,
            check=False,
        )
    except OSError, subprocess.SubprocessError, ValueError:
        return None


def _launchd_domain() -> str:
    return f"gui/{os.getuid()}"


def _launch_agent_plist() -> Path:
    return Path.home() / "Library" / "LaunchAgents" / f"{AUTOBACKUP_LABEL}.plist"


def _autobackup_logs() -> Path:
    return Path.home() / "Library" / "Logs" / "bookvie"


def _now() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def _refuses_dev(args: argparse.Namespace) -> bool:
    if args.dev:
        _say(
            f"bookvie: autobackup {args.action} is refused with --dev: "
            f"the daily backup is for your real library ({DEFAULT_DATA_DIR}) only. "
            f"Run it without --dev."
        )
    return args.dev


def _autobackup_install(args: argparse.Namespace) -> int:
    """Write the launchd plist for this checkout and load it; refuse before any write."""
    if _refuses_dev(args):
        return 2
    checkout = Path.cwd().resolve()
    if (checkout / ".git").is_file():
        _say(
            "bookvie: this folder is a linked git worktree, which can be removed at any time. "
            "Run bookvie autobackup install from the main bookvie checkout."
        )
        return 1
    if not (checkout / AUTOBACKUP_SKILL).is_file():
        _say(
            f"bookvie: this folder has no {AUTOBACKUP_SKILL.as_posix()}, the bookvie-backup "
            f"skill the job runs. Run bookvie autobackup install from the top folder "
            f"of the main bookvie checkout."
        )
        return 1
    found: dict[str, Path] = {}
    for name in _AUTOBACKUP_COMMANDS:
        where = shutil.which(name)
        if where is None:
            _say(
                f"bookvie: can't find {name} on your PATH, and the job needs it. "
                f"Install it (or fix your PATH), then run bookvie autobackup install again."
            )
            return 1
        found[name] = Path(where).absolute()

    folders = [str(found[name].parent) for name in _AUTOBACKUP_COMMANDS]
    path = ":".join(dict.fromkeys([*folders, *_AUTOBACKUP_SYSTEM_PATH]))
    logs = _autobackup_logs()
    job = {
        "Label": AUTOBACKUP_LABEL,
        "ProgramArguments": [str(found["bookvie"]), "autobackup", "run"],
        "WorkingDirectory": str(checkout),
        "StartCalendarInterval": {"Hour": 9, "Minute": 0},
        "EnvironmentVariables": {"PATH": path},
        "StandardOutPath": str(logs / "autobackup.log"),
        "StandardErrorPath": str(logs / "autobackup.err.log"),
    }
    plist = _launch_agent_plist()
    try:
        logs.mkdir(parents=True, exist_ok=True)
        plist.parent.mkdir(parents=True, exist_ok=True)
        temp = plist.with_name(f".{plist.name}.tmp")
        temp.write_bytes(plistlib.dumps(job))
        os.replace(temp, plist)
    except OSError as exc:
        _say(f"bookvie: couldn't write {display_path(plist, Path.home())}: {exc}")
        return 1

    # A job that is loaded, with or without a plist, is unloaded first; it may not be.
    _launchctl("bootout", f"{_launchd_domain()}/{AUTOBACKUP_LABEL}")
    loaded = _launchctl("bootstrap", _launchd_domain(), str(plist))
    if loaded is None or loaded.returncode != 0:
        why = "it couldn't be run" if loaded is None else f"it exited {loaded.returncode}"
        detail = (loaded.stderr or "").strip() if loaded is not None else ""
        _say(
            f"bookvie: launchctl bootstrap couldn't load the daily backup job ({why})"
            + (f": {detail}" if detail else "")
            + f". Any earlier job was already unloaded, so no daily job is loaded now. "
            f"The plist is at {display_path(plist, Path.home())}; "
            f"run bookvie autobackup install again."
        )
        return 1
    _say(
        f"bookvie: installed the daily backup job ({AUTOBACKUP_LABEL}). It runs "
        f"/bookvie-backup at 09:00 from {display_path(checkout, Path.home())}, "
        f"with logs in {display_path(logs, Path.home())}/."
    )
    return 0


def _autobackup_uninstall(args: argparse.Namespace) -> int:
    """Unload the launchd job and remove its plist; with none, say so."""
    if _refuses_dev(args):
        return 2
    plist = _launch_agent_plist()
    had_plist = plist.is_file()
    unloaded = _launchctl("bootout", f"{_launchd_domain()}/{AUTOBACKUP_LABEL}")
    try:
        plist.unlink(missing_ok=True)
    except OSError as exc:
        _say(f"bookvie: couldn't remove {display_path(plist, Path.home())}: {exc}")
        return 1
    if had_plist or (unloaded is not None and unloaded.returncode == 0):
        _say(f"bookvie: uninstalled the daily backup job ({AUTOBACKUP_LABEL}).")
    else:
        _say(f"bookvie: the daily backup job ({AUTOBACKUP_LABEL}) isn't installed.")
    return 0


def _stop(server: subprocess.Popen) -> None:
    """SIGTERM a server this run started, and wait for it to exit."""
    if server.poll() is not None:
        return
    server.terminate()
    try:
        server.wait(timeout=_AUTOBACKUP_STOP_WAIT_SECONDS)
    except subprocess.TimeoutExpired:
        server.kill()
        server.wait()


def _wait_for_health(server: subprocess.Popen) -> bool:
    """Whether bookvie answers on its port before the wait ends or the server exits."""
    deadline = time.monotonic() + _AUTOBACKUP_HEALTH_WAIT_SECONDS
    while True:
        if instance.probe_health(DEFAULT_PORT) is not None:
            return True
        if server.poll() is not None or time.monotonic() >= deadline:
            return False
        time.sleep(_AUTOBACKUP_HEALTH_POLL_SECONDS)


def _autobackup_run(args: argparse.Namespace) -> int:
    """Start bookvie when it isn't running, run ``/bookvie-backup`` headless, stop what it started."""
    if _refuses_dev(args):
        return 2
    _say(f"bookvie: autobackup run started at {_now()}")
    claude = shutil.which("claude")
    if claude is None:
        _say(
            "bookvie: can't find claude on the job's PATH, so nothing was backed up. "
            "Run bookvie autobackup install again from the main bookvie checkout."
        )
        return 1
    server: subprocess.Popen | None = None
    try:
        if instance.probe_health(DEFAULT_PORT) is None:
            bookvie = shutil.which("bookvie")
            if bookvie is None:
                _say(
                    "bookvie: can't find bookvie on the job's PATH, so nothing was backed up. "
                    "Run bookvie autobackup install again from the main bookvie checkout."
                )
                return 1
            _say("bookvie: bookvie isn't running; starting it for this run.")
            try:
                server = subprocess.Popen([bookvie, "--no-browser"], stdin=subprocess.DEVNULL)
            except OSError as exc:
                _say(f"bookvie: couldn't start bookvie, so nothing was backed up: {exc}")
                return 1
            if not _wait_for_health(server):
                _say(
                    f"bookvie: bookvie didn't answer on port {DEFAULT_PORT} within "
                    f"{_AUTOBACKUP_HEALTH_WAIT_SECONDS:g} s, so nothing was backed up."
                )
                return 1
        command = [
            claude,
            "-p",
            AUTOBACKUP_PROMPT,
            "--allowedTools",
            ",".join(AUTOBACKUP_ALLOWED_TOOLS),
            "--disallowedTools",
            ",".join(AUTOBACKUP_DISALLOWED_TOOLS),
        ]
        try:
            result = subprocess.run(
                command,
                stdin=subprocess.DEVNULL,
                timeout=_AUTOBACKUP_CLAUDE_TIMEOUT_SECONDS,
                check=False,
            )
        except subprocess.TimeoutExpired:
            _say(
                f"bookvie: claude didn't finish within "
                f"{_AUTOBACKUP_CLAUDE_TIMEOUT_SECONDS / 60:g} minutes and was stopped."
            )
            return 1
        except OSError as exc:
            _say(f"bookvie: couldn't run claude, so nothing was backed up: {exc}")
            return 1
        code = result.returncode if result.returncode >= 0 else 1
        _say(f"bookvie: autobackup run finished at {_now()}, claude exited {result.returncode}")
        return code
    finally:
        if server is not None:
            _stop(server)


def _autobackup(args: argparse.Namespace) -> int:
    run = {
        "install": _autobackup_install,
        "uninstall": _autobackup_uninstall,
        "run": _autobackup_run,
    }[args.action]
    return run(args)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    if args.command == "autobackup":
        # Before anything touches the data folder: the job writes nothing there.
        return _autobackup(args)
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
        if args.dev and _other_checkout(claim.port, data_dir):
            return 1
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
            code, keep_lock = _port_conflict(args.port, data_dir, pid, args.no_browser, args.dev)
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
            checkout=str(_checkout_folder()) if args.dev else None,
            backups_dir=backups_folder(data_dir, Path.home()),
            launchd_probe=launchd_job_installed,
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
