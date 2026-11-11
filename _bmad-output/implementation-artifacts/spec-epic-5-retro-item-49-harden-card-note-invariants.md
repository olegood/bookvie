---
title: 'Harden the Card note invariants so a restore refuses what no intent can produce'
type: 'bugfix'
created: '2026-11-11'
status: 'done'
baseline_commit: '27ac5a46aff1eee2e8647c90ffbe35e4c2d57d9f'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `check_invariants` checks only `1 ≤ pageStart ≤ end ≤ pages` for a Card note, so a restored library can hold notes no intent can produce (Epic 5 retro E5-R1, E5-R2):
- a note whose `pageEnd` equals its `pageStart`, shown as "pp.5–5";
- a note whose `text` is empty, whitespace-only or untrimmed;
- the same note id in two Books. The unscoped Card notes page keys Edit buttons by note id across all Books, so focus after a save, a delete or the pile's close can land on the other Book's Edit.

This is retro action 49, due before Epic 6.

**Approach:**
- `backend/bookvie/domain/invariants.py` gains rules for `pageEnd == pageStart`, blank `text` and untrimmed `text`. "Trimmed" means Python's `str.strip()`, which is what `add-card-note` and `edit-card-note` apply.
- `unique_card_note_ids` becomes library-wide. Reading ids stay unique per Book.
- `test_invariants.py` gets failing and passing cases. `test_restore.py` gets restore refusals (422 `restore_invalid`, library unchanged) for each new rule.

</frozen-after-approval>

## Implementation Notes

- **Startup is covered too.** `validate_document` (`store/store.py:219`) is shared by startup and restore, so a `library.json` already on disk that breaks a new rule now refuses startup, naming the rule. That library would fail every commit anyway, since `_commit_and_swap` runs `check_invariants`. I checked the real library at `~/bookvie-data` on 2026-11-11: 4 notes, no repeated ids and none breaking the new rules, so nothing on disk is locked out.
- **Spine:** AD-18's "Known gap" sentences (`ARCHITECTURE-SPINE.md:227`, `:229`) become out of date once this lands. Per the spine policy, I recorded that as spine drift in `deferred-work.md` and did not edit the spine.
- **Rule names:**
  - `card_note_page_end_after_start`, `card_note_text_required` (blank: empty or whitespace only) and `card_note_text_trimmed` (`text != text.strip()`) are checked per note, after `card_note_pages_in_range`.
  - `unique_card_note_ids` keeps its name. It now runs once over every Book's notes, after the Reading-id check. Its message names the id, like `unique_book_ids`.
- **Tests changed:** in `test_invariants.py`, the `(4, 4)` in-range pass case became `(4, 5)`. `test_same_child_ids_in_different_books_pass` is split: Reading ids still pass across Books, and the new `test_repeated_card_note_id_across_books_fails` covers card notes.
- **Tests added:**
  - `test_invariants.py`: the equal-end case, blank and untrimmed text (NBSP included, since `str.strip()` trims it) and trimmed passes.
  - `test_restore.py`: the five restore refusals. Each asserts 422 `restore_invalid`, the library and covers unchanged, and the rule's message in the log. A control shows that the same hand-made archive, unbroken, restores.
- **Verification:** `npm run check` exited 0, with 1338 pytest tests including the coverage gates, 285 unit tests, 507 e2e tests and smoke all passing. No fixture or e2e seed broke a new rule.
- **After review:** `npm run check:py` passed 1342 tests (the 4 new startup cases included), with coverage at domain 100% and intents+store 98.06%.

## Review Triage Log

### 2026-11-11: Blind Hunter (floor N = 4, 6 findings)

- **`[low]` `[patch]` Startup has no test for the new rules, and no test pins a full message.** Grouped with the full-message finding. `test_store.py` gets `test_a_library_on_disk_with_a_card_note_no_intent_can_produce_refuses_startup`, which pins each new rule's exact startup reason.
- **`[low]` `[patch]` The deferred-work entry is a thin reconciliation brief and says "Spine drift" twice.** Rewritten. It now lists the l.227 and l.229 rewrites, not just the sentences to delete.
- **`[low]` `[reject]` The library-wide `unique_card_note_ids` message no longer names the Books.** It names the id, as `unique_book_ids` does. Only a hand-crafted file reaches it, and naming both Books needs extra tracking code.
- **`[false]` `[reject]` `test_the_unbroken_card_note_source_restores` duplicates `ac3`.** `ac3` restores a store export (`_export`). The control is the only test that restores the hand-made `_source_with` archive the refusals mutate, so it shows that the one mutation causes each refusal.
- **`[false]` `[reject]` Nothing ties the page and text rules to the parser and the intents.** `test_add_card_note.py` already sends "42–42" and padded text (l.120) through a commit, which runs `check_invariants`, so the intents' output is checked against the new rules.
