---
title: 'Story 1.4: Keep the library in one safe file'
type: 'feature'
created: '2026-10-30'
status: 'ready-for-dev'
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
- [ ] `backend/bookvie/domain/model.py` -- `Library`, `Book`, `Reading` and `CardNote` as Pydantic models (camelCase alias generator, `populate_by_name`, `extra="forbid"`), with fields in AD-18/AD-19 order. Book fields: `id, createdAt, ownership: "owned", title, subtitle?, authors[], pages ≥1, edition ≥1, language, publisher, type (paperback|hardcover|ebook), isbn?, year?, tags[], coverFile?, spineColorUser?, spineColorFromCover?, spineColorCurated, spineColor, readings[], cardNotes[]`. Reading has the AD-19 fields, with `lastProgressUpdate` nullable, `purposeFulfilled` one of `yes|partly|notYet|null`, and `rating` 1–5 or null. Dates are `date`, timestamps aware `datetime`. Add `Library.empty()`.
- [ ] `backend/bookvie/domain/invariants.py` -- `check_invariants(library)` raises `InvariantViolation(rule, message)` for each AD-18 rule. Card note pages: `1 ≤ pageStart ≤ (pageEnd or pageStart) ≤ pages`. Unfinished Reading: `0 ≤ currentPage ≤ pages`.
- [ ] `backend/bookvie/store/fs.py` -- the `FileSystem` seam: `create_temp(dir, prefix) → (fd, path)`, `write`, `fsync`, `close`, `replace`, `remove`. `OsFileSystem` is the default.
- [ ] `backend/bookvie/store/migrations/__init__.py` -- `CURRENT_VERSION = 1`, `STEPS: dict[int, Callable[[dict], dict]]` (step N→N+1; empty for now), `migrate(doc) → doc`.
- [ ] `backend/bookvie/store/store.py`, re-exported from `store/__init__.py` -- `serialize(library) → bytes`, `ensure_writable(data_dir)`, `StartupError`, `CouldntSave`. `Store.open(data_dir, fs=…)` handles the startup rows. `Store.library` holds the committed state, and `Store.lock` is the AD-4 lock. `Store.apply(change)`: under the lock, run `change` on a deep copy, then `check_invariants`, commit, swap, and return the new library.
- [ ] `backend/bookvie/cli.py` + `http/app.py` -- run `ensure_writable` before `claim_lock` and `Store.open` after `bind_socket` succeeds. A `StartupError` releases the lock and returns 1. `create_app(store=…)` sets `app.state.store` and `app.state.write_lock = store.lock`.
- [ ] `backend/tests/builder.py` -- `LibraryBuilder`: `book(**overrides) → id` with valid defaults (UUIDs, curated color), `reading(...)`, `card_note(...)`, `main`/`up_next`/`side_read(id)`, `build()` (no checks) and `write(data_dir)` (check, then serialize). `python -m tests.builder <data_dir>` reads a partial camelCase JSON library on stdin, fills in the defaults and writes it.
- [ ] `backend/tests/conftest.py` + `test_model.py`, `test_invariants.py`, `test_store.py`, `test_migrations.py`, `test_cli.py` -- the `library_builder` fixture and tests for:
  - every matrix row;
  - a failing and a passing case per AD-18 rule;
  - serialize golden bytes and a Hypothesis round trip;
  - chain contiguity from 1 to `CURRENT_VERSION`;
  - concurrent `apply` loses nothing;
  - readers see the old state until the swap;
  - one real-process start on an empty folder.
- [ ] `frontend/e2e/fixtures.ts` + `e2e/seed.spec.ts` -- `seedLibrary(dataDir, partial)` checks the path with the guard, then runs `tests.builder` with `cwd` set to the backend. Test: a seeded per-test server starts, and its `library.json` is byte-identical afterwards.
- [ ] `README.md` -- the data folder layout and the status line.

**Acceptance Criteria:**
- Given `Store.apply` and a change, when it commits, then the file bytes equal `serialize(new library)`, re-loading them gives an equal model, and `Store.library` changes only after the rename.
- Given two threads each applying one change 50 times, when both finish, then the file and `Store.library` hold all 100 changes.
- Given `npm run check`, when it runs, then it exits 0, the coverage gates hold, and `~/bookvie-data` is unchanged.

## Implementation Notes

## Spec Change Log

## Review Triage Log

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
