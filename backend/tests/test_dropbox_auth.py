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

RED = "ATDD red phase (Story 13.2): bookvie_dropbox isn't built yet"

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


# Red phase: un-skip when the build adds bookvie_dropbox.auth (Story 13.2).
@pytest.mark.skip(reason=RED)
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
