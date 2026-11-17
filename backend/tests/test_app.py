"""SPA serving rules (I/O matrix rows for the static app)."""

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from bookvie.http.app import create_app
from tests.helpers import BASE_URL

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
    return TestClient(create_app(static_dir), base_url=BASE_URL)


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


def test_favicon_route_serves_the_built_icon_uncached_before_the_spa_catch_all(
    static_dir: Path,
) -> None:
    # Story 11.1 AC-3 (AR33).
    app = create_app(static_dir)
    client = TestClient(app, base_url=BASE_URL)

    response = client.get("/favicon.svg")

    assert response.headers.get("cache-control") == "no-cache"
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/svg+xml"
    assert response.text == "<svg/>"
    paths = [getattr(route, "path", None) for route in app.routes]
    assert "/favicon.svg" in paths
    assert paths.index("/favicon.svg") < paths.index("/{path:path}")
    # Any other top-level file behaves as before: /favicon.ico gets the SPA,
    # a built file is served as is, and neither is marked no-cache.
    ico = client.get("/favicon.ico")
    assert (ico.status_code, ico.text) == (200, INDEX)
    assert "cache-control" not in ico.headers
    (static_dir / "robots.txt").write_text("User-agent: *")
    other = client.get("/robots.txt")
    assert (other.status_code, other.text) == (200, "User-agent: *")
    assert "cache-control" not in other.headers


def test_favicon_head_has_the_same_headers_and_no_body(client: TestClient) -> None:
    get = client.get("/favicon.svg")
    head = client.head("/favicon.svg")
    assert head.status_code == 200
    assert head.content == b""
    assert head.headers["content-type"] == "image/svg+xml"
    assert head.headers["cache-control"] == "no-cache"
    assert head.headers["content-length"] == get.headers["content-length"]
    assert head.headers["etag"] == get.headers["etag"]


def test_favicon_not_built_is_404_never_index(client: TestClient, static_dir: Path) -> None:
    (static_dir / "favicon.svg").unlink()
    response = client.get("/favicon.svg")
    assert response.status_code == 404
    assert INDEX not in response.text
    assert response.headers["content-type"] != "image/svg+xml"
    assert client.head("/favicon.svg").status_code == 404


def test_favicon_is_read_per_request(client: TestClient, static_dir: Path) -> None:
    assert client.get("/favicon.svg").text == "<svg/>"
    (static_dir / "favicon.svg").write_text("<svg><path/></svg>")
    assert client.get("/favicon.svg").text == "<svg><path/></svg>"


def test_favicon_foreign_host_is_403(client: TestClient) -> None:
    response = client.get("/favicon.svg", headers={"Host": "evil.example"})
    assert response.status_code == 403
    assert "<svg" not in response.text


@pytest.mark.parametrize(
    "path",
    ["/api", "/api/nope", "/api/views/x", "/media", "/media/nope", "//api/x", "/API/x", "/Media/x"],
)
def test_api_and_media_never_fall_back(client: TestClient, path: str) -> None:
    # Absolute URL: httpx would read a bare `//api/x` as host `api`.
    response = client.get(f"{BASE_URL}{path}")
    assert response.status_code == 404
    assert INDEX not in response.text


def test_traversal_does_not_escape_static_dir(client: TestClient, static_dir: Path) -> None:
    (static_dir.parent / "secret.txt").write_text("secret")
    response = client.get("/..%2Fsecret.txt")
    assert response.text != "secret"


def test_spa_not_built_names_npm_run_build(tmp_path: Path) -> None:
    client = TestClient(create_app(tmp_path / "missing"), base_url=BASE_URL)
    response = client.get("/")
    assert response.status_code == 404
    assert "npm run build" in response.text
    assert client.get("/books/x").status_code == 404
    assert client.get("/assets/x.js").status_code == 404


def test_health_reports_resolved_data_dir(tmp_path: Path, static_dir: Path) -> None:
    (tmp_path / "data").mkdir()
    app = create_app(static_dir, data_dir=tmp_path / "x" / ".." / "data")
    response = TestClient(app, base_url=BASE_URL).get("/api/health")
    assert response.status_code == 200
    assert response.json() == {
        "app": "bookvie",
        "dataDir": str((tmp_path / "data").resolve()),
        "pid": os.getpid(),
    }


def test_app_has_write_lock(static_dir: Path) -> None:
    lock = create_app(static_dir).state.write_lock
    assert lock.acquire(blocking=False)
    lock.release()
