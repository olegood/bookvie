---
title: 'Reconcile the architecture spine with as-built Epic 3'
type: 'chore'
created: '2026-11-06'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Six of the seven Epic 3 stories reported spine drift to `deferred-work.md`, and none edited the spine (Epic 3 retro F-S1/F-A6, sprint item `epic-3-retro-item-23-…`).
- **Structural Seed:** the `domain/` line still says "reading_status and pace planned", and the seed lacks `progress`, `pace`, `purpose`, `ordering` and the four reading intents.
- **AD-6:** it says the server picks the slice rows (it sends a Book-id priority and the client chooses rows). It omits the gauge ticks and when days left is null.
- **AD-3/AD-9:** they claim the server alone holds rules and copy, but the page field pre-checks the range with its own copy.
- **AD-4/AD-15 and the FR-22 row:** they name only `views/backup` as a reader of `local-state.json`, though the home view reads it too.
- **AD-19:** it lists `lastProgressUpdate` as non-null.
- **IDs convention:** it says every minted id comes back in `ids`, but `start-reading` mints a Reading id and returns `{ok: true}`.
- **AD-20:** it lacks the pace edge rules.
- **AD-7:** it still describes the finish moment as "a single ~600ms spine fill".
- **Retro work since:** items 21 and 22 added two rules: edit-book's Finished on bound, and dialogs reading a fresh `book` view. Story 1.11's ACs in `epics.md` lack the first.

**Approach:**
- Edit `ARCHITECTURE-SPINE.md` so each AD states what the code does and cites the story or retro item that decided it.
- Amend the spine, not the code, for the page pre-check: a client pre-check may mirror a server refusal with the same copy, as long as the server still enforces it.
- Bring the seed and the map in line.
- Add the Finished on bound to story 1.11's ACs in `epics.md`.
- Mark the matching `deferred-work.md` entries `resolved:`.
- No code changes.

</frozen-after-approval>

## Implementation Notes
- **Spine** (`ARCHITECTURE-SPINE.md`, `updated` 2026-11-06):
  - AD-3: the client pre-check exception, with its shared case table (`pageField.cases.json`) and an adjusted Prevents line. AD-9 points at it.
  - AD-4 and AD-15: `views/shelf` (home) also reads `local-state.json`.
  - AD-6: the percent rule with its source; the slice as a server id priority, with the client choosing, filling and ordering rows (`slice.ts`); the gauge ticks; when days left is null; and the calculator's `max(1, …)` floor.
  - AD-7: the full finish moment and its hand-off rules, plus the fresh-view rule for dialogs, with its known gap.
  - AD-19: `lastProgressUpdate|null`, start pauses the previous Main, the Purpose rule, and the edit-book Finished on bound with its known gap. FR-1 is added to Binds.
  - AD-20: the pace rules.
  - IDs convention: only ids a client needs are returned.
  - Seed: the `domain/`, `intents/` and frontend `lib/` lines. Map: the FR-10/11 and FR-22/23 rows, and the note's example.
- **`epics.md`:** a story 1.11 AC for the Finished on bound.
- **`deferred-work.md`:** `resolved:` added to 12 entries, plus a partial note on the 3.4 re-raise (its README count stays open). The "the spine is reconciled per epic" wording at the 3.5 entry is left alone, because that policy is retro action 5.
- No code changes.

## Review Triage Log

Blind Hunter, pass 1. Floor N = 6; it reported 15 findings.

- **AD-9 still says the server owns all copy: `medium`, patched.** It now points at the AD-3 exception.
- **AD-3's Prevents line contradicted the new exception: `low`, patched.**
- **The shared case table was unnamed: `low`, patched.**
- **The slice fill step and dropped ids were missing: `low`, patched.**
- **The calculator rule lacked days left's floor and its nothing-left rule: `medium`, patched.** The 3.4 entry flagged exactly this. The wording follows EXPERIENCE.md → Pace calculator.
- **The fresh-view rule has a known exception: `low`, patched.** It now points to the open deferral.
- **AD-19's edit rule has a known overlap gap: `low`, patched.** It now points to the open deferral.
- **The `OkResponse.ids` docstring disagrees with the IDs convention: `low`, deferred** (no code changes in this spec).
- **The 3.4 re-raise was unresolved: `low`, patched** with a partial-resolution note.
- **The percent rule had no source: `low`, patched.**
- **Binds lists were not updated: `low`, patched** (AD-19 gains FR-1, AD-7 gains FR-14).
- **Reader naming was inconsistent: `low`, patched.**
- **The spec was incomplete: `false`.** It is finalized here.
- **The 1.11 AC doesn't cover a current Reading with no start date: `low`, rejected.** No intent creates one; only a restored, hand-edited file can.
- **The frontend seed lacks `src/lib/`: `low`, patched.**
