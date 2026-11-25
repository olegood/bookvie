---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-25'
storyId: '15.1'
storyKey: '15-1-carry-the-publisher-in-the-catalog-view'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-15-1-carry-the-publisher-in-the-catalog-view.md (I/O matrix, Review Findings, Auto Run Result)
  - _bmad-output/test-artifacts/atdd-checklist-15-1-carry-the-publisher-in-the-catalog-view.md (Green-phase follow-ups, Implementation checklist)
  - _bmad-output/implementation-artifacts/epic-15-context.md
  - _bmad/tea/config.yaml
  - backend/bookvie/views/models.py, backend/bookvie/views/shelf.py
  - backend/tests/test_catalog_publisher.py, test_card_notes_spine_color_follow_ups.py (export, restore), test_add_book.py (`_add`), test_agent_book_write.py (edit_book flow), helpers.py, agent_client.py, builder.py, conftest.py (`connect_mcp`)
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/test-quality.md
---

# Automation Summary: Story 15.1 Carry the publisher in the catalog view

## Preflight

- **Done at HEAD.** `git show HEAD:…/sprint-status.yaml` reads `15-1-carry-the-publisher-in-the-catalog-view: done` (review commit `1455ecb`), and the working tree was clean.
- **Stack:** `fullstack` (auto). The story changes two backend view files and the generated `schema.d.ts`, and it changes no page.
  - Every target is a pytest leaf.
  - No browser session was opened.
  - The Playwright fragments (`fixture-architecture`, `network-first`, `playwright-cli`) weren't loaded.
- **Mode:** BMad-Integrated. The inputs were:
  - the ATDD checklist's 3 open green-phase follow-ups and its 6 implementation lines
  - the spec's I/O matrix and Review Findings, which hold 0 patches and 1 deferral about epic status in `sprint-status.yaml`. That deferral has nothing to test.
- **Generation:** sequential, in this session. The config's `auto` would resolve to subagents. But there are 3 leaves in one file, and they reuse the ATDD module's seed and constants, so a worker would need this session's reading anyway. Story 14.1's automate run made the same choice.
- **Knowledge:** I read the core fragments' principles: test levels, priorities, data factories and test quality. `selective-testing` and `ci-burn-in` weren't needed, because no CI or selection change is made. `tea_use_playwright_utils` and `tea_use_pactjs_utils` are off, and there is no Pact artifact.

## Coverage plan

The 4 ATDD leaves cover AC-1 to AC-4. The review found no gap: Edge Case Hunter and Verification Gap reported nothing. This run adds one leaf for each follow-up, all in `backend/tests/test_catalog_publisher_follow_ups.py`:

| Source | Priority | Level | Leaf |
|---|---|---|---|
| Follow-up "a Book added through `add-book`" (AC-1's branch) | P2 | API | `test_a_book_added_with_a_padded_publisher_shows_it_trimmed_on_the_next_read`: `add-book` with `"  No Starch Press  "` stores the trimmed value. The next catalog read carries it for the new Book, and the seeded Books keep theirs ("manning" included). |
| Follow-up "a restored library" (AC-1's branch) | P2 | API | `test_after_a_restore_the_catalog_carries_the_restored_books_publishers`: a target library is read first with another publisher. After restoring the seed's real export, `library.json` matches the source byte for byte, and the next read carries the 4 restored publishers in library order. |
| Follow-up "the agent `edit_book` tool" (AC-3's branch) | P2 | API (MCP) | `test_an_agent_publisher_edit_shows_in_the_next_list_catalog`: `get_book`'s edit form, then `edit_book` with `"  Ace Books  "`. The value is stored trimmed. The next `list_catalog` shows it for Dune only, and it still equals the HTTP catalog view. |

**Not added:**
- **An e2e leaf.** No page reads the field until 15.2, and the existing catalog, home-slice and catalog-filter specs pass unchanged (AC-4).
- **A blank or missing stored publisher.** `store.py:211` refuses one on load, and `test_invariants.py:364` already pins that (`book_publisher_required`).

## Files

- **Created:** `backend/tests/test_catalog_publisher_follow_ups.py`, with 3 leaves.
- **Updated:** the ATDD checklist.
  - The 3 green-phase follow-ups and the 6 implementation-checklist lines are ticked with their evidence.
  - The docstring line notes that "(Story 15.2)" was dropped, as the review recorded.
  - Remaining `[ ]`: **0** (`grep -cF '[ ]'`).

## Helper probes

- **Helpers reused:**
  - `_seed`, `_get`, `PUBLISHERS` and `CATALOG_VIEW` (`tests/test_catalog_publisher.py`)
  - `_add` (`tests/test_add_book.py`)
  - `EXPORT` and `EXPORT_HEADERS` (`tests/test_card_notes_spine_color_follow_ups.py`)
  - `api_client`, `library_bytes`, `post_restore` and `stored_book` (`tests/helpers.py`)
  - `LibraryBuilder` (`tests/builder.py`)
  - `McpClient`, `structured_of` and `text_of` (`tests/agent_client.py`)
  - `connect_mcp` (`conftest.py`)
- **Helpers added:** none. The new module defines no helper, constant or fixture.

## Validation

- **Each new leaf can fail.** I made two hand edits of `backend/bookvie/views/shelf.py`'s `publisher=` line, one at a time. Each was reverted from a scratchpad copy, and `git status` afterwards showed only the new test file.

  | Hand edit | Result |
  |---|---|
  | `publisher=book.publisher.lower()` | 3 of 3 failed |
  | `publisher="Publisher"` (a constant) | 3 of 3 failed |

- **Story module:** `uv run pytest -q tests/test_catalog_publisher_follow_ups.py` gave 3 passed. ruff format and ruff check were clean.
- **Suite:**
  - `npm run check:py` gave **2515 passed**: the review-time 2512, plus 3. Every coverage gate was OK.
  - `npm run check:api` exited 0, with 416 unit tests passing.
  - `check:e2e` wasn't re-run, because no frontend or source file changed. The build's full `npm run check` had e2e at 876 passed.
- **Quality checklist:**
  - No hard waits or conditionals.
  - Every assert compares exact values, lists or dicts.
  - Each leaf builds its own library under `tmp_path`, so the leaves are parallel-safe.
  - One subject per leaf.
  - No skips or focus.
- **No browser sessions** were opened, and no temp files are left in the repo. The mutation backup is in the session scratchpad.

## Assumptions and risks

- The new module imports private helpers from other test modules: `_seed` and `_get` from the ATDD module, and `_add` from `test_add_book.py`. A change to those helpers changes this file too. Earlier follow-up modules import from their story's module the same way (`test_card_notes_spine_color_follow_ups.py`).
- `EXPORT` and `EXPORT_HEADERS` exist in two test modules (`test_card_notes_spine_color_follow_ups.py` and `test_agent_backup.py`), and several others inline the literal. This run imports one copy and adds none.

## Next

Story 15.2 (`filter-the-catalog-by-publisher`) is the next story of Epic 15, and it closes the epic. Start it with `bmad-testarch-atdd`.
