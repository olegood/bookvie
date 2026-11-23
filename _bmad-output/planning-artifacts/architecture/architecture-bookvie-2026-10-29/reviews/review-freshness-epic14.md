# Freshness review: Epic 14 delta (card note boxes)

Scope: `git diff -- _bmad-output/planning-artifacts/architecture/` on branch `bookboxes` (AD-6 `spineColor` and "Card notes page's two views", AD-7 "Carried Card notes search", AD-15 `bookvie.cardNotesView`, seed, map, frontmatter). Each claim checked against the installed code on 2026-11-23.

## Verified

| Claim in the delta | Evidence |
| --- | --- |
| react-router ~8.5.1 is the pinned router | `frontend/package.json:24` `"react-router": "~8.5.1"`; `node_modules/react-router/package.json` 8.5.1. App uses `createBrowserRouter` (`src/main.tsx:28`). |
| `location.state` is stored in `history.state` and survives a reload | `dist/development/lib/router/history.js:205-215` `getHistoryState` writes `{ usr: location.state, key, idx }` with `pushState`/`replaceState`; `createBrowserLocation` (`:137-171`) reads `globalHistory.state.usr` back on load. So the spine's reason for keeping the text out of `history.state` is correct, and router state (marker, `openedFrom`) is also still present after a reload. |
| `location.key` is stable across a reload | Same file: the key is read from `globalHistory.state.key`, else `"default"`; new keys come from `createKey()` (`:199`, random 8 chars) only on push/replace. |
| `useNavigationType` exists and reports PUSH / POP / REPLACE | Exported from `react-router` (`index.js:46`); `lib/hooks.js:102` returns `LocationContext.navigationType`, which a data router sets from `state.historyAction` (`router.js:200`, initial `init.history.action` = POP; `:239` history listener passes POP for Back/Forward; `:448` PUSH, REPLACE on `replace`). |
| First load reports POP | Initial `historyAction` is the browser history's action, POP. The rule is safe because it only acts on a `?book=` change while mounted, never on mount. |
| `CardNotesGroup` / `CardNotesScope` exist, without a color | `backend/bookvie/views/models.py:214-227`: scope `book_id`, `title`; group `book_id`, `title`, `notes`. Built in `views/card_notes.py` `_group` and `card_notes`. camelCase alias generator (`models.py:14`) yields `spineColor`. |
| The Book's resolved color field | `backend/bookvie/domain/model.py:94` `spine_color: str` (non-null; inputs `spine_color_user`, `spine_color_from_cover`, `spine_color_curated`), resolved by `domain/spine_color.resolve_spine_color`. `views/shelf.py:66,336` already sends it as `spine_color=book.spine_color`. "Stored resolved color (AD-11), sent as stored" is accurate. |
| `lib/catalogView.ts` as the pattern | `readCatalogView` / `writeCatalogView`, try/catch, junk or throw means the default, failed write silently keeps the in-memory choice. Matches the AD-15 wording for `bookvie.cardNotesView`. |
| `lib/cardNotes.ts` is the existing matcher | `noteMatches(text, query)` (`lib/cardNotes.ts:71`): trimmed, lower-cased substring, blank matches all. |
| The page stays mounted across `?book=` | `/card-notes` is one route element (`main.tsx`), so `CardNotesPage` is not remounted by a search-param change. |
| `get_card_notes` returns the same view | `agent/read_tools.py:74-76` returns `views.require_card_notes(...)`, so it gains `spineColor` too (recorded in the memlog, not in the spine; see Rubric L-3). |

## Findings

### High

**F-H1. Same-URL nav click is a REPLACE with no `?book=` change, so the AD-7 rule keeps the text where EXPERIENCE says "starts empty".** In react-router 8.5.1 a `<Link>`/`<NavLink>` to the current URL defaults to `replace` (`dist/development/lib/dom/lib.js:615`: `replace = createPath(location) === createPath(path)`), and REPLACE mints a new `location.key`. Clicking the **Card notes** nav item while already on the unscoped shelf therefore changes the location but not `?book=`. AD-7 only acts "on a `?book=` change", so the text survives, while EXPERIENCE.md → Card notes shelf → Starts empty lists "the nav" without exception. Two implementers will diverge (one keys on `?book=`, one on `location.key`).
*Fix:* in AD-7, make the trigger every location change within the page (a new `location.key`), not only a `?book=` change: "On each location change while the page is mounted (a new `location.key`), the page keeps the text in two cases only: …; every other change, including a same-URL REPLACE (the nav link clicked on the shelf), starts empty." Or, if keeping the text there is wanted, say so and get EXPERIENCE.md amended.

### Medium

**F-M1. "The Card notes page's React state" doesn't survive today's keyed body.** `CardNotesPage` renders `<CardNotesBody key={bookId ?? ''} …/>` (`pages/CardNotesPage.tsx:133`) and `query` is `useState` inside the body (`:144`), so every `?book=` change remounts it and drops the text. The route element stays mounted, as the spine says, but the state as built does not live there. One implementer may lift `query` above the key, another may drop the key (which also stops resetting `useSearchCount`, the edit/add/pile flows and the heading/opener refs per scope).
*Fix:* add to AD-7: "The text is held in `CardNotesPage`, above the per-scope body, which still remounts per `?book=` (its `key`), so everything else resets as before Epic 14."

**F-M2. `location.key` is `"default"` for an entry loaded without router state.** The shelf opened by a typed URL or a reload of a fresh tab has `key === "default"` (`history.js:144,171`), so `openedFrom` can be `"default"`. This is harmless today, because only a same-document POP is compared and later same-document entries all have random keys, but a test or implementation that treats `"default"` as "no key" would break Back-from-box on a freshly loaded shelf.
*Fix:* one clause in AD-7: "`openedFrom` may be `"default"` (the first entry of a load); compare it like any key."

### Low

**F-L1. "Tiles' `spine-unread-*` colors" names the wrong owner.** The tokens are `--color-spine-unread-fill/-outline/-text` (`styles/tokens.css:33-35`), used by Bookcase (`Bookcase.module.css:192-195`), Tiles, `SpinePopover` and `Cover`, not by Tiles alone.
*Fix:* "never the unread spine styling (`--color-spine-unread-*`)".

**F-L2. The marker is still present after a reload.** Verified that `location.state` survives reload, so the marker and `openedFrom` are present on mount of a reloaded open box. The spine is right that the text starts empty (it was never stored), but it doesn't say the marker is ignored on mount.
*Fix:* "The marker is read only on a change while mounted, never on mount."

**F-L3. The shelf "M of N" and totals helpers are not in `lib/` yet.** `visibleGroups` and `countNotes` live in `pages/CardNotesPage.tsx:38-47`, not in `lib/cardNotes.ts`. The spine's "computed in `lib/`" is therefore a decision, not a description.
*Fix:* none needed beyond being aware of it. Optionally name the move: "`visibleGroups`/`countNotes` move to `lib/cardNotes`."

**F-L4. Versions memlog line holds.** "No new technology; react-router location.key, navigation type and state are the only APIs relied on." This is confirmed against 8.5.1. No `useBlocker`, `ScrollRestoration` or `unstable_*` API is needed.
