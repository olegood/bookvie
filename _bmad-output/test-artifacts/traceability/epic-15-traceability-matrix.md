---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-11-25'
workflowType: 'testarch-trace'
traceTarget: 'epic 15'
gateType: 'epic'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources:
  - '_bmad-output/planning-artifacts/epics.md (TR7 :237; Epic 15 and its gate :3662-3666; Stories 15.1-15.2 :3674-3746)'
  - '_bmad-output/implementation-artifacts/spec-15-1-carry-the-publisher-in-the-catalog-view.md'
  - '_bmad-output/implementation-artifacts/spec-15-2-filter-the-catalog-by-publisher.md'
  - '_bmad-output/implementation-artifacts/spec-epic-15-retro-item-105-prune-rawfilters-when-livefilters-drops-a-key.md (supplementary, not counted)'
  - '_bmad-output/implementation-artifacts/epic-15-retro-2026-11-25.md (action 106; findings E15-S1, E15-R1 to E15-R5)'
  - '_bmad-output/test-artifacts/atdd-checklist-15-1-*.md, atdd-checklist-15-2-*.md, atdd-checklist-epic-15-retro-item-105-*.md (AC priorities)'
externalPointerStatus: 'not_used'
collectionStatus: 'COLLECTED'
sourceSha: '5ec06d4'
---

# Traceability Matrix & Gate Decision: Epic 15, See one publisher's shelf

**Target:** Epic 15, Stories 15.1 and 15.2 (gate type: epic). This is Epic 15 retro action 106 (`epic-15-retro-2026-11-25.md`, "Action items").
**Date:** 2026-11-25
**Evaluator:** Oleg (TEA Agent)
**Commit under trace:** `5ec06d4`. It includes retro item 105's fix (`d331b2c`), its review (`aae8050`) and its automate (`6fc451f`). `backend/`, `frontend/src` and `frontend/package.json` are identical at `aae8050` and `5ec06d4`, so the full `npm run check` on `aae8050` content stands for the product under trace.

**Gate thresholds:**
- **Coverage:** TR7 (`epics.md:237`) requires P0 = 100% and P1 ≥ 95%, stricter than the workflow default of 90%, so TR7 applies. Overall must be ≥ 80%.
- **Other TR7 clauses:** an API test for every error code, `check:api` clean, and coverage ≥ 90% on `domain/` and ≥ 80% on `intents/` + `store/`.
- **Epic 15 gate** (`epics.md:3666`), as reconciled by retro item 102. It requires TR7 plus the plan's P0 risks green:
  - Publisher filters the bookcase, the list and the tiles, ORs within the chip and ANDs with the other chips and Search titles;
  - the list is ordered by library count with ties A–Z;
  - neither the counts nor the order move when other filters or the search change;
  - the existing catalog-filter e2e specs pass unchanged with Publisher untouched, except the two named leaves that Tab along the row (`catalog-filter.spec.ts` AC-4's Clear filters stop and `bookcase-details.spec.ts`'s toolbar Tab sequence).

**Machine-readable:** `epic-15-gate-decision.json` in this folder.

**Live verification results:** none on file and none needed. Epic 15 has no manual AC and no Mac check (`epics.md:3670`).

**Waiver register:** `_bmad-output/test-artifacts/gate-waivers.md` holds no waiver against Epic 15, and none is needed.

**Tests added by this trace:** none. No product code, test or checklist was changed.

---

## Gate Decision: PASS

**Rationale:**
- **P0 coverage is 100% (5/5), P1 is 100% (7/7), overall 100% (12/12)** of the 12 Story 15.1 and 15.2 ACs. TR7's P0 = 100% and P1 ≥ 95% hold, and overall is above 80%. By the workflow's rule 4, the derived decision is **PASS**. No live evidence and no waiver are involved.
- **Every gate P0 risk is green** against tests that ran green in this trace (see "Epic 15 P0 risks" and "Run evidence").
- **The retro's one risk that the gate would have carried, E15-R1, is fixed.** A dropped filter check no longer comes back when a Book gets the value back (retro item 105, `done`). Its six leaves ran green here.
- **One open item is outside the counted ACs and doesn't lower the decision:** the AD-6 spine-drift entry that item 105 opened in `deferred-work.md` ("Deferred from: build-auto review of spec-epic-15-retro-item-105-…"). AGENTS.md ("Architecture spine") requires that spine reconciliation before Epic 16's first story, and `bmad-build-auto` stops there until it lands.

### TR7 criteria and the Epic 15 gate

| Clause | Status | Evidence |
|---|---|---|
| P0 = 100% | MET (5/5) | "Coverage Summary" |
| P1 ≥ 95% | MET (7/7) | "Coverage Summary" |
| Every error code has an API test | MET, nothing new | Epic 15 adds one field (`ShelfBook.publisher`: `views/models.py`, `views/shelf.py`) and no error code |
| `check:api` clean | MET | `npm run check:api` exit 0 in this session, after the last test change (Prettier, oxlint, `tsc -b`, 425 unit tests, `schema.d.ts` byte comparison) |
| Coverage ≥ 90% `domain/`, ≥ 80% `intents/` + `store/` | MET | `check:py`'s coverage gate passed in this session's full `npm run check` on `aae8050` content (2515 pytest), the same backend as `5ec06d4` |
| Plan's P0 risks green | MET | Next table |

### Epic 15 P0 risks

| Risk | Status | Tests (all green in this trace) |
|---|---|---|
| Publisher filters the bookcase, the list and the tiles; ORs within the chip, ANDs with the other chips and Search titles | GREEN | `catalog-publisher-filter.spec.ts:328` (15.2 AC-4: bookcase, then List and Tiles; Manning + O'Reilly Media; Manning + Unread + "in"); unit `catalogFilter.test.ts:75`, `:79` |
| The list is ordered by library count, ties A–Z | GREEN | `catalog-publisher-filter.spec.ts:224` (15.2 AC-2, `COUNT_SHELF` 84/49/49/1 with library order and A–Z both differing from the expected order); unit `catalogFilter.test.ts:117` (`publisherValues`) |
| Counts and order don't move under other filters or the search | GREEN | `catalog-publisher-filter.spec.ts:309` (15.2 AC-3: Unread, Tag "ops" and "book 1" on, list still `COUNT_ROWS`) |
| Existing catalog-filter specs unchanged except the two named Tab leaves | GREEN | `git diff 36b71f9~1 5ec06d4` on `catalog-filter.spec.ts` and `bookcase-details.spec.ts`: the only edits inside a leaf are `catalog-filter.spec.ts` AC-4's `tagChip(page).focus()` → `publisherChip(page).focus()` (and its comment), and `bookcase-details.spec.ts:95`'s Tab list gaining `'Publisher'`. Every other change is the Story 7.2 helpers moving to `e2e/catalog-filter.ts` with their imports. Both specs pass (below). |

### Run evidence

Run in this session on 2026-11-25:

| Run | Commit content | Result |
|---|---|---|
| `TZ=Europe/Madrid npx playwright test e2e/catalog-publisher-filter.spec.ts e2e/catalog-filter.spec.ts e2e/bookcase-details.spec.ts` | `5ec06d4` | 56 passed, none skipped or flaky (18 of them in `catalog-publisher-filter.spec.ts`: 8 ATDD, 4 automate, 6 item 105) |
| `uv run pytest tests/test_catalog_publisher.py tests/test_catalog_publisher_follow_ups.py tests/test_views.py tests/test_card_notes_spine_color.py` | `5ec06d4` | 39 passed |
| `node --test src/lib/catalogFilter.test.ts` | `5ec06d4` | 26 passed |
| `npm run check:api` | `5ec06d4` | exit 0 |
| `npm run check` (full) | `aae8050` (same product as `5ec06d4`) | exit 0: 425 unit, 2515 pytest with the coverage gate, 892 e2e, smoke |

The two leaves item 105's automate added after the full run (`:812`, `:846`) are in the 56 above.

---

## Oracle and scope

- **Oracle:** formal acceptance criteria, `epics.md` Stories 15.1 (4 ACs) and 15.2 (8 ACs), numbered AC-1 onward in source order, as the specs and ATDD checklists number them. Priorities come from the ATDD checklists' Test Strategy tables.
- **Counted:** the 12 story ACs.
- **Supplementary, not counted:** retro item 105's spec (3 ACs). It is a post-epic fix, not an Epic 15 story; it is traced below because it closes E15-R1.
- **Out of scope** (`epics.md`, Epic 15 "Out of scope"): grouping, a Book-detail link to the filtered Catalog, a Publisher argument on `list_catalog`, a search field in the popups, and Safari or Firefox behavior.

---

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

| Priority | ACs | FULL | Coverage |
|---|---|---|---|
| P0 | 5 | 5 | 100% |
| P1 | 7 | 7 | 100% |
| **Total** | **12** | **12** | **100%** |

### Detailed Mapping

#### Story 15.1: Carry the publisher in the catalog view

| AC | Priority | Coverage | Tests |
|---|---|---|---|
| AC-1 every `ShelfBook` carries the stored, trimmed `publisher`; an edit shows on the next fetch | P0 | FULL | `test_catalog_publisher.py:110`; follow-ups `test_catalog_publisher_follow_ups.py:23` (a padded add is trimmed), `:50` (after a restore) |
| AC-2 `schema.d.ts` gives `ShelfBook` a required `publisher: string`; `check:api` byte comparison; fixtures through shared helpers | P0 | FULL | `test_catalog_publisher.py:142` (schema.d.ts and OpenAPI); `check:api` exit 0 (byte comparison); fixtures in `backend/tests/helpers.py`, `test_views.py` and `e2e/intents.ts` through the shared helpers |
| AC-3 `list_catalog` carries `publisher`; its description and arguments don't change | P1 | FULL | `test_catalog_publisher.py:160`; follow-up `test_catalog_publisher_follow_ups.py:79` (an agent edit shows in the next `list_catalog`) |
| AC-4 nothing visible changes; the existing catalog, home-slice and catalog-filter specs pass unchanged | P1 | FULL | `test_catalog_publisher.py:182` (read-only: `library.json` byte-identical, stored keys unchanged); the full e2e suite (892 passed); the catalog-filter edits are the two Tab leaves from 15.2, not 15.1 (see the P0 risks table) |

#### Story 15.2: Filter the catalog by publisher

| AC | Priority | Coverage | Tests |
|---|---|---|---|
| AC-1 the chip row order; the popup is the same list, `body-sm`/`ink`, ≤ 320px, scrolling | P1 | FULL | `catalog-publisher-filter.spec.ts:176`; automate `:543` (axe, both themes, dark tokens), `:621` (a long name stays on one line) |
| AC-2 ordered by count, ties by collator; count after the name, one space, `ink-tertiary`; Language and Tag show no count | P0 | FULL | `:224`; `:543` (dark), `:621`; unit `catalogFilter.test.ts:117` |
| AC-3 counts and order are the whole library's under other filters and the search | P0 | FULL | `:309` |
| AC-4 Manning only in bookcase, List and Tiles; hidden, not dimmed; "Publisher: 1"; the announcement; OR; AND | P0 | FULL | `:328`; automate `:572` (no match shows the empty line and Clear filters), `:595` (each change re-announces); unit `catalogFilter.test.ts:75`, `:79` |
| AC-5 case variants are one row with the first spelling, counting and matching both | P1 | FULL | `:371`; unit `catalogFilter.test.ts:117` (`publisherValues` case merge) |
| AC-6 the last Manning Book edited away: the stale check is dropped, Manning leaves the list, the Catalog isn't left empty | P1 | FULL | `:403`; unit `catalogFilter.test.ts:196`, `:202`; item 105's leaves (below) now also forget the check |
| AC-7 Clear filters, reload, add turn it off; never stored, never in an export, never on Home's slice or the meter | P1 | FULL | `:443`. "Never in an export": the leaf pins no storage key and no request but the add; the export is built on the server from `library.json`, which 15.1 AC-4 (`test_catalog_publisher.py:182`) pins unchanged. The ATDD checklist recorded this wording for the review. |
| AC-8 each row a checkbox named by its text plus the noun; the chip opens, closes on Esc and returns focus as Language and Tag do | P1 | FULL | `:496` |

#### Supplementary: Epic 15 retro item 105, forget a dropped filter check (not counted)

| AC | Priority | Coverage | Tests |
|---|---|---|---|
| AC-1 a dropped key that comes back is listed unchecked, has no count on its chip and filters nothing | P1 | FULL | `catalog-publisher-filter.spec.ts:700` (Publisher), `:749` (Tag), `:781` (partly dropped), `:812` (Language), `:846` (re-checking holds) |
| AC-2 a refetch that is loading or fails keeps the check | P2 | FULL | `:730` (a failed refetch; "loading" can't be reached once loaded, as the spec records) |
| AC-3 `npm run check` passes and the existing leaves pass unchanged | — | FULL | the full check on `aae8050` content; the 56-leaf run above |

Mutation evidence: with the prune line in `CatalogPage.tsx:175` disabled by hand, the five AC-1 leaves fail and AC-2 passes (item 105's review and automate, this session).

### Coverage heuristics

- **Error paths:** a failed catalog refetch is covered (`:730`). No new error code or refusal exists in Epic 15.
- **Accessibility:** axe in both themes with the list open (`:543`), accessible names (`:496`), keyboard and focus return (`:496`).
- **Known accepted risks from the retro, not ACs:** E15-R2 (rows can reorder under an open list on a focus refetch), E15-R3 (spellings that differ beyond case stay separate rows), E15-R4 (a very long name can push the popup past the right edge), E15-R5 (the schema test pins exact field equality). The retro accepted each; none leaves a stated scenario untested.

### Rejected evidence

None. Every test cited above ran green in this session.

### ATDD checklists

| Checklist | `[ ]` before | `[ ]` after |
|---|---|---|
| `atdd-checklist-15-1-carry-the-publisher-in-the-catalog-view.md` | 0 | 0 |
| `atdd-checklist-15-2-filter-the-catalog-by-publisher.md` | 0 | 0 |
| `atdd-checklist-epic-15-retro-item-105-prune-rawfilters-when-livefilters-drops-a-key.md` | 0 (closed by item 105's automate, `6fc451f`) | 0 |

No open line remains, so no checklist gap is carried into the gate.

---

## PHASE 2: GATE

### Gaps and recommendations

- **Coverage gaps:** none.
- **Open before Epic 16:** reconcile ARCHITECTURE-SPINE.md AD-6 with item 105's prune, closing the "spine drift (AD-6)" entry in `deferred-work.md` with a `resolved:` line (AGENTS.md "Architecture spine"). No sprint action item names this yet; the Epic 15 retro's spine item predates item 105's drift.

### Waiver register review

No waiver is filed or needed.

### Next actions

1. Retro item 106 is marked `done` in `sprint-status.yaml` with this trace.
2. Reconcile the spine (AD-6) before Epic 16's first story.

---

## Gate summary

**PASS.** 12/12 ACs FULL (P0 5/5, P1 7/7), every TR7 clause met, every Epic 15 P0 risk green, the retro's E15-R1 fixed and tested. Epic 16 can start once the AD-6 spine reconciliation lands.
