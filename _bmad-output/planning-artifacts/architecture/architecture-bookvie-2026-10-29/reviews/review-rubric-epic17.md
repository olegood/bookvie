---
title: Spine review — Epic 17 delta (rubric walker + freshness)
reviewed: ARCHITECTURE-SPINE.md, uncommitted delta of 2026-11-27 (`git diff` against ba89f67)
date: 2026-11-27
lenses: [rubric-walker, freshness]
verdict: revise before Story 17.1 (2 high, 5 medium, 6 low)
---

# Spine review — Epic 17 (Finished Books behind the Stats numbers)

Scope: the delta to AD-6 (Stats view `finishes`, Tiles' typeset cover line, Stats bars, the Stats finished list, the Stats address), AD-7 (Binds, same-page address replaces), AD-21 (`get_stats`), the source tree comments and the FR-16 capability row. Read against the whole spine, `stats-finished-books-plan-2026-11-27.md`, EXPERIENCE.md → Stats (uncommitted, lines 397–419 and Flow 16), DESIGN.md → Stats finished list, and the code listed in the brief.

## Verdict

The delta finds the right divergence points: the server-owned `finishes` with a total order, the client's filter-by-period (never count), one builder module (`lib/stats`), the same-page marker that keeps `PageHeading` from stealing focus on a replace, and the settled-view check of `period`. The backend half (StatsFinish, ordering, AD-8, AD-21) is enforceable as written and matches the code.

The client-routing half has two rules that, implemented as written, produce behaviour EXPERIENCE.md forbids (H1, H2), and one claim about React Router that the installed version contradicts (M1). Fix those before the ATDD of Story 17.1.

## Freshness checks (reality-checked against `frontend/node_modules`)

| Claim the delta leans on | Installed | Result |
|---|---|---|
| `useSearchParams` setter accepts `{ replace: true, state }` | react-router 8.5.1 (`package.json` `~8.5.1`) | **Confirmed.** `dist/development/lib/dom/lib.js:747–751`: the setter calls `navigate("?" + params, navigateOptions)`, so `replace` and `state` pass through. Note: a function updater reads the render-time `searchParams` (`nextInit(new URLSearchParams(searchParams))`), so two calls in one event lose the first (L5). |
| A replace changes `location.key` | 8.5.1 | **Confirmed.** `lib/router/router.js:441` builds `createLocation(currentLocation, path, opts.state, void 0, …)`; `lib/router/history.js:227` gives `key: to.key \|\| key \|\| createKey()`, a new random key for PUSH and REPLACE alike. So `PageHeading`'s `[key]` effect does fire on every Stats replace today, which is why the marker is needed. |
| A Link to the current location is a REPLACE | 8.5.1 | **Partly wrong.** `lib/dom/lib.js:615`: `replace = createPath(location) === createPath(path)`, comparing pathname **and search and hash**. From plain `/stats` the Stats NavLink replaces; from `/stats?range=lastYear` it **pushes**. See M1. |
| Router state survives Back/Forward | 8.5.1 | **Confirmed, and it matters.** `history.js:137–148` `createBrowserLocation` restores `history.state.usr` as `location.state` on POP. A marker written by a replace comes back on every POP to that entry, and on reload. See H1. |
| A replace doesn't scroll | 8.5.1, app | **Confirmed by absence.** No `ScrollRestoration` anywhere in `frontend/src`, so the data router never scrolls; `history.replaceState` doesn't either. The browser's own `scrollRestoration: auto` still restores scroll on POP (AD-7's Card notes rule already relies on this). See M2. |
| "Settled" (ready and not fetching) with `keepPreviousData` | @tanstack/query-core 5.105.0 | **Confirmed, but the hook doesn't expose it.** `queryObserver.js:344`: placeholder data applies only while `status === 'pending'`; on error `data` is undefined, so `toViewState` gives `failed`. `isFetching` is true from the optimistic result on mount with stale cache (`staleTime` 0). But `useStatsView` (`api/views.ts:286–298`) returns only `current` (not placeholder), not `fetching`. See M5. |

## Findings

### H1 (high): the same-page marker persists in `history.state`, so "a location that carries the marker isn't a route change" is false on Back

- **Evidence.** AD-7 → Same-page address replaces: "A location that carries the marker isn't a route change: `PageHeading` doesn't take focus, the `main.tsx` subscription doesn't call `markNavigated` for it". React Router 8.5.1 stores router state in `history.state.usr` and restores it on POP (`history.js:144`). Flow 16: Oleg changes the range (replace, marker written into that entry), opens a Book (push), presses Back (POP): the Stats location carries the marker again. Implemented as written (`PageHeading` skips focus when `location.state` is the marker), the `h1` doesn't take focus. EXPERIENCE.md → Stats → Address → Not a route change says the opposite: "Arriving on Stats, Back from a Book included, is a route change: focus goes to the `h1`". The same holds for a POP inside Stats after M1's push. The spine's own precedent already handles this for Card notes ("The marker is ignored on mount"; the carried search tests `useNavigationType()`), but the new rule doesn't adopt it.
- **Why it lets stories diverge.** 17.1 can test `location.state` (fails Flow 16 step 6's focus), or the navigation type (passes). 17.2's tests of Back with a bar selected depend on which.
- **Fix.** Reword the test: "A location change is a same-page replace only when the router's history action is `REPLACE` (`useNavigationType()`; in `main.tsx` the subscribed state's `historyAction`) **and** its state carries the marker. The marker is ignored on mount, on PUSH and on POP, so Back or Forward onto a Stats entry is a route change: the `h1` takes focus." State that `PageHeading` still focuses on mount whenever `navigated` is true, whatever the state holds.

### H2 (high): "the range lives only in the address" plus "a Custom without two valid dates is This year" breaks Custom while it is being edited

- **Evidence.** AD-6 → the Stats address: "the range and the selected bar live only in the URL's search … `pages/StatsPage` reads it with `useSearchParams` and writes every change as a replace … The range is read from the address at once; an unknown `range`, or a Custom without two valid dates, is This year, and the address is replaced with what the page shows." Today's `StatsPage.tsx:38–74`: pressing Custom after All time sets both fields to `''`, and a date field passes through incomplete values while the person types. Swapping a reversed pair waits until focus leaves (`swapIfReversed` on blur or Tab). If every change goes to the address and the page reads the range back from it, then pressing Custom after All time writes `range=custom` with no dates, which reads back as This year. The picker jumps off Custom before Oleg can type. Clearing one date mid-edit does the same. Reading reversed dates back in order swaps them before blur, against EXPERIENCE.md's "If To is before From, the two dates swap silently" once focus leaves.
- **Why it lets stories diverge.** One implementation keeps the field text in React state and writes only complete ranges. Another writes the raw fields and falls back. They differ in the e2e of the Custom picker that already exists (stories 6.3 and 6.4) and in Flow 16's failure path.
- **Fix.** Add to the Stats address: "Custom's From and To text is React state of `StatsPage`, seeded from the address on mount and on each POP. The address is written only for a range the page can show: a preset, or Custom with `orderedRange` non-null, written in order. While Custom's fields are incomplete, the address keeps `range=custom` and the last complete `from`/`to`, or no dates if there was none [pick one]. The fallback to This year applies only when an address is read on arrival (mount or POP), never to a change the page itself wrote." Say which of those two choices for incomplete Custom applies, since Back from a Book then restores it.

### M1 (medium): the nav-link claim is wrong for `/stats?…`, and the PUSH it really does breaks "Back from Stats leaves Stats in one step"

- **Evidence.** AD-7: "a nav link's REPLACE to the same path included (the Card notes shelf, the Stats nav link from Stats)". `useLinkClickHandler` (`lib/dom/lib.js:615`) compares the full path with search, and `AppShell.tsx:61` is `<NavLink to="/stats">` with no `replace`. From `/stats?range=lastYear&period=2025-03` the nav link **pushes** `/stats`. That adds a Stats entry, so EXPERIENCE.md's "Back from Stats leaves Stats in one step" fails after a nav-link reset. The Back then is a POP inside the still-mounted `StatsPage` (same route element, not keyed), onto an entry whose state carries the marker. That feeds H1. The page must also re-derive the range, the period, Custom's fields and the "last focused bar" from that address.
- **Fix.** Correct the parenthetical ("a REPLACE from plain `/stats`, a PUSH from `/stats?…`"). Decide whether the Stats nav link passes `replace` while the pathname is already `/stats` (keeps "one step"), or accept the extra entry and say so. Either way, add: "a POP within Stats re-derives the range, bar and Custom fields from the address and forgets the last focused bar, as a range change does."

### M2 (medium): arrival scroll on Stats is unspecified, but EXPERIENCE.md requires "opens at the top" on Back

- **Evidence.** EXPERIENCE.md → Stats → Address → Not a route change: "Arriving on Stats, Back from a Book included, is a route change: focus goes to the `h1` and the page opens at the top." The spine says only that a marker replace "doesn't scroll", which is already true by default: there is no `ScrollRestoration`. AD-7's Card notes rule records that after a client POP the browser restores the old scroll position *after* the render, so it needs an explicit scroll to the top once the view is ready and again on the next frame. A long All time finished list makes Stats tall enough for this to show.
- **Fix.** Either adopt the Card notes treatment for a POP arrival on Stats (scroll to top, `behavior: 'auto'`, before the `h1` takes focus, again once the view is ready and on the next frame), or record that Stats keeps the browser's restored position and get EXPERIENCE.md changed to match. Don't leave it to the story.

### M3 (medium): the delta contradicts itself on the typeset cover's plate text

- **Evidence.** The amended Tiles bullet: "gets a typeset cover in Tiles and the Stats finished list only: read … is the exact `spineColor` with a plate holding the title and first author". The new finished list bullet: "a missing or failed cover gets the read typeset cover (the exact `spineColor`, a plate with no text)". DESIGN.md → Stats finished list → Typeset cover: "It holds no text at this size".
- **Fix.** Revert the Tiles bullet to "in Tiles only" and let the finished list bullet own its variant, or write "in Tiles (plate with title and first author) and the Stats finished list (plate with no text) only".

### M4 (medium): "changing the range" is undefined: the user's choice, or the resolved dates?

- **Evidence.** The bars bullet: "changing the range releases it and forgets the last focused bar". `StatsPage.tsx` derives preset ranges from `useNow()`, so at midnight This month's or This year's `to` changes, which gives a new query key without any action by the person. The page already separates the two (`selectionKey`, "The announcement follows a change of this, never a refetch or a new day"). One story can key the release on `range` (the bar drops at midnight, and focus memory goes with it). Another keys it on `selectionKey`.
- **Fix.** "A range change is a change of the person's selection (`selectionKey`: the preset, or Custom's ordered dates), never a new day or a refetch. A period that a new day takes out of the chart is released by the settled check, silently."

### M5 (medium): the settled check needs a `fetching` flag that `useStatsView` doesn't report, and its stale-copy case isn't decided

- **Evidence.** The Stats address: "The `period` is checked only against a settled stats view (AD-7, one-shot reads)". AD-7 → One-shot reads: "The view hook reports `fetching` (the query's `isFetching`) for this". `useStatsView` returns `{ …toViewState, current }` only. `current` excludes placeholder data but not a stale cached copy that is refetching (Back from a Book, a focus refetch). The check also runs "after any later refetch", so it isn't one-shot. It releases a bar and **rewrites the address** irreversibly. AD-7 says that a failed refetch keeps the cached copy and "counts as settled", which "a later view whose one-shot read can't accept it" must decide.
- **Fix.** Name it: "`useStatsView` reports `fetching` (`isFetching`); the period check runs only when `status === 'ready' && current && !fetching`." Then decide in one sentence whether a failed refetch's cached copy may release a bar (accepted, like the carried search) or must wait for a successful fetch made after arrival.

### L1 (low): where `get_stats`'s new description lives, for the test parser

- **Evidence.** AD-21 now says each description equals its text in `epics.md` "(… or Epic 17 for `get_stats`)". `backend/tests/agent_client.py` `_parse_descriptions` reads only Epic 12 and Epic 13, by story (`_STORY_OF`, `_EPIC_13_STORY_OF`), and asserts Epic 12's line count. `epics.md` has no Epic 17 yet (plan step 5).
- **Fix.** Name the story: "Story 17.1's `**Description:**` line for `get_stats` replaces Story 12.2's, as Story 13.3's does for `export_backup`; `_parse_descriptions` reads it." Also tidy the sentence "whose text is then Epic 17's in `epics.md`".

### L2 (low): "the author line is the catalog's" names no shared function

- **Evidence.** The only place that writes "and N others" is inline in `lib/catalog.ts` `spineName` (lines 124–127). There is no exported author-line helper, and no visible catalog author line uses `authorCount`.
- **Fix.** Name it: extract `authorLine(firstAuthor, authorCount)` in `lib/catalog` and use it in `spineName` and the finished list (an empty `firstAuthor` gives `''`, as `views/shelf.py:59` sends), so the two can't drift.

### L3 (low): `StatsFinish` has no identity for a row key

- **Evidence.** The delta orders two finishes of one Book on one day by the Readings' stored order, but the row carries no Reading id. `bookId` plus `finishDate` isn't unique, so a list keyed on it gets duplicate React keys.
- **Fix.** Add `readingId` to `StatsFinish`, or say the list keys rows by index (safe, since it never reorders).

### L4 (low): `finishedPages` nullability on a row

- **Evidence.** `domain/model.py:58` `finished_pages: int | None`; `views/stats.py` sums `None` as 0. "Read as stored" makes `StatsFinish.finishedPages` nullable, and EXPERIENCE.md's row ("611 pages") has no copy for null.
- **Fix.** Either type it `int` (a finished Reading always stores it, AD-11 → Finished Reading) and say so, or define the row for null (leave out the pages part, as an unrated finish leaves out the stars).

### L5 (low): what the address holds when the page rewrites it

- **Evidence.** "the address is replaced with what the page shows", yet "A plain `/stats` is This year … and isn't rewritten". It doesn't say whether `?range=bogus` becomes `/stats` or `?range=thisYear`, nor what happens to extra parameters (`?range=thisYear&from=…`). Separately, the setter's function form reads render-time params (freshness table), so two writes in one event lose one.
- **Fix.** "`lib/stats` builds the whole canonical search from the page's state in one call: a fallback to This year writes plain `/stats`, unknown parameters are dropped, and each change is a single `setSearchParams` call."

### L6 (low): wording

- "the heading's and the announcement's count is that bucket's `books`": the heading has no count ("Finished in March 2026"). Say "the announcement's count".
- "This is the one page state kept in the address": `/card-notes?book=<id>` is in the address too. Say "the one page state; `?book=` on Card notes is a scope, not page state".

## Checked and fine

- `finishes` order and its total tie-break (`finishDate` desc, title key, Book id, stored Reading order) match the Consistency Conventions' title key and today's `views/stats.py` collection. The "rows add up to `books`" invariant holds by construction, because both come from the same `finishes` list.
- Period filtering by `finishDate.startsWith(period)` is correct for both `YYYY-MM` and `YYYY`, and needs no client count (AD-6 holds).
- AD-8 (Python first, then `api:gen`), AD-11 (read as stored), AD-15 (unchanged; nothing in `localStorage`) and AD-17 (names come from EXPERIENCE.md) aren't weakened.
- AD-21: `get_stats` returns the view as is (`agent/read_tools.py:84–87`), so `finishes` reaches the agent with no tool change beyond the description. The exact tool list is unchanged.
- `StatsPage` isn't keyed by `location.key` today, so "a bar keeps focus across a replace" ratifies the code.
- `lib/bookDetail` `starsLabel` and `coverSrc` exist (lines 75, 121) as cited.
