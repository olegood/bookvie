# Adversarial review: Epic 17 Stats finished Books delta

- **Reviewed:** the uncommitted `ARCHITECTURE-SPINE.md` delta (`git diff -- _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md`): AD-6 Stats view `finishes` and its order, the Stats bars, the Stats finished list, the Stats address, the Tiles bullet's typeset-cover sentence; AD-7 "Same-page address replaces"; AD-21 `get_stats`; the tree lines; the FR-16 map row. Read alongside the full text of AD-6, AD-7 (one-shot reads, carried search), AD-15, AD-17 and AD-20.
- **Against:** `stats-finished-books-plan-2026-11-27.md` (D1–D17, story cut, tests); EXPERIENCE.md → Stats and State Patterns (Stats rows); the code in `frontend/src/pages/StatsPage.tsx`, `components/PageHeading.tsx`, `lib/page.ts`, `main.tsx` (the `markNavigated` subscription), `api/views.ts` `useStatsView`, `lib/stats.ts`, `lib/catalog.ts` `spineName`, `lib/bookDetail.ts` `starsLabel`.
- **Method:** build two units one level down (Story 17.1's builder and Story 17.2's builder, `StatsPage` and `PageHeading`, `lib/stats` and the server) that each obey every AD to the letter, then find where they still clash. Each finding names the pair, the AD text that allows both, and the wording that closes it. Presentation (colours, sizes, copy) and Safari/Firefox-only behaviour are out of scope.
- **Date:** 2026-11-27.

## Verdict

**Not ready for Story 17.1's ATDD as written.** The server side holds: one `finishes` list, a total order, and the agent reading the same view. The holes are all in the client address model. "The range lives only in the URL" collides with Custom's half-typed dates and with today's "Custom after All time starts empty", and the same-page marker, as worded, also matches a Back/Forward/reload into a replaced Stats entry, which EXPERIENCE.md says must be a route change. Two critical and three high findings need spine wording before 17.1; the medium ones can land with 17.2's ATDD at the latest.

## What holds

- **The list can't disagree with the count.** `finishes` is "one per finished Reading the books count counts", the client "never sorts or counts", and the selected heading's count is the bucket's `books`. A Book finished twice gives two rows; side reads are in neither.
- **The order is total.** `finishDate` desc, then the server title key, then Book id, then stored Reading order. Two finishes of one Book on one day can't swap between fetches, so a roving Tab stop or a test's nth-row assertion is stable.
- **Filtering by period is safe for clipped ranges.** `finishes` is already clipped to `from`..`to`, so prefix-filtering a clipped year bucket (`2020` of a range starting 15 March 2020) can't pull in finishes outside the range.
- **The agent and the route can't drift.** `get_stats` returns "the stats view as is", and the description test reads Epic 17's text from `epics.md`.
- **`period` never reaches the server.** Bucket kind is decided only by the server (`bucket`), so the client never has to guess month vs year before the view arrives.

## Findings

### Critical

**C1. The same-page marker also matches Back, Forward and reload into a replaced Stats entry, so the arrival never takes focus or scrolls.**

- **Units:** `lib/page`'s marker test in `PageHeading` and `main.tsx` (17.1) vs `StatsPage`'s replace writer (17.1); felt by every POP into Stats.
- **AD text that allows both:** AD-7 "a page that keeps its own state in the address replaces it with a router-state marker … A location that carries the marker isn't a route change: `PageHeading` doesn't take focus, the `main.tsx` subscription doesn't call `markNavigated` for it, and the page doesn't scroll."
- **The clash:** router state is stored in `history.state`, so the marker stays on the history entry the replace wrote. Choose a range (marked replace), open a Book (push), press Back: the POP lands on the entry that carries the marker. `PageHeading` mounts fresh, reads `location.state`, sees the marker, and skips focus. EXPERIENCE.md → Stats → Address says "Arriving on Stats, Back from a Book included, is a route change: focus goes to the `h1` and the page opens at the top." Builder A tests "the location carries the marker" (the letter of AD-7) and breaks that. Builder B tests "a REPLACE carrying the marker" and keeps it. Both read AD-7 as written. The same happens on reload: hard-reload a marked entry, then go to a Book and press Back. And because `markNavigated` is "not called for it", a session whose first change is a POP into a marked entry never marks navigated at all.
- **Fix (AD-7, replace the second sentence):** "A location change is a same-page replace only when all three hold: the navigation type is `REPLACE` (`useNavigationType`), the new location carries the marker, and the location it replaces was rendered by the same route component without a remount. A PUSH or POP is always a route change, whatever its state carries, so Back, Forward and a reload into an entry a replace wrote are arrivals: `PageHeading` takes focus, `markNavigated` is called, and the page opens at the top. `lib/page` exports the one predicate (`isSamePageReplace(location, navigationType)`); `PageHeading`, the `main.tsx` subscription and `StatsPage`'s scroll all call it, and none reads the marker directly. The `main.tsx` subscription stays subscribed past a same-page replace and unsubscribes on the first location change that isn't one."

**C2. "The range lives only in the URL" can't hold Custom's half-typed dates, and the page's own write is then parsed as a bad address.**

- **Units:** `lib/stats`'s address parser with its quiet fallback (17.1) vs the Custom From/To fields in `StatsPage` (existing, story 6.3, kept by 17.1).
- **AD text that allows both:** AD-6 Stats address: "the range and the selected bar live only in the URL's search (`range`, `from`, `to`, `period`) … The range is read from the address at once; an unknown `range`, or a Custom without two valid dates, is This year, and the address is replaced with what the page shows." EXPERIENCE.md: from/to are written "in order after the silent swap".
- **The clash:** today `StatsPage` holds `customFrom`/`customTo` as strings that may be empty or reversed; Custom after All time starts with both empty ("empty after All time"); the swap happens on blur or Tab, not per change. If the address is the only owner, builder A writes `?range=custom` with no dates when Custom is pressed after All time, re-reads it, and the parser turns it into This year: Custom can never be opened from All time. Clearing a field mid-edit snaps the picker back to This year. Writing reversed dates makes the parser order them, the replaced address feeds the fields, and the swap fires per keystroke instead of on blur. Builder B keeps the drafts in component state and writes only complete, ordered ranges, which breaks "live only in the URL". Both cite the same sentence.
- **Fix (AD-6, the Stats address, add):** "Custom's From and To text is page state in `StatsPage` (drafts), never in the address. The address is written only from a complete range: `range=custom&from&to` once both drafts are valid dates, ordered as the silent swap leaves them (the swap rule is unchanged: on blur or Tab). While a draft is empty or invalid, the address keeps `range=custom` with the last complete `from` and `to`, or none, and the page shows what it shows today for an incomplete Custom. The fallback to This year applies only when the page reads an address it didn't write: on arrival and on a route change (C1's predicate false). A same-page replace is never re-parsed into the drafts. On arrival, a Custom address with two valid dates fills the drafts with them in order."

### High

**H1. The heading, the list and the bar buttons can come from two different ranges while `keepPreviousData` shows the old view.**

- **Units:** `StatsFinishedList`'s heading (built in `lib/stats` from the address's range, 17.1) vs its rows and the bars (from `stats.data.view`, which is the placeholder of the previous range while the new one loads); 17.2's bar buttons on that placeholder.
- **AD text that allows both:** AD-6 finished list: "it renders the view's `finishes` in the view's order"; "the heading … built in `lib/stats`" with no source named; the Stats address: "`lib/stats` parses the address". `useStatsView` uses `placeholderData: keepPreviousData` and reports `current`.
- **The clash:** switch from This year to Last year. Builder A builds the heading from the parsed address ("Finished last year") over This year's placeholder rows. Builder B builds it from `shown.range`. In 17.2, the placeholder's bars are buttons, so a press during the load writes a `period` from the old range next to the new range; the settled check then silently releases it, and the press does nothing. The existing announcement already waits for `current`; nothing says the list or the bars do.
- **Fix (AD-6, the Stats finished list and bars, add):** "Everything under the range picker (totals, bars, the list's heading and rows, the selected bar and the period check) renders from one shown view and its own `shown.range`, never from the parsed address. While the shown view is a placeholder (`current` false), the bars are drawn but none is a button, no bar is pressed, and the list isn't narrowed."

**H2. Announcements have three owners, and the Stats nav link from Stats speaks although "Opening Stats announces nothing".**

- **Units:** the existing selection-key effect in `StatsPage` (story 6.3, announces "N books, M pages." when the chosen range changes), 17.2's select and widen announcements, and the silent period release (AD-6); the Stats nav link from Stats (AD-7: a route change, body not keyed by `location.key`).
- **AD text that allows both:** AD-6 bars: "changing the range releases it"; the address: the release on refetch is "with no message"; AD-7: "`StatsPage`'s body isn't keyed by `location.key`"; EXPERIENCE.md: "Widening, by the bar or by Show the whole range, announces the range's line … Opening Stats announces nothing, whether from the nav, a reload, Back …".
- **The clash:** builder A derives announcements from address diffs: a period that disappears is a widening, so it speaks the range line, including on the silent refetch release and on the nav link from Stats. Builder B announces from handlers only. Either way, the nav link from Custom on Stats is a REPLACE to plain `/stats`. The body doesn't remount, the `announced` ref still holds the Custom key, the selection becomes This year, and the existing effect speaks "N books, M pages." on a nav arrival. The roving "last focused bar" also survives that route change, though EXPERIENCE.md says a range change forgets it.
- **Fix (AD-6, the Stats address, add; AD-7, amend the last sentence):** "Stats announces only from the person's own press: a range or Custom change (the range line once the new view is current, as today), a bar press (the bar's heading line), a widening press (the range line). A change the address makes on its own (the settled release, a bad-address replace, an arrival) never speaks. `StatsPage`'s body is keyed by a route-entry key that changes on every location change except a same-page replace (C1's predicate), so a route change that stays on Stats, the nav link included, remounts it with a fresh announcement ref and roving memory; a same-page replace keeps them."

**H3. The period's validity rule can be read as the list's prefix rule, so `YYYY` on a month chart is either ignored or accepted.**

- **Units:** 17.2's period check (address vs settled view) vs 17.2's list filter (`lib/stats`).
- **AD text that allows both:** AD-6 finished list: "filtering on the period, a `finishDate` that starts with the bucket's `period`"; the address: "whenever the settled view has no bucket with finishes for it". "For it" doesn't say exact match.
- **The clash:** builder A reuses the one prefix matcher for both: `period=2026` on a month chart matches buckets `2026-01`..`2026-12`, so it is "a bucket with finishes" and the list narrows to 2026 under "Finished in 2026" with no bar pressed. Builder B requires `bucket.period === period` and releases it, as plan D14 and EXPERIENCE.md want ("is the wrong kind … is ignored"). `period=2026-3` (no zero pad) splits them the same way.
- **Fix (AD-6, the Stats address):** "The `period` is valid only when it equals, as a string, the `period` of a bucket of the settled view with `books` > 0. Only a valid period narrows the list (by the `finishDate` prefix above); nothing narrows, presses a bar or names a heading from an invalid one. `lib/stats` exports both: `selectedBucket(view, period)` and `finishesIn(view, bucket)`."

### Medium

**M1. Focus has no owner when the focused or selected bar stops being a button.**

- **Units:** `StatsBars`' roving tab stop (17.2) vs `StatsPage`'s settled release (17.2); "Show the whole range" moving focus to "the bar that was selected".
- **AD text:** AD-6 bars: "An empty bucket is drawn but isn't a button"; the address: a period with no finishes after "any later refetch" is released.
- **The clash:** an edit in another tab, or an agent's `edit_book` "Finished on" change (AD-19, AD-21), moves the only finish out of March. On the focus refetch, March becomes an empty bucket, so its button unmounts while it has focus, and focus drops to `body`. Builder A leaves it there; builder B moves it to the nearest bar. If the period was selected, the release also fires, and Show the whole range (if pressed in the same tick) targets a bar that no longer exists.
- **Fix (AD-6, bars):** "When the focused bar stops being a button, `StatsBars` moves focus to the nearest bar with finishes, the later one on a tie, else to the list's heading, else to the range picker's checked option; it never leaves focus on `body`. Show the whole range focuses the selected bar if it is still a button, else follows that rule. The release itself moves no focus."

**M2. Scroll on arrival has no owner.**

- **Units:** `StatsPage` (17.1) vs the browser's scroll restoration on POP; `CardNotesPage` owns its own scroll (AD-7 carried search), but nothing says Stats does.
- **AD text:** AD-7: a same-page replace "doesn't scroll"; EXPERIENCE.md: an arrival "opens at the top". The spine says who doesn't scroll, not who does.
- **The clash:** with All time's few hundred rows, Back from a Book lands mid-list under builder A (browser restoration, no code) and at the top under builder B (copies `CardNotesPage`'s scroll-to-top plus the post-POP frame). Both pass a short-list e2e test.
- **Fix (AD-7, same-page replaces, add):** "On a route change into Stats, `StatsPage` scrolls to the top (`behavior: 'auto'`) before the `h1` takes focus, and after a POP again once the view is ready and on the next frame, as `CardNotesPage` does."

**M3. The typeset cover for a Stats row is specified twice, differently.**

- **Units:** the shared typeset cover in `pages/CatalogTiles` vs `StatsFinishedList`.
- **AD text:** the Tiles bullet now says "a typeset cover in Tiles and the Stats finished list only: read … with a plate holding the title and first author"; the finished-list bullet says "the read typeset cover (the exact `spineColor`, a plate with no text)".
- **The clash:** builder A reuses Tiles' component (plate with text); builder B builds a second one (empty plate). This isn't only styling: it decides whether one component is shared, and whether its `alt=""` and text duplicate the row's `aria-label`.
- **Fix:** keep one sentence, in the finished-list bullet: "the read typeset cover from Tiles' component, with an empty plate at row size (a `plate={false}` prop)", and change the Tiles bullet back to "in Tiles (and, without its text, the Stats finished list)".

**M4. Nobody owns the canonical address string.**

- **Units:** 17.1's range writer vs 17.2's period writer vs the bad-address fallback.
- **AD text:** "`lib/stats` parses the address and builds it"; "the address is replaced with what the page shows".
- **The clash:** builder A uses `setSearchParams(prev => …)` and merges, so unknown params survive, and a range fallback keeps the old `period`, to be checked later. Builder B builds the whole string from state, which drops unknown params and the period. Whether This year after a change is `?range=thisYear` or plain `/stats`, and the param order, also differ, and "Back restores it" tests compare URLs.
- **Fix (AD-6, the Stats address):** "`lib/stats` `statsSearch(state)` builds the whole search string from `{ preset, from, to, period }`, in the order `range`, `from`, `to`, `period`, with no other params. Every write passes its output whole; nothing merges into the current search. A preset is always written by name (`?range=thisYear`); only the nav link gives plain `/stats`. A range fallback or any range change writes no `period` (plan D15)."

### Low

**L1. "Valid date" is defined twice.** `lib/stats` `isIsoDate` accepts `0000-01-01` (JS `new Date(0, …)` maps year 0 to 1900, and the month/day check still passes), while the server's `date.fromisoformat` refuses year 0 with a 422. A hand-edited address then shows "Couldn't load", against D14 ("must never break the page"). **Fix:** "the address's dates are valid when `isIsoDate` holds and the year is 0001–9999; `isIsoDate` checks the year too, so client and server agree. A case table shared with `views/stats` (as `pageField.cases.json`) keeps them in step."

**L2. The author line has no shared builder, and no-author has no stated shape.** The spine says the row's author line "is the catalog's", but "and N others" lives inline in `lib/catalog` `spineName`, and `StatsFinish.firstAuthor` doesn't say `""` or `null` when there is no author (the catalog uses `""`). **Fix:** "`firstAuthor` is `""` when the Book has none, as on `ShelfBook`; `lib/catalog` exports `authorLine(firstAuthor, authorCount)`, used by `spineName` and the Stats row."

**L3. "Changing the range" is either the preset or the resolved dates.** At midnight on 1 January, `useNow` ticks and This year resolves to new dates. Builder A treats that as a range change: it clears the bar, forgets the last focused bar, and per H2's handler rule doesn't speak. Builder B keys on the address (`range=thisYear` is unchanged) and lets the settled check release a vanished period. **Fix (AD-6, bars):** "A range change is a change of the address's `range`, `from` or `to` by the person; a new local day isn't one. A period that a new day removes goes through the settled release."

**L4. `markNavigated`'s subscription unsubscribes on the first location change.** If it must skip same-page replaces, it has to stay subscribed until the first change that isn't one. Folded into C1's fix; listed so 17.1's gate names `main.tsx` as a changed leaf (the plan names `lib/page.ts` and `PageHeading.tsx`).
