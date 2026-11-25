---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-25'
storyId: '16.1'
storyKey: '16-1-star-a-book'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-161-star-a-book'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-16-1-star-a-book.md'
generatedTestFiles:
  - 'backend/tests/test_favourite.py'
  - 'backend/tests/builder.py (as_v3 added; as_v2 and as_v1 unchanged)'
  - 'backend/tests/helpers.py (SET_FAVOURITE, post_set_favourite)'
  - 'frontend/e2e/favourite-star.spec.ts'
  - 'frontend/e2e/favourite.ts (new: favouriteStar, starShape, starDrawn, spineMark)'
  - 'frontend/e2e/library.ts (FAVOURITE, FAVOURITE_DARK, Box, firstLineRect, rowHeightWithout, pressOnceThen)'
  - 'frontend/e2e/intents.ts (SET_FAVOURITE, starBook)'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 16 intro, gate, "Before Story 16.1", out of scope; Story 16.1; AR67–AR73, UX-DR95–UX-DR102)'
  - '_bmad-output/planning-artifacts/favourite-books-plan-2026-11-25.md (D1–D12, §5 tests)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-3 set-favourite, AD-6 spine names, AD-7, AD-13 version 4, AD-18 favourite, AD-21)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (components.favourite-star, Colors → Favourite gold, Forced colors, Favourite star, Spine → Favourite mark, Bookcase legend) and EXPERIENCE.md (Favourite star, Spine popover, Names, Live regions, Couldn''t save)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (epic-16, 16-1 backlog) and deferred-work.md (no unresolved spine drift)'
  - '_bmad-output/test-artifacts/atdd-checklist-15-1-carry-the-publisher-in-the-catalog-view.md and atdd-checklist-15-2-filter-the-catalog-by-publisher.md (format)'
  - '_bmad/tea/config.yaml'
  - 'backend/bookvie/domain/model.py, store/migrations/__init__.py, intents/set_spine_color.py, intents/intent_model.py, views/models.py'
  - 'backend/tests/builder.py, helpers.py, agent_client.py, conftest.py, test_migrations.py, test_set_spine_color.py, test_intent_routes.py, test_agent_edit_form.py, test_agent_write.py, test_full_data_round_trip.py'
  - 'frontend/e2e/fixtures.ts, library.ts, intents.ts, tiles.ts, bookcase.ts, catalog-filter.ts; frontend/src/styles/tokens.css'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given a library.json at schemaVersion 3, at startup or inside a restored backup, when bookvie loads it, then the migration chain takes it to version 4 with favourite: false on every Book, startup keeps library.v3.bak.json, and no Book is starred (AR67); store/migrations CURRENT_VERSION and domain/model SCHEMA_VERSION are both 4, and the chain test still proves it contiguous from 1; a version 4 library.json or archive with a Book missing favourite is refused (restore_invalid on restore; startup exits non-zero with nothing changed).' }
  - { id: AC-2, idSource: generated, text: 'Given a Book, when POST /api/intents/set-favourite sends {bookId, favourite: true}, then the Book is stored with favourite: true, the response is the usual 200, and every view shows it after the refetch; {favourite: false} stores false; sending the value the Book already has is a 200 no-op that writes nothing (byte-identical, AR68); a deleted Book is 409 book_not_found before the no-op check, and a body missing favourite or with a non-boolean value is 422 invalid_fields on that field, with nothing changed; the intent satisfies the standard intent ACs (TR8).' }
  - { id: AC-3, idSource: generated, text: 'Given a starred Book, when it is edited with the Edit book panel''s Save changes, or with the edit_book tool sending get_book''s editForm unchanged or with a new title, then it is still starred; the book view''s editForm has no favourite key and edit_book''s input schema has none either (AR68); a Book added with add-book or add_book is stored with favourite: false; start, page update, pause, finish, Up next, Side read, Purpose, Card note and spine color intents leave favourite as it was.' }
  - { id: AC-4, idSource: generated, text: 'Given a library with starred Books, when it is exported and restored, then every star comes back exactly (FR-22, FR-23).' }
  - { id: AC-5, idSource: generated, text: 'Given the fields added in Python, when npm --prefix frontend run api:gen runs, then schema.d.ts gives ShelfBook and BookDetailView a required favourite: boolean, check:api passes, and frontend and e2e fixtures carry favourite through the shared builders (backend/tests/builder.py defaults it to false) (AR69); the existing tests the Epic 16 gate names for Story 16.1 are updated as it says, and no others change.' }
  - { id: AC-6, idSource: generated, text: 'Given an agent in Claude Code, when it calls get_book, list_catalog or get_home, then each Book carries favourite as stored, and no tool''s description or arguments change (AR73); the tool list is unchanged: there is no set_favourite tool, and calling one by that name is refused like set_spine_color (set_favourite joins the never-registered names in test_agent_write.py DESTRUCTIVE_TOOL_NAMES, test_agent_mount.py:480 and test_agent_restore.py:675); find_book''s results don''t carry favourite.' }
  - { id: AC-7, idSource: generated, text: 'Given Book detail for an unstarred Book, when it renders, then a plain icon button named exactly "Favourite" with aria-pressed="false" follows the h1 on its first line, showing an outline star, and the icon is aria-hidden (UX-DR95, UX-DR96); when I press it, then once the save succeeds and the views have refetched, it shows the gold star with aria-pressed="true" and status announces "*Dune* is a favourite."; pressing again unstars it and announces "*Dune* is not a favourite." (UX-DR102); nothing changes on screen before the save succeeds, there is no optimistic star (AR72); the button is never disabled, and a second press before the refetch sends the same value again, which changes nothing.' }
  - { id: AC-8, idSource: generated, text: 'Given the save fails (a routed 503 or bookvie stopped), when I press the star, then it stays as it was and alert says "Couldn''t save. Your data wasn''t changed." under the title row on Book detail or in an open Spine popover, or once under the filter row on Tiles and List or when the popover has closed; the line is emptied at the next save attempt or filter change, and focus stays where it was (UX-DR102, TR9).' }
  - { id: AC-9, idSource: generated, text: 'Given the Catalog in Tiles view with one starred and one unstarred Book, when it renders, then the starred tile shows a gold star with its paper halo at the 2:3 cover box''s top left, never over the finished ribbon, and the unstarred tile shows no star (UX-DR98); when the pointer is over the unstarred tile, or focus is inside it, then its outline star is drawn at once, and it hides again when both leave; each star is a button named exactly "Favourite *Title*", a sibling after the tile''s link in the list item, so Tab goes tile link, then its star, then the next tile''s link; Enter or Space on it stars or unstars as on Book detail.' }
  - { id: AC-10, idSource: generated, text: 'Given the Catalog in List view, when it renders, then each row''s title cell holds the title link, then the star button named "Favourite *Title*", with the same starred and hover-or-focus rules as tiles, and the row is no taller than before (UX-DR99).' }
  - { id: AC-11, idSource: generated, text: 'Given the Bookcase on Catalog and Home''s slice, when a Book is starred, then its spine shows the paper square with the gold star at its foot, also over a Main book''s fill and next to any marker dot; the mark is not a control; the spine''s accessible name and the tile''s name end with ", favourite" after the status (UX-DR100, AR71); twins are told apart on the name without ", favourite", so starring one twin changes no other Book''s name; the bookcase legend always shows a "favourite" item, a mini paper square with the gold star, even when nothing is starred.' }
  - { id: AC-12, idSource: generated, text: 'Given a spine''s popover, when it opens, then a button named exactly "Favourite" sits right after the title, first in the popover''s DOM; focus on open still goes to the primary action, else the first link, never the star; Shift+Tab from that control reaches the star, and Shift+Tab from the star closes the popover and returns focus to the spine (UX-DR97); pressing the star stars or unstars the Book, and the spine mark shows or hides after the refetch.' }
  - { id: AC-13, idSource: generated, text: 'Given DESIGN.md''s gold, when this story lands, then favourite (#9A7120) and favourite-dark (#D2A54E) move from {components.favourite-star}''s literals into DESIGN.md''s colors and tokens.css in the same change, and e2e/app-shell.spec.ts''s token comparison passes (UX-DR101); gold fills only the star, a Reading''s rating stars stay sage; under forced colors every star uses forced-color-adjust: none with a CanvasText fill (starred) or stroke (unstarred), on a Canvas halo or square on covers and spines.' }
  - { id: AC-14, idSource: generated, text: 'Given a starred Book, when I look at Home''s slice and the "X of Y finished" meter, then only the spine mark is new; the slice''s choice of rows and the meter''s numbers don''t change.' }
---

# ATDD Checklist: Story 16.1 Star a Book

## Preflight

- **Branch:** `master` at `7e8d3e6`, clean. Story steps don't change branches (AGENTS.md → Story pipeline), so this run stays on `master` and leaves its files uncommitted. Oleg decides where the story's branch is cut.
- **Stack:** `fullstack`, auto-detected. pytest (`backend/tests/conftest.py`) and Playwright (`frontend/playwright.config.ts`, Chromium only) are in place.
- **Story:** `epics.md` Story 16.1 has 14 Given/When/Then criteria with no ids. They are numbered AC-1 to AC-14 in source order (registry above). Each "And" line, and a second When/Then under the same Given, belongs to the criterion above it.
- **Epic gate:** 16.1 is Epic 16's first story. `deferred-work.md` has no unresolved "spine drift" entry (checked in this run: every entry naming spine drift has a `resolved:` line). `sprint-status.yaml` reads `backlog` for `epic-16` and `16-1-star-a-book`.
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns), no Pact, `tea_browser_automation: auto`.
- **What exists today:**
  - `Book` (`domain/model.py:75`) has no `favourite`, and `_Model` forbids extra keys, so no seed can carry `favourite: true` before the build. Every red leaf stars a Book through `POST /api/intents/set-favourite` as an unasserted setup call (404 today), then asserts.
  - `CURRENT_VERSION = 3` (`store/migrations/__init__.py:11`), `SCHEMA_VERSION = 3` (`domain/model.py:19`). The builder writes version 3; `as_v2` and `as_v1` derive the older shapes from it.
  - `set-spine-color` (`intents/set_spine_color.py`) is the closest intent: JSON `intent` part, 409 `book_not_found` inside the commit. A malformed part is 422 on `intent` (`parse_form_intent`). AC-2 asks for 422 on `favourite` instead (see Test Strategy).

## Generation Mode

**AI generation.** The pytest leaves are written in this session; the e2e leaves by one subagent (step 4B), briefed with the registry, the strategy and the project's rules, then checked here. Selectors come from EXPERIENCE.md's names (`Favourite`, `Favourite *Title*`, `, favourite`), not from a recording: the star doesn't exist yet.

## Test Strategy

| AC | Level | Priority | Leaf | First assertion (the criterion) |
|---|---|---|---|---|
| AC-1 | Store + API (pytest) | P0 | `test_favourite.py:102` | after `Store.open` on a v3 file, `library.json`'s `schemaVersion` is 4 |
| AC-2 | API (pytest) | P0 | `test_favourite.py:162` | `set-favourite` with `true` answers 200 |
| AC-3 | API + agent (pytest) | P0 | `test_favourite.py:240` | after a web `edit-book` with a new title, the stored Book's `favourite` is `True` |
| AC-4 | API (pytest) | P0 | `test_favourite.py:303` | after export then restore into another folder, the stored stars equal the starred set |
| AC-5 | Contract (pytest reads `schema.d.ts`) | P1 | `test_favourite.py:325` | `"favourite: boolean;"` in `schema.d.ts`'s `ShelfBook` block |
| AC-6 | Agent (MCP) | P1 | `test_favourite.py:346` | `get_book`'s result carries `favourite: True` for the starred Book |
| AC-7 | E2E | P0 | `favourite-star.spec.ts:84` | Book detail has a button named exactly "Favourite" with `aria-pressed="false"` |
| AC-8 | E2E (routed 503) | P1 | `favourite-star.spec.ts:156` | after a press with `set-favourite` routed to 503, `alert` says "Couldn't save. Your data wasn't changed." |
| AC-9 | E2E | P0 | `favourite-star.spec.ts:230` | the starred tile's list item holds a button named exactly "Favourite *Title*" with `aria-pressed="true"` |
| AC-10 | E2E | P1 | `favourite-star.spec.ts:306` | the List row's title cell holds the title link, then "Favourite *Title*" |
| AC-11 | E2E | P0 | `favourite-star.spec.ts:355` | the starred Book's spine name ends with ", favourite" |
| AC-12 | E2E | P0 | `favourite-star.spec.ts:431` | the open popover holds a button named exactly "Favourite" |
| AC-13 | E2E | P1 | `favourite-star.spec.ts:501` | `designColor('favourite')` is `#9A7120` |
| AC-14 | E2E | P2 | `favourite-star.spec.ts:570` | the starred Book's spine on Home's slice ends with ", favourite" (witness), then the slice's names and the meter equal the unstarred run's |

**AC-2's 422 field.** The AC says a missing or non-boolean `favourite` is 422 `invalid_fields` "on that field". The shared `parse_form_intent` answers a missing key with 422 on `intent` (`set-spine-color`'s missing-color case does). The leaf follows the AC (`{"favourite": …}`); if the build finds the AC means the `intent` field, that is a spec question for the review, not a leaf to loosen silently.

**AC-5's existing-test clause** ("the existing tests the Epic 16 gate names … are updated as it says, and no others change") and "`check:api` passes" are checked by `npm run check` and the review's diff read, not by a leaf. The leaf pins the generated types.

**AC-8, AC-13, AC-14** lean on assertions after the first one for their secondary branches (bookvie stopped instead of a routed 503; forced colors; the meter numbers). The leaves carry what they can; the rest is green-phase work below.

## What each leaf covers after its first assertion

- **AC-1.** `library.v3.bak.json` holds the original bytes; every Book `favourite: false`; the file equals `serialize(store.library)`; `CURRENT_VERSION` and `SCHEMA_VERSION` are 4 and the chain is contiguous from 1; the step adds `favourite` and nothing else. A v3 archive restores at 4, nothing starred, no `.bak`. A v4 file missing one Book's `favourite` is refused at startup (`StartupError`, bytes unchanged) and on restore (422 `restore_invalid`, bytes unchanged).
- **AC-2.** `{ok: true}`; only Neuromancer is starred; invariants hold; catalog, home and book views show it; the same value again is 200 even on a `FaultyFs("write")` store and bytes don't change (proves "writes nothing"); `false` stores `false` and only `favourite` changed; a gone Book is 409 `book_not_found` for both values; a missing, `"true"`, `1` or `null` `favourite` is 422 `invalid_fields` with exactly the field `favourite`; TR8 faults at write, fsync and replace give 503 `couldnt_save`, bytes unchanged; the route is in OpenAPI.
- **AC-3.** The web edit answers 200; `get_book`'s `editForm` and `edit_book`'s `inputSchema` have no `favourite`; `edit_book` with the form unchanged, then with a new title, keeps the star; `add-book` and `add_book` store `false`; start, page update, Purpose, Card note, spine color, pause, Up next, Side read on and off, resume and finish each answer 200 and keep the star; invariants hold. The bodies come from `test_intent_routes.INTENT_ROUTES`.
- **AC-4.** Restore answers 200 and `library.json` is byte-identical to the source.
- **AC-5.** OpenAPI gives both schemas a required boolean `favourite`; a Book written by `LibraryBuilder` stores `favourite: false`.
- **AC-6.** Neuromancer reads `false`; `list_catalog` and `get_home` carry each Book's star; the tool list is `AGENT_TOOL_NAMES`; the three descriptions equal `DESCRIPTIONS` (read from `epics.md`); `get_book` still takes only `bookId`; `set_favourite` and `set_spine_color` are JSON-RPC -32602 and change nothing; `find_book`'s Dune has no `favourite`.
- **AC-7.** No text, `aria-hidden` svg; an outline star (fill `none`, stroke ink-secondary); the button sits outside the h1, after it, centred on its first line and right of its text. With `set-favourite` held by a gated route: still `false` and unfilled, enabled, `status` empty; a second press sends a second request, both `{bookId, favourite: true}`. Released: `true`, gold fill, "Dune is a favourite.", focus kept. Again: `false`, "Dune is not a favourite.", the third intent is `favourite: false`.
- **AC-8.** Book detail (routed 503): the star stays `false`, focus stays, `status` empty, the line sits below the h1 and the star; after unroute the next press empties `alert` and stars. Tiles: Enter on "Favourite Emma" shows the line once in main, under the filter row and above the grid; focus kept; toggling Unread empties it. Bookcase popover: the line shows inside the card, which stays open.
- **AC-9.** Gold fill; the button is a sibling after the link; the svg is `tile-inset` (±2) from the cover box's top left and `tile-size` (±2) wide, clear of the ribbon; Dune's outline (`#5F635C`, no fill) is drawn only on hover or focus within; Tab goes Dune link, Dune star, Emma link, Emma star (Author sort); Enter stars and Space unstars with the status lines.
- **AC-10.** The title cell holds `A` then `BUTTON`; gold fill; each row with the star is no taller than the same row without it (+0.5); hover and focus-within show Dune's outline; Tab from the title link reaches the star; Enter stars.
- **AC-11.** Every spine name (the twin's unchanged, Main "…Main book, 50%, favourite"); the mark on both starred spines: `spine-mark-size` paper square, `spine-mark-bottom` gap, centred, `spine-mark-star` gold star; Main keeps its marker dot; unstarred spines have none; 4 spine buttons; the legend's 5 items plus "favourite" with a paper swatch and gold star; tile names end ", favourite"; Home's slice shows the name and mark; the legend item stays when nothing is starred.
- **AC-12.** The first focusable element in the card is "Favourite", after the title and before the subtitle; "Open book →" gets focus on open, Shift+Tab reaches the star, Shift+Tab again closes and focuses the spine; Neuromancer opens on "Set as Up next"; Space stars and unstars with the status line, the spine name and the mark.
- **AC-13.** `favourite-dark` is `#D2A54E`; `--color-favourite` reads gold in light and dark; Book detail's fill follows the theme; a rating's first star stays accent in both themes; forced colors: `forced-color-adjust: none`, CanvasText fill and stroke, the spine mark on Canvas; dark Tiles keep `#9A7120` and `#5F635C`.
- **AC-14.** Before starring it records the slice rows, names and meter; after: rows and meter equal, names equal with ", favourite" only on the starred Books, Main has the mark.

## Existing tests this story changes (for the build)

The simulated build below ran the whole backend suite: 28 failures. 26 are the leaves the Epic 16 gate names. **Two are not on the gate's list**, so AC-5's "no others change" needs them added (a spec question for the review, not drift):

- `backend/tests/test_store.py:203` `test_serialize_round_trips`: its Hypothesis Book strategy has no `favourite`.
- `backend/tests/test_store_commits.py:201` `test_change_to_schema_version_commits_nothing[4]`: uses 4 as "another version" (now the current one); move to 5 like `test_store.py:335`.

e2e (from the gate, confirmed by the e2e worker's grep, not run against a build): `spine-popover.spec.ts:152`, `:208`, `:416`; `catalog-tiles.spec.ts:469`; `book-states.spec.ts:276` (its `toHaveText` at `:303`). No other Tab-driven spec is affected.

## Spec questions for the build and review

1. **AC-2's 422 field.** The leaf asserts the field `favourite` for a missing or non-boolean value (the AC's words). The shared parser answers a missing key on `intent`, so the build needs its own check (as `set-spine-color` does for a bad color).
2. **Legend label case.** EXPERIENCE.md:401 writes "Favourite"; DESIGN.md:844 and AC-11 write "favourite", lowercase like the other items. The leaf follows the AC.
3. **Spine mark structure.** `spineMark` finds a painted element holding an svg (DESIGN: "a square … holding a star"). A mark drawn as one svg with the square inside it would need the helper adjusted, not the AC.
4. **Mark bottom gap** is measured from the spine button's bottom edge (±1px).

## Green-phase follow-ups (secondary branches, not red leaves)

- [ ] AC-1: `bookvie` itself exits 1 on a v4 file missing `favourite` (the leaf checks `Store.open`; `test_cli.py:709`'s pattern).
- [ ] AC-7: the `{spacing.3}` gap after the h1, the 34px target, the focus ring.
- [ ] AC-8: bookvie stopped (not a routed 503); the line after the popover has closed; the List view's line; the page doesn't scroll to it.
- [ ] AC-9: no fade on the reveal; the paper halo; the 32px target and its ring; a wide cover; halo and outline in dark; twins' stars.
- [ ] AC-10: the `{spacing.2}` gap, the 24px target, dark mode.
- [ ] AC-11: the mark doesn't overlap the marker dot; the legend swatch's mini size.
- [ ] AC-12: Tab from the last control still closes the popover; dark mode.
- [ ] AC-13: the Canvas halo on tile stars under forced colors (pixel sampling); forced colors in dark.
- [ ] AC-14: Catalog's meter as well as Home's.

## Helper probes

- **Helpers reused:**
  - pytest: `LibraryBuilder` (`tests/builder.py`); `api_client`, `library_bytes`, `stored_book`, `stored_books`, `post_edit_book`, `post_restore`, `zip_archive`, `schema_block`, `seed_dune_with_cover`, `FaultyFs`, `assert_invariants`, `field_messages`, `COULDNT_SAVE_BODY`, `DUNE_ID`, `DUNE_FORM`, `VALID`, `ADD_BOOK` (`tests/helpers.py`); `connect_mcp` (`tests/conftest.py`); `McpClient`, `structured_of`, `AGENT_TOOL_NAMES`, `DESCRIPTIONS` (`tests/agent_client.py`); `INTENT_ROUTES` (`tests/test_intent_routes.py`, the only list of every intent's body).
  - e2e: `test`, `expect`, `seededServer` (fixtures.ts); `bookId`, `DUNE_ID`, `designColor`, `designComponentValue`, `ACCENT`, `ACCENT_DARK`, `INK_SECONDARY`, `SPINE_LABEL_STRIP` (library.ts); `bookcase`, `bookRows`, `finished`, `search`, `shelfOf`, `spine`, `spines`, `viewToggle` (bookcase.ts); `chip`, `chipGroup`, `spineNames` (catalog-filter.ts); `systemColor` (dev-mode.ts); `LEFT_HAND_ID`, `mainAt`, `slice`, `sliceRows`, `sliceSpines` (home.ts); `intentOf`, `requestsTo` (intents.ts); `coverBox`, `storeTiles`, `tileLinks`, `tiles` (tiles.ts).
- **Helpers added:**
  - `as_v3` (`tests/builder.py`): today's bytes as version 3 wrote them, refusing a starred Book. No helper produced v3 bytes (the builder writes the current version). `as_v2` and `as_v1` were briefly chained through it; that stripped `favourite` from the stand-in-chain tests in `test_migrations.py` under the simulated build, so the chaining was removed and both are unchanged.
  - `SET_FAVOURITE`, `post_set_favourite` (`tests/helpers.py`): the intent path and sender, beside `post_set_spine_color`.
  - `_seed`, `_favourites`, `_view_favourites`, `RED_16_1`, ids (module-local in `test_favourite.py`): the story's library and two readers that return `None` for a missing key, so a red leaf fails on an assertion, not a `KeyError`.
  - e2e `library.ts`: `firstLineRect` (the first line box of an element's text), `rowHeightWithout` (a row's height with and without one part, so "no taller" needs no constant), `pressOnceThen` (a poll reader that clicks once when the control exists), `FAVOURITE`, `FAVOURITE_DARK`, `Box`.
  - e2e `favourite.ts`: `favouriteStar` (exact-name locator), `starShape` (the star's top shape), `starDrawn` (painted or not; the button stays in Tab order), `spineMark` (the paper square on a spine, measured).
  - e2e `intents.ts`: `SET_FAVOURITE`, `starBook` (setup only, never reads the answer; not a measure, not probed).
  - Spec-local in `favourite-star.spec.ts`: `routeCouldntSave`, `popover`, `legend`, `tileItemStarting` (`tileItem` needs the exact link name, which this story changes), `starSize`.
- **Shipped numbers:**
  - List row height: 39.5px measured on the running app (e2e probe); AC-10 asserts no number, it compares the same row with and without the star in one leaf.
  - `ink-secondary` `#5F635C` (`tokens.css:20`, equal to DESIGN `tile-off`), `spine-label-strip` `#FBF8F1` (`tokens.css:37`), `accent` `#557059` (`tokens.css:22`; dark `#93B597` confirmed on the app): asserted as measured.
  - Forced colors CanvasText `rgb(0, 0, 0)`, Canvas `rgb(255, 255, 255)`: read at run time with `systemColor`.
  - The gold, `tile-inset`, `tile-size` and `spine-mark-*` are new UI; sizes are read with `designComponentValue('favourite-star', …)`, golds are constants because the build may turn `on` into a `{colors.favourite}` reference.
- **Widths:** no border or outline width is asserted; SVG stroke widths aren't asserted. E10-R1 doesn't apply.
- **Storage keys:** no new localStorage key (`grep -rn localStorage frontend/src`); `APP_STORAGE_KEYS` unchanged.
- **pytest probes** (`tests/test_favourite_probe.py`, 5 passed, then `tests/test_builder_probe.py` after the `as_v2` revert, 1 passed; both removed with `rm`; run as `cd backend && uv run pytest -q <file>`):
  - `as_v3`: today's v3 bytes come back byte for byte; a v4 doc with `favourite: false` comes back as those same bytes; a starred Book raises. `as_v2` keeps `favourite` (shipped behaviour).
  - `_favourites`: `None` for each Book today (refuses the all-`False` map); reads back a hand-set `True`.
  - `_view_favourites`: catalog and home return every seeded Book, `None` today.
  - The leaf's `schema_block` string: `"            publisher: string;\n"` (12 spaces) matches in `ShelfBook` and `BookDetailView`, a 13-space one doesn't, and `favourite: boolean;` is absent today. The leaf first used 8 spaces, which matched only as a substring; it was made exact and probed again.
- **e2e probes** (Chromium Desktop Chrome, 1280×900, `deviceScaleFactor` 1, light unless noted; `npx playwright test e2e/favourite-helpers.probe.spec.ts` 5 passed after one fix to the probe page, `e2e/favourite-app.probe.spec.ts` 3 passed; both removed with `rm`):
  - `firstLineRect`: a 3-line 20px monospace h1 gave `{x:0, y:3, w:168.03, h:23}`, equal to a reference span; refused the element box (200×90) and the trailing-space width (180). On the shipped Dune h1: `{309, 112, 80.19, 38}`.
  - `rowHeightWithout`: a row with a 40px button gave `{with:40, without:24}`; with a 16px button `{24, 24}`; display restored.
  - `pressOnceThen`: null while the button is absent; one click total; polls to "Couldn't save."; a poll for "Saved" is refused.
  - `starDrawn`: shown true; `visibility:hidden`, parent `opacity:0`, `display:none` and no svg false; opacity 0.5 true; the `li:hover`/`:focus-within` reveal toggles as expected.
  - `starShape`: on a two-path svg returned the star's fill `rgb(154, 113, 32)` and stroke `rgb(95, 99, 92)`, not the paper's.
  - `favouriteStar`: "Favourite" doesn't match "Favourites" or "Favourite Dune".
  - `spineMark`: a built spine with a 16px `#FBF8F1` mark 6px up holding a 12px gold svg returned exactly that; no mark → null; 3px off-centre → offset 3; under forced colors Canvas/CanvasText; every shipped spine → null.
  - App probe: twin and Main names, the 5 legend items, Author sort (Dune before Emma; AC-9's Tab order fixed to match before the red run), the ribbon at the cover box's top right, the popover's focus on open, the rating's accent, AC-14's 3 slice rows and "5 of 151 finished"; `set-favourite` answers 405 today and the setup call doesn't throw.
- **Render-before-read:** all 6 pytest leaves read no page. Every e2e one-shot read follows a web-first wait on what it reads (h1 visible, tiles/rows/spines `toHaveCount`, ribbon visible, the first assertion proving the star exists, AC-14's reads after `sliceSpines.first()` and a meter `toHaveAttribute`); change-dependent reads are inside `expect.poll`. No leaf needed a fix.

## TDD Red Phase

14 skipped leaves: 6 in `backend/tests/test_favourite.py` (`@pytest.mark.skip(reason=RED_16_1)`, `[P*] AC-n` in a comment, `ac<n>_p<n>` in the name) and 8 in `frontend/e2e/favourite-star.spec.ts` (`test.skip('[P*] AC-n …')`).

**Red today**, each run after the probes it depends on last passed, from throwaway un-skipped copies with the same line numbers, removed with `rm`:

| AC | Fails at | Because |
|---|---|---|
| AC-1 | `test_favourite.py:114` | `assert 3 == 4`: no version 4 |
| AC-2 | `:170` | `405 == 200`: no route |
| AC-3 | `:251` | `None is True`: the stored Book has no `favourite` |
| AC-4 | `:316` | every star `None` |
| AC-5 | `:327` | `ShelfBook`'s block ends at `publisher` |
| AC-6 | `:357` | `get_book`'s result has no `favourite` |
| AC-7 | `favourite-star.spec.ts:103` | no "Favourite" button |
| AC-8 | `:170` | the poll got `null`: no star to press, no alert |
| AC-9 | `:245` | no "Favourite Emma" in the tile item |
| AC-10 | `:322` | no "Favourite Emma" in the title cell |
| AC-11 | `:372` | no spine named "…, favourite" |
| AC-12 | `:448` | no "Favourite" in the popover |
| AC-13 | `:506` | `DESIGN.md has no color favourite` |
| AC-14 | `:598` | no slice spine named "…, favourite" |

**Green check (simulated backend build).** `Book.favourite: bool`, version 4 with a 3→4 step, `add-book` storing `false`, a `set-favourite` intent (no-op via `UNCHANGED`, a bool check on `favourite`), `ShelfBook` and `BookDetailView` fields, the builder default, and `api:gen`. All 6 pytest leaves passed, so their later assertions hold against the intended change. The whole backend suite then had the 28 failures listed above. Every touched file was backed up to the scratchpad first and copied back, the new module removed with `rm`, and `git status` showed only this run's files. The e2e leaves weren't run green: that needs the UI.

## Implementation checklist (for `bmad-build-auto`)

- [ ] `Book.favourite: bool` (no default), `SCHEMA_VERSION = 4`; `store/migrations` step 3→4 setting `false`, `CURRENT_VERSION = 4`.
- [ ] `intents/set_favourite.py` and `POST /api/intents/set-favourite` (value, not toggle; 409 before the `UNCHANGED` no-op; 422 on `favourite`); `INTENT_ROUTES` gains it.
- [ ] `add-book` stores `false`; `edit-book` and every other intent keep it; not in `editForm` or `edit_book`'s input.
- [ ] `ShelfBook.favourite`, `BookDetailView.favourite`; `npm --prefix frontend run api:gen`.
- [ ] `tests/builder.py` default `"favourite": False`; `helpers.py` `EMPTY_LIBRARY` and `STORED_BOOK_KEYS`; the gate's existing tests plus the two above; `set_favourite` in the never-registered names.
- [ ] Book detail star, Spine popover star, Tiles and List stars, spine mark, ", favourite" in `spineNames`, legend item; status and couldn't-save lines.
- [ ] `favourite` / `favourite-dark` into DESIGN.md `colors` and `tokens.css` together; forced colors.
- [ ] Un-skip the 14 leaves, remove `RED_16_1`, run `npm run check`.

## Suite

- `npm run check:py`: 2515 passed, 6 skipped (this run's leaves); ruff clean.
- `npm --prefix frontend run check:api`: passed (format, `tsc -b`, oxlint, 425 unit tests).
- `npx playwright test e2e/favourite-star.spec.ts`: 8 skipped. `e2e/spine-popover.spec.ts` (imports the changed `intents.ts` and `library.ts`): 19 passed (e2e worker's run). The full e2e suite wasn't run.
