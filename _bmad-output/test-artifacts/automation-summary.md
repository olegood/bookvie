---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-10-31'
storyId: '1.11'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-1-11-open-and-edit-a-book.md
  - _bmad-output/test-artifacts/atdd-checklist-1-11-open-and-edit-a-book.md
  - _bmad-output/implementation-artifacts/deferred-work.md (Story 1.11 entry)
  - _bmad/tea/config.yaml
  - frontend/e2e/book-detail.spec.ts, new-book-panel.spec.ts, duplicate-dialog.spec.ts, bookcase.spec.ts, bookcase.ts, fixtures.ts
  - frontend/src/lib/catalog.ts (tagSuggestions, pickTag)
  - backend/tests/test_edit_book.py, backend/bookvie/domain/duplicates.py, domain/book_fields.py
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
  - knowledge/fixture-architecture.md
  - knowledge/network-first.md
  - knowledge/playwright-cli.md
---

# Automation Summary: Story 1.11, Open and edit a book

The Story 1.10 summary that used to live in this file is in git history (`5a72591`).

**Execution mode:** BMad-Integrated (story spec + ATDD checklist + deferred-work entry)
**Detected stack:** fullstack (`backend/pyproject.toml` + `frontend/playwright.config.ts`).
**Playwright Utils mandate:** off (`tea_use_playwright_utils: false`), so the vanilla `fixture-architecture` / `network-first` patterns apply.
**Pact.js Utils mandate:** not applicable (the repo has no contract testing).
**Subagent execution:** SEQUENTIAL. Five small targets in two existing files cost less to write inline.
**Total tests added:** 6 (API 2, E2E 4). Backend 533 → 535, e2e 118 → 122, all green.
**Browser exploration:** skipped. `playwright-cli` is not installed, and every selector reuses a role or name the green ATDD tests already pin.

## Coverage Plan by Test Level and Priority

Scope: **selective**. The targets are the ATDD checklist's unticked green-phase follow-ups and the code review's one deferred item. The other follow-ups were already closed by tests added during implementation and review (no-subtitle/ISBN/Year rows, several authors, unknown id, "Started … · Finished …", Cancel/Close/Esc).

| # | Target | Level | Priority |
|---|---|---|---|
| 1 | AC-3: rewriting a Book's ISBN as the ISBN-10 of the same number saves as typed, and back; an ISBN-10 onto another Book's ISBN-13 is `duplicate_book` | API | P2 |
| 2 | CAT-E2E-007 (Flow 9) + AC-11 in E2E: a swatch and a back-fill saved through Edit show on the bookcase spine (Clay fill, "finished") and in the meter; reopening Edit prefills both; the live regions start empty | E2E | P1 |
| 3 | AC-2: Tags suggestions work in edit mode, and the picked tag is saved (review deferral) | E2E | P2 |
| 4 | AC-4: Esc on Possible duplicate acts as **Don't save**; Tab and Shift+Tab cycle its two buttons | E2E | P2 |
| 5 | AC-1 / AC-4: axe AA in light and dark on Book detail, the open Edit book panel and the edit-mode duplicate dialog | E2E | P2 |

Level split: the ISBN rule is server logic, so it is tested at API level only. The rest is wiring, focus and computed style, which need a real browser. Not targeted: "Back keeps the search" (the 1.11 review rejected it as outside the spec), and the cover-color reset (done at API; the checklist says repeat in E2E only if the panel logic grows).

## Files Updated

| File | Change |
|---|---|
| `backend/tests/test_edit_book.py` | `DUNE_ISBN10` constant; `test_rewriting_the_isbn_as_its_isbn10_saves_as_typed_without_matching_itself`, `test_an_isbn10_edit_onto_another_books_isbn13_is_a_duplicate` |
| `frontend/e2e/book-detail.spec.ts` | Imports `AxeBuilder` and `spine` / `viewToggle` from `bookcase.ts`; `CLAY`, `AXE_TAGS` constants; `settled(locator)` helper; the 4 E2E tests above |
| `_bmad-output/test-artifacts/atdd-checklist-1-11-open-and-edit-a-book.md` | Ticked the AC-1, AC-2, AC-3 (ISBN), AC-4, AC-11 and CAT-E2E-007 follow-ups; noted "search kept" as dropped |
| `_bmad-output/implementation-artifacts/deferred-work.md` | Marked the 1.11 Tags-suggestions deferral closed |

No new fixtures or factories. Seeds go through `seededServer({…})` and `library_builder`, as before.

## Validation

- `cd backend && TZ=Europe/Madrid uv run pytest tests/test_edit_book.py -k isbn10`: 2 passed.
- `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/book-detail.spec.ts`: 13 passed, three runs in a row (no flake).
- `TZ=Europe/Madrid npm run check`: exit 0. Backend 535 passed; frontend unit tests pass with 0 skipped; e2e 122 passed; build and smoke pass.

**Finding during generation (test fix, not a product defect):** the first axe run on the Edit book panel reported 22 `color-contrast` nodes in light theme. A probe showed they exist only while the panel's open animation is running (white text over a half-faded accent, labels at partial opacity). Once settled, axe finds nothing, and the New book panel is clean too. The test now waits on `element.getAnimations({ subtree: true })` to finish before each axe run, with no fixed sleep. The probe spec was deleted.

Checklist: framework ready; every target maps to a criterion or a deferral; tests use roles and exact names, no test ids, no hard waits, and each test seeds its own server; no CLI sessions were opened; no temp artifacts outside `{test_artifacts}` or the session scratchpad.

## Key Assumptions and Risks

- Target 2 asserts that a finished spine's fill is the user color exactly (`rgb(155, 103, 83)`), relying on Story 1.10 AC-3 ("read in exact color"). If spine rendering later tints finished spines, this test needs the new rule.
- `settled()` relies on the panel and dialog using CSS transitions or animations, which `getAnimations()` reports. A JS-driven animation would bypass it and bring back the mid-fade contrast noise.
- The Tags test expects the suggestions for the last comma segment only (`tagSuggestions`). The existing tag "sci-fi" is not re-suggested because "cl" doesn't match it, so the test doesn't pin whether tags already in the field are filtered out.

## Next Recommended Workflow

- `bmad-testarch-trace` for Story 1.11, to update the traceability matrix and gate with these tests.
- `bmad-testarch-test-review` on `book-detail.spec.ts` if you want a second look. It is now 13 tests and about 610 lines.
