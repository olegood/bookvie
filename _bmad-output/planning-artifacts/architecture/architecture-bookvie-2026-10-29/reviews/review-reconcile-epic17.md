# Reconcile review: spine update for Epic 17

- **Date:** 2026-11-27
- **Subject:** `ARCHITECTURE-SPINE.md`, uncommitted diff (AD-6 Stats view Finishes, Stats bars, Stats finished list, Stats address; AD-7 Same-page address replaces; AD-21 `get_stats`; capability map FR-16 row; Structural Seed)
- **Inputs:** `stats-finished-books-plan-2026-11-27.md` (D1–D17, story cut, tests, leaves), EXPERIENCE.md → Stats (diff), DESIGN.md → Stats finished list and Monthly bars (diff), PRD FR-16 (diff), `.memlog.md` tail
- **Code checked:** `frontend/src/lib/page.ts`, `components/PageHeading.tsx`, `main.tsx`, `components/AppShell.tsx`, `pages/StatsPage.tsx`, `lib/stats.ts`, `lib/carriedSearch.ts`, `node_modules/react-router` 8.5.1 (`dom/lib.js:615`), `backend/bookvie/views/models.py`, `views/stats.py`, `domain/model.py`, `agent/read_tools.py`, `backend/tests/agent_client.py`

## Verdict

**Not ready as is: 0 critical, 2 high, 4 medium, 3 low.** The data shape, ordering, ownership of sorting and counting, and the agent surface landed faithfully. The two high findings are both about the address and focus. As written, the same-page marker turns off the `h1` focus on Back to Stats, and the "range lives only in the address" rule conflicts with Custom's half-typed fields. Stories 17.1 and 17.2 would each settle these on their own, and differently.

## What landed correctly

- D1, D2, D5: `StatsView.finishes`, one `StatsFinish` per counted finish, with the D5 field list, no paging, and `[]` when there are none. Python first, then `api:gen` (AD-8).
- D4: newest first, then the title key. The spine adds a total tie-break (Book id, then stored Reading order), which is right.
- AD-6 split: the list never sorts or counts. The selected bar filters by a `finishDate` prefix, and the heading's and the announcement's count is the bucket's `books`.
- D6: `get_stats` returns the view as is, with no new tool.
- D9 and D16: bars are toggle buttons in a `group`, one roving Tab stop, and the hidden table stays. D15: changing the range clears the bar.
- D12 to D14: the parameter names, presets stored by name, replace-only writes, a plain `/stats` not rewritten, quiet fallbacks, `period` never sent to the server, and the period checked only against a settled view (the AD-7 one-shot rule).
- The capability map and the Structural Seed name `StatsFinishedList`, `lib/page`'s marker and `get_stats`.
- Brownfield: `views/stats.py` already collects the finished Readings, so `finishes` comes from the same list (a books count and row count that agree by construction). `ShelfBook` already has `first_author: str` and `author_count: int` to copy.

## Findings

### H1 (high): the same-page marker stays in history, so Back to Stats would skip the `h1` focus

**Evidence.** AD-7 says: "A location that carries the marker isn't a route change: `PageHeading` doesn't take focus, the `main.tsx` subscription doesn't call `markNavigated` for it". Router state is stored in the history entry (`history.replaceState`) and comes back on every POP to that entry, and on reload. Take the P0 test flow: open Stats, choose Custom (a replace with the marker), select March (a replace with the marker), open a Book (a push), press Back. The POP lands on the Stats entry, which still carries the marker. Under the rule as written, `PageHeading` doesn't take focus. EXPERIENCE.md → Stats → Address → Not a route change says the opposite: "Arriving on Stats, Back from a Book included, is a route change: focus goes to the `h1`". The spine's own Card notes precedent already deals with this. `lib/carriedSearch.ts` acts on its marker only on a `PUSH` (`useNavigationType`), and "the marker is ignored on mount". The Stats address bullet also says the state is "never in storage or `history.state`", yet the marker is `history.state`.

**Fix.** In AD-7 → Same-page address replaces, make the test "the navigation type is `REPLACE` **and** the location carries the marker". A POP (Back, Forward) or a mount (reload, arrival) that carries the marker is a route change, or for a mount, the first load. State this for both consumers, `PageHeading` and the `main.tsx` subscription. Say that the subscription stays subscribed through marker replaces and unsubscribes only on the first real route change. Reword the Stats address bullet to: "the range and bar are never in storage, and `history.state` holds only AD-7's marker". Add a unit or e2e case: a marker entry reached by Back focuses the `h1`.

### H2 (high): "the range lives only in the address" conflicts with Custom's in-progress fields

**Evidence.** The Stats address bullet says the range is read from the address at once, every change is written as a replace, and "a Custom without two valid dates is This year, and the address is replaced". Today, Custom has legitimate states without a complete range. `StatsPage.tsx` holds `customFrom` and `customTo` as component state. Choosing Custom after All time leaves both fields empty. `orderedRange` returns `null` while either field is empty or invalid. The swap of reversed dates waits for blur or Tab, and Chromium date inputs fire a change on every segment. If every change goes to the address and the address is read back with D14's fallback, these things happen:

- choosing Custom after All time jumps straight to This year;
- clearing a date field mid-edit does the same;
- a reversed pair written before the swap is either a "bad address" or gets reordered under the cursor.

EXPERIENCE.md writes `from` and `to` "in order after the silent swap", which implies the fields are not the address. The spine doesn't say who owns the half-typed text. 17.1's build could pick either model, and its review would have no rule to check against.

**Fix.** State the ownership in AD-6 → Stats address. Custom's From and To field text stays in `StatsPage` state. The address gets `range=custom&from&to` only when the fields form a complete range, in order after the swap. While the fields are incomplete, the address keeps the last complete range, or `range=custom` without dates, and that never triggers the fallback while the page is mounted. D14's fallback applies only when the page reads the address on arrival: mount, POP, or a push from outside. Say also what a hand-edited reversed pair (`from` > `to`, both valid) does: swap quietly, as the fields do, or fall back to This year. D14 doesn't decide it (see L2).

### M1 (medium): the Stats nav link from a Stats address is a PUSH, not a REPLACE

**Evidence.** AD-7 lists "the Stats nav link from Stats" as "a nav link's REPLACE to the same path". React Router 8.5.1 replaces only when `createPath(location) === createPath(path)` (`dom/lib.js:615`), and that comparison includes the search. From `/stats?range=lastYear`, `<NavLink to="/stats">` (`AppShell.tsx:61`) is a **PUSH**. It is a REPLACE only from a plain `/stats`. Consequences:

- after the nav link is clicked from a Stats address, Back returns to the previous range, so "Back from Stats leaves Stats in one step" no longer holds there;
- the page doesn't remount (same route element). Its `selectionKey` changes from `lastYear` to `thisYear`, and the existing announce effect would speak "N books, M pages." EXPERIENCE.md says "Opening Stats announces nothing, whether from the nav…".

**Fix.** Correct the example: the nav link is a PUSH from a Stats address and a REPLACE from a plain `/stats`, a route change either way. Decide, and write in AD-6 → Stats address, whether the nav link from Stats announces. Recommended: it doesn't, because it's an arrival. The announcement then follows a range change made on the page, not an address change. Optionally make the Stats nav link `replace` when it is already on `/stats`, if the one-step Back must hold. That is a UX call for Oleg.

### M2 (medium): `finishedPages` can be null, and the spine doesn't say how the row shows it

**Evidence.** `domain/model.py:58` has `finished_pages: int | None`. `views/stats.py` counts a null as 0 (`reading.finished_pages or 0`), and AD-20 says "counts a missing `finishedPages` as 0". The spine's `StatsFinish` says "read as stored (AD-11; `rating` null when unrated, `coverFile` null without a cover)" and names no null for `finishedPages`. EXPERIENCE.md's row always shows "611 pages" or "1 page". The backend could send `null` while the frontend fixtures assume `int`, or the row could print "null pages". The D3 promise that "the pages explain a tall bar" holds only if a row's pages add up to its bucket's pages.

**Fix.** Pick one rule and write it in the Finishes bullet. Recommended: `finishedPages: int`, sent as stored with a null sent as 0, the same rule as the counts. The rows' pages then add up to the bucket's `pages`. Alternatively keep it nullable and have the row leave the pages out. EXPERIENCE.md would then need a matching rule, and the aria-label would end at the date.

### M3 (medium): the Tiles bullet now contradicts the finished list on the typeset plate

**Evidence.** The edited Tiles bullet reads: "gets a typeset cover in Tiles and the Stats finished list only: read … is the exact `spineColor` with a plate holding the title and first author". The new Stats finished list bullet and DESIGN.md say the plate holds no text at this size ("a plate with no text", "It holds no text at this size").

**Fix.** Revert the Tiles bullet to "in Tiles only", and keep the Stats variant described only in the finished list bullet. Or say "in Tiles (plate with the title and first author) and the Stats finished list (read variant only, a plate with no text)". If both stories are to share one component, name it, for example a `TypesetCover` extracted from `pages/CatalogTiles.tsx:66` with a `plateText` flag. Without that, 17.1 might either duplicate the component or change Tiles.

### M4 (medium): the description test's parser reads only Epics 12 and 13

**Evidence.** AD-21 now says each registered description equals its `epics.md` text, "Epic 17 for `get_stats`", read from there by the tests. `backend/tests/agent_client.py` `_parse_descriptions` reads only `_epic(12)` and `_epic(13)`, with a fixed `_STORY_OF` and `_EPIC_13_STORY_OF`, and asserts exact line counts. An Epic 17 override needs a third mechanism, like the one that lets Story 13.3's `export_backup` replace 12.6's. The plan's leaf list names only `test_agent_read.py`'s `DESCRIPTIONS["get_stats"]` check, not the parser.

**Fix.** In AD-21, or as a leaf in the plan or the epic gate, name the leaf: `agent_client.py`'s parser gains Epic 17 Story 17.1's `**Description:**` line for `get_stats`, and that line replaces Epic 12's. Say also that `epics.md` (step 5) must quote it in the `**Description:** "…"` shape the regex accepts.

### L1 (low): EXPERIENCE.md's "no author" case can't happen

**Evidence.** The store requires at least one author (`book_authors_required`, AD-18). `ShelfBook.first_author` is `str`. EXPERIENCE.md and DESIGN.md still spec a row with no author line.

**Fix.** In the Finishes bullet, write `firstAuthor` as a non-null string (AD-18), so no one builds a nullable type for it. Optionally have the UX docs drop or mark the no-author rule.

### L2 (low): a reversed hand-edited Custom address isn't decided

**Evidence.** D14 covers "a Custom without two valid dates". A `from` after `to` is two valid dates. The server refuses `to` < `from` with 422 (`check_stats_range`), so passing the pair through unordered would show the couldn't-load line, not a quiet fallback.

**Fix.** Fold into H2's fix: a reversed pair is swapped quietly, and the address is replaced in order.

### L3 (low): no one owns focus when a stale period is released after a refetch

**Evidence.** The spine releases the bar after any refetch whose settled view no longer has the period. If focus was on **Show the whole range**, which then unmounts, or on the bar that stops being a button, focus falls to `body`. EXPERIENCE.md's focus rules cover only presses.

**Fix.** One clause in the Stats address bullet. Recommended: when the release removes the focused control, focus moves to the chart's Tab stop (its latest bar with finishes), or to the list's heading or `main` when there is none, and nothing is announced. This matches the Favourites rule of "only when the render took focus away".

## Not findings

- Presentation (dimmed opacity, ring, star size, row tokens) is in DESIGN.md, and the spine doesn't contradict it.
- The spine's "the page doesn't scroll" is consistent with the code. No `ScrollRestoration` exists, and the only scroll on a route change comes from the `h1` focus, so leaving `PageHeading` unfocused is enough. A note to that effect would help but is optional.
