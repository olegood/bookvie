---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-17'
storyId: '11.3'
storyKey: '11-3-show-the-version-on-the-backup-page'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-11-3-show-the-version-on-the-backup-page.md (Intent, Always/Never rules, I/O matrix, ACs, Review Findings)
  - _bmad-output/test-artifacts/atdd-checklist-11-3-show-the-version-on-the-backup-page.md
  - _bmad/tea/config.yaml
  - frontend/playwright.config.ts; frontend/e2e/fixtures.ts
  - frontend/e2e/about-this-copy.spec.ts; frontend/e2e/about-this-copy-dev.spec.ts; frontend/e2e/about-this-copy.ts
  - frontend/e2e/dev-mode.ts; frontend/e2e/dev-mode-automate.spec.ts (Theme, forced-colors patterns)
  - frontend/src/pages/BackupPage.tsx + BackupPage.module.css; frontend/src/lib/aboutThisCopy.ts + .test.ts; frontend/src/api/views.ts
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

# Automation Summary: Show the version on the Backup page (story 11.3)

The previous version of this file held the summary for story 11.2. It's in git history (`4d87f74`).

## Preflight

- **Stack:** `fullstack`, auto-detected. Frontend: Playwright (`frontend/playwright.config.ts`); backend: pytest. Both frameworks are in place. The story touches only the frontend.
- **Mode:** BMad-Integrated. Story 11.3 is `done` after `bmad-code-review` (commit `96b017e`, working tree clean at the start of this run). The spec and ATDD checklist are present.
- **Config:** `tea_use_playwright_utils: true`, but `@seontechnologies/playwright-utils` isn't in `package.json`, so the Playwright Utils gate stays shut and the Traditional Patterns fragments load (`fixture-architecture`, `network-first`). No Pact artifacts, so no contract fragments. `tea_browser_automation: auto` adds `playwright-cli`.
- **Inputs to cover:** the ATDD checklist's 8 green-phase follow-ups and 4 implementation-checklist lines; from the build and review, no card on Backup's couldn't-load state and the line spacing inside the card. The review's deferred items (spine drift, an EXPERIENCE.md wording fix) carry no test work.

## Coverage Plan

Browser exploration was skipped. The ATDD leaves already pin the Backup page's roles and structure, and `BackupPage.tsx` is small enough to read. The backend doesn't change, and 11.2 covers `app-info` per mode at API level. The pure line rules already have their unit cases (`aboutThisCopy.test.ts`, 6 cases after the review), so every new leaf is E2E. They go in one new file, `frontend/e2e/about-this-copy-automate.spec.ts`, on the production worker server. The dev-line refetch also lives there: the card reads only `app-info`, so a fulfilled `mode: 'dev'` answer tests it without a `--dev` server. Scope is selective: each follow-up the build and review left open gets one leaf, and nothing re-proves what the ATDD leaves own.

| # | Target | Level | Priority | Source |
|---|---|---|---|---|
| 1 | Dark: heading `ink-tertiary-dark`, lines `ink-secondary-dark`, card `surface-dark` with `line-dark` border, under Theme System + OS dark and Theme Dark + OS light | E2E | P2 | ATDD follow-up AC-1 dark |
| 2 | Spacing: line 1 starts the card's 12px gap below the heading; line 2 directly under line 1, no gap | E2E | P2 | ATDD follow-up AC-1 line spacing; review rejection (Blind) |
| 3 | Dev line survives a failed refetch: fulfilled dev answer, then a 500 on focus; line 1 unchanged, nothing said | E2E | P2 | ATDD follow-up AC-2 refetch |
| 4 | Real temp folder: the folder line equals the server's `dataDir`, an absolute path starting with `/` | E2E | P2 | ATDD follow-up AC-3 |
| 5 | Stale tab: a focus refetch answering another version updates line 1 to it | E2E | P2 | ATDD follow-up AC-4 |
| 6 | Forced colors (light and dark): heading and lines are `CanvasText`, the card keeps a visible 1px border | E2E | P2 | ATDD follow-up AC-5 forced colors |
| 7 | Screen-reader text: the region's aria snapshot is the `h2` then the two lines, in order | E2E | P2 | ATDD follow-up AC-5 |
| 8 | Couldn't-load: with the backup view failing and `app-info` loaded, Backup shows Couldn't load and no About card | E2E | P2 | Build residual risk; review rejection (Blind) |

The ATDD unit follow-up (production, dev with and without a commit, production with a commit sent) is already met by `aboutThisCopy.test.ts`, so it gets no new test.

## Execution

- **Mode:** `tea_execution_mode: auto` would resolve to **subagent**. This run stayed **sequential** in the main session instead. Eight small leaves in one file didn't justify handing work to a worker, and the API and backend workers had nothing to do: no backend change, and the pure line rules already have unit cases. The output contract is unchanged.
- **Production code untouched:** `git status` lists only the files below.

## Tests Added

No helper, fixture or factory was added. The leaves use `about-this-copy.ts` (`aboutCard`, `exportButton`, `fulfilAppInfo`, `serverAppInfo`, `ABOUT`, `AppInfo`), `dev-mode.ts` (`watchAppInfo`, `liveRegionText`, `systemColor`), `library.ts` (`rgbOf`, `INK_SECONDARY_DARK`) and `fixtures.ts`. `chooseTheme` is copied locally, as in `dev-mode-automate.spec.ts`. The three dark tokens with no constant in `library.ts` are named constants at the top of the spec.

`frontend/e2e/about-this-copy-automate.spec.ts`:

| Line | Leaf | Priority | Proven red by |
|------|------|----------|---------------|
| 53 | AC-1 dark: `surface-dark` card, `line-dark` border, `ink-tertiary-dark` heading, `ink-secondary-dark` lines (Theme System + OS dark, Theme Dark + OS light) | P2 | `.aboutHeading` color set to `ink-secondary`: got `rgb(179, 183, 173)`, wanted `rgb(154, 158, 148)` |
| 79 | AC-1 line 1 starts 12px (the card gap) below the heading; line 2 sits directly under line 1 | P2 | `.aboutLines` turned into a flex column with the 12px gap: line 2 was 12px under line 1, wanted 0 |
| 97 | AC-2 a dev line 1 survives a failed focus refetch, nothing said | P2 | not mutated |
| 119 | AC-3 on the real server the folder line is the server's own `dataDir`, its absolute realpath | P2 | not mutated |
| 133 | AC-4 a tab left open reads the new version after a focus refetch answers it | P2 | not mutated |
| 151 | AC-5 forced colors, light and dark: heading and lines `CanvasText`, card border 1px solid and not `Canvas` | P2 | not mutated |
| 178 | AC-5 aria snapshot: region, `h2` "About this copy", version paragraph, folder paragraph | P2 | not mutated |
| 193 | AC-4 Backup's couldn't-load state shows no card, with `app-info` answered 200 | P2 | not mutated; the early return is structural, and a mutation would need a TSX rewrite |

The mutations were hand edits of `BackupPage.module.css`. The file was first copied to the session scratch directory and copied back afterwards; `cmp` matched the backup, and `git status` showed it unchanged. No git command changed the tree.

Priority coverage: P0 0, P1 0, P2 8, P3 0. The story's P0 and P1 paths are the ATDD leaves.

## Validation

- The new spec with the ATDD specs and `backup.spec.ts`, `--repeat-each=3`: 75 passed, none flaky. Prettier, oxlint and `tsc -b` are clean.
- `npm run check` (repo root, this session, after the mutations were reverted): **exit 0**.
  - ruff and pytest: 1605 passed; coverage 98%, gates met.
  - format, tsc and oxlint: clean.
  - node tests: 377 passed, 0 skipped.
  - `check:e2e`: **763 passed** (755 before this run, plus 8).
  - smoke: ok.
  - No `~/bookvie-data-dev` was created.
- Quality scan of the new spec: no `waitForTimeout`, `.only`, `.skip`, `Math.random`, `console.log` or `data-testid`. Loops run fixed lists (two schemes, three text elements, four border sides). Refetches are awaited through `watchAppInfo` and `expect.poll`. Every route is set before `page.goto`.
- No CLI browser sessions were opened. Temp artifacts (the CSS backup, the check logs) are in the session scratch directory, not the repo.

## Playwright Utils deviations

None. `tea_use_playwright_utils` is true in config, but `@seontechnologies/playwright-utils` isn't installed, so the mandate's gate doesn't open. The leaves use the repo's own fixtures and helpers (`page.route`, `page.on('response')`), as every other spec does.

## ATDD Checklist

`atdd-checklist-11-3-show-the-version-on-the-backup-page.md`: all 8 green-phase follow-ups and all 4 implementation-checklist lines are ticked, each with its evidence. Remaining `[ ]`: **0**.

## Assumptions and Risks

- **The dev refetch leaf runs on the production server** with a fulfilled `mode: 'dev'` answer. The card reads only `app-info`, and the real `--dev` chain is `about-this-copy-dev.spec.ts`'s.
- **The spacing leaf records the built layout** (12px, then 0). DESIGN.md doesn't pin the spacing, so if the design settles on another value, this leaf changes with it.
- **The forced-colors border check only requires that the border isn't `Canvas`.** It doesn't name the color Chromium forces, so a change in Chromium's mapping doesn't break it, while a border that disappears still fails.
- **The couldn't-load leaf wasn't mutation-tested.** It guards against a future refactor that moves the card above the early return.

## Next

Story 11.3 is Epic 11's third story, and 11.4 is still in backlog. Next: Story 11.4's ATDD (`bmad-testarch-atdd`). The spine-drift entries from 11.1 to 11.3 wait for the Epic 11 reconciliation.
