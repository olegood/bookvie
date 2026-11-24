---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-24'
storyId: '14.1'
storyKey: '14-1-carry-each-book-s-spine-color-in-the-card-notes-view'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-14-1-carry-each-book-s-spine-color-in-the-card-notes-view.md (I/O matrix, Review Findings, Auto Run Result)
  - _bmad-output/test-artifacts/atdd-checklist-14-1-carry-each-book-s-spine-color-in-the-card-notes-view.md (Green-phase follow-ups, Implementation checklist)
  - _bmad/tea/config.yaml
  - backend/bookvie/views/card_notes.py, backend/bookvie/views/models.py
  - backend/tests/test_card_notes_spine_color.py, test_card_notes_view.py, test_cover.py (edit-book cover parts), test_restore.py (export, restore), helpers.py, builder.py
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
---

# Automation Summary: Story 14.1 Carry each Book's spine color in the card-notes view

## Preflight

- **Stack:** `fullstack` (auto). The story changes two backend view files and the generated `schema.d.ts`, and no page. Every target is a pytest leaf, so no browser session was opened and the Playwright fragments weren't loaded.
- **Gate:** `sprint-status.yaml` at HEAD (`8c621b2`) says `14-1-…: done`, and the tree was clean at the start.
- **Mode:** BMad-integrated. The inputs were the ATDD checklist's 3 open green-phase follow-ups and 6 implementation lines, plus the spec's I/O matrix and Review Findings.
- **Generation:** sequential, in this session. The config's `auto` would resolve to subagents, but there are 4 leaves in one file that reuse the ATDD module's seed and constants, so a worker would need this session's reading anyway. The ATDD run made the same choice.
- **Knowledge:** the six core fragments only. `tea_use_playwright_utils` and `tea_use_pactjs_utils` are off, and there is no Pact artifact.

## Coverage plan

The 7 ATDD leaves cover AC-1 to AC-7, and the review found no gap (Edge Case Hunter and Verification Gap reported nothing). This run adds one or two leaves for each of the 3 follow-ups, in `backend/tests/test_card_notes_spine_color_follow_ups.py`:

| Source | Priority | Level | Leaf |
|---|---|---|---|
| Follow-up "a Book whose color changes on a cover edit" (AC-4's branch) | P2 | API | `:72` `test_a_cover_replaced_through_edit_book_shows_its_new_color_on_the_next_read`: a new cover through `edit-book` gives a new stored `spineColor` (≠ `#A85A4A`, = `spineColorFromCover`), and the unscoped group, the scope and the scoped group all carry it. Then `removeCover` falls back to the curated color in all three. |
| Same follow-up, user-color branch | P2 | API | `:95` `test_a_user_color_survives_a_cover_replaced_through_edit_book_in_the_view`: with a user color, a new cover changes `spineColorFromCover`, and the view still shows the user color. |
| Follow-up "the scope's color equals its group's for every Book with notes" (AC-2's branch) | P2 | API | `:114` `test_the_scopes_color_equals_its_groups_for_every_book_with_notes`: for the four seeded kinds (user, cover, palette, as stored), the unscoped group, the scope and the scoped group are equal to each other and to the stored `spineColor`. |
| Follow-up "a restored library" (AC-1/AC-3's branch) | P2 | API | `:132` `test_after_a_restore_the_view_carries_the_restored_books_colors`: a target library is read first with another color. After restoring the seed's real export, `library.json` matches the source byte for byte, and the next read carries the restored colors in order. The no-notes Book's scope carries its color. |

**Not added:** an e2e leaf. The page doesn't read the field until 14.2, and the existing Card notes, Book detail and Home specs still pass unchanged.

## Files

- **Created:** `backend/tests/test_card_notes_spine_color_follow_ups.py`, with 4 leaves. It imports `_seed` and the color constants from `test_card_notes_spine_color.py`, and it has module-local `_get`, `_colors`, `_seed_dune_with_cover_and_a_note` and `_edit_cover`.
- **Updated:** the ATDD checklist. The 3 green-phase follow-ups and the 6 implementation-checklist lines are ticked with their evidence. Remaining `[ ]`: **0** (`grep -cF '[ ]'`).

## Validation

- **Each new leaf can fail.** Each hand edit of `backend/bookvie/views/card_notes.py` was run against the follow-ups and then reverted from a scratchpad copy:

  | Hand edit | Result |
  |---|---|
  | The scope re-resolves to `spine_color_curated` | 3 of 4 failed: both cover-edit leaves and scope = group |
  | Each group prefers `spine_color_from_cover` over the stored color | 1 of 4 failed: the user color survives a new cover |

  The restore leaf passed both edits, because neither touches its unscoped groups for these Books. A wrong value there is caught by AC-1's leaf, which reads the same groups. `git status` afterwards showed only the new test file.
- **Story modules:** `uv run pytest -q tests/test_card_notes_spine_color.py tests/test_card_notes_spine_color_follow_ups.py tests/test_card_notes_view.py tests/test_agent_read.py` gave 35 passed (the review's 31, plus 4).
- **Suite:** `npm run check:py` exited 0 with **2508 passed**. ruff was clean, every coverage gate was OK, and `views/card_notes.py` is at 100%. `check:api` and `check:e2e` weren't re-run, because no frontend or source file changed. The build's full `npm run check` after its patches had e2e at 803 passed.
- **Quality checklist:**
  - No hard waits or conditionals.
  - Every assert compares exact values or tuples.
  - Each leaf builds its own library under `tmp_path`, so the leaves are parallel-safe.
  - One subject per leaf.
  - No skips or focus.
- **No browser sessions** were opened, and no temp files are left in the repo. The mutation backup is in the session scratchpad.

## Assumptions and risks

- The cover-edit leaves assert that the new color differs from `#A85A4A` and equals the stored `spineColorFromCover`. They don't assert a hex value. The hue math belongs to `test_cover.py:435` (AC-8 of Story 1.13), not to this view.
- The new module imports `_seed` from the ATDD module, so a change to that seed changes both files. Earlier follow-up modules import from their story's module the same way (`test_agent_restore_follow_ups.py`).

## Next

Story 14.2 (`see-my-card-notes-as-boxes`) is the next story of Epic 14. Start it with `bmad-testarch-atdd`.
