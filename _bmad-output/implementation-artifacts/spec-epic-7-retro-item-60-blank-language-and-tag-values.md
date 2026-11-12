---
title: 'Refuse blank or untrimmed Language and Tag values, and keep empty values out of the filter lists'
type: 'bugfix'
created: '2026-11-12'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The add-book and edit-book intents store `language` trimmed and required, and each tag trimmed with empties dropped (`domain/book_fields.py` `parse_book_fields`, `split_tags`). But the stored model takes any string (`domain/model.py` `language: str`, `tags: list[str]`), and `check_invariants` checks neither. So a restored or hand-edited `library.json` can carry `""` or `"English "`, and Catalog's Language or Tag list then shows a checkbox with no accessible name, or two that read the same (`filterValues(['English','English ','','english'])`; Epic 7 retro E7-R1, sprint item `epic-7-retro-item-60-…`).

**Approach:**
- `domain/invariants.py`: refuse a Book whose `language` is blank or has whitespace around it, and a Book with a blank tag or a tag with whitespace around it, each under its own stable `rule`, following the card-note text rules (Epic 5 retro item 49). Startup and restore already run these checks (`store/store.py` `validate_document`), so such a file is refused naming the rule.
- `lib/catalogFilter.ts` `filterValues`: skip a value whose key is empty, as a guard.
- Tests: `test_invariants.py` cases per rule (fails and passes); a `test_store.py` startup case pinning each new message; a `catalogFilter.test.ts` case for the guard.
- AD-18 in `ARCHITECTURE-SPINE.md` gains the rules, as item 49 recorded the card-note text rule.
- The real library (`~/bookvie-data`, 409 Books) was checked on 2026-11-12: no blank or untrimmed language or tag, so nothing on disk is locked out.

</frozen-after-approval>

## Implementation Notes

- **`domain/invariants.py`:** four rules in the per-Book loop, before the Reading checks: `book_language_required` ("Book X has no language"), `book_language_trimmed` ("… has a language with whitespace around it"), `book_tag_required` ("… has a blank tag"), `book_tag_trimmed` ("… has a tag with whitespace around it"). Required is checked first, so a whitespace-only value reports as blank, as the card-note text rules do. "Trimmed" means `value == value.strip()`, the same `str.strip()` the intents apply (`parse_book_fields` strips every field; `split_tags` strips each part), so U+00A0 (no-break space) counts as whitespace on both sides, as it does for JavaScript's `trim()`.
- **Not added:** a rule against two tags differing only by case. `merge_tags` merges those on entry, but the client already merges them for display (`filterValues`), so they can't double a checkbox. It isn't part of E7-R1.
- **Tests (after review):** `test_restore.py` has 4 restore cases (422, library unchanged, the rule logged), mirroring item 49's. The NBSP cases are written as `\u00a0`.
- **Tests:** `test_invariants.py` has 14 failing cases and 3 passing ones, with inner spaces kept and an untagged Book. `test_store.py` has 4 startup cases pinning each message through `_refused`. A mutation check that removed the four rules made 18 tests fail. `catalogFilter.test.ts` has 1 case for the empty-key guard, which fails without the guard (mutation check).
- **`lib/catalogFilter.ts`:** `filterValues` skips a blank key (after review: whitespace-only too, not just empty). It doesn't trim: the server now refuses untrimmed values, and the action asked only for the empty-key guard.
- **Spine:** AD-18's document-shape bullet gains the rule and its four names next to the card-note text rule (item 49's precedent).
- **Real data:** `~/bookvie-data/library.json` (409 Books) was scanned on 2026-11-12, and no language or tag breaks the new rules, so startup is unaffected.
- **Full backend suite:** 1417 passed after review (1392 before, plus 21 new and the 4 restore cases).

## Review Triage Log

### 2026-11-12: Blind Hunter, pass 1

Floor N = 4 (about 13.3 kB). It reported 9 findings.

- **`[low]` `[patch]` Restore had no test for the new rules**, though item 49 added restore cases for its rules. Added `test_restore.py` `test_a_language_or_tag_no_intent_can_produce_is_422_restore_invalid`, four cases: 422, library unchanged, the rule logged.
- **`[low]` `[patch]` The `filterValues` guard skipped only `''`, not a whitespace-only value**, so its comment overclaimed. The guard now skips any blank key, and the unit case includes `'  '`.
- **`[low]` `[patch]` Two parametrize values were literal NBSPs that looked like duplicates.** They are now written as `"\u00a0English"` and `"\u00a0novel"`, as the card-note case already was.
- **`[low]` `[defer]` A tag containing a comma, duplicate tags within one Book, and blank or untrimmed `title`, `publisher` or `authors` are other values no intent can produce**, and the invariants accept them. Not part of E7-R1, which is the filter lists; a comma tag would split on the Book's next edit. Recorded in `deferred-work.md`.
- **`[low]` `[patch]` AD-18's "a `library.json` that breaks one" became ambiguous** after the new sentence. Now "breaks any of these rules".
- **`[low]` `[patch]` AD-18 credited the rules alone with "no doubled checkbox"**, while case merging is the client's. Reworded: no whitespace can give an unnamed or doubled checkbox; the lists merge case themselves (AD-6).
- **`[low]` `[patch]` A garbled code span in the Implementation Notes** (an invisible NBSP). Now names U+00A0.
