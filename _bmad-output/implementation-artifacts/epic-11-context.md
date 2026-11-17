# Epic 11 Context: Know which bookvie you're looking at

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Make bookvie easy to spot and impossible to confuse with a development copy. bookvie gets its own favicon (a sage shelf of three spines). A server started with `--dev` defaults to its own library folder and port, refuses to open the real library, and is marked in every tab with an amber favicon, a `DEV · ` title prefix and a DEV pill in the header. The Backup page shows which version is running and which data folder it uses, and a tab left open across an update quietly offers Reload. This matters because agents start dev servers for Oleg: a forgotten `--data-dir` or a habit must never touch `~/bookvie-data`.

## Stories

- Story 11.1: A favicon for bookvie
- Story 11.2: Keep development apart from the real library
- Story 11.3: Show the version on the Backup page
- Story 11.4: Tell me when a tab is older than the app

## Requirements & Constraints

- **Dev defaults:** `bookvie --dev` uses `~/bookvie-data-dev` and port `8766`; an explicit `--data-dir`/`--port` wins. Plain `bookvie` is unchanged (`~/bookvie-data`, `8765`). `--help` shows both defaults.
- **Real library refused:** with `--dev`, if the resolved data folder (symlinks and `..` included) equals the resolved `~/bookvie-data`, print exactly "bookvie: --dev won't use your real library (~/bookvie-data). Leave out --data-dir to use ~/bookvie-data-dev, or pass a scratch folder." to stderr and exit 2, before any lock is taken or store opened; nothing in that folder changes.
- **No test ever reads or writes the real `~/bookvie-data`:** tests set `HOME` to a temporary folder. `npm run check` must leave `~/bookvie-data` untouched.
- **Dev is decided by the server only** (started with `--dev`), whatever served the bundle (Vite or the built SPA). The client never uses `import.meta.env.DEV` for it.
- **Production looks exactly as before** apart from the favicon, the About this copy card and (after an update) the update notice. No amber anywhere in production. Existing e2e specs must pass unchanged on a production server.
- **Graceful app-info:** until `app-info` loads, or if it never loads, the shell looks like production, no notice, no About card, nothing says it failed. A refetch failing after a success keeps the last data (pill, title prefix, card, notice stay as they were).
- **Update notice** shows whenever the baked bundle version differs from the server's (newer or older, rollback included); hides if a later refetch finds the bundle's own version; never shown by a failed fetch. Announced once via the existing polite status region; a new different version announces once more. Not a dialog, not an `alert`, not itself a live region, no dismiss, blocks nothing; Reload reloads at once without asking.
- **Supported browser is desktop Chrome only:** SVG favicon only, no PNG or `.ico` fallback.
- **Epic gate:** P0 risks green (real library refused incl. symlink/`..`; dev defaults; `app-info` per mode; favicon by mode, also through Vite; dev frame; stale-tab notice), version equality test in `npm run check`, existing e2e unchanged.
- Out of scope: a `-dirty` commit marker, an About page, a version in `/api/health`, PNG favicons.

## Technical Decisions

- **`GET /api/views/app-info`** is an ordinary typed view (Pydantic model in `views/app_info`, in the OpenAPI schema; regenerate `schema.d.ts` so `check:api` passes): `{ version, mode: "dev" | "production", dataDir, commit }`. `version` = `bookvie.__version__`. `dataDir` is the resolved folder formatted for display: `~` for the home folder, full absolute path outside it. `commit` = short git hash (`git rev-parse --short HEAD` in the package's source folder), read once at startup and only with `--dev`; `null` in production and when git or a checkout is absent, never an error or failed start.
- **`/api/health` does not change**: it stays the instance-probe contract, outside the OpenAPI schema.
- **Client caching:** keyed `['view', 'app-info']`, invalidated after every intent and refetched on window focus like other views; that is how an old tab finds a newer server.
- **Favicon route:** a dedicated `GET /favicon.svg` registered before the SPA catch-all serves `favicon.svg` (sage) in production and `favicon-dev.svg` (amber) with `--dev`, as `image/svg+xml` with `Cache-Control: no-cache` (a dev server on `--port 8765` would share the origin). `/favicon.ico` and other unknown top-level files behave as before. `index.html` has exactly one icon link, `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`, never changed by the client.
- **Files:** `frontend/public/favicon.svg` and `favicon-dev.svg`; the build copies them into `backend/bookvie/http/static/` and the wheel ships both (verified by `scripts/smoke.mjs`).
- **Favicon drawing:** `0 0 32 32` viewBox, one flat fill, no outline or labels, path `M3 11a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14H3z M12.5 5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v20h-8z M22 13a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v12h-7z M1 26h30v4H1z`; a comment names it as bookvie's own drawing under the repo's MIT license. Fills: production `#557059` (`accent`) / dark `#93B597` (`accent-dark`); dev `#8C5E0E` / dark `#EBC27A`, switched by `@media (prefers-color-scheme: dark)` inside the SVG. Tests check fills against DESIGN.md (`accent`, `accent-dark`, `components.favicon.dev-fill`, `dev-fill-dark`).
- **Dev amber lives as literals** in the favicon files and the pill's CSS Module, never in `tokens.css` (do not edit `tokens.css`; `app-shell.spec.ts` token comparison must pass unchanged).
- **Vite:** `vite.config.ts` proxies `/api`, `/media` and `/favicon.svg` to `http://127.0.0.1:8766`. `dev-proxy.spec.ts` overrides the proxy map inline, so add `/favicon.svg` there and check a Vite tab gets the backend's amber file, not Vite's `public/` copy.
- **Title:** set in one place (`lib/page.ts` `usePageTitle`); dev prefix makes "DEV · *Page* — bookvie" on every route.
- **One version:** the bundle bakes its version from `frontend/package.json` via a Vite `define`, with a type declaration for `tsc -b`. A test in `npm run check` fails unless `bookvie.__version__`, `backend/pyproject.toml`, `package.json` and `frontend/package.json` agree (`scripts/release.sh` sets them all).
- e2e fixtures already start servers with `--port` and a temp `--data-dir`; `serverDev: true` adds `--dev`.

## UX & Interaction Patterns

- **DEV pill:** inside the wordmark after "bookvie", with a space in the DOM so it reads "bookvie DEV". Text "DEV" in `section-label`, white on dev amber (`#8C5E0E`, dark `#EBC27A`), `rounded.sm`, `4px 7px` padding, `spacing.2` after the word. Not a link, button or Tab stop. Forced colors: `Canvas` with `CanvasText` text and 1px `CanvasText` border. A one-time nav shift when it appears is accepted.
- **About this copy:** third `surface` card on Backup after Export and Restore, same frame; a `section` labelled by `h2` "About this copy" (uppercase via `section-label`/`ink-tertiary`). Two lines in `body-sm`/`ink-secondary`, sans: "bookvie 1.1.0" / "Data folder: ~/bookvie-data". Dev: "bookvie 1.1.0 (a1b2c3d) · Development server" (" · " is literal text; no brackets when `commit` is null). Path wraps with `overflow-wrap: anywhere`, never truncated. Plain read-only text, no copy button, no Tab stop. Omitted silently without `app-info`. (The card placement supersedes the plan's "under Last export".)
- **Update notice:** full-width `surface` band directly under the top nav inside the `header` landmark, `line` bottom hairline, text aligned with page padding. "bookvie was updated to *X*. Reload to use it." in `body-sm`/`ink` (X = server version), then **Reload** as compact 30px `button-secondary`, `spacing.4` after the sentence. No icon, close button, amber or accent fill. Pushes the page down, never overlaps. Tab order: after the theme toggle, before page content; "Skip to content" skips it. Forced colors: `CanvasText` bottom border, system button colors.
- Backup headings run `h1` "Backup" then `h2` "About this copy"; axe passes in light and dark.

## Cross-Story Dependencies

- 11.1 stands alone (production favicon and route). 11.2 builds on it (dev favicon at the same route) and adds `app-info`, which 11.3 and 11.4 both need.
- README updates: 11.2 rewrites Development and Options (`bookvie --dev --no-browser` uses `~/bookvie-data-dev` on 8766, refuses the real library, `npm run dev` proxies to 8766; drop "stop any normal `bookvie` first"); 11.4 replaces the "hard-reload open tabs" line in Updating with the notice.
- Epic 11 closes after 11.4's automate step, then the retro and spine reconciliation.
