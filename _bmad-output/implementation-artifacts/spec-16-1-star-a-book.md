---
title: 'Story 16.1: Star a Book'
type: 'feature'
created: '2026-11-25'
status: 'done'
baseline_revision: '769fa6398e8484b34ff54cb020febb7fad5c4ecc'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-16-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-16-1-star-a-book.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (Capability -> Architecture Map FR-31 row, Structural Seed; AD-6, AD-7), reconciled before the next epic: the spine names neither components/FavouriteStar (the shared star button) nor lib/useFavourite (the star's save flow and its two alert slots).
    evidence: |-
      Spine Check, build-auto review of spec-16-1-star-a-book. The FR-31 row's "Lives in" names the hosting pages only; the Seed's lib/ and components/ lines omit both modules. Code follows AD-6 and AD-7.
    location: >-
      ARCHITECTURE-SPINE.md (Capability map FR-31 row, Structural Seed)
    severity: low
---

<intent-contract>

## Intent

**Problem:** Oleg can't mark the Books that had an impact on him. bookvie has no favourite field, no way to set one, and no star anywhere in the UI (FR-31, Epic 16).

**Approach:** Add a required `favourite` bool to the stored Book, schema version 4, with a 3→4 migration that sets `false`. Add a `set-favourite` intent as the field's only writer and carry the field in `ShelfBook` and `BookDetailView`. Then show a star toggle on Book detail, Catalog tiles, List rows and the Spine popover, plus a non-interactive mark on starred spines with ", favourite" in their names. Every star changes only after the save succeeds and the views refetch.

## Boundaries & Constraints

**Always:**
- `set-favourite` takes `{bookId, favourite}` and sets exactly that value; it never toggles. The checks run in this order: 409 `book_not_found` (inside the commit), then a 200 no-op (`store.UNCHANGED`) when the value is already stored. A missing or non-boolean `favourite` (including `null`, `"true"` and `1`) is 422 `invalid_fields` on the field `favourite`. A malformed part, or a missing or bad `bookId`, stays 422 on `intent`.
- `add-book` stores `false`. `edit-book` and every other intent keep the stored value. `favourite` is never in `editForm`, `edit_book`'s input or `find_book`'s results.
- No optimistic star. The star changes only after the refetch, and a failure leaves it unchanged. The button is never disabled, and a second press while a save is out sends the same value again.
- Status lines are "*Title* is a favourite." and "*Title* is not a favourite.". A failure says "Couldn't save. Your data wasn't changed." in `alert`, and focus stays where it was. The line is cleared at the next save attempt and on a filter change.
- Names: the star is "Favourite" on Book detail and in the popover, and "Favourite *Title*" on a tile or row. The spine and tile name ends ", favourite" after the status, and twins are told apart on the name without it.
- DESIGN.md `colors` gets `favourite` and `favourite-dark`, and `tokens.css` gets them in the same change: `--color-favourite`, with its dark twin in both dark blocks. Gold fills only the star. Under forced colors every star gets `forced-color-adjust: none` and a CanvasText fill (starred) or stroke (unstarred), on a Canvas halo or square.

**Never:** No agent tool sets the star, and `AGENT_TOOL_NAMES` and every tool description stay the same. No Favourites chip, which is Story 16.2. No `check_invariants()` rule for the field and no default in the store model. No animation. No edits to `README.md` or the spine. Existing tests change only where the Epic 16 gate names them, plus the two the ATDD checklist found (`test_store.py:203`, `test_store_commits.py:201`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Star | `{bookId, favourite: true}` on an unstarred Book | 200 `{ok:true}`; the stored Book has `favourite: true` | — |
| Same value | `true` on a starred Book | 200; `library.json` stays byte-identical, even on a store whose write fails | — |
| Gone Book | an unknown `bookId`, either value | 409 `book_not_found` | nothing written |
| Bad value | `favourite` missing, `null`, `"true"` or `1` | 422 `invalid_fields`, fields `{favourite}` | nothing written |
| v3 library | startup or restore at v3 | upgraded to v4 with every Book `false`; startup keeps `library.v3.bak.json` | — |
| v4 file without favourite | startup or restore | refused: `StartupError` or 422 `restore_invalid` | bytes unchanged |
| Couldn't save in UI | 503 on a press | star unchanged; alert line under the title row (Book detail, open popover) or under the filter row (Tiles, List, or a Catalog popover that has closed) | focus kept |

</intent-contract>

## Code Map

- `backend/bookvie/domain/model.py:19,75` -- `SCHEMA_VERSION`; the `Book` fields. `favourite: bool` goes after `spine_color`, before `readings`.
- `backend/bookvie/store/migrations/__init__.py` -- `CURRENT_VERSION`, `STEPS`. The new step 3→4 inserts `favourite` right after `spineColor`, matching the model's key order.
- `backend/bookvie/intents/set_spine_color.py` -- the template for the new `set_favourite.py`. `set_up_next.py` shows the `UNCHANGED` no-op; `intent_model.py` has `parse_form_intent`, `refuse_fields` and `malformed`.
- `backend/bookvie/intents/__init__.py:98,160,216,237` -- the export lists. `backend/bookvie/http/api.py:466` -- the `set-spine-color` route to copy.
- `backend/bookvie/intents/add_book.py:74` -- the `Book(...)` constructor, which gets `favourite=False`.
- `backend/bookvie/views/models.py:24,272`, `views/shelf.py:52,313` -- `ShelfBook` and `BookDetailView` and their builders.
- `backend/bookvie/agent/tools.py:8` -- the docstring listing the never-registered intents.
- `backend/tests/` -- the gate's leaves: `builder.py` default; `helpers.py` `EMPTY_LIBRARY`, `STORED_BOOK_KEYS`; version pins in `test_model.py`, `test_store.py`, `test_store_commits.py`, `test_cli.py` and `test_migrations.py`; field and route sets in `test_model.py:22`, `test_add_book.py:63`, `test_views.py:58`, `test_book_view.py:19`, `test_catalog_publisher.py:142,182`, `test_card_notes_spine_color.py:261` and `test_intent_routes.py:150` (plus `INTENT_ROUTES` gains `set-favourite`); never-registered names in `test_agent_write.py`, `test_agent_mount.py:480` and `test_agent_restore.py:675`; and the ATDD's two extras.
- `frontend/src/api/books.ts:191` -- the `setSpineColor` trio to copy for `setFavourite`; `api/index.ts` exports it. `api/views.test.ts:124` -- the `BookDetailView` literal, which needs the new field.
- `frontend/src/lib/useIntentRequest.ts` (`run`, `useAlertSlot`) and `lib/announce.ts` (`adoptRegions`) -- the plumbing the new `lib/useFavourite.ts` reuses.
- `frontend/src/lib/catalog.ts` `spineName`/`spineNames` -- where ", favourite" is added after twin naming.
- `frontend/src/pages/BookDetailPage.tsx:285` (`PageHeading` and the `.regions` slot pattern), `components/SpinePopover.tsx` (title `p`, `.regions` CSS), `pages/CatalogTiles.tsx`, `pages/CatalogList.tsx`, `pages/Bookcase.tsx` (`spineButton`, legend), `pages/CatalogPage.tsx` (`FilterChips`, `changeFilters`).
- `frontend/src/styles/tokens.css` -- the colors in `:root` and both dark blocks, and the components section. Edit by hand; never run a formatter on it.
- `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md:6-65,521-545,696-702` -- `colors` and `components.favourite-star` (gold becomes `{colors.favourite}`).
- e2e leaves to update (gate): `spine-popover.spec.ts:152,208,416`, `catalog-tiles.spec.ts:469`, `book-states.spec.ts:276`.
- Red leaves to un-skip: `backend/tests/test_favourite.py` (6, and drop `RED_16_1`) and `frontend/e2e/favourite-star.spec.ts` (8).
- Deferred-work intake: none name story 16.1. The only Epic 16 mention, line 1863, is already resolved.

## Tasks & Acceptance

**Execution:**
- `backend/bookvie/domain/model.py`, `store/migrations/__init__.py` -- add the field, bump both versions to 4, and add the `_add_favourite` step.
- `backend/bookvie/intents/set_favourite.py` (new), `intents/__init__.py`, `http/api.py` -- add the parser (bool check on `favourite`), the change (409, then `UNCHANGED`, then `model_copy`) and the `POST /intents/set-favourite` route.
- `backend/bookvie/intents/add_book.py`, `views/models.py`, `views/shelf.py`, `agent/tools.py` -- `favourite=False` on add; carry the field in both views; name `set-favourite` in the tools docstring.
- `backend/tests/*` -- the gate's updates and the two extras; un-skip `test_favourite.py`.
- `npm --prefix frontend run api:gen`; `frontend/src/api/books.ts`, `api/index.ts`, `api/views.test.ts` -- regenerate the types, add `setFavourite` and `useSetFavourite`, and add `favourite: false` to the test literal.
- `frontend/src/lib/useFavourite.ts` (new, with a unit test for `favouriteStatus`) -- the press, the status line, failure state, and two region slots: the inline slot (title row) wins over the row slot (filter row). Also `clear()`.
- `frontend/src/components/FavouriteStar.tsx` and `.module.css` (new) -- the button with `aria-pressed`, an `aria-hidden` SVG star path, and the variants `detail`, `popover`, `row` and `tile` (the tile variant draws a paper halo path under the star). Drawing hidden until hover or focus-within is applied by the tile and row CSS.
- `frontend/src/lib/catalog.ts` and its test -- an optional `favourite` on `NamedSpine`; `spineNames` appends ", favourite" after the twin rounds.
- `frontend/src/pages/BookDetailPage.tsx` and `.module.css` -- a title row (the h1, then the star, `{spacing.3}` apart and aligned on the first line) and an alert slot below it.
- `frontend/src/components/SpinePopover.tsx` and `.module.css`, `pages/Bookcase.tsx` and `.module.css` -- the popover's title row with its star and an inline slot; the spine mark; the legend's sixth item, "favourite". Bookcase takes an optional `favourite` flow prop and falls back to its own flow.
- `frontend/src/pages/CatalogTiles.tsx`, `CatalogList.tsx`, their CSS, and `CatalogPage.tsx` and its CSS -- a tile star as a sibling after the link, absolutely placed at the box's top left; a row star after the title link (negative block margins keep the row height); one Catalog-level flow passed to all three views; the row slot under `FilterChips`; `clear()` in `changeFilters`.
- `DESIGN.md`, `frontend/src/styles/tokens.css` -- the gold primitives and the `--favourite-star-*` component literals.
- `frontend/e2e/spine-popover.spec.ts`, `catalog-tiles.spec.ts`, `book-states.spec.ts` -- the gate's leaf updates; un-skip `favourite-star.spec.ts`.

**Acceptance Criteria:**
- AC-1 to AC-14 as numbered in `_bmad-output/test-artifacts/atdd-checklist-16-1-star-a-book.md` (the acceptanceCriteria registry, copied from epics.md Story 16.1). Each one is proven by its leaf in `backend/tests/test_favourite.py` or `frontend/e2e/favourite-star.spec.ts`, un-skipped and passing.
- Given the whole suite, when `npm run check` and the full e2e suite run, then both pass, and only the existing tests named in the Code Map changed.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").
- **Why a new flow hook, not `useOneClickFlow`.** The one-click flow ignores a press while a request is out. The star must send again (UX-DR102) and must not move focus on failure. `useFavourite` reuses `useIntentRequest.run`, which clears the regions and reports a failure that lands after unmount, and adopts the regions with `adoptRegions`/`releaseRegions` like `useAlertSlot`, choosing between two slots:
  ```ts
  useLayoutEffect(() => {
    const slot = inline ?? row
    if (!failed || !slot) return
    adoptRegions(slot)
    return () => releaseRegions(slot)
  }, [failed, inline, row])
  ```
  When the popover closes, its inline ref goes `null` and the line moves under the filter row. On Home there is no filter row, so the line stays in the shell's hidden `alert`. That is accepted, because EXPERIENCE.md names only the Catalog places.
- **Spine names.** The twin rounds run on names without the favourite part, so starring a twin never renames another Book.

## Verification

**Commands:**
- `npm --prefix frontend run api:gen` -- expected: `schema.d.ts` gains `favourite: boolean` on `ShelfBook` and `BookDetailView`.
- `npm run check` -- expected: exits 0 (format, ruff, pytest, tsc, oxlint, unit tests, api check).
- `npm run build && cd frontend && TZ=Europe/Madrid npx playwright test e2e/favourite-star.spec.ts e2e/spine-popover.spec.ts e2e/catalog-tiles.spec.ts e2e/book-states.spec.ts e2e/app-shell.spec.ts` -- expected: all pass, none skipped (the e2e server serves the built frontend).
- `npm run check:e2e` -- expected: the full e2e suite passes.

## Auto Run Result

Status: in-review

**Summary.** Story 16.1 is built end to end:
- **Backend:** `Book.favourite` (required bool), schema version 4 with a 3→4 migration, and `POST /api/intents/set-favourite`. It is the only writer: value, not toggle; 409 before the no-op; 422 on `favourite`.
- **Views:** `ShelfBook` and `BookDetailView` carry the field. The agent tools read it but can't set it.
- **Frontend:** the star on Book detail, in the Spine popover, on Catalog tiles and in List rows. Starred spines get a mark and ", favourite" in their names, and the legend has a sixth item. The `favourite` and `favourite-dark` gold are now in DESIGN.md `colors` and `tokens.css`.

**Files changed:**
- Backend source:
  - `domain/model.py`: the field and version 4.
  - `store/migrations/__init__.py`: the 3→4 step.
  - `intents/set_favourite.py` (new): the intent.
  - `intents/__init__.py`, `http/api.py`: its exports and route.
  - `intents/add_book.py`: stores `false`.
  - `views/models.py`, `views/shelf.py`: carry the field.
  - `agent/tools.py`: docstring.
- Backend tests: the gate's leaves (`builder.py`, `helpers.py`, the version pins and field and route sets, the never-registered names), the ATDD checklist's two extras, and `test_favourite.py` un-skipped.
- Frontend:
  - `api/books.ts`, `api/index.ts`: `setFavourite`.
  - `api/generated/schema.d.ts`: regenerated.
  - `api/views.test.ts`: literal updated.
  - `lib/useFavourite.ts` (new) and its unit test: the flow and its two slots.
  - `components/FavouriteStar.tsx` and `.module.css` (new): the star button.
  - `lib/catalog.ts` and its test: ", favourite" in spine names.
  - `BookDetailPage`, `SpinePopover`, `Bookcase`, `CatalogTiles`, `CatalogList`, `CatalogPage` (TSX and CSS): the star and the slots.
  - `styles/tokens.css`: the gold and the component literals.
- `scripts/copy.test.mjs`: the gold exception, see below.
- e2e: the gate's leaves (`spine-popover`, `catalog-tiles`, `book-states`) and `favourite-star.spec.ts` un-skipped and extended.
- `DESIGN.md`: the gold in `colors`, and the component referencing it.

**Review findings.** 26 findings:
- Patched (5 entries): the stale failure line across popovers (medium; `useFavourite` now records where a failure happened), the AC-8 and AC-13 e2e extensions, the migration test names, the publisher test comment and the DESIGN.md wording.
- Deferred (1): spine drift for the FR-31 row and the Structural Seed.
- Rejected: the rest, each with its reason in the Review Triage Log.

**For bmad-code-review:**
- `frontend/scripts/copy.test.mjs` is not on the gate's list. Its "nothing is red" guard needed a `FAVOURITE_GOLD` exception for the two golds that AC-13 requires (the same shape as DEV_AMBER).
- On Home, a star save that fails in a spine popover shows no visible line once the popover closes; it stays in the hidden `alert`. The spec accepts this.

**Follow-up review recommendation:** false. Patched entries by verdict: 1 medium, 4 low, no high.

**Verification** (run in this session after the patches): `npm run check` exits 0 (check:api with 0 skipped, check:py with 2533 passed, check:e2e with 902 passed and none skipped, and smoke). Before the patches the same run gave 2533 and 902.

**Helpers added:** none.

**Residual risks:**
- Overlapping star presses with mixed results can leave a stale or empty alert slot. This was rejected as rare.
- The ATDD checklist's green-phase follow-ups (bookvie stopped, the List view's line, dark details) are left to `bmad-testarch-automate`.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").

### Review Findings

Code review 2026-11-25 (bmad-code-review, new session). Layers: Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor, Spine Check. 23 findings: 0 decision-needed, 2 patch, 1 defer, 19 rejected (one patch merges two findings). Verification Gap: none. Spine Check: one drift (the FR-31 row and the Structural Seed), already deferred by the build. AD-3, AD-6, AD-7, AD-8, AD-9, AD-13, AD-14, AD-17, AD-18 and AD-21 hold.

- [x] [Review][Patch] A failure picks its slot when the result lands, not when the star was pressed. Say the user presses Dune's popover star, closes the popover and opens Emma's before a slow failure returns. Dune's "Couldn't save." line then shows under Emma's title. The same happens when a tile or row press fails after a popover opens. This contradicts the hook's own header ("a slot rendered later never takes it"). The fix: note the inline slot at press time, and use `'inline'` only if that same slot is still rendered [frontend/src/lib/useFavourite.ts:82]
- [x] [Review][Patch] `as_v2` doesn't go through `as_v3`, so the v1 and v2 fixtures still carry `favourite`, a key no v1 or v2 file has. The v1 and v2 restore and migration tests therefore never run the 3→4 step on a document without it [backend/tests/builder.py:67]
- [x] [Review][Defer] Spine drift (AD-6, AD-7; Capability map FR-31 row, Structural Seed): `components/FavouriteStar` and `lib/useFavourite` aren't named [ARCHITECTURE-SPINE.md] — deferred: already in `deferred-work.md` from the build-auto review, reconciled before the next epic. No duplicate entry added.

Patches applied 2026-11-25:
- `useFavourite.send` notes the inline slot when the star is pressed. A failure goes inline only if that same slot is still rendered, else to the row.
- `as_v2` now goes through `as_v3`, so the v1 and v2 fixtures carry no `favourite`, and the real 1→4 and 2→4 chain tests run the 3→4 step. The stand-in chain's tests (the five that seed with `_seed_v1`, plus the cover sweep) had relied on `as_v1` leaving `favourite` in place, because the stand-in step can't add it, and four of them failed after the change. They now seed with `_write_stand_in_v1`, the current shape stamped `schemaVersion: 1`, and their intent is unchanged.

Full check after the last patch, 2026-11-25: `npm run check` exit 0. pytest 2533 passed, unit 428 passed, e2e 902 passed (none skipped), smoke ok.

**Rejected:**
- (blind) `low` The star's failure state isn't cleared when another flow on the same page fails next (Up next, Pause), so its slot keeps `data-show-alert` with empty regions. It is the same pattern `useAlertSlot` already has for Up next and Pause on Book detail, two failures in a row are rare, and a fix would add cross-flow state. `releaseRegions(slot)` releases by `lastIndexOf`, so the claim that it pulls the regions out of the other flow's slot is `false`.
- (blind) `low` Twins get the same star name, "Favourite *Title*". The spec's Always names the star "Favourite *Title*" on a tile or row, so changing it means editing the spec. Twins with the same title are rare in this library.
- (edge) `low` Twin star labels in List (`CatalogList.tsx:74`). Same as the item above.
- (edge) `low` Twin star labels in Tiles (`CatalogTiles.tsx:202`). Same as the item above.
- (blind) `low` `NamedSpine.favourite` is optional. Both `spineNames` callers pass a `ShelfBook`, which always has it. Making it required also means changing the test literals, which is more than a direct correction.
- (blind) `low` The gold is written twice (`tile-on` is a literal) and the spine mark uses a tile token. The spec chose `--favourite-star-*` component literals, the tile star keeps the light gold in dark mode (so it can't use the themed token), and `favourite-star.spec.ts` pins both values.
- (blind) `low` `FAVOURITE_GOLD` is exempt in every CSS file. It mirrors the existing `DEV_AMBER` exception, and today the gold appears only in `tokens.css`. A pin check would be a new test, not a correction.
- (acceptance) `low` `copy.test.mjs` changed although it isn't on the gate's list. AC-13 needs it: `#9A7120` has a hue of 39.8°, under the guard's 40° red limit, so `npm run check` fails without the exception. The build flagged it, and the fix would edit the spec.
- (blind) `low` A 422 on `favourite` names the raw key "favourite", not a label. The UI always sends a boolean and no agent tool calls the intent, so no user sees this message. Adding a key to `LABELS` affects the form label map.
- (blind) `low` `Bookcase` runs its own `useFavourite` even on Catalog. It is one unused hook, and splitting the component is a refactor.
- (blind) `low` No unit tests for the slot rules in `useFavourite`. The AC-8 e2e covers them, and Verification Gap found no gap. More tests are `bmad-testarch-automate`'s job.
- (blind) `low` `_add_favourite` adds the key only after `spineColor`, and keeps a stray `favourite`. Both need a hand-edited v3 file. The first is refused loudly by model validation, and the second can't reach the app through a normal write.
- (edge) `low` A v3 Book without `spineColor` gets no `favourite`. Same as the item above: refused loudly, and no normal write produces it.
- (edge) `false` A line on Home vanishes once the popover closes. The spec's Design Notes accept this explicitly ("On Home there is no filter row … That is accepted").
- (acceptance) `false` On Home, a failed press shows no visible line after the popover closes. Same as the item above.
- (acceptance) `low` Three migration tests were renamed, not only re-pinned. `test_migrations.py` is on the gate's list, and the new names fit the current version. Reverting them is churn.
- (acceptance) `low` `useFavourite`'s slot rule differs from the Design Note's snippet. It is stricter and fits the intent (the build's stale-line patch). Fixing it means editing the spec.
- (acceptance) `false` The Code Map's `test_card_notes_spine_color.py:261` was left unchanged. That file reads `STORED_BOOK_KEYS` from `helpers.py`, which was updated, so leaving it alone is correct.
- (blind) `false` The Code Map lists a file the diff doesn't touch. Same as the item above.
