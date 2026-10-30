---
title: 'Story 1.4: Keep the library in one safe file'
type: 'feature'
created: '2026-10-30'
status: 'done'
baseline_commit: 'c82adfec94390d8bf9396e6c5054cf53ac1b5ac3'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** bookvie has no store. Nothing creates, loads, validates, migrates or atomically writes `library.json`. There is no AD-18 model or `check_invariants()`, and tests have no way to seed a library or fail a write.

**Approach:** Put the AD-18 Pydantic model and `check_invariants()` in `domain/`. Add a `store/` that opens the data folder at startup (sweep, create, load, migrate) and commits through a filesystem seam under the AD-4 lock. Add a `LibraryBuilder` that can also seed an e2e data folder.

**Scope decision (2026-10-30):** The time work (`Clock`, `--fake-today`, the TZ pin, the Playwright clock, DST tests) is split off to `deferred-work.md`. This story doesn't do it.

## Boundaries & Constraints

**Always:** Only `store.serialize()` makes `library.json` bytes (AD-2: UTF-8, camelCase aliases, nulls kept, model key order, 2-space indent, `ensure_ascii=False`, LF, one trailing newline). Every write goes temp file in the data folder (prefix `library.json.tmp`) → write → fsync → rename, all through the seam. A failed commit removes its temp file, leaves `library.json` and the in-memory state unchanged, and raises `CouldntSave` (code `couldnt_save`). Models use `extra="forbid"`. `check_invariants()` runs before every commit, the startup create and a migration included. A startup refusal prints one `bookvie: …` line to stderr naming the path and reason, and exits 1 with no file changed. Tests never touch the real `~/bookvie-data`.

**Never:** No intents, views, routes or error envelope (Stories 1.5, 1.7). No field validation beyond types (Story 1.7). No covers or cover sweep (Story 1.13). No restore (Epic 2). No `local-state.json`. No real migration step: the chain is empty at v1. No Clock or TZ work (deferred).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First start | Empty or missing data folder | `library.json` = the empty v1 document, plus `covers/` and an empty `.staging/` | N/A |
| Leftovers | `library.json.tmp*` files, files in `.staging/` | Deleted at startup | N/A |
| Unwritable | Data folder, or its parent, not writable | Exit 1 naming the path, before the instance lock | N/A |
| Valid v1 | Existing current file | Loaded; bytes unchanged | N/A |
| Newer | `schemaVersion` 2 | Exit 1, "newer than this bookvie supports" | File unchanged |
| Invalid | Not JSON or not UTF-8; not an object; `schemaVersion` missing, not an int, or a bool; unknown key; wrong type; failed invariant | Exit 1 saying why | File unchanged |
| Older | Fixture chain v1→v2, file at v1 | `library.v1.bak.json` = the original bytes, written before the chain runs; result committed once | N/A |
| Step raises | Fixture step raises | Exit 1 | Original and backup byte-identical to the original |
| Fault | Seam fails at write, fsync or rename | `CouldntSave`; original byte-identical; no temp file left | N/A |

</frozen-after-approval>

## Code Map

- `backend/bookvie/cli.py` -- `main` runs `data_dir.mkdir`, `claim_lock`, `bind_socket`, then `create_app`. Its `release` closure takes `app.state.write_lock`, which must become the store's AD-4 lock.
- `backend/bookvie/http/app.py` -- `create_app(static_dir, *, data_dir, port, dev)` sets `app.state.write_lock = threading.Lock()`. Add an optional `store` and keep current callers working.
- `backend/bookvie/{domain,store}/__init__.py` -- empty layer packages. `store` may import only `domain` (enforced by `tests/test_layers.py`), and the top level holds only `cli` and `instance`.
- `backend/tests/conftest.py` -- autouse `_isolated_home`. Add the `library_builder` fixture here.
- `backend/tests/test_cli.py:43-52` -- the `expose_data_dir` fixture wraps `create_app` with a fixed signature. Update it.
- `backend/tests/test_instance.py:402` -- the `_launch` real-process pattern.
- `frontend/e2e/fixtures.ts` -- `startServer`, which checks the data dir with the guard, then spawns `uv run … bookvie`. `server-fixture.spec.ts` shows a per-test server under `runDir`.
- Sources: AD-2, AD-4, AD-13, AD-18, AD-19 in `ARCHITECTURE-SPINE.md`; PRD FR-1 for the Book fields.

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookvie/domain/model.py` -- `Library`, `Book`, `Reading` and `CardNote` as Pydantic models (camelCase alias generator, `populate_by_name`, `extra="forbid"`), with fields in AD-18/AD-19 order. Book fields: `id, createdAt, ownership: "owned", title, subtitle?, authors[], pages ≥1, edition ≥1, language, publisher, type (paperback|hardcover|ebook), isbn?, year?, tags[], coverFile?, spineColorUser?, spineColorFromCover?, spineColorCurated, spineColor, readings[], cardNotes[]`. Reading has the AD-19 fields, with `lastProgressUpdate` nullable, `purposeFulfilled` one of `yes|partly|notYet|null`, and `rating` 1–5 or null. Dates are `date`, timestamps aware `datetime`. Add `Library.empty()`.
- [x] `backend/bookvie/domain/invariants.py` -- `check_invariants(library)` raises `InvariantViolation(rule, message)` for each AD-18 rule. Card note pages: `1 ≤ pageStart ≤ (pageEnd or pageStart) ≤ pages`. Unfinished Reading: `0 ≤ currentPage ≤ pages`.
- [x] `backend/bookvie/store/fs.py` -- the `FileSystem` seam: `create_temp(dir, prefix) → (fd, path)`, `write`, `fsync`, `close`, `replace`, `remove`. `OsFileSystem` is the default.
- [x] `backend/bookvie/store/migrations/__init__.py` -- `CURRENT_VERSION = 1`, `STEPS: dict[int, Callable[[dict], dict]]` (step N→N+1; empty for now), `migrate(doc) → doc`.
- [x] `backend/bookvie/store/store.py`, re-exported from `store/__init__.py` -- `serialize(library) → bytes`, `ensure_writable(data_dir)`, `StartupError`, `CouldntSave`. `Store.open(data_dir, fs=…)` handles the startup rows. `Store.library` holds the committed state, and `Store.lock` is the AD-4 lock. `Store.apply(change)`: under the lock, run `change` on a deep copy, then `check_invariants`, commit, swap, and return the new library.
- [x] `backend/bookvie/cli.py` + `http/app.py` -- run `ensure_writable` before `claim_lock` and `Store.open` after `bind_socket` succeeds. A `StartupError` releases the lock and returns 1. `create_app(store=…)` sets `app.state.store` and `app.state.write_lock = store.lock`.
- [x] `backend/tests/builder.py` -- `LibraryBuilder`: `book(**overrides) → id` with valid defaults (UUIDs, curated color), `reading(...)`, `card_note(...)`, `main`/`up_next`/`side_read(id)`, `build()` (no checks) and `write(data_dir)` (check, then serialize). `python -m tests.builder <data_dir>` reads a partial camelCase JSON library on stdin, fills in the defaults and writes it.
- [x] `backend/tests/conftest.py` + `test_model.py`, `test_invariants.py`, `test_store.py`, `test_migrations.py`, `test_cli.py` -- the `library_builder` fixture and tests for:
  - every matrix row;
  - a failing and a passing case per AD-18 rule;
  - serialize golden bytes and a Hypothesis round trip;
  - chain contiguity from 1 to `CURRENT_VERSION`;
  - concurrent `apply` loses nothing;
  - readers see the old state until the swap;
  - one real-process start on an empty folder.
- [x] `frontend/e2e/fixtures.ts` + `e2e/seed.spec.ts` -- `seedLibrary(dataDir, partial)` checks the path with the guard, then runs `tests.builder` with `cwd` set to the backend. Test: a seeded per-test server starts, and its `library.json` is byte-identical afterwards.
- [x] `README.md` -- the data folder layout and the status line.

**Acceptance Criteria:**
- Given `Store.apply` and a change, when it commits, then the file bytes equal `serialize(new library)`, re-loading them gives an equal model, and `Store.library` changes only after the rename.
- Given two threads each applying one change 50 times, when both finish, then the file and `Store.library` hold all 100 changes.
- Given `npm run check`, when it runs, then it exits 0, the coverage gates hold, and `~/bookvie-data` is unchanged.

### Review Findings

Code review 2026-10-30 (blind, edge, verification-gap, acceptance): 0 decision-needed, 5 patch, 0 defer, 23 rejected.

- [x] [Review][Patch] Unreadable `library.json` and uncreatable `covers/`/`.staging/` refusals have no test; dropping the `except OSError` in `_read` would turn them into tracebacks with every test still passing [backend/tests/test_store.py]
- [x] [Review][Patch] `Library.schema_version` is a plain `int`, so `apply` can commit `schemaVersion` 0 or 2 and the next start refuses the file; fixed with a guard in `apply` (`Literal[1]` would break the fixture-chain migration tests) [backend/bookvie/store/store.py:233]
- [x] [Review][Patch] Store docstrings give the startup order as "sweep, create, load, migrate", but the code reads, validates and migrates first, then sweeps, mkdirs and commits [backend/bookvie/store/store.py:3]
- [x] [Review][Patch] "Nothing changed" is overstated: the `StartupError` docstring and the README say a refusal changes nothing, but a refused upgrade leaves a backup, and a mkdir or startup-create refusal comes after the sweep [backend/bookvie/store/store.py:32]
- [x] [Review][Patch] `_write_atomic` cleanup catches only `OSError`, so a seam `close` raising anything else skips `remove(temp)` and escapes as something other than `CouldntSave` [backend/bookvie/store/store.py:256]

**Rejected:**
- low: the plural "(and N more problems)" branch is untested. It is cosmetic message text.
- low: `apply` returns the live committed object. That is the same documented "readers must not modify" contract as `Store.library`, and no caller mutates it.
- low: a re-entrant `apply` from inside `change` deadlocks. No caller does this, and an `RLock` would allow nested commits.
- low: a dangling-symlink `library.json` is treated as a first start. Symlinked `library.json` is unsupported (build triage #16).
- low (×2, edge and blind): a non-`StartupError` from `Store.open` leaves the socket to garbage collection and prints a traceback. It needs a pathological file (build triage #9). The process exits and the lock is released.
- false: `change` returning a non-`Library` fails confusingly. It fails loudly at `model_dump`, which is correct for a programming error.
- reject (×2, blind and acceptance): the spec status `done` disagrees with the sprint status `review`. The fix edits the spec, and this workflow syncs the status.
- low: `apply` raises pydantic's `ValidationError`. This is documented in `apply`, and the error envelope belongs to Stories 1.5 and 1.7.
- false (×2, blind and acceptance): a new backup overwrites an existing `library.v<N>.bak.json`. This is a deliberate Design Notes decision: the old backup is a copy of a file that was already migrated.
- low: a missing `library.json` next to existing `covers/` starts empty. The matrix defines a missing file as a first start, and a guard would add branches.
- false: no field-vs-state rules for Readings. The spec's Never list says "No field validation beyond types (Story 1.7)".
- false: `test_losing_launch_…` is misleading. It still checks the running-claim path, which its name describes.
- low: fault injection on the migrated startup commit is untested. It uses the same `_commit_at_startup` path as the tested create, and the chain is empty at v1.
- low: the `EMPTY_V1` golden bytes are duplicated in two test files. If they drift, the tests fail loudly.
- false: `seedLibrary` prints "code null" on a timeout. On a timeout `spawnSync` sets `result.error`, which is thrown first.
- reject: the spec has no verification record. The fix edits the spec, and a Verification section exists.
- low: the README status line doesn't name the next story. This is cosmetic.
- false: `_validate` parses twice. JSON-mode validation is deliberate, and the cost is negligible.
- low: a multi-line migration-step exception message breaks "one line". The chain is empty at v1.
- reject: AC3 can't be checked from the diff. That is no evidence of a violation; it is covered by running `npm run check`.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence | Route |
|---|--------|---------|---------|----------|-------|
| 1 | blind, edge | `Store.apply` commits a wrong-typed or out-of-bound value that the next start refuses | high | Reproduced: `apply` with `books[0].pages = "300"` commits, then `Store.open` fails with `books.0.pages: Input should be a valid integer`. The models have no `validate_assignment`, and `apply` only checks invariants. Re-validating before the commit is a direct correction. | patch |
| 2 | verification-gap, blind | Refusing an older file still sweeps leftovers and creates `covers/`/`.staging/` before migrating and validating | low | Confirmed in `Store.open`: `_sweep` and the mkdirs run before `_migrate`. This breaks "exit 1 with no file changed". The fix reorders calls, and the tests only checked `library.json` and the backup. | patch |
| 3 | verification-gap | The losing-bind path is untested; `test_losing_launch_…` returns at `claim.kind == "running"` | medium | Confirmed: that test uses a live PID and a health probe for the same folder, so `main` returns before `bind_socket`. The bind-loss tests never seed or check temp files. The fix only adds tests. | patch |
| 4 | blind | `SCHEMA_VERSION` (domain) and `CURRENT_VERSION` (migrations) can drift | low | Two constants; `domain` can't import `store`. The first migration bump would make `Library.empty()` write an outdated version. The fix is one equality test. | patch |
| 5 | blind, edge | No uniqueness for Book/Reading/Card note IDs or `sideReadBookIds`; Up next can also be a Side read | medium | Real: `check_invariants` uses a set of IDs, and `["a","a"]` counts as two Side reads. AD-18's rule list doesn't name these rules, so the gap is in the architecture, not this change. | defer |
| 6 | edge | macOS `os.fsync` doesn't flush the drive cache (`F_FULLFSYNC`) | maybe-false | Unverified: would be medium if APFS can leave `library.json` torn or empty after a power cut despite write → fsync → rename. Settled by a power-loss test or the APFS ordering guarantees for rename after fsync. | defer |
| 7 | blind | Sprint status `in-progress` vs spec `in-review` | false | The workflow syncs the story to `review` in its present step. | reject |
| 8 | blind | Saves make `library.json` 0600 (via `mkstemp`) | low | Real, but the data is private and lives in the user's home folder. The fix adds mode-copy logic. | reject |
| 9 | blind | A deeply nested file raises `RecursionError`; duplicate keys and NaN are accepted | low | Needs a hand-crafted, pathological file. The startup failure is still loud. | reject |
| 10 | blind | The `.staging` sweep and mkdirs bypass the `FileSystem` seam; a symlinked `.staging` is left alone | low | The seam covers commit writes (AD-2); the sweep is not a commit. A symlinked `.staging` is not a plausible state. | reject |
| 11 | blind | `populate_by_name` is never tested | false | `Library.empty()` builds with snake_case names, and `test_empty_library_is_the_v1_document` covers it. | reject |
| 12 | blind, edge | The builder CLI guard misses subfolders and case variants of `~/bookvie-data`; a non-object stdin gives a traceback | low | `seedLibrary` runs the e2e path guard first, and pytest isolates `HOME`. A traceback still fails loudly. | reject |
| 13 | blind | `create_app(store=None)` is untyped | false | `test_layers.py` forbids `http` from importing `store`, so the annotation can't name `Store`; `None` is the existing no-store path. | reject |
| 14 | blind | Test hygiene: `chmod` tests fail as root, `seed.spec.ts` cleanup isn't in `finally`, a `/tmp` path isn't asserted, `uv run` may sync | low | Nobody runs the suite as root. The temp leftovers are inside the run folder, and `startServer` already uses `uv run`. | reject |
| 15 | edge | No directory fsync after the rename | low | A lost rename leaves the previous valid file, so atomicity holds. Design Notes chose this per AD-2. | reject |
| 16 | edge | A `library.json` symlink is replaced by a regular file on the first commit | low | Not a supported setup; the fix would add symlink handling. | reject |
| 17 | edge | `migrate()` returns a newer document unchanged, and a missing version raises `KeyError` | low | No caller reaches it: `Store._read` refuses those first. Restore (Epic 2) must keep that guard. | reject |
| 18 | edge | `covers` existing as a file is refused only after the sweep | low | Not a plausible state; the fix adds a pre-check. | reject |

## Design Notes

- **Entities live in `domain/`.** `check_invariants()` needs them and `domain` imports nothing, so `store/` reuses them as its schema.
- **Backup before the chain.** The backup is written before the chain runs, so it stays byte-identical when a step raises. An existing backup is overwritten, because it is a copy of a file already migrated.
- **One sweep.** Backup temp files also use the `library.json.tmp` prefix, so the startup sweep removes them too.
- **No directory fsync.** AD-2 names only write, fsync and rename.
- **Store opens after bind.** A launch that loses to a live server never sweeps that server's temp files.

## Verification

**Commands:**
- `npm run check:py` -- expected: all pass; `domain` ≥ 90%, `intents`+`store` ≥ 80%.
- `npm run check` -- expected: exit 0; `ls -la ~/bookvie-data` and its recursive mtimes unchanged.
- `cd backend && uv run bookvie --no-browser --data-dir "$TMPDIR/bv-manual" --port 8799`, then Ctrl-C -- expected: `library.json` is the empty v1 document; `covers/` and `.staging/` exist.
