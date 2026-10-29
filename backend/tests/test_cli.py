"""CLI flags, data folder creation and browser opening."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from bookvie import cli


class FakeServer:
    instances: list["FakeServer"] = []

    def __init__(self, config) -> None:
        self.config = config
        self.started = False
        self.should_exit = False
        FakeServer.instances.append(self)

    def run(self) -> None:
        self.started = True


@pytest.fixture
def fake_server(monkeypatch: pytest.MonkeyPatch) -> type[FakeServer]:
    FakeServer.instances = []
    monkeypatch.setattr(cli.uvicorn, "Server", FakeServer)
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
        def run(self) -> None:
            self.should_exit = True

    monkeypatch.setattr(cli.uvicorn, "Server", FailingServer)
    cli.main(["--data-dir", str(tmp_path / "d")])
    assert opened == []


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
    response = TestClient(server.config.app).get("/")
    assert response.status_code == 200
    assert response.text == "<p>packaged spa</p>"
