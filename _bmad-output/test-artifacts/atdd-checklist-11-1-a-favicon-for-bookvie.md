---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-17'
storyId: '11.1'
storyKey: '11-1-a-favicon-for-bookvie'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-111-a-favicon-for-bookvie'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-11-1-a-favicon-for-bookvie.md'
generatedTestFiles:
  - 'frontend/e2e/favicon.spec.ts'
  - 'frontend/e2e/favicon.ts'
  - 'backend/tests/test_app.py'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 11, Story 11.1; AR33, UX-DR65, UX-DR66)'
  - '_bmad-output/planning-artifacts/dev-prod-favicon-plan-2026-11-17.md (D5, D6, §4 story cut, §5 tests)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (colors.accent, colors.accent-dark, components.favicon, Components → Favicon)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-16 Favicon bullet, Structural Seed public/)'
  - '_bmad-output/planning-artifacts/prds/prd-bookvie-2026-10-28 (NFR9)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml'
  - '_bmad-output/implementation-artifacts/deferred-work.md (spine drift gate)'
  - '_bmad-output/test-artifacts/atdd-checklist-9-2-add-several-card-notes-in-a-row.md (format)'
  - '_bmad/tea/config.yaml'
  - 'backend/bookvie/http/app.py (create_app, spa catch-all, _is_server_path), backend/tests/test_app.py, test_packaging.py, test_wheel_build.py'
  - 'frontend/index.html, frontend/playwright.config.ts, frontend/e2e/fixtures.ts, global-setup.ts, app-shell.spec.ts (designTokens), library.ts (rgbOf), catalog-filter.spec.ts (APP_STORAGE_KEYS), src/lib/theme.ts'
  - 'scripts/smoke.mjs, package.json (check, check:e2e, check:smoke)'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given the built app, when I look at frontend/public/favicon.svg, then it is the F3 drawing on a 0 0 32 32 viewBox with exactly the DESIGN.md path, one flat fill and no outline or labels, and a comment names it as bookvie''s own drawing under the repo''s MIT license; and its fill is #557059 (accent), and #93B597 (accent-dark) under @media (prefers-color-scheme: dark) inside the SVG; and a test reads both fills and fails unless they equal DESIGN.md''s accent and accent-dark, in the spirit of app-shell.spec.ts' }
  - { id: AC-2, idSource: generated, text: 'Given frontend/index.html, when any page loads, then its head has exactly one icon link, <link rel="icon" href="/favicon.svg" type="image/svg+xml">, and no PNG or .ico fallback (Chrome only, AGENTS.md)' }
  - { id: AC-3, idSource: generated, text: 'Given a running production server, when the browser requests /favicon.svg, then a dedicated route, registered before the SPA catch-all, answers 200 with the built favicon.svg, Content-Type: image/svg+xml and Cache-Control: no-cache; and a request for /favicon.ico or any other unknown top-level file behaves as before this story' }
  - { id: AC-4, idSource: generated, text: 'Given npm run build, then the wheel installed in isolation, when the smoke test runs (scripts/smoke.mjs), then favicon.svg is in backend/bookvie/http/static/ and in the wheel, and the installed bookvie serves /favicon.svg as image/svg+xml' }
  - { id: AC-5, idSource: generated, text: 'Given Chrome''s Mode set opposite to the OS, when Oleg looks at the tab once by hand, then the fill matches the tab strip''s scheme, as DESIGN.md → Favicon describes; the result is noted in the story' }
  - { id: AC-6, idSource: generated, text: 'Given the existing e2e suite, when it runs, then every spec passes unchanged; nothing in the page looks different' }
---

# ATDD Checklist: Story 11.1 A favicon for bookvie

## Preflight

- **Stack:** `fullstack`, auto-detected. Playwright (`frontend/playwright.config.ts`) and pytest (`backend/tests/conftest.py`) are both in place.
- **Story:** `epics.md` Story 11.1 has 6 Given/When/Then criteria with no ids, so they are numbered AC-1 to AC-6 in source order (registry above). Each "And" line belongs to the criterion above it. `sprint-status.yaml` reads `backlog`.
- **Epic gate:** 11.1 is Epic 11's first story. `deferred-work.md` has no "spine drift" entry without a `resolved:` line (the only grep hit, line 827, cites the resolved AD-6 entry above it), so the spine gate is clear. The spine already describes the route (AD-16 Favicon bullet) and `frontend/public/` (Structural Seed).
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns fragments). No Pact. `tea_browser_automation: auto` loads `playwright-cli.md`.
- **What exists today:**
  - No `frontend/public/` and no icon link in `frontend/index.html`.
  - The SPA catch-all (`backend/bookvie/http/app.py`, `spa`) already serves any top-level file in `static/` through a plain `FileResponse`: `image/svg+xml` and no `Cache-Control`. A missing top-level file (`/favicon.ico`) gets `index.html` with 200. So 200 and the content type already pass in `test_app.py`'s fixture; **`Cache-Control: no-cache` and the dedicated route are what's new.**
  - The e2e global setup builds the SPA into `backend/bookvie/http/static/` once per run, and the worker's server is a production server (`serverDev: false`), started from the source tree with `uv run`.
  - `scripts/smoke.mjs` installs the wheel with `uv tool install` into an isolated HOME and checks `/` and `/catalog/x` only.
- **Environment note:** this worktree had no `frontend/node_modules`. A first `npx prettier` ran before the install (its output was unchanged), and then `npm --prefix frontend ci` installed the pinned Prettier 3.6.2. Every format, `tsc -b` and oxlint run recorded below used the pinned tools.

## Generation Mode

**AI generation**, run sequentially in this session. Recording isn't needed: the favicon has no UI, and the routes and the shell's roles already ship.

## Test Strategy

| AC | Level | Priority | Leaf (first assertion in bold) | Why this level |
|---|---|---|---|---|
| AC-1 | E2E (Chromium, no server) | P1 | `frontend/public/favicon.svg` served at a made-up origin through `page.route`, light scheme. **Its one path's computed `fill` is `rgbOf(DESIGN.md accent)`.** Then under the dark scheme it is `rgbOf(accent-dark)`. Both DESIGN.md values are still `#557059` / `#93B597`. In both schemes: `viewBox` `0 0 32 32`; the only `<path>` has a `d` exactly equal to DESIGN.md's Favicon path; no element besides `path`, `style`, `title`, `desc` (no rect, text, gradient, image…); computed `stroke` `none`, `fill-opacity` `1`, `opacity` `1`. Exactly one comment in the source names bookvie and MIT. | The fills only exist as Chromium computes them: a media query inside the SVG. Reading DESIGN.md's frontmatter is app-shell.spec.ts's approach. |
| AC-2 | E2E | P1 | Home on the worker's production server. **`head link[rel*="icon" i]` has count 1.** Then on `/`, `/catalog`, `/backup` and `/no-such-page`, after the banner's navigation is visible: one icon link, `rel` exactly `icon`, `href` `/favicon.svg`, `type` `image/svg+xml`, and no link to a `.png` or `.ico` and no `apple-touch` link. | "Any page loads": the served `index.html` as Chromium parses it, on every kind of route. |
| AC-3 | API (pytest, `TestClient`) | P0 | `backend/tests/test_app.py` `test_favicon_route_serves_the_built_icon_uncached_before_the_spa_catch_all`. GET `/favicon.svg`. **`Cache-Control` is `no-cache`.** Then 200, `Content-Type` exactly `image/svg+xml`, the body is the fixture's built `favicon.svg`, and `app.routes` has a `/favicon.svg` route before `/{path:path}`. Then "as before": `/favicon.ico` answers 200 with `index.html`, and a built `robots.txt` is served as is, both with no `Cache-Control`. | A server rule; the route table and the headers are cheapest and most direct here. P0 because `no-cache` is what keeps a tab from showing the wrong mode's icon in 11.2. |
| AC-4 | E2E (build + request) | P1 | **`backend/bookvie/http/static/favicon.svg` exists** after the global setup's build. Then it is byte-identical to `frontend/public/favicon.svg`; the production server's `/favicon.svg` answers 200, `image/svg+xml`, those bytes; and `scripts/smoke.mjs` mentions `/favicon.svg` and `image/svg+xml`. | The build is guaranteed only in the e2e run. The installed wheel is reachable only from the smoke script, which the build must extend (see below); the last two assertions pin that it does. |
| AC-5 | E2E | P2 | bookvie's stored Theme `light`, browser scheme dark, the production server's `/favicon.svg` opened as a document. **Its fill is `rgbOf(accent-dark)`.** Then switched to light: `accent`. Then Theme `dark` stored and reloaded under light: still `accent`. | The tab strip itself can't be automated. This proves the mechanism DESIGN.md relies on: the icon follows Chromium's own scheme, not bookvie's Theme. **The by-hand check stays Oleg's, and the build records its result in the story.** |
| AC-6 | E2E | P1 | Home on the production server, every same-origin response watched. **Fetching the head's one icon link gives `{ status: 200, type: 'image/svg+xml', cacheControl: 'no-cache' }`.** Then the banner's navigation and `main` are visible, nothing in `body` has a `src` or `href` containing "favicon", and no same-origin response was 400 or more. | The red leaf for "nothing looks different": the icon works end to end and changes nothing in the page. **The rest of AC-6 is the full suite itself:** `npm run check` must pass with no existing spec edited. |

**Primary branch per criterion.** AC-1's newly promised scalar is the light fill, then the dark one. AC-3's is the `no-cache` header, the only part of the response the catch-all doesn't already give. AC-4's is the built file's existence. AC-5's is the dark fill under a light Theme (the "opposite" case). AC-6's is the linked icon resolving.

**What the leaves pin (the contract for the build):**
- `frontend/public/favicon.svg`: an SVG document whose root has `viewBox="0 0 32 32"`, exactly one `<path>` with DESIGN.md's `d` string as written (subpaths separated by single spaces), its fill set so Chromium computes `#557059`, and `#93B597` under `@media (prefers-color-scheme: dark)` inside the file. No stroke, no opacity, no other drawing elements. One `<!-- … -->` comment naming bookvie and MIT.
- `frontend/index.html`: one `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`, nothing else with "icon" in its `rel`.
- `backend/bookvie/http/app.py`: a dedicated `GET /favicon.svg` route (path exactly `/favicon.svg`), added before the `/{path:path}` catch-all, serving `static_dir / "favicon.svg"` with `media_type` `image/svg+xml` and `Cache-Control: no-cache`. The catch-all is unchanged.
- `scripts/smoke.mjs`: after the SPA checks, GET `/favicon.svg` from the installed `bookvie` and fail unless it answers 200 with `Content-Type: image/svg+xml` (comparing the body with the built file is welcome).

**Open for the build (not pinned):**
- **How the fill is written:** a `<style>` block, or a `fill` attribute plus a `<style>` dark override. The leaves read computed style only.
- **A `<title>` or `<desc>`** in the SVG is allowed, not required.
- **HEAD `/favicon.svg`** (the catch-all accepts GET and HEAD) and **the route when the build has no `favicon.svg`** (a 404, or falling through to the old behavior). Neither is in the ACs; see the follow-ups.
- **Whether the route reads the file per request or once.** It must serve the built file, so a rebuild without a restart must not serve a stale icon if it caches.

## Existing leaves this story changes (for the build)

None. AC-6 requires every existing spec to pass unchanged. Things to watch:
- `backend/tests/test_app.py` `test_top_level_build_file_is_served` GETs `/favicon.svg` and checks status 200 and the body `<svg/>`. The dedicated route must keep both, so it stays green; it is the "before" half of AC-3.
- `test_traversal_does_not_escape_static_dir` and `test_api_and_media_never_fall_back` don't touch `/favicon.svg`.
- `app-shell.spec.ts` compares `tokens.css` with DESIGN.md's `colors`. Story 11.1 adds no token (UX-DR66: dev amber is a literal in `components.favicon`), so that comparison doesn't change.
- `dev-proxy.spec.ts`: in 11.1 Vite serves `public/favicon.svg` itself. Proxying `/favicon.svg` to the backend is Story 11.2's.

## Green-phase follow-ups (secondary branches, not red leaves)

- [ ] **API, AC-3 HEAD:** HEAD `/favicon.svg` answers 200 with the same headers and no body, as the catch-all did for top-level files.
- [ ] **API, AC-3 no built icon:** with `static/` built but no `favicon.svg`, `/favicon.svg` answers as the build decides (a 404 is the obvious choice), and never a stack trace or `index.html` with `image/svg+xml`.
- [ ] **API, AC-3 guard:** `/favicon.svg` through `HostOriginGuard` with a foreign `Host` answers 403, as any other path (`test_guard.py`).
- [ ] **E2E, AC-1 the 16×16 silhouette:** drawn into a 16×16 canvas through an `<img>`, the three spines and the plank stay apart (sample the gaps at x ≈ 5.75 and 10.5 device px for transparency). Probe the pixel helper first.
- [ ] **E2E, AC-2 the served `index.html` text** (`request.get('/')`) holds one `rel="icon"`, so a client-side head change can't hide a second link in the raw HTML.
- [ ] **Smoke, AC-4 body equality:** the smoke compares the installed server's `/favicon.svg` bytes with `backend/bookvie/http/static/favicon.svg`.
- [ ] **Pytest, AC-4 wheel:** `test_wheel_build.py` with a `favicon.svg` in the copied `static/` finds `bookvie/http/static/favicon.svg` in the wheel (already implied by `static/**`, but cheap).
- [ ] **E2E, AC-5 forced colors:** under `forcedColors: 'active'` the document still computes the accent fill (Chromium doesn't force SVG documents' author fills), recorded so a future change is noticed.

## Helper probes

Run in `frontend/e2e/favicon.probe.spec.ts` (Chromium, the default Desktop Chrome 1280×720 viewport, `deviceScaleFactor` 1, no forced colors, once with `colorScheme: 'light'` and once with `'dark'`, the two schemes the leaves use) with `TZ=Europe/Madrid npx playwright test e2e/favicon.probe.spec.ts`. All 5 passed (after one fix to the probe's own expectation, see below), and the file was then removed with `rm`.

- **`designColor`** (`favicon.ts`): read `#557059` for `accent`, `#93B597` for `accent-dark`, and `#E3EBE2` for `accent-soft` (it doesn't stop at the `accent` prefix). It refused `#93B597` for `accent`, and threw on an unknown name.
- **`designFaviconPath`**: returned exactly `M3 11a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14H3z M12.5 5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v20h-8z M22 13a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v12h-7z M1 26h30v4H1z`, the path in `epics.md` UX-DR65, typed independently into the probe.
- **`svgFill`**, on a routed SVG with `path{fill:#557059}` and `@media (prefers-color-scheme: dark){path{fill:#93B597}}`: `rgb(85, 112, 89)` under light and `rgb(147, 181, 151)` under dark (expected). After a live `emulateMedia` switch with no reload it followed the scheme both ways, as the leaves rely on. It refused an SVG one step off (`#557058` / `#93B596`), and read `null` for an SVG with two paths, an HTML page with an inline SVG, today's 404 from `serveSourceFavicon` (no `public/favicon.svg` yet), and today's served `/favicon.svg` (the SPA).
- **`svgShape`**, on the same SVG: `{ viewBox: '0 0 32 32', elements: ['style', 'path'], paths: ['M1 26h30v4H1z'], stroke: 'none', strokeWidth: '1px', fillOpacity: '1', opacity: '1' }` (expected). On the off-by-one SVG with `stroke="#000" opacity="0.5"` it read `rgb(0, 0, 0)` and `0.5`, so it doesn't always report "none" and "1".
- **`svgComments`**: `[' a ', '\nbookvie, MIT\n']` from a source with two comments, and `[]` from one with none.
- **`linkedIcon`**: on a routed page linking a routed SVG sent with `cache-control: no-cache`, `{ status: 200, type: 'image/svg+xml', cacheControl: 'no-cache' }`. A link to a 404 gave `{ status: 404, type: null, cacheControl: null }`; the probe first expected `type: anything` there, which was the probe's mistake (a fulfilled 404 with no content type has none), not the helper's, so only the probe's expectation changed. It read `null` for a page with no icon link, for a page with two (`icon` and `shortcut icon`), and for today's Home.
- **`serveSourceFavicon`**: answered 404 while `public/favicon.svg` doesn't exist (above). The 200 branch reads the file with `readFileSync` and is exercised by AC-1 in the green phase.
- **Reused unchanged, so not probed:** `rgbOf` (`library.ts`), the `test`/`expect` fixtures. Built-in web-first reads (`toHaveCount`, `toHaveAttribute`, `toBeVisible`) aren't helpers. No border or outline width is read anywhere (Epic 10 retro item 71, E10-R1 doesn't apply).
- **Render-before-read**, checked over all 6 leaves; none needed a fix:
  - AC-1 and AC-5 read the SVG document only through `expect.poll(() => svgFill(page))`, and `svgShape` runs only after that poll has passed in the same scheme. AC-1 reads the source file's comments only after the poll proved the file is served.
  - AC-2's reads are all web-first (`toHaveCount`, `toHaveAttribute`), each route after the banner's navigation is visible. The absence read (no PNG/ICO link) runs after that too.
  - AC-6 reads `linkedIcon` through `expect.poll`. Its absence read (`body [src*=favicon]` count 0) and the `failed` list run after the banner's navigation and `main` are visible.
  - AC-4 reads files and a `request` response, never the page.

## TDD Red Phase

6 skipped leaves. The 5 e2e leaves are in `frontend/e2e/favicon.spec.ts`, inside the `Story 11.1 A favicon for bookvie (ATDD)` describe, each a `test.skip(` carrying exactly one `[P*] AC-n`. The pytest leaf carries `@pytest.mark.skip(reason=RED)` and names AC-3 in its first comment line.

| AC | Leaf | Priority |
|---|---|---|
| AC-1 | `favicon.spec.ts:30` favicon.svg is the F3 drawing on a 0 0 32 32 viewBox with one flat fill, accent in light and accent-dark under the dark scheme, and an MIT comment | P1 |
| AC-2 | `favicon.spec.ts:64` every page head has exactly one icon link, rel icon to /favicon.svg as image/svg+xml, and no PNG or .ico fallback | P1 |
| AC-3 | `backend/tests/test_app.py:65` `test_favicon_route_serves_the_built_icon_uncached_before_the_spa_catch_all` | P0 |
| AC-4 | `favicon.spec.ts:85` the build copies favicon.svg into the served folder unchanged, the server sends it as image/svg+xml, and the smoke test checks the installed wheel serves it | P1 |
| AC-5 | `favicon.spec.ts:105` the served favicon follows Chromium's own color scheme, not bookvie's Theme, so its fill matches the tab strip | P2 |
| AC-6 | `favicon.spec.ts:123` the icon link resolves to the icon, uncached, and adds nothing to the page itself | P1 |

**Red today.** This run came after all the probes passed, on the files as they are now (after Prettier and ruff). The e2e leaves were un-skipped in a throwaway copy, `favicon.red.spec.ts`, and run with a 30 s timeout. The pytest leaf ran from a throwaway copy, `tests/test_app_red.py`, with its skip line deleted. Both copies were then removed with `rm`.
- **AC-1** fails at its first assertion (`:39`): the fill reads `null`, since there is no `public/favicon.svg` (the route answers 404).
- **AC-2** fails at its first assertion (`:70`): 0 icon links, expected 1.
- **AC-3** fails at its first assertion (`test_app.py:73` in the copy): `cache-control` is `None`. The headers show the catch-all already sends `content-type: image/svg+xml`, confirming that `no-cache` is the new part.
- **AC-4** fails at its first assertion (`:88`): `backend/bookvie/http/static/favicon.svg` doesn't exist.
- **AC-5** fails at its first assertion (`:113`): the fill reads `null`, since `/favicon.svg` is today the SPA's `index.html`.
- **AC-6** fails at its first assertion (`:135`): `linkedIcon` reads `null` (no icon link).

With the skips in place: `pytest tests/test_app.py` → 19 passed, 1 skipped. `tsc -b` and oxlint are clean on the new files. ruff format and check are clean on `test_app.py`. `git status` lists no `*.probe.*` file and no throwaway copy.

**Storage keys:** no new localStorage key. AC-5 writes the existing `bookvie.theme`, which is already in `APP_STORAGE_KEYS`.

## Implementation checklist (for `bmad-build-auto`)

- [ ] Add `frontend/public/favicon.svg` per the contract above (AC-1, AC-5).
- [ ] Add the icon link to `frontend/index.html` (AC-2).
- [ ] Add the dedicated `GET /favicon.svg` route before the catch-all in `backend/bookvie/http/app.py`, with `Cache-Control: no-cache` (AC-3).
- [ ] Extend `scripts/smoke.mjs` to check `/favicon.svg` from the installed wheel (AC-4).
- [ ] Un-skip the 6 leaves and see them pass. Run `npm run check` with no existing spec edited (AC-6).
- [ ] Look at the tab once by hand with Chrome's Mode set opposite to the OS, and record the result in the story (AC-5).
- [ ] No README change (AGENTS.md: stories don't update the README).

## Next

`bmad-build-auto` for Story 11.1, then `bmad-code-review` in a new session, then `bmad-testarch-automate` for the follow-ups above.
