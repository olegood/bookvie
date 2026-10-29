# Epic 1 Context: Catalog the home library

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

The user, or a browser-driven AI cataloging skill, can open bookvie and add, edit and delete Books through a labeled, machine-readable form. Duplicates are flagged, back-filled finishes are recorded with Finished on, and the whole library can be browsed and searched as a bookcase on Catalog, with Book detail and a spine popover. The epic also lays the foundation every later epic depends on: project skeleton and install, the CLI with its single-instance lock, the atomic file store, the security guard, the API contract, the test harness behind one `npm run check`, and the accessible app shell. The epic gate requires the foundation P0 tests and the label-contract e2e suite to pass, `~/bookvie-data` to stay untouched by `npm run check`, and the per-epic quality gates to be met.

## Stories

- Story 1.1: Scaffold and install bookvie
- Story 1.2: Run one safe instance
- Story 1.3: One check command guards the repo
- Story 1.4: Keep the library in one safe file
- Story 1.5: Speak one API contract
- Story 1.6: Open bookvie to an empty shelf
- Story 1.7: Accept a new book only when it is complete
- Story 1.8: Add a book with the New book panel
- Story 1.9: Get warned about duplicates
- Story 1.10: See the library as a bookcase
- Story 1.11: Open and edit a book
- Story 1.12: Delete a book
- Story 1.13: Add a cover
- Story 1.14: Change a book's color from the shelf

## Requirements & Constraints

- **Local-first, single user.** No account, no network, no database server. All data lives in one folder on disk, and a Book saved from any browser on the machine appears in every other browser. No domain data is stored in the browser.
- **Book fields.** Required: title, pages (whole number ≥ 1), at least one author, edition (default 1), language, publisher, type (paperback/hardcover/ebook). Optional: subtitle, ISBN (10 or 13 digits after removing hyphens and spaces; the last may be X), year (4 digits, not after next year), cover, spine color (`#RRGGBB`), tags, Finished on (not in the future). Text is trimmed before validation. Authors are separated by semicolons, tags by commas; duplicate tags are merged ignoring case and keep the first spelling.
- **Back-fill.** Finished on creates a finished Reading with no start date. In edit, Finished on shows and changes the most recent finish date, and clearing it is refused. Pages can't drop below the current page of an unfinished Reading or below the highest Card note page.
- **Duplicates.** A duplicate is a matching normalized ISBN (ISBN-10 converted to 13), or, when either Book lacks an ISBN, the same title (ignoring case and extra whitespace) plus at least one shared author. Field validation runs first. On edit, the check runs only when title, an author or the ISBN changed, and the Book being edited is excluded.
- **Agent-friendly form.** Every field has a stable visible label that is exactly its accessible name. Every outcome (saved, duplicate, validation error, couldn't save) is exposed through role, name and live-region text. After a save, the Book can be found with Search titles.
- **Data safety.** Every destructive action asks for confirmation. A failed save always shows "Couldn't save. Your data wasn't changed." and keeps the user's input.
- **Tone.** No exclamation marks, greetings, praise, red failure states, streaks or animation on load.
- **Display and accessibility.** English only, 1024px minimum width (narrower windows scroll horizontally), light, dark and system themes, WCAG 2.2 AA in both themes. The only accepted deviation is Reflow.
- **Scale.** About 500 Books. The Catalog bookcase renders every spine, with no lazy rows.
- **Standard intent ACs (every intent).** A fault injected at write, fsync or rename leaves `library.json` byte-identical and returns 503 `couldnt_save`. `check_invariants()` holds after every success. An intent for a deleted Book gets 409 `book_not_found`. Every error code has an API test.
- **Quality gates.** P0 100%, P1 ≥ 95%, `check:api` clean, line coverage ≥ 90% on `domain/` and ≥ 80% on `intents/` + `store/`.

## Technical Decisions

- **Stack (pinned).** Python 3.14, uv, hatchling, FastAPI 0.162, Pydantic 2.14, Uvicorn, python-multipart, Pillow 13. React 19.3, Vite 8.3 (`react-ts` template), TypeScript 5.9 (the template's TS 7 is overridden because openapi-typescript 7.13 needs TS ^5), TanStack Query 5, React Router 8.5 in library mode (`createBrowserRouter`), Playwright 1.64. Dev: pytest 9, pytest-cov, Hypothesis, httpx. There is no CSS framework: each component has its own CSS Module, all reading one `src/styles/tokens.css`.
- **Layers.** `http → intents, views → domain`; `intents, views → store`. `domain` imports no other layer, and `store` imports only `domain` types. The frontend imports only `api/`.
- **Build and install.** `npm run build` writes the SPA to the gitignored `backend/bookvie/http/static/`. The hatchling wheel ships it as `artifacts`. `uv tool install --reinstall ./backend` installs the `bookvie` command (console script `bookvie = bookvie.cli:main`). In dev, Vite on :5173 proxies `/api` and `/media` to :8765.
- **CLI and process.** Flags are `--data-dir` (default `~/bookvie-data`), `--port` (8765), `--no-browser`, `--dev` and `--fake-today` (only allowed with `--no-browser`). The server binds 127.0.0.1 only. `bookvie.lock` is created with exclusive-create. A lock is live only when its PID is alive and `/api/health` answers `{app, dataDir}` for this folder; any other lock is taken over. A Host/Origin guard rejects other hosts and origins. Unknown paths fall back to the SPA. Logs go to stderr only, with no outbound calls.
- **Store.** One `library.json` with the shape `{schemaVersion, mainBookId, upNextBookId, sideReadBookIds, books[]}`, where each Book nests `readings[]` and `cardNotes[]`. At schemaVersion 1 the schema already includes Reading fields and the pointers. Only `store.serialize()` writes its bytes. Commits write a temp file, fsync it and rename it over the original. Leftover temp files are swept at startup. Store models use `extra="forbid"`. There is one migration chain in `store/migrations/`, and the original is backed up to `library.v<N>.bak.json` before a migration rewrites it. Newer or invalid files make the server exit with no change. A filesystem seam allows fault injection.
- **Concurrency.** One in-process lock serializes apply, write files, commit and the in-memory swap. Views read only committed state.
- **Intents and views.** Each user action is one `POST /api/intents/<kebab-verb>` that applies every consequence and commits once, or changes nothing. There are no CRUD or PATCH endpoints. `add-book` and `edit-book` are multipart, with a JSON part named `intent` plus a file part. Views are `GET /api/views/<noun>` (`catalog`, `home`). The server computes domain numbers (read status, the "X of Y finished" meter, resolved colors). The client only sorts with `Intl.Collator`, packs rows, searches and formats.
- **Response envelope.** Success is `{ok: true, ids?}`. Failure is `{error: {kind, code, message, fields?}}`: 422 `invalid_fields` lists every failing field, 409 is for state rules (`duplicate_book`, `pages_below_current_page`, `book_not_found`), 413 is `cover_too_large`, and 500/503 is `couldnt_save`. A global handler replaces FastAPI's `{detail}` shape. Error codes are an enum, and the server owns all message copy. A failed `check_invariants()` after validation commits nothing and returns 500.
- **Contract.** Pydantic models are the source of truth, with camelCase aliases. `openapi-typescript` generates `src/api/generated/`, and `check:api` fails on any diff. IDs are server-minted UUID v4.
- **Client data.** Queries are keyed `['view', …]`. Any intent response invalidates all views, and views refetch on focus and visibility change. There are no optimistic updates, and success is announced only after the refetched views render. A network failure counts as `couldnt_save`.
- **Spine colors.** These are stored, never recomputed: `spineColorUser`, `spineColorFromCover`, `spineColorCurated` (assigned in rotation Sage, Slate, Clay, Ochre, Plum, Teal, Moss, Stone) and the resolved `spineColor` (user, else cover, else curated). Only intents that change an input re-resolve it.
- **Covers.** Pillow re-decodes each upload, applies EXIF orientation, converts CMYK to RGB, keeps the first frame and downscales to a long edge of at most 1200px. The output is JPEG, or PNG when the image has transparency. HEIC and bombs are refused, and uploads over 20 MB are refused while streaming. Files get immutable names `covers/<book-id>-<uuid>.<ext>`. The order is always new files, then the document commit, then deletion of unreferenced files; a failed deletion is logged and the response is still 200. Covers are served at `/media/covers/` with immutable caching, and unreferenced files are swept at startup.
- **Time.** `domain/` gets an injected `Clock`. Dates are local `YYYY-MM-DD`. Tests pin TZ=Europe/Madrid and set the Playwright browser clock and `timezoneId` to match.
- **Test harness.** A `LibraryBuilder` fixture seeds state, including pre-seeding a data folder before an e2e server starts. The Playwright server fixture is worker-scoped, with data dirs under `$TMPDIR/bookvie-e2e/<run-id>/worker-<n>/` and a path guard that always refuses `~/bookvie-data`. `npm run check` runs `check:py`, `check:api`, `check:e2e` and `check:smoke` in order and stops at the first failure. Every later check lives inside one of these four.

## UX & Interaction Patterns

- **App shell.** The nav shows "Skip to content", the wordmark and the nav items, plus the Light/Dark/System theme toggle (`role=group` "Theme", `aria-pressed`, stored in `localStorage` inside try/catch). Only Catalog is in the nav in this epic, and `/` routes to Catalog. Each page has `header`/`nav`/`main` landmarks, one `h1` and a `document.title` of "<Page> — bookvie". Focus moves to the `h1` on route change.
- **Live regions.** Each page has one polite `status` and one `alert` region. Both are emptied before each save attempt and when a panel or dialog opens, and new text is set after about 100 ms.
- **Loading.** Before the first data arrives, only the header renders (no spinner or skeleton). A failed first load shows "Couldn't load. Is bookvie still running?" with **Try again**. A failed background refetch keeps the last data silently.
- **Agent Label Contract.** The contract table in EXPERIENCE.md is a public interface. E2E tests drive it by exact accessible names (no `data-testid`), and renaming an entry is a breaking change. Panel fields: Title, Subtitle, Pages, Author(s), Edition, Language, Publisher, Type, ISBN, Year, Finished on, Tags, Spine color, Cover, the swatch buttons, **Add book**/**Save changes**, **Cancel** and **Close**. Duplicate dialog: **Don't add**/**Add anyway** (edit mode: **Don't save**/**Save anyway**). Also **Search titles**.
- **New/Edit book panel.** A modal side panel from the right; focus starts on Title. Invalid fields get `aria-invalid` and a described-by message, the alert reads "Not saved. N fields need attention: …", and focus goes to the first invalid field. Fields are never red: an invalid field has a 2px ink border. The submit button is `aria-disabled` while a request is in flight. Cancel, Close or Esc discards without a prompt.
- **Duplicate dialog.** An `alertdialog` "Possible duplicate" stacked over the panel, with the panel `inert`. It names up to 3 matches plus "and N more".
- **Bookcase.** Spine size, color, outline and accessible-name rules are in DESIGN.md → Spine. Each spine is a `button` in a list item named "*Title* by *First author*, finished / not read yet". The bookcase is one Tab stop with roving tabindex: arrow keys, Home and End move between spines, with no type-ahead. Search hides non-matching spines and the shelf closes up. The library meter is a progressbar. The Bookcase/List toggle is remembered.
- **Spine popover.** A non-modal dialog; one open at a time. Esc, an outside click or focus leaving closes it, and focus returns to the spine. It holds the Change color block (toggle swatches, saved at once).
- **Controls that can't act** use `aria-disabled` with a reason, never native `disabled`.
- **Motion.** Reduced motion turns all motion off. Forced colors keep read and unread spines distinct.
- **Focus after close** follows the table in EXPERIENCE.md. For example, after an add, focus goes to the new spine or row; after a delete, to **Search titles**.

## Cross-Story Dependencies

- Stories 1.1 to 1.5 are the foundation (skeleton, instance lock, check harness, store, contract). Every later story in this and other epics builds on them, and Story 1.6's shell hosts every page.
- Stories 1.7 and 1.9 (server add-book and the duplicate refusal) come before their UI in Stories 1.8 and 1.9. Stories 1.11 and 1.13 reuse the panel, validation and duplicate flow.
- Story 1.4's schema already carries Readings, `pausedAt`, `upNextBookId` and `sideReadBookIds`. Stories 1.11 and 1.12 seed those states with `LibraryBuilder` even though the reading features arrive in Epics 3 and 4.
- Story 3.1 later adds Home to the nav and makes `/` Home. Stories 3.2 and 4.4 add primary actions to the spine popover. Epic 7 adds sort and filters to the Catalog toolbar. Epic 2's export packages the data folder this epic defines.
