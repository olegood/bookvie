---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-17'
storyId: '11.4'
storyKey: '11-4-tell-me-when-a-tab-is-older-than-the-app'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-11-4-tell-me-when-a-tab-is-older-than-the-app.md (Intent, Always/Never rules, I/O matrix, ACs, Review Findings)
  - _bmad-output/test-artifacts/atdd-checklist-11-4-tell-me-when-a-tab-is-older-than-the-app.md
  - _bmad-output/implementation-artifacts/deferred-work.md (the e2e version-literal entries from 11.4's build and review)
  - _bmad/tea/config.yaml
  - frontend/playwright.config.ts; frontend/e2e/fixtures.ts
  - frontend/e2e/update-notice.ts; frontend/e2e/update-notice.spec.ts
  - frontend/e2e/about-this-copy.spec.ts; frontend/e2e/about-this-copy-dev.spec.ts; frontend/e2e/about-this-copy-automate.spec.ts
  - frontend/src/components/UpdateNotice.tsx + UpdateNotice.module.css; frontend/src/lib/updateNotice.ts + .test.ts; frontend/src/lib/announce.ts
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
  - knowledge/fixture-architecture.md
  - knowledge/network-first.md
  - knowledge/playwright-cli.md
---

# Automation Summary: Tell me when a tab is older than the app (story 11.4)

The previous version of this file held the summary for story 11.3. It's in git history (`2384874`).

## Preflight

- **Stack:** `fullstack`, auto-detected. Frontend: Playwright (`frontend/playwright.config.ts`); backend: pytest. Both frameworks are in place. The story touches only the frontend.
- **Mode:** BMad-Integrated. Story 11.4 is `done` after `bmad-code-review` (commit `74f0293`, working tree clean at the start of this run). The spec and ATDD checklist are present.
- **Config:** `tea_use_playwright_utils: false` and `@seontechnologies/playwright-utils` isn't in `package.json`, so the Traditional Patterns fragments load (`fixture-architecture`, `network-first`). No Pact artifacts, so no contract fragments. `tea_browser_automation: auto` adds `playwright-cli`.
- **Inputs to cover:**
  - The ATDD checklist's 13 green-phase follow-ups and its 9 implementation-checklist lines.
  - The deferred e2e version literals (`deferred-work.md`, the build-auto and code-review entries for 11.4). `update-notice.spec.ts` fixes `NEWER = '1.2.0'`, and the 11.3 specs fulfil '1.1.0' and '1.2.0' as fixed strings. `scripts/release.sh 1.2.0` sets the version and then runs `npm run check`, so these leaves would stop the release. This run derives the versions from `BUNDLE_VERSION`.

## Coverage Plan

Browser exploration was skipped. The ATDD leaves already pin the notice's roles and structure, and `UpdateNotice.tsx` is small enough to read. The backend doesn't change. The pure rules have unit cases: `noticeVersion` and `noticeText`, plus `shouldAnnounce`, which the code review added and mutation-proved. So every new browser leaf is E2E, in one new file, `frontend/e2e/update-notice-automate.spec.ts`, on the production worker server. The dev-server follow-up runs there too, with a fulfilled `mode: 'dev'` answer, since the pill and the notice both read only `app-info`. Scope is selective: each follow-up the ATDD left open gets one leaf, and nothing re-proves what the ATDD leaves own.

| # | Target | Level | Priority | Source |
|---|---|---|---|---|
| 0 | Version literals derived from `BUNDLE_VERSION` in the 11.3 and 11.4 specs, so `release.sh` doesn't flip "another version" into the bundle's own | E2E (helpers) | P1 | `deferred-work.md`, 11.4 build-auto and code review |
| 1 | Dark: band `surface-dark`, `line-dark` hairline, sentence `ink-dark`, under Theme System + OS dark and Theme Dark + OS light | E2E | P2 | ATDD follow-up AC-3 dark |
| 2 | 10px vertical padding; at 360px wide the sentence and Reload stay inside the band, no overflow | E2E | P2 | ATDD follow-up AC-3 padding and wrap |
| 3 | Beside the DEV pill: the notice shows, paints no amber, and the pill keeps its amber | E2E | P2 | ATDD follow-up AC-3 dev server |
| 4 | A modal side panel makes Reload inert, and the panel works; the notice stays on Book detail reached by a link | E2E | P2 | ATDD follow-up AC-4 |
| 5 | After Reload, with the server on the bundle's version: no notice, and About this copy reads that version | E2E | P1 | ATDD follow-up AC-5 (Flow 12 climax) |
| 6 | `app-info` fails on load, then a refetch finds another version: notice appears, announced once, not again | E2E | P1 | ATDD follow-up AC-7 (Flow 12 failure path) |
| 7 | The banner's aria snapshot in order, and Reload's accessible description is the sentence | E2E | P2 | ATDD follow-up AC-8; the review's `aria-describedby` |
| 8 | Forced colors: Reload keeps a 1px solid border on every side that isn't `Canvas` | E2E | P2 | ATDD follow-up AC-9 |
| 9 | axe on Backup and Home with the notice shown, light and dark | E2E | P2 | ATDD follow-up axe AC-3 |
| 10 | The four-copy equality check, run on a temp copy with one copy edited | Unit (`node:test`) | P2 | ATDD follow-up AC-1 mutation |

Not new tests:
- **"AC-6 after an intent"** is already proved by `update-notice.spec.ts:444`, the review's save leaf: no focus event, and the save's invalidation finds the version.
- **"Unit AC-2/AC-6"** is proved by `updateNotice.test.ts` for the pure part. Same-again, a third version, back to the bundle's own, and a failure live in the component's effect, so they are e2e (`update-notice.spec.ts:271`, `:319`).
- **"AC-6 the tick"** is retired, with its reason in the checklist.

## Execution

- **Mode:** `tea_execution_mode: auto` would resolve to **subagent**. This run stayed **sequential** in the main session instead. Nine small leaves in one file and one unit leaf didn't justify handing work to a worker. The API and backend workers had nothing to do, since there is no backend change. The output contract is unchanged.
- **Production code untouched:** `git status` lists only the test, script and artifact files below. The mutation probes edited two source files and reverted them (see Tests Added).

## Tests Added

**Helpers.** `frontend/e2e/update-notice.ts` gains `NEWER_VERSION` and `NEWEST_VERSION` (the bundle's minor plus 1 and plus 2), and `OLDER_VERSION = '0.0.0'`. The literal-version edits:
- `update-notice.spec.ts`: `NEWER`, `NEWEST` and `OLDER` now point at the new constants.
- `about-this-copy.spec.ts`, `about-this-copy-dev.spec.ts` and `about-this-copy-automate.spec.ts`: '1.1.0' becomes `BUNDLE_VERSION`, and '1.2.0' becomes `NEWER_VERSION`, in fixtures, expected lines and the aria snapshot. The test titles keep their example versions.
- No assertion changed meaning. Each file still sends either the bundle's own version or another one, exactly as before.

`frontend/e2e/update-notice-automate.spec.ts`:

| Line | Leaf | Priority | Proven red by |
|------|------|----------|---------------|
| 54 | AC-3 dark: `surface-dark` band, `line-dark` hairline, `ink-dark` sentence (Theme System + OS dark, Theme Dark + OS light) | P2 | not mutated |
| 77 | AC-3 10px vertical padding; at 360px the sentence and Reload stay inside the band, no overflow | P2 | `.band` padding set to 12px: got `12px`, wanted `10px` |
| 105 | AC-3 beside the DEV pill: notice shown, no amber in the band, the pill keeps its amber | P2 | not mutated |
| 122 | AC-4 a modal side panel makes Reload inert while the panel works; the notice stays on Book detail | P2 | not mutated |
| 157 | AC-5 after Reload, with the server on the bundle's version: no notice, About this copy reads `BUNDLE_VERSION` | P1 | not mutated |
| 179 | AC-7 `app-info` fails on load, then a refetch finds another version: shown, announced once, not again | P1 | not mutated |
| 207 | AC-8 the banner's aria snapshot in order; Reload's accessible description is the sentence | P2 | Reload's `aria-describedby` removed: description `""`, wanted the sentence |
| 242 | AC-9 forced colors, light and dark: Reload's border is 1px solid on every side and not `Canvas` | P2 | not mutated |
| 262 | AC-3 axe (WCAG 2.2 AA tags) on Backup and Home with the notice, light and dark | P2 | not mutated |

`frontend/scripts/version.test.mjs`:
- The four version reads now take a repo root (`versionCopies(root)`), and the P0 leaf calls it with the real repo.
- **Line 105**, "[P2] AC-1 the equality check names a copy that differs", copies the four files to a temp folder. It checks that they agree, sets `__version__ = "0.0.0"`, and checks that exactly that copy differs and that the equality assertion throws. It is red by construction: the edited copy is the mutation.

**How the mutations were done:**
- The two probes were hand edits with `sed` of `UpdateNotice.module.css` (padding) and `UpdateNotice.tsx` (`aria-describedby`), then `npm run build` and the two leaves. Both failed as listed.
- The same `sed` edits were then reversed and the bundle rebuilt. `git status` showed `frontend/src` unchanged, and no git command changed the tree.

Priority coverage: P0 0, P1 2, P2 8 (unit included), P3 0. The story's P0 paths are the ATDD leaves.

## Validation

- The new spec with the edited specs (`update-notice.spec.ts` and the three `about-this-copy*.spec.ts`): 34 passed. Prettier, oxlint and `tsc -b` are clean.
- `npm run check` (repo root, this session, after the mutations were reverted and the bundle rebuilt): **exit 0**.
  - ruff and pytest: 1605 passed; coverage 98%, gates met.
  - format, tsc and oxlint: clean.
  - node tests: 388 passed, 0 skipped (387 before this run, plus 1).
  - `check:e2e`: **783 passed** (774 before this run, plus 9).
  - smoke: ok.
  - No `~/bookvie-data-dev` was created.
- Quality scan of the new spec: no `waitForTimeout`, `.only`, `.skip`, `Math.random`, `console.log` or `data-testid`. Loops run fixed lists (two schemes, two theme setups, two routes, four border sides). Refetches are awaited through `watchAppInfo` and `expect.poll`. Every route is set before `page.goto`.
- No CLI browser sessions were opened. Temp artifacts (the check logs) are in the session scratch directory, and the unit leaf's temp folder is removed in `t.after`.

## Playwright Utils deviations

None. `tea_use_playwright_utils` is false and `@seontechnologies/playwright-utils` isn't installed. The leaves use the repo's own fixtures and helpers (`page.route`, `page.on('response')`), as every other spec does.

## ATDD Checklist

`atdd-checklist-11-4-tell-me-when-a-tab-is-older-than-the-app.md`:
- **Follow-ups:** of the 13, 12 are ticked, each with its evidence. "AC-6 the tick" is retired: the delay is `announce`'s, proved in `announce.test.ts`, and the waiting-message rule is `shouldAnnounce`'s.
- **Implementation checklist:** all 9 lines are ticked against the ATDD leaves.
- **Remaining `[ ]`: 0.**

The two version-literal entries in `deferred-work.md` (the 11.4 build-auto and code-review entries) now each have a `resolved:` line.

## Assumptions and Risks

- **`OLDER_VERSION` is fixed at '0.0.0'.** It is older than any release bookvie can have, and the notice treats any differing version alike.
- **The newer versions keep major and bump the minor.** A major bump in `release.sh` still produces versions that differ from the bundle's, so nothing flips.
- **The dev leaf runs on the production server** with a fulfilled `mode: 'dev'` answer. The pill and the notice both read only `app-info`, and the real `--dev` chain is `dev-mode*.spec.ts`'s.
- **The inert check** asks whether `focus()` lands on Reload while the modal panel is open, instead of tabbing through the panel. Inert content can't take focus, so it is the same rule, tested without depending on the panel's Tab order.
- **Seven of the nine e2e leaves weren't mutation-tested.** They pin values or flows that the ATDD leaves already exercise in light, and their assertions were checked to run against the real values.

## Next

Story 11.4 closes Epic 11. Next, in order (AGENTS.md "Epic boundaries"):
1. The Epic 11 retrospective (`bmad-retrospective`).
2. The epic's trace and gate.
3. The spine reconciliation for the Epic 11 "spine drift" entries.

Epic 12 starts only after those.

