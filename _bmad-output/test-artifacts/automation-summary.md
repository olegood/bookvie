---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-01'
storyId: '1.13'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-1-13-add-a-cover.md
  - _bmad-output/implementation-artifacts/deferred-work.md (build review of spec-1-13, B8)
  - _bmad-output/test-artifacts/atdd-checklist-1-13-add-a-cover.md
  - _bmad/tea/config.yaml
  - frontend/e2e/cover.spec.ts, delete-book.spec.ts, fixtures.ts
  - frontend/src/api/intents.ts, envelope.ts; components/SwatchRow.tsx
  - backend/bookvie/http/api.py (CoverSizeCap), tests/builder.py
  - backend/tests/test_cover.py, test_cover_color.py, test_contract.py, test_views.py, test_migrations.py (existing coverage)
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

# Automation Summary: Story 1.13, Add a cover

The Story 1.12 summary that used to live in this file is in git history (`e0a4cde`).

**Execution mode:** BMad-Integrated (story spec with its review findings, the deferred-work log, and the ATDD checklist).
**Detected stack:** fullstack (`backend/pyproject.toml` + `frontend/playwright.config.ts`).
**Playwright Utils mandate:** off (`tea_use_playwright_utils: false`), so the vanilla `fixture-architecture` / `network-first` patterns apply.
**Pact.js Utils mandate:** not applicable (the repo has no contract testing).
**Subagent execution:** SEQUENTIAL. Three E2E targets in one existing file cost less to write inline. No API worker was needed (see the level split).
**Total tests added:** 3 (E2E 3). Backend unchanged at 593; e2e 143 → 146, all green.
**Browser exploration:** skipped. `playwright-cli` is not installed, and every selector reuses a role or name the green ATDD tests already pin.

## Coverage Plan by Test Level and Priority

Scope: **selective**. Every ATDD green-phase follow-up was ticked during the build, and the API side is broad (40+ tests across `test_cover.py`, `test_cover_color.py`, `test_contract.py`, `test_views.py` and `test_migrations.py`). Three gaps were left: one deferred item, one spec-level criterion with no test, and one rejected review note.

| # | Target | Source | Level | Priority |
|---|---|---|---|---|
| 1 | AC-2 / R-14: a cover over 20 MB chosen in the New book panel shows "Cover must be 20 MB or smaller." on Cover in Chromium, not "Couldn't save". Two sizes cover both cap branches: 21 MiB is refused on `Content-Length`, and 20 MiB + 1 byte is parsed and then refused on the part. Nothing added, `covers/` empty | `deferred-work.md` (B8, "settle it with a Playwright upload against the built bookvie") | E2E | P1 |
| 2 | Spec acceptance: in the app, add (New book), replace, Remove cover, then a cover again and Delete. After each step, `covers/` on disk equals the `coverFile`s in `library.json`. The minted name is `covers/<book-id>-<uuid>.jpg`, and replacing drops the old file | Spec "Acceptance Criteria" line 2, previously untested end to end | E2E | P1 |
| 3 | AC-9: the From cover chip's dot is the view's `spineColorFromCover` (computed `background-color`). A grayscale cover still shows the chip, pressed, with no dot | Review "Rejected": "black-and-white with no dot is untested" | E2E | P3 |

Level split: everything the server does with bytes, sizes and files is already proven at API, including the cap at ASGI level and with `TestClient`. What was left needs a real browser and a real uvicorn: how Chromium handles an early 413 on a large upload, the UI driving the whole file lifecycle, and computed style. Target 1 is P1 because a reset would show the wrong message for a likely user mistake (a phone photo over 20 MB). Target 2 is P1 because it is the story's own acceptance line for R-03/AD-12 data safety. Target 3 is P3: it is cosmetic.

## Files Updated

| File | Change |
|---|---|
| `frontend/e2e/cover.spec.ts` | Imports `node:fs` / `node:path`; `DELETE_BOOK`, `MIB`, `BLUE_PNG`, `GRAY_PNG`; `library`, `onDisk`, `referenced` (read the server's data folder) and `rgbOf` helpers; the 3 tests above |
| `_bmad-output/implementation-artifacts/deferred-work.md` | The B8 entry is marked settled by target 1 |

No new fixtures or factories. Seeds go through `seededServer({…})`. Covers are attached through the UI (target 2) or through the existing opaque `attachCover` / `page.request` multipart setup (target 3). The two new PNGs are 40×60 solid fills, made with Pillow and embedded as base64 like `COVER_PNG`.

## Validation

- `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/cover.spec.ts --retries=0`: 11 passed on the first run.
- Burn-in: the 3 new tests with `--repeat-each=3 --retries=0`: 9 passed (no flake).
- `TZ=Europe/Madrid npm run check`: exit 0. Backend 593 passed, frontend unit tests 0 skipped, e2e 146 passed, smoke ok.
- `tsc -b` and `oxlint` clean.

**Finding (resolves a deferred item, no product defect):** B8 does not reproduce. In Chromium against the built bookvie, both cap branches return a readable 413, and the panel shows the Cover field error.

Checklist: framework ready; every target maps to a criterion, a deferred item or a review note; tests use roles and exact names, no test ids, no hard waits, and each test seeds its own server; data-folder reads are read-only and happen after the response has been awaited; no CLI sessions were opened; temp files went to the job scratchpad only.

## Key Assumptions and Risks

- Target 1 holds for Chromium on loopback, which is the only browser project and how bookvie runs. Firefox or Safari, or a slow link where the reset arrives before the response is read, are not pinned.
- Target 1 depends on the client always sending `Content-Length`. It does, because `intents.ts` buffers file forms. If streaming uploads are ever adopted, the counted-bytes branch is the one a browser hits, and this test should be re-checked.
- Target 2 reads `library.json` and `covers/` straight from `server.dataDir`, so it couples to the on-disk layout (AD-12's `covers/<name>`). That layout is the point of the test.
- Target 3 finds the dot as the chip's only `aria-hidden` child. If the chip gains another decorative element, the locator needs a class or a more specific selector.

## Next Recommended Workflow

- `bmad-testarch-trace` for Story 1.13, to update the traceability matrix and gate with these tests and the closed B8.
- `bmad-testarch-test-review` on `cover.spec.ts` (now 11 tests, about 540 lines) and `test_cover.py` (about 900 lines) if you want a second look at size and helper sharing.
