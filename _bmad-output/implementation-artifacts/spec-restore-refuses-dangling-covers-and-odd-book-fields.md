---
title: 'Refuse dangling covers and odd Book field values on startup and restore'
type: 'bugfix'
created: '2026-11-12'
status: 'done'
baseline_revision: '7a37f2456170c64ced98b12907b8a61ff7555765'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: ['oversized']
deferred:
  - summary: >-
      subtitle, isbn, year and the spine-color fields can still hold values no intent produces (blank or untrimmed subtitle or ISBN, a malformed ISBN or year, a non-hex color).
    evidence: |-
      parse_book_fields stores subtitle and isbn trimmed or null, checks the ISBN, Year and Spine color formats; check_invariants checks none of them. Neither source entry lists these fields (Blind Hunter, Edge Case Hunter, intent audit reading C). The real library has no blank or untrimmed subtitle or ISBN (scan, 2026-11-12).
    location: >-
      backend/bookvie/domain/invariants.py
    severity: low
---

<intent-contract>

## Intent

**Problem:** `check_invariants` still accepts Book values that no intent can produce, so a restored or hand-edited `library.json` can carry them (two `deferred-work.md` entries: "A `coverFile` that isn't `covers/<plain-name>` passes model validation…", from Story 2.2's review, and "Other Book field values that no intent can produce…", from item 60's review). A `coverFile` outside `covers/<plain-name>` is a dangling reference that `cover_name` silently skips. A tag with a comma splits in two on the Book's next edit; two tags equal ignoring case show twice on Book detail; a blank or padded title, publisher or author changes the sort and search, or breaks the Edit form's round trip.

**Approach:** Add named rules to `domain/invariants.py` in item 60's style (one `rule` per value, "required" before "trimmed", messages naming the Book id only). Startup and restore already run them through `store/store.py` `validate_document`, so such a file is refused naming the rule. Move `cover_name` (and `COVERS_DIR`) into the domain so the invariant and the store share one definition. Record the rules in AD-18.

## Boundaries & Constraints

**Always:** "Trimmed" means `value == value.strip()`, the same `str.strip()` the intents apply. Tag equality is `str.casefold()`, as `merge_tags` uses. The `coverFile` rule accepts exactly what `cover_name` accepts. `store` keeps exporting `COVERS_DIR` and `cover_name` unchanged for its callers. The real library (`~/bookvie-data/library.json`, 409 Books, scanned read-only on 2026-11-12) breaks none of the new rules.

**Never:** No change to the intents, the model's types, the restore archive checks, or the frontend. No rule for `subtitle`, `isbn` or the spine colors (not in either entry). Never write to `~/bookvie-data`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Minted cover | `coverFile: "covers/b-uuid.jpg"` or `null` | passes | none |
| Dangling cover | `"elsewhere/x.jpg"`, `"covers/"`, `"covers/a/b.jpg"`, `"covers/.."`, `"covers/a\\b.jpg"`, `""` | `book_cover_file_in_covers` | startup refused / restore 422 `restore_invalid`, library unchanged |
| Blank / padded title | `""`, `" "`, `"Dune "` | `book_title_required` / `book_title_trimmed` | as above |
| Blank / padded publisher | `""`, `" Ace"` | `book_publisher_required` / `book_publisher_trimmed` | as above |
| Authors | `[]`; `["A", " "]`; `[" A"]`; `["A; B"]` | `book_authors_required` / `book_author_required` / `book_author_trimmed` / `book_author_no_semicolon` | as above |
| Tags | `["a,b"]`; `["Novel", "novel"]` | `book_tag_no_comma` / `book_tags_unique` | as above |
| Inner spaces | title `"The Left Hand of Darkness"`, author `"Ursula K. Le Guin"`, tags `["science fiction", "to read"]` | passes | none |

</intent-contract>

## Code Map

- `backend/bookvie/domain/invariants.py` -- per-Book loop; item 60's four language/tag rules are the style to follow.
- `backend/bookvie/domain/book_fields.py` -- `parse_book_fields` strips every field, requires title/language/publisher; `split_authors` splits on `;`; `split_tags` splits on `,`; `merge_tags` dedupes by `casefold()`.
- `frontend/src/lib/bookDetail.ts:88,96` -- Edit form joins authors with `"; "`, tags with `", "` (why `;` in an author and `,` in a tag don't round-trip).
- `backend/bookvie/store/store.py:35,60-88` -- `COVERS_DIR`, `cover_name`, `referenced_covers`; `validate_document` (l. 219) turns an `InvariantViolation` into `LibraryRefused("breaks a library rule: …")`.
- `backend/bookvie/intents/cover.py:75` -- `mint_cover_file` makes `covers/<book-id>-<uuid>.<ext>`.
- `backend/bookvie/store/restore.py:45,261`, `store/__init__.py` -- import/re-export `cover_name`; must keep working.
- `backend/tests/test_layers.py` -- domain imports no other layer, so the shared helper must live in domain.
- `backend/tests/test_invariants.py:202-245`, `tests/test_store.py:462-478`, `tests/test_restore.py:595-618` -- item 60's invariant, startup and restore cases to mirror.
- `_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md:234` -- AD-18 document-shape bullet listing the rule names.
- `_bmad-output/implementation-artifacts/deferred-work.md:193,894` -- the two source entries.

## Tasks & Acceptance

**Execution:**
- `backend/bookvie/domain/cover_file.py` (new) -- hold `COVERS_DIR` and `cover_name` (moved verbatim from `store/store.py`); `store/store.py` imports them from here so every existing import still works.
- `backend/bookvie/domain/invariants.py` -- add, in form order inside the per-Book loop: `book_title_required`, `book_title_trimmed`, `book_authors_required`, `book_author_required`, `book_author_trimmed`, `book_author_no_semicolon`, (existing language rules), `book_publisher_required`, `book_publisher_trimmed`, (existing tag rules), `book_tag_no_comma`, `book_tags_unique`, `book_cover_file_in_covers`. Messages: "Book X has no title", "… has a title with whitespace around it", "… has no authors", "… has a blank author", "… has an author with whitespace around it", "… has an author with a semicolon", "… has no publisher", "… has a publisher with whitespace around it", "… has a tag with a comma", "… has a tag more than once, ignoring case", "… has a coverFile that isn't covers/<name>".
- `backend/tests/test_invariants.py` -- failing cases per rule and passing cases (I/O matrix), including NBSP as ` `.
- `backend/tests/test_store.py` -- a startup case per new rule pinning the exact message through `_refused`.
- `backend/tests/test_restore.py` -- restore cases (422, library unchanged, the rule logged) per new rule.
- `ARCHITECTURE-SPINE.md` AD-18 -- add the rules and their names next to item 60's.

**Acceptance Criteria:**
- Given a `library.json` on disk with any value in the matrix's refused rows, when bookvie starts, then startup is refused with "breaks a library rule: <message>" and the file is unchanged.
- Given an export archive whose `library.json` has such a value, when it is restored, then the response is 422 `restore_invalid`, the library is unchanged, and the rule's message is logged.
- Given the existing suite, when it runs, then every test passes (no existing fixture breaks a new rule).

## Spec Change Log

## Review Triage Log

### 2026-11-12 — Review pass
- verdicts: 24 findings — high 0, medium 0, low 13, false 11, maybe-false 0
- findings:
  - `[low]` `[patch]` Spine-check: the Structural Seed `domain/` line doesn't list the new `cover_file` module — added `cover_file (COVERS_DIR, cover_name)`.
  - `[low]` `[patch]` Spine-check: AD-18 says the cover rule leaves "no dangling cover reference", but it checks shape, not existence (`covers/missing.jpg` passes) — reworded: no `coverFile` can point outside `covers/`; existence is restore's check (AD-14).
  - `[low]` `[defer]` Edge: subtitle and ISBN can still be blank or padded — not in either source entry; deferred (frontmatter `deferred`, `deferred-work.md`).
  - `[low]` `[reject]` Edge: a `covers/<name>` over restore's 200-byte cap passes the invariant — no intent makes one (minted names are about 80 bytes) and restore then refuses it anyway as a missing cover; adding the cap to the domain adds a cross-layer constant for a hand-edit nobody meets.
  - `[low]` `[patch]` Edge: AD-18 "dangling" overclaim — same patch as the spine-check row.
  - `[low]` `[patch]` Edge: `test_cover.py` AC7 no longer checks the store's guard against a bad `coverFile` — added `tests/test_cover_file.py`: `cover_name` cases and `referenced_covers` on a Library built without invariants skipping `covers/../library.json`.
  - `[low]` `[patch]` Edge: `test_views.py` dropped its traversal `coverFile` Book — same new test pins `referenced_covers` (what `cover_path` uses); `cover_path(store, "../library.json") is None` is still asserted.
  - `[false]` `[reject]` Edge: the spec claims no existing fixture breaks a rule, but two did — the fix is a spec edit; rejected per the rule, and recorded in Auto Run Result.
  - `[false]` `[reject]` Blind: AD-18 dangling overclaim — duplicate of the spine-check row, patched there.
  - `[low]` `[patch]` Blind: the invariant's comment "anything else is dangling" contradicts `covers/x.png` passing — reworded: a value that isn't `covers/<plain name>` names no file in `covers/`.
  - `[false]` `[defer]` Blind: subtitle, ISBN, year, spine colors unchecked — duplicate of the edge row, deferred there.
  - `[false]` `[reject]` Blind: cover-name length cap — duplicate of the edge row, rejected there.
  - `[false]` `[reject]` Blind: the `cover_name` move is "half done" because `store` re-exports it — deliberate (spec: store keeps exporting both); one definition exists in `domain/cover_file.py`, no caller can diverge.
  - `[low]` `[patch]` Blind: `cover_name` has no direct unit tests — `tests/test_cover_file.py` pins its values.
  - `[false]` `[reject]` Blind: store and view traversal guards untested — duplicate of the edge rows, patched there.
  - `[false]` `[reject]` Blind: no upgrade path for old libraries — every intent since story 1.7 has stored these values normalized (verification-gap layer checked `parse_book_fields` history), migrations don't touch them, and the real 409-Book library passes every rule.
  - `[low]` `[reject]` Blind: the restore test's docstring says it covers "the deferred-work entries" though some shapes are only domain-tested — every rule has a restore case; cosmetic.
  - `[low]` `[patch]` Blind: no control showing inner newline or NBSP in a title, publisher or author passes — added a passing Book (`"Dune\nMessiah"`, `"Ace\u00a0Books"`, `"Le\u00a0Guin"`).
  - `[false]` `[reject]` Intent audit: status is `in-review` and the entries have no `resolved:` line — Finalize does both, by design after review.
  - `[low]` `[reject]` Intent audit: startup doesn't refuse a well-formed `coverFile` whose file is missing — pre-existing; the entry is about shape, and refusing startup over one missing image would lock the whole library out (the media route already 404s).
  - `[false]` `[defer]` Intent audit (reading C): wider fields — duplicate of the edge row, deferred there.
  - `[false]` `[reject]` Intent audit: the rules also run on every intent's commit — that is AD-18's design (`check_invariants` before every commit); the intents can't produce these values (verification-gap layer checked each producer).
  - `[low]` `[reject]` Intent audit: startup and restore cases use different cover shapes — every rule has both a startup and a restore case; the full shape list is pinned at the domain and now in `test_cover_file.py`.
  - `[false]` `[reject]` Verification gap: none found (recorded for the count; no action).

## Design Notes

- `book_author_no_semicolon` is not named in the entry but is the authors' counterpart of the comma tag: the Edit form joins authors with "; " and `split_authors` splits on ";", so such an author splits in two on the next edit. The entry lists "author" among the fields, so it is included.
- `book_tags_unique` uses `casefold()` because `merge_tags` does: exact repeats and case-only repeats are both merged on entry.

## Verification

**Commands:**
- `cd backend && uv run pytest -q` -- expected: all pass.
- `cd backend && uv run ruff format <changed> && uv run ruff check .` -- expected: clean.
- `npm run check` -- expected: pass.

## Auto Run Result

Status: done

**Summary:** startup and restore now refuse eleven kinds of Book value that no intent can produce. They are new rules in `check_invariants`, which `validate_document` runs for both. The rules cover a `coverFile` that isn't `covers/<plain name>`, a blank or untrimmed title, author or publisher, a Book with no authors, an author with `;`, a tag with `,`, and two tags equal under `casefold()`.

**Files changed:**
- `backend/bookvie/domain/cover_file.py` (new): `COVERS_DIR` and `cover_name`, moved from the store so the domain can use them; `store` re-exports both.
- `backend/bookvie/domain/invariants.py`: the 11 rules, in form order.
- `backend/bookvie/store/store.py`, `store/restore.py`: import from the new module; docstring link.
- `backend/tests/test_invariants.py`: failing and passing cases per rule.
- `backend/tests/test_store.py`: a startup case per rule, pinning the message.
- `backend/tests/test_restore.py`: a restore case per rule (422, library unchanged, rule logged).
- `backend/tests/test_cover_file.py` (new): `cover_name` values, and `referenced_covers` skipping a bad `coverFile` in a Library built without invariants.
- `backend/tests/test_cover.py`, `backend/tests/test_views.py`: two existing tests seeded `covers/../library.json`, which the new rule refuses. AC7 now asserts that startup refuses that file and leaves it unchanged, and keeps the media 404. The views test drops that Book and keeps `cover_path(store, "../library.json") is None`. The spec's line "no existing fixture breaks a new rule" was wrong for these two.
- `ARCHITECTURE-SPINE.md`: AD-18 lists the rules; the Structural Seed lists `cover_file`.
- `deferred-work.md`: `resolved:` lines on both source entries, and a new entry for the fields left out.

**Review:** 24 findings: 13 low, 11 false. Patched 7 entries, all low: the spine wording, the Seed line, the invariant comment, the `cover_name` and store-guard tests, and the inner-whitespace control. Deferred 1: subtitle, ISBN, year and spine colors. Rejected the rest; the reasons are in the triage log.

**Follow-up review recommended:** false (patched: 0 high, 0 medium, 7 low).

**Verification:**
- Real library `~/bookvie-data/library.json`: 409 Books, scanned read-only before the rules were added; none breaks a rule.
- `uv run ruff format` on the changed files and `uv run ruff check .`: clean.
- `uv run pytest -q`: 1505 passed.
- `npm run check`: exit 0, with 597 e2e tests passed and the smoke test ok.

**Residual risk:** a hand-edited library with one of these values now stops startup instead of loading. The refusal names the rule and the Book id.
