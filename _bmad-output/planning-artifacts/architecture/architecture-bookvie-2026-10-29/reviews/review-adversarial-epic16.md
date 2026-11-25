# Adversarial review: Epic 16 favourite books delta

- **Reviewed:** the uncommitted `ARCHITECTURE-SPINE.md` delta (`git diff -- _bmad-output/planning-artifacts/architecture/`): AD-3 "The favourite star", AD-6 Favourites chip and the ", favourite" spine-name suffix, AD-7 "no optimistic star", AD-13 version 4, AD-18 `favourite` and its paragraph, AD-21 "never registered" and the read-only rule, the tree line, the capability map row and the Deferred entry. Read alongside the full text of AD-3, AD-6, AD-7, AD-13, AD-14, AD-18 and AD-21.
- **Against:** `favourite-books-plan-2026-11-25.md`; EXPERIENCE.md → Favourite star, Spine, Filter chips, Spine popover, Catalog tile; DESIGN.md → Favourite star; the code in `backend/bookvie/domain/model.py`, `store/migrations/__init__.py`, `store/store.py`, `intents/commit.py`, `intents/edit_book.py`, `intents/set_spine_color.py`, `intents/intent_model.py`, `intents/restore_file.py`, `views/models.py`, `agent/read_tools.py`; `frontend/src/lib/catalog.ts`, `lib/catalogFilter.ts`, `lib/useSpinePopover.ts`, `pages/CatalogTiles.tsx`, `pages/CatalogList.tsx`, `pages/Bookcase.tsx`, `pages/HomePage.tsx`, `pages/CatalogPage.tsx`, `components/SpinePopover.tsx`; and the tests `backend/tests/test_cli.py`, `test_model.py`, `test_migrations.py`, `test_intent_routes.py`, `test_contract.py`, `test_agent_write.py`, `test_agent_restore.py`, `agent_client.py`, `frontend/e2e/catalog-list.spec.ts`, `catalog-filter.spec.ts`.
- **Method:** build two units one level down (Stories 16.1 "star a Book" and 16.2 "Favourites chip", or a story and an existing module) that each obey every AD to the letter, then look for the place where they still clash. Each finding names the pair, why the current wording allows it, and the wording that closes it. Safari/Firefox-only behaviour and the reversal of plan D7 are out of scope.
- **Date:** 2026-11-25.

## Verdict

The data side holds: one writer, a whole edit that can't drop the star, and a migration that loses nothing. The holes are in the client. AD-6 says the Favourites chip "follows the same rules" as the other chips, and that phrase matches two different behaviours. The spine also doesn't say which module owns focus and the combined announcement when the chip hides the Book the user just unstarred. Two high findings need spine wording before Story 16.1's ATDD. No critical findings.

## What holds

- **A whole edit can't drop the star (code-verified).** `edit_book` applies `book.model_copy(update=update)` (`intents/edit_book.py:240`). It never builds a fresh `Book`, so a field the form lacks keeps its stored value. Only `add_book` constructs a `Book` (`add_book.py:73`), and AD-18 has it store `false`. The `editForm` parity table (`editForm.cases.json`, `test_edit_form_parity.py`) and `edit_book`'s required keys come from `BookEditForm`, which `favourite` never joins. So the parity test is unaffected. Because `IntentModel` is `extra="forbid", strict=True` (`intent_model.py:39`), an agent that sends `favourite` to `edit_book` or `add_book` gets a refusal. The value is never silently ignored.
- **Every path stays on one migration chain.** `parse_document` → `migrate_document` → `validate_document` is shared by startup and restore (`store.py:168-232`). Every commit re-serializes through the model (`store.py:459`), so the key order a migration step writes never reaches disk. A v3 archive restored into a v4 app comes out with every star off. A v4 archive restored into a v3 app is refused as `restore_newer_version`. Export → restore at v4 stays byte-identical.
- **The no-op is decided under the lock.** `commit()` honours `UNCHANGED` inside `Store.apply` (`commit.py:10`, `store.py:454`), as `side_reads` already does. So "setting the current value is a 200 no-op" and "`book_not_found` checked inside the commit" can both be built without a race.
- **One field reaches every view.** Catalog and Home both use the single `ShelfBook` model (`views/models.py:24`), so a required `favourite` there fills both views. Home's slice is the shared `Bookcase` (`HomePage.tsx:76`), so the spine mark, the popover star and the ", favourite" name come to Home on their own, as EXPERIENCE.md asks.
- **The tile star can't end up inside the link.** The tile is a single `<Link>` with an `aria-hidden` cover (`CatalogTiles.tsx:160-185`). EXPERIENCE.md already puts the star outside it, as "a sibling of the tile's link inside the list item, never inside the link".
- **The exact tool list holds.** `AGENT_TOOL_NAMES` is unchanged because no tool is added, and `find_book`'s `BookCandidate` doesn't carry the field.
- **The List e2e text checks hold.** DESIGN.md makes the star "one SVG star path … No glyph character". So `catalog-list.spec.ts:75`'s exact `toHaveText(['Dune', …])` on the cells still passes, provided the button stays text-free (see L4).

## Findings

### Critical

None.

### High

**H1. "Favourites follows the same rules" can mean two opposite things when the last starred Book is unstarred.** AD-6 says checked values that no Book has any more after a refetch are ignored (`liveFilters`) and then removed from the page's filter state (Epic 15 retro item 105). It then adds "Favourites follows the same rules". Two builds obey that:
- **16.2-A** reads "same rules" literally. With the chip on, the user unstars the last starred Book, the refetch has no Book with `favourite: true`, and the chip is pruned off. The Catalog jumps back to all ~528 Books.
- **16.2-B** treats Favourites like Status and Type. `liveFilters` prunes only Language, Tag and Publisher (`catalogFilter.ts`, `liveFilters`), never the fixed chips. The chip stays on and the Catalog shows "No titles match" or an empty grid.

EXPERIENCE.md leans towards B: focus goes to "else Search titles", and the chip "is shown whenever the catalog has Books, even when none is starred". The spine sentence still allows A, and an ATDD written from the spine would pin A.
*Fix (AD-6):* "Favourites is a fixed chip like Status and Type: `liveFilters` never prunes it, so it stays on when no Book is starred and the views show no match. Favourites follows the other chips' rules on storage, reset, Home's slice and the meter, and 'Clear filters' turns it off."

**H2. Which module owns focus and the announcement when the chip hides the Book just unstarred.** Story 16.1 builds the star flow (the tile, List row and popover buttons, announcing "*Dune* is not a favourite." after the refetch, per AD-7). Story 16.2 builds the chip and `matchesFilters`. With the chip on, unstarring removes the Book's own `li` from view (`hidden`). Two builds that each follow their story clash in three ways:
- **Focus.** 16.1 leaves "focus stays on the button" (EXPERIENCE.md), but the button is now inside a `hidden` `li`, so focus falls to `body`. 16.2 has no hook that runs on someone else's intent.
- **The popover.** The existing `useSpinePopover` closes a popover whose spine went hidden, then focuses its own `fallbackTarget`: the shelf list if it takes focus, else `#main` (`useSpinePopover.ts:109-115`). EXPERIENCE.md wants the next remaining Book in sort order, then the previous one, then Search titles. 16.1 can reuse the module unchanged and contradict EXPERIENCE.md.
- **The announcement.** EXPERIENCE.md wants one combined line, "*Dune* is not a favourite. 11 books match.". AD-6 says each *filter change* announces "N books match.", but an unstar isn't a filter change. 16.1 can announce the star line alone, while CatalogPage's count announcement either stays silent (no filter change) or races it (`lib/announce`'s `isAnnouncing()` drops the second message).

The spine doesn't assign any of the three.
*Fix (AD-6 Filter chips, or AD-7):* "When the Favourites chip hides the Book whose star was just pressed, CatalogPage owns the aftermath. After the refetched views render, it moves focus to the next shown Book in sort order (tile link, row title link or spine), else the previous one, else Search titles. It then announces the star line and `matchCountCopy` as one `status` message. The star flow hands CatalogPage the Book id and the line; it neither focuses nor announces in that case. `useSpinePopover`'s hidden-spine fallback uses the same next/previous rule on Catalog." Also add an ATDD case for unstarring the last remaining Book, which covers H1 and H2 together.

### Medium

**M1. Whether the stored field is required or defaulted is open, and a default invents stars-off.** AD-13 says the v3 → v4 step sets `false`, and AD-18 says `add-book` stores `false`. A natural 16.1 build writes `favourite: bool = False` on `Book`. Every existing `Book(...)` call site then compiles unchanged: `add_book`, `tests/builder.py`, and the Hypothesis strategies in `test_store.py`. The cost is that a v4 `library.json` or restore archive with no `favourite` key on a Book loads as `false` instead of being refused. That breaks AD-13's `extra="forbid"` spirit ("never half-understood"), and AD-14's validation then accepts a damaged archive that drops stars. A second build makes it required, and its tests pin the opposite. Every other `Book` field is required (`model.py:75-96`).
*Fix (AD-18):* "`favourite` is required on the stored Book, with no model default: a v4 document whose Book lacks it is `restore_invalid` and refused at startup. `add-book` sets it explicitly."

**M2. A restore can silently unstar Books, and its preview can't show it.** `preview_restore` reports only `booksAddedSince` and `cardNotesAddedSince` (`restore_file.py:60-69`), and `bookvie-restore` asks the user from that preview. Restoring any older backup unstars every Book starred since, and restoring a pre-Epic-16 backup unstars all of them. The preview can still say nothing is lost. Both pieces obey every AD: AD-13 sets `false`, and AD-22's preview is unchanged. FR-31 makes the star "a verdict about the Book", the kind of data a preview exists to protect.
*Fix (AD-22 or AD-14, as a decision either way):* add `favouritesLost` (titles starred now and not starred, or missing, in the backup) to `RestorePreview` and to the skill's question. Or record an explicit acceptance: "the preview doesn't report stars; a restore can unstar Books (accepted, Epic 16)."

**M3. Tool descriptions are pinned to Epic 12's text, so "agents can read it" can't be advertised without breaking a test.** AD-21 says each registered description equals its text in `epics.md` (Epic 12, or Epic 13 for AD-22's tools), and `tests/agent_client.py` `DESCRIPTIONS` reads them from there. `list_catalog`'s description lists its fields ("title, authors, type, tags, role, current page and percent read"; `read_tools.py:117`). Two builds of 16.1 conflict:
- **16.1-A** updates the `list_catalog` and `get_book` descriptions so agents learn about `favourite` (plan D11, test "Agents (P1)"). The description test fails, because Epic 12's text is unchanged.
- **16.1-B** leaves the descriptions alone, and an agent asked "which of my favourites…" never learns the field exists.

*Fix (AD-21):* say which. Either "Epic 16 changes no tool description; `favourite` is discoverable only in the result", or "Story 16.1 replaces `get_book`'s and `list_catalog`'s descriptions; the text lives in Epic 16 and overrides Epic 12's, as Story 13.3's `export_backup` did".

**M4. `get_home` exposes `favourite` too, which the spine's wording doesn't list.** AD-21 says an agent reads `favourite` "through `get_book` and `list_catalog`". But the home view's shelf is the same `ShelfBook`, and `get_home` returns its view as is, so it carries `favourite` as well. A test written from the spine ("only these two tools expose it", or an exact `get_home` payload) disagrees with a build that follows AD-18 ("the catalog and home views' `ShelfBook` … carry it").
*Fix (AD-21):* "`get_book`, `list_catalog` and `get_home` (through `ShelfBook`) return it."

**M5. The twin rule for ", favourite" differs from the ", on the side" precedent, and only placement makes it true.** Today `spineName` adds ", on the side" inside the name, and `spineNames` finds twins on that full name (`catalog.ts:122-152`). A 16.1 build that adds ", favourite" the same way, inside `spineName`, follows the code's precedent. It also breaks AD-6's "Twins are found on the name without it": starring one twin then un-twins its sibling, so the sibling loses its "edition 1" qualifier. The spine states the outcome but not where the suffix goes, and `spineName` is exported and unit-tested on its own.
*Fix (AD-6):* "`spineNames` appends ', favourite' after its twin rounds, so it is the last part of the name, after ', on the side'. `spineName` never adds it. Every name comes from `spineNames` (bookcase, Home's slice, Tiles)."

### Low

**L1. Tests that pin what the delta changes.** None of these are silent, but 16.1's ATDD should list them so the red phase isn't mistaken for a regression:
- `test_cli.py:695` `test_newer_library_exits_1_without_serving` uses `schemaVersion 4` as "newer" and pins "(3)" in the message. At v4 it would load. It must become `CURRENT_VERSION + 1`, as `test_restore_refusals.py:290` already does.
- `test_model.py:12` (the empty document at 3), `:54`, and `test_store.py:64` pin 3.
- `test_model.py:21` `test_field_order_follows_ad18_and_ad19` pins the Book's exact key order.
- `test_intent_routes.py:158` pins the set of served intent routes (`served == set(INTENT_ROUTES)`).
- `test_contract.py:338-385` lists the error-documented and coverless routes by hand. A missing `set-favourite` entry wouldn't fail; it just goes unchecked.
- `test_agent_write.py:87` `DESTRUCTIVE_TOOL_NAMES` and `test_agent_restore.py:675` probe the never-registered names. `set_favourite` should join both so AD-21's "never registered" is pinned by name, not only by the exact list.
- `frontend/src/styles/tokens.css` must change together with DESIGN.md's new gold (`e2e/app-shell.spec.ts` compares them).

**L2. AD-18 doesn't say where `favourite` sits in the Book.** AD-2 and `model.py:4` make field order the file's key order, and `test_field_order_follows_ad18_and_ad19` pins it. AD-18's sentence lists the fields in a different order from the model ("coverFile, colour fields, favourite, PRD fields"). Two builds can put it in two places, and the test then encodes whichever came first.
*Fix:* "after `spineColor`, before `readings`."

**L3. A non-boolean `favourite` has no refusal shape.** Under the strict `IntentModel`, `"true"` fails Pydantic, so a 16.1 build answers 422 on `intent` (malformed). `set-spine-color`, by contrast, refuses a bad value with 422 on its own field (`set_spine_color.py:44`). Only the web client sends this intent, so this is low.
*Fix:* "a non-boolean `favourite` is the malformed intent on `intent`."

**L4. Nothing in the spine keeps the star button text-free.** DESIGN.md forbids a glyph character. If one slipped in (even `aria-hidden` text), `catalog-list.spec.ts:75`'s exact cell texts and `:40`'s row texts would change. That's DESIGN.md's rule, not the spine's, and is noted here only because the List e2e depends on it.

**L5. A star press triggers a Dropbox upload of an otherwise unchanged library.** The startup migration rewrites `library.json` (`favourite: false` added), which changes `libraryHash`, so the first `bookvie-backup` after the upgrade uploads even though nothing changed. That's harmless and expected (Dropbox keeps 3), but worth one line in the 16.1 notes so it isn't reported as a bug.

**L6. The capability map row leaves out two touched modules.** It omits `views/shelf` (which fills `ShelfBook.favourite` for both the catalog and home views) and Home's slice (the spine mark and the popover star through `Bookcase`). Add both so a reader can tell Home is affected.

## Suggested order

Settle H1 and H2 in AD-6 before Story 16.1's ATDD, since 16.1's star flow and 16.2's chip both depend on them. Fold M1, M3, M4 and M5 into the same spine pass. M2 needs Oleg's decision, a preview field or an accepted gap. The L items can go into 16.1's ATDD checklist.
