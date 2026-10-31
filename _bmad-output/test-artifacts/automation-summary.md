---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-10-31'
storyId: '1.12'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-1-12-delete-a-book.md
  - _bmad-output/test-artifacts/atdd-checklist-1-12-delete-a-book.md
  - _bmad/tea/config.yaml
  - frontend/e2e/delete-book.spec.ts, duplicate-dialog.spec.ts, book-detail.spec.ts, fixtures.ts
  - frontend/src/lib/useAlertDialog.ts, components/ConfirmDialog.tsx (+ .module.css), lib/bookDetail.test.ts (roleLine)
  - backend/bookvie/domain/invariants.py, views/models.py
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

# Automation Summary: Story 1.12, Delete a book

The Story 1.11 summary that used to live in this file is in git history (`f7e83fb`).

**Execution mode:** BMad-Integrated (story spec with its review findings + ATDD checklist).
**Detected stack:** fullstack (`backend/pyproject.toml` + `frontend/playwright.config.ts`).
**Playwright Utils mandate:** off (`tea_use_playwright_utils: false`), so the vanilla `fixture-architecture` / `network-first` patterns apply.
**Pact.js Utils mandate:** not applicable (the repo has no contract testing).
**Subagent execution:** SEQUENTIAL. Four E2E targets in one existing file cost less to write inline. No API worker was needed (see the level split).
**Total tests added:** 4 (E2E 4). Backend unchanged at 549; e2e 131 → 135, all green.
**Browser exploration:** skipped. `playwright-cli` is not installed, and every selector reuses a role or name the green ATDD tests already pin.

## Coverage Plan by Test Level and Priority

Scope: **selective**. The targets are the ATDD checklist's three unticked green-phase follow-up lines. Parts of them were already closed during implementation and review: Up next beating a paused Reading and the Tab cycle (`[P2] AC-1 Up next with a paused Reading…`), and the server side of the role line (`test_views.py`, including the paused Side read).

| # | Target | Level | Priority |
|---|---|---|---|
| 1 | Flow 8's failure path: Add anyway → the copy's Book detail → Delete → the copy is gone and the original stays, checked by id | E2E | P1 |
| 2 | AC-1 / AC-2: the dialog is `:modal` (page behind inert); both live regions move inside it and are emptied on open (stale text seeded first), and return to the shell on close; a non-paused Side read gets no role line | E2E | P2 |
| 3 | AC-1 / AC-4: axe WCAG 2.2 AA on the open Confirm dialog in light and dark, both with a role line and with the couldn't-save line shown | E2E | P2 |
| 4 | AC-1: a long title wraps in the dialog heading (no horizontal overflow, two lines or more), and the dialog and its Cancel stay in the viewport | E2E | P3 |

Level split: everything delete-book does to the library is already proven at API (`test_delete_book.py`), and `roleLine` mapping is unit-tested (`bookDetail.test.ts`). What was left is wiring, focus, modality, live regions and computed style, which need a real browser. Target 1 is P1 because it is the story's stated problem (an accidental duplicate) end to end; the ATDD checklist listed it as a follow-up without a priority.

## Files Updated

| File | Change |
|---|---|
| `frontend/e2e/delete-book.spec.ts` | Imports `AxeBuilder`; `AXE_TAGS`, `COULDNT_SAVE_BODY` (now also used by the two existing 503 routes); `catalogBooks` (`[id, title]`) and `settled` helpers; `CatalogBody` carries `id`; the 4 tests above |
| `_bmad-output/test-artifacts/atdd-checklist-1-12-delete-a-book.md` | Ticked the AC-1, AC-2 and Flow 8 follow-ups; Next Steps 3 marked done |

No new fixtures or factories. Seeds go through `seededServer({…})`, as before; target 2 extends `ROLES_LIBRARY` with `sideReadBookIds` and a Reading for Piranesi.

## Validation

- `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/delete-book.spec.ts --repeat-each=3 --retries=0`: 39 passed (no flake).
- `TZ=Europe/Madrid npm run check`: exit 0. Backend 549 passed, frontend unit tests 0 skipped, e2e 135 passed, smoke passed.
- `tsc -b` and `oxlint` clean.

**Finding during generation (test fix, not a product defect):** the first Flow 8 run timed out waiting for the Duplicate dialog, because the panel refused the add for missing Language and Publisher. The test now fills every required field, as `duplicate-dialog.spec.ts` does.

Checklist: framework ready; every target maps to a criterion or follow-up; tests use roles and exact names, no test ids, no hard waits, and each test seeds its own server; no CLI sessions were opened; no temp artifacts outside `{test_artifacts}` or the session scratchpad.

## Key Assumptions and Risks

- Target 2 seeds stale text by writing straight into the shell's regions with `page.evaluate`. It proves `clearAnnouncements()` runs on open, not that a real earlier announcement is dropped. The earlier real-announcement path is covered by the review's Cancel-after-couldn't-save fix.
- Target 4's long title has ordinary words only. A single unbroken token wider than the dialog is not pinned; whether it should break is a design call (DESIGN.md says "wrap", not `overflow-wrap: anywhere`).
- Target 3 waits for `getAnimations()` before the first axe run, as in `book-detail.spec.ts`; a JS-driven animation would bypass it.
- Flow 8 finds the copy as "the Dune whose id isn't the seeded one", so it relies on the seed's explicit id for the original.

## Next Recommended Workflow

- `bmad-testarch-trace` for Story 1.12, to update the traceability matrix and gate with these tests.
- `bmad-testarch-test-review` on `delete-book.spec.ts` if you want a second look; it is now 13 tests and about 540 lines.
