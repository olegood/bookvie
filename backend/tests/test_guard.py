"""Host/Origin guard matrix (FND-API-004, AD-16)."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from bookvie.http.app import create_app

PORT = 8765


@pytest.fixture
def static_dir(tmp_path: Path) -> Path:
    static = tmp_path / "static"
    static.mkdir()
    (static / "index.html").write_text("<p>spa</p>")
    return static


def _client(static_dir: Path, tmp_path: Path, *, dev: bool = False) -> TestClient:
    app = create_app(static_dir, data_dir=tmp_path, port=PORT, dev=dev)
    return TestClient(app, base_url=f"http://127.0.0.1:{PORT}")


def _hits(client: TestClient) -> list[str]:
    """Record every request that reaches a route handler."""
    hits: list[str] = []
    app = client.app

    @app.get("/api/probe-handler")
    async def probe() -> dict[str, bool]:
        hits.append("ran")
        return {"ok": True}

    # Ahead of the SPA catch-all, which would otherwise 404 `/api/*`.
    app.router.routes.insert(0, app.router.routes.pop())
    return hits


GOOD_HOSTS = [f"127.0.0.1:{PORT}", f"localhost:{PORT}", f"LOCALHOST:{PORT}"]
GOOD_ORIGINS = [None, f"http://127.0.0.1:{PORT}", f"http://localhost:{PORT}"]


@pytest.mark.parametrize("host", GOOD_HOSTS)
@pytest.mark.parametrize("origin", GOOD_ORIGINS)
def test_own_host_and_origin_pass(
    static_dir: Path, tmp_path: Path, host: str, origin: str | None
) -> None:
    client = _client(static_dir, tmp_path)
    hits = _hits(client)
    headers = {"Host": host} | ({"Origin": origin} if origin else {})
    response = client.get("/api/probe-handler", headers=headers)
    assert response.status_code == 200
    assert hits == ["ran"]
    assert client.get("/", headers=headers).status_code == 200


@pytest.mark.parametrize(
    "host",
    [
        "evil.example",
        f"evil.example:{PORT}",
        "127.0.0.1",
        "localhost",
        "127.0.0.1:9999",
        "localhost:5173",
        f"0.0.0.0:{PORT}",
        f"[::1]:{PORT}",
        f"127.0.0.1.evil.example:{PORT}",
        "",
    ],
)
def test_bad_host_is_403_and_handler_not_run(
    static_dir: Path, tmp_path: Path, host: str
) -> None:
    client = _client(static_dir, tmp_path)
    hits = _hits(client)
    response = client.get("/api/probe-handler", headers={"Host": host})
    assert response.status_code == 403
    assert response.headers["content-type"].startswith("text/plain")
    assert hits == []


@pytest.mark.parametrize(
    "origin",
    [
        "null",
        "http://evil.example",
        f"http://evil.example:{PORT}",
        f"https://127.0.0.1:{PORT}",
        "http://127.0.0.1",
        "http://127.0.0.1:9999",
        f"http://127.0.0.1:{PORT}/",
        "",
    ],
)
def test_foreign_origin_is_403_and_handler_not_run(
    static_dir: Path, tmp_path: Path, origin: str
) -> None:
    client = _client(static_dir, tmp_path)
    hits = _hits(client)
    response = client.post(
        "/api/probe-handler", headers={"Host": f"127.0.0.1:{PORT}", "Origin": origin}
    )
    assert response.status_code == 403
    assert hits == []


@pytest.mark.parametrize("origin", ["http://127.0.0.1:5173", "http://localhost:5173"])
def test_dev_origin_rejected_without_dev(
    static_dir: Path, tmp_path: Path, origin: str
) -> None:
    client = _client(static_dir, tmp_path)
    hits = _hits(client)
    response = client.get(
        "/api/probe-handler", headers={"Host": f"127.0.0.1:{PORT}", "Origin": origin}
    )
    assert response.status_code == 403
    assert hits == []


@pytest.mark.parametrize("origin", ["http://127.0.0.1:5173", "http://localhost:5173"])
def test_dev_origin_accepted_with_dev(static_dir: Path, tmp_path: Path, origin: str) -> None:
    client = _client(static_dir, tmp_path, dev=True)
    hits = _hits(client)
    response = client.get(
        "/api/probe-handler", headers={"Host": f"127.0.0.1:{PORT}", "Origin": origin}
    )
    assert response.status_code == 200
    assert hits == ["ran"]


def test_dev_does_not_relax_host(static_dir: Path, tmp_path: Path) -> None:
    client = _client(static_dir, tmp_path, dev=True)
    response = client.get(
        "/api/health",
        headers={"Host": "127.0.0.1:5173", "Origin": "http://127.0.0.1:5173"},
    )
    assert response.status_code == 403


def test_guard_uses_configured_port(static_dir: Path, tmp_path: Path) -> None:
    app = create_app(static_dir, data_dir=tmp_path, port=8799)
    assert TestClient(app, base_url="http://127.0.0.1:8799").get("/api/health").status_code == 200
    assert TestClient(app, base_url=f"http://127.0.0.1:{PORT}").get("/api/health").status_code == 403


def test_health_is_guarded_too(static_dir: Path, tmp_path: Path) -> None:
    client = _client(static_dir, tmp_path)
    assert client.get("/api/health", headers={"Host": "evil.example"}).status_code == 403
    assert client.get("/api/health", headers={"Origin": "null"}).status_code == 403
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"app": "bookvie", "dataDir": str(tmp_path.resolve())}
