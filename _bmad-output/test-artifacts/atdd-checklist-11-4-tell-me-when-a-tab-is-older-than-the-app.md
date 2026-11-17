---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-17'
storyId: '11.4'
storyKey: '11-4-tell-me-when-a-tab-is-older-than-the-app'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-114-tell-me-when-a-tab-is-older-than-the-app'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-11-4-tell-me-when-a-tab-is-older-than-the-app.md'
generatedTestFiles:
  - 'frontend/scripts/version.test.mjs'
  - 'frontend/e2e/update-notice.spec.ts'
  - 'frontend/e2e/update-notice.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 11, Story 11.4; FR-27, AR32, AR34, UX-DR69, UX-DR70, UX-DR72)'
  - '_bmad-output/implementation-artifacts/epic-11-context.md'
  - '_bmad-output/planning-artifacts/dev-prod-favicon-plan-2026-11-17.md (D11, D12, P0 "Stale tab")'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-7 App info, AD-8 One version, FR-27 row)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (components.update-notice, Update notice row, forced colors, Layout → Update notice)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Update notice, State Patterns app-info rows, Keyboard, Live regions, Flow 12)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/review-rubric-epic11.md (notice follows the last successful app-info; announcement loss accepted; landmark placement)'
  - '_bmad-output/test-artifacts/atdd-checklist-11-3-show-the-version-on-the-backup-page.md (format)'
  - '_bmad/tea/config.yaml'
  - 'frontend/src/components/AppShell.tsx + .module.css, src/api/views.ts (useAppInfo), src/api/queryClient.ts, src/lib/announce.ts, src/components/Button.module.css, src/styles/tokens.css, vite.config.ts, tsconfig.app.json, package.json'
  - 'frontend/e2e/fixtures.ts, dev-mode.ts (ROUTES, mainNav, liveRegionText, watchAppInfo, systemColor, README, readText), about-this-copy.ts (AppInfo), about-this-copy-automate.spec.ts (routeAppInfo, focusWindow), card-note-add-another.ts (recordStatus, statusTexts, noteField), card-note-keys.ts, home.ts, stats.ts (afterAnnounceDelay), update-page.spec.ts'
  - 'frontend/scripts/copy.test.mjs (node:test pattern), backend/bookvie/__init__.py, backend/pyproject.toml, package.json, README.md (Updating)'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given the build, when the bundle is made, then it bakes its own version from frontend/package.json through a Vite define, declared so tsc -b knows its type; and a test in npm run check fails unless bookvie.__version__, backend/pyproject.toml, package.json and frontend/package.json hold the same version (AR34)' }
  - { id: AC-2, idSource: generated, text: 'Given a tab whose baked version equals app-info.version, when any page renders, and after any refetch, then no update notice shows and nothing is announced' }
  - { id: AC-3, idSource: generated, text: 'Given a tab whose baked version differs from app-info.version, newer or older, when app-info loads or refetches (also on window focus), then a full-width surface band appears directly under the top nav with a line hairline at the bottom: "bookvie was updated to X. Reload to use it." in body-sm/ink, where X is the server''s version, then Reload as a compact 30px button-secondary spacing.4 after the sentence; and it has no icon, no close button, no amber and no accent fill; it pushes the page down and never overlaps content (UX-DR69)' }
  - { id: AC-4, idSource: generated, text: 'Given the notice is showing, when I go to another route, or keep using the tab, then the notice stays on every route until the tab reloads, nothing is blocked, and saving a page or a card note still works; and it is not a dialog, not an alert, and not itself a live region' }
  - { id: AC-5, idSource: generated, text: 'Given the notice, when I press Reload (click, Enter or Space), then the page reloads at once, without asking' }
  - { id: AC-6, idSource: generated, text: 'Given the notice first appears in a tab, when it is set, then the polite status region announces its sentence once, after the usual tick; and a refetch that finds the same server version announces nothing; and a later, different server version updates the sentence and announces the new one once; and a refetch that finds the bundle''s own version again hides the notice (UX-DR70)' }
  - { id: AC-7, idSource: generated, text: 'Given a tab with no notice, when the app-info refetch fails (for example while bookvie restarts), then no notice appears and nothing complains; with the notice showing, a failed refetch leaves it showing (UX-DR72)' }
  - { id: AC-8, idSource: generated, text: 'Given the notice is showing, when a keyboard user tabs from the top, then Reload is reached after the theme toggle and before the page''s content; "Skip to content" skips it; the notice sits inside the header landmark, after the top bar' }
  - { id: AC-9, idSource: generated, text: 'Given forced-colors: active, when the notice renders, then its bottom border is CanvasText and Reload takes the system button colors' }
  - { id: AC-10, idSource: generated, text: 'Given the README, when Oleg reads Updating, then the "hard-reload open tabs" instruction is replaced by a line saying open tabs show a notice with Reload' }
---

# ATDD Checklist: Story 11.4 Tell me when a tab is older than the app

## Preflight

- **Stack:** `fullstack`, auto-detected. Playwright (`frontend/playwright.config.ts`) and pytest (`backend/tests/conftest.py`) are both in place, and `check:api` runs `node --test 'scripts/*.test.mjs'`. This story touches the frontend, its build config and the README. `GET /api/views/app-info` shipped in 11.2 and doesn't change.
- **Story:** Story 11.4 in `epics.md` has 10 Given/When/Then criteria and none carry ids, so they're numbered AC-1 to AC-10 in source order (registry above). Each "And" line belongs to the criterion above it. `sprint-status.yaml` reads `backlog`; 11.1, 11.2 and 11.3 are `done`. There is no spec file yet, so the story file is the `epics.md` section, as for 11.3.
- **Epic gate:** 11.4 isn't Epic 11's first story, so the spine gate doesn't apply. It is the epic's **last** story: after its review, AGENTS.md "Epic boundaries" applies (automate, retro, trace and gate, spine reconciliation).
- **Config:** `tea_use_playwright_utils: false`, so the Traditional Patterns fragments apply. There's no Pact. `tea_browser_automation: auto` loads `playwright-cli.md`.
- **What exists today:**
  - `AppShell.tsx` renders `header` (skip link, wordmark with the DEV pill, `nav` "Main", the Theme group in `.end`) and then `main`. The header is one flex row with a fixed `--space-topbar-height` and its own bottom hairline, so the band needs a wrapper or a restructure (open for the build).
  - `useAppInfo()` returns `AppInfoView | undefined`, keyed `['view','app-info']`. Queries use `retry: false` and `refetchOnWindowFocus: true`, and `focusAndVisibility` listens to `window` `focus`, so a dispatched `focus` event refetches it.
  - `announce('status', text)` empties both regions and sets the text after `ANNOUNCE_DELAY_MS` (100). That is "the usual tick".
  - No Vite `define` exists, and `tsconfig.app.json` has `types: ["vite/client"]` and no global declaration.
  - All four version copies read `1.1.0`, and the worker server's `app-info.version` is `1.1.0`.
  - The README's **Updating:** paragraph ends "…and hard-reload open tabs so the browser picks up the new bundle."

## Generation Mode

**AI generation**, run sequentially in this session. Recording isn't needed: the shell, its landmarks and roles already ship, and the story pins the notice's text, its button and its place.

## Test Strategy

The mismatch is made by fulfilling `app-info` with another version (`page.route`), since the worker server and the bundle are both `1.1.0`. A window `focus` event drives the refetch.

| AC | Level | Priority | Leaf (first assertion in bold) | Why this level |
|---|---|---|---|---|
| AC-1 | Unit (`node:test`, `scripts/version.test.mjs`, in `check:api`) | P0 | Vite's resolved **build** config (`resolveConfig(…, 'build')`). **Exactly one `define` key has the value `JSON.stringify(frontend/package.json version)`.** After that: `vite.config.ts` doesn't spell the version itself; exactly one `.d.ts` under `src` has `declare const <key>: string`; some module under `src` reads `<key>`; and `bookvie.__version__`, `backend/pyproject.toml` `[project] version`, `package.json` and `frontend/package.json` are equal. | The bake is a build-config fact, and the equality test must run in `npm run check`. Once un-skipped, this leaf **is** AR34's equality test, so the build needn't write another. |
| AC-2 | E2E (`seededServer` with Dune) | P0 | **Witness:** in a second tab, `app-info` fulfilled as `1.2.0` shows the notice sentence. Then the server's own `app-info.version` equals `BUNDLE_VERSION`. On each of the 7 `ROUTES` (Home, Catalog, Stats, Card notes, Backup, Dune, Page not found) with `app-info` passed through: after load and again after a focus refetch, there's no Reload and no sentence, and nothing containing "updated" reaches the `status` region or the live regions. | An absent notice is green today, so a witness that the notice **can** show comes first (the same precondition-first shape as 11.3 AC-4). Without it, the leaf couldn't fail red. The absence loop was run on its own today and passes. |
| AC-3 | E2E (production worker server, light) | P0 | `/backup` with `app-info` passed through, then the main top is recorded. Then `app-info` answers `1.2.0` and a focus refetch runs. **The `banner` holds an element whose whole text is "bookvie was updated to 1.2.0. Reload to use it."** After that: the band's background is `surface` `rgb(255, 255, 255)` and its border-bottom is `1px solid` `line` `rgb(228, 223, 213)`. Its x is 0, its width equals `documentElement.clientWidth`, and its top is the nav's bottom (+0 to 1px for the bar's own hairline). Its `position` is `static` or `relative`, `main` starts at or below its bottom, and `main` moved down by the band's height (±1px). The sentence is 14px, weight 400, `ink` `rgb(43, 46, 42)`, in the sans stack, and its text starts at the `h1`'s text left (±1px). Reload is 30px tall with a `button-secondary` fill `rgb(250, 249, 246)` at 14px, starting 16px (±1) after the sentence's last glyph. The band has exactly one button and no `svg`/`img`/`[role=img]`, nothing in it paints accent or dev amber, and the text and button aren't amber. Then a reload with `1.0.0` shows "…updated to 1.0.0…" (on load, and an older server counts). | The transition-bearing branch is the refetch that turns the notice on. Layout, push-down and colors only exist in the browser. |
| AC-4 | E2E (`seededServer`, `mainAt(150)`) | P1 | `app-info` answers `1.2.0` throughout. Home, then wait for the page field. A client-side click on the nav's Catalog shows the h1 "Catalog", then **the sentence is still visible**. After that: Stats, Card notes, Backup and Home each keep the sentence and one Reload. There's no `dialog` or `alertdialog` on the page. Neither the band nor anything in it has `role` alert/status/log/dialog/alertdialog/marquee/timer, `aria-live` or a `<dialog>`. Page 212 saves through Update: `status` reads "Page 212 of 330, 64%." and `library.json` has 212. A card note saves through Save note: the panel closes, `status` reads "Card note saved.", and `library.json` has the note. The notice still shows afterwards. | Only the browser shows the notice across route changes and real saves. |
| AC-5 | E2E (production) | P0 | `app-info` answers `1.2.0`; dialogs are recorded and dismissed. For click, Enter and Space: **Reload is visible**, the window gets a marker, Reload is pressed, the `load` event fires, the marker is gone (a new document), the URL is still `/backup`, and Backup renders. No dialog was raised (no `beforeunload` question). | Reloading is a browser behavior. |
| AC-6 | E2E (production) | P0 | `app-info` passes through, `/backup` loads, then `recordStatus` starts. `1.2.0` plus a focus refetch, then **the non-empty `status` texts equal exactly `["bookvie was updated to 1.2.0. Reload to use it."]`.** After that: the sentence shows. A same-version refetch, then the announce delay: nothing more is announced. `1.3.0`: the texts become `[…1.2.0…, …1.3.0…]`, the sentence names 1.3.0 and not 1.2.0, and a same-version refetch adds nothing. `BUNDLE_VERSION` again: there's no Reload and no sentence. | The transition-bearing branch is the first appearance. Announcements are only observable in the live region. |
| AC-7 | E2E (production) | P1 | `app-info` answers `1.2.0` at load. **The sentence is visible.** After that: `app-info` fails (500) on a focus refetch, and the sentence and Reload stay with no new announcement and an empty `alert`. On a reload with `app-info` failing, there's no notice, the live regions are empty, and there's no "Couldn't" in `main` or `banner`. After a later success with the bundle's version, a failed refetch still shows none. | The transition-bearing branch that can fail today is "a shown notice survives a failed refetch". The "none appears" branch is an absence, so it follows. |
| AC-8 | E2E (production) | P1 | `app-info` answers `1.2.0`, `/backup`. Focus the Theme group's last button and press Tab: **Reload is focused.** After that: Tab goes to Export (the page's first control). After a reload, the first Tab is "Skip to content", Enter focuses `main`, and Tab goes to Export, never to Reload. The band is inside `header`, after the `nav` and the Theme group in document order, and not inside the `nav`. | Tab order and landmarks need the real DOM. |
| AC-9 | E2E (production, forced colors, light and dark) | P2 | **The band's border-bottom-color is `CanvasText`.** After that: it's 1px solid. Reload's background is `ButtonFace` and its text `ButtonText`. The sentence is `CanvasText`. | Forced colors only exist in the browser. |
| AC-10 | E2E file read (no page), as 11.2 AC-11 | P2 | The README's **Updating:** paragraph: **it doesn't match `/hard[- ]reload/i`.** After that: it still names `npm run install:local`, says "notice" and "Reload", and no "hard-reload" is left anywhere in the README. | A docs criterion. It sits beside the story's e2e leaves, as Story 11.2 did. |

**Primary branch per criterion.** For each criterion, the leaf's first assertion targets the newly promised value:

| AC | First assertion |
|---|---|
| AC-1 | one `define` key bakes frontend/package.json's version |
| AC-2 | the witness: another version shows the notice (the absence after it can't fail red on its own) |
| AC-3 | the exact sentence after a focus refetch with another version |
| AC-4 | the sentence after a client-side route change |
| AC-5 | the Reload control the criterion presses (Given "the notice"); the reload checks follow |
| AC-6 | exactly one announcement of the sentence |
| AC-7 | the shown notice that the failed refetch must keep (its precondition, as 11.3 AC-4) |
| AC-8 | Reload focused after the theme toggle |
| AC-9 | the `CanvasText` bottom border |
| AC-10 | no hard-reload in Updating |

**No API leaves.** The backend doesn't change; 11.2 covers `app-info` at API level (`backend/tests/test_dev_mode.py`).

**What the leaves pin (the contract for the build):**
- **The bake:**
  - Exactly one Vite `define` key, any name, whose value is `JSON.stringify(<frontend/package.json version>)`. The value is read from the package file, never typed into `vite.config.ts`.
  - A `.d.ts` under `frontend/src` declares it as `declare const <key>: string`.
  - App code reads it.
- **The notice:**
  - Inside `header` (the `banner`), after the `nav` and the Theme group, not inside the `nav`.
  - One element whose whole text is exactly `bookvie was updated to ${serverVersion}. Reload to use it.` An inline `<em>` around the version is fine; the sentence and the button must not share that element.
  - A `button` named exactly "Reload".
  - The outermost element inside `header` that contains both the sentence and the button is "the band", and it carries the `surface` background and the bottom border.
- **Shown while** the last successful `app-info.version` !== the baked version. A failed fetch changes nothing.
- **Announcement:** through the shell's polite `status` region (`announce('status', sentence)`), once for each new differing server version. Not for a same-version refetch, and not on reload or initial render with no change (a reload is a new tab, so it announces once there).

**Open for the build (not pinned):**
- How `header` is restructured: for example a top-bar `div` keeping the 64px row and its hairline, with the band after it.
- Whether the version in the sentence is wrapped in `<em>`. The AC writes it as *X*, but that's the story's placeholder notation; DESIGN.md shows plain text.
- Whether hiding the notice (a refetch back to the bundle's own version) announces anything. The AC and EXPERIENCE.md are silent; no leaf checks it.
- The `define` key's name (for example `__BOOKVIE_VERSION__`) and where the comparison lives (a hook in `api/views.ts`, or a small pure function in `lib/` that could take a unit test).
- The band's vertical padding: `components.update-notice.padding` is `10px {spacing.page-x}`, and no leaf pins the 10px.

## Existing leaves this story changes (for the build)

None need editing. The bundle and server agree, so no notice shows in any existing spec. Things to watch:
- `app-shell.spec.ts` and `shell.spec.ts` measure the header (height, hairline, nav indicator flush with the hairline). A header restructure must keep those values when no notice shows.
- `dev-mode-production.spec.ts` AC-11 reads the README's Development and Options paragraphs; AC-10 here only reads Updating.
- `about-this-copy-automate.spec.ts` "[P2] AC-4 a tab left open reads the new version after a focus refetch" fulfils `1.2.0` on a production server, so the notice will now also show there. It only checks the card and `liveRegionText(page) === ''` **right after** the refetch response. Once the notice announces after the 100ms tick, that read races the announcement. **Check this leaf in the build.** If it goes flaky or red, the fix is in that leaf (read the live regions before the tick, or filter out the notice sentence). That counts as a story-caused test change, to name in the build's summary.
- The skip link's `transform` uses `--space-topbar-height`. If the header grows when the band shows, the hidden skip link must still be off-screen (AC-8 only checks that it's focused first).

## Green-phase follow-ups (secondary branches, not red leaves)

- [ ] **E2E, AC-3 dark:** in dark (Theme System with OS dark, and Theme Dark with OS light), the band is `surface-dark` `rgb(34, 37, 32)` with a `line-dark` `rgb(52, 56, 49)` border, and the sentence is `ink-dark` `rgb(236, 234, 227)`.
- [ ] **E2E, AC-3 padding and wrap:** the band's vertical padding is 10px (`components.update-notice.padding`). At a narrow viewport, the sentence and Reload stay inside the band with no horizontal overflow.
- [ ] **E2E, AC-3 dev server:** on a `--dev` server with the DEV pill, the notice shows the same way and contains no amber (the pill keeps its amber).
- [ ] **E2E, AC-4 Book detail and a modal:** the notice shows on `/book/:id` reached by a client link. With a modal side panel open, the notice is inert (Reload isn't reachable by Tab) and the panel works.
- [ ] **E2E, AC-5 after reload:** after Reload, with the server now answering the bundle's version, the notice is gone (Flow 12 climax), and About this copy on Backup reads the server's version.
- [ ] **E2E, AC-6 the tick:** the sentence reaches `status` no sooner than about `ANNOUNCE_DELAY_MS` after the refetch answer, and an intent saved within the tick wins (the notice's announcement is lost and not repeated; the notice stays on screen). Both are accepted in EXPERIENCE.md.
- [ ] **E2E, AC-6 after an intent:** an intent's invalidation refetches `app-info` (AR32). A save in a stale tab makes the notice appear without a focus event.
- [ ] **E2E, AC-7 never loaded, then loaded:** `app-info` fails on load, then a later refetch answers `1.2.0`: the notice appears and is announced once (Flow 12 failure path).
- [ ] **E2E, AC-8 aria snapshot:** the banner reads skip link, wordmark, nav, Theme group, then the sentence and Reload (`toMatchAriaSnapshot`).
- [ ] **E2E, AC-9 forced colors text:** the sentence is readable and Reload has a visible system border.
- [ ] **Unit (node:test), AC-1 mutation:** the equality part fails when one copy differs. Run it on a temp copy of the four files, or with an injected reader, so the real files aren't edited.
- [ ] **Unit, AC-2/AC-6:** if the "show / which version / announce?" decision is a pure function, cover equal, newer, older, same-again, a third version, back to the bundle's own, and a failure (no change).
- [ ] **axe, AC-3:** the Backup and Home axe checks pass in light and dark with the notice shown.

## Helper probes

All e2e probes ran in Chromium with the default Desktop Chrome 1280×720 viewport, `deviceScaleFactor` 1, light scheme and no forced colors. Those are the conditions of the only leaf that calls these helpers (AC-3, which emulates light). The command was `TZ=Europe/Madrid npx playwright test e2e/update-notice.probe.spec.ts`. The probe files were then removed with `rm`.

- **`textExtent`** (`update-notice.ts`), on `setContent` paragraphs at 14px/1.5 sans:
  - The notice sentence in an 800px `p` with `padding-left: 36px` returns exactly the bounding rect of the same text wrapped in a `span`: `{ left: 36, right: 327.09375 }`. So it measures the glyphs, not the block's width.
  - With `padding-left: 37px` it returns `left: 37`, so it refuses a 1px shift.
  - In a 100px-wide `p` the text wraps: `left: 36` and `right: 134.86`, inside the 136px content edge and past 100, so it spans every line box.
- **`backgroundsIn`** (`update-notice.ts`):
  - A white `div` holding a `p`, a transparent `span` and a `button.r` filled `rgb(85, 112, 89)` returns exactly `['div. rgb(255, 255, 255)', 'button.r rgb(85, 112, 89)']`. It reports the root and the painted descendant and leaves out the transparent ones.
  - A `div` with nothing painted returns `[]`.
- **`noticeBand`** (`update-notice.ts`, a locator, probed because it chooses an element):
  - In a `header` with a top-bar `div` (nav and Theme group) and then `div.band > div.inner > p + button`, it resolves to `.band`, the outermost one.
  - When the sentence and Reload sit directly in `header`, it finds nothing, so it never returns the `header` itself.
  - Outside any `header` it finds nothing.
  - **The first probe failed** with "element(s) not found" on the `.band` case. The `has:` locators were scoped to the banner, and `has` is matched inside each candidate. The helper was fixed to use page-rooted `has:` locators, and all three cases were probed again and passed.
- **`bakedVersionKeys`** (`scripts/version.test.mjs`), run with `node --test` on a temporary `scripts/version.probe.test.mjs`:
  - Inline config `define: { __X__: '"9.8.7"', __Y__: '"1.0.0"' }` returns exactly `['__X__']`.
  - `define: { __X__: '9.8.7' }` (not a string literal) returns `[]`.
  - `'"9.8.8"'` returns `[]`.
  - The real `vite.config.ts` returns `[]` today.
- **Reused unchanged, so not probed:** `recordStatus`, `statusTexts`, `noteField` (`card-note-add-another.ts`), `afterAnnounceDelay` (`stats.ts`), `watchAppInfo`, `liveRegionText`, `systemColor`, `mainNav`, `ROUTES`, `readText` (`dev-mode.ts`), `storedBook`, `mainAt`, `mainBookCard` (`home.ts`), `addCardNote`, `cardNotePanel` (`card-note-keys.ts`), and the fixtures. `noticeSentence`, `anyNoticeSentence`, `reloadButton`, `answerAppInfo`, `focusWindow`, `productionInfo`, `noticeText` and `BUNDLE_VERSION` are locators, a route, an event, literals and a package read, not measurements.
- **Widths:** no border or outline width that isn't a whole pixel is read (`--hairline` is 1px), so Epic 10 retro item 71 (E10-R1) doesn't apply.
- **Render-before-read**, checked over all 10 leaves; none needed a fix:
  - **AC-2:** each route's one-shot reads (`recordStatus`, `statusTexts`, `liveRegionText`) follow the web-first `h1` text and a polled `app-info` response. The absence reads wait for that response plus the announce delay. `page.request` reads the server, not the page.
  - **AC-3:** `main.boundingBox()` before the notice follows Export being visible. The band, nav, `main` and Reload boxes, `textExtent` and `backgroundsIn` all follow the web-first sentence, Reload visibility and band `toHaveCSS`. `textExtent(h1)` reads a shipped `h1` on a rendered page.
  - **AC-4:** `band.evaluate` follows the web-first sentence on every route. The `storedBook` reads follow the web-first `status` text.
  - **AC-5:** the marker reads follow the `load` event and the web-first Reload.
  - **AC-6:** `recordStatus` follows Export being visible. The `statusTexts` reads are polled, or follow a polled response plus the announce delay.
  - **AC-7:** the same pattern as AC-6. The absence reads follow Export, a polled 500 and the delay.
  - **AC-8:** `band.evaluate` follows `toBeVisible`.
  - **AC-9:** `systemColor` reads only the page's color scheme.
  - **AC-1 and AC-10** read files.

## TDD Red Phase

There are 10 skipped leaves, each a `test.skip(` with exactly one `[P*] AC-n`:
- one in `frontend/scripts/version.test.mjs`, a `node:test` run by `check:api`
- nine in `frontend/e2e/update-notice.spec.ts`, on the production worker server or a `seededServer`

The helpers are in `frontend/e2e/update-notice.ts`.

| AC | Leaf | Priority |
|---|---|---|
| AC-1 | `version.test.mjs:57` the bundle bakes frontend/package.json's version through a Vite define declared for tsc, and the four version copies agree | P0 |
| AC-2 | `update-notice.spec.ts:56` a tab whose bundle version equals app-info.version shows no notice and announces nothing on any page, at load and after a refetch | P0 |
| AC-3 | `update-notice.spec.ts:99` a refetch that finds another version shows a full-width surface band under the top nav, "bookvie was updated to X. Reload to use it." then a compact Reload, pushing the page down | P0 |
| AC-4 | `update-notice.spec.ts:172` the notice stays on every route until the tab reloads, is no dialog, alert or live region, and saving a page or a card note still works | P1 |
| AC-5 | `update-notice.spec.ts:233` Reload reloads the page at once, without asking, by click, Enter or Space | P0 |
| AC-6 | `update-notice.spec.ts:268` the status region announces the notice once when it appears, not again for the same version, once more for a new version, and the bundle's own version hides it | P0 |
| AC-7 | `update-notice.spec.ts:316` a failed app-info refetch leaves a shown notice showing, and with no notice shows none and complains nowhere | P1 |
| AC-8 | `update-notice.spec.ts:368` Tab reaches Reload after the theme toggle and before the page, Skip to content skips it, and the notice sits in the header after the top bar | P1 |
| AC-9 | `update-notice.spec.ts:416` under forced colors the notice keeps a CanvasText bottom border and Reload takes the system button colors | P2 |
| AC-10 | `update-notice.spec.ts:441` the README's Updating line says open tabs show a notice with Reload, not to hard-reload them | P2 |

**Red today.** This run came after every probe above last passed (`noticeBand` after its fix), on the files as they are now (after Prettier). The leaves were un-skipped in throwaway copies with the same line numbers, `scripts/version.red.test.mjs` and `e2e/update-notice.red.spec.ts`, and run with a 30s timeout. The copies and `test-results` were then removed with `rm`. Each leaf fails at its first criterion assertion:

| AC | Fails at | Because |
|---|---|---|
| AC-1 | `:62` | `vite build defines "1.1.0" under 0 keys, not 1` |
| AC-2 | `:67` | the witness tab has no notice sentence (element(s) not found) |
| AC-3 | `:118` | no sentence after the `1.2.0` refetch (element(s) not found) |
| AC-4 | `:185` | no sentence on Catalog (element(s) not found) |
| AC-5 | `:250` | no Reload (element(s) not found) |
| AC-6 | `:285` | the announced texts are `[]`, not the sentence |
| AC-7 | `:329` | no sentence at load with `1.2.0` (element(s) not found) |
| AC-8 | `:382` | no Reload to focus after the theme toggle |
| AC-9 | `:431` | no band to read a border from (element(s) not found) |
| AC-10 | `:446` | Updating still says "hard-reload open tabs…" |

**AC-2's absence loop checked separately:** with only the witness block cut out, the AC-2 copy **passed** today (7 routes, load and focus refetch). So the loop's waits, route names and reads work, and once the witness goes green, the leaf fails only if a notice or its announcement shows with equal versions.

**Checks with the skips in place:**
- `playwright test e2e/update-notice.spec.ts` shows 9 skipped.
- `node --test scripts/version.test.mjs` shows 1 skipped.
- `tsc -b` exits 0, and so does oxlint on the three new files.
- Prettier is clean on the three new files.
- `git status` lists only the three new files: no `*.probe.*` file and no throwaway copy.

**Storage keys:** no new localStorage key. The notice keeps no state across reloads, and the leaves read and write none.

**No real library:** every server comes from the fixtures, with an explicit `--port` and a temp `--data-dir`. `~/bookvie-data` appears only as fulfilled `app-info` text.

## Implementation checklist (for `bmad-build-auto`)

- [ ] `vite.config.ts`: a `define` that bakes `frontend/package.json`'s `version` (read, not typed) as a string literal. A `.d.ts` under `src` declares it `declare const <KEY>: string` (AC-1).
- [ ] Un-skip `scripts/version.test.mjs` so it runs in `check:api` as the AR34 equality test (AC-1).
- [ ] `AppShell.tsx` / `.module.css`: the band inside `header`, after the top bar. It shows while the last successful `app-info.version` differs from the baked one, with the sentence and Reload styled per `components.update-notice` (`surface`, `line` bottom hairline, `10px {spacing.page-x}` padding, `spacing.4` gap, `body-sm`/`ink`, a 30px `button-secondary` with `0 {spacing.3}` padding). There's no icon, close, amber or accent. Forced colors: a `CanvasText` border, and Reload keeps the system button colors (AC-3, AC-8, AC-9).
- [ ] Reload calls `window.location.reload()` at once (AC-5).
- [ ] Announce through `announce('status', sentence)` once for each new differing server version. Nothing on a same-version refetch or a failure, and the notice hides on the bundle's own version (AC-6, AC-7).
- [ ] The notice element carries no `role` or `aria-live` (AC-4).
- [ ] README **Updating:** replace "hard-reload open tabs…" with a line saying open tabs show a notice with **Reload** (AC-10).
- [ ] Re-check `about-this-copy-automate.spec.ts` "[P2] AC-4 a tab left open…" (see above), `app-shell.spec.ts` and `shell.spec.ts`.
- [ ] Un-skip the 9 e2e leaves and see them pass, then run `npm run check`.

## Next

1. `bmad-build-auto` for Story 11.4.
2. `bmad-code-review` in a new session.
3. `bmad-testarch-automate` for the follow-ups above.

11.4 closes Epic 11. After its automate step, the retro, the trace and gate and the spine reconciliation come before Epic 12 (AGENTS.md "Epic boundaries").
