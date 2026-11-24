---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-11-24'
workflowType: 'testarch-trace'
traceTarget: 'epic 14'
gateType: 'epic'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources:
  - '_bmad-output/planning-artifacts/epics.md (TR7 :232; Epic 14 gate :3416; Stories 14.1-14.5 :3424-3655)'
  - '_bmad-output/implementation-artifacts/spec-14-*.md'
  - '_bmad-output/implementation-artifacts/epic-14-context.md'
  - '_bmad-output/implementation-artifacts/epic-14-retro-2026-11-24.md (action 96; findings E14-R1, E14-R2, E14-S2, E14-S3)'
  - '_bmad-output/test-artifacts/atdd-checklist-14-*.md (story ACs and their priority markers; see "ATDD checklists")'
  - '_bmad-output/test-artifacts/automation-summary.md (Story 14.5)'
externalPointerStatus: 'not_used'
collectionStatus: 'COLLECTED'
sourceSha: 'c5d2004'
---

# Traceability Matrix & Gate Decision: Epic 14, See card notes as boxes

**Target:** Epic 14, Stories 14.1 to 14.5 (gate type: epic). This is Epic 14 retro action 96 (`epic-14-retro-2026-11-24.md`, "Action items").
**Date:** 2026-11-24
**Evaluator:** Oleg (TEA Agent)
**Commit under trace:** `c5d2004`. It differs from `632db9c` (the last story commit, 14.5's automate) only by the retro document and `sprint-status.yaml`, so no product code or test changed after the run evidence below.

**Gate thresholds:**
- **Coverage:** TR7 (`epics.md:232`) requires P0 = 100% and P1 ≥ 95%. That is stricter than the workflow default of 90%, so TR7 applies. Overall coverage must be ≥ 80%.
- **Other TR7 clauses:** an API test for every error code, `check:api` clean, and coverage ≥ 90% on `domain/` and ≥ 80% on `intents/` + `store/`.
- **Epic 14 gate** (`epics.md:3416`). It requires TR7 plus the plan's P0 risks green:
  - the existing Card notes e2e specs pass unchanged in List view, which one fixture sets in one place;
  - the default and storage (nothing stored, junk, a read that throws, a reload, the key never in an export);
  - `spineColor` on every group and on the scope, a Book without notes included;
  - the shelf search (each box's "M of N" or fade, the sentences, the accessible names, a faded box's full focus ring, reduced motion);
  - the carried search both ways (Back and the "In *X*" chip), and every other way in starting empty;
  - UX-DR92's staging note gone from EXPERIENCE.md and from the code by the Epic 14 retro.

**Machine-readable:** `epic-14-e2e-trace-summary.json` and `epic-14-gate-decision.json`, both in this folder.

**Live verification results:** none on file. Epic 14 has no manual AC and no Mac check (`epics.md`, "Mac checks: none").

**Waiver register:** `_bmad-output/test-artifacts/gate-waivers.md` holds only W-13-1 (Epic 13). No waiver is filed against Epic 14, and none is needed.

**Tests added by this trace:** none. No product code, test or checklist was changed.

---

## Gate Decision: PASS

**Rationale:**
- **P0 coverage is 100% (19/19), P1 is 100% (13/13), P2 is 100% (2/2), overall 100% (34/34).** TR7's P0 = 100% and P1 ≥ 95% hold, and overall is above 80%. By the workflow's rule 4, the derived decision is **PASS**. No live evidence and no waiver are involved.
- **Every gate P0 risk is green** against tests that ran green in this trace (see "Epic 14 P0 risks" and "Run evidence").
- **The three known open items don't change the derived decision**, because none of them leaves an AC below FULL:
  - **E14-R1** (a carried search announces a stale cached count after a note in the box is edited and Back is pressed) and **E14-R2** (a stale empty cached view clears the carried text) are scenarios outside what 14.5's ACs state. Every scenario the ACs do state is established. Both are **untested defects found by the retro's code reading**, recorded here as error-path heuristic gaps (H1, H2), not as uncovered criteria.
  - **E14-S3** (the faded box's name "*Refactoring*, no match" leaves out its visible "4 card notes", WCAG 2.5.3) is the name 14.4 AC-2 specifies word for word, and `search-boxes.spec.ts:160` asserts it. The AC is covered as written. The defect is in the requirement, and the axe leaf (`search-boxes-automate.spec.ts:83`) pins it as a known gap, confined to the faded box.
  - All three are routed to **retro item 98** (due before Epic 15). Item 98's new leaves and the renamed faded box will change 14.4 AC-2 and add two 14.5 leaves. Re-trace the affected rows when it lands.
- **How they weigh:** the workflow's rules count criteria, not defects, so they can't lower this PASS. They are the reason the PASS is conditional in practice: Epic 15 shouldn't start until item 98 lands, which the retro's verdict ("accepted-with-open-items") and AGENTS.md's epic boundary already require, together with item 97's spine reconciliation.

### TR7 criteria and the Epic 14 gate

| Clause | Evidence | Status |
|---|---|---|
| P0 = 100% | 19/19 FULL | ✅ MET |
| P1 ≥ 95% | 13/13 FULL | ✅ MET |
| Every error code has an API test | Epic 14 adds no error code. The one error path it touches, the scoped view's 404 `book_not_found`, is re-asserted by `test_card_notes_spine_color.py:183` | ✅ MET (n/a) |
| `check:api` clean | Earlier full run (below): contract up to date (`schema.d.ts` regenerated, compared byte for byte), Prettier, `tsc -b`, oxlint, node unit tests. This trace re-ran the three Epic 14 unit files: 59 passed, 0 failed, 0 skipped | ✅ MET |
| Coverage ≥ 90% `domain/`, ≥ 80% `intents/`+`store/` | The coverage gate ran inside the earlier `npm run check` (exit 0). Epic 14's only backend change is `views/card_notes.py` and `views/models.py` (14.1) | ✅ MET |
| `npm run check` green | Exit 0 on `632db9c` content, 2026-11-24 (see "Run evidence") | ✅ MET |
| List unchanged; one fixture | "Epic 14 P0 risks" row 1 | ✅ MET (one deliberate edit, 14.5 AC-3) |
| Default and storage | Row 2 | ✅ MET |
| `spineColor` on every group and the scope | Row 3 | ✅ MET |
| Shelf search | Row 4 | ✅ MET (E14-S3 noted) |
| Carried search both ways; every other way in empty | Row 5 | ✅ MET (E14-R1, R2 untested) |
| UX-DR92 staging gone from EXPERIENCE.md and the code | `grep -rn "UX-DR92\|staging" frontend/src` finds nothing; EXPERIENCE.md has no "Temporary" or "Staging" note; `search-boxes.spec.ts:226` (AC-4) asserts EXPERIENCE.md's shelf section has no staging note and Boxes never shows the List's results. The requirement line UX-DR92 itself is still in `epics.md:357` (retro E14-S1, item 97), which the gate clause doesn't name | ✅ MET |

### Epic 14 P0 risks

| Risk | Matrix items | Key tests | Status |
|---|---|---|---|
| **List unchanged.** The existing Card notes specs pass in List view, set by one fixture in one place | 14.2 AC-1, AC-4; 14.1 AC-7 | <ul><li>`fixtures.ts:238` (the `cardNotesView` option fixture, default `'list'`, stored only when absent)</li><li>`card-note-boxes.spec.ts:73` (AC-1), `:88` (AC-4: groups, highlights, "1 note matches.", Edit, the pile)</li><li>`card-notes.spec.ts` (25 cases) green in this trace</li></ul> | ✅ green. Over `bca6863^..c5d2004` the only edit to a pre-Epic-14 Card notes spec is `card-notes.spec.ts:497`, 14.5 AC-3's deliberate rewrite of the chip leaf ("starts … with an empty search" → "carries the search", 3 assertions). The other pre-existing files touched are helpers (`card-note-add-another.ts` `storedChoice` key, `library.ts`) and `catalog-filter.spec.ts`'s `APP_STORAGE_KEYS`, which isn't a Card notes spec. The gate's "unchanged" wording doesn't allow for the 14.5 edit (retro E14-S2, item 97) |
| **Default and storage.** Nothing stored, junk, a throwing read, a reload; the key never in an export; a restore neither brings nor replaces it | 14.2 AC-2, AC-3 | <ul><li>`card-note-boxes.spec.ts:118` (nothing, `""`, `"grid"`, `"LIST"`, `" list"` → Boxes after reload; `"list"` → List; a throwing `getItem` → Boxes, no page error)</li><li>`:162` (List stored at once, reload opens List, Enter/Space, a throwing `setItem` still switches with no message, `:259-262` no export entry mentions `cardNotesView`)</li><li>`card-note-boxes-automate.spec.ts:69` (a restore keeps `"boxes"` and `"list"`)</li><li>`cardNotesView.test.ts:16-43` (5 cases: junk, empty, throwing, key name)</li></ul> | ✅ green |
| **`spineColor` on every group and on the scope**, a Book without notes included | 14.1 AC-1, AC-2, AC-3, AC-4, AC-6 | <ul><li>`test_card_notes_spine_color.py:124` (cover, palette, `#123456` as stored, user; equals the `book` and `catalog` views)</li><li>`:165`, `:183` (scope with and without notes; unknown id 404)</li><li>`:209` (popover, edit, "From cover")</li><li>`:263` (the tool equals the route)</li><li>`test_card_notes_spine_color_follow_ups.py:72`, `:95`, `:114` (scope = group for every Book), `:132` (after a restore)</li></ul> | ✅ green |
| **Shelf search.** Each box's "M of N" or fade, the sentences, the accessible names, a faded box's full focus ring, reduced motion | 14.4 AC-1, AC-2, AC-3, AC-4, AC-5, AC-7 | <ul><li>`search-boxes.spec.ts:92` (lift −6, one faded wrapper at 0.38, no reflow, pill geometry, the List's matcher)</li><li>`:160` (the count line, `status` once, the five names)</li><li>`:198` ("No card notes contain “zettel”.")</li><li>`:226` (Esc and empty restore; no staging)</li><li>`:275` (150ms ease-out; none under `reduce`; at once on List → Boxes)</li><li>`:363` (full ring on a faded box in light, dark and forced colors; the pill under forced colors)</li><li>`search-boxes-automate.spec.ts:83` (axe), `:111`, `:141`, `:163`, `:198` ×2, `:218`, `:244`</li><li>`cardNotes.test.ts:327`, `:349`, `:364`</li></ul> | ✅ green. E14-S3: the faded box's name omits its visible count (WCAG 2.5.3); `search-boxes-automate.spec.ts:83` allows `label-content-name-mismatch` only on that box. Item 98 |
| **Carried search both ways** (Back and the chip), every other way in starting empty | 14.5 AC-1 to AC-5 | <ul><li>`carried-search.spec.ts:50` (into a box, `<mark>`, `h1`, "3 notes match." once; a faded box "0 notes match."; no text in the URL)</li><li>`:95` (Back with "habits"; a cleared field comes back empty)</li><li>`:145` (the chip, then Back to an empty open box)</li><li>`:179` (nav link, Forward, reload, Back from another page, typed URL; never in URL, `localStorage` or `history.state`)</li><li>`:264` (dropped while the view has no groups)</li><li>`carried-search-automate.spec.ts:77`, `:98`, `:122`, `:166`, `:225`, `:321`, `:350`</li><li>`carriedSearch.test.ts:102` (StrictMode decision), `:195` (coalesced moves)</li></ul> | ✅ green. E14-R1 and E14-R2 (stale cache) untested; item 98 |

### Run evidence

**This trace (2026-11-24, finished by 16:46, HEAD `c5d2004`, clean tree before and after; the build output is ignored by git):**

| Run | Command | Result |
|---|---|---|
| Unit | `node --test src/lib/cardNotes.test.ts src/lib/cardNotesView.test.ts src/lib/carriedSearch.test.ts` (in `frontend/`) | 59 passed, 0 failed, 0 skipped |
| pytest | `TZ=Europe/Madrid uv run pytest -q tests/test_card_notes_spine_color.py tests/test_card_notes_spine_color_follow_ups.py tests/test_card_notes_view.py` (in `backend/`) | 17 passed |
| e2e | `npm run build`, then `TZ=Europe/Madrid npx playwright test e2e/card-note-boxes e2e/search-boxes e2e/open-box e2e/carried-search e2e/card-notes.spec.ts` | **94 passed** (69 Epic 14 cases in 11 files + `card-notes.spec.ts`'s 25), 0 failed, none flaky, retried or skipped (38.1s) |

**Relied on, not re-run:** the full `npm run check` that ran on `632db9c` content earlier on 2026-11-24 (reported by the caller and by the retro's "Behavior verification" and `automation-summary.md`). It exited 0 with 2,508 pytest passed (coverage gate included), 872 e2e passed in Chromium (0 failed, 0 flaky) and smoke ok. HEAD `c5d2004` adds only the retro and `sprint-status.yaml` to it. The TR7 clauses for `check:api`, the coverage thresholds and the whole e2e suite rest on that run.

---

## Oracle and scope

**Oracle.** The priority-bearing oracle is each Story 14.1 to 14.5 AC in `epics.md`, numbered AC-1… in source order as each story's ATDD checklist numbers them: 7 + 12 + 3 + 7 + 6 = 35 ACs. One is not counted (below), so **34 are traced**.

**Not counted: 14.2 · AC-10** (UX-DR92's staging: "Boxes view and text in Search card notes … until Story 14.4 … shows exactly the List view's results"). Its own text bounds it to "until Story 14.4", and 14.4 AC-4 (`search-boxes.spec.ts:226`) now asserts the opposite, as the gate requires. Its leaf (`card-note-boxes.spec.ts` AC-10) was deleted by 14.4's build on purpose (`atdd-checklist-14-4`, "Existing leaves this story changes"). It held while it applied. Item 97 retires UX-DR92 in `epics.md:357`.

**Priority.** An AC's priority is the higher of:
- the `[P0]`…`[P3]` marker on its ATDD leaf, and
- P0, when one of the gate's P0 risks names it.

The second rule raises four ACs from P1 to P0, and all four are FULL:
- 14.4 AC-3 ("the sentences": the no-match sentence, every box faded)
- 14.4 AC-5 (reduced motion)
- 14.4 AC-7 (a faded box's full focus ring)
- 14.5 AC-3 (the carried search by the chip)

**ACs whose wording is off, graded against what they mean** (retro E14-S2, all fixed by item 97, no code wrong):
- **14.3 · AC-1** says an open box with no notes is "reached from Book detail". Book detail has no link when a Book has no notes; the leaf reaches it from the Main book card's "See card notes". FULL.
- **14.4 · AC-2** quotes "14 card notes in 4 Books", but its own seed (3 + 1 + 12 + 1) gives 17. `search-boxes.spec.ts:160` asserts 17, which the code computes. FULL.
- **The gate** says the existing Card notes specs pass "unchanged"; 14.5 AC-3 changed one leaf on purpose. 14.2 AC-1 ("pass with no edit to their files") held at 14.2 and is graded FULL with that later amendment, the way Epic 13 graded ACs later stories grew.

**Out of scope, and why:**
- **Safari and Firefox.** The e2e suite runs Chromium only, which covers the one supported browser (AGENTS.md "Supported browser"; also the epic's "Out of scope").
- **A bfcache restore** (AD-7). Not an AC in `epics.md`; the 14.5 checklist retired its follow-up because Playwright can't force one.
- **E14-R3** (reload a box, then Back, carries text typed after the reload). Accepted by the retro as a watch item; not in an AC.

---

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status |
| --------- | -------------- | ------------- | ---------- | ------ |
| P0        | 19             | 19            | 100%       | ✅ PASS |
| P1        | 13             | 13            | 100%       | ✅ PASS |
| P2        | 2              | 2             | 100%       | ✅ PASS |
| P3        | 0              | 0             | n/a        | n/a |
| **Total** | **34**         | **34**        | **100%**   | **✅ PASS** |

Per story:

| Story | ACs traced | FULL | PARTIAL | P0 / P1 / P2 |
|---|---|---|---|---|
| 14.1 | 7 | 7 | 0 | 4 / 3 / 0 |
| 14.2 | 11 (AC-10 not counted) | 11 | 0 | 4 / 6 / 1 |
| 14.3 | 3 | 3 | 0 | 0 / 2 / 1 |
| 14.4 | 7 | 7 | 0 | 6 / 1 / 0 |
| 14.5 | 6 | 6 | 0 | 5 / 1 / 0 |

**Tests mapped** (Epic 14 cases only; counts from the test sources and the Playwright run):
- **e2e (69 cases, 11 files):** `card-note-boxes.spec.ts` (11), `card-note-boxes-automate.spec.ts` (9), `card-note-boxes-dark-theme.spec.ts` (1), `open-box.spec.ts` (3), `open-box-automate.spec.ts` (11, one test per width at `:136`), `open-box-unscoped.spec.ts` (1), `search-boxes.spec.ts` (7), `search-boxes-automate.spec.ts` (9, one per width at `:198`), `search-boxes-view-switch.spec.ts` (1), `carried-search.spec.ts` (6), `carried-search-automate.spec.ts` (10). Plus the one rewritten `card-notes.spec.ts:497`, for 70. Helpers: `card-note-boxes.ts`, `carried-search.ts`, `fixtures.ts`.
- **Unit (20 cases):** `cardNotes.test.ts` (13 in the `pileCards`, `cardNoteCount and cardNoteBoxName`, `cardNotesCountLine`, `boxMatches and boxMatchPill`, `cardNoteBoxName during a search` and `shelfCountLine` suites, `:285-389`), `cardNotesView.test.ts` (5), `carriedSearch.test.ts` (2).
- **pytest (11 cases):** `test_card_notes_spine_color.py` (7), `test_card_notes_spine_color_follow_ups.py` (4). `test_card_notes_view.py:135`, `:158` were updated by 14.1 for the scope's new key.

No cited test is skipped, `fixme` or `only`.

### Detailed Mapping

Test levels: **api** means pytest through the in-process app or the MCP client; **e2e** means Playwright in Chromium; **unit** means `node --test`.

#### Story 14.1: Carry each Book's spine color in the card-notes view

| AC | Criterion | Priority | Coverage | Tests (level) | Notes |
|---|---|---|---|---|---|
| 14.1 · AC-1 | Every unscoped group carries `spineColor`, the stored resolved color exactly as stored, equal to the `book` and `catalog` views; groups, order, notes, `scope: null` unchanged; no group for a Book without notes | P0 | FULL | `test_card_notes_spine_color.py:124` (api); `test_card_notes_spine_color_follow_ups.py:72`, `:95` (api) | Neuromancer's `#123456` pins "as stored" |
| 14.1 · AC-2 | Scoped: `scope` is `{bookId, title, spineColor}`, the group carries the same color | P0 | FULL | `test_card_notes_spine_color.py:165`; `test_card_notes_spine_color_follow_ups.py:114` (every Book) (api) | |
| 14.1 · AC-3 | Scoped, no notes: `scope.spineColor` is the resolved color, `groups` empty; unknown Book 404 `book_not_found` | P0 | FULL | `test_card_notes_spine_color.py:183` (api) | `library.json` unchanged on the 404 |
| 14.1 · AC-4 | A changed color (popover or edit) shows on the next read, group and scope | P1 | FULL | `test_card_notes_spine_color.py:209`; `test_card_notes_spine_color_follow_ups.py:72`, `:132` (api) | Swatch, edit, "From cover"; a cover edit; a restore |
| 14.1 · AC-5 | `api:gen` gives `spineColor: string` on both types; `check:api` byte for byte; nothing else reformatted | P0 | FULL | `test_card_notes_spine_color.py:240` (api: `schema.d.ts` blocks and OpenAPI); `check:api` in the earlier full run | "Nothing else reformatted": commit `862b856` changes only the planned files |
| 14.1 · AC-6 | `get_card_notes` returns the view as is, with `spineColor`; description unchanged | P1 | FULL | `test_card_notes_spine_color.py:263` (api, MCP) | All Books, Walden, Good Omens |
| 14.1 · AC-7 | Nothing visible changes; no stored data or backup format change; existing Card notes tests pass unchanged | P1 | FULL | `test_card_notes_spine_color.py:294` (api, witness first; 21 stored keys, `library.json` byte-identical); the e2e suite | The two pytest leaves that pinned the scope's shape changed on purpose (`atdd-checklist-14-1`) |

#### Story 14.2: See my card notes as boxes

| AC | Criterion | Priority | Coverage | Tests (level) | Notes |
|---|---|---|---|---|---|
| 14.2 · AC-1 | One option fixture stores `"list"`; existing specs pass with no edit; new specs turn it off | P0 | FULL | `card-note-boxes.spec.ts:73` (e2e); `fixtures.ts:238` | Later amended by 14.5 AC-3's one leaf (see "Oracle") |
| 14.2 · AC-2 | Nothing, empty, junk or a throwing read → Boxes pressed; `"list"` → List | P0 | FULL | `card-note-boxes.spec.ts:118` (e2e); `cardNotesView.test.ts:16`, `:27`, `:34` (unit) | |
| 14.2 · AC-3 | Toolbar order and spacing; the toggle's role, name, buttons, look; List switches in place, keeps focus and text, silent, stored at once; reload; a throwing write still switches; never in an export; a restore neither brings nor replaces it | P0 | FULL | `card-note-boxes.spec.ts:162` (e2e, export at `:259-262`); `card-note-boxes-automate.spec.ts:69` (restore), `:98` (dark, forced colors); `cardNotesView.test.ts:43` (unit) | |
| 14.2 · AC-4 | List view is the page as before | P0 | FULL | `card-note-boxes.spec.ts:88` (e2e); `card-notes.spec.ts` (25 cases, fixture on) | |
| 14.2 · AC-5 | One box per Book with notes, in group order; 1, 3, 3, 5, 5, 7 cards; label clamp; link; one Tab stop; name "*Title*, N card notes" | P1 | FULL | `card-note-boxes.spec.ts:265` (e2e); `card-note-boxes-automate.spec.ts:119` (twins); `cardNotes.test.ts:286`, `:302`, `:307` (unit) | |
| 14.2 · AC-6 | Grid 4/5/5 columns, 216 × 196, gaps; the front in `spineColor` exactly, read or unread; label, cards and angles; dark | P1 | FULL | `card-note-boxes.spec.ts:317` (e2e, light then dark); `card-note-boxes-dark-theme.spec.ts:19`; `card-note-boxes-automate.spec.ts:139` (white spine) | |
| 14.2 · AC-7 | Focus ring 2px accent, 4px offset, `rounded.lg`; no hover change; forced colors | P1 | FULL | `card-note-boxes.spec.ts:408` (e2e); `card-note-boxes-automate.spec.ts:167` (axe) | |
| 14.2 · AC-8 | The count line, its copy, `meta`/`ink-tertiary`, not live; no toggle or line while loading, under "Couldn't load" or in List | P1 | FULL | `card-note-boxes.spec.ts:463` (e2e); `card-note-boxes-automate.spec.ts:186`, `:202`; `cardNotes.test.ts:316`, `:321` (unit) | |
| 14.2 · AC-9 | No notes at all: "No card notes yet.", no toggle, line or boxes | P1 | FULL | `card-note-boxes.spec.ts:508` (e2e, witness first) | |
| 14.2 · AC-10 | UX-DR92 staging, "until Story 14.4" | — | not counted | (its leaf deleted by 14.4) | Superseded by design; see "Oracle" |
| 14.2 · AC-11 | Back to top in Boxes and List | P1 | FULL | `card-note-boxes.spec.ts:538` (e2e); `card-note-boxes-automate.spec.ts:265` (axe) | |
| 14.2 · AC-12 | Values from DESIGN.md's components block; `tokens.css` literals character for character | P2 | FULL | `card-note-boxes.spec.ts:565` (e2e + file read); `app-shell.spec.ts` in the full run | |

#### Story 14.3: See the open box in its Book's color

| AC | Criterion | Priority | Coverage | Tests (level) | Notes |
|---|---|---|---|---|---|
| 14.3 · AC-1 | The open box is the scoped page with no toggle, under an 8px full-width `aria-hidden` strip in `scope.spineColor`, both themes, `CanvasText` under forced colors; with no notes too; only once loaded; same by "See card notes" and "See all card notes"; Add, Edit, the pile and focus work | P1 | FULL | `open-box.spec.ts:48` (e2e); `open-box-automate.spec.ts:52`, `:77`, `:92`, `:114`, `:136` ×2, `:162`, `:180`, `:212`; `open-box-unscoped.spec.ts:24` | Empty open box reached from the Main book card (wording, see "Oracle") |
| 14.3 · AC-2 | Back to top on the open box | P1 | FULL | `open-box.spec.ts:174`; `open-box-automate.spec.ts:236` (axe) (e2e) | |
| 14.3 · AC-3 | Strip height from DESIGN.md; `tokens.css` character for character | P2 | FULL | `open-box.spec.ts:199`; `open-box-automate.spec.ts:255` (e2e) | |

#### Story 14.4: Search the boxes

| AC | Criterion | Priority | Coverage | Tests (level) | Notes |
|---|---|---|---|---|---|
| 14.4 · AC-1 | Matches lift 6px with the "M of N" pill (geometry and colors); non-matches fade to 0.38 through one inner wrapper, stay links and Tab stops; no hide or reflow; the List's matcher; spaces-only is empty | P0 | FULL | `search-boxes.spec.ts:92` (e2e); `search-boxes-automate.spec.ts:83` (axe), `:111` (regex characters), `:198` ×2 (widths); `cardNotes.test.ts:330`, `:335`, `:342` (unit) | |
| 14.4 · AC-2 | The count line sentence, updated as typed; `status` once after ~500ms; the accessible names in all five forms | P0 | FULL | `search-boxes.spec.ts:160` (e2e); `search-boxes-automate.spec.ts:141` (the pause); `cardNotes.test.ts:350`, `:373` (unit) | Asserts 17, not the AC's "14" (wording). Names as the AC specifies; E14-S3 |
| 14.4 · AC-3 | "zettel": every box fades, "No card notes contain “zettel”.", announced the same way | P0 | FULL | `search-boxes.spec.ts:198` (e2e); `cardNotes.test.ts:384` (unit) | Raised by the gate ("the sentences") |
| 14.4 · AC-4 | Esc or empty restores every box and the totals; staging gone from Boxes and EXPERIENCE.md | P0 | FULL | `search-boxes.spec.ts:226` (e2e); `search-boxes-automate.spec.ts:163`, `card-note-boxes-automate.spec.ts:232` | |
| 14.4 · AC-5 | 150ms ease-out as typed; at once under `reduce`; at once on List → Boxes with text | P0 | FULL | `search-boxes.spec.ts:275` (e2e, frames sampled); `search-boxes-automate.spec.ts:218` (dark) | Raised by the gate (reduced motion) |
| 14.4 · AC-6 | Boxes ⇄ List with text: text kept, each view applies it, focus on the pressed button, `status` silent | P1 | FULL | `search-boxes.spec.ts:325` (e2e); `search-boxes-view-switch.spec.ts:45` (a press during the pause); `search-boxes-automate.spec.ts:269` | |
| 14.4 · AC-7 | A faded box with focus keeps a full-strength ring in light, dark and forced colors; the pill under forced colors; fade and lift still apply | P0 | FULL | `search-boxes.spec.ts:363` (e2e); `search-boxes-automate.spec.ts:244` (pill in dark) | Raised by the gate. The contrast ratios (4.96, 7.68) are DESIGN.md's computed pairs; the leaf pins the ring's exact colors and an unfaded link |

#### Story 14.5: Keep the search when I open a box and come back

| AC | Criterion | Priority | Coverage | Tests (level) | Notes |
|---|---|---|---|---|---|
| 14.5 · AC-1 | Into a matching box: "habit" in the field, matches in `<mark>`, `h1` focused, at the top, "3 notes match." once ("1 note matches."); a faded box: "No card notes contain “habit”.", the pile kept, "0 notes match."; no text in the URL | P0 | FULL | `carried-search.spec.ts:50` (e2e); `carried-search-automate.spec.ts:77` (Enter, singular), `:299` (axe); `search-boxes-automate.spec.ts:269` | "At the top" can't fail here (the loading state clamps `scrollY`); AC-2 and AC-3 test the scroll |
| 14.5 · AC-2 | Back with "habits": the remembered view, the boxes for "habits", `h1`, top, the shelf sentence once ("N notes match." in List); a cleared field comes back empty | P0 | FULL | `carried-search.spec.ts:95` (e2e); `carried-search-automate.spec.ts:98` (no match), `:321` (List view) | E14-R1: Back after an edit in the box is untested (H1) |
| 14.5 · AC-3 | The chip pushes `/card-notes` with the text, however the box was entered; Back returns to the open box empty | P0 | FULL | `carried-search.spec.ts:145` (e2e, "See all card notes"); `carried-search-automate.spec.ts:122` (a box, Home's "See card notes"); `card-notes.spec.ts:497` (List) | Raised by the gate (the chip) |
| 14.5 · AC-4 | Every other way in starts empty, nothing announced: nav link (from the shelf too), a box opened empty, "See card notes", "See all card notes", Back from another page, reload, Forward, typed URL; never in the URL, `localStorage` or `history.state` | P0 | FULL | `carried-search.spec.ts:179` (e2e); `carried-search-automate.spec.ts:166` | |
| 14.5 · AC-5 | Under `<StrictMode>`: kept only on a PUSH with the marker and a POP onto `openedFrom`; decided in render, no effect or ref; body keyed by `location.key` (fresh query, pile, panels, pending count, focus); dropped while no groups | P0 | FULL | `carriedSearch.test.ts:102`, `:195` (unit); `carried-search-automate.spec.ts:225` (fresh body on the REPLACE: refetch, pending count never announced), `:350` (a pile gone after a two-step Back); `carried-search.spec.ts:264` (no groups) | The keying is proved by mutation: keyed by `bookId`, `:225` and `:350` fail (`automation-summary.md`). Panels and focus maps follow from the same key. E14-R2: a stale empty view also drops it (H2) |
| 14.5 · AC-6 | A carried arrival on the shelf draws the search state at once, with no animation | P1 | FULL | `carried-search.spec.ts:241` (Back, e2e frames); `carried-search-automate.spec.ts:255` (chip), `:279` (reduced motion, dark) | |

### Coverage heuristics

- **Endpoints without tests:** none. Epic 14 adds no HTTP route. `GET /api/views/card-notes` gains `spineColor` (`test_card_notes_spine_color.py`).
- **Auth negative paths:** not applicable; bookvie has no auth, and Epic 14 adds no permission path.
- **Error and failure paths:** present for loading and "Couldn't load" (`card-note-boxes.spec.ts:463`, `open-box.spec.ts:48`), a throwing storage read and write (`:118`, `:162`), a 404 scope (`test_card_notes_spine_color.py:183`). **Two gaps (happy-path-only on stale data):**
  - **H1 (E14-R1):** no test edits a note in a box and then presses Back with a carried search, so the stale-count announcement is untested.
  - **H2 (E14-R2):** no test opens a box whose cached view is empty and stale with a carried search.
- **UI states:** loading, failed, empty library, empty open box, dark, forced colors and reduced motion are each asserted.

### Rejected evidence

None. Every cited test's assertions establish what it is cited for. Weak spots, accepted as evidence but noted:
- `carried-search-automate.spec.ts:225`'s `scrollY` 0 check doesn't fail under the `bookId` mutation (focusing the `h1` already scrolls up). The leaf is evidence for the keying through its refetch and pending-count checks, not its scroll check (`automation-summary.md`).
- `carried-search.spec.ts:50`'s "at the top" can't fail (see 14.5 AC-1).
- Stale `done:` pointers in the ATDD checklists, from later edits (not changed by this trace):
  - `atdd-checklist-14-2`: AC-11 axe cites `card-note-boxes-automate.spec.ts:258`; the test is at `:265`.
  - Test Strategy tables cite ATDD-time lines, for example `card-note-boxes.spec.ts:78` (now `:73`) and `carried-search.spec.ts:84` (now `:50`). This matrix cites current lines.

### ATDD checklists

| Checklist | `[ ]` before | `[ ]` after | Change |
|---|---|---|---|
| `atdd-checklist-14-1-carry-each-book-s-spine-color-in-the-card-notes-view.md` | 0 | 0 | none |
| `atdd-checklist-14-2-see-my-card-notes-as-boxes.md` | 0 | 0 | none |
| `atdd-checklist-14-3-see-the-open-box-in-its-book-s-color.md` | 0 | 0 | none |
| `atdd-checklist-14-4-search-the-boxes.md` | 0 | 0 | none |
| `atdd-checklist-14-5-keep-the-search-when-i-open-a-box-and-come-back.md` | 0 | 0 | none |

Counted with `grep -cF '[ ]'`. Every line was already ticked with a `done:` pointer or retired by the stories' own steps: 14.5's "AC-4 bfcache" is retired (Playwright can't force a bfcache restore). Each `done:` leaf this trace mapped passed in this trace's runs. No Epic 14 checklist line is still `[ ]`, so none is a gate gap.

---

## PHASE 2: GATE

### Gaps and recommendations

| # | Gap | Priority | Status |
|---|---|---|---|
| G1 | **E14-R1:** a carried search announces a stale cached count after a note in the box is edited and Back is pressed; no test (H1) | Defect, outside the ACs (medium) | open, item 98 (before Epic 15) |
| G2 | **E14-R2:** a stale empty cached view clears the carried text; no test (H2) | Defect, outside the ACs (low) | open, item 98 |
| G3 | **E14-S3:** the faded box's name omits its visible count (WCAG 2.5.3); 14.4 AC-2 specifies the name, so it is covered as written; a known axe gap at `search-boxes-automate.spec.ts:83` | Requirement defect (Oleg chose "*Refactoring*, 4 card notes, no match") | open, item 98: rename, update 14.4 AC-2, EXPERIENCE.md and the tests, drop the axe allowance |
| G4 | AC and gate wording slips: 14.3 AC-1 "from Book detail", 14.4 AC-2 "14", the gate's "unchanged"; UX-DR92 still in `epics.md:357` | Text | open, item 97 |
| G5 | Stale `done:` pointer `atdd-checklist-14-2` → `card-note-boxes-automate.spec.ts:258` (now `:265`) | Low | open (optional) |

LOW: item 100 folds the copied e2e helpers (`openPaused`, `resting`, `HABIT_STATE`; retro E14-D1). Run `/bmad-testarch-test-review` on the Epic 14 specs after it.

### Waiver register review

`_bmad-output/test-artifacts/gate-waivers.md` has no Epic 14 entry. **Waivers filed against this gate:** 0. The derived decision stands.

### Next actions

1. **Item 98 (Amelia):** the fresh-data carried announcement, the stale empty view, and the faded box's name, with a leaf for each. Then re-trace 14.4 AC-2 and 14.5 AC-2 and AC-5, and close G1 to G3.
2. **Item 97 (Winston):** the spine reconciliation (seven "spine drift" entries) and the wording in G4. Epic 15's first story is blocked on it.
3. **Items 99 to 101** as the retro lists them, before Epic 15.

---

## Gate summary

🚨 GATE DECISION: **PASS**

📊 Coverage:
- P0: 100% (19/19), required 100% → MET
- P1: 100% (13/13), TR7 target 95% → MET
- Overall: 100% (34/34), minimum 80% → MET

⚠️ Critical gaps: 0. Open defects outside the ACs: 3 (E14-R1, E14-R2, E14-S3), all routed to item 98 before Epic 15.

📂 Full report: `_bmad-output/test-artifacts/traceability/epic-14-traceability-matrix.md`
