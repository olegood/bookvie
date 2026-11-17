---
title: 'Story 11.1: A favicon for bookvie'
type: 'feature'
created: '2026-11-17'
status: 'done'
baseline_revision: '484b9050610f16ccfe05523d0e918b4fa3b128a2'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-11-1-a-favicon-for-bookvie.md'
warnings: [oversized]
deferred:
  - summary: >-
      Spine drift (AD-16), reconciled before the next epic: the Favicon bullet still reads "(Epic 11, planned)" and the Structural Seed lists `public/` "favicon.svg, favicon-dev.svg (planned)", though Story 11.1 built the production route and file.
    evidence: |-
      backend/bookvie/http/app.py favicon route and frontend/public/favicon.svg exist; the dev half (favicon-dev.svg, --dev switch, Vite proxy) is Story 11.2's (spine check).
    location: >-
      ARCHITECTURE-SPINE.md:230, :387
    severity: low
  - summary: >-
      Spine drift (Consistency Conventions Testing row, Structural Seed "Build and install"), reconciled before the next epic: the spine describes the smoke test as build, install, start, load `/`; it now also checks `/favicon.svg` from the installed wheel.
    evidence: |-
      scripts/smoke.mjs fetches /favicon.svg and compares it with the built file (spine check). An extension, not a contradiction.
    location: >-
      scripts/smoke.mjs
    severity: low
---

<intent-contract>

## Intent

**Problem:** bookvie's tab has no icon of its own, so Oleg can't spot it among other tabs. Epic 11 also needs `/favicon.svg` served uncached by the backend, so Story 11.2 can swap in a dev icon at the same URL without a tab keeping the wrong one.

**Approach:** Check in DESIGN.md's F3 drawing (three sage spines on a plank) as `frontend/public/favicon.svg` with a light and a dark fill, link it once from `index.html`, serve it through a dedicated `GET /favicon.svg` route with `Cache-Control: no-cache`, and make the smoke test prove the installed wheel serves it.

## Boundaries & Constraints

**Always:** The path `d` is DESIGN.md's string exactly as written; fills are `#557059` and, under `@media (prefers-color-scheme: dark)` inside the SVG, `#93B597`; one flat fill, no stroke, no opacity, only `path`/`style` (and optionally `title`/`desc`) elements; exactly one comment naming bookvie and MIT. The route answers `image/svg+xml` exactly (no charset) with `Cache-Control: no-cache`, accepts GET and HEAD like the catch-all, and is registered before `/{path:path}`. Every existing spec passes unedited.

**Never:** No PNG/`.ico`/apple-touch fallback (Chrome only). No dev icon, no Vite proxy for `/favicon.svg`, no `favicon-dev.svg` (Story 11.2). No new design token in `tokens.css`. No change to the catch-all's behaviour for any other path. No README edit. No spine edit.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Icon served | GET `/favicon.svg`, built `static/favicon.svg` | 200, body = built file, `image/svg+xml`, `no-cache` | — |
| HEAD | HEAD `/favicon.svg` | 200, same headers, no body | — |
| Not built | no `static/favicon.svg` | 404, never `index.html` dressed as SVG | plain 404 |
| Other top-level file | GET `/favicon.ico`, `/robots.txt` | as before: `index.html` 200 / file as is, no `Cache-Control` | — |
| Foreign Host | GET `/favicon.svg` with a foreign `Host` | 403 from `HostOriginGuard` | — |

</intent-contract>

## Code Map

- `backend/bookvie/http/app.py` -- `create_app`: add the route just before `spa` (`@app.api_route("/{path:path}", …)`, near the end); reuse `FileResponse`, `HTTPException`; `static_dir` is already resolved. Catch-all comment "Top-level files from the build (e.g. favicon)" stays valid for other files.
- `frontend/index.html` -- add the one `<link rel="icon" …>` in `<head>`.
- `frontend/public/` -- does not exist yet; Vite's default `publicDir` (`frontend/public`) is copied into `build.outDir` (`backend/bookvie/http/static`, see `frontend/vite.config.ts`), which the wheel already ships (`static/**`). No Vite config change.
- `scripts/smoke.mjs` -- `get()` returns status and body only; after the `for (const route of ['/', '/catalog/x'])` loop, fetch `/favicon.svg` and check status and `content-type`.
- `backend/tests/test_app.py:65` -- red AC-3 leaf (`@pytest.mark.skip(reason=RED)`), plus the now-unused `RED` constant; `test_top_level_build_file_is_served` must stay green.
- `frontend/e2e/favicon.spec.ts` -- five `test.skip(` leaves (AC-1, 2, 4, 5, 6); helpers in `frontend/e2e/favicon.ts` (probed, read-only).
- `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md:747` -- Components → Favicon (path, fills, by-hand check); read-only.
- Deferred-work intake: none name story 11.1 (and none name Epic 11 as a whole).

## Tasks & Acceptance

**Execution:**
- `frontend/public/favicon.svg` -- create per Design Notes -- AC-1, AC-5.
- `frontend/index.html` -- add `<link rel="icon" href="/favicon.svg" type="image/svg+xml" />` after the viewport meta -- AC-2.
- `backend/bookvie/http/app.py` -- add `GET`/`HEAD` `/favicon.svg` (`include_in_schema=False`) before the catch-all: 404 if `static_dir / "favicon.svg"` is not a file, else `FileResponse(..., media_type="image/svg+xml", headers={"Cache-Control": "no-cache"})`; read per request (no caching); name the constant -- AC-3.
- `scripts/smoke.mjs` -- after the SPA routes, GET `/favicon.svg` from the installed server, fail unless 200 and `content-type` is `image/svg+xml`, and compare the body with `backend/bookvie/http/static/favicon.svg` -- AC-4.
- `backend/tests/test_app.py` -- un-skip the AC-3 leaf, drop `RED`; add HEAD, not-built-404 and foreign-Host-403 tests for the matrix rows -- AC-3.
- `frontend/e2e/favicon.spec.ts` -- `test.skip(` → `test(` for the five leaves; update the header comment -- AC-1/2/4/5/6.
- `_bmad-output/implementation-artifacts/spec-11-1-a-favicon-for-bookvie.md` -- record AC-5's by-hand check as Oleg's (see Verification) -- AC-5.

**Acceptance Criteria:**
- Given the built app, when `frontend/public/favicon.svg` is read, then it is the F3 path on `0 0 32 32`, fills `#557059` / `#93B597` (dark scheme) equal to DESIGN.md `accent` / `accent-dark`, with one MIT comment (AC-1 leaf green).
- Given any page, when it loads, then its head has exactly one icon link to `/favicon.svg` as `image/svg+xml` and no PNG/ICO fallback (AC-2 leaf green).
- Given a production server, when `/favicon.svg` is requested, then a route before the catch-all answers 200, `image/svg+xml`, `no-cache`; `/favicon.ico` and other top-level files behave as before (AC-3 pytest green).
- Given `npm run build` and the isolated wheel install, when `npm run check:smoke` runs, then `favicon.svg` is in `static/` and the installed `bookvie` serves it as `image/svg+xml` (AC-4 leaf and smoke green).
- Given Chromium's scheme opposite to bookvie's Theme, when `/favicon.svg` is opened, then the fill follows Chromium's scheme (AC-5 leaf green); the by-hand tab check is recorded in this spec.
- Given the existing suite, when `npm run check` runs, then every spec passes with none edited (AC-6).

### Review Findings

Code review (`bmad-code-review`, new session, 2026-11-17) of `484b905..ff5466d`; layers: Blind Hunter, Edge Case Hunter, Verification Gap (no gaps), Acceptance Auditor (no AC violations), Spine Check (no AD broken, drift only).

- [x] [Review][Decision] AC-5's by-hand tab check is still "pending" — AC-5 says Oleg looks at the tab once with Chrome's Mode set opposite to the OS and the result is noted in the story; the spec's own Task "record AC-5's by-hand check" is open. The e2e leaf proves only the mechanism. Either Oleg does the check now and the result is recorded, or the story closes with it explicitly pending (Blind Hunter) [_bmad-output/implementation-artifacts/spec-11-1-a-favicon-for-bookvie.md, Verification] — resolved: Oleg did the check in this review (Chrome Dark, macOS Light, light sage icon matching the tab strip); recorded under Verification
- [x] [Review][Patch] The catch-all's comment "Top-level files from the build (e.g. favicon) are served as is" names the one top-level file that no longer reaches it: `/favicon.svg` has its own route, and `/favicon.ico` isn't built, so it gets `index.html` (Blind Hunter + Edge Case Hunter + Acceptance Auditor) [backend/bookvie/http/app.py:214]
- [x] [Review][Defer] Spine drift (AD-16, Capability → Architecture Map): the map's preamble still reads "Every row below is built, except FR-26 and FR-27 (Epic 11, planned)" and the FR-26 row lists `GET /favicon.svg` in `http/` and `frontend/public/` favicons, which Story 11.1 built; neither drift entry from the build names the map (Spine Check) [ARCHITECTURE-SPINE.md:399, :415] — deferred: spine drift, reconciled before the next epic
- [x] [Review][Defer] Spine drift (AD-16 Favicon bullet, Seed `public/`; Testing row and Seed "Build and install" smoke description) (Spine Check) [ARCHITECTURE-SPINE.md:230, :297, :346, :387] — deferred: already recorded by the build's review in `deferred-work.md`; no new entry

- AC-5 by hand (this session): Oleg ran this story's build from the worktree on a spare port with a throwaway data folder (the installed `bookvie` on :8765 predates the story and has no icon); Chrome Dark, macOS Light, the icon is light sage and matches the tab strip.
- Full check after the patch (2026-11-17, this review session): `npm run check` exit 0 — pytest 1578 passed, unit 369 passed, e2e 729 passed, smoke ok.

**Rejected:**
- `low` The Design Notes still say `no-cache` "keeps revalidation cheap: `FileResponse` already sends `ETag` and `Last-Modified`", the claim the build's review retracted in `app.py` (Starlette's `FileResponse` never answers 304, re-checked in this review) (Blind Hunter + Edge Case Hunter + Verification Gap) — the fix edits the spec under review; the patched code comment is accurate.
- `low` The Auto Run Result counts "3 low" patched rows; the Triage Log has four `[patch]` rows (Blind Hunter) — the fix edits the spec under review; both fixes are listed.
- `low` The Auto Run Result's "Files changed" omits `epic-11-context.md`, `sprint-status.yaml` and the spec (Blind Hunter) — the fix edits the spec under review.
- `low` The I/O matrix says "plain 404"; the route answers FastAPI's JSON 404 (Blind Hunter + Acceptance Auditor) — the row's point (never `index.html`, never `image/svg+xml`) holds and is tested; the fix edits the spec under review.
- `low` `test_top_level_build_file_is_served` requests `/favicon.svg`, which the new route now answers, so it no longer exercises the catch-all (Blind Hunter) — the catch-all's top-level-file rule stays covered by the AC-3 test's `robots.txt` tail; the build's review rejected the same.
- `false` The smoke error message blames the content type when the status is wrong (Blind Hunter) — it prints the status first ("answered 404 as application/json, …"), so the failure is visible.
- `low` The route skips the catch-all's `resolve()`/`is_relative_to` containment, so a symlinked `static/favicon.svg` would be followed (Blind Hunter + Edge Case Hunter) — `static/` is Vite build output only; the fix adds a guard; Story 11.2's file switch is not built yet.
- `low` The AC-4 leaf checks `smoke.mjs` by grepping its source (Blind Hunter) — the real evidence is `check:smoke` running the block inside `npm run check` (Verification Gap confirmed).
- `false` Smoke doesn't assert `Cache-Control: no-cache` on the installed wheel (Blind Hunter) — the wheel ships the same `app.py`; the header is pinned by the AC-3 pytest and end to end on the production server by the AC-6 leaf.
- `low` `/favicon.svg/` and `/FAVICON.SVG` reach the catch-all and get the icon without `no-cache` (Edge Case Hunter) — no client requests them; `index.html` links exactly `/favicon.svg`; the fix adds a branch.
- `low` The file vanishing between `is_file()` and `FileResponse`'s stat gives 500 (Edge Case Hunter) — only a rebuild racing a request at that instant; the catch-all has the same race; the fix adds a try.
- `low` Smoke compares UTF-8-decoded text, not raw bytes (Edge Case Hunter + Acceptance Auditor) — the file is ASCII, so the decode is lossless; the AC-4 leaf compares bytes.
- `false` `epic-11-context.md` is outside the story's Tasks (Acceptance Auditor) — it is the per-epic context file every epic's first story build adds (as in 10.1, 9.1, 8.1).

## Spec Change Log

## Review Triage Log

### 2026-11-17 — Review pass
- verdicts: 20 findings — high 0, medium 0, low 13, false 7, maybe-false 0
- findings:
  - `[low]` `[patch]` (Blind) `app.py` comment says `no-cache` revalidation is cheap via ETag/Last-Modified, but `FileResponse` never answers 304 — probed by two layers; comment reworded to claim only that the browser asks again each time and the file is tiny (grouped with Edge #4 and Verification-gap other #1).
  - `[low]` `[reject]` (Blind) `test_top_level_build_file_is_served` now hits the dedicated route, not the catch-all — true, but the catch-all's top-level-file rule stays covered by the AC-3 test's `robots.txt` tail, and the old test still guards `/favicon.svg` 200 + body; no named harm worth editing an existing test.
  - `[low]` `[reject]` (Blind) favicon route lacks the catch-all's `is_relative_to` containment, so a symlinked `static/favicon.svg` could serve an outside file — `static/` is written only by the Vite build (copies, no symlinks) inside the installed package; reaching it needs write access to the package, and the fix adds a guard (grouped with Edge #3).
  - `[false]` `[reject]` (Blind) not-built 404 is JSON, not "plain" — the matrix row's point is "never index.html dressed as SVG", which holds; the JSON body is the same `HTTPException` 404 every other server 404 in `app.py` uses.
  - `[false]` `[reject]` (Blind) smoke doesn't assert `Cache-Control` — the wheel ships the same `app.py`; the header is pinned by the AC-3 pytest and checked end to end on the production server by the AC-6 e2e leaf.
  - `[false]` `[reject]` (Blind) smoke gives a raw ENOENT if the built icon is missing, and doesn't compare with the source — smoke runs `npm run build` first; a missing file fails the run loudly with its path (correct behaviour); source == built is the AC-4 e2e leaf's job (grouped with Edge #5).
  - `[low]` `[reject]` (Blind) AC-5's by-hand result still pending — it is Oleg's check by the story's own wording; the only fix is editing this spec.
  - `[low]` `[reject]` (Blind) describe title still says "(ATDD)" — that is the repo convention (35 e2e specs keep it after going green); renaming changes test ids.
  - `[low]` `[patch]` (Blind) `FAVICON_PATH` and `FAVICON_FILE` spell the name twice — `FAVICON_PATH = "/" + FAVICON_FILE` now.
  - `[low]` `[reject]` (Edge) `/favicon.svg/`, `/favicon.svg%2F`, `/FAVICON.SVG` reach the catch-all and get the icon without `no-cache` — true (probed), but no client requests those paths (`index.html` links exactly `/favicon.svg`), and AC-3 asks other paths to behave as before, which they do; the fix adds a branch.
  - `[low]` `[reject]` (Edge) file removed between `is_file()` and `FileResponse`'s stat gives 500 — only during a rebuild racing a tab's request at that instant; the catch-all has the same race already; fix adds a try.
  - `[low]` `[reject]` (Edge) symlink outside `static/` — same as Blind #3.
  - `[low]` `[patch]` (Edge) no 304 on a matching ETag — same root as Blind #1; comment fixed, no conditional handling added (not asked; file is tiny).
  - `[false]` `[reject]` (Edge) smoke missing-file ENOENT / BOM mismatch — the checked-in file has no BOM, and a missing file fails loudly with its path, as above.
  - `[low]` `[patch]` (Verification gap, other) `no-cache` comment inaccurate — same root as Blind #1.
  - `[false]` `[reject]` (Intent) AC-5 is verified only by the mechanism, not the tab strip — the spec records it as Oleg's by-hand check; not a code defect.
  - `[false]` `[reject]` (Intent) no evidence that smoke ran — `npm run check` runs `check:smoke`; re-run in this pass (see Auto Run Result).
  - `[false]` `[reject]` (Intent) AC-6 suite pass not shown in the diff — the full `npm run check` e2e run is in this pass's verification.
  - `[low]` `[defer]` (Spine) AD-16 Favicon bullet and Seed `public/` still say "planned" — spine drift (AD-16); spine edits wait for the epic reconciliation.
  - `[low]` `[defer]` (Spine) Testing row / Seed "Build and install" describe smoke as loading `/` only — spine drift; deferred with the AD-16 entry.

## Design Notes

Golden file (write the fill in `<style>` so the dark override needs no `!important`):

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <!-- bookvie's own drawing (a shelf of three spines), MIT License like the rest of the repository. -->
  <style>
    path { fill: #557059; }
    @media (prefers-color-scheme: dark) { path { fill: #93B597; } }
  </style>
  <path d="M3 11a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14H3z M12.5 5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v20h-8z M22 13a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v12h-7z M1 26h30v4H1z"/>
</svg>
```

`no-cache` (not `no-store`) keeps revalidation cheap: `FileResponse` already sends `ETag` and `Last-Modified`. A missing built icon answers 404 rather than falling through to `index.html`, which would be served under a URL the head declares as `image/svg+xml`.

## Verification

**Commands:**
- `cd backend && uv run pytest tests/test_app.py tests/test_guard.py` -- expected: all pass, none skipped.
- `cd frontend && TZ=Europe/Madrid npx playwright test e2e/favicon.spec.ts` -- expected: 5 passed.
- `npm run check` -- expected: green, no existing spec edited.
- `npm run check:smoke` -- expected: `smoke: ok`, with a `/favicon.svg` line.

**Manual checks (if no CLI):**
- AC-5: with Chrome's Mode set opposite to the OS, the tab's icon fill matches the tab strip's scheme. Oleg's check; record the result here.
  - Result: **pass, Oleg's check, 2026-11-17 (code review).** Chrome Mode Dark, macOS Light, this story's build (`ff5466d`) served from the worktree on a spare port with a throwaway data folder: the tab icon is light sage (`#93B597`) and matches the dark tab strip. The AC-5 e2e leaf proves the mechanism (the served `/favicon.svg` computes `#93B597` under Chromium's dark scheme and `#557059` under light, whatever bookvie's stored Theme).

## Auto Run Result

Status: in-review

**Summary.** bookvie now has its own tab icon: DESIGN.md's F3 drawing (three spines on a plank) in sage `#557059`, and `#93B597` under Chromium's dark scheme. It is linked once from `index.html` and served by a dedicated `GET`/`HEAD` `/favicon.svg` route before the SPA catch-all, as `image/svg+xml` with `Cache-Control: no-cache`. The install smoke test proves the installed wheel serves it.

**Files changed:**
- `frontend/public/favicon.svg`: new, the F3 drawing with a light and a dark fill and one MIT comment.
- `frontend/index.html`: one `<link rel="icon" href="/favicon.svg" type="image/svg+xml" />`.
- `backend/bookvie/http/app.py`: the `FAVICON_*` constants and the `favicon` route (reads the file per request; 404 when not built).
- `scripts/smoke.mjs`: fetches `/favicon.svg` from the installed wheel and checks 200, `image/svg+xml` and the built file's bytes.
- `backend/tests/test_app.py`: the AC-3 leaf un-skipped, plus HEAD, not-built 404, read-per-request and foreign-Host 403 tests.
- `frontend/e2e/favicon.spec.ts`: five ATDD leaves activated.
- `_bmad-output/implementation-artifacts/deferred-work.md`: two spine-drift entries (AD-16; Testing row / Seed smoke description).

**Review findings.** 20 findings: 0 high, 0 medium, 13 low, 7 false.
- Patched (3 low rows, two fixes): the `no-cache` comment no longer claims cheap ETag revalidation (Starlette's `FileResponse` never answers 304), and `FAVICON_PATH` is derived from `FAVICON_FILE`.
- Deferred (2 low): spine drift, AD-16 and the smoke description.
- Rejected low: the old `test_top_level_build_file_is_served` now hits the new route (catch-all still covered by AC-3's `robots.txt` tail); no symlink containment on the route (`static/` is build output only); the AC-5 by-hand result (Oleg's check); the "(ATDD)" describe title (repo convention); case or trailing-slash variants reaching the catch-all without `no-cache` (no client requests them); the `is_file`/stat race during a rebuild (also in the catch-all).
- Rejected false: the JSON 404 body, smoke not checking `Cache-Control`, the smoke ENOENT/BOM claims, and three intent-audit notes (smoke, the suite and AC-5 are all covered by this run's verification or the spec).
- Every row is in the Review Triage Log.

**Follow-up review recommendation:** false. Only low entries were patched (3 low, 0 medium, 0 high).

**Verification (re-run after the patches):**
- `uv run pytest tests/test_app.py tests/test_guard.py`: 96 passed.
- `npx playwright test e2e/favicon.spec.ts`: 5 passed.
- `npm run check`: exit 0.
  - ruff: 126 files formatted, all checks passed.
  - pytest: 1578 passed; coverage gates domain 100%, intents+store 98.08%.
  - Node unit tests: 0 skipped.
  - e2e: 729 passed, no existing spec edited.
  - smoke: `GET /favicon.svg -> 200 as image/svg+xml, the built file`, `smoke: ok`.

**Residual risks.** AC-5's by-hand check (Chrome's Mode set opposite to the OS, then look at the tab) is still Oleg's to do and record. Before a code review, the dark fill is proven only through Chromium's emulated scheme on the SVG document.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
