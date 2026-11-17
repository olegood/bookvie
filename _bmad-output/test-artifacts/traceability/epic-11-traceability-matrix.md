---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-11-17'
workflowType: 'testarch-trace'
traceTarget: 'epic 11'
gateType: 'epic'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources:
  - '_bmad-output/planning-artifacts/epics.md (TR7 :183; Epic 11 gate :2423; Stories 11.1-11.4 :2425-2640)'
  - '_bmad-output/planning-artifacts/dev-prod-favicon-plan-2026-11-17.md (section 5, the P0 and P1 risks :89-99)'
  - '_bmad-output/implementation-artifacts/epic-11-context.md (Epic gate :26)'
  - '_bmad-output/implementation-artifacts/epic-11-retro-2026-11-17.md (action 74)'
  - '_bmad-output/test-artifacts/atdd-checklist-11-{1,2,3,4}-*.md (story ACs and their priority markers; see "ATDD checklists")'
externalPointerStatus: 'not_used'
collectionStatus: 'COLLECTED'
sourceSha: '59c75e1'
---

# Traceability Matrix & Gate Decision: Epic 11, Know which bookvie you're looking at

**Target:** Epic 11, Stories 11.1 to 11.4 (gate type: epic). This is Epic 11 retro action 74 (`epic-11-retro-2026-11-17.md`).
**Date:** 2026-11-17
**Evaluator:** Oleg (TEA Agent)
**Commit under trace:** `59c75e1`.
- That commit is the last story commit `ff50bbd`, plus the retro (`94da6c7`, docs only), retro action 76 (`867a5c3`: the case-variant refusal, the catch-all never serving an icon, `index.html` served `no-cache`, with their tests) and retro action 75 (`59c75e1`, spine reconciliation, docs only).
- This trace changed no product code and added no test.

**Gate thresholds:**
- **Coverage:** TR7 (`epics.md:183`) requires P0 = 100% and P1 ≥ 95%. That is stricter than the workflow default of 90%, so TR7 applies. Overall coverage must be ≥ 80%.
- **Other TR7 clauses:** an API test for every error code, `check:api` clean, and coverage ≥ 90% on `domain/` and ≥ 80% on `intents/` + `store/`.
- **Epic 11 gate** (`epics.md:2423`, `epic-11-context.md:26`): TR7, plus the plan's P0 risks green (real library refused, including through a symlink or `..`, with `HOME` set to a temporary folder; dev defaults; `app-info` per mode; favicon by mode, also through Vite; the dev frame; the stale-tab notice), the version equality test in `npm run check`, the existing e2e specs passing unchanged on a production server, and `~/bookvie-data` untouched by `npm run check`.

**Machine-readable:** `epic-11-e2e-trace-summary.json` and `epic-11-gate-decision.json`, both in this folder.

**Live verification results:** none on file. The retro's hand run ("Behavior verification": the refusal in four forms, dev defaults, `app-info` per mode, both favicons, the dev frame, the stale-tab notice) is recorded in `epic-11-retro-2026-11-17.md`, not as a live results file, so it isn't counted here. Story 11.1 AC-5's look at the real tab strip is Oleg's by-hand check, recorded in `spec-11-1-a-favicon-for-bookvie.md` → Verification; the e2e leaf proves the mechanism it relies on.

**Waiver register:** none on file.

**Tests added by this trace:** none. Every item is FULL on the existing tests (matrix below).

---

## Gate Decision: PASS

**Rationale:**
- P0 coverage is 100% (16/16).
- P1 coverage is 100% (11/11), against the TR7 target of 95%.
- Overall coverage is 100% (33/33), against the minimum of 80%.
- Every plan P0 risk is green (table below).
- The version equality test runs in `check:api`.
- No e2e spec that predates Epic 11 had an assertion changed. The one edit, `dev-proxy.spec.ts` gaining `/favicon.svg` in its inline proxy map, is the edit Story 11.2 AC-5 requires.
- `~/bookvie-data` was untouched by this trace's `npm run check`.
- Epic 11 added no error code. `check:api` is clean and the coverage gates hold.

### TR7 criteria and the Epic 11 gate

| Clause | Evidence | Status |
|---|---|---|
| P0 = 100% | 16/16 FULL (matrix below) | ✅ MET |
| P1 ≥ 95% | 11/11 FULL | ✅ MET |
| Every error code has an API test | "Error codes" below | ✅ MET |
| `check:api` clean | contract up to date, Prettier, `tsc -b`, oxlint (0 errors; the 2 warnings in `usePauseFlow.tsx` predate Epic 11); 388 passed, 0 failed, 0 skipped | ✅ MET |
| Coverage ≥ 90% `domain/`, ≥ 80% `intents/`+`store/` | `coverage_gate.py`: domain 100.00% (466/466 lines), intents+store 98.08% (1633/1665) | ✅ MET |
| Plan P0 risks green | "Epic 11 P0 risks" below: all six green in this run | ✅ MET |
| Version equality test in `npm run check` | `frontend/scripts/version.test.mjs:71` and `:105` run under `check:api` (`node --test scripts/*.test.mjs`); both passed in this run | ✅ MET |
| Existing e2e specs pass unchanged on a production server | `git diff 484b905^..HEAD -- frontend/e2e frontend/playwright.config.ts` touches one spec that predates Epic 11: `dev-proxy.spec.ts`. Its existing leaf (`:25`) keeps every assertion; its inline proxy map gains `'/favicon.svg'`, which Story 11.2 AC-5 names, and the file gains the AC-5 leaf (`:63`). Every other changed e2e file is new in Epic 11. The worker server stays production (`serverDev` defaults to false). The one in-epic edit to an earlier Epic 11 leaf (`about-this-copy-automate.spec.ts:134`, during 11.4) was pre-authorised in Story 11.4's spec. All green in the run below. | ✅ MET |
| `~/bookvie-data` untouched by `npm run check` | The run went from 18:39:36 to 18:43:10. Read-only `find ~/bookvie-data -newermt` afterwards listed nothing; the folder's newest file is `library.json` at 16:53:47, from Oleg's own use before the run, and the folder's own mtime is 16:53. Every pytest leaf sets `HOME` to a temp folder, and every e2e server gets a temp `--data-dir` | ✅ MET |

### Epic 11 P0 risks

The plan's section 5 (`dev-prod-favicon-plan-2026-11-17.md:89-99`) names six P0 risks.

| Risk | Matrix items | Key tests | Status |
|---|---|---|---|
| Real library refused, incl. symlink and `..`, `HOME` in a temp folder; no test touches the real `~/bookvie-data` | 11.2 · AC-2 | `test_dev_mode.py:131` (`direct`, `tilde`, `symlink`, `dotdot`, `missing`, `case`: exit 2, exact stderr, no lock, no store, folder tree unchanged); `:246` (the dev default folder linking to the real one); `:286` (`HOME` itself a symlink); `:356`, `:379`, `:405`, `:417`, `:434`, `:442` (retro action 76: a missing case or Unicode variant on a case-insensitive disk, and the disk probe failing closed); `:486` (a real `bookvie` process, existing and missing folder, exit 2); `:269` (look-alike folders still start) | ✅ green |
| Dev defaults | 11.2 · AC-1 | `test_dev_mode.py:102`; `:278` (plain `bookvie` still opens `~/bookvie-data`) | ✅ green |
| `app-info` per mode | 11.2 · AC-3 | `test_dev_mode.py:181` (both modes, commit read once, null without git or a checkout, `/api/health` unchanged, model in `views/app_info`, `schema.d.ts`); `:305` (`~` only inside home); `:315`, `:341` (commit read once per dev start, never in production, null whatever git raises) | ✅ green |
| Favicon by mode, also through Vite | 11.1 · AC-3, 11.2 · AC-4, 11.2 · AC-5 | `test_app.py:62`, `:182` (the catch-all never serves an icon, either mode); `test_dev_mode.py:453`, `:472`; `dev-mode.spec.ts:37`; `dev-proxy.spec.ts:63`; `test_packaging.py:25` | ✅ green |
| Dev frame (pill and `DEV · ` title; neither on production) | 11.2 · AC-6, 11.2 · AC-7 | `dev-mode.spec.ts:86`; `dev-mode-automate.spec.ts:117`, `:190` (through Vite); `dev-mode-production.spec.ts:28`; unit `page.test.ts:6`, `:11` | ✅ green |
| Stale-tab notice (shows and announces once when versions differ; never when equal; never from a failed fetch; Reload reloads) | 11.4 · AC-2, AC-3, AC-5, AC-6, AC-7 | `update-notice.spec.ts:59`, `:102`, `:236`, `:271`, `:319`; `update-notice-automate.spec.ts:157`, `:179`; unit `updateNotice.test.ts` (8 cases) | ✅ green |

### Run evidence

**Commit:** `59c75e1`, clean working tree.

**Command:** `npm run check` (`check:py`, `check:api`, `check:e2e`, `check:smoke`, run one after the other).

**Result:** exit code 0 (npm's own status, written to the log after the run), on the first run.

| Check | Outcome |
|---|---|
| pytest | 1627 passed (4 warnings, none from Epic 11: Starlette's `httpx` deprecation, a PIL size warning and two `zipfile` duplicate-name warnings in older refusal tests) |
| Coverage gates | `coverage_gate.py`: domain 100.00% (466/466 lines), intents+store 98.08% (1633/1665) |
| `check:api` | contract up to date, Prettier, `tsc -b`, oxlint (0 errors; the 2 warnings in `usePauseFlow.tsx` predate Epic 11); 388 passed, 0 failed, 0 skipped |
| Playwright | 783 passed (2.3 m), none flaky, retried or skipped. That is the count in the retro's acceptance evidence: this trace added no test. |
| Smoke | isolated install served `/`, a deep link and `/favicon.svg` (200, `image/svg+xml`, the built file), and the installed `favicon-dev.svg` is the built file: ok |

---

## Oracle and scope

**Oracle.** TR7 states its P0/P1 percentages against the `test-design-qa.md` scenarios. That document predates Epic 11 and has no favicon, dev-mode, `app-info` or update-notice scenario (its only `--dev` mention is FND-API-004, the Host/Origin guard, an Epic 1 item). Epic 11's own test design is section 5 of the plan, which the epic's gate cites. So the priority-bearing oracle is each Story 11.1 to 11.4 AC from `epics.md`: 33 items.

**Priority.** An AC's priority is the higher of:
- the highest `[P0]`…`[P3]` marker among its tests (ATDD and automate), and
- the plan risk it carries.

The second rule raises three ACs the ATDD marked P1 to P0, because the epic's gate lists their risk as P0:
- 11.2 · AC-5: "favicon by mode, also through Vite".
- 11.2 · AC-7: the dev frame's "on a production server neither is there".
- 11.4 · AC-7: "a failed `app-info` fetch never shows it".

All three are FULL, so this changes no result. It only puts them under the stricter threshold.

**Out of scope, and why:**

- **XUI-E2E-001 and XUI-E2E-003** (couldn't save; no optimistic UI under a delayed response). Epic 11 adds no intent and no write. `app-info` is a read, and its pending and failed states are owned by 11.2 AC-8, 11.3 AC-4 and 11.4 AC-7.
- **XUI-E2E-002** (two contexts). The stale tab is Story 11.4's whole subject: a tab finds a newer server through `app-info`'s focus refetch, and the intent invalidation, which 11.4 AC-3, AC-6 and AC-7 pin. A second `--dev` from another checkout joining the first is retro finding E11-S2, action 80, and is listed under Open risks.
- **XUI-E2E-004** (tone). Epic 11's copy is pinned by its exact strings: the refusal sentence, "About this copy", "Data folder: …", "Development server", "bookvie was updated to X. Reload to use it."
- **XUI-E2E-005** (empty states). Epic 11 adds no empty state. 11.3 AC-4's automate leaf pins that Backup's couldn't-load state shows no card (`about-this-copy-automate.spec.ts:197`).
- **The real tab strip** (11.1 AC-5). Chrome's tab strip can't be automated. The e2e leaf proves the icon follows Chromium's scheme, not bookvie's Theme, and Oleg's check by hand is recorded in the 11.1 spec.
- **Safari and Firefox, PNG and `.ico` favicons.** The e2e suite runs Chromium only, which covers the one supported browser (AGENTS.md "Supported browser"); the epic ships an SVG favicon only.

---

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status |
| --------- | -------------- | ------------- | ---------- | ------ |
| P0        | 16             | 16            | 100%       | ✅ PASS |
| P1        | 11             | 11            | 100%       | ✅ PASS |
| P2        | 6              | 6             | 100%       | ✅ PASS |
| P3        | 0              | 0             | n/a        | n/a |
| **Total** | **33**         | **33**        | **100%**   | **✅ PASS** |

**Tests mapped:** every Epic 11 test, plus the Epic 11 edits to four older test files.

- **Backend (pytest):**
  - `test_dev_mode.py`: 33 cases, new in Epic 11, including retro action 76's.
  - `test_app.py`: 18 cases. They are the five favicon-route tests, `index.html` served `no-cache` on GET and HEAD (5 paths), and the catch-all never serving an icon (2 modes × 4 paths).
  - `test_wheel_build.py`: 2 cases, both favicons in the wheel.
- **Unit (frontend):**
  - `lib/aboutThisCopy.test.ts`: 6 cases.
  - `lib/updateNotice.test.ts`: 8 cases.
  - `lib/page.test.ts`: 2 cases.
  - `lib/announce.test.ts:75`: 1 case.
  - `scripts/version.test.mjs`: 2 cases.
- **e2e (Epic 11 specs):** 59 tests.
  - `favicon.spec.ts`: 5. `favicon-automate.spec.ts`: 4.
  - `dev-mode.spec.ts`: 4. `dev-mode-automate.spec.ts`: 8. `dev-mode-production.spec.ts`: 3.
  - `dev-proxy.spec.ts`: 1 new leaf.
  - `about-this-copy.spec.ts`: 5. `about-this-copy-dev.spec.ts`: 1. `about-this-copy-automate.spec.ts`: 8.
  - `update-notice.spec.ts`: 11. `update-notice-automate.spec.ts`: 9.
  - The helper modules are `favicon.ts`, `dev-mode.ts`, `about-this-copy.ts` and `update-notice.ts`.
- **Smoke:** `scripts/smoke.mjs:98-115` (the installed `favicon-dev.svg` is the built file) and `:153-158` (the installed `bookvie` serves `/favicon.svg` as `image/svg+xml`, the built bytes).
- **Epic 11 edits to older tests:**
  - `dev-proxy.spec.ts:35-39`: `/favicon.svg` in the inline map.
  - `test_packaging.py:32`, `:35`: the Vite proxy targets `DEV_PORT` and proxies `/favicon.svg`.
  - `test_cli.py`: the `create_app` spy passes new keyword arguments through.
  - `scripts/copy.test.mjs`: the two dev amber literals are allowed, since they aren't warning colors.

**By level:** the Epic 11 test cases number 131.

| Level | Tests (Epic 11) | Criteria covered |
|---|---|---|
| e2e | 59 | 28 (every item but 11.1 AC-3, 11.2 AC-1, AC-2, AC-3 and 11.4 AC-1) |
| API / integration (pytest, incl. wheel) | 53 | 7 (11.1 AC-3, AC-4; 11.2 AC-1, AC-2, AC-3, AC-4, AC-5) |
| Unit (frontend `lib/` and `scripts/`) | 19 | 8 (11.2 AC-6, AC-7; 11.3 AC-1, AC-2; 11.4 AC-1, AC-2, AC-3, AC-6) |

**Skipped, fixme or pending:** none. The `case` parameter of `test_dev_mode.py:131` skips itself on a case-sensitive temp disk; on this Mac's APFS it ran. Retro action 76 added `:379`, a disk-independent leaf, so the case rule is proven whatever disk runs it.

**Rejected evidence:** none. Every mapped test was read against its criterion.

### Detailed Mapping

Paths are relative to `frontend/e2e/` unless shown in full. pytest files are in `backend/tests/`.

#### Story 11.1: A favicon for bookvie

| ID | Pri | Requirement | Tests | Coverage |
|---|---|---|---|---|
| 11.1 · AC-1 | P1 | `public/favicon.svg` is the F3 drawing (`0 0 32 32`, DESIGN.md's path, one flat fill, no outline or labels, MIT comment); fills `accent` and `accent-dark` checked against DESIGN.md | `favicon.spec.ts:29` (computed fills against DESIGN.md in both schemes, viewBox, exact `d`, allowed elements only, no stroke, opacity 1, one MIT comment); `favicon-automate.spec.ts:27` (×2 schemes: at 16×16 the spines and plank stay apart in one fill) | FULL |
| 11.1 · AC-2 | P1 | `index.html` has exactly one icon link, `rel="icon" href="/favicon.svg" type="image/svg+xml"`, no PNG or `.ico` | `favicon.spec.ts:63` (four kinds of route, after load); `favicon-automate.spec.ts:60` (the served HTML before any script runs) | FULL |
| 11.1 · AC-3 | P0 | A dedicated `/favicon.svg` route before the catch-all: 200, `image/svg+xml`, `no-cache`, the built file; `/favicon.ico` and unknown files as before | `test_app.py:62` (headers, body, route order, `/favicon.ico` and `robots.txt` as before); `:90` (HEAD); `:101` (not built: 404, never `index.html`); `:110` (read per request); `:116` (foreign Host 403); `:182` (retro action 76: the catch-all never serves either icon) | FULL |
| 11.1 · AC-4 | P1 | The build puts `favicon.svg` in `static/` and the wheel; the installed `bookvie` serves it as `image/svg+xml` | `favicon.spec.ts:84` (built file byte-equal to `public/`, served as SVG, `smoke.mjs` checks it); `test_wheel_build.py:64`; `scripts/smoke.mjs:153-158` (ran in this trace's `check:smoke`) | FULL |
| 11.1 · AC-5 | P2 | With Chrome's Mode opposite to the OS the fill matches the tab strip (by hand, noted in the story) | `favicon.spec.ts:104` (the served icon follows Chromium's scheme, not bookvie's stored Theme, both ways); `favicon-automate.spec.ts:76` (forced colors keep the fill); Oleg's check by hand: `spec-11-1-a-favicon-for-bookvie.md` → Verification | FULL |
| 11.1 · AC-6 | P1 | The existing e2e suite passes unchanged; nothing in the page looks different | `favicon.spec.ts:122` (the icon link resolves, uncached; no `src`/`href` with "favicon" in the body; no same-origin error); the full suite in this run with no older assertion changed (gate table) | FULL |

#### Story 11.2: Keep development apart from the real library

| ID | Pri | Requirement | Tests | Coverage |
|---|---|---|---|---|
| 11.2 · AC-1 | P0 | `--dev` defaults to `~/bookvie-data-dev` and 8766; explicit flags win; plain is `~/bookvie-data` and 8765; `--help` shows both (AR29) | `test_dev_mode.py:102`; `:278` | FULL |
| 11.2 · AC-2 | P0 | `--dev` naming `~/bookvie-data` directly, by symlink or by `..` prints the exact refusal and exits 2; no lock, no store, nothing changes; no test touches the real library (AR30) | `test_dev_mode.py:131` (6 forms), `:246`, `:269` (×3), `:286`, `:356`, `:379` (×2), `:405`, `:417`, `:434`, `:442`, `:486` (×2, a real process); every test sets `HOME` to a temp folder (the `home` fixture), and the real library's files were unchanged across this run | FULL |
| 11.2 · AC-3 | P0 | `GET /api/views/app-info` is `{version, mode, dataDir, commit}` from a Pydantic model in `views/app_info`; `schema.d.ts` regenerated; `dataDir` with `~`; `commit` once at a dev start, else null, never an error; `/api/health` unchanged (AR31) | `test_dev_mode.py:181`, `:305`, `:315`, `:341` (×params); `check:api`'s contract check (`schema.d.ts` up to date) | FULL |
| 11.2 · AC-4 | P0 | Production serves the sage `favicon.svg`, dev the amber `favicon-dev.svg`, both `image/svg+xml` and `no-cache`; dev fills checked against DESIGN.md; the wheel ships `favicon-dev.svg` (AR33) | `dev-mode.spec.ts:37` (both servers; dev fills against `components.favicon.dev-fill`/`dev-fill-dark`; same drawing; byte-equal to the built and `public/` files; the production server gets the sage bytes); `test_dev_mode.py:453` (×2), `:472`; `test_wheel_build.py:80`; `scripts/smoke.mjs:98-115` | FULL |
| 11.2 · AC-5 | P0 | `vite.config.ts` proxies `/api`, `/media`, `/favicon.svg` to `127.0.0.1:8766`; `dev-proxy.spec.ts` adds `/favicon.svg` and a tab through Vite gets the backend's amber file | `dev-proxy.spec.ts:63` (the loaded config's targets exactly; through Vite the dev fill, bytes equal to the built `favicon-dev.svg`, not `public/favicon.svg`); `test_packaging.py:25` | FULL |
| 11.2 · AC-6 | P0 | On a dev server the wordmark reads "bookvie DEV" (pill after the word, space in the DOM, `section-label`, amber, `rounded.sm`, `4px 7px`, `spacing.2`); not a link, button or Tab stop; every title "DEV · *Page* — bookvie"; dev only from `app-info.mode` (UX-DR67, UX-DR68) | `dev-mode.spec.ts:86` (all of it, every route incl. Book detail, a dev server told `production` shows no mark, no `import.meta.env.DEV` in `src`); `dev-mode-automate.spec.ts:46` (Theme over OS scheme), `:70` (centered, about 20px), `:93` (Tab never lands in the wordmark), `:117` (axe light and dark, the banner's accessible text), `:190` (through Vite); unit `page.test.ts:11` | FULL |
| 11.2 · AC-7 | P0 | On production: no pill, "*Page* — bookvie", no amber anywhere | `dev-mode-production.spec.ts:28` (after `app-info` says production, every route, light and dark, every element and pseudo-element); `dev-mode-automate.spec.ts:224` (forced colors); unit `page.test.ts:6` | FULL |
| 11.2 · AC-8 | P1 | Before `app-info` loads, or when it never does, the shell looks like production and says nothing failed; a failed refetch after a success keeps the pill and prefix (UX-DR72) | `dev-mode.spec.ts:147` (held, then 500, then a focus refetch failing: title, banner, live regions); `dev-mode-automate.spec.ts:134` (a route change after the failed refetch keeps both) | FULL |
| 11.2 · AC-9 | P2 | Forced colors: the pill is `Canvas`, `CanvasText` text, 1px `CanvasText` border | `dev-mode.spec.ts:195` (light); `dev-mode-automate.spec.ts:160` (dark) | FULL |
| 11.2 · AC-10 | P2 | The dev amber lives as literals in the favicon files and the pill's CSS Module, not in `tokens.css`; `app-shell.spec.ts`'s token comparison passes unchanged (UX-DR66) | `dev-mode-production.spec.ts:57`; `app-shell.spec.ts` unchanged since before Epic 11 and green in this run | FULL |
| 11.2 · AC-11 | P2 | README Development and Options name `bookvie --dev --no-browser`, `~/bookvie-data-dev`, 8766, the refusal, `npm run dev` proxying to 8766; the "stop any normal `bookvie` first" line is gone | `dev-mode-production.spec.ts:76` | FULL |

#### Story 11.3: Show the version on the Backup page

| ID | Pri | Requirement | Tests | Coverage |
|---|---|---|---|---|
| 11.3 · AC-1 | P0 | Production: a third `surface` card after Export and Restore, `section` labelled by `h2` "About this copy" (`section-label`/`ink-tertiary`, uppercase), "bookvie 1.1.0" and "Data folder: ~/bookvie-data" in `body-sm`/`ink-secondary`, from `app-info`; no commit, no "Development server" | `about-this-copy.spec.ts:46` (text, two lines, heading and line styles, frame, order, from `app-info`, a sent commit never shown); `about-this-copy-automate.spec.ts:54` (dark, two ways), `:80` (line spacing); unit `aboutThisCopy.test.ts:10`, `:14`, `:30` | FULL |
| 11.3 · AC-2 | P0 | Dev: "bookvie 1.1.0 (a1b2c3d) · Development server" with " · " as text, and the dev folder; with `commit: null`, no brackets | `about-this-copy-dev.spec.ts:17` (both forms, the real dev server's folder); `about-this-copy-automate.spec.ts:98` (a failed focus refetch keeps the dev line); unit `aboutThisCopy.test.ts:18`, `:22`, `:26` | FULL |
| 11.3 · AC-3 | P1 | A folder outside home shows as the full absolute path, wrapping anywhere, never cut short | `about-this-copy.spec.ts:112` (`overflow-wrap: anywhere`, inside the card, not truncated); `about-this-copy-automate.spec.ts:120` (the real server's own temp folder) | FULL |
| 11.3 · AC-4 | P1 | `app-info` pending or failing: the card is left out silently, Export and Restore work; a failed refetch after a success keeps the card | `about-this-copy.spec.ts:138`; `about-this-copy-automate.spec.ts:134` (a focus refetch with a new version updates the card), `:197` (Backup's couldn't-load state shows no card) | FULL |
| 11.3 · AC-5 | P1 | Plain read-only text, no copy button, no Tab stop; headings `h1` Backup then `h2` About this copy; axe in light and dark | `about-this-copy.spec.ts:195`; `about-this-copy-automate.spec.ts:155` (forced colors), `:182` (the screen-reader reading order) | FULL |
| 11.3 · AC-6 | P1 | The existing Backup e2e specs pass unchanged | `about-this-copy.spec.ts:226` (Export and Restore first, focused `h1`, title, silent live regions with the card shown); `backup.spec.ts`, `restore.spec.ts`, `restore-refusals.spec.ts` unchanged since before Epic 11 and green in this run | FULL |

#### Story 11.4: Tell me when a tab is older than the app

| ID | Pri | Requirement | Tests | Coverage |
|---|---|---|---|---|
| 11.4 · AC-1 | P0 | The bundle bakes `frontend/package.json`'s version through a Vite `define` declared for `tsc -b`; a test in `npm run check` fails unless the four version copies agree (AR34) | `scripts/version.test.mjs:71` (the define reads the file, the declaration, the four copies equal); `:105` (a differing copy is named, on temp copies) | FULL |
| 11.4 · AC-2 | P0 | Equal versions: no notice and nothing announced, on any page, at load and after a refetch | `update-notice.spec.ts:59`; `:466` (the top bar unchanged with no notice); unit `updateNotice.test.ts:6`, `:18`, `:30` | FULL |
| 11.4 · AC-3 | P0 | Different version (newer or older), on load or refetch incl. focus: a full-width `surface` band under the nav, `line` hairline, the sentence in `body-sm`/`ink` with the server's version, a compact 30px `button-secondary` Reload `spacing.4` after; no icon, close, amber or accent; pushes the page down (UX-DR69) | `update-notice.spec.ts:102`; `update-notice-automate.spec.ts:54` (dark, two ways), `:77` (padding, narrow width), `:105` (beside the DEV pill, no amber), `:262` (axe on Backup and Home, light and dark); unit `updateNotice.test.ts:10`, `:14`, `:35` | FULL |
| 11.4 · AC-4 | P1 | The notice stays on every route until reload; nothing blocked; saving a page or a card note works; not a dialog, `alert` or live region | `update-notice.spec.ts:175`; `update-notice-automate.spec.ts:122` (inert behind a modal panel, kept on Book detail) | FULL |
| 11.4 · AC-5 | P0 | Reload (click, Enter or Space) reloads at once, without asking | `update-notice.spec.ts:236`; `update-notice-automate.spec.ts:157` (after Reload with the server on the bundle's version, the notice is gone and About this copy reads it) | FULL |
| 11.4 · AC-6 | P0 | Announced once via the polite `status` region after the tick; a same-version refetch announces nothing; a new version announces once more; the bundle's own version hides the notice (UX-DR70) | `update-notice.spec.ts:271`; `:444` (a save whose refetch first finds a new version keeps the save's announcement, which the review accepted and retro action 79 writes into the AC); unit `updateNotice.test.ts:22`, `:26`; `announce.test.ts:75` | FULL |
| 11.4 · AC-7 | P0 | A failed refetch with no notice shows none and complains nowhere; with the notice showing it stays (UX-DR72) | `update-notice.spec.ts:319`; `update-notice-automate.spec.ts:179` (a failed load, then a refetch finding another version: shown and announced once) | FULL |
| 11.4 · AC-8 | P1 | Tab reaches Reload after the theme toggle and before the page; Skip to content skips it; inside `header`, after the top bar | `update-notice.spec.ts:371`; `update-notice-automate.spec.ts:207` (the banner's reading order) | FULL |
| 11.4 · AC-9 | P2 | Forced colors: `CanvasText` bottom border; Reload takes system button colors | `update-notice.spec.ts:419`; `update-notice-automate.spec.ts:242` (Reload's 1px system border, light and dark) | FULL |
| 11.4 · AC-10 | P2 | README Updating: "hard-reload open tabs" replaced by a line about the notice with Reload | `update-notice.spec.ts:485` | FULL |

### Error codes

TR7 requires an API test for every error code.

- `ErrorCode` (`backend/bookvie/intents/contract.py`) is unchanged. `git diff 484b905^..HEAD -- backend/bookvie/intents/` is empty.
- Epic 11 added no intent and no refusal code. Its backend changes are the CLI (`cli.py`), one read-only view (`views/app_info.py`, `http/api.py`) and the favicon and `index.html` serving (`http/app.py`).
- The CLI's refusal is a process exit (code 2), not an API error code. It is pinned by `test_dev_mode.py:131`, `:486` and the leaves listed under 11.2 AC-2.
- The codes were confirmed in the Epic 1-10 traces and are still green in the run above.

### Risks

`test-design-qa.md` links no risk to Epic 11. R-04 (Host/Origin guard, FND-API-004, which covers `--dev`) still holds for the new routes: `test_app.py:116` pins a foreign Host on `/favicon.svg` as 403, and `app-info` sits behind the same `/api` guard. Epic 11 closes the plan's six P0 risks (table above) and opens none.

### Coverage heuristics

- **Endpoints.** Epic 11 added two routes, `GET /api/views/app-info` and `GET /favicon.svg`. Both have API tests: `test_dev_mode.py:181`, and `test_app.py:62` and `test_dev_mode.py:453`. Gaps: 0.
- **Auth/authz negative paths.** bookvie has no login. The Host guard's negative path on the new route is pinned (`test_app.py:116`). The refusal of the real library is the epic's own negative path, pinned in 11 test functions. Status: present.
- **Error paths.** `app-info` pending, failing, and failing after a success: 11.2 AC-8, 11.3 AC-4, 11.4 AC-7. The commit read failing: `test_dev_mode.py:181`, `:341`. The icon not built: `test_app.py:101`, `test_dev_mode.py:472`. Status: present.
- **UI journeys and states.** Not applicable (formal oracle). The pending, failed, dark, forced-colors and focus states are pinned (matrix above).

### Gap analysis

| Category | Count |
|---|---|
| Critical (P0) | 0 |
| High (P1) | 0 |
| Medium (P2) | 0 |
| Low (P3) | 0 |
| Partial | 0 |
| Unit-only | 0 |

---

## ATDD checklists

The checklists' open (`[ ]`) lines, counted before and after this trace with `grep -cF '[ ]'`:

| Checklist | `[ ]` before | `[ ]` after | Note |
|---|---|---|---|
| `atdd-checklist-11-1-a-favicon-for-bookvie.md` | 0 | 0 | |
| `atdd-checklist-11-2-keep-development-apart-from-the-real-library.md` | 0 | 0 | |
| `atdd-checklist-11-3-show-the-version-on-the-backup-page.md` | 0 | 0 | |
| `atdd-checklist-11-4-tell-me-when-a-tab-is-older-than-the-app.md` | 0 | 0 | |

Every line was ticked by the stories' build and automate runs. No line is left open, so there is no checklist gap.

---

## Open risks (not coverage gaps)

These don't change the gate. Each one is in the retro, a story spec or `deferred-work.md`.

- **A second `--dev` from another checkout silently joins the first** (retro E11-S2). It prints "already running" and exits 0. Retro action 80, due before Epic 12.
- **The update notice's announcement yields to a pending message** (retro E11-S1). The code and `update-notice.spec.ts:444` agree; the AC-6 and EXPERIENCE.md wording don't yet. Retro action 79.
- **Copied e2e helpers** (retro E11-D1). There are several DESIGN.md readers and `app-info` fakes across `favicon.ts`, `dev-mode.ts`, `about-this-copy.ts`, `update-notice.ts` and `app-shell.spec.ts`. Retro action 77 (no assertion change); action 78 teaches ATDD to reuse helpers.
- **Retro actions 75 and 76 are done** (`59c75e1`, `867a5c3`). Action 76's leaves are mapped above under 11.1 AC-3 and 11.2 AC-2.
- **Flaky specs.** None in this trace's run (783 passed, none retried).

---

## Next actions

1. Retro actions 77 to 80, all due before Epic 12.
2. **LOW:** run `/bmad-testarch-test-review` on the Epic 11 suites. `update-notice.spec.ts` (about 500 lines) and `test_dev_mode.py` (about 510 lines) are the largest, under the 1000-line limit in `test-quality.md`.
3. Sprint item `epic-11-retro-item-74-trace-and-gate-epic-11` is marked done with this trace.

---

## Gate decision summary

```text
🚨 GATE DECISION: PASS

📊 Coverage Analysis:
- P0 Coverage: 100% (16/16) (Required: 100%) → MET
- P1 Coverage: 100% (11/11) (TR7 target: 95%, minimum: 80%) → MET
- Overall Coverage: 100% (33/33) (Minimum: 80%) → MET

✅ Decision Rationale:
P0 coverage is 100%, P1 coverage is 100% (TR7 target: 95%; workflow default 90%), and overall coverage is 100% (minimum: 80%). The plan's six P0 risks are green, the version equality test runs in npm run check, no e2e spec that predates Epic 11 had an assertion changed (dev-proxy.spec.ts gained the /favicon.svg proxy entry that 11.2 AC-5 requires), and ~/bookvie-data was untouched. Epic 11 added no error code; check:api is clean and the coverage gates hold.

⚠️ Critical Gaps: 0 (P0 criteria below FULL coverage)

📂 Full Report: _bmad-output/test-artifacts/traceability/epic-11-traceability-matrix.md

✅ GATE: PASS - Epic 11 meets TR7 and its gate
```
