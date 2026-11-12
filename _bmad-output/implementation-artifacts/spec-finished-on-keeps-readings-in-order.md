---
title: 'Keep finished Readings in order when editing Finished on'
type: 'bugfix'
created: '2026-11-12'
status: 'done'
baseline_revision: '34b9c158a500445ec1c77e02196932b25b35f508'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Edit book's **Finished on** checks a changed latest finish only against that Reading's own `startDate` and the current Reading's start (`_finished_on_failure` in `backend/bookvie/intents/edit_book.py`). A back-fill (no start) or any latest finish can therefore be moved before another finished Reading's finish, so finished Readings overlap or swap, and `latestFinishDate` then jumps to the other Reading, which the next edit moves instead. Source: `deferred-work.md`, "Deferred from: review of spec-epic-3-retro-item-21-bound-edit-finished-on", first entry (pre-existing since story 1.11).

**Approach:** When the Book has another finished Reading and Finished on changes the latest finish, refuse a date before the greatest `finishDate` among the other finished Readings: 422 `invalid_fields` on `finishedOn` with "Finished on can't be before *14 August 2019*, when an earlier reading finished.", nothing saved. The same date is allowed (two finishes on one day, as finish-reading plus a same-day re-read makes). No new AD-18 invariant (see Design Notes).

## Boundaries & Constraints

**Always:** Keep the existing check order: "before this reading started" first, then the new earlier-reading bound, then "after the current reading started". Only a *changed* date is checked against other Readings (an unchanged, resent date still saves other fields, as item 21 kept). Copy uses `long_date` and the existing "Finished on can't be before *date*, when …" style; the message function lives in `backend/bookvie/domain/finished_on.py` beside its siblings.

**Never:** No client change (the Edit book panel has no Finished on pre-check; the server message shows under the field via the standard 422 path), so no e2e test. No new invariant in `domain/invariants.py`. Never read or write `~/bookvie-data/library.json` from tests or code (it was inspected read-only during planning only). Don't change the back-fill path for a Book with no finished Reading (no other finished Reading exists there).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Back-fill moved before an earlier finish | Readings: A start 2019-08-01 finish 2019-08-14; B back-fill finish 2025-06-01. Finished on 2025-06-01 → 2019-08-10 | Refused | 422 `invalid_fields`, `finishedOn`: "Finished on can't be before 14 August 2019, when an earlier reading finished."; library bytes unchanged |
| Same day as the earlier finish | Same Book, Finished on → 2019-08-14 | 200; B's `finishDate` is 2019-08-14, A unchanged | No error expected |
| Moved later | Same Book, Finished on → 2025-07-01 | 200; B's `finishDate` 2025-07-01 | No error expected |
| Own start still wins | Earlier Reading finished 2026-03-01; latest started 2026-03-12, finished 2026-04-02. Finished on → 2026-02-20 (breaks both) | Refused with the existing "… when this reading started." message only | 422 |
| Unchanged date with existing disorder | Data already out of order; resend the prefilled latest date, change subtitle | 200, subtitle saved | No error expected |
| Single finished Reading | Only one finished Reading | Behaves as before (no new bound) | n/a |

</intent-contract>

## Code Map

- `backend/bookvie/intents/edit_book.py` -- `_finished_on_failure` (≈l.97): add the earlier-reading bound after the own-start check, inside the changed-date branch. Module docstring (Finished on paragraph) states the edit rules; add the new one.
- `backend/bookvie/domain/model.py:84` -- `Book.latest_finished()`: greatest `finishDate`, later in list order on a tie. "Other finished Readings" = finished Readings that are not `latest` (identity, `is not`).
- `backend/bookvie/domain/finished_on.py` -- `finished_before_start_message`, `finished_after_current_start_message`: add `finished_before_earlier_finish_message(finish: date)` in the same style.
- `backend/tests/test_edit_book.py` -- Finished on tests (`test_the_latest_finish_cannot_move_past_a_re_reads_start` l.354, `test_the_latest_finish_is_by_date_not_by_stored_order` l.607, tie test l.732). Helpers `_edit`, `_readings`, `library_bytes`, `field_messages`, `assert_invariants`; `library_builder.reading(...)` returns the Reading id.
- `backend/bookvie/intents/finish_reading.py:95` -- finish-reading already bounds by the Reading's own start; untouched.
- `frontend/src/lib/bookDetail.ts:95` -- the panel only prefills `latestFinishDate`; no client rule to keep in step.
- Docs that state the edit Finished on rules: `_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md:266` (ends "Known gap: moving the latest finish before another finished Reading's dates is not yet refused (open in `deferred-work.md`)."), `_bmad-output/planning-artifacts/epics.md` story 1.11 ACs (l.813–824), `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md` l.128 (Finished on row) and l.337–338 (validation table).
- Real library (read-only, 2026-11-12): 409 Books, 4 Readings, no Book with more than one Reading, so no stored data breaks the rule.

## Tasks & Acceptance

**Execution:**
- `backend/bookvie/domain/finished_on.py` -- add `finished_before_earlier_finish_message(finish)` → "Finished on can't be before {long_date(finish)}, when an earlier reading finished." -- shared copy style.
- `backend/bookvie/intents/edit_book.py` -- in `_finished_on_failure`, when `finished_on != latest.finish_date`, compute the greatest `finish_date` of the other finished Readings; if `finished_on` is before it, return the new message; else fall through to `_after_current_start`. Update the module docstring. -- the fix.
- `backend/tests/test_edit_book.py` -- add tests for the I/O matrix rows (refusal with code, message and unchanged bytes; same-day allowed; later allowed; own-start message wins; unchanged date with existing disorder still saves); assert invariants after a save. At least one fails without the fix.
- `ARCHITECTURE-SPINE.md` l.266 -- replace the "Known gap" sentence with the rule and its message. -- the spine states the Finished on rules.
- `epics.md` story 1.11 -- add a Given/When/Then AC for the rule after the "current reading started" AC, citing this spec.
- `EXPERIENCE.md` -- add the rule to the Finished on row and a validation-table row for New book panel (edit).

**Acceptance Criteria:**
- Given a Book whose latest finished Reading is a back-fill on 1 June 2025 and an earlier Reading finished 14 August 2019, when edit-book sends Finished on 2019-08-10, then the response is 422 `invalid_fields` with "Finished on can't be before 14 August 2019, when an earlier reading finished." on `finishedOn` and nothing is saved.
- Given the same Book, when Finished on is 2019-08-14 or later, then it saves and only the back-fill's `finishDate` changes.
- Given the rule is in place, when `cd backend && uv run pytest -q` and `npm run check` run, then both pass.

## Spec Change Log

## Review Triage Log

### 2026-11-12 — Review pass
- verdicts: 18 findings — high 0, medium 0, low 11, false 7, maybe-false 0
- findings:
  - `[low]` `[reject]` Edge Case: a tie hands "latest" to the other Reading when the latest-by-date Reading is listed first, so the next edit moves the other Reading. — Real only when a Reading listed before another finishes later and is moved exactly onto that day: a back-fill made on the paused Reading's start day, then moved back to that day, or two back-fills listed out of date order. The value of `latestFinishDate` doesn't change, and nothing overlaps. A fix needs a list-order branch whose refusal message would be wrong for the date it refuses ("can't be before D" for D itself), or a reorder of stored Readings. Too rare to justify that.
  - `[low]` `[reject]` Edge Case (claim): the tie means the fix doesn't fully stop the jump. — Same root cause and reasoning as the row above.
  - `[low]` `[patch]` Verification Gap: no test moves a tied latest finish earlier, so the `is not latest` identity filter isn't pinned. — Added `test_a_tied_latest_finish_cannot_move_before_the_other_finish`.
  - `[low]` `[patch]` Verification Gap: the order between the earlier-finish rule and the current-start rule isn't tested. — The order where the earlier-finish rule wins needs a current Reading that started before another Reading finished, which intents don't create. Added `test_past_the_earlier_finish_the_current_start_still_bounds_the_latest_finish` for the reachable fall-through through the `or` chain.
  - `[low]` `[reject]` Intent Alignment R4: a tie can hand "latest" to the other Reading. — Same as the Edge Case tie row.
  - `[false]` `[reject]` Intent Alignment R3: an allowed edit can leave intervals overlapping. — Edit book never changes a start. A new finish at or after the other finishes can only overlap if the latest's own start was already before another finish, which is stored data from before this change.
  - `[low]` `[reject]` Intent Alignment R2: a start after its own finish isn't checked separately. — finish-reading and edit-book refuse such data, so only a hand-restored file has it. Out of scope, as the Design Notes say and item 21 decided.
  - `[false]` `[reject]` Intent Alignment: data already out of order isn't corrected. — By design. An unchanged date stays editable (item 21 precedent), and a test pins it.
  - `[false]` `[reject]` Intent Alignment / Blind Hunter: the deferred-work entry has no `resolved:` line. — Finalize adds it before the commit, as the run's instructions say.
  - `[false]` `[reject]` Blind Hunter: the deferred-work entry has no `resolved:` line (separate report). — Duplicate of the row above. Finalize resolves it.
  - `[low]` `[reject]` Blind Hunter: the tie flip. — Same as the Edge Case tie row.
  - `[false]` `[reject]` Blind Hunter: no test for the single-finished-Reading row. — `test_the_latest_finish_cannot_move_past_a_re_reads_start` moves a lone finished Reading earlier and later, and it saves.
  - `[low]` `[patch]` Blind Hunter: the new tests check less than their neighbours. — Added the `invalid_fields` code assertion to the own-start test. The other asks repeat what the existing tests already show.
  - `[low]` `[patch]` Blind Hunter: the local `earlier` is misnamed, and the docstring is over 100 columns. — Renamed it `bound` and shortened the docstring. E501 is ignored in `pyproject.toml`, so the length was style only.
  - `[false]` `[reject]` Blind Hunter: the docs don't say which message wins when a date breaks two rules. — The earlier Finished on rules don't document their order either. The order is in code and the spec, and a test checks it.
  - `[low]` `[patch]` Blind Hunter: the EXPERIENCE.md validation-table wording breaks the table's pattern and leaves out the same day. — Reworded to "Not before another finished Reading's finish (a changed date; the same day is allowed)".
  - `[low]` `[patch]` Blind Hunter: no test combines the earlier-finish bound with a current Reading. — Same test as the Verification Gap ordering row.
  - `[false]` `[reject]` Blind Hunter: the spec records private library details. — The aggregate counts describe the user's own data, in their own repo. The "never read" rule is about tests and code, and planning was allowed a read-only check. The fix would also be an edit to this build's spec.

Spine check: no findings (AD-19, AD-18, AD-3 and AD-9 checked).

## Design Notes

- **Bound = other finishes, not starts.** A finished Reading's start is never after its finish (finish-reading and edit-book's own-start rule refuse that), so the greatest other finish already covers "before another finished Reading's start". A hand-restored file with start after finish is out of scope, as item 21 decided for a null-start unfinished Reading.
- **Ties allowed.** Equal dates keep both finishes on one day; `latest_finished()` then picks the later-listed one, and `latestFinishDate` keeps the same value.
- **No invariant.** AD-18 invariants guard structure the views depend on (ids, pointers, page ranges, trimmed fields). The date rules (not in the future, not before the start, not after the current start) are field rules checked by intents, and none is an invariant; adding only this one would be inconsistent, would make restore refuse files the app reads correctly, and could turn an unforeseen intent path into a 500. The real library has no multi-Reading Book, so an invariant stays possible later if wanted.

## Verification

**Commands:**
- `cd backend && uv run ruff format <changed files> && uv run ruff check .` -- expected: clean
- `cd backend && uv run pytest -q` -- expected: all pass
- `npm run check` (repo root) -- expected: pass

## Auto Run Result

Status: done

- **Change:** edit-book refuses a changed latest Finished on that is earlier than another finished Reading's `finishDate`. The refusal is 422 `invalid_fields` on `finishedOn`: "Finished on can't be before *date*, when an earlier reading finished." The same day is allowed. An unchanged date is never checked. The check runs after the own-start rule and before the current-start rule. No invariant was added, and the client is unchanged.
- **Files:**
  - `backend/bookvie/domain/finished_on.py`: new `finished_before_earlier_finish_message`.
  - `backend/bookvie/intents/edit_book.py`: new `_before_earlier_finish`, wired into `_finished_on_failure`; the docstring states the rule.
  - `backend/tests/test_edit_book.py`: 7 new tests and a helper.
  - `ARCHITECTURE-SPINE.md`: the "Known gap" sentence is replaced by the rule.
  - `epics.md`: new story 1.11 AC.
  - `EXPERIENCE.md`: the Finished on row and a validation-table row.
  - `deferred-work.md`: `resolved:` line on the source entry.
- **Review:** 18 findings: 0 high, 0 medium, 11 low, 7 false. There were 6 low patches: 2 tests added, an assertion added, a rename, a docstring and a wording fix. Nothing deferred. The rejected findings and their reasons are in the triage log. The main one is a same-day tie that hands "latest" to a Reading listed later. It is rare and causes no overlap, and a fix would need a list-order branch with a misleading message.
- **Follow-up review recommended:** false. The patches are 6 low, 0 medium, 0 high.
- **Verification:** `uv run ruff format` on the changed files and `uv run ruff check .` are clean. `cd backend && uv run pytest -q`: 1512 passed. `npm run check`: exit 0, with 1512 pytest, 342 unit and 597 e2e tests passed.
- **Residual risk:** the same-day tie identity flip described above.

