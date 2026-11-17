"""FastAPI application factory.

Serves the built SPA from ``static/``: ``/assets`` holds the hashed build
output, and every other path outside ``/api`` and ``/media`` falls back to
``index.html`` so client-side routes work on reload.

Covers are served at ``/media/covers/<name>`` (AD-12), only while a Book's
``coverFile`` names them, with immutable caching.

Every request passes a Host/Origin guard (AD-16) first. It rejects a foreign
Host and any foreign Origin, so a cross-site page cannot make credentialed,
CORS or state-changing requests. Simple cross-site GETs carry no Origin, so
on server paths (``/api``, ``/media``) the guard also refuses any
``Sec-Fetch-Site`` other than ``same-origin`` or ``none``. A request without
the header (curl, the cataloging agent, tests, browsers too old to send it)
still passes, so GET routes should still avoid side effects where they can.
The one GET with a side effect, ``/api/export`` (it records "Last export"),
also requires ``X-Bookvie-Export: 1``, which the app's own fetch sends. A
cross-site ``<img>`` or no-cors GET can't set a custom header, and a
cross-site fetch that sets one needs a CORS preflight, whose foreign Origin
the guard refuses. This holds in browsers too old to send Sec-Fetch-Site.
"""

import os
import threading
from collections.abc import Iterable
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from starlette.types import ASGIApp, Receive, Scope, Send

from bookvie import views
from bookvie.intents import Clock, SystemClock

from .api import BodySizeCap, install_api

STATIC_DIR = Path(__file__).resolve().parent / "static"

# Path prefixes that belong to the server and must never fall back to the SPA.
_SERVER_PREFIXES = ("api", "media")

# Cover names are never reused (AD-12), so a served cover never changes.
COVER_CACHE_CONTROL = "public, max-age=31536000, immutable"

# The tab icon, served by its own route. `no-cache` makes the browser ask
# again each time, so a tab never keeps an icon the server no longer serves;
# the file is tiny.
FAVICON_FILE = "favicon.svg"
# A `--dev` server's amber icon, served at the same path (AD-16).
DEV_FAVICON_FILE = "favicon-dev.svg"
FAVICON_PATH = "/" + FAVICON_FILE
FAVICON_MEDIA_TYPE = "image/svg+xml"
FAVICON_CACHE_CONTROL = "no-cache"
# index.html names the build's hashed assets, which a rebuild deletes: the
# browser revalidates it each time instead of caching it heuristically.
INDEX_CACHE_CONTROL = "no-cache"
# Built files the catch-all never serves as is (any case, for a case-insensitive
# disk): index.html always gets the fallback's headers, and both icons are
# served only by the favicon route, the one its mode picks (AD-16).
_NEVER_AS_IS = frozenset({"index.html", FAVICON_FILE, DEV_FAVICON_FILE})

# Sec-Fetch-Site values a server path accepts; a missing header passes too.
_ALLOWED_FETCH_SITES = frozenset({"same-origin", "none"})

# The export records "Last export", so it requires a header no cross-site
# simple request can carry. The client sends it in frontend/src/api/export.ts.
EXPORT_PATH = "/api/export"
EXPORT_HEADER = b"x-bookvie-export"
EXPORT_HEADER_VALUE = "1"

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
    """Pure-ASGI guard: 403 unless Host and any Origin are this server's own.

    On server paths it also refuses a cross-site or same-site
    ``Sec-Fetch-Site``, so a simple GET from another page (an ``<img>``, a
    no-cors fetch, a link) cannot reach an ``/api`` or ``/media`` route.
    ``same-site`` is refused too: ports don't count toward a site, so any
    other app on a loopback port is same-site. :data:`EXPORT_PATH` also
    needs exactly one ``X-Bookvie-Export: 1``.
    """

    def __init__(self, app: ASGIApp, *, port: int, extra_origins: Iterable[str] = ()) -> None:
        self.app = app
        self.hosts = {f"127.0.0.1:{port}", f"localhost:{port}"}
        self.origins = {f"http://{host}" for host in self.hosts} | set(extra_origins)

    def _allowed(self, scope: Scope) -> bool:
        hosts: list[str] = []
        origins: list[str] = []
        fetch_sites: list[str] = []
        export_marks: list[str] = []
        for name, value in scope.get("headers", []):
            if name == b"host":
                hosts.append(value.decode("latin-1").lower())
            elif name == b"origin":
                origins.append(value.decode("latin-1").lower())
            elif name == b"sec-fetch-site":
                fetch_sites.append(value.decode("latin-1").strip().lower())
            elif name == EXPORT_HEADER:
                export_marks.append(value.decode("latin-1").strip())
        if len(hosts) != 1 or hosts[0] not in self.hosts:
            return False
        if not all(origin in self.origins for origin in origins):
            return False
        path = scope.get("path", "")
        if path == EXPORT_PATH and export_marks != [EXPORT_HEADER_VALUE]:
            return False
        if fetch_sites and _is_server_path(path):
            return len(fetch_sites) == 1 and fetch_sites[0] in _ALLOWED_FETCH_SITES
        return True

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
    version: str = "",
    commit: str | None = None,
    checkout: str | None = None,
) -> FastAPI:
    """Build the app. ``store`` is the opened ``bookvie.store.Store``, if any.

    ``clock`` is what intents read "now" and "today" from (AD-20); the
    system clock unless ``--fake-today`` or a test pins one. ``version`` and
    ``commit`` come from the CLI for the ``app-info`` view (AD-6); the empty
    default version is only for tests that build an app directly. ``checkout``
    is the folder the ``bookvie`` package runs from; only a ``--dev`` health
    reports it, so a second ``--dev`` launch can tell its own checkout's
    server from another's (AD-16).
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
    app.state.app_info = views.app_info(
        version=version,
        dev=dev,
        data_dir=Path(resolved_data_dir) if resolved_data_dir is not None else None,
        commit=commit if dev else None,
    )
    # Added first, so it runs inside the guard.
    app.add_middleware(BodySizeCap)
    app.add_middleware(HostOriginGuard, port=port, extra_origins=DEV_ORIGINS if dev else ())

    @app.get("/api/health")
    async def health() -> dict[str, str | int | None]:
        payload: dict[str, str | int | None] = {
            "app": "bookvie",
            "dataDir": resolved_data_dir,
            "pid": os.getpid(),
        }
        if dev:
            payload["checkout"] = checkout
        return payload

    # Before the SPA catch-all, so /api/views/* match first.
    install_api(app)

    @app.api_route("/media/covers/{name}", methods=["GET", "HEAD"], include_in_schema=False)
    def cover(name: str):
        """A cover some Book references, cached for good; anything else 404s."""
        # Plain def: the file check and the library scan run in the threadpool.
        store = app.state.store
        path = views.cover_path(store, name) if store is not None else None
        if path is None:
            raise HTTPException(status_code=404)
        return FileResponse(path, headers={"Cache-Control": COVER_CACHE_CONTROL})

    app.mount(
        "/assets",
        _AssetFiles(directory=static_dir / "assets", check_dir=False),
        name="assets",
    )

    # Before the SPA catch-all, which would otherwise serve the file as is,
    # without Cache-Control, and never the amber one.
    @app.api_route(FAVICON_PATH, methods=["GET", "HEAD"], include_in_schema=False)
    def favicon():
        """The built favicon (amber with ``--dev``), read per request; 404 (never
        index.html) when that file is not built."""
        path = static_dir / (DEV_FAVICON_FILE if dev else FAVICON_FILE)
        if not path.is_file():
            raise HTTPException(status_code=404)
        return FileResponse(
            path,
            media_type=FAVICON_MEDIA_TYPE,
            headers={"Cache-Control": FAVICON_CACHE_CONTROL},
        )

    @app.api_route("/{path:path}", methods=["GET", "HEAD"], include_in_schema=False)
    async def spa(path: str):
        if _is_server_path(path):
            raise HTTPException(status_code=404)
        index = static_dir / "index.html"
        if not index.is_file():
            return PlainTextResponse(_NOT_BUILT, status_code=404)
        # Top-level files from the build (e.g. robots.txt) are served as is,
        # except those in _NEVER_AS_IS.
        if path:
            candidate = (static_dir / path).resolve()
            if (
                candidate.is_file()
                and candidate.is_relative_to(static_dir)
                and candidate.name.casefold() not in _NEVER_AS_IS
            ):
                return FileResponse(candidate)
        return FileResponse(index, headers={"Cache-Control": INDEX_CACHE_CONTROL})

    return app
