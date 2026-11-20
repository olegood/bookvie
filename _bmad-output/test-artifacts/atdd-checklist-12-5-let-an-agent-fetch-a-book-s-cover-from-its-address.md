---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-20'
storyId: '12.5'
storyKey: '12-5-let-an-agent-fetch-a-book-s-cover-from-its-address'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-125-let-an-agent-fetch-a-books-cover-from-its-address'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-12-5-let-an-agent-fetch-a-book-s-cover-from-its-address.md'
generatedTestFiles:
  - 'backend/tests/test_agent_cover_url.py'
  - 'backend/tests/cover_server.py'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 12.5; Story 12.4''s two descriptions)'
  - '_bmad-output/implementation-artifacts/epic-12-context.md (Cover by URL, Whole edits, Epic gate)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-21: One validator, Edits are whole, Cover by URL)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/reviews/review-adversarial-epic12.md (H4 coverUrl order and field, H5 SSRF holes)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/reviews/review-freshness-epic12.md (§6 httpx2, pinned IP with sni_hostname)'
  - '_bmad-output/planning-artifacts/mcp-server-plan-2026-11-19.md (D8, D16; §6 Cover downloader tests)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (12-5 backlog, 12-4 done)'
  - '_bmad-output/test-artifacts/atdd-checklist-12-4-let-an-agent-add-and-edit-a-book.md (format, contract-test pattern)'
  - '_bmad/tea/config.yaml'
  - 'backend/bookvie/agent/tools.py (_write_tool, ADD_BOOK, EDIT_BOOK, BOOK_FORM_KEYS)'
  - 'backend/bookvie/intents/cover.py (prepare_cover, UploadedCover, mint_cover_file), edit_book.py (parse_edit_book_intent has_cover), add_book.py, book_form.py (cover_failures), contract.py (COVER_LIMIT, cover_too_large, invalid_fields)'
  - 'backend/bookvie/domain/labels.py (COVER_* messages)'
  - 'backend/bookvie/http/app.py (create_app), http/api.py (_uploaded_cover, the add-book and edit-book routes)'
  - 'backend/tests/conftest.py (connect_mcp), agent_client.py, helpers.py (image_bytes, covers_in, library_bytes, temp_files), test_agent_write.py (_twins, _route_answer, same_ids, Case), test_agent_book_write.py, test_layers.py'
  - 'knowledge: test-quality (skips, assertions that cannot fail), test-levels-framework, test-priorities-matrix (headings)'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given add_book and edit_book, when a client lists them, then each also takes an optional coverUrl (a string), and the schema-equality tests include it. Description addition: both tools'' descriptions end with: "coverUrl is the https address of the front cover image; bookvie downloads it. If the download fails, nothing is saved: tell the user why."' }
  - { id: AC-2, idSource: generated, text: 'Given edit_book with removeCover: true and a coverUrl, when it is called, then it is refused as the route refuses removeCover with a cover file, before any download.' }
  - { id: AC-3, idSource: generated, text: 'Given edit_book for a Book that doesn''t exist, with a coverUrl, when it is called, then it is refused with book_not_found and nothing is downloaded.' }
  - { id: AC-4, idSource: generated, text: 'Given the downloader''s resolver and connection seams, a local TLS fake server and a test resolver, when a coverUrl points at it, then a JPEG served as binary/octet-stream is accepted and stored as the Book''s cover through the existing cover path, as an uploaded JPEG would be; and these are refused with invalid_fields on coverUrl and nothing saved: an http URL; a host that resolves to a loopback, private, link-local, shared (100.64.0.0/10), unspecified or metadata address, including when any one of several records does, and including IPv4-mapped, 6to4, NAT64 and Teredo forms; a redirect from a public host to any of those; a redirect to http; a fourth redirect; a body that isn''t JPEG, PNG or WebP whatever its Content-Type; a download past 30 seconds; and a body over 20 MB stops reading at the cap and is refused with cover_too_large on coverUrl; and an image the cover path can''t decode is reported on coverUrl, not cover; and the connection goes to the address that was checked, with TLS verified against the hostname, Accept-Encoding: identity, and proxy variables ignored; and on a refused add_book no Book is added; on a refused edit_book the Book is unchanged.' }
  - { id: AC-5, idSource: generated, text: 'Given the whole test suite, when it runs, then no test opens a connection off the machine.' }
---

# ATDD Checklist: Story 12.5 Let an agent fetch a Book's cover from its address

## Preflight

- **Stack:** `fullstack`, auto-detected. pytest (`backend/tests/conftest.py`) and Playwright (`frontend/playwright.config.ts`) are in place. The story has no UI, so every leaf is pytest.
- **Story:** no spec file exists yet (the build writes it, as in 12.4), so the source is `epics.md` Story 12.5. Its 5 Given/When/Then criteria have no ids, so they are numbered AC-1 to AC-5 in source order (registry above). The "Description addition" belongs to AC-1. `sprint-status.yaml` reads `backlog` for 12.5 and `done` for 12.4.
- **Epic gate:** 12.5 isn't Epic 12's first story, so the spine-drift gate doesn't apply.
- **Config:** `tea_use_playwright_utils: false`, no Pact, `tea_browser_automation: auto`. No leaf touches a page, so the browser fragments don't apply. The leaves follow `test-quality.md`: each skip carries its reason, and every assertion can fail (the probes below show it).
- **What exists today:**
  - `add_book` and `edit_book` (Story 12.4) are `_write_tool`s. Both pass the arguments to the route's parser as they are, so a `coverUrl` is an unknown key, refused on `intent` (the 12.4 cases `unknown-key-cover-url` pin that). `edit_book` requires `BOOK_FORM_KEYS` plus `bookId`.
  - **The cover path.** The route reads the `cover` part (`_uploaded_cover`: 413 `cover_too_large` past `COVER_LIMIT` = 20 MiB), runs `prepare_cover` (Pillow re-decodes it; JPEG, PNG, WebP, GIF, BMP and TIFF all decode), and passes an `UploadedCover` to `add_book` / `edit_book`. A `RefusedCover` becomes a `cover` field failure (`cover_failures`). `parse_edit_book_intent(raw, has_cover=True)` refuses `removeCover: true` on `intent` ("The intent can't both send a cover and remove it.").
  - **No downloader.** `bookvie.intents.cover_fetch` doesn't exist, and `create_app` takes no fetcher. `httpx2` 2.16.2 is already a runtime dependency (12.1); `cryptography` 50.0.2 is in the venv only through `mcp` → `pyjwt[crypto]`.
  - **No network guard.** Nothing in `conftest.py` stops a test from connecting off the machine.

## Generation Mode

**AI generation**, sequential, in this session, as in Stories 12.3 and 12.4. No recording: there's no UI. The config's `auto` would launch the two worker subagents, but the E2E worker has nothing to generate, and the API worker needs this session's reading of the cover path and the seams. The leaves reuse 12.1's `McpClient` and `connect_mcp` and 12.3's twin and route helpers.

## Test Strategy

| AC | Level | Priority | Leaf (first assertion in bold) | Why this level |
|---|---|---|---|---|
| AC-1 | API (pytest, `mcp_client`) | P0 | `test_add_book_and_edit_book_take_an_optional_string_cover_url_and_say_so_in_their_descriptions`. **Each tool's `coverUrl` property has type `string`.** Then it has no `anyOf` (null left out) and isn't required. Without it, `add_book`'s schema equals `input_schema(AddBookIntent)` and `edit_book`'s equals 12.4's (`required` is still the 13 form keys plus `bookId`). Each listed schema equals `advertised_schema(tool)`, each description is the full text in `COVER_URL_DESCRIPTIONS`, and the tool list is unchanged. | The schema is what an agent fills in. |
| AC-2 | API (two `connect_mcp` apps on copies of one seed) | P0 | `test_remove_cover_with_a_cover_url_is_refused_as_the_route_refuses_it_with_a_file_before_any_download`. **The tool's answer equals the route's for the same form with a `cover` part.** Then that answer is `invalid_fields` on `intent`. The resolver, the connection seam and the server saw nothing, and the library and covers are unchanged. | The order AD-21 fixes: parse with `has_cover` before the download. |
| AC-3 | API (twins) | P0 | `test_edit_book_with_a_cover_url_for_a_missing_book_is_book_not_found_and_downloads_nothing`. **The tool's answer equals the route's** (`book_not_found`, with a cover part). Then nothing was resolved, connected or requested, and nothing was written. | The Book check comes before the download. |
| AC-4 | API (twins, `CoverFetcher` on the test seams, local TLS server) | P0 | `test_a_cover_url_is_fetched_only_from_a_checked_public_https_address_and_stored_as_an_upload`, parametrized over 91 `COVER_CASES`. **`_outcome(tool) == _expected(case, route)`:** a stored case answers exactly what the route answers for the same bytes as a `cover` part, and a refusal is `(code, ["coverUrl"])`. The remaining checks run in every case and are listed below. | P0: the plan's "downloader's refusals against local fakes" is an epic-gate risk (SSRF). |
| AC-5 | Unit (pytest) | P0 | `test_no_test_can_open_a_connection_off_the_machine`. **`socket.create_connection(("192.0.2.1", 443))` raises with a message matching "off the machine".** The same goes for `2001:db8::1` and for `getaddrinfo("example.com")`. `localhost` still resolves to loopback, and a loopback connection still works. | The guard the whole suite runs under. |

**Primary branch per criterion.** AC-1: the `coverUrl` property. AC-2 and AC-3: the tool refuses exactly as the route does. AC-4: the case's outcome. AC-5: a refused off-machine connection.

**What every AC-4 case also checks** (after the criterion assertion):
- It finished within its deadline plus 3 seconds.
- Every connection went to `PUBLIC4` or `PUBLIC6` on port 443. Nothing else was ever dialed: no address that isn't global, no address from a second lookup, no port 80.
- The proxy trap accepted nothing. Every proxy variable points at it in every case, and `NO_PROXY` is unset.
- Every request the server saw used SNI equal to the `Host` name and one of the certificate's names, with `Accept-Encoding: identity`.
- `requested` and `never` paths: a refused redirect was reached and then not followed, and the fourth redirect's target is never asked for. `max_sent`: for the case past the cap, the server got out at most `COVER_LIMIT` + 16 MiB of the 200 MiB it offered.
- **Stored cases:** `library.json` and `covers/` are byte-identical between the tool's twin and the route's twin (`same_ids` restarts the counter, which now includes `cover`'s file name), the cover changed, and the invariants hold.
- **Refused cases:** `library.json` and `covers/` are unchanged, and no temp file is left. For an add, that means no Book was added; for an edit, that the Book is unchanged.
- **The undecodable case:** the field message equals the route's message on `cover` ("Cover must be an image file."), now on `coverUrl`.
- **The deadline case:** `CoverFetcher().deadline == 30`.

**The AC-4 cases** (`COVER_CASES` at `backend/tests/test_agent_cover_url.py:237`):

| Kind | Cases |
|---|---|
| Stored | JPEG as `binary/octet-stream` (add and edit); PNG as `text/plain`; WebP with no `Content-Type`; an IPv6-only host; three redirects; a body of exactly 20 MiB; DNS rebinding (public on the first lookup, loopback on any later one) |
| Not https | an `http` URL (add and edit); a redirect to `http` |
| Address not global (`BAD_HOSTS`, 27 hosts, each direct and after a redirect from `covers.example`) | 127.0.0.1, 127.8.9.10, ::1; 10/8, 172.16/12, 192.168/16, fd00::1; 169.254.10.10, fe80::1; 100.64.0.1; 0.0.0.0, ::; 169.254.169.254, fd00:ec2::254; several records with one bad record first or last (v4 and v6); IPv4-mapped (loopback, private); 6to4 (loopback, private); NAT64 (loopback, private, metadata; Python calls `64:ff9b::/96` global); Teredo (loopback, private). `private-10` is also run through `edit_book`. |
| Address literals (`BAD_LITERALS`, each direct and after a redirect) | `https://127.0.0.1/`, `[::1]`, `10.0.0.1`, `169.254.169.254`, `[::ffff:127.0.0.1]`, `[64:ff9b::7f00:1]` |
| Redirects | four redirects (refused; `/chain/0` never requested) |
| TLS | a certificate that doesn't name the host; a fetcher without the test CA (the default trust) |
| Body | HTML as `image/jpeg` (add and edit); GIF (Pillow decodes it, so only the sniff refuses it); an empty body; a 404 |
| Other | an unknown host; past the deadline (1 s here, while the body trickles one byte every 50 ms); past the cap (`cover_too_large`); an undecodable JPEG (add and edit, on `coverUrl` with the route's message) |

**What the leaves pin (the contract for the build):**
- `bookvie.intents.cover_fetch.CoverFetcher`, built with keyword arguments that each have a default:
  - `resolve(host: str) -> Sequence[str]`: the address strings the host resolves to. The default uses `getaddrinfo`.
  - `connect(address: str, port: int, timeout: float | None) -> socket.socket`: a TCP socket to the checked address. `address` is a bare IP string, with no brackets. The default is `socket.create_connection`.
  - `ssl_context: ssl.SSLContext`: the default verifies against the system's trust.
  - `deadline: float = 30`, readable as `.deadline`.
- The fetcher's own interface isn't called by the leaves: `fetch` or another name is the build's choice. Only the tools use it.
- `create_app(..., cover_fetcher=...)`. The tools use the app's fetcher, and a real server builds the default one. `connect_mcp(cover_fetcher=...)` passes it through, and this run added that parameter.
- `add_book` and `edit_book` advertise `coverUrl` as an optional `string`, and their descriptions are 12.4's with the sentence appended.
- The order is AD-21's: take `coverUrl` out of the arguments, parse with `has_cover`, check the Book exists (edit), download, then call the handler with the `UploadedCover`.
- Every download failure is `invalid_fields` on `coverUrl`, except a body past 20 MiB, which is `cover_too_large` on `coverUrl`. A `prepare_cover` refusal is reported on `coverUrl` with the cover path's message.

**Open for the build (not pinned):**
- The download failures' messages, `LABELS["coverUrl"]`, and so each refusal's top-level summary. The leaves compare codes and field names only, plus the undecodable case's field message.
- The HTTP client: `httpx2` with a custom network backend over `connect`, or `http.client` on the socket. Either way TLS is wrapped with `server_hostname` set to the URL's host.
- Whether a `Content-Length` past the cap is refused before the body is read. No case sends one; `/huge.jpg` has no length.
- An empty `coverUrl`: the adversarial review's H4 proposes treating it as absent. See the follow-ups.
- `Content-Encoding` other than identity. The server never sends one, and the leaves only check what the client asks for.

## Existing leaves this story changes (for the build)

AC-1 says "the schema-equality tests include it". These 12.4 leaves in `backend/tests/test_agent_book_write.py` assert there is no `coverUrl`, so they will fail until the build updates them:
- `:239` and `:272`: `"coverUrl" not in schema["properties"]`.
- `:234`: `add_book`'s schema `== input_schema(AddBookIntent)`.
- `:271`: `edit_book`'s property set.
- `:244` and `:275`: the descriptions against `BOOK_DESCRIPTIONS`. The new leaf spells out its own full texts, so the build may update `BOOK_DESCRIPTIONS` or not.
- `:193-194` and `:208`: the `unknown-key-cover-url` cases in `BOOK_CASES`. With `coverUrl` a known key, those calls would reach the real downloader. Drop them or move them under the AC-4 seams.
- `:379`: the `missing-keys-and-cover-url` partial edit. The missing-key refusal still comes first, but its comment calls `coverUrl` an unknown key.
- `test_a_real_bookvie_process_advertises_both_book_tools_and_commits_an_add` compares each listed schema with `advertised_schema(tool)`, which stays true if `advertised_schema` includes `coverUrl`.

This run changed these shared helpers. The existing agent leaves still pass on them (282 passed across `test_agent_write`, `test_agent_book_write`, `test_agent_mount`, `test_agent_edit_form`, `test_agent_read`), and the full backend suite gives 1931 passed and 95 skipped:
- `connect_mcp` (`tests/conftest.py`) gained `cover_fetcher`. It is passed to `create_app` only when given, so every existing call is unchanged.
- `_twins` (`tests/test_agent_write.py`) gained a keyword `cover_fetcher`, which goes to the tool's app only.
- `_route_answer` gained `cover: bytes | None = None`, which is sent as the `cover` part.
- `MINTING_MODULES` gained `cover`, so `mint_cover_file` mints from the counter too.

## Green-phase follow-ups (secondary branches, not red leaves)

- [ ] **Pytest, AC-4 fetcher defaults:** a `CoverFetcher()` with no seams resolves through `getaddrinfo` and connects with `socket.create_connection`, under the AC-5 guard (so it is refused as off the machine for a real name, and never reaches DNS).
- [ ] **Pytest, AC-4 more refusals:** a `Content-Encoding: gzip` reply refused (or decoded and counted after decoding); a `Content-Length` past the cap refused before reading; a redirect with no `Location`; a relative `Location` resolved against the hop; an `https` URL with a port other than 443 (the connection goes to that port on the checked address); a 301, 303, 307 and 308; a multicast, broadcast or `240.0.0.0/4` address; a host past the deadline during the TLS handshake or the headers.
- [ ] **Pytest, AC-4 field order:** a `coverUrl` refusal next to a bad form field. Is it one `invalid_fields` in form order (H4), or does the download not run at all because the parse failed first? The order in AD-21 says the parse comes first.
- [ ] **Pytest, AC-1/AC-4 empty `coverUrl`:** `""` counts as absent (H4) or is refused. Pin whichever the build chooses.
- [ ] **Pytest, AC-4 through a real server:** one `add_book` with a `coverUrl` on a `bookvie` subprocess. This needs a fetcher seam the CLI doesn't have, so it is likely out of scope: record why if so.
- [ ] **Pytest, AC-4 the lock:** the download runs outside the AD-4 lock, so a slow download doesn't block another intent (`RecordingLock` in `tests/helpers.py`).
- [ ] **Pytest, AC-2/AC-3 the order with a bad URL:** `removeCover` with an `http` `coverUrl` is still the `intent` refusal, and a missing Book with an `http` `coverUrl` is still `book_not_found`.

## Helper probes

Helpers reused: `McpClient`, `text_of`, `error_of` (`tests/agent_client.py`); `mcp_client` (`tests/conftest.py`); `image_bytes`, `covers_in`, `library_bytes`, `temp_files`, `assert_invariants`, `stored_book` (`tests/helpers.py`); `Case`, `_tool_answer`, `GONE`, `UNREAD`, `EARLIER_TOOL_NAMES`, `WRITE_TOOL_NAMES`, `BOOK_TOOL_NAMES` (`tests/test_agent_write.py`); `ADD`, `UNREAD_FORM`, `FINISHED_FORM`, `EDIT_REQUIRED` (`tests/test_agent_book_write.py`); `input_schema`, `advertised_schema`, `TOOLS` (`bookvie.agent`); `COVER_LIMIT` (`bookvie.intents.contract`). Extended, probed: `connect_mcp` (`cover_fetcher`), `_twins` (`cover_fetcher`), `_route_answer` (`cover`), `same_ids` (`MINTING_MODULES` adds `cover`).

Helpers added:
- `tests/cover_server.py`: `make_test_tls` and `TestTls` (a throwaway CA and a server certificate for `CERT_HOSTS`; no existing helper makes TLS material), `CoverServer`, `Reply`, `redirect` and `Seen` (a local HTTPS server that records SNI, `Host`, path, headers and body bytes sent per path), `Net` (the downloader's `resolve` and `connect` seams with recording and rebinding), `ProxyTrap` (counts connections to a fake proxy), `PROXY_VARIABLES`, `PUBLIC4`, `PUBLIC6`, `PUBLIC`.
- `tests/test_agent_cover_url.py`: `cover_tls` (session fixture), `_fetcher`, `_outcome`, `_expected`, `_host`, and the data `ROUTES`, `HOSTS`, `BAD_HOSTS`, `BAD_LITERALS`, `REBIND`, `COVER_CASES`, `CoverCase`, `COVER_URL_DESCRIPTIONS`. `_outcome` and `_expected` reduce an answer to `(code, field names)`. 12.4's `_tool_answer` and `_route_answer` give whole answers, which differ here in the field name (`cover` against `coverUrl`) and in the summary.

Shipped numbers: AC-4 quotes 20 MB for the cover cap; measured `COVER_LIMIT = 20 * 1024 * 1024` (`backend/bookvie/intents/contract.py:166`), and `test_cover.py:568` shows the route accepts exactly that; asserted as quoted, through `COVER_LIMIT` itself (`/cap.jpg` is stored, `/huge.jpg` is `cover_too_large`). The 30 seconds and 3 redirects are new behavior this story adds (the AC sets them), and AC-4 asserts them as the AC gives them. The ACs quote no size for shipped UI.

Probes ran from a temporary `backend/tests/test_agent_cover_url_probe.py` (`uv run pytest -q -p no:cacheprovider --no-cov -s tests/test_agent_cover_url_probe.py`, 15 passed). The file was then removed with `rm`. No helper changed after the probes.
- **`CoverServer`, `Net`, `make_test_tls`:** an `http.client` request over `net.connect` with the test CA, SNI `covers.example` and `Accept-Encoding: identity` got `/dune.jpg` with `Content-Type: binary/octet-stream` and the JPEG's exact bytes. The server recorded SNI and `Host` `covers.example`, path `/dune.jpg`, `accept-encoding` `identity`, and `sent["/dune.jpg"] == len(JPEG)`. `Net` recorded `[(PUBLIC4, 443)]` and `["covers.example"]`. **Refused:** SNI `wrong.example` and a default (untrusted) context each raised `SSLCertVerificationError`, and a request with `gzip` was recorded as `gzip`, so the identity check can fail. Redirects answered `302` with `Location: https://hop2.example/chain/1`, `/chain/0` served the JPEG, and an unknown path answered 404.
- **`Net.resolve` and `connect`:** `rebind.example` answered `[PUBLIC4]` and then `["127.0.0.1"]`. An unknown host raised `gaierror`. `connect` normalized `0:0:0:0:0:ffff:7f00:1` to `::ffff:127.0.0.1` in its record and refused `[::1]` with brackets (`ValueError`).
- **`sent` (the cap check):** a client that read 1 MiB of `/huge.jpg` and closed left `sent == 1048576` (counted in 1 MiB chunks), far under the `COVER_LIMIT` + 16 MiB bound and the 200 MiB offered. The trickle sent 19 of 677 bytes in 1 second, so a 1-second deadline can't be met by waiting for the body.
- **`ProxyTrap`:** 0 before and 1 after one loopback connection.
- **`_outcome`, `_expected`, `_host`:** a success passes through whole. A refusal on `cover` becomes `("error", "invalid_fields", ["cover"])`, which doesn't equal the expected `["coverUrl"]`, so the rename is tested. `_expected` for the cap case is `("error", "cover_too_large", ["coverUrl"])`. `_host` drops a port and passes `None`.
- **`_route_answer(cover=...)` and the references:** `removeCover` with a cover part is `invalid_fields` on `intent` ("The intent can't both send a cover and remove it.", AC-2's reference). A missing Book with a cover part is `book_not_found` (AC-3's). `BROKEN_JPEG` is refused on `cover` with "Cover must be an image file.". A GIF is accepted by the route, so only the downloader's sniff refuses it. Without `cover`, an edit keeps the Book's cover file.
- **Stored cases, `_twins` and `same_ids`:** each of the 8 stored cases ran the AC-4 comparison with the tool call replaced by the route on the tool twin. The answers were equal, and `library.json` and `covers/` were byte-identical and changed. **Refused:** without restarting `same_ids`, the twins' cover names differed, so the comparison can fail.
- **Not probed:** `connect_mcp`'s `cover_fetcher` and `_twins`' `cover_fetcher` pass-through can't run until `create_app` takes one. With `None`, the existing suites above prove them unchanged. No border or outline width is read (no UI), so Epic 10 retro item 71 (E10-R1) doesn't apply.

**Render-before-read:** no leaf reads a page. Every read is an MCP or HTTP response from an app whose lifespan is running (`connect_mcp`), a file in its data folder, or a record the local server or a seam kept after the call returned. No leaf needed a fix.

## TDD Red Phase

5 skipped leaves in `backend/tests/test_agent_cover_url.py`, each with `@pytest.mark.skip`. Four carry `RED` ("Story 12.5 red phase: add_book and edit_book don't take coverUrl yet, and bookvie.intents.cover_fetch doesn't exist"). The AC-5 leaf carries `RED_GUARD` ("… the suite has no guard against connections off the machine yet"). Each leaf's `[P0] AC-n` is in its first comment line.

| AC | Leaf | Priority |
|---|---|---|
| AC-1 | `backend/tests/test_agent_cover_url.py:327` `test_add_book_and_edit_book_take_an_optional_string_cover_url_and_say_so_in_their_descriptions` | P0 |
| AC-2 | `backend/tests/test_agent_cover_url.py:377` `test_remove_cover_with_a_cover_url_is_refused_as_the_route_refuses_it_with_a_file_before_any_download` | P0 |
| AC-3 | `backend/tests/test_agent_cover_url.py:404` `test_edit_book_with_a_cover_url_for_a_missing_book_is_book_not_found_and_downloads_nothing` | P0 |
| AC-4 | `backend/tests/test_agent_cover_url.py:434` `test_a_cover_url_is_fetched_only_from_a_checked_public_https_address_and_stored_as_an_upload` (91 cases, `COVER_CASES` at `:237`) | P0 |
| AC-5 | `backend/tests/test_agent_cover_url.py:515` `test_no_test_can_open_a_connection_off_the_machine` | P0 |

**Red today.** This run came after the probes above last passed, on the file as it is now. The leaves ran from a throwaway `tests/test_agent_cover_url_red.py` with the skip lines deleted (`uv run pytest -q -p no:cacheprovider --no-cov tests/test_agent_cover_url_red.py`). The copy was then removed with `rm`. Result: 95 failed:
- **AC-1:** `{'add_book': None} != {'add_book': 'string'}` (and the same for `edit_book`): it fails at its first assertion.
- **AC-2, AC-3 and all 91 AC-4 cases:** `ModuleNotFoundError: No module named 'bookvie.intents.cover_fetch'`, in `_fetcher` before the tool call. Once the module exists, AC-2 and AC-3 still fail at their first assertion: today the tool refuses `coverUrl` as an unknown key ("The intent must be a JSON object…"), where the route answers "The intent can't both send a cover and remove it." or `book_not_found`. This is reasoned from the 12.4 `unknown-key-cover-url` cases, not run: running it would need a stub module in `bookvie/`.
- **AC-5:** `Regex pattern did not match. Expected regex: 'off the machine' Actual message: 'timed out'`: it fails at its first assertion, after the 1-second timeout. That red run sent one TCP SYN to `192.0.2.1` (TEST-NET-1, a documentation address no host uses); with the guard in place no leaf sends one.

With the skips in place, `uv run pytest -q -p no:cacheprovider --no-cov` (the full backend suite) gave 1931 passed and 95 skipped. `ruff format --check` and `ruff check` are clean on `tests/`. `git status` lists only `backend/tests/conftest.py`, `backend/tests/test_agent_write.py`, `backend/tests/cover_server.py`, `backend/tests/test_agent_cover_url.py` and this checklist: no `*_probe.py` file and no throwaway copy.

**Storage keys:** no new localStorage key. The story has no frontend change.

**No real library:** every leaf runs under `conftest.py`'s temporary `HOME`, on folders under `tmp_path`. The TLS material is in a session temp folder.

## Implementation checklist (for `bmad-build-auto`)

- [ ] Add `bookvie/intents/cover_fetch.py` with `CoverFetcher(resolve=, connect=, ssl_context=, deadline=30)` and the AD-21 rules. Keep `intents` free of `http` and `agent` imports (`test_layers.py`). (AC-4)
- [ ] `create_app(..., cover_fetcher=None)`: store it, or a default `CoverFetcher()`, where the tools reach it (`app.state`). (AC-4)
- [ ] `add_book` and `edit_book`: advertise an optional `coverUrl` string (no null) on top of 12.4's schemas, and append the sentence to both descriptions. Update `epics.md` only if the text changes. (AC-1)
- [ ] The tool flow: pop `coverUrl`, parse with `has_cover`, check `book_not_found` for an edit, download outside the AD-4 lock, run `prepare_cover`, call the handler. Report a `RefusedCover` and every download failure on `coverUrl`. (AC-2, AC-3, AC-4)
- [ ] Add an autouse guard in `backend/tests/conftest.py` that refuses `connect` to, and `getaddrinfo` of, anything off the machine with a message containing "off the machine", and lets loopback and `localhost` through. (AC-5)
- [ ] Update the 12.4 leaves and cases listed under "Existing leaves this story changes".
- [ ] Decide whether `cryptography` (used by `tests/cover_server.py`) becomes an explicit dev dependency rather than a transitive one through `mcp`, and check `test_stack_pins.py` if it is added.
- [ ] Un-skip the 5 leaves and see them pass, then run `npm run check` without editing any other existing leaf's assertions beyond the list above.

## Next

`bmad-build-auto` for Story 12.5, then `bmad-code-review` in a new session, then `bmad-testarch-automate` for the follow-ups above.
