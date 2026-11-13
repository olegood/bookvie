---
title: 'Reconcile the architecture spine with as-built Epic 8'
type: 'chore'
created: '2026-11-13'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 8 deferred three "spine drift" entries to `deferred-work.md`, and none of them edited the spine (Epic 8 retro F-S1, sprint item `epic-8-retro-item-61-…`). The entries are `:948`, `:964` and `:970`, plus `:958`, a wrong URL in the epic context that was to be fixed in the same pass. They name these gaps:
- **AD-6:** the Tiles bullet still says "Epic 8, planned". It gives the cover as `/media/covers/<coverFile>`, although `coverFile` is the stored `covers/<name>` served at `/media/<coverFile>`. It says nothing of story 8.3's typeset cover, its read = `finished` rule, or the failed-cover fallback.
- **Structural Seed:** `lib/catalogView` lists only Bookcase · List, and `pages/CatalogTiles` isn't named.
- **Capability Map:** the FR-25 row is marked "planned, Epic 8; not built" and names "a new tiles grid page component".
- **Deferred → Cover thumbnails:** doesn't record that Epic 8's speed check passed.
- **`epic-8-context.md`:** the Covers line repeats the `/media/covers/<coverFile>` URL.

**Approach:**
- Edit `ARCHITECTURE-SPINE.md` so AD-6, the Seed, the map row and the Deferred entry state what the code does, citing the stories that decided it, as items 44, 52 and 57 did.
- Fix the context line.
- Close each entry with a `resolved:` line.
- No code changes. Oleg reviews the spine diff before it's final. Sprint item 61 is marked `done` only after that.

</frozen-after-approval>

## Implementation Notes

- **Count:** three open drift entries from Epic 8 (`deferred-work.md:948`, `:964`, `:970`) and the context-URL entry (`:958`), all closed with a `resolved:` line. A case-insensitive scan finds no other "spine drift" entry without one. The only remaining match is the known non-drift mention item 52 already noted: 6.4's OpenAPI docstring entry.
- **Spine** (`ARCHITECTURE-SPINE.md`, `updated` already 2026-11-13). Each statement was checked against the code: `pages/CatalogTiles.tsx` and `CatalogTiles.module.css` (grid packing, `hidden`, `Ribbon` from `finished`, `ReadingBar` from `percent`, `TypesetCover` read/unread, `failed` → typeset), `lib/bookDetail.ts:74-77` (`coverSrc` → `/media/<coverFile>`), `views/models.py` `ShelfBook.cover_file`, and `lib/catalogView.ts`:
  - **AD-6:** the Tiles bullet loses "planned". It names `pages/CatalogTiles.tsx` and stories 8.1 to 8.3, and gives the cover as `/media/<coverFile>`. It adds the typeset cover and the failed-cover fallback, which apply in Tiles only; the Main book card, the Up next thumbnail and Book detail keep the placeholder.
  - **Seed:** `catalogView` remembers Bookcase · List · Tiles. The `pages/ components/` comment names Catalog's three view pages and `ViewToggle`.
  - **Map:** the FR-25 row is built and names `lib/catalog` (`tilesName`, `spineNames`) and `pages/CatalogTiles`. The intro "except a row marked planned" is dropped, since no row is planned now.
  - **Deferred → Cover thumbnails:** records the AC-10 result (median 58 ms, zero layout shift; story 8.1) and keeps the revisit trigger.
- **Not edited:**
  - **AD-12:** "Covers are served at `/media/covers/<file>`" uses the bare file name, so it is already right.
  - **AD-15:** its Binds line already names Bookcase · List · Tiles.
  - **The FR-21 row:** its `/media/covers` is the route, which is also right.
  - **Story 8.1's spec:** its Code Map has the same URL, but the spec is a closed story record and stays as written.
- **`.memlog.md`:** one event line added.
- **No code changes.** The tests that read the spine (`test_layers.py`, `test_stack_pins.py`, `test_home_slice.py`, `test_ordering.py`) passed 105 of 105.
- **Sprint item 61 stays `open`** until Oleg approves the spine diff. Then it is marked `done` with `sprint_status.py --set-action-status` in the same commit.
