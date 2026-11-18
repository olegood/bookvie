---
title: 'Back to top button on Catalog and Card notes'
type: 'feature'
created: '2026-11-18'
status: 'in-review'
baseline_revision: '928b5789aa8279bd030d2aea7f7bcf28d5139279'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-back-to-top-button.md'
  - '{project-root}/AGENTS.md'
warnings: [oversized]
deferred:
  - summary: >-
      Spine drift (Structural Seed `frontend/src/lib/`, AD-6), reconciled before the next epic: the Seed's lib/ listing doesn't name `motion` (the shared prefersReducedMotion).
    evidence: |-
      frontend/src/lib/motion.ts is new; ARCHITECTURE-SPINE.md Structural Seed lib/ line lists every client lib module by name (Spine Check).
    location: >-
      frontend/src/lib/motion.ts
    severity: low
  - summary: >-
      Spine drift (Capability map, AD-6), reconciled before the next epic: the Catalog (FR-4, FR-20, FR-24) and Card notes (FR-17 to FR-19) rows and the Seed's components line don't name `components/BackToTop`.
    evidence: |-
      frontend/src/components/BackToTop.tsx mounted in CatalogPage.tsx and CardNotesPage.tsx; ARCHITECTURE-SPINE.md Capability map rows list each surface's components (Spine Check).
    location: >-
      frontend/src/components/BackToTop.tsx
    severity: low
---

<intent-contract>

## Intent

**Problem:** Catalog (about 500 Books: about 15 bookcase rows at 1280px, longer in List and Tiles) and Card notes are long pages. Mouse and trackpad users have no quick way back to the search field, filter chips and sort at the top. The Home key helps only keyboard users, and only while focus isn't in the bookcase (whose roving focus takes Home).

**Approach:** One `BackToTop` component, mounted by the Catalog page and the Card notes page, each passing a ref to its search field. It shows a fixed button, an up arrow plus the words "Back to top", in the bottom-right corner once the page is scrolled more than one window height. Pressing it scrolls to the top (smooth, instant under reduced motion) and moves focus to the page's search field. Source: `docs/ideas.md` → "Back to top button"; party-mode session 2026-11-18 with Oleg.

Oleg's decisions (2026-11-18):
- **D1** On Catalog **and** Card notes, not in the app shell and not on other pages.
- **D2** After a press, focus goes to the page's search field ("Search titles" / "Search card notes").
- **D3** Smooth scroll; an instant jump under `prefers-reduced-motion: reduce`.
- **D4** The button shows an up arrow (`aria-hidden`) plus the visible text "Back to top", which is its accessible name. Not an icon-only circle.
- **D5** A standalone pipeline spec, not an epic. No new FR.

## Boundaries & Constraints

**Always:**
- Shown when `window.scrollY` is greater than `window.innerHeight`; otherwise not rendered or `hidden`, so it is never a Tab stop or an accessible node while invisible. Re-evaluated on scroll (passive listener, at most once per animation frame) and on resize.
- Works the same in all three Catalog views (Bookcase, List, Tiles) and with a search or filter active.
- In DOM order it comes after the page's content, so it is the last Tab stop of `main`.
- Focus moves with `focus({ preventScroll: true })`, so the focus call never cuts the smooth scroll short. The search field keeps its text; nothing is cleared.
- A secondary-button look (DESIGN.md `button-secondary`), with the existing focus ring. Light and dark from tokens, and forced-colors keeps a visible border.
- At the very bottom of the page the button covers no Book, row, tile, card note or control: the page leaves room for it below its content.
- DESIGN.md gets a "Back to top button" component entry and EXPERIENCE.md a row in its component table, both matching what ships.

**Never:**
- No announcement in the live regions (the focus move is the feedback).
- No keyboard shortcut, no change to the Home key or to the bookcase's roving focus.
- Not on Home, Stats, Backup or Book detail. No app-shell change.
- Not shown above an open side panel or dialog (the page behind them is inert and covered).
- No workaround for Safari or Firefox behavior (AGENTS.md → Supported browser).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Top of page | Catalog with many Books, `scrollY = 0` | No button | N/A |
| Scrolled past one window | `scrollY > innerHeight` | Button "Back to top" visible bottom-right | N/A |
| Back near the top | Scrolled down, then up to `scrollY <= innerHeight` | Button hidden again | N/A |
| Short page | Catalog or Card notes shorter than two windows, scrolled to the bottom | Button never shows | N/A |
| Press | Button clicked, or Enter/Space on it | Page scrolls to the top; focus on the search field, its text kept | N/A |
| Reduced motion | `prefers-reduced-motion: reduce`, press | Page jumps to the top instantly; same focus | N/A |
| Resize | Window made taller so `scrollY <= innerHeight` | Button hides without a scroll | N/A |
| Empty pages | Empty catalog, or Card notes with no notes | No search field and no long page; no button, no error | N/A |

</intent-contract>

## Code Map

- `frontend/e2e/back-to-top.spec.ts` -- the 9 red ATDD leaves (`test.skip`), one per AC; un-skip one at a time. The checklist's "Contract the Scaffolds Pin" is binding.
- `frontend/e2e/back-to-top.ts` -- the leaves' seeds and helpers (`backToTop`, `scrollToY`, `pressAndSample`, `coveredBy`); probed, don't change them without re-probing (checklist → Helper probes).
- `frontend/src/pages/CatalogPage.tsx:165` -- `searchRef`, already passed to `SearchTitles` as `inputRef` (`:333`). The page renders `.page` with heading, toolbar, chips, pace row, then Bookcase / CatalogList / CatalogTiles (`:351-378`) and the New book panel (`:379`); the button goes last, after the panel.
- `frontend/src/pages/CatalogPage.tsx:93-95` -- local `prefersReducedMotion()`, one of three copies.
- `frontend/src/lib/usePileFlow.tsx:32-34` -- `scrollBehavior()` built on the same `matchMedia` query (second copy).
- `frontend/src/lib/useFinishMoment.ts:34-36` -- `prefersReducedMotion()` (third copy).
- `frontend/src/pages/CardNotesPage.tsx:282` -- `<SearchTitles label={SEARCH_CARD_NOTES} … />` with no ref yet; it shows only when there are notes (`groups.length > 0`). The ready branch ends with `{addPanel}{editPanel}{pile}` (`:313-315`); `CardNotesFrame` (`:325-333`) wraps it in `.page`.
- `frontend/src/pages/SearchTitles.tsx:8,18,38` -- already accepts `inputRef` and forwards it to the input.
- `frontend/src/components/Button.tsx` + `Button.module.css` -- the `secondary` variant (`surface-inset`, `ink`, `--hairline` `input-border` border, `--button-height` 42px, `--radius-md`); reuse it for the button's look.
- `frontend/src/styles/base.css:6-9` -- the global `:focus-visible` outline (solid `accent`); nothing to add. `:72` has the reduced-motion block.
- `frontend/src/styles/tokens.css` -- read-only (AGENTS.md: copies DESIGN.md character for character). Use existing tokens only: `--button-height`, `--space-6`, `--space-page-x`, `--radius-md`. No new token.
- `frontend/src/pages/CatalogPage.module.css`, `CardNotesPage.module.css` -- `.page` is a flex column with `gap: var(--space-5)` and `padding: var(--space-page-top) var(--space-page-x)`.
- z-index in use: 1 (raised controls), 20 (`SpinePopover`, `MoreActionsMenu`). Modal panels and dialogs are `showModal()`, so they sit in the top layer above any z-index.
- `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md` -- frontmatter `components:` (`button-secondary` at line ~211, last entry `about-card`), the Components table (row order follows the page, e.g. after **Search field**), `### Forced colors` bullets.
- `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md` -- the Component Patterns table (`| Search field | Catalog; Card notes | …` at line ~137); the new row starts exactly `| Back to top |`.

## Tasks & Acceptance

**Execution:**
- `frontend/src/lib/motion.ts` -- new: `prefersReducedMotion(): boolean` (the shared `matchMedia('(prefers-reduced-motion: reduce)')` read). Replace the three copies in `CatalogPage.tsx`, `useFinishMoment.ts` and `usePileFlow.tsx` (keep `usePileFlow`'s `scrollBehavior()` but build it on the helper) -- one helper instead of a fourth copy (spec Design Notes).
- `frontend/src/components/BackToTop.tsx` + `BackToTop.module.css` -- new: props `{ targetRef: RefObject<HTMLElement | null> }`. State `shown` = `window.scrollY > window.innerHeight`, recomputed on `scroll` (passive) and `resize`, at most once per animation frame, and once on mount; listeners removed on unmount. Always renders an empty `aria-hidden` spacer block of `--button-height` height (so the page's end leaves room for the button, AC-7); renders the `Button` (`variant="secondary"`) only while `shown`, `position: fixed`, `right: var(--space-page-x)`, `bottom: var(--space-6)`, `z-index: 10`, content `<span aria-hidden="true">↑</span> Back to top` (accessible name exactly "Back to top"). On click: `window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'instant' : 'smooth' })`, then `targetRef.current?.focus({ preventScroll: true })`; when the ref is empty, focus `main h1` the same way instead, so focus never falls to `body`. No announcement.
- `frontend/src/pages/CatalogPage.tsx` -- render `<BackToTop targetRef={searchRef} />` as the last child of `.page` in the non-empty, ready render (not in the empty shelf, which has no search field).
- `frontend/src/pages/CardNotesPage.tsx` -- add a `searchRef`, pass it to the page's `SearchTitles` as `inputRef`, and render `<BackToTop targetRef={searchRef} />` after `{pile}` in the branch that has notes (`groups.length > 0`).
- `DESIGN.md` -- frontmatter `components:` gets `back-to-top:` (background `{colors.surface-inset}`, foreground `{colors.ink}`, border `1px solid {colors.input-border}`, radius `{rounded.md}`, height 42px, offset-bottom `{spacing.6}`, offset-right `{spacing.page-x}`, glyph `↑` `aria-hidden`); a **Back to top** row in the Components table (look, placement, flat: no shadow, the border separates it from the content scrolling under it); a Forced colors bullet (a native button: system button colors, border kept).
- `EXPERIENCE.md` -- a Component Patterns row `| Back to top | Catalog; Card notes | … |`: shown past one window height, hidden otherwise (not a Tab stop), last Tab stop of `main`, press scrolls to the top (smooth; instant under reduced motion) and focuses Search titles / Search card notes keeping the text, no announcement, not on other pages, room left at the page's end.
- `frontend/e2e/back-to-top.spec.ts` -- un-skip all 9 leaves (remove each RED comment); change an assertion only if it is wrong about the spec, and record why in the checklist.

**Acceptance Criteria:**
- **AC-1** Given the Catalog with enough Books to scroll more than two window heights (in Bookcase, List and Tiles), when the page is at the top, then there is no "Back to top" button; when it is scrolled more than one window height, then a button named "Back to top" with the visible text "Back to top" is shown fixed in the bottom-right corner; when it is scrolled back to within one window height of the top, then it is hidden again.
- **AC-2** Given the button is shown on Catalog, when it is pressed (click, Enter or Space), then the page scrolls to `scrollY = 0` and focus is on "Search titles", which keeps any typed search text.
- **AC-3** Given Card notes with enough notes to scroll more than two window heights, when it is scrolled and the button pressed, then the button behaves as in AC-1 and AC-2, and focus lands on "Search card notes".
- **AC-4** Given `prefers-reduced-motion: reduce`, when the button is pressed, then the page reaches the top without a smooth animation (instantly); given no preference, when it is pressed, then the scroll is smooth and still ends at the top with focus on the search field.
- **AC-5** Given a Catalog or Card notes page shorter than two window heights, when it is scrolled to the bottom, then the button never shows.
- **AC-6** Given the button is hidden, then it isn't focusable and isn't in the accessibility tree; given it is shown, when it gets keyboard focus, then it is the last Tab stop inside `main` and shows the focus ring.
- **AC-7** Given the page is scrolled to its very bottom, when the button shows, then it doesn't overlap the last Book (spine, row or tile), the last card note, or any control.
- **AC-8** Given Home, Stats, Backup or Book detail, when scrolled down, then no "Back to top" button is rendered there.
- **AC-9** Given the shipped button, when DESIGN.md and EXPERIENCE.md are read, then they describe it (look, placement, threshold, focus target, reduced motion) as it ships, and `npm run check` passes.

## Spec Change Log

## Review Triage Log

### 2026-11-18 — Review pass
- verdicts: 26 findings — high 0, medium 5, low 15, false 6, maybe-false 0
- findings:
  - `low` `defer` Spine Check: Seed lib/ listing doesn't name `motion` — spine drift (AD-6); code right, spine out of date; deferred to deferred-work.md.
  - `low` `defer` Spine Check: Capability map Catalog and Card notes rows (and Seed components line) don't name `BackToTop` — spine drift (AD-6); deferred to deferred-work.md.
  - `medium` `patch` Verification Gap: the Card notes half of the empty-pages AC-5 leaf is vacuous — measured: an empty Card notes page scrolls 0 at 200px and 57 at 120px, so it never passes one window; patched: the leaf appends a 3000px block to `main` and asserts scrollY > 200 before the absence.
  - `low` `patch` Verification Gap: no test isolates the resize listener (AC-5's resize clamps scrollY, which fires `scroll`) — patched: AC-1 ends with a 720→1200px resize that keeps scrollY 1080 (asserted) and hides the button, then back to 720 shows it.
  - `low` `reject` Intent Alignment: "not shown above an open side panel or dialog" has no test — every panel and dialog is `showModal()`, so the top layer covers a z-index 10 element; already a green-phase follow-up for automate in the checklist.
  - `low` `reject` Intent Alignment: "works with a filter active" untested (only search) — the threshold reads window scroll only, independent of filters; already a checklist follow-up for automate.
  - `low` `reject` Intent Alignment: dark mode and forced colors not rendered in a test — tokens and a native button; already checklist follow-ups for automate.
  - `false` `reject` Intent Alignment: "no announcement" not asserted — BackToTop.tsx imports nothing from lib/announce.ts and calls no announce; there is nothing to announce.
  - `false` `reject` Intent Alignment: passive/once-per-frame/preventScroll are mechanism items not observable in tests — not a defect; the code has them and AC-4 exercises preventScroll's effect.
  - `false` `reject` Intent Alignment: no regression test for the Home key and roving focus — the diff doesn't touch Bookcase or its key handling; the existing bookcase suites passed in this run's `npm run check`.
  - `low` `reject` Intent Alignment: the `main h1` focus fallback goes beyond D2 — the spec's Tasks ask for it so focus never falls to body; unreachable today and harmless.
  - `false` `reject` Intent Alignment: the `?book=` scoped Card notes view gets the button with no intent coverage — the scoped view is the Card notes page (same route and component), which D1 includes.
  - `false` `reject` Intent Alignment: AC-6 was re-sequenced around Shift+Tab landing on the roving spine at the top — that is the bookcase's existing roving behavior, unchanged by this diff; the assertions are the same, recorded in the checklist.
  - `low` `reject` Intent Alignment: docs are checked by presence, not content — the prose was read in this review against the code (spacer, z-index, offsets, focus) and matches; a content test would duplicate the docs.
  - `medium` `patch` Edge Case Hunter: a keyboard-focused button that hides on Home/PageUp/wheel drops focus to body — patched: before hiding while focused, focus moves to the press's target (preventScroll); AC-6 gains a Home-key step; EXPERIENCE.md row says so.
  - `medium` `patch` Edge Case Hunter: the Card notes half of the empty-pages leaf can pass vacuously — same root cause and fix as the Verification Gap row above.
  - `false` `reject` Blind Hunter: the spec is left out of the diff and its approved intent was edited — the spec is the claims file, excluded from the diff by design; the intent text was carried over verbatim (only the wrapper tag became the template's `<intent-contract>`), and the ACs were never inside it.
  - `medium` `patch` Blind Hunter: a focused button vanishing drops focus to body — same as the Edge Case Hunter row; patched there.
  - `medium` `patch` Blind Hunter: the Card notes half of the empty-pages leaf is vacuous — same as the Verification Gap row; patched there.
  - `low` `patch` Blind Hunter: the added 10th leaf isn't in the checklist, which still says 9 — patched: counts are 10 and "Changed during the build" records the empty-pages leaf, the AC-6 Home step and the AC-1 resize step.
  - `low` `patch` Blind Hunter: the spacer clears the button only with `.page`'s padding and gap from another module — patched: the `.spacer` comment states the dependency (24 + 42 + 20 = 86px); AC-7 also fails if it breaks.
  - `low` `reject` Blind Hunter: BackToTop uses `'instant'` while usePileFlow uses `'auto'` under reduced motion — base.css:81 forces `scroll-behavior: auto` under reduced motion, so both are instant; no user-visible difference, and unifying the value adds an API for no outcome.
  - `low` `reject` Blind Hunter: the `main h1` fallback is unreachable and undocumented — the spec's Tasks require it and the component's doc comment and EXPERIENCE.md row now name it; removing it would contradict the spec.
  - `low` `patch` Blind Hunter: the AC-5 resize step doesn't test the resize listener — same root cause as the Verification Gap resize row; patched there.
  - `low` `patch` Blind Hunter: DESIGN.md doesn't say popovers and menus (z-index 20) sit above the button — patched: the Components row names the spine popover and More actions menu.
  - `low` `patch` Blind Hunter: frontmatter `glyph: '↑ (aria-hidden)'` mixes an a11y note into a style value — patched: `glyph: '↑'`.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").
- **The spacer.** The button is fixed `--space-6` (24px) above the viewport's bottom; `.page`'s bottom padding is 24px and its flex `gap` 20px. A 42px spacer at the end of `.page` puts the last content 24 + 42 + 20 = 86px above the page's end, clear of the button's 24–66px band, so nothing is covered at the very bottom. It also keeps the pages' height stable whether the button shows or not.
- **Focus without cutting the scroll short.** `focus({ preventScroll: true })` right after `scrollTo`; a plain `focus()` would jump to the field and end the smooth animation (party session, Winston). The probe found that Chromium's smooth scroll hasn't moved one frame after it starts; AC-4 relies on that, and a jump fails it.
- **Why not the app shell.** Only two pages have a search field to return to (D1); a page-mounted component with a `targetRef` keeps the shell untouched and lets each page say what "top" means.
- **Card notes' Book detail block** has its own Search card notes, but Book detail gets no button (AC-8).

## Verification

**Commands:**
- `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/back-to-top.spec.ts` -- expected: 9 passed, 0 skipped.
- `npm run check` -- expected: passes (formatters, lint, types, unit and full e2e).

## Auto Run Result

Status: in-review

**Summary.** A `BackToTop` component, mounted last on Catalog (non-empty) and Card notes (with notes), shows a fixed "↑ Back to top" `button-secondary` in the bottom-right corner while `scrollY > innerHeight`. A press scrolls to the top (smooth; instant under reduced motion) and focuses the page's search field with `preventScroll`. If it is about to hide while focused, focus moves to the same target first. An `aria-hidden` spacer ends the page so nothing is covered at the bottom. The three `matchMedia` reduced-motion copies became one `lib/motion.ts`.

**Files changed:**
- `frontend/src/components/BackToTop.tsx`, `BackToTop.module.css` -- the component: threshold, fixed placement, press, focus on hide, spacer.
- `frontend/src/lib/motion.ts` -- shared `prefersReducedMotion()`.
- `frontend/src/pages/CatalogPage.tsx` -- mounts it with `searchRef`; uses the shared helper.
- `frontend/src/pages/CardNotesPage.tsx` -- a `searchRef` for Search card notes; mounts it when there are notes.
- `frontend/src/lib/useFinishMoment.ts`, `frontend/src/lib/usePileFlow.tsx` -- use the shared helper.
- `frontend/e2e/back-to-top.spec.ts` -- 9 ATDD leaves un-skipped (AC-6 re-sequenced), a 10th leaf for the "Empty pages" matrix row, a resize step (AC-1) and a Home-key focus step (AC-6) from review.
- `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md` -- `back-to-top` component, Components row, Forced colors bullet.
- `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md` -- Back to top row.
- `_bmad-output/test-artifacts/atdd-checklist-back-to-top-button.md` -- implementation boxes ticked, "Changed during the build".
- `_bmad-output/implementation-artifacts/deferred-work.md` -- two spine-drift entries.

**Review findings.** 26 findings (high 0, medium 5, low 15, false 6). Patched: 5 medium rows in 2 entries (focus falling to `body` when the focused button hides; the vacuous Card notes half of the empty-pages leaf) and 7 low rows in 5 entries (resize test, checklist counts, spacer comment, DESIGN.md z-index note, `glyph` value). Deferred: 2 low spine-drift entries (AD-6: Seed `lib/motion`, Capability map `BackToTop`). Rejected: 6 false (no-announce not asserted, mechanism items, Home-key regression, scoped Card notes view, AC-6 re-sequencing, spec excluded from diff) and 7 low (side panel, filters, dark/forced colors, `h1` fallback beyond D2, docs checked by presence, `'instant'` vs `'auto'`, unreachable fallback), each with its reason in the Review Triage Log.

**Follow-up review recommendation:** true (two medium entries patched on a first pass). The named risk: the focus-on-hide behavior was added in review. A focused button that hides on Home, PageUp or the wheel now moves focus to the search field. The spec's intent doesn't state this, and only AC-6's Home-key step covers it; the code review should confirm it's the right call over keeping the button rendered while focused.

**Verification.** `TZ=Europe/Madrid npm run check` passed twice, re-run by this run, not taken from the implementer: before review (792 e2e passed) and after the patches (exit 0; ruff, pytest with the coverage gate, build, 793 e2e passed including all 10 `back-to-top.spec.ts` leaves, smoke ok). `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/back-to-top.spec.ts`: 10 passed. Matrix audit: every I/O row has a running, passing test (Empty pages added in this run). A probe measured the empty Card notes page's scroll (0 at 200px, 57 at 120px).

**Residual risks.** oxlint warns `react(set-state-in-effect)` on the mount-time `setShown` in `BackToTop.tsx` (a warning, not an error; the `useState` initializer already computes it). Dark mode, forced colors, filters, the scoped Card notes view and side-panel covering are untested, listed as automate follow-ups in the checklist.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
