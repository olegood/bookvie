---
title: 'Backend refactor before Epic 2: book lookup, intent model base, one valid_fields'
type: 'refactor'
created: '2026-11-03'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 1 left three copies that every Epic 2-4 intent would copy again. This is Epic 1 retro action item 4 (F-A1, F-A2).
- Finding and replacing a Book is written two ways: `edit_book.py` and `set_spine_color.py` scan `enumerate(library.books)`, while `delete_book.py`, `views/shelf.py` and `model.py` use `Library.book()`.
- The intent model setup (`ConfigDict(alias_generator=to_camel, extra="forbid", strict=True)` plus the `_no_null` validator) is copied in `book_form.py`, `delete_book.py` and `set_spine_color.py`.
- `edit_book._valid_fields` is a near-copy of `book_form.valid_fields`, and it parses Finished on a second time.

**Approach:** This is a refactor, so wire behavior does not change (status codes, error codes, messages, field order, stored bytes).
- **Book lookup:** `Library` gets one index/replace helper. Edit and set-spine-color use it instead of their own scans.
- **Intent model base:** one shared base model holds the config and the null refusal. A subclass names the fields where an explicit `null` is allowed; set-spine-color's `spineColor` is the only one today. `delete-book`, `set-spine-color` and the book form inherit from it. `parse_form_intent` and the malformed-intent helpers move next to the base, so the non-form intents stop importing `book_form`.
- **One `valid_fields`:** `parse_book_fields` and `valid_fields` take an optional extra Finished on rule, called once with the already-parsed date. Edit passes its latest-finished rule, and `_valid_fields` is deleted.

</frozen-after-approval>

## Implementation Notes

- **Lookup:** `Library.book_index(id)` and `Library.replace_book(book)` (keeps the position; `KeyError` for an unknown id, since callers look the Book up and refuse first). `book()` uses `book_index`. Edit and set-spine-color now do `library.book()` → `book_not_found` → `replace_book(...)`.
- **Intent base:** new `intents/intent_model.py` with `IntentModel` (shared config; `_no_null` on `*`, skipping fields named in the `nullable` ClassVar, by Python name), `parse_form_intent` (bound now `T: IntentModel`), `malformed`, `INTENT_FIELD`, `MALFORMED_INTENT_MESSAGE` and `refuse_fields`. Delete and set-spine-color no longer import `book_form`. The internal null error text changed ("null is not allowed here"); it never reaches the wire, since every validation error becomes the shared malformed-intent message.
- **One `valid_fields`:** `parse_book_fields(..., finished_on_rule)` calls the rule once with the parsed date, only when Finished on is well-formed. `valid_fields` passes it through. Edit passes `partial(_finished_on_failure, book)`; `_valid_fields` and its second `parse_finished_on` call are gone.
- **Tests:** `test_model.py` (index/replace), new `test_intent_model.py` (base model rules) and `test_book_fields.py` (rule contract).
- **Verification:** `npm run check` exit 0 (689 pytest, domain 100%, intents+store 98.67%, 162 e2e, smoke ok); load 5.3/14 cores before the run (PL-1). Ruff/mypy on the changed files show only errors that already existed (`commit.py` noqa, `cover.py`, `contract.py:85`, `book_fields.py:255`).

## Review Triage Log

Blind Hunter (floor 5, 10 findings):

- `set_spine_color` still imports `book_form` for `refuse_fields`. **medium**, patched: moved to `intent_model.py`.
- `parse_form_intent` is bound to `BaseModel`. **low**, patched: bound to `IntentModel`. The suggested rename to `parse_intent` was rejected as churn.
- Names in `nullable` are not checked against the fields. **low**, rejected: there is one user today, and the check would add a subclass hook for a typo case that existing tests already catch.
- `IntentModel` has no unit tests. **low**, patched: `test_intent_model.py`.
- `finished_on_rule` has no domain test. **low**, patched: `test_book_fields.py`.
- `delete_book` filters `books` itself; suggests adding `Library.remove_book`. **low**, rejected: F-A1 covers lookup and replace, deletion is written once, and nothing else removes a Book yet.
- `book_index` should be private. **low**, rejected: it is the index half of the helper the retro asked for, and the public `replace_book` covers the replace case.
- The spec is unfinished. **false**: it is finalized here.
- The malformed message reads "form's fields" for intents with no form. **low**, patched with a docstring that says the message is shared and on the wire. The text itself is unchanged.
- The edit rule is passed as a lambda. **low**, patched: `functools.partial`.
