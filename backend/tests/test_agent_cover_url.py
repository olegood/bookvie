"""Story 12.5: ``add_book`` and ``edit_book`` fetch a cover from its ``coverUrl`` (AD-21).

bookvie downloads the cover itself (``bookvie.intents.cover_fetch``), so the
image never passes through the conversation, and the download can't reach
anything on the machine or its network: ``https`` on every hop, every
address each host resolves to checked as global (wrapped IPv4 unwrapped
first), the connection made to the address that was checked with TLS
verified against the hostname, proxies ignored, ``Accept-Encoding:
identity``, at most 3 redirects, a 30-second deadline, a 20 MB cap while
streaming, and the bytes sniffed for JPEG, PNG or WebP. The downloaded
bytes then take the route's cover path, so a fetched cover is stored exactly
as the same bytes uploaded as a ``cover`` part would be.

No leaf reaches the network: each builds a ``CoverFetcher`` on
``tests.cover_server``'s resolver and connection seams and its local TLS
server. Every test runs with ``HOME`` set to a temporary folder
(``conftest.py``).
"""

import socket
import time
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pytest

from bookvie.intents import AddBookIntent, EditBookIntent
from bookvie.intents.contract import COVER_LIMIT
from tests import test_agent_write
from tests.agent_client import McpClient
from tests.cover_server import (
    CERT_HOSTS,
    PROXY_VARIABLES,
    PUBLIC,
    PUBLIC4,
    PUBLIC6,
    CoverServer,
    Net,
    ProxyTrap,
    Reply,
    TestTls,
    make_test_tls,
    redirect,
)
from tests.helpers import (
    assert_invariants,
    covers_in,
    image_bytes,
    library_bytes,
    temp_files,
)
from tests.test_agent_book_write import (
    ADD,
    EDIT_REQUIRED,
    FINISHED_FORM,
    UNREAD_FORM,
)
from tests.test_agent_write import (
    BOOK_TOOL_NAMES,
    EARLIER_TOOL_NAMES,
    GONE,
    WRITE_TOOL_NAMES,
    Case,
    _route_answer,
    _tool_answer,
    _twins,
)

# Story 12.3's fixture: intents mint ids (and cover file names) from a counter.
same_ids = test_agent_write.same_ids

RED = (
    "Story 12.5 red phase: add_book and edit_book don't take coverUrl yet, and "
    "bookvie.intents.cover_fetch doesn't exist"
)
RED_GUARD = "Story 12.5 red phase: the suite has no guard against connections off the machine yet"

# Story 12.4's descriptions with Story 12.5's sentence appended, character for character
# (epics.md). Spelled out here, not built from test_agent_book_write's constants, which the
# build updates.
COVER_URL_SENTENCE = (
    "coverUrl is the https address of the front cover image; bookvie downloads it. If the "
    "download fails, nothing is saved: tell the user why."
)
COVER_URL_DESCRIPTIONS = {
    "add_book": (
        "Add a Book to the catalog. Every field is a string. Required: title, pages, authors "
        "(separated by semicolons), language, publisher, type (paperback, hardcover or ebook); "
        "edition defaults to 1. Optional: subtitle, isbn, year, tags (separated by commas), and "
        "finishedOn (YYYY-MM-DD) for a Book the user has already read. A likely duplicate is "
        "refused with duplicate_book and the matching Books: show them to the user, and send "
        "confirmDuplicate true only if the user says to add it anyway. Returns the new Book's "
        "id. coverUrl is the https address of the front cover image; bookvie downloads it. If "
        "the download fails, nothing is saved: tell the user why."
    ),
    "edit_book": (
        "Replace a Book's fields. This is a whole edit: a field you leave empty is cleared. Call "
        "get_book first and send its editForm with bookId, changing only what the user asked "
        "for. A finished Book's finishedOn can be changed but not emptied. removeCover true "
        "deletes the Book's cover: send it only when the user asks. A changed title, author or "
        "ISBN that makes it a likely duplicate is refused like add_book. coverUrl is the https "
        "address of the front cover image; bookvie downloads it. If the download fails, nothing "
        "is saved: tell the user why."
    ),
}

# --- What the local server serves ----------------------------------------------

JPEG = image_bytes(fmt="JPEG")
PNG = image_bytes()
WEBP = image_bytes(fmt="WEBP")
GIF = image_bytes(fmt="GIF")
HTML = b"<!doctype html><title>Dune</title><p>Not a cover.</p>"
# JPEG's magic, then nothing Pillow can decode: it passes the sniff and fails the cover path.
BROKEN_JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 64
# One mebibyte that starts as a JPEG; served 200 times with no Content-Length.
MEBIBYTE_OF_JPEG = JPEG + b"\x00" * (1024 * 1024 - len(JPEG))
# A JPEG padded to exactly the cap: Pillow ignores the bytes after the image.
JPEG_AT_THE_CAP = JPEG + b"\x00" * (COVER_LIMIT - len(JPEG))
# The bytes a capped download may still have pushed into the sockets' buffers.
SOCKET_SLACK = 16 * 1024 * 1024

# Hosts that resolve, at least in part, to an address the downloader must refuse.
BAD_HOSTS: dict[str, list[str]] = {
    "loopback": ["127.0.0.1"],
    "loopback-other": ["127.8.9.10"],
    "loopback6": ["::1"],
    "private-10": ["10.0.0.1"],
    "private-172": ["172.16.5.4"],
    "private-192": ["192.168.1.10"],
    "private6": ["fd00::1"],
    "link-local": ["169.254.10.10"],
    "link-local6": ["fe80::1"],
    "shared": ["100.64.0.1"],
    "unspecified": ["0.0.0.0"],
    "unspecified6": ["::"],
    "metadata": ["169.254.169.254"],
    "metadata6": ["fd00:ec2::254"],
    # One bad record among several, in either position.
    "public-then-private": [PUBLIC4, "10.0.0.1"],
    "private-then-public": ["192.168.1.10", PUBLIC4],
    "public6-then-loopback": [PUBLIC6, "127.0.0.1"],
    "public-then-mapped-loopback": [PUBLIC4, "::ffff:127.0.0.1"],
    # IPv6 forms that carry an IPv4 address inside.
    "mapped-loopback": ["::ffff:127.0.0.1"],
    "mapped-private": ["::ffff:10.0.0.1"],
    "6to4-loopback": ["2002:7f00:1::1"],
    "6to4-private": ["2002:c0a8:10a::1"],
    # Python calls 64:ff9b::/96 global: only unwrapping finds the address inside.
    "nat64-loopback": ["64:ff9b::7f00:1"],
    "nat64-private": ["64:ff9b::a00:1"],
    "nat64-metadata": ["64:ff9b::a9fe:a9fe"],
    "teredo-loopback": ["2001:0:4136:e378:8000:63bf:80ff:fffe"],
    "teredo-private": ["2001:0:4136:e378:8000:63bf:f5ff:fffe"],
}

# URLs whose host is an address literal: there is nothing to resolve, and still a check.
BAD_LITERALS: dict[str, str] = {
    "literal-loopback": "https://127.0.0.1/dune.jpg",
    "literal-loopback6": "https://[::1]/dune.jpg",
    "literal-private": "https://10.0.0.1/dune.jpg",
    "literal-metadata": "https://169.254.169.254/latest/meta-data/",
    "literal-mapped-loopback": "https://[::ffff:127.0.0.1]/dune.jpg",
    "literal-nat64-loopback": "https://[64:ff9b::7f00:1]/dune.jpg",
}

HOSTS: dict[str, list[str]] = {
    "covers.example": [PUBLIC4],
    "covers6.example": [PUBLIC6],
    "rebind.example": [PUBLIC4],
    # Public, but the server's certificate doesn't name it.
    "wrong.example": [PUBLIC4],
    **{f"hop{n}.example": [PUBLIC4] for n in range(1, 6)},
    **{f"{label}.example": addresses for label, addresses in BAD_HOSTS.items()},
}
# DNS rebinding: public when first checked, loopback on any later lookup.
REBIND = {"rebind.example": ["127.0.0.1"]}

ROUTES: dict[str, Reply] = {
    "/dune.jpg": Reply(content_type="binary/octet-stream", body=JPEG),
    "/dune.png": Reply(content_type="text/plain", body=PNG),
    "/dune.webp": Reply(body=WEBP),
    "/page.html": Reply(content_type="image/jpeg", body=HTML),
    "/dune.gif": Reply(content_type="image/gif", body=GIF),
    "/empty.jpg": Reply(content_type="image/jpeg"),
    "/missing.jpg": Reply(status=404, content_type="image/jpeg", body=JPEG),
    "/broken.jpg": Reply(content_type="image/jpeg", body=BROKEN_JPEG),
    "/huge.jpg": Reply(content_type="image/jpeg", body=MEBIBYTE_OF_JPEG, repeat=200, length=False),
    "/cap.jpg": Reply(content_type="image/jpeg", body=JPEG_AT_THE_CAP),
    "/slow.jpg": Reply(content_type="image/jpeg", body=JPEG, trickle=0.05),
    "/to-http": redirect("http://covers.example/dune.jpg"),
    **{f"/to/{label}": redirect(f"https://{label}.example/dune.jpg") for label in BAD_HOSTS},
    **{f"/to/{label}": redirect(url) for label, url in BAD_LITERALS.items()},
    # /chain/n is n redirects from a JPEG: hop n, hop n-1, ..., hop 1 serves it.
    "/chain/0": Reply(content_type="binary/octet-stream", body=JPEG),
    **{f"/chain/{n}": redirect(f"https://hop{n}.example/chain/{n - 1}") for n in range(1, 6)},
}

# --- The cases ------------------------------------------------------------------

# Each tool's form: a new Book, and a whole edit of the unread Book, which has a cover.
FORMS = {"add_book": ADD, "edit_book": UNREAD_FORM}
JPEG_URL = "https://covers.example/dune.jpg"


@dataclass(frozen=True)
class CoverCase:
    """One ``coverUrl`` through one tool, and what must come of it.

    ``expect`` is ``"stored"`` or the refusal's code. ``served`` is the body
    the route gets as its ``cover`` part to compare with: for a stored case,
    and for an image the cover path refuses. ``trusted`` is whether the
    fetcher trusts the test CA. ``deadline`` replaces the 30 seconds.
    ``requested`` is a path the server must have been asked for (the hop
    before a refused redirect), ``never`` one it must not have been asked
    for, and ``max_sent`` caps the body bytes the server got out on a path.
    """

    label: str
    url: str
    expect: str
    tool: str = "add_book"
    served: bytes | None = None
    trusted: bool = True
    deadline: float | None = None
    requested: str | None = None
    never: str | None = None
    max_sent: tuple[str, int] | None = None

    @property
    def id(self) -> str:
        return f"{self.tool}-{self.label}"


COVER_CASES: list[CoverCase] = [
    # Stored, as the same bytes uploaded would be.
    CoverCase("jpeg-as-octet-stream", JPEG_URL, "stored", served=JPEG),
    CoverCase("jpeg-as-octet-stream", JPEG_URL, "stored", tool="edit_book", served=JPEG),
    CoverCase("png-as-text", "https://covers.example/dune.png", "stored", served=PNG),
    CoverCase("webp-without-content-type", "https://covers.example/dune.webp", "stored", served=WEBP),
    CoverCase("ipv6-host", "https://covers6.example/dune.jpg", "stored", served=JPEG),
    CoverCase("three-redirects", "https://covers.example/chain/3", "stored", served=JPEG),
    CoverCase("exactly-the-cap", "https://covers.example/cap.jpg", "stored", served=JPEG_AT_THE_CAP),
    # Checked once per hop: a later lookup that says loopback is never asked or used.
    CoverCase("dns-rebinding", "https://rebind.example/dune.jpg", "stored", served=JPEG),
    # Refused: not https, here or on a redirect.
    CoverCase("http", "http://covers.example/dune.jpg", "invalid_fields"),
    CoverCase("http", "http://covers.example/dune.jpg", "invalid_fields", tool="edit_book"),
    CoverCase("redirect-to-http", "https://covers.example/to-http", "invalid_fields", requested="/to-http"),
    # Refused: an address that isn't global, directly or after a redirect from a public host.
    *(CoverCase(label, f"https://{label}.example/dune.jpg", "invalid_fields") for label in BAD_HOSTS),
    CoverCase("private-10", "https://private-10.example/dune.jpg", "invalid_fields", tool="edit_book"),
    *(CoverCase(label, url, "invalid_fields") for label, url in BAD_LITERALS.items()),
    *(CoverCase(f"redirect-to-{label}", f"https://covers.example/to/{label}", "invalid_fields", requested=f"/to/{label}") for label in [*BAD_HOSTS, *BAD_LITERALS]),
    # Refused: a fourth redirect is never followed.
    CoverCase("four-redirects", "https://covers.example/chain/4", "invalid_fields", requested="/chain/4", never="/chain/0"),
    # Refused: TLS that doesn't verify for the hostname.
    CoverCase("certificate-for-another-host", "https://wrong.example/dune.jpg", "invalid_fields"),
    CoverCase("untrusted-certificate", JPEG_URL, "invalid_fields", trusted=False),
    # Refused: a body that isn't JPEG, PNG or WebP, whatever its Content-Type.
    CoverCase("html-as-jpeg", "https://covers.example/page.html", "invalid_fields", requested="/page.html"),
    CoverCase("html-as-jpeg", "https://covers.example/page.html", "invalid_fields", tool="edit_book", requested="/page.html"),
    CoverCase("gif", "https://covers.example/dune.gif", "invalid_fields", requested="/dune.gif"),
    CoverCase("empty-body", "https://covers.example/empty.jpg", "invalid_fields", requested="/empty.jpg"),
    CoverCase("not-found", "https://covers.example/missing.jpg", "invalid_fields", requested="/missing.jpg"),
    CoverCase("unknown-host", "https://nowhere.example/dune.jpg", "invalid_fields"),
    # Refused: past the deadline (1 second here; 30 by default), while the body trickles in.
    CoverCase("past-the-deadline", "https://covers.example/slow.jpg", "invalid_fields", deadline=1.0, requested="/slow.jpg"),
    # Refused: past 20 MB, and the download stops reading there.
    CoverCase("past-the-cap", "https://covers.example/huge.jpg", "cover_too_large", max_sent=("/huge.jpg", COVER_LIMIT + SOCKET_SLACK)),
    # Refused by the cover path after the download: reported on coverUrl, not cover.
    CoverCase("undecodable-jpeg", "https://covers.example/broken.jpg", "invalid_fields", served=BROKEN_JPEG),
    CoverCase("undecodable-jpeg", "https://covers.example/broken.jpg", "invalid_fields", tool="edit_book", served=BROKEN_JPEG),
]  # fmt: skip


# --- Fixtures and helpers ---------------------------------------------------------


@pytest.fixture(scope="session")
def cover_tls(tmp_path_factory: pytest.TempPathFactory) -> TestTls:
    """A throwaway CA and the local server's certificate, made once per run."""
    return make_test_tls(tmp_path_factory.mktemp("cover-tls"))


def _fetcher(net: Net, tls: TestTls, *, trusted: bool = True, deadline: float | None = None) -> Any:
    """A ``CoverFetcher`` on ``net``'s seams, trusting the test CA unless told not to."""
    from bookvie.intents.cover_fetch import CoverFetcher

    options: dict[str, Any] = {"resolve": net.resolve, "connect": net.connect}
    if trusted:
        options["ssl_context"] = tls.client_context()
    if deadline is not None:
        options["deadline"] = deadline
    return CoverFetcher(**options)


def _outcome(answer: tuple[str, Any]) -> tuple[Any, ...]:
    """A success as it is; a refusal as its code and the names of its fields."""
    kind, body = answer
    if kind == "ok":
        return answer
    return kind, body["code"], [field["field"] for field in body.get("fields", [])]


def _expected(case: CoverCase, route: tuple[str, Any] | None) -> tuple[Any, ...]:
    """What the tool must answer: the route's answer, with ``cover`` reported as ``coverUrl``."""
    if case.expect == "stored":
        return route  # type: ignore[return-value]
    if route is not None:
        _, code, fields = _outcome(route)
        return "error", code, ["coverUrl" if name == "cover" else name for name in fields]
    return "error", case.expect, ["coverUrl"]


def _host(header: str | None) -> str | None:
    """A ``Host`` header's name, without a port."""
    return None if header is None else header.split(":")[0]


# --- AC-1: the schemas and descriptions ----------------------------------------------


@pytest.mark.skip(reason=RED)
def test_add_book_and_edit_book_take_an_optional_string_cover_url_and_say_so_in_their_descriptions(
    mcp_client: McpClient,
) -> None:
    # [P0] AC-1. 12.4's schemas plus an optional coverUrl string, and one more sentence each.
    from bookvie.agent import TOOLS, advertised_schema, input_schema

    tools = mcp_client.list_tools()
    listed = {tool["name"]: tool for tool in tools}
    properties = {name: listed[name]["inputSchema"]["properties"] for name in BOOK_TOOL_NAMES}
    assert {name: props.get("coverUrl", {}).get("type") for name, props in properties.items()} == {
        "add_book": "string",
        "edit_book": "string",
    }

    def without_cover_url(schema: dict[str, Any]) -> dict[str, Any]:
        rest = {key: value for key, value in schema["properties"].items() if key != "coverUrl"}
        return {**schema, "properties": rest}

    def rest(schema: dict[str, Any]) -> dict[str, Any]:
        return {k: v for k, v in schema.items() if k not in ("required", "title", "description")}

    add_schema = listed["add_book"]["inputSchema"]
    edit_schema = listed["edit_book"]["inputSchema"]
    for name, schema in (("add_book", add_schema), ("edit_book", edit_schema)):
        prop = schema["properties"]["coverUrl"]
        # A plain string: null left out, as for the form keys.
        assert "anyOf" not in prop and prop["type"] == "string", (name, prop)
        assert "coverUrl" not in schema.get("required", []), (name, schema.get("required"))
        assert schema["additionalProperties"] is False, name
    # Otherwise each is Story 12.4's schema, unchanged.
    assert without_cover_url(add_schema) == input_schema(AddBookIntent)
    assert rest(without_cover_url(edit_schema)) == rest(input_schema(EditBookIntent))
    assert edit_schema["required"] == EDIT_REQUIRED
    for tool in TOOLS:
        if tool.name in BOOK_TOOL_NAMES:
            assert listed[tool.name]["inputSchema"] == advertised_schema(tool), tool.name

    for name in BOOK_TOOL_NAMES:
        assert listed[name]["description"] == COVER_URL_DESCRIPTIONS[name]
        assert listed[name]["description"].endswith(f" {COVER_URL_SENTENCE}")
    # No new tool: the cumulative list stays Story 12.4's.
    assert [
        tool["name"] for tool in tools
    ] == EARLIER_TOOL_NAMES + WRITE_TOOL_NAMES + BOOK_TOOL_NAMES


# --- AC-2 and AC-3: refusals that come before any download ---------------------------


@pytest.mark.skip(reason=RED)
def test_remove_cover_with_a_cover_url_is_refused_as_the_route_refuses_it_with_a_file_before_any_download(
    connect_mcp: Callable[..., McpClient], tmp_path: Path, cover_tls: TestTls
) -> None:
    # [P0] AC-2. A coverUrl counts as a cover part: with removeCover it's the route's refusal.
    with CoverServer(cover_tls, ROUTES) as server:
        net = Net(server.port, HOSTS)
        tool_side, route_side = _twins(
            connect_mcp,
            tmp_path,
            Case("edit_book", "remove-cover-and-cover-url", {}, "invalid_fields", cover=True),
            cover_fetcher=_fetcher(net, cover_tls),
        )
        before = library_bytes(tool_side.data_dir)
        covers_before = covers_in(tool_side.data_dir)
        arguments = {**UNREAD_FORM, "removeCover": True}

        route = _route_answer(route_side, "edit_book", arguments, cover=JPEG)
        tool = _tool_answer(tool_side, "edit_book", {**arguments, "coverUrl": JPEG_URL})
        assert tool == route

        assert _outcome(route) == ("error", "invalid_fields", ["intent"]), route
        assert (net.resolutions, net.connections, server.paths) == ([], [], [])
        assert library_bytes(tool_side.data_dir) == before
        assert covers_in(tool_side.data_dir) == covers_before


@pytest.mark.skip(reason=RED)
def test_edit_book_with_a_cover_url_for_a_missing_book_is_book_not_found_and_downloads_nothing(
    connect_mcp: Callable[..., McpClient], tmp_path: Path, cover_tls: TestTls
) -> None:
    # [P0] AC-3. The Book is checked before the download, as the route checks it before the write.
    with CoverServer(cover_tls, ROUTES) as server:
        net = Net(server.port, HOSTS)
        tool_side, route_side = _twins(
            connect_mcp,
            tmp_path,
            Case("edit_book", "book-not-found", {}, "book_not_found"),
            cover_fetcher=_fetcher(net, cover_tls),
        )
        before = library_bytes(tool_side.data_dir)
        arguments = {**FINISHED_FORM, "bookId": GONE}

        route = _route_answer(route_side, "edit_book", arguments, cover=JPEG)
        tool = _tool_answer(tool_side, "edit_book", {**arguments, "coverUrl": JPEG_URL})
        assert tool == route

        assert _outcome(route) == ("error", "book_not_found", []), route
        assert (net.resolutions, net.connections, server.paths) == ([], [], [])
        assert library_bytes(tool_side.data_dir) == before
        assert temp_files(tool_side.data_dir) == []


# --- AC-4: the download -------------------------------------------------------------


@pytest.mark.skip(reason=RED)
@pytest.mark.parametrize("case", COVER_CASES, ids=lambda case: case.id)
def test_a_cover_url_is_fetched_only_from_a_checked_public_https_address_and_stored_as_an_upload(
    connect_mcp: Callable[..., McpClient],
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    same_ids: Callable[[], None],
    cover_tls: TestTls,
    case: CoverCase,
) -> None:
    # [P0] AC-4. Through the tool with a coverUrl on one library; through the route with the
    # same bytes as a cover part on its twin, when there are bytes to compare.
    with CoverServer(cover_tls, ROUTES) as server, ProxyTrap() as proxy:
        # Every proxy variable points at a trap: a downloader that honors one connects there.
        for name in PROXY_VARIABLES:
            monkeypatch.setenv(name, proxy.url)
        for name in ("NO_PROXY", "no_proxy"):
            monkeypatch.delenv(name, raising=False)
        net = Net(server.port, HOSTS, REBIND)
        fetcher = _fetcher(net, cover_tls, trusted=case.trusted, deadline=case.deadline)
        tool_side, route_side = _twins(
            connect_mcp,
            tmp_path,
            Case(case.tool, case.label, {}, case.expect, cover=True),
            cover_fetcher=fetcher,
        )
        before = library_bytes(tool_side.data_dir)
        covers_before = covers_in(tool_side.data_dir)
        form = FORMS[case.tool]

        same_ids()
        route = None
        if case.served is not None:
            route = _route_answer(route_side, case.tool, form, cover=case.served)
        same_ids()
        started = time.monotonic()
        tool = _tool_answer(tool_side, case.tool, {**form, "coverUrl": case.url})
        elapsed = time.monotonic() - started
        assert _outcome(tool) == _expected(case, route), case.id

        # Within the deadline, give or take a worker thread's start.
        assert elapsed < (case.deadline or 30.0) + 3.0, (case.id, elapsed)
        # Every connection went to a checked public address on 443, never through a proxy.
        assert {address for address, _ in net.connections} <= PUBLIC, net.connections
        assert {port for _, port in net.connections} <= {443}, net.connections
        assert proxy.accepted == 0, case.id
        # TLS for the URL's hostname (SNI), the same name as Host, and no compression.
        for seen in server.requests:
            assert seen.sni in CERT_HOSTS and _host(seen.host) == seen.sni, seen
            assert seen.headers.get("accept-encoding") == "identity", seen
        if case.requested is not None:
            assert case.requested in server.paths, server.paths
        if case.never is not None:
            assert case.never not in server.paths, server.paths
        if case.max_sent is not None:
            path, most = case.max_sent
            assert 0 < server.sent.get(path, 0) <= most, server.sent

        if case.expect == "stored":
            # The route's cover path: the same Book, cover file and spine color, byte for byte.
            assert library_bytes(tool_side.data_dir) == library_bytes(route_side.data_dir)
            assert covers_in(tool_side.data_dir) == covers_in(route_side.data_dir)
            assert covers_in(tool_side.data_dir) != covers_before
            assert_invariants(tool_side.data_dir)
        else:
            # Nothing saved: no Book added, the edited Book unchanged, no cover written.
            assert library_bytes(tool_side.data_dir) == before, case.id
            assert covers_in(tool_side.data_dir) == covers_before, case.id
            assert temp_files(tool_side.data_dir) == [], case.id
        if route is not None and case.expect != "stored":
            # The cover path's own message, on coverUrl.
            messages = [field["message"] for field in tool[1]["fields"]]
            assert messages == [field["message"] for field in route[1]["fields"]], tool
        if case.deadline is not None:
            from bookvie.intents.cover_fetch import CoverFetcher

            assert CoverFetcher().deadline == 30


# --- AC-5: the suite stays on the machine -----------------------------------------------


@pytest.mark.skip(reason=RED_GUARD)
def test_no_test_can_open_a_connection_off_the_machine() -> None:
    # [P0] AC-5. A guard every test runs under refuses a connection or a lookup that would leave
    # the machine (192.0.2.1 and 2001:db8::1 are documentation addresses), and lets loopback through.
    with pytest.raises(Exception, match="off the machine"):
        socket.create_connection(("192.0.2.1", 443), timeout=1)

    with pytest.raises(Exception, match="off the machine"):
        socket.create_connection(("2001:db8::1", 443), timeout=1)
    with pytest.raises(Exception, match="off the machine"):
        socket.getaddrinfo("example.com", 443)
    assert {info[4][0] for info in socket.getaddrinfo("localhost", 80)} <= {"127.0.0.1", "::1"}
    with socket.create_server(("127.0.0.1", 0)) as listener:
        socket.create_connection(listener.getsockname(), timeout=1).close()
