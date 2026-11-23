---
title: 'Make the Dropbox failure messages true'
type: 'bugfix'
created: '2026-11-23'
status: 'done'
route: 'oneshot'
baseline_commit: 'b7fe93a0b167b57746beac6dc8c6182680dbf18f'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-13-retro-2026-11-23.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** this is Epic 13 retro item 91 (E13-B1, E13-B2; sprint item `epic-13-retro-item-91-make-the-dropbox-failure-messages-true`; `deferred-work.md` the same-day mismatch entry and item 89's leftovers entry), due before Epic 14.
- E13-B1: `upload_backup` finishes straight to `/.backups/<name>` with `WriteMode.overwrite` and checks size and hash after the finish, so a mismatch answered as `upload_incomplete` has already replaced that day's copy. The skill line, the Backup page and the guide still say "Nothing in Dropbox was deleted" for `upload_incomplete`, and `epics.md` (AR47, Story 13.2's description and AC-9, Story 13.4's guide AC) promises a failed or mismatched upload deletes nothing.
- E13-B2: a prune that fails after a verified upload answers `other`; the skill records `failed/other`, `lastUpload` stays at the previous day, and the next run uploads again.

**Approach (Oleg's decision, 2026-11-23):** a prune that fails after a verified upload is recorded as `uploaded` with the real copy count, and the skill line notes that older copies remain. No new outcome, state or cause.
- UX and planning text first: EXPERIENCE.md's Failed reasons (one `upload_incomplete` sentence true both before and after the finish), the Copies bullet and the Backup run report; `epics.md` AR47, UX-DR77/UX-DR82, Story 13.2's description and AC-8/AC-9, Story 13.4's guide AC, Story 13.5's quoted skill line; the spine's AD-22 "What a failure leaves" and result shape (not drift: changed in this item).
- Then code: `upload_backup` answers its normal result on a prune failure, with `copies` counted from what it saw, `deleted` holding only what it deleted, and an extra `pruneFailed` message; the registered description equals the new `epics.md` text. The skill records `uploaded` and adds the note; the page's `REASONS` and the guide follow EXPERIENCE.md. The guide's "one tool" becomes three.
- Tests follow (`test_backup_skill.py`, `test_dropbox_upload_edges.py`, `test_dropbox_follow_ups.py`, `test_morning_job_removed.py`, the guide test, the frontend unit and e2e copies of the reasons). Resolve the two deferred entries; mark the sprint item done. `README.md` is not edited.

</frozen-after-approval>

## Implementation Notes

- **Route:** oneshot, like items 89, 90 and 92: no intent gap (Oleg decided the product question, and the brief leaves the wording to this item), nothing irreversible; the footprint is many files but each change is a sentence or a branch, and the one new thing other code reads is the optional `pruneFailed` key.
- **Which failures leave what** (checked in `bookvie_dropbox/upload.py`): `dropbox_signin` (from `connect`, or an `AuthError` from a request Dropbox refused) and `dropbox_full` (an insufficient-space `ApiError`) come before Dropbox commits anything, so "Nothing in Dropbox was deleted" stays true for them. `upload_incomplete` is either a fault before the finish (nothing written) or a network fault at the finish or a mismatch after it (that day's copy may be replaced). The prune never runs after any of them, so no older backup is deleted in any `upload_incomplete` case.
- **Wording (one sentence true in both `upload_incomplete` cases, no new cause):** "the last upload didn't finish or didn't match. No older backup in Dropbox was deleted, but that day's copy there may be damaged; run /bookvie-backup again." "that day's", not "today's": the page shows the reason on later days too. The skill's Failed line is "Failed: " plus it. The prune note on the skill's Uploaded line: "Older copies remain: deleting them didn't finish, and a later upload deletes them." (a later upload, not the next run: an unchanged library skips, and a skip doesn't prune).
- **Planning text (first):** EXPERIENCE.md (Copies bullet, Failed reasons bullet and row, Backup run report), `epics.md` (FR-29, AR47, UX-DR76, UX-DR77, UX-DR82, Story 13.2 description, AC-8, AC-9 and a new prune-failure AC, Story 13.4's guide AC, a note on Story 13.5's quoted line), the PRD's FR-29 (it promised the same untrue thing), and the spine's AD-22 result shape and "What a failure leaves" (changed in this item, so not drift).
- **Code:** `bookvie_dropbox/upload.py` `_prune` returns `(copies, deleted, prune_failed)`: when a delete fails after the verify, `copies` = 1 + the daily backups it listed − those it deleted, and `prune_failed` is the old message (verified; what it deleted; what it didn't; "Dropbox may hold more than 3 daily backups until a later upload deletes them"). A listing that fails after the verify still raises `other` ("… was uploaded and verified, but listing the older daily backups failed (…), so none was deleted …"): with no listing there is no true count, and recording `uploaded` with a made-up count would be the kind of untrue line this item removes (review finding; Oleg's decision assumed a real count). `_upload`'s two other messages that could follow a committed finish (a network fault, an unexpected exception) say "No older backup was deleted, but that day's copy in Dropbox may be damaged" instead of "Nothing was deleted". `Uploaded.answer()` adds `pruneFailed` only when set, so a normal answer keeps exactly AD-22's four keys (`test_backup_skill.py` pins that set). `server.py`'s `UPLOAD_BACKUP_DESCRIPTION` equals the new `epics.md` description. No Pydantic view model changed, so no `api:gen`.
- **Skill:** step 4 says what `pruneFailed` means and that the run is still an upload; its deletion sentence keeps "nothing in Dropbox was deleted" for `dropbox_signin` and `dropbox_full` only and says what `upload_incomplete` leaves; step 5 records `uploaded` also with `pruneFailed`; step 6 has the note and the new `upload_incomplete` line. Version stays 1.0.0 (the spine's AD-8 pins it).
- **Frontend:** `REASONS.upload_incomplete` and the e2e spec's copy; a unit test that 4 copies read "4 copies in Dropbox".
- **Guide:** the opening names the three tools; `upload_incomplete` entry and How it works step 4 say what a mismatch leaves; the `other` entry no longer lists the prune case.
- **Tests:** `test_backup_skill.py` (the cause/deletes paragraph; the prune test now drives `uploaded` with 5 copies through `record_backup_upload` and checks the next export is unchanged), `test_dropbox_upload_edges.py` (halfway prune answers the upload, 4 copies, only the first name deleted), `test_dropbox_follow_ups.py` (a failed listing stays `other`, names the verified upload, deletes nothing), `test_morning_job_removed.py` (the pinned line), `test_dropbox_backup_guide.py` (the guide's mismatch entry). Mutation: making the prune-failure count a constant 3 failed the prune tests; reverted.
- **Deferred work:** the same-day mismatch drift entry gets a second `resolved:` line (the epics.md side and the messages); item 89's leftovers entry is resolved; the prune-drift entry gets a note that the behavior changed.

## Review Triage Log

Blind Hunter (one layer; Edge Case Hunter and Acceptance Auditor are not in this oneshot's review), 13 findings:

- A failed listing answered `copies: 1` while older copies remained: medium, real. Patched: a failed listing stays `other` (no true count exists); only a failed delete is recorded as `uploaded`. Spine, AR47, the new AC, the skill and the guide's `other` entry say so; `test_dropbox_follow_ups.py` pins `other`.
- `_upload`'s network-fault and unexpected-exception messages still said "Nothing was deleted" though the finish may have committed: medium, real. Patched ("No older backup was deleted, but that day's copy in Dropbox may be damaged").
- The guide said a mismatched copy "counts only once a run has checked it", but `list_backups` and the prune count it: low, real, pre-existing. Patched the sentence (listed and counted until the next upload replaces it; prefer an older one for a restore).
- "may be incomplete" was wrong for a full-size copy whose hash doesn't match: low, real. Patched to "may be damaged" everywhere. Other phrasings (skill body, guide body, description) say the same fact in their context; kept.
- No form for the note when `deleted` is not empty: low, real. Patched: the skill has an example with a deleted name, and `test_backup_skill.py` checks it.
- The page never says why it shows more than 3 copies: low. Decided, not patched: no new state (Oleg's decision); EXPERIENCE.md's Copies bullet now says the line shows the count with no note and the run report explains it.
- Story 13.2's "a bad upload never costs me one": low, real. Patched ("never costs me an older one", with a note). Its "holds exactly `upload_backup`" AC is the story's own history, superseded by Story 13.7; rejected.
- UX-DR76's nested parentheses: low, real. Patched.
- `test_dropbox_upload.py`'s AC-9 header and test name: low. Header patched; the test name is kept, since the ATDD checklist cites it and renaming is cosmetic.
- The new frontend unit test sat under `describe('copiesText')`: low, real. Moved. An e2e case for 4 copies: rejected; the unit test covers the formatting and the e2e spec's states are unchanged.
- Two `resolved:` lines in one deferred entry, and a `note:` on another: rejected. The item 89 line said the entry was only half done; a second dated line is the record of the other half, and the gate looks only for an entry with no `resolved:`.
- The spec still said `in-progress`: false at review time; it is finalized here.
- A 113-column docstring line in `test_dropbox_upload_edges.py`: low, real. Rewrapped.
