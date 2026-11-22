---
title: 'Story 13.4: Back up to Dropbox with one skill'
type: 'feature'
created: '2026-11-22'
status: 'done'
baseline_revision: 'fb0177591b4ccb9330c87af7fad427d0aa1ce640'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-13-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-13-4-back-up-to-dropbox-with-one-skill.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-8, Design Paradigm, Capability Map FR-28), reconciled before the next epic: bookvie-backup is a third skill with the same step 1, cut to the `bookvie` entry (8765) only and never `bookvie-dev`; the spine still says "the two bookvie skills", "both skills carry the same step 1" and that the skills use `bookvie-dev` when asked.
    evidence: |-
      spine-check finding 1; .claude/skills/bookvie-backup/SKILL.md step 1; README AI skills now lists three skills.
    location: >-
      .claude/skills/bookvie-backup/SKILL.md
    severity: low
  - summary: >-
      Spine drift (AD-22 bookvie-backup skill), reconciled before the next epic: the skill reads `get_app_info`'s `mode` and stops on `"dev"` (and on any answer other than `"production"`) before `export_backup`, uploading and recording nothing; AD-22 lists `get_app_info` only as a reachability check.
    evidence: |-
      spine-check finding 2; SKILL.md step 2; test_on_a_dev_server_the_skill_uploads_nothing_records_nothing_and_says_so.
    location: >-
      .claude/skills/bookvie-backup/SKILL.md
    severity: low
  - summary: >-
      Spine drift (AD-22 bookvie-backup skill), reconciled before the next epic: AD-22 says `record_backup_upload` is called always; the skill records nothing on a dev stop, an unreadable `get_app_info`, or a headless run without bookvie's tools, records `failed`/`other` when the `upload_backup` tool is missing, and never sends a refused report twice.
    evidence: |-
      spine-check finding 3, intent-alignment divergence (extra no-record exceptions); SKILL.md steps 1, 2, 4, 5; spec I/O matrix.
    location: >-
      .claude/skills/bookvie-backup/SKILL.md
    severity: low
---

<intent-contract>

## Intent

**Problem:** The pieces of a backup run exist (13.2's `upload_backup`, 13.3's `export_backup({forUpload})` and `record_backup_upload`), but nothing chains them, so neither Oleg nor the 13.5 morning job can run a backup the same way every time, and the guide doesn't say how a run works or what to do when an upload fails.

**Approach:** A new project skill `.claude/skills/bookvie-backup/SKILL.md` that checks bookvie with `get_app_info`, stops on a `--dev` server, exports for upload, uploads unless unchanged, always ends with exactly one `record_backup_upload`, and reports the outcome in one line in UX-DR82's words. Run by hand, its step 1 falls back to the other skills' start (8765 only). The guide gains How it works, the first manual run, an `upload_incomplete` entry and a restore-by-hand line; README → AI skills lists the skill.

## Boundaries & Constraints

**Always:**
- Frontmatter `allowed-tools` lists exactly `mcp__bookvie__get_app_info`, `mcp__bookvie__export_backup`, `mcp__bookvie__record_backup_upload`, `mcp__bookvie-dropbox__upload_backup` (the list 13.5's `--allowedTools` will copy). No other `mcp__…__…` name appears anywhere in the file.
- The only shell lines are step 1's health check and the 8765 `/mcp` probe, used only when run by hand (Oleg's ATDD decision, 2026-11-22). No shell block and no `--no-browser` after step 1. Never `8766`, never `bookvie-dev`'s tools.
- Calls are written in epics.md's notation: `export_backup({forUpload: true})`, `upload_backup({localPath: path})`, `record_backup_upload({outcome: "uploaded", path, copies, contentHash})`, `({outcome: "skipped"})`, `({outcome: "failed", cause})`.
- Each `Failed:` line is EXPERIENCE.md's Failing reason for its cause, word for word (sign-in line keeps "Nothing in Dropbox was deleted.").
- Step 1 keeps the other skills' wording that `check_the_older_bookvie_probe` pins, and the README's setup line and reconnect step.

**Never:**
- No product code change (bookvie, bookvie_dropbox), no restore tool named, no retry of a failed upload or report by the skill.
- No `bookvie autobackup …` in a guide code block (13.5 adds the command; the CLI-match leaf would go red). Prose is fine.
- Don't edit the spine or `schema.d.ts`. No banned git command (AGENTS.md "Story pipeline", Epic 8 retro item 64).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Changed library | export `unchangedSinceUpload: false`, upload ok | `record(uploaded, path, copies, contentHash)`; "Uploaded *name* · N copies in Dropbox, deleted *a*, *b*" | — |
| Nothing deleted | upload `deleted: []` | "Uploaded *name* · N copies in Dropbox." (no deleted part); "1 copy" when copies is 1 | — |
| Unchanged | `unchangedSinceUpload: true` | no upload; `record(skipped)`; "Nothing new since the last upload; skipped." | — |
| Export fails | `export_backup` error (any code) | no upload; `record(failed, backup_write)`; "Failed: bookvie couldn't write the backup file. …" | — |
| Upload fails | `upload_backup` error `{cause, message}` | `record(failed, cause)`; that cause's `Failed:` line | — |
| Dropbox tools missing | no `upload_backup` tool | `record(failed, other)`; `other`'s line plus that `bookvie-dropbox` isn't connected (guide step 3) | — |
| Dev server | `get_app_info.mode == "dev"` | stop: no export, upload or record; says a development library is never uploaded | — |
| bookvie unreachable, by hand | no `get_app_info` tool | step 1 start fallback, probe, reconnect, go on | older-bookvie / code stops as the other skills |
| bookvie unreachable, headless | no tool, no Bash allowed | stop with one `Failed:` line naming bookvie not running; nothing recorded | — |
| Report refused | `record_backup_upload` error | still the outcome line, plus that bookvie couldn't save the report and its code | no retry |

</intent-contract>

## Code Map

- `backend/tests/test_backup_skill.py` -- 4 red leaves (AC-1..AC-4) with `@pytest.mark.skip(reason=RED)`; pins order, frontmatter parse (`allowed_tools`), dev paragraph (one blank-line paragraph holding `` `mode` ``, `` `"dev"` ``, the never-uploaded sentence, "stop", "don't call" and all three tool names, before the export call), report lines, step 1 via `_section(…, "Make sure bookvie is running", numbered=True)`.
- `backend/tests/test_dropbox_backup_guide.py:216-267` -- AC-6 red leaf (`RED_13_4`): `section(text, "How it works")`, `headed(text, r"\bfirst\b.*\brun\b")`, `headed(text, r"`upload_incomplete`")`, restore-by-hand paragraph, README link `` [`bookvie-backup`](.claude/skills/bookvie-backup/SKILL.md) ``. `guide_commands` checks every `bookvie`/`bookvie-dropbox` command in shell blocks against the CLI.
- `backend/tests/helpers.py:403-494` -- `OLDER_BOOKVIE`, `INSTALLED_IS_OLDER`, `curl_lines`, `is_health_or_probe`, `check_the_older_bookvie_probe(…, ports=[8765])` (exact sentences step 1 must hold, health < probe < older < "choose reconnect"); `failing_reasons()` reads EXPERIENCE.md's table.
- `.claude/skills/bookvie-notes-summary/SKILL.md` §1 -- the step 1 to copy, cut to the `bookvie` entry; frontmatter style (`description: >`, `metadata.version`).
- `backend/tests/test_notes_summary_skill.py:340` -- pattern for a README setup/reconnect match leaf.
- `backend/bookvie_dropbox/server.py:91-104` -- failure is `isError` with JSON `{cause, message}`.
- `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md:210-218,805-807` -- Failing reasons and Auto-backup report wording.
- `docs/dropbox-backup.md`, `README.md:116-125` -- guide sections to add; README "ships two" → three skills.
- Deferred-work intake:
  - `deferred-work.md:1527` (APP_KEY placeholder before 13.4's manual run) -- already resolved in 13.2; nothing to do.
  - `deferred-work.md:1531` (a refresh refused other than `invalid_grant` answers `other`; settled by 13.4's first real run) -- not in this story's automated work: AC-5's manual run settles it; left unresolved until Oleg records the run.

## Tasks & Acceptance

**Execution:**
1. `.claude/skills/bookvie-backup/SKILL.md` -- write the skill: frontmatter (`name`, `description`, `allowed-tools` block list, `metadata.version: 1.0.0`); "## 1. Make sure bookvie is running" (`get_app_info` first; by hand only, the health curl, `bookvie --no-browser` fallback, the 8765 probe with the pinned sentences, reconnect and setup line, go on; headless: report and stop); "## 2. Never from development" (the dev paragraph); "## 3. Export"; "## 4. Upload unless unchanged"; "## 5. Record what happened" (always exactly one report; cause mapping); "## 6. Report in one line" (templates, five `Failed:` lines each with its `` `cause` ``).
2. `backend/tests/test_backup_skill.py` -- un-skip the 4 leaves; add follow-ups: step 1's setup line and reconnect match the README; an export refused (`couldnt_save` via no backups folder or `FaultyFs`) then `record(failed, backup_write)` is accepted; each upload cause from `FakeDropbox` faults recorded as `failed` is accepted. Add text leaves for the matrix rows the red leaves don't pin: the nothing-deleted upload line, Dropbox tools missing → `other` with the not-connected note, the headless stop that records nothing, and a refused report that is never followed by a second call.
3. `backend/tests/test_dropbox_backup_guide.py` -- un-skip the AC-6 leaf.
4. `docs/dropbox-backup.md` -- intro line for the skill; "## How it works" (09:00 launchd from 13.5, headless `claude -p`, export, verify then delete beyond 3, skip when unchanged, `--dev` never uploads); "### Your first run" under Setup (`/bookvie-backup` twice: upload then skip); troubleshooting "#### `upload_incomplete`: …" (nothing in Dropbox was deleted; run `/bookvie-backup` again; check `/Apps/bookvie/.backups` in Dropbox) and `dropbox_full`/`backup_write`/`other` short entries; restore-by-hand paragraph in Restoring.
5. `README.md` -- AI skills: three skills, a `bookvie-backup` bullet with the link and two example prompts.

**Acceptance Criteria:**
- Given the 5 ATDD leaves un-skipped and the follow-ups added, when `cd backend && uv run pytest -q tests/test_backup_skill.py tests/test_dropbox_backup_guide.py tests/test_notes_summary_skill.py tests/test_new_book_skill.py` runs, then all pass.
- Given `npm run check`, when it runs, then it passes.
- Given AC-5 (manual: Oleg runs `/bookvie-backup` twice on the real library and Dropbox, the first uploads, the second skips), when the build ends, then the spec's Auto Run Result lists it as pending and the story stays in review until Oleg's runs and the guide's corrections are recorded here.
  - **AC-5 result, 2026-11-22 (Oleg, in the review session):** both runs by hand on the real library (`~/bookvie-data`, bookvie 2.0.1 production, after `npm run install:local`) and the real Dropbox app, with no change in between. Run 1, 19:37: `export_backup({forUpload: true})` answered `unchangedSinceUpload: false`; `upload_backup` answered `bookvie-backup-2026-11-22.zip`, `copies: 1`, `deleted: []`; `record_backup_upload(uploaded, …)` answered `ok`; the skill said "Uploaded bookvie-backup-2026-11-22.zip · 1 copy in Dropbox". Run 2, 20:36: `unchangedSinceUpload: true`, no upload, `record_backup_upload(skipped)` answered `ok`; the skill said "Nothing new since the last upload; skipped." Passed. Two earlier attempts in the same session didn't count: the old installed bookvie (no `record_backup_upload`) hit the review's new older-bookvie stop, and a run before `bookvie-dropbox` was added to Claude Code recorded `failed`/`other` with the not-connected line, as step 4 says. No guide correction needed: Setup step 3 already covers adding `bookvie-dropbox`.

### Review Findings

Code review, 2026-11-22 (new session; layers: blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor, spine-check; none failed). Diff `fb01775..ba13012`.

- [x] [Review][Patch] An older bookvie without `record_backup_upload` gets the wrong failure and no report [.claude/skills/bookvie-backup/SKILL.md:54] — medium. The bookvie installed on 8765 today (Oleg's real library) lists no `record_backup_upload` in `tools/list`: it predates 13.3, so its `export_backup` takes no arguments and refuses `forUpload` with `invalid_fields`. The skill would then record `backup_write` with a tool that isn't there, and tell Oleg "bookvie couldn't write the backup file" when the fix is to update bookvie. AC-5's manual run would hit this. Fix: after the mode check, when bookvie has no `record_backup_upload`, stop before the export with one line saying to update bookvie with `npm run install:local`; nothing is recorded. (edge-case-hunter 1, 2)
- [x] [Review][Patch] Step 4 says nothing in Dropbox was deleted after every upload error [.claude/skills/bookvie-backup/SKILL.md:68] — low. `_prune` (`bookvie_dropbox/upload.py:322-332`) answers `other` after a checked upload, and may already have deleted older dailies; a client-side error with no `cause` (an MCP timeout) doesn't prove nothing was deleted either. Fix: limit the sentence to the causes that come before the check, and say the `other` message names what was deleted. (blind-hunter 1, acceptance-auditor 1, edge-case-hunter 3, spine-check 4)
- [x] [Review][Patch] Step 6 reads as writing "Failed: " twice [.claude/skills/bookvie-backup/SKILL.md:88] — low. `"Failed: " and the reason for the run's cause` is followed by reasons that already start with "Failed:". Fix: "the line for the run's cause, word for word". (blind-hunter 7)
- [x] [Review][Defer] Spine drift (AD-22 Causes): a client-side tool error or timeout with no `cause` is `other` [.claude/skills/bookvie-backup/SKILL.md:68] — deferred: the code is right; AD-22 puts timeouts in `upload_incomplete` (bookvie-dropbox's own), and says nothing of a call the skill gets no answer from. Reconciled before the next epic. (spine-check 4)

- Full check after the patches, 2026-11-22: `npm run check` exit 0 (check:api; check:py, pytest 2412 passed; check:e2e 800 passed; check:smoke ok). The run has no separate unit layer.

- AC-5 recorded 2026-11-22 (two runs by hand: uploaded, then skipped); no file changed after the full check, so `done` rests on that exit-0 run.

**Rejected:**
- `false` (spine-check 1–3) AD-8/FR-28 two skills, AD-22 dev stop, AD-22 "always" record — already logged as spine drift in `deferred-work.md` by the build; nothing new.
- `false` (acceptance-auditor 2) Step 1's and step 2's `Failed:` lines aren't EXPERIENCE.md reasons — the constraint is "each `Failed:` line is the Failing reason *for its cause*"; these two stops have no cause and record nothing.
- `low` (acceptance-auditor 3) Unreadable `get_app_info` records nothing although AC-1 says "always" — already deferred as spine drift (AD-22 "always"); a `get_app_info` that errors while its tool exists is rare.
- `false` (acceptance-auditor 4) Shell commands despite AC-1's "no Bash, no curl" — Oleg's ATDD decision (2026-11-22, Design Notes "Bash fallback"); `allowed-tools` stays MCP-only.
- `low` (acceptance-auditor 5, blind-hunter 6, edge-case-hunter 6) The I/O matrix still ends the nothing-deleted line with a period and has no unreadable-app-info row — the fix edits the spec under review.
- `false` (acceptance-auditor 6) The guide's `upload_incomplete` says today's file may be replaced — accurate, and a replacement isn't a deletion.
- `low` (blind-hunter 2) A checked upload whose prune fails is recorded as `failed`/`other` — `upload_backup`'s contract from 13.2 (an `isError` with `other`, logged at `deferred-work.md:1508`); the skill can't record an upload it got no `copies`/`contentHash` for, and the next run uploads again harmlessly. A change would be product code.
- `low` (blind-hunter 3) "→ Troubleshooting" lands on Restoring's "### Troubleshooting" — EXPERIENCE.md's fixed wording, rejected in the build review too; 13.6 settles the per-state entries (plan D12).
- `low` (blind-hunter 4, 5) Step 2's unreadable-app-info line, step 4's no-`cause` → `other`, and the code-less report suffix have no leaf — new tests, not a direct correction; handed to `bmad-testarch-automate` for this story.
- `false` (blind-hunter 8, edge-case-hunter 5) A refused Bash permission or a `get_app_info` error has no branch — "you can't run shell commands" covers a refused permission and gives the right line (start bookvie or reconnect); step 2 covers an error from `get_app_info`.
- `false` (blind-hunter 9) Step 5's "whatever happened after the export" is vague — step 3 sends a failed export to step 5 with `backup_write` explicitly.
- `low` (blind-hunter 10) The guide doesn't say the 09:00 job needs the repo as its working directory — installing the job is 13.5's, and the guide says so.
- `low` (blind-hunter 11) The restore-by-hand line doesn't repeat Command-Shift-. or online-only files — "Your first run" says the folder is hidden; rare, and more than a direct correction.
- `low` (blind-hunter 12) `backup_write`'s `~/bookvie-backups` doesn't fit a `--data-dir` library — such a folder gets `<data folder>-backups` or none, which What bookvie records explains; rare.
- `false` (edge-case-hunter 4) `upload_backup` succeeds without `name`, `copies` or `contentHash` — `Uploaded` always carries all four (`upload.py:181`).
- `false` (edge-case-hunter 7) The guide's "A failed or mismatched upload deletes nothing" — true of the upload; the prune-after-check case is the guide's `other` entry.

## Spec Change Log

## Review Triage Log

### 2026-11-22 — Review pass
- verdicts: 28 findings — high 0, medium 2, low 18, false 8, maybe-false 0
- findings:
  - (verification-gap) No gaps: no production code changed; the 5 un-skipped leaves run and pass; the new leaves drive real tools. (No finding row.)
  - `[false]` `[reject]` (intent) No test runs an agent on the skill — by design: a skill is text, its behavior is AC-5's manual run, which the spec keeps pending and the story stays in review for.
  - `[false]` `[reject]` (intent) AC-2's "records nothing" is not proven at runtime — same: the text leaf plus `get_app_info`'s real `mode` is the automated surface; AC-5 is the behavioral one.
  - `[low]` `[reject]` (intent) `allowed-tools` pre-grants but doesn't restrict — true of Claude Code; the restriction is 13.5's `--allowedTools` constant (AR53), not this story's.
  - `[low]` `[defer]` (intent) More no-record exceptions than the AC names (headless, unreadable app info) — grouped with spine-check 3, spine drift.
  - `[false]` `[reject]` (intent) UX line variants beyond the story's template — the spec's Design Notes choices (empty `deleted`, "1 copy"), consistent with UX-DR82 after the punctuation patch.
  - `[false]` `[reject]` (intent) AC-5 not implemented — a manual AC by definition; recorded as pending under Auto Run Result.
  - `[low]` `[defer]` (spine) AD-8/Design Paradigm/FR-28 name two skills — spine drift, deferred.
  - `[low]` `[defer]` (spine) AD-22 doesn't state the dev stop — spine drift, deferred.
  - `[low]` `[defer]` (spine) AD-22's "always" record vs the skill's no-record stops — spine drift, deferred (with the intent row).
  - `[false]` `[reject]` (spine) Guide's `other` entry contradicts "any failure deletes nothing" — already logged at deferred-work.md:1508; nothing new to defer.
  - `[medium]` `[patch]` (edge) A `get_app_info` error or unknown `mode` has no branch — step 2 now stops on any answer other than `"production"`, with one Failed line and no export, upload or report.
  - `[low]` `[reject]` (edge) The health poll after starting bookvie is unbounded — the same pinned step 1 as the other two skills; a bound would diverge from the shared wording `check_the_older_bookvie_probe` pins.
  - `[low]` `[patch]` (edge) An upload error without a usable `cause` — step 4: non-JSON, no cause or an unlisted one is `other`.
  - `[low]` `[patch]` (edge) Refused report with no code — the suffix drops the parentheses when there is none.
  - `[low]` `[patch]` (edge) Uploaded lines end differently — the no-deleted example ends without a period, as UX-DR82's template; skill, guide and leaf aligned.
  - `[low]` `[reject]` (edge) The upload-cause leaf skips timeout/wrong_size/wrong_hash/server_error — 13.2's test_dropbox_upload pins each fault's cause; this leaf only shows each cause is recordable.
  - `[false]` `[reject]` (edge) FaultyFs isn't restored if `call_tool` raises — the store is per-test, and a raise already fails the test with the real error.
  - `[low]` `[reject]` (blind) "→ Troubleshooting" points at two headings — the reason text is EXPERIENCE.md's, word for word (the AC-3 leaf compares it); 13.6 adds the per-state troubleshooting entries (plan D12) and is where the headings get settled.
  - `[false]` `[reject]` (blind) Any export error recorded as `backup_write` — AC-1 says exactly that: "`backup_write` when `export_backup` failed".
  - `[medium]` `[patch]` (blind) No branch for a `get_app_info` error or unknown mode — grouped with the edge row; same patch.
  - `[low]` `[patch]` (blind) The headless stop blames bookvie when its entry isn't connected — the line now names both, and the leaf pins it.
  - `[low]` `[reject]` (blind) The 09:00 job is described before 13.5 installs it — AC-6 asks for How it works with the 09:00 launchd run, the guide says installing comes later, and 13.5 is the next story; the `upload_incomplete` reason is EXPERIENCE's fixed wording.
  - `[low]` `[patch]` (blind) "Your first run" omits the reconnect — one sentence added.
  - `[low]` `[patch]` (blind) Uploaded punctuation — grouped with the edge row; same patch.
  - `[low]` `[patch]` (blind) The restore-by-hand line reads as contradicting "restores only from that folder" — that sentence now says bookvie's agent tools.
  - `[low]` `[patch]` (blind) The `other` entry's "entry below" and the unfinished cleanup — names "An MCP server is shown as failed", and says the upload worked, extras go on the next run, nothing to delete by hand.
  - `[false]` `[reject]` (blind) FaultyFs not restored on failure — grouped with the edge row; per-test store.
  - `[low]` `[reject]` (blind) README bullet and the guide's example lines aren't pinned against the skill — the AC-6 leaf pins the README link; more cross-file wording leaves are new tests, not a direct correction.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").
- **Bash fallback** is Oleg's reading of AC-1 vs AC-4 (ATDD checklist): MCP-only `allowed-tools`, Claude Code asks permission for step 1's shell commands by hand; headless `claude -p` can't run them, and 13.5's run starts bookvie first.
- **Empty `deleted`:** drop ", deleted …"; several names are joined with ", ".
- **Dropbox tools missing** counts as a failure with `other`, so the Backup page (13.6) shows Failing rather than nothing.
- **Report refused:** the skill never makes a second `record_backup_upload`; "exactly one" holds even then.

## Verification

**Commands:**
- `cd backend && uv run pytest -q tests/test_backup_skill.py tests/test_dropbox_backup_guide.py` -- expected: all pass, none skipped
- `npm run check` -- expected: exit 0

**Manual checks:**
- AC-5: Oleg's two runs by hand — passed 2026-11-22 (upload, then skip); recorded under Acceptance Criteria.

## Auto Run Result

Status: done

**Summary.** New project skill `bookvie-backup`: `get_app_info` (stop on a `--dev` server or any answer other than production), `export_backup({forUpload: true})`, `upload_backup({localPath: path})` unless `unchangedSinceUpload`, then exactly one `record_backup_upload` (uploaded, skipped, or failed with `backup_write` / the upload's cause / `other`), and a one-line report in UX-DR82's words with EXPERIENCE.md's five Failing reasons. `allowed-tools` is exactly the four MCP tools; run by hand, step 1 falls back to the other skills' start for the `bookvie` entry only. The guide gains Your first run, How it works, troubleshooting for `upload_incomplete`, `dropbox_full`, `backup_write` and `other`, and a restore-by-hand line; README → AI skills lists three skills. No product code changed.

**Files changed.**
- `.claude/skills/bookvie-backup/SKILL.md` — the new skill.
- `backend/tests/test_backup_skill.py` — 4 ATDD leaves un-skipped; follow-ups (README setup/reconnect match, export failure → `backup_write`, each upload cause recordable) and text leaves for the matrix rows.
- `backend/tests/test_dropbox_backup_guide.py` — AC-6 leaf un-skipped.
- `docs/dropbox-backup.md` — intro line, Your first run, run troubleshooting, How it works, restore by hand.
- `README.md` — AI skills: `bookvie-backup`.
- `_bmad-output/implementation-artifacts/deferred-work.md` — this review's three spine-drift entries.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 13-4 → review.

**Review.** 28 findings: 0 high, 2 medium (one root cause), 18 low, 8 false (verification-gap had none). Patched in one round: medium ×1 (no branch for a `get_app_info` error or unknown mode), low ×7 entries (headless line names a disconnected entry, upload error without a usable cause → `other`, report suffix without a code, Uploaded line punctuation, first-run reconnect, restore-by-hand vs agent-only sentence, `other` entry cleanup case). Deferred: three spine drift entries (AD-8 two skills; AD-22 dev stop; AD-22 "always" record). Rejected, with reasons in the Review Triage Log: agent-behavior tests (AC-5 is the behavioral check), `allowed-tools` not restricting (13.5), extra UX variants, the already-logged prune drift, unbounded poll (shared pinned step 1), extra upload faults (13.2 pins them), FaultyFs restore (per-test store), the Troubleshooting pointer (EXPERIENCE's fixed wording; 13.6), `backup_write` for any export error (AC-1's rule), the 09:00 job wording (AC-6, 13.5 next), more cross-file wording tests.

**Follow-up review recommended: false** (first pass: 0 high patched, 1 medium entry patched).

**Verification.** `cd backend && uv run pytest -q tests/test_backup_skill.py tests/test_dropbox_backup_guide.py` — 17 passed, none skipped (before and after the patches). `npm run check` — exit 0 before the patches (pytest, unit, 800 e2e, api, smoke); re-run after the patches: exit 0 (check:py, check:api, pytest 2411 passed, check:e2e 800 passed, check:smoke). Matrix Test Audit: all 10 rows covered by passing leaves.

**Manual AC (AC-5): passed 2026-11-22 in the code review session; see Acceptance Criteria.** Before that: Oleg runs `/bookvie-backup` twice by hand on the real library and the real Dropbox app, the second time with no change in between: the first should upload, the second skip. Record both runs and any guide corrections here. The story stays in review until then. `deferred-work.md:1531` (a refused refresh answering `other`, not `dropbox_signin`) is left open for that run to settle.

**Residual risks.** The skill is verified as text plus the tools it chains; no automated test runs an agent on it. `allowed-tools` only pre-grants; headless restriction is 13.5's `--allowedTools`. The port-8790 flake from 13.2 may still fail `npm run check` intermittently.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
