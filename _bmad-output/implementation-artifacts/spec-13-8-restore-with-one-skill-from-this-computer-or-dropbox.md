---
title: 'Story 13.8: Restore with one skill, from this computer or Dropbox'
type: 'feature'
created: '2026-11-23'
status: 'done'
baseline_revision: 'c229ca3126bedcc05b03ed32fc971e7366d519c5'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-13-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-13-8-restore-with-one-skill-from-this-computer-or-dropbox.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (Design Paradigm, AD-8, Capability map FR-28), reconciled before the next epic: the spine names only bookvie-new-book and bookvie-notes-summary as agent-client skills sharing step 1; bookvie-restore is a fourth one with the same step 1, and unlike bookvie-backup it uses bookvie-dev when asked (widens deferred-work.md's bookvie-backup entry).
    evidence: |-
      spine-check finding 1; .claude/skills/bookvie-restore/SKILL.md step 1; README.md AI skills.
    location: >-
      .claude/skills/bookvie-restore/SKILL.md
    severity: low
  - summary: >-
      Spine drift (AD-22, Capability map FR-30, Structural Seed), reconciled before the next epic: the bookvie-restore skill and the guide's skill walkthrough are built, but the spine still marks them planned (AD-22 "planned for Epic 13", FR-30 "Restore through an agent (planned)", the Seed's docs/dropbox-backup.md "planned").
    evidence: |-
      spine-check finding 2; widens the planned-marker entries from 13.6 and 13.7.
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md
    severity: low
---

<intent-contract>

## Intent

**Problem:** bookvie has the restore tools (13.1) and the Dropbox list/download tools (13.7), but nothing walks Oleg through a restore: he has to know which tool to call, merge two lists by hand and remember the wording. Restoring should be one conversation he can follow, and it must never decide for him.

**Approach:** A new Claude Code skill, `.claude/skills/bookvie-restore/SKILL.md`, that starts bookvie like the other skills, lists this computer's and Dropbox's backups as one pick list (one row per content hash), downloads a Dropbox pick into the bookvie it restores into, shows `preview_restore`'s summary in UX-DR79's words, asks in the chat, then calls `restore_backup` only after a yes and reports the outcome in UX-DR81's words. The guide's Restoring section gains a step-by-step walkthrough and the download troubleshooting; README → AI skills lists the skill.

## Boundaries & Constraints

**Always:** words from EXPERIENCE.md → Agent conversations → Restore, character for character; newest first by `backupTime`; the user picks, the skill only suggests the newest; paths shown with `~`; step 1 is `bookvie-notes-summary`'s step 1 for both entries (`bookvie` 8765, `bookvie-dev` 8766), word for word where the shared probe test pins it; on development, every bookvie call goes to the `bookvie-dev` entry and `download_backup` gets `target: "bookvie-dev"`.

**Never:** no new tool, no code change under `backend/bookvie*` or `frontend/`; no `restore_backup` in an `allowed-tools` list (the skill has no `allowed-tools`); never `/api/intents/restore` or any bookvie HTTP call besides step 1's health check and probe; never retry a refused or unconfirmed restore, or a failed download, by itself; never edit the spine or README beyond the AI skills entry.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Merge | daily backup here and in Dropbox (same `contentHash`) + older Dropbox-only daily + safety copy | rows: "… · daily backup · this computer and Dropbox", "… · daily backup · Dropbox", "… · safety copy (before a restore) · this computer"; the merged row restores from its local `path`, no download | — |
| Local `from_dropbox` file | downloaded earlier, still in Dropbox | one row, "daily backup · this computer and Dropbox"; if no longer in Dropbox, "this computer" | — |
| Many | more than 10 rows | 10 newest, then "and N older. Say show all to see them."; "show all" lists every row in the same format, numbers continuing | — |
| Dropbox unreachable | `list_backups` error, or bookvie-dropbox not connected | this computer's rows, then "Couldn't reach Dropbox: *reason*."; `dropbox_signin` → "Dropbox sign-in expired. Run bookvie-dropbox auth in Terminal."; other cause → its `message`; not connected → "bookvie-dropbox isn't connected in Claude Code." | no retry |
| Nothing anywhere | both lists empty (Dropbox reachable or not) | "No backups found on this computer or in Dropbox. Nothing was changed." and stop | — |
| Dropbox pick | row only in Dropbox | `download_backup({name, target})` → `path` → `preview_restore({path})` | `download_incomplete` → "The download didn't match…"; `dropbox_signin`/`other` → "Couldn't download the backup from Dropbox: *reason*. Nothing was changed." |
| Preview, nothing added | `booksAddedSince` empty, `cardNotesAddedSince` 0 | "No books or card notes were added since *when*." and the Everything-else line stays | — |
| Chat no | user says anything but yes | "Not restored. Nothing was changed."; `restore_backup` never called | — |
| Restore outcomes | `restore_backup` answer or error `code` | UX-DR81 line per code; `unsupported` reason adds the terminal advice | never retried |
| Date | `backupTime` in another year | "19 Nov 2025, 09:02"; this year "19 Nov, 09:02", local time, 24-hour | — |

</intent-contract>

## Code Map

- `.claude/skills/bookvie-notes-summary/SKILL.md` §1 -- source of step 1 (both entries, probe, older-bookvie stop, reconnect); copy it.
- `.claude/skills/bookvie-backup/SKILL.md` -- format precedent (frontmatter, numbered `## N.` steps, one-line outcomes).
- `backend/bookvie/agent/tools.py:787-879` -- `list_local_backups` (`backups[]`: `path`, `kind` daily|safety|from_dropbox, `backupTime`, `size`, `contentHash`), `preview_restore` (`backupTime`, `backup`/`current` {books, cardNotes, covers}, `booksAddedSince`, `cardNotesAddedSince`), `restore_backup` (`restoredFrom`, `backupTime`, `safetyCopy`); errors `{error: {code, message, reason?}}` (`bookvie/intents/contract.py:86`). Read only.
- `backend/bookvie_dropbox/server.py:52-90`, `download.py:30,145-175` -- `list_backups` (`backups[]`: `name`, `backupTime`, `size`, `contentHash`), `download_backup({name, target})` → `{path}`; errors `{cause, message}`, causes `dropbox_signin`, `download_incomplete`, `other`. Read only.
- `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md:748-791` -- UX-DR78..81 words (pick list, preview, outcome table read by `tests/helpers.py::restore_outcomes`).
- `docs/dropbox-backup.md` `## Restoring` (line 142) -- add the skill walkthrough after "Set up the first confirmation (once)" and two download entries under its Troubleshooting. Headings must not start with `` `dropbox_signin` `` or `` `other` `` (`test_dropbox_backup_line.py:162` expects exactly one such entry in the guide).
- `README.md` `## AI skills` (line 116) -- "three" → "four", add the `bookvie-restore` bullet.
- `backend/tests/test_restore_skill.py`, `backend/tests/test_dropbox_backup_guide.py:270-298` -- the six red leaves to un-skip.
- Deferred-work intake: none name story 13.8.

## Tasks & Acceptance

**Execution:**
- `.claude/skills/bookvie-restore/SKILL.md` -- write the skill: frontmatter (`name`, `description`, `metadata.version: 1.0.0`, no `allowed-tools`); 1. Make sure bookvie is running; 2. List the backups (both tools, merge by `contentHash`, pick list, unreachable/none lines); 3. Download a Dropbox pick; 4. Preview; 5. Ask, then restore; 6. Report the outcome; the development paragraph -- AC-1..5.
- `backend/tests/test_restore_skill.py` -- remove the five `@pytest.mark.skip(reason=RED)` (and the unused `RED` constant if ruff flags it) -- AC-1..5 green.
- `docs/dropbox-backup.md` -- `### Restore with the \`bookvie-restore\` skill` (numbered steps incl. `download_backup` into `from-dropbox/`, pointing at the manual fallback); two troubleshooting entries for a download -- AC-7.
- `README.md` -- AI skills: four skills, `bookvie-restore` bullet with two example prompts -- AC-7.
- `backend/tests/test_dropbox_backup_guide.py` -- un-skip the AC-7 leaf.
- `backend/tests/test_restore_skill.py` -- add green-phase text tests (no `skip`) so every I/O matrix row has one: Merge and Local `from_dropbox` rows (the source words, local `path`, no download), Many ("show all", numbering continues), Dropbox unreachable (other cause's `message`, not connected), Download causes (each `download_backup` cause's line), Preview nothing added (against a real preview, `restore_scene` with `grown=False`), Chat no, and Date (year outside the current year, 24-hour local time) -- the matrix test audit needs a passing test per row.

**Acceptance Criteria:**
- Given the skill, when the five `test_restore_skill.py` leaves and the AC-7 guide leaf run un-skipped, then they pass, and `npm run check` passes.
- Given a `--dev` server with real data downloaded into it, when Oleg runs the skill in a real Claude Code terminal (a local restore, a Dropbox restore, declined in chat, declined at the permission prompt, declined at bookvie's question, an undo from the safety copy), then each behaves as the matrix says, and each run is recorded under "AC-6 manual runs" below. Until then the story stays in review.

### Review Findings

Code review of 2026-11-23, in a new session, on `c229ca3..bf040e3`, with five layers: blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor and spine-check. The layers filed 22 findings: 0 decision-needed, 3 patch (from 4 findings), 2 defer, 15 rejected, and 1 (acceptance: AC-6 not met) that is the manual-AC gate below. Verification-gap found no gaps; its re-run of `test_restore_skill.py` and `test_dropbox_backup_guide.py` gave 18 passed, no skips. AC-6 needs Oleg's six terminal runs, and none is recorded.

- [x] [Review][Patch] The none-anywhere split has no test: AC-1's leaf checks only that `NONE_ANYWHERE` is somewhere in the skill, so the build review's medium patch (none-anywhere only when Dropbox answered with an empty list; no local backups and Dropbox unreachable give only the unreachable line) can regress unnoticed [`backend/tests/test_restore_skill.py:147`] (acceptance+blind)
- [x] [Review][Patch] The guide's new manual fallback copies the Restoring intro's paragraph and has already drifted from it (drops the dropbox.com `/Apps/bookvie/.backups` option); point to that paragraph instead [`docs/dropbox-backup.md:185`] (blind)
- [x] [Review][Patch] Step 6's "Any other error: its `message`, as it is" has no wording for an error with no `message` (a transport failure), unlike steps 2 and 3, which fall back to the error's text [`.claude/skills/bookvie-restore/SKILL.md:144`] (edge)
- [x] [Review][Defer] Spine drift (Design Paradigm, AD-8, FR-28): `bookvie-restore` is a fourth agent-client skill with the shared step 1 [`.claude/skills/bookvie-restore/SKILL.md`] — deferred: spine drift, reconciled before the next epic. Already logged in `deferred-work.md` by the build, so no second entry was added.
- [x] [Review][Defer] Spine drift (AD-22, FR-30, Structural Seed): the restore skill and the guide walkthrough are still marked planned [`ARCHITECTURE-SPINE.md`] — deferred: spine drift, reconciled before the next epic. Already logged by the build.
- Patches applied: `test_no_backups_anywhere_only_when_dropbox_answered_empty_otherwise_only_why_it_couldnt` pins the split (mutating the skill's rule to "whether or not Dropbox answered" failed it, and that edit was reverted); the guide's fallback now points to the Restoring intro's paragraph; step 6's other-error line falls back to the error's text.
- Full check after the patches, 2026-11-23: `npm run check` exited 0 (pytest 2469 passed, unit 395 passed, e2e 803 passed, smoke ok).
- AC-6: Oleg ran all six runs with this review on 2026-11-23 (recorded under "AC-6 manual runs"); each behaved as the matrix says. With the three patches applied, the full check green and nothing unresolved, the story is `done`.

**Rejected:**
- (edit spec) (acceptance+blind) The I/O matrix row "Nothing anywhere … (Dropbox reachable or not)" contradicts the patched skill, and the Spec Change Log is empty. The fix edits the spec under review; the build's triage log records why the skill follows AC-1 and EXPERIENCE.md over the row.
- `false` (acceptance) The `dropbox_signin` download line fills *reason* with fixed words, not the error's `message`. UX-DR81's *reason* slot is open, and the build review accepted the wording (Blind 6).
- `false` (acceptance) README's "All four talk to a local `bookvie` on `127.0.0.1:8765`" doesn't fit the restore skill. All four do talk to it; that `bookvie-restore` also talks to bookvie-dropbox doesn't make the sentence wrong.
- `low` (blind) With Dropbox unreachable, every local row reads "this computer", even one that is also in Dropbox. That is true of where it is known to be, the row restores from this computer either way, and the fix adds a rule.
- `false` (blind) Undoing a restore has no instructions. A safety copy is a row in the pick list ("safety copy (before a restore)"), so undo is an ordinary pick, and step 6 says so.
- `false` (blind) README's "Thursday morning's backup" isn't handled. Step 2 covers a backup named by date or time: it is the user's pick, and the skill asks when more than one row fits.
- `low` (blind) The guide has no step for the none-found stop or a failed `list_local_backups`. Rare stops, each already ending with its own line; the build review rejected the same (Blind 5).
- `false` (blind) The date test checks the `short_when` helper, not the skill. Its last assert puts the helper's two strings into the skill's own rule.
- `low` (blind) The "for real" half of the Dropbox-unreachable test can't fail because of the skill. The text half of the same test pins the row's three lines and the no-retry rule; the real half is extra, not the coverage.
- `low` (blind) The fallback branches (non-JSON download error, missing tool, `list_backups` error without `message`) have no test. Rare prose fallbacks of an LLM skill; the build review rejected the same (Blind 9).
- `false` (blind) No advice for `changed` and `expired`. UX-DR81 adds advice for `unsupported` only, and the guide's "Ask the agent again to get a fresh question" covers the rest.
- (edit spec) (blind) AC-6's runs don't exercise the real library or the edge cases. The fix edits the spec's AC.
- `low` (edge) A Dropbox pick can replace an older `from-dropbox/<name>` of the same name with different content. It needs the same day's backup re-uploaded with changes after an earlier download; replacing is 13.7's documented behavior, and a guard adds a branch.
- `low` (edge) A date that matches only a row past the tenth. Rare, and the fix adds a rule.
- `low` (edge) No dev start command when `bookvie` isn't on the PATH. Step 1 is `bookvie-notes-summary`'s step 1 word for word (spec "Always"); changing one copy breaks that.

## Spec Change Log

## Review Triage Log

### 2026-11-23 — Review pass
- verdicts: 22 findings — high 0, medium 1, low 16, false 5, maybe-false 0 (verification-gap: 0 findings)
- findings:
  - `[low]` `[patch]` Blind 1: step 5 lists "another backup" as not-a-yes and also sends it back to step 3 — removed "another backup" from the list.
  - `[medium]` `[patch]` Blind 2: no local backups + Dropbox unreachable says "No backups found … in Dropbox" although Dropbox never answered — none-anywhere now only when Dropbox answered empty; otherwise only the unreachable line. Story AC-1 and EXPERIENCE.md settle this; the matrix row's "(Dropbox reachable or not)" read past them.
  - `[low]` `[patch]` Blind 3: steps 4 and 6 didn't point `backupTime` at step 2's date rule — both now say to write it as step 2 does.
  - `[low]` `[reject]` Blind 4: merge kind precedence when a safety copy shares a daily's hash — a safety copy and a daily zip are never byte-identical (each archive records its own time), so the row can't misread in practice; fix would add a rule.
  - `[low]` `[reject]` Blind 5: guide lacks entries for a failed listing — Setup's Troubleshooting already covers the sign-in (`dropbox_signin`) and a server shown as failed; a new entry adds docs for a rare path.
  - `[false]` `[reject]` Blind 6: the two sign-in wordings differ — the download line fills UX-DR81's "*reason*" slot, which ends before ". Nothing was changed.", so it can't carry its own period; the list line is UX-DR78's own words. Both are as specified.
  - `[low]` `[patch]` Blind 7: intro said the only bookvie commands are the health check and probe, contradicting step 1's start command — reworded to "HTTP calls".
  - `[low]` `[reject]` Blind 8: size boundary (1000 KB / 0 KB) — cosmetic, backups are megabytes in practice; fix adds rules.
  - `[low]` `[reject]` Blind 9: tests check tool outputs, not the skill's fallback clauses — prose fallbacks of an LLM skill; the lines that matter are pinned, and AC-6's manual runs cover behaviour.
  - `[low]` `[patch]` Blind 10: guide's fallback "as described above" didn't say to download the Dropbox file first — now says so; the README anchor link part rejected as cosmetic.
  - `[low]` `[patch]` Edge 1: same as Blind 2 — grouped, same fix.
  - `[low]` `[patch]` Edge 2: same as Blind 1 — grouped, same fix.
  - `[false]` `[reject]` Edge 3: several Dropbox entries share a content hash — an unchanged library is skipped, not uploaded again, and each export records its own time, so two Dropbox names never share a hash.
  - `[low]` `[reject]` Edge 4: an answer that matches no row — the skill never picks and asks again when more than one row fits; adding a branch for an out-of-range number isn't worth it.
  - `[low]` `[reject]` Edge 5: same as Blind 8.
  - `[false]` `[reject]` Edge 6: unknown `kind` — `BackupKind` is `Literal["daily", "safety", "from_dropbox"]` (`backend/bookvie/intents/backup_file.py:267`).
  - `[low]` `[patch]` Edge 7: an unknown download cause or a missing `download_backup` had no line — the `other` bullet now covers any other cause and the tool missing.
  - `[low]` `[patch]` Edge 8: same as Blind 3 — grouped, same fix.
  - `[false]` `[reject]` Intent 1: tests check the skill's text and the tools, not a live conversation — by design; that surface is AC-6, manual, and the story stays in review until it is recorded.
  - `[false]` `[reject]` Intent 2: "show all keeps each row's number" isn't in UX-DR78 — UX-DR78 is silent on it, the ATDD checklist left it open, and the spec's matrix settles it.
  - `[low]` `[defer]` Spine 1: spine drift (Design Paradigm, AD-8, FR-28): bookvie-restore is a fourth skill with the shared step 1.
  - `[low]` `[defer]` Spine 2: spine drift (AD-22, FR-30, Seed): the restore skill and the guide walkthrough are still marked planned.

## Design Notes

AC-6 manual runs (to be recorded by Oleg; empty until then):

- [x] Restore from a local backup: 2026-11-23, same setup. Oleg picked "5. 22 Nov, 10:18 · daily backup · this computer · 343 KB"; no download; the preview used the nothing-added line and kept the "Everything else" line; Oleg said yes; both prompts appeared, bookvie's with its nothing-added sentence ("Every change since then goes back, such as pages reached."), and Oleg accepted both. Result: "Restored from the backup of 22 Nov, 10:18. Safety copy: ~/bookvie-backups-dev/bookvie-pre-restore-2026-11-23T1534.zip".
- [x] Restore from Dropbox: 2026-11-23, Claude Code terminal, `bookvie --dev` from the hogback-creosote install (`npm run install:local`), `/bookvie-restore` on the dev library. Pick list: "1. 22 Nov, 23:52 · daily backup · Dropbox · 75 MB", "2. 22 Nov, 10:19 · safety copy (before a restore) · this computer · 343 KB", "3. 22 Nov, 10:18 · daily backup · this computer · 343 KB". Oleg picked 1; `download_backup({name: "bookvie-backup-2026-11-22.zip", target: "bookvie-dev"})` answered `~/bookvie-backups-dev/from-dropbox/bookvie-backup-2026-11-22.zip`; the preview (529 books · 57 card notes · 529 covers vs 2 · 6 · 2; lose 2 books, 6 card notes) was shown; Oleg said yes; Claude Code's permission prompt and bookvie's question both appeared, with counts and titles matching the preview, and Oleg accepted both. Result: "Restored from the backup of 22 Nov, 23:52. Safety copy: ~/bookvie-backups-dev/bookvie-pre-restore-2026-11-23T1531.zip".
- [x] Declined in the chat: 2026-11-23, same setup. Six rows listed; Oleg picked "1. 23 Nov, 15:34 · safety copy (before a restore) · this computer · 343 KB"; the preview was shown; Oleg answered "no". Result: "Not restored. Nothing was changed."; `restore_backup` was never called and no prompt appeared.
- [x] Declined at Claude Code's permission prompt: 2026-11-23, same setup. Oleg picked "5. 22 Nov, 10:18 · daily backup · this computer · 343 KB"; the preview used the nothing-added line ("No books or card notes were added since 22 Nov, 10:18.") and kept the "Everything else" line; Oleg said yes; at Claude Code's permission prompt for `restore_backup` Oleg rejected it, so the tool was never called. Result: "Not restored. Nothing was changed."; the skill didn't ask again or retry.
- [x] Declined at bookvie's question: 2026-11-23, same setup. Oleg picked "1. 23 Nov, 15:34 · safety copy (before a restore) · this computer · 343 KB"; the preview was shown; Oleg said yes, chose Yes at Claude Code's permission prompt, then declined bookvie's question. `restore_backup` answered `{kind: refusal, code: restore_not_confirmed, message: "Not restored. Nothing was changed.", reason: declined}`. Result: "Not restored. Nothing was changed."; no safety copy was written and the skill didn't retry. (Two earlier attempts at this run were declined at Claude Code's prompt instead, the first dialog having only Yes / No; each ended "Not restored. Nothing was changed." with no retry.)
- [x] Undo from the safety copy: 2026-11-23, same setup, right after the Dropbox restore. Pick list: "1. 23 Nov, 15:31 · safety copy (before a restore) · this computer · 343 KB", "2. 22 Nov, 23:52 · daily backup · this computer and Dropbox · 75 MB" (the earlier download, merged with Dropbox by content hash, kind `from_dropbox`), "3. 22 Nov, 10:19 · safety copy (before a restore) · this computer · 343 KB", "4. 22 Nov, 10:18 · daily backup · this computer · 343 KB". Oleg picked 1; no download; the preview (2 · 6 · 2 vs 529 · 57 · 529; "529 books: …; and 524 more", 57 card notes) was shown; Oleg said yes; both prompts appeared with matching counts, and Oleg accepted both. Result: "Restored from the backup of 23 Nov, 15:31. Safety copy: ~/bookvie-backups-dev/bookvie-pre-restore-2026-11-23T1533.zip"; the dev library is back to its 2 books.

The `unsupported` reason path is pinned by 13.1 (`test_agent_restore.py`, the `unsupported` case of the anything-but-accept test); the skill only adds the advice line.

## Verification

**Commands:**
- `cd backend && uv run pytest -q tests/test_restore_skill.py tests/test_dropbox_backup_guide.py tests/test_dropbox_backup_line.py tests/test_backup_skill.py` -- expected: all pass, no skips from 13.8.
- `npm run check` -- expected: exit 0.

## Auto Run Result

Status: in-review

**Summary.** Added the `bookvie-restore` skill: it starts bookvie, lists this computer's and Dropbox's backups as one pick list (one row per content hash), suggests the newest and waits, downloads a Dropbox pick into the bookvie it restores into, previews, asks in the chat, calls `restore_backup` only after a yes, and reports each outcome in UX-DR81's words, never retrying. Documented it in the guide and README.

**Files changed:**
- `.claude/skills/bookvie-restore/SKILL.md` -- new skill (steps 1-6 and Development).
- `docs/dropbox-backup.md` -- "Restore with the `bookvie-restore` skill" walkthrough; two download troubleshooting entries.
- `README.md` -- AI skills: four skills, the `bookvie-restore` entry.
- `backend/tests/test_restore_skill.py` -- five red leaves un-skipped; green-phase tests, one per I/O matrix row.
- `backend/tests/test_dropbox_backup_guide.py` -- AC-7 leaf un-skipped.

**Review:** 22 findings. Patched 6 entries (1 medium, 5 low, grouping Blind 1/Edge 2, Blind 2/Edge 1, Blind 3/Edge 8). Deferred 2 (spine drift, to `deferred-work.md`). Rejected 11 (5 false, 6 low), reasons in the triage log. Follow-up review recommended: false (one medium patched, no high).

**Verification:** `cd backend && uv run pytest -q tests/test_restore_skill.py tests/test_dropbox_backup_guide.py tests/test_dropbox_backup_line.py tests/test_backup_skill.py`: 41 passed, before and after the patches. `npm run check`: exit 0 after the patches.

**Residual risks:** AC-6 isn't done; Oleg's six terminal runs must be recorded under "AC-6 manual runs" before the story can be `done`. The tests pin the skill's text and the tools' answers, not an agent's live run.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
