---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-11-26'
workflowType: 'testarch-trace'
traceTarget: 'epic 16'
gateType: 'epic'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources:
  - '_bmad-output/planning-artifacts/epics.md (TR7 :250; Epic 16 and its gate :3774-3790; Stories 16.1-16.2 :3792-3930)'
  - '_bmad-output/implementation-artifacts/spec-16-1-star-a-book.md'
  - '_bmad-output/implementation-artifacts/spec-16-2-show-only-my-favourites.md'
  - '_bmad-output/implementation-artifacts/spec-epic-16-retro-item-107-clear-a-stuck-pending-unstar.md (supplementary, not counted)'
  - '_bmad-output/implementation-artifacts/epic-16-retro-2026-11-26.md (action 109; findings E16-R1, E16-S1)'
  - '_bmad-output/test-artifacts/atdd-checklist-16-1-*.md, atdd-checklist-16-2-*.md, atdd-checklist-epic-16-retro-item-107-*.md (AC priorities)'
externalPointerStatus: 'not_used'
collectionStatus: 'COLLECTED'
sourceSha: 'a4c405c'
---

# Traceability Matrix & Gate Decision: Epic 16, Remember the Books that mattered

**Target:** Epic 16, Stories 16.1 and 16.2 (gate type: epic). This is Epic 16 retro action 109 (`epic-16-retro-2026-11-26.md`, "Action items").
**Date:** 2026-11-26
**Evaluator:** Oleg (TEA Agent)
**Commit under trace:** `a4c405c`. It includes retro item 107's fix (`480c4c7`), review (`0d29524`) and automate (`d5c7e92`), and item 108's spine reconciliation (`a4c405c`, docs only). This session's full `npm run check` ran on `a4c405c` with a clean tree.

**Gate thresholds:**
- **Coverage:** TR7 (`epics.md:250`) requires P0 = 100% and P1 ≥ 95%, stricter than the workflow default of 90%, so TR7 applies. Overall must be ≥ 80%.
- **Other TR7 clauses:** an API test for every error code, `check:api` clean, and coverage ≥ 90% on `domain/` and ≥ 80% on `intents/` + `store/`.
- **Epic 16 gate** (`epics.md:3778`): TR7 plus the plan's P0 risks green:
  - editing a starred Book on the web and with `edit_book` leaves it starred;
  - a backup from before Epic 16 restores with every Book `favourite: false`, and a star survives an export and restore round trip;
  - starring and unstarring work from Book detail, a tile, a List row and the Spine popover, show in the other views after the refetch, and setting the current value is a no-op success;
  - the Favourites chip shows exactly the starred Books in the bookcase, the list and the tiles, and ANDs with Unread, a Tag and a Search title;
  - existing tests pass unchanged except the leaves the gate names.

**Machine-readable:** `epic-16-gate-decision.json` in this folder.

**Live verification results:** none on file and none needed. Epic 16 has no manual AC and no Mac check (`epics.md`, Epic 16 **Mac checks**).

**Waiver register:** `_bmad-output/test-artifacts/gate-waivers.md` holds no waiver against Epic 16, and none is needed.

**Tests added by this trace:** none. No product code, test or checklist was changed.

---

## Gate Decision: PASS

**Rationale:**
- **P0 coverage is 100% (11/11), P1 is 100% (11/11), overall 100% (23/23)** of the 23 Story 16.1 and 16.2 ACs. TR7's P0 = 100% and P1 ≥ 95% hold, and overall is above 80%. By the workflow's rule 4, the derived decision is **PASS**. No live evidence and no waiver are involved.
- **Every gate P0 risk is green** against tests that ran green in this trace (see "Epic 16 P0 risks" and "Run evidence").
- **The retro's E16-R1 is fixed.** Item 107 (`done`) drops a stuck pending unstar on the person's next action and moves focus only when the render took it. Its 12 leaves ran green here. Oleg's retro verdict counted Epic 16 as accepted only once item 107 landed; it has.
- **Two open items are outside the counted ACs and don't lower the decision:** the gate text doesn't yet name three non-e2e guard edits (E16-S1, retro item 110, open), and EXPERIENCE.md's unstar bullet lags item 107 (`deferred-work.md`, "Deferred from: review of spec-epic-16-retro-item-108-…").

### TR7 criteria and the Epic 16 gate

| Clause | Status | Evidence |
|---|---|---|
| P0 = 100% | MET (11/11) | "Coverage Summary" |
| P1 ≥ 95% | MET (11/11) | "Coverage Summary" |
| Every error code has an API test | MET, nothing new | Epic 16 adds the `set-favourite` intent and no error code; its `book_not_found` and `invalid_fields` answers are tested (`test_favourite.py:158`) |
| `check:api` clean | MET | exit 0 in this session's full check (Prettier, oxlint, `tsc -b`, 432 unit tests, `schema.d.ts` byte comparison) |
| Coverage ≥ 90% `domain/`, ≥ 80% `intents/` + `store/` | MET | `coverage_gate.py`: domain 100.00% (468/468), intents + store 97.40% (2550/2618) |
| Plan's P0 risks green | MET | Next table |

### Epic 16 P0 risks

| Risk | Status | Tests (all green in this trace) |
|---|---|---|
| Editing a starred Book on the web and with `edit_book` leaves it starred | GREEN | `test_favourite.py:235` (web `edit-book` with a new title; `edit_book` unchanged and with a new title; every other intent) |
| A pre-Epic 16 backup restores with every Book `favourite: false`; a star survives a round trip | GREEN | `test_favourite.py:99` (a v3 archive restores at version 4 with no star), `:297` (export, restore into another folder, the starred set equal) |
| Starring works from Book detail, a tile, a List row and the Spine popover, and shows in the other views after the refetch; the current value is a no-op success | GREEN | `favourite-star.spec.ts:74`, `:244`, `:319`, `:442` (each place, never optimistic, then the other views); `test_favourite.py:158` (the 200 no-op writes nothing, even when a write would fail) |
| The Favourites chip shows exactly the starred Books in the bookcase, the list and the tiles, and ANDs with Unread, a Tag and a Search title | GREEN | `favourites-chip.spec.ts:156`; unit `catalogFilter.test.ts:97` |
| Existing tests unchanged except the named leaves | GREEN, with E16-S1 | "Existing tests changed by the epic": every changed leaf is named in the gate, a strengthening, a helper, or one of the three guard edits the retro accepted and item 110 will name |

### Run evidence

Run in this session on 2026-11-26, at `a4c405c` with a clean tree:

| Run | Result |
|---|---|
| `TZ=Europe/Madrid npm run check` (full) | exit 0: 432 unit, 2534 pytest with the coverage gate, 935 e2e (none flaky or skipped), smoke |
| Of those, the Epic 16 e2e specs | 41 passed: `favourite-star.spec.ts` (14), `favourites-chip.spec.ts` (15), `favourites-chip-stuck-unstar.spec.ts` (12) |

The retro's last full check (917 e2e, the 16.2 review) predates item 107's ATDD, review and automate leaves.

---

## Oracle and scope

- **Oracle:** formal acceptance criteria, `epics.md` Stories 16.1 (14 ACs) and 16.2 (9 ACs), numbered AC-1 onward as the specs and ATDD checklists number them. Priorities come from the ATDD checklists' Test Strategy tables.
- **Counted:** the 23 story ACs.
- **Supplementary, not counted:** retro item 107's spec (5 ACs). It is a post-epic fix, not an Epic 16 story; it is traced below because it closes E16-R1, on which Oleg's retro verdict depends.
- **Out of scope** (`epics.md`, Epic 16 "Out of scope"): a favourites filter on Card notes or the Boxes shelf search, an agent tool that sets the star, a Favourites sort, a Stats count, a favourites page, reporting lost stars in `preview_restore`, an optimistic star with rollback, and behavior only Safari or Firefox shows.

---

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

| Priority | ACs | FULL | Coverage |
|---|---|---|---|
| P0 | 11 | 11 | 100% |
| P1 | 11 | 11 | 100% |
| P2 | 1 | 1 | 100% |
| **Total** | **23** | **23** | **100%** |

### Detailed Mapping

#### Story 16.1: Star a Book

| AC | Priority | Coverage | Tests |
|---|---|---|---|
| AC-1 a version 3 `library.json`, at startup or inside a restored backup, loads at version 4 with every Book `favourite: false`; a version 4 file or archive missing `favourite` is refused | P0 | FULL | `test_favourite.py:99` (startup keeps `library.v3.bak.json`, and the step adds `favourite` and nothing else; a v3 archive restores at 4 with no star; a v4 archive missing the field is `restore_invalid`, nothing changed); `test_migrations.py`'s version pins, moved to 4 (gate) |
| AC-2 `set-favourite` stores the value it is sent; the current value is a 200 no-op that writes nothing; a gone Book is 409 `book_not_found`; a bad value is 422 `invalid_fields`; a failed commit changes nothing | P0 | FULL | `test_favourite.py:158`; `test_intent_routes.py:46`, `:150` (the route set gains `set-favourite`) |
| AC-3 a web `edit-book`, `edit_book` (unchanged and with a new title) and every other intent keep the star; `add-book` and `add_book` store `false`; `favourite` is not in `editForm` or `edit_book`'s input | P0 | FULL | `test_favourite.py:235` |
| AC-4 every star survives an export and restore into another folder | P0 | FULL | `test_favourite.py:297` |
| AC-5 `schema.d.ts` gives `ShelfBook` and `BookDetailView` a required `favourite: boolean` | P1 | FULL | `test_favourite.py:318`; `check:api` byte comparison; `frontend/src/api/views.test.ts:124` (tsc) |
| AC-6 agents read the star through `get_book`, `list_catalog` and `get_home`, and have no tool to set it | P1 | FULL | `test_favourite.py:338`; `test_agent_mount.py`, `test_agent_restore.py`, `test_agent_write.py` (`set_favourite` added to the banned tool lists) |
| AC-7 Book detail: a "Favourite" toggle after the `h1` stars and unstars once the save succeeds, never optimistically, and announces the line | P0 | FULL | `favourite-star.spec.ts:74`; automate `:729` (target and size) |
| AC-8 a press that couldn't be saved leaves the star as it was and shows the line in the inline slot, else under the filter row | P1 | FULL | `favourite-star.spec.ts:145`; automate `:644` (List, bookvie stopped), `:682` (a failure after its popover closed) |
| AC-9 Tiles: a starred tile's gold star at the cover's top left; an unstarred one drawn on hover or focus; "Favourite *Title*" | P0 | FULL | `favourite-star.spec.ts:244`; automate `:729`, `:811` (dark), `:864` (twins) |
| AC-10 List: the title cell holds the title link, then "Favourite *Title*" | P1 | FULL | `favourite-star.spec.ts:319`; automate `:729`, `:811` |
| AC-11 a starred spine shows the paper square with the gold star; its name ends with ", favourite"; twins stay apart | P0 | FULL | `favourite-star.spec.ts:367`; automate `:864`, `:889` |
| AC-12 the Spine popover holds "Favourite" right after the title, first in its DOM | P0 | FULL | `favourite-star.spec.ts:442`; automate `:811`; `spine-popover.spec.ts:152`, `:208`, `:416` (the gate's named edits) |
| AC-13 `favourite` and `favourite-dark` are DESIGN.md colors and tokens; gold fills only the star | P1 | FULL | `favourite-star.spec.ts:511`; automate `:811`; `app-shell.spec.ts` (token comparison); `copy.test.mjs` (`FAVOURITE_GOLD`) |
| AC-14 starring leaves Home's slice rows and the "X of Y finished" meter as they were | P2 | FULL | `favourite-star.spec.ts:586`; automate `:889` |

#### Story 16.2: Show only my favourites

| AC | Priority | Coverage | Tests |
|---|---|---|---|
| AC-1 the filter row starts with a lone "Favourites" toggle with a gold `aria-hidden` star, before Status | P1 | FULL | `favourites-chip.spec.ts:94`; automate `:544` (axe both themes, forced colors) |
| AC-2 Favourites on shows only the starred Books in the bookcase, the list and the tiles, announces the count, and ANDs with Unread, a Tag and Search titles | P0 | FULL | `favourites-chip.spec.ts:156`; automate `:599` (the sort holds); unit `catalogFilter.test.ts:97` |
| AC-3 with nothing starred, "No books match these filters." with Clear filters | P1 | FULL | `:229`; automate `:624` (list and tiles) |
| AC-4 Clear filters turns every chip off, Favourites included, and focuses Favourites | P1 | FULL | `:265`; `catalog-filter.spec.ts:231`, `:263`, `:430`, `:471` (the gate's named edits) |
| AC-5 Favourites is off after leaving Catalog, a reload or an add; never stored | P1 | FULL | `:311` |
| AC-6 unstarring a tile or a row with Favourites on hides it and moves focus to the next shown Book, else the previous, else Search titles, with one line | P0 | FULL | `:370`; automate `:646` (last tile, only tile, List); item 107's AC-4 leaves (below) |
| AC-7 unstarring from the Spine popover with Favourites on closes it with its spine and focuses the next spine | P0 | FULL | `:420`; automate `:685` (Esc and Tab out, the last spine) |
| AC-8 a failed unstar with Favourites on leaves the Book shown and starred, with the couldn't-save line | P1 | FULL | `:457`; automate `:733` (bookvie stopped) |
| AC-9 with Favourites off the toolbar's Tab order runs New book, Favourites, then Read; the other chips filter as before | P1 | FULL | `:513`; `bookcase-details.spec.ts:71`, `catalog-publisher-filter.spec.ts:175` (the gate's named edits) |

#### Supplementary: Epic 16 retro item 107, clear a stuck pending unstar (not counted)

| AC | Priority | Coverage | Tests |
|---|---|---|---|
| AC-1 typing in Search titles while an unstar waits keeps every character and focus in the box | P0 | FULL | `favourites-chip-stuck-unstar.spec.ts:92` (Tiles), `:319` (List), `:342` (Bookcase) |
| AC-2 a filter change, Clear filters or a New book save drops the pending unstar silently; turning Favourites off speaks only its count | P1 | FULL | `:116`, `:140`, `:272`, `:297` |
| AC-3 a second star press replaces or drops the pending unstar; a failed press drops it | P1 | FULL | `:165`, `:186`, `:249` |
| AC-4 a late refetch leaves focus on the control the person is on; focus on `main` still moves | P1 | FULL | `:207`, `:227` |
| AC-5 `npm run check` passes | — | FULL | this session's full check |

### Coverage heuristics

- **Error paths:** `book_not_found`, `invalid_fields`, a failed commit (`test_favourite.py:158`), a routed 503 and bookvie stopped (`favourite-star.spec.ts:145`, `:644`; `favourites-chip.spec.ts:457`, `:733`), a v4 archive missing the field (`test_favourite.py:99`).
- **Accessibility:** axe with the chip off and on in both themes and forced colors (`favourites-chip.spec.ts:544`), `aria-pressed` and accessible names on every star (AC-7 to AC-12), focus after an unstar (AC-6, AC-7, item 107).
- **Known accepted risks from the retro, not ACs:** E16-R2, E16-S2, E16-P3 (accept); E16-W1, E16-P2 (watch). None leaves a stated scenario untested.

### Existing tests changed by the epic

`git diff 3f3ef16~1 a4c405c` over `backend/tests`, `frontend/e2e`, `frontend/scripts` and `frontend/src/api/views.test.ts`:

- **Named in the gate:** `builder.py`, `helpers.py`, `test_model.py`, `test_store.py`, `test_store_commits.py:41`, `test_cli.py`, `test_migrations.py`, `test_add_book.py`, `test_views.py`, `test_book_view.py`, `test_catalog_publisher.py`, `test_intent_routes.py`, `views.test.ts`; `spine-popover.spec.ts`, `catalog-tiles.spec.ts`, `book-states.spec.ts`, `catalog-filter.spec.ts`, `bookcase-details.spec.ts`, `catalog-publisher-filter.spec.ts`.
- **Not named, accepted in review (E16-S1, retro item 110 amends the gate):** `copy.test.mjs`'s `FAVOURITE_GOLD` exception, `test_store.py:203` and `test_store_commits.py:201` as the retro cites them (a "newer version" pin moved from 4 to 5).
- **Not named, strengthening only:** `test_agent_mount.py`, `test_agent_restore.py` and `test_agent_write.py` add `set_favourite` to the lists of tools that must not be registered (AC-6). No assertion is weakened.
- **Helpers, no leaf:** `e2e/bookcase.ts`, `catalog-filter.ts`, `intents.ts`, `library.ts`.

### Rejected evidence

None. Every test cited above ran green in this session.

### ATDD checklists

| Checklist | `[ ]` before | `[ ]` after |
|---|---|---|
| `atdd-checklist-16-1-star-a-book.md` | 0 | 0 |
| `atdd-checklist-16-2-show-only-my-favourites.md` | 0 | 0 |
| `atdd-checklist-epic-16-retro-item-107-clear-a-stuck-pending-unstar.md` | 0 | 0 |

No open line remains, so no checklist gap is carried into the gate.

---

## PHASE 2: GATE

### Gaps and recommendations

- **Coverage gaps:** none.
- **Open before Epic 17 planning:** retro item 110 (name `copy.test.mjs`'s `FAVOURITE_GOLD` exception, `test_store.py:203` and `test_store_commits.py:201` in Epic 16's gate) and item 111 (the ATDD commits its red-phase tests).
- **Doc lag:** EXPERIENCE.md → Favourite star, "With the Favourites chip on", lags item 107 (`deferred-work.md`).

### Waiver register review

No waiver is filed or needed.

### Next actions

1. Retro item 109 is marked `done` in `sprint-status.yaml` with this trace.
2. Land items 110 and 111 before Epic 17.

---

## Gate summary

**PASS.** 23/23 ACs FULL (P0 11/11, P1 11/11, P2 1/1), every TR7 clause met, every Epic 16 P0 risk green, the retro's E16-R1 fixed and tested.
