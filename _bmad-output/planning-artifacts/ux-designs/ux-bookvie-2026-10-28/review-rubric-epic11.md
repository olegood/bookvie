# Spine Pair Review — bookvie, Epic 11 update (rubric walker)

Scope: the uncommitted Epic 11 changes to `DESIGN.md` and `EXPERIENCE.md` (favicon, dev amber, DEV pill, tab title, update notice, About this copy, Flows 11 and 12), checked against `dev-prod-favicon-plan-2026-11-17.md` D1–D12 and the decisions in `.memlog.md` (2026-11-17). Oleg's picks (F3, amber C, P1, N1 without dismiss, B1, `~` data folder) and the component-literal amber are treated as settled. Desktop Chrome only.

## Overall verdict

The update is solid and usable by the stories: all plan decisions D6–D12 are covered, every new token reference resolves, and every stated contrast number recomputes exactly. There are no critical or high findings. The medium findings are behavioral gaps that an ATDD would hit: what "app-info failed" means after an earlier success, what the notice does when the server version changes again, two Do/Don't rows that the DEV pill now contradicts, the favicon's color-scheme assumption, and how the one-time announcement shares the single status region.

## 1. Flow coverage — strong

Checked: D6–D12 map to Flow 11 (dev and production side by side, D1/D2 failure path) and Flow 12 (stale tab, D11/D12). Both have a protagonist, numbered steps, a climax and a failure path. D1–D5 are server-side and only surface through these flows, as intended. FR-26/FR-27 are intentionally not in the PRD yet (stated in IA).

### Findings
- **low** Flow 11 step 5 quotes About this copy as one line ("bookvie 1.1.0 (a1b2c3d) · Development server · Data folder: ~/bookvie-data-dev"), but the component (DESIGN.md → About this copy; EXPERIENCE.md → Component Patterns → About this copy) is two lines, with "Data folder:" on its own line. An e2e written from the flow would assert the wrong text (EXPERIENCE.md → Flow 11, step 5). *Fix:* write it as the card shows it: "…says "bookvie 1.1.0 (a1b2c3d) · Development server" and, below, "Data folder: ~/bookvie-data-dev"."
- **low** The IA Pages table's Backup row lists Journeys "Flows 7, 8, 11", but Flow 12's climax also lands on Backup (About this copy reads "bookvie 1.2.0") (EXPERIENCE.md → Information Architecture → Pages). *Fix:* "Flows 7, 8, 11, 12".

## 2. Token completeness — strong

Checked: `components.favicon`, `dev-pill`, `update-notice`, `about-card` and every `{…}` reference in the new prose. All resolve (`colors.accent`, `accent-dark`, `surface`, `line`, `ink`, `ink-secondary`, `ink-tertiary`, `typography.section-label`, `body-sm`, `rounded.sm`, `spacing.2`, `spacing.4`, `spacing.page-x`). Dev amber literals have light and dark values (by design, not in `colors`). Recomputed WCAG ratios, all match the spine: "DEV" on pill 5.64 / 10.34; pill vs `surface-inset` 5.36 / 9.83; dev favicon vs `#DEE1E6` / `#202124` 4.30 / 9.61; sage favicon vs same 4.16 / 7.13. Update notice and About card reuse pairs already listed (`ink` on `surface` 13.75 / 12.89, `ink-secondary` on `surface` 6.13 / 7.61, `ink-tertiary` on `surface` 5.59 / 5.68, `input-border` vs `surface` 3.80 / 3.53).

### Findings
- **medium** The favicon contrast rows assume the tab strip's scheme always matches the SVG's `prefers-color-scheme`, and the prose asserts "the tab strip belongs to Chrome, which follows the OS too" (DESIGN.md → Components → Favicon, last bullet; Colors → Dev amber, contrast table). Chrome has its own Appearance → Mode setting (Light / Dark / Device). If the strip and the SVG's scheme ever disagree, the favicon fails badly: light fills on the dark strip `#202124` give 2.95 (sage) and 2.85 (amber); dark fills on the light strip `#DEE1E6` give 1.72 (`accent-dark`) and 1.28 (`#EBC27A`). Also missing: the active tab's background (`#FFFFFF` light, `#35363A` dark), which is where the favicon sits while Oleg is using the tab; recomputed those pass: 5.46 sage / 5.64 amber light, 5.34 `accent-dark` / 7.20 `#EBC27A` dark. *Fix:* reword the bullet to "follows Chrome's color scheme (Device by default, which is the OS)", state that a Chrome mode set apart from the favicon's scheme is not designed for, and add an active-tab row: "Favicon vs Chrome's active tab (`#FFFFFF` / `#35363A`): sage 5.46 / 5.34, dev 5.64 / 7.20". Story 11.1 should check by hand once in Chrome with Mode = Dark on a light OS to confirm which scheme the SVG gets.
- **low** The pill's height can't be derived: `section-label` has no `lineHeight`, so "4px 7px" padding gives a height that depends on the browser's `normal` line height (DESIGN.md → `components.dev-pill`). Likewise the "compact (30px) `button-secondary`" Reload has a height but no horizontal padding or text token, and `button-secondary` defines neither (DESIGN.md → `components.update-notice`, Update notice row). *Fix:* add `line-height: 1` (or `12px`) to `dev-pill`, and `button-padding: '0 {spacing.3}'` plus `button-text: '{typography.body-sm}'` to `update-notice` (the mock uses `0 12px`, 14px).

## 3. Component coverage — adequate

Checked: DEV pill, Update notice, About this copy and Favicon have both a DESIGN.md visual row and an EXPERIENCE.md behavioral row. Tab title has only a behavioral row, which is fine: it has no visual spec.

### Findings
- **medium** Two existing Do/Don't rows now contradict the DEV pill (DESIGN.md → Do's and Don'ts): "Keep color for the books; chrome stays neutral | Color chrome, headings, or status badges", and "Muted text for status facts… | Red, orange, warning icons, or alarm styling anywhere". The DEV pill is a colored status badge in the chrome, and `#8C5E0E` reads as dark orange. The new amber row says where amber may go, but the older rows still say "anywhere", and a review layer checking a story against Do/Don't could reject the pill. *Fix:* add the exception to both rows, for example "Color chrome, headings, or status badges (the dev-only DEV pill is the one exception)" and "Red, orange, warning icons, or alarm styling anywhere (dev amber on the dev favicon and DEV pill is not a warning)".
- **low** About this copy's heading element isn't specified: EXPERIENCE says "a `section` labelled by its visible heading", DESIGN shows the text in `section-label`, but neither gives the level. The Export and Restore cards have no headings, so nothing nearby sets the level (EXPERIENCE.md → Component Patterns → About this copy). *Fix:* "an `h2` "About this copy" (set in uppercase by CSS), which labels the `section`".
- **low** The parts of line 1 are joined by "the 6px `ink-tertiary` dot of the Re-entry line" (a drawn element), while EXPERIENCE writes them with a " · " character. The accessible text and the e2e assertion depend on which one it is (DESIGN.md → About this copy; EXPERIENCE.md → About this copy). *Fix:* say which, as the Re-entry line does, for example "the dot is decorative (`aria-hidden`); the text reads "bookvie 1.1.0 (a1b2c3d), Development server"", or keep a literal " · " and drop the dot reference.
- **low** "A screen reader reads it as part of the wordmark ("bookvie DEV")" depends on whitespace between "bookvie" and the pill's element: with the `{spacing.2}` gap done in CSS and no text space, Chrome joins adjacent inline spans as "bookvieDEV" (EXPERIENCE.md → Component Patterns → DEV pill). *Fix:* "a space separates the word and the pill in the DOM; the `{spacing.2}` gap is the visual spacing".

## 4. State coverage — thin

Checked per new surface: app-info loading, failed before first success, failed after success; commit null; versions equal, differ, rollback, change again, return to equal; route change; refetch on focus; open modal; scrolled page; dev-mode first paint.

### Findings
- **medium** The State Patterns row "`app-info` loading or failed | … The header and title look like production, no update notice, no About this copy card" contradicts the Update notice row ("never hides one already shown (the last data stays, Foundation)") for the failed-after-success case. Read literally, a dev tab whose refetch fails (server restarting) drops its DEV pill and `DEV · ` prefix, which is the exact moment a wrong tab is likeliest (EXPERIENCE.md → State Patterns; Component Patterns → DEV pill, Tab title, Update notice). *Fix:* split the row: "`app-info` not yet loaded, or never loaded: … looks like production…" and "`app-info` refetch fails after a success: everything keeps the last data (DEV pill, `DEV · ` title, notice, About card); nothing says it failed."
- **medium** The notice's behavior when the server version changes after it has shown is undefined. "No dismiss: it stays on every route until the tab reloads" and "When the versions are equal it never shows" conflict when a refetch returns the bundle's own version again (Oleg rolls back, or reinstalls the build the tab has). It's also unstated whether the visible sentence updates when a third version arrives; only the announcement rule covers that (EXPERIENCE.md → Component Patterns → Update notice; Accessibility Floor → Live regions). *Fix:* "The notice follows the last successful `app-info`: it shows while the server version differs from the bundle's, its sentence names the latest server version, and it hides if a refetch finds the versions equal again. A failed fetch changes nothing."
- **low** Clicking **Reload** loses anything typed and not yet saved outside a modal (for example the Home page field), with no confirm. Flow 12 step 4 has Oleg save first, so the intent seems to be "no guard", but the spine doesn't say so (modal panels make the notice inert, so they are safe) (EXPERIENCE.md → Update notice). *Fix:* add "Reload doesn't ask; text typed and not saved on the page is lost, as with the browser's own reload."
- **low** The band isn't sticky and pushes the page down when it appears. A user scrolled down the Catalog won't see it until scrolling up, and Flow 12 step 4 says "the notice doesn't move… anything", while DESIGN.md Layout says it pushes the page down (EXPERIENCE.md → Flow 12 step 4; DESIGN.md → Layout & Spacing → Update notice). *Fix:* reword step 4 to "the notice doesn't block anything", and state in the Update notice row that it scrolls with the page, so a scrolled-down tab learns of it from the announcement and sees it at the top.
- **low** The DEV pill appears only after `app-info` loads, so in dev the nav items shift right by the pill's width on every page load (DESIGN.md → Top nav; EXPERIENCE.md → DEV pill). Dev-only and acceptable, but undecided. *Fix:* state "the nav shifts once when the pill appears; accepted, dev only", or render the pill's space only in dev.
- **low** The About card's data folder has no rule for a path outside the home folder (e2e temp dirs on macOS are under `/var/folders/…`) or for a path too long for the card (DESIGN.md → About this copy). *Fix:* "a folder outside the home folder is shown in full; a long path wraps anywhere (`overflow-wrap: anywhere`), never truncated."
- **low** State row name "Dev server, production page" reads like a dev server serving a production page (EXPERIENCE.md → State Patterns). *Fix:* rename to "Dev server vs production server".
- **low** The favicon is served at the same URL by mode, and Chrome caches favicons hard. A dev server started with an explicit `--port 8765` (allowed by D1) on an origin that previously served production can show the stale sage icon, so "right from the first paint" isn't guaranteed (EXPERIENCE.md → Component Patterns → Favicon). *Fix:* note for architecture (plan step 4): `/favicon.svg` is served with `Cache-Control: no-cache`; or accept the explicit-port case in the row.

## 5. Visual reference coverage — adequate

Checked: `mockups/epic11-options.html` is linked once, from DESIGN.md → Favicon (option F3). It also holds the chosen P1 pill, N1 notice and B1 card, plus rejected options.

### Findings
- **low** The DEV pill, Update notice and About this copy rows don't link the mock or name the chosen option, and the mock differs from the spine in two places: the pill is 11px/700 there (the spine uses `section-label`, 12px/600, per memlog), and its B-section note gives production as one line, "bookvie 1.1.0 · Data folder: ~/bookvie-data" (DESIGN.md → Components). *Fix:* add "Mock: [epic11-options](mockups/epic11-options.html), option P1 / N1 / B1" to the three rows, and one sentence: "The mock's 11px/700 pill text and one-line production About text are superseded; the other options there were rejected."

## 6. Bloat & overspecification — strong

The favicon geometry, with its literal path, is justified: it's the asset itself, and I checked that it matches the stated sizes (8/16, 8/22, 7/14, 1.5 gaps, a 30×4 plank 1 unit below). No source restatement beyond the one-line FR-26/27 note.

## 7. Inheritance discipline — adequate

`sources` gains the plan. Component names are consistent across both files (DEV pill, Update notice, About this copy, Favicon, Tab title). The plan's D7 token names (`dev-mark`) and D9's placement "under 'Last export'" are superseded by memlog decisions (component literals; third card B1).

### Findings
- **low** Plan D9 and Story 11.3 say the block goes "under 'Last export'" in the Export card. The spine's third card (B1) supersedes this, but nothing in the spine says so, and a builder reading the plan's story cut may follow it (DESIGN.md → Backup page / About this copy). *Fix:* add to the About this copy row: "(supersedes plan D9's placement under "Last export")".
- **low** Foundation says "Production looks exactly as before Epic 11, apart from the favicon and the About this copy card", but production also shows the update notice on a stale tab (EXPERIENCE.md → Foundation → Production and development). *Fix:* "…apart from the favicon, the About this copy card and, on a stale tab, the update notice."

## 8. Shape fit — strong

DESIGN.md's Dev amber and Forced colors sit under Colors, and Favicon sits under Components, in canonical order. EXPERIENCE.md's additions are in their default sections. Two smaller gaps:

### Findings
- **medium** The one-time announcement shares the shell's only polite `status` region with every outcome, and the Live regions rules empty both regions "before every save attempt and when a panel or dialog opens". The notice usually appears on window focus, often right before Oleg acts (Flow 12 step 4 saves a page), or with a route change whose own message follows focus settling. A save or a panel opened within the ~100 ms tick overwrites or empties the notice's sentence, and because it is "announced once", it's never heard (EXPERIENCE.md → Accessibility Floor → Live regions). *Fix:* add "The notice's sentence follows the same tick. If an outcome message replaces it before it has been set, the notice counts as not yet announced and is announced with the next quiet tick", or accept the loss explicitly ("an outcome always wins; the visible notice and its Reload button stay").
- **low** The Keyboard rule still reads "Tab order follows reading order: top nav → page content", and the notice sits between `header` and `main`, outside every landmark, so landmark navigation can't reach it (EXPERIENCE.md → Accessibility Floor → Keyboard; Update notice row). axe's `region` rule is best-practice and not in the suite's `AXE_TAGS`, so tests won't catch it. *Fix:* "top nav → update notice (when shown) → page content", and decide whether the notice is a `role="region"` named "Update" (findable by landmark) or deliberately not a landmark.

## Mechanical notes

- All new `{…}` references resolve. `components.favicon.fill`, `.fill-dark`, `.dev-fill` and `.dev-fill-dark` are referenced by path and exist.
- All four contrast rows recompute to the stated values (WCAG 2.x relative luminance).
- The favicon path matches the stated geometry.
- Names are consistent: "DEV pill", "Update notice", "About this copy", "Favicon", "Tab title", "dev amber" / "On dev amber" (DESIGN table) vs "on-dev-amber" (pill prose). That last one is a minor spelling variance and harmless.
- `updated:` was bumped in both spines and in `.memlog.md`.

Counts: 0 critical, 0 high, 5 medium, 16 low.
