"""Story 13.2 follow-ups: the ``bookvie-dropbox`` command and ``auth``'s fault branches.

``cli.main``'s exits (the review's deferral), the installed command's
subcommands (AC-13: the guide's commands parse as the installed command), and
the sign-in's stray request, unreachable token endpoint and non-JSON answer
(AC-4). ``auth`` runs on the real loopback port against
:class:`tests.dropbox_fakes.FakeDropboxHttp` or a scripted ``requests``
session, with an in-memory Keychain; nothing reaches the network.
"""

import importlib
import subprocess
import sys
import threading
import urllib.error
import urllib.request
from collections.abc import Callable
from pathlib import Path
from typing import Any
from urllib.parse import urlencode, urlsplit

import pytest

OLD_TOKEN = "refresh-OLD-0001-from-last-year"
NEW_TOKEN = "refresh-NEW-5ecret-42"
CODE = "the-authorization-code-77"
COMMAND = Path(sys.executable).parent / "bookvie-dropbox"


@pytest.fixture
def fakes() -> Any:
    return importlib.import_module("tests.dropbox_fakes")


@pytest.fixture
def keychain(fakes: Any) -> Any:
    import keyring

    previous = keyring.get_keyring()
    backend = fakes.MemoryKeyring({(fakes.KEYRING_SERVICE, fakes.KEYRING_ACCOUNT): OLD_TOKEN})
    keyring.set_keyring(backend)
    yield backend
    keyring.set_keyring(previous)


# --- cli.main ------------------------------------------------------------------------


def _raise(exc: BaseException) -> Callable[..., None]:
    def run(*args: Any, **kwargs: Any) -> None:
        raise exc

    return run


@pytest.mark.parametrize(
    ("fault", "code", "says"),
    [
        pytest.param(
            "auth", 1, "bookvie-dropbox: Port 8790 is in use, run auth again.", id="auth_failed"
        ),
        pytest.param("interrupt", 130, "sign-in cancelled; nothing was saved", id="ctrl_c"),
    ],
)
def test_a_failed_or_cancelled_auth_exits_non_zero_with_one_line_on_stderr(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    fault: str,
    code: int,
    says: str,
) -> None:
    # [P1] AC-4 / AC-1 (the review's deferral: `cli.main`'s auth branch had no test)
    from bookvie_dropbox import auth, cli

    error = (
        auth.AuthFailed("Port 8790 is in use, run auth again.")
        if fault == "auth"
        else KeyboardInterrupt()
    )
    monkeypatch.setattr(cli, "run_auth", _raise(error))
    monkeypatch.setattr(cli, "serve", _raise(AssertionError("auth must not serve")))

    with pytest.raises(SystemExit) as exited:
        cli.main(["auth"])

    assert exited.value.code == code
    out = capsys.readouterr()
    assert out.out == ""
    assert says in out.err
    assert len(out.err.strip().splitlines()) == 1


def test_a_finished_auth_returns_without_serving(monkeypatch: pytest.MonkeyPatch) -> None:
    # [P2] AC-4
    from bookvie_dropbox import cli

    ran: list[str] = []
    monkeypatch.setattr(cli, "run_auth", lambda: ran.append("auth"))
    monkeypatch.setattr(cli, "serve", lambda: ran.append("serve"))

    assert cli.main(["auth"]) is None
    assert ran == ["auth"]


def test_serve_runs_the_server_and_never_signs_in(monkeypatch: pytest.MonkeyPatch) -> None:
    # [P2] AC-5
    from bookvie_dropbox import cli

    ran: list[str] = []
    monkeypatch.setattr(cli, "run_auth", lambda: ran.append("auth"))
    monkeypatch.setattr(cli, "serve", lambda: ran.append("serve"))

    cli.main(["serve"])

    assert ran == ["serve"]


@pytest.mark.parametrize("subcommand", ["auth", "serve"])
def test_the_installed_command_parses_each_subcommand_the_guide_runs(
    _isolated_home: Path, subcommand: str
) -> None:
    # [P2] AC-13 / AC-1: the console script, not just `cli.parse_args`
    result = subprocess.run(
        [str(COMMAND), subcommand, "--help"], capture_output=True, text=True, timeout=60
    )

    assert result.returncode == 0, result.stderr
    assert result.stdout.startswith(f"usage: bookvie-dropbox {subcommand}"), result.stdout


def test_the_installed_command_refuses_an_unknown_subcommand(_isolated_home: Path) -> None:
    # [P3] AC-1
    result = subprocess.run([str(COMMAND), "upload"], capture_output=True, text=True, timeout=60)

    assert result.returncode == 2
    assert "invalid choice: 'upload'" in result.stderr


# --- auth's fault branches -------------------------------------------------------------


class Browser:
    """Visits each of ``paths(params)`` on the redirect's host, in order, from a thread.

    ``allow`` lets ``http`` exchange ``CODE`` for the authorize URL's PKCE challenge."""

    def __init__(
        self, http: Any, paths: Callable[[dict[str, str]], list[str]], *, allow: bool = True
    ) -> None:
        self.http = http
        self.paths = paths
        self.allow = allow
        self.visited: list[int | str] = []
        self._thread: threading.Thread | None = None

    def __call__(self, url: str) -> bool:
        fakes = importlib.import_module("tests.dropbox_fakes")
        params = fakes.authorize_params(url)
        if self.allow:
            self.http.authorize(params["code_challenge"], CODE)
        redirect = urlsplit(params["redirect_uri"])
        base = f"{redirect.scheme}://{redirect.netloc}"
        targets = [f"{base}{path}" for path in self.paths(params)]
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


def _redirect(params: dict[str, str]) -> str:
    path = urlsplit(params["redirect_uri"]).path
    return f"{path}?{urlencode({'code': CODE, 'state': params['state']})}"


def test_a_stray_request_before_the_redirect_is_404_and_the_sign_in_still_finishes(
    fakes: Any, keychain: Any, capsys: pytest.CaptureFixture[str]
) -> None:
    # [P2] AC-4: a browser asks for /favicon.ico first
    from bookvie_dropbox import auth, dropbox_api

    http = fakes.FakeDropboxHttp(app_key=dropbox_api.APP_KEY, issue_refresh_token=NEW_TOKEN)
    browser = Browser(http, lambda p: ["/favicon.ico", _redirect(p)])

    auth.run_auth(open_browser=browser, session=fakes.http_session(http))
    browser.join()

    assert browser.visited == [404, 200]
    assert [form["code"] for form in http.exchanges()] == [CODE]
    assert keychain.items == {(fakes.KEYRING_SERVICE, fakes.KEYRING_ACCOUNT): NEW_TOKEN}
    out = capsys.readouterr()
    assert NEW_TOKEN not in out.out + out.err
    assert CODE not in out.out + out.err


class _Unreachable:
    """A ``requests`` session whose every POST fails to connect."""

    def post(self, *args: Any, **kwargs: Any) -> Any:
        import requests

        raise requests.exceptions.ConnectionError(f"can't reach {args[0]} with {CODE}")


class _NotJson:
    """A ``requests`` session whose token endpoint answers 200 with an HTML page."""

    def post(self, *args: Any, **kwargs: Any) -> Any:
        import requests

        response = requests.Response()
        response.status_code = 200
        response._content = b"<html>captive portal</html>"
        response.headers["content-type"] = "text/html"
        return response


@pytest.mark.parametrize(
    ("session", "says"),
    [
        pytest.param(_Unreachable(), "Couldn't reach Dropbox", id="unreachable"),
        pytest.param(_NotJson(), "no refresh token", id="not_json"),
    ],
)
def test_a_code_exchange_that_gets_no_token_keeps_the_old_sign_in(
    fakes: Any,
    keychain: Any,
    capsys: pytest.CaptureFixture[str],
    session: Any,
    says: str,
) -> None:
    # [P1] AC-4: the old refresh token stays, and no code or token is printed
    from bookvie_dropbox import auth

    browser = Browser(None, lambda p: [_redirect(p)], allow=False)

    with pytest.raises(auth.AuthFailed) as raised:
        auth.run_auth(open_browser=browser, session=session)
    browser.join()

    assert browser.visited == [200]
    assert says in str(raised.value)
    assert keychain.items == {(fakes.KEYRING_SERVICE, fakes.KEYRING_ACCOUNT): OLD_TOKEN}
    out = capsys.readouterr()
    for secret in (CODE, OLD_TOKEN, NEW_TOKEN):
        assert secret not in str(raised.value)
        assert secret not in out.out + out.err
