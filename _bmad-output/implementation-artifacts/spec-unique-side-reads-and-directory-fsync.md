---
title: 'Unique Side reads and directory fsync after a commit'
type: 'bugfix'
created: '2026-11-01'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** (1) `check_invariants()` in `backend/bookvie/domain/invariants.py` accepts `sideReadBookIds: ["a", "a"]`, which counts as two Side reads, and AD-18 doesn't name the rule. Epic 2's restore relies on `check_invariants()` to refuse damaged or hostile files. (2) `Store._write_atomic` in `backend/bookvie/store/store.py` does write → fsync → close → rename and never fsyncs the folder. After a power cut the rename may be lost, and a commit Bookvie already reported as saved comes back as the old file.

**Approach:** (1) A new AD-18 rule `unique_side_reads`: no Book ID appears twice in `sideReadBookIds`. The deferred item's second rule ("Up next not also a Side read") is **not** added. `epics.md` (Epic 4: "a Side read stays in On the side as well", "a Side read that is also Up next…") and EXPERIENCE.md ("Any of the above, plus Side read") allow it on purpose. (2) The `FileSystem` protocol gets `fsync_dir(directory)`. `_write_atomic` calls it on the target's folder after `replace`, so every atomic write gets it: the library, the backups and the covers. `OsFileSystem.fsync_dir` opens the folder read-only, flushes it with the same `F_FULLFSYNC`→`os.fsync` logic as `fsync`, and closes it. A filesystem that can't fsync a folder (`EINVAL`/`ENOTSUP`/`EBADF` from open or fsync) is skipped silently. **Decision (human, 2026-11-01, after review):** any other error is logged and the commit still counts as saved, because the rename is the commit. Rolling back would delete covers the new `library.json` references, and memory would no longer match the disk. AD-2 and AD-18 in ARCHITECTURE-SPINE.md are updated to match. In `deferred-work.md` the sideReadBookIds item, the directory-fsync item and the Story 1.10 "168px spine height on CI" item get `resolved:` lines (the 168px item because CI on `ubuntu-latest` has been green since Story 1.10, including run 41293213733 on 2026-11-01). The "Up next not a Side read" part is recorded as rejected, with the reason.

</frozen-after-approval>

## Implementation Notes

- Tests: `test_invariants.py` gets a failing case (same ID twice) and a passing case (distinct IDs) for `unique_side_reads`. In `test_store.py`, a recording fs checks that `fsync_dir(data_dir)` runs after `replace`. `FaultyFs` gains an `fsync_dir` fault; with it a commit (with a cover) still lands, memory and disk match, and the failure is logged. `OsFileSystem.fsync_dir` tests cover a real folder, an unsupported errno being skipped, and `EIO` re-raising from `fsync_dir` itself (the store catches it).
- The `unique_side_reads` check runs before `side_reads_max`, so `["a","a","a","a"]` reports the repeat rather than the count.
- The folder flush runs outside `_write_atomic`'s cleanup `try`, after the rename. Before review it sat inside, where a failure removed a temp file that no longer existed and `apply` rolled back a commit that had already happened.
- Files changed: `backend/bookvie/domain/invariants.py`, `backend/bookvie/store/fs.py`, `backend/bookvie/store/store.py`, `backend/tests/test_invariants.py`, `backend/tests/test_store.py`, ARCHITECTURE-SPINE.md (AD-2, AD-18), `deferred-work.md`.

## Review Triage Log

- high, patch (asked the human): a `fsync_dir` failure after the rename raised `CouldntSave`. `apply` then deleted the just-written covers that the new `library.json` references, and memory kept the old library while the disk had the new one. Now logged, and the commit stands. The same root cause covers the related findings: AD-2 "original untouched" was contradicted, the docstrings were wrong, the cleanup removed a temp file that no longer existed, and the test asserted the divergence.
- low, patch: `EACCES` dropped from the skip set. A permissions error isn't "filesystem can't flush folders" (and the store already reads the folder). `EBADF` stays, because some platforms return it from fsync on a read-only directory fd.
- low, rejected: no warning when the flush is skipped on an unsupported filesystem. That would print on every commit on such filesystems, and those filesystems are unsupported anyway.
- low, rejected: `fsync_dir` uses `os.open`/`os.close` directly. It is part of the seam (`OsFileSystem`), as `create_temp` uses `tempfile`. A `close` raising in `finally` on a directory fd is negligible.
- medium, defer: new folders (`data_dir`, `covers/`, `.staging/`) are never fsynced into their parent. This existed before the change.
- low, rejected: missing tests (distinct-ID pass case, cover/backup paths calling `fsync_dir`, precedence against `main_not_side_read`/`pointer_exists`). `test_three_side_reads_pass` is the distinct-ID case, all writes share `_write_atomic`, and the post-rename test now writes a cover.
- low, rejected: `test_fsync_dir_flushes_a_real_folder` asserts nothing. It is a smoke test that the real syscalls don't raise on a real folder.
- false: spec still `in-progress`/untracked. The status is set at Finalize and the spec is committed with the change.
- maybe-false, rejected (low): whether `F_FULLFSYNC` on a directory fd means anything on APFS. If it is refused with a not-supported errno, the code falls back to `os.fsync`, so the worst case equals plain fsync.
