---
title: 'Story 1.6: Open bookvie to an empty shelf'
type: 'feature'
created: '2026-10-30'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'fb3d4a728b3f4a0ded6d8a75d6eb1732ee92c9f3'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-1-6-open-bookvie-to-an-empty-shelf.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The SPA is a bare `h1` per route: no shell, nav, themes, live regions, loading or couldn't-load states, empty shelf, primitives, motion/forced-colors rules or date helper. Every later page needs that frame.

**Approach:** Add an `AppShell` layout route (header, nav, theme toggle, `main`, the page's live regions) and the shared base styles and primitives over `tokens.css`. Make Catalog consume `useCatalogView()` with its loading, failed and empty states. Add `relativeDay` and turn on the 14 ATDD scaffolds (AC-1…AC-14 in the checklist).

## Boundaries & Constraints

**Always:** Values come from `tokens.css` custom properties only, which stay in step with DESIGN.md frontmatter, plus `--shadow-cover|overlay|plank` and `--color-scrim` (light and both dark blocks). UI text is sans; serif only on book-title roles. Accessible names and copy are exactly those the scaffolds pin ("Skip to content", "Catalog", group "Theme" with "Light"/"Dark"/"System", "New book", "Try again", "Your shelf is empty. Add your first book.", "Couldn't load. Is bookvie still running?"). Titles are "<Page> — bookvie" (em dash). `localStorage` is read and written in try/catch; failure means System. Theme is applied before first render. A control that can't act uses `aria-disabled="true"` with a reason, never native `disabled`. Pages import only `src/api/`; no raw `fetch`. AC-13 (axe) gates: the story AC supersedes test-design Q4 "report only". Decision (New book): Catalog has exactly one **New book**, a `button-primary` at the right of the toolbar; the empty state is planks plus the sentence; the button's click does nothing until Story 1.8 wires the panel, and it is the empty state's focus target (E:389).

**Never:** No spinner or skeleton. No red, warning colour, exclamation mark, greeting, praise, hover-only rule, key shortcut, drag and drop, or on-load animation. No bookcase spines, search, meter, panel or intents (Stories 1.7–1.10). No Home route or nav item (Story 3.1). No new runtime dependency, no CSS framework, no `data-testid`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Loading | `GET /api/views/catalog` pending | Header and nav only; `main` empty | N/A |
| First load fails | Fetch rejects or non-2xx, no data yet | Visible "Couldn't load. Is bookvie still running?" + **Try again** in `main`; same text in the alert region | Try again refetches; on success the message and alert text clear |
| Background refetch fails | Data loaded, then focus refetch fails | Last data stays; no message | N/A |
| Empty library | `books: []` | `h1` "Catalog", toolbar with **New book**, birch planks + empty sentence; no meter | N/A |
| Storage throws | `getItem`/`setItem` throw | Renders with System pressed; toggling still switches theme for the session | Swallowed |
| System theme | System pressed, OS flips | Theme follows live (no `data-theme` on `<html>`) | N/A |
| Unknown route | `/no/such/page` | Shell + `h1` "Page not found", title "Page not found — bookvie" | N/A |
| Relative day | then 23:59, now next day 00:01 | "yesterday"; future → "today"; 365 → "365 days ago"; 366 → "over a year ago" | N/A |

</frozen-after-approval>

## Code Map

- `frontend/src/main.tsx` -- router `[{path:'/', CatalogPage}, {path:'*', NotFoundPage}]`; wrap both in an `AppShell` layout route (`errorElement` too). Imports `tokens.css`.
- `frontend/src/styles/tokens.css` -- 137 light / 24 dark primitives already match DESIGN.md; add elevation + scrim. `body { min-width: var(--space-min-viewport) }` already gives the 1024px scroll.
- `frontend/src/api/views.ts` -- `useCatalogView()` → `ViewState` `loading | failed(retry) | ready(data)`; reuse as is. `CatalogView{meter, books}`.
- `frontend/src/api/queryClient.ts` -- `retry: false`, focus + visibility refetch already wired.
- `frontend/src/pages/{CatalogPage,NotFoundPage}.tsx` + `.module.css` -- current stubs; each renders its own `<main>` (move `main` into the shell). Keep "Back to the catalog" link text (AC-4/AC-9 use it).
- `frontend/e2e/app-shell.spec.ts`, `catalog-empty.spec.ts`, `src/lib/relativeDay.test.ts`, `scripts/copy.test.mjs` -- skipped scaffolds; un-skip, don't weaken. `relativeDay.test.ts` switches to a static import. `copy.test.mjs` scans `src/**/*.css` for `:hover` without `:focus` and red hexes, and `src/**` copy for `!`.
- `frontend/e2e/fixtures.ts` -- `test`, `seedLibrary`, `startServer`, `freePort`; `e2e/README.md` bans `data-testid`.
- `frontend/e2e/shell.spec.ts` -- existing `/` and 404 heading tests must stay green.
- `frontend/.oxlintrc.json` -- `react/only-export-components` warns; keep hooks/helpers in `src/lib/`.
- DESIGN.md: top bar D:192-198, 546, 587; toggle D:199-205, 588; primitives D:206-228, 362-364, 589, 619; empty state D:279-287, 621; elevation D:555-564; forced colors D:500-510. EXPERIENCE.md: loading/couldn't load E:303, live regions E:358, structure/focus E:109, 353, dates E:26, motion E:345.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/src/styles/tokens.css` -- add `--shadow-cover`, `--shadow-overlay`, `--shadow-plank`, `--color-scrim` with DESIGN.md light/dark values -- AC-1.
- [x] `frontend/src/styles/base.css` (imported once in `main.tsx`) -- `:focus-visible` 2px accent outline, offset 2px; `a` = accent, 1px underline, offset 3px; `.visuallyHidden`; `prefers-reduced-motion: reduce` zeroing all transition/animation durations with `!important`; `forced-colors: active` base rules (selected/active indicators as borders, not backgrounds) -- AC-9, AC-10.
- [x] `frontend/src/lib/theme.ts` -- `readTheme()`/`writeTheme()` (try/catch, default `system`), `applyTheme()` sets or removes `data-theme` on `<html>`; called in `main.tsx` before `createRoot` -- AC-3.
- [x] `frontend/src/lib/announce.ts` (+ `announce.test.ts`, `mock.timers`) -- registry for the shell's two regions; `announce(kind, text)` and `clearAnnouncements()` empty both, then set text after 100 ms (repeat text re-announces) -- AC-5.
- [x] `frontend/src/lib/page.ts` -- `usePageTitle(name)` sets `document.title`; `PageHeading` (`h1 tabIndex={-1}`) focuses itself when mounted after a client navigation (location key differs from the initial one), not on first load -- AC-4.
- [x] `frontend/src/lib/relativeDay.ts` -- `relativeDay(then, now)` by local calendar dates (`Date.UTC(y,m,d)` diff, not ms/24h); `useNow()` re-renders on window `focus` and `visibilitychange` -- AC-12.
- [x] `frontend/src/components/{Button,TextField,FailureMessage,ThemeToggle}.tsx` + `.module.css` -- `Button` variants primary (42px, radius md, accent/on-accent) and secondary; `TextField` (visible label = accessible name, "(required)" outside `<label>`, accent border + 4px halo on focus, invalid = 2px ink border + described-by one-line message); `FailureMessage` (one line `body-sm`/`ink`); `ThemeToggle` (`role=group` "Theme", 3 `aria-pressed` buttons, `aria-hidden` glyphs, segmented selected style) -- AC-3, AC-9.
- [x] `frontend/src/components/AppShell.tsx` + `.module.css` -- `header` (60px, `surface-inset`, bottom hairline) > skip link (visible on focus, focuses `main`) + wordmark "bookvie" with accent square + `nav` (`NavLink` Catalog; active `aria-current`, 600, 2px accent bottom border flush with hairline) + `ThemeToggle` right; `<main tabIndex={-1}>` with `<Outlet/>`; one visually hidden `role=status` (`aria-live=polite`) and one `role=alert` outside `main` -- AC-2, AC-4, AC-5, AC-11.
- [x] `frontend/src/pages/CatalogPage.tsx` + css -- `useCatalogView()`: loading → nothing; failed → visible failure line + secondary **Try again** (`retry`) and `announce('alert', …)`, cleared on ready; ready → `PageHeading` "Catalog", toolbar with the single **New book** (no-op click), and when `books` is empty the bare bookcase (`shelf-wall`, 2–3 birch planks with `--shadow-plank`) + sentence in `body`/`ink-secondary`. Non-empty shelf renders heading + toolbar only (spines are Story 1.10) -- AC-6, AC-7, AC-8.
- [x] `frontend/src/pages/NotFoundPage.tsx` + css -- drop own `main`; `PageHeading`, `usePageTitle('Page not found')`.
- [x] `frontend/e2e/*.spec.ts`, `src/lib/relativeDay.test.ts`, `scripts/copy.test.mjs` -- un-skip all 14; add e2e: storage that throws → System pressed; background refetch failure keeps the shelf with an empty alert; active nav item's 2px accent bottom border.
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- mark the Story 1.5 `useCatalogView` item `resolved: Story 1.6, catalog-empty.spec.ts AC-6`.

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then it exits 0 with all 14 ATDD tests active and `~/bookvie-data` unchanged.
- Given the Catalog in light and dark, when axe runs with WCAG 2.0–2.2 A/AA tags, then it reports no violations.

### Review Findings

Code review 2026-10-30 (diff `fb3d4a7..fcf1a1d`, `frontend/`; layers: blind, edge, gap, auditor).

- [x] [Review][Patch] Back to the initial history entry doesn't verify that the h1 takes focus (triage #12 fix is unpinned) [frontend/e2e/app-shell.spec.ts:212]
- [x] [Review][Patch] Try again doesn't verify that focus is parked on `main` (triage #4 fix is unpinned) [frontend/e2e/catalog-empty.spec.ts:36]
- [x] [Review][Patch] The failed state's `h1` "Catalog" isn't asserted (triage #3 fix is unpinned) [frontend/e2e/catalog-empty.spec.ts:36]
- [x] [Review][Patch] Not Found's title "Page not found — bookvie" and its shell landmarks aren't asserted [frontend/e2e/app-shell.spec.ts:212]
- [x] [Review][Defer] The layout `errorElement` shows "Page not found" for any render crash, and re-renders `AppShell` if the shell itself throws [frontend/src/main.tsx:23] — deferred: already recorded in deferred-work.md (triage #5); this review adds the AppShell-throws case

Rejected:
- False: theme flashes light on first load (maybe-false). It needs CSS painting before the deferred module script runs on a local server; if real, it's low and the fix duplicates `theme.ts` in an inline script.
- False: no `color-scheme`. `tokens.css:11,182,214` set it for light and both dark blocks.
- False: the background-refetch e2e test's `focus` event never refetches. `queryClient.ts` wires `focus` into `focusManager`.
- Low: `cssMinify: false`. Rejected again (triage #7).
- Low: `clearAnnouncements` cleanup clears other announcements. Rejected again (triage #6).
- Low: Try again finds `#main` by DOM id. Coupling only, with no failure path; the untested focus path is folded into the Try again patch.
- False: the `hasNavigated` module state depends on an ordering that might break. `router.subscribe` in main.tsx registers before `RouterProvider`, so it runs first.
- False: New book does nothing and should be `aria-disabled`. The spec Decision makes it an active no-op (triage #9).
- Low: no unit tests for TextField, the Button reason and theme.ts. Rejected again (triage #13); they have no consumer yet.
- Low: `useNow` goes stale at midnight and pulls React into relativeDay.ts. Rejected again (triage #18).
- Low: the theme doesn't sync across tabs. Rejected again (triage #23).
- False/low: the dark `--shadow-overlay` drops a layer, and dark tokens are duplicated. DESIGN.md gives dark overlay a single layer; the duplication is triage #20.
- Low: Button borrows `--font-nav-active-weight`. DESIGN.md gives no button weight; it's coupling with no named breakage.
- Low: e2e `rmSync` runs after `finally`, so a failed test leaves files. They sit in the per-run dir and are cleared at the next test start.
- False: inline ref callbacks drop announcements. React swaps refs synchronously during commit, so no timer can fire in between.
- Low: CatalogPage crashes on a null `books`. The server owns the contract; no path shown to reach it.
- Low: `relativeDay` returns NaN on an Invalid Date. Rejected again (triage #17).
- Low: `disabledReason=""`. Rejected again (triage #22).
- Low: an unavailable Button still runs non-click handlers. No caller.
- False: the failure line sits above Try again. D:619 means "below the action that failed", which here is the page load; E:303 sets no order.
- Low: the nav link and theme-option focus rings are inset. The 2px accent ring stays visible; an outside offset would be clipped by the header and `overflow: hidden`.
- Reject (fix edits DESIGN.md): `--wordmark-mark` and `--glyph-size` have no DESIGN.md source.
- False: the forced-colors rules live in component modules. The behaviour is present and covered by the AC-10 forced-colors e2e test.
- Reject (fix edits spec): the h1 focus rule differs from the Code Map text (triage #12 changed it on purpose).
- False: New book isn't the empty state's focus target. E:389 is Story 1.12 (triage #10).
- False: the deferred-work.md update is missing. It's in fcf1a1d; the review diff only covered `frontend/`.
- Not a defect: AC-13 and `npm run check` need a run, not a diff read. The test still asserts `toEqual([])`.
- Low: background-refetch assertions can pass early. Rejected again (triage #8).

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Route | Evidence |
|---|--------|---------|---------|-------|----------|
| 1 | blind | Second failed Try again isn't re-announced | false | reject | TanStack `fetchState` sets `status: 'pending'` when data is undefined, so `failed` goes true→false→true and the effect re-runs `announce`. |
| 2 | blind | Try again shows no in-flight state; repeat clicks | false | reject | During refetch the view is `loading` and the button unmounts; it can't be clicked twice. |
| 3 | blind, edge | Failed state renders no `h1` | medium | patch | `CatalogPage` failed branch has no `PageHeading`; EXPERIENCE "one `h1` per page" and focus-on-route-change need it. Matrix doesn't forbid it. |
| 4 | edge | Try again unmounts the focused button; focus falls to `body` | medium | patch | Same `pending` reset as #1 → `loading` → `return null`. Fix: focus `main` before `retry()`. |
| 5 | blind, edge | errorElement shows "Page not found" for any crash | medium | defer | Pre-existing: baseline `main.tsx` already had `errorElement: <NotFoundPage />`. AppShell-throws case not shown reachable. |
| 6 | blind, edge | `clearAnnouncements` cleanup / `announce` clears both regions, can drop another page's pending status | low | reject | Spec and E:358 require emptying both regions; the cleanup fires only on failed→ready or unmount. Rare, and the fix adds API. |
| 7 | blind | `cssMinify: false` is a prod change for a test | low | reject | ~3 KB on a local app; the alternative loosens AC-1, which the spec forbids. |
| 8 | blind, gap | Background-refetch e2e assertions can pass before React settles | low | reject | Weak test, but the rule is pinned by `views.test.ts` "keeps the last data when a background refetch fails" and the network-down observer test. |
| 9 | blind | No-op New book should be `aria-disabled` | false | reject | Spec Decision explicitly makes it an active no-op until Story 1.8. |
| 10 | blind | Empty state's New book focus target not built | false | reject | E:389 is the Delete book flow (Story 1.12); the button exists for it. |
| 11 | blind | Bookcase rows use `--space-spine-height-min` not `shelf-row-height` | low | patch | DESIGN.md bookcase `row-height: '{spacing.shelf-row-height}'` (204px); code uses 120px. |
| 12 | blind, edge | Back to the initial entry doesn't focus `h1` | low | patch | POP restores the initial key, so `key !== initialLocationKey` is false; everyday Back navigation. |
| 13 | blind | TextField, `disabledReason`, `useNow` untested | low | reject | No consumer yet; Story 1.8 is first user. |
| 14 | blind, edge | Button replaces caller `aria-describedby` | low | patch | `aria-describedby={unavailable ? reasonId : rest[...]}`; one-line merge. |
| 15 | blind | Unavailable Button looks identical | maybe-false | reject | Would need DESIGN.md disabled-look spec; low if true, no consumer yet. |
| 16 | blind | TextField shows outline plus halo | low | reject | Cosmetic; EXPERIENCE says the ring is never suppressed, which conflicts with removing it. No consumer yet. |
| 17 | blind, edge | `relativeDay` NaN on Invalid Date | low | reject | No caller passes an invalid Date. |
| 18 | blind, edge | `useNow` stale across midnight while focused | low | reject | Spec and E:26 set refresh on focus/visibility; a timer adds complexity. |
| 19 | blind | Spec vs sprint status mismatch; empty Implementation Notes | false | reject | The workflow moves sprint status at its own step; Notes fix edits the spec. |
| 20 | blind | Dark values duplicated in two blocks | low | reject | Pre-existing tokens.css pattern; AC-1 compares both. |
| 21 | edge | PageHeading steals focus moved during loading | low | reject | Needs a focus guard; loading is brief on a local server. |
| 22 | edge | `disabledReason=""` disables with empty reason | low | reject | No caller. |
| 23 | edge | Theme not synced across tabs | low | reject | Adds a listener; not in intent. |
| 24 | edge | Non-empty library shows no books | false | reject | Spec: spines are Story 1.10. |
| 25 | edge | forced-colors Highlight rule loses on specificity | low | patch | `[aria-pressed]` (0,1,0) < `.option[aria-pressed]` (0,2,0); the media query adds none. |
| 26 | gap | forced-colors rules unverified | low | patch | No test emulates `forcedColors`. |
| 27 | gap | Non-empty Catalog hiding the empty sentence untested | low | patch | Only `{books: []}` is seeded before opening `/`. |
| 28 | gap | Junk stored theme → System unpinned | low | patch | No test stores an invalid value; trivial addition. |
| 29 | edge, gap | deferred-work item marked fully resolved | low | patch | AC-6 pins the URL only; query key and `useHomeView` remain unpinned. |

## Design Notes

- **Live regions sit outside `main`, visually hidden.** Later modal panels make the page behind `inert`, which silences live regions inside it. So the couldn't-load text is shown in `main` and also set in the shell's single alert region; the scaffold's `getByRole('alert')` expects exactly one.
- **Loading renders an empty `main`.** The `h1` arrives with data, so "only header and nav" holds literally; `PageHeading` focuses on mount after a navigation, which covers late arrival.
- **Theme before render.** `applyTheme()` runs synchronously in `main.tsx` before React mounts; System removes `data-theme` so the existing `prefers-color-scheme` block follows the OS live with no listener.

## Verification

**Commands:**
- `npm --prefix frontend run check:api` -- expected: tsc, oxlint, unit tests (relativeDay, announce, copy guard) pass.
- `npm run build && npm --prefix frontend run e2e -- e2e/app-shell.spec.ts e2e/catalog-empty.spec.ts e2e/shell.spec.ts` -- expected: all pass.
- `npm run check` -- expected: exit 0.
