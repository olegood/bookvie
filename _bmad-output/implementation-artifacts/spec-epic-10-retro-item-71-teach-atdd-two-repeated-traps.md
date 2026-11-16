---
title: 'Teach ATDD two repeated traps: floored border widths and APP_STORAGE_KEYS'
type: 'chore'
created: '2026-11-16'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-10-retro-2026-11-16.md'
  - '{project-root}/_bmad/custom/bmad-testarch-atdd.toml'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** this is Epic 10 retro item 71 (E10-R1, E10-R2; sprint item `epic-10-retro-item-71-teach-atdd-two-repeated-traps`), due before Epic 11. Story 10.1's ATDD asserted `1.5px` borders through `toHaveCSS`, which Chromium can never return because it floors computed border widths to whole CSS pixels (known since the Epic 1 retro). Item 66's probe rule didn't catch it, since a built-in `toHaveCSS` read isn't a helper. Separately, a story's new `localStorage` key missed `APP_STORAGE_KEYS` in `frontend/e2e/catalog-filter.spec.ts` for the second epic in a row (Story 9.2, then Story 10.1), and each time a review caught it.

**Approach:**
- Add two persistent facts to `_bmad/custom/bmad-testarch-atdd.toml`:
  - Never assert a fractional border or outline width through `toHaveCSS`. Assert the floored value and pin the token that sets it (as `e6dcc1e` does), or measure another way. Probe any such read under item 66's rule before the red run.
  - When a story adds a `localStorage` key, the red phase adds it to `APP_STORAGE_KEYS` in `frontend/e2e/catalog-filter.spec.ts`.
- No code or test changes.

</frozen-after-approval>

## Implementation Notes

- **Two facts** appended to `_bmad/custom/bmad-testarch-atdd.toml`, after item 66's three:
  - **Floored widths:** never `toHaveCSS` a fractional `border-*-width` or `outline-width`. Assert the floored value and pin the token from the same element with `getComputedStyle(…).getPropertyValue('--token')`, as `e6dcc1e` does in `catalog-sort-direction.spec.ts`. With no token, measure another way that tells 1.5px from 1px and say how in the checklist. Comparing the width with the token read back at run time is banned as a tautology (build 10.1's first rewrite). Each such read is probed under item 66's rule, even though `toHaveCSS` is built in, and recorded in `## Helper probes`.
  - **Storage keys:** a new `localStorage` key (renamed or removed too) goes into `APP_STORAGE_KEYS` and the comment above it in `catalog-filter.spec.ts` during ATDD. The leaf `[P2] AC-7 a filter leaves the remembered sort alone…` only checks `toContain`, so the early add keeps it green before the feature exists. The checklist gets a `Storage keys:` line, and validate mode fails without it.
- **Not changed:** the skill's step files (upstream), AGENTS.md, and Story 10.1's spec. The action names only the override. The build gets no copy of these facts. Its review and `bmad-code-review` caught both traps before.
- **Checks (2026-11-16):** the TOML parses with `tomllib` (5 persistent facts), and `resolve_customization.py -k workflow.persistent_facts` for bmad-testarch-atdd returns all five, re-run after the review patches. The file isn't git-ignored. Epic 11's first ATDD is the first live check.
- **Sprint item 71** is marked `done` in `sprint-status.yaml` in the same commit.

## Review Triage Log

### 2026-11-16: Blind Hunter, pass 1

Floor N = 4 (about 10.8 kB). It reported 13 findings.

- **`[low]` `[patch]` Item 66's edit-mode line still said "the three facts".** It now says "the three probe facts above".
- **`[medium]` `[patch]` The width fact had no edit or validate mode.** Added: edit mode covers the leaves the edit adds or changes. Validate mode fails on a fractional `toHaveCSS` width, a checklist row naming one, or a width read missing from `## Helper probes`.
- **`[low]` rejected: pinning the token doesn't prove the rule uses it.** A rule rewritten to a literal `1px` while the token stays `1.5px` would pass both checks. That's real, but the action prescribes the `e6dcc1e` pattern, and closing the gap needs a CSSOM or mutation step for every such leaf. It would rarely matter here, since bookvie's text-field borders are all drawn from the token.
- **`[low]` `[patch]` The token-read example was a one-shot read with no wait.** It now runs after the floored `toHaveCSS`, or inside `expect.poll`.
- **`[low]` `[patch]` The floor claim named no Chromium version.** It now says "seen on Chromium 156", and that the probe is the authority after an upgrade.
- **`[low]` `[patch]` "Measure another way" had no method.** Added the declared value read through the CSSOM as an example.
- **`[medium]` `[patch]` The storage-key fact overstated the leaf.** It now names the leaf by title and says it only sees the keys its own steps leave behind.
- **`[low]` `[patch]` Validate mode had no way to find a story's keys.** It now uses `grep -rn localStorage frontend/src` and the `STORAGE_KEY` constants.
- **`[low]` `[patch]` Edit mode covered only added keys.** It now covers keys the edit adds, renames or removes.
- **`[low]` rejected: `sessionStorage` isn't covered.** `bookDetail.ts` uses one `sessionStorage` key, but no list like `APP_STORAGE_KEYS` exists for it. The fact now says `sessionStorage` is out of scope.
- **`false`: the bookkeeping was ahead of the tree.** The spec status and sprint item are set at finalize, before the commit, as the oneshot step orders.
- **`[low]` `[patch]` "Not changed: the spec file itself" was unclear.** It now says Story 10.1's spec. The missing acceptance section is the oneshot template's design.
- **`[low]` `[patch]` The spec cited a bare line number.** It now names the leaf by title.
