---
title: 'One e2e home for DESIGN.md reading and app-info faking (E11-D1)'
type: 'refactor'
created: '2026-11-17'
status: 'done'
route: 'oneshot'
baseline_commit: '7c13a3d2af2e6d7eaae69e5275771f73e173c078'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-11-retro-2026-11-17.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** this is Epic 11 retro item 77 (E11-D1; sprint item `epic-11-retro-item-77-one-home-for-design-md-and-app-info-e2e-helpers`), due before Epic 12. The e2e suite parses DESIGN.md's frontmatter in three places (`app-shell.spec.ts` `designTokens`, `favicon.ts` `designColor`, `dev-mode.ts` `designComponentColor`), fakes `app-info` with two helpers (`fulfilAppInfo`, `answerAppInfo`) plus a private `routeAppInfo` and inline `page.route('**/api/views/app-info', …)` calls, and copies the `AppInfo` type by hand instead of using the generated schema.

**Approach:** `frontend/e2e/library.ts` gets the DESIGN.md path, one frontmatter reader that `designColor`, `designComponentColor` and `designTokens` all build on, one `app-info` route helper (`answerAppInfo`: a body, `'pass'` or `'fail'` per request), and `AppInfo` typed as the generated `components['schemas']['AppInfoView']`. Every copy goes; call sites use the shared helper. No assertion, test title or value changes.

</frozen-after-approval>

## Implementation Notes

- Decisions (mine, not user-visible):
  - `favicon.ts` re-exports `DESIGN_MD` and `designColor`, `dev-mode.ts` re-exports `designComponentColor`, and `update-notice.ts` re-exports `answerAppInfo`, so specs outside the retro's Changes list that import them (`favicon*.spec.ts`, `dev-proxy.spec.ts`, `dev-mode-production.spec.ts`, `update-notice*.spec.ts`) don't change, as item 73 did with `tile-marks.ts`.
  - `fulfilAppInfo(page, body)` goes; its callers write `answerAppInfo(page, () => body)`. That includes `about-this-copy-dev.spec.ts`, which isn't in the retro's Changes list but calls it.
  - `about-this-copy-automate.spec.ts`'s private `routeAppInfo` (`500` for a failure) becomes `answerAppInfo` with `'fail'`.
  - Inline routes replaced where the behavior is the same: `dev-mode.spec.ts` (the `failing ? 500 : continue` route) and `dev-mode-automate.spec.ts:139`. Kept inline because they behave differently: `dev-mode.spec.ts:130` (fetches the server's answer and rewrites `mode`), `dev-mode.spec.ts:151` and `about-this-copy.spec.ts:153` (hold the request unanswered).
  - `favicon.ts` `designFaviconPath` stays: it reads DESIGN.md's prose (the Favicon path), not the frontmatter.
- Files changed: `library.ts` (gains `DESIGN_MD`, `designColor`, `designComponentColor`, `designTokens`, `AppInfo`, `AppInfoAnswer`, `answerAppInfo`), `favicon.ts`, `dev-mode.ts`, `about-this-copy.ts`, `update-notice.ts` (copies removed, re-exports added), `app-shell.spec.ts`, `about-this-copy.spec.ts`, `about-this-copy-automate.spec.ts`, `about-this-copy-dev.spec.ts`, `dev-mode.spec.ts`, `dev-mode-automate.spec.ts`.
- From review: `about-this-copy-automate.spec.ts` also drops its private copy of `focusWindow` and imports `update-notice.ts`'s, and `AppInfoSeen.body` in `dev-mode.ts` is `Partial<AppInfo>` instead of a hand-typed `{ mode?: string }`.
- Verification: `npm run check:api` exit 0; the affected e2e specs (app-shell, about-this-copy, dev-mode, dev-proxy, favicon, update-notice) 76 passed before and after the review patches; full `npm run check` after the patches exit 0: pytest 1627 passed, e2e 783 passed (783 at the Epic 11 retro, so no test was lost), smoke ok.

## Review Triage Log

Blind Hunter (one layer; the oneshot route has no other).

- `focusWindow` copied in `about-this-copy-automate.spec.ts`: low, real (identical to `update-notice.ts:69`). Patched: deleted, imported.
- `AppInfoSeen.body` hand-typed `{ mode?: string }`: low, real. Patched: `Partial<AppInfo> | null`.
- Stale header comments in `dev-mode.ts` and `favicon.ts`: low, real. Patched. (`library.ts`'s header was already updated: false.)
- Stale line anchors in these notes: low, real. Patched.
- app-info plumbing (`watchAppInfo`, `serverAppInfo`, `productionInfo`) still in three modules: low, rejected: the item asks for one route helper, and these do other jobs.
- `AppInfoAnswer` re-exported as `Answer`: low, rejected: the old name keeps `update-notice*.spec.ts` unchanged, as item 73 did; renaming them is churn.
- `components['schemas']['AppInfoView']` instead of `views.ts`'s `AppInfoView`: false: both are the generated schema type; the item asks for the generated schema.
- `designTokens` parses lines differently from `designColor`/`designComponentColor`: low, rejected: each keeps its old parsing rule unchanged (no assertion changes), and DESIGN.md quotes every hex value today.
- No guard in `designFrontmatter()` for a missing frontmatter: false: DESIGN.md has frontmatter and `tokens.css` is compared against it; a failure there is loud.
- Unescaped names in `new RegExp`: false: every caller passes a literal token or key name with no metacharacter.
- Hand-copied color constants in `library.ts` beside `designColor`: low, rejected: item 73 put them there deliberately; out of this item's scope.
- `designFaviconPath` reads DESIGN.md outside `library.ts`: false: it reads prose, not frontmatter (noted above).
- No baseline commit or test count in the spec: low, patched (baseline in frontmatter, counts in Implementation Notes).
- `about-this-copy-dev.spec.ts` edited outside the retro's Changes list as the builder's call: false: removing `fulfilAppInfo`, which the item asks for, requires it; nothing user-visible.
- `sprint-status.yaml` still `open`: real; set to `done` in this commit, as item 76 did.
