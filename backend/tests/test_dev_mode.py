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

RED = "ATDD red phase (Story 11.2): --dev has no defaults, refusal or app-info yet"

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


@pytest.mark.skip(reason=RED)
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


@pytest.mark.skip(reason=RED)
@pytest.mark.parametrize("form", ["direct", "tilde", "symlink", "dotdot", "missing"])
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
    (home / "scratch").mkdir()
    (tmp_path / "link").symlink_to(real, target_is_directory=True)
    named = {
        "direct": str(real),
        "tilde": "~/bookvie-data",
        "symlink": str(tmp_path / "link"),
        "dotdot": str(home / "scratch" / ".." / "bookvie-data"),
        "missing": str(real),
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


@pytest.mark.skip(reason=RED)
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
    # /api/health is unchanged.
    assert client.get("/api/health").json() == {
        "app": "bookvie",
        "dataDir": str(home / "lib"),
        "pid": os.getpid(),
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
