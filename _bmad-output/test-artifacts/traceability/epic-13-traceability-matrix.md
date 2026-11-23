---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-11-23'
workflowType: 'testarch-trace'
traceTarget: 'epic 13'
gateType: 'epic'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources:
  - '_bmad-output/planning-artifacts/epics.md (TR7 :224; AR59 :213; Epic 13 gate :3000; Stories 13.1-13.8 :3008-3392)'
  - '_bmad-output/planning-artifacts/dropbox-backup-plan-2026-11-21.md (P0 risks :147-164; amended by sprint-change-proposal-2026-11-23.md)'
  - '_bmad-output/implementation-artifacts/epic-13-context.md'
  - '_bmad-output/implementation-artifacts/epic-13-retro-2026-11-23.md (action 88)'
  - '_bmad-output/test-artifacts/atdd-checklist-13-*.md (story ACs and their priority markers; see "ATDD checklists")'
externalPointerStatus: 'not_used'
collectionStatus: 'COLLECTED'
sourceSha: '306b8fc'
retrace: 'second run, 2026-11-23, after retro items 89-92'
---

# Traceability Matrix & Gate Decision: Epic 13, Back up to Dropbox, and restore through an agent

**Target:** Epic 13, Stories 13.1 to 13.8 (gate type: epic). This is Epic 13 retro action 88 (`epic-13-retro-2026-11-23.md:251`).
**Date:** 2026-11-23
**Evaluator:** Oleg (TEA Agent)
**Commit under trace:** `306b8fc`. This is the **re-trace**. The first trace ran at `f8627f9` and gave FAIL with P0 45/49 (`18d62dc`). Since then:
- `2cacf0e` recorded Oleg's decisions and waiver W-13-1.
- Retro items have landed:
  - 92, the port-8790 flake: `dde2071`.
  - 90, the restore-path coverage gate: `d641f55`, `722b7e6`.
  - 89, the spine and planning-text reconciliation, including the 13.2 AC-3 and AC-6 rewording: `b7fe93a`.
  - 91, true Dropbox failure messages, and a failed prune recorded as the upload: `7f42bb2`, `306b8fc`.
- The re-trace itself changed no product code and added no test. It re-read every row the retro items touched, and moved each cited line number to where the test is now.

**Gate thresholds:**
- **Coverage:** TR7 (`epics.md:224`) requires P0 = 100% and P1 ≥ 95%. That is stricter than the workflow default of 90%, so TR7 applies. Overall coverage must be ≥ 80%.
- **Other TR7 clauses:** an API test for every error code, `check:api` clean, and coverage ≥ 90% on `domain/` and ≥ 80% on `intents/` + `store/`.
- **Epic 13 gate** (`epics.md:3000`). It requires all of these:
  - TR7.
  - Coverage ≥ 90% on `bookvie_dropbox/` and on `agent/`'s restore path.
  - The plan's P0 risks green against fakes.
  - Every new tool's registered description, in both servers, equal to its AC text.
  - The guide's commands matching the CLI.
  - No test touching the network, the real Keychain, `~/bookvie-data` or a real backups folder.
  - Oleg's manual runs (13.1 gate 2, 13.4 first run, 13.8 restores) recorded in their specs.

**Machine-readable:** `epic-13-e2e-trace-summary.json` and `epic-13-gate-decision.json`, both in this folder.

**Live verification results:** none on file. The three manual ACs (13.1 AC-11, 13.4 AC-5, 13.8 AC-6) are recorded by hand in their specs. They are counted as recorded manual checks, the way Epic 12 counted 12.1 AC-8, and only for what each record actually says.

**Waiver register:** `_bmad-output/test-artifacts/gate-waivers.md`, with one waiver, W-13-1 (13.1 · AC-11), filed by Oleg on 2026-11-23. See "Waiver register review". As workflow rule 6 requires, it does not change the derived decision.

**Tests added by this trace:** none.

---

## Gate Decision: FAIL (derived), WAIVED by Oleg (W-13-1)

**Rationale:**
- **P0 coverage is 98.0% (49/50).** TR7 and the workflow's rule 1 require 100%, so the derived decision is **FAIL**. The one P0 criterion below FULL is **13.1 · AC-11** (manual gate 2). Its spec records the runs: run A in detail (`spec-13-1:258`), and runs B and C, VS Code and `claude -p` as "everything is ok" (`:259-260`). It does not transcribe "the message as shown".
- **Waiver W-13-1 covers 13.1 · AC-11 and is valid** against every check in `checklist.md` → "Waiver Scenarios" (see "Waiver register review"). Oleg is the approver, and it expires on 2026-12-23. With that override, **the gate stands WAIVED**. The gap stays in the gap list and in every percentage below.
- **The other three first-trace P0 gaps are closed:**
  - **13.2 · AC-9 (same-day rerun).** Item 91 reworded the AC to the behavior: a fault before the finish leaves the first copy, and a mismatch after the finish has already replaced it and says so. `test_dropbox_upload.py:351` and `test_dropbox_upload_edges.py:206` establish both halves. The skill line, the Backup page and the guide no longer say "Nothing in Dropbox was deleted" for `upload_incomplete` (`test_backup_skill.py:248`, `:470`; `dropbox-backup-line.spec.ts:100`; `test_dropbox_backup_guide.py:225`).
  - **13.2 · AC-6.** Item 89 reworded it to Dropbox's per-request content hash, with the returned size and hash checked against the bytes sent. `test_dropbox_upload.py:147` establishes that.
  - **13.2 · AC-3.** Item 89 reworded it, as Oleg decided, to what `test_dropbox_contracts.py:68` proves: both copies agree across block boundaries, and the published digests give the published hash.
- **Item 91 added an AC, 13.2 · AC-10:** a failed delete after a verified upload is recorded as `uploaded`, and a failed listing stays `other`. It is P0 and FULL.
- **P1 is 100% (11/11). Overall coverage is 96.8% (60/62).** The one P2, 13.1 · AC-12, is still PARTIAL.
- **Every Epic 13 gate clause now holds:**
  - The restore-path coverage gate is enforced: `coverage_gate.py`, "restore path", 95.29%. `intents/restore_file.py` is at 100%.
  - `npm run check` exited 0 on the first run (2488 pytest, 396 node, 803 e2e, smoke).
  - Every plan P0 risk is green.
  - All seven new descriptions are read from `epics.md` on both servers.
  - Every new error code has a tool test.
  - The guide's commands parse.
  - Tests stay isolated from the network, the Keychain and the real folders.
  - All three manual runs are recorded. 13.1's record is thin and waived.

**What turns this into PASS:**
- **Oleg's next real restore** (W-13-1's monitoring plan; retro E13-B9) is quoted into `spec-13-1`'s "Manual runs (AC-11)" section: the message bookvie's question showed, and what a decline at each prompt showed.
- A re-trace then counts 13.1 · AC-11 FULL (P0 50/50) and closes W-13-1 with a `closed:` line.
- 13.1 · AC-12 (P2) doesn't block. It needs one more assertion in `test_dropbox_backup_guide.py:55`.

### TR7 criteria and the Epic 13 gate

| Clause | Evidence | Status |
|---|---|---|
| P0 = 100% | 49/50 FULL. Missing: 13.1 AC-11, waived (W-13-1) | ❌ NOT MET (waived) |
| P1 ≥ 95% | 11/11 FULL | ✅ MET |
| Every error code has an API test | "Error codes" below: each code and every `reason` has a tool test. The HTTP numbers (422/409/503) are asserted nowhere, because these codes travel only through tools, which carry `kind`/`code`/`message` and not the status. Low risk, same as Epic 12's tool-only codes | ✅ MET (noted) |
| `check:api` clean | contract up to date, Prettier, `tsc -b`, oxlint (0 errors; 3 warnings that predate Epic 13); node tests 396 passed, 0 failed, 0 skipped | ✅ MET |
| Coverage ≥ 90% `domain/`, ≥ 80% `intents/`+`store/` | `coverage_gate.py`: domain 100.00% (468/468), intents+store 97.12% (2459/2532) | ✅ MET |
| Coverage ≥ 90% on `bookvie_dropbox/` | `coverage_gate.py:31` gates it whole at 90% (self-test `test_coverage_gate.py:49`): 95.47% (611/640) | ✅ MET |
| `npm run check` green | Exit 0 on the first run at `306b8fc` (see "Run evidence"). Item 92 gave each sign-in test its own port, so only one test still binds 8790 | ✅ MET |
| Coverage ≥ 90% on `agent/`'s restore path | `coverage_gate.py:33` `RESTORE_PATH` gates `agent/restore_gate.py`, `intents/restore_file.py` and `intents/backup_file.py` as whole modules at 90%; a module that isn't measured fails the gate. Result: 95.29% (526/552). By module: `restore_file.py` 100%, `restore_gate.py` 96%, `backup_file.py` 94%. Self-tests: `test_coverage_gate.py:160`, `:173` | ✅ MET |
| Plan P0 risks green against fakes | "Epic 13 P0 risks" below | ✅ MET |
| Every new tool's registered description equals its AC text, in both servers | `agent_client.py:103-205` parses each "Description:" line from `epics.md` Epic 13 (and checks the line sits in its story). Each comparison has a test: <ul><li>`list_local_backups`, `preview_restore`, `restore_backup`: `test_agent_restore.py:667` (in `:657`)</li><li>`record_backup_upload`: `test_agent_backup_upload.py:224`</li><li>`export_backup` with `forUpload`: `test_agent_backup_upload.py:203`, `test_agent_backup.py:201`</li><li>`upload_backup`: `test_dropbox_upload.py:135`, through the real `bookvie-dropbox serve` over stdio</li><li>`list_backups`, `download_backup`: `test_dropbox_download.py:125`, through the real `bookvie-dropbox serve` over stdio</li></ul>That is 7 of 7 | ✅ MET |
| The guide's commands match the CLI | `test_dropbox_backup_guide.py:143` parses every `bookvie`/`bookvie-dropbox` command in the guide's fenced shell blocks with each CLI's `parse_args`. Commands in prose are not checked (the retro accepted this as low). `test_morning_job_removed.py:193`: no `autobackup` command remains | ✅ MET |
| No test touches the network, the real Keychain, `~/bookvie-data` or a real backups folder | <ul><li>`conftest.py:77-91`: the autouse `_isolated_home` sets a temp `HOME`, asserted, and `PYTHON_KEYRING_BACKEND=keyring.backends.fail.Keyring`, which subprocesses inherit.</li><li>`conftest.py:166-177`: the autouse `_on_the_machine` refuses non-loopback lookups and connects in-process (self-test `test_agent_cover_url.py:474`).</li><li>All Dropbox traffic goes through `FakeDropbox` or `FakeDropboxHttp` (`dropbox_fakes.py`). `FakeDropbox` refuses any SDK method it doesn't model (`dropbox_fakes.py:540`).</li><li>The real-folder snapshot is under "Run evidence".</li></ul>Subprocesses are not under the socket guard. The only Dropbox subprocess tests list tools or hit the failing Keychain first | ✅ MET |
| Manual runs recorded in their specs | <ul><li>13.4 AC-5: `spec-13-4:104`, `:117`, `:189` (uploaded 19:37, skipped 20:36).</li><li>13.8 AC-6: `spec-13-8:152-157` (six runs, dated 2026-11-23).</li><li>13.1 AC-11: recorded, but thinly (`spec-13-1:253-264`); waived by W-13-1.</li></ul> | ⚠️ 2 of 3 in full, 1 waived |

### Epic 13 P0 risks

The plan's P0 risks (`dropbox-backup-plan-2026-11-21.md:147-164`), as the epic's gate lists them after the 2026-11-23 sprint change:
- "Badge states" (`:154`) is now "the Dropbox line's states", with no time-out.
- "Headless can't restore" (`:163`) is gone with the headless run, so it is not traced.

| Risk | Matrix items | Key tests | Status |
|---|---|---|---|
| Verify then prune (a mismatch, failed chunk, failed rename or timeout deletes nothing; with 3 copies exactly the oldest goes, by the date in the name; with fewer, nothing goes) | 13.2 AC-6, AC-7, AC-8, AC-10 | <ul><li>`test_dropbox_upload.py:147` (finish before delete; deletes the 17 Nov copy, which was uploaded last)</li><li>`:253` (4 cases)</li><li>`:312` (12 failure cases, no deletes)</li><li>`test_dropbox_upload_edges.py:95`, `:188` (never the one just written)</li><li>`test_dropbox_follow_ups.py:373`</li></ul> | ✅ green. A delete that fails after the verify is recorded as the upload, with its real count (`test_dropbox_upload_edges.py:95`, `test_backup_skill.py:494`); a listing that fails stays `other` and deletes nothing (`test_dropbox_follow_ups.py:373`) |
| Prune scope (non-daily files never deleted; no other write tool) | 13.2 AC-7; 13.7 AC-1 | <ul><li>`test_dropbox_upload.py:253` (6 non-daily files and a daily-named folder)</li><li>`test_dropbox_download.py:121`, `:139-140` (exactly three tools; no delete/move/rename)</li><li>`dropbox_fakes.py:540`</li></ul> | ✅ green |
| Same-day rerun (a fault before the finish leaves that day's copy; a mismatch after the finish has replaced it and says so; AC-9 as item 91 reworded it, AD-22 narrowed by items 89 and 91) | 13.2 AC-9 | <ul><li>`test_dropbox_upload.py:351` (verified replace; a failing chunk keeps the copy)</li><li>`test_dropbox_upload_edges.py:206` (a mismatched finish says it "already replaced any earlier copy")</li></ul> | ✅ green against the reworded AC. Every message is now true: `test_backup_skill.py:470`, `test_dropbox_backup_guide.py:225` |
| Dev refusal (a dev backup refused before any network call; the skill never backs up `--dev`) | 13.2 AC-11; 13.4 AC-2 | <ul><li>`test_dropbox_upload.py:456` case `dev` (`fake.calls == []`)</li><li>`test_dropbox_follow_ups.py:170` (13 cases, `connect.count == 0`)</li><li>`test_backup_skill.py:222`</li></ul> | ✅ green |
| Token (an expired access token refreshes; a revoked refresh token fails naming `bookvie-dropbox auth`; no token in logs or tool results) | 13.2 AC-4, AC-8, AC-13; 13.7 AC-5 | <ul><li>`test_dropbox_upload.py:507` (real SDK over `FakeDropboxHttp`, two refreshes)</li><li>`test_dropbox_follow_ups.py:329` (refused refresh → `dropbox_signin`)</li><li>`test_dropbox_auth.py:98` (stdout, stderr, DEBUG log and files under HOME scanned; no `client_secret`)</li><li>`test_dropbox_download.py:340-345`</li></ul> | ✅ green. "Not in the repo" holds by design (PKCE, Keychain only), with no repo scan |
| Skip reports (an unchanged library records a skip, shown as Skipped) | 13.3 AC-4; 13.4 AC-1; 13.6 AC-1, AC-2 | <ul><li>`test_backup_skill.py:149` (second export answers `unchangedSinceUpload: true`, skip recorded)</li><li>`test_agent_backup_upload.py:148`, `:297`</li><li>`test_dropbox_backup_line.py:73`</li><li>`dropbox-backup-line.spec.ts:100`</li></ul> | ✅ green |
| The Dropbox line's states (dev, none, failed, uploaded, skipped; first match wins; no time-out; a manual Export doesn't move the line) | 13.6 AC-1, AC-2, AC-4 | <ul><li>`test_dropbox_backup_line.py:73` (every state; dev over upload and over failure; unreadable gives none), `:167`</li><li>`dropbox-backup-line.spec.ts:100` (every state, the 5 causes, when, counts, focus recompute, dev server), `:284` (Export, upload and restore each move only their own line)</li><li>`dropboxBackupLine.test.ts:49`, `:69`</li></ul> | ✅ green |
| Gates fail closed (declined, cancelled, timed out or an unsupported client → `restore_not_confirmed`, library, covers and backups unchanged; only an explicit accept goes on) | 13.1 AC-6 | <ul><li>`test_agent_restore.py:525` (12 cases, byte-identical, `.staging/` empty; the unsupported cases use a damaged file, so building a preview first would fail the test), `:799`</li><li>`test_restore_backup_edges.py:142`, `:166`, `:250`</li></ul> | ✅ green |
| The confirmation shows the truth (D14's counts and lost Books for the exact file) | 13.1 AC-5 | <ul><li>`test_agent_restore.py:332` (message equals `confirmation_text`, plain text), `:691`, `:707` (5 titles then "and 2 more"), `:741`</li><li>`test_agent_restore_follow_ups.py:292`, `:309`</li></ul> | ✅ green. The wording when only Books or only Card notes were added still waits on Oleg (`deferred-work.md`) |
| Safety copy (written first; restores back; a failure means no restore; never overwrites today's daily; the prune never touches it) | 13.1 AC-7, AC-8; 13.2 AC-11 | <ul><li>`test_agent_restore.py:547` (undo restores the pre-restore library and covers; today's daily byte-identical; `-2`), `:591` (4 fault steps → `safety_copy_failed`, nothing restored)</li><li>`test_agent_restore_follow_ups.py:154`, `:181` (one lock hold; safety copy before the `library.json` replace)</li><li>`test_dropbox_upload.py:456` (a safety copy is refused for upload, so the prune never sees it)</li></ul> | ✅ green |
| Allowed folders (outside, `..` or a symlink out refused before any read) | 13.1 AC-4; 13.7 AC-4, AC-6 | <ul><li>`test_agent_restore.py:290` (6 cases × 2 tools), `:310`</li><li>`test_restore_backup_edges.py:90`, `:235`</li><li>`test_agent_restore_follow_ups.py:100`, `:351`</li><li>`test_dropbox_download.py:287` (20 refused argument sets, 0 connects), `:362` (a download lists as `from_dropbox` and previews)</li></ul> | ✅ green |
| Same handler (tool and intent route give the same result and refusals; upload state unchanged after either) | 13.1 AC-9; 13.3 AC-6 | <ul><li>`test_agent_restore.py:614` (same `library.json` and covers; 3 refusals equal; commit fault equal)</li><li>`test_agent_restore_follow_ups.py:412`</li><li>`test_agent_backup_upload.py:365` (a route restore leaves `autoBackup` byte-identical)</li><li>`test_agent_restore.py:577`, `:584` (a tool restore leaves `local-state.json` byte-identical)</li></ul> | ✅ green. The tool-restore scene seeds no `autoBackup` group, but byte identity rules out any write |
| `download_backup` (only daily names; a hash mismatch leaves no file; a same-day name never lands in the backups folder itself) | 13.7 AC-3, AC-4, AC-5 | <ul><li>`test_dropbox_download.py:287`, `:312` (mismatch or broken transfer leaves no file or temp), `:232` (the same-day file in `~/bookvie-backups` untouched), `:247-251` (`bookvie-dev` lands in the dev folder)</li><li>`test_dropbox_download_edges.py:56`, `:118`</li></ul> | ✅ green |
| Still banned (delete-book and delete-card-note absent; plain `restore` unregistered) | 13.1 AC-10; 13.7 AC-1 | <ul><li>`test_agent_restore.py:657` (`:675-678`: `delete_book`, `delete_card_note`, `set_spine_color`, `restore` give -32602)</li><li>`test_agent_write.py:466`</li><li>`test_agent_mount.py:480`</li><li>`test_dropbox_download.py:139-140`</li></ul> | ✅ green |

### Run evidence

**Commit:** `306b8fc`, clean working tree.

**Command:** `npm run check` (`check:api`, `check:py`, `check:e2e`, `check:smoke`), started at 18:15:30.

**Result:** exit code 0 on the first run. It ended at 18:18:58.

| Check | Outcome |
|---|---|
| ruff format, ruff check | clean |
| pytest (`-n auto`, with coverage) | 2488 passed. The 6 warnings come from Pillow's size check, the Dropbox SDK's `utcnow()` deprecation, and `zipfile` duplicate names in the restore-refusal tests; none is a test problem |
| Coverage gates | `coverage_gate.py`: domain 100.00% (468/468), intents+store 97.12% (2459/2532), bookvie_dropbox 95.47% (611/640), **restore path 95.29% (526/552)**. All ok |
| `check:api` | contract up to date, Prettier, `tsc -b`, oxlint (0 errors; the 3 warnings that predate Epic 13); node tests 396 passed, 0 failed, 0 skipped |
| `check:e2e` | 803 passed (3.0 m), none flaky, retried or skipped |
| `check:smoke` | ok. The isolated install served `/`, a deep link and `/favicon.svg`; `bookvie-dropbox --help` exited 0; `POST /mcp initialize` answered 200, protocol 2025-11-25, with tools |

**Port-8790 flake (item 92).** On the first trace's commit `f8627f9`, `npm run check` failed 2 of 2 runs on the three port-8790 sign-in tests. Item 92's own build then recorded 5 green runs in a row (`dde2071`). This re-trace found the two sign-in files green 3 of 3 times under `pytest -n 8`, and this run was green.

**Real folders.** The `ls -la ~/bookvie-backups*` listing was taken before and after the run, ignoring the parent folder's `..` line. The two listings are identical. `find ~/bookvie-data -newermt '2026-11-23 18:15:30'` listed nothing.

---

## Oracle and scope

**Oracle.** The priority-bearing oracle is each Story 13.1 to 13.8 AC in `epics.md`: 62 items. Item 91 added one AC to 13.2, AC-10. 13.5 is the "Take out the morning job" story. The superseded "Run the backup every morning" has no AC in `epics.md` any more, so it isn't traced. Each story's ATDD checklist numbers its ACs in `epics.md` source order, with one exception. In 13.2, the new AC-10 shifts the checklist's AC-10 to AC-13 to this matrix's AC-11 to AC-14.

**Priority.** An AC's priority is the higher of:
- the highest `[P0]`…`[P3]` marker among its tests (ATDD and automate), and
- P0, when a P0 risk in the plan, as amended by the gate, names it.

The second rule raises three ACs from P1 to P0, and all three are FULL:
- 13.7 AC-6 (allowed folders)
- 13.8 AC-4 (never retries a refused restore)
- 13.6 AC-4 (a manual Export doesn't move the line)

**Manual ACs.** The trace counts a manual AC FULL only for what its spec records. 13.4 AC-5 and 13.8 AC-6 are recorded in full. 13.1 AC-11 is PARTIAL (see the rationale).

**ACs whose text later stories amended.** These are graded against `epics.md` as it stands:
- **13.1 · AC-10** ("Epic 12's tools plus three") and **13.2 · AC-5** ("exactly `upload_backup`"): 13.3 and 13.7 later added tools on purpose, and the tests assert the grown lists. FULL.
- **13.5 · AC-2** ("carries only `lastExportAt`"): 13.6 AC-1 later widened the view on purpose. FULL.

**Reworded since the first trace:**
- Item 89 reworded 13.2 AC-3 and AC-6, and 13.4's "How it works".
- Item 91 reworded 13.2 AC-8 and AC-9, added 13.2 AC-10, and changed the `upload_incomplete` sentence (UX-DR77, EXPERIENCE.md) and the `upload_backup` description.

Each reworded AC carries a dated note in `epics.md`. The first trace's "known defects graded as written" (E13-B1, E13-B2) are fixed. The wording and the behavior now agree, and the tests prove both.

**Out of scope, and why:**
- **A real Dropbox upload or download, and either skill in a real session.** Those need Oleg's Keychain token. 13.4 AC-5 and 13.8 AC-6 are their recorded runs.
- **A production-target restore from a Dropbox pick** (retro E13-B9). All six 13.8 AC-6 runs used `target: "bookvie-dev"`. The AC says "Given a `--dev` server", so it doesn't require one. It stays a watch item.
- **Behavior beyond the ACs that the retro deferred:** E13-B4 to B8 and E13-D2/D3, all low.
- **Safari and Firefox.** The e2e suite runs Chromium only, which covers the one supported browser (AGENTS.md "Supported browser").

---

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status |
| --------- | -------------- | ------------- | ---------- | ------ |
| P0        | 50             | 49            | 98.0%      | ❌ FAIL (waived) |
| P1        | 11             | 11            | 100%       | ✅ PASS |
| P2        | 1              | 0             | 0%         | ⚠️ PARTIAL |
| P3        | 0              | 0             | n/a        | n/a |
| **Total** | **62**         | **60**        | **96.8%**  | **WAIVED (derived FAIL)** |

Per story:

| Story | ACs | FULL | PARTIAL | P0 / P1 / P2 |
|---|---|---|---|---|
| 13.1 | 12 | 10 | 2 (AC-11 P0 waived, AC-12 P2) | 11 / 0 / 1 |
| 13.2 | 14 | 14 | 0 | 12 / 2 / 0 |
| 13.3 | 7 | 7 | 0 | 7 / 0 / 0 |
| 13.4 | 6 | 6 | 0 | 3 / 3 / 0 |
| 13.5 | 5 | 5 | 0 | 2 / 3 / 0 |
| 13.6 | 5 | 5 | 0 | 3 / 2 / 0 |
| 13.7 | 6 | 6 | 0 | 6 / 0 / 0 |
| 13.8 | 7 | 7 | 0 | 6 / 1 / 0 |

**Tests mapped:** the Epic 13 test files, all under `backend/tests/` unless a path is given.
- **Restore:** `test_agent_restore.py` (47 cases), `test_agent_restore_follow_ups.py` (25), `test_restore_backup_edges.py` (14), `restore_scene.py`.
- **Dropbox upload and sign-in:** `test_dropbox_upload.py` (31), `test_dropbox_upload_edges.py` (9), `test_dropbox_follow_ups.py` (28), `test_dropbox_auth.py` (11), `test_dropbox_cli_follow_ups.py` (10), `test_dropbox_contracts.py` (2), `test_dropbox_package.py` (1).
- **Dropbox download:** `test_dropbox_download.py`, `test_dropbox_download_edges.py`, `test_dropbox_download_follow_ups.py`.
- **Upload record:** `test_agent_backup_upload.py` (19), `test_agent_backup_upload_follow_ups.py` (17).
- **Skills:** `test_backup_skill.py`, `test_restore_skill.py`.
- **Dropbox line and removal:** `test_dropbox_backup_line.py`, `test_dropbox_backup_line_follow_ups.py`, `test_morning_job_removed.py`, `test_morning_job_removed_follow_ups.py`.
- **Guide:** `test_dropbox_backup_guide.py`.
- **Shared and older files with Epic 13 additions:** `test_layers.py`, `test_wheel_build.py`, `test_coverage_gate.py`, `conftest.py`, `dropbox_fakes.py`, `agent_client.py`.
- **Frontend:** `frontend/e2e/dropbox-backup-line.spec.ts` and `frontend/src/lib/dropboxBackupLine.test.ts`.

Every count comes from `pytest --collect-only`. No cited test is skipped, `fixme` or `xfail`.

### Detailed Mapping

Test levels: **api** means through the in-process MCP client or the HTTP routes; **int** means a real subprocess (a `bookvie` or `bookvie-dropbox` process); **text** means assertions over a skill's or the guide's text.

#### Story 13.1: Restore my library through an agent, with two confirmations

| AC | Criterion | Priority | Coverage | Tests (level) | Notes |
|---|---|---|---|---|---|
| 13.1 · AC-1 | `list_local_backups` lists dailies, safety copies and `from-dropbox/` dailies, newest first, as `{path, kind, backupTime, size, contentHash}`; never other names, `.tmp*`, folders or symlinks; missing or empty folder gives `[]` | P0 | FULL | `test_agent_restore.py:138`, `:321`; `test_agent_restore_follow_ups.py:100`, `:121` (hash over 4 MiB); `test_restore_backup_edges.py:90`, `:115`, `:235` (api) | Dropbox's published vector is 13.2 AC-3's |
| 13.1 · AC-2 | `build_export` stamps the `library.json` entry with the same `clock.now()` as the name; `backupTime` read from the entry | P0 | FULL | `test_agent_restore.py:184`, `:815`; `test_restore_backup_edges.py:74` (0x5455 seconds); `test_agent_restore_follow_ups.py:141` (api) | |
| 13.1 · AC-3 | `preview_restore` gives backup and current counts, Books and Card notes added since, changes nothing; damaged or newer archives get the restore intent's errors | P0 | FULL | `test_agent_restore.py:228` (error objects compared to `POST /api/intents/restore`); `test_restore_backup_edges.py:210`; `test_agent_restore_follow_ups.py:244`, `:292`, `:309` (api) | |
| 13.1 · AC-4 | Outside path, `..`, symlink out, folder or non-backup name → 422 `restore_outside_backups` before the file is opened; nothing changes | P0 | FULL | `test_agent_restore.py:290` (12), `:310`; `test_agent_restore_follow_ups.py:100`, `:351`; `test_restore_backup_edges.py:90`, `:235` (api) | Each refused case points at a restorable zip, so a missing check would preview |
| 13.1 · AC-5 | First call returns one form elicitation with UX-DR80's plain text for that file; hand-sealed `requestState`; nothing changes yet | P0 | FULL | `test_agent_restore.py:332`, `:691`, `:707` (api), `:741` (unit) | The token's contents are proved by AC-6's behavior, not inspected |
| 13.1 · AC-6 | decline/cancel/changed/expired/unsupported each `restore_not_confirmed` with its `reason` and no byte changes; unsupported before any preview; only an explicit accept goes on | P0 | FULL | `test_agent_restore.py:525` (12), `:770`, `:799`; `test_restore_backup_edges.py:142`, `:166`, `:250`; `test_agent_restore_follow_ups.py:341` (api) | |
| 13.1 · AC-7 | Accept: one lock hold, SHA-256 re-check, stage, atomic safety copy, apply; returns `{restoredFrom, backupTime, safetyCopy}`; undo works; no daily replaced; `local-state.json` byte-identical; finishes in time | P0 | FULL | `test_agent_restore.py:547`; `test_agent_restore_follow_ups.py:154`, `:181` (`RecordingLock`), `:244`; `test_restore_backup_edges.py:115` (api) | |
| 13.1 · AC-8 | Safety-copy failure → 503 `safety_copy_failed` (`couldnt_save`), no partial copy, nothing restored | P0 | FULL | `test_agent_restore.py:591` (4 fault steps); `test_agent_restore_follow_ups.py:210`, `:226`; `test_restore_backup_edges.py:276` (api) | |
| 13.1 · AC-9 | Tool and `POST /api/intents/restore` restore the same library and covers, with equal refusals; the route and the Backup page are unchanged; a write fault is `couldnt_save` both ways | P0 | FULL | `test_agent_restore.py:614`; `test_agent_restore_follow_ups.py:412` (api) | |
| 13.1 · AC-10 | Tool list is the earlier tools plus the three; `delete_book`, `delete_card_note`, `set_spine_color`, `restore` unknown; each new code tested | P0 | FULL | `test_agent_restore.py:657`; `test_agent_mount.py:197` (int, both modes); `test_agent_restore_follow_ups.py:469` (api) | Later grown by 13.3's tool (`test_agent_backup_upload.py:214`) |
| 13.1 · AC-11 | Manual: Oleg's terminal session on `--dev` with the `ask` rule (one accept, two declines); the spec records the runs, the message as shown, and VS Code and `claude -p` | P0 | **PARTIAL** | `spec-13-1:253-264` (manual) | Run A in detail; B, C, VS Code and `claude -p` only "everything is ok"; the message as shown not transcribed. Waived: W-13-1, until 2026-12-23 |
| 13.1 · AC-12 | The guide's Restoring section: the `ask` rule and how to check it, the two prompts, safety copy and undo, troubleshooting per code; the README links it | P2 | **PARTIAL** | `test_dropbox_backup_guide.py:55` (text) | Pins the rule JSON, the six codes, `bookvie-pre-restore-`, VS Code, `claude -p` and the README link. The check, prompts and undo are in `docs/dropbox-backup.md:168`, `:183`, `:198-202`, but no test pins them |

#### Story 13.2: Upload a backup to my Dropbox

| AC | Criterion | Priority | Coverage | Tests (level) | Notes |
|---|---|---|---|---|---|
| 13.2 · AC-1 | `dropbox` and `keyring` pinned; the wheel ships both packages; `bookvie-dropbox` script; lock updated; smoke runs `--help` | P0 | FULL | `test_dropbox_package.py:25` (unit); `test_wheel_build.py:111` (int, real wheel); `test_dropbox_cli_follow_ups.py:119` (int) | Versions in `spec-13-2:264` |
| 13.2 · AC-2 | `bookvie/` never imports `bookvie_dropbox`, `dropbox`, `keyring`; the reverse too | P0 | FULL | `test_layers.py:177`, `:184` (unit, AST, scanner self-test) | |
| 13.2 · AC-3 | Copied regex, folders and content hash equal bookvie's: both copies give the same hash across 4 MiB block boundaries, and Dropbox's published block digests give its published hash | P0 | FULL | `test_dropbox_contracts.py:68` (unit) | Reworded by item 89 (`b7fe93a`), as Oleg decided |
| 13.2 · AC-4 | `auth`: PKCE, no secret, fixed loopback port, browser, token only in the Keychain, replaces the old one, never printed, logged or written | P0 | FULL | `test_dropbox_auth.py:98` (int, real loopback; stdout, stderr, DEBUG log and files scanned), `:287`, `:304`, `:328`, `:349`; `test_dropbox_cli_follow_ups.py:188`, `:237` | Since item 92, only `test_dropbox_auth.py:98` binds 8790 |
| 13.2 · AC-5 | `bookvie-dropbox serve` lists `upload_backup` with the quoted description | P0 | FULL | `test_dropbox_upload.py:120` (int, stdio; description at `:135`); `test_dropbox_follow_ups.py:224` | Now three tools (13.7) |
| 13.2 · AC-6 | Chunked session finished to the final name with overwrite and `client_modified`, each request carrying Dropbox's per-request hash; returned size and hash checked against the bytes sent; then delete exactly the oldest by date, never the one written; returns `{name, copies: 3, deleted, contentHash}` | P0 | FULL | `test_dropbox_upload.py:147`; `test_dropbox_upload_edges.py:59`, `:188`; `test_dropbox_follow_ups.py:261`, `:292`, `:306` (api) | Reworded by item 89 (`deferred-work.md:1502` resolved) |
| 13.2 · AC-7 | ≤ 3 copies deletes nothing; non-dailies never deleted or counted | P0 | FULL | `test_dropbox_upload.py:253` (4 cases); `test_dropbox_follow_ups.py:404` (api) | |
| 13.2 · AC-8 | Hash refused, chunk failed, timeout, mismatch → nothing deleted, `upload_incomplete`; full → `dropbox_full`; sign-in → `dropbox_signin` naming `bookvie-dropbox auth`; else `other` | P0 | FULL | `test_dropbox_upload.py:312` (12); `test_dropbox_follow_ups.py:329`, `:357`, `:373`; `test_dropbox_upload_edges.py:95`, `:133`, `:223` (api) | |
| 13.2 · AC-9 | A second same-day upload that fails before the finish leaves the first; one whose copy doesn't match after the finish has already replaced it, deletes nothing else, and says so | P0 | FULL | `test_dropbox_upload.py:351`; `test_dropbox_upload_edges.py:206` (api) | Reworded by item 91 (`7f42bb2`); `deferred-work.md:1549` resolved |
| 13.2 · AC-10 | After a verified upload, a failed delete still returns the upload: `copies` is the true count, `deleted` only what was deleted, plus `pruneFailed`, and the run is recorded `uploaded`; a failed listing stays `other` and deletes nothing | P0 | FULL | `test_dropbox_upload_edges.py:95` (api); `test_dropbox_follow_ups.py:373` (api); `test_backup_skill.py:494` (api + text: recorded `uploaded` with 5 copies, next export `unchangedSinceUpload`, the note) | New, item 91. A failed listing stays `other` because the count is unknown; Oleg is asked to confirm |
| 13.2 · AC-11 | Dev folder, `from-dropbox`, safety copy, outside, `..`, symlink out, missing file → refused before any network call | P0 | FULL | `test_dropbox_upload.py:456` (10); `test_dropbox_follow_ups.py:170` (13), `:207`, `:241`; `test_dropbox_upload_edges.py:78`, `:163` (api) | |
| 13.2 · AC-12 | A file over 150 MB goes through more than one chunk and verifies | P1 | FULL | `test_dropbox_upload.py:486` (api, sparse file; the fake refuses requests over 150 MiB) | |
| 13.2 · AC-13 | An expired access token is refreshed and the call succeeds | P0 | FULL | `test_dropbox_upload.py:507` (int, real SDK over `FakeDropboxHttp`) | |
| 13.2 · AC-14 | The guide's Setup order, both `claude mcp add --scope user` lines, `claude mcp list`, troubleshooting; every command parsed | P1 | FULL | `test_dropbox_backup_guide.py:143` (text + CLI parse); `test_dropbox_cli_follow_ups.py:119`, `:131` | |

#### Story 13.3: Record each upload in bookvie

| AC | Criterion | Priority | Coverage | Tests (level) | Notes |
|---|---|---|---|---|---|
| 13.3 · AC-1 | `forUpload: true` leaves "Last export" unchanged (Backup and Home); otherwise records it; both return `libraryHash` and `unchangedSinceUpload`; new description | P0 | FULL | `test_agent_backup_upload.py:148`, `:632`, `:650`, `:685`; `test_agent_backup.py:147`; `test_agent_backup_upload_follow_ups.py:52`, `:85`, `:115` (api) | |
| 13.3 · AC-2 | Tool list adds `record_backup_upload` with the quoted description | P0 | FULL | `test_agent_backup_upload.py:214` (api) | |
| 13.3 · AC-3 | An upload stores `lastReport`, `lastOk`, `lastUpload` (Clock time, zip time, name, copies, bookvie's own hash); a bad hash, path or missing `copies` is `invalid_fields` and stores nothing | P0 | FULL | `test_agent_backup_upload.py:238` (6 refusals byte-identical), `:482`, `:533`, `:570`, `:591` (api) | |
| 13.3 · AC-4 | A skip replaces `lastReport` and `lastOk`; a failure only `lastReport` with its cause; `lastUpload` kept; bad cause, missing cause, unknown outcome → `invalid_fields` | P0 | FULL | `test_agent_backup_upload.py:297`, `:611`; `test_agent_backup_upload_follow_ups.py:182` (api) | |
| 13.3 · AC-5 | bookvie's cause enum equals `bookvie_dropbox`'s | P0 | FULL | `test_dropbox_contracts.py:107` (unit) | |
| 13.3 · AC-6 | One `local-state.json` writer with its own lock; both groups survive; malformed replaced and logged; write fault `couldnt_save`; export and restore never touch `autoBackup` | P0 | FULL | `test_agent_backup_upload.py:365`, `:699` (50-thread race); `test_agent_backup_upload_follow_ups.py:156`, `:214`; `test_agent_restore.py:547` (api) | |
| 13.3 · AC-7 | A data folder like `~/bookvie` has no backups folder: `export_backup` `couldnt_save`, `list_local_backups` empty; only `~/bookvie-data` writes to `~/bookvie-backups` | P0 | FULL | `test_agent_backup_upload.py:446` (api + int); `test_agent_backup.py:443`; `test_agent_backup_upload_follow_ups.py:237` | |

#### Story 13.4: Back up to Dropbox with one skill

| AC | Criterion | Priority | Coverage | Tests (level) | Notes |
|---|---|---|---|---|---|
| 13.4 · AC-1 | `get_app_info` → `export_backup({forUpload})` → `upload_backup` unless unchanged → always one `record_backup_upload` with the right outcome and cause; MCP-only tools | P0 | FULL | `test_backup_skill.py:149` (text + real chain: upload, skip, sign-in failure), `:323`, `:358`, `:367`, `:494`, `:398`, `:417`, `:432`, `:457`, `:470`, `:303`; `test_agent_backup_upload.py:148` | `:494`: a failed prune is recorded `uploaded` with its real count (item 91) |
| 13.4 · AC-2 | On `--dev`: no upload, no record, says a development library is never uploaded | P0 | FULL | `test_backup_skill.py:222` (text + api), `:457`; `test_dropbox_upload.py:456` [dev] (api) | "Records nothing" is proved in the text; an agent-run test was rejected on purpose (`spec-13-4:146`) |
| 13.4 · AC-3 | One-line report in UX-DR82 words | P1 | FULL | `test_backup_skill.py:248` (5 `Failed:` lines against EXPERIENCE.md via `failing_reasons()`), `:387`, `:528` (text) | The `upload_incomplete` line now reads "didn't finish or didn't match … that day's copy there may be damaged" (item 91) |
| 13.4 · AC-4 | Run by hand with bookvie down: step 1 starts it and goes on | P1 | FULL | `test_backup_skill.py:274` (text + real `/mcp` probe), `:303` | |
| 13.4 · AC-5 | Manual: two real runs, upload then skip, recorded | P0 | FULL | `spec-13-4:104`, `:117`, `:189` (manual) | |
| 13.4 · AC-6 | The guide: first run, How it works, `upload_incomplete` troubleshooting, restore by hand; README lists the skill | P1 | FULL | `test_dropbox_backup_guide.py:225` (text; README at `:267-268`) | Item 89 rewrote "How it works" to the by-hand run |

#### Story 13.5: Take out the morning job

| AC | Criterion | Priority | Coverage | Tests (level) | Notes |
|---|---|---|---|---|---|
| 13.5 · AC-1 | `bookvie autobackup …` is a usage error; `cli.py` has no job code | P0 | FULL | `test_morning_job_removed.py:100` (unit) | |
| 13.5 · AC-2 | No `launchd_probe`, nothing runs launchctl, no `AutoBackupView`, `api:gen` regenerated; stored group and the upload tools unchanged | P0 | FULL | `test_morning_job_removed.py:125`; `test_morning_job_removed_follow_ups.py:26`; `test_agent_backup_upload.py:148`, `:297` (api + source scan) | |
| 13.5 · AC-3 | The skill runs by hand; no launchd, 09:00, `claude -p` or headless; new `upload_incomplete` line; EXPERIENCE header and `failing_reasons` updated | P1 | FULL | `test_morning_job_removed.py:157`; `test_backup_skill.py:248` (text) | |
| 13.5 · AC-4 | The guide and README have no job; one bootout note under Uninstalling | P1 | FULL | `test_morning_job_removed.py:187`; `test_morning_job_removed_follow_ups.py:58`; `test_dropbox_backup_guide.py:143` (text) | |
| 13.5 · AC-5 | `test_autobackup.py` gone; no test names the job; check green | P1 | FULL | `test_morning_job_removed.py:221` (repo scan) | "Check green" is this run |

#### Story 13.6: See on the Backup page how the last Dropbox backup went

| AC | Criterion | Priority | Coverage | Tests (level) | Notes |
|---|---|---|---|---|---|
| 13.6 · AC-1 | `views/backup.dropboxBackup` computed on the server: dev, none, uploaded, skipped, failed; dev wins; unreadable → none; `lastUploadAt = backupAt` | P0 | FULL | `test_dropbox_backup_line.py:73`, `:167` (api), `:215` (unit); `test_dropbox_backup_line_follow_ups.py:37`, `:81`, `:99` (api) | |
| 13.6 · AC-2 | One line under "Last export" in UX-DR75 words per state, each cause's sentence, "when" per UX-DR76 and recomputed on focus, copy counts | P0 | FULL | `dropbox-backup-line.spec.ts:100` (e2e); `dropboxBackupLine.test.ts:27`, `:41`, `:49`, `:69`, `:82`, `:105` (unit); `test_dropbox_backup_line.py:220` | |
| 13.6 · AC-3 | `meta` text, ink only when failed, text only, not a control, Tab stop or live region, never on Home, axe in both themes | P1 | FULL | `dropbox-backup-line.spec.ts:180` (e2e) | |
| 13.6 · AC-4 | Export moves "Last export" only; a recorded upload moves the line only; a restore moves neither | P0 | FULL | `dropbox-backup-line.spec.ts:284` (e2e, real tools and restore) | Marker P1, raised by the plan |
| 13.6 · AC-5 | One troubleshooting entry per cause quoting the line's exact words | P1 | FULL | `test_dropbox_backup_line.py:155` (text) | Entries at `docs/dropbox-backup.md:78`, `:90`, `:98`, `:104`, `:110` |

#### Story 13.7: Fetch a backup from my Dropbox

| AC | Criterion | Priority | Coverage | Tests (level) | Notes |
|---|---|---|---|---|---|
| 13.7 · AC-1 | The stdio server lists exactly `upload_backup`, `list_backups`, `download_backup`; no delete, move or out-of-folder tool | P0 | FULL | `test_dropbox_download.py:109` (int, stdio); `test_dropbox_download_edges.py:42` (api) | |
| 13.7 · AC-2 | `list_backups`: dailies only, newest first, `{name, backupTime, size, contentHash}`; description | P0 | FULL | `test_dropbox_download.py:146`; `test_dropbox_download_follow_ups.py:39`, `:55`; `test_dropbox_download_edges.py:85` (api) | |
| 13.7 · AC-3 | `download_backup` into `from-dropbox/` of the target via temp, fsync, rename, only when verified; the same-day name never in the backups folder; description | P0 | FULL | `test_dropbox_download.py:194`; `test_dropbox_download_edges.py:136`; `test_dropbox_download_follow_ups.py:67` (api) | |
| 13.7 · AC-4 | Non-daily name or bad target refused before any network call; no file written | P0 | FULL | `test_dropbox_download.py:287` (20 sets); `test_dropbox_download_edges.py:56` (api) | |
| 13.7 · AC-5 | Mismatch or broken transfer → `download_incomplete`, nothing left; sign-in → `dropbox_signin`; else `other` | P0 | FULL | `test_dropbox_download.py:312`; `test_dropbox_download_edges.py:118`; `test_dropbox_download_follow_ups.py:151` (api) | |
| 13.7 · AC-6 | A download lists as `from_dropbox` with the same `contentHash` and previews like a daily | P0 | FULL | `test_dropbox_download.py:362`; `test_dropbox_download_follow_ups.py:87` (int, both servers) | Marker P1, raised by the plan |

#### Story 13.8: Restore with one skill, from this computer or Dropbox

| AC | Criterion | Priority | Coverage | Tests (level) | Notes |
|---|---|---|---|---|---|
| 13.8 · AC-1 | Starts bookvie, lists both sources as one pick list (one row per hash, 10 newest, "The newest is 1. Which one?"); suggests, never picks; the unreachable and none-anywhere lines | P0 | FULL | `test_restore_skill.py:117` (text + real chain), `:318`, `:347`, `:356`, `:383`, `:457`, `:486` | "Waits" and "never picks" are pinned as text; the behavior was seen in AC-6 |
| 13.8 · AC-2 | A Dropbox pick downloads into the restoring bookvie's target, then previews the local path | P0 | FULL | `test_restore_skill.py:172` (text + real download then `preview_restore`), `:399` | |
| 13.8 · AC-3 | The preview in UX-DR79's words; asks in chat; `restore_backup` only after a yes | P0 | FULL | `test_restore_skill.py:210`, `:416`, `:439` (text + api) | |
| 13.8 · AC-4 | Each outcome in UX-DR81's words, `~` paths, terminal advice only for `unsupported`, never retries | P0 | FULL | `test_restore_skill.py:255` (text); `test_agent_restore.py:525` (api, the `unsupported` cases) | Marker P1, raised by the plan |
| 13.8 · AC-5 | On development: the `bookvie-dev` tools and target; never the real library | P0 | FULL | `test_restore_skill.py:285`, `:507` (text); `test_dropbox_download.py:247-251` (api) | |
| 13.8 · AC-6 | Manual: six real-terminal runs on `--dev`, recorded | P0 | FULL | `spec-13-8:152-157` (manual) | All on `bookvie-dev` (E13-B9, watch). Stale lines `spec-13-8:150`, `:184` (action 89) |
| 13.8 · AC-7 | The guide describes the skill step by step, Dropbox downloads, manual fallback, troubleshooting; README lists the skill | P1 | FULL | `test_dropbox_backup_guide.py:274`; `test_restore_skill.py:523` (text) | |

### Error codes (TR7, AR59)

| Code | Tool tests |
|---|---|
| 422 `restore_outside_backups` | `test_agent_restore.py:290`, `:310` |
| 409 `restore_not_confirmed`: `declined`, `cancelled`, `changed`, `expired`, `unsupported` (all 5 values of `RestoreNotConfirmedReason`, `contract.py:62-69`) | `test_agent_restore.py:525`, `:799`; `test_restore_backup_edges.py:142`, `:166`, `:250` |
| 503 `safety_copy_failed` | `test_agent_restore.py:591`; `test_agent_restore_follow_ups.py:210`; `test_restore_backup_edges.py:276` |
| All three in the OpenAPI error enum | `test_contract.py:289` |
| `bookvie_dropbox` causes `dropbox_signin`, `upload_incomplete`, `dropbox_full`, `other` | `test_dropbox_upload.py:312` |
| `backup_write` (bookvie's export failure, recorded by the skill) | `test_backup_skill.py:323`; `test_agent_backup_upload.py:297` |
| `download_incomplete` | `test_dropbox_download.py:312`; `test_dropbox_download_edges.py:118` |

### Coverage heuristics

- **Endpoints without tests:** none. Epic 13 adds no HTTP route. `POST /api/intents/restore` is unchanged and compared through `test_agent_restore.py:614`. `/api/views/backup` gains `dropboxBackup` (`test_dropbox_backup_line.py:73`).
- **Auth negative paths:** present. The sign-in failures, a refused refresh, a denied or failed Keychain and a failed or cancelled `auth` are each tested (`test_dropbox_auth.py`, `test_dropbox_follow_ups.py:329`, `test_dropbox_cli_follow_ups.py:188`).
- **Happy-path-only criteria:** none. Every tool has its refusal and fault tables.
- **UI states:** present for the Dropbox line: every state, a failed load as the page's "Couldn't load", focus recompute, and axe in both themes.

### Rejected evidence

None. Every cited test's assertions establish what it is cited for. Weak spots, accepted as evidence but noted:
- `test_restore_skill.py:117` ("waits") and `:255` ("never retries") are loose regexes over the skill text. The behavior itself rests on the 13.8 AC-6 runs.
- `test_dropbox_upload.py:120` is named "lists exactly upload_backup" but correctly asserts the three-tool list.
- Stale line numbers in the ATDD checklists' Test Strategy tables (not `done:` pointers):
  - 13.1 `:68-79`
  - 13.2 (13 rows)
  - 13.3 (7 rows)
  - 13.7 `:57-62`, `:180-185`

  One `done:` pointer on a retired line is stale: `atdd-checklist-13-2:123` cites `test_dropbox_contracts.py:63`, but the test is at `:68` and the digest check at `:101-104`. Left as is; it is a retired line.

### ATDD checklists

| Checklist | `[ ]` before | `[ ]` after | Change |
|---|---|---|---|
| `atdd-checklist-13-1-…` | 1 | 0 | `:132` (the restore-path coverage gate) was ticked by item 90 (`d641f55`), with a pointer to `coverage_gate.py:33`. The first trace had left it open |
| `atdd-checklist-13-2-…` | 0 | 0 | none |
| `atdd-checklist-13-3-…` | 0 | 0 | none |
| `atdd-checklist-13-4-…` | 2 | 0 | `:94` (13.5's `--allowedTools`) and `:99` (the auto-backup states' troubleshooting) retired: moot since `sprint-change-proposal-2026-11-23.md`. The successors are pinned by `test_backup_skill.py:173`, `test_morning_job_removed.py:175` and `test_dropbox_backup_line.py:155` |
| `atdd-checklist-13-5-run-the-backup-every-morning.md` (superseded) | 9 | 0 | `:114-122` retired, each pointing at the sprint change, `spec-13-5-take-out-the-morning-job.md` and the test that pins the removal |
| `atdd-checklist-13-5-take-out-the-morning-job.md` | 0 | 0 | none |
| `atdd-checklist-13-6-…` | 0 | 0 | none |
| `atdd-checklist-13-7-…` | 0 | 0 | none |
| `atdd-checklist-13-8-…` | 0 | 0 | none |

No Epic 13 checklist line is still `[ ]`. The first trace retired the 13.4 and superseded 13.5 lines, and item 89 confirmed them. The 13.2 checklist's AC numbers predate item 91's new AC-10 (see "Oracle").

---

## PHASE 2: GATE

### Gaps and recommendations

| # | Gap | Priority | Status |
|---|---|---|---|
| G1 | 13.2 · AC-9: a mismatched same-day finish had replaced the earlier copy, against the AC and the messages | P0 | ✅ closed by item 91 (`7f42bb2`, `306b8fc`) |
| G2 | 13.2 · AC-6: whole-file `content_hash` on the commit | P0 | ✅ closed by item 89 (`b7fe93a`) |
| G3 | 13.2 · AC-3: published vector | P0 | ✅ closed by item 89, rewording as Oleg decided |
| G4 | 13.1 · AC-11: the message as shown, runs B and C, VS Code and `claude -p` not transcribed | P0 | ⚠️ open, waived (W-13-1, expires 2026-12-23; Oleg records his next real restore) |
| G5 | Restore-path coverage gate | Epic gate clause | ✅ closed by item 90 (`d641f55`): 95.29%, `restore_file.py` 100% |
| G6 | 13.1 · AC-12: the guide's check, prompts and undo steps not pinned | P2 | open. One more assertion in `test_dropbox_backup_guide.py:55` |
| G7 | Port-8790 flake | Process | ✅ closed by item 92 (`dde2071`) |
| G8 | The HTTP numbers of the three restore codes are asserted nowhere | Low | open (optional) |
| G9 | 13.2 · AC-10: a failed listing after a verified upload stays `failed/other`, not `uploaded` as Oleg's decision first read | Decision | Oleg confirms (item 91's build chose this because the copy count is unknown) |

LOW: run `/bmad-testarch-test-review` on the Epic 13 test files: `dropbox_fakes.py` and the repeated upload helpers (E13-D3).

### Waiver register review

Read from `_bmad-output/test-artifacts/gate-waivers.md`.

**Waivers filed:** 1 (1 valid, 0 invalid)

| ID | Covers | Priority | Valid | Failed checks |
|---|---|---|---|---|
| W-13-1 | 13.1 · AC-11 | P0 | ✅ | none |

W-13-1 passes every check:
- **fail_only:** the derived decision is FAIL.
- **business_justification:** the gap is in the record, while the behavior is pinned by 13.1 AC-5 and AC-6.
- **approver_authority:** Oleg, product owner.
- **expiry_present:** 2026-12-23.
- **remediation_due_date:** 2026-12-23. The owner is Oleg, and the verification is a re-trace.
- **not_security:** it waives a transcript of a manual run, not a vulnerability. The confirmation gate's behavior stays FULL in AC-5 and AC-6.
- **contract_complete:** every field is present.

The covered gap stays in the gap analysis and in every percentage.

### Next actions

1. **Oleg:** confirm G9, that a failed listing stays `other`.
2. **Oleg:** at the next real restore, quote what bookvie's question showed into `spec-13-1`, then re-trace to close W-13-1. This is due by 2026-12-23.
3. **Before Epic 14's first agent-tool or `backup_file.py` story:** retro item 95, the file splits, which now also carries `RESTORE_PATH`. Items 93 and 94, the process facts, are due before Epic 14 and Epic 14 planning.
4. **Optional:** G6 and G8.
