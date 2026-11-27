---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-27'
storyId: '17.1'
storyKey: '17-1-see-the-books-finished-in-a-range'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-171-see-the-books-finished-in-a-range'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-17-1-see-the-books-finished-in-a-range.md'
generatedTestFiles:
  - 'backend/tests/test_stats_finishes.py'
  - 'frontend/e2e/stats-finished.spec.ts'
  - 'frontend/e2e/stats.ts (FINISHED, FINISHED_FILES, THIS_YEAR_ROWS, DUNE_SPINE, PIRANESI_SPINE, DDIA_COVER, PIRANESI_COVER, finishedHeading, finishedList, finishedLinks, finishedLink, labelsOf, historyLength, address, thumbnailLook, ThumbnailLook)'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 17 intro, gate, out of scope; Story 17.1; Story 17.2 for the boundary)'
  - '_bmad-output/planning-artifacts/stats-finished-books-plan-2026-11-27.md (D1–D17, §4 story cut, §5 tests)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-6 Stats view Finishes, the Stats finished list, the Stats address; AD-7 Same-page address replaces; AD-21 get_stats; Consistency Conventions title ordering)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Stats section, State rows) and DESIGN.md (components.stats-finished-row, components.catalog-tile typeset tokens, Stats finished list)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (epic-17 backlog, 17-1 backlog)'
  - '_bmad-output/test-artifacts/atdd-checklist-16-2-show-only-my-favourites.md (format and precedent)'
  - '_bmad/tea/config.yaml'
  - 'backend/bookvie/views/stats.py, views/models.py (StatsView, StatsBucket), domain/model.py, domain/ordering.py; backend/tests/test_stats.py, test_agent_read.py, agent_client.py, builder.py, helpers.py, test_contract.py'
  - 'frontend/src/pages/StatsPage.tsx, lib/stats.ts, api/views.ts (useStatsView), lib/bookDetail.ts (shortDate, starsLabel), lib/catalog.ts (spineName author part), pages/BookDetailPage.tsx (Stars)'
  - 'frontend/e2e/stats.ts, stats.spec.ts, fixtures.ts, home.ts, library.ts, tiles.ts, bookcase.ts, back-to-top.ts, intents.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given a library with finished Readings in 2026 (a back-fill, a Book finished in February and again in April, a Book finished twice on one day, a null finishedPages, and a side read never finished), when GET /api/views/stats is asked for a range, then finishes holds one StatsFinish per finished Reading in the range with { readingId, bookId, title, firstAuthor, authorCount, coverFile, spineColor, finishDate, finishedPages, rating } read as stored; its length equals books and its finishedPages sum equals pages for every preset and a Custom range starting mid-month; the back-fill is in it, the twice-finished Book has two entries, the side read is not, null finishedPages is sent as 0; rating null when unrated, coverFile null without a cover (AR74).' }
  - { id: AC-2, idSource: generated, text: 'Given the same library, when the view is fetched twice, then finishes is ordered finishDate newest first, then the server title key, then Book id, then stored order, the same both times; All time sends every finish with no paging, and an empty range or All time in an empty library sends "finishes": [] (AR74).' }
  - { id: AC-3, idSource: generated, text: 'Given StatsFinish and StatsView.finishes added in Python, when api:gen runs, then schema.d.ts gives StatsView a required finishes: StatsFinish[], check:api passes, the fixtures carry finishes, and only the gate''s existing tests for Story 17.1 change.' }
  - { id: AC-4, idSource: generated, text: 'Given an agent, when it calls get_stats with no range or with from and to, then it returns the route''s stats view, finishes included, refusals unchanged; the tool list is unchanged and the description equals Story 17.1''s text, which _parse_descriptions reads in place of Story 12.2''s (AR79).' }
  - { id: AC-5, idSource: generated, text: 'Given Stats on This year with finishes, when it renders, then under the chart an h2 "Finished this year" is followed by an ol with one li per finish in the view''s order, as many as the books figure; each row is one link to /book/<bookId> with the cover thumbnail (alt=""), title, the catalog''s author ("Kent Beck and 2 others"), "14 Mar 2026 · 611 pages" ("1 page") and the rating as one image "4 stars" ("1 star"); its name is "Title, Author, finished 14 Mar 2026, 611 pages, 4 stars", ending at the pages unrated and without the author part when there is none; the page neither sorts nor counts (UX-DR105, UX-DR106, UX-DR108, UX-DR114, AR75).' }
  - { id: AC-6, idSource: generated, text: 'Given the presets and Custom ranges, when each is chosen with finishes in it, then the heading reads "Finished this month", "Finished this year", "Finished last year", "Finished, all time", or for Custom "Finished 1 February – 15 April 2026", "Finished 1 December 2025 – 15 January 2026", "Finished 3 – 17 March 2026" and "Finished 14 March 2026"; lib/stats builds the heading and the row name, with unit tests for each form (UX-DR108).' }
  - { id: AC-7, idSource: generated, text: 'Given an unrated row, a Book with no author and a Book with no cover or a failed one, when the list renders, then the unrated row shows no stars and no "No rating" but keeps the line''s height; the author-less row holds the title alone, vertically centered; the coverless row shows the read typeset cover (exact spine color, typeset edge, a plate 5px in, 19px from the top, 18px tall, no text); the row follows components.stats-finished-row (44 × 64 thumbnail, cover corners and hairline, title book-title-sm 600 ink, author body-sm ink-secondary, one line each with an ellipsis, meta with tabular figures, 14px stars 2px apart, accent and input-border, never gold); hover and :focus-visible underline the title only, focus rings the whole row, in dark too; under forced colors the typeset cover is Canvas with a CanvasText border (UX-DR106, UX-DR107).' }
  - { id: AC-8, idSource: generated, text: 'Given a range with no finishes, or All time with nothing finished, when Stats renders, then there is no h2 and no list, only "No books finished in this range." or "No books finished yet." (UX-DR108).' }
  - { id: AC-9, idSource: generated, text: 'Given a range change whose new view is still loading, when keepPreviousData shows the previous range''s view, then the numbers, bars, heading and list all render from that one shown view and its range, never the address''s, until the new view arrives (AR75).' }
  - { id: AC-10, idSource: generated, text: 'Given Stats opened from the nav, when I choose Last year, then Custom 1 February 2026 – 15 April 2026, then the address reads /stats?range=lastYear, then /stats?range=custom&from=2026-02-01&to=2026-04-15, each replacing the entry; a reversed Custom is written in order after the swap, an empty or half-typed field writes nothing and keeps the last committed range in the address, view and list, pressing Custom with empty fields writes nothing; a plain /stats opens on This year and isn''t rewritten until the first change, and nothing is written to localStorage (AR76, UX-DR113).' }
  - { id: AC-11, idSource: generated, text: 'Given a range change, including right after a direct load of /stats, when the address is replaced, then focus stays on the control I used, the h1 doesn''t take focus and the page doesn''t scroll (a REPLACE with lib/page''s same-page marker); the main.tsx subscription stays subscribed, so the next route change still focuses that page''s h1; a REPLACE without the marker, a PUSH or a POP is a route change, and a marker from history.state on Back, Forward or reload is ignored (AR77).' }
  - { id: AC-12, idSource: generated, text: 'Given Custom 1 February – 15 April 2026, scrolled down the list, when I open a row''s Book and press Back, then Stats returns on the same range and list, at the top with the h1 focused, announcing nothing; Back once more leaves Stats for the page I opened it from (UX-DR112, UX-DR113).' }
  - { id: AC-13, idSource: generated, text: 'Given Stats at /stats?range=lastYear, when I press the Stats nav link, then it opens a plain /stats on This year without adding a history entry, as a route change (AR77).' }
  - { id: AC-14, idSource: generated, text: 'Given an address typed by hand, when Stats opens on /stats?range=nextWeek, a Custom with no to, a Custom with a non-date or a date the server would refuse (0000-01-01), or a reversed Custom, then the first ones open This year and the reversed one opens in order, with no message and no announcement, and the address is replaced with what the page shows; range=thisYear opened in a later year shows that year (AR76, UX-DR113).' }
  - { id: AC-15, idSource: generated, text: 'Given a range change by my own press, when the new view shows, then status announces the range line ("2 books, 610 pages."), and arriving on Stats by the nav, a reload, Back or a link with a range announces nothing (UX-DR112).' }
  - { id: AC-16, idSource: generated, text: 'Given Story 17.1, when it is built, then it neither reads nor writes period and the chart is unchanged; copy.test.mjs and the axe checks on Stats pass with the list shown, in both themes.' }
---

# ATDD Checklist: Story 17.1 See the Books finished in a range

## Preflight

- **Branch:** `epic-17-stats-finished-books` at `96897ab`, clean at the start. This run stays on that branch.
- **Stack:** `fullstack`, auto-detected. Playwright (`frontend/playwright.config.ts`, Chromium only) and pytest are in place. The story touches both: `views/stats` and `StatsView` (backend), `get_stats`'s description, and `StatsPage`, `lib/stats`, `lib/page`, `PageHeading`, `AppShell`, `main.tsx` and a new `StatsFinishedList` (frontend).
- **Story:** `epics.md` Story 17.1 has 16 Given/When/Then criteria with no ids. They are numbered AC-1 to AC-16 in source order (registry above). Each "And" line belongs to the criterion above it; the **Description:** line belongs to AC-4.
- **Epic gate:** 17.1 is Epic 17's first story. The spine-drift stop belongs to `bmad-build` and `bmad-build-auto`; the epic's intro records that Epic 16's reconciliation landed (retro item 108) and that none was open on 2026-11-27. `sprint-status.yaml` reads `backlog` for both 17.1 and 17.2.
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns), no Pact, `tea_browser_automation: auto`, `tea_execution_mode: auto`.
- **What exists today:**
  - `StatsView` is `{ books, pages, bucket, buckets }`; `views/stats.stats` already collects the finished Readings in the range, so `finishes` comes from the same list.
  - `StatsPage` keeps the range in component state ("Not persisted"); `useStatsView` returns the shown `range` and `current` (`keepPreviousData`).
  - A Book always has an author (`book_authors_required`), so "no author" can't be stored: the AC-7 leaf edits the view in flight (`firstAuthor: ''`, `authorCount: 0`), the catalog's own "no author" form (`spineName`).
  - The shipped strings the rows reuse: `shortDate` ("14 Mar 2026"), `starsLabel` ("4 stars", "1 star"), Book detail's `Stars` (one `role="img"`), and the catalog's author part ("and 2 others").

## Generation Mode

**AI generation, sequential, in this session.** The run already held every name, string and helper the leaves need, so no 4A or 4B subagent was launched (16.2's precedent). Selectors come from EXPERIENCE.md's names and the shipped components, not from a recording: the list doesn't exist yet.

**No unit leaves.** AC-6 asks for `lib/stats` unit tests of the heading and the row name. A skipped `lib/stats.test.ts` case that imports a function `lib/stats` doesn't export yet would break `tsc -b` (15.2 and 16.2 precedent), so those cases are green-phase work for the build; the e2e leaf pins every heading form, and AC-5 pins the row names.

## Test Strategy

| AC | Level | Priority | Leaf | First assertion (the criterion) |
|---|---|---|---|---|
| AC-1 | API (pytest) | P0 | `backend/tests/test_stats_finishes.py:166` | This year's `finishes` reading ids are exactly the 8 Readings in the range (back-fill and both Kindreds in, Solaris and the side read out) |
| AC-2 | API (pytest) | P0 | `:231` | the reading ids in order: 12 Oct, then 20 Sep's Beloved ×2 (stored order), "emile" before "Émile" (one title key, by Book id), then 1 Jun, 5 May, 20 Apr, 14 Mar, 10 Feb |
| AC-3 | API (pytest, OpenAPI) | P1 | `:293` | `"finishes"` is in `StatsView`'s `required` |
| AC-4 | API (MCP) | P1 | `:319` | `get_stats`'s first finish is Extreme Notes' Reading |
| AC-5 | E2E | P0 | `frontend/e2e/stats-finished.spec.ts:49` | the `h2` reads "Finished this year" |
| AC-6 | E2E | P1 | `:103` | after This month, the `h2` reads "Finished this month" |
| AC-7 | E2E | P1 | `:141` | (poll) Dune's thumbnail is a 44 × 64 box in `#4A6FA5`, 1px solid `spine-edge`, no image, with a `spine-label-strip` plate 5px in, 19px down, 18px tall, no text |
| AC-8 | E2E | P1 | `:219` | This year's `h2` reads "Finished this year" before the empty range takes it away |
| AC-9 | E2E | P1 | `:242` | with This month pressed and its view held, the `h2` still reads "Finished this year" |
| AC-10 | E2E | P0 | `:281` | (poll) after Last year, `[address, history.length]` is `['/stats?range=lastYear', unchanged]` |
| AC-11 | E2E | P1 | `:341` | (poll) after Enter on Last year: the address is `?range=lastYear`, Last year has focus, the `h1` doesn't, `scrollY` unchanged |
| AC-12 | E2E | P0 | `:384` | (poll, `pressOnceThen`) DDIA's row opens `/book/<id>`; then after Back, `[address, row names]` is the Custom range's |
| AC-13 | E2E | P1 | `:430` | (poll) after the Stats nav link, `[address, history.length]` is `['/stats', unchanged]` |
| AC-14 | E2E | P1 | `:455` | (poll) a reversed Custom address is replaced in order |
| AC-15 | E2E | P1 | `:495` | arriving on `/stats?range=lastYear` presses Last year |
| AC-16 | E2E | P2 | `:525` | the list shows 9 row links (for axe to check) |

**State transitions.** AC-8 is an absence; its leaf exercises the transition (a shown list, then an empty range) so it fails today. AC-12's first poll presses the row, so a missing row fails there and not in a click that waits; the criterion poll after Back follows.

**AC-3** is partly meta (`api:gen`, `check:api`, the gate's leaves). Its leaf pins what `api:gen` reads: the OpenAPI schema `create_app().openapi()` serves. The regenerated `schema.d.ts` and `check:api` are checked by `npm run check`; the gate's leaves are listed below.

**AC-11's second half** (a REPLACE without the marker, PUSH, POP, and the marker coming back from `history.state`) is `lib/page`'s rule; its e2e consequences are AC-12 (Back is a route change: `h1` focused, top) and AC-13 (the nav link). A `lib/page` unit case for the marker rule is green-phase work (see below).

**AC-16** "copy.test.mjs passes" is checked by `npm run check` once the strings exist.

## What each leaf covers after its first assertion

- **AC-1.** Every finish has exactly the ten keys; DDIA's whole entry, `bookId` and `spineColor` from the built library, `coverFile` `covers/ddia.jpg`, rating 4; Dune back-filled, unrated, coverless; Kindred's two dates; Emma's null `finishedPages` sent as 0; Extreme Notes `firstAuthor` Kent Beck, `authorCount` 3, rating 1; no Hyperion. For This month, This year, Last year, All time and Custom 15 February – 20 September 2026: `len(finishes) == books` and `sum(finishedPages) == pages`.
- **AC-2.** A second fetch gives the same order; All time is the same plus Solaris, 11 entries, equal to `books`; 2024 gives `[]`; All time in an empty library is the whole view with `"finishes": []` (the gate's `test_stats.py:253` shape).
- **AC-3.** `finishes` is an array of `$ref` `StatsFinish`; `StatsFinish` has the ten properties, all required; `finishedPages` is an integer.
- **AC-4.** The ranged tool answer equals the route's whole view; All time equals the route's, 9 finishes; the tool's description equals `DESCRIPTIONS["get_stats"]`, and that equals Story 17.1's line in `epics.md` (read with `agent_client`'s `_epic`, `_DESCRIPTION` and `_story_at`). The second fails until the build teaches `_parse_descriptions` the Epic 17 line.
- **AC-5.** 9 `li`, 9 links, the books figure "9"; the row names in order (`THIS_YEAR_ROWS`); the list is an `ol`; DDIA's `href`, title, author, "14 Mar 2026 · 611 pages", one "4 stars" image, an `img[alt=""]`; Extreme Notes' "Kent Beck and 2 others", "12 Oct 2026 · 1 page", "1 star"; two Beloved rows to one Book. A routed view with `books: 4` and reversed `finishes` renders 9 rows, reversed.
- **AC-6.** Last year, All time (10 rows), and the four Custom forms; a single day gives DDIA alone.
- **AC-7.** Piranesi's failed cover gets its own spine color; DDIA's cover shows as an image in the 44 × 64 box; Dune has no image and no "No rating" and the same row height as DDIA (±1px); Emma's name without the author part, and its title centered on the thumbnail (±1px); DDIA's title weight 600, `ink`, ellipsis, `nowrap`; author `ink-secondary`, ellipsis; meta `tabular-nums`.
- **AC-8.** The empty line shows; no `h2`, no list.
- **AC-9.** 9 rows and This year's numbers while held; once released, "Finished this month" with Extreme Notes alone.
- **AC-10.** Custom from Last year writes Last year's dates; To then From gives the Feb–Apr address and 2 rows, history unchanged; an emptied From keeps the address, heading and rows; a reversed pair is written in order after Tab; All time, then Custom with empty fields, writes nothing; a plain `/stats` stays `/stats`; `localStorage` keys unchanged.
- **AC-11.** Custom's From keeps focus after a committed range, the `h1` doesn't take it; then opening DDIA's row focuses Book detail's `h1`.
- **AC-12.** Custom pressed with both fields; the heading; the `h1` focused; `scrollY` 0; `status` empty; Back again lands on Home.
- **AC-13.** This year pressed, "Finished this year", the `h1` focused.
- **AC-14.** The reversed address shows Custom, the heading and both fields in order; `nextWeek`, a missing `to`, `0000-01-01` and `2026-02-30` each open This year with "Finished this year", the address `/stats?range=thisYear` (spec question 1), and empty `status` and `alert`.
- **AC-15.** Solaris' 204 pages; `status` empty after arriving; This month announces "1 book, 1 page."; a reload of the replaced address keeps This month, 1 row, and says nothing.
- **AC-16.** axe, light and dark, with the list shown; `/stats?range=thisYear&period=2026-03` shows all 9 rows (not narrowed), and a press writes `/stats?range=lastYear` with no `period`.

## Existing tests this story changes (for the build)

The gate's list (Epic 17 intro, checked in this run):

- `backend/tests/test_stats.py:253`: the empty All time view gains `"finishes": []`.
- `frontend/e2e/stats.spec.ts:119` (the response's key set gains `finishes`) and `:208` (the empty All time body gains `finishes: []`).
- `frontend/src/api/generated/schema.d.ts`: regenerated by `npm --prefix frontend run api:gen`, never edited.
- `backend/tests/agent_client.py` `_parse_descriptions` (`:151`): reads Story 17.1's `get_stats` line in place of Story 12.2's, as Epic 13's `export_backup` does. Then `test_agent_read.py:390` reads the new text. `AGENT_TOOL_NAMES` is unchanged.
- Code the spine names (not tests): `components/PageHeading.tsx`, `lib/page.ts`, the `main.tsx` subscription, the `components/AppShell.tsx` Stats `NavLink`, `api/views.ts` `useStatsView` reporting `fetching`.

Not changed by this run: each of these would fail today if updated, so the build updates them with the feature.

## Spec questions for the build and review

1. **What a fallback writes.** AC-14 says "the address is replaced with what the page shows", and AC-10 says a plain `/stats` isn't rewritten. The AC-14 leaf asserts `/stats?range=thisYear` for a fallback (the page shows This year, and the address names it), not a plain `/stats`. If the build writes a plain `/stats` instead, that's a spec question for the review, not a leaf to loosen silently.
2. **Where Back leaves.** AC-12 says Back once more leaves Stats "for the page I opened it from". The leaf opens Stats from Home by the nav, so it expects Home (`/`).
3. **The no-author row.** A stored Book always has an author, so the AC-7 leaf edits the view in flight to `firstAuthor: ''` and `authorCount: 0`, the catalog's "none" form. If the build reads "no author" another way (for example `authorCount === 0` alone), the leaf's routed form still meets it.
4. **The title column.** AC-7 reads the title and author by their exact text (`getByText`) for weight, color, ellipsis and `nowrap`. The build should put each on its own element.

## Green-phase follow-ups (secondary branches, not red leaves)

- [x] AC-6: `lib/stats.test.ts` cases for the heading (each preset, the four Custom forms) and the row name (rated, unrated, one author, "and 1 other", "and N others", no author, "1 page", "1 star"). (done: frontend/src/lib/stats.test.ts:245 `finishedHeading` and :261 `finishRowName and finishMeta`)
- [x] AC-7: the stars' size (14px), gap (2px), `accent` fill and `input-border` outline, never `favourite`; `cover` corners and the hairline on a cover; hover and `:focus-visible` underline the title only; the focus ring around the whole row; the same in dark; forced colors: the typeset cover `Canvas` with a `CanvasText` border. (done: frontend/e2e/stats-finished-automate.spec.ts:115 AC-7, light, dark and forced colors)
- [x] AC-8: All time with nothing finished: no `h2`, no list, "No books finished yet.". (done: frontend/e2e/stats-finished-automate.spec.ts:179 AC-8)
- [x] AC-9: the bars render from the shown view too while the next one loads. (done: frontend/e2e/stats-finished-automate.spec.ts:197 AC-9)
- [x] AC-11: a `lib/page` unit case for the same-page marker (REPLACE with it is same-page; REPLACE without it, PUSH and POP are route changes; a marker restored from `history.state` is ignored). (done: frontend/src/lib/samePage.test.ts:5 `a same-page replace (AD-7)`)
- [x] AC-12: Forward after Back; a reload of the Custom address opens the same list, the `h1` unfocused (a direct load). (done: frontend/e2e/stats-finished-automate.spec.ts:234 AC-12)
- [x] AC-14: `range=thisYear` opened at fake today 2027-01-01 asks for 2027-01-01 to 2027-01-01 (`NEW_YEAR`, `NEW_YEAR_NOW`). (done: frontend/e2e/stats-finished-automate.spec.ts:281 AC-14)
- [x] AC-15: arriving by Back and by the nav announces nothing (AC-12 and AC-13 check `status` only for Back). (done: frontend/e2e/stats-finished-automate.spec.ts:316 AC-15)

## Helper probes

- **Helpers reused:** `test`, `expect` (fixtures.ts); `serverAtFakeToday`, `stopAndRemove` (home.ts); `bookId`, `INK`, `INK_SECONDARY`, `isFocused`, `pressOnceThen`, `rgbOf`, `SPINE_LABEL_STRIP`, `designColor` (library.ts); `SPINE_EDGE` (bookcase.ts); `scrollToY` (back-to-top.ts); `COVER_PNG` (intents.ts); `afterAnnounceDelay`, `AXE_TAGS`, `dateField`, `figure`, `nav`, `preset`, `STATS_API` (stats.ts). Pytest: `LibraryBuilder` (builder.py), `api_client` (helpers.py), the `library_builder` and `connect_mcp` fixtures (conftest.py), `McpClient`, `DESCRIPTIONS`, `structured_of`, and the description readers `_epic`, `_DESCRIPTION`, `_story_at` (agent_client.py), `create_app` (bookvie.http.app, as test_contract.py does). None of these was changed, so none was probed.
- **Helpers added:**
  - `finishedHeading`, `finishedList`, `finishedLinks`, `finishedLink` (stats.ts): the list's `h2`, the `ol`, its row links, and one row link by the start of its `aria-label`. No locator found the finished list; `finishedLink` matches the name's start up to ", " so "Belov" and "Dune" (no `aria-label`) find nothing.
  - `labelsOf` (stats.ts): every link's `aria-label` in order, `null` where there is none. `tileNames` (tiles.ts) is bound to the tile grid's links and falls back to `aria-labelledby` and text, which would hide a row that lost its `aria-label` (UX-DR106 sets the name with `aria-label`).
  - `historyLength`, `address` (stats.ts): `history.length` and the path plus search. No helper read either.
  - `thumbnailLook`, `ThumbnailLook` (stats.ts): a row's 44 × 64 thumbnail and its plate by geometry. `coverBox` (tiles.ts) finds a 2:3 box as wide as a tile's column, and can't find a fixed 44 × 64 box in a row.
  - The `FINISHED` seed, `FINISHED_FILES`, `THIS_YEAR_ROWS` and the four cover and color constants (stats.ts); in pytest, `_seed`, `RANGES`, `FINISH_KEYS`, `EMILE_A`/`EMILE_B` and `_story_17_1_description` (test_stats_finishes.py, spec-local); `_stats` is a copy of `test_stats.py`'s private helper with the same body, kept local so this module doesn't import another story's test module.
- **Shipped numbers:**
  - The seed's This year: 9 books, 2,489 pages; measured on the app (`figure` "9" and "2,489" visible in the probe). Last year 204 pages and This month "1 book, 1 page." follow from the seed and are asserted by AC-15 against the running app.
  - The Stats page at 1280 × 500 (AC-11, AC-12): measured `scrollHeight` 520 today, so the scroll checks move (the list makes the page longer still).
  - `spine-edge` and `spine-label-strip`: `SPINE_EDGE` and `SPINE_LABEL_STRIP` measured equal to `rgbOf(designColor(…))` in the probe.
  - 44 × 64, the plate's 5 / 19 / 18px and the 14px stars are `components.stats-finished-row` values for new UI, not shipped: asserted as DESIGN.md quotes them.
- **Widths:** the only border width asserted is the typeset edge's 1px, a whole pixel. No fractional border or outline width; E10-R1 doesn't apply.
- **Storage keys:** no new localStorage key. The range lives only in the address (AC-10 checks that the keys don't change). `APP_STORAGE_KEYS` unchanged.
- **e2e probes** (Chromium Desktop Chrome, `deviceScaleFactor` 1, light; 1280 × 900, and 1280 × 500 for the app probe; `npx playwright test e2e/stats-finished.probe.spec.ts`; removed with `rm`): 4 passed.
  - `thumbnailLook` on a `setContent` row: a 44 × 64 `rgb(74, 111, 165)` box with a 1px solid `rgb(94, 88, 77)` edge and a plate 5 / 5 / 19 / 18px in `rgb(251, 248, 241)` returned exactly that, `image: false`, plate text `''`; a plate 6px in returned 6; a 44 × 63 box threw "no 44 × 64 thumbnail". The first probe run caught a bug: a ±1px tolerance took the 44 × 63 box (and a stretched 63px-tall span) as the thumbnail. The tolerance is now ±0.5px, and the probe passed again after the fix.
  - `thumbnailLook` found the `img` inside a transparent 44 × 64 wrapper (`image: true`), picked the filled typeset box inside a transparent wrapper, and returned `rgb(1, 2, 3)` for another color, not the expected one.
  - `labelsOf` returned the three labels and `null` for the link with none; `finishedLink('Beloved')` found 2, `'Belov'` 0 and `'Dune'` (text only) 0.
  - `address` and `historyLength` on the app: `/stats?range=lastYear` as loaded; a `replaceState` kept the length and changed the address; a `pushState` added one. Today Stats' `main` has no list and no `h2`.
- **Render-before-read:** every leaf waits web-first on shipped UI (`figure` visible, the `h1` "Stats") or on the criterion itself before a one-shot read; `labelsOf` runs only after `finishedLinks` `toHaveCount(n)` or inside a poll; `thumbnailLook` runs inside a poll (Dune, Piranesi) or after it (DDIA); `boundingBox` reads follow a web-first assertion on the same row. Fixed while writing: AC-12's Back sat inside a poll that could have pressed Back again on a retry; it now presses the row in the poll and goes Back once, outside it. AC-6, AC-10 and AC-11 fill Custom's fields in an order that never leaves them reversed, since leaving a field swaps a reversed pair.

## TDD Red Phase

16 skipped leaves: 4 in `backend/tests/test_stats_finishes.py` (`@pytest.mark.skip`) and 12 in `frontend/e2e/stats-finished.spec.ts` (`test.skip`), each with a red-phase reason.

**Red today**, run after the probes above last passed, from throwaway un-skipped copies with the same line numbers (`test_stats_finishes_redcopy.py`; `stats-finished.redcopy.spec.ts` with `--timeout=20000`), both removed with `rm`: 4 failed and 12 failed.

| AC | Fails at | Because |
|---|---|---|
| AC-1 | `test_stats_finishes.py:178` | no `finishes`: `set() ==` the 8 reading ids |
| AC-2 | `:267` | `[] ==` the 10 ids in order |
| AC-3 | `:298` | `'finishes'` not in `['books', 'pages', 'bucket', 'buckets']` |
| AC-4 | `:332` | `[] ==` Extreme Notes' reading id |
| AC-5 | `stats-finished.spec.ts:60` | no `h2` |
| AC-6 | `:112` | no `h2` |
| AC-7 | `:167` | the poll got `null`: no Dune row |
| AC-8 | `:229` | no `h2` |
| AC-9 | `:268` | no `h2` |
| AC-10 | `:298` | the address stays `/stats` |
| AC-11 | `:364` | the address stays `/stats` |
| AC-12 | `:404` | the poll got `null`: no row to press |
| AC-13 | `:444` | the nav link pushes: history grows by one |
| AC-14 | `:466` | the reversed address isn't replaced |
| AC-15 | `:505` | Last year isn't pressed: the address isn't read |
| AC-16 | `:535` | no row links |

## Implementation checklist (for `bmad-build-auto`)

- [x] `views/models.py`: `StatsFinish` with the ten fields; `StatsView.finishes: list[StatsFinish]`. `views/stats.py`: one entry per counted Reading, `finishedPages` null as 0, ordered `finishDate` desc, `title_key`, Book id, stored order. (AC-1, AC-2) (done: backend/tests/test_stats_finishes.py:162 AC-1 and :226 AC-2)
- [x] `npm --prefix frontend run api:gen`; the gate's leaves above. (AC-3) (done: backend/tests/test_stats_finishes.py:288 AC-3; `check:api` compares `schema.d.ts`)
- [x] `_parse_descriptions` reads Story 17.1's `get_stats` line. (AC-4) (done: backend/tests/test_stats_finishes.py:313 AC-4)
- [x] `lib/stats`: the address parse and build (`range`, `from`, `to`; the quiet fallbacks), the list heading, the row name; unit cases. (AC-6, AC-10, AC-14) (done: frontend/src/lib/stats.test.ts:154-309; frontend/e2e/stats-finished.spec.ts AC-6, AC-10, AC-14)
- [x] `lib/page`: the same-page marker and the one function that decides it; `PageHeading`, `main.tsx` and scroll use it. (AC-11) (done: frontend/src/lib/samePage.test.ts; frontend/e2e/stats-finished.spec.ts AC-11 to AC-14. Only main.tsx calls `isSamePageReplace`, and PageHeading and the scroll read the page key: spine drift (AD-7) in deferred-work.md)
- [x] `StatsPage`: the range from and to the address with `useSearchParams`, replace with the marker; the Custom text as page state seeded from the address; announce only after the person's press; the heading and list from the one shown view. (AC-9, AC-10, AC-11, AC-12, AC-15) (done: frontend/e2e/stats-finished.spec.ts AC-9 to AC-12 and AC-15; frontend/e2e/stats-finished-automate.spec.ts:197, :234, :316)
- [x] `components/StatsFinishedList`: the `h2`, the `ol`, the row link with its `aria-label`, the thumbnail or read typeset cover, the type, the stars, the link states. (AC-5, AC-7, AC-8) (done: frontend/e2e/stats-finished.spec.ts AC-5, AC-7, AC-8; frontend/e2e/stats-finished-automate.spec.ts:115, :179)
- [x] `AppShell`: the Stats `NavLink` replaces while the path is `/stats`. (AC-13) (done: frontend/e2e/stats-finished.spec.ts:418 AC-13; frontend/e2e/stats-finished-automate.spec.ts:316)
- [x] `useStatsView` reports `fetching` (the spine; used by 17.2's period check). (done: frontend/src/api/views.ts `useStatsView`; no reader until Story 17.2)
- [x] Un-skip the 16 leaves and run `npm run check`. (done: frontend/e2e/stats-finished.spec.ts and backend/tests/test_stats_finishes.py run unskipped; `npm run check` exit 0 in the code review, 2026-11-27)

## Suite

- `npx playwright test e2e/stats.spec.ts e2e/stats-bars.spec.ts e2e/stats-finished.spec.ts`: 29 passed, 12 skipped.
- `uv run pytest tests/test_stats_finishes.py`: 4 skipped.
- `npx tsc -b` and oxlint on the two e2e files: clean. Prettier and ruff: the three changed files pass. The full `npm run check` wasn't run.
- `git status` after the run: only `backend/tests/test_stats_finishes.py`, `frontend/e2e/stats-finished.spec.ts`, `frontend/e2e/stats.ts` and this checklist; no `*.probe.*` file or throwaway copy.
