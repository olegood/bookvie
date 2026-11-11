---
title: 'Story 6.1: See when this book will be finished'
type: 'feature'
created: '2026-11-11'
status: 'in-review'
baseline_revision: '835ba013b932bb275484122229bfd7c20bf54146'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-6-1-see-when-this-book-will-be-finished.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-6, FR-15 map row), reconciled before the next epic: the spine doesn't record the Book-scope pages left rule or where it lives.
    evidence: |-
      `BookDetailView.pages_left` / `measured_pace` (views/models.py, views/shelf.py book_detail) and `domain/progress.pages_left`: an unfinished Reading gives max(pages − currentPage, 0), never started gives pages, only finished gives 0. AD-6 says only "pages left (per Book and library scope)"; the FR-15 map row should name `views/shelf` (book detail), `lib/pace` and `components/PaceCalculator`.
    location: >-
      backend/bookvie/domain/progress.py
    severity: low
  - summary: >-
      Spine drift (AD-6), reconciled before the next epic: the Quick pace calculator bullet omits the duration and input rules the client now owns.
    evidence: |-
      `frontend/src/lib/pace.ts`: months = round(days ÷ 30.4375), years = round(months ÷ 12) from 24 months, plain decimals only (no sign, exponent or comma), no result when the finish date is out of range, prefill to one decimal dropping ".0". EXPERIENCE.md → Pace calculator records them; AD-6 should record them or point to EXPERIENCE.md.
    location: >-
      frontend/src/lib/pace.ts
    severity: low
  - summary: >-
      Spine drift (Structural Seed), reconciled before the next epic: the seed's `domain/` line lists progress (percent, current_reading, reading_status) without `pages_left`.
    evidence: |-
      `backend/bookvie/domain/progress.py` now defines and exports `pages_left` (story 6.1).
    location: >-
      backend/bookvie/domain/progress.py
    severity: low
  - summary: >-
      Spine drift (Structural Seed), reconciled before the next epic: the seed's `frontend/src/lib/` line omits `pace` (the calculator's arithmetic and line, AD-6).
    evidence: |-
      `frontend/src/lib/pace.ts` is new in story 6.1; `lib/today.ts` now exports `MONTHS` for it.
    location: >-
      frontend/src/lib/pace.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** Book detail can't answer "when would I finish this at N pages a day?". The server already computes Measured pace (`domain/pace`), but neither Measured pace nor a Book's pages left reaches Book detail. FR-15 (Book scope), AR11, UX-DR51.

**Approach:** The book view gains `pagesLeft` (Book scope) and `measuredPace`. Book detail gets a "How long until…?" block, a reusable `PaceCalculator` with a "pages/day" field prefilled from Measured pace. Its result is computed on the client by a pure `lib/pace.ts` (AD-6: the client owns the calculator arithmetic and the formatting). Story 6.2 reuses the component and the module on Catalog. The ATDD checklist's "Contract the Scaffolds Pin" is binding.

## Boundaries & Constraints

**Always:**
- **`BookDetailView.pages_left: int`** (JSON `pagesLeft`). With an unfinished Reading (`current_reading(book)`, active or paused): `max(book.pages − reading.current_page, 0)`. With no Reading at all: `book.pages`. With only finished Readings: `0`. Put it in a pure `pages_left(book)` in `domain/progress.py`, exported from `bookvie.domain`.
- **`BookDetailView.measured_pace: float | None`** (JSON `measuredPace`): `float(measured_pace(library))`, not rounded; `None` when there is none. `Fraction(0)` gives `0.0`.
- **`paceResult(pagesLeft, typed, today): string | null`** in `frontend/src/lib/pace.ts`:
  - Accept `typed.trim()` only when it matches `^(\d+(\.\d*)?|\.\d+)$`. Its value must be finite and > 0. Anything else returns `null`: "0", "-5", "abc", "", "12,5", "1e3". `pagesLeft <= 0` also gives `null`.
  - days = `Math.max(1, Math.ceil(pagesLeft / pace))`. finish = `new Date(today.getFullYear(), today.getMonth(), today.getDate() + days)`, calendar days in local time. If finish is an invalid Date (an absurdly small pace), return `null`.
  - Under 60 days: `About N days · D Month`, with ` YYYY` appended when the finish year ≠ today's year. At 1 day it reads `About 1 day`.
  - Otherwise months = `Math.round(days / 30.4375)`. When months < 24: `About N months · Month YYYY`. Otherwise years = `Math.round(months / 12)`: `About N years · Month YYYY`. The month and year are the finish date's.
  - The separator is ` · ` (U+00B7, spaces around it). Use fixed English month names: export `MONTHS` from `lib/today.ts` and reuse it, with no `Intl`.
- **`pacePrefill(measuredPace: number | null): string`** in the same module: `""` for `null`, else `String(Math.round(p * 10) / 10)`. So 20 → "20", 17.333 → "17.3", 0.04 → "0" (which then shows no result).
- **`frontend/src/components/PaceCalculator.tsx`** (+ `.module.css`), props `{ pagesLeft: number; measuredPace: number | null }`:
  - With `pagesLeft <= 0`, it renders only `<p>Nothing left to read.</p>`: no field, no `output`.
  - Otherwise one row on `surface-inset`, as the mockup's `.pace`. The row is flex with a 12px gap, `radius-lg` and 12px/14px padding, and holds:
    - the field: an `<input type="text" inputMode="decimal">` with an `id`, 80px wide, styled as a Text field (`--text-field-border` `--color-input-border`, `radius-md`, `--color-surface`, accent border plus halo on focus, tabular figures);
    - then `<label htmlFor>` "pages/day" in `body-sm` / `ink-secondary`;
    - then `<output htmlFor={fieldId} id=… role="none">` in `body` / `ink`, holding `paceResult(...) ?? ''`.
  - The field has `aria-describedby` set to the output's id.
  - State is the typed string, initialised from `pacePrefill(measuredPace)`. "Today" is `useNow()` from `lib/relativeDay.ts`, never the server's date (AD-20).
  - It never sets `aria-invalid`, shows no message, and has no error styling.
- **The Book detail block:** `<section className={styles.block} aria-labelledby>` with the `h2` "How long until…?" (`styles.blockLabel`). It sits after Readings and before Change color, and renders `<PaceCalculator key={book.id} …>`.

**Never:**
- No server-side days or date for the calculator, no rounding of `measuredPace` on the server, no new endpoint or intent.
- The calculator's `output` must not be a live region: EXPERIENCE.md → Accessibility Floor allows one polite `status` per page, and ~140 existing e2e lookups use `page.getByRole('status')` unscoped on Book detail. So no `aria-live` and no implicit `status` role.
- No Catalog calculator or library-scope pages left (6.2). No Stats (6.3, 6.4).
- No hand edits to `schema.d.ts` or `tokens.css`, and no spine edits (drift goes to deferred-work.md).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Prefilled | Dune 412 left, pace 20, today 2026-10-28 | field "20", output "About 21 days · 18 November" | — |
| No pace | `measuredPace` null | field "", output empty | — |
| Months | 412 at "3" | "About 5 months · March 2027" | — |
| Years | 716 at "1" | "About 2 years · October 2028" | — |
| Next year, days | 20 at "1", today 2026-12-20 | "About 20 days · 9 January 2027" | — |
| Invalid | "0", "-5", "abc", "", "  ", "12,5" | output empty | no message, no `aria-invalid` |
| Whitespace | " 30 " | same as "30" | — |
| Nothing left | `pagesLeft` 0 (finished, or Main at its last page) | "Nothing left to read." only | — |
| Huge result | "0.0000000001" | output empty (invalid Date) | — |

</intent-contract>

## Code Map

- `backend/bookvie/domain/progress.py` -- `current_reading` (l.21) is reused. Add `pages_left(book)` here, and export it in `domain/__init__.py` (where `days_left` and `measured_pace` are exported, l.15 and l.35).
- `backend/bookvie/domain/pace.py` -- `measured_pace` returns an exact `Fraction | None`. Read-only.
- `backend/bookvie/views/models.py:219-269` `BookDetailView` -- add `pages_left` and `measured_pace` with docstrings. `_View` camelCases the names.
- `backend/bookvie/views/shelf.py:282-326` `book_detail` -- fill both. The `bookvie.domain` import is at l.9-20.
- `backend/tests/test_pace_calculator.py` -- AC-1 leaf. Delete `@pytest.mark.skip(reason=RED)`, and the `RED` constant if it is then unused.
- `frontend/src/api/generated/schema.d.ts` -- regenerate only (`npm --prefix frontend run api:gen`).
- `frontend/src/lib/today.ts` -- `MONTHS` (l.7-20): export it for `pace.ts`.
- `frontend/src/lib/relativeDay.ts:30` `useNow` -- the browser's now, refreshed on focus and visibility.
- `frontend/src/lib/pace.test.ts` -- AC-6 leaf. Switch to `import { paceResult, pacePrefill } from './pace.ts'`, drop the `Pace` type, `MODULE` and the dynamic import, and change `it.skip` to `it`.
- `frontend/src/components/PageField.module.css` -- the reference for the field's styling (`.input`, `.input:focus`) and the `surface-inset` container.
- `frontend/src/pages/BookDetailPage.tsx:315-336` -- the Readings block, then Change color. Add the new block between them, with an id from `useId()` as `readingsId`/`colorId` do (l.115-116). The `.block`/`.blockLabel` CSS is in `BookDetailPage.module.css:154-168`.
- `frontend/e2e/pace-calculator.spec.ts` -- AC-2 to AC-5. Change `test.skip(` to `test(`.
- Mockup `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/mockups/key-book-detail.html:278-280` -- the row is the field, then the "pages/day" label, then the `output`.
- Deferred-work intake: none name story 6.1.

## Tasks & Acceptance

**Execution:**
- `backend/bookvie/domain/progress.py`, `domain/__init__.py` -- add and export `pages_left(book)`, with a docstring -- it is a Book-scope domain rule, and 6.2 sums it.
- `backend/tests/test_progress.py` (or the existing domain test file for `progress`, if named differently) -- unit-test `pages_left`: paused, active, never started, finished only, a re-read after a back-fill, and current page above Pages (gives 0) -- the coverage gate is ≥ 90% on `domain/`.
- `backend/bookvie/views/models.py`, `views/shelf.py` -- add and fill `pages_left` and `measured_pace` -- AC-1.
- `frontend/src/api/generated/schema.d.ts` -- run `npm --prefix frontend run api:gen` -- `check:api` compares it byte for byte.
- `backend/tests/test_pace_calculator.py` -- activate AC-1.
- `frontend/src/lib/today.ts`, `frontend/src/lib/pace.ts` (new) -- export `MONTHS`, then write `paceResult` and `pacePrefill` per Boundaries -- the formatter.
- `frontend/src/lib/pace.test.ts` -- static import, activate AC-6, and add cases. `paceResult` returns `null` for "0", "-5", "abc", "", "   ", "12,5", "1e3", for pagesLeft 0, and for "0.0000000001" at 412. It accepts " 30 " and ".5". At 1 day it reads "About 1 day · 29 October". `pacePrefill` gives `null`→"", 20→"20", 17.333→"17.3", 0.04→"0" -- the I/O matrix.
- `frontend/src/components/PaceCalculator.tsx` (+ `PaceCalculator.module.css`, new) -- the component per Boundaries -- reusable by 6.2.
- `frontend/src/pages/BookDetailPage.tsx` -- add the "How long until…?" block between Readings and Change color, and update the page's docblock comments that list the blocks -- AC-2 and AC-5.
- `frontend/e2e/pace-calculator.spec.ts` -- activate AC-2 to AC-5. Add the green follow-ups: `NO_PACE` gives an empty field and an empty output, and a Main book at p.330 of 330 reads "Nothing left to read.".
- `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md` (Pace calculator row, l.136) -- add the decided rules to the row:
  - months = round(days ÷ 30.4375) and years = round(months ÷ 12);
  - the prefill drops a trailing ".0", and "About 1 day" at 1;
  - "Nothing left to read." also covers an unfinished Reading at its last page, and replaces the field;
  - the `output` is not a live region; the field is described by it.
- `README.md` -- on the Status line (l.8), add what the user can now do: on Book detail, "How long until…?" takes a pages-per-day pace, prefilled with Measured pace, and shows about how long the Book will take and the date it would be finished. Add the Story 6.1 spec and ATDD checklist links after the Story 5.4 links (l.208-209). Leave the "N of M stories done" count alone.

**Acceptance Criteria:**
- Given the seeds in `test_pace_calculator.py`, when `GET /api/views/book` is read, then `pagesLeft` and `measuredPace` match AC-1's values (191, 210, 412, 0, 70, 0, 272; 20; ≈33.333; null).
- Given Book detail for Dune with pace 20 on 2026-10-28, when it renders, then the region "How long until…?" holds an 80px "pages/day" textbox reading "20" and an `output` reading "About 21 days · 18 November".
- Given the field, when each keystroke or fill changes it, then the `output` follows at once, with no request sent.
- Given invalid input, when it is typed, then the output is empty, the block's text is only "How long until…?" and "pages/day", and the border is unchanged.
- Given Emma (finished) or a Main book at its last page, when Book detail renders, then the block reads "Nothing left to read." and has no textbox.
- Given Book detail, when the page's live regions are counted, then there is still exactly one `role="status"` (the shell's), so the existing e2e suite stays green.

## Review Triage Log

### 2026-11-11 — Review pass
- verdicts: 32 findings — high 0, medium 2, low 21, false 9, maybe-false 0
- findings:
  - `[low]` `[patch]` (blind) e2e header comment read "changing its `test(` to `test(`" — deleted the line.
  - `[low]` `[patch]` (blind) sprint-status.yaml still shows 6-1 and epic-6 as backlog — Finalize sets `6-1…: review` and `epic-6: in-progress`, as story 5.1 did for epic 5.
  - `[low]` `[reject]` (blind) a Measured pace rounding to 0 prefills "0" with no result — AC-2 says prefill the pace rounded to one decimal; it only arises when every qualifying Reading tracked under 0.05 pages a day, and "0" then shows no result exactly as AC-4 says.
  - `[low]` `[reject]` (blind) the prefill doesn't follow a Measured pace that changes while the page is open — the spec's design keeps the typed text across refetches; the pace only changes after a finish elsewhere, and following it needs extra "edited" state.
  - `[low]` `[reject]` (blind) the refetch-keeps-text and key-resets-on-another-Book behaviours have no test — rarely met, and covering them needs new e2e flows; left to `bmad-testarch-automate`.
  - `[false]` `[reject]` (blind) the ATDD checklist still describes the red phase — it is the record of the red phase, which `bmad-testarch-automate` updates; nothing in it is wrong as history.
  - `[low]` `[patch]` (blind) DESIGN.md → Pace calculator still said "number field" and omitted the nothing-left state — the row now says `type="text"` with `inputmode="decimal"` and that "Nothing left to read." in `body-sm`/`ink-secondary` replaces the row.
  - `[low]` `[reject]` (blind) PaceCalculator.module.css copies the Text field styles and hard-codes 12px/14px — the repo styles each field in its own CSS module (PageField, EditPurpose, FileField), and 12px/14px are the mockup's `.pace` values; no caller diverges.
  - `[low]` `[reject]` (blind) the README doesn't link the Epic 6 context — the Epic 4 and 5 contexts aren't linked either, so the convention lapsed before this story; adding one link would be inconsistent.
  - `[false]` `[reject]` (blind) no frontend test sends a fractional `measuredPace` — `test_pace_calculator.py` asserts `measuredPace ≈ 100/3` on the JSON, and `pace.test.ts` asserts `pacePrefill(100/3) === '33.3'`.
  - `[low]` `[reject]` (edge) `Fraction(0)` prefills "0" — same as the blind finding above; same reason.
  - `[low]` `[patch]` (edge) `pacePrefill` rounded float halves down (1.45 → "1.4") — now rounds `Number((p × 10).toPrecision(12))`; `pacePrefill(29/20) === '1.5'` added.
  - `[false]` `[reject]` (edge) a pace of 1e21 or more gives "1e+21" — unreachable: Measured pace is pages over at least one day, and no Book holds 10^21 pages.
  - `[low]` `[patch]` (edge) the e2e header comment — same fix as the blind finding.
  - `[medium]` `[patch]` (verification) the field's `aria-describedby` link to the output is untested — AC-2, AC-3 and AC-4 now assert `toHaveAccessibleDescription` (the result, then '' on invalid input).
  - `[low]` `[reject]` (verification) "with no request sent" isn't asserted — the component has no fetch path; a request listener only guards a future redesign, and the AD-6 split is reviewed by the spine check.
  - `[low]` `[patch]` (verification) the e2e header comment — same fix.
  - `[medium]` `[patch]` (intent) the `output` has `role="none"`, and only the untested `aria-describedby` exposes the result — grouped with the verification finding; same fix.
  - `[false]` `[reject]` (intent) "Nothing left to read." also shows at the last page of an unfinished Reading — AD-6 says "with nothing left to read … it shows no days"; pages left 0 is nothing left to read.
  - `[false]` `[reject]` (intent) "12,5" and "1e3" count as non-numeric — the app's copy is English with "." decimals; the AC's "non-numeric" covers them, and the unit tests pin it.
  - `[false]` `[reject]` (intent) the 24-month threshold applies after rounding — decided with Oleg in the ATDD checklist (716 days → "About 2 years"), and both Flow 5 examples match.
  - `[low]` `[reject]` (intent) the prefill drops ".0" and a tiny pace prefills "0" — the ".0" rule was decided with Oleg; the "0" case is the rejected blind finding.
  - `[low]` `[reject]` (intent) no test compares the client's rounding with the server's `days_left` — the shared fixture is the checklist's PAC-UNIT-002 follow-up, for `bmad-testarch-automate`; both sides are pinned to the same stated rule.
  - `[false]` `[reject]` (intent) AC-6's fake clock is a `today` argument — that is the contract the ATDD scaffold pins; the browser clock is fixed in e2e.
  - `[false]` `[reject]` (intent) the diff edits EXPERIENCE.md and the README status line — both are spec tasks (the checklist's decisions; AGENTS.md README rule).
  - `[low]` `[patch]` (intent) the e2e header comment — same fix.
  - `[false]` `[reject]` (intent) no review or automation step ran — by design: build-auto ends at review (AGENTS.md "Story pipeline").
  - `[low]` `[defer]` (spine) Spine drift (AD-6, FR-15 map row): Book-scope pages left isn't recorded — deferred-work.md.
  - `[low]` `[defer]` (spine) Spine drift (AD-6): the calculator's duration and input rules aren't recorded — deferred-work.md.
  - `[low]` `[defer]` (spine) Spine drift (Structural Seed `domain/`): `pages_left` missing — deferred-work.md.
  - `[low]` `[defer]` (spine) Spine drift (Structural Seed `lib/`): `pace` missing — deferred-work.md.
  - `[low]` `[patch]` (spine) Home's days left computed pages left inline, a second server computation (AD-6) — `_main_book` now passes `pages_left(book)` to `days_left`.

## Design Notes

- **Why `role="none"` on the `output`:** the criterion names an `output` element, but its implicit role is `status`, which would add a second live region to Book detail. That breaks EXPERIENCE.md's one-polite-`status` rule, and strict mode in every unscoped `getByRole('status')` lookup. A result that changes on every keystroke shouldn't be announced anyway. With `role="none"` and the field's `aria-describedby`, a screen-reader user hears the result on the field.
- **The prefill is the typed state:** the result comes from the field's text, so the prefilled "17.3" gives the same result as typing 17.3. Keying the component by `book.id` resets it when another Book opens. A view refetch keeps what was typed.

```ts
paceResult(412, '20', new Date(2026, 9, 28, 10)) // 'About 21 days · 18 November'
paceResult(60, '1', TODAY)                      // 'About 2 months · December 2026'
paceResult(10, '30', TODAY)                     // 'About 1 day · 29 October'
```

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest` -- expected: all pass, `test_pace_calculator.py` 1 passed.
- `cd frontend && TZ=Europe/Madrid node --test src/lib/pace.test.ts` -- expected: pass.
- `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/pace-calculator.spec.ts` -- expected: every leaf passes.
- `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/book-detail.spec.ts e2e/set-up-next.spec.ts e2e/pause.spec.ts e2e/side-reads.spec.ts` -- expected: pass (one `status` region on Book detail).
- `npm run check` -- expected: green (format, lint, `tsc -b`, `api:gen` diff, coverage).

## Auto Run Result

Status: in-review

**Implemented.** The book view (`GET /api/views/book`) gains `pagesLeft` (Book scope, from the new `domain.progress.pages_left`) and `measuredPace` (exact, not rounded). Book detail gains a "How long until…?" block between Readings and Change color: a reusable `PaceCalculator` with an 80px "pages/day" text field prefilled from Measured pace, and an `output` whose line comes from `lib/pace.ts` (`paceResult`, `pacePrefill`) using the browser's today. Invalid input is silent; pages left 0 shows "Nothing left to read.". The `output` has `role="none"` and describes the field, so Book detail keeps one `status` region.

**Files changed:**
- `backend/bookvie/domain/progress.py`, `domain/__init__.py` — `pages_left(book)`.
- `backend/bookvie/views/models.py`, `views/shelf.py` — the two view fields; Home's days left now uses `pages_left`.
- `backend/tests/test_pace_calculator.py` (AC-1 active), `test_progress.py` (pages_left cases), `test_edit_book.py` (whole-body view gains the fields).
- `frontend/src/lib/pace.ts` (new), `pace.test.ts` (AC-6 active, invalid input, prefill), `lib/today.ts` (`MONTHS` exported).
- `frontend/src/components/PaceCalculator.tsx` and `.module.css` (new); `pages/BookDetailPage.tsx` (the block).
- `frontend/e2e/pace-calculator.spec.ts` — AC-2 to AC-5 active, plus no-pace and last-page leaves and accessible-description checks.
- `frontend/src/api/generated/schema.d.ts` (regenerated), `frontend/src/api/views.test.ts` (fixture).
- `EXPERIENCE.md` and `DESIGN.md` → Pace calculator; `README.md` (Status line, spec and checklist links).

**Review:** 32 findings: 0 high, 2 medium, 21 low, 9 false.
- **Patched (5 entries):** 1 medium (the untested `aria-describedby` link), 4 low (the e2e comment, prefill float rounding, the DESIGN.md row, Home's second pages-left computation), plus the sprint-status update at Finalize.
- **Deferred (4):** spine drift in AD-6 (twice) and in the Structural Seed (twice). These are in `deferred-work.md`.
- **Rejected:** each finding with its reason is in the Review Triage Log above.

**Follow-up review:** not recommended. One medium entry was patched, no high.

**Verification (after the patches):**
- `TZ=Europe/Madrid uv run pytest`: 1344 passed.
- `node --test src/lib/pace.test.ts`: 4 passed.
- e2e: pace-calculator, book-detail, set-up-next, pause, side-reads, home and reentry gave 108 passed. Before the patches, a wider Book detail run also covering the card-notes and book-states specs gave 177 passed.
- `npm run check`: exit 0.

**Residual risks:**
- The full e2e suite wasn't run (`npm run check` runs its own e2e scope).
- The checklist's optional follow-ups are open for `bmad-testarch-automate`: a "17.3" prefill in the browser, a years case in the browser, axe in both themes, and the PAC-UNIT-002 shared fixture.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
