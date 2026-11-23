---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-23'
storyId: '13.8'
storyKey: '13-8-restore-with-one-skill-from-this-computer-or-dropbox'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-138-restore-with-one-skill-from-this-computer-or-dropbox'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-13-8-restore-with-one-skill-from-this-computer-or-dropbox.md'
generatedTestFiles:
  - 'backend/tests/test_restore_skill.py'
  - 'backend/tests/test_dropbox_backup_guide.py (AC-7 leaf)'
  - 'backend/tests/helpers.py (restore_outcomes added)'
  - 'backend/tests/test_backup_skill.py (_skill gains an optional path)'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 13.8; Epic 13 gate; Story 13.7 descriptions; UX-DR78 to UX-DR81)'
  - '_bmad-output/implementation-artifacts/epic-13-context.md'
  - '_bmad-output/planning-artifacts/dropbox-backup-plan-2026-11-21.md (D19, §4 13.8, guide item 4)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Agent conversations → Restore, steps 1 to 4; Flow 14)'
  - '_bmad-output/implementation-artifacts/spec-13-7-fetch-a-backup-from-my-dropbox.md (list_backups and download_backup contracts, DOWNLOAD_CAUSES)'
  - '_bmad-output/test-artifacts/atdd-checklist-13-4-back-up-to-dropbox-with-one-skill.md (format; the skill-text precedent; the manual-AC precedent)'
  - '_bmad/tea/config.yaml'
  - '.claude/skills/bookvie-backup/SKILL.md, .claude/skills/bookvie-notes-summary/SKILL.md (step 1 for both entries)'
  - 'docs/dropbox-backup.md (Restoring), README.md (AI skills)'
  - 'backend/tests/agent_client.py, conftest.py, helpers.py, restore_scene.py, dropbox_fakes.py, test_backup_skill.py, test_dropbox_download.py, test_dropbox_upload.py, test_dropbox_backup_guide.py, test_agent_restore.py, test_agent_mount.py'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given .claude/skills/bookvie-restore/SKILL.md (new), when it runs, then it starts bookvie if needed (as the other skills do), calls list_local_backups and list_backups, and shows UX-DR78''s pick list: newest first, one row per content hash (a backup both here and in Dropbox is one row, restored from this computer without a download), the 10 newest then "and N older. Say show all to see them.", and "The newest is 1. Which one?"; and it suggests the newest and waits; it never picks; and when Dropbox can''t be reached it lists this computer''s backups and "Couldn''t reach Dropbox: *reason*."; with no backups anywhere it says "No backups found on this computer or in Dropbox. Nothing was changed."' }
  - { id: AC-2, idSource: generated, text: 'Given a Dropbox pick, when the user picks it, then the skill calls download_backup with the target of the bookvie it restores into, then preview_restore with the local path.' }
  - { id: AC-3, idSource: generated, text: 'Given the preview, when the skill shows it, then it uses UX-DR79''s layout and words (the counts, up to 5 titles then "and N more", the "Everything else changed since…" line, the safety-copy line), asks in the chat in its own words, and calls restore_backup only after a yes.' }
  - { id: AC-4, idSource: generated, text: 'Given each outcome of restore_backup or of the download, when the skill reports it, then it uses UX-DR81''s words, with paths written with ~, adds the terminal-CLI advice only for reason: unsupported, and never retries a refused or unconfirmed restore by itself.' }
  - { id: AC-5, idSource: generated, text: 'Given a request to work on development, when the skill runs, then it uses the bookvie-dev tools and download_backup with target bookvie-dev, and never touches the real library.' }
  - { id: AC-6, idSource: generated, text: 'Given a --dev server with real data downloaded into it, when Oleg runs the skill in a real Claude Code terminal session: one restore from a local backup, one from Dropbox, one declined in the chat, one declined at Claude Code''s permission prompt, one declined at bookvie''s question, and an undo from the safety copy, then each behaves as above, and the spec records the runs (manual verification).' }
  - { id: AC-7, idSource: generated, text: 'Given the guide and the README, when Oleg follows the Restoring section from scratch, then docs/dropbox-backup.md describes the skill step by step, with Dropbox downloads and the manual fallback, and the Dropbox download troubleshooting (sign-in, a download that didn''t match); and README → AI skills lists bookvie-restore.' }
---

# ATDD Checklist: Story 13.8 Restore with one skill, from this computer or Dropbox

## Preflight

- **Stack:** `fullstack`, auto-detected. pytest and Playwright are in place. The story adds a skill and docs, with no UI, so every leaf is pytest.
- **Story:** `epics.md` Story 13.8 has 7 Given/When/Then criteria with no ids. They're numbered AC-1 to AC-7 in source order (the registry above). There is no spec file yet: as in 13.4 and 13.7, the build writes it. `sprint-status.yaml` reads `backlog`. 13.8 isn't the epic's first story, so the spine-drift gate doesn't apply. It is the epic's **last** story (AGENTS.md → Epic boundaries).
- **Gate 2:** Stories 13.7 and 13.8 depend on 13.1's gate 2 (Claude Code's terminal CLI shows bookvie's question). 13.7 went ahead and is `done`, so this story goes on too.
- **Config:** `tea_use_playwright_utils: false`. No Pact.
- **What exists today:**
  - bookvie serves `list_local_backups`, `preview_restore` and `restore_backup` (13.1).
  - bookvie-dropbox serves `list_backups` and `download_backup` (13.7). Their errors are `{cause, message}`, and `download_backup`'s causes are `dropbox_signin`, `download_incomplete` and `other`.
  - There is no `.claude/skills/bookvie-restore/`.
  - The guide's Restoring section has the three tools, the Dropbox tools paragraph, the manual fallback, the `ask` rule, the two prompts, the safety copy and six troubleshooting entries, but no skill walkthrough and nothing on a failed download.
  - README → AI skills lists three skills.
- **No decision needed from Oleg.** Unlike 13.4, no criterion conflicts with another. The skill runs interactively, so it may use Bash in step 1, like `bookvie-notes-summary`, for both entries.

## Generation Mode

**AI generation**, sequential, in this session, as in Stories 12.3 to 13.7. Nothing is recorded, because there is no UI.

## Test Strategy

A skill is text for an agent, so most leaves pin what the text says, as 13.4 did. Where the skill reads or hands on fields, the leaf also drives the tools for real: bookvie in-process over `/mcp` with `~/bookvie-backups` (temporary `HOME`), and `bookvie-dropbox` in-process over `FakeDropbox`. That way the field names the skill uses are the ones the tools give.

| AC | Level | Priority | Leaf (first assertion in bold) | Why |
|---|---|---|---|---|
| AC-1 | Text + API chain | P0 | `test_the_skill_lists_this_computers_and_dropboxs_backups_as_one_pick_list_and_waits` (`test_restore_skill.py`). **In the body, `` `list_local_backups` `` and `` `list_backups` `` both come before "Backups you can restore:", which comes before "The newest is 1. Which one?".** Then: "daily backup", "safety copy (before a restore)" and "this computer and Dropbox" all appear. A paragraph holds `` `contentHash` ``, "one row" and "without (a) download". The text holds "10 newest" and `and *N* older. Say show all to see them.` It suggests, waits and "never pick(s)". `Couldn't reach Dropbox: *reason*.` appears, a line holds `` `dropbox_signin` `` with "Dropbox sign-in expired. Run bookvie-dropbox auth in Terminal.", and the none-anywhere line appears exactly. `check_the_older_bookvie_probe` passes with **both** ports (8765 and 8766). The body names `contentHash`, `backupTime`, `kind` and `size`. **The chain:** a daily backup exported here and uploaded to `FakeDropbox`, next to an older Dropbox-only daily. Both lists carry those fields, and exactly one `contentHash` is in both. | The pick list is the criterion. The chain proves the merge key is real. |
| AC-2 | Text + API chain | P0 | `test_a_dropbox_pick_is_downloaded_into_the_bookvie_it_restores_into_then_previewed`. **There is a paragraph holding `` `download_backup` `` and `` `target` ``, with `` `download_backup` `` before `` `preview_restore` ``.** That paragraph says "restore(s) into" and names `` `path` ``. **The chain:** `download_backup({name, target: "bookvie"})`'s `path` is one `preview_restore` reads, with titles added since. | The download's answer is the preview's input. 13.7 AC-6 previews from the local listing, not from the download's `path`. |
| AC-3 | Text + API chain | P0 | `test_the_skill_shows_the_preview_in_its_words_and_calls_restore_backup_only_after_a_yes`. **"This backup:" < "Now:" < "You'd lose what was added since" < "Everything else changed since" < "A safety copy of your current library is saved first.", all present and in that order.** Then: the line `Restore <file> (<source, date, time>)?`, the whole "Everything else … such as pages reached, goes back to how it was then." line, "No books or card notes were added since", "up to 5" with `and *N* more`, "1 book", "1 card note" and "own words". A paragraph names `` `restore_backup` `` with "only … yes", after the preview. **Gates:** no `…restore_backup` in `allowed-tools`, no `/api/intents/restore`, and every curl is the health check or the probe, inside step 1. The body names `booksAddedSince` and `cardNotesAddedSince`, and a real `preview_restore` (the restore `Scene`) answers them, with `backupTime`, `backup` and `current`. | `allowed-tools` would pre-approve the tool and skip gate 1, the `ask` rule. |
| AC-4 | Text | P1 | `test_the_skill_reports_each_outcome_in_its_words_and_never_retries_by_itself`. **A quoted `"Restored from the backup of … . Safety copy: ~/…"` line.** Then, for each other row of EXPERIENCE.md's outcome table (read by `restore_outcomes()`), a line holds the row's text and its codes in backticks: `restore_not_confirmed`; `restore_invalid` + `restore_unsafe`; `restore_newer_version`; `couldnt_save`; `download_backup` (the "Couldn't download … *reason* …" row); `safety_copy_failed`; `restore_outside_backups`; `download_incomplete`. The terminal advice sits on a line with `` `unsupported` ``, and "only" ties the two together. The body names `` `reason` `` and `` `safetyCopy` ``. A line pairs `` `~` `` with "home folder", and the text says it never (or doesn't) retry. | The words come from EXPERIENCE.md, not retyped. |
| AC-5 | Text | P0 | `test_on_development_the_skill_uses_the_bookvie_dev_tools_and_never_the_real_library`. **A paragraph holding `` `bookvie-dev` ``, `` `download_backup` `` and `` `target` `` says "never … real library".** Step 1 holds `bookvie --dev --no-browser` and the 8766 health check. | `download_backup` to `bookvie-dev` landing in `~/bookvie-backups-dev/from-dropbox/` is pinned by 13.7 (`test_download_backup_writes_a_verified_copy_into_from_dropbox_and_returns_its_path`). It isn't repeated here. |
| AC-6 | Manual (Oleg) | P0 | No automated leaf, as in 13.4 AC-5 and 13.1 AC-11. Six runs in a real Claude Code terminal on a `--dev` server with real data downloaded into it: from a local backup, from Dropbox, declined in the chat, declined at the permission prompt, declined at bookvie's question, and an undo from the safety copy. The spec records each run, and the story stays in review until they are recorded (Epic 12 retro item 85; the Epic 13 gate). | Only a real terminal session shows both gates. |
| AC-7 | Docs | P1 | `test_the_guide_restores_with_the_skill_step_by_step_and_fixes_a_dropbox_download` (`test_dropbox_backup_guide.py`, `RED_13_8`). **Under Restoring there is a heading naming `` `bookvie-restore` ``.** It holds `/bookvie-restore`, at least 4 numbered steps, `` `download_backup` `` and `from-dropbox`. Restoring still holds `~/Dropbox/Apps/bookvie/.backups/` and "Restore from file". Its troubleshooting has a heading naming `` `dropbox_signin` `` whose entry mentions download and `bookvie-dropbox auth`, and one naming `` `download_incomplete` `` that says "nothing was restored". README → AI skills links ``[`bookvie-restore`](.claude/skills/bookvie-restore/SKILL.md)``. | AR61: the docs ship with the code. |

**Primary branch per criterion:**
- AC-1: the pick list after both lists.
- AC-2: download, then preview.
- AC-3: the preview's lines in order.
- AC-4: the Restored line with `~`.
- AC-5: the dev paragraph.
- AC-6: manual.
- AC-7: the skill heading under Restoring.

**What the leaves pin (the contract for the build):**
- Step 1 is titled "Make sure bookvie is running" (a number before it is allowed). It carries the other skills' step 1 for **both** entries, as `bookvie-notes-summary` does: the 8765 and 8766 health checks and probes, `bookvie --dev --no-browser`, the older-bookvie stop and reconnect. `check_the_older_bookvie_probe` pins that word for word.
- The pick list is shown as a list beginning with "Backups you can restore:" and ending with "The newest is 1. Which one?". The row words are UX-DR78's.
- The preview lines are UX-DR79's, in its order. A worked example (as in EXPERIENCE.md) or a template both satisfy the leaves.
- The Restored line has a `~/` path. Every other outcome's line holds EXPERIENCE.md's text **and** the code or codes in backticks. The download's own failure line names `` `download_backup` ``.
- `allowed-tools` is optional. If it is there, it must never list a `restore_backup`.
- The guide's skill section heading names `` `bookvie-restore` `` and sits under `## Restoring`. The two download entries go under Restoring's troubleshooting, with `` `dropbox_signin` `` and `` `download_incomplete` `` in their headings.

**Open for the build (not pinned):**
- What "show all" lists (presumably every row, in the same format), and whether a row numbering continues past 10.
- Which row a local `from_dropbox` file is: presumably "daily backup · this computer", or "this computer and Dropbox" when its hash is still in Dropbox.
- What *reason* is in "Couldn't reach Dropbox: *reason*." for `other` (the error's `message`?), and what the skill says when the bookvie-dropbox tools aren't connected at all. That should still list this computer's backups.
- Whether a pick that is both here and in Dropbox, but whose local file was a `from_dropbox` download, still restores without a new download. By the content-hash rule it does.
- The date format: "19 Nov, 09:02", with the year when it isn't this year (`short_when` in `helpers.py` already does this for the confirmation).
- Skill `metadata.version` (1.0.0).

## Existing leaves this story changes (for the build)

- `test_dropbox_backup_guide.py::test_the_guide_sets_up_…_commands_match_the_cli` parses every `bookvie` and `bookvie-dropbox` command in the guide's shell blocks. `bookvie-dropbox auth` and `/bookvie-restore` in a shell block must parse, or stay in prose.
- `test_dropbox_backup_guide.py::test_the_guide_says_how_to_restore_and_the_readme_links_to_it` (13.1) still needs the `ask` JSON block, the six `restore_*` codes, `bookvie-pre-restore-`, "VS Code" and "claude -p" in Restoring. Keep them.
- The README's "The repo ships three Claude Code skills" sentence needs four. No leaf pins the count.
- `test_backup_skill.py`'s `_skill()` gained an optional `path`. Its default is unchanged, and the 13.4 leaves pass as before.

## Green-phase follow-ups (secondary branches, not red leaves)

- [x] **AC-1:** with `list_backups` refusing `dropbox_signin` (`FakeDropbox(fault="signin")`), the local list still answers. The skill's sign-in line is the cause's. Drive it for real. (done: backend/tests/test_restore_skill.py:356 `test_dropbox_out_of_reach_still_lists_this_computer_and_says_why_without_retrying`)
- [x] **AC-1:** "show all" lists the rest (once the spec decides how). (done: backend/tests/test_restore_skill.py:347 `test_more_than_10_backups_show_the_10_newest_and_show_all_lists_every_row_numbered_on`)
- [x] **AC-1:** the skill's setup and reconnect lines match the README for both entries, as `test_backup_skill.py::test_the_skills_setup_and_reconnect_steps_match_the_readme` does for one. (done: backend/tests/test_restore_skill.py:486 `test_the_skills_setup_and_reconnect_steps_match_the_readme_for_both_entries`)
- [x] **AC-2:** each `download_backup` cause (`dropbox_signin`, `download_incomplete`, `other`) leaves nothing to preview, and the skill stops with that cause's line. 13.7 pins the tool's side. (done: backend/tests/test_restore_skill.py:399 `test_each_failed_download_stops_with_its_causes_line_and_nothing_restored`, all three causes; nothing written: `backend/tests/test_dropbox_download_follow_ups.py:151` `test_a_failed_listing_or_download_writes_no_file`)
- [x] **AC-3:** the preview's "nothing added" branch against a real preview (`restore_scene` with `grown=False`). (done: backend/tests/test_restore_skill.py:416 `test_a_preview_with_nothing_added_says_so_and_keeps_the_everything_else_line`)
- [x] **AC-4:** `restore_backup` from a client below 2026-07-28 answers `reason: "unsupported"`. 13.1 pins this (`test_anything_but_an_accept_…[unsupported…]`); cite it in the spec. (done: `backend/tests/test_agent_restore.py:525` `test_anything_but_an_accept_on_a_valid_token_is_restore_not_confirmed_and_changes_nothing`, cases `handshake_revision`, `no_elicitation`, `url_elicitation_only`; cited in the spec's Design Notes; the skill's advice line: backend/tests/test_restore_skill.py:255 `test_the_skill_reports_each_outcome_in_its_words_and_never_retries_by_itself`)
- [x] **AC-5:** the dev path never names an `mcp__bookvie__` tool (if the skill names tools by full name). (done: backend/tests/test_restore_skill.py:507 `test_on_development_every_bookvie_tool_goes_to_the_dev_entry_and_none_is_named_in_full`: no `mcp__` name anywhere, and the dev paragraph routes every bookvie tool the skill calls)
- [x] **AC-7:** the guide's walkthrough names the same steps, in the same order, as the skill's headings. (done: backend/tests/test_restore_skill.py:523 `test_the_guide_walks_through_the_skills_steps_in_the_skills_order`)

## Helper probes

Helpers reused:
- `connect_mcp`, `_isolated_home` (`conftest.py`)
- `McpClient`, `structured_of`, `DOWNLOAD_BACKUP`, `EXPORT_BACKUP`, `LIST_BACKUPS`, `LIST_LOCAL_BACKUPS`, `PREVIEW_RESTORE` (`agent_client.py`)
- `FakeDropbox`, `daily_zip` (`dropbox_fakes.py`)
- `SetClock`, `backup_zip`, `check_the_older_bookvie_probe`, `curl_lines`, `is_health_or_probe` (`helpers.py`)
- `BACKUP_AT`, `DAILY`, `NOW`, `Scene`, `write_library` (`restore_scene.py`)
- `_section` (`test_agent_mount.py`, as 13.4 imports it)
- `REPO_ROOT`, `START_STEP`, `_body`, `_flat`, `_paragraphs`, `allowed_tools`, `_connect_default`, plus `_skill` (**extended, probed**) (`test_backup_skill.py`). These story-local readers live only there, so they're imported rather than copied, as 13.4 imported `Connect` and `upload`.
- `content_of`, `dropbox_call` (`test_dropbox_download.py`)
- `Connect`, `daily`, `upload` (`test_dropbox_upload.py`)
- `section`, `headed`, `GUIDE`, `README`, `DROPBOX_BACKUPS` (`test_dropbox_backup_guide.py`)

Helpers added:
- `restore_outcomes()` (`helpers.py`) reads EXPERIENCE.md's Restore outcome table (UX-DR81) as `{Outcome cell: [quoted texts]}`. Nothing read it before. `failing_reasons()` reads the other table, and `restore_scene.py`'s three `*_MESSAGE` constants are hand-typed and cover only 3 of the 9 rows.
- `text_on()` (`test_restore_skill.py`) matches a line against an EXPERIENCE text in which `*reason*` stands for any words. No helper did that.
- `_skill(path=SKILL_MD)` gains an optional path. With the default it reads `bookvie-backup`'s skill, as before.

**Probes** (temporary `backend/tests/test_atdd_13_8_probe.py`, plus a sample skill, guide and README in the session scratchpad; `uv run pytest -q -p no:cacheprovider tests/test_atdd_13_8_probe.py`; removed with `rm`). **20 passed.**
- The first run hit an argument-name clash in the probe's own `run_leaf`, which I fixed.
- The second run caught a **leaf bug**: AC-3 needed a lowercase "up to 5", which rejects the sentence-initial "Up to 5 titles". It now matches case-insensitively. The probes ran again after that change, and all 20 passed.

What the probes showed:
- `restore_outcomes()` gives 9 rows, the first "Restored". The Declined row gives `["Not restored. Nothing was changed.", "Run it in the Claude Code terminal, not VS Code or claude -p."]`, and the download row keeps `*reason*`. Pointed at a copy of EXPERIENCE.md with the safety-copy text changed to "X.", it returns `["X."]`, so it reads the file rather than a cached value.
- `text_on()` accepts a line with "sign-in expired" in place of `*reason*`, and refuses one whose "Nothing was changed." became "Nothing changed.".
- `_skill()` with the default still returns `bookvie-backup`'s file, and gives `""` for a missing path.
- **A known-good sample skill passes all five skill leaves**, including the three real chains against bookvie and `FakeDropbox`. Its step 1 is `bookvie-notes-summary`'s, word for word.
- **A sample guide and README pass the AC-7 leaf.**
- **Eleven broken skill variants each fail their leaf:**
  - no "Which one?" (AC-1)
  - "pick the newest" (AC-1)
  - "after a download" (AC-1)
  - preview before download (AC-2)
  - no "only after … yes" (AC-3)
  - `restore_backup` in `allowed-tools` (AC-3)
  - the Everything-else line cut (AC-3)
  - one outcome's words changed (AC-4)
  - the advice given always (AC-4)
  - a `/Users/…` path (AC-4)
  - no "never … real library" (AC-5)
- **Two broken guides each fail AC-7:** no `download_incomplete` heading, and no README link.

Shipped numbers: none quoted for UI. "10 newest", "up to 5" and the 5-minute expiry are UX-DR78, UX-DR79 and AD-22 rules, asserted as words in the skill.
Storage keys: no new localStorage key.
Fractional borders: none (no UI).
Render-before-read: no leaf reads a page. Each read of a tool answer comes after the call that produces it, and the skill and guide files are read whole.

## TDD Red Phase

Generated: 6 pytest leaves, all `@pytest.mark.skip`, each with a comment above it saying when to un-skip:
- 5 in `test_restore_skill.py` (`reason=RED`)
- 1 in `test_dropbox_backup_guide.py` (`reason=RED_13_8`)

AC-6 is manual. Every leaf carries exactly one `# [Pn] AC-n` id.

The red run came after the probes last passed. It used throwaway un-skipped copies, `tests/test_restore_skill_redrun_probe.py` and `tests/test_dropbox_backup_guide_redrun_probe.py` (only the 13.8 leaf ran), removed with `rm`. **6 failed**, each at its criterion assertion:
- **AC-1:** `([-1, -1], -1, -1)`, no lists and no pick list
- **AC-2:** "no paragraph that downloads, then previews"
- **AC-3:** `[-1, -1, -1, -1, -1]`, no preview lines
- **AC-4:** "no Restored line with a ~ path"
- **AC-5:** `[]`, no dev paragraph
- **AC-7:** "no bookvie-restore section under Restoring"

The related suites afterwards (`test_restore_skill.py`, `test_dropbox_backup_guide.py`, `test_backup_skill.py`, `test_notes_summary_skill.py`, `test_new_book_skill.py`, `test_dropbox_download.py`, `test_agent_restore.py`) gave **103 passed, 6 skipped**. `uv run ruff format` is clean on the four files, and `uv run ruff check tests/` passes. `git status` lists only the four files in `generatedTestFiles` and this checklist, with no `*probe*` file.

## For the build

1. Write `.claude/skills/bookvie-restore/SKILL.md`:
   - frontmatter: `name`, `description`, `metadata.version`, and no `restore_backup` in any `allowed-tools`
   - step 1 for both entries (from `bookvie-notes-summary`)
   - the two lists merged by `contentHash`, and the pick list
   - the unreachable-Dropbox and none-anywhere lines
   - a Dropbox pick: `download_backup` with the `target`, then `preview_restore` on its `path`
   - the preview, the question in the chat, and `restore_backup` only after a yes
   - each outcome's line, `~` paths, the `unsupported` advice, and no retry
   - the development paragraph
2. Write the spec, `spec-13-8-…md`. It needs the I/O matrix with the open questions above settled, and the AC-6 run log.
3. `docs/dropbox-backup.md`, under Restoring:
   - a `bookvie-restore` subsection with numbered steps (including the Dropbox download)
   - troubleshooting for `dropbox_signin` while downloading and for `download_incomplete`
   - keep the manual fallback and the 13.1 content
   README → AI skills gets the link and "four" skills.
4. AC-6: Oleg's six runs in a real terminal on a `--dev` server, recorded in the spec. The story stays in review until they are.
5. Spine: nothing here contradicts AD-22. The skill adds no tool, and the plan's D19 is the skill's outline.
6. Epic boundary: 13.8 closes Epic 13. After its review, run `bmad-testarch-automate`, then the Epic 13 retro and its before-next-epic items, not Epic 14's first story.

## Next Steps (Task-by-Task Activation)

1. In `bmad-build-auto`, remove a leaf's skip when its task starts. Suggested order: AC-1, AC-2, AC-3, AC-4, AC-5, AC-7.
2. Run `cd backend && uv run pytest -q tests/test_restore_skill.py tests/test_dropbox_backup_guide.py`.
3. Finish with `npm run check`.
