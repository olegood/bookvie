"""SPA serving rules (I/O matrix rows for the static app)."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from bookvie.http.app import create_app

INDEX = "<!doctype html><title>bookvie</title><div id=root></div>"


@pytest.fixture
def static_dir(tmp_path: Path) -> Path:
    static = tmp_path / "static"
    (static / "assets").mkdir(parents=True)
    (static / "index.html").write_text(INDEX)
    (static / "assets" / "index-abc123.js").write_text("console.log(1)")
    (static / "favicon.svg").write_text("<svg/>")
    return static


@pytest.fixture
def client(static_dir: Path) -> TestClient:
    return TestClient(create_app(static_dir))


def test_root_serves_index(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.text == INDEX
    assert response.headers["content-type"].startswith("text/html")


@pytest.mark.parametrize("path", ["/books/x", "/catalog", "/a/b/c?q=1"])
def test_client_route_falls_back_to_index(client: TestClient, path: str) -> None:
    response = client.get(path)
    assert response.status_code == 200
    assert response.text == INDEX


def test_static_asset_is_served(client: TestClient) -> None:
    response = client.get("/assets/index-abc123.js")
    assert response.status_code == 200
    assert response.text == "console.log(1)"


def test_missing_asset_is_404(client: TestClient) -> None:
    response = client.get("/assets/nope.js")
    assert response.status_code == 404
    assert INDEX not in response.text


def test_top_level_build_file_is_served(client: TestClient) -> None:
    response = client.get("/favicon.svg")
    assert response.status_code == 200
    assert response.text == "<svg/>"


@pytest.mark.parametrize("path", ["/api", "/api/nope", "/api/views/x", "/media", "/media/nope"])
def test_api_and_media_never_fall_back(client: TestClient, path: str) -> None:
    response = client.get(path)
    assert response.status_code == 404
    assert INDEX not in response.text


def test_traversal_does_not_escape_static_dir(client: TestClient, static_dir: Path) -> None:
    (static_dir.parent / "secret.txt").write_text("secret")
    response = client.get("/..%2Fsecret.txt")
    assert response.text != "secret"


def test_spa_not_built_names_npm_run_build(tmp_path: Path) -> None:
    client = TestClient(create_app(tmp_path / "missing"))
    response = client.get("/")
    assert response.status_code == 404
    assert "npm run build" in response.text
    assert client.get("/books/x").status_code == 404
    assert client.get("/assets/x.js").status_code == 404
