---
title: 'Make the pace calculator agree with Home while it holds the prefill'
type: 'bugfix'
created: '2026-11-11'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** For the same Main book, Home's "~N days left" and the Book detail calculator can disagree (Epic 6 retro E6-R1, action 55). Home divides by the exact Measured pace (a `Fraction`, `domain/pace` `days_left`). The calculator divides by its prefill, rounded to one decimal. At a pace of 100/3 with 300 pages left, Home says "~9 days left" and the calculator "About 10 days". `pace.cases.json` holds only typed decimal paces, so neither suite compares the two. Oleg chose to align them.

**Approach:**
- While the field holds the untouched prefill, the calculator computes with the unrounded `measuredPace`. Once the text differs from the prefill, it computes with the typed number. The field still shows the one-decimal text.
- "Untouched" is decided by text: the field's text equals `pacePrefill(measuredPace)` for the current `measuredPace`. Typing the prefill back by hand also computes with the exact pace, which is the same number the user sees. A refetch that changes Measured pace while the field keeps its old text computes with that text, never with a pace the field doesn't show.
- The rule lives in `lib/pace.ts`, so it applies to both hosts, Book detail and Catalog.
- Add a unit case and an e2e leaf comparing Home's "~N days left" with the calculator's line for one Main book at 100/3. Reword the existing fractional-prefill leaf, which claims "the result uses the prefilled value".
- Note the rule in EXPERIENCE.md → Pace calculator, and in AD-6's calculator bullet, which item 52 wrote to point at EXPERIENCE.md for the prefill.

</frozen-after-approval>

## Implementation Notes

- **`lib/pace.ts` `paceResult`** takes an optional fourth argument, `measuredPace`. The typed text still decides whether there is a result (plain decimal, a positive number). Only then, when the trimmed text equals `pacePrefill(measuredPace)`, the days use `measuredPace` instead of the typed number. The days keep the `toPrecision(12)` correction, so 300 ÷ 33.333333333333336 (= 8.999…98) is 9.
- **Surprise, caught by the new unit test:** the first version swapped the pace in before the zero check. A Measured pace that rounds to the prefill "0" (0.04) then showed "About 21 years" while the field read "0", which breaks Story 6.1's AC-4 (zero shows nothing). The zero check now runs on the typed number first.
- **`PaceCalculator.tsx`** passes `measuredPace`. Both hosts get the rule, Book detail and Catalog. Catalog has no other figure to agree with, but its untouched line now uses the exact library pace too.
- **Tests:**
  - `pace.test.ts` `[P1] E6-R1`: for six fractional paces (100/3, 400/7, 29/20, 20/3, 1/3, 41/2) and every pages left under 60 days, the untouched prefill gives the server's exact `max(1, ceil(pagesLeft × den ÷ num))`. It also pins 300 @ 100/3 (9 days), "33.30" and "33.4" typed, no `measuredPace`, whitespace, and the "0" prefill.
  - `pace-calculator.spec.ts` `[P1] E6-R1`: Home's "~9 days left" for the Main book (300 left at 100/3), then Book detail's "About 9 days · 6 November"; "33.30" gives 10 days, and "33.3" retyped gives 9 again. The fractional-prefill leaf is reworded ("uses the unrounded pace"); its 13 days doesn't change, since 412 ÷ 100/3 and 412 ÷ 33.3 both round up to 13.
  - **Mutation check:** with the swap removed, the unit test fails 1 of 6 and the e2e leaf fails ("About 10 days · 7 November" for "About 9 days · 6 November"). Restored and rebuilt.
- **Docs:** EXPERIENCE.md → Pace calculator and AD-6's calculator bullet state the rule. AD-6 isn't in the retro's change list, but item 52 had written it to describe the prefill, so leaving it would be stale.
- **`pace.cases.json` is unchanged.** It holds typed paces, which keep their meaning. The new unit test compares against the exact formula instead of the backend, since `days_left` is that formula with `Fraction`.
- **After review:**
  - `pace.cases.json` gains `prefillCases`: an exact Measured pace as a fraction, its pages left and the server's days. `test_pace_calculator.py` checks each row against `days_left` with `Fraction`. `pace.test.ts` feeds the client the float the view serializes and its prefill, and expects the same days. The rows include both of the retro's cases (400 @ 100/3: 12, 60 @ 26/25: 58) and a large fraction (12345/678). The shared table now guards the untouched prefill too, as AD-6 says.
  - `catalog-pace-calculator.spec.ts` `[P2] E6-R1` pins the rule on Catalog: 300 pages left at 100/3 is 9 days, "33.30" is 10.
  - **Correction to the frozen Approach**, which says that retyping the prefill "computes with the exact pace, which is the same number the user sees". The field shows the rounded number, "33.3", and the line uses the exact one, 33.33…. That gap is the rule itself.
- **Open for Oleg:** with the text rule, a pace typed just above the prefill can read a day later than the prefill: at 300 pages left and 100/3, "33.3" is 9 days and "33.31" is 10. A unit assert pins it as current behavior. It follows from aligning only the untouched field (an "edited" flag would do the same); avoiding it would mean showing more decimals in the prefill.

## Review Triage Log

### 2026-11-11: Blind Hunter, pass 1

Floor N = 5 (about 23 kB). It reported 10 findings.

- **`[medium]` `[patch]` A pace typed just above the prefill reads a later finish** ("33.31" → 10 days, "33.3" → 9 at 300 @ 100/3). Real, and inherent in Oleg's choice to align only the untouched field. Patched by pinning it in `pace.test.ts` with its reason, and flagged for Oleg in the Implementation Notes; the rule isn't changed.
- **`[low]` `[patch]` The frozen Approach says the exact pace is "the same number the user sees".** Wrong: the field shows 33.3. The frozen block isn't edited; the Implementation Notes correct it.
- **`[medium]` `[patch]` The retro's own cases weren't pinned** (400 @ 100/3: 12 vs 13; 60 @ 26/25: 58 days vs "About 2 months"). Added as explicit asserts and as `prefillCases` rows.
- **`[medium]` `[patch]` Nothing checked the untouched prefill against the server; AD-6 names the case table as the guard.** Patched: `prefillCases` in `pace.cases.json`, read by both suites (above).
- **`[low]` `[patch]` Catalog gets the rule with no test.** Added `catalog-pace-calculator.spec.ts` `[P2] E6-R1`.
- **`[low]` `[patch]` No test for a Measured pace that changes while the field keeps its text.** Added: `paceResult(300, '33.3', TODAY, 33.36)` uses 33.3 (10 days).
- **`[low]` `[patch]` The e2e file's header didn't state the rule.** Added.
- **`[low]` `[patch]` "AC-4" didn't name its story.** Now "Story 6.1's AC-4".
- **`[false]` The spec is still `in-progress`, item 55 still open, the spine edit outside the change list.** The spec is finalized in this step; the sprint item is marked when Oleg asks for the commit, as for items 52 to 54; the AD-6 edit is explained in the Implementation Notes ("Docs").
- **`[low]` `[patch]` The formula loop's title claimed "the server days left".** Retitled "the exact-fraction formula"; the server comparison is now the `prefillCases` test.

A second Playwright run started beside the full check during the review patches, so both were discarded. The two calculator specs were re-run alone (23 passed), and the full check re-run with nothing beside it.

