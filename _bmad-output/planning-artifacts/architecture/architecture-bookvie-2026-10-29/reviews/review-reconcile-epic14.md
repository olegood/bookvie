# Reconcile review: Epic 14 (card note boxes)

Reviewer: independent reconcile pass, 2026-11-23. Read-only except this file.

Inputs checked against the spine's uncommitted Epic 14 diff (AD-6, AD-7 "Carried Card notes search", AD-15, Structural Seed lib/ and components lines, Capability map FR-17 to FR-19 row, frontmatter `sources`) and the Epic 14 memlog lines:

- Plan `card-note-boxes-plan-2026-11-23.md` D1–D15 and step 4.
- PRD FR-19 amendment (commit `7b153cb`).
- EXPERIENCE.md → Card notes shelf, including "Starts empty" and "Notes for architecture"; State Patterns rows for Card notes.
- DESIGN.md → Card note box, Open box strip.
- Code: `frontend/src/pages/CardNotesPage.tsx`, `frontend/src/lib/useSearchCount.ts`, `frontend/src/components/PageHeading.tsx`, `frontend/src/main.tsx`, `backend/bookvie/views/models.py`, `backend/bookvie/agent/read_tools.py`.

The "page keeps it" mechanism is taken as chosen and not re-argued. The findings below only check that the spine's statement of it covers every UX case and doesn't contradict an input.

**Verdict:** the spine takes every plan step 4 item, and the carried search rule handles every listed UX case. Two quiet gaps remain: the spine never says it supersedes the "text travels in router state" wording in the plan and the UX, and the rule only applies to `?book=` changes. A few lower-level mechanics are left unstated.

## Coverage that landed correctly

| Requirement | Input | Spine |
|---|---|---|
| `bookvie.cardNotesView`, `"boxes"`/`"list"`, try/catch, missing/junk/throwing read means Boxes, failed write holds for the visit, never exported, restore never touches it | Plan D3, D5; EXPERIENCE "Remembered"; PRD "Boxes or list" | AD-15 UI preferences bullet; Binds gains FR-19; Seed `lib/cardNotesView` |
| `spineColor` on `CardNotesGroup` and `CardNotesScope`, scope even with no notes | Plan D15, D14 (Amelia); EXPERIENCE note | AD-6 server computes |
| Exact spine color whether read or unread, never `spine-unread-*` | DESIGN Card note box → Front; PRD "in its spine color, read or not" | AD-6 client bullet |
| Box order = groups' order, neither view sorts | Plan D7; EXPERIENCE "Boxes view" | AD-6 client bullet |
| One matcher for List, open box, M of N, shelf sentence | Plan D10, EXPERIENCE "Search on the shelf: same matching as the List" | AD-6 client bullet |
| Pile steps 1/3/5/7 and count line as client presentation | Plan D6, D9 | AD-6 client bullet |
| Search never in the URL; reload ignores it even though `history.state` survives; Back finds the latest text | EXPERIENCE "Notes for architecture"; plan D12 | AD-7 Carried Card notes search |
| Boxes ⇄ List keeps the text | Plan D13; PRD; EXPERIENCE "Two views" | AD-7 last sentence |
| No server change beyond the field; no data or backup format change | Plan D15 | Nothing else touched in AD-13/AD-14/AD-18 (correct) |
| Map row marks Boxes as planned; plan in `sources` | Plan step 4 | Map preamble and row; frontmatter |

### Carried search walk-through (rule as written)

The rule as written: keep the text on a PUSH carrying the marker, and on a POP landing on the `openedFrom` of the entry just left. A remount starts empty.

| UX case (EXPERIENCE.md) | Navigation | Result | OK? |
|---|---|---|---|
| Into a box with "habit" | PUSH, marker + `openedFrom`=K1 | kept | yes |
| Back out with the latest text ("habits") | POP to K1, left entry's `openedFrom`=K1 | kept, latest React value | yes |
| Remove the chip, entered from the shelf | PUSH, marker | kept | yes |
| Remove the chip, entered from Book detail ("whichever way") | arrival remounts (empty, as UX says for "See card notes"), then PUSH with marker | kept | yes |
| Back from the chip's shelf to the open box | POP, left entry has no `openedFrom` | empty | yes |
| Then Back again to the first shelf | POP to K1, left entry's `openedFrom`=K1 | "kept" = the empty value | consistent |
| Forward to the open box after Back | POP, left entry (shelf) has no `openedFrom` | empty | yes |
| Reload of either entry | remount | empty; later Back "keeps" the empty value | yes |
| Nav link from the open box | PUSH, no marker, `?book=` change | empty | yes |
| Nav link **on the shelf** / Forward between two **same-scope** entries | not a `?book=` change | rule silent → kept | **no, see M1** |
| "See card notes", "See all card notes", Back to the shelf from another in-app page | other route → remount | empty | yes |
| Typed URL | new document | empty | yes |
| Back to the shelf across documents (typed URL, then Back) restored from bfcache | no remount | text survives | **no, see M3** |
| Box opened with an empty field | PUSH, marker | kept empty | yes |

## Findings

### Critical

None.

### High

**H1. The spine never says it overrides "the text travels in router state" in the plan and UX. A builder will read that wording and put the text in `history.state`.**

- Input: EXPERIENCE.md → Card notes shelf → Temporary → *Notes for architecture*: "The carried text travels in router state, never in the URL." Plan D12: "The search goes with Oleg into the box and back out, **through router state**, not the URL"; plan §4 14.3: "the search carried into the box and back out through router state". PRD memlog: "router state … kept out of the PRD; they live in … the spine".
- Spine: AD-7 says the text is "never in the URL, in storage or in `history.state`". That is right for the user's choice, but nothing records that it supersedes D12 and the UX note. The memlog line ("user chose 'page keeps it' over router state plus an in-memory hand-off") is not something ATDD or the build reads. The Epic 13 precedent is "Where plan signatures differ … AD-22 wins" (memlog).
- Why it matters: the 14.3 ATDD and build work from the plan and from EXPERIENCE.md. Both say "router state". A literal reading puts the text in `history.state`, which is exactly the reload and Forward bug the rule prevents.
- Proposed spine fix: end the AD-7 Carried Card notes search bullet with: "This supersedes plan D12's and §4's 'through router state' and EXPERIENCE.md's *Notes for architecture* wording: router state carries only the marker and `openedFrom`, never the text." Also flag to the UX owner that the *Notes for architecture* bullet's removal condition ("until the architecture spine records them") is now met. That bullet should be removed or reworded at the next UX touch. That is not a spine edit.

### Medium

**M1. The rule only applies to "a `?book=` change". Same-scope navigations (the nav link on the shelf, Forward or Back between two shelf entries) keep the text, while the UX lists "the nav" and "Forward" as starting empty.**

- Input: EXPERIENCE "Starts empty: Every other way into the page starts with an empty field …: the nav, … a reload (even of the same history entry), Forward, a typed URL." Plan D12: "Every other way into the page (nav, …, Forward to a fresh entry) starts empty."
- Spine: AD-7 says "On a `?book=` change, the page keeps the text in two cases only … Every other change starts empty: the nav link, …, Forward, any other POP." A nav click while on `/card-notes` with text in the field pushes a new entry with the same (absent) `?book=`. The rule doesn't apply, so the text is kept. The same goes for Back and Forward between that entry and the previous shelf entry. Today's code does the same, because `key={bookId ?? ''}` doesn't change. So the spine silently preserves today's behavior, and that behavior contradicts the UX's literal list.
- Proposed spine fix: state the rule over every location change of the Card notes route, meaning every new `location.key`, not only `?book=` changes. Then "the nav link" holds on the shelf too. Add "Switching Boxes ⇄ List changes no location", which is already implied. If Oleg prefers today's behavior, where the nav click on the shelf keeps the text, record that as an explicit exception instead, so the UX row gets amended.

**M2. Where the text lives relative to today's per-scope remount is unstated. Lifting the whole body, or nothing, both break something.**

- Input: plan §1 "`CardNotesPage.tsx:132`: a new scope … starts with an empty search"; code: `CardNotesPage` renders `<CardNotesBody key={bookId ?? ''} …/>`, and `query`, `useSearchCount`, the add, edit and pile flows and the ref maps all live inside the keyed body.
- Spine: "That page stays mounted across `?book=` changes, since the shelf and the open box are one route". That is true of the route element, but the body under it remounts per scope today. The spine doesn't say whether the per-scope key stays.
  - If the key stays and only the text is lifted, the debounced count, panels and pile still reset per scope. That is what's wanted: a count still pending from the open box, "3 notes match.", must not fire on the shelf, where the wording is the shelf sentence.
  - If a builder reads "stays mounted" as "remove the key", every per-scope ref and pending timer survives the scope change.
- Proposed spine fix: add "The text is held above the per-scope remount (`CardNotesPage`, above `CardNotesBody key={bookId}`). Everything else, including a pending count, the panels, the pile and the ref maps, still resets on each `?book=` change, as today." Also add "the page remembers the previous location (its `key` and `state`) to test 'the entry it just left'." The POP case needs the *left* entry's state, which the new location doesn't carry.

**M3. A Chrome bfcache restore is not a remount. "An arrival from another route remounts the page" is false across documents.**

- Input: EXPERIENCE "Starts empty: … Back to the shelf from any other page, … a typed URL." AGENTS.md → Supported browser: Chromium behavior is in scope.
- Spine: AD-7 "A reload, or an arrival from another route, remounts the page, so it starts empty too." Suppose the user types "habit" on the shelf, then types a bookvie URL in the same tab (a new document), then presses Back. Chrome can restore the shelf document from the back/forward cache with its React state, so the field still holds "habit". Today's search has the same exposure, so this is pre-existing. But the spine now asserts a guarantee it doesn't have, and the 14.3 tests are told to prove "starts empty".
- Proposed spine fix: either add "A `pageshow` with `persisted` (a bfcache restore) clears the text", or add a known gap: "a cross-document Back restored from the bfcache keeps the page's state, text included; accepted, as before Epic 14". Either way, the sentence should stop claiming a remount in that case.

**M4. The arrival announcement for a carried search has no mechanism in the spine. Today's count only fires on typing.**

- Input: EXPERIENCE "Into a box …: Focus goes to the `h1` … Once it has settled, `status` announces the count once, exactly as typing would"; "Back out …: once it has settled, `status` announces the view's own count once: the shelf sentence in Boxes, 'N notes match.' in List"; State Patterns → Carried search "the count is announced once after focus settles".
- Spine: AD-7 covers what text survives, but not that a kept, non-blank text must announce once on arrival. `useSearchCount.typed` is the only trigger today, and the page arrives without a keystroke. The announcement also has to wait for `PageHeading`'s focus on the `key` change and respect `lib/announce`'s tick (`isAnnouncing()`, cited in AD-7's app-info bullet).
- Proposed spine fix: add to the AD-7 bullet: "When the kept text is non-blank, the page announces the view's own count once (`useSearchCount`'s line for that view) after the `h1` has taken focus, through `lib/announce`. A blank kept text announces nothing."

### Low

**L1. That the agent's `get_card_notes` now carries `spineColor` is decided in the memlog but not stated in the spine.**

- Input: memlog decision "get_card_notes returns the same view, so it gains the field too (AD-21 mirrors views)"; `read_tools._get_card_notes` returns `views.require_card_notes(...)`.
- Spine: AD-21 says "A read tool returns its view's model by alias", so the result is implied. The AD-6 sentence doesn't name the tool, and story 14.1's tests (plan §5) only list the view.
- Proposed spine fix: append to the AD-6 `spineColor` sentence: "`get_card_notes` returns it too (AD-21); its description is unchanged." The description must keep equal to `epics.md`.

**L2. Where the box rules and the carried-search logic live is left open.**

- Input: plan §4 14.2 names `lib/cardNotesView.ts` only; plan §5 wants pile-step edge tests at 1, 2, 5, 6, 20 and 21, plus the D8/D11 accessible names.
- Spine: AD-6 says the pile step and count line "are computed in `lib/`", and the Seed's `cardNotes` entry still reads "(page refs, search, highlight, pile order)". The box's accessible-name builder, which has four match variants plus "no match", and the carried-search decision aren't placed anywhere. Tiles shows the precedent: "the tile's accessible name comes from the same builder as the spine's name".
- Proposed spine fix: name one module for these. Either extend the Seed `cardNotes` entry with "box pile step, count line and shelf sentence, a box's accessible name", or add `lib/cardNoteBox`. Name the carried-search decision as a pure function or hook in `lib/`, for example `lib/carriedSearch`, so the M1/M2 cases get unit tests without e2e.

**L3. A scoped Book whose last note is deleted inside the open box keeps a hidden text, which the chip or Back then carries out.**

- Input: EXPERIENCE "Back out … The field holds the open box's text at that moment".
- Code: `shownQuery = groups.length === 0 ? '' : query`. With no notes the field isn't rendered, but `query` persists.
- Proposed spine fix: define the carried value as "the field's text, empty when the page shows no field".

**L4. AD-17 doesn't list the box's names.**

- Input: plan D8, D11; EXPERIENCE "A box" and the match variants.
- Spine: AD-17 drives e2e by stable accessible names. The new link names change with the search, which is intentional. If the AD-17 list enumerates names, it should cite EXPERIENCE.md → Card notes shelf as their source. Optional.

### Not findings (checked)

- The 14.2 staging behavior (Boxes plus text shows List results) is temporary UX with its own removal condition. It needs no spine entry.
- The DESIGN fade of 0.38, forced colors, and the tokens: no spine entry needed. `tokens.css` must take the new `card-note-box.*` tokens verbatim (AGENTS.md; `e2e/app-shell.spec.ts`). That is already covered by the Seed's "DESIGN.md custom properties".
- Putting the carried search in AD-7, next to the other router-state hand-offs, is reasonable, and its Binds and Prevents lines are updated.
