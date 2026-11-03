---
title: 'Fsync the parent folder after creating data folders'
type: 'bugfix'
created: '2026-11-03'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `ensure_writable` (`store.py:91`) and `Store.open` (`store.py:164`) create the data folder, `covers/` and `.staging/` without flushing the parent folder. A rename inside `covers/` can be durable while `covers/` itself is not. A power cut can then lose a cover that `library.json` references, or the whole fresh data folder, which matters for Epic 2's restore. This is Epic 1 retro action item 3, part b (F-S8, `deferred-work.md` 2026-11-01 entry).

**Approach:** Whenever startup creates a folder, fsync its parent through `FileSystem.fsync_dir` before the first commit. For the data folder that means every ancestor `mkdir(parents=True)` created. For `covers/` and `.staging/` it means the data folder. A real I/O failure is a `StartupError`, like a failed `mkdir`. Folders that already exist cost nothing extra.

</frozen-after-approval>

## Implementation Notes

- **Flush on every start, not only on create.** First built as "flush when `lexists` says the folder is new". Review showed that a refused or killed start leaves the folder behind, and the next start then skips the flush forever; folders from earlier builds are never flushed either. `ensure_writable` now always flushes the data folder's parent (plus the parent of any ancestor it creates), and `Store.open` always flushes the data folder after `mkdir` of `covers/` and `.staging/`. That is two folder fsyncs per start.
- **Unreadable parent:** a `-wx` parent can't be opened to flush. `PermissionError` is logged and startup continues, so existing installs in drop folders keep working. Other `OSError`s refuse startup with a `StartupError` naming the folder being made durable.
- **Paths:** `ensure_writable` normalizes with `os.path.abspath`, so `x/../data` doesn't count `x/..` as a created ancestor.
- **Tests:** the shared `_client` in `test_add_book.py` now opens the store normally and swaps in the fault-injecting fs afterwards. The six "standard intent guarantees" tests meant to fault the intent's commit, not startup. New tests in `test_store.py` cover flush order, retry after a failed flush, `..`, and the unreadable parent.
- **Files:** `backend/bookvie/store/store.py`, `backend/tests/test_store.py`, `backend/tests/test_add_book.py`, AD-2 in `ARCHITECTURE-SPINE.md`, `epic-1-context.md`, `deferred-work.md`, `sprint-status.yaml` (retro item 3 → done).
- **Verification:** `npm run check` exit 0 (676 pytest, intents+store 98.71%, 162 e2e, smoke ok).

## Review Triage Log

Blind Hunter (10) and a crash-window reviewer added per retro PL-5 (4 findings + checks):

- A failed or interrupted flush is never retried; earlier installs are never flushed (both reviewers) — **medium**, patched: flush on every start, with a retry test.
- Two-process race on first launch skips the flush (crash) — **low**, fixed by the same patch.
- A `-wx` parent makes the flush fail with EACCES and refuses startup (crash, reproduced) — **medium** (worse after the every-start patch), patched: log and continue, with a test.
- `covers/` recreated under an existing library, flushed only after the first commit (crash) — **low**, fixed by the every-start flush in `Store.open`.
- The spec is unfinished — **false**: finalized here.
- Sprint tracker not updated — **low**, patched: item 3 → done.
- The flush error names the parent, not the created folder — **low**, patched: names the folder being made durable and the parent that failed.
- CLI seam not wired or tested end to end — **low**, rejected: production uses the default fs on both calls, and `cli.main` already turns any `StartupError` into exit 1 with the message.
- The fresh-open ordering test is weak — **low**, patched: asserts the full event list.
- The migration path and `.staging/` alone are untested — **low**, rejected: one unconditional flush now covers both; nothing branches on them.
- `..` in relative paths — **low**, patched (`abspath`) with a test; `cli.py` already resolves the path.
- The `events.clear()` comment is wrong — **low**, patched.

