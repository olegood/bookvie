"""``bookvie-dropbox auth``: sign in to Dropbox once, with OAuth PKCE (AD-22).

It listens on the registered loopback redirect first, then opens Dropbox's
authorize page in the browser, waits for Dropbox to send the browser back
with a code, exchanges the code (with the PKCE verifier, no app secret) and
keeps the refresh token only in the Keychain. No token is printed, logged or
written to a file.
"""

import base64
import hashlib
import secrets
import time
import webbrowser
from collections.abc import Callable
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any
from urllib.parse import parse_qs, urlencode, urlsplit

import keyring
import keyring.errors
import requests

from . import dropbox_api

REDIRECT_PORT = 8790
"""The fixed loopback port registered as the Dropbox app's redirect (clear of bookvie's 8765/8766)."""
REDIRECT_PATH = "/dropbox-auth"
REDIRECT_URI = f"http://127.0.0.1:{REDIRECT_PORT}{REDIRECT_PATH}"
"""The redirect URI registered on the Dropbox app, exactly. Dropbox allows ``http`` only for
loopback."""
AUTHORIZE_URL = "https://www.dropbox.com/oauth2/authorize"
TOKEN_URL = "https://api.dropboxapi.com/oauth2/token"
WAIT_SECONDS = 300.0
"""How long ``auth`` waits for the browser to come back."""

_DONE_PAGE = (
    b"<!doctype html><meta charset=utf-8><title>bookvie-dropbox</title>"
    b"<p>bookvie-dropbox got Dropbox's answer. You can close this tab and go back to the terminal.</p>"
)


class AuthFailed(Exception):
    """The sign-in didn't finish. Its message never holds a token or a code."""


def _pkce() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(64)
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    challenge = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    return verifier, challenge


def authorize_url(challenge: str, state: str, redirect_uri: str = REDIRECT_URI) -> str:
    query = {
        "client_id": dropbox_api.APP_KEY,
        "response_type": "code",
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "token_access_type": "offline",
        "redirect_uri": redirect_uri,
        "state": state,
    }
    return f"{AUTHORIZE_URL}?{urlencode(query)}"


class _Redirect(HTTPServer):
    """A one-shot loopback listener for Dropbox's redirect."""

    def __init__(self, state: str, port: int = REDIRECT_PORT) -> None:
        self.state = state
        self.query: dict[str, str] | None = None
        super().__init__(("127.0.0.1", port), _Handler)

    @property
    def uri(self) -> str:
        """The redirect URI on the port it listens on: :data:`REDIRECT_URI` on the fixed port."""
        host, port = self.server_address[:2]
        return f"http://{host}:{port}{REDIRECT_PATH}"


class _Handler(BaseHTTPRequestHandler):
    server: _Redirect
    timeout = 10
    """Seconds a connection may sit idle (a browser's preconnect) before it is dropped."""

    def do_GET(self) -> None:  # noqa: N802 - the stdlib's name
        url = urlsplit(self.path)
        if url.path != REDIRECT_PATH:
            self.send_response(404)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        query = {k: v[0] for k, v in parse_qs(url.query).items()}
        if not secrets.compare_digest(query.get("state", "").encode(), self.server.state.encode()):
            # Not this sign-in's redirect: refuse it and keep waiting for the real one.
            self.send_response(400)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        self.server.query = query
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(_DONE_PAGE)))
        self.end_headers()
        self.wfile.write(_DONE_PAGE)

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A002 - the stdlib's name
        # The request line carries the authorization code: never log it.
        pass


def _wait_for_redirect(listener: _Redirect) -> dict[str, str] | None:
    """The redirect's query, or ``None`` when it doesn't come within :data:`WAIT_SECONDS`.

    A stray request (a favicon) is answered 404 and the wait goes on."""
    deadline = time.monotonic() + WAIT_SECONDS
    while listener.query is None:
        left = deadline - time.monotonic()
        if left <= 0:
            return None
        listener.timeout = left
        listener.handle_request()
    return listener.query


def exchange_code(session: Any, code: str, verifier: str, redirect_uri: str = REDIRECT_URI) -> str:
    """The refresh token Dropbox gives for ``code``, through ``session``."""
    form = {
        "grant_type": "authorization_code",
        "code": code,
        "client_id": dropbox_api.APP_KEY,
        "code_verifier": verifier,
        "redirect_uri": redirect_uri,
    }
    try:
        response = session.post(TOKEN_URL, data=form, timeout=30)
    except requests.exceptions.RequestException as exc:
        raise AuthFailed(
            f"Couldn't reach Dropbox to finish signing in ({type(exc).__name__})."
        ) from None
    if response.status_code != 200:
        raise AuthFailed(
            f"Dropbox refused the sign-in (HTTP {response.status_code}). Run auth again."
        )
    try:
        body = response.json()
    except ValueError:
        body = None
    token = body.get("refresh_token") if isinstance(body, dict) else None
    if not isinstance(token, str) or not token:
        raise AuthFailed("Dropbox's answer had no refresh token. Run auth again.")
    return token


def run_auth(
    *,
    open_browser: Callable[[str], Any] = webbrowser.open,
    session: Any = None,
    say: Callable[[str], None] = print,
    port: int = REDIRECT_PORT,
) -> None:
    """Sign in to Dropbox and keep the refresh token in the Keychain; :class:`AuthFailed` if not.

    ``port`` is a test seam, never set by the CLI: Dropbox accepts only the registered
    :data:`REDIRECT_URI`. Tests pass 0 for a free port, so parallel test processes don't
    compete for the fixed one."""
    verifier, challenge = _pkce()
    state = secrets.token_urlsafe(16)
    try:
        listener = _Redirect(state, port)
    except OSError as exc:
        raise AuthFailed(
            f"Port {port} on 127.0.0.1 is in use ({exc.strerror or exc}), so Dropbox can't "
            "send the browser back. Close whatever holds it (another `bookvie-dropbox auth`?) "
            "and run auth again."
        ) from None
    redirect_uri = listener.uri
    with listener:
        url = authorize_url(challenge, state, redirect_uri)
        say("Opening Dropbox in your browser to allow bookvie-dropbox. If it doesn't open, visit:")
        say(url)
        open_browser(url)
        query = _wait_for_redirect(listener)
    if query is None:
        raise AuthFailed("Dropbox didn't send the browser back in time. Run auth again.")
    code = query.get("code")
    if not code:
        raise AuthFailed("Dropbox access wasn't allowed, so nothing was saved.")
    token = exchange_code(
        session if session is not None else requests.Session(), code, verifier, redirect_uri
    )
    try:
        keyring.set_password(dropbox_api.KEYRING_SERVICE, dropbox_api.KEYRING_ACCOUNT, token)
    except keyring.errors.KeyringError as exc:
        raise AuthFailed(
            f"Couldn't save the sign-in in the Keychain ({type(exc).__name__}). "
            "Unlock the Keychain and run auth again."
        ) from None
    say("Signed in to Dropbox. The sign-in is saved in the Keychain.")
