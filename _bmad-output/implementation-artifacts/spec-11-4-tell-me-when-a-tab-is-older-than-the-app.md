---
title: 'Story 11.4: Tell me when a tab is older than the app'
type: 'feature'
created: '2026-11-17'
baseline_revision: '1795079f6a1d81c4dd7a5ed87875c574afc387b2'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-11-4-tell-me-when-a-tab-is-older-than-the-app.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-11-context.md'
warnings: [oversized]
deferred:
  - summary: >-
      Spine drift (AD-7, "App info is an ordinary view"), reconciled before the next epic: the line still reads "(Epic 11, planned)"; Story 11.4 built the version comparison and update notice on `useAppInfo`, and its once-per-new-version `status` announcement (skipped while another message waits for its tick, `isAnnouncing()`) is not in the bullet.
    evidence: |-
      frontend/src/components/UpdateNotice.tsx, frontend/src/lib/updateNotice.ts, frontend/src/lib/announce.ts (spine check).
    location: >-
      ARCHITECTURE-SPINE.md AD-7
    severity: low
  - summary: >-
      Spine drift (AD-8, "One version"), reconciled before the next epic: the bullet still reads "(Epic 11, planned)"; Story 11.4 bakes `__BOOKVIE_VERSION__` from frontend/package.json through a Vite `define` (declared in `src/globals.d.ts`) and `scripts/version.test.mjs` checks the four copies in `check:api`.
    evidence: |-
      frontend/vite.config.ts, frontend/src/globals.d.ts, frontend/scripts/version.test.mjs (spine check).
    location: >-
      ARCHITECTURE-SPINE.md AD-8
    severity: low
  - summary: >-
      Spine drift (AD-6, AD-7, AD-8, Capability → Architecture Map preamble and FR-27 row), reconciled before the next epic: after Story 11.4 nothing in FR-27 is planned, but the preamble still excepts FR-26 and FR-27 as "(Epic 11, planned)", and the row doesn't name `lib/updateNotice` or `components/UpdateNotice`.
    evidence: |-
      The whole Story 11.4 diff; extends the 11.3 entry for the same row (spine check).
    location: >-
      ARCHITECTURE-SPINE.md Capability → Architecture Map
    severity: low
  - summary: >-
      Spine drift (Structural Seed `frontend/src/lib/`), reconciled before the next epic: the Seed's `lib/` listing doesn't name `updateNotice` (the version comparison and the notice sentence).
    evidence: |-
      frontend/src/lib/updateNotice.ts (spine check).
    location: >-
      ARCHITECTURE-SPINE.md Structural Seed
    severity: low
  - summary: >-
      e2e version literals will flip meaning at the next version bump: `update-notice.spec.ts` uses NEWER = '1.2.0', and the Story 11.3 fixtures (`about-this-copy*.spec.ts`) fulfil '1.1.0' and '1.2.0' as fixed strings, so when release.sh sets 1.2.0 the "another version" leaves stop showing the notice (AC-3, AC-6 and the AC-2 witness fail) and the "same version" fixtures start showing it.
    evidence: |-
      frontend/e2e/update-notice.spec.ts:36-38 (ATDD constants, committed before this build's baseline); about-this-copy-automate.spec.ts:26-27, about-this-copy-dev.spec.ts:20,32, about-this-copy.spec.ts:110. Derive the differing versions from BUNDLE_VERSION (e2e/update-notice.ts) in the automate step. Blind Hunter, build-auto review of Story 11.4.
    location: >-
      frontend/e2e/update-notice.spec.ts:36
    severity: medium
---

<intent-contract>

## Intent

**Problem:** A tab left open across an update keeps running the old bundle against the new server, and nothing tells Oleg; the README asks him to hard-reload every tab by hand.

**Approach:** The bundle bakes its own version (frontend/package.json, through a Vite `define`). The shell compares it with the last successful `app-info.version` and, while they differ, shows a full-width `surface` band under the top nav, "bookvie was updated to X. Reload to use it." with a compact **Reload**, announced once per new server version through the polite `status` region. A `node:test` in `check:api` keeps the four version copies equal (AR34).

## Boundaries & Constraints

**Always:**
- One Vite `define` key, `__BOOKVIE_VERSION__`, whose value is `JSON.stringify(<frontend/package.json version>)` read from the file (never typed into `vite.config.ts`); declared `declare const __BOOKVIE_VERSION__: string` in exactly one `.d.ts` under `frontend/src`; read by app code.
- Shown while the last successful `app-info.version` !== the baked version (newer or older). Hidden while pending, never loaded, or equal. A failed refetch changes nothing (TanStack keeps `data`).
- The band is inside `header`, after the top bar (skip link, wordmark, nav, Theme group), not inside `nav`. One `p` whose whole text is `bookvie was updated to ${serverVersion}. Reload to use it.` (plain text, no `<em>`), then a `Button` (secondary) named "Reload". The band is the outermost element holding both and carries `surface` background, `var(--hairline) solid var(--color-line)` bottom border, `10px var(--space-page-x)` padding, `spacing.4` gap; static position, so it pushes `main` down. Sentence `body-sm`/`ink`. Reload 30px tall, `0 var(--space-3)` padding.
- Reload calls `window.location.reload()` at once.
- Announce `announce('status', sentence)` when the shown server version changes to a new differing value (first appearance, or a third version). Not on a same-version refetch, not on failure, not on hide. If another announcement is still pending in its tick (an intent just saved), the notice skips its announcement so it never clobbers the save's message (EXPERIENCE.md accepts a lost notice announcement).
- Forced colors: band border `CanvasText`; Reload keeps the system button colors.
- With no notice, the header renders exactly as before (64px bar with its own bottom hairline, nav indicator flush, skip link hidden off-screen).

**Never:** No `role`, `aria-live` or `<dialog>` on the notice or its parts; no icon, close/dismiss button, amber or accent fill; no `import.meta.env.DEV`; no `beforeunload` or confirm; no backend change; no `tokens.css` or spine edit; no edit to existing e2e specs except a story-caused fix in `about-this-copy-automate.spec.ts` "[P2] AC-4 a tab left open…" if the notice's announcement makes it flaky (name it in the summary); no localStorage key.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Same version | bundle 1.1.0, server 1.1.0 | no band, nothing announced | — |
| Newer server | server 1.2.0 | band "…updated to 1.2.0…", announced once | — |
| Older server | server 1.0.0 | band "…updated to 1.0.0…" | — |
| Same differing version again | 1.2.0 → 1.2.0 | no new announcement | — |
| Third version | 1.2.0 → 1.3.0 | sentence names 1.3.0, announced once | — |
| Back to bundle's | 1.2.0 → 1.1.0 | band hides | — |
| Pending / never loaded | no data | no band, nothing said | silent |
| Refetch fails | 500 after 1.2.0 | band stays, nothing announced | silent |

</intent-contract>

## Code Map

- `frontend/vite.config.ts` -- add `define`; read `./package.json` with `node:fs` (config is in `tsconfig.node.json`, `types: ["node"]`). Keep the version digits out of the file.
- `frontend/scripts/version.test.mjs` -- AC-1 leaf (`test.skip(` → `test(`); it resolves the build config and greps `src` for the `.d.ts` and a reader. Already in `check:api` (`node --test 'scripts/*.test.mjs'`).
- `frontend/tsconfig.app.json` -- `include: ["src"]` picks up a new `src/globals.d.ts`. `tsconfig.node.json` includes `src/**/*.test.ts`, so a `lib/` module tested by `node --test` must not reference the global (pass the bundle version in).
- `frontend/src/components/AppShell.tsx` + `.module.css` -- `header` is one flex row (`.header`: 64px, padding, bottom hairline, `surface-inset`); `.skip` is absolute against it. Move those rules to a new inner `div.bar` (with `position: relative`), make `header` a plain block wrapper, and render the notice after the bar.
- `frontend/src/components/Button.tsx` / `.module.css` -- `variant="secondary"` (`surface-inset` fill, `input-border`, 14px). `WaitingPane.module.css:117` `.compact` (30px, `0 var(--space-3)`, `flex: none`) is the compact recipe to copy.
- `frontend/src/api/views.ts:99` `useAppInfo()` -- `AppInfoView | undefined`; keeps data on failed refetch; refetched on focus and after intents.
- `frontend/src/lib/announce.ts:93` `announce(kind, text)` -- clears both regions and sets text after `ANNOUNCE_DELAY_MS`; module-level `pending` timer. `announce.test.ts` is its unit test.
- `frontend/src/lib/page.ts` + `page.test.ts` -- pattern for a pure helper with a `node:test` test.
- `frontend/e2e/update-notice.spec.ts` (9 leaves), `update-notice.ts` (helpers, read-only) -- red leaves to un-skip.
- `frontend/e2e/about-this-copy-automate.spec.ts` "[P2] AC-4 a tab left open…" -- fulfils `1.2.0` and reads `liveRegionText === ''` right after the refetch; re-check.
- `README.md:91` **Updating:** -- ends "…and hard-reload open tabs so the browser picks up the new bundle."
- Deferred-work intake:
  - `deferred-work.md:1055` (Spine drift AD-16 Capability map; "Stories 11.2 to 11.4's") -- not in this story: spine edits wait for the epic's reconciliation (AGENTS.md "Architecture spine").
  - `deferred-work.md:1064` (Spine drift AD-7; version comparison and update notice "planned for Stories 11.3 and 11.4") -- not in this story: same reason.
  - `deferred-work.md:1094` (Spine drift AD-6/AD-7; "leave only Story 11.4's version comparison and update notice planned") -- not in this story: same reason.

## Tasks & Acceptance

**Execution:**
- `frontend/vite.config.ts` -- `define: { __BOOKVIE_VERSION__: JSON.stringify(<package.json version>) }`, read via `readFileSync(new URL('./package.json', import.meta.url))` -- AC-1.
- `frontend/src/globals.d.ts` (new) -- `declare const __BOOKVIE_VERSION__: string` with a one-line comment -- AC-1.
- `frontend/scripts/version.test.mjs` -- un-skip the leaf, no other edit -- AC-1.
- `frontend/src/lib/updateNotice.ts` (new) -- pure `noticeVersion(bundle: string, server: string | undefined): string | undefined` (server version when defined and different, else undefined) and `noticeText(version)` -- AC-2, AC-3, AC-6.
- `frontend/src/lib/updateNotice.test.ts` (new) -- equal, newer, older, undefined, sentence text -- matrix.
- `frontend/src/lib/announce.ts` + `announce.test.ts` -- export `isAnnouncing(): boolean` (`pending !== undefined`), with a unit test (true inside the tick, false after it and after `clearAnnouncements`) -- AC-6.
- `frontend/src/components/UpdateNotice.tsx` + `.module.css` (new) -- reads `__BOOKVIE_VERSION__` and `useAppInfo()?.version`; `shown = noticeVersion(...)`; `useEffect` on `[shown]`: when defined and `!isAnnouncing()`, `announce('status', noticeText(shown))`; renders `null` or `div.band > p.sentence + Button.reload` (`onClick={() => window.location.reload()}`); CSS per Boundaries, forced-colors border `CanvasText` -- AC-3..AC-9.
- `frontend/src/components/AppShell.tsx` + `.module.css` -- wrap the existing header content in `div.bar` carrying the old `.header` rules plus `position: relative`; `header` becomes a block wrapper; render `<UpdateNotice />` after the bar; update the doc comment -- AC-3, AC-8.
- `README.md` -- Updating: replace "and hard-reload open tabs so the browser picks up the new bundle" with a line saying open tabs then show a notice with **Reload**; no other "hard-reload" left -- AC-10.
- `frontend/e2e/update-notice.spec.ts` -- `test.skip(` → `test(` on the 9 leaves, no other edit -- all.

**Acceptance Criteria:**
- Given the build, when the bundle is made, then one `define` bakes frontend/package.json's version, declared for `tsc -b`, and `check:api` fails unless the four version copies agree (AC-1).
- Given equal versions, when any page renders or refetches, then no notice shows and nothing is announced (AC-2).
- Given a different server version (newer or older), when `app-info` loads or refetches, then the band shows under the top nav per DESIGN.md `components.update-notice`, full width, pushing `main` down, no icon/close/amber/accent (AC-3).
- Given the notice, when I change routes or save a page or a card note, then it stays, blocks nothing, and is no dialog, alert or live region (AC-4).
- Given the notice, when I press Reload by click, Enter or Space, then the page reloads at once with no dialog (AC-5).
- Given the notice appears, then `status` announces its sentence once; same version again announces nothing; a third version announces once; the bundle's version hides it (AC-6).
- Given a failed refetch, then a shown notice stays and none appears otherwise, with nothing complaining (AC-7).
- Given the notice, when tabbing, then Reload follows the Theme group and precedes the page; Skip to content skips it; it sits in `header` after the bar (AC-8).
- Given forced colors, then the band's bottom border is `CanvasText` and Reload has system button colors (AC-9).
- Given the README, then Updating names the notice and Reload and no "hard-reload" remains (AC-10).
- Given the existing e2e suite, when `npm run check` runs, then it passes with the 10 story leaves un-skipped (app-shell/shell header checks unchanged).

### Review Findings

Code review 2026-11-17 (`bmad-code-review`, new session; layers: Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor, Spine Check; diff `1795079..b3af21d`).

- [x] [Review][Patch] Nothing tests the `!isAnnouncing()` guard (decision resolved 2026-11-17: extract the decision into a pure helper in `lib/updateNotice.ts`, called by `UpdateNotice`, with unit tests) — the save-collision leaf passes with `&& !isAnnouncing()` deleted, because `sendIntent` awaits the invalidation before the caller announces [frontend/src/components/UpdateNotice.tsx:21] — fixed: `shouldAnnounce(shown, announcing)` (a `shown is string` predicate) in `lib/updateNotice.ts`, called by `UpdateNotice`; 3 unit cases in `updateNotice.test.ts`. Mutation probe: dropping `&& !announcing` fails 1 of 8 cases; restored, 8 pass.
- [x] [Review][Patch] `isAnnouncing()`'s doc comment says the notice avoids replacing "a message an intent has just announced"; `pending` is set by every `announce` (search and filter counts, Stats totals, panels), so the guard yields to any waiting message [frontend/src/lib/announce.ts:93]
- [x] [Review][Patch] Stale CSS comment: "The active indicator sits flush on the header's bottom hairline." — the hairline now belongs to `.bar` [frontend/src/components/AppShell.module.css:91]
- [x] [Review][Defer] The deferred e2e version literals (`NEWER = '1.2.0'`, the 11.3 fixtures, and now `noticeText('1.2.0')` in `about-this-copy-automate.spec.ts:152`) don't only fail "after the bump": `scripts/release.sh` sets the version (step 3) and then runs `npm run check` (step 4), so `release.sh 1.2.0` stops on AC-3, AC-6, the AC-2 witness and the save leaf unless `--skip-check` [frontend/e2e/update-notice.spec.ts:36] — deferred: pre-existing (ATDD constants committed before this build's baseline); already in `deferred-work.md` for `bmad-testarch-automate`, which runs before any release; this adds the release-blocking effect to that entry.

- Full check after the patches, 2026-11-17: `npm run check` exit 0 — pytest 1605 passed, unit 387 passed (0 skipped), e2e 774 passed, smoke ok.

**Rejected:**
- `low` (Edge 1, Acceptance 3) A version first found while another message is pending is shown but never announced — Boundaries accept it ("the notice skips its announcement so it never clobbers the save's message"; EXPERIENCE.md accepts a lost notice announcement); the band stays and Reload is a Tab stop. AC-6's wording vs the Boundaries is a spec edit, out of scope here.
- `low` (Edge 2) A notice announcement still pending when `shown` changes again (1.2.0 → 1.3.0 or hide) within the same 100 ms tick reads the stale sentence — needs two server changes within one tick; a cleanup or own-text tracking adds state for an unrealistic case.
- `low` (Acceptance 1, Blind 7) The two review-added leaves exceed the "un-skip only" task, the last AC says "10 leaves", the Spec Change Log is empty — the fix is a spec edit; the Auto Run Result already names both leaves.
- `low` (Acceptance 2) Boundaries say the bar is 64px; it is 60px (`--space-topbar-height`) — the code preserves the old height ("exactly as before" holds); the fix is a spec edit.
- `low` (Blind 4) README "then shows a notice" — app-info refetches on window focus (`refetchOnWindowFocus: true`), and after restarting `bookvie` in a terminal Oleg returns to the tab, which focuses it; no realistic path where the promise misleads.
- `low` (Blind 5) Tabs opened on a pre-11.4 bundle have no notice on the next update — a one-time case; a README note for it would be stale after one release.
- `low` (Blind 6) `version.test.mjs` checks four copies but `release.sh` also writes the lockfiles — AR34 names the four copies; the lockfiles are written by `npm version`/`uv lock` in the same script, not by hand.
- `low` (Blind 8, color constant) The new top-bar leaf compares `surface-inset` against `BUTTON_SECONDARY` — DESIGN.md defines `button-secondary`'s fill as `surface-inset`, so the values can't drift apart; naming only.
- `false` (Blind 8, skip link and indicator) The restructured header's skip link and nav indicator are unchecked — `app-shell.spec.ts:338` "[P2] AC-2 Skip to content stays off-screen until it takes focus" checks the skip link's off-screen box and focus reveal against the new structure; the indicator's `margin-bottom: calc(-1 * var(--hairline))` is relative to its flex container, which is `.bar` with the old `.header` rules unchanged.
- `low` (Blind 8, light only; Blind 10) No dark-theme assertion on the band or bar — the colors are tokens switched by `tokens.css`, which `app-shell.spec.ts` compares to DESIGN.md; more theme coverage belongs to `bmad-testarch-automate`.
- `low` (Blind 9) The edited 11.3 assertion removes the notice sentence with `String.replace` (first match only) — `announce` clears both regions before setting text, so the sentence can't appear twice; any other text still fails the leaf.
- `low` (Spine Check) AD-7, AD-8, Capability map FR-27 row and preamble, Seed `lib/`/components/`globals.d.ts` still read as planned — spine drift, already deferred by the build (four "Spine drift" entries in `deferred-work.md`); no AD is broken. Reconciled before the next epic (AGENTS.md "Architecture spine").

## Spec Change Log

## Review Triage Log

### 2026-11-17 — Review pass
- verdicts: 27 findings — high 0, medium 1, low 21, false 5, maybe-false 0
- findings:
  - `[low]` `[defer]` (Spine) AD-7 "App info is an ordinary view" still "(Epic 11, planned)"; the announcement rule isn't in it — spine drift (AD-7), deferred.
  - `[low]` `[defer]` (Spine) AD-8 "One version" still "(Epic 11, planned)" — spine drift (AD-8), deferred.
  - `[low]` `[defer]` (Spine) Capability map preamble and FR-27 row still except FR-27 as planned; row doesn't name `lib/updateNotice`, `components/UpdateNotice` — spine drift (Capability map), deferred.
  - `[low]` `[defer]` (Spine) Structural Seed `lib/` doesn't list `updateNotice` — spine drift (Seed `lib/`), deferred.
  - `[low]` `[reject]` (Intent A) the real install-and-restart path is only covered by inference (mocked `app-info` for differing versions) — AC-2 runs the real built bundle against a real server and AC-1 pins the four copies and the `define`; an e2e across two builds and a restart is far more than a direct fix for an unlikely regression.
  - `[low]` `[reject]` (Intent B) the `!isAnnouncing()` guard drops the notice's announcement when a version change is first found while another message is pending — same root cause as Edge 1/6, Blind 2 (part) and Gap other: EXPERIENCE.md accepts a lost notice announcement when it collides with a save, the band stays on screen and Reload is a Tab stop; a retry queue adds state for a rare race. `sendIntent` awaits the invalidation before the hook announces, so on a save the notice announces first and the save's message replaces it (the new AC-6 save leaf passes either way).
  - `[false]` `[reject]` (Intent C) 1.2.0 → bundle's version → 1.2.0 announces 1.2.0 again — the notice hid and appears again; announcing an appearance is what AC-6 asks ("when it first appears in a tab" is per appearance), nothing forbids it.
  - `[false]` `[reject]` (Intent D) an existing Story 11.3 assertion was loosened — the spec's Never list pre-authorises exactly this story-caused fix and the build summary names it; the assertion still requires no other live-region text.
  - `[low]` `[reject]` (Edge 1) a version first seen during a pending tick is never announced — grouped with Intent B.
  - `[false]` `[reject]` (Edge 2) the notice's `announce` wipes an intent's message that has already landed — a landed message has already been read out; emptying both regions before new text is how every `announce` works (EXPERIENCE.md Live regions).
  - `[false]` `[reject]` (Edge 3) same version re-announced after a hide — same as Intent C.
  - `[low]` `[reject]` (Edge 4) `app-info.version` "" would read "updated to ." — only `create_app` built directly by tests has no version; the CLI always passes `bookvie.__version__`; a guard adds a branch for an unreachable state.
  - `[low]` `[reject]` (Edge 5) a missing `package.json` version leaves `__BOOKVIE_VERSION__` undefined — `version.test.mjs` in `check:api` fails unless exactly one `define` bakes frontend/package.json's version and the four copies agree, so it can't ship; a config guard is an extra branch.
  - `[low]` `[reject]` (Edge 6, claim) AC-6's "announces once" broken by the skip — grouped with Intent B.
  - `[false]` `[reject]` (Edge 7, claim) an earlier story's assertion edited outside the spec's Tasks — same as Intent D: the Never list allows it.
  - `[low]` `[patch]` (Blind 1) README no longer tells Oleg to reload tabs after a rebuild that keeps the version (no notice then) — added "A rebuild that keeps the same version shows no notice, so reload such tabs yourself."
  - `[low]` `[reject]` (Blind 2) a pending notice announcement can name 1.2.0 while the band reads 1.3.0 — needs two different server versions within one 100 ms tick; tracking the notice's own pending text adds state for an unrealistic case. Its save-collision half is grouped with Intent B.
  - `[low]` `[patch]` (Blind 3) the edited 11.3 assertion hard-codes the sentence — now `noticeText('1.2.0')` from `e2e/update-notice.ts`. (The timing part: reading inside the tick is fine, since either state passes "nothing else complains".)
  - `[medium]` `[defer]` (Blind 4) e2e version literals (`NEWER = '1.2.0'`, 11.3 fixtures '1.1.0'/'1.2.0') flip meaning at the next bump, so AC-3/AC-6/AC-2 witness fail after release.sh sets 1.2.0 — the literals predate this build's baseline (ATDD and 11.3 commits); deferred to `bmad-testarch-automate` to derive them from `BUNDLE_VERSION`.
  - `[low]` `[patch]` (Blind 5) Reload reached by Tab reads only "Reload, button" — the sentence `p` has a `useId` id and Reload `aria-describedby` it; name stays "Reload".
  - `[low]` `[reject]` (Blind 6) no unit test for the effect's announce decision — the AC-6 e2e leaf drives the full sequence (first, same, third, back to bundle) and the new save leaf covers the collision; extracting a helper is new structure.
  - `[low]` `[reject]` (Blind 7) `vite.config.ts` doesn't validate the version it reads — same as Edge 5.
  - `[low]` `[reject]` (Blind 8) `.reload`'s 30px height depends on stylesheet order — the repo's `WaitingPane`/`UpNextPane` `.compact` pattern; AC-3 pins 30px on the built bundle.
  - `[low]` `[reject]` (Blind 9) "updated to 1.0.0" reads oddly for a rollback — the sentence is fixed by AC-3 and DESIGN.md; a copy change belongs to the UX docs.
  - `[low]` `[patch]` (Gap 1) the `!isAnnouncing()` path has no test — new leaf "[P1] AC-6 a save whose refetch first finds a new version keeps the save's announcement and shows the notice".
  - `[low]` `[patch]` (Gap 2) moving the top-bar CSS from `header` to `div.bar` is unchecked — new leaf "[P1] AC-2 with no notice the top bar is unchanged": 60px (`--space-topbar-height`; the spec's "64px" was wrong), `surface-inset`, 1px `line` hairline, banner as tall as the bar.
  - `[low]` `[reject]` (Gap other) a skipped notice announcement is never retried — grouped with Intent B.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").

The comparison lives in a pure `lib/updateNotice.ts` that takes the bundle version as an argument, because `node --test` runs `src/**/*.test.ts` without Vite's `define`; only `UpdateNotice.tsx` touches the global. Announcing from an effect keyed on the shown version gives "once per new differing version" for free: a same-version refetch leaves the dependency unchanged, a failure keeps `data`, and StrictMode's double effect run in dev is absorbed by `isAnnouncing()`.

```tsx
const shown = noticeVersion(__BOOKVIE_VERSION__, useAppInfo()?.version)
useEffect(() => {
  if (shown !== undefined && !isAnnouncing()) announce('status', noticeText(shown))
}, [shown])
```

## Verification

**Commands:**
- `cd frontend && node --test src/lib/updateNotice.test.ts src/lib/announce.test.ts scripts/version.test.mjs` -- expected: pass, none skipped.
- `cd frontend && TZ=Europe/Madrid npx playwright test e2e/update-notice.spec.ts e2e/about-this-copy-automate.spec.ts e2e/app-shell.spec.ts e2e/shell.spec.ts` -- expected: all pass.
- `npm run check` -- expected: exit 0.

## Auto Run Result

Status: in-review

**Summary.** A tab whose bundle is older (or newer) than the server now says so. The bundle bakes `__BOOKVIE_VERSION__` from frontend/package.json through a Vite `define` (declared in `src/globals.d.ts`), and `scripts/version.test.mjs` in `check:api` fails unless the four version copies agree (AR34). `UpdateNotice` compares it with the last successful `app-info.version`. While they differ, a full-width `surface` band sits inside `header` after the top bar: "bookvie was updated to X. Reload to use it." and a compact **Reload** (`aria-describedby` the sentence) that calls `window.location.reload()`. The `status` region announces the sentence once per new differing version, unless another message is waiting for its tick. A failed refetch changes nothing. The header's old styles moved to an inner `div.bar`, so with no notice it renders as before. The README's Updating line names the notice.

**Files changed:**
- `frontend/vite.config.ts`: reads package.json's version and defines `__BOOKVIE_VERSION__`.
- `frontend/src/globals.d.ts` (new): declares it.
- `frontend/src/lib/updateNotice.ts` + `.test.ts` (new): `noticeVersion`, `noticeText`, 5 unit cases.
- `frontend/src/lib/announce.ts` + `.test.ts`: `isAnnouncing()` and its test.
- `frontend/src/components/UpdateNotice.tsx` + `.module.css` (new): the band, its announcement and Reload.
- `frontend/src/components/AppShell.tsx` + `.module.css`: `header` wraps `div.bar` (the old `.header` rules) and the notice.
- `README.md`: Updating says open tabs show the notice with Reload; a same-version rebuild still needs a manual reload.
- `frontend/scripts/version.test.mjs`, `frontend/e2e/update-notice.spec.ts`: the 10 ATDD leaves un-skipped; 2 new leaves in `update-notice.spec.ts` from the review (save collision, unchanged top bar).
- `frontend/e2e/about-this-copy-automate.spec.ts`: **story-caused change to an existing leaf.** "[P2] AC-4 a tab left open…" fulfils 1.2.0, so the notice now announces; its last assertion removes `noticeText('1.2.0')` before expecting empty live regions.
- `_bmad-output/implementation-artifacts/deferred-work.md`: this pass's 5 deferrals. `sprint-status.yaml`: `11-4-…` → `review`.

**Review findings.** 27 findings: 0 high, 1 medium, 21 low, 5 false.
- Patched (5 low): README same-version clause; `noticeText` in the 11.3 leaf; Reload `aria-describedby`; e2e leaf for a save whose refetch first finds a new version; e2e leaf for the unchanged top bar.
- Deferred: 4 low spine drift (AD-7, AD-8, Capability map FR-27, Seed `lib/`); 1 medium, the e2e version literals that flip at the next version bump (for `bmad-testarch-automate`).
- Rejected low: real install path only inferred (AC-1 + AC-2 on a real build); the `isAnnouncing()` skip loses the notice's announcement in a save collision (5 rows; EXPERIENCE.md accepts it, the band stays); empty `version`; unvalidated package.json version (2 rows; `version.test.mjs` catches it); wrong version named within one tick; no unit test for the effect; `.reload` stylesheet order; "updated to" on a rollback.
- Rejected false: re-announce after hide-then-reshow (2 rows); the 11.3 leaf edit (2 rows; pre-authorised); wiping a landed message.
- Every row is in the Review Triage Log.

**For `bmad-code-review`:**
- The spec's Boundaries say the top bar is "64px"; it is 60px (`--space-topbar-height`). The intent-contract is read-only for this run, so the wrong number stays in the spec; the new top-bar leaf checks 60px.
- The `isAnnouncing()` guard is the spec's own design (not in the AC text). Review whether the trade-off — a pending message wins over the notice's announcement — is wanted.

**Follow-up review recommendation:** false. This pass patched 0 high, 0 medium and 5 low entries.

**Verification:**
- `node --test src/lib/updateNotice.test.ts src/lib/announce.test.ts scripts/version.test.mjs`: 17 passed, 0 skipped.
- `npx playwright test e2e/update-notice.spec.ts e2e/about-this-copy-automate.spec.ts e2e/app-shell.spec.ts e2e/shell.spec.ts`: 36 passed (before the patches); the implementer re-ran the two touched e2e files after them: 57 passed with `--repeat-each=3`.
- `npm run check` after the patches: exit 0 — pytest 1605 passed, unit 384 passed (0 skipped), e2e 774 passed, smoke ok. No `~/bookvie-data-dev` created.
- Matrix audit: same version (AC-2, unit), newer (AC-3, AC-6, unit), older (AC-3, unit), same again, third, back to bundle (AC-6), pending/never loaded (AC-7, unit), refetch fails (AC-7) — all ran and passed.

**Residual risks.**
- The e2e version literals (deferred, medium) break AC-3/AC-6 when the version is bumped to 1.2.0.
- A version change first found during another message's tick is shown but not announced.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
