"""Story 12.5: the cover downloader's edges that ``test_agent_cover_url.py`` doesn't run.

``bookvie.intents.cover_fetch.CoverFetcher`` alone, on ``tests.cover_server``'s
seams and local TLS server: a ``Content-Length`` past the cap, a port other
than 443, a relative ``Location``, the other redirect codes, multicast and
other addresses that aren't global, a compressed answer, the defaults under
the AC-5 guard. Then the tool flow around it: a ``coverUrl`` that isn't a
string, an empty one, the order against ``removeCover`` and a missing Book,
and a cover-path refusal merged with a field's. No test reaches the network.
"""

import socket
import ssl
import time
from collections.abc import Callable, Iterator
from pathlib import Path
from typing import Any

import pytest

from bookvie.intents import IntentError
from bookvie.intents.contract import COVER_LIMIT
from bookvie.intents.cover_fetch import (
    CONNECT_MESSAGE,
    COVER_URL_FIELD,
    DOWNLOAD_MESSAGE,
    NOT_PUBLIC_MESSAGE,
    UNKNOWN_HOST_MESSAGE,
    CoverFetcher,
    is_public,
)
from tests.agent_client import McpClient, error_of
from tests.cover_server import PUBLIC4, PUBLIC6, CoverServer, Net, Reply, TestTls, make_test_tls
from tests.helpers import image_bytes, library_bytes
from tests.test_agent_book_write import ADD, UNREAD_FORM
from tests.test_agent_write import GONE, _seed

JPEG = image_bytes(fmt="JPEG")
BROKEN_JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 64
MEBIBYTE = JPEG + b"\x00" * (1024 * 1024 - len(JPEG))

HOSTS: dict[str, list[str]] = {
    "covers.example": [PUBLIC4],
    "covers6.example": [PUBLIC6],
    "multicast.example": ["224.0.0.1"],
    "multicast6.example": ["ff02::1"],
    "broadcast.example": ["255.255.255.255"],
    "reserved.example": ["240.0.0.1"],
    # IPv4-compatible (::/96), deprecated: refused even for a public address inside.
    "compatible.example": ["::5db8:d822"],
    "benchmark.example": ["198.18.0.1"],
    "documentation.example": ["192.0.2.1"],
    "empty.example": [],
}

ROUTES: dict[str, Reply] = {
    "/dune.jpg": Reply(content_type="image/jpeg", body=JPEG),
    # Says it is 200 MiB up front: refused before the body is read.
    "/declared-huge.jpg": Reply(content_type="image/jpeg", body=MEBIBYTE, repeat=200),
    "/relative": Reply(status=302, location="/dune.jpg"),
    "/no-location": Reply(status=302),
    **{
        f"/status/{code}": Reply(status=code, location="/dune.jpg") for code in (301, 303, 307, 308)
    },
    "/gzip.jpg": Reply(content_type="image/jpeg", body=JPEG, encoding="gzip"),
    # Declares more than it sends, then hangs up.
    "/short.jpg": Reply(content_type="image/jpeg", body=JPEG, declared=len(JPEG) + 100),
    "/a%20cov%C3%A9r.jpg": Reply(content_type="image/jpeg", body=JPEG),
    "/q.jpg?size=l%20g&n=%C3%A9": Reply(content_type="image/jpeg", body=JPEG),
}


@pytest.fixture(scope="module")
def tls(tmp_path_factory: pytest.TempPathFactory) -> TestTls:
    return make_test_tls(tmp_path_factory.mktemp("cover-fetch-tls"))


@pytest.fixture
def server(tls: TestTls) -> Iterator[CoverServer]:
    with CoverServer(tls, ROUTES) as running:
        yield running


@pytest.fixture
def net(server: CoverServer) -> Net:
    return Net(server.port, HOSTS)


@pytest.fixture
def fetcher(net: Net, tls: TestTls) -> CoverFetcher:
    return CoverFetcher(resolve=net.resolve, connect=net.connect, ssl_context=tls.client_context())


def _refusal(err: pytest.ExceptionInfo[IntentError]) -> tuple[str, list[str]]:
    body = err.value.body
    return body.code, [field.field for field in body.fields or []]


# --- The downloader alone -----------------------------------------------------------


def test_a_content_length_past_the_cap_is_refused_before_the_body_is_read(
    fetcher: CoverFetcher, server: CoverServer
) -> None:
    with pytest.raises(IntentError) as err:
        fetcher.fetch("https://covers.example/declared-huge.jpg")
    assert _refusal(err) == ("cover_too_large", [COVER_URL_FIELD])
    assert err.value.status == 413
    # At most what the sockets buffered before the client hung up: far from the cap.
    assert server.sent.get("/declared-huge.jpg", 0) < COVER_LIMIT


def test_a_port_other_than_443_is_dialed_on_the_checked_address(
    fetcher: CoverFetcher, net: Net, server: CoverServer
) -> None:
    assert fetcher.fetch("https://covers.example:8443/dune.jpg") == JPEG
    assert net.connections == [(PUBLIC4, 8443)]
    assert [seen.host for seen in server.requests] == ["covers.example:8443"]


def test_an_ipv6_only_host_is_dialed_on_its_checked_address_without_brackets(
    fetcher: CoverFetcher, net: Net
) -> None:
    assert fetcher.fetch("https://covers6.example/dune.jpg") == JPEG
    assert net.connections == [(PUBLIC6, 443)]


def test_a_body_shorter_than_its_content_length_is_refused_as_a_failed_download(
    fetcher: CoverFetcher,
) -> None:
    with pytest.raises(IntentError) as err:
        fetcher.fetch("https://covers.example/short.jpg")
    assert _refusal(err) == ("invalid_fields", [COVER_URL_FIELD])
    assert [field.message for field in err.value.body.fields or []] == [DOWNLOAD_MESSAGE]


def test_spaces_and_non_ascii_in_the_path_and_query_are_sent_percent_encoded(
    fetcher: CoverFetcher, server: CoverServer
) -> None:
    assert fetcher.fetch("https://covers.example/a cov\u00e9r.jpg") == JPEG
    assert fetcher.fetch("https://covers.example/q.jpg?size=l g&n=\u00e9") == JPEG
    # Already encoded: sent unchanged.
    assert fetcher.fetch("https://covers.example/a%20cov%C3%A9r.jpg") == JPEG
    assert server.paths == [
        "/a%20cov%C3%A9r.jpg",
        "/q.jpg?size=l%20g&n=%C3%A9",
        "/a%20cov%C3%A9r.jpg",
    ]


def test_a_lookup_past_the_deadline_is_refused_when_the_deadline_passes(
    net: Net, tls: TestTls
) -> None:
    def slow(host: str) -> list[str]:
        time.sleep(1.5)
        return [PUBLIC4]

    fetcher = CoverFetcher(
        resolve=slow, connect=net.connect, ssl_context=tls.client_context(), deadline=0.2
    )
    started = time.monotonic()
    with pytest.raises(IntentError) as err:
        fetcher.fetch("https://covers.example/dune.jpg")
    assert time.monotonic() - started < 1.0
    assert _refusal(err) == ("invalid_fields", [COVER_URL_FIELD])
    assert [field.message for field in err.value.body.fields or []] == [
        "The cover download took longer than 0.2 seconds."
    ]
    assert net.connections == []


def test_a_relative_location_is_resolved_against_its_hop_and_checked_again(
    fetcher: CoverFetcher, net: Net, server: CoverServer
) -> None:
    assert fetcher.fetch("https://covers.example/relative") == JPEG
    assert server.paths == ["/relative", "/dune.jpg"]
    # Every hop is resolved and checked: never a remembered address.
    assert net.resolutions == ["covers.example", "covers.example"]


@pytest.mark.parametrize("code", [301, 303, 307, 308])
def test_every_redirect_code_is_followed(
    fetcher: CoverFetcher, server: CoverServer, code: int
) -> None:
    assert fetcher.fetch(f"https://covers.example/status/{code}") == JPEG
    assert server.paths == [f"/status/{code}", "/dune.jpg"]


def test_a_redirect_without_a_location_is_refused(fetcher: CoverFetcher) -> None:
    with pytest.raises(IntentError) as err:
        fetcher.fetch("https://covers.example/no-location")
    assert _refusal(err) == ("invalid_fields", [COVER_URL_FIELD])


def test_a_compressed_answer_is_refused(fetcher: CoverFetcher, server: CoverServer) -> None:
    with pytest.raises(IntentError) as err:
        fetcher.fetch("https://covers.example/gzip.jpg")
    assert _refusal(err) == ("invalid_fields", [COVER_URL_FIELD])
    assert [seen.headers.get("accept-encoding") for seen in server.requests] == ["identity"]


@pytest.mark.parametrize(
    "host",
    [
        "multicast",
        "multicast6",
        "broadcast",
        "reserved",
        "compatible",
        "benchmark",
        "documentation",
        "empty",
        "nowhere",
    ],
)
def test_a_host_that_isnt_a_global_unicast_address_is_refused_before_any_connection(
    fetcher: CoverFetcher, net: Net, host: str
) -> None:
    with pytest.raises(IntentError) as err:
        fetcher.fetch(f"https://{host}.example/dune.jpg")
    assert _refusal(err) == ("invalid_fields", [COVER_URL_FIELD])
    assert net.connections == []


@pytest.mark.parametrize(
    ("address", "public"),
    [
        (PUBLIC4, True),
        (PUBLIC6, True),
        ("2002:5db8:d822::1", True),  # 6to4 of a public address
        ("64:ff9b::5db8:d822", True),  # NAT64 of a public address
        ("::ffff:93.184.216.34", True),
        ("224.0.0.1", False),
        ("ff0e::1", False),
        ("::5db8:d822", False),
        ("64:ff9b::a9fe:a9fe", False),
        ("fe80::1%1", False),
    ],
)
def test_is_public_unwraps_ipv4_inside_ipv6_and_refuses_the_rest(
    address: str, public: bool
) -> None:
    import ipaddress

    assert is_public(ipaddress.ip_address(address)) is public


@pytest.mark.parametrize(
    "url",
    [
        "",
        "covers.example/dune.jpg",
        "ftp://covers.example/dune.jpg",
        "https:///dune.jpg",
        "https://covers.example:99999/",
    ],
)
def test_an_address_that_isnt_an_https_url_is_refused_before_any_lookup(
    fetcher: CoverFetcher, net: Net, url: str
) -> None:
    with pytest.raises(IntentError) as err:
        fetcher.fetch(url)
    assert _refusal(err) == ("invalid_fields", [COVER_URL_FIELD])
    assert (net.resolutions, net.connections) == ([], [])


# --- The defaults, under the AC-5 guard --------------------------------------------


def test_the_default_seams_resolve_and_connect_through_the_socket_module_at_call_time(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fetcher = CoverFetcher()
    assert fetcher.deadline == 30
    # A real name goes to socket.getaddrinfo, which the guard refuses (an OSError): it never
    # reaches DNS, and the fetcher refuses it as an unknown host.
    with pytest.raises(IntentError) as err:
        fetcher.fetch("https://covers.example/dune.jpg")
    assert [field.message for field in err.value.body.fields or []] == [UNKNOWN_HOST_MESSAGE]
    # A public literal goes to socket.create_connection, which the guard refuses too.
    with pytest.raises(IntentError) as err:
        fetcher.fetch(f"https://{PUBLIC4}/dune.jpg")
    assert [field.message for field in err.value.body.fields or []] == [CONNECT_MESSAGE]

    looked_up: list[str] = []

    def lookup(host: str, *args: Any, **kwargs: Any) -> list[Any]:
        looked_up.append(host)
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 443))]

    monkeypatch.setattr(socket, "getaddrinfo", lookup)
    with pytest.raises(IntentError) as err:
        fetcher.fetch("https://covers.example/dune.jpg")
    assert _refusal(err) == ("invalid_fields", [COVER_URL_FIELD])
    assert looked_up == ["covers.example"]


def test_the_default_tls_context_verifies_the_certificate_and_the_hostname() -> None:
    context = CoverFetcher().ssl_context
    assert context.verify_mode == ssl.CERT_REQUIRED
    assert context.check_hostname is True


# --- The tool flow -------------------------------------------------------------------


def test_a_server_built_without_a_cover_fetcher_downloads_with_the_default_one(
    mcp_client: McpClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def lookup(host: str, *args: Any, **kwargs: Any) -> list[Any]:
        assert host == "covers.example"
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("10.0.0.1", 443))]

    before = library_bytes(mcp_client.data_dir)
    monkeypatch.setattr(socket, "getaddrinfo", lookup)
    refused = error_of(
        mcp_client.call_tool("add_book", {**ADD, "coverUrl": "https://covers.example/dune.jpg"})
    )
    assert refused["code"] == "invalid_fields"
    assert refused["fields"] == [{"field": COVER_URL_FIELD, "message": NOT_PUBLIC_MESSAGE}]
    assert library_bytes(mcp_client.data_dir) == before


class RecordingFetcher:
    """A fetcher that answers ``data`` and records every address it is asked for."""

    def __init__(self, data: bytes = JPEG) -> None:
        self.data = data
        self.urls: list[str] = []

    def fetch(self, url: str) -> bytes:
        self.urls.append(url)
        return self.data


def _client(
    connect_mcp: Callable[..., McpClient], tmp_path: Path, fetcher: Any
) -> tuple[McpClient, Path]:
    folder = tmp_path / "library"
    _seed(folder, side_reads=2, cover=True)
    return connect_mcp(data_dir=folder, cover_fetcher=fetcher), folder


@pytest.mark.parametrize("tool", ["add_book", "edit_book"])
@pytest.mark.parametrize("value", [5, None, ["https://covers.example/dune.jpg"], {}])
def test_a_cover_url_that_isnt_a_string_is_the_malformed_intent_refusal(
    connect_mcp: Callable[..., McpClient], tmp_path: Path, tool: str, value: Any
) -> None:
    fetcher = RecordingFetcher()
    client, folder = _client(connect_mcp, tmp_path, fetcher)
    before = library_bytes(folder)
    form = ADD if tool == "add_book" else UNREAD_FORM

    refused = error_of(client.call_tool(tool, {**form, "coverUrl": value}))
    assert refused["code"] == "invalid_fields"
    assert [field["field"] for field in refused["fields"]] == ["intent"]
    assert fetcher.urls == []
    assert library_bytes(folder) == before


def test_an_empty_cover_url_is_refused_not_treated_as_absent(
    connect_mcp: Callable[..., McpClient], tmp_path: Path, tls: TestTls, net: Net
) -> None:
    fetcher = CoverFetcher(
        resolve=net.resolve, connect=net.connect, ssl_context=tls.client_context()
    )
    client, folder = _client(connect_mcp, tmp_path, fetcher)
    before = library_bytes(folder)

    refused = error_of(client.call_tool("add_book", {**ADD, "coverUrl": ""}))
    assert refused["code"] == "invalid_fields"
    assert refused["fields"] == [
        {"field": COVER_URL_FIELD, "message": "The cover address must be an https:// address."}
    ]
    assert refused["message"] == "Not saved. 1 field needs attention: Cover URL."
    assert net.resolutions == []
    assert library_bytes(folder) == before


def test_remove_cover_or_a_missing_book_is_refused_first_even_with_a_bad_cover_url(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    fetcher = RecordingFetcher()
    client, folder = _client(connect_mcp, tmp_path, fetcher)
    before = library_bytes(folder)
    http = "http://covers.example/dune.jpg"

    both = error_of(
        client.call_tool("edit_book", {**UNREAD_FORM, "removeCover": True, "coverUrl": http})
    )
    assert (both["code"], [field["field"] for field in both["fields"]]) == (
        "invalid_fields",
        ["intent"],
    )
    gone = error_of(
        client.call_tool("edit_book", {**UNREAD_FORM, "bookId": GONE, "coverUrl": http})
    )
    assert gone["code"] == "book_not_found"
    assert fetcher.urls == []
    assert library_bytes(folder) == before


def test_an_undecodable_cover_is_reported_on_cover_url_in_form_order_with_other_fields(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    fetcher = RecordingFetcher(BROKEN_JPEG)
    client, folder = _client(connect_mcp, tmp_path, fetcher)
    before = library_bytes(folder)

    refused = error_of(
        client.call_tool(
            "edit_book",
            {**UNREAD_FORM, "pages": "many", "coverUrl": "https://covers.example/broken.jpg"},
        )
    )
    assert refused["code"] == "invalid_fields"
    assert [field["field"] for field in refused["fields"]] == ["pages", COVER_URL_FIELD]
    assert refused["fields"][1]["message"] == "Cover must be an image file."
    assert refused["message"] == "Not saved. 2 fields need attention: Pages, Cover URL."
    assert fetcher.urls == ["https://covers.example/broken.jpg"]
    assert library_bytes(folder) == before


def test_without_a_cover_url_nothing_is_fetched(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    fetcher = RecordingFetcher()
    client, _ = _client(connect_mcp, tmp_path, fetcher)
    assert client.call_tool("edit_book", UNREAD_FORM).get("isError") is not True
    assert client.call_tool("add_book", ADD).get("isError") is not True
    assert fetcher.urls == []
