---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-22'
storyId: '13.1'
storyKey: '13-1-restore-my-library-through-an-agent-with-two-confirmations'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-13-1-restore-my-library-through-an-agent-with-two-confirmations.md (Boundaries, I/O matrix, Design Notes, Review Triage Log, Manual runs (AC-11))
  - _bmad-output/test-artifacts/atdd-checklist-13-1-restore-my-library-through-an-agent-with-two-confirmations.md (Green-phase follow-ups)
  - _bmad-output/implementation-artifacts/deferred-work.md (the content-hash and UX-wording entries)
  - _bmad/tea/config.yaml
  - backend/bookvie/intents/backup_file.py, restore_file.py; backend/bookvie/agent/restore_gate.py, tools.py; backend/bookvie/store/store.py (`replace_all`)
  - backend/tests/test_agent_restore.py, test_restore_backup_edges.py, test_restore_refusals.py (`_StepFault`), test_agent_backup.py (the lock-order pattern), helpers.py (`RecordingLock`)
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
---

# Automation Summary: Story 13.1 Restore my library through an agent, with two confirmations

## Preflight

- **Stack:** `fullstack` (auto). The story has no UI: every target is pytest over `/mcp`, so no browser session was opened and the Playwright fragments weren't loaded.
- **Mode:** BMad-integrated. The story is `done` (the review's AC-11 record is in the working tree, uncommitted, and this run left those three files alone). The inputs were the ATDD checklist's 11 open follow-ups and the review's deferrals.
- **Generation:** sequential, in this session, as for Stories 12.3 to 12.8.
- **Knowledge:** the six core fragments only. `tea_use_playwright_utils` and `tea_use_pactjs_utils` are off, and there is no Pact artifact.

## Coverage plan

Already pinned by the build and the review: AC-1 to AC-10 and AC-12's primary branches, plus these follow-ups:
- the unreadable daily-named file (`test_agent_restore.py:321`);
- the "nothing added" message, more than 5 titles and another year (`:691`, `:707`);
- `{"elicitation": {"form": {}}}` counting as form (`:770`);
- a response under the wrong key (`:799`).

This run added the rest. All are API level (pytest over `connect_mcp`), the level the story's leaves use:

| AC | Priority | Leaf |
|---|---|---|
| AC-1, AC-4 | P2 | A safety-copy name in `from-dropbox/` is neither listed nor restorable. |
| AC-1 | P2 | The content hash of a backup over one 4 MiB block, against the two-block rule written out by hand. |
| AC-2 | P1 | The safety copy's `library.json` entry is stamped with the `now` its name gives (`date_time` and 0x5455), and listed with that time. |
| AC-7 | P2 | A third safety copy in one minute is `-3`, and both earlier ones are byte-identical. |
| AC-7 | P1 | On the accept, `RecordingLock` logs one acquire first and one release last, with the safety copy's rename before `library.json`'s. |
| AC-8 | P1 | A `close` fault is `safety_copy_failed` with nothing changed. A failed folder flush after the rename is only logged, and the restore goes on. |
| AC-3, AC-7 | P1 | A `from-dropbox/` backup is listed as `from_dropbox`, previews, and restores. Its safety copy lands in the backups folder and previews back (`backup` = now, `current` = then, nothing added). |
| AC-3, AC-5 | P2 | Card notes added on old Books only, and a Book added with no Card notes, through `add_card_note`/`add_book`: the preview's counts and the question's wording. |
| AC-6 | P2 | An accept whose `content` carries values still restores. |
| AC-4, AC-6 | P2 | A retry naming the same file through `from-dropbox/..` is `restore_outside_backups`, with nothing changed. |
| AC-9 | P1 | A fault at the second cover copied in is `couldnt_save` through the tool and the route alike. `library.json`, `covers/` and `.staging/` are as before in both. The safety copy (written first) holds the unchanged library. |
| AC-10 | P1 | 6 cases: an extra argument to each tool, a missing `path` to each of the two path tools, and a number `path`. Each is `invalid_fields` naming the field, with nothing changed. |

Scope: selective. These are the secondary branches the checklist named, not new primary paths.

## Files

- `backend/tests/restore_scene.py` (new): the scene, its constants, `FaultIn` and the shared readers and callers, moved out of `test_agent_restore.py` with public names. Adding there took the file past TEA's 1000-line limit (H5), and a test module never imports from another. `FaultIn` also fails `close` and `fsync_dir` now.
- `backend/tests/test_agent_restore.py`: imports the scene instead of defining it, 993 → 827 lines. No leaf changed.
- `backend/tests/test_agent_restore_follow_ups.py` (new): 14 leaves, 19 cases.
- `_bmad-output/test-artifacts/atdd-checklist-13-1-restore-my-library-through-an-agent-with-two-confirmations.md`: the follow-ups resolved.

## Validation

- After the move, before any new leaf: `uv run pytest -q tests/test_agent_restore.py tests/test_restore_backup_edges.py tests/test_dropbox_backup_guide.py` gave 62 passed.
- `uv run pytest -q tests/test_agent_restore_follow_ups.py`: 19 passed. The first run had 2 failures, both from wrong test data (`page` as a number, and `add_book` missing required fields); fixed.
- **Mutation probes:** each edited the source, ran its leaf, and wrote the original back, checked byte for byte. No git command was used. 8 of 8 were killed:
  - safety copy after apply (the lock and order leaf);
  - plain block concatenation in the content hash;
  - the folder-flush failure refused;
  - safety names allowed in `from-dropbox/`;
  - the safety copy stamped 13 s off;
  - `..` allowed;
  - the suffix capped at `-2`;
  - the notes-only wording changed.

  `git status` afterwards showed no source file modified.
- `npm run check` on the final tree: exit 0. That covers ruff, 2262 pytest passed, the coverage gate (domain 100%, intents+store 96.45%), the `api:gen` compare, Prettier, tsc, oxlint, 800 e2e passed and the smoke test.
- Line coverage from that run:
  - `agent/restore_gate.py` 95.8%
  - `agent/tools.py` 98.8%
  - `agent/server.py` 100%
  - `intents/backup_file.py` 89.7%
  - `intents/restore_file.py` 87.9%

## ATDD checklist

10 of the 11 open lines are ticked with their tests. 1 `[ ]` remains (`grep -cF '[ ]'` = 1): the epic gate, adding `agent/`'s restore path and `bookvie_dropbox/` to `scripts/coverage_gate.py` at 90%. That is planned for when `bookvie_dropbox/` exists (Story 13.2 onward), so the gate measures both. Adding it now at 90% would fail on `backup_file.py` (89.7%) and `restore_file.py` (87.9%) if those files were gated alone.

## Risks and assumptions

- The content-hash leaf checks the 4 MiB block rule as AD-22 states it, not Dropbox's published vector. The `deferred-work.md` entry (Dropbox's vector, an exactly-8-MiB file) stays open for 13.2/13.7.
- The notes-only and books-only wordings are pinned as the build wrote them. `deferred-work.md` keeps them open for Oleg to confirm, and a change means editing both leaves.
- AC-10 pins `invalid_fields` for the three restore tools (`parse_view_arguments`). `export_backup` answers the malformed intent instead. That gap is already spine drift (AD-21 One validator).
- The AC-9 cover leaf pins that the safety copy stays after a failed apply. AD-22 orders the copy first and doesn't say to remove it.

## Next

- `bmad-testarch-trace` for Epic 13 at its gate. Story 13.2 next, after this commit.
- The review's uncommitted AC-11 record (`deferred-work.md`, the 13.1 spec, `sprint-status.yaml`) still needs its own commit.
