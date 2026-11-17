---
title: 'Story 11.3: Show the version on the Backup page'
type: 'feature'
created: '2026-11-17'
baseline_revision: '4431e57fcaf9f90b44049bb2d75a887cd61f8f7c'
status: 'in-review'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-11-3-show-the-version-on-the-backup-page.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-11-context.md'
warnings: [oversized]
deferred:
  - summary: >-
      Spine drift (Capability → Architecture Map, FR-27 row and preamble), reconciled before the next epic: the preamble still says FR-27 is planned and the FR-27 row lists `pages/BackupPage` About this copy as planned, though Story 11.3 built it; the row doesn't name `lib/aboutThisCopy`.
    evidence: |-
      frontend/src/pages/BackupPage.tsx (About this copy section), frontend/src/lib/aboutThisCopy.ts (spine check).
    location: >-
      ARCHITECTURE-SPINE.md:399, :416
    severity: low
  - summary: >-
      Spine drift (Structural Seed `frontend/src/lib/`), reconciled before the next epic: the Seed's `lib/` listing doesn't name `aboutThisCopy`, which builds Backup's two About this copy lines from `app-info`.
    evidence: |-
      frontend/src/lib/aboutThisCopy.ts and aboutThisCopy.test.ts (spine check).
    location: >-
      ARCHITECTURE-SPINE.md:392
    severity: low
---

<intent-contract>

## Intent

**Problem:** Nothing in bookvie says which version is running or which folder holds the library, so Oleg can't check he's on the right copy before he exports or restores.

**Approach:** Backup gets a third `surface` card, "About this copy", after Export and Restore. It shows two plain-text lines built from the `app-info` view that Story 11.2 shipped (`useAppInfo()`): the version (plus the commit and "Development server" on a dev server) and the data folder.

## Boundaries & Constraints

**Always:** The card is a `section` inside the Backup page, after Restore, `aria-labelledby` its `h2` "About this copy" (uppercased only by CSS). It reuses `.card`, so its frame equals Export's. Line 1 and line 2 are each their own element whose whole text is the line. Line 1 is `bookvie ${version}` in production; on dev it is `bookvie ${version}` + (commit ? ` (${commit})` : '') + ` · Development server`, with " · " as literal text (U+0020 U+00B7 U+0020). The commit shows only when `mode === 'dev'`. Line 2 is `Data folder: ${dataDir}` exactly as sent, `overflow-wrap: anywhere`, never truncated. The card renders only while `useAppInfo()` has data, so it is absent while pending or failed, and a failed refetch keeps it (TanStack keeps `data`). Heading `section-label`/`ink-tertiary`; lines `body-sm`/`ink-secondary`, sans.

**Never:** No button, link, `tabindex` or other Tab stop in the card; no copy button; no announcement or error text about `app-info`. No backend change, no `tokens.css` edit, no spine edit. No card on the couldn't-load state of Backup. No edit to an existing e2e spec (`backup.spec.ts`, `restore.spec.ts`, `restore-refusals.spec.ts`). No version-equality test or update notice (Story 11.4).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Production | `{1.1.0, production, ~/bookvie-data, null}` | "bookvie 1.1.0" / "Data folder: ~/bookvie-data" | — |
| Production, commit sent | `{1.2.0, production, …, a1b2c3d}` | "bookvie 1.2.0"; no commit | — |
| Dev with commit | `{1.1.0, dev, ~/bookvie-data-dev, a1b2c3d}` | "bookvie 1.1.0 (a1b2c3d) · Development server" | — |
| Dev, no commit | `commit: null` | "bookvie 1.1.0 · Development server", no brackets | — |
| Long absolute folder | 150+ chars, no spaces | full path, wraps inside the card, no overflow | — |
| app-info pending / failed | held / 500 | no card, nothing said | silent |
| Refetch fails after success | 500 on focus refetch | card unchanged | silent |

</intent-contract>

## Code Map

- `frontend/src/pages/BackupPage.tsx` -- renders `PageHeading` then two `section.card`s with `aria-label` "Export" / "Restore"; the couldn't-load branch returns early with no cards. Add the third section after Restore (before the `ConfirmDialog`).
- `frontend/src/pages/BackupPage.module.css` -- `.card` (flex column, `align-items: flex-start`, `gap: var(--space-3)`, 560px max, `20px 24px`), `.text` (`body-sm`/`ink-secondary`). Add the heading and line rules here.
- `frontend/src/api/views.ts:99` `useAppInfo()` -- `AppInfoView | undefined`, keyed `['view','app-info']`. It is not re-exported by `api/index.ts`; `AppShell.tsx` and `lib/page.ts` import it (and the `AppInfoView` type) from `../api/views.ts`, so do the same.
- `frontend/src/components/WaitingPane.module.css:12` `.heading` -- the existing `section-label` heading recipe (family/size/weight/letter-spacing tokens, `line-height: 1.3`, uppercase, `ink-tertiary`) to copy.
- `frontend/src/lib/page.ts` + `page.test.ts` -- pattern for a small pure function with a `node:test` unit test.
- `frontend/e2e/about-this-copy.spec.ts` (5 leaves), `about-this-copy-dev.spec.ts` (1 leaf), `about-this-copy.ts` (helpers, read-only) -- the red leaves to un-skip.
- `frontend/src/styles/tokens.css` -- read-only.
- Deferred-work intake:
  - `deferred-work.md:1055` (Spine drift AD-16 Capability map; "Stories 11.2 to 11.4's") -- not in this story: spine edits wait for the epic's reconciliation (AGENTS.md "Architecture spine").
  - `deferred-work.md:1064` (Spine drift AD-7 "App info is an ordinary view"; "stay planned for Stories 11.3 and 11.4") -- not in this story: same reason.

## Tasks & Acceptance

**Execution:**
- `frontend/src/lib/aboutThisCopy.ts` (new) -- pure `versionLine(info)` and `folderLine(info)` taking `AppInfoView`, implementing the line rules above -- AC-1, AC-2, AC-3.
- `frontend/src/lib/aboutThisCopy.test.ts` (new) -- unit test: production, production with a commit sent, dev with a commit, dev without one, folder line verbatim -- AC-1, AC-2.
- `frontend/src/pages/BackupPage.tsx` -- `const appInfo = useAppInfo()`; when defined, `<section className={styles.card} aria-labelledby={id}>` with `<h2 id={id}>About this copy</h2>` and two `p`s; heading id from `useId()` -- AC-1, AC-2, AC-4, AC-5, AC-6.
- `frontend/src/pages/BackupPage.module.css` -- `.aboutHeading` (section-label recipe, `margin: 0`), `.aboutLines` wrapper (no gap, so the two lines read as one block), `.aboutLine` (`body-sm`/`ink-secondary`, `margin: 0`, `overflow-wrap: anywhere`, `max-width: 100%`); update the "two blocks" comment to three -- AC-1, AC-3.
- `frontend/e2e/about-this-copy.spec.ts`, `about-this-copy-dev.spec.ts` -- `test.skip(` → `test(` on the 6 leaves; no other edit -- all.

**Acceptance Criteria:**
- Given a production server with `app-info` loaded, when I open Backup, then a third card in Export's frame follows Restore, labelled by its `h2` "About this copy" (uppercase via CSS, `section-label`/`ink-tertiary`), with "bookvie <version>" and "Data folder: <dataDir>" on two lines in `body-sm`/`ink-secondary`, and no commit or "Development server" (AC-1).
- Given a dev server, when I open Backup, then line 1 is "bookvie 1.1.0 (a1b2c3d) · Development server", or "bookvie 1.1.0 · Development server" with `commit: null`, and line 2 is the folder given (AC-2).
- Given a long absolute data folder, when the card renders, then the whole path shows, wrapping inside the card with no overflow (AC-3).
- Given `app-info` pending or failing, when I open Backup, then there is no card and nothing said, Export and Restore work, and a failed refetch after a success keeps the card (AC-4).
- Given the card, when a keyboard or screen-reader user reaches it, then it has no Tab stop or control, the headings run `h1` "Backup", `h2` "About this copy", and axe passes in light and dark (AC-5).
- Given the existing Backup e2e specs, when `npm run check` runs, then they pass unedited and the 6 story leaves pass (AC-6).

## Spec Change Log

## Review Triage Log

### 2026-11-17 — Review pass
- verdicts: 17 findings — high 0, medium 0, low 14, false 3, maybe-false 0
- findings:
  - `[low]` `[defer]` (Spine) Capability map preamble and FR-27 row still read "planned" — spine drift (Capability map, FR-27), deferred.
  - `[low]` `[defer]` (Spine) Structural Seed `lib/` doesn't list `aboutThisCopy` — spine drift (Seed `lib/`), deferred.
  - `[low]` `[reject]` (Edge) an empty `dataDir` or `version` would render "Data folder: " / "bookvie " — `dataDir` is `""` only when `create_app` gets no folder, which only tests that build an app directly do (the 11.2 review rejected the same row); `version` is `bookvie.__version__`; a guard adds a branch for a state the CLI never reaches.
  - `[low]` `[reject]` (Edge, claim) the AC-3 leaf was edited beyond the un-skip, against the spec's "no other edit" — real: `cardBox.width <= 560` became `cardBox.width === exportBox.width`. The old bound contradicts AC-1's "same frame": `.card` (Story 2.1) has a 560px content-box `max-width` with `20px 24px` padding and a 1px border, so Export and Restore already render 610px and a card in their frame cannot be ≤ 560. The new check asserts what the leaf's comment meant (a long path doesn't widen the card). The only other fix edits this spec; surfaced in the Auto Run Result for `bmad-code-review`.
  - `[low]` `[reject]` (Edge, claim) the new width check no longer catches a `.card` max-width regression — it would grow Export too, and AC-1's `frameOf` compares max-width with Export's; DESIGN.md pins no card width, and the leaf's purpose (the path stays inside the card) still holds.
  - `[low]` `[reject]` (Blind) the AC-3 assertion edit is unrecorded — same as the Edge claim row; recorded now in this log and the Auto Run Result.
  - `[false]` `[reject]` (Blind) the rewrite hides a 610 vs 560px mismatch with DESIGN.md — DESIGN.md has no 560 anywhere (grep); the 560 is `.card`'s own content-box `max-width`, unchanged since Story 2.1, and the checklist's "max-width 560px" is the computed value, which is still 560px.
  - `[low]` `[reject]` (Blind) no test that the couldn't-load state shows no card — the failed branch returns before the cards render, so the card can't appear there today; a new e2e leaf is more than a direct correction; listed for `bmad-testarch-automate`.
  - `[low]` `[patch]` (Blind) `.aboutLines`'s comment says "no gap", which the rule doesn't do — comment now says the wrapper groups the two lines as one block outside the card's flex gap.
  - `[low]` `[patch]` (Blind) `.aboutLine` copied `.text`'s five body-sm/ink-secondary declarations — the lines now use `styles.text` plus `.aboutLine`, which keeps only `max-width: 100%` and `overflow-wrap: anywhere`.
  - `[low]` `[reject]` (Blind) `.aboutHeading` copies the WaitingPane section-label recipe — the repo's established pattern (nine modules carry the same recipe); a shared class is new structure for a cosmetic gain.
  - `[low]` `[reject]` (Blind) unit test misses `commit: ''`, an unknown `mode` and a dev `folderLine` — `commit` is `null` or `rev-parse --short` output, `mode` is a typed `Literal`, and `folderLine` ignores `mode`; the separator part is false: `assert.equal` on the literal string already pins U+0020 U+00B7 U+0020.
  - `[false]` `[reject]` (Blind) the review diff leaves out the spec file — by design: the spec is the claims file, given to the edge-case layer separately.
  - `[low]` `[reject]` (Intent) the AC's literal strings are checked only through a fulfilled `app-info`; the `~` display isn't shown on the page — the real-server legs of AC-1/AC-2 prove the page shows exactly what the server sends, and the `~` rule is 11.2's backend, tested in `test_dev_mode.py`; e2e servers can't use the real home folders.
  - `[low]` `[reject]` (Intent) the AC-3 assertion was edited after the red phase — same as the Edge claim row.
  - `[false]` `[reject]` (Intent) the card stays rendered when the backup view itself fails — `BackupPage.tsx` returns the couldn't-load markup before the card's JSX, so no card renders there.
  - `[low]` `[reject]` (Intent) `dataDir: ""` would read "Data folder: " — same as the Edge empty-field row.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").

`.card` uses `align-items: flex-start`, so each child shrinks to its content; with `overflow-wrap: anywhere` the long line's min-content collapses and it wraps at the card's inner width, as the ATDD `wrapOf` probe expects. The lines sit in a wrapper with no gap so they read as one two-line block under the heading (the card's 12px gap separates heading and block). The AC doesn't pin that spacing; automate records it.

```tsx
{appInfo !== undefined && (
  <section className={styles.card} aria-labelledby={aboutId}>
    <h2 id={aboutId} className={styles.aboutHeading}>About this copy</h2>
    <div className={styles.aboutLines}>
      <p className={styles.aboutLine}>{versionLine(appInfo)}</p>
      <p className={styles.aboutLine}>{folderLine(appInfo)}</p>
    </div>
  </section>
)}
```

## Verification

**Commands:**
- `cd frontend && node --test src/lib/aboutThisCopy.test.ts` -- expected: pass (the same runner `check:api` uses).
- `cd frontend && TZ=Europe/Madrid npx playwright test e2e/about-this-copy.spec.ts e2e/about-this-copy-dev.spec.ts e2e/backup.spec.ts e2e/restore.spec.ts e2e/restore-refusals.spec.ts` -- expected: all pass, none skipped.
- `npm run check` -- expected: exit 0, no existing e2e spec edited.

## Auto Run Result

Status: in-review

**Summary.** Backup has a third `surface` card, "About this copy", after Export and Restore and in their frame. It is a `section` labelled by its `h2` (uppercased by CSS, `section-label`/`ink-tertiary`) with two `body-sm`/`ink-secondary` lines built from `app-info`: "bookvie 1.1.0" in production, "bookvie 1.1.0 (a1b2c3d) · Development server" on a dev server (no brackets without a commit), and "Data folder: <dataDir>" exactly as sent, wrapping anywhere. The card renders only while `useAppInfo()` has data, so it is absent while pending or failed and survives a failed refetch. It has no control or Tab stop. It isn't on the couldn't-load state.

**Files changed:**
- `frontend/src/lib/aboutThisCopy.ts` (new): `versionLine` and `folderLine`.
- `frontend/src/lib/aboutThisCopy.test.ts` (new): 5 `node:test` cases.
- `frontend/src/pages/BackupPage.tsx`: the About this copy section.
- `frontend/src/pages/BackupPage.module.css`: `.aboutHeading`, `.aboutLines`, `.aboutLine`; comment says three blocks.
- `frontend/e2e/about-this-copy.spec.ts`, `about-this-copy-dev.spec.ts`: the 6 leaves un-skipped. **One assertion changed** (AC-3, see below).
- `_bmad-output/implementation-artifacts/deferred-work.md`: two spine-drift entries.
- `_bmad-output/implementation-artifacts/sprint-status.yaml`: `11-3-…` → `review`.

**For `bmad-code-review`: the AC-3 assertion.** The leaf asserted `cardBox.width <= 560`. It can't pass while the card keeps Export's frame: `.card` (Story 2.1) has a 560px content-box `max-width` plus `20px 24px` padding and a 1px border, so Export and Restore already render 610px wide. The build replaced it with `cardBox.width === exportBox.width` and a comment, which is what the leaf meant (a long path doesn't widen the card). DESIGN.md pins no card width. The alternative is `box-sizing: border-box` on `.card`, which changes the existing Export and Restore cards. The spec said the ATDD files get only the un-skip, so this is a deviation to accept or reverse.

**Review findings.** 17 findings: 0 high, 0 medium, 14 low, 3 false.
- Patched (2 low): the `.aboutLines` comment now says what the rule does; the lines reuse `.text` instead of copying its declarations.
- Deferred (2 low): spine drift (Capability map FR-27 row and preamble; Structural Seed `lib/`), also in `deferred-work.md`.
- Rejected low:
  - Empty `dataDir`/`version` renders a bare label: only reachable from tests that build an app directly.
  - The AC-3 assertion edit (three rows: Edge, Blind, Intent): see above; the only other fix edits the spec.
  - The new width check misses a `.card` max-width regression: Export grows too; `frameOf` still compares.
  - No leaf for "no card on the couldn't-load state": the early return makes it impossible today; for automate.
  - `.aboutHeading` repeats the section-label recipe: the repo's pattern across nine modules.
  - Unit edge cases (`commit: ''`, unknown `mode`, dev `folderLine`): not reachable through the typed view.
  - The AC's literal strings are pinned only through a fulfilled `app-info`: the real-server legs prove the chain; `~` display is 11.2's tested backend.
- Rejected false: DESIGN.md says 560 (it doesn't); the diff omits the spec (by design); the card renders on a failed backup view (it returns early).
- Every row is in the Review Triage Log.

**Follow-up review recommendation:** false. This pass patched 0 high, 0 medium and 2 low entries.

**Verification (re-run after the patches):**
- `node --test src/lib/aboutThisCopy.test.ts`: 5 passed.
- `npx playwright test e2e/about-this-copy.spec.ts e2e/about-this-copy-dev.spec.ts e2e/backup.spec.ts e2e/restore.spec.ts e2e/restore-refusals.spec.ts`: 28 passed, none skipped (before the patches; the implementer re-ran the 6 story leaves after them: 6 passed).
- `npm run check`: exit 0. ruff clean; coverage gates domain 100%, intents+store 98.08%; unit 376 passed, 0 skipped; e2e 755 passed; smoke ok. `backup.spec.ts`, `restore.spec.ts` and `restore-refusals.spec.ts` unedited. No `~/bookvie-data-dev` created.
- Matrix audit: every I/O row has a passing test (production and commit-sent: AC-1 + unit; dev with/without commit: AC-2 + unit; long folder: AC-3; pending/failed and failed refetch: AC-4).

**Residual risks.**
- The AC-3 width assertion change above.
- The `~` folder display is not shown end to end on the page (e2e servers use temp folders); it rests on 11.2's backend tests.
- ATDD green-phase follow-ups (dark colours, forced colours, stale-tab version change, no card on couldn't-load) are for `bmad-testarch-automate`.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
