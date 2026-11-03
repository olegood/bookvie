---
title: 'Consolidate test helpers and add the missing cover-path fault tests'
type: 'refactor'
created: '2026-11-03'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Backend test modules import each other's private helpers (`_client`, `_library_bytes`, `FaultyFs`, `DUNE_FORM`…), and `BASE_URL` is defined in five files (F-A5). The e2e specs each reimplement `intentOf`, `catalogTitles`, `rgbOf`, `attachCover`, `newBookPanel`, `fillFields` and `DUNE_ID` (F-A9). Two of those `intentOf` copies use a greedy regex that would misread a request that also carries a file. Separately, the cover paths are missing TR8 fault coverage (F-S4): the edit-book cover fault test doesn't check the error code or message, remove-cover has no injected-fault test, and delete-book of a Book with a cover has no failing-commit test. Epic 1 retro action item 5.

**Approach:**
- Move the shared backend helpers into one `backend/tests/helpers.py` with public names, and have every test module import from it instead of from another test module.
- Add `frontend/e2e/intents.ts`, which holds intent paths, request capture and one multipart-aware `intentOf`.
- Add `frontend/e2e/library.ts`, which holds the seeded ids, catalog reads, panel locators, form filling and `rgbOf`.
- Use these in every spec that duplicates them. No test loses an assertion.
- Add the three missing fault tests: 503 `couldnt_save`, with the full envelope, `library.json` byte-identical and the cover files on disk unchanged.

</frozen-after-approval>

## Implementation Notes

- **Backend:** `backend/tests/helpers.py` holds `BASE_URL`, the four intent paths, `TODAY`, `COULDNT_SAVE_BODY`, `VALID`, `DUNE`, `DUNE_FORM`, `VALID_FORM`, `DUNE_ID`, `DUNE_ISBN13`, `RED_ORANGE`, `FaultyFs`, `api_client`, `library_bytes`, `stored_books`, `stored_book`, `assert_invariants`, `field_messages`, `image_bytes` and `seed_dune_with_cover`.
  - The names are public, because the module is shared.
  - The view tests' own `_client` copies now use `api_client` too, with `raise_server_exceptions=True` so a crashing view still fails on its traceback. They now get `FakeClock(TODAY)`, which views don't read. `test_guard.py` keeps its own client, because it builds the app with a static folder and `dev`.
  - No `tests.test_*` import remains. Test IDs are unchanged: a sorted collect-only list diffed equal to the 749-test baseline before the new tests were added.
  - Spec-local values stay where they are, e.g. `test_book_fields.TODAY`, which is a different date.
- **Gotcha:** my first copy of `FaultyFs.remove` dropped `super().remove(path)`, and 11 tests caught it with leftover `*.tmp*` files. The helper now matches the original exactly.
- **Fault tests (F-S4)** are in `backend/tests/test_cover.py`.
  - The add and edit cover loop now asserts the whole `COULDNT_SAVE_BODY`, and edit also asserts that no temp files are left.
  - New: remove-cover and delete-book of a Book with a cover, each at write, fsync and replace. Each asserts 503, the full envelope, `library.json` byte-identical, the cover file still on disk, and no temp files.
  - Mutation check: deleting the cover inside delete-book's change made all three delete tests fail on the cover-files assertion.
- **e2e:** `frontend/e2e/intents.ts` holds the intent paths, `COVER_PNG`, `requestsTo`, `bodyOf`, the multipart-aware `intentOf` and `attachCover(page, server, form)`. `frontend/e2e/library.ts` holds `DUNE_ID`, `catalogTitles`, `newBookPanel`, `openNewBook`, `fillFields`, `editPanel`, `openEdit`, `settled` and `rgbOf`.
  - The two greedy-regex `intentOf` copies (1.9, 1.11) and the per-intent `*Requests` capture helpers are gone.
  - `bookcase-details`' `fillNewBook` is built from `openNewBook` and `fillFields`.
  - `attachCover` now asserts 200 in cover.spec too. Before, it ignored the response, which made sense in the red phase.
  - `openEdit` is scoped to `main` everywhere.
  - Spine-popover's cover form became a `DUNE_FORM` const passed to `attachCover`.
  - Left local: helpers used by one spec (`catalogBooks`, `catalog`, and the panel and dialog locators unique to a story). Constants that the retro didn't name (`AXE_TAGS`, `COULDNT_SAVE`) are deferred.
  - `openEdit` is now scoped to `main` in book-detail.spec too. It used to match any Edit button on the page; book-detail's tests pass with it.
- **Verification:** The full check passed before review, with load around 8–9 on 14 cores (PL-1).
  - It ran `check:py` → `check:api` → build → Playwright with `--workers=4` → smoke, and exited 0.
  - Backend: 755 passed, 98% coverage. e2e: 162 passed. Smoke: ok.
  - After the review patches: backend 755 passed, `tsc -b` and `oxlint` clean, and the 7 touched specs pass (89 tests).

## Review Triage Log

Blind Hunter, 15 findings:

- View tests changed client semantics (500 instead of a traceback, plus a fake clock). **Medium**, patched. `api_client` takes `raise_server_exceptions`, and the view tests pass `True`. Views don't read the clock.
- `COULDNT_SAVE_BODY` was added but 5 hand-built copies remained, and duplicate-book checked only the message. **Low**, patched. All six now compare the whole body.
- `assert_invariants` was added but 6 long-form calls remained. **Low**, patched.
- The new fault tests compared cover names, not bytes. **Low**, patched. Both compare the old cover's bytes.
- `create_temp`, `close` and `fsync_dir` steps, and a failed post-commit remove, are untested on these paths. **Low**, deferred to `deferred-work.md`: this goes beyond F-S4's three named gaps.
- `_temp_files` was oddly placed and the add branch used an inline copy. **Low**, patched. It now sits with the private helpers and both branches use it.
- The new tests use `tmp_path` as the data folder, not `tmp_path / "data"`. **Low**, rejected. These tests don't check for writes outside the data folder, and other fault tests in the suite seed `tmp_path / step` the same way.
- `intentOf` returned `{}` on no match, so an assertion that a key is absent could pass vacuously. **Medium**, patched. It throws now, and all 89 touched-spec tests pass.
- duplicate-dialog AC-8 still captured requests inline. **Low**, patched to `requestsTo`.
- Spine-popover's `DUNE_FORM` was misindented, sat between describes, and clashed in name with cover.spec's. **Low**, patched. It is now `DUNE_EDIT_FORM` among the constants.
- `AXE_TAGS`, `COULDNT_SAVE`, `DUNE_ISBN13` are still duplicated, the `ADD_BOOK` glob name clashes, and the spec's reason for keeping `AXE_TAGS` local was wrong. **Low**. The spec wording is fixed and the sharing is deferred (not named by the retro).
- Single-name imports were parenthesized, and `test_app.py` lost its Host-guard comment. **Low**, patched. Imports are collapsed and the comment is on `helpers.BASE_URL`.
- The `helpers.py` index docstring was incomplete and `field_messages` was untyped. **Low**, patched.
- `seed_dune_with_cover`'s stored color doesn't match its image. **Low** (pre-existing, now shared), patched: the docstring says it is a placeholder.
- Spec gaps: client semantics, `openEdit` scope, uncovered steps, full-check line, status. **Low**, patched in Implementation Notes; status is set at finalize.
