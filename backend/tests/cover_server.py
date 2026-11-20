"""Story 12.5: a local TLS server that serves covers, and the downloader's test seams (AD-21).

No test reaches the network. The downloader (``bookvie.intents.cover_fetch``)
resolves a host through its ``resolve`` seam and connects through its
``connect`` seam. :class:`Net` answers the first with the addresses a test
names and records each lookup. It answers the second by opening a socket to
the local :class:`CoverServer`, whatever checked address the downloader asks
for, and records that address. So a test sees where the downloader would
have connected, and a host can "resolve" to a public address that is never
dialed.

:class:`CoverServer` speaks HTTPS with a certificate a throwaway test CA
issued for :data:`CERT_HOSTS`, so TLS is verified only by a client that
trusts :attr:`TestTls.ca_pem` and sends one of those names as SNI. It
records each request (SNI, ``Host``, path, headers) and how many body bytes
it got out on each path, and it serves :class:`Reply` objects by path.
"""

import datetime
import http.server
import ipaddress
import socket
import socketserver
import ssl
import threading
import time
from collections.abc import Iterator, Mapping, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import NameOID

# Public addresses the fake hosts resolve to. They are never dialed: Net.connect opens the
# local server instead and records the address it was asked for.
PUBLIC4 = "93.184.216.34"
PUBLIC6 = "2606:2800:220:1:248:1893:25c8:1946"
PUBLIC = frozenset({PUBLIC4, PUBLIC6})

# The names the server's certificate covers. `wrong.example` resolves to a public address
# too, but the certificate doesn't name it.
CERT_HOSTS = (
    "covers.example",
    "covers6.example",
    "rebind.example",
    *(f"hop{n}.example" for n in range(1, 6)),
)


@dataclass(frozen=True)
class TestTls:
    """A throwaway CA and a server certificate it issued for :data:`CERT_HOSTS`."""

    __test__ = False  # not a pytest test class

    ca_pem: Path
    cert_pem: Path
    key_pem: Path

    def client_context(self) -> ssl.SSLContext:
        """A verifying client context that trusts only the test CA."""
        return ssl.create_default_context(cafile=str(self.ca_pem))

    def server_context(self) -> ssl.SSLContext:
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(str(self.cert_pem), str(self.key_pem))
        return context


def make_test_tls(folder: Path) -> TestTls:
    """Write a new CA and a server certificate for :data:`CERT_HOSTS` into ``folder``."""
    folder.mkdir(parents=True, exist_ok=True)
    now = datetime.datetime.now(datetime.UTC)
    valid = (now - datetime.timedelta(days=1), now + datetime.timedelta(days=7))

    ca_key = ec.generate_private_key(ec.SECP256R1())
    ca_name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "bookvie test CA")])
    ca_cert = (
        x509.CertificateBuilder()
        .subject_name(ca_name)
        .issuer_name(ca_name)
        .public_key(ca_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(valid[0])
        .not_valid_after(valid[1])
        .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                content_commitment=False,
                key_encipherment=False,
                data_encipherment=False,
                key_agreement=False,
                key_cert_sign=True,
                crl_sign=True,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .add_extension(
            x509.SubjectKeyIdentifier.from_public_key(ca_key.public_key()), critical=False
        )
        .sign(ca_key, hashes.SHA256())
    )

    key = ec.generate_private_key(ec.SECP256R1())
    cert = (
        x509.CertificateBuilder()
        .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, CERT_HOSTS[0])]))
        .issuer_name(ca_name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(valid[0])
        .not_valid_after(valid[1])
        .add_extension(
            x509.SubjectAlternativeName([x509.DNSName(host) for host in CERT_HOSTS]),
            critical=False,
        )
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(
            x509.ExtendedKeyUsage([x509.oid.ExtendedKeyUsageOID.SERVER_AUTH]), critical=False
        )
        .add_extension(
            x509.AuthorityKeyIdentifier.from_issuer_public_key(ca_key.public_key()),
            critical=False,
        )
        .sign(ca_key, hashes.SHA256())
    )

    tls = TestTls(folder / "ca.pem", folder / "server.pem", folder / "server-key.pem")
    tls.ca_pem.write_bytes(ca_cert.public_bytes(serialization.Encoding.PEM))
    tls.cert_pem.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    tls.key_pem.write_bytes(
        key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )
    return tls


@dataclass(frozen=True)
class Reply:
    """What the server answers on one path.

    The body is ``body`` sent ``repeat`` times, so a large body is never held
    in memory. ``length`` sends a ``Content-Length``; without it the body ends
    when the connection closes. ``trickle`` sends the body one byte at a time,
    that many seconds apart.
    """

    status: int = 200
    content_type: str | None = None
    body: bytes = b""
    repeat: int = 1
    length: bool = True
    location: str | None = None
    trickle: float | None = None


def redirect(location: str, status: int = 302) -> Reply:
    return Reply(status=status, location=location)


@dataclass(frozen=True)
class Seen:
    """One request the server read."""

    sni: str | None
    host: str | None
    path: str
    headers: Mapping[str, str]
    """Header names lower-cased."""


class CoverServer:
    """The local HTTPS server: see the module docstring. Use it as a context manager."""

    def __init__(self, tls: TestTls, routes: Mapping[str, Reply]) -> None:
        self.routes = dict(routes)
        self.requests: list[Seen] = []
        self.sent: dict[str, int] = {}
        self._lock = threading.Lock()
        self._stopping = threading.Event()
        context = tls.server_context()
        context.sni_callback = _record_sni
        self._server = _Server(("127.0.0.1", 0), _Handler, self, context)
        self.port: int = self._server.server_address[1]
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)

    def __enter__(self) -> CoverServer:
        self._thread.start()
        return self

    def __exit__(self, *exc: object) -> None:
        self._stopping.set()
        self._server.shutdown()
        self._server.server_close()
        self._thread.join(timeout=5)

    @property
    def paths(self) -> list[str]:
        with self._lock:
            return [seen.path for seen in self.requests]

    def _seen(self, seen: Seen) -> None:
        with self._lock:
            self.requests.append(seen)

    def _count(self, path: str, size: int) -> None:
        with self._lock:
            self.sent[path] = self.sent.get(path, 0) + size


def _record_sni(sock: Any, name: str | None, _context: ssl.SSLContext) -> None:
    sock.bookvie_sni = name


class _Server(socketserver.ThreadingTCPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(
        self, address: tuple[str, int], handler: type, owner: CoverServer, tls: ssl.SSLContext
    ) -> None:
        self.owner = owner
        self.tls = tls
        super().__init__(address, handler)

    def handle_error(self, request: Any, client_address: Any) -> None:
        # A client that refuses the certificate, or hangs up mid-body, is expected here.
        pass


class _Handler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server: _Server

    def setup(self) -> None:
        self.request.settimeout(10)
        self.request = self.server.tls.wrap_socket(self.request, server_side=True)
        super().setup()

    def log_message(self, format: str, *args: Any) -> None:
        pass

    def do_GET(self) -> None:
        owner = self.server.owner
        owner._seen(
            Seen(
                sni=getattr(self.request, "bookvie_sni", None),
                host=self.headers.get("Host"),
                path=self.path,
                headers={name.lower(): value for name, value in self.headers.items()},
            )
        )
        reply = owner.routes.get(self.path, Reply(status=404, body=b"not found"))
        self.send_response(reply.status)
        if reply.content_type is not None:
            self.send_header("Content-Type", reply.content_type)
        if reply.location is not None:
            self.send_header("Location", reply.location)
        if reply.length:
            self.send_header("Content-Length", str(len(reply.body) * reply.repeat))
        self.send_header("Connection", "close")
        self.end_headers()
        try:
            for chunk in _chunks(reply):
                if owner._stopping.is_set():
                    return
                self.wfile.write(chunk)
                owner._count(self.path, len(chunk))
                if reply.trickle is not None:
                    time.sleep(reply.trickle)
        except OSError:  # the client hung up: what a capped or timed-out download does
            return
        finally:
            self.close_connection = True


def _chunks(reply: Reply) -> Iterator[bytes]:
    if reply.trickle is not None:
        for _ in range(reply.repeat):
            for index in range(len(reply.body)):
                yield reply.body[index : index + 1]
        return
    for _ in range(reply.repeat):
        if reply.body:
            yield reply.body


@dataclass
class Net:
    """The downloader's ``resolve`` and ``connect`` seams over one :class:`CoverServer`.

    ``hosts`` maps a host to the addresses it resolves to; ``rebind`` maps a
    host to what it resolves to on every lookup after its first. An unknown
    host fails as ``getaddrinfo`` fails.
    """

    port: int
    hosts: Mapping[str, Sequence[str]]
    rebind: Mapping[str, Sequence[str]] = field(default_factory=dict)
    resolutions: list[str] = field(default_factory=list)
    connections: list[tuple[str, int]] = field(default_factory=list)

    def resolve(self, host: str) -> list[str]:
        """The addresses ``host`` resolves to, as strings."""
        earlier = self.resolutions.count(host)
        self.resolutions.append(host)
        if earlier and host in self.rebind:
            return list(self.rebind[host])
        if host not in self.hosts:
            raise socket.gaierror(socket.EAI_NONAME, f"{host}: unknown test host")
        return list(self.hosts[host])

    def connect(self, address: str, port: int, timeout: float | None = None) -> socket.socket:
        """A TCP socket for ``address``:``port``: really the local server's."""
        self.connections.append((str(ipaddress.ip_address(address)), port))
        return socket.create_connection(("127.0.0.1", self.port), timeout=timeout)


class ProxyTrap:
    """A loopback listener that only counts the connections it accepts.

    A downloader that honored ``HTTPS_PROXY`` (or ``ALL_PROXY``) set to it
    would connect here instead of through its ``connect`` seam.
    """

    def __init__(self) -> None:
        self._socket = socket.create_server(("127.0.0.1", 0))
        self._socket.settimeout(0.2)
        self.port: int = self._socket.getsockname()[1]
        self.accepted = 0
        self._stopping = threading.Event()
        self._thread = threading.Thread(target=self._accept, daemon=True)

    @property
    def url(self) -> str:
        return f"http://127.0.0.1:{self.port}"

    def __enter__(self) -> ProxyTrap:
        self._thread.start()
        return self

    def __exit__(self, *exc: object) -> None:
        self._stopping.set()
        self._thread.join(timeout=5)
        self._socket.close()

    def _accept(self) -> None:
        while not self._stopping.is_set():
            try:
                conn, _ = self._socket.accept()
            except TimeoutError:
                continue
            except OSError:
                return
            self.accepted += 1
            conn.close()


PROXY_VARIABLES = (
    "HTTPS_PROXY",
    "https_proxy",
    "HTTP_PROXY",
    "http_proxy",
    "ALL_PROXY",
    "all_proxy",
)
