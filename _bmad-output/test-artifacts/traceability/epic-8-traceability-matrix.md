---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-11-13'
workflowType: 'testarch-trace'
traceTarget: 'epic 8'
gateType: 'epic'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources:
  - '_bmad-output/planning-artifacts/epics.md (TR7 :154; Epic 8 gate "per-epic quality gates (TR7), plus the 500-cover speed check in Story 8.1"; stories 8.1-8.3 :2089-2240)'
  - '_bmad-output/test-artifacts/test-design-qa.md (the Catalog Tiles surfaces of XUI-E2E-002 :252 and XUI-E2E-005 :278; it has no FR-25 scenario of its own)'
  - '_bmad-output/implementation-artifacts/epic-8-retro-2026-11-13.md (action 62)'
  - '_bmad-output/test-artifacts/atdd-checklist-8-1, 8-2 and 8-3 (story ACs and their priority markers; see "ATDD checklists")'
externalPointerStatus: 'not_used'
collectionStatus: 'COLLECTED'
sourceSha: '0d5157c'
---

# Traceability Matrix & Gate Decision: Epic 8, See the catalog as covers

**Target:** Epic 8, stories 8.1-8.3 (gate type: epic). This is Epic 8 retro action 62 (`epic-8-retro-2026-11-13.md`).
**Date:** 2026-11-13
**Evaluator:** Oleg (TEA Agent)
**Commit under trace:** `0d5157c` plus this trace's one test addition (below).
- That commit is the last story commit `3566aa9` plus two docs-only commits: the retro (`0a65bc8`) and the spine reconciliation (`0d5157c`, item 61).
- This trace changed no product code.

**Gate thresholds:**
- **Coverage:** TR7 (`epics.md:154`) requires P0 = 100% and P1 ≥ 95%. That is stricter than the workflow default of 90%, so TR7 applies. Overall coverage must be ≥ 80%.
- **Other TR7 clauses:** an API test for every error code, `check:api` clean, and coverage ≥ 90% on `domain/` and ≥ 80% on `intents/` + `store/`.
- **Epic 8 gate:** TR7 plus the 500-cover speed check in Story 8.1 (`epics.md`, Epic 8 **Gate**).

**Machine-readable:** `epic-8-e2e-trace-summary.json` and `epic-8-gate-decision.json`, both in this folder.

**Live verification results:** none on file. The retro's live behavior check (7 of 7 flows passed) is recorded in `epic-8-retro-2026-11-13.md`, not as a live results file, so it isn't counted here.

**Waiver register:** none on file.

### Test this trace added

Mapping XUI-E2E-002 ("intent in A visible in B after focus; refusals also invalidate") to the Epic 8 surface turned up one gap.

- **What was already proven:** the catalog view's focus refetch, since Epic 1.
- **What Tiles adds on top of it:** client state. Each tile's cover keeps its own load state (`TileCover`, keyed by `coverFile`), and the ribbon and bar are drawn from the view's `finished`, `spineColor` and `percent`.
- **The gap:** every Tiles test that changed the data did so in the same context and then navigated back to Catalog (`catalog-tile-marks-automate.spec.ts:148`, `:243`). No test brought a real intent from another context to an open Tiles view.

The trace closed it the way the Epic 5, 6 and 7 traces did:

- **`catalog-tile-marks-automate.spec.ts:269`**, `[P1] XUI-E2E-002 intents from another context reach the tiles once Catalog regains focus: the bar follows the new page and the ribbon the new spine color`.
  - **Setup:** Tiles is open, showing the Main book at 45% and finished Bleak House with its cover and a red ribbon.
  - **The other context:** a second browser context saves p.212 through `update-page` and sets Bleak House's spine color to blue through `set-spine-color`.
  - **After the first context regains focus:** the Main book's tile is named "… Main book, 64%" and its bar fills to 64%. The ribbon on the already loaded cover is blue, with no red left, and the `alert` region is empty.
- **Mutation check:** with `refetchOnWindowFocus` turned off for the catalog view (`frontend/src/api/views.ts` `useView`), the test fails, timing out on the 64% bar. It passes again once the file is restored. The SPA is rebuilt by the e2e global setup on each run. The mutation was reverted by restoring a saved copy, not with `git checkout` (Epic 8 retro item 64).
- **Burn-in:** 10 of 10 passed (`--repeat-each=10 --retries=0`).

---

## Gate Decision: PASS

**Rationale:**
- P0 coverage is 100% (6/6).
- P1 coverage is 100% (15/15), against the TR7 target of 95%.
- Overall coverage is 100% (25/25), against the minimum of 80%.
- The 500-cover speed check passes (AC-10, `catalog-tiles.spec.ts:595`).
- Every error code has an API test. Epic 8 added no error code.
- `check:api` is clean and the coverage gates hold.

### TR7 criteria and the Epic 8 gate

| Clause | Evidence | Status |
|---|---|---|
| P0 = 100% | 6/6 FULL (matrix below) | ✅ MET |
| P1 ≥ 95% | 15/15 FULL | ✅ MET |
| Every error code has an API test | "Error codes" below | ✅ MET |
| `check:api` clean | contract, Prettier, `tsc -b`, oxlint; 354 passed, 0 failed | ✅ MET |
| Coverage ≥ 90% `domain/`, ≥ 80% `intents/`+`store/` | `coverage_gate.py`: domain 100.00% (466/466 lines), intents+store 98.08% (1633/1665) | ✅ MET |
| 500-cover speed check (Epic 8 gate) | `catalog-tiles.spec.ts:595`: 500 Books with 800×1200 covers at 1280px in Chromium. The first screen decodes within the 1200 ms budget (story run: median 58 ms) with zero layout shift. Green in this trace's run. | ✅ MET |

### Run evidence

**Commit:** `0d5157c`, with this trace's test addition in the working tree (`catalog-tile-marks-automate.spec.ts`).

**Command:** `npm run check` (`check:py`, `check:api`, `check:e2e`, `check:smoke`, run one after the other).

**Result:** exit code 0, on the first run.

| Check | Outcome |
|---|---|
| pytest | 1573 passed |
| Coverage gates | domain 100.00% (466/466), intents+store 98.08% (1633/1665): ok |
| `check:api` | contract, Prettier, `tsc -b`, oxlint; 354 passed, 0 failed |
| Playwright | 666 passed (2.0 m), none flaky, retried or skipped. That is the retro's 665 plus this trace's test. |
| Smoke | isolated install served `/` and a deep link: ok |

---

## Oracle and scope

**Oracle.** TR7 states its P0/P1 percentages against the `test-design-qa.md` scenarios. That document predates FR-25: Epic 8 was planned on 2026-11-13, and the test design never gained a Tiles scenario. So the priority-bearing oracle is:

- each Epic 8 story AC from `epics.md`, at the priority of the ATDD test that owns it (the `[P0]`…`[P3]` marker in the test title and the ATDD checklist). Story 8.1 has 11 ACs, 8.2 has 7 and 8.3 has 5: 23 in all;
- the Catalog Tiles surfaces of the shared XUI rows:
  - XUI-E2E-002 (P1, two contexts; R-11);
  - XUI-E2E-005 (P2, empty states).

That makes 25 items. An AC's priority is the highest marker among its tests, so 8.2 · AC-6 and AC-7 (dark theme, forced colors) are P2 because only P2 tests own them.

**Out of scope, and why:**

- **XUI-E2E-001 and XUI-E2E-003** (couldn't save, no optimistic UI) need an intent. Epic 8 added none: it adds one `ShelfBook` field and client presentation only.
- **XUI-E2E-004** (tone) has no epic owner. Epic 8's copy is pinned by its exact strings ("Tiles, N books", the reused no-match lines).
- **Safari and Firefox.** The e2e suite runs Chromium only, which covers the one supported browser (AGENTS.md "Supported browser").
- **Label in Name (WCAG 2.5.3).** axe's `label-content-name-mismatch` is off for the tile links only. This is Oleg's decision in 8.1's review (`deferred-work.md` "Deferred from: build-auto review of spec-8-1…", `decision:`). Every other axe rule runs on Tiles (`catalog-pace-calculator.spec.ts:266`).

---

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status |
| --------- | -------------- | ------------- | ---------- | ------ |
| P0        | 6              | 6             | 100%       | ✅ PASS |
| P1        | 15             | 15            | 100%       | ✅ PASS |
| P2        | 4              | 4             | 100%       | ✅ PASS |
| P3        | 0              | 0             | n/a        | n/a |
| **Total** | **25**         | **25**        | **100%**   | **✅ PASS** |

**Tests mapped:** every test in the Epic 8 files, plus the Epic 8 edits to older specs.

- **Backend:** `test_bookcase_view.py` `test_ac1_p0_catalog_books_carry_their_cover_file_or_null` (new), and `test_views.py` `test_seeded_library` (its home and catalog payloads gained `coverFile`).
- **Unit (frontend):** `catalogView.test.ts:47` (AC-11) and `catalog.test.ts:413` (`tilesName`).
- **e2e (the six Epic 8 specs):** `catalog-tiles`, `catalog-tiles-automate`, `catalog-tile-marks`, `catalog-tile-marks-automate` (including this trace's test), `catalog-typeset-covers` and `catalog-typeset-covers-automate`.
- **e2e (Epic 8 edits to older specs):** `bookcase.spec.ts:44`, `bookcase-details.spec.ts:72`, `restore.spec.ts:104` and `catalog-pace-calculator.spec.ts:266` (axe in every view).

**By level:** the 8 Epic 8 files hold 61 tests.

| Level | Tests (Epic 8 files) | Criteria covered |
|---|---|---|
| e2e | 57 (`catalog-tiles`: 11; `catalog-tiles-automate`: 12; `catalog-tile-marks`: 12; `catalog-tile-marks-automate`: 8, including this trace's; `catalog-typeset-covers`: 7; `catalog-typeset-covers-automate`: 7) | 25 |
| API | 2 (1 new test; 1 parametrized test extended) | 1 |
| Unit | 2 (`catalogView.test.ts`: 1; `catalog.test.ts` `tilesName`: 1) | 2 |

**Skipped, fixme or pending:** none.

**Rejected evidence:** none. Every mapped test was read against its criterion.

### Detailed Mapping

Paths are relative to `frontend/e2e/` unless shown in full. `tiles` = `catalog-tiles.spec.ts`, `tiles-auto` = `catalog-tiles-automate.spec.ts`, `marks` = `catalog-tile-marks.spec.ts`, `marks-auto` = `catalog-tile-marks-automate.spec.ts`, `typeset` = `catalog-typeset-covers.spec.ts`, `typeset-auto` = `catalog-typeset-covers-automate.spec.ts`.

#### P0

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| 8.1 · AC-1 | Every catalog `ShelfBook` carries `coverFile` (null without a cover); Python first, `api:gen`, `check:api` | `backend/tests/test_bookcase_view.py:101`; `backend/tests/test_views.py:59` (home and catalog payloads); `check:api` compares the generated schema | FULL |
| 8.1 · AC-3 | A `list` "Tiles, N books"; `auto-fill minmax(140px, 1fr)`, 24/32px gaps, 7 columns at 1280px; each tile one link with a 2:3 box, an 11px bar slot, a one-line title and author; the link named by the spine-name builder | `tiles:224`, `:295` (5 at 1024, 8 at 1440), `:309` (twin keeps its edition under a filter); `tiles-auto:302` (dark caption); `tiles-auto:508` (box or caption click opens the Book); unit `catalog.test.ts:413` | FULL |
| 8.1 · AC-6 | Search, Sort and filters follow the same sorted array; hidden tiles close up; "N books match."; no-title, no-filter-match with Clear filters, and the empty shelf with New book | `tiles:461`; `tiles-auto:394` (every Sort under a search and a filter matches the bookcase's order) | FULL |
| 8.2 · AC-1 | A finished Book's ribbon: 16×24 with a 6px notch, from the visible cover's top, 10px from its right edge, exact `spineColor`, `spine-edge` line, `spine-label-strip` halo, no glyph; on the cover, not the box | `marks:142`, `:494` (not while loading; the box doesn't move), `:529` (cover isn't an image: ribbon at the box top), `:587` (narrow cover), `:615` (large wide and tall covers); `marks-auto:148` (follows a cover change), `:203` (legs and notch apex), `:348` (the rings don't clip it) | FULL |
| 8.2 · AC-2 | A 5px bar 6px below the box, the box's width, `accent-soft` track and `accent` fill to `percent` as is, square ends; `percent: null` leaves the slot empty | `marks:180`, `:553` (0% and 100%); `marks-auto:243` (follows Update page), `:268` (paused Up next) | FULL |
| 8.3 · AC-1 | A read Book without a cover: exact `spineColor` fill, 1px `spine-edge`, 4px corners, a `spine-label-strip` plate inset 10px and 34px from the top with the title (4 lines max) and first author; no text on the color; the ribbon clear of the plate | `typeset:81`, `:351` (empty first author); `typeset-auto:133` (WCAG text spacing), `:175` (large font stays in the box), `:275` (follows Change color), `:305` (becomes read on Mark finished), `:348` (pale color keeps its edge) | FULL |

#### P1

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| 8.1 · AC-2 | Bookcase (default) · List · Tiles toggle with `aria-pressed`, theme toggle's look; Tiles remembered under `bookvie.catalogView` (try/catch); junk → Bookcase; a restore neither brings nor replaces it | `tiles:188`; `tiles-auto:331` (junk), `:342` (throwing storage), `:373` (keyboard); `restore.spec.ts:104` (kept across a restore); `bookcase.spec.ts:44`; unit `catalogView.test.ts:47` | FULL |
| 8.1 · AC-4 | The cover at `/media/<coverFile>`, lazy, async, empty `alt`, whole at the box bottom with 4px corners and a 1px `line` hairline; `surface-inset` until it loads; the box never changes size | `tiles:333`; `tiles-auto:244` (forced-colors hairlines); `marks:494`, `:615` | FULL |
| 8.1 · AC-5 | A Book without a cover, or a cover that fails to load, shows a placeholder at the box size. Story 8.3 replaced the 8.1 placeholder with the typeset cover, as this AC foresaw, and the test now asserts the typeset cover. | `tiles:409`; `typeset:184`, `:314`; `typeset-auto:218`, `:243` | FULL |
| 8.1 · AC-7 | After an add in Tiles: a hiding search or filter is cleared; the new tile is scrolled into view, focused and ringed around its cover box (instant under reduced motion) | `tiles:514`; `tiles-auto:425` (×2: reduce → `auto`, no-preference → `smooth`), `:451` (clears a filter), `:473` (ring lasts `HIGHLIGHT_MS`), `:274` (forced colors) | FULL |
| 8.1 · AC-8 | After a delete, Catalog comes back in Tiles with Search titles focused | `tiles:549` | FULL |
| 8.1 · AC-9 | One Tab stop per tile in sort order; a 2px accent ring around the cover box; Enter opens Book detail | `tiles:567`; `bookcase-details.spec.ts:72` (toolbar Tab order); `tiles-auto:274` | FULL |
| 8.1 · AC-10 | 500 Books with 1200px covers: the grid and first screen of covers in about 1 s at 1280px; no layout shift while scrolling to the end | `tiles:595` (500 distinct cover URLs, fresh context; budget 1200 ms; CLS 0). Caveat in "Open risks" (E8-R1). | FULL |
| 8.1 · AC-11 | The unit and e2e tests that assumed two views cover three; Bookcase and List behave as before | unit `catalogView.test.ts:47`; `bookcase.spec.ts:44`; `bookcase-details.spec.ts:72`; `catalog-pace-calculator.spec.ts:266` (axe in all three views); the whole Bookcase and List suites green in the run above | FULL |
| 8.2 · AC-3 | A finished Book being re-read shows both the ribbon and the bar | `marks:241`; `marks-auto:284` (re-read as the Main book) | FULL |
| 8.2 · AC-4 | An unread Book with no Reading has no mark | `marks:261`; `marks-auto:306` (Up next never started; Side read) | FULL |
| 8.2 · AC-5 | The ribbon and the bar are `aria-hidden`; the status is in the link's name | `marks:296`; axe `catalog-pace-calculator.spec.ts:266` | FULL |
| 8.3 · AC-2 | An unread Book without a cover: `spine-unread-fill`, a 1.5px `spine-unread-outline`, `spine-unread-text`, no plate | `typeset:143`; `typeset-auto:133`, `:305` | FULL |
| 8.3 · AC-3 | A cover image that fails to load becomes the typeset cover for its read state | `typeset:184`, `:314` (loading is not typeset); `typeset-auto:218` (network failure), `:243` (Remove cover); `marks:529` | FULL |
| 8.3 · AC-5 | The Main book card, the Up next thumbnail and Book detail keep the no-cover placeholder | `typeset:270` | FULL |
| XUI-E2E-002 (Catalog Tiles surface) | Two contexts: an intent in A shows in B after focus | Intents from another context reach the tiles on focus: bar and ribbon follow `marks-auto:269` (this trace) | FULL |

#### P2

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| 8.2 · AC-6 | Dark theme: ribbon fill, halo and bar keep their meaning; `spine-edge` and chrome take their dark twins | `marks:355` | FULL |
| 8.2 · AC-7 | Forced colors: ribbon and bar fill `CanvasText` (`forced-color-adjust: none`), track `Canvas` with a `CanvasText` outline, halo `Canvas`, cover hairline `CanvasText` | `marks:383`; `tiles-auto:244` | FULL |
| 8.3 · AC-4 | Dark theme keeps the read fill and plate, while `spine-edge` and the unread colors take their twins; forced colors: `Canvas` box, `CanvasText` border and text | `typeset:223` | FULL |
| XUI-E2E-005 (Catalog Tiles surface) | Empty states | An empty library in Tiles shows the empty shelf and New book with no grid; no-title and no-filter matches replace the grid `tiles:461` | FULL |

### Error codes

TR7 requires an API test for every error code.

- `ErrorCode` (`backend/bookvie/intents/contract.py`) still has 18 values. Epic 8 added none, and no new intent, route or refusal.
- Its only server change copies the stored `cover_file` into `ShelfBook` (`views/shelf.py`, `_shelf_book`).
- The 18 codes were confirmed in the Epic 1-7 traces and are still green in the run above.

### Risks

`test-design-qa.md` links no risk to FR-25. XUI-E2E-002 is R-11 (stale views across tabs), closed by the Epic 4 gate; this trace's test extends its evidence to the Tiles view. Epic 8 closes no risk and opens none. The 500-cover speed check is the epic's own NFR7 check, not a registered risk.

### Coverage heuristics

- **Endpoints.** Epic 8 added no route. The catalog view's new `coverFile` is asserted in `test_bookcase_view.py:101` and `test_views.py:59`, and the generated type is checked by `check:api`. Gaps: 0.
- **Auth/authz negative paths.** No new route or intent. Status: not applicable.
- **Error paths.** No new refusal. The client's own failure states are pinned:
  - a cover that isn't an image (`marks:529`; `typeset:184`);
  - a network failure (`typeset-auto:218`);
  - junk or throwing storage (`tiles-auto:331`, `:342`).

  Status: present.
- **UI journeys and states.** Not applicable (formal oracle). The loading, no-cover, failed-cover, empty, no-match, refetch and focus states are pinned (matrix above).

### Gap analysis

| Category | Count |
|---|---|
| Critical (P0) | 0 |
| High (P1) | 0 |
| Medium (P2) | 0 |
| Low (P3) | 0 |
| Partial | 0 |
| Unit-only | 0 |

---

## ATDD checklists

Each checklist's open (`[ ]`) lines, counted before and after this trace with `grep -cF '[ ]'`:

| Checklist | `[ ]` before | `[ ]` after | Note |
|---|---|---|---|
| `atdd-checklist-8-1-see-my-catalog-as-covers.md` | 0 | 0 | |
| `atdd-checklist-8-2-see-what-i-ve-read-and-what-i-m-reading-on-the-tiles.md` | 0 | 0 | |
| `atdd-checklist-8-3-give-books-without-a-cover-a-typeset-cover.md` | 0 | 0 | |

Every line was ticked or retired by the stories' automate runs. No line is left open, so there is no checklist gap.

---

## Open risks (not coverage gaps)

These don't change the gate. Each one is in the retro or `deferred-work.md`.

- **E8-R1, AC-10 measures decode, not paint** (low). It counts a cover as done at `complete && naturalWidth > 0`, before the `onLoad` opacity switch, and only images whose 0×0 frame is inside the viewport. The headroom is about 20× (58 ms against 1200 ms). Retro: accept (watch).
- **E8-R2, `coversLoaded` passes on an empty grid** (low). Retro action 65 fixes it with the helper consolidation. No current leaf is affected.
- **Duplicated Tiles e2e helpers** (low, retro F-D1). Retro action 65.
- **Label in Name (WCAG 2.5.3) off for the tile links.** Oleg's decision (8.1 review); not a gap.
- **Two editions without a cover look identical on screen** (low). Recorded in `deferred-work.md` by the retro (E8-R5).
- **Flaky specs.** None in this trace's run or the retro's (665 passed). In the stories, build 8.2 hit and fixed one race in an 8.1 leaf, and caught an AC-10 layout-shift regression under 4 workers (retro PL-3, PL-5).

---

## Next actions

1. Retro actions 63, 64 and 66 (process guards, before the next story) and 65 (Tiles helpers).
2. **LOW:** run `/bmad-testarch-test-review` on the Epic 8 suites once action 65 lands. `catalog-tiles.spec.ts` (about 680 lines) and `catalog-tile-marks.spec.ts` (about 670) are the largest. Both are under the 1000-line limit in `test-quality.md`.
3. Sprint item `epic-8-retro-item-62-…` is marked done with this trace.

---

## Gate decision summary

```text
🚨 GATE DECISION: PASS

📊 Coverage Analysis:
- P0 Coverage: 100% (6/6) (Required: 100%) → MET
- P1 Coverage: 100% (15/15) (TR7 target: 95%, minimum: 80%) → MET
- Overall Coverage: 100% (25/25) (Minimum: 80%) → MET

✅ Decision Rationale:
P0 coverage is 100%, P1 coverage is 100% (TR7 target: 95%; workflow default 90%), and overall coverage is 100% (minimum: 80%). The 500-cover speed check passes. Epic 8 added no error code; every existing code keeps its API test. check:api is clean and the coverage gates hold. This trace added one e2e test (catalog-tile-marks-automate.spec.ts:269) for XUI-E2E-002 on the Tiles view.

⚠️ Critical Gaps: 0 (P0 criteria below FULL coverage)

📂 Full Report: _bmad-output/test-artifacts/traceability/epic-8-traceability-matrix.md

✅ GATE: PASS - Epic 8 meets TR7 and its speed check
```
