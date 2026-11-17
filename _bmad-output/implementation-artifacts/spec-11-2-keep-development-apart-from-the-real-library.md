---
title: 'Story 11.2: Keep development apart from the real library'
type: 'feature'
created: '2026-11-17'
baseline_revision: 'ac279ecf8052bf6d8a3c2e76b9d2db8086898461'
status: 'in-review'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-11-2-keep-development-apart-from-the-real-library.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-11-context.md'
warnings: [oversized]
deferred:
  - summary: >-
      Spine drift (AD-6 App info bullet, AD-7 App info view, Structural Seed `views/`), reconciled before the next epic: the spine still marks app-info "(Epic 11, planned)", though Story 11.2 built the view and its client query.
    evidence: |-
      backend/bookvie/views/app_info.py, http/api.py app_info_view, frontend/src/api/views.ts useAppInfo (spine check).
    location: >-
      ARCHITECTURE-SPINE.md:98, :121, :382
    severity: low
  - summary: >-
      Spine drift (AD-16 Binding and Real library refused), reconciled before the next epic: both bullets still read "(Epic 11, planned)", though Story 11.2 built them in cli.py.
    evidence: |-
      backend/bookvie/cli.py DEV_PORT, DEV_DATA_DIR, _refuses_real_library (spine check).
    location: >-
      ARCHITECTURE-SPINE.md:223, :224
    severity: low
  - summary: >-
      Spine drift (AD-16 Favicon bullet, Seed public/, Capability map FR-26, Testing row and Seed "Build and install"), reconciled before the next epic: Story 11.2 finished the dev favicon half and FR-26, and smoke now checks favicon-dev.svg in the installed package.
    evidence: |-
      frontend/public/favicon-dev.svg, frontend/vite.config.ts, scripts/smoke.mjs; extends the Story 11.1 entries in deferred-work.md (spine check).
    location: >-
      ARCHITECTURE-SPINE.md:230, :297, :346, :387, :399, :415
    severity: low
---

<intent-contract>

## Intent

**Problem:** `bookvie --dev` uses the same folder and port as the real `bookvie`, so an agent starting a dev server without `--data-dir` opens `~/bookvie-data`, and a dev tab looks exactly like the real one.

**Approach:** `--dev` gets its own defaults (`~/bookvie-data-dev`, port 8766). It refuses any data folder that resolves to the real library before anything is touched, and it reports itself through a new `GET /api/views/app-info` view. The client reads `app-info.mode` to show a DEV pill and a `DEV · ` title prefix. A dev server serves an amber `favicon-dev.svg` at `/favicon.svg`, and Vite proxies to 8766.

## Boundaries & Constraints

**Always:** Explicit `--data-dir`/`--port` win over the dev defaults. The refusal compares fully resolved paths (`~`, symlinks, `..`, a missing folder), prints exactly the AC's message plus a newline to stderr, nothing to stdout, and returns 2 before `ensure_writable`, `claim_lock` and `Store.open`. `app-info` is `{version, mode, dataDir, commit}` from a Pydantic model in `bookvie/views/app_info.py`. `commit` is read once at a `--dev` start; any failure gives `null`, never a failed start. The client decides dev only from `app-info.mode`. While `app-info` is pending or failed, the shell looks like production. A failed refetch keeps the last data. Dev amber appears only as literals in `public/favicon-dev.svg` and one CSS Module. Every existing e2e spec passes with its assertions unedited.

**Never:** No `import.meta.env.DEV`. No edit to `tokens.css` or to the spine. No change to `/api/health`. No PNG/`.ico` favicon. No version-equality test, About card or update notice (Stories 11.3/11.4). No `parser.error` for the refusal (it adds a usage line).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Dev defaults | `bookvie --dev` | `~/bookvie-data-dev`, port 8766 | — |
| Real library | `--dev --data-dir` → `~/bookvie-data` (direct, `~`, symlink, `..`, missing) | stderr message, exit 2, folder unchanged, no lock | return 2 |
| Near miss | `--dev --data-dir ~/bookvie-data2` or `~/bookvie-data/sub` | starts normally | — |
| No `--dev` | `bookvie --data-dir ~/bookvie-data` | starts normally | — |
| dataDir display | folder under home / equal to home / `/tmp/home2` beside home `/tmp/home` | `~/x` / `~` / absolute | — |
| No git | `--dev` with no git on `PATH`, or `GIT_DIR` naming no repo | starts; `commit: null` | swallow OSError/SubprocessError |
| Favicon | `GET /favicon.svg` on dev / production | `favicon-dev.svg` / `favicon.svg`, `image/svg+xml`, `no-cache` | 404 when that file isn't built |

</intent-contract>

## Code Map

- `backend/bookvie/cli.py` -- `parse_args` defaults (`DEFAULT_DATA_DIR`, `DEFAULT_PORT`); `main` order: parse → **refusal** → `ensure_writable` → `claim_lock` → bind → `Store.open` → `create_app(...)`. It is the composition root, so it may import `bookvie.__version__` and run git.
- `backend/bookvie/http/app.py:140` `create_app` -- add `version`/`commit` keywords, store `app.state.app_info`; the favicon route at `:195` picks the file by `dev`. `http` may import only `views`/`intents` (`tests/test_layers.py`).
- `backend/bookvie/http/api.py:338` -- view routes; add `/views/app-info` beside `backup_view`.
- `backend/bookvie/views/models.py:13` `_View` (camelCase aliases); `views/__init__.py` re-exports. `views` may not import `bookvie` top level, so `version` is passed in.
- `backend/tests/test_cli.py:48` `expose_data_dir` wraps `create_app` with fixed keywords; pass the new ones through.
- `backend/tests/test_dev_mode.py` -- three red pytest leaves (AC-1..3), `RED` constant.
- `backend/tests/test_wheel_build.py:64` -- pattern for a wheel-contains-file test.
- `frontend/src/api/views.ts` -- `Views` map, `fetchView`, `viewKey`; intents invalidate `['view']` (`api/intents.ts:49`), so `['view','app-info']` refetches after every intent and on focus.
- `frontend/src/lib/page.ts` `usePageTitle` -- the only title setter (all pages, ErrorPage included, render inside `QueryClientProvider`, `main.tsx`).
- `frontend/src/components/AppShell.tsx` + `.module.css` -- `.wordmark` is `inline-flex` with `gap: var(--space-2)` (8px); the pill goes after the text "bookvie".
- `frontend/src/styles/tokens.css` -- read-only; `--font-section-label-*`, `--radius-sm`; dark via `:root[data-theme="dark"]` and `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }`.
- `frontend/vite.config.ts` -- proxy target 8765 → 8766, add `/favicon.svg`.
- `frontend/e2e/dev-mode.spec.ts`, `dev-mode-production.spec.ts`, `dev-proxy.spec.ts` -- red leaves (AC-4..11); helpers in `e2e/dev-mode.ts` (read-only). The existing `dev-proxy` leaf's inline map gains `/favicon.svg` (ATDD checklist).
- `scripts/smoke.mjs:133` -- favicon check against the installed wheel.
- `README.md:93,97` -- Options and Development paragraphs.
- Deferred-work intake:
  - `deferred-work.md:1046` (Spine drift AD-16 Favicon bullet / Seed `public/`; "the dev half … is Story 11.2's") -- not in this story: spine edits wait for the epic's reconciliation (AGENTS.md "Architecture spine").
  - `deferred-work.md:1055` (Spine drift AD-16 Capability map; "Stories 11.2 to 11.4's") -- not in this story: same reason.

## Tasks & Acceptance

**Execution:**
- `backend/bookvie/cli.py` -- `--data-dir`/`--port` default `None`, filled from `--dev` after parsing (port range checked after); help text names both pairs; `_refuses_real_library` check and message in `main` returning 2; `_checkout_commit()` (git `rev-parse --short HEAD` in the package folder, timeout, any failure → `None`) only with `--dev`; pass `version=__version__`, `commit` to `create_app` -- AC-1, AC-2, AC-3.
- `backend/bookvie/views/app_info.py` -- `AppInfoView(_View)` with `version: str`, `mode: Literal["dev","production"]`, `data_dir: str`, `commit: str | None`, and `app_info(...)` with the `~` display rule; export from `views/__init__.py` -- AC-3.
- `backend/bookvie/http/app.py` -- `create_app(..., version="", commit=None)`; `app.state.app_info`; favicon route serves `favicon-dev.svg` when `dev` -- AC-3, AC-4.
- `backend/bookvie/http/api.py` -- `GET /views/app-info` with `response_model=views.AppInfoView` -- AC-3.
- `frontend/src/api/generated/schema.d.ts` -- regenerate with `npm --prefix frontend run api:gen` -- AC-3.
- `frontend/public/favicon-dev.svg` -- the 11.1 drawing, fills `#8C5E0E` / dark `#EBC27A` -- AC-4.
- `scripts/smoke.mjs` -- fail unless the installed package's `static/favicon-dev.svg` exists and equals the built file -- AC-4.
- `frontend/vite.config.ts` -- target `http://127.0.0.1:8766`; proxy `/favicon.svg` -- AC-5.
- `frontend/src/api/views.ts` -- `AppInfoView` type, `useAppInfo()` returning the last loaded data or `undefined` -- AC-6, AC-8.
- `frontend/src/lib/page.ts` (+ `page.test.ts`) -- pure `pageTitle(name, mode)`; `usePageTitle` reads `useAppInfo()?.mode` -- AC-6, AC-7, AC-8.
- `frontend/src/components/AppShell.tsx` + `AppShell.module.css` -- pill after "bookvie" with a `{' '}` text node, only when `mode === 'dev'`; `.devPill` with the amber literals, dark twins on the theme selectors, forced-colors rule -- AC-6, AC-9, AC-10.
- `README.md` -- rewrite Options and Development -- AC-11.
- Tests -- un-skip the 11 leaves and drop the `RED` constant; `expose_data_dir` passes new keywords; add pytest for near misses, no `--dev`, `dataDir` edges, favicon by mode and the wheel shipping `favicon-dev.svg`; the existing `dev-proxy` leaf's inline map gains `/favicon.svg` -- all.

**Acceptance Criteria:**
- Given `HOME` is a temporary folder, when `bookvie --dev` parses with no flags, then it uses `~/bookvie-data-dev` and 8766, explicit flags win, plain `bookvie` is unchanged, and `--help` names both defaults (AC-1).
- Given `--dev` and a data folder resolving to `~/bookvie-data` in any form, when `main` runs, then it prints exactly the refusal to stderr, exits 2, and takes no lock and opens no store (AC-2).
- Given any server, when `GET /api/views/app-info` is requested, then it answers the four fields per mode, as the leaf pins, and `/api/health` is unchanged (AC-3).
- Given dev and production servers, when `/favicon.svg` is requested, then each serves its own file uncached as SVG, and the wheel ships both (AC-4).
- Given `vite.config.ts`, when it is loaded, then it proxies exactly `/api`, `/media` and `/favicon.svg` to 8766, and a Vite tab gets the amber icon (AC-5).
- Given a dev server whose `app-info` has loaded, when any route renders, then the wordmark reads "bookvie DEV" with the amber pill (not focusable), and the title is `DEV · Page — bookvie` (AC-6). On production nothing changes (AC-7). While `app-info` is pending or failed, the shell looks like production, and a failed refetch keeps the mark (AC-8). Under forced colors the pill is Canvas/CanvasText with a 1px border (AC-9).
- Given the source, when it is scanned, then the amber appears only in `favicon-dev.svg` and one CSS Module (AC-10), and the README says what AC-11 checks.

## Spec Change Log

## Review Triage Log

### 2026-11-17 — Review pass
- verdicts: 29 findings — high 0, medium 6, low 19, false 4, maybe-false 0
- findings:
  - `[medium]` `[patch]` (Edge) `--dev --data-dir ~/BookVie-Data` passes the refusal on macOS's case-insensitive disk and opens the real library — probed with a temp HOME: `~/BOOKVIE-DATA` resolved to `<HOME>/BOOKVIE-DATA`, refusal False. Fixed: `_refuses_real_library` now uses `instance.same_folder` (samefile, resolved-path fallback for a missing folder); AC-2 gains a `case` form.
  - `[medium]` `[patch]` (Edge) the firmlink spelling `/System/Volumes/Data/<home>/bookvie-data` passes the refusal — same root (path equality, not file identity); fixed by the same `samefile` comparison.
  - `[low]` `[reject]` (Edge) `_checkout_commit` inherits `GIT_DIR` or finds an enclosing repo, so `commit` could name an unrelated repo — needs a `GIT_DIR` naming another repo or a uv tools folder inside a git repo; informational only, and the fix adds env scrubbing plus a toplevel check.
  - `[medium]` `[patch]` (Edge, claim) the spec's "in any form" is not met for case variants and firmlinks — same root as the first row; fixed by it.
  - `[low]` `[reject]` (Edge, claim) `copy.test.mjs` holds the amber hexes as a third file — it is a test guard exempting them, not source that shows amber; AC-10 scans `frontend/src` as specified; deriving them from DESIGN.md adds a parser to the guard.
  - `[low]` `[defer]` (Spine) AD-6 App info bullet still "planned" — spine drift (AD-6), deferred.
  - `[low]` `[defer]` (Spine) AD-7 App info view still "planned" — spine drift (AD-7), deferred.
  - `[low]` `[defer]` (Spine) AD-16 Binding and Real library refused still "planned" — spine drift (AD-16), deferred.
  - `[low]` `[defer]` (Spine) AD-16 Favicon bullet / Seed `public/` — spine drift (AD-16), extends the 11.1 entry, deferred.
  - `[low]` `[defer]` (Spine) Seed `views/` lists app_info as planned — spine drift, deferred.
  - `[low]` `[defer]` (Spine) Capability map preamble and FR-26 row — spine drift (AD-16), extends the 11.1 entry, deferred.
  - `[low]` `[defer]` (Spine) Testing row / Seed "Build and install" smoke description — spine drift, extends the 11.1 entry, deferred.
  - `[low]` `[reject]` (Intent) dev defaults verified only at the parse layer, never on a real bind — `main` binds `args.port` and opens `args.data_dir`, the same values the AC-1 leaf pins; a real `--dev` start on 8766 in smoke would collide with a running dev server.
  - `[low]` `[reject]` (Intent) Vite forwarding to 8766 is checked statically; the live proxy test uses an inline target — a fixed port can't be used in tests; the static map plus a live forward through the same config is the available proof.
  - `[low]` `[reject]` (Intent) the pill through a Vite tab is untested — the client reads `app-info` the same way whichever server served the bundle; listed for `bmad-testarch-automate` in the ATDD follow-ups.
  - `[false]` `[reject]` (Intent) agent instructions and skills still name 8765 — those are about the production server, which still runs on 8765; the ACs ask only for the README.
  - `[medium]` `[patch]` (Verification gap) case-variant refusal gap with no test — same root as the first row; fixed and tested.
  - `[false]` `[reject]` (Verification gap) `commit` is null for the installed (non-editable) tool — AR31 specifies `null` "when the package isn't in a checkout"; this is the designed behavior.
  - `[medium]` `[patch]` (Blind) case-insensitive and firmlinked paths pass the refusal — same root as the first row; fixed.
  - `[medium]` `[patch]` (Blind) the README's "in any form" overpromises — same root; true after the fix.
  - `[low]` `[reject]` (Blind) `_checkout_commit` can report another repo's commit — same as the Edge row; rejected for the same reason.
  - `[false]` `[reject]` (Blind) no `-dirty` marker on the commit — the epic puts a `-dirty` marker explicitly out of scope.
  - `[false]` `[reject]` (Blind) app-info refetches after every intent and on focus — the epic requires exactly that (`['view','app-info']`, invalidated after every intent and refetched on focus) so an old tab finds a newer server (Story 11.4).
  - `[low]` `[reject]` (Blind) the `copy.test.mjs` exemption isn't scoped to one file — AC-10 already pins where the amber may live; scoping adds a branch to the guard.
  - `[low]` `[patch]` (Blind) no test for the default `~/bookvie-data-dev` being a symlink to the real library — the code handled it; the story's motivating no-flags case deserved a leaf. Added `test_dev_refuses_its_default_folder_when_it_links_to_the_real_library`.
  - `[low]` `[reject]` (Blind) smoke never starts the installed tool with `--dev` — a second installed server start for checks the in-process and e2e leaves already make; the file's presence in the wheel is what smoke adds.
  - `[low]` `[reject]` (Blind) the Vite target is hard-coded to 8766 — the AC fixes it at 8766; an env override adds surface no one asked for.
  - `[low]` `[patch]` (Blind) `AppInfoView` has no class docstring, so the schema has no description — added one and regenerated `schema.d.ts`.
  - `[low]` `[reject]` (Blind) `dataDir` is `""` when `create_app` gets no data folder — only reachable from tests that build an app directly; the CLI always passes the folder.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").

`version` comes from the CLI because neither `http` nor `views` may import `bookvie` top level (`test_layers.py`). `create_app`'s default `version=""` exists only for tests that build an app directly. The pill relies on `inline-flex`: the `{' '}` text node merges into "bookvie " as one anonymous flex item whose trailing space collapses, so the wordmark's existing 8px `gap` is the visible spacing and `textContent` still reads "bookvie DEV".

```css
.devPill { padding: 4px 7px; border-radius: var(--radius-sm); background: #8c5e0e; color: #fff;
  font: var(--font-section-label-weight) var(--font-section-label-size)/1 var(--font-section-label-family);
  letter-spacing: var(--font-section-label-letter-spacing); text-transform: uppercase; }
:root[data-theme='dark'] .devPill { background: #ebc27a; color: #191b18; }
@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) .devPill { /* same */ } }
@media (forced-colors: active) { .devPill { background: Canvas; color: CanvasText; border: 1px solid CanvasText; } }
```

## Verification

**Commands:**
- `cd backend && uv run pytest tests/test_dev_mode.py tests/test_cli.py tests/test_app.py tests/test_layers.py tests/test_wheel_build.py` -- expected: all pass, none skipped.
- `cd frontend && TZ=Europe/Madrid npx playwright test e2e/dev-mode.spec.ts e2e/dev-mode-production.spec.ts e2e/dev-proxy.spec.ts` -- expected: 9 passed (8 story leaves and the existing proxy leaf).
- `npm run check` -- expected: exit 0, no existing e2e assertion edited.

## Auto Run Result

Status: in-review

**Summary.** `bookvie --dev` now keeps to its own folder and port (`~/bookvie-data-dev`, 8766; explicit flags win). It refuses any data folder that is the real `~/bookvie-data` (typed with `~`, through a symlink or `..`, as a case variant or firmlink, or not yet created) with the exact message and exit 2, before any lock, store or file. A new `GET /api/views/app-info` view reports `{version, mode, dataDir, commit}`. The client reads only `app-info.mode` to show a DEV pill after the wordmark and a `DEV · ` title prefix, and looks like production while `app-info` is pending or failed. A dev server serves an amber `favicon-dev.svg` at `/favicon.svg`, and Vite proxies `/api`, `/media` and `/favicon.svg` to 8766.

**Files changed:**
- `backend/bookvie/cli.py`: dev defaults filled after parsing, `--help` names both pairs, `_refuses_real_library` (through `instance.same_folder`) returning 2 before `ensure_writable`, `_checkout_commit` (dev only, failures give `None`), `version`/`commit` passed to `create_app`.
- `backend/bookvie/views/app_info.py` (new): `AppInfoView` and the `~` display rule; exported from `views/__init__.py`.
- `backend/bookvie/http/app.py`: `version`/`commit` keywords, `app.state.app_info`, the favicon route serves `favicon-dev.svg` with `--dev`.
- `backend/bookvie/http/api.py`: `GET /views/app-info`.
- `frontend/src/api/generated/schema.d.ts`: regenerated.
- `frontend/public/favicon-dev.svg` (new): the 11.1 drawing in dev amber, `#EBC27A` under the dark scheme.
- `frontend/vite.config.ts`: target 8766, `/favicon.svg` proxied.
- `frontend/src/api/views.ts`: `AppInfoView` type, `useAppInfo()`.
- `frontend/src/lib/page.ts` and `page.test.ts` (new): `pageTitle(name, mode)` and its unit test; `usePageTitle` reads `app-info`.
- `frontend/src/components/AppShell.tsx` and `.module.css`: the DEV pill, its amber literals, dark twins and forced-colors rule.
- `scripts/smoke.mjs`: checks the installed package carries the built `favicon-dev.svg`.
- `README.md`: Options and Development rewritten.
- Tests: 11 ATDD leaves un-skipped. `test_dev_mode.py` gains near-miss, no-`--dev`, `HOME`-through-a-symlink, case-variant, default-dev-folder-linked, `dataDir`, commit-read-once and favicon-by-mode tests. `test_wheel_build.py` checks the wheel ships `favicon-dev.svg`. `test_cli.py`'s `create_app` wrapper passes new keywords through. The existing `dev-proxy` leaf's inline map gains `/favicon.svg`.
- Two older tests the new behavior changes: `test_packaging.py` now expects the Vite target on `DEV_PORT` (8766) and `/favicon.svg` proxied; `frontend/scripts/copy.test.mjs` (the Story 1.6 "no red or warning colors" guard) exempts exactly the two dev amber values, whose hue falls in its red-orange band.
- `_bmad-output/implementation-artifacts/deferred-work.md`: five spine-drift entries.
- `_bmad-output/implementation-artifacts/sprint-status.yaml`: `11-2-…` → `review`.

**Review findings.** 29 findings: 0 high, 6 medium, 19 low, 4 false.
- Patched:
  - (one medium entry, six rows) The refusal compared resolved paths only, so on macOS's case-insensitive disk `--dev --data-dir ~/BOOKVIE-DATA` (and the firmlink spelling) opened the real library; probed, then fixed with `instance.same_folder` and a `case` form in the AC-2 leaf.
  - (low) A leaf for the no-flags case where `~/bookvie-data-dev` links to the real library.
  - (low) `AppInfoView` class docstring, so the schema carries a description.
- Deferred (7 low rows): spine drift (AD-6, AD-7, AD-16 Binding / Real library refused / Favicon, Seed `views/` and `public/`, Capability map FR-26, Testing row).
- Rejected low:
  - `_checkout_commit` could report an enclosing or `GIT_DIR` repo's commit (rare, informational, fix adds env scrubbing).
  - The amber hexes in `copy.test.mjs`, and the exemption not scoped to one file (a test guard; AC-10 pins placement).
  - Dev defaults, the 8766 Vite target and a pill through a real Vite tab are verified only in-process or statically (see residual risks).
  - Smoke doesn't start an installed `--dev` server.
  - The Vite target is hard-coded to 8766 (the AC fixes it).
  - `dataDir` is `""` when `create_app` gets no folder (tests only).
- Rejected false:
  - Agent skills still name 8765 (that's the production server).
  - `commit` is null for the installed tool (AR31's specified behavior).
  - No `-dirty` marker (out of scope by the epic).
  - app-info refetching after intents and on focus (the epic requires it).
- Every row is in the Review Triage Log.

**Follow-up review recommendation:** false. This pass patched 1 medium and 2 low entries, and no high.

**Verification (re-run after the patches):**
- `uv run pytest tests/test_dev_mode.py tests/test_cli.py tests/test_app.py tests/test_layers.py tests/test_wheel_build.py tests/test_packaging.py`: passed, none skipped (156 before the patches; the implementer's targeted re-run after them: 69 passed in `test_dev_mode.py` and `test_cli.py`).
- `npx playwright test e2e/dev-mode.spec.ts e2e/dev-mode-production.spec.ts e2e/dev-proxy.spec.ts`: 9 passed.
- `npm run check`: exit 0.
  - ruff clean.
  - pytest 1600 passed; coverage gates domain 100%, intents+store 98.08%.
  - Unit tests: 371 passed, 0 skipped.
  - e2e: 741 passed.
  - smoke: `installed favicon-dev.svg is the built file`, `smoke: ok`.
  - No `~/bookvie-data-dev` was created by the run.
- Matrix audit: every row in the I/O matrix has a passing test.

**Residual risks.**
- The 8766 default and `~/bookvie-data-dev` are proven at the parse and `main` level, not by a real process binding 8766.
- Vite forwarding to 8766 is proven by the config map plus a live forward to a fixture port.
- The pill and title through a real Vite tab are untested (an ATDD follow-up for `bmad-testarch-automate`).

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
