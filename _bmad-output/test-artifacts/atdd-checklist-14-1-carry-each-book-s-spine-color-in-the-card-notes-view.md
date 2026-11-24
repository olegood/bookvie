---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-24'
storyId: '14.1'
storyKey: '14-1-carry-each-book-s-spine-color-in-the-card-notes-view'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-141-carry-each-books-spine-color-in-the-card-notes-view'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-14-1-carry-each-book-s-spine-color-in-the-card-notes-view.md'
generatedTestFiles:
  - 'backend/tests/test_card_notes_spine_color.py'
  - 'backend/tests/helpers.py (post_set_spine_color, moved from test_set_spine_color.py)'
  - 'backend/tests/test_set_spine_color.py (_set now aliases helpers.post_set_spine_color)'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 14 intro, gate, "Before Story 14.1"; Story 14.1; AR36, AR38, AR62, AR63)'
  - '_bmad-output/planning-artifacts/card-note-boxes-plan-2026-11-23.md (D15, §4 story cut, §5 tests)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (epic-14 and 14-1 backlog)'
  - '_bmad-output/implementation-artifacts/deferred-work.md (spine drift gate: 0 unresolved)'
  - '_bmad-output/test-artifacts/atdd-checklist-13-6-see-on-the-backup-page-how-the-last-dropbox-backup-went.md (format)'
  - '_bmad/tea/config.yaml'
  - 'backend/bookvie/views/card_notes.py, views/models.py, views/shelf.py, agent/read_tools.py, http/api.py, domain/model.py'
  - 'backend/tests/test_card_notes_view.py, test_agent_read.py, test_set_spine_color.py, test_edit_book.py, test_dropbox_backup_line.py, builder.py, helpers.py, agent_client.py, conftest.py'
  - 'frontend/src/api/generated/schema.d.ts, frontend/src/api/views.ts, frontend/package.json (api:gen, check:api)'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given a seeded library with Books that have card notes (a user-chosen spine color, a color from its cover, the palette color, read and unread) and a Book without notes, when the client reads the unscoped card-notes view, then every group carries spineColor, equal to that Book''s stored resolved spine_color (AD-11) exactly as stored, the same value the book and catalog views give; the groups, their order (title key, then Book id), their notes and scope: null are otherwise unchanged; the Book without notes still has no group.' }
  - { id: AC-2, idSource: generated, text: 'Given a Book with card notes, when the client reads card-notes?book=<id>, then scope carries bookId, title and spineColor, and the one group carries the same spineColor.' }
  - { id: AC-3, idSource: generated, text: 'Given a Book without card notes, when the client reads card-notes?book=<id>, then scope.spineColor is that Book''s resolved color and groups is empty; an unknown Book is still 404 book_not_found.' }
  - { id: AC-4, idSource: generated, text: 'Given a Book''s spine color changed (from the spine popover, or by editing the Book), when the client reads the view again, then the group and the scope carry the new color.' }
  - { id: AC-5, idSource: generated, text: 'Given the changed view models, when npm --prefix frontend run api:gen runs, then schema.d.ts has spineColor: string on CardNotesGroup and CardNotesScope, and check:api passes with the regenerated file compared byte for byte; no other file in the repository is reformatted.' }
  - { id: AC-6, idSource: generated, text: 'Given the agent tool get_card_notes, for every Book and for one Book, when an agent calls it, then its result is the view as is, with spineColor on each group and on the scope (AR36, AR38); its registered description is unchanged.' }
  - { id: AC-7, idSource: generated, text: 'Given this story, when the Card notes page, Book detail and Home render, then nothing visible changes, no stored data or backup format changes, and every existing Card notes test passes unchanged.' }
---

# ATDD Checklist: Story 14.1 Carry each Book's spine color in the card-notes view

## Preflight

- **Stack:** `fullstack`, auto-detected. pytest (`backend/tests/conftest.py`) and Playwright (`frontend/playwright.config.ts`) are in place. The story changes only the server's view and the generated client types. Nothing renders differently, so every leaf is pytest.
- **Story:** `epics.md` Story 14.1 has 7 Given/When/Then criteria with no ids. They are numbered AC-1 to AC-7 in source order (registry above). Each "And" line belongs to the criterion above it. `sprint-status.yaml` reads `backlog` for `14-1-…` and `epic-14`.
- **Epic gate:** 14.1 is Epic 14's first story. A script over `deferred-work.md` found 0 unresolved "spine drift" entries (case-insensitive, no `resolved:` line), which matches the epic's "None was open on 2026-11-24".
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns). No Pact. `tea_browser_automation: auto` loads `playwright-cli.md`.
- **What exists today:**
  - `CardNotesGroup` is `{bookId, title, notes}` and `CardNotesScope` is `{bookId, title}` (`views/models.py:214`, `:221`).
  - `views/card_notes.py` builds both from the `Book`, which already carries the stored resolved `spine_color` (`domain/model.py:94`).
  - `get_card_notes` returns `views.require_card_notes(...)` as is (`agent/read_tools.py:74`), so the tool gets the field once the view does.
  - No frontend source or test builds a `CardNotesGroup` or `CardNotesScope` object by hand (only `views.ts` re-exports the types, and `CardNotesPage.tsx` reads them). No e2e spec fakes the `card-notes` route. A required `spineColor` shouldn't break `tsc -b`.

## Generation Mode

**AI generation**, sequential, in this session. There's no UI to record. The E2E worker would have nothing to write, and the API worker would need this session's reading of the view, the builder and the shared helpers. Stories 12.x and 13.x ran the same way.

## Test Strategy

| AC | Level | Priority | Leaf (`backend/tests/test_card_notes_spine_color.py`) | First assertion (the criterion) |
|---|---|---|---|---|
| AC-1 | API (pytest, in-process app) | P0 | `:128` `test_ac1_p0_every_group_carries_its_books_stored_spine_color` | each group's `spineColor`, in group order, equals the stored Book's `spineColor` (`:138`) |
| AC-2 | API | P0 | `:170` `test_ac2_p0_the_scoped_views_scope_and_group_carry_the_spine_color` | `scope.spineColor == "#A85A4A"` (Dune's cover color) (`:179`) |
| AC-3 | API | P0 | `:189` `test_ac3_p0_a_scoped_book_without_notes_carries_its_color_and_no_groups` | `scope.spineColor` equals Good Omens' stored color, with no group to carry it (`:200`) |
| AC-4 | API | P1 | `:216` `test_ac4_p1_a_changed_spine_color_shows_on_the_next_read` | after `set-spine-color` to `#749076`, the next unscoped read's group carries it (`:229`) |
| AC-5 | Contract (pytest reads `schema.d.ts` and OpenAPI) | P0 | `:248` `test_ac5_p0_the_client_types_carry_spine_color_on_group_and_scope` | `"spineColor: string;"` in `schema.d.ts`'s `CardNotesGroup` block (`:252`) |
| AC-6 | Agent (MCP, `connect_mcp`) | P1 | `:272` `test_ac6_p1_get_card_notes_carries_spine_color_on_each_group_and_the_scope` | the tool's groups carry `spineColor` in order: cover, palette, as stored, user (`:284`) |
| AC-7 | API (guard, witness first) | P1 | `:304` `test_ac7_p1_the_color_is_read_only_and_no_stored_data_changes` | witness: the unscoped view's first group carries `spineColor` (`:313`) |

**The seed** (`_seed`) covers every kind of color AC-1 names, plus one more case:
- Walden has a user color (`#4B7C7B`) and is finished (read).
- Dune's color comes from its cover (`#A85A4A`). It's the Main book, being read.
- Emma has the palette color and is unread.
- Neuromancer has a stored `spineColor` of `#123456`, which re-resolving would not give. That pins "exactly as stored".
- Good Omens has no notes.

What each leaf covers after its first assertion:

- **AC-1.**
  - One value of each kind, by literal: cover, palette (the stored `spineColorCurated`), `#123456` as stored, user.
  - Each group's `spineColor` equals the `book` view's and the `catalog` view's for that Book.
  - Order by title key, then Book id. Each group has exactly the keys `{bookId, title, spineColor, notes}`, with the same note counts and first note. `scope` is `null`.
  - Good Omens has no group.
- **AC-2.** The scope is exactly `{bookId, title: "Dune", spineColor}`. There's one group, and it has the same color.
- **AC-3.**
  - The color is the curated one.
  - `groups == []`.
  - An unknown id is 404 `refusal`/`book_not_found`, and `library.json` is unchanged.
- **AC-4.** The view is read once before the change, as the page would have read it. Each change below must show in the group and in the scope:
  - `set-spine-color` to a swatch.
  - `edit-book` with Spine color `#4B7C7B`.
  - `set-spine-color` `null` ("From cover"), which goes back to the cover's color.
- **AC-5.**
  - `CardNotesScope`'s block has `spineColor: string;` too.
  - In OpenAPI, `spineColor` is a required string on both types, and their property sets are exactly `{bookId, title, spineColor}` and `{bookId, title, spineColor, notes}`.
  - "`check:api` passes byte for byte" and "no other file is reformatted" are checked by `npm run check` and `git status`, not by a leaf.
- **AC-6.**
  - The whole tool result equals `GET /api/views/card-notes` on the same app, for every Book, for Walden, and for Good Omens. Good Omens' scope has its color, and its `groups` is empty.
  - The description still equals `DESCRIPTIONS["get_card_notes"]`.
- **AC-7.** A witness comes first, so the guard can't pass against today's view. Then the leaf reads card-notes (unscoped and scoped), home, catalog and book, and checks two things:
  - `library.json` is byte-identical.
  - Every stored Book has exactly today's 21 keys (`BOOK_KEYS`). A backup carries `library.json` as is, so the backup format doesn't change either.
  - "Nothing visible changes" and "every existing Card notes test passes unchanged" are checked by the existing e2e suite, run in `npm run check`, not by a new leaf.

## Existing leaves this story changes (for the build)

These two pin the scope's exact shape as `{bookId, title}`. AC-2 and AC-3 add `spineColor` to it, so they need the field in the expected value (or a key-based assert):

- `backend/tests/test_card_notes_view.py:132`: `body["scope"] == {"bookId": dune, "title": "Dune"}`
- `backend/tests/test_card_notes_view.py:151`: `response.json() == {"scope": {"bookId": emma, "title": "Emma"}, "groups": []}`

AC-7's "every existing Card notes test passes unchanged" is about the page and its e2e specs (its *When* is "the Card notes page, Book detail and Home render"). These two pytest leaves pin the view's shape, which this story changes on purpose. `test_card_notes_view.py:93` (`{"scope": None, "groups": []}`) and `test_agent_read.py:255` (it compares tool and route) stay as they are.

## Green-phase follow-ups (secondary branches, not red leaves)

- [x] **A Book whose color changes on a cover edit:** `edit-book` with a new cover re-resolves `spineColorFromCover`. AC-4 covers the popover and the Spine color field. A cover replaced through `edit-book` gives the same stored `spineColor` path, which is worth one automate leaf. (done: backend/tests/test_card_notes_spine_color_follow_ups.py:72 `test_a_cover_replaced_through_edit_book_shows_its_new_color_on_the_next_read`, which also covers `removeCover`; and :95 `test_a_user_color_survives_a_cover_replaced_through_edit_book_in_the_view`)
- [x] **The scope's color for a Book with notes equals its group's color**, across all seeded Books (AC-2 checks one). (done: backend/tests/test_card_notes_spine_color_follow_ups.py:114 `test_the_scopes_color_equals_its_groups_for_every_book_with_notes`)
- [x] **A restored library:** after a restore, the view carries the restored Books' colors. A restore writes `library.json`, which the view reads, so no new code is needed. One leaf would pin it. (done: backend/tests/test_card_notes_spine_color_follow_ups.py:132 `test_after_a_restore_the_view_carries_the_restored_books_colors`)

## Helper probes

- **Helpers reused:**
  - `LibraryBuilder`, `CURATED` (`tests/builder.py`)
  - `api_client`, `library_bytes`, `stored_book`, `stored_books`, `post_edit_book`, `DUNE`, `DUNE_FORM` (`tests/helpers.py`)
  - `connect_mcp` (`tests/conftest.py`)
  - `McpClient`, `structured_of`, `DESCRIPTIONS` (`tests/agent_client.py`)
  - `post_set_spine_color` (`tests/helpers.py`, moved, not changed: it was `_set` in `test_set_spine_color.py:49`, which now aliases it as `_set = post_set_spine_color`. The body is unchanged, so it wasn't probed. `test_set_spine_color.py` passes: 20 passed with the card-notes modules.)
- **Helpers added:**
  - `_schema_block` (module-local, `test_card_notes_spine_color.py`): returns one `components.schemas` type's body from `schema.d.ts`. `test_dropbox_backup_line.py:152` only greps the whole file for a name. That can't tell which type holds `spineColor`, and `ShelfBook` and `BookDetailView` already have one.
  - `_seed`, `_get` (module-local): the story's library and a 200-checked read of the view. `test_agent_read.py`'s `_view` reads through an `McpClient`'s app, not a `TestClient`.
  - `BOOK_KEYS` (module-local): a stored Book's 21 keys today. `test_edit_form_parity.py`'s `STORED_KEYS` is the edit form's 12 keys, so it's a different list.
- **Shipped numbers: none quoted.** The leaves assert colors as stored (`#A85A4A` and `#123456` are seed values, `#4B7C7B` and `#749076` are `CURATED` swatches) and no size.
- **Widths:** no border or outline width is asserted, so E10-R1 doesn't apply.
- **Storage keys:** no new localStorage key.
- **`_schema_block`** (a parser of generated text) was probed on today's `schema.d.ts` with `cd backend && uv run pytest -q tests/test_schema_block_probe.py` (1 passed). The file was then removed with `rm`. It was named `_probe.py` rather than `.probe.py` because pytest only collects `test_*.py`.
  - **Known-good:** `_schema_block("ShelfBook")` contains `spineColor: string;`, a field that already ships. `CardNotesGroup`'s block contains `bookId: string;` and `notes: components…`.
  - **Refuses:**
    - `CardNotesGroup`'s and `CardNotesScope`'s blocks don't contain `spineColor` today.
    - `CardNotesScope`'s block doesn't contain `notes`, so it doesn't run on into the next type.
    - An unknown name raises `AssertionError`.
- **Render-before-read:** all 7 leaves are pytest and read no page, so the check doesn't apply. No leaf needed a fix.

## TDD Red Phase

There are 7 skipped leaves in `backend/tests/test_card_notes_spine_color.py`, each `@pytest.mark.skip(reason=RED_14_1)` with exactly one `[P*] AC-n` in its comment and `ac<n>_p<n>` in its name.

**Red today.** This run came after the probe above passed, on the file as it is now (after ruff). The leaves were un-skipped in a throwaway copy, `tests/test_card_notes_spine_color_red.py`, which was then removed with `rm`. The copy keeps the file's line numbers. Each leaf fails at its first criterion assertion:

| AC | Fails at | Because |
|---|---|---|
| AC-1 | `:138` | `[None, None, None, None] == ['#A85A4A', …, '#4B7C7B']`: no group has `spineColor` |
| AC-2 | `:179` | `None == '#A85A4A'`: the scope is `{bookId, title}` |
| AC-3 | `:200` | `None == '#7A6283'`: Good Omens' scope has no color |
| AC-4 | `:229` | `None == '#749076'`: after the swatch (`set-spine-color` answered `{ok: true}`), the group has no color |
| AC-5 | `:252` | `CardNotesGroup`'s block is `bookId`, `title`, `notes` only |
| AC-6 | `:284` | the tool's groups have no `spineColor` |
| AC-7 | `:313` | the witness: the first group has no `spineColor` |

**Green check (simulated build).** I added `spine_color: str` to both models and passed `book.spine_color` in `views/card_notes.py`, then ran the same throwaway copy. 6 passed, and only AC-5 failed, at `:252`, because `api:gen` wasn't run. So every assertion after the first one in AC-1, AC-2, AC-3, AC-4, AC-6 and AC-7 holds against the intended change.
- The edit was saved as a patch in the scratchpad and reversed with `git apply -R`.
- `git status` afterwards listed only this run's three test files. There was no `*_red.py` and no probe file.
- AC-5's OpenAPI half wasn't checked by this simulation.

**Suite after this run:** see "Suite" below.

## Implementation checklist (for `bmad-build-auto`)

- [x] `CardNotesGroup.spine_color: str` and `CardNotesScope.spine_color: str` (`views/models.py`), each with a docstring line: the Book's stored resolved color (AD-11), as stored. (done: `backend/bookvie/views/models.py:219` and `:229`; AC-5's leaf `test_card_notes_spine_color.py::test_ac5_p0_the_client_types_carry_spine_color_on_group_and_scope` passes)
- [x] `views/card_notes.py`: pass `book.spine_color` to both. Don't re-resolve it from `spine_color_user`/`from_cover`/`curated` (Neuromancer's `#123456` pins this). (done: `backend/bookvie/views/card_notes.py` `_group` and the scoped `CardNotesScope(...)`; AC-1's leaf passes with `AS_STORED`, and this run's two mutants of `card_notes.py` failed the follow-ups)
- [x] `npm --prefix frontend run api:gen`, then `npm --prefix frontend run check:api`. Only `frontend/src/api/generated/schema.d.ts` changes, and no other file is reformatted (`git status`). (done: commit `862b856` changes only the planned files; AC-5's leaf reads `spineColor: string;` in both `schema.d.ts` blocks)
- [x] Update `test_card_notes_view.py:132` and `:151` (above). (done: `backend/tests/test_card_notes_view.py:135` and `:158`)
- [x] Un-skip the 7 leaves, remove `RED_14_1`, and run `npm run check`. (done: no `skip` or `RED_14_1` left in `test_card_notes_spine_color.py`; this run's `npm run check:py` runs all 7)
- [x] Nothing else: no domain, store, backup, intent, agent-tool or page change (AR62). (done: commit `862b856`'s source changes are `views/models.py` and `views/card_notes.py` only; AC-6 and AC-7 pass)

## Suite

- `npm run check:py` passes: 2497 passed and 7 skipped (this run's leaves). Ruff is clean, and every coverage gate is ok.
- `npm run check:api` and the e2e suite weren't run. No frontend file changed: `schema.d.ts` is regenerated by the build, not here.
