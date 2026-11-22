"""Story 13.2: ``bookvie-dropbox auth``, the one-time sign-in (AD-22).

``bookvie_dropbox.auth.run_auth(open_browser=..., session=...)`` runs OAuth
with PKCE through a loopback redirect on the fixed registered port. Here the
"browser" is a function that reads Dropbox's authorize URL and visits the
redirect with a code, as Dropbox would after the user allows access. The code
exchange goes to :class:`tests.dropbox_fakes.FakeDropboxHttp` through the
``requests`` session the test passes, and the refresh token lands in an
in-memory Keychain. Nothing reaches the network or the real Keychain.
"""

import importlib
import logging
import threading
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any
from urllib.parse import urlencode, urlsplit

import pytest

from tests.agent_client import ImportFailed, import_or_fail

OLD_TOKEN = "refresh-OLD-0001-from-last-year"
NEW_TOKEN = "refresh-NEW-5ecret-42"
CODE = "the-authorization-code-77"


@pytest.fixture
def fakes() -> Any:
    return importlib.import_module("tests.dropbox_fakes")


@pytest.fixture
def keychain(fakes: Any) -> Any:
    """An in-memory Keychain that already holds an older refresh token."""
    import keyring

    previous = keyring.get_keyring()
    backend = fakes.MemoryKeyring({(fakes.KEYRING_SERVICE, fakes.KEYRING_ACCOUNT): OLD_TOKEN})
    keyring.set_keyring(backend)
    yield backend
    keyring.set_keyring(previous)


class Browser:
    """Opens Dropbox's authorize URL: lets the fake exchange ``CODE`` for that URL's PKCE
    challenge, then visits the redirect with ``CODE`` (and ``state`` when there is one).

    It visits once, from its own thread, as soon as it is opened: ``run_auth`` must be
    listening on the redirect port before it opens the browser, or the visit fails.
    """

    def __init__(self, http: Any) -> None:
        self.http = http
        self.urls: list[str] = []
        self.visited: list[int | str] = []
        self._thread: threading.Thread | None = None

    def __call__(self, url: str) -> bool:
        fakes = importlib.import_module("tests.dropbox_fakes")
        self.urls.append(url)
        params = fakes.authorize_params(url)
        self.http.authorize(params.get("code_challenge", ""), CODE)
        query = {"code": CODE, **({"state": params["state"]} if "state" in params else {})}
        target = f"{params.get('redirect_uri', '')}?{urlencode(query)}"
        self._thread = threading.Thread(target=self._visit, args=(target,), daemon=True)
        self._thread.start()
        return True

    def _visit(self, target: str) -> None:
        try:
            with urllib.request.urlopen(target, timeout=10) as response:
                self.visited.append(response.status)
        except urllib.error.HTTPError as exc:
            self.visited.append(exc.code)
        except (OSError, ValueError) as exc:
            self.visited.append(f"{type(exc).__name__}: {exc}")

    def join(self) -> None:
        if self._thread is not None:
            self._thread.join(timeout=15)


def _files_holding(folders: list[Path], secrets: list[str]) -> dict[str, list[str]]:
    found: dict[str, list[str]] = {}
    for folder in folders:
        for path in folder.rglob("*"):
            if path.is_file() and not path.is_symlink():
                data = path.read_bytes()
                hits = [s for s in secrets if s.encode() in data]
                if hits:
                    found[str(path)] = hits
    return found


def test_auth_signs_in_with_pkce_on_the_fixed_port_and_keeps_the_token_only_in_the_keychain(
    fakes: Any,
    keychain: Any,
    capsys: pytest.CaptureFixture[str],
    caplog: pytest.LogCaptureFixture,
    _isolated_home: Path,
    tmp_path: Path,
) -> None:
    # [P0] AC-4
    caplog.set_level(logging.DEBUG)
    auth = import_or_fail("bookvie_dropbox.auth")
    api = import_or_fail("bookvie_dropbox.dropbox_api")
    app_key = "unbuilt" if isinstance(api, ImportFailed) else api.APP_KEY
    http = fakes.FakeDropboxHttp(app_key=app_key, issue_refresh_token=NEW_TOKEN)
    browser = Browser(http)
    if not isinstance(auth, ImportFailed):
        auth.run_auth(open_browser=browser, session=fakes.http_session(http))
    browser.join()

    assert keychain.items.get((fakes.KEYRING_SERVICE, fakes.KEYRING_ACCOUNT)) == NEW_TOKEN, (
        browser.urls,
        browser.visited,
        http.requests,
    )
    assert list(keychain.items) == [(fakes.KEYRING_SERVICE, fakes.KEYRING_ACCOUNT)]

    # The browser opened Dropbox's authorize page once, for a PKCE code with an offline token.
    (url,) = browser.urls
    assert (urlsplit(url).scheme, urlsplit(url).netloc, urlsplit(url).path) == (
        "https",
        "www.dropbox.com",
        "/oauth2/authorize",
    )
    params = fakes.authorize_params(url)
    assert params["client_id"] == api.APP_KEY
    assert params["response_type"] == "code"
    assert params["code_challenge_method"] == "S256"
    assert params["code_challenge"]
    assert params["token_access_type"] == "offline"
    # The redirect is the registered loopback address on the fixed port, and it answered.
    assert params["redirect_uri"] == auth.REDIRECT_URI
    redirect = urlsplit(auth.REDIRECT_URI)
    assert (redirect.scheme, redirect.hostname, redirect.port) == (
        "http",
        "127.0.0.1",
        auth.REDIRECT_PORT,
    )
    assert browser.visited == [200]
    # One code exchange, with the verifier and no secret.
    (exchange,) = http.exchanges()
    assert exchange["code"] == CODE
    assert exchange["code_verifier"]
    assert exchange["client_id"] == api.APP_KEY
    assert exchange["redirect_uri"] == auth.REDIRECT_URI
    assert "client_secret" not in exchange

    # No token is printed, logged or written to a file.
    secrets = [NEW_TOKEN, OLD_TOKEN, *sorted(http.access_tokens)]
    out = capsys.readouterr()
    printed = out.out + out.err + caplog.text
    assert [s for s in secrets if s in printed] == []
    assert _files_holding([_isolated_home, tmp_path], secrets) == {}


# --- The sign-in's failures: each leaves the old token and prints no token ---------------


class ScriptedBrowser:
    """Opens Dropbox's authorize URL, then visits the redirect once per query that
    ``queries(params)`` gives, in order, from its own thread; records each status."""

    def __init__(self, http: Any, queries: Any, *, allow: bool = True) -> None:
        self.http = http
        self.queries = queries
        self.allow = allow
        self.opened = 0
        self.visited: list[int | str] = []
        self._thread: threading.Thread | None = None

    def __call__(self, url: str) -> bool:
        fakes = importlib.import_module("tests.dropbox_fakes")
        self.opened += 1
        params = fakes.authorize_params(url)
        if self.allow:
            self.http.authorize(params.get("code_challenge", ""), CODE)
        targets = [f"{params['redirect_uri']}?{urlencode(q)}" for q in self.queries(params)]
        self._thread = threading.Thread(target=self._visit, args=(targets,), daemon=True)
        self._thread.start()
        return True

    def _visit(self, targets: list[str]) -> None:
        for target in targets:
            try:
                with urllib.request.urlopen(target, timeout=10) as response:
                    self.visited.append(response.status)
            except urllib.error.HTTPError as exc:
                self.visited.append(exc.code)
            except (OSError, ValueError) as exc:
                self.visited.append(f"{type(exc).__name__}: {exc}")

    def join(self) -> None:
        if self._thread is not None:
            self._thread.join(timeout=15)


def _with_code(params: dict[str, str]) -> list[dict[str, str]]:
    return [{"code": CODE, "state": params["state"]}]


def _token_session(status: int, payload: Any) -> Any:
    """A ``requests`` session whose token endpoint answers ``status`` with ``payload``."""
    import json

    import requests
    import requests.adapters

    class Answer(requests.adapters.BaseAdapter):
        def send(self, request: Any, **kwargs: Any) -> Any:
            response = requests.Response()
            response.status_code = status
            response._content = json.dumps(payload).encode("utf-8")
            response.headers["content-type"] = "application/json"
            response.url = request.url or ""
            response.request = request
            return response

        def close(self) -> None:
            pass

    session = requests.Session()
    session.mount("https://", Answer())
    return session


def _refused(auth: Any, browser: Any, session: Any) -> Exception:
    with pytest.raises(auth.AuthFailed) as raised:
        auth.run_auth(open_browser=browser, session=session)
    browser_join = getattr(browser, "join", None)
    if callable(browser_join):
        browser_join()
    return raised.value


def _assert_untouched(
    keychain: Any, fakes: Any, error: Exception, capsys: pytest.CaptureFixture[str]
) -> None:
    assert keychain.items == {(fakes.KEYRING_SERVICE, fakes.KEYRING_ACCOUNT): OLD_TOKEN}
    out = capsys.readouterr()
    for secret in (NEW_TOKEN, OLD_TOKEN, CODE, "access-1"):
        assert secret not in str(error), (secret, error)
        assert secret not in out.out + out.err, secret


def test_a_redirect_with_another_state_is_refused_and_the_real_one_still_signs_in(
    fakes: Any, keychain: Any, capsys: pytest.CaptureFixture[str]
) -> None:
    auth = import_or_fail("bookvie_dropbox.auth")
    api = import_or_fail("bookvie_dropbox.dropbox_api")
    http = fakes.FakeDropboxHttp(app_key=api.APP_KEY, issue_refresh_token=NEW_TOKEN)
    browser = ScriptedBrowser(
        http, lambda p: [{"code": "someone-elses-code", "state": "forged"}, *_with_code(p)]
    )

    auth.run_auth(open_browser=browser, session=fakes.http_session(http))
    browser.join()

    assert browser.visited == [400, 200]
    assert [form["code"] for form in http.exchanges()] == [CODE]
    assert keychain.items == {(fakes.KEYRING_SERVICE, fakes.KEYRING_ACCOUNT): NEW_TOKEN}
    out = capsys.readouterr()
    assert NEW_TOKEN not in out.out + out.err


def test_only_a_redirect_with_another_state_times_out_and_saves_nothing(
    fakes: Any, keychain: Any, capsys: pytest.CaptureFixture[str], monkeypatch: pytest.MonkeyPatch
) -> None:
    auth = import_or_fail("bookvie_dropbox.auth")
    api = import_or_fail("bookvie_dropbox.dropbox_api")
    monkeypatch.setattr(auth, "WAIT_SECONDS", 1.5)
    http = fakes.FakeDropboxHttp(app_key=api.APP_KEY, issue_refresh_token=NEW_TOKEN)
    browser = ScriptedBrowser(http, lambda p: [{"code": CODE, "state": "forged"}])

    error = _refused(auth, browser, fakes.http_session(http))

    assert browser.visited == [400]
    assert http.exchanges() == []
    _assert_untouched(keychain, fakes, error, capsys)


def test_a_denied_access_redirect_saves_nothing(
    fakes: Any, keychain: Any, capsys: pytest.CaptureFixture[str]
) -> None:
    auth = import_or_fail("bookvie_dropbox.auth")
    api = import_or_fail("bookvie_dropbox.dropbox_api")
    http = fakes.FakeDropboxHttp(app_key=api.APP_KEY, issue_refresh_token=NEW_TOKEN)
    browser = ScriptedBrowser(
        http, lambda p: [{"error": "access_denied", "state": p["state"]}], allow=False
    )

    error = _refused(auth, browser, fakes.http_session(http))

    assert browser.visited == [200]
    assert http.exchanges() == []
    _assert_untouched(keychain, fakes, error, capsys)


@pytest.mark.parametrize(
    ("status", "payload"),
    [
        pytest.param(400, {"error": "invalid_grant"}, id="refused"),
        pytest.param(200, {"access_token": "access-1", "uid": "1"}, id="no_refresh_token"),
        pytest.param(200, [NEW_TOKEN], id="not_an_object"),
    ],
)
def test_a_token_endpoint_that_gives_no_refresh_token_saves_nothing(
    fakes: Any,
    keychain: Any,
    capsys: pytest.CaptureFixture[str],
    status: int,
    payload: Any,
) -> None:
    auth = import_or_fail("bookvie_dropbox.auth")
    browser = ScriptedBrowser(None, _with_code, allow=False)

    error = _refused(auth, browser, _token_session(status, payload))

    assert browser.visited == [200]
    _assert_untouched(keychain, fakes, error, capsys)


def test_a_keychain_that_cant_be_written_is_a_clear_error(
    fakes: Any, keychain: Any, capsys: pytest.CaptureFixture[str]
) -> None:
    import keyring.errors

    auth = import_or_fail("bookvie_dropbox.auth")
    api = import_or_fail("bookvie_dropbox.dropbox_api")

    def refuse(service: str, username: str, password: str) -> None:
        raise keyring.errors.KeyringLocked("the Keychain is locked")

    keychain.set_password = refuse
    http = fakes.FakeDropboxHttp(app_key=api.APP_KEY, issue_refresh_token=NEW_TOKEN)
    browser = ScriptedBrowser(http, _with_code)

    error = _refused(auth, browser, fakes.http_session(http))

    assert "Keychain" in str(error)
    _assert_untouched(keychain, fakes, error, capsys)


def test_a_taken_redirect_port_is_a_clear_error_before_the_browser_opens(
    fakes: Any, keychain: Any, capsys: pytest.CaptureFixture[str]
) -> None:
    import socket

    auth = import_or_fail("bookvie_dropbox.auth")
    browser = ScriptedBrowser(None, _with_code, allow=False)
    holder = socket.socket()
    holder.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        holder.bind(("127.0.0.1", auth.REDIRECT_PORT))
        holder.listen()
        error = _refused(auth, browser, None)
    finally:
        holder.close()

    assert browser.opened == 0
    assert str(auth.REDIRECT_PORT) in str(error)
    _assert_untouched(keychain, fakes, error, capsys)
