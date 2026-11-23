---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-22'
storyId: '13.4'
storyKey: '13-4-back-up-to-dropbox-with-one-skill'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-134-back-up-to-dropbox-with-one-skill'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-13-4-back-up-to-dropbox-with-one-skill.md'
generatedTestFiles:
  - 'backend/tests/test_backup_skill.py'
  - 'backend/tests/test_dropbox_backup_guide.py (AC-6 leaf)'
  - 'backend/tests/helpers.py (check_the_older_bookvie_probe gains ports; failing_reasons added)'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 13.4; AR49, AR51, AR53, AR61, UX-DR82)'
  - '_bmad-output/implementation-artifacts/epic-13-context.md'
  - '_bmad-output/planning-artifacts/dropbox-backup-plan-2026-11-21.md (D7, D8, D12, §4 13.4, §6)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-22 bookvie-backup skill, Unchanged, upload_backup; AD-8 skills step 1)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Auto-backup line, Failing reasons table, Auto-backup report, Flow 13)'
  - '_bmad-output/test-artifacts/atdd-checklist-13-3-record-each-upload-in-bookvie.md, atdd-checklist-12-7-…md (format; the manual-AC precedent)'
  - '_bmad/tea/config.yaml'
  - '.claude/skills/bookvie-notes-summary/SKILL.md, .claude/skills/bookvie-new-book/SKILL.md (step 1, frontmatter)'
  - 'docs/dropbox-backup.md, README.md (AI skills)'
  - 'backend/bookvie_dropbox/server.py, backend/bookvie/views/app_info.py, backend/bookvie/intents/backup_file.py (CAUSES)'
  - 'backend/tests/agent_client.py, conftest.py, helpers.py, dropbox_fakes.py, test_dropbox_upload.py, test_dropbox_backup_guide.py, test_notes_summary_skill.py, test_agent_mount.py'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given .claude/skills/bookvie-backup/SKILL.md (new), when it runs, then it checks bookvie with get_app_info, then calls export_backup({forUpload: true}); unless unchangedSinceUpload, it calls upload_backup with the returned path; and it always ends with one record_backup_upload: uploaded with the upload''s copies and contentHash, skipped, or failed with the cause (backup_write when export_backup failed, the upload''s cause otherwise); and it uses only mcp__bookvie__ and mcp__bookvie-dropbox__ tools: no Bash, no curl, no other tool, and its frontmatter lists exactly those tools.' }
  - { id: AC-2, idSource: generated, text: 'Given a --dev server (get_app_info says mode: "dev"), when the skill runs against it, then it uploads nothing, records nothing, and says that a development library is never uploaded.' }
  - { id: AC-3, idSource: generated, text: 'Given each outcome, when the run ends, then the skill reports it in one line in UX-DR82''s words ("Uploaded name · N copies in Dropbox, deleted name", "Nothing new since the last upload; skipped.", "Failed: reason and fix").' }
  - { id: AC-4, idSource: generated, text: 'Given an interactive session with bookvie not running, when Oleg runs /bookvie-backup, then the skill starts bookvie as the other skills do (step 1) and goes on.' }
  - { id: AC-5, idSource: generated, text: 'Given the real library, the real Dropbox app and the guide''s setup followed from scratch, when Oleg runs /bookvie-backup by hand twice, the second time with no change in between, then the first uploads and the second skips, and the spec records both runs and the guide''s corrections (manual verification).' }
  - { id: AC-6, idSource: generated, text: 'Given the guide and the README, when this story lands, then docs/dropbox-backup.md has the first manual run, "How it works" (09:00 launchd, headless claude -p, export, verify then prune, keep 3, skip when unchanged, --dev never uploads), troubleshooting for a failed or mismatched upload (nothing deleted; rerun; what to check in Dropbox), and a line that a Dropbox backup can always be restored by hand: download it from ~/Dropbox/Apps/bookvie/.backups/ and use the Backup page''s Restore; and README → AI skills lists bookvie-backup.' }
---

# ATDD Checklist: Story 13.4 Back up to Dropbox with one skill

## Preflight

- **Stack:** `fullstack`, auto-detected. pytest and Playwright are in place. The story adds a skill and docs, with no UI, so every leaf is pytest.
- **Story:** `epics.md` Story 13.4 has 6 Given/When/Then criteria with no ids. They're numbered AC-1 to AC-6 in source order (the registry above). `sprint-status.yaml` reads `backlog`. It isn't the epic's first story, so the spine-drift gate doesn't apply.
- **Config:** `tea_use_playwright_utils: false`. No Pact.
- **What exists today:** 13.2's `upload_backup` and 13.3's `export_backup({forUpload})` and `record_backup_upload` are done. There is no `.claude/skills/bookvie-backup/`. The guide has Setup, What bookvie records and Restoring, but no How it works. README → AI skills lists two skills.
- **Oleg's decision (2026-11-22):** AC-1 ("no Bash, no curl") conflicts with AC-4 ("starts bookvie as the other skills do", which runs Bash). It's read as **an MCP-only tool list with a Bash fallback**:
  - The frontmatter's `allowed-tools` lists exactly the four MCP tools, the same list headless `claude -p` gets in 13.5.
  - The skill calls `get_app_info` first. Only when the tools are missing in a session run by hand does it fall back to the other skills' step 1: the health check, `bookvie --no-browser`, the probe and reconnect. Claude Code asks permission for those.
  - The only curl or shell lines allowed are the health check and the probe, and only inside step 1.

## Generation Mode

**AI generation**, sequential, in this session, as in Stories 12.3 to 13.3. Nothing is recorded, because there is no UI.

## Test Strategy

A skill is text for an agent, so most leaves pin what the text says, as Stories 12.7 and 12.8 did. AC-1's leaf then runs the chain for real: bookvie in-process over `/mcp` on `~/bookvie-data` → `~/bookvie-backups` (temporary `HOME`), and `bookvie-dropbox` in-process over `FakeDropbox`. That way the fields the skill hands on are the ones the tools give and take.

| AC | Level | Priority | Leaf (first assertion in bold) | Why |
|---|---|---|---|---|
| AC-1 | Text + API chain | P0 | `test_the_skill_exports_for_upload_uploads_unless_unchanged_and_always_ends_with_one_report` (`test_backup_skill.py`). **In the body (no frontmatter), `` `get_app_info` `` < `` `export_backup({forUpload: true})` `` < `` `unchangedSinceUpload` `` < `` `upload_backup({localPath: path})` ``.** Then the three report calls `record_backup_upload({outcome: "uploaded", path, copies, contentHash})`, `({outcome: "skipped"})` and `({outcome: "failed", cause})` all come after the export. There is a sentence with "Always … exactly one `record_backup_upload`". A line names `export_backup` and `backup_write`, and a line names `upload_backup` and `cause`. `allowed-tools` equals exactly the four names, and no other `mcp__…__…` name appears. Every curl is the health check or the probe, and each sits inside step 1. After step 1 there is no shell block and no `--no-browser`. **The chain:** an export answers `unchangedSinceUpload: false`. `upload_backup` on its `path` answers `{name, copies, deleted, contentHash}`, and `record_backup_upload` of uploaded with those values is accepted. A second export answers `true`, and a skip is accepted. A sign-in failure's `cause` is in `CAUSES` and is accepted as `failed`. | The run's order is the criterion; the chain proves the skill's data flow. |
| AC-2 | Text + API | P0 | `test_on_a_dev_server_the_skill_uploads_nothing_records_nothing_and_says_so`. **A paragraph naming `` `mode` `` and `` `"dev"` `` says "a development library is never uploaded".** It says stop, and "don't call" `export_backup`, `upload_backup` and `record_backup_upload`. It comes before the export call. `get_app_info` answers `mode: "dev"` on `--dev` and `"production"` otherwise. | |
| AC-3 | Text | P1 | `test_the_skill_reports_each_outcome_in_one_line_in_the_auto_backup_lines_words`. **A quoted `"Uploaded … · … in Dropbox, deleted …"` template.** Then `"Nothing new since the last upload; skipped."` exactly, "one line", and "1 copy". For each of AD-22's five causes, a line holds `` `<cause>` `` and `Failed: <reason>`, where the reason is EXPERIENCE.md's Failing reasons text (read by `failing_reasons()`, compared case-insensitively). | "In the same words as that line's state and reason" (EXPERIENCE → Auto-backup report). |
| AC-4 | Text + probe | P1 | `test_run_by_hand_the_skill_starts_bookvie_as_the_other_skills_do_and_goes_on`. **Step 1 ("Make sure bookvie is running") names `` `get_app_info` `` before the 8765 health curl.** Then "by hand" or "interactive", `--no-browser`, and `check_the_older_bookvie_probe(…, ports=[8765])`: the probe sent to this checkout's `/mcp` answers 200, followed by the older-bookvie stop and reconnect. There is no `8766` and no `mcp__bookvie-dev__` anywhere. Step 1 says go on or continue. | The other skills' step 1, for the `bookvie` entry only. |
| AC-5 | Manual (Oleg) | P0 | No automated leaf, as in 12.7 AC-3 and 13.1 AC-11. Two runs by hand on the real library and Dropbox: the first uploads, the second skips. The spec records both runs and the guide's corrections. The story stays in review until this is recorded. | Only a real run shows it. |
| AC-6 | Docs | P1 | `test_the_guide_says_how_the_backup_works_runs_it_once_by_hand_and_fixes_a_failed_upload` (`test_dropbox_backup_guide.py`). **A "How it works" section exists.** It holds 09:00, launchd, `claude -p`, `` `--dev` ``, export, verify, delete, 3, skip and "never upload(s)". A heading matching "first … run" names `/bookvie-backup`. A heading naming `` `upload_incomplete` `` says nothing (in Dropbox) was deleted, and holds `/bookvie-backup` and `/Apps/bookvie/.backups`. A paragraph holds `~/Dropbox/Apps/bookvie/.backups/`, "Backup page" and "Restore". README → AI skills links ``[`bookvie-backup`](.claude/skills/bookvie-backup/SKILL.md)``. | AR61: the docs ship with the code. |

**Primary branch per criterion:**
- AC-1: the run's order.
- AC-2: the dev sentence.
- AC-3: the upload line.
- AC-4: `get_app_info` before the start fallback.
- AC-5: manual.
- AC-6: How it works.

**What the leaves pin (the contract for the build):**
- The calls are written in the notation `epics.md` uses: `export_backup({forUpload: true})`, `upload_backup({localPath: path})`, and the three `record_backup_upload({...})` forms above.
- The frontmatter key is `allowed-tools`, as one line or as a block list. Claude Code reads both, and so does the leaf's parser.
- Step 1 is titled "Make sure bookvie is running" (a number before it is allowed). It carries the other skills' step 1 for the `bookvie` entry only, word for word where `check_the_older_bookvie_probe` pins it.
- Each "Failed:" line is the Backup page's Failing reason for its cause. That includes "Nothing in Dropbox was deleted." on the sign-in line, which EXPERIENCE's example sentence leaves out but the table has.

**Open for the build (not pinned):**
- The upload line when `deleted` is empty. Most likely the `, deleted …` part is dropped. The spec should say.
- Whether step 1 also checks that the `bookvie-dropbox` tools are there. If it does, keep the first `` `upload_backup({localPath: path})` `` after the export call.
- What the skill reports when `record_backup_upload` itself fails (`couldnt_save`). It should still print the outcome line plus that the report wasn't saved.
- Skill `metadata.version` (1.0.0).

## Existing leaves this story changes (for the build)

- `test_dropbox_backup_guide.py::test_the_guide_sets_up_…_commands_match_the_cli` parses every `bookvie` and `bookvie-dropbox` command in the guide's shell blocks. Don't put `bookvie autobackup …` in a code block before 13.5 adds it, or that leaf goes red. Prose is fine.
- The README's "The repo ships two Claude Code skills" sentence needs a new count. No leaf pins the count.
- `check_the_older_bookvie_probe`'s default is unchanged. The 12.7 and 12.8 callers pass as before (re-run: 62 passed).

## Green-phase follow-ups (secondary branches, not red leaves)

- [x] **AC-1:** the skill's setup and reconnect lines match the README, as `test_notes_summary_skill.py::test_the_skills_setup_and_reconnect_steps_match_the_readme` does for that skill. (done: backend/tests/test_backup_skill.py::test_the_skills_setup_and_reconnect_steps_match_the_readme)
- ~~**AC-1:** the frontmatter list equals 13.5's `--allowedTools` constant in `cli.py` (AR53). That's 13.5's leaf, and 13.4's list is its source.~~ **Retired:** moot since the sprint change (`_bmad-output/planning-artifacts/sprint-change-proposal-2026-11-23.md`, "Technical impact": the `--allowedTools` constants went with the morning job; retro E13-S2). `cli.py` has no tool-list constant (`backend/tests/test_morning_job_removed.py:98`), and the frontmatter's exact four tools stay pinned by `backend/tests/test_backup_skill.py:173` and `backend/tests/test_morning_job_removed.py:173`.
- [x] **AC-1:** an export that fails (`couldnt_save`, a missing backups folder) leads to `failed` with `backup_write`, and `record_backup_upload` accepts it (drive it with `FaultyFs`). (done: backend/tests/test_backup_skill.py::test_an_export_that_fails_is_recorded_as_failed_with_backup_write)
- [x] **AC-1:** each `upload_backup` cause (`upload_incomplete`, `dropbox_full`, `other`) recorded as `failed` is accepted (`FakeDropbox` faults). (done: backend/tests/test_backup_skill.py::test_each_upload_cause_is_recorded_as_failed_with_that_cause; a prune failing after a checked upload: test_a_prune_that_fails_after_a_checked_upload_is_recorded_as_other_and_names_the_deleted)
- [x] **AC-2:** `upload_backup` refuses a `~/bookvie-backups-dev` file before any network call. 13.2 already pins this; cite it in the spec. (done: backend/tests/test_dropbox_upload.py::test_any_other_path_is_refused_before_any_dropbox_call[dev] (Story 13.2))
- [x] **AC-3:** the empty-`deleted` wording, once the spec decides it. (done: backend/tests/test_backup_skill.py::test_an_upload_that_deleted_nothing_drops_the_deleted_part_of_the_line)
- ~~**AC-6:** each auto-backup state's troubleshooting entry is 13.6's work.~~ **Retired:** the auto-backup states (Off/Waiting/On/Failing/Stalled) were dropped by the sprint change (`_bmad-output/planning-artifacts/sprint-change-proposal-2026-11-23.md`, 13.6 shrunk to a plain Dropbox backup line; retro E13-S2). Its successor, one troubleshooting entry per failure cause quoting the line's words (Story 13.6 AC-5), is proved by `backend/tests/test_dropbox_backup_line.py:155`.

## Helper probes

Helpers reused:
- `connect_mcp`, `_isolated_home` (`conftest.py`)
- `McpClient`, `structured_of`, `error_of`, `EXPORT_BACKUP`, `RECORD_BACKUP_UPLOAD`, `UPLOAD_BACKUP`, `DROPBOX_TOOL_NAMES` (`agent_client.py`)
- `SetClock`, `curl_lines`, `is_health_or_probe`, `PROBE_PORTS`, plus `check_the_older_bookvie_probe` (**extended, probed**) (`helpers.py`)
- `LibraryBuilder` (`builder.py`)
- `_section` (`test_agent_mount.py`, as 12.7 imports it)
- `Connect`, `upload` (`test_dropbox_upload.py`). They live only there, so they're imported rather than copied.
- `FakeDropbox` (`dropbox_fakes.py`)
- `section`, `headed`, `GUIDE`, `README` (`test_dropbox_backup_guide.py`)
- `CAUSES` (`bookvie.intents.backup_file`, the product's enum, which 13.3's contract leaf ties to AD-22)

Helpers added:
- `failing_reasons()` (`helpers.py`) reads EXPERIENCE.md's Failing reasons table in order. Nothing read it before. 13.6 needs the same strings, which is why it's shared.
- `allowed_tools()` (`test_backup_skill.py`) parses a skill's `allowed-tools`. No skill had one, and PyYAML isn't installed.
- `_frontmatter`, `_body`, `_flat` (`test_backup_skill.py`) are story-local text slicers. `_skill()` returns `""` while the file is missing, so a red leaf fails at its assertion.
- `check_the_older_bookvie_probe` gains the keyword `ports`. With the default, the expected ports are both of `PROBE_PORTS`, as before.

**Probes** (temporary `backend/tests/test_atdd_13_4_probe.py`, `uv run pytest -q -p no:cacheprovider tests/test_atdd_13_4_probe.py`, removed with `rm`). **10 passed.** The first run hit an f-string brace bug in the probe's own sample, which I fixed. The second run caught a **leaf bug**: AC-6 required `` `claude -p` `` with backticks, which rejects `` `claude -p "/bookvie-backup"` ``. It now requires `claude -p`. The probes ran again after that change and all 10 passed.
- `failing_reasons()` gives 5 reasons, the first starting "Dropbox sign-in expired." and the last "the last run stopped".
- `allowed_tools()` reads the comma, space, flow-list and block-list forms as `[mcp__bookvie__a, mcp__bookvie-dropbox__b]`. It gives `None` for a key outside the frontmatter, and it keeps `Bash` in a list rather than dropping it.
- **A known-good sample skill passes all four skill leaves.** Its step 1 is notes-summary's, cut to 8765, with `get_app_info` first. The pass includes the real chain against bookvie and `FakeDropbox`.
- **Six broken variants each fail their leaf:**
  - `Bash` added to `allowed-tools` (AC-1)
  - "Always … exactly one" removed (AC-1)
  - the dev sentence changed (AC-2)
  - the skipped line changed (AC-3)
  - one Failing reason changed (AC-3)
  - `get_app_info` taken out of step 1 (AC-4)
- `check_the_older_bookvie_probe` passes notes-summary's skill with the default ports, and refuses it with `ports=[8765]`.
- The guide leaf passes a guide plus README with the new sections, and refuses one whose "keeping 3" was changed.

Shipped numbers: none quoted for UI. "3" copies and 09:00 are AD-22's rules, asserted as words in the guide.
Storage keys: no new localStorage key.
Fractional borders: none (no UI).
Render-before-read: no leaf reads a page. Each read of a tool answer comes after the call that produces it, and the skill and guide files are read whole.

## TDD Red Phase

Generated: 5 pytest leaves, all `@pytest.mark.skip`, each with a comment above it saying when to un-skip:
- 4 in `test_backup_skill.py` (`reason=RED`)
- 1 in `test_dropbox_backup_guide.py` (`reason=RED_13_4`)

The red run came after the probes last passed. It used throwaway un-skipped copies, `tests/test_backup_skill_redrun_probe.py` and `tests/test_dropbox_backup_guide_redrun_probe.py` (only the 13.4 leaf ran), removed with `rm`. **5 failed**, each at its criterion assertion:
- **AC-1:** `[-1, -1, -1, -1]`, no run steps
- **AC-2:** `[]`, no dev paragraph
- **AC-3:** "no Uploaded line"
- **AC-4:** `-1 < -1`, no step 1 `get_app_info`
- **AC-6:** "no How it works section"

The related suites afterwards (`test_backup_skill.py`, `test_dropbox_backup_guide.py`, `test_new_book_skill.py`, `test_notes_summary_skill.py`, `test_dropbox_upload.py`) gave **62 passed, 5 skipped**. `uv run ruff format` and `ruff check` are clean on the three files. `git status` lists only the three files in `generatedTestFiles`, with no `*probe*` file.

## For the build

1. Write `.claude/skills/bookvie-backup/SKILL.md`:
   - frontmatter `name`, `description`, `allowed-tools` (the four), `metadata.version`
   - step 1 (`get_app_info` first, then the 8765-only start fallback, by hand only)
   - the dev stop, the export, the branch, the upload, exactly one report, and the one-line report with the five "Failed:" lines
2. `docs/dropbox-backup.md`: How it works, the first manual run, a `` `upload_incomplete` `` troubleshooting entry, and the restore-by-hand line. README → AI skills gets the link and the new skill count.
3. AC-5: Oleg's two runs by hand, recorded in the spec with the guide's corrections. The story stays in review until they are.
4. Spine: nothing here contradicts AD-22. The Bash fallback reading is Oleg's decision above, and AD-22 already says "Run by hand … it may start bookvie as the other skills do".

## Next Steps (Task-by-Task Activation)

1. In `bmad-build-auto`, remove a leaf's skip when its task starts. Suggested order: AC-4 (step 1), AC-2, AC-1, AC-3, AC-6.
2. Run `cd backend && uv run pytest -q tests/test_backup_skill.py tests/test_dropbox_backup_guide.py`.
3. Finish with `npm run check`.
