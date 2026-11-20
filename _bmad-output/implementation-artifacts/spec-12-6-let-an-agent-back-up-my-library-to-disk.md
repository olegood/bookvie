---
title: 'Story 12.6: Let an agent back up my library to disk'
type: 'feature'
created: '2026-11-20'
status: 'done'
baseline_revision: '06996644d897fe65a94760726fae75589b84c12b'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-12-6-let-an-agent-back-up-my-library-to-disk.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-21, Structural Seed, Capability map), reconciled before the next epic: the Seed's intents/ line still lists backup_file as planned, the agent/ line calls export_backup planned, AD-21 is headed "planned for Epic 12", and the Capability map says FR-28 is planned; with this story every AD-21 tool group is built.
    evidence: |-
      backend/bookvie/intents/backup_file.py; EXPORT_BACKUP in backend/bookvie/agent/tools.py (Spine Check).
    location: >-
      ARCHITECTURE-SPINE.md Structural Seed (intents/, agent/ lines), AD-21 header, Capability map preamble
    severity: low
  - summary: >-
      Spine drift (AD-21 Backup, Structural Seed http/ line), reconciled before the next epic: the spine says only that cli.py resolves the backups folder; create_app also takes a backups_dir keyword, stores app.state.backups_dir, and derives the folder from data_dir with the same rule when none is passed.
    evidence: |-
      backend/bookvie/http/app.py create_app (Spine Check).
    location: >-
      ARCHITECTURE-SPINE.md AD-21 Backup, Structural Seed http/ line
    severity: low
  - summary: >-
      Spine drift (AD-21 Backup, AD-9), reconciled before the next epic: the backup also creates the folder with its parents (failure couldnt_save), fsyncs the folder after the rename (failure only logged), only logs a failed lastExportAt record after the rename, and answers couldnt_save when the app has no backups folder; AD-21 doesn't say so.
    evidence: |-
      backend/bookvie/intents/backup_file.py write_backup, _write_atomic (Spine Check).
    location: >-
      ARCHITECTURE-SPINE.md AD-21 Backup
    severity: low
  - summary: >-
      Spine drift (AD-1), reconciled before the next epic: AD-1 says the one file written outside the data folder is the backup zip, but export_backup also creates the backups folder (and parents) and a .bookvie-backup-<date>.zip.tmp* temp file beside the zip.
    evidence: |-
      backend/bookvie/intents/backup_file.py write_backup, _write_atomic (Spine Check).
    location: >-
      ARCHITECTURE-SPINE.md AD-1 Rule
    severity: low
  - summary: >-
      Spine drift (Deferred "Skills on the agent tools", AD-8), reconciled before the next epic: the spine says Story 12.6 settles the reconnect step and the bookvie/bookvie-dev tool names, and AD-8 says the cataloging-skill notes hold until Story 12.7; the plan (mcp-server-plan-2026-11-19.md §5, D15) moves the skills in 12.7 (bookvie-notes-summary) and 12.8 (bookvie-new-book), and 12.6 is the backup tool.
    evidence: |-
      _bmad-output/planning-artifacts/mcp-server-plan-2026-11-19.md §5 (Spine Check).
    location: >-
      ARCHITECTURE-SPINE.md Deferred section, AD-8
    severity: low
---

<intent-contract>

## Intent

**Problem:** A backup only exists when Oleg clicks Export on the Backup page. An agent can read and change the library, but it can't write a backup to disk.

**Approach:** Add a no-argument tool, `export_backup`. It builds the same zip as `GET /api/export` (`build_export`, under the AD-4 lock) and writes it atomically through the store's filesystem seam as `bookvie-backup-<clock.today()>.zip` in the backups folder. Then it records `lastExportAt` and answers `{path, size, createdAt}`. `cli.py` resolves the backups folder from the data folder and passes it to `create_app(backups_dir=...)`. Playwright's `startServer` gives every server a temporary `HOME`.

## Boundaries & Constraints

**Always:**
- The tool is named `export_backup`, takes `NoArguments`, and is listed last, after `edit_book`. Its description is AC-1's text, character for character: "Write a dated backup of the whole library (library.json and covers, the same file as the Backup page's Export) to the backups folder, and return its path, size and time. A second backup on the same day replaces that day's file. It counts as the library's last export."
- Folder rule (AD-21): the folder follows the data folder, not the mode. A data folder that is the same folder as `~/bookvie-data` gets `~/bookvie-backups`, one that is `~/bookvie-data-dev` gets `~/bookvie-backups-dev`, and any other gets the sibling `<data folder>-backups`. Compare as `instance.same_folder` does (samefile, then resolved paths). Create the folder with its parents when it's missing.
- Order: `build_export` (lock held while building, released after). Then, outside the lock: create the folder, then `fs.create_temp` in that folder, `fs.write` in chunks, `fs.fsync`, `fs.close` and `fs.replace` over that day's file. A failed `fsync_dir` is only logged. Only after the rename is `store.record_export(now)` called, with the same `now` that is returned as `createdAt`; a failure there is logged, and the backup still succeeds.
- A failure in any step before the rename, including creating the folder, is `couldnt_save`. The temp file is removed and `lastExportAt` doesn't move. A read failure is `build_export`'s `couldnt_export`.
- `path` is absolute, and `size` is the file's size in bytes.
- `intents/` imports only `domain` and `store` (`test_layers.py`).

**Never:** no `--backups-dir` flag, no retention or pruning, no upload. No change to `GET /api/export` or its route. No destructive tool. No edits to `epics.md`. No real `~/bookvie-backups*` touched by any test. No tree-wide git state change (AGENTS.md "Story pipeline", Epic 8 retro item 64).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Default | `~/bookvie-data`, `--fake-today 2026-11-19` | `~/bookvie-backups/bookvie-backup-2026-11-19.zip` | — |
| Dev default | `--dev`, `~/bookvie-data-dev` | `~/bookvie-backups-dev/…` | — |
| Other | `--data-dir X` (also `--dev --data-dir X`) | `X-backups/…` | — |
| Same day again | today's file exists | replaced; other files untouched; no temp file | — |
| Read fault | an unreadable cover | `couldnt_export` | no file, `lastExportAt` unchanged |
| Write fault | `create_temp`/`write`/`fsync`/`close`/`replace` fails, or the folder can't be created | `couldnt_save` | temp removed, `lastExportAt` unchanged |
| After the rename | `fsync_dir` or `record_export` fails | success | logged |

</intent-contract>

## Code Map

- `backend/bookvie/intents/export.py:76-108` -- `build_export` (spooled zip, lock, `couldnt_export`), `record_export`, `EXPORT_CHUNK`. Reused as is.
- `backend/bookvie/store/store.py:587-634` -- `Store.record_export(now)` and `_write_atomic`. This is the pattern to follow: on any failure close the fd and remove the temp file, and only log a failed `fsync_dir`.
- `backend/bookvie/store/fs.py` -- the `FileSystem` seam. `FaultyFs` (`tests/helpers.py:158`) replaces `store.fs`.
- `backend/bookvie/intents/contract.py:341-362` -- `couldnt_save(status)`, `couldnt_export()`.
- `backend/bookvie/instance.py:173` -- `same_folder`: the comparison to mirror. `intents` can't import it, so `cli.py` passes the folder in.
- `backend/bookvie/cli.py:28-31,98-100,300-311` -- `DEFAULT_DATA_DIR`, `DEV_DATA_DIR`, the resolved `args.data_dir`, and the `create_app` call.
- `backend/bookvie/http/app.py:193-243` -- `create_app`. Add `backups_dir` and `app.state.backups_dir`.
- `backend/bookvie/agent/tools.py:194-210,632-668` -- `NoArguments`, `parse_arguments`, `GET_APP_INFO` (a no-argument tool), `TOOLS`.
- `backend/bookvie/agent/server.py:72-85` -- `_success` dumps the answer model by alias as a JSON object.
- `backend/tests/test_agent_backup.py` -- the ATDD leaves (5 leaves, 12 cases) and the contract they pin. `tests/conftest.py` `connect_mcp(backups_dir=...)` and `_isolated_home` already exist.
- Exact tool lists to extend: `tests/test_agent_write.py:449,704`, `tests/test_agent_book_write.py:255,508`, `tests/test_agent_cover_url.py:363`, and `tests/test_agent_mount.py:46` (`AGENT_TOOL_NAMES`).
- `frontend/e2e/fixtures.ts:63-122` -- `startServer` and `Server`. `frontend/e2e/agent-backup.ts:9-14` -- the red-phase cast to delete. `frontend/e2e/agent-backup.spec.ts` -- the AC-6 leaf.
- Previous story (12.5): tools are `AgentTool`s in `TOOLS`. Each story extends the exact tool-list tests. `create_app` keyword seams such as `cover_fetcher` are stored on `app.state`.
- Deferred-work intake: none name story 12.6.

## Tasks & Acceptance

**Execution:**
- `backend/bookvie/intents/backup_file.py` -- new. `backups_folder(data_dir, home) -> Path` (the rule), `backup_name(day)`, a `BackupFile` model (`path: str`, `size: int`, `created_at: datetime`, camelCase aliases), and `write_backup(store, clock, backups_dir) -> BackupFile`, which follows the order above. -- AD-21's Backup.
- `backend/bookvie/intents/__init__.py` -- export `write_backup`, `backups_folder` and `BackupFile`.
- `backend/bookvie/cli.py` -- compute `backups_folder(data_dir, Path.home())` and pass `backups_dir=`. -- the folder follows the data folder.
- `backend/bookvie/http/app.py` -- add `backups_dir: Path | None = None`. Without it, derive the folder from `data_dir` with the same rule, or use `None` when there's no `data_dir`. Store the result on `app.state.backups_dir`.
- `backend/bookvie/agent/tools.py` -- `EXPORT_BACKUP` (parse `NoArguments`, then `write_backup(state.store, state.clock, state.backups_dir)`), appended to `TOOLS`. Update the module docstring.
- `backend/tests/test_agent_backup.py` -- remove the skips, and add the green-phase follow-ups that apply: an explicit `--data-dir ~/bookvie-data`, a symlinked spelling, `--dev --data-dir X`, nested parents created, `fsync_dir` and `record_export` failures logged after the rename, a folder that can't be created, the lock held only while building, an argument refused, and a library with no covers.
- The tool-list tests named in the Code Map -- append `export_backup`.
- `frontend/e2e/fixtures.ts` -- `startServer` takes `home?: string`. Without one, it makes a temporary HOME under `root` and removes it in `stop()`. The server is spawned with `HOME` set, and `UV_CACHE_DIR`/`UV_PYTHON_INSTALL_DIR` pinned to the runner's real ones. `Server.home` names the HOME. -- AC-6.
- `frontend/e2e/agent-backup.ts`, `agent-backup.spec.ts` -- delete the cast, call `startServer`, and un-skip the leaf.

**Acceptance Criteria:**
- Given the ATDD leaves without their skips, when pytest runs, then all of them pass, and so does every other backend leaf.
- Given the AC-6 leaf without its skip, when Playwright runs, then it passes, and so does every other e2e spec, each on a server with a temporary HOME.
- Given `npm run check`, when it runs, then it exits 0, and no real `~/bookvie-backups*` folder is created or changed.

### Review Findings

Code review, 2026-11-20 (`bmad-code-review`, new session; diff `a48d8a2..HEAD`, ATDD and build commits; layers: Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor, Spine Check). 32 findings: 3 patch entries (6 findings), 2 defer, 5 spine drift already deferred by the build, 19 rejected.

- [x] [Review][Patch] The single clock read in `write_backup` (the midnight-race fix) has no test: every leaf runs on `FakeClock`, whose `now()` and `today()` never move, so going back to `backup_name(clock.today())` or recording through `export.record_export(store, clock)` (a second `clock.now()`) passes every leaf. Add a leaf with a clock that steps across local midnight and assert the file is named for `createdAt`'s date and "Last export" equals `createdAt` (Verification Gap, low). Fixed: `test_a_backup_across_midnight_reads_the_clock_once_for_its_name_answer_and_last_export`; mutation-checked (naming from `clock.today()` or recording with a second `clock.now()` fails it) [backend/tests/test_agent_backup.py]
- [x] [Review][Patch] `write_backup` builds the whole zip under the AD-4 lock before it checks `backups_dir is None`, so an app with no backups folder holds the lock for nothing, and with an unreadable cover answers `couldnt_export` instead of `couldnt_save`. Check `None` first (Blind Hunter + Edge Case Hunter + Acceptance Auditor, low). Fixed: the check comes before `clock.now()` and `build_export` [backend/bookvie/intents/backup_file.py:85]
- [x] [Review][Patch] `startServer` makes its temporary HOME in `e2eRoot()` (`$TMPDIR/bookvie-e2e/home-*`), outside the run folder; only `stop()` removes it, and `global-teardown.ts` removes only `<run-id>`, so a killed worker or a throw between `mkdtempSync` and `spawn` leaks `home-*` folders across runs. Make it beside the data folder, which is under the run folder for every fixture (Blind Hunter + Edge Case Hunter, low). Fixed: `mkdtempSync` beside the data folder; the `startServer` comment and `frontend/e2e/README.md` say so [frontend/e2e/fixtures.ts:108]
- [x] [Review][Defer] No e2e test observes the HOME a server started without `home` actually ran with: the spec checks the returned `Server.home`, so `HOME: home ?? process.env.HOME` would pass every assertion [frontend/e2e/fixtures.ts:119] — deferred: needs a new observation point (no endpoint reports HOME); pytest's autouse `_isolated_home` and the explicit-`home` leaf pin the rest.
- [x] [Review][Defer] No test fails the temp-file cleanup on top of a failed write step (`FaultyFs` fails one step only), so dropping the `try/except` around `fs.remove(temp)` would turn a double fault into an internal error, not `couldnt_save` [backend/bookvie/intents/backup_file.py:135] — deferred: two simultaneous faults on a rare path; `Store._write_atomic`'s cleanup has the same coverage.

**Rejected:**
- Blind Hunter: two overlapping backups can move "Last export" back by the moments between them — low; `record_export` is lock-free by design (AD-15) as for downloads, the drift is milliseconds on the same day, and the fix adds locking.
- Blind Hunter: the backup is created 0600 by `mkstemp` — low; it's Oleg's own file in his home, readable by him; already listed as a residual risk; the fix adds an `fchmod`.
- Blind Hunter: the residual risks are in the spec, not `deferred-work.md` — low; the build rejected them (rare), not deferred them, so there's nothing to carry.
- Blind Hunter: the returned `path` is resolved for the sibling rule but not for the default folders — low; every spelling is an absolute path to the file, and an agent opens it either way.
- Blind Hunter: the folder rule runs in `cli.py` and again in `create_app`'s default — false as a defect: one function, so they can't diverge; the `create_app` default is already deferred as spine drift.
- Blind Hunter: the backups folder isn't shown in app info or the Backup view — low; a feature beyond AC-1, and the tool's answer carries the path.
- Blind Hunter: the AC-6 snapshot of the real home fails if Oleg's own bookvie writes a backup during an e2e run — low; it needs an agent backup at the same minute as a run, and the fix redesigns the check.
- Blind Hunter: no fault on a later chunk — low; any `fs.write` failure takes the same `except` branch the first-chunk fault pins.
- Blind Hunter: the test module imports `_seed` and `running_bookvie` from `test_agent_write.py` — low; the earlier 12.x modules share helpers the same way; moving them is a refactor.
- Blind Hunter: `"export_backup"` is a literal in the tool-list assertions — low; cosmetic, and 12.7 and 12.8 add no tools.
- Blind Hunter: the AD-8 item is `[false]` in the triage log but deferred as spine drift — the fix edits the spec under review; the `deferred-work.md` entry itself is right.
- Edge Case Hunter: a kill mid-backup leaves a `.tmp` zip in the backups folder — low; rare, and a sweep adds a branch outside the data folder's sweep (as the build's review found).
- Edge Case Hunter: a data folder of `/` gives `/-backups` — low; no library lives at `/`, and the write there fails as `couldnt_save`.
- Edge Case Hunter: `startServer` takes a `home` outside the e2e root — low; the one caller passes a folder under `runDir`, and the fix adds a guard.
- Edge Case Hunter: `backupFolders` throws on a plain file named `bookvie-backups*` — low; no such file in Oleg's home, and the fix adds a branch.
- Edge Case Hunter: `backupFolders` throws when the real home is missing — low; Oleg's machine has a home, and the suite runs nowhere else.
- Edge Case Hunter: a failing `uv cache dir` leaves the server on a cold cache — low; the server itself starts with `uv run`, so a broken uv fails loudly anyway.
- Acceptance Auditor: the spec's Approach says `clock.today()` while the code uses `now.date()` — the fix edits the spec under review; the code is the deliberate midnight-race fix.
- Acceptance Auditor: the folder is created with `Path.mkdir`, not through `store.fs` — false as a violation: the spec requires the seam for the file steps only, and a leaf covers a folder that can't be created.
- Spine Check (5): every drift item (Seed and AD-21 "planned", `create_app`'s `backups_dir`, AD-21 Backup's extra steps, AD-1's folder and temp file, the AD-8/Deferred skills note) is already in `deferred-work.md` as "spine drift" from the build's review — no new entry.

**Full check after the patches** (2026-11-20, this review session, after the last patch): `npm run check` exit 0 — pytest 2130 passed, unit 388 passed, e2e 800 passed, smoke ok. No `~/bookvie-backups*` folder exists in the real home afterwards.

## Spec Change Log

## Review Triage Log

### 2026-11-20 — Review pass
- verdicts: 28 findings — high 0, medium 1, low 21, false 6, maybe-false 0
- findings:
  - `[low]` `[patch]` (blind) `write_backup` reads `clock.now()` then `clock.today()`; SystemClock's `today()` reads again, so a backup across local midnight is named for the next day while `createdAt` carries the previous one — fixed: the name comes from `now.date()`.
  - `[low]` `[patch]` (blind) the `backups_dir is None` branch has no leaf — added a leaf: `couldnt_save`, nothing written, "Last export" unmoved.
  - `[low]` `[reject]` (blind) a failed backup can leave a new, empty backups folder — an empty folder is harmless and rarely met; removing it after a failure adds a cleanup branch.
  - `[false]` `[reject]` (blind) a symlinked non-default data folder gets its backups beside the link's target — `cli.parse_args` resolves `--data-dir` before anything uses it, so the resolved folder *is* bookvie's data folder (health and app-info report it), and its sibling is `<data folder>-backups`.
  - `[low]` `[reject]` (blind) `_same_folder` copies `instance.same_folder` — the layer rule forbids `intents` importing `instance`; a shared helper is a refactor across layers, not a direct correction.
  - `[low]` `[reject]` (blind) `+ ["export_backup"]` is a literal in five tool-list assertions, not a shared constant — cosmetic; 12.7 and 12.8 add no tools (plan §5), so no next story extends it.
  - `[low]` `[patch]` (blind) `test_agent_cover_url.py` comment says "No new tool" and then names one — reworded.
  - `[low]` `[reject]` (blind) `write_backup` repeats the record-and-log step instead of reusing `record_export`, with different log wording — `record_export` reads the clock itself, and the backup must record the same `now` it answers; the wording names what failed.
  - `[low]` `[reject]` (blind) `README.md` doesn't mention the backups folder — "No README updates from stories" (Oleg, 2026-11-14); line 60's "only reader and writer of `~/bookvie-data/`" stays true, since the backups are outside it.
  - `[low]` `[patch]` (blind) `frontend/e2e/README.md` doesn't describe the servers' temporary HOME — added a sentence.
  - `[low]` `[reject]` (blind) `realUvDirs()` silently drops a `uv cache dir`/`uv python dir` that fails — the server is itself started with `uv run`, so a uv that can't answer those fails the start loudly anyway; a warning adds a branch for a case not met.
  - `[low]` `[patch]` (blind) the e2e cleanup check uses `servers.slice(1)`, which depends on array order — the spec now tracks the servers started without a `home`.
  - `[low]` `[patch]` (edge) midnight race between the name and `createdAt` — same defect and fix as the first row.
  - `[low]` `[reject]` (edge) a process killed between `create_temp` and `replace` leaves a temp zip in the backups folder forever — needs a kill mid-backup; a sweep adds a branch outside the data folder's startup sweep; rare in everyday use.
  - `[false]` `[reject]` (edge) a symlinked non-default folder's backups go beside the target — as the blind row above: the resolved folder is bookvie's data folder.
  - `[low]` `[reject]` (edge) a data folder of `/` or the home folder itself gives `/-backups` or a sibling of home — nobody keeps a library at `/` or in `~` itself; a write there that fails is `couldnt_save`; the guard adds a branch.
  - `[low]` `[reject]` (edge) `uv cache dir` failing leaves the server on a cold cache — same as the blind `realUvDirs` row.
  - `[low]` `[reject]` (edge) the temporary HOME hides `~/.config/uv/uv.toml` — pytest's `_isolated_home` makes the same move and the suite passes; the project's uv settings live in `backend/pyproject.toml`.
  - `[low]` `[reject]` (edge) `startServer` accepts a `home` outside the e2e root — only test code passes `home`, and the one caller passes a folder under `runDir`; the guard adds a check for a caller that doesn't exist.
  - `[medium]` `[patch]` (verification-gap) no test writes a backup larger than one `EXPORT_CHUNK`; a `while`→`if` mutation (first 64 KiB only) passed all 27 tests — added a leaf with a cover over 64 KiB that restores and matches `/api/export`; the mutation now fails it.
  - `[false]` `[reject]` (intent) an explicit `--data-dir ~/bookvie-data` could read as "any other `--data-dir`" (sibling `bookvie-data-backups`) — AD-21 and epic-12-context say the folder follows the data folder, not the mode or flags: "when the data folder is the default `~/bookvie-data`".
  - `[false]` `[reject]` (intent) a failed folder flush or a failed `lastExportAt` record after the rename still answers success — AD-2's commit and AD-15's `record_export` treat post-rename failures the same way (logged, never rolled back); the file is in place and restorable.
  - `[false]` `[reject]` (intent) AC-6's pytest half is inferred from isolation, not checked against the real home — `conftest._isolated_home` is autouse and asserts `Path("~").expanduser() == home` in every test, which is AC-6's pytest wording ("every pytest test has HOME set to a temporary folder").
  - `[low]` `[defer]` (spine) Seed, AD-21 header and the Capability map still call `backup_file`/`export_backup` planned — spine drift, deferred.
  - `[low]` `[defer]` (spine) `create_app`'s `backups_dir` keyword and derived default aren't in the spine — spine drift, deferred.
  - `[low]` `[defer]` (spine) AD-21 Backup doesn't list folder creation, the logged `fsync_dir` and `record_export` failures, or `couldnt_save` with no folder — spine drift, deferred.
  - `[low]` `[defer]` (spine) AD-1's "one file outside the data folder" doesn't name the folder and temp file — spine drift, deferred.
  - `[false]` `[defer]` (spine) the spine's Deferred bullet and AD-8 assign the skill moves to 12.6/12.7, not 12.7/12.8 — the code is right and the spine text is stale (not caused by this diff's code); deferred as spine drift for the reconciliation.

## Design Notes

The rule's function lives in `intents/backup_file`, with the home folder passed in. That way `cli.py` and `create_app`'s default share one rule, and `intents` never reads `Path.home()` or imports `instance`. The write uses its own loop on `store.fs`, not `Store._write_atomic`, so it can write the spooled zip in `EXPORT_CHUNK` pieces without loading it into memory. It keeps `_write_atomic`'s cleanup rules. The temp prefix is `.bookvie-backup-<date>.zip.tmp`.

## Verification

**Commands:**
- `cd backend && uv run pytest -q tests/test_agent_backup.py tests/test_agent_mount.py tests/test_agent_write.py tests/test_agent_book_write.py tests/test_agent_cover_url.py tests/test_layers.py` -- expected: all pass
- `cd frontend && npx playwright test e2e/agent-backup.spec.ts` -- expected: passes
- `npm run check` (repo root) -- expected: exit 0

## Auto Run Result

Status: in-review

**Summary.** A new agent tool, `export_backup`, is listed last and takes no arguments. It builds the same zip as `GET /api/export` under the AD-4 lock. Then, outside the lock, it writes `bookvie-backup-<date>.zip` atomically into the backups folder through the store's filesystem seam, records "Last export" with the same time, and answers `{path, size, createdAt}`. The folder follows the data folder, not the mode: `~/bookvie-backups`, `~/bookvie-backups-dev`, or `<data folder>-backups`. `cli.py` resolves it and passes it to `create_app(backups_dir=...)`. Every Playwright server now runs with a temporary `HOME`.

**Files changed:**
- `backend/bookvie/intents/backup_file.py` (new): the folder rule `backups_folder`, `backup_name`, the `BackupFile` answer, and `write_backup` with its chunked atomic write.
- `backend/bookvie/intents/__init__.py`: exports `BackupFile`, `backups_folder` and `write_backup`.
- `backend/bookvie/cli.py`: passes `backups_dir=backups_folder(data_dir, Path.home())`.
- `backend/bookvie/http/app.py`: adds the `backups_dir` keyword, derived from `data_dir` when not passed, stored on `app.state.backups_dir`.
- `backend/bookvie/agent/tools.py`: the `EXPORT_BACKUP` tool, appended to `TOOLS`, and the docstring.
- `backend/tests/test_agent_backup.py`: the ATDD leaves un-skipped, plus follow-ups:
  - the folder rule: an explicit, a symlinked and a `..` spelling of the default folder, `--dev` with a scratch folder, nested parents, the derived default, and an app with no folder;
  - failures: logged `fsync_dir` and `record_export` failures after the rename, and a folder that can't be created;
  - the order of work: the lock held only while the zip is built, and an argument refused;
  - round trips: a library with no covers, and a backup larger than one chunk.
- `backend/tests/test_agent_write.py`, `test_agent_book_write.py`, `test_agent_cover_url.py`, `test_agent_mount.py`: `export_backup` added to the exact tool lists.
- `frontend/e2e/fixtures.ts`: `startServer` takes a `home` option (or makes a temporary one that `stop()` removes), pins uv's cache and Python folders, and returns `Server.home`.
- `frontend/e2e/agent-backup.ts`, `agent-backup.spec.ts`: the red-phase cast is removed and the AC-6 leaf un-skipped, with a dev-server check and a cleanup check added.
- `frontend/e2e/README.md`: a bullet on the temporary `HOME`.

**Review findings:** 28 in total.
- **Patches applied (7 rows, 6 fixes):**
  - The file is named from `now.date()`, the same clock read as `createdAt` (the midnight race; Blind Hunter and Edge Case Hunter, low).
  - A leaf writes a backup larger than one chunk; the `while`→`if` mutation now fails it (Verification Gap, medium).
  - A leaf covers an app with no backups folder (low).
  - The `test_agent_cover_url.py` comment is reworded (low).
  - The e2e cleanup check tracks the servers started without a `home` (low).
  - `frontend/e2e/README.md` describes the temporary `HOME` (low).
- **Deferred (5):** spine drift for AD-21, AD-1, AD-9 and AD-8. They are written to `deferred-work.md` and to this spec's `deferred` list.
- **Rejected (16):**
  - 11 low findings: a leftover empty folder after a failure; `_same_folder` copying `instance.same_folder`; the tool name repeated as a literal in the test lists; wording that duplicates `record_export`'s; the main README (the "No README updates from stories" rule); the silent `realUvDirs` fallback, raised twice; an orphaned temp file after a kill; a data folder of `/` or `~` itself; the user's uv config hidden by the temporary `HOME`; a `home` outside the e2e root.
  - 5 false findings: the symlinked folder, raised twice (`cli` resolves the data folder first); an explicit `--data-dir ~/bookvie-data`; failures after the rename answering success (the AD-2 and AD-15 pattern); AC-6's pytest half (`_isolated_home` asserts it in every test).
  - Each reason is in the Review Triage Log.

**Follow-up review recommendation:** false. Patched entries at their verdict: 1 medium and 5 low, with no high and fewer than two mediums.

**Verification:**
- My own runs:
  - Targeted pytest, 6 files: 431 passed.
  - `npx playwright test e2e/agent-backup.spec.ts`: passed.
  - `npm run check` before the patches: exit 0 (2127 pytest, 800 e2e, smoke ok).
  - `npm run check` after the patches: exit 0 (2129 pytest passed, 800 e2e passed, smoke ok).
  - No `~/bookvie-backups*` folder exists in the real home after either run.
- The implementation subagent's runs: the mutation check, where the large-backup leaf fails with `if` in place of `while`.
- Matrix audit: every row has a leaf that ran and passed.

**Residual risks:**
- No test makes a real backup on a real machine with a large library. The first real one is Oleg's.
- A backup interrupted by a kill leaves a `.bookvie-backup-*.tmp*` file in the backups folder, and nothing sweeps it (rejected as rare).
- The backup file is created with `mkstemp`'s mode 0600, so only the owner can read it.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
