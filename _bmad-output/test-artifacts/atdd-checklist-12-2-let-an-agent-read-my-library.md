---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-19'
storyId: '12.2'
storyKey: '12-2-let-an-agent-read-my-library'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-122-let-an-agent-read-my-library'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-12-2-let-an-agent-read-my-library.md'
generatedTestFiles:
  - 'backend/tests/test_agent_read.py'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 12 intro and gate, Story 12.2; AR36, AR38, AR40)'
  - '_bmad-output/implementation-artifacts/epic-12-context.md'
  - '_bmad-output/planning-artifacts/mcp-server-plan-2026-11-19.md (D12-D14, §3 tools, §5 story cut, §6 tests)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-21 Tools, Same handler, Find never guess; AD-6 stats view and card-notes; layer rule; Deferred: find_book ranking)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (12-2 backlog, 12-1 done)'
  - '_bmad-output/implementation-artifacts/deferred-work.md (the three AD-21 spine drift entries from 12.1)'
  - '_bmad-output/test-artifacts/atdd-checklist-12-1-mount-the-mcp-server.md (format, fixtures)'
  - '_bmad/tea/config.yaml'
  - 'backend/bookvie/agent/__init__.py, agent/tools.py, agent/server.py; views/__init__.py, views/models.py, views/shelf.py, views/card_notes.py, views/stats.py; http/api.py (book_view, card_notes_view, stats_view, _iso_date, _validation_error); intents/contract.py; domain/duplicates.py (normalize_isbn)'
  - 'backend/tests/conftest.py (connect_mcp, mcp_client), agent_client.py, builder.py, helpers.py, test_agent_mount.py, test_layers.py, test_stats.py'
  - 'mcp_types 2.3.0 (CallToolResult.structured_content), MCP 2025-11-25 schema (structuredContent is an object)'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given a seeded library with "Designing Data-Intensive Applications" in two editions, and other Books, when the agent calls find_book with query "DDIA", "Designing", "Kleppmann", or an ISBN with or without hyphens, then it returns every matching Book as {id, title, subtitle, authors, edition, type, role}, both editions included, each with its own edition and type; and a query that matches nothing returns an empty list, not an error, and an empty query is refused as invalid_fields on query. Description: "Find Books in the library by a free-text query: part of a title or subtitle, an author, an ISBN, or a title''s initials such as DDIA. Returns every likely match with its id, edition and type, or an empty list. Never pick a Book for the user: when more than one matches, ask which one, unless only one of them fits the request (update_page and pause work only on the Main book, whose role is main). Every other tool takes the Book''s id from here."' }
  - { id: AC-2, idSource: generated, text: 'Given a Book id, when the agent calls get_book with bookId, then it returns the book view (the same model as GET /api/views/book, by alias); and an unknown id is refused with book_not_found, as the route refuses it. Description: "One Book in full: its fields, tags, its role (main for the Main book, upNext, waiting for a paused Book, or null), whether it is a Side read, its Readings, pages left, the user''s measured pace, and its Card notes. Takes the Book''s id from find_book."' }
  - { id: AC-3, idSource: generated, text: 'Given the library, when the agent calls list_catalog, then it returns the catalog view by alias. Description: "Every Book in the catalog with its title, authors, type, tags, role, current page and percent read. Use it to answer questions across the library, such as which unread Books are about a topic."' }
  - { id: AC-4, idSource: generated, text: 'Given Card notes on several Books, when the agent calls get_card_notes with no arguments, or with bookId, then it returns the card-notes view for all Books, or for that Book, by alias; and an unknown bookId is refused with book_not_found. Description: "The user''s Card notes (quotes and notes with their pages), for every Book or for one Book''s id."' }
  - { id: AC-5, idSource: generated, text: 'Given the library, when the agent calls get_home, then it returns the home view by alias. Description: "What the user is reading now: the Main book with its page and days left, Up next, the paused Books waiting, the Side reads, and when the library was last exported."' }
  - { id: AC-6, idSource: generated, text: 'Given finished Readings, when the agent calls get_stats with no range, or with from and to as YYYY-MM-DD, then it returns the stats view by alias, as GET /api/views/stats does for the same range; and a half range, a value that isn''t a date, or a to before from is refused with invalid_fields on from or to with the route''s copy; and that parsing now lives in views/, and the route and the tool both use it. Description: "Books and pages finished, overall or for a period given as from and to dates (YYYY-MM-DD, both or neither)."' }
  - { id: AC-7, idSource: generated, text: 'Given agent/, when the import graph is checked, then agent/ imports nothing from http/api; the views'' not-found refusal and the stats range parsing live in views/.' }
---

# ATDD Checklist: Story 12.2 Let an agent read my library

## Preflight

- **Stack:** `fullstack`, auto-detected. pytest (`backend/tests/conftest.py`) and Playwright (`frontend/playwright.config.ts`) are in place. The story has no UI, so every leaf is pytest.
- **Story:** `epics.md` Story 12.2 has 7 Given/When/Then criteria with no ids, so they are numbered AC-1 to AC-7 in source order (registry above). Each "And" line and "Description:" line belongs to the criterion above it. `sprint-status.yaml` reads `backlog` for 12.2 and `done` for 12.1.
- **Epic gate:** 12.2 isn't Epic 12's first story, so the spine-drift gate doesn't apply. The three AD-21 drift entries 12.1 deferred stay for the Epic 12 retro.
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns fragments). No Pact. `tea_browser_automation: auto` loads `playwright-cli.md`.
- **What exists today:**
  - `bookvie.agent.TOOLS` is `(GET_APP_INFO,)`. `AgentTool`, `input_schema`, `parse_arguments` and `NoArguments` are the 12.1 helper. `server._success` keeps `None` for a view and drops it for an `OkResponse`, as the routes do.
  - `views/` has `book_detail`, `catalog`, `card_notes` (`None` for an unknown Book), `home_for` and `stats(library, start, end)`. There's no `find_book` module.
  - `http/api.py` holds both refusals the AC moves: `book_view` and `card_notes_view` each `raise book_not_found(404)` on `None`, and `stats_view` parses `from`/`to` through FastAPI (`_IsoDate` with `_iso_date`'s "Use YYYY-MM-DD.") and raises "Give both from and to." / "To is before From." itself.
  - `views/` may import only `domain` and `store` (`test_layers.py` `ALLOWED`), but `IntentError`, `book_not_found` and `invalid_fields` live in `intents/contract.py` (which imports only `domain`). See "Open for the build".
  - Importing `bookvie.agent` loads no `bookvie.http` module today.
- **The stats route's refusals today** (read from the route on 2026-11-19, the copy AC-6 calls "the route's copy"): a half range is `Give both from and to.` on the missing half; a `to` before `from` is `To is before From.` on `to`; a value that isn't `YYYY-MM-DD` (`someday`, a datetime, `86400`, an empty string) is `Value error, Use YYYY-MM-DD.`; an impossible date is Pydantic's own text, `Input should be a valid date or datetime, month value is outside expected range of 1-12` or `..., day value is outside expected range`. The top `message` is `Not saved. N field(s) need(s) attention: <fields>.`.
- **Decision (Oleg, 2026-11-19): `find_book`'s structured content is `{"books": [...]}`.** AD-21 says it returns a bare `[{id, title, subtitle, authors, edition, type, role}]`, but MCP 2025-11-25 defines `structuredContent` as a JSON object. The candidates inside are AD-21's shape. An empty result is `{"books": []}`. The build records this as spine drift on AD-21 in `deferred-work.md`.

## Generation Mode

**AI generation**, sequential, in this session. No recording: there's no UI. The leaves reuse 12.1's `McpClient` and `connect_mcp`, and compare each tool with its own route on the same app.

## Test Strategy

| AC | Level | Priority | Leaf (first assertion in bold) | Why this level |
|---|---|---|---|---|
| AC-1 | API (pytest, `connect_mcp`, seeded) | P0 | `test_find_book_returns_every_candidate_with_its_edition_and_type_and_never_guesses`. **`find_book` "Designing" returns exactly the two DDIA editions and "Designing Interfaces".** Then the full DDIA title gives both editions as exactly the seven keys with their own `edition`, `type` and `role` (`main` for the 1st, `null` for the 2nd); "Designing Interfaces" is `upNext`; "DDIA" and "Kleppmann" give both editions and not "Designing Interfaces"; `978-1-449-37332-0` finds the 1st edition (stored compact) and `9781098119065` the 2nd (stored hyphenated); "Neuromancer" is `{"books": []}`, not an error; `""` is `invalid_fields` on `query`; the description is the AC's text; the schema is `{query}` required and closed. No Book is listed twice. | P0 risk "find_book candidates" (plan §6). The seed holds a third "Designing" Book, so "every" and "DDIA" are told apart. |
| AC-2 | API (pytest) | P0 | `test_get_book_returns_the_book_view_and_refuses_an_unknown_id_as_the_route_does`. **`get_book`'s structured content equals `GET /api/views/book?id=` for the 1st edition.** Then it's the Main book with two Card notes; the 2nd edition matches its route too; an unknown id's error equals the route's 404 `error` (`book_not_found`); the description; the schema `{bookId}` required and closed. | Comparing with the route on the same app keeps the leaf from restating the view. |
| AC-3 | API (pytest) | P1 | `test_list_catalog_returns_the_catalog_view`. **Structured content equals `GET /api/views/catalog`.** Then it lists the four seeded Books; the description; no arguments (closed, empty). | |
| AC-4 | API (pytest) | P1 | `test_get_card_notes_returns_every_books_notes_or_one_books_and_refuses_an_unknown_id`. **No arguments equals `GET /api/views/card-notes`.** Then the groups are DDIA 1st and Dune; `bookId` for DDIA 1st equals `?book=` (scoped, one group); DDIA 2nd (no notes) equals its route (`groups: []`); an unknown `bookId` equals the route's 404 `error`; the description; the schema has `bookId`, not required, closed. | |
| AC-5 | API (pytest) | P1 | `test_get_home_returns_the_home_view`. **Structured content equals `GET /api/views/home`.** Then the Main book is DDIA 1st and Up next is "Designing Interfaces"; the description; no arguments. | |
| AC-6 | API (pytest) | P0 | `test_get_stats_returns_the_stats_view_and_refuses_a_bad_range_with_the_routes_copy`. **2026-01-01..2026-12-31 equals `GET /api/views/stats` for that range.** Then 1 Book and 412 pages; no range and an empty 2025 range equal their routes; each of 8 bad ranges is refused by the tool and by the route with exactly the AD-9 object above, copy included; the description; the schema `{from, to}`, neither required, closed. | Pinning today's copy as literals means the route still answers with it after its parsing moves into `views/`. |
| AC-7 | Static (pytest, source and a subprocess) | P1 | `test_agent_never_imports_http_api_and_the_view_refusals_live_in_views`. **`http/api.py` holds none of the stats copy ("Give both from and to.", "To is before From.", "Use YYYY-MM-DD.").** Then `views/` holds all three; `book_view`, `card_notes_view` and `stats_view` contain no `raise` (their refusals come from `views/`); importing `bookvie.agent` in a fresh interpreter loads no `bookvie.http` module. | `test_layers.py` already forbids `agent → http` by import; this adds where the refusals live. |

**Primary branch per criterion.** AC-1's newly promised scalar is the "Designing" candidate set; AC-2 to AC-6's is each tool's structured content equal to its route's view; AC-7's is the stats copy gone from `http/api.py`.

**What the leaves pin (the contract for the build):**
- `TOOLS` gains `find_book`, `get_book`, `list_catalog`, `get_card_notes`, `get_home`, `get_stats`, each with the AC's description character for character.
- Input schemas: `find_book` `{query: string}` required; `get_book` `{bookId}` required; `get_card_notes` `{bookId}` optional; `get_stats` `{from, to}` both optional; `list_catalog` and `get_home` no properties. All closed (`additionalProperties: false`).
- `find_book`'s structured content is `{"books": [...]}`, each candidate exactly `{id, title, subtitle, authors, edition, type, role}` with the stored values and the shelf role, no Book twice, `{"books": []}` for no match. An empty `query` is `invalid_fields` with one field, `query`.
- Matching: title substring ("Designing"), title-word initials with hyphenated words split ("Designing Data-Intensive Applications" is DDIA), an author substring ("Kleppmann"), and the normalized ISBN, so a hyphenated query finds a compact stored ISBN and a compact query a hyphenated one.
- Each view tool's result is its route's JSON exactly (by alias, `None` kept), with the same JSON as text. Each refusal is the route's own AD-9 `error` object.
- The stats refusals keep today's copy (the eight cases in `_STATS_REFUSALS`), on the route and the tool alike.
- `http/api.py`'s three view routes raise nothing themselves, and the stats copy lives under `views/`.

**Open for the build (not pinned):**
- **How `views/` refuses**, given that `views` may import only `domain` and `store` while `IntentError` lives in `intents/contract.py`. For example, move the contract (or the error type) to where `views` can import it, or add `intents` to `ALLOWED["views"]` in `test_layers.py`. Either changes a layer rule the spine states, so record it in the spec, and as spine drift if the spine is out of date.
- `find_book`'s ranking and order (the leaves compare sets), how case and accents are folded, and whether the ISBN-10 form of an ISBN-13 matches.
- The parser's names and signatures in `views/` (for example `views.find_book`, a stats range parser, a refusing `book_detail`), and how the route turns the parser's errors into its 422.
- `find_book`'s message for an empty query, and its answer for a missing `query` (the helper's `malformed()` is the natural one).
- Whether `get_stats` takes the dates through an argument model with `from`/`to` aliases and the same `_iso_date` check.

## Existing leaves this story changes (for the build)

- `backend/tests/test_agent_mount.py` asserts the tool list is exactly `["get_app_info"]` in four places: `:203` (real servers), `:236` (two apps), `:422` (AC-6 of 12.1) and `:621` (the 2026-07-28 envelope). Each becomes the cumulative list: `get_app_info`, `find_book`, `get_book`, `list_catalog`, `get_card_notes`, `get_home`, `get_stats` (plan §5: "each story's tool-list test asserts the exact cumulative list"). This run didn't change them, since they'd fail unskipped until the tools exist. The build may also rename `test_the_only_tool_is_get_app_info_and_it_returns_the_app_info_view`.
- `backend/tests/test_stats.py::test_p1_a_bad_query_is_422_invalid_fields_naming_the_field` must still pass unchanged once the route uses the parser in `views/`.
- `backend/tests/test_layers.py` changes only if the build decides `views` imports from `intents` (see "Open for the build").
- The OpenAPI contract (`npm --prefix frontend run api:gen`, `check:api`) must stay byte-identical: `from`, `to`, `id` and `book` stay the same query parameters with the same 404 and 422 responses.

## Green-phase follow-ups (secondary branches, not red leaves)

- [x] **Pytest, AC-1 case and subtitle:** "designing", "ddia" and "KLEPPMANN" find the same Books; a subtitle word ("Interaction Design") finds "Designing Interfaces"; a co-author ("Riccomini") finds only the 2nd edition. (done: backend/tests/test_agent_read.py:497 `test_find_book_folds_case_and_accents_and_matches_a_subtitle_and_a_co_author`)
- [x] **Pytest, AC-1 whitespace and malformed:** a whitespace-only `query` is refused like `""` (or say why not); a missing `query`, a non-string `query` and an extra key are refused as the helper refuses them, and change nothing. (done: backend/tests/test_agent_read.py:521 `test_find_book_finds_an_isbn_10_as_its_isbn_13_and_refuses_a_whitespace_query` (blank queries), backend/tests/test_agent_read.py:614 `test_the_read_tools_refuse_a_bad_argument_by_naming_it` (missing, non-string, extra), backend/tests/test_agent_read.py:737 `test_the_read_tools_write_nothing_when_they_answer_or_refuse` (changes nothing))
- [x] **Pytest, AC-1 ISBN-10:** the ISBN-10 `1449373321` finds the 1st edition (through `normalize_isbn`), or the build records that it doesn't. (done: backend/tests/test_agent_read.py:521 `test_find_book_finds_an_isbn_10_as_its_isbn_13_and_refuses_a_whitespace_query`; X check digit backend/tests/test_agent_read.py:545)
- [x] **Pytest, AC-1 waiting role:** a paused Book's candidate has `role: "waiting"`, and a Side read with no role has `null`. (done: backend/tests/test_agent_read.py:560 `test_find_book_gives_each_candidate_its_role_waiting_and_null_included`)
- [x] **Pytest, AC-1 order:** two calls with the same query return the same order (the ranking is deterministic). (done: backend/tests/test_agent_read.py:580 `test_find_book_orders_by_how_a_book_matches_then_by_title_edition_and_id`)
- [x] **Pytest, AC-2 to AC-5 read only:** each read tool leaves `library.json` byte-identical and writes no `local-state.json`. (done: backend/tests/test_agent_read.py:737 `test_the_read_tools_write_nothing_when_they_answer_or_refuse` (all six read tools, answers and refusals; mutation probe: `list_catalog` writing `local-state.json` fails it))
- [x] **Pytest, AC-2/AC-4 bad id type:** a non-string `bookId` and a missing `bookId` on `get_book` are refused, not coerced. (done: backend/tests/test_agent_read.py:614 `test_the_read_tools_refuse_a_bad_argument_by_naming_it`)
- [x] **Pytest, AC-5 last export:** after an export, `get_home`'s `lastExportAt` equals the route's (it reads `local-state.json` outside the lock, AD-4). (done: backend/tests/test_agent_read.py:767 `test_get_home_reports_the_last_export_as_its_route_does` (mutation probe: `home_for` passing `None` fails it))
- [x] **Pytest, AC-6 non-string dates:** `from: 20260101` (a number) and `from: null` are refused, not coerced. (done: backend/tests/test_agent_read.py:614 `test_the_read_tools_refuse_a_bad_argument_by_naming_it`)
- [x] **Pytest, AC-6 both bad:** `{"from": "", "to": ""}` and `{"from": "someday", "to": "never"}` give two fields, in the route's order and copy. (done: backend/tests/test_agent_read.py:614 `test_the_read_tools_refuse_a_bad_argument_by_naming_it`)
- [x] **Pytest, cumulative tool list:** the list equals the seven names exactly, and no destructive name appears (12.1's unknown-tool leaf still passes). (done: backend/tests/test_agent_mount.py:46 `AGENT_TOOL_NAMES`, asserted at :213, :246, :432, :631; destructive names refused at backend/tests/test_agent_mount.py:484 `test_an_unknown_tool_is_a_json_rpc_error_and_changes_nothing`)

## Helper probes

Helpers reused: `McpClient`, `error_of`, `text_of` (`tests/agent_client.py`); `connect_mcp`, `mcp_client` (`tests/conftest.py`); `LibraryBuilder` (`tests/builder.py`); `api_client` (`tests/helpers.py`, probes only). None was extended.

Helpers added, in `backend/tests/test_agent_read.py`:
- `_seed`: the two-edition library this story's ACs describe. No existing seed has DDIA's editions.
- `_open`: `_seed` plus `connect_mcp(data_dir=...)`.
- `_structured`: a success's structured content, after checking its text is the same JSON. `test_agent_mount.py` checks this inline per leaf.
- `_books` and `_candidate_ids`: `find_book`'s `{"books": [...]}`, and its id set with no Book listed twice.
- `_view` and `_view_error`: a view route's 200 body, or its AD-9 `error`, on the client's own app. 12.1's one route comparison is inline (`app-info`).
- `_schema` and `_assert_no_arguments`: a listed tool's input schema, and the closed empty one.
- `_invalid_fields`: the AD-9 `invalid_fields` object for given fields, with the top message the contract builds.
- `_source` and `_raises_in`: a source file, and the `raise` count of named top-level functions.

Shipped numbers: none quoted. The ACs quote no size or count for shipped UI. 412 pages and 1 Book are the seed's own values.

Probes ran from a temporary `backend/tests/test_agent_read_probe.py` (`uv run pytest -q -p no:cacheprovider tests/test_agent_read_probe.py --no-cov`, 5 passed), which was then removed with `rm`. They ran again after ruff reformatted `test_agent_read.py`, with the same results. The routes the probes read were today's, through `api_client` on the seeded folder.
- **`_seed`:** it writes (the builder runs `check_invariants`). The routes then show DDIA 1st as `main` with 2 Card notes, "Designing Interfaces" as `upNext`, DDIA 2nd as `null`; the catalog lists all 4; Home's `mainBook.id` and `upNext.id` are those two; card-notes groups are DDIA 1st then Dune; DDIA 2nd's scoped groups are `[]`; 2026 stats are 1 Book, 412 pages; 2025 is 0.
- **`_view` / `_view_error`:** each returned the known body and the `book_not_found` error. They refused what they should: `_view` on an unknown id (404) and `_view_error` on the catalog (200) both raised.
- **`_invalid_fields` with `_STATS_REFUSALS`:** each of the 8 cases equals the route's error today, copy included. A wrong field (`from` for `to`) was refused. The two-field form gives "Not saved. 2 fields need attention: from, to." and equals the route's answer to `from=""&to=""`.
- **`_structured`:** it returned the structured content when the text matched. It raised on a text that differs and on `isError`.
- **`_books`:** it returned `{"books": [...]}`'s list and `[]`. It raised on a bare list, an extra key, and `books` that isn't a list.
- **`_candidate_ids`:** it returned `{"a", "b"}`, and raised on a Book listed twice.
- **`_assert_no_arguments`:** it passed on 12.1's real `get_app_info` schema, and raised on a schema with a property and on one that isn't closed.
- **`_raises_in`:** on today's `http/api.py` it returned `book_view` 1, `card_notes_view` 1, `stats_view` 3. On a function with no `raise` it returned 0, and it raised when a named function is missing.
- **Not probed:** `_open`, `_schema` and `_source` are plain composition and reads. No border or outline width is read (no UI), so Epic 10 retro item 71 (E10-R1) doesn't apply.

**Render-before-read:** no leaf reads a page. Every read is an MCP or HTTP response from an app whose lifespan is running (`connect_mcp`), a source file, or a subprocess's output. No leaf needed a fix.

## TDD Red Phase

7 skipped leaves in `backend/tests/test_agent_read.py`, each `@pytest.mark.skip(reason=RED)` with its `[P*] AC-n` in its first comment line:

| AC | Leaf | Priority |
|---|---|---|
| AC-1 | `backend/tests/test_agent_read.py:193` `test_find_book_returns_every_candidate_with_its_edition_and_type_and_never_guesses` | P0 |
| AC-2 | `backend/tests/test_agent_read.py:254` `test_get_book_returns_the_book_view_and_refuses_an_unknown_id_as_the_route_does` | P0 |
| AC-3 | `backend/tests/test_agent_read.py:284` `test_list_catalog_returns_the_catalog_view` | P1 |
| AC-4 | `backend/tests/test_agent_read.py:302` `test_get_card_notes_returns_every_books_notes_or_one_books_and_refuses_an_unknown_id` | P1 |
| AC-5 | `backend/tests/test_agent_read.py:336` `test_get_home_returns_the_home_view` | P1 |
| AC-6 | `backend/tests/test_agent_read.py:411` `test_get_stats_returns_the_stats_view_and_refuses_a_bad_range_with_the_routes_copy` | P0 |
| AC-7 | `backend/tests/test_agent_read.py:462` `test_agent_never_imports_http_api_and_the_view_refusals_live_in_views` | P1 |

**Red today.** This run came after the probes above last passed, on the file as it is now (after ruff). The leaves ran from a throwaway `tests/test_agent_read_red.py` with the skip lines deleted (`uv run pytest -q -p no:cacheprovider tests/test_agent_read_red.py --no-cov`), which was then removed with `rm`. Result: 7 failed:
- **AC-1 to AC-6:** each fails at its first tool call, `tools/call: {'code': -32602, 'message': 'Unknown tool: <name>'}`, the JSON-RPC error `McpClient.result` asserts against. Once the tool exists, the first assertion is the one in bold above.
- **AC-7:** `assert ['Give both f... YYYY-MM-DD.'] == []`: all three stats messages are still in `http/api.py`.

With the skips in place, `uv run pytest -q -p no:cacheprovider` (the full backend suite) gave 1693 passed, 7 skipped. Ruff format and check are clean on the file, and `git status` lists only `backend/tests/test_agent_read.py`: no `*_probe.py` file and no throwaway copy.

**Storage keys:** no new localStorage key. The story has no frontend change.

**No real library:** every leaf runs under `conftest.py`'s temporary `HOME`, on a folder under `tmp_path`. No leaf writes anything: the read tools are read-only.

## Implementation checklist (for `bmad-build-auto`)

- [x] `views/find_book`: match title, subtitle, authors, the normalized ISBN and title-word initials; return the candidates with their shelf role. Add the `find_book` tool, `{"books": [...]}`, with `query` required and an empty one refused on `query`. Record the `{"books": ...}` wrapper as AD-21 spine drift in `deferred-work.md` (AC-1). (done: backend/bookvie/views/find_book.py; AC-1 leaf backend/tests/test_agent_read.py:190; drift entry in deferred-work.md (AD-21 `{"books": [...]}`))
- [x] Move the not-found refusal into `views/` for the book and card-notes views, and settle the layer question above. Add `get_book` and `get_card_notes` (AC-2, AC-4, AC-7). (done: `views.require_book_detail`, `views.require_card_notes`; backend/tests/test_agent_read.py:250, :296, :458; `views → intents.contract` recorded in backend/tests/test_layers.py:4-8)
- [x] Add `list_catalog` and `get_home` (no arguments) (AC-3, AC-5). (done: backend/tests/test_agent_read.py:279, :329)
- [x] Move the stats range parsing (both-or-neither, `YYYY-MM-DD` only, `to` not before `from`) into `views/`, keeping today's copy. Have `stats_view` and `get_stats` both use it, with the OpenAPI schema unchanged (AC-6, AC-7). (done: `views.check_stats_range`; backend/tests/test_agent_read.py:408, :458; `npm run check:py` green (test_stats.py unedited))
- [x] Each tool's description is the AC's text exactly. (done: backend/tests/test_agent_read.py:241, :270, :289, :320, :340, :431)
- [x] Update the four `["get_app_info"]` assertions in `test_agent_mount.py` to the cumulative list. (done: backend/tests/test_agent_mount.py:213, :246, :432, :631 assert `AGENT_TOOL_NAMES`)
- [x] Un-skip the 7 leaves and see them pass, then run `npm run check` with no other existing leaf's assertions edited. (done: no `mark.skip` left in backend/tests/test_agent_read.py; `npm run check:py` this run: 1713 passed)

## Next

`bmad-build-auto` for Story 12.2, then `bmad-code-review` in a new session, then `bmad-testarch-automate` for the follow-ups above.
