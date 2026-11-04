---
title: 'Harden restore archive names (Epic 2 retro action 2)'
type: 'bugfix'
created: '2026-11-04'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 2 retro findings F-R1 and F-R2 (`_bmad-output/implementation-artifacts/epic-2-retro-2026-11-04.md`, sprint-status action `epic-2-retro-item-14-harden-restore-names-refuse-covers-colli`). F-R1: `backend/bookvie/store/restore.py` `_check_entries` compares names only with `casefold()`. On macOS (APFS ignores Unicode normalization) `covers/é.jpg` in NFC and in NFD form pass the check and unpack into one staged file, so one Book silently gets the other's cover; the check against existing `covers/` (`Store.cover_names`, and `os.path.lexists` in `Store.replace_all`) has the same blind spot. F-R2: in `_copy_entry`, an `OSError` from `open()` that the entry name causes (ENAMETOOLONG for `covers/<300 chars>.jpg`, EILSEQ, EINVAL) becomes `CouldntSave`, which the restore intent turns into 503 "Couldn't save"; a bad file should be a 422 refusal.

**Approach:** Compare names under `unicodedata.normalize("NFC", ...)` plus `casefold()`, both between archive entries and against existing `covers/`, and refuse a collision as 422 `restore_unsafe`. Refuse name-caused errors in the safety pass before unpacking (a cover-name byte-length cap under the filesystem's 255-byte limit), or map those errnos to `restore_unsafe`; real disk faults stay 503 `couldnt_save`. Add tests for both in `backend/tests/test_restore_refusals.py` next to the existing case-collision tests. Update `ARCHITECTURE-SPINE.md` AD-14's duplicate-name rule ("NFC + casefold") and the name-length rule in the same change, plus the matching bullet in `epic-2-context.md` (spine drift is not deferred). Verify with `npm run check:py` after checking machine load (`docs/ci.md`). Mark the sprint-status action item done with `.claude/skills/bmad-retrospective/scripts/sprint_status.py update --set-action-status`, and commit on master. Not a story: no story_key.

</frozen-after-approval>

## Implementation Notes

- Name key: `NFC(casefold(NFC(name)))` (one private helper, `_name_key`), used for the archive-wide `seen` map and for the existing-`covers/` map. Exact-equal names against `covers/` stay allowed (AD-12 keeps the file). Because every archive cover that could reach `replace_all` has already passed this check under the lock, `replace_all`'s `lexists` only ever sees an exact name or a non-colliding one, so it is left as is (docstring of `_check_entries` says why).
- Length rule: `MAX_COVER_NAME_BYTES = 200` (UTF-8 bytes of the name in `covers/`). It leaves room for `replace_all`'s temp `<name>.tmp` + 8 `mkstemp` characters under the 255-byte limit; minted names are 77 bytes.
- Backstop: `_copy_entry` maps ENAMETOOLONG, EILSEQ and EINVAL from `open()` to `ArchiveUnsafe`; every other `OSError` (EACCES, ENOSPC, EIO, EROFS…) stays `CouldntSave`.
- Files: `backend/bookvie/store/restore.py` (`name_key`, `MAX_COVER_NAME_BYTES`, `_NAME_ERRNOS`, `_check_entries`, `_copy_entry`), `backend/bookvie/store/store.py` (`cover_names` docstring), `backend/tests/test_restore_refusals.py` (4 hostile cases, an at-the-cap allowed case, a Unicode-form collision with `covers/`, a real ENAMETOOLONG with the cap raised), AD-14 in `ARCHITECTURE-SPINE.md` (name rule and refusal precedence), `epic-2-context.md`.
- Against `covers/`, a cover is refused only when its exact name isn't there and another name with its key is. Two existing names sharing a key (possible on Linux) therefore don't refuse an exact match of either. Review found this (the first draft refused it).
- Log messages print names with `ascii()`, so an NFC/NFD pair reads as two different names.
- The new tests failed against the old `restore.py` (3 failed) and pass now. Load was about 18 on 14 cores; `check:py` is pytest only, so it ran unchanged under `caffeinate -i`: 867 passed, both coverage gates ok. After the review fixes: 874 passed, gates ok.

## Review Triage Log

Blind Hunter, one pass (14 findings):

- low, patched: the new constants split `OLD_COVER` from its docstring. They now sit below it, with a comment.
- low, patched: `!r` prints NFC and NFD `é` identically, so the log messages now use `ascii()`.
- low, patched: `deferred-work.md` l.207 still called Unicode aliases open; it now says they are closed.
- false: sprint-status and spec status were "not done". They are done after the review, as the workflow orders.
- low, patched: the notes said `_name_key` but the code had a public `name_key`. It is private now.
- medium, patched: `_NAME_ERRNOS` was only tested through a real ENAMETOOLONG. A parametrized test now fakes `open()` on a staged cover: ENAMETOOLONG, EILSEQ and EINVAL give 422; EACCES, ENOSPC and EIO give 503.
- low, patched: the ENAMETOOLONG test didn't record writes outside `.staging/`. It does now.
- medium, patched: there was no test for two existing names sharing a key. Writing it showed the list logic refused an exact match. The rule is now "refuse only when the exact name is absent and the key is present", and it is tested both ways.
- low, patched: full casefold over-refuses pairs like `ß`/`ss`. This is kept on the safe side; the message now says "could share one file", and AD-14 and the docstring record it.
- low, patched: the `wide_name` case depended on how the source file was saved. It now uses `\u00e9` escapes and asserts that the byte length is over the cap.
- low, patched: the confusing `surrogatepass` comment. Plain `encode("utf-8")` is used, with a comment explaining why it can't fail.
- low, patched: the module docstring's line about every staging failure being `CouldntSave` was stale. It now says "any other failure".
- low, patched: the test-module docstring didn't list `MAX_COVER_NAME_BYTES`. It does now.
- low, patched: the spine and context didn't say what the cap measures. They now say it is the name inside `covers/`, which leaves room for the temp name, and that minted names are 77 bytes.
