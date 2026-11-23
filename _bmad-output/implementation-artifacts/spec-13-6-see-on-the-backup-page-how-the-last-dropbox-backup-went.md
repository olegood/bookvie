---
title: 'Story 13.6: See on the Backup page how the last Dropbox backup went'
type: 'feature'
created: '2026-11-23'
status: 'done'
baseline_revision: 'e367d0384739e7c8c14220addaf7f3bb68897bcf'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-13-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-13-6-see-on-the-backup-page-how-the-last-dropbox-backup-went.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-22 Copied contracts), reconciled before the next epic: bookvie now has a second copy of the cause enum, `views.models.DropboxCause`, because `views` may not import `intents` beyond `intents.contract`; AD-22 says each copied contract exists once on each side.
    evidence: |-
      spine-check finding 1; backend/bookvie/views/models.py DropboxCause; test_dropbox_backup_line.py::test_the_views_copy_of_the_causes_matches_intents keeps it equal to intents.CAUSES. Alternative at reconciliation: move CAUSES into intents.contract.
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md AD-22
    severity: low
  - summary: >-
      Spine drift (AD-22 Dropbox backup line), reconciled before the next epic: the spine doesn't define "unreadable" per field. The code reads as `none` a report with an unknown outcome, an `at` without an offset, a failure without a known cause, or an upload or skip without a valid `lastUpload`; a failure with a bad `lastUpload` keeps its report and only drops the last upload.
    evidence: |-
      spine-check finding 2; backend/bookvie/views/backup.py dropbox_backup; the spec's I/O matrix and Design Notes.
    location: >-
      ARCHITECTURE-SPINE.md AD-22 → Dropbox backup line
    severity: low
  - summary: >-
      Spine drift (AD-22, AD-15, Testing row, Capability map FR-29, Structural Seed), reconciled before the next epic: the Dropbox backup line is built, but the spine still marks it planned ("planned for Epic 13", AD-15's "Epic 13 (planned)", the Testing row's "planned, AD-22: … the Dropbox backup line's states", the FR-29 row, and the Seed's `local_state.py (planned …)`).
    evidence: |-
      spine-check finding 3; partly inherited from 13.1–13.5.
    severity: low
  - summary: >-
      Spine drift (AD-6, Structural Seed), reconciled before the next epic: the Seed's `lib/` line and the FR-29 row don't name `lib/dropboxBackupLine` (nor `relativeDay`), and AD-6's App info sentence "`mode` is the only dev signal the client may read" should allow AD-22's server-decided `dropboxBackup.state === "dev"`.
    evidence: |-
      spine-check finding 4; frontend/src/lib/dropboxBackupLine.ts; backend/bookvie/http/api.py backup_view.
    severity: low
---

<intent-contract>

## Intent

**Problem:** Oleg backs up to Dropbox by hand with `/bookvie-backup`, and `record_backup_upload` stores each run's outcome in `local-state.json`'s `autoBackup` group. Nothing shows it, so he can't tell how old his off-machine copy is, or what to fix after a failed run.

**Approach:** `views/backup` gains `dropboxBackup: {state, reportAt, lastUploadAt, copies, cause}`, computed on the server from the stored group (then `api:gen`). The Backup page's Export card renders one plain `meta` line under "Last export" in EXPERIENCE.md's words. Each cause's entry in `docs/dropbox-backup.md` quotes that cause's reason.

## Boundaries & Constraints

**Always:**
- `state` is decided on the server. The first match wins: `dev` on a `--dev` server; `none` when the group is missing or unreadable (rules below); otherwise `lastReport.outcome`. The client only formats.
- For `dev` and `none`, `reportAt`, `lastUploadAt`, `copies` and `cause` are all `null`.
- `reportAt` is `lastReport.at`. `lastUploadAt` is `lastUpload.backupAt`. `copies` is `lastUpload.copies`. `cause` is set only when `failed`.
- The line's words, the "when" rule and the count follow EXPERIENCE.md → Dropbox backup line and Foundation → Dates exactly. `relativeDay`'s local-calendar-day rule applies, so a future time reads "today".
- The line is a `p` directly after "Last export" in the Export card: `meta` type, `ink-tertiary`, and `ink` when the state is `failed`. It is plain text: no role, tabindex or live region, and no `code`.
- `local-state.json`, `record_backup_upload`, `read_last_export` and "Last export" behave exactly as before.
- The 5 ATDD leaves are not weakened. An expected body they pin only changes to add `dropboxBackup`.

**Never:**
- No banned git command (AGENTS.md "Story pipeline", Epic 8 retro item 64).
- Never show the line on Home. No warning or time-out state, no icon, dot or color, no announcement.
- Don't name a new type or field `autoBackup…` (`test_morning_job_removed.py:140`).
- Don't edit the spine or README. Don't change the EXPERIENCE.md wording.
- `views` must not import `bookvie.intents` (the `test_layers.py` rule). Views keep their own copy of the cause list, and a test compares it with `intents.CAUSES`.

## I/O & Edge-Case Matrix

| Scenario | Stored `autoBackup` | `dropboxBackup` | Line |
|---|---|---|---|
| Upload | report uploaded, valid `lastUpload` | `uploaded`, at, backupAt, copies, null | "Dropbox backup: last upload today at 09:02 · 3 copies in Dropbox" |
| Skip | report skipped, valid `lastUpload` | `skipped`, the skip's at, upload's backupAt and copies | "…checked today at 09:02, nothing new · last upload on 19 Nov · 3 copies in Dropbox" |
| Failure after uploads | report failed + cause, valid `lastUpload` | `failed`, at, backupAt, copies, cause | "…failed today at 09:02 · *reason* Last upload on 19 Nov." |
| Failure, never uploaded | report failed + cause, no `lastUpload` | `failed`, at, null, null, cause | "…failed yesterday at 09:02 · *reason*" |
| Dev server | anything | `dev`, nulls | "Dropbox backup: never from a development server" |
| Unreadable | no file / no group / bad JSON / group not an object / outcome not one of three / `at` not ISO with offset / failed without a cause in the list / uploaded or skipped without a valid `lastUpload` | `none`, nulls | "Dropbox backup: none yet · run /bookvie-backup in Claude Code" |
| Bad `lastUpload` on a failure | `backupAt` not ISO with offset, or `copies` not an int ≥ 1 (bool excluded) | `failed`, at, null, null, cause | no " Last upload" sentence |
| Other year | upload on 2025-11-19, now 2026 | — | "last upload on 19 Nov 2025" |

</intent-contract>

## Code Map

- `backend/bookvie/views/models.py:326` `BackupView`: add `dropbox_backup: DropboxBackupView`. The new model has `state: Literal[...]`, `report_at: AwareDatetime | None`, `last_upload_at: AwareDatetime | None`, `copies: int | None` and `cause: DropboxCause | None`, where `DropboxCause` is a Literal of the five causes. Export the model in `views/__init__.py`.
- `backend/bookvie/views/backup.py`: `backup(store, *, dev=False)`. Read the group with `bookvie.store.local_state.read_group(store.data_dir, AUTO_BACKUP_KEY)` (check that `store` re-exports it, or import it from `bookvie.store.local_state`, which the layers rule allows). Parse it as the Matrix says, and never raise.
- `backend/bookvie/http/api.py:345` `backup_view`: pass `dev=request.app.state.app_info.mode == "dev"`. `create_app` already builds `app_info` from `dev`, so `app.py` needs no change.
- `backend/bookvie/agent/`: check for any caller of `views.backup` (`grep -rn "views.backup\|backup(" backend/bookvie/agent`) and keep its behavior.
- `frontend/src/api/generated/schema.d.ts`: run `npm --prefix frontend run api:gen`, and never format the file.
- `frontend/src/lib/relativeDay.ts`: reuse `localDay` and `useNow`. A new `frontend/src/lib/dropboxBackupLine.ts` (with `.test.ts` under `node --test`, like its siblings) holds `dropboxWhen(iso, now)`, `copiesText(n)`, `REASONS` and `dropboxBackupLine(view, now)`.
- `frontend/src/pages/BackupPage.tsx:181`: after `.lastExport`, add `<p className={failed ? styles.dropboxFailed : styles.dropboxLine}>`. `BackupPage.module.css` gets the classes: the `.lastExport` recipe, with `--color-ink` for a failure. `margin-top: var(--space-1)` comes from DESIGN.md `dropbox-backup-line`. To keep that 4px gap and not the card's `space-3`, wrap the two lines in a `div`. `previousElementSibling` must still be "Last export".
- `docs/dropbox-backup.md:78-104`: in each `` #### `<cause>` `` entry, add one sentence quoting the reason, for example: The Backup page shows "Dropbox backup: failed … · Dropbox sign-in expired. Nothing in Dropbox was deleted. Run bookvie-dropbox auth in Terminal." Don't put backticks inside the quote.
- Tests that pin the old body, to update (add `dropboxBackup` with `state: "none"` and nulls): `backend/tests/test_views.py:350,357,368`, `test_export.py:546`, `test_morning_job_removed.py:126`, `test_morning_job_removed_follow_ups.py:42`, and the `refreshLastExport` fixtures in `frontend/src/api/export.test.ts` if `tsc` asks.
- ATDD leaves to un-skip: `backend/tests/test_dropbox_backup_line.py` (2) and `frontend/e2e/dropbox-backup-line.spec.ts` (3). Then remove `RED_13_6` and the "Un-skip when" comments.
- Deferred-work intake:
  - `deferred-work.md:1640` asks Story 13.6 to settle the casing of the Failed reasons. It becomes a task: keep EXPERIENCE.md's casing and record the rule. After "failed *when* · ", a reason starts lowercase, like the line's other parts after "·" ("none yet · run…"). "Dropbox" and "bookvie" keep their usual spelling as names, so the rows are already consistent. Resolved in Finalize.
  - No other open entry names Story 13.6.
- Previous story: 13.5 (done) slimmed `views/backup` to `lastExportAt` and renamed EXPERIENCE.md's table header, which `failing_reasons` reads.

## Tasks & Acceptance

**Execution:**
- `backend/bookvie/views/models.py`, `views/__init__.py`, `views/backup.py`, `http/api.py`: add the model, the parser and the dev flag (AC-1).
- `backend/tests/test_dropbox_backup_line.py`: un-skip both leaves. Add one leaf for the Matrix's bad-field rows (a bad `at`, a failure without a cause or with an unknown one, an upload without `lastUpload`, a failure with a bad `copies` or `backupAt`, `copies: true`) and one that compares the view's cause Literal with `intents.CAUSES`.
- The backend tests listed in the Code Map: add the `none` `dropboxBackup` to each expected body.
- `frontend/src/api/generated/schema.d.ts`: run `api:gen`.
- `frontend/src/lib/dropboxBackupLine.ts` and its `.test.ts`: the formatter, with unit cases for every state, both counts, today, yesterday, this year, another year and a future time (AC-2).
- `frontend/src/pages/BackupPage.tsx` and `BackupPage.module.css`: render the line (AC-2, AC-3).
- `frontend/e2e/dropbox-backup-line.spec.ts`: un-skip the 3 leaves (AC-2 to AC-4).
- `docs/dropbox-backup.md`: quote the line in each cause entry (AC-5).
- `deferred-work.md:1640`: add a `resolved:` line in Finalize.

**Acceptance Criteria:**
- AC-1: Given `views/backup`, when it is read, then it carries `dropboxBackup` as the Matrix says (dev first, then none, then the outcome), and `schema.d.ts` names it.
- AC-2: Given each state seeded through `local-state.json` with the browser clock fixed, when the Backup page renders, then the Export card shows the line directly under "Last export" in EXPERIENCE.md's words, with every cause's reason, "when" and count, and the line recomputes on focus.
- AC-3: Given the line, when it is inspected, then it is `meta` text, `ink` when failed and `ink-tertiary` otherwise, text only, not a control, Tab stop or live region, absent from Home, and axe passes in light and dark.
- AC-4: Given a manual export, a recorded upload and a restore, when each finishes, then only "Last export" moves for the export, only the line moves for the upload, and neither moves for the restore.
- AC-5: Given the guide, when the docs pytest runs, then each cause has exactly one entry that quotes its reason word for word.

### Review Findings

Code review of 2026-11-23, in a new session, on `e367d03..8fff564`, with five layers: blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor and spine-check. The layers filed 21 findings (acceptance-auditor none), grouped into 20 entries: 0 decision-needed, 1 patch, 4 defer and 15 rejected. No AC needs a manual run: all five are covered by tests.

- [x] [Review][Patch] The `dev` state's null fields are never checked: the AC-1 leaf asserts only `["state"] == "dev"`, so a dev view that leaked the stored report's `reportAt`, `lastUploadAt`, `copies` or `cause` would pass, while the spec says all four are `null` for `dev` [`backend/tests/test_dropbox_backup_line.py:141`]
- [x] [Review][Defer] AD-22 Copied contracts: a second cause-enum copy inside bookvie (`views.models.DropboxCause`) [`backend/bookvie/views/models.py:326`] — deferred: spine drift, reconciled before the next epic. Already logged in `deferred-work.md` by the build, so no second entry was added.
- [x] [Review][Defer] AD-22 Dropbox backup line doesn't define "unreadable" per field, nor that a failure carries `lastUploadAt` and `copies` [`backend/bookvie/views/backup.py:33`] — deferred: spine drift, reconciled before the next epic. Already logged by the build.
- [x] [Review][Defer] AD-22, AD-15, the Testing row, the FR-29 row and the Seed still mark the line planned [`ARCHITECTURE-SPINE.md`] — deferred: spine drift, reconciled before the next epic. Already logged by the build.
- [x] [Review][Defer] AD-6's "`mode` is the only dev signal" sentence, and the Seed's `lib/` line and FR-29 row omit `lib/dropboxBackupLine` and the exported `localDay` [`frontend/src/lib/dropboxBackupLine.ts`] — deferred: spine drift, reconciled before the next epic. Already logged by the build.
- Full check after the patch, 2026-11-23: `npm run check` exited 0 (pytest 2427 passed, unit 393 passed, e2e 803 passed, smoke ok). Applied: the AC-1 leaf now compares the whole dev body; a hand-made leaky dev view (the stored report with `state` set to `dev`) failed it, and that edit was reverted.

**Rejected:**
- `low` (edge) `views.backup` reads `local-state.json` twice, so a corrupt file logs two lines and the two fields could come from different versions. The two groups have independent writers, so each field is still a true fact. The fix is a reader refactor, and the build's review rejected the same point.
- `false` (edge+blind) The class and the words can disagree, drawing "none yet" in `ink` when `failed` has no `reportAt` or `cause`. `dropbox_backup` returns `failed` only with an aware `at` and a cause in `CAUSES` (`views/backup.py`), so the server never sends that payload.
- `false` (edge) `dropboxWhen` renders "on NaN undefined NaN" for an unparseable time. `reportAt` and `lastUploadAt` are Pydantic `AwareDatetime` values, always serialized as ISO-8601.
- `low` (verification-gap other, blind) `test_the_pages_reasons_match_experience_md_in_cause_order` regex-parses `dropboxBackupLine.ts` and would break if Prettier wrapped an entry. It fails loudly ("REASONS" pairs missing), never silently, and the fix (moving `REASONS` to a shared JSON file) is a restructure for a reformat that hasn't happened.
- `low` (blind) "none yet · run /bookvie-backup" can't fix an unreadable `local-state.json`. Bad JSON is replaced by the group writer (`local_state._parse_or_empty`), so the next run clears it. Only an unreadable file (`chmod 000`) stays, and `record_backup_upload` then answers `CouldntSave` with the file named. That's rare, and the fix is new guide content.
- `false` (blind) The guide never explains the dev state. `docs/dropbox-backup.md:5` and `:128` say a `--dev` server never uploads, and the line's words say it too.
- `false` (blind) `_NONE` and `_DEV` are shared mutable instances. No code mutates a view: the only use is `backup()`, whose result FastAPI serializes.
- `false` (blind) `backup(store, *, dev=False)` fails open. Its only caller, `http/api.py:347`, passes `dev`, and no agent tool calls `views.backup`.
- `false` (blind) `copies` lacks `Field(ge=1)` in the schema. The server enforces it in `_last_upload`, and the client only formats, so nothing goes wrong.
- `false` (blind) The unit and backend tests miss some cases: an other-year full line, a year boundary, a failure whose last upload is today, a skip with "1 copy", and a bad `copies` on an upload. Each piece is covered: `dropboxWhen` handles other years and the 31 Dec / 1 Jan case, `copiesText(1)` is tested, and the `copies` check lives in the shared `_last_upload`, which the failure-path leaves already cover.
- `low` (blind) The `none` body is spelled out in four test files. The cost is a few extra edits when a field is added, and the build kept each file's expected body explicit.
- `low` (blind) The `epic-13-context.md` rewrite dropped the gate numbers, "the backup run can never restore", `_on_the_machine` and other details. It was recompiled by `compile-epic-context.md` (800–1500 tokens), and each dropped fact still lives in the spine, `epics.md` or `test-design-qa.md`, which later stories load.
- `false` (blind) The spec's `deferred:` entries 3 and 4 lack `location:`, and `review_loop_iteration` is still 0. The fix would edit the spec's own bookkeeping, not code, and neither field is read by a check.
- `false` (blind) `deferred-work.md` has two blank lines before the new heading. Markdown renders the same, and nothing reads that file byte for byte (the same call as Story 13.5's review).
- `false` (blind) CHANGELOG has no entry. `[Unreleased]` stayed "Nothing yet" through 13.1–13.5; entries are written in the release commit (`6c0f404`, `7c68a46`).

## Spec Change Log

## Review Triage Log

### 2026-11-23 — Review pass
- verdicts: 26 findings — high 0, medium 0, low 17, false 9, maybe-false 0
- findings:
  - `low` `patch` (verification-gap) the frontend `REASONS` aren't tied to EXPERIENCE.md's Failed-reasons table; a wording change there would leave the page stale with no failing test — added `test_the_pages_reasons_match_experience_md_in_cause_order`, which reads `REASONS` from `dropboxBackupLine.ts` and compares it with `failing_reasons()` in cause order.
  - `low` `defer` (spine-check) AD-22 copied contracts: a second cause-enum copy inside bookvie — spine drift; the code follows the layers rule and a test keeps the copies equal.
  - `low` `defer` (spine-check) AD-22 doesn't define field-level "unreadable" or the failure-keeps-report rule — spine drift; the code follows the spec.
  - `low` `defer` (spine-check) the spine still marks the line, AD-15's group, the Testing row, the FR-29 row and the Seed's `local_state.py` planned — spine drift.
  - `low` `defer` (spine-check) the Seed and FR-29 row omit `lib/dropboxBackupLine`, and AD-6's "only dev signal" sentence conflicts with AD-22's `dev` state — spine drift.
  - `false` `reject` (intent-alignment) the broad "unreadable" reading goes beyond the AC — EXPERIENCE.md says upload state that can't be read counts as no report yet; a report without a usable outcome, time or cause can't be read, and the spec records the rule.
  - `low` `reject` (intent-alignment) "on 19 Nov 2025" vs the AC's bare "19 Nov 2025" — UX-DR76 lists it beside "on 19 Nov" as the other-year form of the same phrase, and the ATDD leaf pins "on"; changing it would edit the ATDD leaf and read worse.
  - `false` `reject` (intent-alignment) "a command in the body font" is checked only as one font family — the line is one text node with no command element, and `--font-meta-family` equals the body family, so no command can render in another font.
  - `low` `patch` (intent-alignment) two copies of the reasons, neither tied to EXPERIENCE.md — same root cause as the verification-gap row; fixed by the same test.
  - `false` `reject` (intent-alignment) `lastUploadAt = backupAt` is checked only on the backend — the client formats the field it is given; the server rule is pinned field by field in `test_dropbox_backup_line.py` (BACKUP_AT 36 s before UPLOAD_AT).
  - `false` `reject` (intent-alignment) the guide quotes the reason after "failed … ·" rather than a whole line — AC-5 asks that each entry quote the line's words for its cause; the reason is the cause-specific part and is quoted verbatim.
  - `false` `reject` (intent-alignment) the `epic-13-context.md` rewrite and the `resolved:` line are outside the ACs — step-01 found the context stale (EXPERIENCE.md newer) and recompiled it by its rules; the deferred entry is this story's intake.
  - `low` `reject` (edge-case) `dropboxWhen` renders "on NaN undefined NaN" for an unparseable time — unreachable: the server only sends Pydantic `AwareDatetime` values; a guard adds a branch for a state not shown reachable.
  - `low` `reject` (edge-case) a group with a bad field reads as `none` with no log line — `read_group` already logs unreadable files; a hand-edited field is unlikely in everyday use, and logging each branch adds a log seam to `views`.
  - `low` `patch` (blind) two 13.5 test names say the opposite of what they assert — renamed to `test_views_backup_has_no_auto_backup_view_and_nothing_asks_launchd` and `test_the_backup_view_shows_the_stored_upload_group_and_reading_it_changes_nothing`.
  - `low` `reject` (blind) `views.backup` reads `local-state.json` twice; a corrupt file logs two lines and a write between reads mixes snapshots — both lines are each reader's own true message; the two groups have independent writers, so a mixed snapshot shows two correct facts; the fix is a reader refactor.
  - `low` `reject` (blind) `epic-13-context.md` dropped facts (content-hash definition, gate numbers, lock-free cores…) and "(done)" markers — compile-epic-context asks for titles only and 800–1500 tokens; the dropped details live in the spine and epics.md, which later stories still load.
  - `false` `reject` (blind) `sprint-status.yaml` still says `backlog` — Finalize sets `review` in this run's commit.
  - `low` `patch` (blind) the guide never says the Backup page shows the recorded group — added one sentence to "What bookvie records" (the line, and "none yet" for unreadable state).
  - `low` `reject` (blind) the client's "none yet" fallback for an inconsistent payload is silent and untested — unreachable: the server never sends `uploaded`/`skipped` without `lastUploadAt` and `copies`, nor `failed` without `cause` (pinned by the backend leaves).
  - `low` `reject` (blind) `DropboxBackupView` is flat, not a per-state union — a discriminated union is more public surface for no reachable defect; the server's parser and tests enforce the shapes.
  - `false` `reject` (blind) pass-through cases untested (skip with differing times, `Z` offsets, extra keys, `"3"` copies) — the AC-1 leaf already asserts a skip's `reportAt` (SKIP_AT) against the upload's `lastUploadAt` (BACKUP_AT); `fromisoformat` accepts `Z` on 3.14; extra keys are ignored by `.get`; a string `copies` fails the int check and reads as `none` like any bad field.
  - `low` `patch` (blind) `.dropboxLine` and `.dropboxFailed` duplicate the meta recipe — `.dropboxFailed` is now only `color: var(--color-ink)`, applied with `.dropboxLine`. The claim that `.exportLines { max-width: 100% }` does nothing is false: it caps the fit-content flex item at the card width so a two-line reason wraps.
  - `false` `reject` (blind) two copies of the cause list on the views side — `CAUSES = get_args(DropboxCause)` derives from the Literal; there is one source.
  - `low` `patch` (blind) import and export order drift in `BackupPage.tsx` and `api/index.ts` — moved into the files' order.
  - `false` `reject` (blind) `dropboxWhen` has no guard for a bad time — duplicate of the edge-case row; unreachable for the same reason.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").
- **Unreadable parts read as `none`.** EXPERIENCE.md says upload state that can't be read counts as no report yet. A report is only usable with a known outcome, an aware `at`, and for a failure a known cause. Uploaded and skipped claim a last upload, so they also need a valid `lastUpload`. A failure may legitimately have none, so a bad `lastUpload` there only drops the " Last upload" sentence.
- **Year rule.** The pattern is "on D Mon" this year and "on D Mon YYYY" in another year (the ATDD's reading of UX-DR76). Times use `HH:MM`, local, 24-hour, built from `getHours` and `getMinutes` padded to two digits, not `toLocaleTimeString`, so they never depend on the locale.
- **The line's text**, in TypeScript form (`w(x)` is `dropboxWhen(x, now)`):
  - uploaded: `Dropbox backup: last upload ${w(lastUploadAt)} · ${copies} in Dropbox`
  - skipped: `Dropbox backup: checked ${w(reportAt)}, nothing new · last upload ${w(lastUploadAt)} · ${copies} in Dropbox`
  - failed: `Dropbox backup: failed ${w(reportAt)} · ${REASONS[cause]}`, plus ` Last upload ${w(lastUploadAt)}.` when `lastUploadAt` is set
- **Casing of the reasons (deferred-work.md:1640).** No change. Each part after "·" starts lowercase, and names keep their usual spelling.

## Verification

**Commands:**
- `cd backend && uv run pytest tests/test_dropbox_backup_line.py tests/test_views.py tests/test_export.py tests/test_morning_job_removed.py tests/test_morning_job_removed_follow_ups.py tests/test_layers.py -q`: expected all pass.
- `cd frontend && npx playwright test e2e/dropbox-backup-line.spec.ts e2e/backup.spec.ts e2e/about-this-copy.spec.ts`: expected all pass.
- `npm run check`: expected green. Known flaky: the port-8790 sign-in leaves, `deferred-work.md:1567`.

## Auto Run Result

Status: in-review

**Summary.** `views/backup` now carries `dropboxBackup: {state, reportAt, lastUploadAt, copies, cause}`, computed on the server from `local-state.json`'s `autoBackup` group (`dev` first, then `none` for anything unreadable, then the last report's outcome), and `schema.d.ts` is regenerated. The Backup page's Export card shows the Dropbox backup line directly under "Last export", in EXPERIENCE.md's words, `ink` when failed and `ink-tertiary` otherwise. Each cause's entry in `docs/dropbox-backup.md` quotes its reason, and "What bookvie records" says the page shows the group.

**Files changed:**
- `backend/bookvie/views/models.py`, `views/__init__.py`: `DropboxCause`, `DropboxBackupView`, `BackupView.dropbox_backup`.
- `backend/bookvie/views/backup.py`: `backup(store, *, dev)` and the `dropbox_backup(group)` parser.
- `backend/bookvie/http/api.py`: passes `dev` from `app_info.mode`.
- `frontend/src/api/generated/schema.d.ts`: regenerated by `api:gen`.
- `frontend/src/api/views.ts`, `api/index.ts`: export `DropboxBackupView`.
- `frontend/src/lib/dropboxBackupLine.ts` and `.test.ts` (new): the line's words, "when" and counts, with unit cases.
- `frontend/src/lib/relativeDay.ts`: exports `localDay`.
- `frontend/src/pages/BackupPage.tsx`, `BackupPage.module.css`: the line under "Last export".
- `backend/tests/test_dropbox_backup_line.py`: ATDD leaves un-skipped; added leaves for bad fields, the views cause copy, and the page's reasons against EXPERIENCE.md.
- `backend/tests/test_views.py`, `test_export.py`, `test_morning_job_removed.py`, `test_morning_job_removed_follow_ups.py`: expected bodies carry `dropboxBackup`; two 13.5 leaves renamed to match what they check.
- `frontend/e2e/dropbox-backup-line.spec.ts`: 3 ATDD leaves un-skipped.
- `docs/dropbox-backup.md`: the quoted reason per cause, and one sentence in What bookvie records.
- `_bmad-output/implementation-artifacts/epic-13-context.md`: recompiled in step-01 (EXPERIENCE.md was newer).
- `_bmad-output/implementation-artifacts/deferred-work.md`: `resolved:` on the casing entry (intake), and this review's four spine-drift entries.

**Review.** 26 findings (low 17, false 9). Patches applied: 5 entries, all `low` (the reasons-vs-EXPERIENCE.md test, two test renames, the guide sentence, the CSS base class, import/export order). Deferred: 4 spine-drift entries (AD-22 cause copy, AD-22 field-level "unreadable", "planned" labels, AD-6 and the Seed). Rejected: 17, each with its reason in the Review Triage Log above.

**Follow-up review recommended:** false. Patched by verdict: high 0, medium 0, low 5.

**Verification.**
- The spec's pytest set (7 files incl. `test_layers.py` and `test_dropbox_backup_guide.py`): 131 passed before the patches; the patched files' leaves 15 passed after.
- Playwright `dropbox-backup-line`, `backup`, `about-this-copy`: 19 passed; `node --test src/lib/dropboxBackupLine.test.ts`: 4 passed.
- `npm run check`: passed before the patches; after them, one run failed only in the known flaky port-8790 sign-in leaves of `test_dropbox_cli_follow_ups.py` (`deferred-work.md:1567`), which also cut the e2e phase short; the next full run passed (check:py, check:api, check:e2e, smoke).
- Matrix audit: every I/O row has a leaf that ran and passed (backend AC-1 and bad-field leaves, the unit "other year" case, and the e2e AC-2 run).

**Residual risks.** The flaky port-8790 leaves still fail some full checks (pre-existing). The spine stays out of date until the Epic 13 reconciliation.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
