---
title: 'Teach ATDD two more habits: reuse e2e helpers, and measure numbers quoted for shipped UI'
type: 'chore'
created: '2026-11-17'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-11-retro-2026-11-17.md'
  - '{project-root}/_bmad/custom/bmad-testarch-atdd.toml'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** this is Epic 11 retro item 78 (E11-D1, E11-R1; sprint item `epic-11-retro-item-78-teach-atdd-helper-reuse-and-measuring-shipped-ui`), due before Epic 12. E11-D1: Epic 11's ATDD runs copied e2e helpers again (a DESIGN.md parser in three places, two `app-info` fakers plus five inline routes, a hand-copied `AppInfo` type), the third epic in a row to need a clean-up item afterwards (Epic 8 item 65, Epic 10 item 73, Epic 11 item 77). E11-R1: ATDD twice asserted a number for UI that already ships without measuring it: 11.3 asserted a card width `<= 560` when `.card` renders 610px, and 11.4 asserted a 64px top bar when `--space-topbar-height` is 60px. Item 66's probe rule covers new helpers, not quoted numbers.

**Approach:**
- Add two persistent facts to `_bmad/custom/bmad-testarch-atdd.toml`:
  - (a) Before adding a helper or a type to an e2e helper module, search `frontend/e2e/*.ts` (`library.ts` first) for one that already does it, and reuse or extend it. Record "Helpers reused: …" in the checklist.
  - (b) Any number an AC or the spec quotes for UI that already ships (a width, a height, a token's value) is measured on the running app, or read from `tokens.css`, during the probe step before it becomes an assertion. Record it under `## Helper probes`.
- No code or test changes.

</frozen-after-approval>

## Implementation Notes

- **Two facts** appended to `_bmad/custom/bmad-testarch-atdd.toml`, after item 71's two:
  - **Helper reuse:** in step 4, before any new helper, type, constant, locator or route faker (in a module or inline), `grep -n '^export' frontend/e2e/*.ts` with `library.ts` read first, and search the specs for inline copies. API types come from the generated schema. Reuse, or extend with an optional parameter whose default keeps existing callers (an extended helper is "changed", so item 66's probe applies). A new general helper goes in `library.ts`. Generation subagents (steps 4a, 4b) get the fact in their prompt and report what they reused and added; step 4c drops duplicates between them. The checklist's `## Helper probes` opens with `Helpers reused: …` and `Helpers added: …`.
  - **Shipped numbers:** in step 5, with the helper probes, every number a doc quotes for UI that already ships is read from `tokens.css` or measured with a temporary `*.probe.spec.ts` (removed with `rm`). On a mismatch, an AC that describes the shipped UI gets the measured value or a same-leaf relation (build 11.3's `toBe(exportBox.width)`), with the mismatch noted for review; an AC that changes the shipped UI keeps its value. A size for UI the story adds isn't measured, but a token or shipped element it is defined by is. Recorded as a `Shipped numbers:` line in `## Helper probes`.
  - Both have edit-mode and validate-mode clauses, like items 66 and 71.
- **Not changed:** the skill's step files (upstream), AGENTS.md, Epic 11's specs and checklists.
- **Checks (2026-11-17):** the TOML parses with `tomllib` (7 persistent facts), and `resolve_customization.py -k workflow.persistent_facts` for bmad-testarch-atdd returns all seven, re-run after the review patches. The file isn't git-ignored. Epic 12's first ATDD is the first live check.
- **Sprint item 78** is marked `done` in `sprint-status.yaml` in the same commit.

## Review Triage Log

### 2026-11-17: Blind Hunter, pass 1

Floor N = 4 (about 13.5 kB). It reported 11 findings.

- **`[medium]` `[patch]` Steps 4a and 4b run in parallel and can each add the same helper; nothing asked them to report reuse; step 4c, which creates fixture infrastructure, wasn't named.** One root cause: the fact didn't follow the subagent split. It now covers 4c, asks each subagent to return what it reused and added, and has 4c keep one of any two added helpers that do the same job.
- **`[low]` `[patch]` The new `Helpers reused` line overlapped item 66's "reused unchanged, so not probed" sentence.** It now is that list (an extended helper marked "extended, probed"), and `Helper probes: none added or changed` follows it.
- **`[medium]` `[patch]` The search listed exports only, with no command for inline copies,** which is what Epic 11 actually duplicated. Added `grep` commands for `page.route('` and spec-local functions.
- **`[low]` `[patch]` `fixtures.ts` wasn't named.** Added with its exports. The `sizeOf` (`home.ts`) / `boxOf` (`card-note-add-another.ts`) near-duplicate is rejected here: it predates this change, and merging it is a test refactor, not a fact.
- **`[low]` `[patch]` Validate mode would flag inline routes item 77 deliberately kept.** A copy that behaves differently on purpose is allowed when the `Helpers added` line says how.
- **`[medium]` `[patch]` "UI this story adds is not measured" exempted shipped token values quoted for new UI** (the 11.4 failure mode). A token, or a shipped element a new size is defined by, is now always read or measured.
- **`[low]` `[patch]` Dark-redefined tokens and DESIGN.md colors weren't settled.** Read the value for each scheme the leaves use. Colors go through `designColor`, `designComponentColor` or `designTokens`.
- **`[low]` `[patch]` One `Shipped numbers` line or many was unclear.** It now says one line per number.
- **`[low]` rejected: validate mode can't tell which numbers are for shipped UI.** The validator has the AC wording and `tokens.css`, the same inputs the ATDD run used. A mechanical rule would add more than it fixes.
- **`false`: the bookkeeping was ahead of the tree, and the commit type wasn't stated.** The oneshot step sets the spec status and sprint item at finalize, before the commit. The type is `chore:` because the commit changes a `.toml` (AGENTS.md "Story pipeline", Epic 8 item 63).
