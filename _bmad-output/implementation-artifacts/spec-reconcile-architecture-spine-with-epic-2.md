---
title: 'Reconcile the architecture spine with as-built Epic 2'
type: 'chore'
created: '2026-11-04'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Every Epic 2 story reported spine drift and deferred it, so the architecture spine now lags the export and restore code that shipped (Epic 2 retro F-S1, action item 1).
- AD-1 says only `store/` reads data files, but `intents/export` reads `library.json` and covers itself.
- AD-4 puts every write under the lock, but `record_export` writes `local-state.json` outside it.
- AD-2/AD-15 don't describe the `local-state.json` atomic write or its startup sweep.
- AD-9 doesn't name the restore codes or the restore body cap.
- AD-12 still says "Until restore exists", and doesn't say that restored covers keep their bytes or that an existing name is never overwritten.
- AD-14 says all of `covers/` is exported (only referenced covers are). It also lacks the casefold and existing-name duplicate rules, the declared-size rule, the 1 GiB units, the refusal precedence, the body cap, and the round-trip exception for a same-name cover.
- The Structural Seed and Capability Map name modules that don't exist (`views/catalog`, `store/covers`, the lock in `store/`), an Epic 1 leftover (deferred-work.md l.147).
- `epic-2-context.md` l.40-42 lacks the same 2.3 rules.

**Approach:** Edit `ARCHITECTURE-SPINE.md` so each AD states what the code does and cites the story that decided it, and bring the seed, the map and `epic-2-context.md` in line. AD-1 is amended, not the code: whole-folder reads for packaging, under the AD-4 lock, may live in `intents/export`, and every write still goes through `store/`. Mark the matching `deferred-work.md` entries `resolved:`. No code changes. The restore dialog's couldn't-save placement (F-S2, l.66) belongs to retro action 3 and stays out of scope.

</frozen-after-approval>

## Implementation Notes

- **Spine** (`ARCHITECTURE-SPINE.md`, `updated` 2026-11-04):
  - AD-1: amended, not the code. Every write goes through `store/`; the one outside read is export packaging, under the lock.
  - AD-2: the startup sweep also deletes `local-state.json.tmp*`.
  - AD-4: export holds the lock while it builds, not while it sends; restore holds it for the whole run; `local-state.json` is the one write outside it.
  - AD-9: the three restore codes and their kind, the restore body cap (422 `restore_unsafe`, before the route and the lock), and restore write faults as 503 `couldnt_save`.
  - AD-12: "Until restore exists" removed; new "Restored covers" bullet (bytes unchanged, re-encode rules don't apply, never overwritten, a differing copy only logged).
  - AD-14: referenced covers only plus the `X-Bookvie-Export` pointer; the `archive` part; no `library.json` is `restore_invalid`; casefold and existing-name duplicates; 1 GiB, entries counting directories, the central-directory pre-check, the declared-size rule; the refusal precedence (from `store/restore.py`'s docstring and `intents/restore.py`); the round-trip exception.
  - AD-15: the document shape, the atomic write outside the lock, write failures logged, and malformed files read as no export.
  - Structural Seed: `instance.py` added; the `intents/`, `views/` and `store/` lines name the as-built modules. Capability Map: FR-4, FR-21, FR-22/23 and A1 rows match the code, and a note says unbuilt rows name planned modules.
- **Context** (`epic-2-context.md`): the restore safety-limits bullets now match 2.3 (casefold, central directory, 1 GiB, declared size, body cap, precedence).
- **deferred-work.md:** `resolved:` added to the six entries (l.147 seed/map, the 2.1 entry and its re-confirmation, 2.2, and the two 2.3 entries).
- **Scope kept:** `epic-2-context.md` l.66 (the restore dialog's couldn't-save placement, F-S2) is retro action 3. The design paradigm diagram's "store/ … lock" is left as is: the AD-4 lock is `Store.lock`. No code changes.
- **Patched after review:** AD-1's Prevents line and the `bookvie.lock` exception (`instance.py`, AD-5); AD-9's 422 lead sentence and the exact body-cap timing; the data-folder tree (restored covers, `.staging/` emptying, `local-state.json.tmp*`); the seed's `domain/` and `intents/` lines, `set_spine_color` in the FR-1 row, FR-10/11 on `views/shelf`; the context's newer-version precedence step; `resolved:` on the two case-collision entries.

## Review Triage Log

- AD-1 Prevents line contradicts the amended Rule: medium. Patched.
- AD-1 ignores `instance.py` writing `bookvie.lock`: medium. Patched (named as the one write outside `store/`, AD-5).
- The map note calls `views/home` unbuilt, and FR-10/11 points at it: low. `home()` is in `views/shelf.py`. Patched.
- The seed is only partly reconciled (`domain/`, `intents/` helpers, `set_spine_color`): low. The `resolved:` line claimed more than was done. Patched.
- The data-folder tree is stale for restored covers, `.staging/` and `local-state.json.tmp*`: low. Patched.
- AD-9's 422 lead sentence says field validation only: low. Patched.
- The body cap is "before the route runs" but streams when there's no `Content-Length`: medium. `BodySizeCap` counts during the form parse. Patched, and it's still before the lock. Whether a browser shows the early 422 is the existing deferred item (story 2.3, pass 1).
- The context's precedence omits the newer-version code and timing: low. Patched.
- Two case-collision entries not marked resolved: low. Story 2.3's `_check_entries` closes both. Patched; Unicode-normalization aliases stay open (retro action 2).
- `epics.md` still says 1 GB and omits the `covers/` directory entry: low. It's a planning spec, which the review rules route to defer. Deferred.
- Spec is `in-progress` with no verification section: false. Finalize sets `done`, and the oneshot template drops Verification.
- Spec cites line numbers that shift: low. They sit in the frozen intent and point at entries that are now marked `resolved:`. Rejected.
