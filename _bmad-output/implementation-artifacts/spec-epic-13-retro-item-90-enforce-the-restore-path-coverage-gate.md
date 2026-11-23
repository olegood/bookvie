---
title: 'Enforce the restore-path coverage gate'
type: 'chore'
created: '2026-11-23'
status: 'done'
route: 'oneshot'
baseline_commit: 'dde2071ad4610e9ce8e3b6da7e83c689818e1e1c'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-13-retro-2026-11-23.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** this is Epic 13 retro item 90 (E13-S1; sprint item `epic-13-retro-item-90-enforce-the-restore-path-coverage-gate`), due before Epic 14. Epic 13's gate (`epics.md:3000`) asks for coverage ≥ 90% on `agent/`'s restore path, but `backend/scripts/coverage_gate.py` gates only `domain`, `intents+store` and `bookvie_dropbox`, so nothing enforces it, and `intents/restore_file.py` is at 88% (12 of 99 lines missed). The ATDD task `atdd-checklist-13-1-…md:132` is still open.

**Approach:** extend `Gate` with an optional list of module paths, so a gate can match files rather than package segments, without changing the three existing gates' results. Add a `restore path` gate at 90% over three whole modules: `bookvie/agent/restore_gate.py`, `bookvie/intents/restore_file.py` and `bookvie/intents/backup_file.py` (the retro's open question, decided whole: item 95 will split `backup_file.py` later, and the gate's module list follows that split). A gate that matched no file still fails. Add tests of real behavior on `restore_file.py`'s missed lines until it is at least 90%, with a hand mutation check per test, add the gate's self-tests, and tick the ATDD checklist line.

</frozen-after-approval>

## Implementation Notes

- **Measured at the baseline `dde2071`** (`TZ=Europe/Madrid uv run pytest -n auto --cov=bookvie --cov=bookvie_dropbox`, 2473 passed): `agent/restore_gate.py` 95 statements, 4 missed (96%); `intents/restore_file.py` 99, 12 missed (88%: lines 102-104, 120, 125-131, 190); `intents/backup_file.py` 358, 22 missed (94%). The three together: 552 statements, 38 missed, 93.1%.
- **Gate design** (`backend/scripts/coverage_gate.py`): `Gate` gains an optional `modules` tuple of module paths, matched by their trailing path segments (`_module_of`), so `bookvie/agent/restore_gate.py` matches `/repo/bookvie/backend/bookvie/agent/restore_gate.py` and Windows separators, but not `bookvie/agent/my_restore_gate.py`, `other/agent/restore_gate.py` or `restore_gate.py.orig`. A gate with `modules` ignores `packages`. The new `Gate("restore path", (), 90.0, RESTORE_PATH)` sums its three modules like the other gates sum their files. A module group also fails when any one of its modules matched no file (`Result.unmatched`), printing `restore path FAIL: <module> not measured`, so a rename or a move can't drop a module out of the gate unnoticed; "a group that matched no file fails" is the case where all three are unmatched. The three existing gates are unchanged: on the baseline coverage report, the old and new scripts print the same three lines.
- **Module list, decided whole** (the retro's open question): `agent/restore_gate.py`, `intents/restore_file.py` and `intents/backup_file.py`. `backup_file.py` mixes the backup and restore halves (8 concerns) until retro item 95 splits it; `RESTORE_PATH`'s docstring says the list then names the restore half's modules. `agent/tools.py` (99%) is not in the list: it is every tool's module, not the restore path's. The two `intents/` modules also count in `intents+store`, as before.
- **Gate self-tests** (`backend/tests/test_coverage_gate.py`): `HEALTHY` carries the restore path (the `intents/` modules at 0 statements, so the `intents+store` sums the older tests assert are unchanged) and `agent/tools.py` outside it. New: `test_the_restore_path_sums_its_three_modules` (93.00%, 279/300), `test_the_restore_path_just_below_90_fails_and_names_it` (89.00%, the only FAIL line), `test_a_restore_path_module_that_was_not_measured_fails_and_names_it`; the zero-statement, no-file and path-segment tests gained the restore-path line. Mutations: threshold 80 fails 3 tests; matching by file name alone fails the path-segment test. Dropping `unmatched` from `Result.passed` alone survives, because `main()` checks `unmatched` before `passed` (an equivalent mutant through the script).
- **New tests** (`backend/tests/test_agent_restore_follow_ups.py`, section "Retro item 90"), each on `Scene`'s folders, each checked by a hand mutation of `restore_file.py` that it alone fails (each edit reverted; the file's SHA-1 is the baseline's after the runs):
  - `test_a_library_json_that_cant_be_read_is_couldnt_save_and_changes_nothing` [preview, restore]: `library.json` at mode 0, so `library_sha256` can't hash it; both tools answer `couldnt_save`, nothing in the data or backups folder changes and `.staging/` is empty. Mutation: `library_sha256` returning `""` instead of raising.
  - `test_a_backup_swapped_after_the_path_check_is_couldnt_save_without_blocking` [fifo, symlink]: `prepare_restore` on a path that became a FIFO or a symlink to the daily backup after the path check is 503 `couldnt_save`, within 10 s. Mutations: no `S_ISREG` check (the FIFO reads empty and becomes `restore_invalid`), no `O_NOFOLLOW` (the symlink is followed and previewed).
  - `test_an_interrupted_read_closes_its_spool_and_is_not_turned_into_couldnt_save`: a `BaseException` from the spool's write propagates unchanged, the spool is closed, and the next preview runs (the lock was released). Mutations: no `spool.close()`; the interruption turned into `couldnt_save`.
  - `test_preview_restore_is_the_prepared_preview_and_changes_nothing`: the exported intent `preview_restore` (no caller in the app; the tool calls `prepare_restore`) answers the scene's counts, titles, Card notes and backup time, and changes nothing. Mutation: a preview with its titles dropped.
- **After** (the same pytest command, 2482 passed): `restore_file.py` 100% (99, 0 missed), `restore_gate.py` 96% and `backup_file.py` 94% unchanged; gate line `restore path 95.29% (526/552 lines, needs >= 90%) ok`.
- `_bmad-output/test-artifacts/atdd-checklist-13-1-…md:132` ticked with its done pointer; sprint item `status: done`.
- **Proof, 2026-11-23:** `npm run check` on the final code (after the review patches) exited 0: check:py 2482 passed, with `coverage gate: restore path 95.29% (526/552 lines, needs >= 90%) ok` beside the three unchanged gates (domain 100.00%, intents+store 97.24%, bookvie_dropbox 95.43%); check:e2e 803 passed; check:smoke ok.

## Review Triage Log

Blind Hunter (one layer; Edge Case Hunter and Acceptance Auditor are not in this oneshot's review), 12 findings:

- A partly unmatched module group printed "nothing under <file> was measured", package wording for a file: low, real. Patched: a module gate prints `<modules> not measured`; the package wording stays for package gates.
- `Result.passed`'s `unmatched` check is never reached through the script: low, real (the equivalent mutant recorded above). Rejected: `passed` stays true to its name for any caller of `evaluate()`, and `main()` needs its own branch to print the message.
- `Gate` accepts `packages` and `modules` together: low. Rejected: one module gate, whose docstring says `packages` is ignored; the call now passes `modules=RESTORE_PATH` by keyword, so the `()` reads as intended.
- A module listed under two report paths would be counted twice: false for this project. coverage.py keys its report by one measured path per file, and `check:py` measures one source tree; the package gates sum the same way.
- No self-test shows one file counted in both `intents+store` and `restore path`: low, real. Patched: `test_the_restore_path_sums_its_three_modules` asserts `intents+store 89.33% (268/300`.
- Item 95's split is recorded only in `RESTORE_PATH`'s docstring: low, real. Not deferred here (this item's files don't include `deferred-work.md`); reported back so item 95's owner narrows the list when splitting `backup_file.py`. A rename is caught today by the `not measured` failure, but a split that keeps `backup_file.py` for the backup half and adds a new restore module would not add it to the gate by itself.
- Gating `backup_file.py` whole lets its backup half carry the group, with no per-module floor: low. Rejected: the whole-module choice is this item's recorded decision (Intent; the retro's open question), and every gate sums its files.
- Spec still `in-progress` while sprint-status says `done`: false. Non-story work sets the spec `done` at Finalize, here, and AGENTS.md's "only bmad-code-review marks done" is about stories; `npm run check` runs before the commit.
- The unreadable-`library.json` test restored a hard-coded `0o644`: low, real. Patched: it saves and restores the file's own mode.
- The FIFO/symlink test calls the intent, not the tools, and has no POSIX guard: false. The tools' path check already refuses what isn't a regular backup (other tests); this test is the race after that check, which only the intent can stage. bookvie runs on the Mac, and the suite already relies on POSIX calls (`os.geteuid`, file modes).
- The interrupted-read test patches `SpooledTemporaryFile` by name: low. Rejected: it is the one seam that raises inside the `try` without faking the OS read, and the two mutations show it catches the branch.
- `test_coverage_gate.py`'s docstring still said "per-package": low, real. Patched.
