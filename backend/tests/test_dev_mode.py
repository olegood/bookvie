"""Story 11.2: a ``--dev`` server keeps to its own folder and port (AD-16),
refuses the real library, and reports itself through ``app-info`` (AD-6).

Every test here sets ``HOME`` to a temporary folder first, so nothing reads
or writes the real ``~/bookvie-data``.
"""

import importlib
import os
import re
import subprocess
from collections.abc import Callable, Sequence
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel

import bookvie
from bookvie import cli, instance
from bookvie.instance import LOCK_NAME

REFUSAL = (
    "bookvie: --dev won't use your real library (~/bookvie-data). "
    "Leave out --data-dir to use ~/bookvie-data-dev, or pass a scratch folder."
)
SCHEMA_D_TS = Path(__file__).resolve().parents[2] / "frontend/src/api/generated/schema.d.ts"
REAL_BIND = instance.bind_socket


class _CapturedServer:
    """Stands in for uvicorn: records the app and returns at once."""

    apps: list[FastAPI] = []

    def __init__(self, config, *, release) -> None:
        self.started = False
        self.should_exit = False
        _CapturedServer.apps.append(config.app)

    def run(self, sockets=None) -> None:
        self.started = True


@pytest.fixture
def home(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Path:
    """A temporary ``HOME``; the real one is never touched."""
    folder = (tmp_path / "home").resolve()
    folder.mkdir()
    monkeypatch.setenv("HOME", str(folder))
    return folder


@pytest.fixture
def start(monkeypatch: pytest.MonkeyPatch) -> Callable[[Sequence[str]], FastAPI]:
    """Runs ``cli.main`` to the point of serving and returns the app it built."""
    monkeypatch.setattr(cli.instance, "bind_socket", lambda port: REAL_BIND(0))
    monkeypatch.setattr(cli, "_Server", _CapturedServer)

    def run(argv: Sequence[str]) -> FastAPI:
        _CapturedServer.apps = []
        assert cli.main(list(argv)) == 0
        (app,) = _CapturedServer.apps
        return app

    return run


def exit_code(run: Callable[[], int | None]) -> int | None:
    """What a process running ``run`` would exit with: its return or its SystemExit code."""
    try:
        return run()
    except SystemExit as exc:
        return exc.code if isinstance(exc.code, int) or exc.code is None else 1


def tree(folder: Path) -> dict[str, tuple[bytes | None, int]]:
    """Every entry under ``folder`` (and the folder itself, as ``.``): bytes for files, and mtime_ns."""
    if not folder.exists():
        return {}
    entries: dict[str, tuple[bytes | None, int]] = {".": (None, folder.stat().st_mtime_ns)}
    for path in sorted(folder.rglob("*")):
        data = path.read_bytes() if path.is_file() else None
        entries[str(path.relative_to(folder))] = (data, path.stat().st_mtime_ns)
    return entries


def checkout_commit() -> str:
    """The short hash of the checkout the ``bookvie`` package is imported from."""
    package = Path(bookvie.__file__).resolve().parent
    result = subprocess.run(
        ["git", "rev-parse", "--short", "HEAD"],
        cwd=package,
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


def test_dev_defaults_to_its_own_folder_and_port_and_help_shows_both(
    home: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    # AC-1: --dev defaults to ~/bookvie-data-dev and 8766; explicit flags win; plain bookvie is unchanged.
    dev = cli.parse_args(["--dev"])
    assert dev.data_dir == home / "bookvie-data-dev"
    assert dev.port == 8766

    scratch = home.parent / "scratch"
    assert cli.parse_args(["--dev", "--data-dir", str(scratch)]).data_dir == scratch
    assert cli.parse_args(["--dev", "--data-dir", str(scratch)]).port == 8766
    assert cli.parse_args(["--dev", "--port", "8799"]).port == 8799
    assert cli.parse_args(["--dev", "--port", "8799"]).data_dir == home / "bookvie-data-dev"

    plain = cli.parse_args([])
    assert plain.data_dir == home / "bookvie-data"
    assert plain.port == 8765

    with pytest.raises(SystemExit) as exc:
        cli.parse_args(["--help"])
    assert exc.value.code == 0
    text = " ".join(capsys.readouterr().out.split())
    assert re.search(r"~/bookvie-data(?!-dev)", text), text
    assert "~/bookvie-data-dev" in text
    assert "8765" in text
    assert "8766" in text


@pytest.mark.parametrize("form", ["direct", "tilde", "symlink", "dotdot", "missing", "case"])
def test_dev_refuses_the_real_library_before_the_lock_or_the_store(
    form: str,
    home: Path,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    # AC-2: --dev naming ~/bookvie-data in any form exits 2 with the message; nothing in it changes.
    real = home / "bookvie-data"
    if form != "missing":
        (real / "covers").mkdir(parents=True)
        (real / "library.json").write_bytes(b'{"real": true}')
        (real / "covers" / "c.jpg").write_bytes(b"cover")
    if form == "case" and not (home / "BOOKVIE-DATA").exists():
        pytest.skip("the temporary disk is case-sensitive")
    (home / "scratch").mkdir()
    (tmp_path / "link").symlink_to(real, target_is_directory=True)
    named = {
        "direct": str(real),
        "tilde": "~/bookvie-data",
        "symlink": str(tmp_path / "link"),
        "dotdot": str(home / "scratch" / ".." / "bookvie-data"),
        "missing": str(real),
        "case": "~/BOOKVIE-DATA",
    }[form]
    before = tree(real)

    calls: list[str] = []
    real_claim, real_open = cli.instance.claim_lock, cli.Store.open
    monkeypatch.setattr(
        cli.instance, "claim_lock", lambda *a, **k: calls.append("lock") or real_claim(*a, **k)
    )
    monkeypatch.setattr(
        cli.Store, "open", lambda *a, **k: calls.append("store") or real_open(*a, **k)
    )
    monkeypatch.setattr(cli.instance, "bind_socket", lambda port: REAL_BIND(0))
    monkeypatch.setattr(cli, "_Server", _CapturedServer)

    code = exit_code(lambda: cli.main(["--dev", "--no-browser", "--data-dir", named]))

    assert code == 2
    out, err = capsys.readouterr()
    assert err == REFUSAL + "\n"
    assert out == ""
    assert calls == []
    assert not (real / LOCK_NAME).exists()
    assert tree(real) == before
    assert real.exists() == (form != "missing")


def test_app_info_reports_version_mode_data_dir_and_commit_per_mode(
    home: Path,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    start: Callable[[Sequence[str]], FastAPI],
) -> None:
    # AC-3: GET /api/views/app-info is {version, mode, dataDir, commit}, from views/app_info.
    commit = checkout_commit()
    dev = start(["--dev", "--no-browser", "--port", "8799", "--data-dir", str(home / "lib")])
    client = TestClient(dev, base_url="http://127.0.0.1:8799")

    response = client.get("/api/views/app-info")

    assert response.status_code == 200
    assert response.json() == {
        "version": bookvie.__version__,
        "mode": "dev",
        "dataDir": "~/lib",
        "commit": commit,
    }
    # Read once at startup: git going away afterwards changes nothing.
    with monkeypatch.context() as m:
        m.setenv("PATH", str(tmp_path / "no-git"))
        assert client.get("/api/views/app-info").json()["commit"] == commit
    # /api/health adds only the checkout the package runs from (Epic 11 retro item 80).
    assert client.get("/api/health").json() == {
        "app": "bookvie",
        "dataDir": str(home / "lib"),
        "pid": os.getpid(),
        "checkout": str(Path(bookvie.__file__).resolve().parent),
    }

    outside = tmp_path / "outside"
    production = start(["--no-browser", "--port", "8798", "--data-dir", str(outside)])
    answer = TestClient(production, base_url="http://127.0.0.1:8798").get("/api/views/app-info")
    assert answer.json() == {
        "version": bookvie.__version__,
        "mode": "production",
        "dataDir": str(outside.resolve()),
        "commit": None,
    }

    # Without git, or outside a checkout, commit is null and the server still starts.
    (tmp_path / "no-git").mkdir()
    for name, value in [("PATH", str(tmp_path / "no-git")), ("GIT_DIR", str(tmp_path / "no-repo"))]:
        with monkeypatch.context() as m:
            m.setenv(name, value)
            app = start(["--dev", "--no-browser", "--port", "8797", "--data-dir", str(home / "x")])
            info = TestClient(app, base_url="http://127.0.0.1:8797").get("/api/views/app-info")
            assert info.status_code == 200, name
            assert info.json()["commit"] is None, name

    # A Pydantic model in views/app_info, in the OpenAPI schema and schema.d.ts.
    schema = dev.openapi()
    content = schema["paths"]["/api/views/app-info"]["get"]["responses"]["200"]["content"]
    name = content["application/json"]["schema"]["$ref"].rsplit("/", 1)[1]
    shape = schema["components"]["schemas"][name]
    assert set(shape["properties"]) == {"version", "mode", "dataDir", "commit"}
    assert shape["properties"]["mode"]["enum"] == ["dev", "production"]
    model = getattr(importlib.import_module("bookvie.views.app_info"), name)
    assert issubclass(model, BaseModel)
    generated = SCHEMA_D_TS.read_text(encoding="utf-8")
    assert '"/api/views/app-info"' in generated
    assert f"{name}: {{" in generated


def test_dev_refuses_its_default_folder_when_it_links_to_the_real_library(
    home: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    # AC-2: with no flags, ~/bookvie-data-dev as a symlink to ~/bookvie-data is refused too.
    real = home / "bookvie-data"
    real.mkdir()
    (real / "library.json").write_bytes(b'{"real": true}')
    (home / "bookvie-data-dev").symlink_to(real, target_is_directory=True)
    before = tree(real)
    monkeypatch.setattr(cli.instance, "bind_socket", lambda port: REAL_BIND(0))
    monkeypatch.setattr(cli, "_Server", _CapturedServer)

    code = exit_code(lambda: cli.main(["--dev", "--no-browser"]))

    assert code == 2
    out, err = capsys.readouterr()
    assert err == REFUSAL + "\n"
    assert out == ""
    assert not (real / LOCK_NAME).exists()
    assert tree(real) == before


@pytest.mark.parametrize("name", ["bookvie-data2", "bookvie-data/sub", "bookvie-data-dev"])
def test_dev_starts_on_a_folder_that_only_looks_like_the_real_library(
    name: str, home: Path, start: Callable[[Sequence[str]], FastAPI]
) -> None:
    # AC-2 near misses: only the real library itself is refused.
    folder = home / name
    start(["--dev", "--no-browser", "--port", "8799", "--data-dir", str(folder)])
    assert folder.is_dir()


def test_plain_bookvie_still_opens_the_real_library(
    home: Path, start: Callable[[Sequence[str]], FastAPI]
) -> None:
    # AC-2: the refusal is --dev only.
    start(["--no-browser", "--port", "8799", "--data-dir", "~/bookvie-data"])
    assert (home / "bookvie-data").is_dir()


def test_dev_refuses_the_real_library_when_home_is_a_symlink(
    home: Path,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    # AC-2: both sides are resolved, so HOME through a symlink is refused too.
    (tmp_path / "home-link").symlink_to(home, target_is_directory=True)
    monkeypatch.setenv("HOME", str(tmp_path / "home-link"))

    code = exit_code(
        lambda: cli.main(["--dev", "--no-browser", "--data-dir", str(home / "bookvie-data")])
    )

    assert code == 2
    assert capsys.readouterr().err == REFUSAL + "\n"
    assert not (home / "bookvie-data").exists()


def test_data_dir_shows_tilde_only_inside_the_home_folder(home: Path, tmp_path: Path) -> None:
    # AC-3 edges: the home folder itself is ~, a sibling sharing its name as a prefix is absolute.
    from bookvie.views.app_info import display_path

    assert display_path(home, home) == "~"
    assert display_path(home / "a" / "b", home) == "~/a/b"
    sibling = tmp_path / "home2"
    assert display_path(sibling, home) == str(sibling.resolve())


def test_commit_is_read_once_per_dev_start_and_never_in_production(
    home: Path, monkeypatch: pytest.MonkeyPatch, start: Callable[[Sequence[str]], FastAPI]
) -> None:
    calls: list[Sequence[str]] = []
    real_run = subprocess.run

    def run(args, *rest, **kwargs):
        calls.append(args)
        return real_run(args, *rest, **kwargs)

    monkeypatch.setattr(cli.subprocess, "run", run)
    start(["--no-browser", "--port", "8799", "--data-dir", str(home / "a")])
    assert calls == []
    start(["--dev", "--no-browser", "--port", "8799", "--data-dir", str(home / "b")])
    assert len(calls) == 1
    assert calls[0][0] == "git"


@pytest.mark.parametrize(
    "error",
    [
        FileNotFoundError("git"),
        subprocess.TimeoutExpired("git", 5.0),
        UnicodeDecodeError("utf-8", b"\xff", 0, 1, "invalid start byte"),
    ],
)
def test_commit_is_null_whatever_reading_it_raises(
    error: Exception,
    home: Path,
    monkeypatch: pytest.MonkeyPatch,
    start: Callable[[Sequence[str]], FastAPI],
) -> None:
    # Always: any failure gives `commit: null`, never a failed start (code review of 11.2).
    def run(*args, **kwargs):
        raise error

    monkeypatch.setattr(cli.subprocess, "run", run)
    app = start(["--dev", "--no-browser", "--port", "8799", "--data-dir", str(home / "dev")])
    assert app.state.app_info.commit is None


def test_dev_refuses_a_case_variant_of_the_real_library_that_does_not_exist_yet(
    home: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    # Epic 11 retro item 76 (E11-B1): samefile can't see a missing folder, so the
    # case-insensitive comparison must refuse it, and nothing may be created.
    probe = home / "probe"
    probe.mkdir()
    insensitive = (home / "PROBE").exists()
    probe.rmdir()
    if not insensitive:
        pytest.skip("the temporary disk is case-sensitive")
    # Should the refusal fail, the start returns at once instead of serving.
    monkeypatch.setattr(cli.instance, "bind_socket", lambda port: REAL_BIND(0))
    monkeypatch.setattr(cli, "_Server", _CapturedServer)

    code = exit_code(lambda: cli.main(["--dev", "--no-browser", "--data-dir", "~/BOOKVIE-DATA"]))

    assert code == 2
    assert capsys.readouterr().err == REFUSAL + "\n"
    assert sorted(home.iterdir()) == []


@pytest.mark.parametrize("insensitive", [True, False])
def test_a_missing_case_variant_is_refused_only_on_a_case_insensitive_disk(
    insensitive: bool,
    home: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    # Epic 11 retro item 76 (E11-B1), on any disk: the disk check is faked.
    probed: list[Path] = []
    monkeypatch.setattr(cli, "_case_insensitive_disk", lambda p: probed.append(p) or insensitive)
    argv = ["--dev", "--no-browser", "--data-dir", "~/Bookvie-Data"]

    assert cli._refuses_real_library(cli.parse_args(argv)) is insensitive
    assert probed == [(home / "bookvie-data").resolve()]
    if insensitive:
        assert exit_code(lambda: cli.main(argv)) == 2
        assert capsys.readouterr().err == REFUSAL + "\n"
    # Another name, or production, never reaches the disk check.
    probed.clear()
    other = cli.parse_args(["--dev", "--no-browser", "--data-dir", "~/bookvie-data-x"])
    assert cli._refuses_real_library(other) is False
    prod = cli.parse_args(["--no-browser", "--data-dir", "~/BOOKVIE-DATA"])
    assert cli._refuses_real_library(prod) is False
    assert probed == []
    assert sorted(home.iterdir()) == []


def test_the_disk_probe_reads_case_from_the_nearest_existing_lettered_ancestor(
    tmp_path: Path,
) -> None:
    # Epic 11 retro item 76 (E11-B1): the probe itself, on whichever disk runs it.
    folder = (tmp_path / "Probe").resolve()
    folder.mkdir()
    insensitive = (tmp_path / "pROBE").exists()

    assert cli._case_insensitive_disk(folder / "missing" / "deeper") is insensitive
    assert cli._case_insensitive_disk(folder) is insensitive


def test_the_disk_probe_fails_closed_when_samefile_errors(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    folder = (tmp_path / "probe").resolve()
    folder.mkdir()
    monkeypatch.setattr(Path, "exists", lambda self: True)

    def broken(a, b):
        raise OSError("unreadable")

    monkeypatch.setattr(cli.os.path, "samefile", broken)
    assert cli._case_insensitive_disk(folder / "bookvie-data") is True


@pytest.mark.parametrize(
    ("platform", "expected"), [("darwin", True), ("win32", True), ("linux", False)]
)
def test_the_disk_probe_uses_the_platform_default_without_a_lettered_ancestor(
    platform: str, expected: bool, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(cli.sys, "platform", platform)
    assert cli._case_insensitive_disk(Path("/")) is expected
    assert cli._case_insensitive_disk(Path("/0/1")) is expected


def test_a_missing_unicode_variant_is_refused_on_a_case_insensitive_disk(
    home: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    # The same name in the other Unicode normal form is the same folder on APFS.
    monkeypatch.setattr(cli, "_case_insensitive_disk", lambda p: True)
    monkeypatch.setattr(cli, "DEFAULT_DATA_DIR", "~/bookvie-d\u00e9ta")
    argv = ["--dev", "--no-browser", "--data-dir", "~/bookvie-de\u0301ta"]
    assert cli._refuses_real_library(cli.parse_args(argv)) is True


@pytest.mark.parametrize(("dev", "served"), [(True, "favicon-dev.svg"), (False, "favicon.svg")])
def test_favicon_route_serves_the_file_for_its_mode(dev: bool, served: str, tmp_path: Path) -> None:
    # AC-4: one route, the file chosen by mode, same headers on GET and HEAD.
    from bookvie.http.app import create_app

    static = tmp_path / "static"
    static.mkdir()
    (static / "index.html").write_text("<p>spa</p>")
    (static / "favicon.svg").write_text("<svg>sage</svg>")
    (static / "favicon-dev.svg").write_text("<svg>amber</svg>")
    client = TestClient(create_app(static, dev=dev), base_url="http://127.0.0.1:8765")

    for method in ("GET", "HEAD"):
        response = client.request(method, "/favicon.svg")
        assert response.status_code == 200
        assert response.headers["content-type"] == "image/svg+xml"
        assert response.headers["cache-control"] == "no-cache"
    assert client.get("/favicon.svg").text == (static / served).read_text()


def test_dev_favicon_route_answers_404_when_the_dev_icon_is_not_built(tmp_path: Path) -> None:
    # AC-4: never the sage file or index.html in its place.
    from bookvie.http.app import create_app

    static = tmp_path / "static"
    static.mkdir()
    (static / "index.html").write_text("<p>spa</p>")
    (static / "favicon.svg").write_text("<svg>sage</svg>")
    client = TestClient(create_app(static, dev=True), base_url="http://127.0.0.1:8765")

    assert client.get("/favicon.svg").status_code == 404


@pytest.mark.parametrize("form", ["existing", "missing"])
def test_a_real_dev_process_refuses_the_real_library_with_exit_2(form: str, home: Path) -> None:
    # AC-2 at the process level (automate): the exit code a shell sees, the exact stderr, no stdout.
    import sys

    real = home / "bookvie-data"
    if form == "existing":
        real.mkdir()
        (real / "library.json").write_bytes(b'{"real": true}')
    before = tree(real)
    cmd = [
        sys.executable,
        "-m",
        "bookvie.cli",
        "--dev",
        "--no-browser",
        "--data-dir",
        "~/bookvie-data",
    ]

    done = subprocess.run(
        cmd, env=os.environ | {"HOME": str(home)}, capture_output=True, text=True, timeout=30
    )

    assert done.returncode == 2
    assert done.stderr == REFUSAL + "\n"
    assert done.stdout == ""
    assert tree(real) == before
    assert real.exists() == (form == "existing")
    assert not (home / "bookvie-data-dev").exists()


# Epic 11 retro item 80 (E11-S2): a second --dev from another checkout doesn't
# silently join the first. The running server is faked: a real lock naming a
# live pid, and stand-in health probes. Nothing binds 8766.

OWN_CHECKOUT = Path(bookvie.__file__).resolve().parent


def _other_checkout_refusal(checkout: str, port: int, data_folder: str) -> str:
    return (
        f"bookvie: a --dev server from another checkout ({checkout}) is already running "
        f"on port {port} with {data_folder}. "
        f"Stop it, or start this one with --port <number> --data-dir <folder>.\n"
    )


def _live_lock(data_dir: Path, pid: int, port: int) -> bytes:
    """A lock old enough to be judged at once (not a starting server)."""
    data_dir.mkdir(parents=True, exist_ok=True)
    path = data_dir / LOCK_NAME
    path.write_text(f'{{"pid": {pid}, "port": {port}}}')
    old = path.stat().st_mtime - 60
    os.utime(path, (old, old))
    return path.read_bytes()


@pytest.fixture
def running(
    home: Path, monkeypatch: pytest.MonkeyPatch
) -> Callable[[str | None], tuple[Path, bytes, list[int]]]:
    """A live dev server on ``~/bookvie-data-dev`` at 8766 reporting ``checkout``.

    Returns the data folder, the lock's bytes and the ports ``probe_checkout`` saw.
    """

    def fake(checkout: str | None) -> tuple[Path, bytes, list[int]]:
        data_dir = home / "bookvie-data-dev"
        raw = _live_lock(data_dir, os.getpid(), 8766)
        probed: list[int] = []
        monkeypatch.setattr(instance, "probe_health", lambda port, timeout=0.5: str(data_dir))
        monkeypatch.setattr(
            instance, "probe_checkout", lambda port, timeout=0.5: probed.append(port) or checkout
        )
        monkeypatch.setattr(cli.instance, "bind_socket", lambda port: REAL_BIND(0))
        monkeypatch.setattr(cli, "_Server", _CapturedServer)
        _CapturedServer.apps = []
        return data_dir, raw, probed

    return fake


def test_a_second_dev_from_the_same_checkout_joins_the_running_server(
    running, capsys: pytest.CaptureFixture[str]
) -> None:
    data_dir, raw, probed = running(str(OWN_CHECKOUT))

    code = exit_code(lambda: cli.main(["--dev", "--no-browser"]))

    assert code == 0
    assert capsys.readouterr().err == "bookvie is already running at http://127.0.0.1:8766/\n"
    assert probed == [8766]
    assert (data_dir / LOCK_NAME).read_bytes() == raw
    assert _CapturedServer.apps == []


def test_a_second_dev_from_another_checkout_is_refused(
    running, home: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    other = home / "worktrees" / "a" / "backend" / "bookvie"
    data_dir, raw, probed = running(str(other))

    code = exit_code(lambda: cli.main(["--dev", "--no-browser"]))

    assert code == 1
    out, err = capsys.readouterr()
    assert out == ""
    assert err == _other_checkout_refusal(
        "~/worktrees/a/backend/bookvie", 8766, "~/bookvie-data-dev"
    )
    assert probed == [8766]
    assert (data_dir / LOCK_NAME).read_bytes() == raw
    assert _CapturedServer.apps == []


def test_a_dev_server_that_reports_no_checkout_counts_as_another_checkout(
    running, capsys: pytest.CaptureFixture[str]
) -> None:
    # Fails closed: an older server's health has no checkout.
    data_dir, raw, _ = running(None)

    code = exit_code(lambda: cli.main(["--dev", "--no-browser"]))

    assert code == 1
    assert capsys.readouterr().err == _other_checkout_refusal(
        "an unknown checkout", 8766, "~/bookvie-data-dev"
    )
    assert (data_dir / LOCK_NAME).read_bytes() == raw


def test_production_never_compares_checkouts(
    running, home: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    data_dir, raw, probed = running(None)

    code = exit_code(lambda: cli.main(["--no-browser", "--data-dir", str(data_dir)]))

    assert code == 0
    assert capsys.readouterr().err == "bookvie is already running at http://127.0.0.1:8766/\n"
    assert probed == []
    assert (data_dir / LOCK_NAME).read_bytes() == raw


@pytest.mark.parametrize("same", [True, False])
def test_a_dev_port_conflict_on_the_same_folder_compares_checkouts(
    same: bool,
    home: Path,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    # This launch took the lock, the bind failed, and health on the port answers
    # for this folder: the lock goes back to the running server either way.
    data_dir = home / "bookvie-data-dev"
    other = tmp_path / "elsewhere" / "bookvie"
    running_pid = os.getppid()
    probed: list[int] = []

    def taken(port: int):
        raise OSError(48, f"port {port} is already in use")

    monkeypatch.setattr(cli.instance, "bind_socket", taken)
    monkeypatch.setattr(cli, "_Server", _CapturedServer)
    monkeypatch.setattr(instance, "probe_health", lambda port, timeout=0.5: str(data_dir))
    monkeypatch.setattr(instance, "probe_pid", lambda port, timeout=0.5: running_pid)
    monkeypatch.setattr(
        instance,
        "probe_checkout",
        lambda port, timeout=0.5: probed.append(port) or str(OWN_CHECKOUT if same else other),
    )
    _CapturedServer.apps = []

    code = exit_code(lambda: cli.main(["--dev", "--no-browser"]))

    err = capsys.readouterr().err
    if same:
        assert code == 0
        assert err == "bookvie is already running at http://127.0.0.1:8766/\n"
    else:
        assert code == 1
        assert err == _other_checkout_refusal(str(other.resolve()), 8766, "~/bookvie-data-dev")
    assert probed == [8766]
    assert (data_dir / LOCK_NAME).read_text() == f'{{"pid": {running_pid}, "port": 8766}}'
    assert _CapturedServer.apps == []
