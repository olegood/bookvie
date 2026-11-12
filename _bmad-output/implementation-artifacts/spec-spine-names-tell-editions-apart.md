---
title: 'Spine names tell editions apart'
type: 'bugfix'
created: '2026-11-12'
status: 'done'
baseline_revision: 'f0c1ea733cea9a66228a51a7a2a4a297d6a55ba5'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred:
  - summary: >-
      Spine drift (AD-6), reconciled before the next epic: AD-6's list of client presentation rules and the FR-4 Capability Map row don't name lib/catalog spineNames or ShelfBook.edition.
    evidence: |-
      Spine check of this review: ARCHITECTURE-SPINE.md is unedited; the code is right.
    location: >-
      frontend/src/lib/catalog.ts spineNames
    severity: low
  - summary: >-
      The finish line ("Finished Dune."), the Spine popover and the Start dialog name a Book by title only, so twin editions still sound alike there.
    evidence: |-
      lib/catalog.ts finishLine/finishStatus take only the title; pre-existing, outside this spec's intent (spine names).
    location: >-
      frontend/src/lib/catalog.ts finishLine
    severity: low
---

<intent-contract>

## Intent

**Problem:** Two editions with the same title and authors get identical spine accessible names ("Dune by Frank Herbert, not read yet"), so a screen reader can't tell them apart on the bookcase, while the List view (Pages column) and Book detail (Edition, Year, Pages) do. Source: `deferred-work.md`, "Deferred from: Epic 7 retrospective, behavior check", the entry whose summary starts "Two editions with the same title and authors get identical spine names".

**Approach:** Oleg's decision: only when two spines would share a name, add what tells them apart — edition, else year, else pages — between the author part and the status ("Dune by Frank Herbert, edition 2, not read yet"). Spines with unique names stay unchanged. The set compared is the whole bookcase: every Book the Bookcase component receives, which is the whole library on both Catalog and Home.

## Boundaries & Constraints

**Always:**
- A name with no twin is byte-for-byte what `spineName` returns today.
- Twins are spines whose current full name (status included) is equal. Qualifiers are appended in rounds, edition then year then pages: in each round, every group of names still equal whose members do not all share that field's value gets that field's qualifier appended to each member. A round never touches a group whose members share the value.
- Wording, after the author part and before the status: `edition N` (Book detail's "Edition N", lowercased mid-name), the year as digits (`1965`, `no year` when null), `N pages` with en-GB grouping (`1,412 pages`). Several qualifiers join with ", " ("edition 1, 1965").
- The name still starts "*Title* by" (Agent Label Contract, EXPERIENCE.md lines 457/478) and still ends with the status and ", on the side".
- Catalog names twins over every Book, also those Search titles or the filter chips hide, and Home's slice over every Book of `view.books`, also those outside the rendered rows; so a Book's spine name is the same on Catalog (any search, any filter) and on Home.

**Never:**
- No qualifier when names already differ (for example a finished and an unread edition).
- No name that changes with Search titles, the filter chips, the sort, or the slice's row count.
- No fourth tie-breaker (Type, Publisher, ISBN): twins equal in edition, year and pages keep the same name (Oleg's order names three fields).
- No change to the visible label, the popover, the List view or Book detail.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Editions | Dune ed. 1 and ed. 2, both unread | "Dune by Frank Herbert, edition 1, not read yet" / "…, edition 2, not read yet" | No error expected |
| Same edition, years differ | ed. 1 1965 / ed. 1 1984 | "…, 1965, …" / "…, 1984, …" | — |
| Year null on one | ed. 1 1965 / ed. 1 null | "…, 1965, …" / "…, no year, …" | — |
| Same edition and year, pages differ | 412 / 1412 pages | "…, 412 pages, …" / "…, 1,412 pages, …" | — |
| Three twins | ed. 1 1965, ed. 1 1984, ed. 2 1990 | "edition 1, 1965" / "edition 1, 1984" / "edition 2" | — |
| Status differs | ed. 1 finished, ed. 2 unread | names unchanged | — |
| Nothing differs | same edition, year, pages | names unchanged (identical) | — |
| No author, Side read | twins with no author, one a Side read | "Dune, edition 1, not read yet" / "Dune, edition 2, not read yet, on the side" only if their base names match | — |

</intent-contract>

## Code Map

- `backend/bookvie/views/models.py:24` `ShelfBook` -- has no `edition`; add `edition: int` after `pages` (Book has it; `BookDetailView` and `HomeMainBook` already expose it).
- `backend/bookvie/views/shelf.py:50` `_shelf_book` -- builds `ShelfBook`; Catalog (`catalog`) and Home (`books=view.books`, line 225) share it.
- `backend/tests/test_bookcase_view.py:61` -- pattern for a catalog-view field test (`library_builder.book(...)`, `/api/views/catalog`).
- `frontend/src/api/generated/schema.d.ts` -- generated; regenerate with `npm --prefix frontend run api:gen`, never format or hand-edit.
- `frontend/src/lib/catalog.ts:72-116` `NamedSpine`, `spineStatus`, `spineName` -- the name today; author part `by`, status, `side`.
- `frontend/src/lib/catalog.test.ts:202-` `describe('spineName')` -- unit tests to extend.
- `frontend/src/pages/Bookcase.tsx:260` -- `aria-label={spineName(book)}` inside `spineButton`; `books` is the full bookcase on both Catalog (`CatalogPage.tsx:338`, hides with `shown`) and Home (`HomePage.tsx:75`, `view.books` sorted).
- `frontend/src/lib/bookDetail.ts:53` -- Book detail's "Edition N" wording; `CatalogList.tsx:20` -- en-GB page grouping.
- `frontend/e2e/bookcase.spec.ts`, `frontend/e2e/bookcase.ts` (`spine`, `spines`, `search`), `frontend/e2e/home.ts` (`slice`, `sliceSpines`) -- e2e helpers; `seededServer({ books: [{ title, authors, edition, year, pages }] })` fills the rest via `backend/tests/builder.py`.
- `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md:119` -- the Spine row defines the accessible name; DESIGN.md does not define it.

## Tasks & Acceptance

**Execution:**
- `backend/bookvie/views/models.py`, `backend/bookvie/views/shelf.py` -- add `edition` to `ShelfBook` and fill it from `book.edition` -- the client needs the first tie-breaker.
- `backend/tests/test_bookcase_view.py` -- test that catalog and home books carry `edition` as stored.
- `frontend/src/api/generated/schema.d.ts` -- regenerate (`npm --prefix frontend run api:gen`).
- `frontend/src/lib/catalog.ts` -- give `spineName` an optional qualifier slot between author part and status, and add `spineNames(books)` returning a `Map<id, name>` per the rounds rule; `NamedSpine` gains `edition`, `year`, `pages` (and `id` for the map). Keep `spineName(book)` unchanged for a Book without a qualifier.
- `frontend/src/lib/catalog.test.ts` -- unit tests for every I/O Matrix row and for "unique names unchanged".
- `frontend/src/pages/Bookcase.tsx` -- compute `spineNames(books)` once (memo) and use it for `aria-label`.
- `frontend/e2e/bookcase.spec.ts` -- e2e: seed Dune ed. 1 (hardcover, 1965, 412 pages), Dune ed. 2 (paperback, 1965, 500 pages) and Neuromancer; on Catalog the two Dune spines are named "Dune by Frank Herbert, edition 1, not read yet" and "Dune by Frank Herbert, edition 2, not read yet" and Neuromancer's is "Neuromancer by William Gibson, not read yet"; after pressing the Type chip Hardcover (hides ed. 2) the shown Dune keeps "edition 1"; on Home the slice's two Dune spines carry the same names (the filter chip helpers live in `catalog-filter.spec.ts`; reuse or inline `getByRole('group', { name: 'Type' })`-style locators as that file does).
- `EXPERIENCE.md:119` -- add the twin rule to the Spine row's accessible name.

**Acceptance Criteria:**
- Given two Dune editions by Frank Herbert, both unread, when Catalog's Bookcase renders, then their spines are named "Dune by Frank Herbert, edition 1, not read yet" and "Dune by Frank Herbert, edition 2, not read yet", and every other spine's name is unchanged.
- Given those two editions, when Search titles or a filter hides one of them, then the shown one's name keeps "edition N".
- Given those two editions, when Home's slice shows them, then their spines carry the same names as on Catalog.
- Given `npm run check`, then it passes.

## Spec Change Log

## Review Triage Log

### 2026-11-12 — Review pass
- verdicts: 24 findings — high 0, medium 0, low 10, false 13, maybe-false 0 (spine drift counted low)
- findings:
  - `[low]` `[reject]` (edge) A qualified twin name could equal another Book's plain name (a Book titled "Dune, edition 1" with no author) — real but contrived; the next round then qualifies both, which still tells them apart; a guard adds branches for a case no one meets.
  - `[false]` `[reject]` (edge) Two entries in `books` share an id — Book ids are server UUIDs, unique per library (`ShelfBook.id`); `books` never repeats one.
  - `[false]` `[reject]` (edge) `names.get(book.id)` may be undefined for a rendered spine — every rendered spine comes from `books` (Catalog maps `books`; the slice's rows come from `useSliceRows({ books })` via `byId`), and `spineNames(books)` has an entry for each.
  - `[low]` `[reject]` (edge) "A name with no twin stays plain" can fail when a qualified name collides with a unique one — same root as the first row; same reason.
  - `[false]` `[reject]` (intent) "Shown" read as the rendered set, not the whole bookcase — the invocation delegated that choice ("Decide whether shown spines means the whole Catalog, the filtered set, or the rendered set"); the spec records it and why.
  - `[false]` `[reject]` (intent) Tie-breaker could be one qualifier or one field per group — the invocation delegated "the precise order and wording"; the rounds rule is in the spec's matrix and tested.
  - `[low]` `[reject]` (intent) Tests exercise year/pages/three twins only at the unit surface, and Home only with every Book in the slice — the name rule is a pure function fully covered at unit level; the e2e checks the accessible name end to end on both views; see the Home-slice row below.
  - `[false]` `[reject]` (intent) Spec still `in-review` and the deferred-work entry has no `resolved:` — Finalize writes both; the diff was taken mid-review.
  - `[false]` `[reject]` (intent) Pages and "no year" go beyond the source entry — the invocation names "edition, else year, else pages".
  - `[low]` `[defer]` (spine-check) Spine drift (AD-6): AD-6's client-presentation list and the FR-4 map row don't name `spineNames` or `ShelfBook.edition` — code is right, spine is behind; deferred to `deferred-work.md` for the next reconciliation.
  - `[low]` `[reject]` (verification-gap) No test names a Home slice spine whose twin is outside the rendered rows — `Bookcase` passes `books`, not `ids`; covering it needs a 100+-Book viewport-dependent e2e to guard a hypothetical refactor; no user meets a defect today.
  - `[false]` `[reject]` (blind) The matrix's "No author, Side read" row contradicts the test — the row is conditioned "only if their base names match"; the test follows the rule; the fix would edit this spec.
  - `[false]` `[reject]` (blind) `aria-label` has no fallback — same refutation as the edge row: every rendered spine is in `books`.
  - `[low]` `[reject]` (blind) A Book's name changes when its twin's status changes — the intent's rule is literally "would share a name"; when statuses differ the names already differ, so both stay distinct and correct.
  - `[false]` `[reject]` (blind) AC 2's Search titles half has no e2e — Search titles matches by title, and twins share the title, so a search can't hide one twin and keep the other; the filter chip is the case that can.
  - `[low]` `[patch]` (blind) Home part of the e2e never checks Neuromancer's name — added `named(neuromancer)` count 1 on Home. (The "after the filter" half is false: count 1 plus edition 1 visible pins the hidden one.)
  - `[low]` `[patch]` (blind) No unit test where the year round adds nothing and pages break the tie — added "skips a round that tells nobody apart and lets pages break the tie".
  - `[low]` `[patch]` (blind) No unit test with co-authors or a different first author — added "compares the author part…" (not twins by first author or author count; Good Omens twins with "and 1 other").
  - `[low]` `[patch]` (blind) EXPERIENCE.md's Spine row omits the join and the page grouping — the row now says a round touches only twins that differ, qualifiers join with ", " ("edition 1, 1965"), pages are grouped ("1,412 pages").
  - `[low]` `[defer]` (blind) Finish line, popover and Start dialog name a Book by title only, so twins still sound alike there — pre-existing, outside this intent (spine names).
  - `[false]` `[reject]` (blind) `ShelfBook.edition`'s docstring doesn't explain why the field is there — it does ("tells twin spines apart in their names").
  - `[low]` `[reject]` (blind) Backend test doesn't cover the default or a high edition — `edition` is copied as stored (`edition=book.edition`); no branch to cover.
  - `[false]` `[reject]` (blind) Status and Spec Change Log out of step — nothing triggered a spec change (no bad_spec); the log stays empty.
  - `[false]` `[reject]` (blind) `catalog-sort.spec.ts` two Dunes might be renamed — their statuses differ, so their names already differ and are unchanged; no defect.

## Design Notes

Why the whole bookcase and not the filtered or rendered set: a name that changed while typing in Search titles, or between Catalog and Home, would make one Book sound like two to a screen reader user, and the hidden twin still exists. Both views receive every Book in `books`, so the same `spineNames(books)` call gives the same names everywhere.

Why the full name with status: it is literally "would share a name"; a finished and an unread edition are already told apart.

```ts
// spineNames: rounds over groups still equal
for (const field of [edition, year, pages]) {
  for (const group of groupsWithEqualNames) {
    if (!allEqual(group.map(field.value))) group.forEach((b) => qualifiers[b.id].push(field.words(b)))
  }
}
```

## Verification

**Commands:**
- `cd backend && uv run pytest tests/test_bookcase_view.py` -- expected: pass
- `cd frontend && node --test src/lib/catalog.test.ts` -- expected: pass
- `cd frontend && npx playwright test e2e/bookcase.spec.ts -g editions` (after `npm run build` from the root) -- expected: pass
- `npm run check` from the repo root, once, alone -- expected: pass

## Auto Run Result

Status: done

**Summary.** Spines whose full accessible names would be equal ("twins") are now told apart, in rounds, by "edition N", else the year ("no year" when missing), else "N pages" (en-GB grouping), placed between the author part and the status ("Dune by Frank Herbert, edition 2, not read yet"). Names are computed over every Book the Bookcase receives (the whole library on Catalog and on Home), so a name never changes with Search titles, the filter chips, the sort or the slice's rows. Spines with no twin keep exactly the old name.

**Files changed:**
- `backend/bookvie/views/models.py`, `backend/bookvie/views/shelf.py` -- `ShelfBook.edition`, filled from the Book.
- `frontend/src/api/generated/schema.d.ts` -- regenerated.
- `frontend/src/lib/catalog.ts` -- `spineName(book, qualifier)` and the new `spineNames(books)` with the `TwinSpine` type.
- `frontend/src/pages/Bookcase.tsx` -- memoised `spineNames(books)` for every spine's `aria-label`.
- `backend/tests/test_bookcase_view.py` -- catalog and home books carry `edition`.
- `backend/tests/test_views.py` -- the exact-shape view expectations gain `"edition": 1`.
- `frontend/src/lib/catalog.test.ts` -- `describe('spineNames')`: every I/O matrix row, a skipped middle round, the author part.
- `frontend/e2e/bookcase.spec.ts` -- twin editions on Catalog, under the Hardcover filter, and on Home's slice.
- `frontend/e2e/bookcase-details.spec.ts` -- the Add-anyway test seeds the old Dune with the added copy's 412 pages, so the two stay identical twins with the plain name (they differed in pages, which now names them apart).
- `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md` -- the Spine row states the twin rule.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- `resolved:` on the source entry; two new deferrals.

**Review findings.** 24 findings: 4 patched (all low: Home's Neuromancer name in the e2e, two unit tests, EXPERIENCE.md wording), 2 deferred (spine drift AD-6; title-only finish line, popover and Start dialog), 18 rejected (13 false, 5 low), each with its reason in the Review Triage Log. No intent_gap or bad_spec.

**Follow-up review recommendation:** false. Patched: high 0, medium 0, low 4.

**Verification.**
- First `npm run check`: `check:py` failed on `tests/test_views.py::test_seeded_library[home|catalog]` (exact `ShelfBook` dicts lacked `edition`); fixed.
- Second `npm run check`: `check:py` 1533 passed (coverage gate passed); `check:api` passed (352 unit tests, format, tsc, oxlint); e2e 607 passed, 2 failed: `bookcase-details.spec.ts:332` (a real consequence of the rule: the seeded and added Dunes differed in pages; fixed in the seed) and `set-up-next.spec.ts:555` (Book detail's Set as Up next button not found in time; unrelated to spine names). Both then passed when run alone (2 passed). `check:api` and `check:smoke` were re-run after the fix and passed.

**Residual risks.** No e2e covers a Home slice where one twin falls outside the rendered rows (rejected as low; `Bookcase` passes `books`, not the rows). Twins equal in edition, year and pages keep one name, by design.

