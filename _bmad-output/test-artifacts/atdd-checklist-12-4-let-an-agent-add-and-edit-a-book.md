---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-19'
storyId: '12.4'
storyKey: '12-4-let-an-agent-add-and-edit-a-book'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-124-let-an-agent-add-and-edit-a-book'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-12-4-let-an-agent-add-and-edit-a-book.md'
generatedTestFiles:
  - 'backend/tests/test_agent_write.py'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 12 intro and its tool-descriptions rule, Conventions for every story (TR8), Story 12.4)'
  - '_bmad-output/implementation-artifacts/epic-12-context.md (Whole edits, Write tools)'
  - '_bmad-output/planning-artifacts/mcp-server-plan-2026-11-19.md (D5, D12; §5 story cut 12.4; §6 tests)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-21: One validator, Same handler, Edits are whole; AD-3 concurrency across tabs)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/reviews/review-adversarial-epic12.md (H1: partial edit_book, invalid_fields on each missing key)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (12-4 backlog, 12-3 done)'
  - '_bmad-output/implementation-artifacts/deferred-work.md (Story 12.1 to 12.3 entries)'
  - '_bmad-output/test-artifacts/atdd-checklist-12-3-let-an-agent-record-my-reading.md (format, contract-test pattern)'
  - '_bmad/tea/config.yaml'
  - 'backend/bookvie/agent/__init__.py, agent/tools.py, agent/server.py'
  - 'backend/bookvie/intents/add_book.py, edit_book.py, book_form.py, answers.py, intent_model.py, contract.py (duplicate_book)'
  - 'backend/bookvie/domain/duplicates.py'
  - 'backend/bookvie/http/api.py (add_book_intent, edit_book_intent)'
  - 'backend/tests/conftest.py (connect_mcp, mcp_client, FakeClock(TODAY)), agent_client.py, builder.py, helpers.py (VALID, DUNE, DUNE_FORM, NEUROMANCER_FORM, FaultyFs, library_bytes, temp_files, assert_invariants), test_agent_mount.py (AGENT_TOOL_NAMES), test_agent_write.py'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given add_book, when a client lists it, then its input schema equals the add-book intent model''s by alias (every form key optional, as in the route, and confirmDuplicate), with no coverUrl yet. Description: "Add a Book to the catalog. Every field is a string. Required: title, pages, authors (separated by semicolons), language, publisher, type (paperback, hardcover or ebook); edition defaults to 1. Optional: subtitle, isbn, year, tags (separated by commas), and finishedOn (YYYY-MM-DD) for a Book the user has already read. A likely duplicate is refused with duplicate_book and the matching Books: show them to the user, and send confirmDuplicate true only if the user says to add it anyway. Returns the new Book''s id."' }
  - { id: AC-2, idSource: generated, text: 'Given edit_book, when a client lists it, then its input schema equals the edit-book intent model''s by alias, except that every form key is required; only removeCover and confirmDuplicate are optional. Description: "Replace a Book''s fields. This is a whole edit: a field you leave empty is cleared. Call get_book first and send every field, changing only what the user asked for. A changed title, author or ISBN that makes it a likely duplicate is refused like add_book."' }
  - { id: AC-3, idSource: generated, text: 'Given a contract test over both tools, as 12.3''s, when the same input goes through the tool and through the intent route on identical seeded libraries, then the stored result and the result or error are the same, for: success with the new bookId; invalid_fields with every failing field; duplicate_book with its duplicates, then success with confirmDuplicate: true; pages_below_current_page; book_not_found on edit; an unchanged edit that still commits; and a filesystem fault giving couldnt_save (TR8).' }
  - { id: AC-4, idSource: generated, text: 'Given a Book with a subtitle, ISBN, tags and a chosen spine color, when edit_book is called with only bookId and title, then it is refused as invalid arguments naming the missing keys, and the Book is unchanged.' }
---

# ATDD Checklist: Story 12.4 Let an agent add and edit a Book

## Preflight

- **Stack:** `fullstack`, auto-detected. pytest (`backend/tests/conftest.py`) and Playwright (`frontend/playwright.config.ts`) are in place. The story has no UI, so every leaf is pytest.
- **Story:** `epics.md` Story 12.4 has 4 Given/When/Then criteria with no ids, so they are numbered AC-1 to AC-4 in source order (registry above). The two "Description:" lines belong to AC-1 (`add_book`) and AC-2 (`edit_book`). `sprint-status.yaml` reads `backlog` for 12.4 and `done` for 12.3.
- **Epic gate:** 12.4 isn't Epic 12's first story, so the spine-drift gate doesn't apply.
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns fragments). No Pact. `tea_browser_automation: auto` loads `playwright-cli.md`. The frontend fragments were loaded for their principles only, since no leaf touches a page.
- **What exists today:**
  - `bookvie.agent.TOOLS` holds 17 tools (12.1's one, 12.2's six, 12.3's ten). `_write_tool(name, description, model, parse, call)` builds a write tool that runs `parse(json.dumps(arguments))` and then `call(state, intent)`. Neither `add_book` nor `edit_book` is registered yet (the `tools.py` docstring says they come in 12.4).
  - **The routes.** `POST /api/intents/add-book` runs `parse_add_book_intent`, then `add_book(store, clock, intent, cover)`, and answers `{ok: true, ids: {bookId}}`. `POST /api/intents/edit-book` runs `parse_edit_book_intent(raw, has_cover=…)`, then `edit_book(store, clock, intent, cover)`, and answers `{ok: true}`. Both build their `OkResponse` inline in `http/api.py`: `intents/answers.py` doesn't cover them yet.
  - **The models.** `AddBookIntent` is `BookFormIntent` as is: 13 form keys (`title`, `subtitle`, `pages`, `authors`, `edition`, `language`, `publisher`, `type`, `isbn`, `year`, `finishedOn`, `tags`, `spineColor`), each `str | None = None` and not in `nullable`, plus `confirmDuplicate: bool = False`. `EditBookIntent` adds `bookId: str` (required) and `removeCover: bool = False`. Under `input_schema`, every form key is an optional plain `string` (null and the `None` default removed).
  - **Whole edits.** The route treats an omitted form key as empty, so a partial edit clears the Book's other fields. AD-21 ("Edits are whole") and the adversarial review's H1 decide the tool differs: `edit_book` requires every form key plus `bookId`, and a call that omits one is refused before the handler runs, with `invalid_fields` naming each missing key (AD-9). The route doesn't change.
  - **Ids and time.** `add_book` mints the Book's id and a back-fill Reading id with `uuid.uuid4()`. `edit_book` mints a back-fill Reading id. Both twins get `FakeClock(TODAY)` from `connect_mcp`, so `createdAt` matches.
  - **Duplicates** (`domain/duplicates.py`): equal normalized ISBNs, or (when either Book lacks an ISBN) the same title key and a shared author. `edit_book` checks only when the title, an author or the ISBN changed.

## Generation Mode

**AI generation**, sequential, in this session, as in Story 12.3. No recording: there's no UI. The config's `auto` would launch the two worker subagents, but the E2E worker has nothing to generate, and the API worker needs this session's reading of the intents. The leaves reuse 12.1's `McpClient` and `connect_mcp` and 12.3's contract helpers in `backend/tests/test_agent_write.py`.

## Test Strategy

| AC | Level | Priority | Leaf (first assertion in bold) | Why this level |
|---|---|---|---|---|
| AC-1 | API (pytest, `mcp_client`) | P0 | `test_add_book_advertises_the_add_book_intent_models_schema_and_the_storys_description`. **The listed `add_book` `inputSchema` equals `input_schema(AddBookIntent)`.** Then it has no `coverUrl`, requires nothing, and has exactly the 13 form keys plus `confirmDuplicate`, each form key a plain `string`; its description is the AC's text; and the tool list is 12.3's 17, then `add_book` and `edit_book`. | The schema is the interface an agent fills; AD-21's "a test compares each advertised schema with its model's". |
| AC-2 | API (pytest, `mcp_client`) | P0 | `test_edit_book_requires_every_form_key_and_advertises_the_storys_description`. **The listed `edit_book` schema's `required` is exactly the 13 form keys plus `bookId`.** Then the rest of the schema (all but `required` and the top-level `title` and `description`) equals `input_schema(EditBookIntent)`'s, `removeCover` and `confirmDuplicate` stay optional, there is no `coverUrl`, and the description is the AC's text. | P0: "a partial edit wiping a Book" is a risk AD-21 names. |
| AC-3 | API (pytest, two `connect_mcp` apps on copies of one seed) | P0 | `test_add_book_and_edit_book_store_and_answer_exactly_as_their_intent_routes`, parametrized over `BOOK_CASES`. **The tool's answer equals the route's: `("ok", body)` or `("error", error)`.** Then the two `library.json` files are byte-identical, and the case reaches the branch it names on the route. | P0 risk "same handler" (plan §6). The twin pattern of 12.3's AC-2 leaf. |
| AC-4 | API (pytest, seeded) | P0 | `test_a_partial_edit_book_is_refused_naming_the_missing_keys_and_changes_nothing`. **The answer is an error naming exactly the 12 missing form keys** (`(isError, sorted field names)`). Then the code is `invalid_fields`, no field is `intent`, `library.json` is byte-identical, and the Book keeps its subtitle, ISBN, tags and spine color. | P0: the partial edit the route would accept and use to clear six fields. |

**Primary branch per criterion.** AC-1's newly promised fact is `add_book`'s advertised schema; AC-2's is `edit_book`'s `required` list; AC-3's is the tool's answer equal to the route's; AC-4's is the refusal naming the missing keys.

**The red reason.** AC-1 and AC-2 fail at their first assertion: the tool isn't listed, so the schema read is `None` or `{}`. AC-3 and AC-4 fail at the tool call, as 12.3's contract cases did: `McpClient.result` asserts against the JSON-RPC error `Unknown tool: add_book`. The route call before the tool call in AC-3 is the reference, not an assertion. Once the tool exists, the first assertion that can fail is the criterion one.

**The AC-3 cases** (`BOOK_CASES` in `backend/tests/test_agent_write.py`). The seed is 12.3's `_seed`. Dune (`FINISHED`) now carries every optional field: a subtitle, the Ace ISBN, the year, the Tags `sci-fi` and `classic`, and the spine color `#749076`. Each `edit_book` input sends every key, as the tool requires.

| Tool | Cases |
|---|---|
| `add_book` | success (`ids.bookId`, minted); success with `finishedOn` (a minted back-fill Reading); every field invalid (`title`, `pages`, `authors`, `edition`, `language`, `publisher`, `type`, `isbn`, `year`, `finishedOn`, `spineColor`, in form order); `duplicate_book` (Dune's ISBN, with Dune in `duplicates`), then success with `confirmDuplicate: true`; wrong type (`pages: 387`, `intent`); `coverUrl` refused as an unknown key (`intent`: no `coverUrl` until 12.5); `couldnt_save` at write |
| `edit_book` | success (the paused Book's publisher and Tags); success with `finishedOn` on the unread Book (a minted back-fill Reading); **an unchanged edit** of Dune (ok, byte-identical), and the same edit with a write fault (`couldnt_save`, which proves it reaches the commit); every field invalid (as add); `pages_below_current_page` (paused at 200, Pages 150; `fields: [pages]`); `duplicate_book` (the paused Book retitled Dune by Frank Herbert), then success with `confirmDuplicate: true`; `book_not_found`; wrong type; `coverUrl` as an unknown key; `couldnt_save` at write |

**What the leaves pin (the contract for the build):**
- `TOOLS` gains `add_book` and then `edit_book` after `unmark_side_read`, each with the AC's description character for character.
- `add_book` advertises `input_schema(AddBookIntent)` unchanged. `edit_book` advertises `input_schema(EditBookIntent)` with `required` set to the 13 form keys plus `bookId`. The top-level `title` and `description` may differ, for example if the build declares a tool-only arguments model.
- Both tools parse with the route's `parse_add_book_intent` / `parse_edit_book_intent` (with no cover: `has_cover=False`) and call `add_book` / `edit_book` with the app's `store` and `clock`. `add_book` answers `{ok: true, ids: {bookId}}` and `edit_book` answers `{ok: true}`, as their routes do.
- `edit_book` refuses a call missing any required key with `invalid_fields`, one field per missing key named by its key, and the Book stays unchanged. A call with every key goes to the route's parser, so a wrong type or an unknown key is still the route's `intent` refusal.

**Open for the build (not pinned):**
- The missing-key refusal's messages and its field order (the leaf compares sorted names). `parse_view_arguments` already names each failing argument with Pydantic's message; reusing its shape for the missing-key check alone (before `parse_edit_book_intent`) keeps the route's `intent` refusal for everything else.
- Whether `add_book`'s `ids.bookId` answer moves into `intents/answers.py` (a `book_answer`) so the route and the tool share it, as 12.3 did for its three answers.
- A missing `bookId` alone is named like the form keys (it is required in both). See the follow-ups.

## Existing leaves this story changes (for the build)

- `backend/tests/test_agent_mount.py`'s `AGENT_TOOL_NAMES` (asserted at `:223`, `:256`, `:442`, `:641`) becomes the cumulative 19: the 17 it lists now, then `add_book` and `edit_book`.
- `backend/tests/test_agent_write.py`'s 12.3 leaves that assert the exact list, `EARLIER_TOOL_NAMES + WRITE_TOOL_NAMES` (`test_the_ten_write_tools_advertise_…` and `test_a_real_bookvie_process_advertises_and_commits_a_write_tool`), gain `+ BOOK_TOOL_NAMES`. This run didn't change them, since those leaves would fail until the tools exist.
- This run changed two shared helpers in that file, and 12.3's leaves still pass on them (154 passed): `_seed` (Dune's optional fields) and `same_ids` (`MINTING_MODULES` adds `add_book` and `edit_book`).
- The OpenAPI contract (`check:api`) must stay byte-identical: the routes don't change.

## Green-phase follow-ups (secondary branches, not red leaves)

- [ ] **Pytest, AC-3 more refusals:** `pages_below_card_note` on the Main book (a note at 162), `null` for a form key (refused on `intent` by tool and route alike), and `removeCover: true` on a Book with a cover (seeded with `cover=True`) stored as the route stores it.
- [ ] **Pytest, AC-3 other fault steps:** `fsync` and `replace` faults (TR8) through both tools.
- [ ] **Pytest, AC-3 back-fill side effect:** `edit_book` with `finishedOn` on a Side read with no Readings takes it off the Side reads through the tool, as through the route.
- [ ] **Pytest, AC-4 more partial edits:** `{bookId}` alone, `{}` (no `bookId` either: `bookId` named too), and every key but `spineColor`. Each is refused naming exactly its missing keys and changes nothing; an extra `coverUrl` next to the missing keys is still refused (the build decides which refusal comes first).
- [ ] **Pytest, AC-1/AC-2 from a real server:** both schemas and one `add_book` commit on a `bookvie` subprocess, as 12.3's real-process leaf does.
- [ ] **Pytest, AC-3 find then edit:** `find_book` gives Dune's id, `get_book` gives its fields, and `edit_book` with those fields and one change commits only that change (the description's "Call get_book first" flow).
- [ ] **Pytest, unexpected failure:** a monkeypatched `add_book` / `edit_book` that raises answers `couldnt_save` through the tool, as the route's 500 does, and is logged with the tool's name.

## Helper probes

Helpers reused: `McpClient`, `error_of`, `text_of` (`tests/agent_client.py`); `connect_mcp`, `mcp_client` (`tests/conftest.py`); `LibraryBuilder` (`tests/builder.py`); `FaultyFs`, `library_bytes`, `temp_files`, `assert_invariants`, `stored_book`, `DUNE_ISBN13` (`tests/helpers.py`); `Case`, `_twins`, `_route_answer`, `_tool_answer`, `EARLIER_TOOL_NAMES`, `WRITE_TOOL_NAMES`, `GONE`, `FINISHED`, `PAUSED`, `UNREAD`, `PAUSED_PAGES` (`tests/test_agent_write.py`); `input_schema` (`bookvie.agent`). Extended, probed: `_seed` (Dune gets every optional field, so AC-4 has a Book with a subtitle, ISBN, Tags and a chosen spine color, and `duplicate_book` has an ISBN to match), `same_ids` (`add_book` and `edit_book` mint from the counter too), and `Case` (its docstring names the new `"unchanged"` expectation; no code change).

Helpers added, in `backend/tests/test_agent_write.py`:
- `FORM_KEYS`, `BOOK_TOOL_NAMES`, `BOOK_DESCRIPTIONS`: the form's keys in form order, and the AC texts. `DUNE_FORM` in `tests/helpers.py` is the Edit book form for a different Dune (`Chilton Books`, no subtitle or Tags), so it doesn't match this seed.
- `ADD`, `BAD_FIELDS`, `DUNE_AGAIN`, `FINISHED_FORM`, `PAUSED_FORM`, `UNREAD_FORM`, `EDIT`, `BOOK_CASES`: this seed's forms and the case table. `VALID` in `tests/helpers.py` has no ISBN or Tags; `ADD` adds both, so the stored Book exercises more of the form.
- `rest()` (local to the AC-2 leaf): a schema without `required` and its top-level `title` and `description`.

Shipped numbers: none quoted. The ACs quote no size or count for shipped UI. Pages, dates and ids are the seed's own values.

Probes ran from a temporary `backend/tests/test_agent_write_probe.py` (`uv run pytest -q -p no:cacheprovider tests/test_agent_write_probe.py --no-cov -s`, 25 passed). The file was then removed with `rm`. They ran on the file as it is now (after ruff).
- **`_seed`, `_twins`, `same_ids`, `_route_answer`, `BOOK_CASES`:** each of the 20 cases ran the AC-3 leaf's body with the tool call replaced by the same route on the tool twin. Both answers were equal, both `library.json` files byte-identical, and every case reached the branch it names. For example `add_book-success-confirm-duplicate` answered `{"ok": true, "ids": {"bookId": "b0000000-0000-4000-8000-000000000001"}}`, `add_book-duplicate-book` answered `duplicate_book` with `duplicates: [{"title": "Dune", "authors": ["Frank Herbert"], "isbn": "9780441172719"}]`, `edit_book-unchanged-still-commits` answered `{"ok": true}` with byte-identical bytes, and `edit_book-unchanged-fault-at-write` answered `couldnt_save`. Both "every field invalid" cases named the 11 fields in `BAD_FIELD_ORDER`.
- **Correction recorded during the probes:** the first run failed on `edit_book-pages-below-current-page`, because the route's `pages_below_current_page` also names `pages` in `fields`. The case now expects `("pages",)`, and the probes ran again: 25 passed.
- **Refusals:** without restarting the counter, an `add_book` with `finishedOn` left the twins with different bytes. Without `same_ids` at all, an `edit_book` back-fill did too. So the leaf can't pass by accident. `rest()` returned equal for the schema with `required` and `title` changed, and unequal for one with a nullable `title` property or `additionalProperties: true`.
- **AC-4's reader** (`json.loads(text_of(answer))`, then `(isError, sorted field names)`): on a shipped `update_page` refusal it returned `(True, ["intent"])`, which the leaf's assertion rejects. On a shipped `get_home` success it returned `(False, [])`, which is rejected too. (The probe first expected `None` for a success's `isError`; the server sends `false`. Only the probe's expectation changed.)
- **`_seed`'s Dune:** stored with `subtitle` "Dune Chronicles 1", `tags` `["sci-fi", "classic"]`, `spineColorUser` and `spineColor` `#749076`, and its finished Reading.
- **Not probed:** `FORM_KEYS` and the forms are plain data (the unchanged-edit probe proves `FINISHED_FORM` matches the stored Dune byte for byte). No border or outline width is read (no UI), so Epic 10 retro item 71 (E10-R1) doesn't apply.

**Render-before-read:** no leaf reads a page. Every read is an MCP or HTTP response from an app whose lifespan is running (`connect_mcp`), or a file in its data folder. No leaf needed a fix.

## TDD Red Phase

4 skipped leaves in `backend/tests/test_agent_write.py`, each `@pytest.mark.skip(reason=RED)` (`RED` = "Story 12.4 red phase: add_book and edit_book are not registered yet"), with its `[P*] AC-n` in its first comment line:

| AC | Leaf | Priority |
|---|---|---|
| AC-1 | `backend/tests/test_agent_write.py:845` `test_add_book_advertises_the_add_book_intent_models_schema_and_the_storys_description` | P0 |
| AC-2 | `backend/tests/test_agent_write.py:870` `test_edit_book_requires_every_form_key_and_advertises_the_storys_description` | P0 |
| AC-3 | `backend/tests/test_agent_write.py:900` `test_add_book_and_edit_book_store_and_answer_exactly_as_their_intent_routes` (20 cases, `BOOK_CASES` at `:816`) | P0 |
| AC-4 | `backend/tests/test_agent_write.py:944` `test_a_partial_edit_book_is_refused_naming_the_missing_keys_and_changes_nothing` | P0 |

**Red today.** This run came after the probes above last passed, on the file as it is now. The leaves ran from a throwaway `tests/test_agent_write_red.py` with the skip lines deleted (`uv run pytest -q -p no:cacheprovider tests/test_agent_write_red.py --no-cov -k "add_book or edit_book or partial"`). The copy was then removed with `rm`. Result: 23 failed (3 leaves and 20 cases):
- **AC-1:** `assert None == {...}`: `add_book` isn't listed, so its schema reads `None`.
- **AC-2:** `assert [] == ['authors', ...]`: `edit_book` isn't listed, so `required` reads `[]`.
- **AC-3:** every case fails at its tool call with `tools/call: {'code': -32602, 'message': 'Unknown tool: add_book'}` (8) or `… edit_book` (12), the JSON-RPC error `McpClient.result` asserts against. The route call before it is the reference, not an assertion.
- **AC-4:** it fails at the tool call too (`Unknown tool: edit_book`). Once the tool exists, the first assertion is `(isError, named keys)`.

With the skips in place, `uv run pytest -q -p no:cacheprovider --no-cov` (the full backend suite) gave 1869 passed and 23 skipped. Ruff format and check are clean on the file. `git status` lists only `backend/tests/test_agent_write.py` and this checklist: no `*_probe.py` file and no throwaway copy.

**Storage keys:** no new localStorage key. The story has no frontend change.

**No real library:** every leaf runs under `conftest.py`'s temporary `HOME`, on folders under `tmp_path`.

## Implementation checklist (for `bmad-build-auto`)

- [ ] Add `add_book` and then `edit_book` to `TOOLS` after `unmark_side_read`, each with the AC's description (AC-1, AC-2).
- [ ] `add_book`: advertise `AddBookIntent`, parse with `parse_add_book_intent`, call `add_book(state.store, state.clock, intent)`, and answer `{ok: true, ids: {bookId}}` (AC-1, AC-3).
- [ ] `edit_book`: advertise `EditBookIntent`'s schema with every form key and `bookId` required. Refuse a call missing any of them with `invalid_fields` naming each key, before `parse_edit_book_intent` runs. Then call `edit_book(state.store, state.clock, intent)` and answer `{ok: true}` (AC-2, AC-3, AC-4).
- [ ] Keep `agent/` free of `http/api` imports (`test_layers.py`), and leave `coverUrl` for Story 12.5.
- [ ] Update `AGENT_TOOL_NAMES` and the two 12.3 list assertions to the cumulative 19 (see above).
- [ ] Un-skip the 4 leaves and see them pass, then run `npm run check` with no other existing leaf's assertions edited.

## Next

`bmad-build-auto` for Story 12.4, then `bmad-code-review` in a new session, then `bmad-testarch-automate` for the follow-ups above.
