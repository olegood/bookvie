---
title: 'Rotate the curated spine color from the last Book'
type: 'bugfix'
created: '2026-11-12'
status: 'done'
baseline_revision: '1df3775b007b49a2a3e9832070b7a65c8610ee84'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** add-book picks a new Book's curated color with `curated_spine_color(len(library.books))`. Deleting a Book shrinks the count, so the next new Book gets the color the deleted one had moved past, and it can repeat its neighbour's color on the shelf. Source: `deferred-work.md`, "Rotate the curated spine color from the last Book's curated color" (Epic 1 retro F-R4, from `spec-epic-1-trace-and-gate`).

**Approach:** The new Book's curated color is the palette color after the last Book's stored `spineColorCurated` (the last Book in `library.books`, which is creation order). Every Book stores a curated color whatever its resolved color is, so a user-set or cover-derived color never changes the rotation. With no Books, or when the last Book's curated color isn't one of the eight, the rotation starts at Sage.

## Boundaries & Constraints

**Always:** Pure and deterministic: the same library always gives the same color. The palette match ignores letter case (`#5b7590` counts as Slate). Use the stored `spine_color_curated`, never `spine_color`, `spine_color_user` or `spine_color_from_cover`. Keep `resolve_spine_color` and the AD-11 resolve order unchanged.

**Never:** No change to stored data, the model, invariants, restore, or any other intent. No re-coloring of existing Books. No client change.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Empty library | No Books | New Book curated Sage (`#749076`) | No error expected |
| Rotation | Last Book curated Clay | Ochre | No error expected |
| Wrap | Last Book curated Stone | Sage | No error expected |
| Delete before add | Books Sage, Slate, Clay; delete Slate; add | Ochre (the count would give Clay, a repeat) | No error expected |
| Delete the last Book | Books Sage, Slate, Clay; delete Clay; add | Clay (follows Slate) | No error expected |
| Last Book has a custom or cover color | Last Book curated Plum, `spineColorUser` `#1A2B3C` | Teal | No error expected |
| Unknown curated color | Last Book curated `#123456` (hand-edited restore) | Sage | No error expected |
| Lower-case match | Last Book curated `#5b7590` | Clay | No error expected |

</intent-contract>

## Code Map

- `backend/bookvie/domain/spine_color.py` -- `CURATED_SPINE_COLORS` (eight, DESIGN.md order); `curated_spine_color(book_count)` l.31 is the count rotation to replace. Module docstring l.1-5 says "in rotation by the Book count".
- `backend/bookvie/intents/add_book.py:66` -- the only caller: `curated_spine_color(len(library.books))` inside `change(library)`, under the store lock.
- `backend/bookvie/domain/model.py:79` -- `Book.spine_color_curated: str`, always set.
- `backend/bookvie/intents/delete_book.py:41` -- delete filters `library.books`, keeping order.
- `backend/tests/test_add_book.py` -- `test_ac2_p0_curated_color_rotates_and_resolved_color_is_stored` l.99 (empty library, nine adds, then a custom-color add expects `CURATED[1]`: still true under the new rule); `test_curated_rotation_counts_existing_books` l.519 (builder gives Books `CURATED[n]`, so three Books → `CURATED[3]`: still true, but its name pins the count). Helpers `_add`, `api_client`, `stored_book(s)`; `tests/builder.py` `LibraryBuilder.book(**overrides)` accepts `spine_color_curated=`/`spine_color_user=`.
- `backend/tests/test_delete_book.py:41` -- `_delete(client, book_id)` sends `{"bookId": …}` to `DELETE_BOOK` (`tests/helpers.py:43`).
- Docs: `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md:434` "Curated rule" ("cycling through the eight in order"). ARCHITECTURE-SPINE.md l.370 says only "curated rotation" and l.405 leaves the assignment order to `domain/`, so the spine needs no edit. EXPERIENCE.md doesn't describe the rotation. `epics.md` story 1.7 AC ("the next … in creation order") stays true.

## Tasks & Acceptance

**Execution:**
- `backend/bookvie/domain/spine_color.py` -- replace `curated_spine_color(book_count: int)` with `next_curated_spine_color(last: str | None) -> str`: the color after `last` in the palette (case-insensitive), wrapping; Sage when `last` is `None` or not in the palette. Update the module docstring. -- the fix, kept pure.
- `backend/bookvie/intents/add_book.py` -- pass `library.books[-1].spine_color_curated if library.books else None`. -- callers use the last Book.
- `backend/tests/test_add_book.py` -- rename `test_curated_rotation_counts_existing_books` to say it follows the last Book; add API tests: delete a middle Book then add (the repeat case), delete the last Book then add, last Book with a user color, unknown and lower-case curated colors. Keep the AC-2 rotation test as is.
- `backend/tests/test_spine_color.py` (new) -- unit-test `next_curated_spine_color` for `None`, each step, the wrap, unknown, and lower case.
- `DESIGN.md:434` -- say the new Book takes the color after the last Book's curated color (Sage for the first), so deleting a Book never makes the next one repeat a neighbour's.

**Acceptance Criteria:**
- Given Books curated Sage, Slate, Clay, when Slate is deleted through delete-book and a Book is added through add-book, then the new Book's `spineColorCurated` is Ochre.
- Given the existing rotation test, when the suite runs, then it passes unchanged.
- Given the change, when `cd backend && uv run pytest -q` and `npm run check` run, then both pass.

## Spec Change Log

## Review Triage Log

### 2026-11-12 — Review pass
- verdicts: 12 findings — high 0, medium 0, low 10, false 2, maybe-false 0
- findings:
  - `[low]` `[patch]` Blind Hunter: DESIGN.md's "never repeats a neighbour's color" overclaims, since the shelf is sorted and shelf neighbours aren't creation neighbours. — Reworded: a new Book's curated color never repeats the one created just before it.
  - `[low]` `[patch]` Blind Hunter: DESIGN.md leaves out the Sage restart for a curated color outside the eight. — Added to the Curated rule.
  - `[false]` `[reject]` Blind Hunter: the deferred-work entry isn't closed. — Finalize adds its `resolved:` line before the commit.
  - `[low]` `[patch]` Blind Hunter: the renamed `test_curated_rotation_follows_the_last_book` gives the same answer under the count rule. — Now two Books, the last curated Teal: expects Moss where the count would give Clay.
  - `[low]` `[patch]` Blind Hunter: the matrix's "custom or cover color" row tests only the user color. — Parametrized the test with a cover-color case.
  - `[low]` `[reject]` Blind Hunter: `_delete` is duplicated from `test_delete_book.py`. — Four test lines; moving it means editing an unrelated test module for no behaviour change.
  - `[low]` `[patch]` Blind Hunter: hard-coded lower-case hex in the case tests. — Use `SLATE.lower()`, `CLAY.lower()` and `CURATED[1].lower()`.
  - `[low]` `[reject]` Blind Hunter: the palette is upper-cased on every call. — Eight strings once per add-book; no measurable cost, and a lookup table adds module state.
  - `[low]` `[patch]` Blind Hunter: the creation-order assumption behind `library.books[-1]` isn't noted in code. — Added a one-line comment in `add_book.py`.
  - `[low]` `[patch]` Blind Hunter: DESIGN.md doesn't say deleting the most recent Book frees its color for the next. — Added to the Curated rule.
  - `[low]` `[patch]` Edge Case Hunter: DESIGN.md's neighbour claim fails on a sorted shelf and ignores resolved colors. — Same rewording as the first row; the rule now speaks of curated colors in creation order only.
  - `[false]` `[reject]` Intent Alignment: the spec isn't `done`, `deferred-work.md` has no `resolved:` line, and nothing is committed. — A snapshot before Finalize, which does all three. The auditor's other notes are descriptive: the diff implements the "last surviving Book, stored curated color" reading the spec chose.

Verification gap: no findings. Spine check: no findings (AD-11, AD-3, AD-4, AD-18, AD-20 checked).

## Design Notes

- **Why the stored curated color, not the resolved one.** Every Book is assigned a curated color at creation (AD-11), whatever its user or cover color. Following the stored curated color keeps the rotation one sequence through all Books, and a custom-colored last Book still moves it on. Following the resolved color would stall or jump on custom colors.
- **Last = list order.** `library.books` is append-only in creation order; delete and edit keep order, and restore keeps the file's order. No sort by `createdAt`, which can tie.
- **Unknown color starts at Sage** rather than falling back to the count: one simple, deterministic rule, and it only happens with a hand-edited restore.

## Verification

**Commands:**
- `cd backend && uv run ruff format <changed files> && uv run ruff check .` -- expected: clean
- `cd backend && uv run pytest -q` -- expected: all pass
- `npm run check` (repo root) -- expected: pass

## Auto Run Result

Status: done

- **Change:** add-book gives a new Book the curated color after the last Book's stored `spineColorCurated` (last in `library.books`, creation order), wrapping Stone to Sage; Sage for an empty library or a curated color outside the eight (matched without case). User and cover colors don't affect the rotation. Deleting a Book no longer makes the next one repeat the color of the Book created before it.
- **Files:**
  - `backend/bookvie/domain/spine_color.py`: `next_curated_spine_color(last)` replaces `curated_spine_color(book_count)`.
  - `backend/bookvie/intents/add_book.py`: passes the last Book's curated color.
  - `backend/tests/test_add_book.py`: the existing-Books test now separates the two rules; new API tests for delete-then-add (middle and last), user and cover colors, unknown and lower-case curated colors.
  - `backend/tests/test_spine_color.py` (new): unit tests of the rotation.
  - `DESIGN.md`: the Curated rule states the rotation, the Sage fallback and the delete behaviour.
  - `deferred-work.md`: `resolved:` line on the F-R4 entry.
- **Review:** 12 findings: 10 low, 2 false. 8 low patches (doc wording, test strength, a code comment); 2 low rejected (`_delete` duplication, per-call upper-casing) and 2 false rejected, with reasons in the triage log. Nothing deferred. The patches were applied directly rather than by the implementation subagent.
- **Follow-up review recommended:** false (patched: 0 high, 0 medium, 8 low).
- **Verification:** `uv run ruff format` on the changed files and `uv run ruff check .`: clean. `cd backend && uv run pytest -q` and `npm run check`: exit 0. pytest 1531 passed; Playwright e2e 597 passed.
- **Residual risk:** none known; the rule relies on `library.books` staying in creation order.
