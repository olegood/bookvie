# Adversarial review: Epic 14 card note boxes delta

- **Reviewed:** the uncommitted `ARCHITECTURE-SPINE.md` delta (`git diff -- _bmad-output/planning-artifacts/architecture/`): AD-6 `spineColor` on the `card-notes` view and the "Card notes page's two views" bullet, AD-7 "Carried Card notes search", AD-15 `bookvie.cardNotesView`, the source line, the tree lines and the capability map row.
- **Against:** `card-note-boxes-plan-2026-11-23.md` §4 (stories 14.1 to 14.3), EXPERIENCE.md → Card notes shelf, `frontend/src/pages/CardNotesPage.tsx`, `frontend/src/main.tsx`, `frontend/src/components/PageHeading.tsx`, `frontend/src/lib/page.ts`, `frontend/src/api/views.ts`, `backend/bookvie/views/models.py`, `backend/bookvie/agent/read_tools.py`, react-router 8.5.1 (`frontend/node_modules/react-router/dist/development/lib/router/history.js`, `components.js`, `dom/lib.js`).
- **Method:** build two units one level down that each obey every AD to the letter, then look for the place where they still clash. Each finding names the pair or the UX case, why the current wording allows it, and the wording that closes it.
- **Date:** 2026-11-23.

## Verdict

AD-6 and AD-15 hold. AD-7's carried-search rule decides the right cases, but it leaves open how the page works out which case it's in. As worded, an implementation can pass every e2e test and still break in `npm run dev` or on Back with a dialog open. Two high findings need new wording before story 14.3's ATDD. The rest are medium or low.

## What holds

- **The rule can be built with react-router 8.5.1.** A page that stays mounted can remember the last location it rendered (`useLocation()` gives `key` and `state`), and `useNavigationType()` gives PUSH, POP or REPLACE. So on a POP it can learn which entry it left and what state that entry had. There is no router API for "the entry I left", so the page has to record it itself (see H2).
- **`location.key` survives a reload.** `createBrowserHistory` reads the key from `history.state.key`, which the browser keeps across a reload (`history.js:144`, `:171`). The first entry of a document has no key, so it reads `"default"` (the `idx` replaceState at `:277` doesn't add one). That makes `openedFrom: "default"` correct when the shelf is the first entry. Within one document only that one entry is `"default"`, so it can't collide with another entry.
- **Reload ignores the marker.** A reload remounts the page, and the rule never seeds the text on mount. A carry marker left in `history.state` is never read on mount, so a reload, an arrival from another route and the first load (which `useNavigationType()` reports as POP) all start empty.
- **The cases reach the UX outcomes.** These sequences come out as EXPERIENCE.md says:
  - shelf → box → Back keeps the latest text;
  - box → chip keeps the text, and Back from there gives an empty box;
  - Back, then Forward to the box, starts empty;
  - Book detail's "See card notes" → type → chip keeps the text;
  - after a detour to another route, Back to the box then Back to the shelf keeps the remounted box's text.
- **One matcher.** `noteMatches` already trims (`needle`), so the List, the box pill and the shelf sentence can't disagree on spaces. The sentence quotes the trimmed text, and the matcher also trims.
- **AD-15.** The single key, its two values, falling back to Boxes and keeping the choice for the visit when the write fails match `catalogView.ts`. Nothing clashes with export or restore.
- **AD-6 `spineColor`.** It has the same name and meaning as `ShelfBook.spine_color` and `BookDetailView.spine_color` (`models.py:36`, `:279`): resolved and never null. Putting it on the scope covers the box for a Book with no notes.

## Findings

### Critical

None.

### High

#### H1. "Stays mounted" doesn't say what else survives a `?book=` change

- **Pair:** story 14.3 implementation A against implementation B. Both obey AD-7 to the letter.
  - **A** lifts `query` into `CardNotesPage` and keeps `<CardNotesBody key={…}>`, so everything else still remounts.
  - **B** drops the `key` from `CardNotesBody` entirely, which is the shortest way to make "that page stays mounted" true.
- **What breaks in B** (all from today's `CardNotesPage.tsx`):
  - **The pile or an Edit panel stays open across Back.** Open a pile in the box, then press browser Back. A POP to the shelf keeps `usePileFlow`'s open pile, which still shows the old Book's notes, over the shelf. The Card note panel (`useCardNoteEditFlow`, `useCardNoteFlow`) does the same: a later save's focus target (`cached: () => cachedView(bookId)`, `groupHeadings`) now points into the other scope. Today the remount closes all of them.
  - **The old count speaks over the new page.** `useSearchCount`'s pending timer from the shelf survives. The chip calls `count.cancel()`, but Back doesn't, so the old "N notes match." can be announced after the carried announcement, or instead of it.
  - **The view can show the wrong scope.** Nothing stops B from adding `placeholderData: keepPreviousData` to `useCardNotesView` to avoid a blank frame; `useStatsView` (`api/views.ts:285`) is the precedent. Then the open box renders the shelf's groups under the new chip and strip until the fetch lands, and the strip shows "before the view has loaded". EXPERIENCE.md forbids that.
- **Why the wording allows it:** "That page stays mounted across `?book=` changes" says nothing about what is kept beyond the text.
- **Fix:** replace the second and third sentences of the carried-search bullet with:

  > The search text lives only in React state of the route component, `CardNotesPage`. Nothing else crosses a navigation: the page's body is keyed by `location.key`, so every history entry gets a fresh body (its view query without placeholder data, its pile, panels, pending count and focus maps), exactly as a remount. The body reads the text from `CardNotesPage`; the text is the only thing that survives from one entry to the next, and only in the cases below. The text is never in the URL, in storage or in `history.state`, because the browser keeps a history entry's state across a reload.

  Keying by `location.key` rather than `bookId` also fixes M1's same-scope cases. A Boxes ⇄ List switch is no navigation, so it keeps the body.

#### H2. How the page learns "the entry it just left" is unspecified, and two natural builds fail

- **Pair:** three implementations that each satisfy "a POP that lands on the `openedFrom` of the entry it just left".
  - **Ref written during render** (`prev.current = location`). In React StrictMode, which `main.tsx` turns on, the second render sees the ref already updated. It decides "no change" and keeps the text on every Forward and every other POP. StrictMode's double render happens only in development. The e2e suite runs a `vite build` (`e2e/global-setup.ts`), so every e2e test passes while `npm run dev` is wrong.
  - **`useEffect` reset** (`useEffect(() => { if (!keep) setQuery('') }, [location.key])`). The new entry first paints with the old text: the box shows filtered notes with `<mark>`, and the count timer starts. Then it clears. That frame is visible, and the announcement can fire for the wrong text.
  - **Comparing the last rendered location.** `RouterProvider` applies router state inside `React.startTransition` (`components.js:159`; `useTransitions` is left undefined). A fast Back then Forward can commit only the final location, so the page sees box → box: no change, and the text is kept on a Forward. A fast Back twice can skip the middle entry in the same way.
- **Why the wording allows it:** AD-7 states the outcome but not where the comparison happens. Unlike the finish and last-page hand-offs, it doesn't point to the repo's "adjust state during render keyed by `location.key`" pattern (`HomePage.tsx:155`, `:170`, `:200`).
- **Fix:** add after the two cases:

  > The page decides during render, never in an effect and never by writing a ref in render: it keeps the last location it handled, `{ key, state }`, in React state and, when `location.key` differs, sets the text and that location in the same render (the `HomePage` hand-off pattern), so StrictMode's double render decides the same way. "The entry it just left" is that handled location. A transition the router coalesced (two history moves committed as one render) counts as a move from the handled location to the current one; if those are the same entry, nothing changes. A unit test runs the decision under `<StrictMode>`, because the e2e suite runs a production build.

  If coalesced moves must be exact, record each router transition instead (`{ from, to, action }` from `router.subscribe`, registered next to `markNavigated` in `main.tsx`) and decide from the record whose `to.key` is the current key. Pick one in the spine; either closes the hole.

### Medium

#### M1. The trigger is "a `?book=` change", not a location change

- **Case:**
  - On the unscoped shelf, the nav link "Card notes" goes to the same path. `useLinkClickHandler` makes that a REPLACE with a new key (`dom/lib.js:615`), and `?book=` doesn't change. AD-7 says nothing about it, so the text stays. EXPERIENCE.md → Starts empty lists "the nav".
  - `/card-notes?book=` (empty) and `/card-notes` both parse as unscoped (`params.get('book') || undefined`). Whether moving between them is "a `?book=` change" depends on whether you compare the raw parameter or the parsed id.
- **Fix:** change "On a `?book=` change" to:

  > On every change of `location.key` on this route (PUSH, REPLACE or POP, whatever `?book=` does)

  Add "REPLACE" to the list that starts empty, so the nav link on the shelf empties the field. If Oleg wants the nav link on the shelf to keep the text, as today's `key={bookId}` does, say so explicitly instead. Either way the spine has to decide it.

#### M2. Document boundaries and bfcache aren't named

- **Cases:**
  - **Back after a reload of the box.** The reload gives the box entry a new document, so the shelf entry behind it belongs to the old one. Back is then a cross-document traversal: the page loads again (or comes from bfcache) and starts empty, even though "a POP that lands on `openedFrom`" reads as if it would keep the text. An ATDD author writing "reload the box, type, Back keeps the text" from AD-7 gets a red test that can never go green.
  - **bfcache.** Shelf with "habit" → a typed external URL or another site → Back. Chrome can restore the whole document from bfcache with React state intact, so the shelf comes back holding "habit". That isn't a reload, it isn't an arrival from another route, and it isn't a POP that React Router sees as a change. EXPERIENCE.md → Starts empty only lists ways into bookvie, so this is probably acceptable, but it is unstated. Today's page behaves the same.
- **Fix:** add:

  > A history move that crosses a document (any Back or Forward past a reload or a typed URL) loads the page afresh and starts empty; no test expects a carry across one. A bfcache restore keeps the page as it was left, as before Epic 14.

#### M3. Which count the carried announcement is computed from is unbound

- **Pair:** the page decides "carried" on the navigation (H2), and `useSearchCount` counts from whatever `groups` hold when its timer fires.
- **What breaks:** with a slow or cache-missed scoped view, a timer started on the navigation counts the loading state's empty groups and announces "0 notes match." for a box that has 3 matches. If the build also uses placeholder data (H1), it counts the old scope.
- **Fix:** add:

  > A carried search's single announcement is computed from the new entry's view once it is `ready`, after the `h1` has focus; if the view fails or is missing, nothing is announced. The scheduling effect cancels on cleanup, so StrictMode's double mount announces once.

#### M4. Scrolling to the top on a `?book=` change has no owner

- **Case:**
  - Nothing in the app scrolls on navigation. There is no `ScrollRestoration`, and the only `scrollTo` is `BackToTop`. Today the page "opens at the top" only by accident: the remount renders `null` while loading, and the shorter document clamps the scroll position.
  - Once the page stays mounted (or the body remounts with the view already cached), a PUSH from a scrolled shelf keeps the scroll offset. A POP lets Chrome's native `history.scrollRestoration = 'auto'` restore the shelf's old offset.
  - EXPERIENCE.md → Back out with the search says "The page opens at the top".
- **Fix:** AD-7, or AD-6 if it reads better there:

  > On every `location.key` change on the Card notes route, the page scrolls to the top with `behavior: 'auto'` before the `h1` takes focus.

  Otherwise, record that native restoration on Back is accepted and change EXPERIENCE.md to match.

### Low

#### L1. `get_card_notes` changes silently

- **What happens:** `_get_card_notes` returns `CardNotesView` itself (`agent/read_tools.py:74`), and `test_agent_read.py:262` compares the tool's output with the HTTP view. So story 14.1 adds `spineColor` to the agent tool too. That is correct under AD-21's "same views", but the delta and plan D15 ("No other server change") don't say it, so a 14.1 reviewer could flag it as scope creep.
- **Fix:** append to the AD-6 sentence:

  > the `get_card_notes` tool carries it too, as the same view (AD-21).

#### L2. AD-6's list breaks after the insertion

- **What happens:** the new sentences split the "The server computes:" list, so "The Main book's note count on Home (…), the Home bookcase slice's priority, stats …, and the `book` view's `editForm` …" is now a sentence fragment with no verb.
- **Fix:** move the two `spineColor` sentences after the `editForm` sentence. Alternatively, put them in parentheses after "story 5.3".

#### L3. An empty open box can carry invisible text

- **Case:**
  - A carried search can land on a box whose Book lost its notes in the meantime, for example through another tab or an agent's edit. That box renders "No card notes yet." with no field (`shownQuery = ''`), but the state still holds "habit".
  - The chip then carries a text the user never saw back to the shelf.
  - Nothing breaks an AD, and the result surprises the user.
- **Fix:**

  > While the view has no groups there is no field, and the text is dropped (set empty), so a chip or Back from an empty box carries nothing.

#### L4. Don't "fix" the `"default"` key

- **Risk:** an implementer may treat `openedFrom: "default"` as "no key" and skip the carry. That breaks the common case where the shelf is the first-loaded entry.
- **Fix:**

  > `openedFrom` may be `"default"` (react-router's key for a document's first entry), and is compared like any key.

#### L5. Who renders the box's link state is open

- **Pair:**
  - The plan builds `CardNoteBox` in 14.2 as a plain link, and 14.3 adds the marker and `openedFrom`.
  - The box component could read `useLocation().key` itself, or the page could pass the state down. Both obey the ADs, so nothing clashes.
  - But a 14.3 build that puts the text in the box's link state "to be safe" breaks AD-7 in a component the ADs never mention.
- **Fix:** name the owner:

  > `CardNoteBox` takes its link state from the page; only the page builds carry state.

## Proposed AD-7 bullet, with H1, H2 and M1 to M3 applied

> - **Carried Card notes search** (FR-19; Epic 14, story 14.3; EXPERIENCE.md → Card notes shelf): the search text lives only in React state of the route component, `CardNotesPage`, never in the URL, in storage or in `history.state` (the browser keeps a history entry's state across a reload). Nothing else crosses a navigation: the page's body is keyed by `location.key`, so each history entry gets a fresh body (view query without placeholder data, pile, panels, pending count, focus maps), and on each change of `location.key` the page scrolls to the top (`behavior: 'auto'`) before the `h1` takes focus. Router state carries only navigation facts, built by the page: a box link's push (from `CardNoteBox`, which takes it from the page) carries a carry marker and `openedFrom`, the shelf entry's `location.key` (possibly `"default"`, compared like any key); the "In *X*" chip's push carries the marker. On every change of `location.key` on this route, the page keeps the text in two cases only: a PUSH carrying the marker, and a POP that lands on the `openedFrom` of the entry it just left (Back from the open box), which keeps the open box's latest text. Every other change starts empty: the nav link (a REPLACE on the shelf itself), any other link, Forward, any other POP. The page decides during render, never in an effect or by writing a ref in render: it keeps the last location it handled, `{ key, state }`, in React state and updates it with the text in the same render (the `HomePage` hand-off pattern); "the entry it just left" is that handled location, and a router-coalesced move counts from it. A reload, an arrival from another route, or a history move across a document remounts the page, so it starts empty; a bfcache restore keeps the page as it was. While the view has no groups the text is dropped. A carried search is announced once, from the new entry's view once `ready` and after the `h1` has focus, by an effect that cancels on cleanup. Switching Boxes ⇄ List is no navigation and keeps the text. A unit test runs the decision under `<StrictMode>`, since e2e runs a production build.
