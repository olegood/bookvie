# Reconcile review: Epic 16 (Favourite Books) spine update

- **Date:** 2026-11-25
- **Lens:** reconcile. Each input is checked against the spine: what didn't land, and what the spine contradicts.
- **Spine:** `ARCHITECTURE-SPINE.md`, working-tree diff for Epic 16 (frontmatter `binds`/`sources`, AD-3, AD-6, AD-7, AD-13, AD-18, AD-21, the source tree, the capability map, Deferred).
- **Inputs:** `favourite-books-plan-2026-11-25.md` (D1–D12, story cut, tests); PRD FR-31 and the FR-20/FR-28 amendments; EXPERIENCE.md (Favourite star, Filter chips, Spine name ", favourite", Live regions, Flow 15).
- **Excluded by instruction:** D7 (optimistic star with rollback). Oleg overrode it, and the spine's AD-7 records the override.

## Verdict

The update landed cleanly. Every plan decision and every FR-31 consequence that needs a cross-unit rule is in the spine, and nothing in it contradicts the inputs. There are no critical or high findings. Three medium gaps are quiet rules: the AD-9 no-op list, how the Favourites toggle relates to `liveFilters`/`filtersOn`, and the store model's `favourite` being required. A few low items tighten wording.

## Checked against code

- `backend/bookvie/store/migrations/__init__.py`: `CURRENT_VERSION = 3`, `STEPS = {1, 2}`. "Version 4 (Epic 16)" with a 3→4 step is correct.
- `backend/bookvie/domain/model.py:19`: a second constant, `SCHEMA_VERSION = 3`, is used when a new library is created (see L1). The `Book` model is `strict=True, extra="forbid"`, and its field order is the file's key order.
- `backend/bookvie/views/models.py`: `ShelfBook` (line 24) and `BookDetailView` (line 272) exist and neither has `favourite` yet. `BookDetailView.edit_form: BookEditForm` exists, so "never in `editForm`" names a real field. `HomeView.books` and `CatalogView.books` are both `list[ShelfBook]`.
- `backend/bookvie/agent/read_tools.py`: `get_book` → `BookDetailView`, `list_catalog` → `CatalogView`, `get_home` → `HomeView`, `find_book` → `FindBookView`. `AGENT_TOOL_NAMES` in `backend/tests/agent_client.py` is an exact list, so "no tool sets it" is already enforced.
- `backend/bookvie/intents/contract.py:202`: `book_not_found` defaults to 409 from an intent, as the spine says.
- `frontend/src/lib/catalogFilter.ts`: `filtersOn` and `liveFilters` (line 118) exist and handle only the value groups (see M2). The capability-map paths `pages/CatalogTiles`, `pages/CatalogList`, `pages/Bookcase`, `components/SpinePopover` and `pages/BookDetailPage` all exist.

## What landed (no action)

| Input | Spine location |
|---|---|
| D1 `favourite: bool`, default false, migration sets false; FR-31 Backups | AD-13 "Version 4"; AD-18 Book shape and "The favourite" bullet |
| D2 only `set-favourite` writes it, idempotent, `{bookId, favourite}`, Edit form/`edit_book` never touch it; FR-31 "Edits keep the star" | AD-3 "The favourite star" bullet; AD-18 "The favourite" bullet; AD-21 |
| D3 any Book | AD-18 "any Book can have it" |
| D4–D6 where the star shows | Capability map FR-31 row; AD-18 ("Book detail, Tiles, List, the Bookcase, its popover and Home's slice read the same field") |
| D7 override (no optimistic star, no rollback) | AD-7 Rule |
| D8 Favourites chip first, own group for AND, Clear filters turns it off | AD-6 catalog filter chips |
| D9 not remembered, never Home's slice or meter | AD-6 ("Favourites follows the same rules") |
| D10, Out of scope | Deferred "Favourites beyond the Catalog" |
| D11 agents read but can't set; `find_book` doesn't filter | AD-21 |
| D12 Epic 16, FR-31 | frontmatter `binds`; capability map note |
| UX: spine name ends ", favourite"; twins are found on the name without it | AD-6 spine names |
| UX: value sent, never a toggle; a second press repeats the value | AD-3 |
| Multipart body with no file | AD-3 (`set-favourite` added to the list) |

## Findings

### Critical

None.

### High

None.

### Medium

**M1. AD-9's list of no-op intents leaves out `set-favourite`.**
- *Where:* AD-9 Rule, the bullet "An intent that would change nothing is a no-op success… These return 200, change nothing and commit nothing:" (lists `set-up-next`, `mark-side-read`, `unmark-side-read`).
- *Gap:* AD-3 says "Setting the current value is the 200 no-op above", which points back to AD-3's general sentence. AD-9's list is the full list, and the one it ties to `store.UNCHANGED` and the skipped commit, but it doesn't include `set-favourite`. A builder working from AD-9 could commit an unchanged document, which rewrites `library.json` and changes the library hash that the Dropbox "unchanged since last upload" check uses. Or they could treat the no-op as an edit, since AD-9 says "An edit is not a no-op".
- *Fix:* Add "`set-favourite` with the Book's current value (Epic 16)" to AD-9's list. Its change returns `store.UNCHANGED`.

**M2. AD-6 doesn't say how the Favourites toggle relates to `liveFilters` and `filtersOn`.**
- *Where:* AD-6, the catalog filter chips bullet: "Checked values that no Book has any more after a refetch are ignored (`liveFilters`), and once the view is loaded they are also removed from the page's filter state … Favourites follows the same rules".
- *Gap:* "the same rules" comes right after the pruning rule, so it can be read as "prune Favourites when no Book is starred". That contradicts EXPERIENCE.md. With the chip on, unstarring a Book hides it (Favourite star → "With the Favourites chip on"). "Favourites on, nothing starred" shows "No books match these filters.", and the chip is never hidden or disabled (State Patterns, line 449). Pruning would turn the chip off the moment the last star is cleared, and every Book would reappear. Separately, `filtersOn` (`catalogFilter.ts`) decides "Clear filters" and the "No books match these filters." state, and today it counts only the five value groups. The spine doesn't say that Favourites counts as a filter that is on.
- *Fix:* In AD-6, write it out: "Favourites is a boolean, not a value list: `liveFilters` never removes it, so it stays on when no Book is starred; it counts toward `filtersOn` (Clear filters, the 'No books match these filters.' state). 'Favourites follows the same rules' means the page-state rules: never stored, reset on unmount and on add-book, never Home's slice or the meter."

**M3. AD-18 doesn't say that `favourite` is required on the strict store model, or where it goes in the Book's key order.**
- *Where:* AD-18, the `library.json` shape bullet ("`favourite` (a bool; Epic 16)"); AD-13 "Version 4".
- *Gap:* Plan D1 says "default `false`". A builder may write `favourite: bool = False` on `domain/model.Book`. Then a hand-made or half-migrated v4 `library.json` with no `favourite` loads silently, against AD-13's rule that a document is understood fully or refused ("unknown keys are refused, never silently dropped"; "a newer file being half-understood"). The default belongs to `add-book` and to the migration, not to the model. Also, AD-2 says keys are written in model order. The v2→v3 step put `earlierSegments` at its model position on purpose, and the spine doesn't say where `favourite` goes. Separately, the plan's story cut says "the AD-18 invariant", but the spine adds no `check_invariants` rule, and with a strict `bool` the type is the whole rule. If the spine doesn't say so, a story may invent an invariant name.
- *Fix:* In AD-18, write: "`favourite` is a required strict `bool` with no model default (`add-book` writes `false`, the v4 step writes `false`); it sits at <chosen position> in Book's field order, and the 3→4 step inserts it there; its type is its only rule, so `check_invariants()` gains no rule for it."

### Low

**L1. There are two schema-version constants.** `domain/model.py:19` `SCHEMA_VERSION` (used when a new library is created) and `store/migrations` `CURRENT_VERSION` must both become 4. AD-13 names neither. *Where:* AD-13. *Fix:* Add "`domain/model.SCHEMA_VERSION` and `store/migrations.CURRENT_VERSION` move together," or point to the test that asserts they are equal, if there is one.

**L2. AD-21 names only `get_book` and `list_catalog` as the tools that read `favourite`.** `get_home` returns `HomeView.books: list[ShelfBook]`, so it carries `favourite` too. That is harmless and consistent with "views as they are", but the sentence reads as if it lists every such tool. Also, each tool's description is tested against `epics.md`. If Story 16.1 changes `get_book`'s or `list_catalog`'s description to mention the star, `epics.md` must change with it. *Where:* AD-21, the sentence after the never-registered list. *Fix:* "…through every tool that returns a Book view (`get_book`, `list_catalog`, `get_home`)", and add a note that any description change goes through `epics.md`.

**L3. AD-17 doesn't name the star and chip as controls the e2e suite drives by name.** EXPERIENCE.md gives the names "Favourite", "Favourite *Title*" and "Favourites", and requires `exact: true`, because "Favourite" is a prefix of the other two. AD-17 already makes EXPERIENCE's table the source of names, so this is a pointer, not a missing rule. *Where:* AD-17 Binds. *Fix:* Optional: add "the favourite star and the Favourites chip (Epic 16; exact-name lookup)" to Binds.

**L4. The combined announcement "*Dune* is not a favourite. 11 books match." isn't covered by AD-6's count rule.** AD-6 ties the count announcement to "each filter change". Here no filter changes: the result set shrinks because of a save, while a filter is on. AD-7's "announce only after the refetched views have rendered" covers when it is said, and EXPERIENCE.md owns the wording. *Where:* AD-6 filter chips bullet / AD-7. *Fix:* Optional: in AD-6 or AD-7, add "a save that changes the match set while a filter is on appends the count to its announcement (Epic 16)".

**L5. The type of the request's `favourite` field isn't stated.** AD-3 gives `{bookId, favourite}` but doesn't say that a non-boolean (`"true"`, `1`) is a malformed `intent` part (422 `invalid_fields` on `intent`, AD-9). The generic rule probably covers it. *Where:* AD-3 favourite star bullet. *Fix:* Add "`favourite` is a JSON boolean; anything else is the malformed-`intent` refusal (AD-9)."

## Not gaps (presentation EXPERIENCE.md owns)

Where the star sits on the cover and the spine, the outline drawn only on hover or focus, focus order (popover focus, Clear filters focusing the chip, focus after an unstar hides a Book), where the Couldn't-save line goes on Tiles/List, the legend item, colour tokens, and the wording of the announcements. None of these needs a cross-unit contract.
