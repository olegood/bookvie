---
title: 'Story 1.1: Scaffold and install bookvie'
type: 'feature'
created: '2026-10-29'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The repo holds only planning docs. Every later story needs a backend package, a frontend app, and a one-command install that starts bookvie and opens it in the browser.

**Approach:** Create the uv/hatchling `backend/` package (layer layout, CLI, FastAPI app that serves the built SPA) and a Vite `react-ts` `frontend/` (React Router, TanStack Query, CSS Modules over `tokens.css`, dev proxy). Wire a root `package.json` so `npm run build` and then `uv tool install --reinstall ./backend` give a global `bookvie`.

## Boundaries & Constraints

**Always:** Pin every dependency to the series in ARCHITECTURE-SPINE.md → Stack. Use exact series ranges in the manifests and commit `uv.lock` and `package-lock.json`. TypeScript is 5.9, not the template's 7. Bind `127.0.0.1` only. Keep the layer import direction (`domain` imports no other layer; `store` imports only `domain`; `http` imports `intents`/`views`; the frontend calls the server only through `src/api/`). Logs go to stderr only. Never create or touch `~/bookvie-data` during verification: always pass `--data-dir` pointing into the scratchpad.

**Never:** No lock file, `/api/health`, Host/Origin guard or port-conflict handling (Story 1.2). No `npm run check`, coverage gate, e2e fixture or smoke test (Story 1.3). No store, schema or `library.json` (1.4). No envelope, error handler or openapi generation (1.5); `src/api/generated/` stays an empty placeholder. No app shell, nav or theme toggle (1.6). No CSS framework or third-party starter.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Start | `bookvie --data-dir D` | Binds 127.0.0.1:8765, creates D (with parents) if missing, opens browser at `http://127.0.0.1:8765/` | N/A |
| No browser | `--no-browser` | Same, browser not opened | N/A |
| SPA root | `GET /` | 200 `index.html` | N/A |
| Client route | `GET /books/x` | 200 `index.html` | N/A |
| Static asset | `GET /assets/<hash>.js` | The file | Missing file → 404 |
| API/media miss | `GET /api/nope`, `GET /media/nope` | 404, never `index.html` | N/A |
| SPA not built | `static/index.html` absent | `GET /` → 404 with text naming `npm run build` | Server still starts |
| Dev | `npm run dev` + `bookvie --dev --no-browser` | Vite :5173 proxies `/api`, `/media` to :8765 | N/A |

**Decision (uv):** Before building, run `uv self update` to bring the local uv from 0.12.1 to the pinned 0.13.x. Do not add a `required-version` to `pyproject.toml`.

</frozen-after-approval>

## Code Map

- No application code exists yet. The `develop`, `go-python` and `db` branches hold an older prototype with a different layout. Do not reuse it.
- `.gitignore` -- already ignores `build/`, `dist/`, `.venv/`, `.python-version`, `test-results/`. Add `node_modules/` and `backend/bookvie/http/static/`.
- `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md` -- YAML frontmatter lines 1–366: `colors` (light names plus `-dark` twins), `typography`, `rounded`, `spacing`, `components`. Source for `tokens.css`.
- `epics.md` lines 267–306 -- Story 1.1 ACs (authoritative).

## Tasks & Acceptance

**Execution:**
- [ ] `backend/pyproject.toml` -- `requires-python = ">=3.14,<3.15"`, runtime deps fastapi 0.162, pydantic 2.14, uvicorn 0.54, python-multipart 0.0.x, pillow 13; dev group pytest 9, pytest-cov 7.1, hypothesis 6.170, httpx 0.28; hatchling 1.33 build backend; `[project.scripts] bookvie = "bookvie.cli:main"`; wheel `packages = ["bookvie"]`, `artifacts = ["bookvie/http/static/**"]`; pytest config `testpaths = ["tests"]` -- the AR22 packaging contract.
- [ ] `backend/bookvie/{__init__,cli}.py`, `http/__init__.py` + `http/app.py`, and empty `intents/ views/ domain/ store/` packages -- `cli.main(argv=None)` with argparse flags `--data-dir` (default `~/bookvie-data`, expanded), `--port` (8765), `--no-browser`, `--dev`. It creates the data dir, builds the app via `create_app(static_dir)` and runs uvicorn on 127.0.0.1, opening the browser via `webbrowser` once the server is up (uvicorn `Server` + startup callback or short thread) unless `--no-browser`. The app mounts `/assets` and serves the SPA fallback per the matrix.
- [ ] `backend/tests/` -- `test_cli.py` (arg defaults, data dir creation, browser opened or skipped; uvicorn and webbrowser monkeypatched), `test_app.py` (every matrix row via `TestClient` against a tmp static dir), `test_layers.py` (ast scan enforcing the import direction).
- [ ] `frontend/` -- scaffold with `npm create vite@latest frontend -- --template react-ts`, then pin react/react-dom 19.3, vite 8.3, typescript ~5.9, @tanstack/react-query 5, react-router 8.5, @playwright/test 1.64 (dev), openapi-typescript 7.13 (dev). Remove the template demo assets.
- [ ] `frontend/vite.config.ts` -- `build.outDir: '../backend/bookvie/http/static'`, `emptyOutDir: true`; dev `server.port 5173`, proxy `/api` and `/media` to `http://127.0.0.1:8765`.
- [ ] `frontend/src/` -- `main.tsx` (QueryClientProvider + `RouterProvider` with `createBrowserRouter`), `pages/CatalogPage.tsx` + `.module.css` (placeholder `h1` "Catalog" at `/`), `components/.gitkeep`, `api/client.ts` (fetch base, the only server caller), `api/generated/.gitkeep`, `styles/tokens.css`, `e2e/.gitkeep`.
- [ ] `frontend/src/styles/tokens.css` -- one custom property per primitive in DESIGN.md frontmatter `colors`/`typography`/`rounded`/`spacing` (`--color-ink`, `--space-4`, …). Light values on `:root`. Dark twins override under `:root[data-theme="dark"]` and under `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }`. Component tokens are left to later stories.
- [ ] `package.json` (root) -- `build` → `npm --prefix frontend run build`, `dev` → `npm --prefix frontend run dev`; `postinstall` installs frontend deps. No `check` scripts.
- [ ] `.gitignore` -- add the entries named in the Code Map.

**Acceptance Criteria:**
- Given a fresh clone, when `npm install && npm run build` then `uv tool install --reinstall ./backend`, then `bookvie` is on PATH and the installed package contains `bookvie/http/static/index.html`.
- Given `frontend/`, when `npx tsc -b`, then it exits 0 and `tsc --version` reports 5.9.x.
- Given every manifest, when compared to Spine → Stack, then each listed dependency resolves inside its pinned series.
- Given the backend sources, when `test_layers.py` runs, then no forbidden import exists.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `uv run --project backend pytest` -- expected: all pass.
- `npm install && npm run build` -- expected: `backend/bookvie/http/static/index.html` exists and is ignored by git.
- `cd frontend && npx tsc -b` -- expected: exit 0.
- `uv tool install --reinstall ./backend && bookvie --no-browser --data-dir <scratchpad>/data --port 8799 &`, then `curl -s 127.0.0.1:8799/` and `curl -s 127.0.0.1:8799/books/x` -- expected: both return the SPA HTML; `<scratchpad>/data` exists; `~/bookvie-data` still absent. Stop the server afterwards.
