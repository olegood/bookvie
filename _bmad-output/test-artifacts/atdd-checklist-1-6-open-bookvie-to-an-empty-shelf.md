---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-10-30'
storyId: '1.6'
storyKey: '1-6-open-bookvie-to-an-empty-shelf'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-16-open-bookvie-to-an-empty-shelf'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-1-6-open-bookvie-to-an-empty-shelf.md'
generatedTestFiles:
  - 'frontend/e2e/app-shell.spec.ts'
  - 'frontend/e2e/catalog-empty.spec.ts'
  - 'frontend/src/lib/relativeDay.test.ts'
  - 'frontend/scripts/copy.test.mjs'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 1.6)'
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
  - '_bmad-output/planning-artifacts/implementation-readiness.md (decisions 8, 11)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md'
  - '_bmad-output/test-artifacts/test-design-qa.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - 'frontend/playwright.config.ts'
  - 'frontend/e2e/fixtures.ts'
  - 'frontend/e2e/README.md'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Every DESIGN.md token is a CSS custom property (colors and dark twins, spine colors, typography, spacing, radii, elevation, scrim); UI text is sans, only book titles serif (UX-DR1)' }
  - { id: AC-2, idSource: generated, text: 'Top nav: Skip to content first (visible on focus, moves focus to main), wordmark, only Catalog; / routes to Catalog, Home not in nav; active item aria-current=page with 2px accent underline (UX-DR3)' }
  - { id: AC-3, idSource: generated, text: 'Theme toggle Light/Dark/System switches instantly, System follows the OS live, remembered in localStorage inside try/catch (default System); role=group "Theme", aria-pressed, segmented style (UX-DR2)' }
  - { id: AC-4, idSource: generated, text: 'Every route: header (with nav) and main landmarks, exactly one h1, document.title "<Page> — bookvie"; focus moves to the h1 on route change' }
  - { id: AC-5, idSource: generated, text: 'Every page: one polite status and one alert region, plus a shared helper that empties both then sets text after ~100 ms (UX-DR4)' }
  - { id: AC-6, idSource: generated, text: 'Before the first view response only the header and nav render; no spinner, no skeleton' }
  - { id: AC-7, idSource: generated, text: 'Failed first load: "Couldn''t load. Is bookvie still running?" in an alert region with Try again that refetches; a failed background refetch keeps the last data silently' }
  - { id: AC-8, idSource: generated, text: 'Empty library: Catalog shows h1 "Catalog", bare birch planks and "Your shelf is empty. Add your first book.", toolbar holding only New book (UX-DR22)' }
  - { id: AC-9, idSource: generated, text: 'Shared primitives (button-primary, button-secondary, link, Text field, focus ring, Failure message) match DESIGN.md; controls that cannot act use aria-disabled with a reason, never native disabled (UX-DR5, UX-DR11)' }
  - { id: AC-10, idSource: generated, text: 'prefers-reduced-motion: reduce turns all transitions and animations off (UX-DR8); forced-colors: active applies the DESIGN.md base rules (UX-DR9)' }
  - { id: AC-11, idSource: generated, text: 'Below 1024px the page scrolls horizontally instead of reflowing (NFR2, NFR3)' }
  - { id: AC-12, idSource: generated, text: 'Date helper counts local calendar days (today, yesterday, N days ago, future → today, >365 days → over a year ago) and recomputes on focus and visibility (UX-DR10)' }
  - { id: AC-13, idSource: generated, text: 'Automated axe check on Catalog in both themes reports no WCAG 2.2 AA violations' }
  - { id: AC-14, idSource: generated, text: 'Copy test over server (AD-9) and client copy: no exclamation marks, greetings or praise, no red/warning failure styles; no character-key shortcuts, drag and drop, hover-only affordances or on-load animations (UX-DR12, NFR6)' }
---

# ATDD Checklist - Epic 1, Story 1.6: Open bookvie to an empty shelf

**Date:** 2026-10-30
**Author:** Oleg
**Primary test level:** E2E (Playwright against the real `bookvie`), plus unit (`node:test`)

---

## Story Summary

As Oleg, I want a calm, accessible app frame with themes and an honest empty shelf, so that bookvie feels like my own reading room from the first launch.

The story builds the app shell that every later page lives in: tokens, top nav, theme toggle, landmarks, live regions, the loading and couldn't-load states, the empty Catalog, the shared primitives, motion and forced-colors rules, the date helper, and the a11y and tone guards.

**Story source:** there is no story spec file yet (`sprint-status.yaml` lists `1-6-open-bookvie-to-an-empty-shelf` as `backlog`). The criteria come from `epics.md` → Story 1.6. When `spec-1-6-…md` is written, add an `### ATDD Artifacts` link to this checklist under its Dev Notes.

---

## Acceptance Criteria

The story's criteria have no ids, so they are numbered AC-1 to AC-14 in source order (see frontmatter for full text).

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | Tokens as custom properties; sans UI text | E2E | P1 | `app-shell.spec.ts` |
| AC-2 | Top nav, skip link, Catalog only, `aria-current` | E2E | P0 | `app-shell.spec.ts` |
| AC-3 | Theme toggle, System live, remembered | E2E | P0 | `app-shell.spec.ts` |
| AC-4 | Landmarks, one `h1`, title, focus on route change | E2E | P1 | `app-shell.spec.ts` |
| AC-5 | One `status` + one `alert` region | E2E | P1 | `app-shell.spec.ts` |
| AC-6 | Header and nav only before the first view | E2E | P1 | `catalog-empty.spec.ts` |
| AC-7 | Couldn't load + Try again | E2E | P0 | `catalog-empty.spec.ts` |
| AC-8 | Empty shelf with only New book | E2E | P0 | `catalog-empty.spec.ts` |
| AC-9 | Primitives match DESIGN.md | E2E | P2 | `app-shell.spec.ts` |
| AC-10 | Reduced motion off (forced colors: green phase) | E2E | P1 | `app-shell.spec.ts` |
| AC-11 | Horizontal scroll below 1024px | E2E | P2 | `app-shell.spec.ts` |
| AC-12 | Relative dates by local calendar day | Unit | P1 | `src/lib/relativeDay.test.ts` |
| AC-13 | axe: no WCAG 2.2 AA violations, both themes | E2E | P2 | `catalog-empty.spec.ts` |
| AC-14 | Tone and interaction guard | Unit (static scan) | P1 | `scripts/copy.test.mjs` |

Priorities: P0 is what the AI cataloging skill and every later page depend on (the nav, the theme, the couldn't-load path, the empty Catalog). AC-13 is P2 because test-design-qa.md set axe as "report only" (Q4), but the story AC now requires zero violations, so the scaffold gates. Confirm which applies (see Notes).

---

## Story Integration Metadata

- **Story ID:** `1.6`
- **Story Key:** `1-6-open-bookvie-to-an-empty-shelf`
- **Story File:** none yet; criteria from `_bmad-output/planning-artifacts/epics.md` (Story 1.6)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-1-6-open-bookvie-to-an-empty-shelf.md`
- **Generated Test Files:** `frontend/e2e/app-shell.spec.ts`, `frontend/e2e/catalog-empty.spec.ts`, `frontend/src/lib/relativeDay.test.ts`, `frontend/scripts/copy.test.mjs`

---

## Red-Phase Test Scaffolds Created

One skipped leaf per criterion: 14 leaves. Each title carries `[P#] AC-<n>`.

### E2E Tests (12 tests)

**`frontend/e2e/app-shell.spec.ts`** (8 tests, worker server, read-only)
- `[P1] AC-1` primary: `--shadow-cover`, `--shadow-overlay`, `--shadow-plank` and `--color-scrim` equal DESIGN.md → Elevation & Depth. Then every DESIGN.md frontmatter primitive, parsed from the file (137 light, 23 dark twins), equals its computed custom property in light and dark. No element uses the serif stack.
- `[P0] AC-2` primary: the nav's Catalog link has `aria-current="page"`. Then Home/Stats/Card notes/Backup are absent, the wordmark shows, Tab focuses a visible "Skip to content", and Enter focuses `main`.
- `[P0] AC-3` primary: Dark makes `body` `rgb(25, 27, 24)`. Then `aria-pressed` on all three buttons, the choice survives a reload, System follows `emulateMedia` live, and cleared storage defaults to System.
- `[P1] AC-4` primary: `document.title` is "Catalog — bookvie". Then the landmarks, one `h1`, and focus on the Catalog `h1` after client navigation from the 404 page.
- `[P1] AC-5` primary: exactly one `role=status` and one `role=alert`.
- `[P2] AC-9` primary: New book background is `accent`. Then `on-accent` text, 9px radius, 42px height, the 2px accent focus outline with 2px offset, and the link's accent color with a 3px underline offset.
- `[P1] AC-10` primary: under reduced motion, a probe with inline `transition`/`animation` resolves to ≤ 1 ms.
- `[P2] AC-11` primary: at 800px, `scrollWidth` ≥ 1024 and the banner is ≥ 1024 wide.

**`frontend/e2e/catalog-empty.spec.ts`** (4 tests)
- `[P1] AC-6` primary: holds `GET /api/views/catalog` and requires the page to request it. Header and nav render, while the empty-state copy, New book and any progressbar are absent. On release, New book appears.
- `[P0] AC-7` primary: with the view aborted (`connectionrefused`), the `alert` reads "Couldn't load. Is bookvie still running?". Try again with the server back shows the Catalog, and the message is gone.
- `[P0] AC-8` primary: on a per-test server seeded with `books: []`, `main` shows "Your shelf is empty. Add your first book.", the `h1` "Catalog" and New book. `main` has no other button, no textbox and no progressbar.
- `[P2] AC-13` primary: `AxeBuilder` with the WCAG 2.0/2.1/2.2 A+AA tags finds no violations in light, then in dark.

### API Tests (0 tests)

N/A. The story adds no endpoint; it consumes `GET /api/views/catalog` from Story 1.5.

### Unit Tests (2 tests)

- **`frontend/src/lib/relativeDay.test.ts`**, `[P1] AC-12`. Primary: 23:59 → 00:01 is "yesterday", which a 24-hour division gets wrong. Then today, N days ago, the DST change on 25 Oct 2026, a future date → today, 365 days → "365 days ago", and 366 days → "over a year ago". The module loads with `await import(MODULE)` inside the test, so `tsc` and the runner pass before `relativeDay.ts` exists. Switch to a static import at green.
- **`frontend/scripts/copy.test.mjs`**, `[P1] AC-14`. Primary: no scanned message contains `!`. Server copy is the capitalised one-line strings in `backend/bookvie/**/*.py`; client copy is JSX text and prose literals in `frontend/src`. The test also checks that both sources were scanned: it requires "Couldn't save. Your data wasn't changed." and the empty-shelf sentence. It then checks for greetings and praise, red or warning colors in CSS (named, and hex with hue < 40° or > 345° at saturation > 0.55), `:hover` rules without a `:focus` twin, global key handlers, single-character key checks, and `draggable`/`onDrag*`/`onDrop`.

### Component Tests (0 tests)

N/A. The stack has no component runner (no RTL or Playwright CT), so UI behaviour is covered at E2E.

---

## Data Factories Created

None new. AC-8 uses the existing `seedLibrary(dataDir, { books: [] })` (backend `LibraryBuilder`).

## Fixtures Created

None new. The scaffolds use `test`/`expect`, `seedLibrary`, `startServer`, `freePort` from `e2e/fixtures.ts` and `runDir` from `e2e/guard.ts`. AC-8 starts and stops its own server in `try/finally`, following `seed.spec.ts`. Even when later stories add books to the worker server, it still sees an empty library.

## Infrastructure Changes Made

- **`frontend/package.json`:** added dev dependency `@axe-core/playwright` `~4.14.0` (needed by AC-13; test-design-qa.md already listed it).
- **`frontend/package.json` → `check:api`:** the unit glob is now `'src/**/*.test.ts' 'scripts/*.test.mjs'` (was `src/api/*.test.ts`), so `src/lib/` tests run.

## Mock Requirements

Only `page.route` on the app's own view endpoint, in two tests:
- **AC-6:** holds `**/api/views/catalog` until released, then continues it to the real server.
- **AC-7:** aborts `**/api/views/catalog` with `connectionrefused` while "down", then continues it.

## Required data-testid Attributes

None. Per `e2e/README.md`, tests locate by role and accessible name only.

## Contract the Scaffolds Pin (names the implementation must use)

- Custom properties `--shadow-cover`, `--shadow-overlay`, `--shadow-plank`, `--color-scrim` (light and dark values from DESIGN.md → Elevation & Depth). Rename both sides together if you prefer other names.
- The `body` background reads `--color-page` (it already does).
- Module `frontend/src/lib/relativeDay.ts` exporting `relativeDay(then: Date, now: Date): string`.
- Accessible names: "Skip to content", "Catalog" (nav link), group "Theme" with buttons "Light", "Dark", "System", "New book", "Try again", and the copy "Your shelf is empty. Add your first book." and "Couldn't load. Is bookvie still running?".
- `document.title` "Catalog — bookvie".
- `main` is focusable for the skip link (for example `tabindex="-1"`).

---

## Implementation Checklist

Activate one test at a time: change `test.skip(` / `it.skip(` to `test(` / `it(`, watch it fail, implement, and watch it pass.

### AC-1 tokens
- [ ] Add the elevation and scrim custom properties (light on `:root`, dark in both dark blocks)
- [ ] Keep `tokens.css` in step with DESIGN.md frontmatter (the test parses the file)
- [ ] Serif stack only on book-title roles
- [ ] Activate, run `npm --prefix frontend run e2e -- e2e/app-shell.spec.ts -g "AC-1"`

### AC-2 top nav
- [ ] `AppShell` layout route: `header` > skip link, wordmark "bookvie" + accent square, `nav` with Catalog
- [ ] `/` renders Catalog inside the shell; NavLink sets `aria-current="page"`; 2px accent underline
- [ ] Skip link visible only on focus; moves focus to `main`
- [ ] Activate AC-2

### AC-3 theme toggle
- [ ] `role="group"` `aria-label="Theme"`, three buttons with `aria-pressed`, glyphs `aria-hidden`
- [ ] Set `data-theme` on `<html>` (Light/Dark), remove it for System; `localStorage` read and write in try/catch, default System
- [ ] Activate AC-3

### AC-4 landmarks and focus
- [ ] Per-route `document.title` "<Page> — bookvie"; `h1` `tabindex="-1"` focused after client navigation
- [ ] Activate AC-4

### AC-5 live regions
- [ ] One `role="status"` (polite) and one `role="alert"` in the shell
- [ ] Shared `announce()` helper: empty both, then set text after ~100 ms
- [ ] Activate AC-5

### AC-6 / AC-7 loading and couldn't load
- [ ] Catalog uses `useCatalogView()`; `loading` renders nothing in `main`, `failed` renders the alert line and **Try again** (`retry`)
- [ ] Activate AC-6, then AC-7

### AC-8 empty shelf
- [ ] Empty state: planks on `shelf-wall`, the sentence in `body`/`ink-secondary`, **New book** `button-primary`; toolbar holds only **New book**; no meter
- [ ] Activate AC-8

### AC-9 primitives
- [ ] `button-primary`, `button-secondary`, `link`, Text field, focus ring on `:focus-visible`, Failure message as shared CSS modules
- [ ] Activate AC-9

### AC-10 / AC-11 motion and width
- [ ] Global `@media (prefers-reduced-motion: reduce)` rule zeroing transitions and animations (`!important`)
- [ ] Base `@media (forced-colors: active)` rules from DESIGN.md
- [ ] Activate AC-10 and AC-11

### AC-12 date helper
- [ ] `src/lib/relativeDay.ts`; switch the test to a static import
- [ ] Recompute on `focus` and `visibilitychange`
- [ ] Activate AC-12, run `npm --prefix frontend run check:api`

### AC-13 axe
- [ ] Activate AC-13 last, once the shell exists (it already passes on today's bare page, so it only guards once there is something to scan)

### AC-14 tone guard
- [ ] Activate AC-14 once the empty-state copy exists; it passes against today's code apart from that copy

### Green-phase follow-ups (secondary branches, not separate red leaves)
- [ ] AC-3: `localStorage` that throws (`addInitScript` overriding `Storage.prototype.getItem`/`setItem`) still renders with System selected
- [ ] AC-2: computed check of the 2px accent underline on the active item
- [ ] AC-5: unit test of the announce helper with mocked timers (empties, sets after ~100 ms, repeats an identical message)
- [ ] AC-7: background refetch failure keeps the last data and shows no message (load, route-abort, dispatch `focus`/`visibilitychange`, assert data stays and the alert is empty)
- [ ] AC-9: Text field (label, "(required)" outside the label, focus halo, 2px ink invalid border) and `aria-disabled` with a reason; first consumer is Story 1.8's panel. Consider a static scan that bans the native `disabled` attribute in `src/`.
- [ ] AC-10: forced-colors check once spines exist (Story 1.10); `document.getAnimations()` is empty after load
- [ ] AC-12: e2e that a relative date recomputes after focus with `page.clock` (needs the deferred Clock / `--fake-today` work)
- [ ] AC-14: on-load animation guard (`document.getAnimations().length === 0` right after load)
- [ ] Deferred-work item from Story 1.5: pin that `useCatalogView` fetches `/api/views/catalog`. AC-6 already does this by waiting for that request.

---

## Running Tests

```bash
# Unit (AC-12, AC-14) with tsc and oxlint
npm --prefix frontend run check:api

# Story 1.6 e2e specs against the last build
npm run build
npm --prefix frontend run e2e -- e2e/app-shell.spec.ts e2e/catalog-empty.spec.ts

# One criterion
npm --prefix frontend run e2e -- e2e/app-shell.spec.ts -g "AC-3"

# Headed / debug
npm --prefix frontend run e2e -- e2e/catalog-empty.spec.ts --headed
npm --prefix frontend run e2e -- e2e/catalog-empty.spec.ts --debug
```

---

## Red-Green-Refactor Workflow

**RED (done):** 14 scaffolds, all skipped, each asserting expected behaviour.

**GREEN (dev):** take one criterion, un-skip its test, see it fail on its primary assertion, implement the minimum, and see it pass. Run `npm run check` before each commit.

**REFACTOR:** with everything green, extract the shell, live-region helper and primitives. Run `npm run e2e:burn-in` before marking the story done.

---

## Next Steps

1. Write the story spec (`spec-1-6-open-bookvie-to-an-empty-shelf.md`) and link this checklist from its Dev Notes.
2. Implement with `bmad-build` (or dev-story), activating tests task by task.
3. After implementation, run `bmad-testarch-automate` for the green-phase follow-ups above.

---

## Knowledge Base References Applied

- **test-quality.md:** no hard waits, explicit assertions in test bodies, one concern per leaf, `describe` grouping.
- **selector-resilience.md:** role and accessible-name locators. The project bans `data-testid`, which overrides the fragment's testid-first order.
- **network-first.md / timing-debugging.md:** routes registered before `goto`; `waitForRequest` captured before navigation; a held-promise gate instead of sleeps.
- **data-factories.md:** `seedLibrary` with the `LibraryBuilder` defaults; explicit `books: []` shows intent.
- **fixture-architecture.md:** reuses the existing worker fixture and helpers; no new fixture layer.
- **test-levels-framework.md / test-priorities-matrix.md:** pure date logic and the static scan at unit level, UI at E2E, no duplicate coverage; P0–P2 by dependency and risk.
- **component-tdd.md:** N/A (no component runner); red-green-refactor still applies per criterion.
- **test-healing-patterns.md, ci-burn-in.md, playwright-cli.md:** burn-in recommended before done; no live selector recording (AI generation mode).

---

## Test Execution Evidence

### Scaffold run (all skipped)

`npx playwright test e2e/app-shell.spec.ts e2e/catalog-empty.spec.ts` → **12 skipped**.
`npm --prefix frontend run check:api` → contract, `tsc -b`, oxlint clean; **35 pass, 0 fail, 2 skipped**.

### RED verification (temporary un-skipped copies, deleted afterwards)

| ID | Result against today's code | First failure |
|---|---|---|
| AC-1 | fail | elevation/scrim properties empty |
| AC-2 | fail | no nav Catalog link |
| AC-3 | fail | no Theme group (click timeout) |
| AC-4 | fail | title "bookvie", expected "Catalog — bookvie" |
| AC-5 | fail | 0 status regions |
| AC-6 | fail | the page never requests `/api/views/catalog` |
| AC-7 | fail | no Couldn't load alert |
| AC-8 | fail | no empty-state copy |
| AC-9 | fail | no New book button |
| AC-10 | fail | transition 0.15 s under reduced motion |
| AC-11 | fail | no banner (scrollWidth part already passes via `body { min-width }`) |
| AC-12 | not run (module absent) | — |
| AC-13 | **pass** | today's bare page has no violations; a guard once the shell exists |
| AC-14 | fail | empty-shelf copy not found; every other rule passes on today's code |

---

## Notes

- **Deviation from the workflow template:** the E2E scaffolds don't wrap each journey in `expect((async () => {…})()).resolves.toBeUndefined()`. They use plain web-first assertions, the style of the existing specs (`shell.spec.ts`, `seed.spec.ts`), with the criterion assertion first after setup. Execution mode was sequential (a single author), not subagents. Unit leaves use `it.skip` from `node:test`, matching `src/api/*.test.ts`.
- **Open interpretation (AC-6):** "only the header and nav render" is read as nothing in `main` while loading. The scaffold doesn't assert whether the `h1` is present then. Decide in the spec, given AC-4's "exactly one `h1`" and focus-on-`h1`.
- **Open interpretation (AC-8):** EXPERIENCE.md puts **New book** both in the empty state and in the toolbar. The scaffold accepts one or two New book buttons and forbids any other button in `main`.
- **AC-13 gate vs report-only:** test-design-qa.md (Q4) said axe is report-only; the story AC says no violations. The scaffold gates. Downgrade it to an annotation if Q4 still holds.
- **AC-1 reads DESIGN.md directly:** if the UX folder moves, update `DESIGN_MD` in `app-shell.spec.ts`.
- AC-9's `aria-disabled` half and the Text field have no consumer in this story; they are green-phase follow-ups above.
