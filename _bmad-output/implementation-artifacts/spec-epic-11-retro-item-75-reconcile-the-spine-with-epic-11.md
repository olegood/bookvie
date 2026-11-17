---
title: 'Reconcile the architecture spine with as-built Epic 11'
type: 'chore'
created: '2026-11-17'
status: 'done'
route: 'oneshot'
baseline_commit: '867a5c3'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-11-retro-2026-11-17.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 11's stories deferred fifteen "spine drift" entries to `deferred-work.md` (`:1046`, `:1049`, `:1055`, `:1061`, `:1064`, `:1067`, `:1070`, `:1073`, `:1085`, `:1088`, `:1094`, `:1103`, `:1106`, `:1109`, `:1112`), and retro item 76 added a sixteenth (AD-16 serving rules). The spine still marks AD-6 App info, AD-7, AD-8 One version, AD-16 Binding, Real library refused and Favicon, the Seed's `app_info` and `public/` favicons, and the map preamble as "Epic 11, planned" (Epic 11 retro item 75; sprint item `epic-11-retro-item-75-reconcile-the-spine-with-epic-11`).

**Approach:**
- Edit `ARCHITECTURE-SPINE.md` so those sections state what the code does, citing stories 11.1 to 11.4 and retro item 76. AD-16's refusal records the file-identity comparison and item 76's case-insensitive fallback; AD-7 records the notice's once-per-version `status` announcement and its yield to a pending message. The Seed names `views/app_info`, the `public/` favicons, `lib/aboutThisCopy`, `lib/updateNotice` and `components/UpdateNotice`; the Testing row and Seed "Build and install" gain the smoke test's favicon checks; the map preamble drops the Epic 11 exception, and the FR-27 row names the new modules.
- Close each of the sixteen entries with a `resolved:` line.
- No code changes. Oleg reviews the spine diff before it's final; sprint item 75 is marked `done` only after that.

</frozen-after-approval>

## Implementation Notes

- **Count:** sixteen open drift entries from Epic 11, each closed with a `resolved:` line: the fifteen the Intent lists (line numbers as of `baseline_commit` 867a5c3; the inserted `resolved:` lines move them) and item 76's AD-16 serving entry. A case-insensitive scan finds no other Epic 11 "spine drift" entry without one.
- **Spine** (`ARCHITECTURE-SPINE.md`; `updated` was already 2026-11-17). Each statement was checked against the code:
  - **AD-6 App info** cites story 11.2 and names `app.state.app_info` and the CLI passing `version`/`commit` (`views/app_info.py`, `http/api.py`, `cli.py`).
  - **AD-7** cites stories 11.2 to 11.4 and names its readers (`AppShell`, `lib/page`, `lib/aboutThisCopy`, `components/UpdateNotice`, `lib/updateNotice`). The announcement fires when the shown version changes, unless `lib/announce`'s `isAnnouncing()` holds a waiting message; then it is not retried (`UpdateNotice.tsx`, `updateNotice.ts` `shouldAnnounce`).
  - **AD-8** cites story 11.4 and names `__BOOKVIE_VERSION__`, `src/globals.d.ts` and `frontend/scripts/version.test.mjs` in `check:api`.
  - **AD-16:**
    - Binding cites story 11.2.
    - Real library refused gives `instance.same_folder`'s two steps (file identity, then equal resolved paths), then item 76's NFC/casefold fallback, probed on the real library's ancestors and failing closed.
    - SPA routes gives `index.html`'s `no-cache` and the files never served as is, matched by name.
    - Favicon names the `GET`/`HEAD` route.
  - **Testing row and Build and install:** the smoke test's installed `favicon-dev.svg` check, its client route, and its `/favicon.svg` check (`scripts/smoke.mjs`).
  - **Seed:**
    - `views/` lists `app_info`; `public/` drops "(planned)".
    - New `frontend/scripts/` line.
    - `instance.py` names `same_folder`.
    - `lib/` lists `aboutThisCopy` and `updateNotice`; `components/` lists `UpdateNotice`.
  - **Map:** the preamble reads "Every row below is built."; the FR-26 row names `instance.same_folder` and the catch-all's icon exclusion; the FR-27 row names `lib/aboutThisCopy`, `__BOOKVIE_VERSION__`, `components/UpdateNotice`, `lib/updateNotice` and `version.test.mjs`.
- **Not edited:** `lib/announce` is not added to the Seed's `lib/` list. It predates Epic 11, and AD-7 now names it where the notice uses it.
- **`.memlog.md`:** header `updated` bumped and one event line added.
- **No code changes.** The tests that read the spine passed 106 of 106; Prettier and ruff checks are clean.
- **Sprint item 75:** Oleg approved the spine diff on 2026-11-17; it is marked `done` in the same commit.

## Review Triage Log

- medium, patched: Real library refused skipped `same_folder`'s equal-resolved-paths step, so it read as if a missing exact `~/bookvie-data` were allowed on a case-sensitive disk.
- low, patched: the probe's target (the real library's ancestors) and "cased letter" weren't stated.
- low, patched: SPA routes said "top-level"; the exclusion matches by file name.
- low, patched: Favicon named only `GET`; the route answers `HEAD` too.
- low, patched: AD-6 cited story 11.3, which changed no server code (`git log` of `views/app_info.py`, `http/api.py`: only a215952, story 11.2).
- low, patched: AD-7's "once for each new server version" overstated it; a remount announces again. It now says "when the shown version changes".
- low, patched: `isAnnouncing()` now names `lib/announce`. It was not added to the Seed (see Not edited).
- low, patched: the FR-26 row now names `instance.same_folder` and the catch-all's icon exclusion.
- low, patched: the Seed's `instance.py` line names `same_folder`.
- low, patched: the Seed gains `frontend/scripts/`.
- false: the spec's Implementation Notes were empty because the review ran before they were written.
- low, patched: the Intent's line numbers are pre-edit. The Count note above says they are as of `baseline_commit`; the frozen block is unchanged.
- low, patched: two `resolved:` lines reworded.
- low, patched: the `.memlog.md` header was bumped, and its event line names `index.html` among the files never served as is.
