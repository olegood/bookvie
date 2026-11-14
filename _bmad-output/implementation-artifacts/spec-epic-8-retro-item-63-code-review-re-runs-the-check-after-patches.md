---
title: 'Have code review re-run the full check after any patch, and type its commit by the files it changes'
type: 'chore'
created: '2026-11-14'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** this is Epic 8 retro item 63 (PL-1; sprint item `epic-8-retro-item-63-…`), due before the next story. Review 8.3 patched README wording and a test literal, re-ran one spec file, and marked the story `done` without the full `npm run check`. It committed `85f8eef` as `docs:` although that commit changes `frontend/e2e/catalog-typeset-covers.spec.ts`. `f8fccfa` (review 8.2) is also `docs:` while it changes `frontend/e2e/catalog-tile-marks.spec.ts` and `frontend/src/styles/tokens.css`. Nothing in `bmad-code-review` or AGENTS.md asks for the full check after a patch or says how to type the review commit. Earlier reviews that patched code did type it right (`f8691aa fix: … and close the review (story 6.3)`, `a12fb25 test: …`).

**Approach:**
- **`_bmad/custom/bmad-code-review.toml`, new persistent fact "Full check after any patch":** in step 4 §6, before `new_status` can be `done`, if §5 applied any patch, run the full `npm run check` from the repo root, however small the patch. One spec file or one layer doesn't count. A run from before the patch doesn't count either, nor does the build's run. If it passes, record the result (exit code and the pytest, unit and e2e counts) in the spec's review log. If it fails, fix the failure as another patch and run it again, or set `new_status` = `in-progress` and report the failure. The review's own bookkeeping writes (the spec, `sprint-status.yaml`, `deferred-work.md`, the README story count) don't trigger the check on their own.
- **Same file, new persistent fact "Review commit type":** when the review's changes are committed, the conventional-commit type follows the files they change, not the step. `docs:` only when every changed file is Markdown or `sprint-status.yaml`. Otherwise use `test:` when the only non-docs files are tests (`frontend/e2e/`, `*.test.ts`, `backend/tests/`), and `fix:` (or `refactor:`) when a source file changes (`backend/bookvie/`, `frontend/src/` outside tests, including CSS). The subject follows the existing shape, `<type>: <what changed> and close the review (story X.Y)`, as in `f8691aa` and `a12fb25`.
- **AGENTS.md "Story pipeline", step 3:** one sentence. After any patch it re-runs the full `npm run check` before it marks the story `done`, and the commit type follows the files changed (Epic 8 retro item 63).
- No code changes. `85f8eef` and `f8fccfa` stay as they are, since history isn't rewritten.

</frozen-after-approval>

## Implementation Notes

- **Where it lands:** `bmad-code-review` has no commit step of its own. The commit happens after step 4, in the same session. So the type rule is a persistent fact that applies whenever this session commits the review's changes. The check rule is tied to step 4 §6's `done` decision, which is the gate PL-1 slipped past.
- **Run time:** the full check runs pytest, the unit tests, the build, about 665 e2e tests and the smoke test. The fact says to give it a long timeout or run it in the background and wait for it, never to cut it short.
- **Files changed:** `_bmad/custom/bmad-code-review.toml` (two new persistent facts, placed before "README story count"), `AGENTS.md` ("Story pipeline", step 3, two sentences).
- **After review:**
  - **Order:** the check fact runs before `new_status` is decided and before `done` is written anywhere (spec, sprint-status, README count), since §6 writes the status first.
  - **Where the result goes:** the spec's `### Review Findings`, the section step 4 already writes. A fix for a failed run is a checked `[Review][Patch]` item there.
  - **A flaky or unrelated failure** gets at most one more full run, with both results recorded; a second failure means `in-progress`. Never `done` on a failed run.
  - **Commit type:** it goes by the most significant file: source → `fix:`/`refactor:`, else tests (now including `*.test.mjs`) → `test:`, else scripts, config and `_bmad/` files → `chore:`. That widens the Intent's list, which named no type for those files.
  - **AGENTS.md** also says a review with no patch needs no re-run, and names the other types.
- **Checks (2026-11-14):** the TOML parses with `tomllib` (7 persistent facts), and `resolve_customization.py --key workflow` for bmad-code-review returns both new facts. The behaviour isn't exercised here. The next story's review (Epic 9's first) is the first live check.
- **Sprint item 63** is marked `done` with `sprint_status.py --set-action-status` in the same commit, approved by Oleg on 2026-11-14.

## Review Triage Log

### 2026-11-14: Blind Hunter, pass 1

Floor N = 4 (about 10.4 kB). It reported 10 findings.

- **`[medium]` `[patch]` The check could run after `done` was written.** §6 sets the status first, so the fact now gates before any `done` write.
- **`[medium]` `[patch]` A flaky or unrelated failure had no rule,** which invites re-running until it passes. Now: at most one more full run, both recorded, then `in-progress`.
- **`[low]` `[patch]` Some files had no commit type** (`*.test.mjs`, scripts, config, `_bmad/`). Added to `test:` and a `chore:` fallback.
- **`[low]` `[patch]` "The spec's review log" named no real section.** Now `### Review Findings`.
- **`[low]` `[patch]` A fix for a failed check wasn't recorded.** It is now a checked `[Review][Patch]` item.
- **`[low]` `[patch]` The AGENTS.md sentence left out the no-patch case and the other types.** Added.
- **`[low]` `[patch]` The spec didn't record the check results.** Added under Checks.
- **`[low]` rejected: no planned commit subject in the spec.** The step's commit rule covers it. It will be `chore:`, since the TOML isn't Markdown.
- **`[low]` rejected: the shortened sprint item ID.** Earlier retro specs write it the same way (item 47), and the full key is in `sprint-status.yaml`.
- **`[low]` rejected: the Problem section doesn't mention that 8.1's `docs:` was right.** Cosmetic. The no-patch rule already matches `093ee0c`.
