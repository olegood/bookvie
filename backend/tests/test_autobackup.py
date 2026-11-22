"""Story 13.5: run the backup every morning (AD-22 The schedule, AR52, AR53, AR54).

``bookvie autobackup install`` writes ``~/Library/LaunchAgents/<label>.plist``
for the main checkout and loads it with ``launchctl bootstrap``; ``uninstall``
boots it out and removes it; ``run`` (what the plist runs at 09:00) starts
``bookvie --no-browser`` when health doesn't answer, runs the resolved
``claude -p "/bookvie-backup"`` with ``--allowedTools`` (one constant in
``cli.py``, the skill's frontmatter) and ``--disallowedTools`` (both
``restore_backup`` tools), stops only a server it started, and exits with
``claude``'s status. ``views/backup`` carries ``autoBackup.installed`` from
``create_app``'s ``launchd_probe`` seam, asked only on the real library's
server (Oleg's decision in the ATDD run, 2026-11-22: the field is
``autoBackup: {installed}``, which Story 13.6 extends).

No test reaches the real launchd, ``claude`` or port 8765:

- ``launchctl`` goes through ``subprocess.run``, which the autouse
  :func:`launchctl` fixture answers without running it, and ``subprocess.Popen``
  refuses to start it any other way;
- ``claude``, ``bookvie`` and ``bookvie-dropbox`` are fake ``sh`` scripts on
  ``PATH``, each in its own folder, writing what they were given to a log
  folder;
- health is ``instance.probe_health``, monkeypatched;
- the checkout is a temporary ``git init`` (and ``git worktree add``) holding a
  copy of the skill; never the shared checkout.

Every test runs with ``HOME`` set to a temporary folder (``conftest.py``). The
two real 09:00 runs, awake and after sleep (AC-7), are Oleg's, recorded in the
spec.
"""

import inspect
import os
import platform
import plistlib
import re
import shlex
import signal
import subprocess
import sys
from collections.abc import Callable, Iterator
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from bookvie import cli, instance
from bookvie.domain.clock import FakeClock
from bookvie.http.app import create_app
from bookvie.store import Store
from tests.agent_client import RESTORE_BACKUP
from tests.helpers import BASE_URL, TODAY
from tests.test_backup_skill import SKILL_MD, allowed_tools

RED = "Story 13.5 red phase: bookvie autobackup and the launchd probe aren't built yet"

REAL_RUN = subprocess.run
REAL_POPEN = subprocess.Popen
REAL_BIND = instance.bind_socket

SKILL_IN_CHECKOUT = Path(".claude") / "skills" / "bookvie-backup" / "SKILL.md"
SYSTEM_PATH = ["/usr/bin", "/bin", "/usr/sbin", "/sbin"]
"""Kept on ``PATH`` for ``git``, ``sh`` and ``sleep``; none holds a ``bookvie`` or a ``claude``."""
LOG_ENV = "AUTOBACKUP_TEST_LOG"
STATUS_ENV = "FAKE_CLAUDE_STATUS"

RESTORE_TOOLS = {f"mcp__bookvie__{RESTORE_BACKUP}", f"mcp__bookvie-dev__{RESTORE_BACKUP}"}
MCP_NAME = re.compile(r"mcp__(bookvie|bookvie-dropbox)__[a-z_]+")
BASH_TOOL = re.compile(r"\bBash\b")
"""Claude Code's shell tool, bare or as ``Bash(…)``; a ``/bin/bash`` path isn't it."""

FAKE_CLAUDE = r"""#!/bin/sh
log="$AUTOBACKUP_TEST_LOG"
: > "$log/claude.args"
for arg in "$@"; do printf '%s\n' "$arg" >> "$log/claude.args"; done
if [ -f "$log/bookvie.started" ] && [ ! -f "$log/bookvie.term" ]; then
  : > "$log/claude.saw-server"
fi
exit "${FAKE_CLAUDE_STATUS:-0}"
"""
"""Writes its argv one per line, notes whether the fake server was up, exits with the set status."""

FAKE_BOOKVIE = r"""#!/bin/sh
log="$AUTOBACKUP_TEST_LOG"
: > "$log/bookvie.args"
for arg in "$@"; do printf '%s\n' "$arg" >> "$log/bookvie.args"; done
echo $$ > "$log/bookvie.pid"
trap ': > "$log/bookvie.term"; exit 0' TERM
: > "$log/bookvie.started"
while :; do sleep 0.05; done
"""
"""A server that never serves: writes its argv and pid, and marks a SIGTERM before it exits."""

FAKE_BOOKVIE_DROPBOX = "#!/bin/sh\nexit 0\n"


# --- Seams --------------------------------------------------------------------------


def _argv(command: Any) -> list[str]:
    if isinstance(command, (str, bytes)):
        return shlex.split(os.fsdecode(command))
    if isinstance(command, os.PathLike):
        return [os.fspath(command)]
    return [os.fsdecode(part) if isinstance(part, bytes) else os.fspath(part) for part in command]


def _is_launchctl(command: Any) -> bool:
    argv = _argv(command)
    return bool(argv) and Path(argv[0]).name == "launchctl"


@dataclass
class Launchctl:
    """What the code under test asked ``launchctl`` for, and how the fake answers."""

    calls: list[list[str]] = field(default_factory=list)
    kwargs: list[dict[str, Any]] = field(default_factory=list)
    returncode: int = 0
    raises: BaseException | None = None

    def verbs(self, since: int = 0) -> list[str]:
        return [call[0] for call in self.calls[since:] if call]

    def writes(self) -> list[list[str]]:
        return [call for call in self.calls if call[:1] in (["bootstrap"], ["bootout"])]


@pytest.fixture(autouse=True)
def launchctl(monkeypatch: pytest.MonkeyPatch) -> Launchctl:
    """Answers every ``launchctl`` run through ``subprocess.run``, and refuses any other way."""
    fake = Launchctl()

    def run(*args: Any, **kwargs: Any) -> subprocess.CompletedProcess:
        command = args[0] if args else kwargs.get("args")
        if not _is_launchctl(command):
            return REAL_RUN(*args, **kwargs)
        argv = _argv(command)
        fake.calls.append(argv[1:])
        fake.kwargs.append(kwargs)
        if fake.raises is not None:
            raise fake.raises
        textual = kwargs.get("text") or kwargs.get("universal_newlines") or kwargs.get("encoding")
        empty: str | bytes = "" if textual else b""
        if kwargs.get("check") and fake.returncode != 0:
            raise subprocess.CalledProcessError(fake.returncode, argv, empty, empty)
        return subprocess.CompletedProcess(argv, fake.returncode, empty, empty)

    class GuardedPopen(REAL_POPEN):  # type: ignore[misc, valid-type]
        def __init__(self, args: Any, *rest: Any, **kwargs: Any) -> None:
            if _is_launchctl(args):
                raise AssertionError("launchctl started outside subprocess.run: " + repr(args))
            super().__init__(args, *rest, **kwargs)

    monkeypatch.setattr(subprocess, "run", run)
    monkeypatch.setattr(subprocess, "Popen", GuardedPopen)
    return fake


@dataclass
class Tools:
    """The fake ``bookvie``, ``bookvie-dropbox`` and ``claude``, each in its own folder."""

    bookvie: Path
    dropbox: Path
    claude: Path
    log: Path

    def folders(self) -> list[Path]:
        return [self.bookvie, self.dropbox, self.claude]


def _command(folder: Path, name: str, script: str) -> Path:
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / name
    path.write_text(script, encoding="utf-8")
    path.chmod(0o755)
    return path


def _use_path(monkeypatch: pytest.MonkeyPatch, folders: list[Path]) -> None:
    monkeypatch.setenv("PATH", os.pathsep.join([*map(str, folders), *SYSTEM_PATH]))


def _use_log(monkeypatch: pytest.MonkeyPatch, log: Path) -> Path:
    log.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv(LOG_ENV, str(log))
    return log


@pytest.fixture
def tools(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Tools]:
    found = Tools(
        bookvie=tmp_path / "bin-bookvie",
        dropbox=tmp_path / "bin-dropbox",
        claude=tmp_path / "bin-claude",
        log=tmp_path / "log",
    )
    _command(found.bookvie, "bookvie", FAKE_BOOKVIE)
    _command(found.dropbox, "bookvie-dropbox", FAKE_BOOKVIE_DROPBOX)
    _command(found.claude, "claude", FAKE_CLAUDE)
    _use_path(monkeypatch, found.folders())
    _use_log(monkeypatch, found.log)
    yield found
    # A fake server the code under test started and never stopped doesn't outlive the test.
    for pid_file in tmp_path.rglob("bookvie.pid"):
        try:
            os.kill(int(pid_file.read_text().strip()), signal.SIGKILL)
        except OSError, ValueError:
            pass


def _git(*args: str, cwd: Path) -> None:
    REAL_RUN(
        ["git", "-c", "init.defaultBranch=main", *args],
        cwd=cwd,
        check=True,
        capture_output=True,
        env={**os.environ, "GIT_CONFIG_NOSYSTEM": "1"},
    )


def _repo(root: Path, *, with_skill: bool) -> Path:
    """A temporary main checkout, committed, holding a copy of the skill when ``with_skill``."""
    root.mkdir(parents=True)
    if with_skill:
        skill = root / SKILL_IN_CHECKOUT
        skill.parent.mkdir(parents=True)
        skill.write_text(SKILL_MD.read_text(encoding="utf-8"), encoding="utf-8")
    else:
        (root / "README.md").write_text("not bookvie\n", encoding="utf-8")
    _git("init", "-q", cwd=root)
    _git("add", ".", cwd=root)
    _git(
        "-c",
        "user.name=bookvie-tests",
        "-c",
        "user.email=tests@example.invalid",
        "-c",
        "commit.gpgsign=false",
        "commit",
        "-q",
        "-m",
        "init",
        cwd=root,
    )
    return root.resolve()


@pytest.fixture
def checkout(tmp_path: Path) -> Path:
    return _repo(tmp_path / "bookvie", with_skill=True)


def _main(argv: list[str]) -> int:
    """``cli.main(argv)``'s exit code, also when argparse exits (a red usage error)."""
    try:
        code = cli.main(argv)
    except SystemExit as exc:
        return exc.code if isinstance(exc.code, int) else (0 if exc.code is None else 1)
    return 0 if code is None else code


def _agents() -> Path:
    return Path.home() / "Library" / "LaunchAgents"


def _plists() -> list[Path]:
    return sorted(_agents().glob("*.plist")) if _agents().is_dir() else []


def _messages(stderr: str) -> str:
    """stderr without argparse's usage lines and without the ``bookvie: `` prefix."""
    kept = [
        line.removeprefix("bookvie: ")
        for line in stderr.splitlines()
        if line and not line.startswith("usage:") and not line[0].isspace()
    ]
    return "\n".join(kept)


def _lines(path: Path) -> list[str] | None:
    return path.read_text(encoding="utf-8").splitlines() if path.is_file() else None


def _flag_values(argv: list[str], flag: str) -> list[str]:
    """The names given to ``flag``: as ``flag a,b``, ``flag a b`` or ``flag=a,b``."""
    values: list[str] = []
    for index, token in enumerate(argv):
        if token == flag:
            for value in argv[index + 1 :]:
                if value.startswith("-"):
                    break
                values += [name for name in re.split(r"[,\s]+", value) if name]
        elif token.startswith(f"{flag}="):
            values += [name for name in re.split(r"[,\s]+", token.split("=", 1)[1]) if name]
    return values


def _health(monkeypatch: pytest.MonkeyPatch, answers: Callable[[], bool]) -> list[int]:
    """``instance.probe_health`` answering this computer's library when ``answers()``; the ports asked."""
    asked: list[int] = []

    def probe_health(port: int, *args: Any, **kwargs: Any) -> str | None:
        asked.append(port)
        return str(Path.home() / "bookvie-data") if answers() else None

    monkeypatch.setattr(instance, "probe_health", probe_health)
    return asked


def _resolved(path: str | Path) -> Path:
    return Path(path).expanduser().resolve()


# --- AC-1: install writes the plist and loads it --------------------------------------


# Un-skip when `bookvie autobackup install` writes and bootstraps the plist.
@pytest.mark.skip(reason=RED)
def test_install_writes_the_plist_and_bootstraps_it_and_installing_again_replaces_it(
    launchctl: Launchctl,
    tools: Tools,
    checkout: Path,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    # [P0] AC-1
    monkeypatch.chdir(checkout)
    code = _main(["autobackup", "install"])

    plists = _plists()
    assert len(plists) == 1, (code, capsys.readouterr().err, plists)

    label = cli.AUTOBACKUP_LABEL
    plist = plists[0]
    assert plist.name == f"{label}.plist"
    job = plistlib.loads(plist.read_bytes())
    assert job["Label"] == label
    bootstraps = [
        (call[1], _resolved(call[2]))
        for call in launchctl.calls
        if call[:1] == ["bootstrap"] and len(call) == 3
    ]
    assert (f"gui/{os.getuid()}", plist.resolve()) in bootstraps, launchctl.calls

    program = job["ProgramArguments"]
    assert Path(program[0]).is_absolute(), program
    assert _resolved(program[0]) == (tools.bookvie / "bookvie").resolve(), program
    assert program[1:] == ["autobackup", "run"]
    assert job["StartCalendarInterval"] in ({"Hour": 9, "Minute": 0}, [{"Hour": 9, "Minute": 0}])
    assert _resolved(job["WorkingDirectory"]) == checkout
    on_path = {
        _resolved(entry) for entry in job["EnvironmentVariables"]["PATH"].split(":") if entry
    }
    assert {folder.resolve() for folder in tools.folders()} <= on_path, on_path
    logs = Path.home() / "Library" / "Logs" / "bookvie"
    assert _resolved(job["StandardOutPath"]) == _resolved(logs / "autobackup.log")
    assert _resolved(job["StandardErrorPath"]) == _resolved(logs / "autobackup.err.log")
    assert code == 0

    # Installing again, after claude moved: one plist, every path resolved again, reloaded.
    moved = tmp_path / "bin-claude-moved"
    _command(moved, "claude", FAKE_CLAUDE)
    _use_path(monkeypatch, [tools.bookvie, tools.dropbox, moved])
    before = len(launchctl.calls)

    assert _main(["autobackup", "install"]) == 0
    assert _plists() == [plist]
    again = plistlib.loads(plist.read_bytes())
    on_path = {
        _resolved(entry) for entry in again["EnvironmentVariables"]["PATH"].split(":") if entry
    }
    assert moved.resolve() in on_path and tools.claude.resolve() not in on_path, on_path
    verbs = launchctl.verbs(since=before)
    assert "bootout" in verbs and "bootstrap" in verbs[verbs.index("bootout") :], verbs


# --- AC-2: install refuses, and writes nothing ---------------------------------------

REFUSALS = {
    "worktree": r"\bworktree\b",
    "no_skill": r"bookvie-backup",
    "dev": r"--dev\b",
    "no_claude": r"(?<![\w-])claude(?![\w-])",
    "no_bookvie": r"(?<![\w/-])bookvie(?![\w-])",
    "no_bookvie_dropbox": r"(?<![\w-])bookvie-dropbox(?![\w-])",
}
"""What each refusal's message must name, read from :func:`_messages`."""


def _files_under(folder: Path) -> list[str]:
    return sorted(str(path.relative_to(folder)) for path in folder.rglob("*"))


# Un-skip when install checks where it runs, --dev and the three commands before it writes.
@pytest.mark.skip(reason=RED)
@pytest.mark.parametrize("case", list(REFUSALS))
def test_install_refuses_and_writes_nothing(
    case: str,
    launchctl: Launchctl,
    tools: Tools,
    checkout: Path,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    # [P0] AC-2
    argv = ["autobackup", "install"]
    here = checkout
    if case == "worktree":
        here = tmp_path / "linked"
        _git("worktree", "add", "-q", str(here), cwd=checkout)
    elif case == "no_skill":
        here = _repo(tmp_path / "elsewhere", with_skill=False)
    elif case == "dev":
        argv = ["--dev", *argv]
    else:
        missing = {
            "no_claude": tools.claude,
            "no_bookvie": tools.bookvie,
            "no_bookvie_dropbox": tools.dropbox,
        }[case]
        _use_path(monkeypatch, [folder for folder in tools.folders() if folder != missing])
    monkeypatch.chdir(here)
    home_before = _files_under(Path.home())

    code = _main(argv)

    err = capsys.readouterr().err
    assert re.search(REFUSALS[case], _messages(err)), err
    assert code != 0
    assert not (Path.home() / "Library").exists()
    assert _files_under(Path.home()) == home_before
    assert launchctl.writes() == []


# --- AC-3: uninstall ------------------------------------------------------------------


# Un-skip when `bookvie autobackup uninstall` boots the job out and removes the plist.
@pytest.mark.skip(reason=RED)
def test_uninstall_boots_the_job_out_and_removes_the_plist_and_with_none_says_so(
    launchctl: Launchctl,
    tools: Tools,
    checkout: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    # [P1] AC-3
    monkeypatch.chdir(checkout)
    _main(["autobackup", "install"])
    before = len(launchctl.calls)

    code = _main(["autobackup", "uninstall"])

    bootouts = [call for call in launchctl.calls[before:] if call[:1] == ["bootout"]]
    assert any(len(call) >= 2 and call[1].startswith(f"gui/{os.getuid()}") for call in bootouts), (
        launchctl.calls
    )
    assert _plists() == []
    assert code == 0

    # With no job installed (launchd knows none either), it says so and succeeds.
    capsys.readouterr()
    launchctl.returncode = 113
    assert _main(["autobackup", "uninstall"]) == 0
    said = capsys.readouterr()
    assert re.search(
        r"\bnot installed\b|isn't installed|\bno\b[^.\n]*\bjob\b", said.out + said.err, re.I
    ), said


# --- AC-4: run ------------------------------------------------------------------------


# Un-skip when `bookvie autobackup run` starts bookvie, runs claude and stops what it started.
@pytest.mark.skip(reason=RED)
def test_run_starts_bookvie_when_health_does_not_answer_runs_claude_and_stops_only_what_it_started(
    tools: Tools,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    # [P0] AC-4
    log = tools.log
    monkeypatch.setenv(STATUS_ENV, "7")
    asked = _health(monkeypatch, lambda: (log / "bookvie.started").exists())

    code = _main(["autobackup", "run"])

    assert _lines(log / "bookvie.args") == ["--no-browser"], (code, capsys.readouterr().err)
    assert (log / "claude.saw-server").exists(), "claude ran before the server was up"
    argv = _lines(log / "claude.args") or []
    assert "-p" in argv and argv[argv.index("-p") + 1 :][:1] == ["/bookvie-backup"], argv
    assert _flag_values(argv, "--allowedTools"), argv
    assert _flag_values(argv, "--disallowedTools"), argv
    # run waits for the server it stopped, so the SIGTERM is handled by the time it returns.
    assert (log / "bookvie.term").exists(), "the server it started got no SIGTERM"
    assert code == 7
    assert asked and set(asked) == {cli.DEFAULT_PORT}, asked

    # bookvie already running: nothing is started, so nothing is stopped.
    log = _use_log(monkeypatch, tmp_path / "log-running")
    monkeypatch.setenv(STATUS_ENV, "0")
    _health(monkeypatch, lambda: True)

    assert _main(["autobackup", "run"]) == 0
    assert _lines(log / "bookvie.args") is None
    assert _lines(log / "claude.args") is not None


# --- AC-5: the headless tool lists -----------------------------------------------------


# Un-skip when cli.py has AUTOBACKUP_ALLOWED_TOOLS and AUTOBACKUP_DISALLOWED_TOOLS.
@pytest.mark.skip(reason=RED)
def test_the_headless_tool_lists_are_the_skills_tools_and_never_bash_or_a_restore(
    tools: Tools,
    checkout: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # [P0] AC-5
    allowed = list(getattr(cli, "AUTOBACKUP_ALLOWED_TOOLS", ()))
    skill = allowed_tools(SKILL_MD.read_text(encoding="utf-8")) or []

    assert sorted(allowed) == sorted(skill), (allowed, skill)
    assert len(set(allowed)) == len(allowed), allowed
    assert all(MCP_NAME.fullmatch(name) for name in allowed), allowed
    assert not [name for name in allowed if "bash" in name.lower()], allowed
    assert set(cli.AUTOBACKUP_DISALLOWED_TOOLS) == RESTORE_TOOLS

    # What the run hands claude.
    _health(monkeypatch, lambda: True)
    _main(["autobackup", "run"])
    argv = _lines(tools.log / "claude.args") or []
    assert sorted(_flag_values(argv, "--allowedTools")) == sorted(allowed), argv
    assert set(_flag_values(argv, "--disallowedTools")) == RESTORE_TOOLS, argv
    assert not [token for token in argv if BASH_TOOL.search(token)], argv
    assert "--dangerously-skip-permissions" not in argv, argv
    assert not [token for token in argv if "bypassPermissions" in token], argv

    # What the plist hands launchd.
    monkeypatch.chdir(checkout)
    _main(["autobackup", "install"])
    (plist,) = _plists()
    assert not BASH_TOOL.search(plist.read_text(encoding="utf-8"))


# --- AC-6: views/backup carries whether the job is installed ---------------------------


@dataclass
class ProbeSpy:
    answer: bool
    calls: int = 0

    def __call__(self) -> bool:
        self.calls += 1
        return self.answer


def _backup_client(
    data_dir: Path, *, probe: ProbeSpy, backups_dir: Path | None, dev: bool = False
) -> TestClient:
    """The app on a fresh library, with ``probe`` as its ``launchd_probe`` once the seam exists."""
    data_dir.mkdir(parents=True, exist_ok=True)
    app_kwargs: dict[str, Any] = {
        "data_dir": data_dir,
        "store": Store.open(data_dir),
        "clock": FakeClock(TODAY),
        "dev": dev,
        "backups_dir": backups_dir,
    }
    if "launchd_probe" in inspect.signature(create_app).parameters:
        app_kwargs["launchd_probe"] = probe
    app = create_app(data_dir / "no-static", **app_kwargs)
    return TestClient(app, base_url=BASE_URL, raise_server_exceptions=True)


def _installed(client: TestClient) -> Any:
    return (client.get("/api/views/backup").json().get("autoBackup") or {}).get("installed")


class _Stop(Exception):
    """Ends ``cli.main`` at ``create_app``, once its keywords are seen."""


# Un-skip when create_app takes launchd_probe and views/backup carries autoBackup.installed.
@pytest.mark.skip(reason=RED)
def test_the_backup_view_carries_whether_the_job_is_installed_and_only_the_real_library_probes(
    launchctl: Launchctl,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # [P0] AC-6
    real_backups = Path.home() / "bookvie-backups"
    probe = ProbeSpy(True)
    client = _backup_client(tmp_path / "library", probe=probe, backups_dir=real_backups)

    assert _installed(client) is True

    asked = probe.calls
    assert asked >= 1
    probe.answer = False
    assert _installed(client) is False
    assert probe.calls > asked, "each read asks again"

    # A --dev server, a server on another library, and one with no backups folder never probe.
    for name, kwargs in {
        "dev": {"dev": True, "backups_dir": real_backups},
        "other-library": {"backups_dir": tmp_path / "other-backups"},
        "no-backups-folder": {"backups_dir": None},
    }.items():
        spy = ProbeSpy(True)
        assert _installed(_backup_client(tmp_path / name, probe=spy, **kwargs)) is False, name
        assert spy.calls == 0, name

    # The default probe: only launchctl print's exit status, with a short timeout.
    monkeypatch.setattr(sys, "platform", "darwin")
    default = cli.launchd_job_installed
    launchctl.returncode = 0
    assert default() is True
    assert launchctl.calls[-1] == ["print", f"gui/{os.getuid()}/{cli.AUTOBACKUP_LABEL}"]
    timeout = launchctl.kwargs[-1].get("timeout")
    assert isinstance(timeout, (int, float)) and 0 < timeout <= 5, timeout
    launchctl.returncode = 113
    assert default() is False
    launchctl.raises = subprocess.TimeoutExpired(["launchctl"], timeout)
    assert default() is False
    launchctl.raises = OSError("launchctl not found")
    assert default() is False
    launchctl.raises = None
    launchctl.returncode = 0
    monkeypatch.setattr(sys, "platform", "linux")
    monkeypatch.setattr(platform, "system", lambda: "Linux")
    asked_launchctl = len(launchctl.calls)
    assert default() is False
    assert len(launchctl.calls) == asked_launchctl, "launchctl asked on a system that isn't macOS"

    # A production start hands create_app the default probe.
    seen: dict[str, Any] = {}
    sockets = []

    def bind(port: int):
        sockets.append(REAL_BIND(0))
        return sockets[-1]

    def stop_at_create_app(*args: Any, **kwargs: Any) -> Any:
        seen.update(kwargs)
        raise _Stop

    monkeypatch.setattr(cli.instance, "bind_socket", bind)
    monkeypatch.setattr(cli, "create_app", stop_at_create_app)
    try:
        with pytest.raises(_Stop):
            cli.main(["--data-dir", str(tmp_path / "served"), "--no-browser"])
    finally:
        for sock in sockets:
            sock.close()
    assert seen.get("launchd_probe") is cli.launchd_job_installed
