---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-17'
storyId: '11.2'
storyKey: '11-2-keep-development-apart-from-the-real-library'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-112-keep-development-apart-from-the-real-library'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-11-2-keep-development-apart-from-the-real-library.md'
generatedTestFiles:
  - 'backend/tests/test_dev_mode.py'
  - 'frontend/e2e/dev-mode.spec.ts'
  - 'frontend/e2e/dev-mode-production.spec.ts'
  - 'frontend/e2e/dev-mode.ts'
  - 'frontend/e2e/dev-proxy.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 11, Story 11.2; FR-26, NFR5, AR29-AR33, UX-DR65-UX-DR68, UX-DR72)'
  - '_bmad-output/implementation-artifacts/epic-11-context.md'
  - '_bmad-output/planning-artifacts/dev-prod-favicon-plan-2026-11-17.md (D1-D5, D7, D8, §4 story cut, §5 tests)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (components.favicon, components.dev-pill, typography.section-label, rounded.sm, spacing.2, Colors → Dev amber, forced colors)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Tab title row, app-info refetch failed row)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-6 App info, AD-7, AD-16 Binding, Real library refused, Favicon)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml'
  - '_bmad-output/test-artifacts/atdd-checklist-11-1-a-favicon-for-bookvie.md (format)'
  - '_bmad/tea/config.yaml'
  - 'backend/bookvie/cli.py, http/app.py, http/api.py, views/__init__.py, store/store.py (ensure_writable), backend/tests/test_cli.py, test_app.py, test_layers.py, test_wheel_build.py, servers.py'
  - 'frontend/vite.config.ts, src/components/AppShell.tsx + .module.css, src/lib/page.ts, src/lib/theme.ts, src/api/views.ts, src/api/queryClient.ts, src/styles/tokens.css'
  - 'frontend/e2e/fixtures.ts, dev-proxy.spec.ts, favicon.ts, favicon.spec.ts, home.ts (DUNE), library.ts (rgbOf), catalog-filter.spec.ts (APP_STORAGE_KEYS)'
  - 'README.md (Getting started: Options, Development), scripts/smoke.mjs'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given HOME set to a temporary folder, when bookvie --dev starts with no --data-dir and no --port, then it uses ~/bookvie-data-dev and port 8766; and --dev --data-dir <scratch> and --dev --port <n> use exactly what was given; and plain bookvie still uses ~/bookvie-data and 8765, and --help shows both defaults (AR29)' }
  - { id: AC-2, idSource: generated, text: 'Given HOME set to a temporary folder, when bookvie --dev is started with --data-dir naming ~/bookvie-data directly, through a symlink to it, or through a path with .. that resolves to it, then it prints "bookvie: --dev won''t use your real library (~/bookvie-data). Leave out --data-dir to use ~/bookvie-data-dev, or pass a scratch folder." to stderr and exits 2; and no lock file is written, no store is opened, and nothing in that folder changes (AR30); and no test reads or writes the real ~/bookvie-data' }
  - { id: AC-3, idSource: generated, text: 'Given a server, when the client requests GET /api/views/app-info, then the response is { version, mode, dataDir, commit } from a Pydantic model in views/app_info, and schema.d.ts is regenerated so check:api passes; and version equals bookvie.__version__; mode is "dev" exactly when the server was started with --dev, else "production"; and dataDir is the resolved data folder with ~ for the home folder, and a full absolute path outside it; and commit is the short git hash read once at startup with --dev, null in production, and null (never an error or a failed start) when git isn''t on the path or the package isn''t in a checkout; and /api/health is unchanged (AR31)' }
  - { id: AC-4, idSource: generated, text: 'Given a dev server and a production server, when each is asked for /favicon.svg, then production serves the sage favicon.svg and the dev server serves frontend/public/favicon-dev.svg, both as image/svg+xml with Cache-Control: no-cache; and favicon-dev.svg is the same drawing with #8C5E0E, and #EBC27A under the dark scheme; a test checks both fills against DESIGN.md''s components.favicon.dev-fill and dev-fill-dark; and the wheel ships favicon-dev.svg too (AR33)' }
  - { id: AC-5, idSource: generated, text: 'Given vite.config.ts, when the Vite dev server runs, then it proxies /api, /media and /favicon.svg to http://127.0.0.1:8766; and dev-proxy.spec.ts adds /favicon.svg to its inline proxy map and checks that a dev tab through Vite gets the backend''s amber file, not Vite''s own public/ copy' }
  - { id: AC-6, idSource: generated, text: 'Given a page served by a serverDev server, whether through Vite or the built SPA, when app-info has loaded, then the header''s wordmark reads "bookvie DEV": the pill sits after the word with a space between them in the DOM, "DEV" in section-label on the dev amber fill, rounded.sm, 4px 7px padding, spacing.2 after the word (UX-DR67); and the pill is not a link, button or Tab stop; and every route''s title is "DEV · Page — bookvie", Book detail included ("DEV · Catalog — bookvie"); and the client reads dev only from app-info.mode; nothing uses import.meta.env.DEV for it (UX-DR68)' }
  - { id: AC-7, idSource: generated, text: 'Given a production server, when any page renders, then there is no DEV pill, titles are "Page — bookvie" as before, and no amber appears anywhere on the page' }
  - { id: AC-8, idSource: generated, text: 'Given a dev server whose app-info hasn''t loaded yet, or never loads, when the shell renders, then the header and title look like production and nothing says anything failed; and after a successful load, a refetch that fails keeps the pill and the DEV · prefix (UX-DR72)' }
  - { id: AC-9, idSource: generated, text: 'Given forced-colors: active on a dev server, when the pill renders, then it is Canvas with CanvasText text and a 1px CanvasText border' }
  - { id: AC-10, idSource: generated, text: 'Given the dev amber values, when they are written, then they live as literals in the favicon files and the pill''s CSS Module, not in tokens.css, and app-shell.spec.ts''s token comparison passes unchanged (UX-DR66)' }
  - { id: AC-11, idSource: generated, text: 'Given the README, when Oleg reads Development and Options, then they say bookvie --dev --no-browser uses ~/bookvie-data-dev on port 8766 and refuses the real library, npm run dev proxies to 8766, and the "stop any normal bookvie first" line is gone' }
---

# ATDD Checklist: Story 11.2 Keep development apart from the real library

## Preflight

- **Stack:** `fullstack`, auto-detected. Playwright (`frontend/playwright.config.ts`) and pytest (`backend/tests/conftest.py`) are both in place.
- **Story:** `epics.md` Story 11.2 has 11 Given/When/Then criteria with no ids, so they are numbered AC-1 to AC-11 in source order (registry above). Each "And" line belongs to the criterion above it. `sprint-status.yaml` reads `backlog`; 11.1 is `done`.
- **Epic gate:** 11.2 isn't Epic 11's first story, so the spine gate doesn't apply. The spine already plans everything this story adds (AD-6 App info, AD-16 Binding, Real library refused and Favicon, the Structural Seed's `public/` and `views/app_info`).
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns fragments). No Pact. `tea_browser_automation: auto` loads `playwright-cli.md`.
- **What exists today:**
  - `cli.py`: `--dev` only adds the Vite origins to the guard. `--data-dir` defaults to `~/bookvie-data`, `--port` to `8765`, whatever `--dev` says. Nothing refuses any folder.
  - No `app-info` view. `GET /api/views/app-info` is an unknown server path and 404s.
  - `GET /favicon.svg` (Story 11.1) always serves `static/favicon.svg`. No `favicon-dev.svg` anywhere.
  - `vite.config.ts` proxies `/api` and `/media` to `127.0.0.1:8765`.
  - `AppShell.tsx` renders the wordmark as `<span class=wordmark><span class=mark aria-hidden/>bookvie</span>`. `usePageTitle(name)` sets `` `${name} — bookvie` ``; Book detail passes the Book's title ("Dune — bookvie", "Book — bookvie" while loading).
  - Nothing under `frontend/src` uses `import.meta.env`.
  - The e2e fixtures always pass `--port` and a temp `--data-dir`; `serverDev: true` adds `--dev`. Only `dev-proxy.spec.ts` uses it today.
- **Reading of AC-6's example:** the parenthetical "("DEV · Catalog — bookvie")" is the format example from EXPERIENCE.md's Tab title row ("on every route, Book detail included"). So Book detail's title is "DEV · *Book title* — bookvie" ("DEV · Dune — bookvie"), the production title with the prefix. The leaf pins that.

## Generation Mode

**AI generation**, run sequentially in this session. Recording isn't needed: the header, routes and roles already ship, and the pill's place in the DOM is pinned by the story.

## Test Strategy

| AC | Level | Priority | Leaf (first assertion in bold) | Why this level |
|---|---|---|---|---|
| AC-1 | Unit (pytest, `cli.parse_args`) | P0 | `test_dev_mode.py` `test_dev_defaults_to_its_own_folder_and_port_and_help_shows_both`. `HOME` = tmp. **`parse_args(["--dev"]).data_dir == ~/bookvie-data-dev`.** Then port 8766; `--dev --data-dir <scratch>` keeps the scratch folder and 8766; `--dev --port 8799` keeps 8799 and the dev folder; plain is `~/bookvie-data` and 8765; `--help` (exit 0) names `~/bookvie-data`, `~/bookvie-data-dev`, `8765` and `8766`. | Defaults are parsing, cheapest at the unit level. |
| AC-2 | Integration (pytest, `cli.main` in process) | P0 | `test_dev_refuses_the_real_library_before_the_lock_or_the_store`, parametrized over `direct`, `tilde` (`~/bookvie-data` as typed), `symlink`, `dotdot` (`~/scratch/../bookvie-data`) and `missing` (the folder doesn't exist yet). A "real" library with `library.json` and a cover sits in the temp `HOME`. **`main([...])` exits 2** (a return or a `SystemExit`). Then stderr is exactly the message plus a newline, stdout is empty, `instance.claim_lock` and `Store.open` were never called, no `bookvie.lock`, and the folder's tree (every entry's bytes and mtime, and the folder's own mtime) is unchanged; `missing` is not created. | Exit code, stderr and the lock/store order are all in-process facts; spies prove "before any lock or store". |
| AC-3 | API (pytest, `TestClient` on the app `cli.main` built) | P0 | `test_app_info_reports_version_mode_data_dir_and_commit_per_mode`. Dev server on `--data-dir ~/lib`. **`GET /api/views/app-info` answers 200.** Then the body is `{version: bookvie.__version__, mode: "dev", dataDir: "~/lib", commit: <git rev-parse --short HEAD in the package folder>}`; with git gone from `PATH` afterwards, `commit` is unchanged (read once); `/api/health` is still `{app, dataDir, pid}`. Production on a folder outside `HOME`: `mode: "production"`, `dataDir` absolute, `commit: null`. A dev start with `PATH` lacking git, and one with `GIT_DIR` naming no repo, both start and answer `commit: null`. The OpenAPI schema has the route, its model has exactly the four fields with `mode` enum `["dev","production"]`, the model class lives in `bookvie.views.app_info`, and `schema.d.ts` has the path and the model. | Built through `cli.main` because `mode` and `commit` come from the CLI's startup; `TestClient` reads the view without a real port. AC-1 is kept out of the way with an explicit `--data-dir`/`--port`. |
| AC-4 | E2E (dev worker + a production `startSeededServer`) | P0 | `dev-mode.spec.ts`. The dev server's `/favicon.svg` opened as a document, light scheme. **Its one path's computed fill is `rgbOf(components.favicon.dev-fill)`.** Then dark: `dev-fill-dark`; both DESIGN.md values still `#8C5E0E`/`#EBC27A`; same drawing as 11.1 (viewBox, DESIGN.md path, allowed elements, no stroke, opacity 1). The dev response is 200, `image/svg+xml`, `no-cache`, byte-equal to the built `favicon-dev.svg`, which is byte-equal to `public/favicon-dev.svg`. A production server's `/favicon.svg` is 200, `image/svg+xml`, `no-cache`, the built `favicon.svg` and not the dev bytes. `scripts/smoke.mjs` mentions `favicon-dev.svg`. | The fills only exist as Chromium computes them; real servers in both modes prove the route chooses by mode. |
| AC-5 | E2E (Vite in process) | P1 | `dev-proxy.spec.ts`. `loadConfigFromFile` on `vite.config.ts`. **Its `server.proxy` targets are exactly `{'/api','/media','/favicon.svg'}` → `http://127.0.0.1:8766`.** Then Vite on a free port with the inline map including `/favicon.svg` → the dev server: `/favicon.svg` through Vite computes the dev amber fill, its bytes equal the built `favicon-dev.svg` and differ from `public/favicon.svg`. | The AC names this file and its inline map. |
| AC-6 | E2E (dev, built SPA) | P0 | `dev-mode.spec.ts`. Dev server seeded with Dune, light scheme, `/catalog`, after the banner's Main navigation is visible. **The banner's exact text "DEV" is visible.** Then its parent's text, whitespace collapsed, is `bookvie DEV`; background `dev-pill.background`, color `dev-pill.foreground`, 12px, weight 600, letter-spacing 0.96px, radius 6px, padding `4px 7px`; the gap from the last glyph of "bookvie" to the pill is 8px (±0.5). Dark: `background-dark`/`foreground-dark`. No `a`, `button`, link/button role or `tabindex` on or around it, and `focus()` doesn't take. Every route's title is `DEV · <Page> — bookvie`: Home, Catalog, Stats, Card notes, Backup, Book detail (`DEV · Dune — bookvie`), Page not found. With `app-info` rewritten to `mode: "production"` on the same dev server: no pill, `Catalog — bookvie`. No file under `frontend/src` contains `import.meta.env.DEV`. | What Oleg sees and what a screen reader reads, on every kind of route. |
| AC-7 | E2E (production) | P1 | `dev-mode-production.spec.ts`. Production server seeded with Dune. **The first `app-info` response the page gets says `mode: "production"`.** Then on every route, in light and dark, each after a new `app-info` response: title `<Page> — bookvie`, no DEV text in the banner, and no element or drawn `::before`/`::after` with dev amber in any color property. | The absence only means something once `app-info` has loaded; waiting for it is what makes this red today. |
| AC-8 | E2E (dev, `page.route` on `app-info`) | P1 | `dev-mode.spec.ts`. `app-info` held. **The page has asked for `app-info` (the held route caught a request).** Then while it's pending: `Home — bookvie`, no DEV, live regions empty. Fulfilled with 500: a 500 seen, same title, no DEV, banner text identical to the pending state, live regions empty. Then routes pass through, reload: pill and `DEV · Home — bookvie`; routes switched to 500 and a window `focus` refetches: a new 500 seen, pill and prefix still there, live regions empty. | Only the browser shows the shell's states across a pending, failed and failed-refetch `app-info`. The first assertion proves the pending state really happened; the absence checks are trivially true today. |
| AC-9 | E2E (dev, forced colors) | P2 | `dev-mode.spec.ts`. `forcedColors: 'active'`, light. **The pill's `border-top-width` is `1px`.** Then all four sides 1px solid `CanvasText`, background `Canvas`, color `CanvasText`, each system color read from a probe element on the same page. | Forced colors only exist in the browser. |
| AC-10 | Static (Node, in the Playwright runner) | P2 | `dev-mode-production.spec.ts`. **Exactly one `*.module.css` under `frontend/src` holds both amber literals.** Then no other file under `src` holds either, `tokens.css` holds neither, `public/favicon-dev.svg` holds both, `public/favicon.svg` neither (case-insensitive). The token comparison half is `app-shell.spec.ts` itself, unchanged. | A rule about where source text lives. |
| AC-11 | Static (Node) | P2 | `dev-mode-production.spec.ts`. The README paragraph that starts `**Development:**`: **contains `~/bookvie-data-dev`.** Then `bookvie --dev --no-browser`, `8766`, "real library", and `npm run dev` … `prox` … `8766`; the `**Options:**` paragraph contains `~/bookvie-data-dev` and `8766`; nowhere "stop any normal `bookvie` first". | The README is text; exact wording is the build's, these tokens are the AC's. |

**Primary branch per criterion.** AC-1's newly promised scalar is the dev data folder, AC-2's the exit code 2, AC-3's the view's 200, AC-4's the dev fill, AC-5's the proxy map, AC-6's the pill, AC-7's the loaded production mode, AC-8's the pending `app-info` request, AC-9's the pill's forced border, AC-10's the pill module, AC-11's the dev folder in Development.

**What the leaves pin (the contract for the build):**
- `cli.py`: with `--dev`, the defaults are `~/bookvie-data-dev` and `8766`; `--help` names both pairs. With `--dev`, a data folder that resolves (symlinks, `..`, `~`) to the resolved `~/bookvie-data`, existing or not, makes `main` print exactly the AC's message plus a newline to stderr, nothing to stdout, and exit 2 (return 2 or `SystemExit(2)`), before `ensure_writable`, `instance.claim_lock` and `Store.open`. Not `parser.error` (that adds a usage line).
- `GET /api/views/app-info`: an ordinary view in the OpenAPI schema whose response model lives in `bookvie/views/app_info.py`, with exactly `version`, `mode` (`Literal["dev","production"]`), `dataDir`, `commit` (`str | None`). `dataDir` is `~/<rest>` under the resolved home, else the absolute resolved path. `commit` is read once at startup with `--dev` by running git in the package's folder; any failure (no git on `PATH`, `GIT_DIR` naming no repo, not a checkout) gives `null`. `schema.d.ts` regenerated.
- `GET /favicon.svg` serves `static/favicon-dev.svg` from a `--dev` server, same headers as 11.1.
- `frontend/public/favicon-dev.svg`: the 11.1 drawing with fill `#8C5E0E` and `#EBC27A` under `@media (prefers-color-scheme: dark)`. No other change.
- `scripts/smoke.mjs` names `favicon-dev.svg` (it should check the installed wheel has it).
- `vite.config.ts`: `server.proxy` has exactly `/api`, `/media` and `/favicon.svg`, each targeting `http://127.0.0.1:8766`.
- The DEV pill: an element whose own text is exactly `DEV`, inside the banner, a direct child of the wordmark element whose text node "bookvie" it follows, with whitespace in the DOM between them. Not a link, button or Tab stop. Its CSS Module (the only one with the amber literals) gives it the colors above, in light and dark, and `Canvas`/`CanvasText` with a 1px solid `CanvasText` border under forced colors.
- Titles: `DEV · ` before the existing title on every route once `app-info` says `dev`, from `app-info.mode` only.
- README: the Development and Options paragraphs as AC-11 says.

**Open for the build (not pinned):**
- Whether the CLI or `create_app` reads the commit, and how `views/app_info` gets `version` (the layer rule forbids `views` importing `bookvie`'s top level; `test_layers.py` will say).
- How the pill gets the space: a text node, or `{' '}` in JSX, as long as the text collapses to `bookvie DEV` and the measured gap is 8px.
- How dark mode reaches the pill's literals (`prefers-color-scheme` and `[data-theme]`); the leaf only checks the OS-dark case with Theme System. See the follow-ups.
- The README's wording, around the tokens AC-11 checks.

## Existing leaves this story changes (for the build)

- `backend/tests/test_cli.py` autouse fixture `expose_data_dir` wraps `cli.create_app` with a fixed keyword list (`data_dir, port, dev, store, clock`). If `create_app` gains a parameter (a commit, say), the wrapper must pass it on. That's a pytest fixture, so the build may change it.
- `dev-proxy.spec.ts`'s existing leaf: AC-5 says the inline map gains `/favicon.svg`. Once `vite.config.ts` proxies `/favicon.svg` to 8766, the existing leaf's page load asks for the icon through Vite; without the inline entry that request goes to 8766 and fails quietly. Add `'/favicon.svg': { target: server.url }` to its inline map too.
- Every other existing e2e spec runs on a production server, so its titles and header don't change (AC-7 proves it from the other side). `app-shell.spec.ts`'s token comparison must pass unchanged: no amber in `tokens.css`.
- `test_cli.py` `test_defaults`, `test_flags` and `test_data_dir_tilde_is_expanded` keep passing: none starts `--dev` without explicit flags.

## Green-phase follow-ups (secondary branches, not red leaves)

- [ ] **Pytest, AC-2 real process:** `python -m bookvie.cli --dev --no-browser --data-dir <HOME>/bookvie-data` with `HOME` = tmp exits 2 with exactly the message on stderr (the process-level exit code).
- [ ] **Pytest, AC-2 HOME through a symlink:** `HOME` itself a symlink to the temp home, `--data-dir` the resolved real path: still refused (both sides resolved).
- [ ] **Pytest, AC-2 near misses start normally:** `--dev --data-dir ~/bookvie-data2`, `~/bookvie-data/sub` and `~/bookvie-data-dev` aren't refused.
- [ ] **Pytest, AC-2 without --dev:** plain `bookvie --data-dir ~/bookvie-data` still starts (the refusal is dev-only).
- [ ] **Pytest, AC-3 dataDir edge cases:** a data folder equal to `HOME` shows `~`; a sibling with the home folder as a name prefix (`/tmp/home2`) shows the absolute path, not `~2`.
- [ ] **Pytest, AC-3 commit read once:** git runs exactly once per dev start and never in production (spy on `subprocess.run`, or a fake `git` on `PATH` that counts).
- [ ] **Pytest, AC-4 route by mode:** `create_app(static_dir, dev=True)` serves `favicon-dev.svg`; with only `favicon.svg` built it answers 404 (or as the build decides), never the sage file or `index.html`; HEAD has the same headers.
- [ ] **Pytest, AC-4 wheel:** `test_wheel_build.py` with a `favicon-dev.svg` in the copied `static/` finds it in the wheel, like `test_wheel_contains_the_top_level_favicon`.
- [ ] **Smoke, AC-4:** `scripts/smoke.mjs` checks the installed package's `static/favicon-dev.svg` (or starts the installed `bookvie --dev` on a scratch folder and gets the amber file).
- [ ] **E2E, AC-6 through Vite:** with the Vite server of AC-5, the page shows the pill and `DEV · Catalog — bookvie`.
- [ ] **E2E, AC-6 Theme Dark under OS light, and Theme Light under OS dark:** the pill follows bookvie's Theme, like the rest of the page.
- [ ] **E2E, AC-6 Tab order:** Tab from "Skip to content" to the theme toggle never lands in the wordmark.
- [ ] **E2E, AC-6 centered and about 20px tall:** the pill's vertical center is within 1px of the word's, and its height is 20px ±1 (DESIGN.md → DEV pill).
- [ ] **E2E, AC-6 accessibility:** axe passes on a dev page in light and dark, and the banner's accessible text includes "bookvie DEV".
- [ ] **E2E, AC-7 forced colors:** a production page under forced colors has no pill and nothing new.
- [ ] **E2E, AC-8 client navigation:** after a failed refetch, a client-side route change keeps the prefix on the new title.
- [ ] **E2E, AC-9 dark forced colors:** same checks under `colorScheme: 'dark'`.
- [ ] **Vitest, AC-6/AC-8:** a unit test for whatever builds the title from `mode` (e.g. `usePageTitle` with and without `app-info`).

## Helper probes

All run in Chromium with the default Desktop Chrome 1280×720 viewport and `deviceScaleFactor` 1, no forced colors unless stated, with `TZ=Europe/Madrid npx playwright test e2e/<probe>.probe.spec.ts`, then removed with `rm`. The pytest probe ran as `backend/tests/test_dev_mode_probe.py` (pytest only collects `test_*.py`) with `uv run pytest tests/test_dev_mode_probe.py`, then removed with `rm`.

- **`designComponentColor`** (`dev-mode.ts`): `#8C5E0E` for `favicon.dev-fill` and `dev-pill.background`, `#EBC27A` for `favicon.dev-fill-dark` and `dev-pill.background-dark`, `#FFFFFF` / `#191B18` for `dev-pill.foreground` / `foreground-dark`. It refused `favicon.fill` (a `{colors.accent}` reference), `dev-pill.dev-fill` (a key of another component) and an unknown component, each with a throw.
- **`gapAfterWord`**, light and dark, on `setContent` blocks in 16px monospace: `bookvie<span style="margin-left:8px">` → 8, `margin-left:9px` → 9 (so it refuses 8), `bookvie <span style="margin-left:8px">` (a rendered space) → more than 10, and an `inline-flex` with `gap: 8px` → 8.
- **`systemColor`**, under `forcedColors: 'active'`: light `Canvas` `rgb(255, 255, 255)`, `CanvasText` `rgb(0, 0, 0)`; dark `rgb(0, 0, 0)` / `rgb(255, 255, 255)`; the two always differ; `NotAColor` throws.
- **`elementsColored`**, light and dark: found exactly the elements `#bg` (background), `#sh` (box-shadow), `#p::after` (color, with `content`) and `rect#r` (fill), and nothing on a page using `#8C5E0F`/`#EBC27B` (one step off). **Its first version failed this probe:** it read `::before`/`::after` of elements with no generated content, which inherit the element's colors (so `rect#r::before fill` showed up). Fixed by skipping a pseudo-element whose `content` is `none` or `normal`; the descriptor also gained the element's `#id`. Probed again after the fix: passed.
- **`watchAppInfo`**, on a routed page that fetched `app-info` (200 `{mode:"dev"}`), `app-info-other`, then `app-info` (500): recorded exactly two entries, `{200, {mode:"dev"}}` then `{500, null}`, and nothing for `app-info-other`. **Its first version failed this probe:** it pushed each entry after `await response.json()`, so the empty 500 landed first. Fixed by pushing on arrival and filling the body when parsed. The body is then `null` until parsed, so the probe's read became an `expect.poll`; every leaf already reads it that way. Probed again after the fix: passed.
- **`liveRegionText`**, light and dark: `''` with empty `status` and `alert` regions, `'SavedFailed'` with two regions holding text, and `''` for an `aria-live` div without a role next to a plain "Failed" paragraph.
- **Shorthand reads the AC-6 leaf relies on** (built-in `toHaveCSS`, probed because the values are shorthands): an element with `padding: 4px 7px`, `border-radius: 6px`, 12px `letter-spacing: 0.08em` and weight 600 reads `4px 7px`, `6px`, `0.96px` and `600`; one with `4px 8px`, `6px 5px` and `0.07em` refuses all three.
- **`exit_code`** (`test_dev_mode.py`): 2 for a return of 2, 0 for 0, 2 for `sys.exit(2)`, 0 for `sys.exit(0)`, 1 for `sys.exit("message")`.
- **`tree`**: `{}` for a missing folder; `.`, `a`, `sub`, `sub/b` with bytes for files; equal on a re-read; different after a file's bytes change, after a file is written and deleted (the folder's mtime moves), and after a file's mtime moves by 1 ms.
- **`checkout_commit`**: equal to `git log -1 --format=%h` from the repo root (`1d82463` at the time), seven or more hex digits; raises with `GIT_DIR` naming no repo.
- **Reused unchanged, so not probed:** `svgFill`, `svgShape`, `designFaviconPath` (`favicon.ts`, probed in 11.1), `rgbOf` (`library.ts`), the `test`/`expect` fixtures, `startSeededServer`, `seededServer`. `devPill`, `mainNav` and `ROUTES` are locators and data, not measurements. No border or outline width that isn't a whole pixel is read (AC-9's is 1px), so Epic 10 retro item 71 (E10-R1) doesn't apply.
- **Render-before-read**, checked over all 11 leaves; none needed a fix:
  - AC-6 waits for the banner's Main navigation (ships), then its first read is the web-first `toBeVisible` on the pill; the wordmark text, gap and focus reads come after it. Each route's title is a web-first `toHaveTitle` after the navigation is visible. The `import.meta.env.DEV` scan reads files, not the page.
  - AC-7 waits for the navigation and, per route, for a new `app-info` response through `expect.poll`, then the web-first title; `elementsColored` runs after the title proves the page (Dune included) rendered. The absence read (`toHaveCount(0)`) runs after the same waits.
  - AC-8's absence reads run after the navigation is visible and the web-first title; `textContent` of the banner and `liveRegionText` run after those too. Pill reads are web-first.
  - AC-4 and AC-5 read the SVG only through `expect.poll(() => svgFill(page))`, and `svgShape` after that poll passed. AC-9's reads are all web-first `toHaveCSS`; `systemColor` reads a probe element it creates itself, after the pill's first `toHaveCSS` passed.
  - AC-1 to AC-3, AC-10 and AC-11 read files, the CLI or `TestClient` responses, never a page.

## TDD Red Phase

11 skipped leaves. The e2e leaves are each a `test.skip(` carrying exactly one `[P*] AC-n`: four in `frontend/e2e/dev-mode.spec.ts` (file-level `test.use({ serverDev: true })`; Playwright refuses that option inside a describe, which is why the production and source leaves have their own file), three in `frontend/e2e/dev-mode-production.spec.ts`, and one in `frontend/e2e/dev-proxy.spec.ts`. The pytest leaves carry `@pytest.mark.skip(reason=RED)` and name their AC in the first comment line.

| AC | Leaf | Priority |
|---|---|---|
| AC-1 | `backend/tests/test_dev_mode.py:105` `test_dev_defaults_to_its_own_folder_and_port_and_help_shows_both` | P0 |
| AC-2 | `backend/tests/test_dev_mode.py:135` `test_dev_refuses_the_real_library_before_the_lock_or_the_store` (5 parameters) | P0 |
| AC-3 | `backend/tests/test_dev_mode.py:183` `test_app_info_reports_version_mode_data_dir_and_commit_per_mode` | P0 |
| AC-4 | `dev-mode.spec.ts:40` a dev server serves the amber favicon-dev.svg at /favicon.svg and a production server the sage favicon.svg, both uncached SVG | P0 |
| AC-5 | `dev-proxy.spec.ts:59` vite.config.ts proxies /api, /media and /favicon.svg to 127.0.0.1:8766, and a tab through Vite gets the backend amber favicon, not public/ | P1 |
| AC-6 | `dev-mode.spec.ts:89` on a dev server the wordmark reads "bookvie DEV" with the amber pill after the word, not interactive, and every title is "DEV · Page — bookvie" | P0 |
| AC-7 | `dev-mode-production.spec.ts:31` on a production server, once app-info says production, there is no DEV pill, titles are "Page — bookvie" and nothing is dev amber | P1 |
| AC-8 | `dev-mode.spec.ts:150` on a dev server the shell looks like production while app-info is pending or failing, and a failed refetch after a success keeps the pill and the DEV prefix | P1 |
| AC-9 | `dev-mode.spec.ts:198` under forced colors the DEV pill is Canvas with CanvasText text and a 1px CanvasText border | P2 |
| AC-10 | `dev-mode-production.spec.ts:60` dev amber lives as literals in favicon-dev.svg and the pill CSS Module, never in tokens.css or anywhere else in the source | P2 |
| AC-11 | `dev-mode-production.spec.ts:79` the README says bookvie --dev --no-browser uses ~/bookvie-data-dev on 8766 and refuses the real library, npm run dev proxies to 8766, and never says to stop a normal bookvie first | P2 |

**Red today.** This run came after every probe above last passed (the two helper fixes were each probed again first), on the files as they are now (after Prettier and ruff). The e2e leaves were un-skipped in throwaway copies (`dev-mode.red.spec.ts`, `dev-mode-production.red.spec.ts`, `dev-proxy.red.spec.ts`, same line numbers) and run with a 30 s timeout; the pytest leaves ran from `tests/test_dev_mode_red.py` with the skip lines deleted. All copies were then removed with `rm`. Lines below are in the committed files.
- **AC-1** fails at its first assertion (`:110`): `data_dir` is `<HOME>/bookvie-data` (and the namespace shows `port=8765`).
- **AC-2** fails at its first assertion (`:172`) in all 5 forms: exit code 1 for the four forms naming the existing "real" folder (today `--dev` opens it, and the leaf's stand-in `library.json` isn't a valid library), 0 for `missing` (today it creates the folder and serves).
- **AC-3** fails at its first assertion (`:196`): 404, not 200.
- **AC-4** fails at its first assertion (`:49`): the dev server's icon fill is `rgb(85, 112, 89)` (sage), not `rgb(140, 94, 14)`.
- **AC-5** fails at its first assertion (`:74`): the proxy map has `/api` and `/media` → `http://127.0.0.1:8765`, and no `/favicon.svg`.
- **AC-6** fails at its first assertion (`:99`): no "DEV" in the banner.
- **AC-7** fails at its first assertion (`:42`): no `app-info` response ever arrives.
- **AC-8** fails at its first assertion (`:163`): the page never asks for `app-info`.
- **AC-9** fails at its first assertion (`:207`): no pill to read a border from.
- **AC-10** fails at its first assertion (`:70`): no CSS Module holds the amber literals.
- **AC-11** fails at its first assertion (`:85`): the Development paragraph doesn't mention `~/bookvie-data-dev`.

With the skips in place: `pytest tests/test_dev_mode.py tests/test_cli.py tests/test_app.py` → 74 passed, 7 skipped; `playwright test e2e/dev-mode.spec.ts e2e/dev-mode-production.spec.ts e2e/dev-proxy.spec.ts` → 1 passed (the existing proxy leaf), 8 skipped. `tsc -b` and oxlint are clean on `e2e/`. Prettier and ruff are clean on the new and changed files. `git status` lists no `*.probe.*` file and no throwaway copy.

**Storage keys:** no new localStorage key. The leaves read and write none (AC-6 relies on Theme System, the default).

**No real library:** every pytest leaf sets `HOME` to a temporary folder before it parses or starts anything, and every e2e server gets an explicit `--port` and a temp `--data-dir` from the fixtures.

## Implementation checklist (for `bmad-build-auto`)

- [ ] `cli.py`: dev defaults and `--help` (AC-1); the refusal before `ensure_writable` and the lock (AC-2); the commit read once at a dev start (AC-3).
- [ ] `views/app_info.py` with the response model, `GET /api/views/app-info` in `http/api.py`, and `npm --prefix frontend run api:gen` for `schema.d.ts` (AC-3).
- [ ] `frontend/public/favicon-dev.svg`, and the `/favicon.svg` route choosing it with `--dev` (AC-4); `scripts/smoke.mjs` checks the wheel ships it (AC-4).
- [ ] `vite.config.ts`: target `http://127.0.0.1:8766`, `/favicon.svg` proxied; `dev-proxy.spec.ts`'s existing inline map gains `/favicon.svg` (AC-5).
- [ ] An `app-info` view query in `api/views.ts` (`['view', 'app-info']`), the DEV pill in `AppShell.tsx` with its CSS Module, and the `DEV · ` prefix in `lib/page.ts`, all from `app-info.mode` (AC-6, AC-8, AC-9, AC-10).
- [ ] README Development and Options paragraphs (AC-11).
- [ ] Un-skip the 11 leaves and see them pass. Run `npm run check` with no existing e2e spec's assertions edited (AC-7: production unchanged).

## Next

`bmad-build-auto` for Story 11.2, then `bmad-code-review` in a new session, then `bmad-testarch-automate` for the follow-ups above.
