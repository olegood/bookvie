# Sprint Change Proposal: drop the morning backup job

- **Date:** 2026-11-23
- **Trigger:** Story 13.5, "Run the backup every morning" (in review)
- **Mode:** Batch
- **Scope:** Moderate (backlog reorganization inside Epic 13, plus planning-artifact edits)
- **Decisions (Oleg, 2026-11-23):** remove the job; keep the `bookvie-backup` skill and run it by hand; shrink Story 13.6 to a plain "Dropbox backup" line; take the 13.5 code out through a removal story in the normal pipeline.

## 1. Issue summary

Story 13.5 built `bookvie autobackup install|uninstall|run`: a launchd LaunchAgent (`~/Library/LaunchAgents/com.bookvie.autobackup.plist`) that runs `claude -p "/bookvie-backup"` at 09:00. Its AC-7, Oleg's install and two real 09:00 runs, never completed. The install on 2026-11-22 vanished, together with other user-installed tooling (memory: "LaunchAgent removed by security?"). Oleg has now confirmed that the Mac's administration policy doesn't allow a user LaunchAgent of this kind. The job can't be made to work on the one machine bookvie runs on.

Category: a technical and organizational constraint found during implementation.

What stays: the `bookvie-dropbox` server and `upload_backup` (13.2), `record_backup_upload` and the upload state (13.3), and the `bookvie-backup` skill (13.4). Oleg runs `/bookvie-backup` by hand when he wants an off-machine copy. Restore (13.1, 13.7, 13.8) doesn't depend on the job.

## 2. Impact analysis

### Checklist

| Item | Status | Finding |
|---|---|---|
| 1.1 Trigger story | [x] | 13.5, in review; AC-7 (manual install and 09:00 runs) blocked |
| 1.2 Core problem | [x] | Managed-Mac policy forbids the LaunchAgent; the schedule can't run |
| 1.3 Evidence | [x] | The 2026-11-22 install disappeared; Oleg confirms the policy |
| 2.1 Current epic | [!] | Epic 13 can finish without the job: 13.5 becomes a removal story and 13.6 shrinks |
| 2.2 Epic-level changes | [!] | Epic 13's title, summary and gate drop "every morning", the headless run and the 26-hour states |
| 2.3 Future epics | [N/A] | No later epic depends on the job |
| 2.4 Obsolete or new epics | [N/A] | None |
| 2.5 Order | [x] | Unchanged: 13.5 (now the removal) runs next, then 13.6, 13.7, 13.8 |
| 3.1 PRD | [!] | FR-29 "Daily and unattended" and the five-state status; FR-30 "Never unattended"; FR-28 and NFR wording "the daily backup run" |
| 3.2 Architecture | [!] | AD-22 "The schedule" and "Auto-backup state"; AD-1, AD-5 and AD-15 mentions; Config, Logging and Testing rows; Capability Map FR-29; Source tree; seed diagram |
| 3.3 UX | [!] | EXPERIENCE.md: Auto-backup line, Flow 13, Auto-backup report, the voice example and the principle line. DESIGN.md: `auto-backup-line` component |
| 3.4 Other artifacts | [!] | `docs/dropbox-backup.md`, the `bookvie-backup` SKILL.md, README, `deferred-work.md` (7 open 13.5 entries), `sprint-status.yaml`, `dropbox-backup-plan-2026-11-21.md`, the old 13.5 spec, memory |
| 4.1 Direct adjustment | Viable | Rewrite 13.5 as a removal story and shrink 13.6. Effort: low to medium. Risk: low |
| 4.2 Rollback | Not chosen | `git revert` of the three 13.5 commits would bypass the story pipeline and also revert useful review fixes in shared code |
| 4.3 MVP review | N/A | FR-29 is a Should; its core (an off-machine copy, 3 copies, verify then prune) survives |

### Epic impact

Only Epic 13. The epic keeps 8 stories:

- **13.1–13.4:** done. Their code stays. 13.4's skill and guide get small wording fixes, made inside the new 13.5.
- **13.5:** rewritten from "Run the backup every morning" to "Take out the morning job" (a removal).
- **13.6:** shrunk from a five-state Off/Waiting/On/Failing/Stalled line, which needed a launchd probe and a 26-hour rule, to a plain "Dropbox backup" line fed only by `record_backup_upload`.
- **13.7 and 13.8:** unchanged.

### Technical impact (removed by the new 13.5)

- `backend/bookvie/cli.py`: the `autobackup install|uninstall|run` subcommands, the launchd label, plist writer, `--allowedTools`/`--disallowedTools` constants, `_autobackup_run`, `_stop` and the `launchctl` seam.
- `backend/bookvie/http/app.py`: `create_app`'s `launchd_probe` keyword. `http/api.py`: its use in the backup view.
- `backend/bookvie/views/backup.py` and `views/models.py`: `AutoBackupView` and `BackupView.auto_backup`. Then `npm --prefix frontend run api:gen` regenerates `schema.d.ts`.
- Tests: `backend/tests/test_autobackup.py`. The autobackup parts of `test_dropbox_backup_guide.py`, `test_views.py` and `test_export.py`.
- `docs/dropbox-backup.md`: "5. Install the daily job", "Troubleshooting the daily job", and the job lines in "How it works" and "Uninstalling".
- Kept: the `autoBackup` key group in `local-state.json`. Oleg's state file already holds it, and renaming it would break existing state for no gain. It stays as a historical name.

## 3. Recommended approach

**Direct adjustment.** Rewrite Story 13.5 as a removal story, shrink 13.6, and edit the PRD, epics, spine and UX now, in this correct-course pass. The spine edit is a planning change, not drift. It also closes 13.5's open spine-drift entries, so the next-epic gate isn't blocked by drift about code that no longer exists.

- **Effort:** the removal story is about one session (mostly deletion, plus the guide, the skill wording and the docs test). The 13.6 rework makes 13.6 smaller than planned.
- **Risk:** low. The removal touches `create_app`'s keywords and the `views/backup` shape, both covered by existing tests and `check:api`.
- **Timeline:** net shorter. Story 13.6 loses the probe, the 26-hour rule and three states.

## 4. Detailed change proposals

### 4.1 Stories (`_bmad-output/planning-artifacts/epics.md`)

#### Epic 13 heading, summary and gate

```
OLD: ## Epic 13: Back up to Dropbox every day, and restore through an agent
NEW: ## Epic 13: Back up to Dropbox, and restore through an agent
```

In the summary, replace "Every morning, with nothing open, the library goes to bookvie's own Dropbox folder: …" through "…Stalled." with:

> When Oleg runs the backup skill, the library goes to bookvie's own Dropbox folder: 3 copies, the oldest deleted only after a checked upload, an unchanged library skipped, a development library never uploaded. The Backup page says in words how the last Dropbox backup went. (The 09:00 launchd job was dropped on 2026-11-23: the Mac's administration policy doesn't allow it. See `sprint-change-proposal-2026-11-23.md`.)

The epics-list row at line 54 changes the same way.

Gate. In the P0 list, remove "the auto-backup states at 26 hours either side" and "headless can't restore", and add "the Dropbox line's states". In the manual runs, remove "13.5 install and the headless run awake and after wake". Keep "the guide's commands match the CLI": the guide still has `bookvie-dropbox auth` and `serve`.

#### Requirements inventory

- **FR-29 summary (line 114):** rewrite to match the new PRD FR-29 (4.2).
- **FR-29 coverage line (line 367):** remove "`bookvie autobackup` with launchd" and change "the auto-backup line" to "the Dropbox backup line".
- **AR21:** remove "Epic 13 adds the subcommands `bookvie autobackup install`, `uninstall` and `run` (AR52)" and "the launchd run logs under `~/Library/Logs/bookvie/`".
- **AR51:** change "Run by hand interactively it may start bookvie as the other skills do; the unattended run never needs to." to "It runs by hand in an interactive session and may start bookvie as the other skills do."
- **AR52 and AR53:** replace each with "*(Removed 2026-11-23: no scheduled job; see sprint-change-proposal-2026-11-23.)*" (keeps the numbering stable).
- **AR54:** replace with:

  > AR54 (AD-22, AD-6, AD-20): The Dropbox backup line's data in `views/backup`: `dropboxBackup: {state, reportAt, lastUploadAt, copies, cause}`, with `state` one of `dev`, `none`, `uploaded`, `skipped`, `failed`, computed on the server from `local-state.json`'s upload state (`dev` on a `--dev` server; `none` when there is no report, or the state is missing or unreadable; otherwise the latest report's outcome). `lastUploadAt` is the upload's `backupAt`. The client only formats. No probe, no 26-hour rule.

- **AR61:** change "every auto-backup state has a troubleshooting entry" to "every Dropbox line state and cause has a troubleshooting entry".
- **UX-DR73 to UX-DR77 and UX-DR82:** rewrite from the new EXPERIENCE.md section (4.4). Shape:
  - **UX-DR73:** visual as before, with `failed` in `ink` and every other state in `ink-tertiary`.
  - **UX-DR74:** behavior as before, with the pattern "Dropbox backup: *detail*".
  - **UX-DR75:** the five lines in 4.4.
  - **UX-DR76:** "when" formats and copies only. No 26-hour rule, no Waiting.
  - **UX-DR77:** causes, with `upload_incomplete` ending "Nothing in Dropbox was deleted; run /bookvie-backup again."
  - **UX-DR82:** drop "to the launchd log headless".

#### Story 13.4 (done): history only

Leave its ACs as built. The wording fixes to its skill and guide ("the morning job", "09:00 launchd", "headless") are ACs of the new 13.5. Add one line under the story: "*(2026-11-23: the morning job was dropped; Story 13.5 removes its mentions.)*"

#### Story 13.5: replace the whole story

```
### Story 13.5: Take out the morning job

As Oleg,
I want the 09:00 launchd job and everything built for it gone,
So that bookvie has no code, docs or UI for a job my Mac's policy won't run, and I back up by running /bookvie-backup.

**Requirements:** FR-29, AR21, AR51, AR61

**Acceptance Criteria:**

**Given** the `bookvie` CLI
**When** `bookvie autobackup install`, `uninstall` or `run` is run
**Then** it is not a command (argparse's usage error); `cli.py` has no launchd label, plist writer, `launchctl` seam, `claude` runner or tool-list constants.

**Given** `create_app` and `views/backup`
**When** the app is created and `views/backup` is read
**Then** `create_app` takes no `launchd_probe` keyword, nothing runs `launchctl`, and `views/backup` carries only `lastExportAt` (`AutoBackupView` is gone; `api:gen` regenerated)
**And** `local-state.json`'s `autoBackup` group, `record_backup_upload` and `export_backup`'s `unchangedSinceUpload` behave exactly as before (their tests pass unchanged).

**Given** the `bookvie-backup` skill
**When** it is read
**Then** its description and body say it runs by hand (`/bookvie-backup`) and never mention launchd, 09:00, `claude -p` or a headless run; the headless stop in step 1 is gone; the `upload_incomplete` line reads "Failed: the last upload didn't finish. Nothing in Dropbox was deleted; run /bookvie-backup again."
**And** its frontmatter tools, steps and other report lines are unchanged.
**And** in the same change, EXPERIENCE.md's Failed-reasons table drops its "Pending Story 13.5" note: its header becomes `After "failed *when* · "`, its `upload_incomplete` row takes the new wording, and `tests/helpers.py`'s `failing_reasons` reads the new header.

**Given** `docs/dropbox-backup.md` and the README
**When** this story lands
**Then** the guide has no "Install the daily job" step and no "Troubleshooting the daily job" section; "How it works" describes a run started by hand; "Uninstalling" has no job lines, and has one note for a Mac where the job was installed before (`launchctl bootout gui/$(id -u)/com.bookvie.autobackup`, then delete `~/Library/LaunchAgents/com.bookvie.autobackup.plist` and `~/Library/Logs/bookvie/`)
**And** README → AI skills no longer says the daily job runs the skill
**And** the docs pytest passes with no `autobackup` command in the guide.

**Given** the tests
**When** `npm run check` runs
**Then** `backend/tests/test_autobackup.py` is gone, no test refers to the `autobackup` command, `launchd` or `launchd_probe` (the stored `autoBackup` group is unchanged), and the check is green.
```

Sprint key: `13-5-run-the-backup-every-morning: review` becomes `13-5-take-out-the-morning-job: backlog`. The old spec `spec-13-5-run-the-backup-every-morning.md` stays as history, with a status line: "Superseded 2026-11-23 by sprint-change-proposal-2026-11-23; never done; its code is removed by `spec-13-5-take-out-the-morning-job.md`." The same applies to `atdd-checklist-13-5-run-the-backup-every-morning.md`.

#### Story 13.6: replace the whole story

```
### Story 13.6: See on the Backup page how the last Dropbox backup went

As Oleg,
I want the Backup page to tell me in words when I last backed up to Dropbox and whether it worked,
So that I can tell at a glance how old my off-machine copy is, and what to fix when a run failed.

**Requirements:** FR-29, AR6, AR54, AR61, UX-DR73, UX-DR74, UX-DR75, UX-DR76, UX-DR77

**Acceptance Criteria:**

**Given** `views/backup`
**When** it is read
**Then** it carries `dropboxBackup: {state, reportAt, lastUploadAt, copies, cause}` (Pydantic, then `api:gen`), with `state` one of `dev`, `none`, `uploaded`, `skipped`, `failed`, computed on the server from `local-state.json`'s upload state; `dev` on a `--dev` server whatever is stored; `none` when there is no report or the state is missing or unreadable; `lastUploadAt` the upload's `backupAt`.

**Given** each state, seeded through `local-state.json` (fake clock)
**When** the Backup page renders
**Then** the Export card shows one line directly under "Last export", in UX-DR75's words: "Dropbox backup: never from a development server", "Dropbox backup: none yet · run /bookvie-backup in Claude Code", "Dropbox backup: last upload today at 09:02 · 3 copies in Dropbox", "Dropbox backup: checked today at 09:02, nothing new · last upload on 19 Nov · 3 copies in Dropbox", and "Dropbox backup: failed today at 09:02 · *reason* Last upload on 19 Nov." (the last sentence only when there has been an upload)
**And** each `cause` shows its UX-DR77 sentence
**And** "when" follows UX-DR76 ("today at 09:02", "yesterday at 09:02", "on 19 Nov", "19 Nov 2025" outside the current year) and recomputes on focus; copies read "1 copy", "2 copies", "3 copies".

**Given** the line
**When** it is inspected
**Then** it is `meta` text, `ink` for a failure and `ink-tertiary` otherwise, with no dot, icon, badge shape, tint or color, and a command in a reason in the body font (UX-DR73)
**And** it is plain text: not a control, link, Tab stop or live region, and a change found by the refetch on focus isn't announced (UX-DR74)
**And** it never appears on Home
**And** axe passes in both themes.

**Given** a manual **Export all data**
**When** it finishes
**Then** "Last export" moves and the line doesn't; a recorded upload moves the line and not "Last export"; a restore moves neither.

**Given** the guide
**When** this story lands
**Then** `docs/dropbox-backup.md` has one troubleshooting entry per failure cause quoting the line's exact words, and the docs pytest fails unless every cause has its entry.
```

Sprint key: `13-6-see-on-the-backup-page-whether-auto-backup-works` becomes `13-6-see-on-the-backup-page-how-the-last-dropbox-backup-went` (still `backlog`).

### 4.2 PRD (`prds/prd-bookvie-2026-10-28/prd.md`)

**FR-29** heading and statement:

```
OLD: #### FR-29: Daily off-machine backup *(Should)*
     Once a day, an agent backs up the library and uploads the backup to the user's Dropbox, so a copy exists off this computer without exporting by hand.
NEW: #### FR-29: Off-machine backup to Dropbox *(Should)*
     When the user asks, an agent backs up the library and uploads the backup to the user's Dropbox, so a copy exists off this computer without exporting by hand.
```

Replace the "Daily and unattended" bullet:

> - **Run by hand:** the user starts a backup run from Claude Code whenever they want. There is no schedule: the user's managed Mac doesn't allow a scheduled background job (2026-11-23).

Replace the "Status on the Backup page" bullet:

> - **Status on the Backup page:** next to "Last export", the Backup page says in words how the last Dropbox backup went: when the last upload was and how many copies Dropbox keeps, that the last run found nothing new, that it failed (the reason and the fix), or that there hasn't been one yet. On a Development server it says a development library is never uploaded.

Change the "Documented" bullet to "setup, how it works, and a fix for each known failure ship with the feature."

Other PRD edits:

- **FR-30, line 292:** "Never unattended: the daily backup run (FR-29) can never restore." becomes "Never through the backup: the backup run (FR-29) can never restore."
- **Lines 328 and 333:** "the daily backup run's export" becomes "the backup run's export", and "The daily Dropbox backup (FR-29)" becomes "The Dropbox backup (FR-29)".
- **"Daily backup" as the name of the file kind** (one `bookvie-backup-<date>.zip` per day) stays everywhere.

### 4.3 Architecture spine (`ARCHITECTURE-SPINE.md`)

- **AD-22 "The schedule" block (lines 373–383):** replace it with one line: "**No schedule** (2026-11-23): the user runs the `bookvie-backup` skill by hand. A launchd job was built in Story 13.5 and removed, because the user's managed Mac doesn't allow it (sprint-change-proposal-2026-11-23)."
- **AD-22 "Auto-backup state" block (lines 384–388):** replace it with "**Dropbox backup line** (`views/backup`, AD-6)". It carries the AR54 text (4.1): the `dropboxBackup` shape, the five states and how they're computed. No probe, no 26-hour rule. Note that the stored group keeps the name `autoBackup`.
- **AD-22 `bookvie-backup` skill bullet:** remove "The unattended run never needs that."
- **"Upload state" bullet:** "So the daily run never moves 'Last export'" becomes "So a backup run never moves 'Last export'".
- **Line 29 (AD-2 intro):** "The daily Dropbox backup (Epic 13, planned)" becomes "The Dropbox backup (Epic 13)".
- **Logging row (430):** remove "the launchd run's output goes under `~/Library/Logs/bookvie/` (AD-22)".
- **Config row (431):** remove "the subcommands `bookvie autobackup install` and `uninstall`, and".
- **Testing row (432):** remove the generated plist, `autobackup run`, and "the auto-backup states at 26 hours either side". Add "the Dropbox line's states".
- **Seed diagram (482–483):** delete the `launchd 09:00` node and the `claude -p` edge.
- **Source tree (521, 524, 526):** remove the `cli.py` autobackup comment and `launchd_probe` from `http/`. Change `backup (planned: the auto-backup state, AD-22)` to `backup (the Dropbox backup line, AD-22)`.
- **Capability Map FR-29 row (564):** rename it "Off-machine backup to Dropbox". Remove `views/backup`'s `launchd_probe` and the `cli.py` autobackup entry. Change "auto-backup line" to "Dropbox backup line".
- **Out of scope (571):** change "schedulers other than launchd" to "any scheduled run (a managed Mac doesn't allow one; 2026-11-23)".

### 4.4 UX

**EXPERIENCE.md.** Replace "### Auto-backup line" (lines 192–222) with "### Dropbox backup line". It has one signal, the latest report of the backup skill, and the first matching row wins:

| State | When | Line |
|---|---|---|
| Dev | Development server | "Dropbox backup: never from a development server" |
| None | No report yet, or the state can't be read | "Dropbox backup: none yet · run /bookvie-backup in Claude Code" |
| Failed | The latest report is an error | "Dropbox backup: failed *when* · *reason and fix*", then " Last upload *when*." if there has been one |
| Uploaded | The latest report is an upload | "Dropbox backup: last upload today at 09:02 · 3 copies in Dropbox" |
| Skipped | The latest report is a skip | "Dropbox backup: checked today at 09:02, nothing new · last upload on 19 Nov · 3 copies in Dropbox" |

The "When", "Copies", "Fixes in words", "Manual export" and "Can't load" bullets are kept. "The 26-hour rule" and "Waiting doesn't time out" are removed. "Never a warning" now reads "Failed is `ink`; the others are `ink-tertiary`". In the causes table, `upload_incomplete` becomes "the last upload didn't finish. Nothing in Dropbox was deleted; run /bookvie-backup again."

Other EXPERIENCE.md edits:

- **Line 27:** "the auto-backup line on Backup (FR-29) reports the daily Dropbox run" becomes "the Dropbox backup line on Backup (FR-29) reports the last backup run".
- **Line 48 and Pages (161, 410):** "auto-backup line" becomes "Dropbox backup line".
- **Voice table (113):** the example becomes "Dropbox backup: last upload on 19 Nov · 3 copies in Dropbox" against "⚠ Your library is not backed up!".
- **Flow 13:** retitle it "Fix a failed backup". The precondition becomes "Oleg last ran `/bookvie-backup` on Thursday; it failed". Step 1's line becomes "Dropbox backup: failed on 19 Nov · Dropbox sign-in expired. …". Step 3 becomes "runs `/bookvie-backup` again". The climax line becomes "Dropbox backup: last upload today at 10:14 · 3 copies in Dropbox". Delete the launchd failure path.
- **Agent conversations (752, 805–807):** "the auto-backup run's report" becomes "the backup run's report". Delete "The headless run's own output … goes to the launchd log". The report is shown in the chat.

**DESIGN.md.** Rename the component token `auto-backup-line` to `dropbox-backup-line`; it isn't in `tokens.css`, and nothing is built yet. Line 754 becomes "the Dropbox backup line under it". Line 756 becomes: "Failed in `ink` (`text-color-strong`); every other state in `ink-tertiary`; the pattern 'Dropbox backup: *detail*'". Line 846 becomes "the Dropbox backup line is words only".

### 4.5 Other artifacts

- **`dropbox-backup-plan-2026-11-21.md`:** add one note under the title: "2026-11-23: the scheduled run (D7 and the launchd parts of D9–D12) is dropped; see sprint-change-proposal-2026-11-23. The spine wins where they differ." Leave the body as history.
- **`deferred-work.md`:** add `resolved: obsolete, sprint-change-proposal-2026-11-23 removes the morning job and its spine text (2026-11-23)` to each of the 7 open entries under the two "spec-13-5-run-the-backup-every-morning" headings. Four of them are spine drift, so after this pass no open drift entry about the job remains.
- **`sprint-status.yaml`:** rename the two keys and set the statuses (4.1). Update `last_updated`.
- **Memory:** update "LaunchAgent removed by security?". The policy is confirmed, the job is dropped, and AC-7 is no longer pending.
- **Code, the `bookvie-backup` SKILL.md, the guide and README:** these change inside the new Story 13.5, not in this pass. Story steps own code.

## 5. Implementation handoff

**Scope: Moderate.** Backlog reorganization inside Epic 13, plus planning-artifact edits. No PM or architect replan is needed: the spine changes only remove a part, and they're made in this pass.

| Who | What |
|---|---|
| This correct-course pass (on approval) | Apply 4.1–4.4 to `epics.md`, the PRD, the spine, EXPERIENCE.md and DESIGN.md. Apply 4.5's plan note, `deferred-work.md` resolutions, `sprint-status.yaml` keys and the memory update. One `docs:` commit (memory: planning and docs commits go on master). |
| Story 13.5 "Take out the morning job" | The full pipeline (AGENTS.md → Story pipeline): `bmad-testarch-atdd` (red tests: no `autobackup` command, no `launchd_probe`, `views/backup` without `autoBackup`, the skill's and guide's new wording), `bmad-build-auto`, `bmad-code-review` in a new session, then `bmad-testarch-automate`. |
| Story 13.6 (shrunk) | The normal pipeline, after 13.5 is `done`. |
| Oleg | If any trace of the old job is left on the Mac, run the guide's one-off cleanup note. Back up by running `/bookvie-backup`. |

**Success criteria**

- `npm run check` is green, with no `autobackup` command, `launchd` or `launchd_probe` in `backend/` or `frontend/` (except the guide's one-off cleanup note; the stored `autoBackup` group stays).
- `/bookvie-backup` run by hand still uploads, then skips, as in 13.4's manual record.
- PRD, epics, spine and UX describe a run started by hand and the five-state Dropbox line, with no 09:00, headless or Stalled text. "Daily backup" survives only as the file kind.
- `deferred-work.md` has no open entry about the morning job, so the next-epic spine-drift gate isn't held up by it.
