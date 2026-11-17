---
title: Development vs production, a visible version, and the app favicon — plan
status: agreed
created: 2026-11-17
source: party-mode session (Mary, John, Sally, Winston, Amelia, Murat) with Oleg
idea: docs/ideas.md → "Development vs production, and a visible version" and "App favicon"
---

# Development vs production, a visible version, and the app favicon — plan

Make a development server impossible to confuse with the real one, and impossible to point at the real library. Give bookvie a favicon: a sage spine for production, the same spine in amber for development. Show the version on the Backup page, and tell Oleg when an open tab is older than the server it talks to.

## 1. What already exists

- **`--dev` doesn't separate anything but the origin guard.** `backend/bookvie/cli.py` defines `--dev` as "used alongside the Vite dev server"; `http/app.py:161` only adds the Vite origins (`DEV_ORIGINS`) to `HostOriginGuard`. `--data-dir` still defaults to `~/bookvie-data` (`cli.py:25`) and `--port` to `8765` (`cli.py:24`). So `bookvie --dev --no-browser` without `--data-dir` reads and writes the real library. The README's Development paragraph relies on the reader typing a scratch folder.
- **Vite's proxy is wired to the production port.** `frontend/vite.config.ts` proxies `/api` and `/media` to `http://127.0.0.1:8765`, so the README says to "stop any normal `bookvie` first". Dev and the real app can't run side by side.
- **One version number already exists.** `1.1.0` is in `backend/pyproject.toml`, `backend/bookvie/__init__.py` (`__version__`), `uv.lock`, and both `package.json` / `package-lock.json`. `scripts/release.sh` sets all of them together (docs/release.md).
- **`GET /api/health`** (`app.py:163`) returns `{app, dataDir, pid}`. It is the AD-5/AD-16 instance-probe contract (`instance.probe_health`) and isn't in the OpenAPI schema.
- **Top-level build files are already served.** The SPA catch-all (`app.py:186`) serves any file at the top of `static/` as is ("e.g. favicon"). Vite copies `frontend/public/` there on build. There's no `frontend/public/` yet, and `frontend/index.html` has no icon link.
- **The wordmark already has a mark:** a sage rounded square (`.mark` in `AppShell.module.css`: `--wordmark-mark`, `--radius-plank`, `--color-accent`). DESIGN.md: `accent #557059`, `accent-dark #93B597`.
- **The tab title** is set in one place: `lib/page.ts` `usePageTitle(name)` → `` `${name} — bookvie` ``.
- **The e2e harness already starts `--dev` servers.** `frontend/e2e/fixtures.ts:74-77` always passes `--port` and a temp `--data-dir`; `serverDev: true` (`fixtures.ts:180`) adds `--dev`. `dev-proxy.spec.ts` runs Vite on a free port and **overrides the `proxy` map inline**.
- **Queries refetch on window focus** (`api/queryClient.ts:30`, `refetchOnWindowFocus: true`), so a query read on every page is re-asked whenever Oleg comes back to a tab.
- **README → Updating:** after `npm run install:local`, "hard-reload open tabs so the browser picks up the new bundle". That stale tab is a version mismatch Oleg handles by hand today.

## 2. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **`--dev` changes the defaults:** data folder `~/bookvie-data-dev`, port `8766`. An explicit `--data-dir` or `--port` still wins. Plain `bookvie` is unchanged (`~/bookvie-data`, `8765`). | Winston. Forgetting `--data-dir` no longer touches the real library, and dev and production can run at the same time. |
| D2 | **`--dev` refuses the real library.** If the resolved data folder equals the resolved `~/bookvie-data` (symlinks and `..` included), startup exits 2 before taking the lock: "bookvie: --dev won't use your real library (~/bookvie-data). Leave out --data-dir to use ~/bookvie-data-dev, or pass a scratch folder." | Oleg's call, from Amelia: agents type the commands. Defaults guard against forgetting; the refusal guards against habit. |
| D3 | **"Dev" means the server was started with `--dev`**, whatever served the bundle (Vite or the built SPA). The frontend never uses `import.meta.env.DEV` for this. | Oleg's call, from Murat: a built bundle served by `bookvie --dev` is still dev, and Vite-only detection is invisible to every e2e test. |
| D4 | **A new typed view, `GET /api/views/app-info`:** `{ version, mode: "dev" \| "production", dataDir, commit }`. `version` is `bookvie.__version__`. `commit` is the short git hash, **only with `--dev`**, read once at startup (`git rev-parse --short HEAD` in the package's source folder); `null` in production, or when git or a checkout isn't there. `/api/health` doesn't change. | Winston: health is the instance-probe contract. A view goes through the OpenAPI schema and `schema.d.ts`, so `check:api` guards it (AD-8). |
| D5 | **The server decides which favicon `/favicon.svg` is.** Production serves the sage spine; `--dev` serves the amber one, at the same URL. `index.html` links `/favicon.svg` once and never changes. Vite proxies `/favicon.svg` to the backend too. | Winston. The tab has the right icon from the first paint, with no flash and no client code. |
| D6 | **The favicon is a book spine on a plank, drawn by us.** It grows out of the wordmark's sage mark: the same color and corner radius, readable as a silhouette at 16×16. SVG only, with no PNG fallback (Chrome only, AGENTS.md). Inside the SVG, `@media (prefers-color-scheme: dark)` switches the fill to `accent-dark`. Source and license (ours, MIT like the repo) noted in a comment in the file. | Sally. No third-party license to track. Sage `#557059` goes muddy on a dark tab strip at 16px. |
| D7 | **The dev favicon** is the same drawing with an amber fill (a new pair of DESIGN.md tokens, e.g. `dev-mark` / `dev-mark-dark`, picked in the UX step). | Sally: same shape, different temperature. |
| D8 | **In dev only:** the tab title becomes `DEV · <Page> — bookvie`, and a small amber `DEV` pill sits right after the wordmark in the header. The pill is text, not color alone. Production looks exactly as it does today. | Sally. You know which tab you're in before you read anything. |
| D9 | **The version shows on the Backup page**, in an "About this copy" block under "Last export": "bookvie 1.1.0 · Data folder: `~/bookvie-data`". In dev: "bookvie 1.1.0 (a1b2c3d) · Development server · Data folder: …". | Oleg's call (Sally over John's wordmark tooltip). The Backup page is where you check that your library is safe. |
| D10 | **The commit hash shows only in dev** (D4, D9). | Oleg's call. It helps when juggling worktrees; in production the tag already is the version. |
| D11 | **Stale-tab notice.** The frontend bakes its own version at build time (Vite `define` from `frontend/package.json`). When `app-info.version` differs from it, the app shell shows a quiet notice under the header: "bookvie was updated to 1.2.0. Reload to use it." with a **Reload** button. "Differs", not "newer": a rollback shows it too. A failed `app-info` fetch (the server restarting) never shows it. Because queries refetch on focus, it appears when Oleg comes back to an old tab. | Oleg's call (Mary over John's "later"). It replaces the README's hard-reload instruction. |
| D12 | **The notice is announced once** through the existing polite status region, not on every refetch. It's never a dialog, and it doesn't block anything: an old tab still works until it's reloaded. | Murat. |

Out of scope: a `-dirty` marker on the commit hash, an "About" page, a version in `/api/health`, PNG favicons.

## 3. Changes, in order

Each step is its own skill run, in a fresh context. Docs and planning commits go straight to master.

| Step | Artifact | Change | Skill |
|---|---|---|---|
| 0 | Spine | Before Epic 11's first story: confirm Epic 10's spine reconciliation (retro item 72) has landed and no unresolved "spine drift" entries remain in `deferred-work.md` (AGENTS.md → Architecture spine). | — |
| 1 | DESIGN.md | **Favicon** (D6, D7): the drawing, its light and dark fills, and the new dev tokens. **DEV pill** (D8): its place after the wordmark, light, dark and forced-colors states. **Update notice** (D11): the band under the header and its Reload button. **About this copy** block on the Backup page (D9). | `bmad-ux` (update) |
| 2 | EXPERIENCE.md | App shell: the dev tab title and the DEV pill (D8), the update notice and its one announcement (D11, D12). Backup page: the About this copy block (D9, D10). | `bmad-ux` (update) |
| 3 | PRD | **FR-26 Development and production stay apart** (D1–D3, D5, D7, D8). **FR-27 The version is visible** (D9–D12). The favicon (D6) goes in the non-functional / look-and-feel section. Bump `updated:`. | `bmad-prd` (update) |
| 4 | Architecture spine | **AD-16:** `--dev` defaults to port `8766` and `~/bookvie-data-dev`, and refuses `~/bookvie-data` (D1, D2). **AD-6 / view list:** `app-info` (D4). **AD-16 SPA routes:** `/favicon.svg` is served by mode (D5). Structural Seed: `frontend/public/` and the two favicon files. Not a new AD. | `bmad-architecture` (update) |
| 5 | Epics (`epics.md`) | New **Epic 11: Know which bookvie you're looking at**, covering FR-26, FR-27 and the favicon, with the four stories below. Add it to the Epic List and the FR coverage map. | `bmad-create-epics-and-stories` |
| 6 | Sprint status | Add Epic 11 and Stories 11.1–11.4. | `bmad-sprint-planning` |
| 7 | Stories 11.1–11.4 | ATDD → `bmad-build-auto` → `bmad-code-review` (new session) → `bmad-testarch-automate`, per AGENTS.md → Story pipeline. Then the Epic 11 retro. | per story |
| 8 | `docs/ideas.md` | Both ideas' status → `planned`, linking Epic 11 and this plan. Done with this plan. | — |

## 4. Story cut (Epic 11)

**11.1 A favicon for bookvie** (D6). Production only, so it stands alone.

- `frontend/public/favicon.svg` (sage, with a dark-scheme fill) and `<link rel="icon" href="/favicon.svg" type="image/svg+xml">` in `index.html`.
- The existing catch-all serves it from `static/`. Check that `npm run build` copies it and that the installed wheel contains it (`scripts/smoke.mjs`).

**11.2 Keep development apart from the real library** (D1–D5, D7, D8). Needs 11.1.

- `cli.py`: dev defaults (D1), the refusal (D2), the commit hash read at startup (D4).
- `GET /api/views/app-info` and the regenerated `schema.d.ts` (D4).
- `frontend/public/favicon-dev.svg`, served at `/favicon.svg` when `--dev` (D5). This could be a route before the catch-all, or the catch-all choosing the file by mode.
- `vite.config.ts`: the proxy target moves to `8766`, and `/favicon.svg` joins `/api` and `/media`.
- `AppShell.tsx`: the DEV pill. `lib/page.ts`: the `DEV · ` title prefix. Both read `app-info.mode`.
- README: Development and Options paragraphs updated. The "stop any normal `bookvie` first" line goes.

**11.3 Show the version on the Backup page** (D9, D10). Needs 11.2 (`app-info`).

- An About this copy block in `BackupPage.tsx` under "Last export".

**11.4 Tell me when a tab is older than the app** (D11, D12). Needs 11.2.

- A Vite `define` for the baked version (with a type declaration so `tsc -b` knows it).
- An update notice in `AppShell` that compares the two versions, with Reload, announced once.
- README → Updating: the "hard-reload open tabs" instruction is replaced by the notice.

## 5. Tests

Murat's risks, for the ATDD:

- **Real library refused** (P0, pytest): with `HOME` set to a temp folder, `--dev --data-dir ~/bookvie-data` exits 2 with the message and takes no lock. So does a symlink to it, and a path with `..` that resolves to it. No test ever touches the real `~/bookvie-data`.
- **Dev defaults** (P0, pytest): `--dev` alone resolves to `~/bookvie-data-dev` and `8766`; explicit `--data-dir` / `--port` win. Plain `bookvie` still resolves to `~/bookvie-data` and `8765`.
- **app-info** (P0, pytest): `mode` and `commit` per mode. `commit` is `null` without `--dev`, and `null` (not an error) when git isn't available. `version` equals `bookvie.__version__`.
- **Favicon by mode** (P0, e2e): `/favicon.svg` returns the sage file from a production server and the amber file from a `serverDev` server, both as `image/svg+xml`. `dev-proxy.spec.ts` adds `/favicon.svg` to its inline `proxy` map, so the check through Vite reads the backend's file, not Vite's own `public/` copy.
- **Favicon tokens** (P1): the SVG fills equal DESIGN.md's `accent` / `accent-dark` (and the dev pair), in the spirit of `app-shell.spec.ts`. Smoke: the installed wheel serves `/favicon.svg`.
- **Dev frame** (P0, e2e with `serverDev`): the DEV pill is in the header and the tab title starts with `DEV · `. On a production server neither is there, and the existing specs pass untouched.
- **Backup page** (P1): the version and data folder show; the commit only in dev.
- **Stale tab** (P0): with the baked version different from `app-info.version`, the notice shows with Reload and is announced once. With them equal it never shows. A failed `app-info` fetch never shows it. Reload reloads.
- **Accessibility** (P1): the pill's text is readable by a screen reader. The notice's Reload button is reachable by Tab, and the notice isn't a dialog or an alert.
