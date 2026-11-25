---
title: Catalog Publisher filter — plan
status: agreed
created: 2026-11-25
source: party-mode session (Mary, John, Sally, Winston, Amelia, Murat) with Oleg
idea: GitHub issue #4 → "Catalog grouping by author, publisher or year"
---

# Catalog Publisher filter — plan

Let Oleg see one publisher's shelf, "everything from Manning", in the Catalog. A **Publisher ▾** filter chip next to Language and Tag opens a checkbox list of the library's publishers, the biggest first, each with its Book count. It filters the bookcase, the List and the Tiles like every other chip.

Issue #4 asked for **grouping** (section headings) by author, publisher or year. The session narrowed it down: the job Oleg has is one shelf, which is a filter, so there's no grouping.

## 1. What already exists

- **The catalog view has no publisher.** `ShelfBook` (`backend/bookvie/views/models.py`, `schema.d.ts`) carries `authors`, `firstAuthor`, `year`, `edition`, `type`, `language` and `tags`, but not `publisher`. The publisher is only on the Book form and Book detail.
- **Publisher is always present.** `book_fields.py:153` requires it, and the spine's invariants (`book_publisher_required`, `book_publisher_trimmed`) keep it non-blank and trimmed. The issue's "Unknown" group can't happen.
- **Filters are never remembered.** `catalogFilter.ts:4` and EXPERIENCE.md → Filter chips: chips are page state only. The issue's "remember the choice in local storage like FR-25" doesn't apply to a filter.
- `lib/catalogFilter.ts`: `filterValues()` builds the Language and Tag lists (each value once, keyed by `toLocaleLowerCase`, first spelling as the label, **collator A–Z**). `matchesFilters()` ORs within a group and ANDs across groups and with Search titles. `liveFilters()` drops checked values that no Book has any more.
- `components/FilterChips.tsx`: `list(field, label, values)` renders a popup chip of checkboxes. The popup has no search field.
- The library on 2026-11-25 (Mary): 528 Books, **79 publishers, 49 of them with exactly one Book**. The biggest: O'Reilly Media 84, Leanpub 64, Independently published 61, Pragmatic Bookshelf 55, Manning 49, Addison-Wesley Professional 48, Packt Publishing 35. There are no spelling variants of one publisher to merge.

## 2. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **A filter, not grouping.** A **Publisher ▾** chip in the Catalog filter row. There are no section headings in any view. | Oleg: the job is "everything from one publisher, like a Manning shelf". Winston: a filter shows one shelf, and the three views stay as they are. |
| D2 | **Author and year are closed**, not filed. | Oleg's call (John over Mary). Author: 349 of 421 first authors have one Book, so author headings are mostly one Book each, and the Author sort already keeps an author's Books together. Listing a multi-author Book under each author would duplicate covers and break the count (Murat). |
| D3 | **The chip sits after Tag:** Status, Type, Language, Tag, Publisher. Its popup is a checkbox list like Language and Tag, with no search field. | Same component (`list(...)` in `FilterChips.tsx`). Murat: 79 rows ordered by count is fine for one user. |
| D4 | **The list is ordered by Book count, the biggest first.** Publishers with the same count go A–Z with the Catalog collator. | Oleg's call (Sally). His shelf is at the top of the list, not after "Apress". |
| D5 | **Each row shows the publisher's Book count in the whole library**, e.g. "Manning 49". The count ignores the other chips and Search titles, so neither the numbers nor the order change while Oleg filters. | Oleg's call (Winston and Murat over Sally's live count). A list that reorders under the cursor is worse. Language and Tag keep showing no counts. |
| D6 | **Matching works like Language and Tag:** ignoring case, keyed by `toLocaleLowerCase`, and the label is the first spelling in library order. Within Publisher the values combine with OR; with the other groups and Search titles, AND. `liveFilters` also drops checked publishers that no Book has any more. "Clear filters" clears it. | One rule for every list chip (AD-6). Murat: "Manning + O'Reilly" must show both, not nothing. |
| D7 | **`publisher` is added to `ShelfBook`** as stored, in Python first, then `api:gen` (AD-8). | The client builds its lists from the catalog view's Books, as it does for Language and Tag. |
| D8 | **Not remembered, not exported**, and never applied to Home's slice or the "X of Y finished" meter, like every other chip. | EXPERIENCE.md → Filter chips. |
| D9 | **An epic, not a standalone spec.** | Oleg's call (over John and Amelia's spec). |

Out of scope:
- **The publisher on Book detail as a link** to the filtered Catalog (Sally). Left for later. It needs the Catalog to read filters from the URL (`?publisher=`), and today chips are page state only (Amelia).
- A Publisher filter on the MCP `list_catalog` tool.
- A search field inside the chip popups.

## 3. Changes, in order

Each step is its own skill run, in a fresh context. Docs and planning commits go straight to master.

| Step | Artifact | Change | Skill |
|---|---|---|---|
| 0 | Spine | Before Epic 15's first story: confirm `deferred-work.md` has no unresolved "spine drift" entries from Epic 14 (AGENTS.md → Architecture spine). | — |
| 1 | EXPERIENCE.md | **Filter chips** row: add **Publisher ▾** after Tag (D3), its list ordered by count with each publisher's library count (D4, D5), and the matching rule (D6). Name each row's accessible text, e.g. "Manning, 49 books". | `bmad-ux` (update) |
| 2 | DESIGN.md | The count in a filter-list row: its type style (`body-sm`, muted) and where it sits (after the label). No new tokens expected. | `bmad-ux` (update) |
| 3 | PRD | **FR-20** Filter chips consequence: add Publisher, ordered by count with library counts. An amendment, not a new FR. Bump `updated:`. | `bmad-prd` (update) |
| 4 | Architecture spine | AD-6's filter-chips bullet: Publisher, its count order and library counts. Capability map row FR-4/FR-20: `ShelfBook`'s `publisher`. Not a new AD. | `bmad-architecture` (update) |
| 5 | Epics (`epics.md`) | New **Epic 15: See one publisher's shelf**, covering the FR-20 amendment, with the two stories below. Add it to the Epic List and the FR coverage map. | `bmad-create-epics-and-stories` |
| 6 | Sprint status | Add Epic 15 and Stories 15.1 and 15.2. | `bmad-sprint-planning` |
| 7 | Stories 15.1, 15.2 | Each: ATDD → `bmad-build-auto` → `bmad-code-review` (new session) → `bmad-testarch-automate` (AGENTS.md → Story pipeline). Then the Epic 15 retro, since 15.2 closes the epic. | per story |
| 8 | Issue #4 | A summary comment linking this plan. Retitle it to "Catalog Publisher filter". Close it when Epic 15 is done. | — |

## 4. Story cut (Epic 15)

Two stories: Oleg's call (John over Amelia and Winston's one), as Epic 14 split out `spineColor` in 14.1.

**15.1 The catalog view carries the publisher.** D7:

- `views/models.py` `ShelfBook.publisher`, filled in `views/shelf.py`; `npm --prefix frontend run api:gen`; the `ShelfBook` fixtures in frontend tests and e2e gain `publisher`.
- Spine: the capability map row FR-4/FR-20 names `ShelfBook`'s `publisher` (step 4 lands it before the story).
- No visible change.

**15.2 Filter the catalog by publisher.** D1, D3–D6, D8:

- `lib/catalogFilter.ts`: `CatalogFilters.publishers`, `NO_FILTERS`, `FilterableBook.publisher`, the match in `matchesFilters`, and `liveFilters` for publishers. A new `publisherValues()` returns each value with its library count, ordered count-desc, then collator A–Z.
- `components/FilterChips.tsx`: a Publisher list chip after Tag whose rows show the count.
- `pages/CatalogPage.tsx`: builds the publisher list from all the catalog's Books (not the filtered ones).

## 5. Tests

Murat's risks, for the ATDD:

- **Filter** (P0): checking Manning shows exactly the Manning Books in the bookcase, the List and the Tiles, and the others close up. Checking Manning and O'Reilly shows both (OR). Publisher plus Unread plus a Search title ANDs.
- **Order and counts** (P0): the list is ordered by library count, the biggest first, with ties A–Z. Each row shows its library count. Turning on other chips or typing a search changes neither the counts nor the order (D5).
- **Case** (P1): "manning" and "Manning" are one row whose label is the first spelling in library order, and checking it matches both.
- **Live** (P1): when the last Book of a checked publisher is edited to another publisher, the stale check is dropped (`liveFilters`) and the catalog isn't left empty.
- **Clear and announce** (P1): "Clear filters" clears Publisher. The status region announces "N books match." The closed chip reads "Publisher: 1" when one value is checked, like Language and Tag.
- **Not remembered** (P1): a reload, or adding a Book, resets the chip. Home's slice and the finished meter ignore it. Nothing about it appears in an export.
- **API** (P1, story 15.1): `ShelfBook.publisher` equals the stored, trimmed publisher; `check:api` stays green after `api:gen`.
- **Unchanged** (P1): the existing catalog-filter specs pass with Publisher untouched.
