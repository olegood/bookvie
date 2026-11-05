---
title: 'Story 3.1: See my Main book on Home'
type: 'feature'
created: '2026-11-05'
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'dbd1ab83882f9bd9455170da745db87189f86d53'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-3-1-see-my-main-book-on-home.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/` opens Catalog, and the `home` view is a placeholder copy of it. Nothing shows the Main book or how far along it is, so opening bookvie doesn't say where I am.

**Approach:** Add a Home page at `/`, first in the nav, and move Catalog to `/catalog`. Home shows the date header, the empty states, and the Main book card with a server-computed gauge. Book detail gains a Current reading block. Spine names carry the Main-book and waiting states. All numbers come from the server (AD-6).

## Boundaries & Constraints

**Always:**
- `percent = floor(currentPage × 100 ÷ pages)`, computed in one server function (`domain/`) and used by the home, shelf and book views. The client never divides.
- The date header is the browser's local date ("Wednesday, 28 October", English, no year). It recomputes on focus and visibility like `useNow`. Views never carry the server's date (AD-20).
- "Last export" / "No export yet" goes through `relativeDay`, muted `--color-ink-tertiary`, and shows on the header line only when there is no Main book.
- Locators, routes and names follow the ATDD checklist's "Contract the Scaffolds Pin". The 9 red leaves in `test_home_view.py` and `home.spec.ts` are activated, not rewritten.
- WCAG 2.2 AA in both themes (axe on Home). After a nav click, focus goes to the page `h1`, as on the existing pages.

**Never:**
- No page field (3.3), re-entry line (3.4), Home bookcase slice (3.5), side-column panes (Epic 4), card actions (Add card note, "⋯"), Start/Resume/Edit Purpose.
- No new intent or error code. No change to `library.json` shape. `local-state.json` stays as AD-15 has it.
- Don't assert or display Up-next names beyond what `_role` already returns.
- Don't extract `useSpinePopover` or split `domain/book_fields.py` here. Decision: Epic 1 retro item 9 is deferred to "before Story 3.5" (the slice reuses the popover); 3.1 only changes the spine `aria-label` string.
- Decision: the full spec (~2,700 tokens) is kept as one story; no split.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior |
|---|---|---|
| Empty library | no Books | date header, "No export yet"/"Last export…", bare planks + "Your shelf is empty. Add your first book." + **New book** → `/catalog` with the panel open, focus in Title; no card |
| Books, no Main | ≥1 Book, `mainBookId` null | card frame "No Main book." + link "Choose a book in the Catalog" → `/catalog`; Last export on the header line |
| Main at 212/330 | Main, Reading page 212 | `mainBook.percent` 64; gauge "64%", "p.212 of 330", ticks 0 · 165 · 330; progressbar valuetext "64%, page 212 of 330" |
| Floor edges | 329/330, 330/330, 2/3, 0/330 | 99, 100, 66, 0 |
| Tiny Book | pages < 4 | ticks only 0 and total; half tick = `Math.round(pages/2)` otherwise |
| Edition | edition 1 / 2 | no edition text / "Edition 2" |
| No cover | `coverFile` null | 200×300 "No cover" placeholder, not focusable |
| Book detail, Main | Main at 212/330, Purpose set | region "Current reading": "Main book · started D Mon YYYY", gauge, Purpose |
| Book detail, paused | paused at 120/412 | "Waiting for you, page 120 · started …", gauge 29%, Purpose |
| Spine names | Main / paused / finished re-read Main / finished re-read paused | "…, Main book, 64%" / "…, waiting for you, page 120" / "…, finished, re-reading, 12%" / "…, finished, waiting for you, page 40" |

</frozen-after-approval>

## Code Map

Backend:
- `backend/bookvie/views/models.py` -- add `HomeMainBook` (id, title, authors, edition, coverFile, hasCover, pages, currentPage, percent). `HomeView` gains `main_book | None` and `last_export_at: AwareDatetime | None`. `ShelfBook` gains `role: Role`, `percent: int | None` (when it has a current Reading), `waiting_page`, and `current_page`. `BookDetailView` gains `current_reading` (page, percent, purpose, startDate, status main|waiting) or None. Note `upNext` can still come back from `_role`.
- `backend/bookvie/views/shelf.py` -- `home` (:69) is the placeholder; keep `home(library, last_export_at=None)` so `home(library)` in the AC-6 leaf still works. Reuse `_role` (:75) and `_shelf_book` (:31). `book_detail` is at :89.
- `backend/bookvie/views/backup.py:8`, `store/local_state.py:28 read_last_export` -- the source of `lastExportAt`. Add a `views.home_for(store)` (or similar) so `http` still never imports `store`.
- `backend/bookvie/http/api.py:319` `home_view` -- call the store-taking wrapper.
- `backend/bookvie/domain/` -- new small module (for example `progress.py`) with `percent(page, pages) -> int` and `current_reading(book) -> Reading | None` (the single unfinished Reading). No clock calls.
- `backend/tests/test_views.py:18-20,36-49,215` -- `HOME_EMPTY` gains `mainBook: None` and `lastExportAt: None`. Split the home/catalog parametrizations where the views differ.
- `backend/tests/builder.py` -- `book`, `reading(book_id, current_page=…, paused_at=…, purpose=…)`, `main`. There is no paused helper; pass `paused_at`.

Frontend:
- `frontend/src/api/generated/schema.d.ts` -- regenerate with `npm --prefix frontend run api:gen`.
- `frontend/src/main.tsx:33-36` -- `/` → `HomePage`, `/catalog` → `CatalogPage`.
- `frontend/src/components/AppShell.tsx:35` -- nav: Home (`/`, `end`), Catalog (`/catalog`), Backup.
- `frontend/src/api/views.ts:68` `useHomeView`, `views.test.ts` -- add a test pinning `['view','home']` and `GET /api/views/home` (deferred-work l.42-44).
- `frontend/src/pages/CatalogPage.tsx:21,30,56,161` -- the `EMPTY_SHELF` copy, the `EmptyShelf` component, and the panel `useState`. Export `EmptyShelf` and copy for Home. Open the panel from Home through router `state` (`navigate('/catalog', {state:{newBook:true}})`); CatalogPage reads it once and clears it.
- `frontend/src/pages/BookDetailPage.tsx:114,124,157,227` -- the cover `img` and the inline `noCover` div. Extract a shared `Cover` component for the card. Add the Current reading `section` (`h2` "Current reading"). Change the post-delete `navigate('/')` to `/catalog`.
- `frontend/src/pages/NotFoundPage.tsx:12` -- "Back to the catalog" → `/catalog`.
- `frontend/src/pages/BackupPage.tsx:161` -- restore still goes to `/`, now Home; check that focus lands on Home's `h1`.
- `frontend/src/lib/catalog.ts:27,36` `spineName`/`NamedSpine` (called at `Bookcase.tsx:245`; tests `catalog.test.ts:69-89`) -- add the status strings.
- `frontend/src/lib/relativeDay.ts` (`relativeDay`, `useNow`), `lib/page.ts` (`usePageTitle`, `useNavigatedHere`), `styles/base.css:26 .visuallyHidden`, `styles/tokens.css` (`--font-book-title-lg-*`, `--font-gauge-figure-*`, `--font-author-*`).
- New: `pages/HomePage.tsx(+.module.css)`, `components/MainBookCard.tsx`, `components/Gauge.tsx`, `components/Cover.tsx`, `lib/today.ts` (date header format).

E2E (`frontend/e2e`): `${server.url}/` for Catalog in app-shell, backup, book-detail, bookcase-details, bookcase, catalog-empty, catalog-list, cover, delete-book, duplicate-dialog, error-screens, new-book-panel, shell, spine-popover → `/catalog`. Check each one: shell, title and launch tests mean Home. `restore.spec.ts` stays `/`, with focus on Home's `h1`.

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookvie/domain/progress.py` -- `percent`, `current_reading` -- the one rule for AD-6.
- [x] `backend/bookvie/views/models.py`, `views/shelf.py`, `views/__init__.py`, `http/api.py` -- the home view's `mainBook` and `lastExportAt`; shelf and detail fields -- the server owns the numbers.
- [x] `backend/tests/test_home_view.py`, `test_views.py` -- activate AC-6, update `HOME_EMPTY`, and add tests for `lastExportAt`, `ShelfBook` role/percent/waitingPage, and `BookDetailView.currentReading` (main, paused, none).
- [x] `frontend/src/api/generated/schema.d.ts`, `api/views.ts`, `api/views.test.ts` -- regenerate, then pin the home query key.
- [x] `frontend/src/main.tsx`, `AppShell.tsx`, `NotFoundPage.tsx`, `BookDetailPage.tsx` (delete target), `CatalogPage.tsx` (route state opens the panel) -- the routes.
- [x] `frontend/src/components/Cover.tsx`, `Gauge.tsx`, `MainBookCard.tsx`, `lib/today.ts`, `pages/HomePage.tsx` -- Home: hidden `h1` "Home", title "Home — bookvie", date header + Last export, empty shelf, card or "No Main book.", 2-column grid (fluid card | 320px column, 24px gap) with room below.
- [x] `frontend/src/pages/BookDetailPage.tsx` -- the Current reading region with `Gauge`, reusing `Cover`.
- [x] `frontend/src/lib/catalog.ts`, `catalog.test.ts` -- spine-name statuses from the I/O matrix.
- [x] `frontend/e2e/*.spec.ts` -- rewrite the `/` → `/catalog` uses. Activate the 8 leaves in `home.spec.ts`. Add the green follow-ups: gauge at 212/330, 329/330 → 99%, half tick under 4 pages, the no-cover placeholder on the card, Last export not on the header when Main exists.
- [x] `README.md` -- note Home as the launch page and Catalog at `/catalog` (retro item 17: README is part of story done).

**Acceptance Criteria:**
- Given the ATDD leaves, when activated, then `pytest tests/test_home_view.py` and `e2e/home.spec.ts` pass.
- Given the whole suite, when `npm run check` runs, then it passes with the coverage gates (domain ≥90%).
- Given a paused, Up-next Book, when rendered, then `_role`'s current precedence is unchanged (no new Up-next strings this story).

## Implementation Notes

- Implemented by a fresh subagent from this spec; verified against the diff since `baseline_commit`. `npm run check` green: 884 pytest, 0 skipped; node tests 162 pass; e2e 200 pass; smoke ok.
- `dev-proxy.spec.ts` also needed `/` → `/catalog` (missing from the Code Map list). `test_edit_book.py` needed `currentReading: None`.
- `CatalogPage` clears `{newBook:true}` with `history.replaceState` on React Router's internal `usr` key. A replace navigation would change the location key and steal focus from Title.
- `lastExportLine` moved from `BackupPage` to `lib/relativeDay.ts` for Home and Backup. `domain/progress.py` holds `percent` / `current_reading`. `lib/gauge.ts` only formats and places ticks.
- Matrix audit: the Edition 1 row had no covering test, so an assertion was added to the `home.spec.ts` AC-6 212/330 automate test. 13/13 pass.

- Review pass 1 patches applied:
  - AD-19 waiting rule: an unfinished non-Main Reading is paused, `pausedAt` is not required, and the check reuses `current_reading`. The `delete-book.spec.ts` Side-read seed now has no Reading.
  - New e2e tests: Home's failed load, the cleared New book hand-off, the date recompute, and the gauge fill width.
  - The AC-3 check is scoped to the header line, and the README Status line is updated.
  - Re-verified with `npm run check`, all green: 884 pytest, node 162/0/0, e2e 203, smoke ok.

## Spec Change Log

## Review Triage Log

Pass 1 (review_loop_iteration 0). Layers: Blind Hunter (BH), Edge Case Hunter (EC), Verification Gap (VG), Spine Check (SC).

| # | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| BH1+SC1 | `_role_reading` counts a Reading as `waiting` only when `paused_at` is set, and re-scans the readings instead of using `current_reading` | medium | AD-19: *paused* means unfinished and not Main; `pausedAt` is only a stored date. The test_views Emma case pins the divergence. | patch |
| BH2 | An Up-next Book with a paused Reading gets no Current reading block | false | Intended. The frozen Never ("no Up-next names beyond `_role`") and the AC keep Up-next precedence, so no waiting copy is shown for Up next. | reject |
| BH3 | `percent` is not clamped when page > pages | false | `check_invariants` refuses `current_page` outside 0..pages on every commit (`invariants.py:88-93`). | reject |
| BH4 | `_main_book` silently shows page 0, or no card for a missing Book | false | Invariants `main_has_unfinished_reading` (`invariants.py:83-86`) and the pointer checks (`:49`) rule out both states. | reject |
| BH5 | `NamedSpine.role` is a hand-written union | false | `Bookcase` passes `ShelfBook` to `spineName`, so a changed schema role fails `tsc`. | reject |
| BH6 | `ShelfBook.currentPage` duplicates `waitingPage` | reject | The spec's Code Map asks for both fields; the fix would edit this spec. | reject |
| BH7 | Home imports `EmptyShelf` from `CatalogPage` | low | No code splitting and no named harm; the fix is a module move. | reject |
| BH8+EC2 | `clearNewBookState` writes the private `usr` key, and in-memory state survives a remount | low | No remount without a navigation is reachable. A key change would be caught by the VG2 test. | reject |
| BH9 | The AC-3 automate test asserts across all of `main` | low | Story 3.4's re-entry line will legitimately contain "Last export". Direct scoping fix. | patch |
| BH10 | The tick test uses an xpath sibling | low | Test-style only. | reject |
| BH11 | `Gauge.module.css` has a root margin-top and hard-coded px | low | Cosmetic; axe and layout pass in both placements. | reject |
| BH12+EC4 | `authors.join('; ')` and an empty authors `<p>` | false | Same separator as Book detail (`BookDetailPage.tsx:129`); authors are required (`book_fields.py:239-240`). | reject |
| BH13 | The date recompute is untested | (see VG3) | Duplicate of VG3. | patch |
| BH14 | Spec and sprint status disagree | false | The workflow is mid-run; step-05 syncs the sprint entry to review. | reject |
| BH15 | README Status still says "Epic 3 is next" | low | Direct text correction. | patch |
| BH16 | Code Map omits `ErrorPage.tsx` | reject | The fix would edit this spec. | reject |
| BH17 | `home()` keeps the `last_export_at=None` default | reject | The Code Map requires it for the AC-6 leaf; the fix would edit this spec. | reject |
| VG1 | Home's failed-load path is untested | gap (pre-verified) | No e2e aborts `views/home`. | patch |
| VG2 | Clearing the `{newBook:true}` hand-off is untested | gap (pre-verified) | Nothing reloads or goes Back/Forward after Home's New book. | patch |
| VG3 | The date header's focus/visibility recompute is untested | gap (pre-verified) | Every test reads the header once under a fixed clock. | patch |
| VG4 | The gauge fill width is never asserted | gap (pre-verified) | Only ARIA and text are asserted. | patch |
| SC2 | `domain/progress` is missing from the spine's Structural Seed | low | Spine-doc drift. | defer |
| SC3 | AD-6's presentation list lacks gauge tick placement | low | The frozen matrix fixes `Math.round(pages/2)` on the client; the spine list should name it. | defer |
| SC4 | AD-4/AD-15 and the FR-22 map name only `views/backup` as reading `local-state.json` | low | The home view now reads it too. Spine-doc drift. | defer |
| EC1 | The New book panel opens after a failed-then-retried catalog load | low | That is the action the user asked for, and the window is unlikely. | reject |
| EC3 | Spine says "not read yet" for a Main book with a null percent | false | The `main_has_unfinished_reading` invariant rules it out. | reject |
| EC5 | `percent` and `waitingPage` could describe different Readings | false | The `one_unfinished_reading` invariant (`invariants.py:77-81`) rules it out, and the BH1 patch unifies them. | reject |

## Design Notes

**Choices recorded (user-visible but default-preserving):**
- Catalog lives at `/catalog` (as pinned by the ATDD).
- Delete and Not found still land on Catalog, so their copy stays true.
- The card's edition reads "Edition N".
- The status line copies the mock: "Waiting for you, page 120 · started 2 Sep 2026"; for the Main book, "Main book · started …". The "· started" part is dropped when `startDate` is null.

`lastExportAt` rides on the home view so Home needs one query, and Story 3.4 needs it there too.

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest` -- all pass, 0 skipped from 3.1
- `npm run check:api` -- clean (schema, tsc, oxlint, node tests)
- `npm run check` -- green, including the e2e suite and coverage gates
