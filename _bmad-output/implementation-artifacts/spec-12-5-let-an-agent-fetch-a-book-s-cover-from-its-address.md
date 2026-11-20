---
title: "Story 12.5: Let an agent fetch a Book's cover from its address"
type: 'feature'
created: '2026-11-20'
status: 'done'
baseline_revision: 'fcec07cb39459dc404914a9a46c1f5fd43ed705a'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-12-5-let-an-agent-fetch-a-book-s-cover-from-its-address.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-21, Stack table), reconciled before the next epic: the spine lists httpx2 as "the cover download", but cover_fetch downloads with http.client over its own socket; httpx2 only supplies the TLS context (create_ssl_context(trust_env=False)).
    evidence: |-
      backend/bookvie/intents/cover_fetch.py _default_ssl_context, _Connection (Spine Check).
    location: >-
      ARCHITECTURE-SPINE.md Stack table, httpx2 row
    severity: low
  - summary: >-
      Spine drift (AD-21 Cover by URL), reconciled before the next epic: the downloader enforces rules AD-21 doesn't list: multicast, IPv4-compatible ::/96 and scoped IPv6 refused; a Content-Encoding other than identity refused; an empty body refused; a Content-Length past the cap refused before reading; a body shorter than its Content-Length refused; the OS trust store with SSL_CERT_FILE and the like ignored; DNS lookups bounded by the deadline.
    evidence: |-
      backend/bookvie/intents/cover_fetch.py is_public, _exchange, _read_capped, fetch, _resolved, _default_ssl_context (Spine Check).
    location: >-
      ARCHITECTURE-SPINE.md AD-21 Cover by URL
    severity: low
  - summary: >-
      Spine drift (AD-21, Structural Seed), reconciled before the next epic: the Seed's intents/ line still lists cover_fetch as planned; it now exists.
    evidence: |-
      backend/bookvie/intents/cover_fetch.py (Spine Check).
    location: >-
      ARCHITECTURE-SPINE.md Structural Seed, intents/ line
    severity: low
  - summary: >-
      Spine drift (AD-21, Structural Seed http/ line, Consistency Conventions Testing row), reconciled before the next epic: the spine names neither create_app's cover_fetcher seam (app.state.cover_fetcher), the non-string coverUrl refusal on intent as the tool's first step, nor the autouse pytest guard (_on_the_machine) that keeps lookups and connections on the machine.
    evidence: |-
      backend/bookvie/http/app.py create_app; backend/bookvie/agent/tools.py _book_tool; backend/tests/conftest.py _on_the_machine (Spine Check).
    location: >-
      ARCHITECTURE-SPINE.md AD-21, Structural Seed, Consistency Conventions
    severity: low
---

<intent-contract>

## Intent

**Problem:** An agent can add and edit a Book (Story 12.4) but can't give it a cover. A cover upload would have to pass through the conversation, and nothing in bookvie downloads anything.

**Approach:** `add_book` and `edit_book` take an optional `coverUrl` string. bookvie downloads it itself with a hardened downloader (`bookvie.intents.cover_fetch.CoverFetcher`, AD-21 "Cover by URL"), then the bytes take the route's cover path (`prepare_cover` → handler) exactly as an uploaded `cover` part would. Every cover failure is reported on `coverUrl`, and nothing is saved.

## Boundaries & Constraints

**Always:**
- AD-21's order: take `coverUrl` out of the arguments; the missing-key check (`edit_book`) and `parse_*_intent` run on the rest, with `has_cover=True` when `coverUrl` was sent; `edit_book` refuses `book_not_found` when the Book is gone; then the download, outside the AD-4 lock; then `prepare_cover` and the handler with that `UploadedCover`.
- Download rules: `https` on every hop. Redirects (301, 302, 303, 307, 308) are followed by hand, at most 3. Every address the host resolves to, on every hop, must be global: IPv4-mapped, 6to4, NAT64 (`64:ff9b::/96`) and Teredo are unwrapped first, and multicast and IPv4-compatible `::/96` are refused. Literal-IP hosts are checked too. The connection goes to a checked address through the `connect` seam, with TLS verified against the URL's hostname (SNI). No proxy is used. `Accept-Encoding: identity`. One 30-second deadline covers the whole download. The body is capped at `COVER_LIMIT` while streaming. The bytes are sniffed for JPEG, PNG or WebP, and `Content-Type` is ignored.
- A body over `COVER_LIMIT` (or a `Content-Length` over it) is `cover_too_large` on `coverUrl`. Any other download failure is `invalid_fields` on `coverUrl`, with a message that says why. A handler refusal on `cover` is renamed to `coverUrl`, keeping its message and form position, and the summary is recomputed.
- `CoverFetcher(resolve=, connect=, ssl_context=, deadline=30)`: each keyword has a default (`socket.getaddrinfo` looked up at call time, `socket.create_connection`, `httpx2.create_ssl_context(trust_env=False)`), and `.deadline` is readable. `create_app(..., cover_fetcher=None)` stores it, or a default `CoverFetcher()`, on `app.state.cover_fetcher`.
- `intents/` imports neither `http` nor `agent` (`test_layers.py`).

**Never:** no host allow-list; no change to the HTTP routes or `LABELS`; no new tool; no edits to `epics.md` (the description text is used verbatim); no real network access from any test; no tree-wide git state change (AGENTS.md "Story pipeline", Epic 8 retro item 64).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Stored | JPEG as `binary/octet-stream`, PNG as text, WebP with no type, IPv6 host, 3 redirects, exactly 20 MiB, DNS rebinding after the first lookup | Same Book, cover file and spine color as the route given the same bytes | — |
| removeCover + coverUrl | `edit_book` | The route's `intent` refusal, before any lookup | nothing resolved or fetched |
| Missing Book | `edit_book` with a gone `bookId` | `book_not_found` | nothing resolved or fetched |
| Bad address | not https, a non-global record anywhere (direct, literal or after a redirect), a 4th redirect, a bad cert, an unknown host, not an image, GIF, empty, 404, past the deadline | `invalid_fields` on `coverUrl` | library and covers unchanged, no temp file |
| Too big | streamed body past 20 MiB | `cover_too_large` on `coverUrl` | reading stops at the cap |
| Undecodable | JPEG magic, broken body | the route's `cover` message, on `coverUrl` | nothing saved |
| Not a string | `coverUrl: 5` or `null` | `invalid_fields` on `intent` (the malformed-intent refusal) | before any download |

</intent-contract>

## Code Map

- `backend/bookvie/agent/tools.py:90-160,323-348,507-548` -- `AgentTool`, `advertised_schema`, `_write_tool`, `ADD_BOOK`, `EDIT_BOOK`. The book tools get a `coverUrl` extra property and the cover flow.
- `backend/bookvie/http/app.py:193-243` -- `create_app`. Add `cover_fetcher` and set `app.state.cover_fetcher`.
- `backend/bookvie/intents/cover.py:147` -- `prepare_cover` and `RefusedCover`. Reused as is.
- `backend/bookvie/intents/edit_book.py:91-101,188-209` -- `parse_edit_book_intent(raw, has_cover)` and the handler's `cover` parameter.
- `backend/bookvie/intents/add_book.py:42-61` -- `parse_add_book_intent` and `add_book(store, clock, intent, cover)`.
- `backend/bookvie/intents/contract.py:128-196` -- `invalid_fields`, `fields_summary`, `cover_too_large` (the `cover` field), `COVER_LIMIT`, `IntentError`, `ErrorBody`.
- `backend/bookvie/intents/intent_model.py:60` -- `malformed()`, used for a non-string `coverUrl`.
- `backend/bookvie/domain/labels.py:14` -- `LABELS` (read only; the summary label `"Cover URL"` is local to the agent tools).
- `backend/tests/test_agent_cover_url.py` -- the ATDD leaves (5, with 91 AC-4 cases) and the contract they pin. `tests/cover_server.py` -- the local TLS server, `Net` seams and `ProxyTrap`.
- `backend/tests/test_agent_book_write.py:193-194,208,234-244,262-275,377-381` -- 12.4 leaves that assert there's no `coverUrl`.
- `backend/tests/conftest.py:89-134` -- `connect_mcp(cover_fetcher=...)`, already passed through. The AC-5 guard goes here.
- `backend/tests/test_layers.py` -- the import-layer rules `cover_fetch` must keep.
- Previous story (12.4): `_write_tool(required=BOOK_FORM_KEYS)` refuses missing keys before parsing. `BOOK_FORM_KEYS` already notes that `coverUrl` is tool-only.
- Deferred-work intake: none name story 12.5.

## Tasks & Acceptance

**Execution:**
- `backend/bookvie/intents/cover_fetch.py` -- new: `CoverFetcher` with `fetch(url) -> bytes`, plus `COVER_URL_FIELD = "coverUrl"` and the refusals (`invalid_fields` / `cover_too_large` on `coverUrl`), using `http.client` over the seam socket wrapped with `ssl_context.wrap_socket(server_hostname=host)` -- AD-21's download rules.
- `backend/bookvie/agent/tools.py` -- `AgentTool.extra_properties` merged by `advertised_schema`; a book-tool runner that pops and type-checks `coverUrl`, does the missing-key check, parses with `has_cover`, checks the Book for an edit, fetches with `state.cover_fetcher`, runs `prepare_cover`, calls the handler, and renames `cover`→`coverUrl` in any `IntentError`; both descriptions get the sentence -- AC-1 to AC-4.
- `backend/bookvie/http/app.py` -- `cover_fetcher` parameter and the default -- the tools reach it.
- `backend/tests/conftest.py` -- an autouse guard: `socket.getaddrinfo` refuses non-numeric, non-localhost names, and `socket.socket.connect`/`connect_ex` refuse non-loopback IP addresses, each with "off the machine" in the message -- AC-5.
- `backend/tests/test_agent_cover_url.py` -- remove the skips -- red to green.
- `backend/tests/test_agent_book_write.py` -- update the 12.4 schema and description assertions and the `unknown-key-cover-url` cases (drop them), and the partial-edit comment -- AC-1.
- `backend/tests/test_cover_fetch.py` -- new unit leaves on the fetcher alone for the matrix's edges the ATDD file doesn't run: a non-string `coverUrl`, a `Content-Length` past the cap, a port other than 443, a relative `Location`, a multicast address, the defaults under the guard.

**Acceptance Criteria:**
- Given the five ATDD leaves without their skips, when the backend suite runs, then all of them pass (95 tests) and every other leaf passes.
- Given `npm run check`, when it runs, then it passes.
- Given any test, when it runs, then no connection or lookup leaves the machine (the AC-5 guard is autouse).

### Review Findings

Code review, 2026-11-20 (`bmad-code-review`, new session; diff `fcec07c..HEAD`; layers: Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor, Spine Check). 32 findings: 2 patch entries (3 findings), 2 defer, 5 spine drift already deferred by the build, 22 rejected.

- [x] [Review][Patch] `is_public` trusts `ipaddress.is_global` for two ranges it gets wrong: IPv4-translated `::ffff:0:0:0/96` (`::ffff:0:7f00:1` carries 127.0.0.1) and deprecated site-local `fec0::/10` are both reported global, so a host resolving to either passes the SSRF check. Probed on Python 3.14.7: `is_public` returns True for `::ffff:0:7f00:1`, `::ffff:0:a00:1`, `fec0::1`. Unwrap the IPv4-translated form like NAT64 and refuse site-local (Edge Case Hunter, low). Fixed: `_IPV4_TRANSLATED` unwrapped in `_embedded`, `is_site_local` refused in `is_public`; five `is_public` cases added [backend/bookvie/intents/cover_fetch.py:134]
- [x] [Review][Patch] The "says why" messages of most `coverUrl` download refusals are never asserted: `TLS_MESSAGE`, `TOO_MANY_REDIRECTS_MESSAGE`, `REDIRECT_WITHOUT_LOCATION_MESSAGE`, `status_message`, `ENCODING_MESSAGE`, `EMPTY_MESSAGE`, `NOT_IMAGE_MESSAGE` and the deadline message during the body read. Dropping `_open`'s `SSLCertVerificationError` clause turns a bad certificate into "Couldn't connect" with every test passing. Add a leaf pinning each message (Verification Gap, medium). Fixed: `test_each_download_refusal_says_why` (7 cases), plus leaves for an untrusted CA and a deadline during the body read; mutation-checked (dropping the certificate clause, the `clock.expired` check or the address fix fails them) [backend/tests/test_cover_fetch.py:196]
- [x] [Review][Defer] `cryptography` is called "Deferred, not added" in Design Notes, with no `deferred-work.md` entry [backend/tests/cover_server.py] — deferred: a transitive (through `mcp`) test-only dependency; adding it needs a lock change.
- [x] [Review][Defer] The first real download (real DNS, connect, OS trust store, percent-encoding of real cover URLs) is left to Story 12.8, with no entry 12.8 will pick up [backend/bookvie/intents/cover_fetch.py] — deferred: AC-5 forbids a real download in tests; 12.8's session against `--dev` is the first one.

**Rejected:**
- Blind Hunter: the Auto Run Result's counts don't match the triage log — the fix edits the spec under review.
- Blind Hunter: the Code Map's line ranges are stale — the fix edits the spec under review.
- Blind Hunter: `coverUrl`'s schema has no https `pattern` or `description` — low; AC-1 fixes the advertised schema, and the description carries the https rule.
- Blind Hunter: `Accept: image/*` may make a CDN negotiate AVIF — maybe-false (would be low): needs a real CDN that answers a wildcard `Accept` with AVIF; 12.8's real downloads will show it.
- Blind Hunter: `create_app`'s `cover_fetcher` should be a `Protocol` — low; no Python type checker runs on tests, no named harm.
- Blind Hunter: `_open`'s next-address fallback and the stop on a certificate failure are untested — low; needs new seams in `Net`.
- Blind Hunter: a non-certificate TLS handshake failure reads "Couldn't connect" — low; rare, and the fix adds a branch.
- Blind Hunter + Edge Case Hunter: timed-out lookup threads aren't bounded — low; one user, local app, each thread ends when the OS resolver gives up; the fix adds a semaphore.
- Blind Hunter + Edge Case Hunter + Acceptance Auditor: the AC-5 guard doesn't cover UDP `sendto`/`sendmsg`, `getnameinfo` or the `_socket` C module — low; no code or test uses them, and the fix adds guards.
- Edge Case Hunter: `gethostbyaddr` with a numeric public IP makes a PTR query — low; no test calls it, and the module docstring says numeric addresses pass.
- Edge Case Hunter: the commit says the guard keeps "every" lookup on the machine — low; the conftest docstring lists exactly what is guarded.
- Blind Hunter: the DNS-deadline leaf still asserts `< 1.0` s of wall clock — low; a 5× margin over the 0.2 s deadline, and the event already proves the lookup was cut.
- Blind Hunter + Edge Case Hunter: the regenerated `epic-12-context.md` dropped "every other download failure is `invalid_fields`" — low; the spec and AD-21 keep the contract, and the context file is regenerated per story.
- Blind Hunter: the spec's and `deferred-work.md`'s evidence for the second drift entry differ by `fetch` — low; cosmetic, same item.
- Edge Case Hunter: a redirect `Location` with raw UTF-8 bytes is decoded as latin-1 and percent-encoded twice — low; servers send ASCII `Location`s for covers, and the fix adds a decode fallback.
- Edge Case Hunter: a blackholed first address takes the whole 30 s connect deadline — low; macOS orders and filters addresses by reachability, and the fix adds a per-address timeout.
- Acceptance Auditor: an `ImportError` building the default TLS context escapes as `couldnt_save` — false in practice: `httpx2` is a pinned runtime dependency, loaded by the server's start.
- Acceptance Auditor: `Accept`, `User-Agent`, a stripped URL and dropped userinfo aren't in the spec — low; none contradicts an AC, and the Spine Check finds them below AD level.
- Spine Check (5): every drift item (Stack table `httpx2`, extra download rules, Seed `intents/` line, the step order's non-string refusal, the `cover_fetcher` seam and the guard) is already in `deferred-work.md` as "spine drift" from the build's review — no new entry.

**Full check after the patches** (2026-11-20, this review session, after the last patch): `npm run check` exit 0 — pytest 2091 passed, unit 388 passed, e2e 799 passed, smoke ok.

## Spec Change Log

## Review Triage Log

### 2026-11-20 — Review pass
- verdicts: 33 findings — high 0, medium 5, low 22, false 6, maybe-false 0
- findings:
  - `[medium]` `[patch]` (verification-gap) No tool test runs a coverUrl on an app built without cover_fetcher, the default every real server gets — added test_a_server_built_without_a_cover_fetcher_downloads_with_the_default_one (getaddrinfo pinned to 10.0.0.1, refused on coverUrl with the not-public message).
  - `[low]` `[patch]` (verification-gap) OffTheMachineError is a RuntimeError, so the guard stopping the default seams escapes as couldnt_save — it now subclasses OSError; the defaults test expects the coverUrl refusals.
  - `[medium]` `[patch]` (intent-alignment) The production download path is never run through a tool — grouped with the default-fetcher test above.
  - `[false]` `[reject]` (intent-alignment) Proxy env on the default connect path isn't exercised — the default connect is socket.create_connection, which never reads proxy variables; there is nothing to route through a proxy.
  - `[low]` `[patch]` (intent-alignment) AC-5's "whole suite" vs an in-process guard — the conftest docstrings now say what is guarded and that subprocess servers (loopback only) are outside it.
  - `[low]` `[reject]` (intent-alignment) A call with another bad field still downloads before it's refused — AD-21's order puts the download before the handler; the spec's Design Notes choose it; nothing is saved.
  - `[false]` `[reject]` (intent-alignment) Behavior beyond the AC text (empty coverUrl, non-string, multicast, encoding, Content-Length, ports) — each follows AD-21 or the spec's Always list; none contradicts an AC.
  - `[false]` `[reject]` (intent-alignment) epic-12-context.md rewritten — step-01 regenerates it from the planning docs whenever epics.md is newer; that is the workflow, not this story's code.
  - `[low]` `[defer]` (spine-check) Spine drift: httpx2 listed as the downloader — deferred (spine drift, AD-21 Stack).
  - `[low]` `[defer]` (spine-check) Spine drift: download rules beyond AD-21 — deferred (spine drift, AD-21).
  - `[low]` `[defer]` (spine-check) Spine drift: cover_fetch still "planned" in the Seed — deferred (spine drift, AD-21 Seed).
  - `[low]` `[defer]` (spine-check) Spine drift: cover_fetcher seam, non-string refusal and test guard unnamed — deferred (spine drift, AD-21).
  - `[medium]` `[patch]` (spine-check) A slow DNS lookup can't be interrupted, so a download can pass AD-21's 30-second deadline — _resolved runs resolve in a daemon thread joined with the remaining time; new test test_a_lookup_past_the_deadline_is_refused_when_the_deadline_passes.
  - `[low]` `[patch]` (edge-case) A body shorter than its Content-Length reaches the cover path and reads as "not an image" — _read_capped refuses it with the download message; new test with Reply.declared.
  - `[medium]` `[patch]` (edge-case) DNS past the deadline — grouped with the spine-check deadline fix.
  - `[low]` `[patch]` (edge-case) Spaces or non-ASCII in the path or query fail late as "download failed" — _parse percent-encodes path and query; new test.
  - `[low]` `[reject]` (edge-case) A download failure isn't merged with form-field failures — the spec's chosen order (Design Notes); merging would run the handler's validation before the download.
  - `[low]` `[patch]` (edge-case) The guard misses gethostbyname, gethostbyname_ex, gethostbyaddr — now patched with the same lookup guard.
  - `[low]` `[reject]` (edge-case) Session- or module-scoped fixtures run before the function-scoped guard — none of them looks up or connects off the machine (cover_tls only writes files); unlikely, and moving the guard adds scope plumbing.
  - `[low]` `[patch]` (edge-case) The guard claims more than it enforces — grouped with the docstring narrowing above.
  - `[low]` `[patch]` (blind) The HTTPResponse is never closed, so its makefile keeps the socket open — _get closes every response before the socket.
  - `[medium]` `[patch]` (blind) The 30-second deadline doesn't cover DNS — grouped with the deadline fix.
  - `[low]` `[patch]` (blind) Non-ASCII or spaces in the path fail late — grouped with the percent-encoding fix.
  - `[low]` `[patch]` (blind) Some failures inside fetch escape as couldnt_save — the reachable one is the guard's error, now an OSError; an SSL-context build failure is not shown reachable.
  - `[low]` `[patch]` (blind) `failure` in _open is dead — removed.
  - `[low]` `[patch]` (blind) The non-string coverUrl refusal isn't in the documented order — added to the module and _book_tool docstrings.
  - `[low]` `[patch]` (blind) The IPv6 test's name promises a bracketed-literal check — renamed test_an_ipv6_only_host_is_dialed_on_its_checked_address_without_brackets.
  - `[low]` `[reject]` (blind) The defaults test catches any Exception — it matches the guard's specific message, and now the coverUrl refusal messages; the fix adds an import across conftest for no caught case.
  - `[low]` `[patch]` (blind) The AC-5 guard's docstring overclaims — grouped with the docstring narrowing.
  - `[false]` `[reject]` (blind) The edit pre-check reads the library outside the lock and assumes a store — edit_book's own pre-check (edit_book.py:199) reads the same way and re-checks under the lock; every real app has a store.
  - `[low]` `[reject]` (blind) COVER_URL_PROPERTY copies pydantic's title by hand — cosmetic; the property's shape is pinned only as an optional string, and the description carries the https rule.
  - `[false]` `[reject]` (blind) epic-12-context.md rewrite drops content — the workflow regenerates that file from the planning docs.
  - `[false]` `[reject]` (blind) README says bookvie runs with no network — it still needs no network to run; and stories don't edit README.md (persistent fact, 2026-11-14).

## Design Notes

- **No merged field order for download failures.** A download refusal is raised alone, before the handler's field checks run (AD-21's order puts the download before the handler). A `prepare_cover` refusal goes through the handler, so it is merged in form order with the other field failures, as on the route.
- **An empty `coverUrl` is refused**, not treated as absent: AD-21 doesn't adopt H4's "empty counts as absent", and `""` isn't an https URL.
- **TLS trust**: `httpx2.create_ssl_context(trust_env=False)` is the pinned runtime dependency's verifying context (the OS trust store through truststore), so `SSL_CERT_FILE` and the like are ignored as proxies are.
- **`cryptography`** stays transitive (through `mcp`), and only `tests/cover_server.py` uses it. Deferred, not added: adding it would need a lock change, and the pin test covers declared dependencies only.

## Verification

**Commands:**
- `cd backend && uv run pytest -q tests/test_agent_cover_url.py tests/test_agent_book_write.py tests/test_cover_fetch.py` -- expected: all pass.
- `npm run check` (repo root) -- expected: exit 0.

## Auto Run Result

Status: in-review

**Summary.** `add_book` and `edit_book` take an optional `coverUrl` string. bookvie downloads it with the new `CoverFetcher` (AD-21's rules) in AD-21's order, then the bytes take the route's cover path. Every cover failure is reported on `coverUrl`, and nothing is saved. An autouse pytest guard keeps lookups and connections on the machine.

**Files changed:**
- `backend/bookvie/intents/cover_fetch.py` (new): the hardened downloader and the `coverUrl` refusals.
- `backend/bookvie/agent/tools.py`: `_book_tool` (the cover flow); `extra_properties` in the advertised schema; the sentence added to both descriptions.
- `backend/bookvie/http/app.py`: `create_app(cover_fetcher=)` and `app.state.cover_fetcher`.
- `backend/tests/conftest.py`: the AC-5 guard (`_on_the_machine`).
- `backend/tests/test_agent_cover_url.py`: skips removed (95 leaves).
- `backend/tests/test_agent_book_write.py`: 12.4's schema and description leaves updated, `unknown-key-cover-url` cases dropped.
- `backend/tests/cover_server.py`: `Reply.encoding` and `Reply.declared`.
- `backend/tests/test_cover_fetch.py` (new): edge and default-path leaves.
- `_bmad-output/implementation-artifacts/epic-12-context.md`: regenerated by step-01.

**Review.**
- **Findings:** 33. Medium 5, low 22, false 6.
- **Patched:** 9 fixes covering 21 rows. By grouped entry, 2 medium (the DNS deadline, the default fetcher untested) and 7 low.
- **Deferred:** 4 spine-drift items (also in `deferred-work.md`).
- **Rejected:** 6 false and 7 low not worth fixing; the reasons are in the triage log.

**Follow-up review recommended: true.** Two medium entries were patched. The unverified risk: the DNS worker thread and the percent-encoding of real-world cover URLs are checked only against local seams. The first real download happens in Story 12.8's session against `--dev`.

**Verification.**
- **Story test files:** `uv run pytest` on the spec's files plus `test_layers.py` gave 249 passed (before the patches).
- **`npm run check` before the patches:** exit 0, with 2073 pytest passed and 799 e2e passed.
- **`npm run check` after the patches:** exit 0, with 2077 pytest passed, 0 skipped, and 799 e2e passed.

**Residual risks:**
- No test runs a successful download through the real DNS, connect and OS trust store; AC-5 forbids one.
- `cryptography` remains a transitive test-only dependency.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
