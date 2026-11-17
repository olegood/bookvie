---
title: 'Close the dev-mode refusal and serving gaps (E11-B1, E11-B2, E11-B3)'
type: 'bugfix'
created: '2026-11-17'
status: 'done'
route: 'oneshot'
baseline_commit: '94da6c76080e653e02d490508d2c787056aa8b87'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-11-retro-2026-11-17.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** this is Epic 11 retro item 76 (E11-B1, E11-B2, E11-B3; sprint item `epic-11-retro-item-76-close-dev-mode-refusal-and-serving-gaps`), due before Epic 12. (B1) `bookvie --dev --data-dir ~/BOOKVIE-DATA` starts serving when `~/bookvie-data` doesn't exist yet, because `os.path.samefile` raises for a missing folder and the `Path.resolve()` fallback is case-sensitive; on a case-insensitive disk that is the real library's folder. (B2) A production server serves the amber icon at `/favicon-dev.svg` through the SPA catch-all. (B3) `index.html` (the SPA fallback) is served without `Cache-Control`, so Chrome may cache it heuristically and a new tab after an update can load an old `index.html` whose hashed assets are gone.

**Approach:** `_refuses_real_library` also refuses when the two resolved paths are equal case-insensitively and the disk they sit on is case-insensitive, even when neither folder exists; tested by a leaf that doesn't create the folder first and a disk-independent leaf that fakes the disk check. The SPA catch-all never serves `favicon-dev.svg` as a top-level file (it falls back to `index.html` like any unknown path). Correct the favicon route's "uncached" comment. Serve `index.html` with `Cache-Control: no-cache`.

</frozen-after-approval>

## Implementation Notes

- `backend/bookvie/cli.py`: `_refuses_real_library` keeps `instance.same_folder` first, then falls back to a casefolded comparison of the resolved paths when `_case_insensitive_disk(real)` says so. The disk is probed on the nearest existing ancestor whose name has a letter (does its swapcase twin exist and is it the same folder?); with no such ancestor it falls back to the platform default (darwin, win32). `instance.same_folder` is unchanged, since the lock and health checks use it too.
- `backend/bookvie/http/app.py`: the catch-all never serves `index.html` or `favicon-dev.svg` as a top-level file (names compared casefolded, for a case-insensitive disk), so they get the SPA fallback. That fallback now sends `Cache-Control: no-cache` (`INDEX_CACHE_CONTROL`). The amber file is excluded in dev mode too, because a dev server serves it at `/favicon.svg` and nothing links `/favicon-dev.svg`; Vite serves `public/` itself. The favicon route's comment no longer says "uncached".
- Tests: `test_app.py` changes one existing assertion (`/favicon.ico` gets the SPA, now `no-cache`) and adds index-cache and amber-icon leaves. `test_dev_mode.py` adds a real-disk leaf that never creates the folder (skipped on a case-sensitive disk) and a faked-disk leaf. With the source reverted, all 13 new or changed assertions failed. The real-disk leaf first hung on the baseline by actually serving, so it now uses the stand-in server and fails fast.
- Surprise: the baseline check started a real `--dev` server inside the test until it was stopped; nothing outside `tmp_path` was touched.
- Review patches: a disk probe that errors now counts as case-insensitive (fails closed); paths are NFC-normalized before casefolding; `favicon.svg` joined `_NEVER_AS_IS`, so `/FAVICON.SVG` can't serve the sage icon from a `--dev` server; the probe has direct tests that run on CI's case-sensitive disk; the icon leaf checks HEAD too; the docstring states the disk condition.

## Review Triage Log

- medium, patched: `_case_insensitive_disk` returned False when `samefile` raised, letting `--dev` through. It now returns True.
- medium, patched: the probe had no test that runs on CI (ubuntu, case-sensitive; the real-disk leaf skips there). Direct probe tests were added: lettered ancestor, fails closed, platform default.
- low, patched: casefold without Unicode normalization missed an NFC/NFD variant of a missing folder. One-line `unicodedata.normalize("NFC", …)`.
- low, patched: the `_refuses_real_library` docstring didn't say a case variant is allowed on a case-sensitive disk.
- low, patched: `/FAVICON.SVG` bypassed the exact-match favicon route, so the catch-all served the sage file as is from a `--dev` server. `FAVICON_FILE` is now in `_NEVER_AS_IS`.
- low, patched: the amber leaf checked GET only; it now loops GET and HEAD. A nested path (`/x/favicon-dev.svg`) resolves to a non-file and already gets the SPA, so no leaf was added for it.
- medium, deferred (spine drift, AD-16): the spine doesn't record the new serving rules. See `deferred-work.md`.
- false: "spec not finished". The review ran mid-step, before Finalize; the Implementation Notes record the decision to fall back to `index.html` rather than 404.
- low, rejected: the refusal text doesn't mention case. Changing it alters the exact message that Story 11.2's AC-2 pins in several tests, for a rare path.
