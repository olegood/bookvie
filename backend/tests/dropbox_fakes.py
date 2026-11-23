"""Fakes for ``bookvie-dropbox``'s tests (Story 13.2, AD-22).

No test touches the network or the real Keychain. Two seams carry the fakes:

- :class:`FakeDropbox` stands in for the SDK's ``dropbox.Dropbox`` client,
  which is what ``bookvie_dropbox.server.build_server(connect=...)``'s
  ``connect()`` returns. It has the SDK's own method names and takes and
  returns the SDK's own types (``CommitInfo``, ``WriteMode``,
  ``FileMetadata``, ``ApiError``), so a build that drives it drives the real
  SDK the same way. Any other ``files_*`` call fails the test.
- :class:`FakeDropboxHttp` is a ``requests`` transport adapter, mounted on a
  ``requests.Session`` that the real SDK is given. It answers Dropbox's token
  endpoint (a refresh, and the PKCE code exchange of ``bookvie-dropbox auth``)
  and ``files/list_folder``, so the SDK's own refresh logic runs.

:class:`MemoryKeyring` and :class:`FailingKeyring` are ``keyring`` backends
set with ``keyring.set_keyring`` for one test.

This module imports ``dropbox``, ``keyring`` and ``requests``, which Story
13.2 adds to the project. Test modules import it inside their fixtures, so
they still collect before the packages are installed.
"""

import base64
import hashlib
import io
import itertools
import json
import zipfile
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlsplit

import keyring.backend
import keyring.errors
import requests
import requests.adapters
from dropbox import files as dbx_files
from dropbox.auth import AuthError as AuthErrorUnion
from dropbox.exceptions import ApiError, AuthError, InternalServerError

from bookvie.intents.export import extended_timestamp
from bookvie.store.store import LIBRARY_NAME

BLOCK = 4 * 1024 * 1024
"""Dropbox hashes a file in 4 MiB blocks (its content-hash page)."""
MAX_REQUEST = 150 * 1024 * 1024
"""Dropbox refuses an upload request whose body is over 150 MiB."""
BACKUPS = "/.backups"
"""The App folder's ``.backups`` folder, as the API names it: ``/Apps/bookvie/.backups/``
in the user's Dropbox is ``/.backups`` to an App-folder app."""

KEYRING_SERVICE = "bookvie-dropbox"
KEYRING_ACCOUNT = "refresh-token"

UPLOAD_CALLS = (
    "files_upload_session_start",
    "files_upload_session_append_v2",
    "files_upload_session_finish",
)


# --- Dropbox's content hash, fed in pieces ------------------------------------


class ContentHasher:
    """Dropbox's content hash of bytes fed in any pieces: SHA-256 over each 4 MiB block's."""

    def __init__(self) -> None:
        self._outer = hashlib.sha256()
        self._block = hashlib.sha256()
        self._filled = 0
        self.size = 0

    def update(self, data: bytes) -> None:
        view = memoryview(data)
        while view:
            take = min(BLOCK - self._filled, len(view))
            self._block.update(view[:take])
            self._filled += take
            self.size += take
            view = view[take:]
            if self._filled == BLOCK:
                self._outer.update(self._block.digest())
                self._block = hashlib.sha256()
                self._filled = 0

    def hexdigest(self) -> str:
        outer = self._outer.copy()
        if self._filled:
            outer.update(self._block.digest())
        return outer.hexdigest()


def content_hash(data: bytes) -> str:
    hasher = ContentHasher()
    hasher.update(data)
    return hasher.hexdigest()


# --- Backup files --------------------------------------------------------------


def daily_zip(at: datetime, payload: bytes = b"") -> bytes:
    """A backup zip as bookvie writes it since Story 13.1: ``library.json`` stamped ``at``
    (local wall time, plus the 0x5455 field with the UTC instant). ``payload`` is a
    ``covers/`` entry, so two backups can differ in bytes."""
    buffer = io.BytesIO()
    stamp = tuple(at.astimezone().timetuple()[:6])
    with zipfile.ZipFile(buffer, "w") as archive:
        info = zipfile.ZipInfo(LIBRARY_NAME, date_time=stamp)
        info.extra = extended_timestamp(at)
        archive.writestr(info, b'{"schemaVersion": 1, "books": []}', zipfile.ZIP_DEFLATED)
        archive.writestr(zipfile.ZipInfo("covers/x.jpg", date_time=stamp), payload)
    return buffer.getvalue()


def write_large_zip(path: Path, at: datetime, hole: int) -> int:
    """A sparse file of ``hole`` zero bytes followed by :func:`daily_zip`, which
    ``zipfile`` still reads (it allows data before a zip). Returns its size."""
    tail = daily_zip(at)
    with open(path, "wb") as out:
        out.truncate(hole)
        out.seek(hole)
        out.write(tail)
    return hole + len(tail)


# --- A fake of the SDK's client --------------------------------------------------


@dataclass
class StoredFile:
    name: str
    size: int
    content_hash: str
    client_modified: datetime
    folder: bool = False
    data: bytes | None = None
    """The bytes :meth:`FakeDropbox.put` stored, which a download returns (Story 13.7); an
    upload keeps only the size and hash, so downloading an uploaded file isn't faked."""


class FakeDownload:
    """The ``requests.Response`` that ``files_download`` hands back, over ``body`` (Story 13.7).

    It streams through ``iter_content`` and ``raw.read`` and reads whole through
    ``content``. With ``break_after`` set, each of them gives that many bytes, then raises
    ``requests.exceptions.ChunkedEncodingError``, as a transfer cut off midway would.
    ``closed`` says whether the caller closed it.
    """

    def __init__(self, body: bytes, *, break_after: int | None = None) -> None:
        self._body = body
        self._break_after = break_after
        self._offset = 0
        self._content: bytes | None = None
        self.status_code = 200
        self.headers = {"content-length": str(len(body))}
        self.closed = False
        self.raw = self

    def _broken(self) -> requests.exceptions.ChunkedEncodingError:
        return requests.exceptions.ChunkedEncodingError("connection broken: incomplete read")

    def read(self, amount: int | None = None, *args: Any, **kwargs: Any) -> bytes:
        end = len(self._body) if amount is None or amount < 0 else self._offset + amount
        if self._break_after is not None and end > self._break_after:
            if self._offset >= self._break_after:
                raise self._broken()
            end = self._break_after
        piece = self._body[self._offset : end]
        self._offset += len(piece)
        return piece

    def iter_content(self, chunk_size: int | None = 1, decode_unicode: bool = False) -> Any:
        if self._content is not None:  # as requests does once content was read
            yield from ((self._content,) if self._content else ())
            return
        size = chunk_size or len(self._body) or 1
        while piece := self.read(size):
            yield piece

    @property
    def content(self) -> bytes:
        """The whole body, which consumes the stream, as ``requests`` reads it."""
        if self._content is None:
            if self._break_after is not None:
                raise self._broken()
            self._content = self._body[self._offset :]
            self._offset = len(self._body)
        return self._content

    def close(self) -> None:
        self.closed = True

    def __enter__(self) -> FakeDownload:
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()


@dataclass
class _Session:
    hasher: ContentHasher = field(default_factory=ContentHasher)
    finished: bool = False


class FakeDropbox:
    """``dropbox.Dropbox``'s upload, list, download and delete calls over an in-memory App folder.

    ``fault`` makes one thing go wrong, as Dropbox or the network would:

    - ``refuse_hash``: the finish is refused with ``content_hash_mismatch``.
    - ``fail_chunk``: the second upload-session request (an append or the
      finish) fails with a connection error, after the session has started.
    - ``timeout``: the finish times out (``requests.exceptions.ReadTimeout``).
    - ``wrong_size`` / ``wrong_hash``: the finish commits the file but answers
      a size one byte larger / another content hash.
    - ``full``: the finish is refused with ``path/insufficient_space``.
    - ``signin``: the first call raises ``AuthError(invalid_access_token)``, as
      the SDK does when Dropbox refuses the refresh token.
    - ``server_error``: the finish raises ``InternalServerError`` (503), as the
      SDK does once its own retries are spent.
    - ``unexpected``: the finish, or a download, raises ``RuntimeError``.
    - ``other_bytes``: a download answers the stored metadata (its content hash)
      but a body of other bytes, of the same length (Story 13.7).
    - ``broken_transfer``: a download's body breaks off halfway with
      ``requests.exceptions.ChunkedEncodingError`` (Story 13.7).

    Each request body over 150 MiB is refused with ``payload_too_large``. A
    folder listing pages ``page_size`` entries at a time. ``calls`` records
    each call's name and its path or session, in order, and
    ``request_sizes`` each upload request's body size.
    """

    def __init__(self, *, fault: str | None = None, page_size: int = 2) -> None:
        self.fault = fault
        self.page_size = page_size
        self.files: dict[str, StoredFile] = {}
        self.calls: list[tuple[str, str]] = []
        self.request_sizes: list[int] = []
        self.commits: list[Any] = []
        self._sessions: dict[str, _Session] = {}
        self._ids = itertools.count(1)
        self._upload_requests = 0
        self._listings: dict[str, list[StoredFile]] = {}

    # The App folder, for tests.

    def put(
        self, name: str, data: bytes = b"", *, client_modified: datetime | None = None
    ) -> StoredFile:
        """Put ``name`` into ``/.backups`` as an earlier upload would have left it, keeping
        ``data`` for a download."""
        stored = StoredFile(
            name=name,
            size=len(data),
            content_hash=content_hash(data),
            client_modified=client_modified or datetime(2026, 1, 1, tzinfo=UTC),
            data=data,
        )
        self.files[f"{BACKUPS}/{name}".lower()] = stored
        return stored

    def put_folder(self, name: str) -> None:
        self.files[f"{BACKUPS}/{name}".lower()] = StoredFile(
            name=name,
            size=0,
            content_hash="",
            client_modified=datetime(2026, 1, 1, tzinfo=UTC),
            folder=True,
        )

    def names(self) -> list[str]:
        """Every name in ``/.backups``, sorted."""
        return sorted(f.name for f in self.files.values())

    def file(self, name: str) -> StoredFile | None:
        return self.files.get(f"{BACKUPS}/{name}".lower())

    def deletes(self) -> list[str]:
        return [path for call, path in self.calls if call == "files_delete_v2"]

    def upload_calls(self) -> list[str]:
        return [call for call, _ in self.calls if call in UPLOAD_CALLS]

    # The SDK's surface.

    def __enter__(self) -> FakeDropbox:
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    def close(self) -> None:
        pass

    def _enter(self, call: str, detail: str) -> None:
        if self.fault == "signin" and not self.calls:
            self.calls.append((call, detail))
            raise AuthError("req-signin", AuthErrorUnion.invalid_access_token)
        self.calls.append((call, detail))

    def _upload_request(self, f: bytes, request_hash: str | None) -> None:
        size = len(f)
        self.request_sizes.append(size)
        self._upload_requests += 1
        if size > MAX_REQUEST:
            raise ApiError(
                "req-too-large", dbx_files.UploadSessionFinishError.payload_too_large, None, None
            )
        if request_hash is not None and request_hash != content_hash(f):
            raise ApiError(
                "req-hash", dbx_files.UploadSessionFinishError.content_hash_mismatch, None, None
            )
        if self.fault == "fail_chunk" and self._upload_requests == 2:
            raise requests.exceptions.ConnectionError("connection reset by peer")

    def _session(self, cursor: Any) -> _Session:
        assert isinstance(cursor, dbx_files.UploadSessionCursor), cursor
        session = self._sessions.get(cursor.session_id)
        if session is None or session.finished:
            raise ApiError(
                "req-lookup",
                dbx_files.UploadSessionLookupError.not_found,
                None,
                None,
            )
        if cursor.offset != session.hasher.size:
            raise ApiError(
                "req-offset",
                dbx_files.UploadSessionLookupError.incorrect_offset(
                    dbx_files.UploadSessionOffsetError(session.hasher.size)
                ),
                None,
                None,
            )
        return session

    def files_upload_session_start(
        self, f: bytes, close: bool = False, session_type: Any = None, content_hash: Any = None
    ) -> Any:
        session_id = f"session-{next(self._ids)}"
        self._enter("files_upload_session_start", session_id)
        self._upload_request(f, content_hash)
        session = _Session()
        session.hasher.update(f)
        self._sessions[session_id] = session
        return dbx_files.UploadSessionStartResult(session_id=session_id)

    def files_upload_session_append_v2(
        self, f: bytes, cursor: Any, close: bool = False, content_hash: Any = None
    ) -> None:
        self._enter("files_upload_session_append_v2", getattr(cursor, "session_id", "?"))
        session = self._session(cursor)
        self._upload_request(f, content_hash)
        session.hasher.update(f)

    def files_upload_session_finish(
        self, f: bytes, cursor: Any, commit: Any, content_hash: Any = None
    ) -> Any:
        self._enter("files_upload_session_finish", getattr(commit, "path", "?"))
        assert isinstance(commit, dbx_files.CommitInfo), commit
        self.commits.append(commit)
        session = self._session(cursor)
        self._upload_request(f, content_hash)
        if self.fault == "refuse_hash":
            raise ApiError(
                "req-hash", dbx_files.UploadSessionFinishError.content_hash_mismatch, None, None
            )
        if self.fault == "timeout":
            raise requests.exceptions.ReadTimeout("read timed out")
        if self.fault == "full":
            raise ApiError(
                "req-full",
                dbx_files.UploadSessionFinishError.path(dbx_files.WriteError.insufficient_space),
                None,
                None,
            )
        if self.fault == "server_error":
            raise InternalServerError("req-503", 503, "service unavailable")
        if self.fault == "unexpected":
            raise RuntimeError("something nobody expected")
        session.hasher.update(f)
        session.finished = True
        path = commit.path
        folder, _, name = path.rpartition("/")
        key = path.lower()
        if key in self.files and not commit.mode.is_overwrite():
            raise ApiError(
                "req-conflict",
                dbx_files.UploadSessionFinishError.path(
                    dbx_files.WriteError.conflict(dbx_files.WriteConflictError.file)
                ),
                None,
                None,
            )
        client_modified = commit.client_modified
        if client_modified is not None and client_modified.tzinfo is None:
            client_modified = client_modified.replace(tzinfo=UTC)
        stored = StoredFile(
            name=name,
            size=session.hasher.size,
            content_hash=session.hasher.hexdigest(),
            client_modified=client_modified or datetime.now(UTC),
        )
        self.files[key] = stored
        answered_size = stored.size + (1 if self.fault == "wrong_size" else 0)
        answered_hash = "0" * 64 if self.fault == "wrong_hash" else stored.content_hash
        return self._metadata(stored, folder, size=answered_size, content_hash=answered_hash)

    def files_list_folder(self, path: str, *args: Any, **kwargs: Any) -> Any:
        self._enter("files_list_folder", path)
        prefix = path.rstrip("/").lower() + "/"
        entries = [
            f
            for key, f in sorted(self.files.items())
            if key.startswith(prefix) and "/" not in key[len(prefix) :]
        ]
        if not entries and path.rstrip("/").lower() != BACKUPS:
            raise ApiError(
                "req-not-found",
                dbx_files.ListFolderError.path(dbx_files.LookupError.not_found),
                None,
                None,
            )
        if not entries and not any(k.startswith(prefix) for k in self.files):
            # Dropbox answers not_found for a folder nothing was ever uploaded to.
            raise ApiError(
                "req-not-found",
                dbx_files.ListFolderError.path(dbx_files.LookupError.not_found),
                None,
                None,
            )
        return self._page(path.rstrip("/"), entries)

    def files_list_folder_continue(self, cursor: str) -> Any:
        self._enter("files_list_folder_continue", cursor)
        folder, entries = self._listings.pop(cursor)
        return self._page(folder, entries)

    def _page(self, folder: str, entries: list[StoredFile]) -> Any:
        page, rest = entries[: self.page_size], entries[self.page_size :]
        cursor = f"cursor-{next(self._ids)}"
        if rest:
            self._listings[cursor] = (folder, rest)  # type: ignore[assignment]
        return dbx_files.ListFolderResult(
            entries=[self._metadata(f, folder) for f in page], cursor=cursor, has_more=bool(rest)
        )

    def _download(self, call: str, path: str) -> tuple[Any, FakeDownload]:
        self._enter(call, path)
        if self.fault == "unexpected":
            raise RuntimeError("something nobody expected")
        stored = self.files.get(path.lower())
        if stored is None or stored.folder or stored.data is None:
            raise ApiError(
                "req-not-found",
                dbx_files.DownloadError.path(dbx_files.LookupError.not_found),
                None,
                None,
            )
        body = stored.data
        if self.fault == "other_bytes":
            body = bytes(b ^ 0xFF for b in body) if body else b"x"
        break_after = len(body) // 2 if self.fault == "broken_transfer" else None
        metadata = self._metadata(stored, path.rpartition("/")[0])
        return metadata, FakeDownload(body, break_after=break_after)

    def files_download(self, path: str, rev: Any = None, extra_headers: Any = None) -> Any:
        """``(FileMetadata, response)`` for the file at ``path`` (Story 13.7)."""
        return self._download("files_download", path)

    def files_download_to_file(
        self, download_path: str, path: str, rev: Any = None, extra_headers: Any = None
    ) -> Any:
        """Write the file at ``path`` to ``download_path``, as the SDK does: in pieces, so a
        broken transfer leaves a partial file there; its ``FileMetadata`` (Story 13.7)."""
        metadata, response = self._download("files_download_to_file", path)
        with open(download_path, "wb") as out, response:
            for piece in response.iter_content(64 * 1024):
                out.write(piece)
        return metadata

    def downloads(self) -> list[str]:
        """The paths downloaded, in order, by either download call."""
        return [
            path
            for call, path in self.calls
            if call in ("files_download", "files_download_to_file")
        ]

    def files_delete_v2(self, path: str, parent_rev: Any = None) -> Any:
        self._enter("files_delete_v2", path)
        stored = self.files.pop(path.lower(), None)
        if stored is None:
            raise ApiError(
                "req-not-found",
                dbx_files.DeleteError.path_lookup(dbx_files.LookupError.not_found),
                None,
                None,
            )
        folder = path.rpartition("/")[0]
        return dbx_files.DeleteResult(metadata=self._metadata(stored, folder))

    def _metadata(
        self,
        stored: StoredFile,
        folder: str,
        *,
        size: int | None = None,
        content_hash: str | None = None,
    ) -> Any:
        path = f"{folder}/{stored.name}"
        if stored.folder:
            return dbx_files.FolderMetadata(
                name=stored.name, id=f"id:{stored.name}", path_lower=path.lower(), path_display=path
            )
        when = stored.client_modified.astimezone(UTC).replace(tzinfo=None, microsecond=0)
        return dbx_files.FileMetadata(
            name=stored.name,
            id=f"id:{stored.name}",
            client_modified=when,
            server_modified=when,
            rev="0123456789abcdef",
            size=stored.size if size is None else size,
            path_lower=path.lower(),
            path_display=path,
            content_hash=stored.content_hash if content_hash is None else content_hash,
        )

    def __getattr__(self, name: str) -> Any:
        if name.startswith("files_") or name.startswith("users_"):
            raise AssertionError(
                f"FakeDropbox has no {name}: bookvie-dropbox called an SDK method it shouldn't"
            )
        raise AttributeError(name)


# --- A fake of Dropbox's HTTP endpoints, under the real SDK -----------------------


TOKEN_URL = "https://api.dropboxapi.com/oauth2/token"
LIST_FOLDER_URL = "https://api.dropboxapi.com/2/files/list_folder"


def _pkce_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")


class FakeDropboxHttp(requests.adapters.BaseAdapter):
    """Dropbox's token endpoint and ``files/list_folder``, as a ``requests`` adapter.

    ``refresh_tokens`` are the refresh tokens it accepts. Each refresh issues
    a new access token, ``access-1``, ``access-2``…; ``expired`` access tokens
    answer 401 ``expired_access_token``, as one that timed out would.
    ``authorize(challenge, code)`` lets one PKCE code exchange succeed, for
    the code ``code``, whose verifier must hash to ``challenge``; it issues
    ``issue_refresh_token``. ``requests`` records every request as
    ``(method, url, headers, form)``. Nothing leaves the process: there is no
    socket under this adapter.
    """

    def __init__(
        self,
        *,
        app_key: str,
        refresh_tokens: set[str] | None = None,
        expired: set[str] | None = None,
        issue_refresh_token: str = "refresh-issued-by-the-fake",
    ) -> None:
        super().__init__()
        self.app_key = app_key
        self.refresh_tokens = set(refresh_tokens or ())
        self.expired = set(expired or ())
        self.issue_refresh_token = issue_refresh_token
        self.requests: list[tuple[str, str, dict[str, str], dict[str, str]]] = []
        self._codes: dict[str, str] = {}
        self._issued = itertools.count(1)
        self.access_tokens: set[str] = set()

    def authorize(self, challenge: str, code: str) -> None:
        self._codes[code] = challenge

    def refreshes(self) -> list[dict[str, str]]:
        return [
            form
            for _, url, _, form in self.requests
            if url == TOKEN_URL and form.get("grant_type") == "refresh_token"
        ]

    def exchanges(self) -> list[dict[str, str]]:
        return [
            form
            for _, url, _, form in self.requests
            if url == TOKEN_URL and form.get("grant_type") == "authorization_code"
        ]

    def send(self, request: requests.PreparedRequest, **kwargs: Any) -> requests.Response:
        url = request.url or ""
        body = request.body or b""
        if isinstance(body, str):
            body = body.encode("utf-8")
        form = {}
        if request.headers.get("Content-Type", "").startswith("application/x-www-form-urlencoded"):
            form = {
                k: v[0] for k, v in parse_qs(body.decode("utf-8"), keep_blank_values=True).items()
            }
        self.requests.append(
            (request.method or "", url.split("?", 1)[0], dict(request.headers), form)
        )
        endpoint = url.split("?", 1)[0]
        if endpoint == TOKEN_URL:
            return self._token(request, form)
        if endpoint == LIST_FOLDER_URL:
            return self._list_folder(request, body)
        return self._json(
            request, 404, {"error_summary": "unknown endpoint", "error": {".tag": "other"}}
        )

    def close(self) -> None:
        pass

    def _token(self, request: requests.PreparedRequest, form: dict[str, str]) -> requests.Response:
        if form.get("client_id") != self.app_key or "client_secret" in form:
            return self._json(request, 400, {"error": "invalid_client"})
        grant = form.get("grant_type")
        if grant == "refresh_token" and form.get("refresh_token") in self.refresh_tokens:
            return self._json(request, 200, self._access(refresh=None))
        if grant == "authorization_code":
            challenge = self._codes.pop(form.get("code", ""), None)
            if (
                challenge is not None
                and _pkce_challenge(form.get("code_verifier", "")) == challenge
            ):
                return self._json(request, 200, self._access(refresh=self.issue_refresh_token))
        return self._json(request, 400, {"error": "invalid_grant", "error_description": "refused"})

    def _access(self, *, refresh: str | None) -> dict[str, Any]:
        token = f"access-{next(self._issued)}"
        self.access_tokens.add(token)
        answer: dict[str, Any] = {
            "access_token": token,
            "token_type": "bearer",
            "expires_in": 14400,
            "scope": "files.content.write files.metadata.read",
            "account_id": "dbid:fake-account",
            "uid": "12345",
        }
        if refresh is not None:
            answer["refresh_token"] = refresh
        return answer

    def _list_folder(self, request: requests.PreparedRequest, body: bytes) -> requests.Response:
        auth = request.headers.get("Authorization", "")
        token = auth.removeprefix("Bearer ")
        if token in self.expired:
            return self._json(
                request,
                401,
                {
                    "error_summary": "expired_access_token/",
                    "error": {".tag": "expired_access_token"},
                },
            )
        if token not in self.access_tokens:
            return self._json(
                request,
                401,
                {
                    "error_summary": "invalid_access_token/",
                    "error": {".tag": "invalid_access_token"},
                },
            )
        return self._json(
            request, 200, {"entries": [], "cursor": "cursor-empty", "has_more": False}
        )

    def _json(
        self, request: requests.PreparedRequest, status: int, payload: Any
    ) -> requests.Response:
        response = requests.Response()
        response.status_code = status
        response._content = json.dumps(payload).encode("utf-8")
        response.headers["content-type"] = "application/json"
        response.url = request.url or ""
        response.request = request
        response.encoding = "utf-8"
        return response


def http_session(adapter: FakeDropboxHttp) -> requests.Session:
    """A ``requests.Session`` whose every https request goes to ``adapter``."""
    session = requests.Session()
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def authorize_params(url: str) -> dict[str, str]:
    """The query of Dropbox's authorize URL, one value per key."""
    return {k: v[0] for k, v in parse_qs(urlsplit(url).query, keep_blank_values=True).items()}


# --- Keychain backends -----------------------------------------------------------


class MemoryKeyring(keyring.backend.KeyringBackend):
    """A Keychain in memory, for one test."""

    priority = 1  # type: ignore[assignment]

    def __init__(self, items: dict[tuple[str, str], str] | None = None) -> None:
        super().__init__()
        self.items = dict(items or {})

    def get_password(self, service: str, username: str) -> str | None:
        return self.items.get((service, username))

    def set_password(self, service: str, username: str, password: str) -> None:
        self.items[(service, username)] = password

    def delete_password(self, service: str, username: str) -> None:
        if self.items.pop((service, username), None) is None:
            raise keyring.errors.PasswordDeleteError(username)


class FailingKeyring(keyring.backend.KeyringBackend):
    """A Keychain whose every read raises ``error``: locked, or denied by the user."""

    priority = 1  # type: ignore[assignment]

    def __init__(self, error: Exception) -> None:
        super().__init__()
        self.error = error

    def get_password(self, service: str, username: str) -> str | None:
        raise self.error

    def set_password(self, service: str, username: str, password: str) -> None:
        raise self.error

    def delete_password(self, service: str, username: str) -> None:
        raise self.error
