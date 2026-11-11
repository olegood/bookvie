---
title: 'Story 6.3: See what I finished in any period'
type: 'feature'
created: '2026-11-11'
baseline_revision: 'f326a37c8c0307bdbfaa00d704302083a0065c66'
status: 'in-review'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-6-3-see-what-i-finished-in-any-period.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-6, AD-9, Structural Seed and the FR-16 map row), reconciled before the next epic: the spine doesn't record that the stats view is built (`views/stats`, `lib/stats`), the bucket rule's details (calendar months touched, All time from the earliest finish to the latest, `month` with no finishes), Custom's ordering and swap in the client, or the stats view's three 422 `invalid_fields` refusals.
    evidence: |-
      backend/bookvie/views/stats.py, backend/bookvie/http/api.py stats_view, frontend/src/lib/stats.ts, frontend/src/pages/StatsPage.tsx. The spine names only 404 book_not_found as a view refusal (AD-9), says only "year when the range exceeds 24 months" (AD-6), and its map preface still gives views/stats as an unbuilt example (spine check, build-auto review of 6.3).
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md AD-6, AD-9, Structural Seed, Capability map FR-16 row
    severity: low
---

<intent-contract>

## Intent

**Problem:** bookvie can't look back. Nothing shows how many Books and pages were finished in a month, a year or all time (FR-16, Flow 7).

**Approach:** A new `stats` view, `GET /api/views/stats?from=&to=`, counts finished Readings by their `finishDate` and sums their stored `finishedPages`. A new Stats page between Catalog and Card notes has a segmented range picker. The browser resolves the presets to dates. The page shows two big numbers and announces "N books, M pages." in the shell's `status` region when the range changes.

## Boundaries & Constraints

**Always:**
- **The server counts (AD-6, AD-11):**
  - It counts every finished Reading whose `finishDate` is in `from..to`, both ends inclusive, and sums its stored `finishedPages` (`None` counts as 0).
  - Back-fills count, re-reads count again, and Side read marks change nothing.
  - Without `from` and `to`, it counts All time.
- **The response shape:** `{ books, pages, bucket, buckets }`.
  - `bucket` is `"year"` when the range spans more than 24 calendar months, else `"month"`.
  - For All time, the range runs from the earliest finish to the latest. With no finishes it is `"month"`.
  - `buckets` is always `[]` in this story (Story 6.4 fills it).
- **Query errors:** each is a 422 `invalid_fields` through `bookvie.intents.invalid_fields`, with an API test:
  - only one of `from` and `to`: names the missing one;
  - a date that isn't `YYYY-MM-DD`: FastAPI's validation, field `from` or `to`;
  - `to` before `from`: field `to`.
- **The browser resolves the presets from its local today** (`localIsoDate`, never `toISOString`):
  - This month runs from the 1st to today.
  - This year runs from 1 January to today.
  - Last year is the full previous year.
  - All time sends no query.
- **The page:**
  - The nav order is Home · Catalog · Stats · Card notes · Backup. The route is `/stats`, with `PageHeading` "Stats" and `usePageTitle('Stats')`.
  - The range picker is a `role="group"` named "Range", with five `aria-pressed` buttons in ViewToggle's segmented look. This year is pressed by default, and the picker always resets to This year on mount.
- **Custom:**
  - It shows `TextField`s "From" and "To" (`type="date"`), starting at the range of the preset pressed before it. When that preset was All time, both start empty.
  - The request always sends the earlier date as `from`.
  - When either field loses focus with To before From, the two values swap silently. There is no message and no `aria-invalid`.
  - While either field is empty or invalid, there is no request, and the last result stays.
- **The numbers:** two figures in `gauge-figure`, the books and the pages, with the `meta` captions "books finished" and "pages finished". They use en-GB grouping ("1,010").
- **Empty states:**
  - With 0 books, the page reads "No books finished in this range.".
  - With 0 books on All time, it reads "No books finished yet." instead.
- **Announcements:**
  - Only when the pressed preset or the Custom range changes, and only once that range's data is shown, `announce('status', …)` sends "N books, M pages.".
  - It uses the singular "1 book" and "1 page".
  - There is no announcement on first load or on a background refetch.
- **Failures:**
  - A failed first load shows `COULDNT_LOAD` with Try again, as on BackupPage.
  - A failed refetch keeps the shown numbers.

**Never:**
- No totals computed in the client, and no bucket contents, bars or chart (Story 6.4).
- No new error code.
- `http/` never imports `domain/`.
- Don't hand-edit `schema.d.ts` or `tokens.css`, and don't edit ARCHITECTURE-SPINE.md (AGENTS.md).
- Don't persist the chosen range.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Flow 7 | today 2026-10-28, ATDD `FLOW_7` | This month: 2 and 610, "2 books, 610 pages."; This year: 3 and 1,010 | No error expected |
| Re-read and back-fills | ATDD AC-4 seed | 2026-01-01..2026-10-28: 3 books, 912 pages; All time: 5 and 1,312 | No error expected |
| Pages edited | Emma finished at 400, Pages set to 450 | September is still 400 | No error expected |
| Month and year edges | finishes 2026-03-31 and 04-01, 2025-12-31 and 2026-01-01, DST Sundays 2026-03-29 and 10-25 | each in its own month and year range | No error expected |
| New Year in Madrid | browser 2027-01-01 00:30 CET | This year `from=to=2027-01-01`, Last year all of 2026 | No error expected |
| Empty range | Last year with nothing finished | 0 and 0, "No books finished in this range." | No error expected |
| All time, nothing | no finished Reading | `{0, 0, "month", []}`, "No books finished yet." | No error expected |
| Bucket choice | 2024-01-01..2025-12-31 / 2024-01-01..2026-01-01 | `month` / `year` | No error expected |
| Bad query | `from` only; `from=2026-13-01`; `to` before `from` | 422 `invalid_fields` naming the field | enveloped, AD-9 |

</intent-contract>

## Code Map

- `backend/bookvie/views/card_notes.py` -- the pattern for a small view module. `views/__init__.py` re-exports views and models.
- `backend/bookvie/views/models.py` -- `_View` base (camelCase). Add `StatsBucket { period: str, books, pages }` and `StatsView { books, pages, bucket: Literal["month","year"], buckets: list[StatsBucket] }`, with docstrings.
- `backend/bookvie/domain/model.py:35` `Reading.finish_date`, `finished_pages`, and `.finished`.
- `backend/bookvie/http/api.py:364-375` -- the `card-notes` route is the pattern. Add `/views/stats` with `Query(alias="from")`. Raise `invalid_fields([FieldError(...)])` from `bookvie.intents`. `_validation_error` (l.736) already envelopes bad dates.
- `backend/tests/test_stats.py` -- the ATDD leaves AC-4 and AC-6 (skipped). `tests/builder.py` `LibraryBuilder.reading(...)`.
- `backend/tests/test_contract.py:334-372` -- the documented-error and coverless route lists.
- `frontend/src/api/views.ts` -- `fetchCardNotesView` and `cardNotesViewKey` are the pattern for a parametrised view under `'view'`. Re-export from `api/index.ts`.
- `frontend/src/lib/today.ts` `localIsoDate`. `frontend/src/lib/relativeDay.ts` `useNow`.
- `frontend/src/components/ViewToggle.tsx` and `.module.css` -- the segmented control to copy (`role="group"`, `aria-pressed`).
- `frontend/src/components/TextField.tsx` -- the date fields. `PageHeading.tsx` focuses the `h1` after navigation.
- `frontend/src/pages/BackupPage.tsx:62-93` -- the failed-load pattern. `CardNotesPage.module.css` `.page` and `.title`.
- `frontend/src/components/Gauge.module.css` `.figure` -- the `gauge-figure` tokens.
- `frontend/src/lib/announce.ts` `announce('status', text)`.
- `frontend/src/main.tsx` routes. `frontend/src/components/AppShell.tsx` nav.
- `frontend/e2e/stats.spec.ts` -- 5 ATDD leaves (skipped). `catalog-pace-calculator.spec.ts:240-255` -- the axe pattern in both themes.
- Nav lists to update: `e2e/app-shell.spec.ts:122`, `backup.spec.ts:74`, `card-notes.spec.ts:112`, `home.spec.ts:56`.
- Deferred-work intake: none name story 6.3.

## Tasks & Acceptance

**Execution:**
- `backend/bookvie/views/models.py`, `views/stats.py` (new), `views/__init__.py` -- `stats(library, start: date | None, end: date | None) -> StatsView` under the rules above.
- `backend/bookvie/http/api.py` -- the `GET /api/views/stats` route, with the three 422s. Document 422 in `responses`.
- `backend/tests/test_stats.py` -- remove both skips and `RED`. Add tests for:
  - the month and year edges and the DST Sundays;
  - a Book finished twice in one range counting 2;
  - `finishedPages` `None` counting 0;
  - All time with nothing finished;
  - the bucket choice at 24 and 25 months, and All time's span;
  - each 422.
- `backend/tests/test_contract.py` -- add `/api/views/stats` to both route lists.
- `frontend/src/api/generated/schema.d.ts` -- run `npm --prefix frontend run api:gen`.
- `frontend/src/api/views.ts`, `api/index.ts` -- `StatsView`, `statsViewKey(range)` (`['view','stats']` plus from and to), `fetchStatsView`, and `useStatsView(range | null)`, which keeps the previous data while the new range loads and is disabled for `null`.
- `frontend/src/lib/stats.ts` and `stats.test.ts` (new) -- the preset list, `presetRange(preset, now)`, `orderedRange`, `statsLine(books, pages)` and `formatCount` (en-GB). Unit-test New Year at 00:30 local, 1 January, 31 December, the 1st of a month, singular and plural, and grouping.
- `frontend/src/components/RangePicker.tsx` (new) -- the "Range" group, reusing `ViewToggle.module.css`.
- `frontend/src/pages/StatsPage.tsx` and `.module.css` (new) -- the heading, the picker, Custom's fields, the figures, the empty messages, the announcement and the failure state.
- `frontend/src/main.tsx`, `components/AppShell.tsx` -- the `/stats` route, and the Stats nav item between Catalog and Card notes.
- `frontend/e2e/stats.spec.ts` -- change every `test.skip(` to `test(`. Add `[P2]` leaves for:
  - All time with nothing finished;
  - "1 book, …" in the singular;
  - Custom after the swap requesting `from=<earlier>&to=<later>`;
  - a direct load of `/stats` having the title and no `h1` focus;
  - axe on a result and an empty range, in light and dark.
- `frontend/e2e/app-shell.spec.ts`, `backup.spec.ts`, `card-notes.spec.ts`, `home.spec.ts` -- the five-item nav.
- `README.md` -- on the Status line, after the 6.2 sentence, add that Stats shows Books and pages finished for This month, This year, Last year, All time or a custom range. After the 6.2 links (l.212-213), add the Story 6.3 spec and ATDD checklist links. Leave the "N of M stories done" count alone.

**Acceptance Criteria:**
- Given the stats view, when it is computed for a range, then it counts the finished Readings by `finishDate` and sums the stored `finishedPages`, back-fills and re-reads included (ATDD AC-4 and AC-6 pass, with the edge tests).
- Given the app, when I use the nav and the Stats page, then the nav, the `h1`, the picker, the preset requests, the numbers, the announcement and the New Year boundary behave as the ATDD's AC-1, AC-2, AC-3, AC-5 and AC-7 say.
- Given a bad query, when the view is requested, then it answers 422 `invalid_fields` naming the field.
- Given Stats in either theme, when axe scans it, then there are no violations.

## Spec Change Log

## Review Triage Log

### 2026-11-11 — Review pass
- verdicts: 31 findings — high 0, medium 0, low 22, false 8, maybe-false 1
- findings:
  - `[low]` `[defer]` Spine drift (AD-9): the stats view refuses with three 422 `invalid_fields`, and AD-9 names only 404 `book_not_found` as a view refusal — deferred to deferred-work.md as spine drift (AGENTS.md).
  - `[low]` `[defer]` Spine drift (AD-6): the bucket rule's details (calendar months touched, All time's span, `month` with no finishes) aren't in the spine — same deferred entry.
  - `[low]` `[defer]` Spine drift (AD-6): Custom's ordering, swap and no-request rule in the client aren't in the spine — same deferred entry.
  - `[low]` `[defer]` Spine drift (Structural Seed, FR-16 map row): `views/stats` and `lib/stats` are built, but the map preface still calls `views/stats` unbuilt — same deferred entry.
  - `[low]` `[reject]` Swap timing: the fields swap on blur or Tab while the request is ordered at once (Intent Alignment) — ATDD AC-2 presses Tab inside the date field, where Chromium moves between segments without a blur, so the Tab swap is required. The request is always ordered, so the numbers are never wrong.
  - `[false]` `[reject]` The 24-month bucket rule is built in 6.3, though it is Story 6.4's (Intent Alignment) — the spec's Design Notes choose it on purpose, and AD-6 states the rule. 6.3 sends `buckets: []`, so 6.4 only fills the list. Nothing goes wrong.
  - `[maybe-false]` `[reject]` All time's span ends at the latest finish, not today (Intent Alignment) — this only affects `bucket`, which Story 6.4 settles together with the bars. If it is wrong, it is low.
  - `[false]` `[reject]` The "timezone offset" tests run only in the browser (Intent Alignment) — the server stores and compares local `finishDate` values with no clock or offset, so the offset can only bite in the browser's choice of today (R-07), which AC-7 and the unit tests pin. How a finish's date is recorded is Epics 3 and 4's, and their tests cover it.
  - `[low]` `[reject]` Tab between the segments of one date swaps reversed dates mid-edit (Edge Case Hunter) — the same root as the swap-timing row: the ATDD requires the Tab swap, and the request is ordered either way.
  - `[low]` `[reject]` Year `0000` passes `isIsoDate` and the server answers 422 (Edge Case Hunter) — Chromium's date input doesn't produce year 0000. A guard adds a branch for input nobody can type.
  - `[false]` `[reject]` A failed load for a new range drops the shown numbers (Edge Case Hunter) — a new range is a first load, not a background refetch, so the spec's "failed first load shows `COULDNT_LOAD` with Try again" applies, and the new P1 leaf pins it.
  - `[low]` `[reject]` Presets keep yesterday's date when the page stays open past midnight with no focus event (Edge Case Hunter) — this is `useNow`'s existing behaviour (it refreshes on focus and visibility), the same as Home and the calculators. A midnight timer adds a mechanism for an unlikely case.
  - `[low]` `[reject]` `views.stats()` called with only one bound counts All time (Edge Case Hunter) — its only caller, the route, refuses half ranges with 422, so no path reaches this. A guard adds a branch for a state nobody has shown can happen.
  - `[low]` `[patch]` Lax date parsing: `from=2026-01-01T00:00:00` and Unix timestamps get 200, but the docstring promises 422 for anything that isn't `YYYY-MM-DD` (Edge Case Hunter) — the docstring now says "a value that isn't a date", and `schema.d.ts` is regenerated.
  - `[low]` `[patch]` Lax date parsing contradicts the route's docstring (Blind Hunter) — the same fix as the row above.
  - `[low]` `[reject]` `views.stats()` treats a half range as All time (Blind Hunter) — same as the Edge Case Hunter row: the route refuses it.
  - `[false]` `[reject]` `finish_date` is filtered twice in `stats.py` (Blind Hunter) — the second filter only narrows the type for the type checker. The count and the span read the same `finishes` list, so they can't drift.
  - `[false]` `[reject]` `StatsBucket.period` has no fixed format (Blind Hunter) — `buckets` is always empty in 6.3, and the ATDD checklist leaves `period`'s format to Story 6.4, so no published value can change.
  - `[false]` `[reject]` The All time key `['view','stats']` is a prefix of every range's key (Blind Hunter) — no code removes, invalidates or sets the All time key alone. The only invalidation is the app-wide `['view']` refetch, which is meant to hit every range.
  - `[low]` `[patch]` A preset picked before the default This year finishes loading is never announced (Blind Hunter) — `announced` now starts as the initial selection, so only the default's own result goes unannounced.
  - `[low]` `[reject]` Stale numbers show while Custom is incomplete, and "No books finished yet." shows under Custom after All time (Blind Hunter) — the spec requires that "the last result stays" while a field is empty. The message belongs to that result.
  - `[false]` `[reject]` Switching to a range that fails to load drops the shown numbers (Blind Hunter) — same as the Edge Case Hunter row: a range change is a first load.
  - `[low]` `[patch]` The failed-load state has no test (Blind Hunter) — a `[P1]` leaf now makes the first stats request return 503, asserts `COULDNT_LOAD` in `main` and in the `alert` region, and checks that Try again refetches.
  - `[low]` `[patch]` The "empty field: no request" check is racy (Blind Hunter) — it now records every stats request and asserts the record equals one final expected request (requests go out in order). The hook refuses a hard wait.
  - `[low]` `[patch]` Only the Tab path of the swap is tested (Blind Hunter) — a `[P2]` leaf reverses the dates, clicks the `h1` and asserts the swap.
  - `[false]` `[reject]` `epic-6-context.md` has edits outside the story (Blind Hunter) — step 1 had to recompile it, because DESIGN.md and EXPERIENCE.md are newer. It is the workflow's own artifact, as in 6.2.
  - `[low]` `[reject]` The spec doesn't record the build or the review (Blind Hunter) — the fix is to edit this build's spec, which Finalize does anyway (rejected by rule).
  - `[low]` `[reject]` The unit tests miss leap-day cases and years 0–99 (Blind Hunter) — `isIsoDate` compares the month and day of the date it built, so a non-leap 29 February rolls over and fails, and years 0–99 keep their month and day. The behaviour is right, and Chromium rejects those inputs anyway.
  - `[low]` `[patch]` The failed-load state and Try again are unverified (Verification Gap) — the same new `[P1]` leaf as above.
  - `[low]` `[patch]` Custom after All time starting empty is unverified (Verification Gap) — a `[P2]` leaf asserts both fields are `''`, the All time figures stay, and the only request recorded is the one sent after both fields are filled.
  - `[low]` `[patch]` "No announcement on a background refetch" is unverified (Verification Gap) — a `[P2]` leaf serves the refetch triggered by focus with new numbers (4 / 1,111) and asserts `status` stays `''` past the announce delay. It fails when the same-selection guard is removed.

## Design Notes

- **Buckets wait for 6.4:** the ATDD checklist gives the bucket contents to 6.4. 6.3 sends the shape with `bucket` chosen by AD-6's 24-month rule and `buckets: []`, so 6.4 only fills the list and draws the chart.
- **Months spanned:** count the calendar months the range touches, both ends included: `(y2 − y1) × 12 + (m2 − m1) + 1`. More than 24 means `year`.
- **Why swap on blur:** a keyboard edit of a date input fires `change` per segment, so swapping on change would jump mid-edit. The request is ordered anyway, so the data is right before the swap.

```py
ok = [r for b in library.books for r in b.readings
      if r.finish_date is not None and (start is None or start <= r.finish_date <= end)]
```

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest tests/test_stats.py tests/test_contract.py` -- expected: pass.
- `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/stats.spec.ts e2e/app-shell.spec.ts e2e/backup.spec.ts e2e/card-notes.spec.ts e2e/home.spec.ts` -- expected: pass.
- `TZ=Europe/Madrid npm run check` -- expected: exit 0.

## Auto Run Result

Status: in-review

**Summary:**
- **Server:** `GET /api/views/stats?from=&to=` counts the finished Readings whose `finishDate` is in the range, both ends inclusive, and sums their stored `finishedPages`. Back-fills and re-reads count, and so does All time without a query.
- **Response:** `{ books, pages, bucket, buckets }`, with `bucket` chosen by AD-6's 24-month rule and `buckets: []` until Story 6.4. A half range, a value that isn't a date, and a `to` before `from` each answer 422 `invalid_fields`.
- **Page:** a new Stats page between Catalog and Card notes, with:
  - the "Range" picker: This month, This year (the default), Last year, All time and Custom;
  - presets resolved from the browser's local today;
  - Custom's From and To, swapped silently;
  - two `gauge-figure` numbers, "books finished" and "pages finished";
  - the two empty messages;
  - the "N books, M pages." announcement when the range changes.

**Files changed:**
- `backend/bookvie/views/stats.py` (new), `views/models.py`, `views/__init__.py`: `stats()`, `StatsView`, `StatsBucket`.
- `backend/bookvie/http/api.py`: the `/api/views/stats` route and its three 422s.
- `backend/tests/test_stats.py`: ATDD AC-4 and AC-6 are on. New tests cover the edges, DST, a re-read twice in one range, `None` pages, All time empty, the bucket at 24 and 25 months, All time's span and each 422.
- `backend/tests/test_contract.py`: the route joins both lists.
- `frontend/src/api/generated/schema.d.ts`: regenerated.
- `frontend/src/api/views.ts`, `api/index.ts`: `useStatsView`, `statsViewKey`, `fetchStatsView` and the range types.
- `frontend/src/lib/stats.ts` and `stats.test.ts` (new): the presets, the ordering, `isIsoDate` and the copy.
- `frontend/src/components/RangePicker.tsx` (new), `pages/StatsPage.tsx` and `.module.css` (new), `main.tsx`, `components/AppShell.tsx`.
- `frontend/e2e/stats.spec.ts`: the 5 ATDD leaves are on, with 9 more (P1 failure; P2 All time empty, singular, Custom ordering, Custom after All time, blur swap, direct load, refetch silence, axe). The nav lists in `app-shell`, `backup`, `card-notes` and `home` specs now have five items.
- `README.md` (the Status line and the 6.3 links), `epic-6-context.md` (recompiled in step 1), `deferred-work.md` (one spine drift entry), `sprint-status.yaml` (6.3 → review).

**Deviation from the spec:** the From/To swap also runs on a Tab keydown inside a date field, not only on blur. Chromium keeps focus in a date input on Tab, moving between segments, and ATDD AC-2 presses Tab there. The request is always ordered, so the numbers are never wrong.

**Review:** 31 findings, all low or below:
- **Patched:** 7 entries, all low. They covered the docstring, the announcement on a pick made before the first load, and five test additions.
- **Deferred:** 1 entry, spine drift (AD-6, AD-9, the Seed and the FR-16 row).
- **Rejected:** 15, each with its reason in the Review Triage Log.

**Follow-up review recommended:** false. The patched entries were 0 high, 0 medium and 7 low.

**Verification:**
- `pytest tests/test_stats.py tests/test_contract.py`: 57 passed, before the patches.
- The spec's e2e list: 79 passed, before the patches.
- `TZ=Europe/Madrid npm run check`:
  - The first run failed 1 of 539 e2e (`add-card-note.spec.ts:193`, a Story 5.1 leaf this story doesn't touch). It passed 5 of 5 alone (`--repeat-each=5`), so it is flaky.
  - After the patches, the first run failed on a stale `schema.d.ts`: the docstring is in the OpenAPI description. After `api:gen` it exits 0, with 1372 pytest, coverage 98% (domain 100%, intents+store 98.06%) and 543 e2e passed.

**Residual risks:**
- With both dates complete and reversed, a Tab between segments of one date field swaps the fields mid-edit (rejected as low, because the ATDD requires the Tab swap).
- `add-card-note.spec.ts:193` failed once under the full suite.
- The refetch-silence leaf waits on an in-page timer tied to the announce delay, after a visible change.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
