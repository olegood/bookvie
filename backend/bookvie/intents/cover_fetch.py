"""Download a Book's cover from its address (AD-21 "Cover by URL", Story 12.5).

``add_book`` and ``edit_book`` take a ``coverUrl``; bookvie downloads it with
:class:`CoverFetcher`, then the bytes take the route's cover path
(:func:`~bookvie.intents.cover.prepare_cover`) as an uploaded ``cover`` part
would. This is bookvie's only outbound request, so the download is hardened
against reaching the machine or its network (SSRF):

- ``https`` on every hop; redirects (301, 302, 303, 307, 308) are followed by
  hand, at most :data:`MAX_REDIRECTS`.
- Every address a host resolves to, on every hop, must be global. IPv6 forms
  that carry an IPv4 address (IPv4-mapped, 6to4, NAT64, Teredo) are judged by
  that address, as is IPv4-translated ``::ffff:0:0:0/96``; multicast,
  site-local ``fec0::/10`` and IPv4-compatible ``::/96`` are refused. A literal
  IP host is checked the same way.
- The connection goes to a checked address through the ``connect`` seam, with
  TLS verified against the URL's hostname (SNI), so a second lookup (DNS
  rebinding) is never made. No proxy is used. ``Accept-Encoding: identity``.
- One deadline (30 seconds) covers the whole download; the body is capped at
  :data:`~bookvie.intents.contract.COVER_LIMIT` while it streams; the bytes are
  sniffed for JPEG, PNG or WebP, and ``Content-Type`` is ignored.

A body past the cap is ``cover_too_large`` on ``coverUrl``; every other
failure is ``invalid_fields`` on ``coverUrl``, with a message that says why.
"""

import http.client
import ipaddress
import socket
import ssl
import threading
import time
from collections.abc import Callable, Sequence
from urllib.parse import quote, urljoin, urlsplit

from bookvie.domain.labels import COVER_TOO_LARGE_MESSAGE, LABELS

from .contract import (
    COVER_FIELD,
    COVER_LIMIT,
    ErrorBody,
    ErrorCode,
    ErrorKind,
    FieldError,
    IntentError,
    fields_summary,
    invalid_fields,
)

COVER_URL_FIELD = "coverUrl"
COVER_URL_LABEL = "Cover URL"
"""The summary's name for ``coverUrl``: tool-only, so not in :data:`LABELS`."""
COVER_URL_LABELS = {**LABELS, COVER_URL_FIELD: COVER_URL_LABEL}

DEADLINE = 30.0
MAX_REDIRECTS = 3
REDIRECTS = frozenset({301, 302, 303, 307, 308})
HTTPS_PORT = 443
CHUNK = 64 * 1024
USER_AGENT = "bookvie"
_PATH_SAFE = "/%:@!$&'()*+,;=-._~"

NOT_HTTPS_MESSAGE = "The cover address must be an https:// address."
BAD_ADDRESS_MESSAGE = "The cover address isn't a valid web address."
UNKNOWN_HOST_MESSAGE = "The cover address's host couldn't be found."
NOT_PUBLIC_MESSAGE = "The cover address points to a private or local network address."
TOO_MANY_REDIRECTS_MESSAGE = f"The cover address redirected more than {MAX_REDIRECTS} times."
REDIRECT_WITHOUT_LOCATION_MESSAGE = "The cover address redirected nowhere."
CONNECT_MESSAGE = "Couldn't connect to the cover address."
TLS_MESSAGE = "The cover address's secure connection couldn't be verified."
DOWNLOAD_MESSAGE = "The cover download failed."
ENCODING_MESSAGE = "The cover address sent a compressed answer."
EMPTY_MESSAGE = "The cover address sent an empty file."
NOT_IMAGE_MESSAGE = "The cover address isn't a JPEG, PNG or WebP image."


def deadline_message(seconds: float) -> str:
    return f"The cover download took longer than {seconds:g} seconds."


def status_message(status: int) -> str:
    return f"The cover address answered HTTP {status}."


def cover_url_refused(message: str) -> IntentError:
    """422 ``invalid_fields`` with one ``coverUrl`` field: a download that failed."""
    return invalid_fields(
        [FieldError(field=COVER_URL_FIELD, message=message)], {COVER_URL_FIELD: COVER_URL_LABEL}
    )


def cover_url_too_large() -> IntentError:
    """413 ``cover_too_large`` with one ``coverUrl`` field: a body past ``COVER_LIMIT``."""
    errors = [FieldError(field=COVER_URL_FIELD, message=COVER_TOO_LARGE_MESSAGE)]
    return IntentError(
        413,
        ErrorBody(
            kind=ErrorKind.REFUSAL,
            code=ErrorCode.COVER_TOO_LARGE,
            message=fields_summary(errors, {COVER_URL_FIELD: COVER_URL_LABEL}),
            fields=errors,
        ),
    )


def on_cover_url(err: IntentError) -> IntentError:
    """``err`` with its ``cover`` fields reported on ``coverUrl``, and its summary recomputed.

    Each field keeps its message and position; ``err`` is returned as it is
    when it names no ``cover`` field.
    """
    fields = err.body.fields
    if not fields or not any(error.field == COVER_FIELD for error in fields):
        return err
    renamed = [
        FieldError(field=COVER_URL_FIELD, message=error.message)
        if error.field == COVER_FIELD
        else error
        for error in fields
    ]
    body = err.body.model_copy(
        update={"fields": renamed, "message": fields_summary(renamed, COVER_URL_LABELS)}
    )
    return IntentError(err.status, body)


# --- Addresses ---------------------------------------------------------------------

_IPV4_COMPATIBLE = ipaddress.IPv6Network("::/96")
_NAT64 = ipaddress.IPv6Network("64:ff9b::/96")
# IPv4-translated (SIIT, RFC 2765): ipaddress calls it global whatever IPv4 address it carries.
_IPV4_TRANSLATED = ipaddress.IPv6Network("::ffff:0:0:0/96")

type Address = ipaddress.IPv4Address | ipaddress.IPv6Address


def _embedded(ip: ipaddress.IPv6Address) -> list[ipaddress.IPv4Address] | None:
    """The IPv4 addresses an IPv6 address carries, or ``None`` when it carries none."""
    if ip.ipv4_mapped is not None:
        return [ip.ipv4_mapped]
    if ip.sixtofour is not None:
        return [ip.sixtofour]
    if ip in _NAT64 or ip in _IPV4_TRANSLATED:
        return [ipaddress.IPv4Address(int(ip) & 0xFFFFFFFF)]
    if ip.teredo is not None:
        return list(ip.teredo)
    return None


def is_public(ip: Address) -> bool:
    """Whether bookvie may connect to ``ip``: a global unicast address, unwrapped first."""
    if isinstance(ip, ipaddress.IPv6Address):
        if ip.scope_id is not None:
            return False
        inner = _embedded(ip)
        if inner is not None:
            return all(is_public(address) for address in inner)
        # Site-local fec0::/10 is deprecated, but ipaddress still calls it global.
        if ip in _IPV4_COMPATIBLE or ip.is_site_local:
            return False
    return ip.is_global and not ip.is_multicast


def _default_resolve(host: str) -> list[str]:
    # Looked up at call time, so a patched socket.getaddrinfo applies.
    infos = socket.getaddrinfo(host, HTTPS_PORT, type=socket.SOCK_STREAM)
    return list(dict.fromkeys(str(info[4][0]) for info in infos))


def _default_connect(address: str, port: int, timeout: float | None) -> socket.socket:
    return socket.create_connection((address, port), timeout=timeout)


def _default_ssl_context() -> ssl.SSLContext:
    import httpx2

    # The OS trust store (through truststore); SSL_CERT_FILE and the like are ignored.
    return httpx2.create_ssl_context(trust_env=False)


# --- The download --------------------------------------------------------------------


class _Clock:
    """The download's one deadline; it shuts the open socket down when it passes."""

    def __init__(self, seconds: float) -> None:
        self.ends = time.monotonic() + seconds
        self.message = deadline_message(seconds)
        self._lock = threading.Lock()
        self._sock: socket.socket | None = None
        self._expired = False
        self._timer = threading.Timer(max(seconds, 0), self._expire)
        self._timer.daemon = True
        self._timer.start()

    def remaining(self) -> float:
        left = self.ends - time.monotonic()
        if left <= 0 or self._expired:
            raise cover_url_refused(self.message)
        return left

    @property
    def expired(self) -> bool:
        return self._expired or time.monotonic() >= self.ends

    def watch(self, sock: socket.socket | None) -> None:
        with self._lock:
            self._sock = sock
            if sock is not None and self._expired:
                _shut(sock)

    def _expire(self) -> None:
        with self._lock:
            self._expired = True
            if self._sock is not None:
                _shut(self._sock)

    def stop(self) -> None:
        self._timer.cancel()


def _shut(sock: socket.socket) -> None:
    # The plain socket's shutdown, never SSLSocket's: it only makes a blocked read return.
    try:
        socket.socket.shutdown(sock, socket.SHUT_RDWR)
    except OSError:
        pass


class _Connection(http.client.HTTPConnection):
    """HTTP over a TLS socket that is already open and verified: never one it opens itself."""

    default_port = HTTPS_PORT  # so ``Host`` names no port for 443

    def __init__(self, host: str, port: int, sock: ssl.SSLSocket) -> None:
        super().__init__(host, port)
        self.sock = sock

    def connect(self) -> None:
        raise http.client.HTTPException("the cover connection is opened by CoverFetcher")

    def close(self) -> None:
        # Only forget it: the socket is CoverFetcher's to close, and its deadline stays on it.
        self.sock = None


def _sniffed(data: bytes) -> bool:
    return (
        data.startswith(b"\xff\xd8\xff")
        or data.startswith(b"\x89PNG\r\n\x1a\n")
        or (data[:4] == b"RIFF" and data[8:12] == b"WEBP")
    )


class CoverFetcher:
    """The hardened cover downloader (see the module docstring).

    ``resolve(host)`` returns the address strings ``host`` resolves to
    (default: ``socket.getaddrinfo``). ``connect(address, port, timeout)``
    returns a TCP socket to a checked address, a bare IP string (default:
    ``socket.create_connection``). ``ssl_context`` verifies the server
    (default: ``httpx2.create_ssl_context(trust_env=False)``, made on first
    use). ``deadline`` is the whole download's, in seconds.
    """

    def __init__(
        self,
        *,
        resolve: Callable[[str], Sequence[str]] = _default_resolve,
        connect: Callable[[str, int, float | None], socket.socket] = _default_connect,
        ssl_context: ssl.SSLContext | None = None,
        deadline: float = DEADLINE,
    ) -> None:
        self._resolve = resolve
        self._connect = connect
        self._ssl_context = ssl_context
        self._context_lock = threading.Lock()
        self.deadline = deadline

    @property
    def ssl_context(self) -> ssl.SSLContext:
        with self._context_lock:
            if self._ssl_context is None:
                self._ssl_context = _default_ssl_context()
            return self._ssl_context

    def fetch(self, url: str) -> bytes:
        """The image at ``url``, sniffed as JPEG, PNG or WebP; raises the refusal on ``coverUrl``."""
        clock = _Clock(self.deadline)
        try:
            data = self._follow(url, clock)
        finally:
            clock.stop()
        if not data:
            raise cover_url_refused(EMPTY_MESSAGE)
        if not _sniffed(data):
            raise cover_url_refused(NOT_IMAGE_MESSAGE)
        return data

    def _follow(self, url: str, clock: _Clock) -> bytes:
        for hop in range(MAX_REDIRECTS + 1):
            location = self._get(url, clock)
            if isinstance(location, bytes):
                return location
            if hop == MAX_REDIRECTS:
                break
            url = location
        raise cover_url_refused(TOO_MANY_REDIRECTS_MESSAGE)

    def _get(self, url: str, clock: _Clock) -> bytes | str:
        """One hop: the body, or the absolute address it redirects to."""
        host, port, target = _parse(url)
        addresses = self._checked(host, clock)
        sock = self._open(host, port, addresses, clock)
        responses: list[http.client.HTTPResponse] = []
        try:
            clock.watch(sock)
            return self._exchange(url, host, port, target, sock, clock, responses)
        except IntentError:
            raise
        except (OSError, http.client.HTTPException, ValueError) as err:
            if clock.expired:
                raise cover_url_refused(clock.message) from None
            if isinstance(err, ssl.SSLCertVerificationError):
                raise cover_url_refused(TLS_MESSAGE) from None
            raise cover_url_refused(DOWNLOAD_MESSAGE) from None
        finally:
            clock.watch(None)
            for response in responses:
                # Its makefile holds the socket's descriptor open past sock.close().
                response.close()
            sock.close()

    def _checked(self, host: str, clock: _Clock) -> list[str]:
        """Every address ``host`` is, each one public; refused when any one isn't."""
        try:
            literal = ipaddress.ip_address(host)
        except ValueError:
            literal = None
        if literal is not None:
            ips = [literal]
        else:
            try:
                found = self._resolved(host, clock)
                ips = [ipaddress.ip_address(address) for address in found]
            except OSError, UnicodeError, ValueError:
                raise cover_url_refused(UNKNOWN_HOST_MESSAGE) from None
            if not ips:
                raise cover_url_refused(UNKNOWN_HOST_MESSAGE)
        if not all(is_public(ip) for ip in ips):
            raise cover_url_refused(NOT_PUBLIC_MESSAGE)
        return [str(ip) for ip in ips]

    def _resolved(self, host: str, clock: _Clock) -> list[str]:
        """``resolve(host)`` in a worker thread, so a slow lookup can't outlast the deadline."""
        outcome: list[list[str] | BaseException] = []

        def lookup() -> None:
            try:
                outcome.append(list(self._resolve(host)))
            except BaseException as err:  # noqa: BLE001 - re-raised in the caller's thread
                outcome.append(err)

        worker = threading.Thread(target=lookup, name="cover-resolve", daemon=True)
        worker.start()
        worker.join(timeout=clock.remaining())
        if not outcome:
            raise cover_url_refused(clock.message)
        result = outcome[0]
        if isinstance(result, BaseException):
            raise result
        return result

    def _open(self, host: str, port: int, addresses: list[str], clock: _Clock) -> ssl.SSLSocket:
        """A TLS socket to the first checked address that answers, verified for ``host``."""
        for address in addresses:
            raw: socket.socket | None = None
            try:
                raw = self._connect(address, port, clock.remaining())
                clock.watch(raw)
                raw.settimeout(clock.remaining())
                return self.ssl_context.wrap_socket(raw, server_hostname=host)
            except IntentError:
                if raw is not None:
                    raw.close()
                raise
            except ssl.SSLCertVerificationError:
                if raw is not None:
                    raw.close()
                raise cover_url_refused(TLS_MESSAGE) from None
            except OSError:
                if raw is not None:
                    raw.close()
                if clock.expired:
                    raise cover_url_refused(clock.message) from None
            finally:
                clock.watch(None)
        raise cover_url_refused(CONNECT_MESSAGE)

    def _exchange(
        self,
        url: str,
        host: str,
        port: int,
        target: str,
        sock: ssl.SSLSocket,
        clock: _Clock,
        responses: list[http.client.HTTPResponse],
    ) -> bytes | str:
        sock.settimeout(clock.remaining())
        connection = _Connection(host, port, sock)
        connection.request(
            "GET",
            target,
            headers={"Accept-Encoding": "identity", "Accept": "image/*", "User-Agent": USER_AGENT},
        )
        sock.settimeout(clock.remaining())
        response = connection.getresponse()
        responses.append(response)
        if response.status in REDIRECTS:
            location = response.getheader("Location")
            if not location:
                raise cover_url_refused(REDIRECT_WITHOUT_LOCATION_MESSAGE)
            return urljoin(url, location.strip())
        if response.status != 200:
            raise cover_url_refused(status_message(response.status))
        encoding = (response.getheader("Content-Encoding") or "identity").strip().lower()
        if encoding != "identity":
            raise cover_url_refused(ENCODING_MESSAGE)
        if response.length is not None and response.length > COVER_LIMIT:
            raise cover_url_too_large()
        return _read_capped(response, sock, clock)


def _read_capped(response: http.client.HTTPResponse, sock: socket.socket, clock: _Clock) -> bytes:
    """The body, read a chunk at a time; ``cover_too_large`` as soon as it passes the cap."""
    body = bytearray()
    while True:
        sock.settimeout(clock.remaining())
        chunk = response.read1(min(CHUNK, COVER_LIMIT + 1 - len(body)))
        if not chunk:
            break
        body += chunk
        if len(body) > COVER_LIMIT:
            raise cover_url_too_large()
    clock.remaining()
    if response.length:
        # The server hung up before the Content-Length it declared: a truncated body.
        raise cover_url_refused(DOWNLOAD_MESSAGE)
    return bytes(body)


def _parse(url: str) -> tuple[str, int, str]:
    """``url``'s host (IDNA, lower case), port and request target; refused unless https."""
    if not isinstance(url, str):
        raise cover_url_refused(BAD_ADDRESS_MESSAGE)
    try:
        parts = urlsplit(url.strip())
        scheme = parts.scheme.lower()
        host = parts.hostname
        port = parts.port
    except ValueError:
        raise cover_url_refused(BAD_ADDRESS_MESSAGE) from None
    if scheme != "https":
        raise cover_url_refused(NOT_HTTPS_MESSAGE)
    if not host:
        raise cover_url_refused(BAD_ADDRESS_MESSAGE)
    try:
        ipaddress.ip_address(host)
    except ValueError:
        try:
            host = host.encode("idna").decode("ascii")
        except UnicodeError:
            raise cover_url_refused(BAD_ADDRESS_MESSAGE) from None
    # Percent-encode what http.client can't send (spaces, non-ASCII); "%" is kept, so an
    # address that is already encoded passes unchanged.
    target = quote(parts.path or "/", safe=_PATH_SAFE)
    if parts.query:
        target = f"{target}?{quote(parts.query, safe=_PATH_SAFE + '?')}"
    return host, port if port is not None else HTTPS_PORT, target
