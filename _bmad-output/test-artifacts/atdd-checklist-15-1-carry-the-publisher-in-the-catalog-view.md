---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-25'
storyId: '15.1'
storyKey: '15-1-carry-the-publisher-in-the-catalog-view'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-151-carry-the-publisher-in-the-catalog-view'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-15-1-carry-the-publisher-in-the-catalog-view.md'
generatedTestFiles:
  - 'backend/tests/test_catalog_publisher.py'
  - 'backend/tests/helpers.py (SCHEMA_D_TS, schema_block and STORED_BOOK_KEYS, moved from test_card_notes_spine_color.py)'
  - 'backend/tests/test_card_notes_spine_color.py (now imports schema_block and STORED_BOOK_KEYS from helpers.py)'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 15 intro, gate, "Before Story 15.1", out of scope; Story 15.1)'
  - '_bmad-output/planning-artifacts/catalog-publisher-filter-plan-2026-11-25.md (D7, §4 story cut, §5 tests)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (epic-15 and 15-1 backlog; Epic 14 retro items done)'
  - '_bmad-output/test-artifacts/atdd-checklist-14-1-carry-each-book-s-spine-color-in-the-card-notes-view.md (format)'
  - '_bmad/tea/config.yaml'
  - 'backend/bookvie/views/models.py, views/shelf.py, agent/read_tools.py, domain/book_fields.py'
  - 'backend/tests/test_agent_read.py, test_bookcase_view.py, test_views.py, test_card_notes_spine_color.py, builder.py, helpers.py, agent_client.py, conftest.py'
  - 'frontend/src/api/generated/schema.d.ts, frontend/src/api/views.test.ts, frontend/src/lib/catalog.test.ts, frontend/src/lib/catalogFilter.test.ts, frontend/e2e (catalog route fakes)'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given Books stored with publishers such as "Manning" and "O''Reilly Media", when the client fetches the catalog view, then every ShelfBook carries publisher, a string equal to the Book''s stored, trimmed publisher (AR66), and a Book edited to another publisher shows the new value on the next fetch.' }
  - { id: AC-2, idSource: generated, text: 'Given the field added in Python, when npm --prefix frontend run api:gen runs, then schema.d.ts gives ShelfBook a required publisher: string, and check:api compares it byte for byte and passes, and every ShelfBook fixture in the frontend unit tests and the e2e helpers carries publisher, built through the shared helpers rather than new copies.' }
  - { id: AC-3, idSource: generated, text: 'Given the MCP list_catalog tool, which returns the same catalog view, when an agent calls it, then each Book in the result carries publisher too, and the tool''s description and arguments don''t change.' }
  - { id: AC-4, idSource: generated, text: 'Given the Catalog, Home and Card notes pages, when they render after this story, then nothing visible changes, and the existing catalog, home-slice and catalog-filter e2e specs pass unchanged.' }
---

# ATDD Checklist: Story 15.1 Carry the publisher in the catalog view

## Preflight

- **Branch:** `story-15-1-carry-the-publisher-in-the-catalog-view`, created from `master` at `689680c` for this story.
- **Stack:** `fullstack`, auto-detected. pytest (`backend/tests/conftest.py`) and Playwright (`frontend/playwright.config.ts`) are in place. The story adds one field to a server view and to the generated client types. Nothing renders it, so every leaf is pytest.
- **Story:** `epics.md` Story 15.1 has 4 Given/When/Then criteria with no ids. They are numbered AC-1 to AC-4 in source order (registry above). Each "And" line belongs to the criterion above it. `sprint-status.yaml` reads `backlog` for `15-1-…` and `epic-15`.
- **Epic gate:** 15.1 is Epic 15's first story. Every Epic 14 retro item (96 to 101) is `done` in `sprint-status.yaml`, and the epic's "Before Story 15.1" says no spine drift entry was open on 2026-11-25. ATDD doesn't enforce the gate; `bmad-build-auto` does.
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns). No Pact. `tea_browser_automation: auto` loads `playwright-cli.md`.
- **What exists today:**
  - `ShelfBook` (`views/models.py:24`) has 24 fields, ending with `type`, `language` and `tags`, and no `publisher`. `views/shelf.py:52` `_shelf_book` builds it from the `Book`, which already carries the stored `publisher`. `book_fields.py:126` trims every form value, so the stored value is trimmed.
  - `CatalogView.books` and `HomeView.books` are both `list[ShelfBook]` (`views/models.py:130`, `:165`). Home's books gain `publisher` too; AC-4's witness pins it.
  - `list_catalog` returns `views.catalog(...)` as is (`agent/read_tools.py:69`), so the tool gets the field once the view does.
  - **No frontend fixture builds a whole `ShelfBook`.** The unit tests use narrow `Pick` types (`NamedSpine` and `TwinSpine` in `catalog.test.ts`, `FilterableBook` in `catalogFilter.test.ts`); `views.test.ts:135` builds a `BookDetailView`, which already has `editForm.publisher`. The three e2e `page.route('**/api/views/catalog', …)` fakes (`catalog-tile-marks.spec.ts:185`, `:554`, `catalog-typeset-covers.spec.ts:355`) pass the real response through and edit it, and `error-screens.spec.ts:12` fakes a broken body on purpose. So AC-2's fixture clause has nothing to change today. A required `publisher` shouldn't break `tsc -b`, and if it does, `tsc -b` in `check:api` names the fixture.

## Generation Mode

**AI generation**, sequential, in this session. There's no UI to record and nothing renders the field. Story 14.1, the same shape of story, ran the same way.

## Test Strategy

| AC | Level | Priority | Leaf (`backend/tests/test_catalog_publisher.py`) | First assertion (the criterion) |
|---|---|---|---|---|
| AC-1 | API (pytest, in-process app) | P0 | `:113` `test_ac1_p0_every_shelf_book_carries_its_stored_publisher` | each Book's `publisher`, in library order, equals the seed's stored value (`:122`) |
| AC-2 | Contract (pytest reads `schema.d.ts` and OpenAPI) | P0 | `:146` `test_ac2_p0_the_client_types_give_shelf_book_a_required_publisher` | `"publisher: string;"` in `schema.d.ts`'s `ShelfBook` block (`:150`) |
| AC-3 | Agent (MCP, `connect_mcp`) | P1 | `:165` `test_ac3_p1_list_catalog_carries_the_publisher_with_its_description_and_arguments` | the tool's Books carry `publisher` in library order (`:177`) |
| AC-4 | API (guard, witness first) | P1 | `:188` `test_ac4_p1_the_publisher_is_read_only_and_no_stored_data_changes` | witness: the catalog view's first Book carries `publisher` (`:197`) |

**The seed** (`_seed`), in library order:
- "Grokking Algorithms", `Manning`, unread.
- "Designing Data-Intensive Applications", `O'Reilly Media`, finished. The apostrophe goes through as is.
- "Kafka in Action", `manning` as stored. The view doesn't merge case: merging is Story 15.2's job, on the client.
- Dune from `DUNE` (`Chilton Books`), the Main book. AC-1 edits it.

What each leaf covers after its first assertion:

- **AC-1.**
  - The Books are in library order, and each `publisher` equals `library.json`'s value for that Book.
  - `edit-book` on Dune with `"  Ace Books  "` answers 200, stores `Ace Books` (trimmed), and the next fetch carries `Ace Books`, with the other three Books unchanged.
- **AC-2.**
  - In OpenAPI, `publisher` is a string and required.
  - `ShelfBook`'s properties and `required` are exactly today's 24 (`SHELF_BOOK_FIELDS_BEFORE`) plus `publisher`.
  - "`check:api` compares it byte for byte and passes" is checked by `npm run check`, not by a leaf. The fixture clause has no fixture to change today (Preflight).
- **AC-3.**
  - The whole tool result equals `GET /api/views/catalog` on the same app.
  - The description still equals `DESCRIPTIONS["list_catalog"]` (read from `epics.md`), and `inputSchema` still equals `input_schema(NoArguments)`.
- **AC-4.** A witness comes first, so the guard can't pass against today's view. Home's books carry the same four publishers. Then the leaf reads card-notes and book, and checks two things:
  - `library.json` is byte-identical.
  - Every stored Book has exactly the 21 keys in `STORED_BOOK_KEYS`. A backup carries `library.json` as is, so the backup format doesn't change either.
  - "Nothing visible changes" and "the existing catalog, home-slice and catalog-filter e2e specs pass unchanged" are checked by the existing e2e suite, run in `npm run check`, not by a new leaf.

## Existing leaves this story changes (for the build)

These two pin every field of each `ShelfBook` in a seeded catalog and home view. AC-1 adds `publisher` on purpose, so the expected dicts need `"publisher": "Publisher"` (the builder's default):

- `backend/tests/test_views.py:59` `test_seeded_library[home]`
- `backend/tests/test_views.py:59` `test_seeded_library[catalog]`

The simulated build below found exactly these two. AC-4's "pass unchanged" is about the e2e specs; these pytest leaves pin the view's shape, which this story changes on purpose. `test_views.py`'s empty-library leaves (`:45`, `:52`) have no Books and stay as they are, as does `test_agent_read.py:238`, which compares the tool with the route.

## Green-phase follow-ups (secondary branches, not red leaves)

- [x] **A Book added through `add-book`** (with a padded publisher) shows its trimmed publisher in the next catalog fetch. AC-1 covers `edit-book`. (done: backend/tests/test_catalog_publisher_follow_ups.py::test_a_book_added_with_a_padded_publisher_shows_it_trimmed_on_the_next_read)
- [x] **A restored library:** after a restore, the catalog carries the restored Books' publishers. A restore writes `library.json`, which the view reads, so no new code is needed. One leaf would pin it. (done: backend/tests/test_catalog_publisher_follow_ups.py::test_after_a_restore_the_catalog_carries_the_restored_books_publishers)
- [x] **The agent `edit_book` tool** changing the publisher shows in the next `list_catalog` call. (done: backend/tests/test_catalog_publisher_follow_ups.py::test_an_agent_publisher_edit_shows_in_the_next_list_catalog)

## Helper probes

- **Helpers reused:**
  - `LibraryBuilder` (`tests/builder.py`)
  - `api_client`, `library_bytes`, `stored_book`, `stored_books`, `post_edit_book`, `DUNE`, `DUNE_FORM` (`tests/helpers.py`)
  - `schema_block`, `STORED_BOOK_KEYS`, `SCHEMA_D_TS` (`tests/helpers.py`, moved, not changed: they were `_schema_block`, `BOOK_KEYS` and `SCHEMA_D_TS` in `test_card_notes_spine_color.py`, which now imports them. The bodies are unchanged and `BOOK_KEYS` became a `frozenset` of the same 21 keys. `test_card_notes_spine_color.py` passes: 7 passed. `schema_block` was still probed on `ShelfBook`, a type it hadn't read before; see below.)
  - `connect_mcp` (`tests/conftest.py`)
  - `McpClient`, `structured_of`, `DESCRIPTIONS` (`tests/agent_client.py`)
  - `NoArguments`, `input_schema` (`bookvie.agent`, production code, as `test_agent_restore.py:31` imports them). They replace a copy of `test_agent_read.py:140`'s `_assert_no_arguments`, and pin the whole schema rather than its absence of properties.
- **Helpers added:**
  - `_seed`, `_get` (module-local): the story's library, and a 200-checked read of a view by path. `test_card_notes_spine_color.py`'s `_get` reads only `card-notes`, with a `book` parameter.
  - `PUBLISHERS`, `SHELF_BOOK_FIELDS_BEFORE` (module-local): the seed's publishers in order, and `ShelfBook`'s 24 OpenAPI properties before this story. No shared list names `ShelfBook`'s fields.
- **Shipped numbers: none quoted.** The leaves assert publisher strings and key sets, and no size or token.
- **Widths:** no border or outline width is asserted, so E10-R1 doesn't apply.
- **Storage keys:** no new localStorage key.
- **`schema_block`** (a parser of generated text) was probed on today's `schema.d.ts` with `cd backend && uv run pytest -q tests/test_schema_block_probe.py` (1 passed). The file was then removed with `rm`.
  - **Known-good:** `schema_block("ShelfBook")` contains `spineColor: string;` and `language: string;`, fields that already ship. `CardNotesGroup`'s block contains `spineColor: string;` (Story 14.1).
  - **Refuses:**
    - `ShelfBook`'s block doesn't contain `publisher: string;` today.
    - `ShelfBook`'s and `CardNotesScope`'s blocks don't contain `notes:`, so neither runs on into another type.
    - An unknown name raises `AssertionError`.
  - The probe's first draft wrongly expected `CardNotesGroup` to lack `spineColor`, which Story 14.1 added; the helper was right, the probe was fixed, and no helper changed.
- **Render-before-read:** all 4 leaves are pytest and read no page, so the check doesn't apply. No leaf needed a fix.

## TDD Red Phase

There are 4 skipped leaves in `backend/tests/test_catalog_publisher.py`, each `@pytest.mark.skip(reason=RED_15_1)` with exactly one `[P*] AC-n` in its comment and `ac<n>_p<n>` in its name.

**Red today.** This run came after the probe above passed, on the file as it is now (after ruff). The leaves were un-skipped in a throwaway copy, `tests/test_catalog_publisher_red.py`, which kept the file's line numbers and was then removed with `rm`. Each leaf fails at its first criterion assertion:

| AC | Fails at | Because |
|---|---|---|
| AC-1 | `:122` | `[None, None, None, None] == ['Manning', "O'Reilly Media", 'manning', 'Chilton Books']`: no Book has `publisher` |
| AC-2 | `:150` | `ShelfBook`'s block ends at `language` and `tags`, with no `publisher` |
| AC-3 | `:177` | the tool's Books have no `publisher` |
| AC-4 | `:197` | the witness: `None == 'Manning'` |

**Green check (simulated build).** I added `publisher: str` to `ShelfBook`, passed `book.publisher` in `views/shelf.py`, and ran `npm --prefix frontend run api:gen` (which changed only `schema.d.ts`, by 2 lines). Then I ran the same throwaway copy with `test_agent_read.py`, `test_bookcase_view.py` and `test_views.py`: all 4 new leaves passed, so every assertion after the first one holds against the intended change. The only failures were the two `test_views.py` leaves listed above.
- The change was saved as a patch in the scratchpad and reversed with `git apply -R`.
- `git status` afterwards listed only this run's three test files. There was no `*_red.py` and no probe file.

## Implementation checklist (for `bmad-build-auto`)

- [x] `ShelfBook.publisher: str` (`views/models.py`), with a docstring line: the Book's publisher as stored (trimmed by the book fields); read by Catalog's Publisher filter (Story 15.2). (done: backend/bookvie/views/models.py:61-62, commit 2276696; the docstring leaves out "(Story 15.2)", which the 15.1 review rejected as low)
- [x] `views/shelf.py` `_shelf_book`: `publisher=book.publisher`. Don't merge case or otherwise normalize it ("manning" stays "manning"). (done: backend/bookvie/views/shelf.py:80; test_catalog_publisher.py AC-1 pins "manning", and this run's mutations `.lower()` and a constant fail all 3 follow-ups)
- [x] `npm --prefix frontend run api:gen`, then `npm --prefix frontend run check:api`. Only `frontend/src/api/generated/schema.d.ts` changes among generated files, and no other file is reformatted (`git status`). If `tsc -b` names a `ShelfBook` fixture, add `publisher` to it through its shared helper. (done: schema.d.ts +2 lines in commit 2276696, no frontend fixture changed; `npm run check:api` exit 0 in this run)
- [x] Update `test_views.py:59`'s expected Books with `"publisher": "Publisher"` (above). (done: backend/tests/test_views.py, 3 expected Books; passed in this run's `check:py`)
- [x] Un-skip the 4 leaves, remove `RED_15_1` and the `pytest` import if it's then unused, and run `npm run check` (the e2e suite included, for AC-4). (done: no skip or `RED_15_1` left in test_catalog_publisher.py; `check:py` 2515 passed in this run; the full `npm run check` with e2e 876 passed ran in the build, spec Auto Run Result)
- [x] Nothing else: no domain, store, backup, intent, agent-tool, page or component change. `list_catalog`'s description and arguments stay as they are. (done: the branch diff touches only views/models.py and views/shelf.py under backend/bookvie, per the 15.1 review; test_catalog_publisher.py AC-3 pins the description and inputSchema)

## Suite

- `npm run check:py` passes: 2508 passed and 4 skipped (this run's leaves). Ruff is clean, and every coverage gate is ok.
- `npm run check:api` and the e2e suite weren't run. No frontend file changed: `schema.d.ts` is regenerated by the build, not here.
