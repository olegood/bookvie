---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-22'
storyId: '13.3'
storyKey: '13-3-record-each-upload-in-bookvie'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-13-3-record-each-upload-in-bookvie.md (Boundaries, I/O matrix, Review Findings and Triage Log)
  - _bmad-output/test-artifacts/atdd-checklist-13-3-record-each-upload-in-bookvie.md (Test Strategy, Green-phase follow-ups)
  - _bmad-output/implementation-artifacts/deferred-work.md (13.3's entries; none is addressed to this step)
  - _bmad/tea/config.yaml
  - backend/bookvie/store/local_state.py, store/store.py, intents/backup_file.py, agent/tools.py
  - backend/tests/test_agent_backup_upload.py, test_agent_backup.py, test_store.py, test_export.py, test_agent_restore.py, helpers.py, restore_scene.py
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
---

# Automation Summary: Story 13.3 Record each upload in bookvie

## Preflight

- **Stack:** `fullstack` (auto). The story has no UI: the Backup line is Story 13.6. Every target is pytest through the in-process app (`connect_mcp`), the intents and `store/local_state`. So no browser session was opened, and the Playwright fragments weren't loaded.
- **Where:** story 13.3's commits are on this worktree's branch (`hogback-creosote`, `9baf09a`). Master is still at 13.2's `b64f901`, so this run works here.
- **Mode:** BMad-integrated. The story is `done` (`9baf09a`). The inputs were the ATDD checklist's 6 open follow-up groups. The review left no deferral for this step.
- **Generation:** sequential, in this session, as for Stories 12.3 to 13.2.
- **Knowledge:** the six core fragments only. `tea_use_playwright_utils` and `tea_use_pactjs_utils` are off, and there is no Pact artifact.
- **Baseline, measured in this run:** the story's tests plus `test_agent_backup.py`, `test_store.py`, `test_export.py` and `test_agent_restore.py` (220 passed) gave `intents/backup_file.py` 93% and `store/local_state.py` 91%. The misses that 13.3 added:
  - `local_state.py:81-82`: the writer over a JSON file that isn't an object.
  - `local_state.py:94-98`: `read_group` over an unreadable or invalid file.
  - `backup_file.py:102-103`: `_same_folder_folded`'s `OSError` guard.

  The other misses are 13.1's.

## Coverage plan

The build and the review had already pinned most follow-ups:
- every refusal of `record_backup_upload`'s arguments (`test_agent_backup_upload.py:482`);
- symlinked, non-zip, zip without `library.json`, corrupt and unreadable daily files (`:533`, `:570`);
- `forUpload` that isn't a boolean (`:650`), a failed or unreadable forUpload write (`:664`, `:685`);
- the 50-thread race (`:699`), unknown top-level keys (`:611`);
- the folder rule's `..`, case-folded and dev-symlink spellings (`test_agent_backup.py:443`).

This run adds the rest:

| AC | Priority | Level | Leaf |
|---|---|---|---|
| AC-1 | P0 | API | The daily run's next day: the unchanged library exported with `forUpload` on 21 Nov writes a new file with other bytes, but answers the same `libraryHash` and `unchangedSinceUpload: true`. A changed cover's bytes don't move the hash (AD-22: covers have immutable names). A book edit does. |
| AC-1 | P1 | API | `unchangedSinceUpload` is false, and the backup is still written, for each malformed `autoBackup` shape: a number, a list, a `lastUpload` that isn't an object, a `libraryHash` that isn't a string, a `lastUpload` without one. |
| AC-1, AC-6 | P1 | API | A forUpload export over a `local-state.json` that isn't valid JSON, or that can't be read, answers false. stderr names the file, and the file is left as it was. |
| AC-4, AC-6 | P1 | API | A skip over a malformed `autoBackup` group replaces it with `{lastReport, lastOk}`. An upload over a group holding an extra key keeps that key. |
| AC-6 | P1 | Store | Both writers over a file holding JSON that isn't an object (`[]`, `"text"`, `null`, `5`) and over invalid JSON: the file becomes the written group alone, and stderr says why. |
| AC-6 | P2 | API | A failed folder flush after `local-state.json`'s rename is logged, and the report succeeds and is stored. |
| AC-7 | P2 | Unit | A data folder that is a symlink to `~/bookvie`, `~/elsewhere/../bookvie`, and a `HOME` that is itself a symlink all get no backups folder. Through a symlinked `HOME`, `~/bookvie-data` still gets `~/bookvie-backups`. |

Scope: selective. These are the checklist's open secondary branches and 13.3's uncovered lines, not new primary paths.

Not automated:
- `restore_backup`, the tool, keeping `autoBackup`. `test_agent_restore.py:577,584` pin `local-state.json` byte for byte after the tool's restore, and the handler never calls the writer. The review rejected a new leaf as duplicate coverage.
- `_same_folder_folded`'s `OSError` guard (`backup_file.py:102-103`). `_same_folder` before it catches the same errors on the same paths, so the guard needs a path that fails one `resolve()` and not the other.

## Files

- `backend/tests/test_agent_backup_upload_follow_ups.py` (new): 7 leaves, 17 cases. Each carries a `# [Pn] AC-n.` tag, as `test_agent_edit_form.py` does. It reuses `test_agent_backup_upload.py`'s helpers (`_connect`, `_state`, `_instants`, `_library_hash`, `_uploaded`, `_record_skip`) and `test_agent_backup.py`'s (`LOCAL_STATE`, `_names`, `backup_name`), and adds only `_for_upload`.
- `_bmad-output/test-artifacts/atdd-checklist-13-3-record-each-upload-in-bookvie.md`: the follow-ups are resolved.

No file under `backend/bookvie/` changed. `deferred-work.md` didn't change: 13.3 left no entry for this step.

## Validation

- `uv run pytest -q tests/test_agent_backup_upload_follow_ups.py`: 17 passed. The first run had 2 failures, both in the test's own assertion: the invalid-JSON log puts the parser's message between "is not valid JSON" and "; replacing it". The leaf now matches the one "replacing it" line and checks the reason inside it.
- **Coverage, measured in this run** (the story's tests, the new file, and `test_agent_backup.py`, `test_store.py`, `test_export.py`, `test_agent_restore.py`; 237 passed):
  - `store/local_state.py` went from 91% to **100%**.
  - `intents/backup_file.py` is unchanged at 93%. Its remaining misses are 13.1's lines and `_same_folder_folded`'s guard (see "Not automated").
- **Mutation probes:** a script in the scratchpad edited each source file, ran the targeted leaf, then wrote the original bytes back and checked their SHA-256. No git command was used. **11 of 11 killed**:
  - the writer not replacing a non-object file;
  - `read_group`'s failure not logged;
  - the `autoBackup` group not checked for a dict;
  - a bare `lastUpload` string read as the hash;
  - `libraryHash` including the zip's time;
  - `libraryHash` including the covers;
  - the old group dropped by a report;
  - a malformed group not replaced;
  - a folder-flush fault failing the write;
  - the sibling compared unresolved;
  - the data folder not resolved.
- `git status` after the probes showed only this run's files.
- `npm run check`, first run: exit 1. Only the port-8790 flake failed (3 leaves of `test_dropbox_cli_follow_ups.py`), and e2e stopped when `check:py` failed.
- `npm run check`, re-run on the final tree (before the summary's last edits, which are Markdown only): exit 0. That covers:
  - ruff;
  - 2396 pytest passed;
  - the coverage gate: domain 100%, intents+store 96.52% (up from 96.45%), bookvie_dropbox 96.36%;
  - api, Prettier, tsc and oxlint;
  - 800 e2e passed;
  - the smoke test.

## ATDD checklist

All 6 open groups are resolved: 18 lines ticked, 1 retired. The retired line is `restore_backup`, the tool, keeping `autoBackup`: `test_agent_restore.py:577,584` already pin `local-state.json` byte for byte, and the review rejected a new leaf. Most ticks point at leaves the build and review added. Eight cite this run's leaves. `grep -cF '[ ]'` = 0.

## Risks and assumptions

- The next-day leaf pins AD-22's accepted rule that a cover changed in place doesn't make the library "changed". If covers ever stop having immutable names, that line of the leaf must change with AD-22.
- The port-8790 Dropbox sign-in flake (`deferred-work.md`, 13.3's medium entry) failed the first full check of this run, in 3 leaves of `test_dropbox_cli_follow_ups.py`, with "Port 8790 on 127.0.0.1 is in use". It isn't this run's: no file it touched binds a port.
- The unreadable-file case uses a folder in place of `local-state.json`, so it runs as root too.

## Next

- Commit this run (`test:`, story 13.3).
- Story 13.4 (`back-up-to-dropbox-with-one-skill`) next: ATDD, `bmad-build-auto`, then `bmad-code-review` in a new session.
- `bmad-testarch-trace` for Epic 13 at its gate. It also settles 13.1's open restore-path coverage line.
- Fixing the port-8790 flake before 13.4 would keep that story's full checks from failing at random.
