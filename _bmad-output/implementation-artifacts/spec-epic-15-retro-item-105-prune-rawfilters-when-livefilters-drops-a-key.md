---
title: 'Forget a dropped filter check, so it never comes back on its own'
type: 'bugfix'
created: '2026-11-25'
status: 'done'
baseline_revision: 'd5fbced9153d6773fe9c6c845462bb67ffb21aad'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-15-retro-2026-11-25.md'
  - '{project-root}/AGENTS.md'
warnings: []
deferred:
  - summary: >-
      Spine drift (AD-6), reconciled before the next epic: the filter-chips item says checked values no Book has any more after a refetch are ignored (`liveFilters`) and that filters reset only when Catalog unmounts or a Book is added; a dropped key is now also forgotten from page state once the view is ready, so it doesn't come back when a Book gets the value again.
    evidence: |-
      Spine Check, build-auto review of item 105; ARCHITECTURE-SPINE.md AD-6, the catalog filter chips bullet; CatalogPage.tsx, the render-time prune after the `filters` memo.
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md
    severity: low
---

<intent-contract>

## Intent

**Problem:** Epic 15 retro item 105 (E15-R1, E15-P1; sprint item `epic-15-retro-item-105-prune-rawfilters-when-livefilters-drops-a-key`). `CatalogPage.tsx` keeps the checked Language, Tag and Publisher keys in `rawFilters`, and `liveFilters` hides a key no Book has any more. It hides the key but never forgets it. So when a Book is edited back to that value in the same Catalog visit, the check comes back on its own: check Manning, another tab or the agent moves the last Manning Book to "No Starch Press" (the chip drops to "Publisher ▾", as Story 15.2's AC-6 pins), then moves it back, and the chip reads "Publisher: 1" again and the Catalog filters with nobody touching it. Story 7.2 has had this for Language and Tag. Publisher makes it likely, because a publisher's spelling is what people fix by editing. Source: `deferred-work.md`, "Deferred from: code review of spec-15-2-filter-the-catalog-by-publisher.md (2026-11-25)".

**Approach:** When the loaded catalog view drops a checked key, remove it from the page's filter state too. A dropped check is gone for the rest of the visit, for all three list chips, and a Book that gets the value back shows unfiltered under an unchecked row.

## Boundaries & Constraints

**Always:**
- Prune only from a loaded (`ready`) catalog view. While the view is loading or has failed, the page has no Books (`NO_BOOKS`), and that must never clear a check.
- Prune only keys that `liveFilters` drops. Status, Type and every key still in the library stay exactly as they are. Nothing that shows today changes: the chip text, its count, the shown Books, Clear filters and the announcements read the same as now, before and after the drop.
- A prune is silent. It announces nothing and moves no focus, as the drop does today.
- Language, Tag and Publisher all go through the same prune.
- Format only the files you change, with the project's pinned tools.

**Never:**
- Don't store filters anywhere or send them to the server. They stay plain page state (Story 7.2, Story 15.2 AC-7).
- Don't change `liveFilters`'s signature or what it returns, or `shownIds`, `filterValues` or `publisherValues`.
- Don't change any existing test's assertions or titles. AC-6 in `catalog-publisher-filter.spec.ts` and the deleted-Polish leaf in `catalog-filter.spec.ts` (~:757) must pass as they are.
- No new UI, copy or token.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Edited away and back | Manning checked; another context moves every Manning Book to No Starch Press, the view refetches; then moves one back to Manning, the view refetches | After the first refetch: "Publisher ▾", every Book shows. After the second: still "Publisher ▾", every Book shows, the Manning row is listed unchecked | — |
| Language and Tag | The same away-and-back for a checked Language or Tag key | The same: the check stays off once dropped | — |
| Partly dropped | Manning and O'Reilly Media checked; every Manning Book leaves Manning | O'Reilly Media stays checked and filtering ("Publisher: 1"); Manning stays off if it comes back | — |
| Refetch in flight or failed | A check is on and the view is loading or failed | The check is kept; the view's return shows it as before | — |
| Nothing dropped | Every checked key is still in the library | The filter state isn't replaced (no extra render loop) | — |

</intent-contract>

## Code Map

- `frontend/src/pages/CatalogPage.tsx:157-167` -- `rawFilters` state and the `filters` memo through `liveFilters`. The fix belongs here.
- `frontend/src/pages/CatalogPage.tsx:274-279` -- `changeFilters`: a user change also runs `liveFilters` for its announcement. It must keep doing so.
- `frontend/src/lib/catalogFilter.ts:118-135` -- `liveFilters` returns the same object when nothing is dropped. That identity tells the page whether a prune is due.
- `frontend/e2e/catalog-publisher-filter.spec.ts:403-442` -- AC-6, the existing drop leaf. The new leaf extends this flow (`editBook`, a second context, the `focus` refetch).
- `frontend/e2e/catalog-filter.ts` -- the shared chip and list helpers (`publisherChip`, `languageChip`, `tagChip`, `listPopup`, `checkboxNames`, `clearFilters`, `spineNames`). Reuse them (Epic 11 retro item 78); don't copy one into a spec.
- `frontend/e2e/catalog-filter.spec.ts:~720-765` -- the Story 7.2 drop leaf for Language, unchanged.
- `_bmad-output/implementation-artifacts/deferred-work.md:1851-1853` -- the 15.2 deferral: a bare bullet with no `source_spec:`/`summary:`/`evidence:` fields, and a heading that names the spec with `.md` (E15-P1).

## Tasks & Acceptance

**Execution:**
- `frontend/src/pages/CatalogPage.tsx` -- when the view is `ready` and `liveFilters` drops a key, set the page's filter state to the pruned filters -- the bug.
- `frontend/e2e/catalog-publisher-filter.spec.ts` -- add a leaf for the I/O matrix's first row, for Publisher: Manning checked, every Manning Book edited away in another context and refetched, then one edited back and refetched. The chip reads "Publisher ▾", every Book shows, Clear filters is absent and the Manning row is unchecked -- the reported case.
- The Language or Tag half -- add one e2e leaf (in `catalog-filter.spec.ts`, or the publisher spec if that reuses more) that does the same away-and-back for a Language or Tag key, so the retro's "all three chips" has a test -- the other two chips.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- give the 15.2 entry the file's `source_spec:`/`summary:`/`evidence:` shape (as the 15.1 entry above it has), keep its heading's text but drop the `.md`, and add a `resolved:` line naming this spec and Epic 15 retro item 105 -- close the source and E15-P1.

**Acceptance Criteria:**
- Given a checked key that the catalog view drops, when a Book gets that value back in the same Catalog visit, then the row is listed unchecked, its chip shows no count for it, and no Book is filtered by it.
- Given a checked key and a refetch that is loading or fails, when the view comes back unchanged, then the check is still on.
- Given `npm run check`, when it runs, then it passes, and every existing catalog-filter, catalog-publisher-filter and bookcase-details leaf passes unchanged.

### Review Findings

Code review, 2026-11-25 (new session; layers: Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor, Spine Check). Edge Case Hunter returned an empty list and is counted as a failed layer. Verification Gap re-ran the mutation probe: with the prune line commented out, the three AC-1 leaves fail and AC-2 passes; the edit was reverted by hand and the tree left clean.

- [x] [Review][Patch] The prune comment gives a reason that can't happen: "before the first load there are no Books and every check would drop". Catalog renders no chips until the view is ready (`if (view.status === 'loading') return null`), so `rawFilters` is still `NO_FILTERS` then and there is no check to drop. Say the guard is defence only [frontend/src/pages/CatalogPage.tsx:168]
- [x] [Review][Patch] The prune comment's first sentence chains two "so" clauses ("…during render so nothing commits in between, so a Book…") and is hard to parse; split it [frontend/src/pages/CatalogPage.tsx:168]
- [x] [Review][Patch] The AD-6 spine-drift entry in `deferred-work.md` paraphrases the spine as "filters reset only when Catalog unmounts or a Book is added"; the spine has no "only". Drop the word so the reconciliation works from the spine's text [_bmad-output/implementation-artifacts/deferred-work.md]
- [x] [Review][Defer] AD-6's filter-chips bullet doesn't say a dropped key is now forgotten from page state [ARCHITECTURE-SPINE.md:114] — deferred: spine drift, reconciled before the next epic; already recorded in `deferred-work.md` by the build ("Deferred from: build-auto review of spec-epic-15-retro-item-105-…"), so no second entry.

- 2026-11-25: full `npm run check` after the patches, exit 0 (check:api with 425 unit tests, check:py 2515 passed, check:e2e 892 passed, check:smoke passed).

**Rejected:**
- `low` (acceptance-auditor) The `ready` guard has no test that fails without it — a mounted Catalog never leaves `ready` once loaded and no check exists before then, so the state is unreachable from the UI; a test would need a harness for a state the app can't reach. The guard stays as defence (see the first patch).
- `false` (acceptance-auditor) The Publisher AC-1 leaf doesn't assert every Book shows right after the first refetch — that state is Story 15.2's AC-6 leaf, which asserts `BY_AUTHOR` after the same drop; the new leaf asserts the final state, which is what this fix changes.
- `low` (acceptance-auditor, blind-hunter) Language has no away-and-back leaf — the task allows "a Language or Tag key"; Language goes through the same `liveFilters` call and prune line, and `liveFilters` dropping a language is unit-tested (`catalogFilter.test.ts:182-190`).
- `low` (blind-hunter) The spec's Boundaries, I/O matrix row and AC-2 still say a failed view has no Books — the fix edits the spec under review.
- `low` (blind-hunter) The Intent's Source line quotes the 15.2 heading with `.md` — the fix edits the spec under review.
- `low` (blind-hunter) The Auto Run Result says AC-2 passed with the prune off "as a guard should" — the fix edits the spec under review.
- `low` (blind-hunter) No test covers a case-only spelling fix (manning → Manning) — keys are `toLocaleLowerCase`, so the key is unchanged and nothing drops; this change doesn't touch keying, and a test would guard a future change that isn't planned.
- `false` (blind-hunter) No test shows a pruned key can be checked again, and the prune might fight user input — once re-checked, the key is live, `liveFilters` returns the same object, and the prune doesn't fire; it compares against the current render's lists, never stale ones.
- `low` (blind-hunter) The Tag leaf doesn't open the Tag list while "ops" is dropped — it asserts "Tag ▾" and all seven Books, which already fails for a prune or drop that didn't happen; the list check adds no failure mode.
- `low` (blind-hunter) `editElsewhere` isn't reused by the AC-6 leaf's inline copy — the helper is local to the item 105 describe; reusing it means hoisting it to module scope and rewriting a shipped leaf's body for a few lines of duplication.
- `false` (blind-hunter) The two `deferred-work.md` entries are written inconsistently (severity, backticks) — the file carries no severity convention, and the retro's sweep matches the "spine drift" text, which both copies carry.
- `false` (blind-hunter) The `resolved:` line implies all three chips are pinned — it says the code forgets a dropped check "for all three list chips", which is true, and lists the leaves that pin it (Publisher, Tag, partly dropped, failed refetch), without claiming a Language leaf.

## Spec Change Log

## Review Triage Log

### 2026-11-25 — Review pass
- verdicts: 17 findings — high 0, medium 0, low 12, false 5, maybe-false 0
- findings:
  - `[low]` `[defer]` (spine-check) AD-6's filter-chips item doesn't mention that a dropped key is now forgotten from page state — spine drift; the code follows the spec and breaks no decision. Deferred to the spec's `deferred` list and `deferred-work.md`.
  - `[low]` `[patch]` (intent-alignment a) The `ready` guard is unreachable while checks exist: `toViewState` keeps a failed or in-flight refetch `ready` with the last Books, so the AC-2 leaf pins the outcome, not the guard — grouped with the blind hunter's first two findings. Patched the wording: the code comment, the AC-2 leaf comment and the `resolved:` line now say a failed refetch stays ready with the last Books, and the leaf pins the outcome. The guard stays as defence for the first load.
  - `[low]` `[reject]` (intent-alignment b) Language has no away-and-back leaf — the spec's task allows "a Language or Tag key"; Language goes through the same `liveFilters` and the same prune line, and the verification-gap layer showed the Tag and Publisher leaves fail without the prune. A further leaf adds no coverage of a separate path.
  - `[low]` `[reject]` (intent-alignment c) "Nothing dropped" has no direct test — a render loop would throw React's too-many-re-renders error in every filtered Catalog leaf, and `liveFilters`'s identity is unit-tested (`catalogFilter.test.ts`, "returns the same filters when every checked value is live"). A page-level identity test would add a harness for a failure the suite already catches.
  - `[false]` `[reject]` (intent-alignment d) Silence and no focus move rest on existing tests — the diff adds no `announce` or focus call, so nothing could make the prune announce or move focus.
  - `[false]` `[reject]` (intent-alignment e) The ATDD leaves were edited — the auditor itself found titles and assertions unchanged; un-skipping and the helper generalisation are what the build is for.
  - `[false]` `[reject]` (intent-alignment f) `deferred-work.md` changed outside the intent — the spec's Execution task asks for exactly this rewrite (E15-P1).
  - `[low]` `[reject]` (edge-case) Dropping `.md` from the 15.2 entry's heading leaves the spec's Source quote matching no heading — the fix would edit this build's spec.
  - `[low]` `[patch]` (blind 1) No test covers the `ready &&` guard though the comments and `resolved:` line read as if one does — same root cause as intent-alignment a; patched with it.
  - `[low]` `[patch]` (blind 2) The prune comment says a failed view has no Books — same root cause; patched with it.
  - `[low]` `[patch]` (blind 3) The prune comment opened "And forgotten, …", half a sentence — rewritten as a self-contained comment.
  - `[low]` `[reject]` (blind 4) Language has no leaf — same as intent-alignment b.
  - `[low]` `[reject]` (blind 5) Name the page's dependency on `liveFilters`'s identity in its unit test — a loop already fails the e2e suite loudly, and `liveFilters` is unchanged here; a comment in an untouched file is unlikely to matter in everyday work.
  - `[false]` `[reject]` (blind 6) The Tag leaf doesn't show the drop, and passes tags as a string — after the first refetch it asserts "Tag ▾" and all seven Books, which is the drop; `editBook` spreads the Book's own `editForm`, where tags are one string, and the leaf passes against the real server.
  - `[low]` `[reject]` (blind 7) The partly-dropped leaf skips Clear filters and the Manning row's absence after the drop — "Publisher: 1" with only Learning Go and DDIA already fails for a prune that clears the whole group; the extra asserts add no new failure mode.
  - `[low]` `[reject]` (blind 8) The rewritten `evidence:` line names symbols, not line numbers — symbol names stay valid as lines move; cosmetic.
  - `[false]` `[reject]` (blind 9) The spec reached `in-review` with no record of the build — the triage log and Auto Run Result are written in this step, before the commit.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").
- **Why prune and not keep `rawFilters`:** Story 7.2 kept the key so the derived `filters` could stay a pure memo. The retro decided (Oleg, 2026-11-25) that a check that came back without anyone touching it is worse than one sync. The sync has to wait for a `ready` view, because `books` is `NO_BOOKS` while loading or failed, and `liveFilters` would then drop every key.
- **Why a refetch and not a remount:** editing a Book on Book detail and pressing Back remounts Catalog, which already resets the filters (AC-7). The bug needs the edit to come from somewhere else while Catalog stays mounted: a second tab, or the agent, with the `focus` refetch, as AC-6 drives it.

## Verification

**Commands:**
- `cd frontend && TZ=Europe/Madrid npx playwright test e2e/catalog-publisher-filter.spec.ts e2e/catalog-filter.spec.ts e2e/bookcase-details.spec.ts` -- expected: pass
- `npm run check` -- expected: exit 0

## Auto Run Result

Status: in-review

**Change.** When the loaded catalog view drops a checked Language, Tag or Publisher key, `CatalogPage.tsx` now removes it from its filter state too, during render, so a Book that gets the value back later in the same visit shows unfiltered under an unchecked row. It prunes only from a `ready` view, and sets state only when `liveFilters` returned a new object (one extra render, no loop). Nothing else that shows changes; no announcement, no focus move.

**Files changed:**
- `frontend/src/pages/CatalogPage.tsx` — the render-time prune after the `filters` memo; the existing `ready` constant moved up to it.
- `frontend/e2e/catalog-publisher-filter.spec.ts` — the two ATDD leaves un-skipped; two leaves added (Tag away and back, partly dropped Manning with O'Reilly Media); the ATDD's local `movePublisher` became a wrapper over a new local `editElsewhere(browser, server, ids, changes)`, because the Tag leaf edits `tags`, which `movePublisher` couldn't. `editBook` from `intents.ts` stays the shared core; no module-level helper was added.
- `_bmad-output/implementation-artifacts/deferred-work.md` — the 15.2 deferral rewritten in the `source_spec`/`summary`/`evidence` shape, its heading without `.md`, with a `resolved:` line (E15-P1); a new spine-drift entry for AD-6.

**Review.** 17 findings: 4 patched (all low, one root cause plus one cosmetic: the comments and the `resolved:` line said a failed view has no Books, or read as if the `ready` guard were tested; the code comment was half a sentence), 1 deferred (spine drift, AD-6), 12 rejected with the reasons in the Review Triage Log. Follow-up review recommended: false (patched: high 0, medium 0, low 4).

**Verification.**
- With the prune disabled by hand, the three AC-1 leaves fail (Manning "Publisher: 1"; Tag and partly dropped "checked") and AC-2 passes, as a guard should (implementation run, and again by the verification-gap layer).
- `npm run check`: exit 0 after the build and again after the review patches (check:api, check:py, check:e2e 892 passed, check:smoke). It includes the three named spec files; every existing catalog-filter, catalog-publisher-filter and bookcase-details leaf passes unchanged.
- Matrix audit: Edited away and back (Publisher AC-1 leaf), Language and Tag (Tag leaf), Partly dropped (its leaf), Refetch failed (AC-2 leaf) all ran and passed. "Refetch in flight" can't be reached from the UI (`toViewState` keeps the view `ready` with the last Books). "Nothing dropped" has no visible signal; a render loop would throw in every filtered Catalog leaf, and `liveFilters`'s identity is unit-tested.

**Residual risks.** The `ready` guard is defence only: no test can fail without it, because a mounted Catalog never leaves `ready` once loaded. Language has no away-and-back leaf of its own; it shares the code path the Tag and Publisher leaves cover.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
