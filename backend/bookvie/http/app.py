"""FastAPI application factory.

Serves the built SPA from ``static/``: ``/assets`` holds the hashed build
output, and every other path outside ``/api`` and ``/media`` falls back to
``index.html`` so client-side routes work on reload.

Every request passes a Host/Origin guard (AD-16) first. It rejects a foreign
Host and any foreign Origin, so a cross-site page cannot make credentialed,
CORS or state-changing requests. Simple cross-site GETs carry no Origin and
do pass, so GET routes must stay free of side effects.
"""

import os
import threading
from collections.abc import Iterable
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from starlette.types import ASGIApp, Receive, Scope, Send

from bookvie.intents import Clock, SystemClock

from .api import install_api

STATIC_DIR = Path(__file__).resolve().parent / "static"

# Path prefixes that belong to the server and must never fall back to the SPA.
_SERVER_PREFIXES = ("api", "media")

# Vite dev server origins, accepted only with `--dev`.
DEV_ORIGINS = ("http://127.0.0.1:5173", "http://localhost:5173")

_NOT_BUILT = (
    "The bookvie web app has not been built. "
    "Run `npm run build` in the repository root, then reinstall bookvie.\n"
)


class _AssetFiles(StaticFiles):
    """StaticFiles that answers 404, not 500, while the SPA is not built yet."""

    async def check_config(self) -> None:
        try:
            await super().check_config()
        except RuntimeError:
            pass


class HostOriginGuard:
    """Pure-ASGI guard: 403 unless Host and any Origin are this server's own."""

    def __init__(
        self, app: ASGIApp, *, port: int, extra_origins: Iterable[str] = ()
    ) -> None:
        self.app = app
        self.hosts = {f"127.0.0.1:{port}", f"localhost:{port}"}
        self.origins = {f"http://{host}" for host in self.hosts} | set(extra_origins)

    def _allowed(self, scope: Scope) -> bool:
        hosts: list[str] = []
        origins: list[str] = []
        for name, value in scope.get("headers", []):
            if name == b"host":
                hosts.append(value.decode("latin-1").lower())
            elif name == b"origin":
                origins.append(value.decode("latin-1").lower())
        if len(hosts) != 1 or hosts[0] not in self.hosts:
            return False
        return all(origin in self.origins for origin in origins)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] in ("http", "websocket") and not self._allowed(scope):
            if scope["type"] == "websocket":
                await send({"type": "websocket.close", "code": 1008})
                return
            await PlainTextResponse("Forbidden\n", status_code=403)(scope, receive, send)
            return
        await self.app(scope, receive, send)


def _is_server_path(path: str) -> bool:
    # Tolerate `//api/x` and `/API/x` so they 404 instead of getting the SPA.
    first = path.lstrip("/").split("/", 1)[0].lower()
    return first in _SERVER_PREFIXES


def create_app(
    static_dir: Path = STATIC_DIR,
    *,
    data_dir: Path | None = None,
    port: int = 8765,
    dev: bool = False,
    store=None,
    clock: Clock | None = None,
) -> FastAPI:
    """Build the app. ``store`` is the opened ``bookvie.store.Store``, if any.

    ``clock`` is what intents read "now" and "today" from (AD-20); the
    system clock unless ``--fake-today`` or a test pins one.
    """
    static_dir = Path(static_dir).resolve()
    resolved_data_dir = str(Path(data_dir).resolve()) if data_dir is not None else None
    app = FastAPI(
        title="bookvie",
        docs_url=None,
        redoc_url=None,
        # One schema per model, so the generated TS types have one name each.
        separate_input_output_schemas=False,
    )
    # AD-4: serializes every write; shutdown waits on it before releasing the lock.
    app.state.store = store
    app.state.clock = clock if clock is not None else SystemClock()
    app.state.write_lock = store.lock if store is not None else threading.Lock()
    app.add_middleware(
        HostOriginGuard, port=port, extra_origins=DEV_ORIGINS if dev else ()
    )

    @app.get("/api/health")
    async def health() -> dict[str, str | int | None]:
        return {"app": "bookvie", "dataDir": resolved_data_dir, "pid": os.getpid()}

    # Before the SPA catch-all, so /api/views/* match first.
    install_api(app)

    app.mount(
        "/assets",
        _AssetFiles(directory=static_dir / "assets", check_dir=False),
        name="assets",
    )

    @app.api_route("/{path:path}", methods=["GET", "HEAD"], include_in_schema=False)
    async def spa(path: str):
        if _is_server_path(path):
            raise HTTPException(status_code=404)
        index = static_dir / "index.html"
        if not index.is_file():
            return PlainTextResponse(_NOT_BUILT, status_code=404)
        # Top-level files from the build (e.g. favicon) are served as is.
        if path:
            candidate = (static_dir / path).resolve()
            if candidate.is_file() and candidate.is_relative_to(static_dir):
                return FileResponse(candidate)
        return FileResponse(index)

    return app
