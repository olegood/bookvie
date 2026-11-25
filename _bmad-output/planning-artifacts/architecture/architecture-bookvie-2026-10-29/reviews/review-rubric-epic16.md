# Rubric review: Epic 16 delta (favourite books)

Scope: the Epic 16 diff to `ARCHITECTURE-SPINE.md` (uncommitted, 2026-11-25), judged against `favourite-books-plan-2026-11-25.md` D1–D12, PRD FR-31, EXPERIENCE.md → Favourite star and Filter chips, and the code as of `3efee03`. Two lenses: rubric and freshness.

## Checklist

| Criterion | Verdict |
| --- | --- |
| Fixes the real divergence points for 16.1 and 16.2 | Mostly. The single writer (AD-3/AD-18), set-not-toggle, the migration (AD-13), whole edits keeping the star (AD-18), the shared view field (ShelfBook and the book view), the twin-safe spine name (AD-6), no optimistic star (AD-7) and the agent read-only rule (AD-21) are all pinned. Two gaps remain: how Favourites interacts with `liveFilters` and `filtersOn` (R-H1), and whether `favourite` has a model default (R-M2). |
| Every amended Rule enforceable and prevents its stated divergence | Yes. Each can be tested: the exact tool list (`AGENT_TOOL_NAMES`), the migration contiguity test, a pytest that `edit-book` and `edit_book` keep the star, a unit test of `spineNames` with a starred twin, and an e2e test of the chip. The exception is AD-6's "Favourites follows the same rules", which can't be tested until it says which rules (R-H1). |
| Nothing under Deferred lets two units diverge | Yes. Nothing in the Deferred entry is built, so no two units can read it differently. One wording issue: a decided prohibition is filed as deferred (R-L5). |
| Ratifies, not contradicts, existing code | Yes. `migrations.CURRENT_VERSION` and `domain.model.SCHEMA_VERSION` are both 3, and `test_migrations.py:25` asserts they are equal, so "version 4" is the next contiguous step. `Book`/`IntentModel` are `extra="forbid", strict=True`, so the migration is required and a non-bool `favourite` is a 422. `edit_book` updates with `model_copy(update=...)` (`edit_book.py:240`), so leaving `favourite` out of the form keeps it, as AD-18 says. `HomeView.books` and `CatalogView.books` are both `list[ShelfBook]`, as "the catalog and home views' ShelfBook" says. `book_not_found()` defaults to 409 from an intent (`contract.py:202`). `spineName` appends ", on the side" after the status, so ", favourite" at the end fits. `get_book` and `list_catalog` return `BookDetailView` and `CatalogView` unchanged (`read_tools.py:64–69`). |
| Consistent with the spine's style | Mostly. It is terse and cites Epic 16 and the plan's D-numbers. AD-7's opener mixes a feature rule into the general rule (R-L4). |
| Freshness: no new technology | Confirmed. The delta names no library, tool or version. It uses Pydantic, `openapi-typescript` (via AD-8) and React state only as they already exist. |
| Freshness: every path exists or is marked as Epic 16's | Yes, with one exception. These exist: `store/migrations`, `views/models`, `lib/catalog`, `lib/catalogFilter`, `components/FilterChips`, `components/SpinePopover`, `pages/CatalogTiles`, `pages/CatalogList`, `pages/Bookcase` and `backend/tests/agent_client.py` `AGENT_TOOL_NAMES`. `intents/set_favourite` and `POST /api/intents/set-favourite` are new, and AD-3 ("Epic 16") and the map's preamble ("except FR-31, which Epic 16 builds") mark them as such. The exception: "the star on Book detail" names a screen, not the module `pages/BookDetailPage` (R-L1). |

## Findings

### Critical

None.

### High

**R-H1. AD-6 "Favourites follows the same rules" is ambiguous where it matters: `liveFilters` and `filtersOn`.**
*Location:* AD-6, the catalog filter chips bullet, last sentence ("Favourites follows the same rules, and "Clear filters" turns it off").
That sentence comes right after two rules. The first is the `liveFilters` rule: checked values that no Book has any more are ignored and then removed from page state. The second is the page-state rule. Suppose a builder reads "same rules" as including `liveFilters`, so Favourites drops when no Book is starred. Then unstarring the last starred Book with the chip on turns the chip off and shows the whole catalog. That contradicts EXPERIENCE.md, which says "Favourites on, nothing starred" shows "No books match these filters." and the chip is never hidden. It also breaks the focus rule for unstarring while the chip is on. The current `filtersOn` and `liveFilters` (`catalogFilter.ts:103`, `:118`) only know the array groups. Today's code doesn't settle the question: 16.2's build has to add the boolean to both of them, or deliberately leave it out of one.
*Fix:* replace the sentence with: "Favourites is page state like the other chips (never stored, reset with them, never applied to Home's slice or the meter). `filtersOn` counts it, and "Clear filters" turns it off. `liveFilters` never drops it, so with nothing starred it stays on and shows the no-match state."

### Medium

**R-M1. AD-9's list of 200 no-ops doesn't include `set-favourite`.**
*Location:* AD-9, "An intent that would change nothing is a no-op success" (the list of `set-up-next`, `mark-side-read` and `unmark-side-read`); the new AD-3 bullet "Setting the current value is the 200 no-op above".
AD-9's list reads as complete, and it is where the `store.UNCHANGED` mechanism and the check order are stated (for example, "checked before `side_reads_full`"). The new AD-3 bullet points to AD-3's general sentence instead. A builder who follows AD-9 could commit an unchanged star, which rewrites `library.json` and changes the library hash the Dropbox backup compares. The order of `book_not_found` and the no-op check isn't stated either.
*Fix:* add to AD-9's list: "`set-favourite` with the Book's current value (Epic 16), checked after `book_not_found`". Point AD-3's bullet at AD-9.

**R-M2. The spine doesn't say whether `favourite` has a model default.**
*Location:* AD-18, the `library.json` bullet ("`favourite` (a bool; Epic 16)") and the new favourite bullet.
The memlog decision says the field is "required in the store model like every field, no default". Plan D1 says "default `false`". The spine says neither. A `= False` default on `domain.model.Book` would let a v4 document without the key pass `validate_document`, so a broken or skipped step-3 migration would go unnoticed. A default on `ShelfBook` or `BookDetailView` would let `views/shelf.py:55` forget to map it, and every Book would show as unstarred. Both are silent divergences that the field's strictness would otherwise catch.
*Fix:* in AD-18, write "`favourite` (a required bool with no model default; `add-book` writes `false`; Epic 16)". In the views sentence, add "required on `ShelfBook` and the `book` view".

### Low

**R-L1. The FR-31 map row leaves out modules that 16.1 changes, and names one screen instead of its path.**
*Location:* Capability → Architecture Map, FR-31 row.
The row lists `store/migrations` and `views/models`, but it leaves out:
- `domain/model` (`Book.favourite`, `SCHEMA_VERSION` to 4);
- `intents/add_book` (stores `false`);
- `views/shelf`, which builds `ShelfBook` and the `book` view (the FR-4 and FR-25 rows list it);
- the route in `http/api`.

It also says "the star on Book detail", where the other entries give a path.
*Fix:* add `domain/model` (`Book.favourite`, `SCHEMA_VERSION`), `intents/add_book` (`false`), `views/shelf` and `http/api`, and write `pages/BookDetailPage`. Optionally add "(Catalog and Home's slice)" after `pages/Bookcase`, since EXPERIENCE.md puts the mark on both.

**R-L2. The "Governed by" column of the FR-31 row leaves out ADs that the delta relies on.**
*Location:* the same row, last column.
The delta relies on AD-9 (409 `book_not_found` and the no-op), AD-14 (an older backup restores through the chain, which the AD-13 bullet promises) and AD-17 (the star's stable names, which e2e drives with `exact: true`).
*Fix:* make the column "AD-3, AD-6, AD-7, AD-8, AD-9, AD-13, AD-14, AD-17, AD-18, AD-21".

**R-L3. The spine name's ending doesn't say where it goes relative to ", on the side".**
*Location:* AD-6, the spine names bullet.
"Ends with ', favourite', after the status" implies it comes after ", on the side", but `spineName` treats ", on the side" as the status's tail. A reader could put ", favourite" between the two.
*Fix:* write "ends with ', favourite', after the status and any ', on the side'". Optionally give an example: "Dune by Frank Herbert, waiting for you, page 120, on the side, favourite".

**R-L4. AD-7's Rule now opens with a rule for one feature.**
*Location:* AD-7 Rule, its first three sentences.
The general rule ("No optimistic updates. View queries are keyed…") now has a favourite-specific clause and a supersession note in the middle of it. Elsewhere in AD-7, feature cases are their own bullets (Last-page start, Carried Card notes search).
*Fix:* keep "No optimistic updates." as it was. Move the rest into a bullet: "**The favourite star** (FR-31; Epic 16): changes only once `set-favourite` succeeds and the views have refetched; a failure leaves it as it was. Supersedes favourite plan D7 (Oleg, Epic 16 UX update)."

**R-L5. The Deferred entry files a decided prohibition as deferred.**
*Location:* Deferred, "Favourites beyond the Catalog".
"No agent tool that sets the star" is already a rule in AD-21, which says `set-favourite` is never registered and a test pins the tool list. Listing it under Deferred suggests it could come later. The entry's own last clause ("would reverse FR-31") says it is a Won't.
*Fix:* drop "no agent tool that sets the star" from the list, and drop the clause "a tool that sets it would reverse FR-31". AD-21 already covers both. Keep the rest, which really is deferred.

**R-L6. AD-18's favourite bullet opens with rationale.**
*Location:* AD-18, "**The favourite** is the user's verdict on a Book, not a tag, and any Book can have it."
"The user's verdict, not a tag" restates the PRD's glossary. "Any Book can have it" is the one rule in the sentence, and it matters, because no invariant may tie `favourite` to status.
*Fix:* "**The favourite:** any Book can have it, whatever its status; no invariant ties it to Readings or pointers." Leave the rest as it is.

## Not findings (checked)

- **Key order after the migration.** The step from 2 to 3 placed `earlierSegments` in the order the model writes. For `favourite`, order is cosmetic, because the store validates the migrated document into `Library` and commits it through the model (`store.py` `_migrate` and `validate_document`). No rule is needed.
- **The two version constants.** `test_migrations.py:25` asserts `SCHEMA_VERSION == CURRENT_VERSION`, so bumping only one fails the tests.
- **A stale Edit panel in another tab undoing a star.** It can't happen: `favourite` is never an Edit form field, so the "last intent wins for every field it sends" rule in AD-3's Concurrency doesn't reach it.
- **Tool descriptions.** `get_book` and `list_catalog` keep their descriptions as written in `epics.md`. Nothing requires them to mention `favourite`.
