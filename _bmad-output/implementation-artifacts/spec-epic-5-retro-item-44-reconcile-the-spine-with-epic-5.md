---
title: 'Reconcile the architecture spine with as-built Epic 5'
type: 'chore'
created: '2026-11-10'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 5's stories deferred five "spine drift" entries to `deferred-work.md`, and none of them edited the spine (Epic 5 retro F-S1, sprint item `epic-5-retro-item-44-…`). The entries are `:602`, `:617` (with the 5.2 note at `:619`), `:624`, `:630` (the same items as `:624`) and `:636`. They name these gaps:
- **AD-6:**
  - On the server side it lacks the Card notes order (`pageStart`, then `createdAt`), the `card-notes` view's selections (only Books with notes get a group; groups by title key, then Book id; the `?book=<id>` scope), and Home's `cardNoteCount`.
  - On the client side it lacks the `<mark>` highlighting, the client-counted "N notes match." line, and Book detail's first-three cut, which a search lifts.
- **AD-9:**
  - Its 409 list lacks `card_note_not_found`, which `edit-card-note` and `delete-card-note` check after `book_not_found` and before the fields.
  - Its no-op rule doesn't say that `edit-card-note` commits an unchanged edit, as `edit-book` does.
  - Its 404 view list names only `views/book`, but `views/card-notes?book=<id>` answers 404 too.
- **AD-18:** it doesn't say that `pageEnd: null` means one page (never equal to `pageStart`), or that `pageStart ≤ pageEnd`.
- **AD-19 Targeting:** it lacks `cardNoteId`.
- **IDs convention:** `add-card-note` returns `ids.cardNoteId` although no client reads it. Oleg kept it for the agent skills that write to bookvie; per the 5.2 note, they are its only named reader.
- **Structural Seed:**
  - `intents/` lacks `add_card_note`, `edit_card_note`, `delete_card_note` and the shared `check_card_note_fields`.
  - `domain/` lacks `note_pages`.
  - `views/` lacks `card_notes`.
  - `lib/` lacks `cardNotes.ts` and `useSearchCount.ts`.
- **Capability Map:** the FR-17 to FR-19 row names only `views/card_notes`, but Book detail's notes come from `views/shelf` (`BookDetailView.cardNotes`).

**Approach:**
- Edit `ARCHITECTURE-SPINE.md` so each AD states what the code does and cites the story that decided it. Model the change on Epic 4's item 38 (`spec-epic-4-retro-item-38-reconcile-the-spine-with-epic-4.md`, commit `b39e929`).
- Also fix the Capability Map preface, which still gives `views/card_notes` as an example of an unbuilt module.
- Close each of the five entries with a `resolved:` line.
- Story 5.4 and the pile arrow-key spec reported no drift, and the retro found no drift deferred without the marker, so there is nothing more to fold in.
- The retro's E5-R1 and E5-R2 invariant hardening is item 49, not drift. Don't change AD-18's invariant list for it here.
- No code changes. Oleg reviews the spine diff before it's final.

</frozen-after-approval>

## Implementation Notes

- **Count:** five open drift entries from Epic 5 (`deferred-work.md:602`, `:617`, `:624`, `:630`, `:636`), all closed. `:630` restates `:624` and resolves with it. No other `spec-5-*` entry carries the marker without a `resolved:` line.
- **Spine** (`ARCHITECTURE-SPINE.md`). Each statement was checked against the code (`views/card_notes.py`, `views/shelf.py` `card_note_views` and `cardNoteCount`, `http/api.py` `card_notes_view` and `add_card_note_intent`, `intents/edit_card_note.py`, `delete_card_note.py`, `add_card_note.py`, `intents/contract.py`, `domain/note_pages.py`, `frontend/src/lib/cardNotes.ts` `shuffled`):
  - **AD-6:**
    - server: the Card notes order, the `card-notes` groups and `?book=` scope, Home's `cardNoteCount`;
    - client: `<mark>` and the client-counted "N notes match.", the block's first-three cut and its lift under a search, and shuffle's injectable random source.
  - **AD-9:**
    - `card_note_not_found` in the 409 list, with its check order;
    - the 404 from `views/card-notes?book=`;
    - `edit-book` and `edit-card-note` commit an unchanged edit (`edit_book` never returns `store.UNCHANGED`).
  - **AD-18:** the `pageEnd` rule, stated as what the intents store. The invariants don't check it yet: that's retro item 49 (E5-R1), so the invariant list is unchanged.
  - **AD-19 Targeting:** `cardNoteId`.
  - **IDs convention:** the `cardNoteId` exception, reader the agent skills (per the 5.2 note at `:619`).
  - **Seed:**
    - `intents/` gains the three card-note intents and `check_card_note_fields`;
    - `domain/` gains `note_pages`;
    - `views/` gains `card_notes`;
    - `lib/` gains `cardNotes` and `useSearchCount` (both AD-6 presentation).
  - **Map:** the preface drops `views/card_notes` as unbuilt. The FR-17 to FR-19 row names the modules, `views/shelf`'s fields and the three surfaces, and adds AD-7, AD-9 and AD-19.
- **Not added:** `useCardNoteFlow`, `usePileFlow`, `CardNotePanel`, `CardNotesPile` and `MarkedText` are presentation with no AD of their own, like Epic 4's flow hooks (item 38's notes).
- **No code changes.** The tests that read the spine (`test_layers.py`, `test_stack_pins.py`, `test_home_slice.py`, `test_ordering.py`) passed 103 of 103.
- **Beyond the five entries:** AD-6's injectable shuffle and tie order, AD-6's unnormalised search (E5-R3), AD-18's known gaps (E5-R1, E5-R2), FR-17 in AD-6's and AD-19's Binds, and the map preface and row. These are recorded as one more drift entry, resolved in this pass (item 38's precedent). The Approach's "nothing more to fold in" proved wrong; the Intent is frozen, so this note records it.

## Review Triage Log

### 2026-11-10: Blind Hunter, pass 1

Floor N = 6 (about 32 kB). It reported 10 findings.

- **`[medium]` `[patch]` AD-3's general no-op rule still contradicted the commit on an unchanged edit,** while the `resolved:` line claimed it was fixed. Patched: AD-3 says an edit is never a no-op. The resolved line names AD-3.
- **`[low]` `[patch]` AD-18 stated the `pageEnd` rule as if it were enforced.** `check_invariants` doesn't check it (E5-R1). Patched: a known-gap clause naming item 49. The same is done for note ids across Books (E5-R2).
- **`[low]` `[patch]` Binds lagged the new text.**
  - Patched: FR-17 added to AD-6 and AD-19.
  - Rejected in part: AD-18 needs no FR-18, since editing a note is FR-17. AD-7's and AD-9's Binds ("frontend data layer", "all intents") already cover card notes.
- **`[low]` `[patch]` The IDs exception named a reader that doesn't exist yet.** It now says the agent skills "are expected to" read it, with a drop trigger.
- **`[low]` `[patch]` The fold-ins beyond the five entries had no drift entry.** Added, and resolved in this pass.
- **`[false]` Implementation Notes were empty.** They were written while the review ran.
- **`[low]` `[patch]` sprint-status item 44 stays open.** It is marked `done` with `sprint_status.py --set-action-status` when Oleg approves the diff, in the same commit as item 38's.
- **`[low]` `[patch]` The Card notes order has no final tie-break.** AD-6 now says ties keep stored order. Adding an id tie-break would be a code change, rare (equal `createdAt`), and not drift.
- **`[low]` `[patch]` The Seed listed `check_card_note_fields` as a shared module.** It is now named as a function under `add_card_note`.
- **`[low]` `[patch]` AD-6's search said nothing about Unicode normalisation.** It now states the unnormalised match (E5-R3, accepted).

