---
title: 'Write down the Chrome-only browser decision where builds and reviews read it'
type: 'chore'
created: '2026-11-12'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Epic 4 retro decided that Oleg uses Chrome, which the Chromium-only e2e run covers, so Safari and Firefox checks are dropped (`deferred-work.md:419`; `epic-4-retro-2026-11-09.md:190`). That decision lives only in a retro and a closed deferred entry, which builds and reviews don't read. In Story 7.2 both reviews raised Safari mouse-focus behavior, and the code review's fix `0383cbc` ("after a Safari click") targets a browser nobody ran (Epic 7 retro PL-2, sprint item `epic-7-retro-item-59-…`). Oleg confirmed Chrome only on 2026-11-12.

**Approach:**
- `AGENTS.md`: a short section stating that bookvie supports desktop Chrome (Chromium) only, that the e2e suite runs Chromium only (`frontend/playwright.config.ts`), and that a review finding only Safari or Firefox would show is out of scope: reject it with that reason, citing this section, unless Oleg reopens the decision. Cite the Epic 4 decision and Epic 7 retro item 59.
- `DESIGN.md` → Layout & Spacing → Viewport: "Desktop browser only" becomes desktop Chrome only, pointing to AGENTS.md.
- `deferred-work.md`: one entry under a new "Epic 7 retro item 59" heading recording that `0383cbc`'s Safari intent stays unverified and the change is kept, because focusing the chip and checkbox on click is also correct in Chromium; it carries a `resolved:` line, since nothing is left to do.
- No code changes; `0383cbc` stays as it is.

</frozen-after-approval>

## Implementation Notes

- **AGENTS.md:** a new "Supported browser" section after "Epic boundaries". It names the evidence (`projects` in `frontend/playwright.config.ts`, a single `chromium` project), the Epic 4 decision and Epic 7 item 59, and the review rule. It adds one boundary the action didn't spell out: behavior Chromium also shows stays in scope even when a reviewer noticed it while thinking of another browser, so a real Chromium bug isn't rejected by mistake.
- **DESIGN.md:** only the Viewport bullet's first sentence changed. `e2e/app-shell.spec.ts` reads DESIGN.md's frontmatter only, so the body edit can't affect a test.
- **deferred-work.md:** one entry with a `resolved:` line (kept as is). `FilterChips.tsx:99-104` and `:133` are the code it describes.
- **EXPERIENCE.md** → Foundation → Platform names desktop Chrome too, after the review (below).
- **Not changed:** the PRD's "a Book saved from any browser on this machine appears in every other browser" (`prd.md:257`) is about shared storage across clients (A1), not which browser renders the UI; the cataloging skill calls the HTTP API.
- **Sprint item 59** is marked `done` with `sprint_status.py --set-action-status` in the same commit, once Oleg approves.

## Review Triage Log

### 2026-11-12: Blind Hunter, pass 1

Floor N = 3 (about 8.7 kB). It reported 10 findings.

- **`[low]` `[patch]` EXPERIENCE.md's Platform line still said "a desktop or laptop browser".** Patched to desktop Chrome, pointing to DESIGN.md and AGENTS.md, so the paired UX docs agree.
- **`[low]` `[reject]` The launcher opens the default browser, and README:97 gives Firefox and Safari reload shortcuts.** Real, but Oleg's browser is Chrome, so the launcher opens it; the shortcuts are harmless how-to text. Changing the launcher is code outside this item.
- **`[low]` `[patch]` The rule says not to model a Safari click in a test, but `catalog-filter.spec.ts:471` and `:582` do.** AGENTS.md now lists them, with `0383cbc`'s focus-on-click, as kept and not a precedent; the deferred entry names both.
- **`[low]` `[reject]` The Safari comments in `FilterChips.tsx` stay.** They explain why the `focus()` calls exist, which is still true; changing them is a code edit for no behavior change. AGENTS.md names the code as kept.
- **`[low]` `[patch]` The rule covered reviews only, not builds.** Reworded: "When building or reviewing", with the review's reject step kept.
- **`[low]` `[patch]` AGENTS.md cited `deferred-work.md:419`, and those line numbers have already moved once** (the Epic 4 retro cites `:413`). AGENTS.md and the deferred entry now cite the entry's heading.
- **`[low]` `[reject]` Edge, Arc, Brave and Chrome-only findings are undecided.** Nobody uses them here, and "desktop Chrome only" with a Chromium e2e run is the decision Oleg confirmed; spelling out every Chromium browser adds nothing a reviewer needs.
- **`[low]` `[patch]` The last bullet was history, not a rule.** Folded into the opening paragraph as the reason.
- **`[false]` The deferred entry was never deferred.** Entries opened and resolved in one pass follow precedent: "Deferred from: Epic 6 retro item 53" and "Deferred from: Epic 6 trace (retro item 54)" are the same shape.
- **`[false]` The spec has no review record and sprint-status isn't changed.** The reviewer saw it before this step finalized it; sprint item 59 is marked in the commit, after Oleg approves.
