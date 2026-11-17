---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-17'
storyId: '11.3'
storyKey: '11-3-show-the-version-on-the-backup-page'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-113-show-the-version-on-the-backup-page'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-11-3-show-the-version-on-the-backup-page.md'
generatedTestFiles:
  - 'frontend/e2e/about-this-copy.spec.ts'
  - 'frontend/e2e/about-this-copy-dev.spec.ts'
  - 'frontend/e2e/about-this-copy.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 11, Story 11.3; FR-27, UX-DR71, UX-DR72)'
  - '_bmad-output/implementation-artifacts/epic-11-context.md'
  - '_bmad-output/planning-artifacts/dev-prod-favicon-plan-2026-11-17.md (D9, D10)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (components.about-card, Backup page and About this copy rows, typography.section-label, typography.body-sm)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (About this copy row, app-info not loaded / refetch failed rows)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/review-rubric-epic11.md (third card supersedes "under Last export"; h2 level; " · " as text; long path rule)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml'
  - '_bmad-output/test-artifacts/atdd-checklist-11-2-keep-development-apart-from-the-real-library.md (format)'
  - '_bmad/tea/config.yaml'
  - 'frontend/src/pages/BackupPage.tsx + .module.css, src/api/views.ts (useAppInfo), src/api/queryClient.ts, src/api/generated/schema.d.ts (AppInfoView), src/styles/tokens.css'
  - 'frontend/e2e/fixtures.ts, backup.spec.ts, restore.ts, restore.spec.ts, dev-mode.ts (watchAppInfo, liveRegionText), dev-mode.spec.ts (AC-8 refetch pattern), home.ts (DUNE), home-slice.spec.ts (section-label heading)'
  - 'backend/bookvie/__init__.py (__version__ 1.1.0)'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given a production server with app-info loaded, when I open Backup, then a third surface card follows Export and Restore, in the same frame: a section labelled by its h2 "About this copy" (shown uppercase in section-label/ink-tertiary), then "bookvie 1.1.0" and "Data folder: ~/bookvie-data" on two lines in body-sm/ink-secondary, sans, with the version and folder taken from app-info; and no commit and no "Development server" appear' }
  - { id: AC-2, idSource: generated, text: 'Given a dev server with a commit, when I open Backup, then line 1 reads "bookvie 1.1.0 (a1b2c3d) · Development server", with " · " as text (space, middle dot, space), and line 2 "Data folder: ~/bookvie-data-dev" (or the folder given); and with commit: null, line 1 reads "bookvie 1.1.0 · Development server", with no brackets' }
  - { id: AC-3, idSource: generated, text: 'Given a data folder outside the home folder, such as an e2e temp folder, when the card renders, then the folder shows as the full absolute path the server sends, wrapping anywhere inside the card (overflow-wrap: anywhere) and never cut short' }
  - { id: AC-4, idSource: generated, text: 'Given app-info not loaded yet, or failing, when I open Backup, then the card is left out silently, nothing says it failed, and Export and Restore work as before; and a refetch that fails after a success keeps the card as it was' }
  - { id: AC-5, idSource: generated, text: 'Given the card, when a screen reader or keyboard user reaches it, then it is plain read-only text, with no copy button and no Tab stop, and the page''s headings run h1 "Backup" then h2 "About this copy"; and the axe check for Backup passes in light and dark' }
  - { id: AC-6, idSource: generated, text: 'Given the existing Backup e2e specs, when they run, then they pass unchanged' }
---

# ATDD Checklist: Story 11.3 Show the version on the Backup page

## Preflight

- **Stack:** `fullstack`, auto-detected. Playwright (`frontend/playwright.config.ts`) and pytest (`backend/tests/conftest.py`) are both in place. This story only touches the frontend: `GET /api/views/app-info` shipped in 11.2 and doesn't change.
- **Story:** Story 11.3 in `epics.md` has 6 Given/When/Then criteria and none carry ids, so they're numbered AC-1 to AC-6 in source order (registry above). Each "And" line belongs to the criterion above it. `sprint-status.yaml` reads `backlog`, and 11.1 and 11.2 are `done`.
- **Epic gate:** 11.3 isn't Epic 11's first story, so the spine gate doesn't apply. The spine already plans the card (FR-27 → `pages/BackupPage` About this copy).
- **Config:** `tea_use_playwright_utils: false`, so the Traditional Patterns fragments apply. There's no Pact. `tea_browser_automation: auto` loads `playwright-cli.md`.
- **What exists today:**
  - `BackupPage.tsx` renders `PageHeading` "Backup", then two `section`s with `aria-label`s, "Export" and "Restore", with `.card` styles: `surface`, 1px `line` border, `radius-xl`, padding `20px 24px`, max-width 560px. It has no `h2` and no third card. A failed backup view shows the couldn't-load line with Try again and no cards.
  - `useAppInfo()` in `api/views.ts` returns `AppInfoView | undefined`, `{ version, mode, dataDir, commit }`, keyed `['view','app-info']`. `AppShell` already calls it, so every page asks for `app-info` today. Queries use `retry: false` and `refetchOnWindowFocus: true`.
  - On a production server `app-info` answers `version` `1.1.0`, `mode` `production` and `commit` `null`, with `dataDir` the e2e temp folder as a full absolute path (it is outside the home folder).
- **Placement:** the third card follows Restore. DESIGN.md says so explicitly: it supersedes plan D9's "under Last export".

## Generation Mode

**AI generation**, run sequentially in this session. Recording isn't needed: the Backup page, its regions and its roles already ship, and the story pins the card's text.

## Test Strategy

| AC | Level | Priority | Leaf (first assertion in bold) | Why this level |
|---|---|---|---|---|
| AC-1 | E2E (production worker server) | P0 | `about-this-copy.spec.ts`. The server's own `app-info` is read with `page.request`. Light scheme, `/backup`, then wait for Export. **The card (region "About this copy" in `main`) shows exactly `bookvie <version>`.** After that: exactly `Data folder: <dataDir>`, starting below line 1. The `h2` "About this copy" is `text-transform: uppercase`, `ink-tertiary` `rgb(102, 105, 97)`, the sans stack, 12px, weight 600, 0.96px. Both lines are `ink-secondary` `rgb(95, 99, 92)`, sans, 14px, weight 400. The card is `surface` white, its frame (background, border width/style/color, radius, padding, max-width) equals the Export card's, and it starts below Restore. There's no "Development server" and no "(". Then `app-info` is fulfilled with `{1.2.0, production, ~/bookvie-data, commit a1b2c3d}`: the card reads `bookvie 1.2.0` and `Data folder: ~/bookvie-data` and doesn't show `a1b2c3d`. | What Oleg sees comes from a real server, and the fulfilled answer proves the values come from `app-info` and pins the AC's own example. |
| AC-2 | E2E (dev worker server, `about-this-copy-dev.spec.ts`) | P0 | `app-info` fulfilled with `{1.1.0, dev, ~/bookvie-data-dev, a1b2c3d}`. **The card shows exactly `bookvie 1.1.0 (a1b2c3d) · Development server`** (U+00B7 as text). After that: `Data folder: ~/bookvie-data-dev`. With `commit: null` it reads exactly `bookvie 1.1.0 · Development server`, with no `(` or `)`. Unrouted, on the real dev server: `bookvie <version>[ (<commit>)] · Development server` and `Data folder: <the folder given>`. | Fulfilling the answer pins both commit branches exactly. The real `--dev` server proves the whole chain. A file-level `serverDev` needs its own file. |
| AC-3 | E2E (production) | P1 | `app-info` fulfilled with a 150+ character absolute folder that has no spaces (`/private/var/folders/…`). **The card shows exactly `Data folder: <that path>`** (never cut short). After that: `overflow-wrap: anywhere`, no ellipsis, `wrapOf` reports more than one line and 0 overflow, the line's right edge stays inside the card, and the card is at most 560px wide. | Wrapping only exists in layout. The fulfilled path makes it long enough to wrap in any temp folder. |
| AC-4 | E2E (production, `seededServer` with Dune, `page.route` on `app-info`) | P1 | Pass-through first. **The card is visible** (after a success). After that: a window `focus` with `app-info` answering 500 shows a new 500, and the card is still visible with the same text and the live regions empty. Held (reload): the page asked for it, there's no card, the headings are just "Backup", and the live regions are empty. Fulfilled with 500: a new 500, still no card, no "Couldn't" in `main`, live regions empty. Export still downloads and reads "Last export: today", and Restore still opens the file chooser. | The transition-bearing branch is the failed refetch after a success. Only the browser shows the page across the pending, failed and failed-refetch states. A seeded server keeps the export away from the worker's server. |
| AC-5 | E2E (production) | P1 | Light scheme, `/backup`, then wait for Export. **The headings in `main` read exactly `["Backup", "About this copy"]`.** After that: their elements are `h1` then `h2`, and the card has no button, no link, and no `input/select/textarea/[tabindex]/[contenteditable]`. A Tab from Restore (the last control) doesn't land in the card. axe (the Backup spec's WCAG tags) finds nothing in light or dark with the card shown. | Heading order, Tab stops and axe all depend on the rendered page. |
| AC-6 | E2E (production, `seededServer`) | P1 | `/catalog`, then the nav's Backup link (client navigation, as in Story 2.1 AC-1), then wait for Export. **`main` has exactly 3 regions.** After that: they're named Export, Restore, About this copy in order. The `h1` keeps focus, the title is `Backup — bookvie`, and the live regions are empty. Export and Restore are enabled with their token colors, and "No export yet" is `ink-tertiary`. | The red leaf for "Backup as before": the card is added after the existing cards and takes nothing from them. **The rest of AC-6 is the existing specs themselves:** `backup.spec.ts`, `restore.spec.ts` and `restore-refusals.spec.ts` must pass in `npm run check` with no edits. |

**Primary branch per criterion.** For each criterion, the leaf's first assertion targets the newly promised value:

| AC | First assertion |
|---|---|
| AC-1 | the version line from `app-info` |
| AC-2 | the dev line 1 with the commit |
| AC-3 | the full long path |
| AC-4 | the card after a success (the precondition of the failed refetch it keeps) |
| AC-5 | the `h1` then `h2` heading order |
| AC-6 | the third region |

**No API or unit red leaves.** The backend doesn't change, and 11.2 covers `app-info` per mode at API level (`backend/tests/test_dev_mode.py`).

**What the leaves pin (the contract for the build):**
- **The card:**
  - It's a `section` inside `main`, after the Restore section, whose accessible name is "About this copy". `aria-labelledby` its `h2` gives exactly that, which makes it a `region`.
  - The `h2`'s DOM text is "About this copy". It's uppercased only by CSS (`text-transform: uppercase`) and styled `section-label`/`ink-tertiary`.
  - The card's frame (background, border, radius, padding, max-width) is the same as Export's. Reusing `.card` gives that.
- **The two lines:**
  - Line 1 and line 2 are each their own element, for example two `p`s, so each element's whole text is exactly the line. Two lines in one `p` with a `<br>` would not match.
  - Both are `body-sm`/`ink-secondary`.
  - Line 1:
    - Production: `bookvie ${version}`.
    - Dev: `bookvie ${version}` + (commit ? ` (${commit})` : '') + ` · Development server`, where ` · ` is the literal text U+0020 U+00B7 U+0020.
    - It depends only on `mode`. The commit never shows in production, even when sent.
  - Line 2: `Data folder: ${dataDir}`, exactly as sent, never shortened, with `overflow-wrap: anywhere`.
- **When `app-info` is missing:**
  - The card renders only while `useAppInfo()` has data: not while the first load is pending, and not when it failed.
  - After a success it stays as it was through a failed refetch. TanStack keeps `data` on a refetch error, so `useAppInfo()` already behaves this way.
- **What doesn't change:** nothing focusable or interactive goes in the card, nothing is announced, and the Export and Restore sections stay as they are.

**Open for the build (not pinned):**
- Whether the card shows on the Backup page's couldn't-load state (no leaf covers it; the AC is silent). The simplest choice is no card there, since that state has no cards.
- Where line 1 is built: inline JSX or a small pure function, which could also take a unit test.
- The CSS class names, and whether the heading reuses an existing `section-label` style or a new rule in `BackupPage.module.css`.

## Existing leaves this story changes (for the build)

None. AC-6 requires `backup.spec.ts`, `restore.spec.ts` and `restore-refusals.spec.ts` to pass unchanged. Things to watch:
- `backup.spec.ts` "[P1] AC-1 the top nav ends with Backup…" reads `getByRole('heading', { level: 1 })` with `toHaveText(['Backup'])`. An `h2` doesn't affect it, but a second `h1` would.
- `restore.ts` and `backup.spec.ts` find cards by `getByRole('region', { name: 'Export' | 'Restore' })`. The new region's name must not contain "Export" or "Restore" (exact matching is used, but keep it distinct anyway).
- `backup.spec.ts` "[P2] AC-2 axe finds nothing…" now sees the card on every run, in both schemes.
- No production page other than Backup should change: `dev-mode-production.spec.ts` AC-7 still runs.

## Green-phase follow-ups (secondary branches, not red leaves)

- [x] **E2E, AC-1 dark:** in dark, the heading is `ink-tertiary-dark` `rgb(154, 158, 148)`, the lines `ink-secondary-dark` `rgb(179, 183, 173)`, and the card `surface-dark` (Theme System under OS dark, and Theme Dark under OS light). (done: frontend/e2e/about-this-copy-automate.spec.ts:53)
- [x] **E2E, AC-1 line spacing:** the gap between the heading and line 1, and between the lines, follows the card's gap (or whatever DESIGN.md settles on). The AC doesn't pin it, so automate records the built value. (done: frontend/e2e/about-this-copy-automate.spec.ts:79; built value: line 1 starts 12px (the card gap) below the heading, line 2 directly under line 1)
- [x] **E2E, AC-2 refetch:** on a dev server, after a failed refetch the dev line 1 stays (the same guarantee as AC-4, in dev). (done: frontend/e2e/about-this-copy-automate.spec.ts:97; a fulfilled `mode: 'dev'` answer on the production worker server, since the card reads only `app-info`)
- [x] **E2E, AC-3 a real temp folder:** on the production worker server, the folder line equals the real `app-info.dataDir`, which starts with `/` (AC-1 already reads it; add the explicit absolute check). (done: frontend/e2e/about-this-copy-automate.spec.ts:119)
- [x] **E2E, AC-4 a stale tab:** `app-info` answers a different version on a focus refetch, and the card updates to it (the "reads bookvie 1.2.0" climax of Flow 12, ahead of 11.4). (done: frontend/e2e/about-this-copy-automate.spec.ts:133)
- [x] **E2E, AC-5 forced colors:** under `forced-colors: active` the card's text is readable (`CanvasText`) and the card keeps a visible border. (done: frontend/e2e/about-this-copy-automate.spec.ts:151)
- [x] **E2E, AC-5 screen reader text:** the region's accessible text reads "About this copy, bookvie 1.1.0, Data folder: …" in that order (aria snapshot). (done: frontend/e2e/about-this-copy-automate.spec.ts:178 (`toMatchAriaSnapshot`: region, h2, version paragraph, folder paragraph))
- [x] **Unit (node:test), AC-1/AC-2:** if line 1 is a pure function, cover production, dev with a commit, dev without one, and production with a commit sent. (done: frontend/src/lib/aboutThisCopy.test.ts (6 cases: production, production with a commit sent, dev with and without a commit, dev with another version, the folder verbatim))

## Helper probes

All probes ran in Chromium with the default Desktop Chrome 1280×720 viewport, `deviceScaleFactor` 1 and no forced colors, once in light and once in dark (the leaves use light, and AC-5 also uses dark). The command was `TZ=Europe/Madrid npx playwright test e2e/about-this-copy.probe.spec.ts`. The probe file was then removed with `rm`.

- **`wrapOf`** (`about-this-copy.ts`), on `setContent` paragraphs in a 300px box, 14px/1.5 sans:
  - the AC-3 path with `overflow-wrap: anywhere` gives 7 lines, overflow 0
  - the same path with `overflow-wrap: normal` gives overflow 475, so a line that doesn't wrap anywhere is refused
  - `bookvie 1.1.0` gives exactly `{ lines: 1, overflow: 0 }`
  - `bookvie<br>second` gives exactly `{ lines: 2, overflow: 0 }`
- **`frameOf`** (local to `about-this-copy.spec.ts`), on three `setContent` sections:
  - the Backup card frame gives exactly `rgb(255, 255, 255) | 1px | solid | rgb(228, 223, 213) | 14px | 20px 24px | 560px`
  - a section with the same frame but `display: flex` gives the same string, so it ignores what it shouldn't compare
  - one with padding `20px 23px` gives a different string, so it refuses a 1px difference
- **Reused unchanged, so not probed:** `watchAppInfo`, `liveRegionText` (`dev-mode.ts`, both probed in 11.2), the `test`/`expect` fixtures, `seededServer`, and `DUNE`. `aboutCard`, `exportButton`, `serverAppInfo` and `fulfilAppInfo` are locators, a plain request and a route, not measurements. The `toHaveCSS` reads of `letter-spacing` 0.96px and `font-weight` were probed in 11.2 (12px at 0.08em reads `0.96px`). No border or outline width that isn't a whole pixel is read: the border is compared through `frameOf`, and `--hairline` is 1px. So Epic 10 retro item 71 (E10-R1) doesn't apply.
- **Render-before-read**, checked over all 6 leaves; none needed a fix:
  - Every leaf first waits for the Export button, which ships. Then its criterion read is web-first (`toBeVisible`, `toHaveText`, `toHaveCount`).
  - AC-1's `boundingBox` reads and `frameOf` run after the card's lines are visible and its `toHaveCSS` passed. `frameOf(exportCard)` and Restore's box are in the same render. `serverAppInfo` reads the server, not the page.
  - AC-3's `wrapOf` and boxes run after the folder line is visible.
  - AC-4's `textContent` runs after the card is visible. `liveRegionText` runs after `expect.poll` saw the 500 and the web-first card checks. The absence reads (`toHaveCount(0)`) run after Export is visible and the held route caught a request (or a 500 was seen).
  - AC-5's `evaluateAll` runs after the headings' web-first text, and `card.evaluate` after the card's heading exists. axe runs after the card's `h2` is visible.
  - AC-6's reads all follow the web-first `toHaveCount(3)`.
  - AC-2's reads are all web-first. `serverAppInfo` reads the server.

## TDD Red Phase

There are 6 skipped leaves, each a `test.skip(` with exactly one `[P*] AC-n`:
- five in `frontend/e2e/about-this-copy.spec.ts` (production worker server)
- one in `frontend/e2e/about-this-copy-dev.spec.ts`, with file-level `test.use({ serverDev: true })`, since Playwright refuses that option inside a describe

The helpers are in `frontend/e2e/about-this-copy.ts`.

| AC | Leaf | Priority |
|---|---|---|
| AC-1 | `about-this-copy.spec.ts:45` on a production server Backup ends with a third surface card "About this copy" giving the version and the data folder from app-info on two lines, with no commit and no Development server | P0 |
| AC-2 | `about-this-copy-dev.spec.ts:16` on a dev server line 1 reads "bookvie 1.1.0 (a1b2c3d) · Development server", or without brackets when commit is null, and line 2 gives the dev data folder | P0 |
| AC-3 | `about-this-copy.spec.ts:106` a data folder outside the home folder shows as the full absolute path, wrapping anywhere inside the card and never cut short | P1 |
| AC-4 | `about-this-copy.spec.ts:131` the card is left out silently while app-info is pending or failing, Export and Restore work as before, and a failed refetch after a success keeps the card as it was | P1 |
| AC-5 | `about-this-copy.spec.ts:188` the card is plain read-only text with no copy button and no Tab stop, the headings run h1 Backup then h2 About this copy, and axe passes in light and dark | P1 |
| AC-6 | `about-this-copy.spec.ts:219` with the card shown, Backup keeps its Export and Restore cards first, its focused h1, its title and its silent live regions | P1 |

**Red today.** This run came after both probes above passed, on the files as they are now (after Prettier). The leaves were un-skipped in throwaway copies (`about-this-copy.red.spec.ts` and `about-this-copy-dev.red.spec.ts`, with the same line numbers) and run with a 30s timeout. The copies and their `test-results` were then removed with `rm`. Each leaf fails at its first criterion assertion:

| AC | Fails at | Because |
|---|---|---|
| AC-1 | `:57` | no element with `bookvie 1.1.0` in an "About this copy" region (element(s) not found) |
| AC-2 | `:26` | no dev line 1 (element(s) not found) |
| AC-3 | `:117` | no folder line (element(s) not found) |
| AC-4 | `:150` | no card after a successful `app-info` (element(s) not found) |
| AC-5 | `:198` | the headings are `["Backup"]`, not `["Backup", "About this copy"]` |
| AC-6 | `:231` | `main` has 2 regions, not 3 |

**Checks with the skips in place:**
- `playwright test e2e/about-this-copy.spec.ts e2e/about-this-copy-dev.spec.ts` shows 6 skipped.
- `tsc -b` exits 0, and so does oxlint on the three new files.
- Prettier is clean on the three new files.
- `git status` lists only the three new files: no `*.probe.*` file and no throwaway copy.

**Storage keys:** no new localStorage key. The leaves read and write none.

**No real library:** every server comes from the fixtures, with an explicit `--port` and a temp `--data-dir`. The `~/bookvie-data` and `~/bookvie-data-dev` folders appear only as fulfilled `app-info` text.

## Implementation checklist (for `bmad-build-auto`)

- [x] `BackupPage.tsx`: once `useAppInfo()` has data, a third `section` after Restore, `aria-labelledby` its `h2` "About this copy". Two lines as pinned above (AC-1, AC-2, AC-4). (done: frontend/e2e/about-this-copy.spec.ts:45, :132; about-this-copy-dev.spec.ts:16 (green in this run))
- [x] `BackupPage.module.css`: the card reuses `.card`. The heading is `section-label` + `ink-tertiary` + uppercase. The lines are `body-sm` + `ink-secondary` with `overflow-wrap: anywhere`. No new tokens; `tokens.css` doesn't change (AC-1, AC-3). (done: frontend/e2e/about-this-copy.spec.ts:45, :106; about-this-copy-automate.spec.ts:53; `tokens.css` unchanged since the baseline)
- [x] Nothing focusable in the card. Check that axe passes in light and dark (AC-5). (done: frontend/e2e/about-this-copy.spec.ts:189)
- [x] Un-skip the 6 leaves and see them pass. Run `npm run check` with no existing spec edited (AC-6). (done: the 6 leaves run unskipped; `npm run check` exit 0 on 2026-11-17 in the automate run, e2e 763 passed; `backup.spec.ts`, `restore.spec.ts`, `restore-refusals.spec.ts` unchanged since the baseline)

## Next

`bmad-build-auto` for Story 11.3, then `bmad-code-review` in a new session, then `bmad-testarch-automate` for the follow-ups above.
