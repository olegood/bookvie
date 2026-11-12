---
title: 'Keep the lock when a running bookvie reports no pid'
type: 'bugfix'
created: '2026-11-12'
status: 'done'
baseline_revision: '59a6d679cd2d60ef12252e3537bc5622d50d369f'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred:
  - summary: >-
      The bookvie-notes-summary skill's fetch_notes.py reads library.json from the data folder directly, a second read outside store/ and the AD-4 lock that AD-1 does not allow.
    evidence: |-
      Spine-check layer; came in through commit a16b11c (another session, between this spec's baseline 59a6d67 and HEAD), not this change. Unverified here.
    location: >-
      .claude/skills/bookvie-notes-summary/scripts/fetch_notes.py:stored_reading
    severity: medium (unverified)
  - summary: >-
      The bookvie-notes-summary skill is a third HTTP client whose JSON keys (catalog, home, book views, health dataDir) AD-8 and the Design Paradigm don't list, so check:api won't catch a rename that breaks it.
    evidence: |-
      Spine-check layer; same commit a16b11c, not this change. Unverified here.
    location: >-
      .claude/skills/bookvie-notes-summary/
    severity: medium (unverified)
---

<intent-contract>

## Intent

**Problem:** On a same-folder port conflict, `cli._port_conflict` hands `bookvie.lock` back to the running server only when `/api/health` reports a live `pid`. When it doesn't (only a pre-1.2 bookvie omits `pid`), the hand-over is skipped and `main`'s outer `finally: instance.release_lock(data_dir, pid)` deletes the lock, so the live server is left with no lock at all (`deferred-work.md` entry "On a same-folder port conflict where health reports no usable `pid`", from `spec-reconcile-architecture-spine-with-epic-1.md`).

**Approach:** Decided by Oleg: in that case leave the lock in place instead of deleting it. The same-folder branch of the port conflict tells `main` to keep the lock, and `main` skips its final `release_lock` only then. Every other exit of a launch that took the lock (other program on the port, bookvie for another folder, store open failure, server raising, normal shutdown) still releases it.

## Boundaries & Constraints

**Always:** A launch that took the lock and then fails or exits for any reason other than the same-folder port conflict still removes its own lock. `release_lock` keeps its "only if it names this pid" check. The hand-over with a live `pid` behaves exactly as today.

**Never:** Don't change `instance.py`'s claim/take-over state machine, `/api/health`, or the hand-over helper. Don't guess the running server's pid (e.g. from the OS). Don't edit the AD-5 rule text beyond what this path needs.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| No pid in health | Port held by bookvie for this folder; `probe_pid` returns `None` | Exit 0, browser opened at the port; `bookvie.lock` still exists and still names this launch's pid and the port | No error |
| Pid reported but dead | Same, `probe_pid` returns a pid that `pid_alive` rejects | Same as "no pid": lock kept, exit 0 | No error |
| Live pid reported | Same, `probe_pid` returns a live pid | Lock rewritten to `{pid: running, port}` (unchanged behaviour) | No error |
| Other program / other folder | Port held by non-bookvie, or bookvie for another folder | Exit 1, lock removed (unchanged) | Message as today |
| Took the lock, later failure | Invalid `library.json`, or the server raises | Exit 1 / exception, lock removed (unchanged) | As today |

</intent-contract>

## Code Map

- `backend/bookvie/cli.py:127-146` -- `_port_conflict`: same-folder branch at 134-140 hands over only when `probe_pid` gives a live pid; returns the exit code.
- `backend/bookvie/cli.py:166-218` -- `main`: the bind `except OSError` at 170-171 returns `_port_conflict(...)`; the outer `finally` at 217-218 always calls `instance.release_lock(data_dir, pid)`.
- `backend/bookvie/instance.py:88-113` -- `release_lock` (removes only a lock naming `pid`) and `hand_over_lock`; read-only here.
- `backend/tests/test_cli.py:402-424` -- `test_port_held_by_bookvie_for_same_folder_opens_it` stubs `probe_pid` to `None` and currently asserts the lock is gone; it encodes the bug.
- `backend/tests/test_cli.py:427-446` -- the live-pid hand-over test (keep passing).
- `backend/tests/test_cli.py:353-399, 500-511, 650-664` -- other-program, other-folder, server-raises and invalid-library tests that assert the lock is removed (keep passing).
- `_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md` AD-16 "Port conflict" bullet -- describes this path ("When health reports a live `pid`, it hands the lock back ... Either way ..."); AD-5 does not describe it.

## Tasks & Acceptance

**Execution:**
- `backend/bookvie/cli.py` -- make `_port_conflict` also report whether the lock is to be kept (true only on the same-folder branch); in `main`, record that and skip the outer `finally`'s `release_lock` only when it is set -- the live server keeps a lock while all other exits still clean up.
- `backend/tests/test_cli.py` -- change `test_port_held_by_bookvie_for_same_folder_opens_it` to assert the lock is kept and names `{pid: os.getpid(), port}`; add a test where `probe_pid` returns a dead pid and the lock is kept -- covers the matrix's no-pid rows.
- `_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md` -- in AD-16's "Port conflict" bullet, add that when health reports no live `pid` the launch leaves `bookvie.lock` in place rather than removing it -- the spine describes this path.

**Acceptance Criteria:**
- Given a bookvie for this folder holds the port and its health has no usable `pid`, when `bookvie` runs, then it exits 0 and `bookvie.lock` still exists afterwards.
- Given a launch took the lock, when it exits 1 because another program or another folder's bookvie holds the port, or because `library.json` is invalid, or the server raises, then `bookvie.lock` is removed.
- Given `cd backend && uv run pytest -q`, ruff and `npm run check`, when run, then all pass.

## Spec Change Log

## Review Triage Log

### 2026-11-12 — Review pass
- verdicts: 29 findings — high 0, medium 2, low 16, false 4, maybe-false 7
- note: the review diff ran from baseline 59a6d67, so it also held the bookvie-notes-summary skill, which another session committed as a16b11c meanwhile. Findings on those files are not this change's.
- findings:
  - `[false]` `[reject]` Blind: diff includes already-committed skill files — they are a16b11c, not part of this change; the commit stages only this spec's four files.
  - `[low]` `[reject]` Blind: Design Notes wrongly say the kept lock makes a concurrent launch poll health — true (`claim_lock` checks `pid_alive` before age), but the fix is editing this spec; the corrected account is under Auto Run Result.
  - `[low]` `[patch]` Blind: the `cli.py` comment says the server keeps a lock — reworded: the lock names this launch and goes stale when it exits.
  - `[low]` `[patch]` Blind: AD-16 sentence omits that the kept lock is stale — added "only a pre-1.2 bookvie" and that under AD-5 it is stale and the next launch takes it over.
  - `[low]` `[reject]` Blind: leftover lock after the old server stops — names a dead pid, so the next launch takes it over at once; no user-visible harm.
  - `[low]` `[reject]` Blind: tests don't seed a taken-over lock — after a take-over `acquire_lock` writes the same `{own pid, port}` the tests check; take-over itself is covered by `test_stale_lock_is_taken_over_and_served`.
  - `[low]` `[reject]` Blind: dead-pid test lacks the stderr check and a hand_over_lock-False case — the lock contents prove no hand-over; extra asserts add nothing a regression would slip past.
  - `[low]` `[patch]` Blind: `keep_lock` also true after a live-pid hand-over, undocumented — `_port_conflict` docstring now says why it covers both cases.
  - `[false]` `[reject]` Blind: deferred-work entry not closed — Finalize adds its `resolved:` line in the same commit.
  - `[low]` `[reject]` Blind: Code Map line numbers shift — fix is editing this spec; anchors still name the right symbols.
  - `[low]` `[reject]` Blind: dead-pid matrix row has an unclear premise — it is defensive (the code's condition is `probe_pid` None or not alive); fix is editing this spec.
  - `[low]` `[reject]` Edge: kept lock is stale once the launch exits, so it protects nothing — true and the decided trade-off: with no pid in health no lock can name the server; after exit the state equals the old deletion. Surfaced in Auto Run Result.
  - `[low]` `[reject]` Edge: lock remains after the pre-1.2 server's clean shutdown — same as the leftover-lock row; taken over on the next launch.
  - `[low]` `[reject]` Edge: an exception in `_show`/`hand_over_lock` still releases the lock — needs `webbrowser.open` or a disk write to raise; the outcome is the pre-change behaviour; a guard adds branches for an unlikely path.
  - `[low]` `[reject]` Edge: `hand_over_lock` can orphan its tmp file if `os.replace` fails — pre-existing, not touched here, unlikely.
  - `[maybe-false]` `[reject]` Edge: fetch_notes.py `get` lets a JSONDecodeError escape — skill commit a16b11c, not this change; would only be low.
  - `[maybe-false]` `[reject]` Edge: fetch_notes.py says "for book None" on an early HTTPError — a16b11c; would only be low.
  - `[maybe-false]` `[reject]` Edge: fetch_notes.py `stored_reading` assumes dict entries — a16b11c; would only be low.
  - `[maybe-false]` `[reject]` Edge: fetch_notes.py KeyError on a note without text — a16b11c; would only be low.
  - `[maybe-false]` `[reject]` Edge: build_docx.cjs `.trim` on a non-string — a16b11c; would only be low.
  - `[maybe-false]` `[reject]` Edge: build_docx.cjs unhandled Packer rejection — a16b11c; would only be low.
  - `[maybe-false]` `[reject]` Edge: build_docx.cjs missing title/heading — a16b11c; would only be low.
  - `[false]` `[reject]` Verification gap (other): diff scope includes the skill — same as the first Blind row.
  - `[low]` `[reject]` Intent: the kept lock is not live under AD-5, so the server still has no live lock — same as the Edge stale-lock row; the intent's literal decision (leave it, not delete it) is what was built.
  - `[false]` `[reject]` Intent: no test runs `keep_lock=True` through a failing exit — the flag is only set on `_port_conflict`'s return, after which `main` returns; no later failing step exists.
  - `[low]` `[patch]` Intent: AD-16's new clause is not reconciled with AD-5's liveness rule — the AD-16 sentence now says the lock is stale under AD-5 (same edit as the spine row above).
  - `[low]` `[reject]` Intent: tests check lock contents with the live pytest pid, not a dead one — the contents are what this change controls; what a later launch does with a dead-pid lock is `claim_lock`'s existing, tested path.
  - `[medium]` `[defer]` Spine: fetch_notes.py reads library.json outside store/ (AD-1) — from a16b11c, not this change; in `deferred`.
  - `[medium]` `[defer]` Spine: the notes skill is an unlisted HTTP client (AD-8) — from a16b11c, not this change; in `deferred`.

## Design Notes

The kept lock names this launch's pid, which exits right away, so it is stale; a later launch will take it over and reach the same port conflict. That is the decided trade-off: the old server never wrote its own `pid` to health, so no lock can name it, and a lock that exists still makes a concurrent launch within the 5-second starting window poll health instead of racing. The alternative that deleted the lock gained nothing over this. Only a pre-1.2 bookvie can reach this path.

## Verification

**Commands:**
- `cd backend && uv run ruff format --check . && uv run ruff check .` -- expected: clean
- `cd backend && uv run pytest -q` -- expected: all pass
- `npm run check` (repo root) -- expected: exit 0

## Auto Run Result

Status: done

**Summary:** On a same-folder port conflict, `bookvie` no longer deletes `bookvie.lock` when the running server's health reports no live `pid` (only a pre-1.2 bookvie). `_port_conflict` now returns the exit code and whether to skip the release. `main`'s outer `finally` skips `release_lock` only on that branch. Every other exit of a launch that took the lock still releases it.

**Files changed:**
- `backend/bookvie/cli.py` -- `_port_conflict` returns `(code, keep_lock)`; `main` skips the final `release_lock` when it is set.
- `backend/tests/test_cli.py` -- the no-pid test now asserts the lock is kept; a new test covers a reported pid that is not alive.
- `_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md` -- the AD-16 "Port conflict" bullet says the lock is left in place, and that under AD-5 it is stale.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- `resolved:` line on the source entry.

**Review:** 29 findings: 4 patches applied (all low: the code comment, the `_port_conflict` docstring, and the AD-16 sentence, which closed 2 findings), 2 deferred (medium, unverified, both about the bookvie-notes-summary skill from commit a16b11c, not this change), 23 rejected (reasons in the triage log). Patched by verdict: high 0, medium 0, low 4. Follow-up review: not recommended.

**Correction to Design Notes:** `claim_lock` checks `pid_alive` before the lock's age. So once this launch exits, the next launch takes the kept lock over at once and does not poll health. The kept lock protects nothing after exit. It only differs from the old deletion while this launch is still alive. That is the trade-off Oleg decided: with no `pid` in health, no lock can name the running server.

**Verification:** `uv run ruff format --check .` and `uv run ruff check .` were clean. `uv run pytest -q` gave 1532 passed. `npm run check` (repo root) exited 0: 597 e2e passed and the smoke test was ok. All were rerun after the review patches. Matrix audit: no pid and dead pid are covered by the two same-folder tests; live pid by `test_port_held_by_bookvie_for_same_folder_gets_its_lock_back`; other program and other folder by the two `exits_1` tests; later failure by `test_invalid_library_exits_1_and_releases_the_lock` and `test_lock_released_when_server_raises`. All of them ran and passed.

**Residual risks:** If `webbrowser.open` raises on this branch, the lock is still released, which is the old behaviour. The kept lock stays on disk after the pre-1.2 server stops, until the next launch takes it over.
