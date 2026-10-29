# Implementation Readiness: bookvie

**Date:** 2026-10-29 · **Gate:** CONCERNS → resolved by the decisions below · **Decided by:** Oleg

Inputs checked: PRD + addendum, EXPERIENCE.md, DESIGN.md, ARCHITECTURE-SPINE.md, epics.md, test-design docs. No blockers were found. Traceability, scope, forward dependencies and AC format were clean. Every decision below is applied to the plan documents in the same commit.

Abbreviations: SPINE = `architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md`, E = `ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md`, D = `ux-designs/ux-bookvie-2026-10-28/DESIGN.md`, PRD = `prds/prd-bookvie-2026-10-28/prd.md`.

## Concerns

| # | Gap | Decision | Lands in |
|---|---|---|---|
| 1 | The single `check` command was never defined | A root `package.json` defines `npm run check`, which runs `check:py` (`uv run --project backend pytest` with the coverage gate), then `check:api` (`npm --prefix frontend run check:api`), then `check:e2e` (Playwright), then `check:smoke` (isolated install smoke test), stopping at the first failure | SPINE Stack/Structural Seed, Story 1.3 |
| 2a | No build backend; gitignored `http/static/` must ship in the wheel | hatchling; `[tool.hatch.build.targets.wheel] packages = ["bookvie"]`, `artifacts = ["bookvie/http/static/**"]`; the smoke test proves the SPA is in the installed tool | SPINE Stack/Structural Seed, Story 1.1 |
| 2b | Libraries missing from the Stack table | Add hatchling, python-multipart (runtime), and httpx, pytest-cov, Hypothesis (dev group), pinned to the current minor | SPINE Stack |
| 3 | Router and styling never chosen | React Router 8.5 (library mode, `createBrowserRouter`); CSS Modules per component over one `tokens.css` of DESIGN.md custom properties | SPINE Stack + Deferred (remove the item), Story 1.1 |
| 4 | Story 1.1 too large for one session | Split into 1.1 *Scaffold and install bookvie* (layout, pins, build, install, `bookvie` serves the SPA on 127.0.0.1:8765 with fallback, dev proxy), 1.2 *Run one safe instance* (lock, races, port conflicts, signals, Host/Origin guard, loopback only), 1.3 *One check command guards the repo* (`npm run check`, Playwright worker fixture + path guard, smoke test, no outbound calls / stderr logging, coverage gate). Old 1.2–1.12 become 1.4–1.14 | epics.md |
| 5 | Fourth Side read had no error code | 409 `side_reads_full`, "You already have 3 side reads. Remove one first." | SPINE AD-9, Story 4.7 |
| 6 | Server tie-break sort named `Intl.Collator` | Server title key = NFKD, strip combining marks, casefold; ties then by Book id. It is the one rule for server-side title ordering | SPINE (Consistency Conventions), Story 4.2 |
| 7 | Couldn't-save UI missing on several surfaces | E rule: one-click buttons (Set as Up next, Mark as Side read, Remove from side) show the `alert` line directly below the button with focus kept on it; Confirm dialogs (Pause, Delete book, Delete card note) show it inside the dialog above its buttons and stay open. One couldn't-save AC each in Stories 1.12 (delete book), 3.2 (Edit Purpose), 4.3 (pause), 4.4 (set Up next), 4.7 (side read), 5.2 (edit/delete card note) | E State Patterns, epics.md |
| 8 | "No loading state" vs views over HTTP | Before a page's first view response, render only the header and nav (no spinner, no skeleton). If a view fetch fails with no data yet, the page body shows "Couldn't load. Is bookvie still running?" in an `alert` region with a **Try again** button. A failed background refetch keeps the last data silently | E Principles + State Patterns, Story 1.5 (old 1.3, API contract / frontend `api/`) and Story 1.6 (old 1.4) |
| 9a | Delete-note Confirm stacks over the Edit card note panel, against the one-stack rule | Allowed: the stacking rule names two stacks (Duplicate over the New/Edit book panel; Delete-card-note Confirm over the Edit card note panel). Cancel returns to the panel with focus on **Delete**; confirming closes both | E, Story 5.2 |
| 9b | Duplicate dialog in edit mode had no UI spec | Same `alertdialog` over the Edit book panel with **Don't save** (default focus; returns to the panel unchanged, focus on **Save changes**) and **Save anyway**. Both labels go in the Agent Label Contract | E, Story 1.11 (old 1.9) |
| 10 | FR-18 "jump to a particular note" only via search | In every Card notes list (Book detail block, Card notes page), each note's page ref ("p.42") is a button that opens the pile in Page order at that note; **Edit** stays separate | E Card notes list + Pile entry, Story 5.4 |
| 11 | Home is header-only through Epics 1–2 | Until Story 3.1 ships, `/` routes to Catalog and Home is not in the nav; Story 3.1 adds Home to the nav and makes it the launch page | epics.md (Stories 1.6, 3.1), E navigation note |

## Minor findings

| # | Gap | Decision | Lands in |
|---|---|---|---|
| A1 | Restore codes/statuses unnamed | `POST /api/intents/restore` (multipart). 422 `restore_invalid` (not a zip, damaged, schema/invariant failure, missing or undecodable cover), 422 `restore_newer_version`, 422 `restore_unsafe` (path, symlink, duplicate, entry or size limits; same copy as `restore_invalid`); 503 `couldnt_save`. AD-9: 422 also covers a rejected upload | SPINE AD-9/AD-14, Story 2.3 |
| A2 | Streamed export can't report failure | Under the AD-4 lock the zip is built into a spooled temp file (memory up to ~10 MB, then disk); the lock is released, then the file is sent. Read failures happen before any header → 503 `couldnt_export` (a third AD-9 error `kind`, so the client never shows "Couldn't save" for an export) | SPINE AD-14, Story 2.1 |
| A3/B1 | Pinned test timezone unnamed | `TZ=Europe/Madrid` for `check:py` and `check:e2e`; Playwright `timezoneId: 'Europe/Madrid'`; DST boundary tests on the last Sundays of March and October | SPINE AD-20, Story 1.4 (old 1.2) |
| A4 | Concurrent-launch wait unspecified | The loser polls the winner's `GET /api/health` every 100 ms for up to 5 s, then opens the browser; on timeout it exits non-zero with "bookvie is starting in another window; try again." | Story 1.2 |
| A5 | Review H12: migration safety | AD-13: store models use `extra="forbid"` (unknown keys refused, never silently dropped); every persisted-shape change bumps `schemaVersion` by exactly 1 with one migration step; a test asserts the chain is contiguous from 1 to current | SPINE AD-13 |
| A6 | Review F5: serialization detail | AD-2: non-ASCII written as is (`ensure_ascii=False`), LF line endings, exactly one trailing newline | SPINE AD-2 |
| B2 | Stats parameters and preset ends | `GET /api/views/stats?from=YYYY-MM-DD&to=YYYY-MM-DD`, both inclusive local dates; omit both for All time. Response `{ books, pages, bucket: "month"\|"year", buckets: [{ period, books, pages }] }`. The browser resolves presets: This month = 1st..today, This year = 1 Jan..today, Last year = the full year. All time with no finished Readings returns 0/0, no buckets, "No books finished yet." | SPINE AD-6, E Stats, Stories 6.3/6.4 |
| B3 | Pace date under 60 days; PRD drift | Under 60 days: "About 12 days · 10 November" (year added only when it isn't this year); months and years keep "July 2027". PRD records "Finished *X* again." for re-reads (NFR6) and one bar per year over 24 months (Stats feature) | E Pace calculator, Story 6.1, PRD |
| C1 | Popover on finished, no-Reading Book | Follow the E state table: no popover action; re-reads start from Book detail. Story 3.2 narrows "can be started" to the table rows showing Start reading/Resume | Story 3.2 |
| C2 | `set-up-next` on the current Up next | No-op success: 200, nothing changes, no commit | SPINE AD-9 note, Story 4.4 |
| C3 | Mark finished on a finished Up next Book | Follow E: offered only for Main, paused, or never-finished Books; Story 4.5 reworded; the server refuses others with 409 `reading_already_finished` | Story 4.5 |
| C4 | SM-3 needs `pausedAt` kept | AD-19: `pausedAt` is never cleared, only overwritten by the next pause; Story 4.3 AC asserts it remains after resume and after finish | SPINE AD-19, Story 4.3 |
| D1 | Edit book panel errors, 409 vs 422 | Story 1.11 (old 1.9) AC: the Edit book panel shows any refusal carrying `fields` (422 `invalid_fields`, or a 409 such as `pages_below_current_page`) exactly like the New book panel: `aria-invalid`, linked message, `alert` summary, focus to the first invalid field. AD-9: a 409 state refusal about one field includes `fields` | SPINE AD-9, Story 1.11 |
| D2 | "Highest Card note page" for a range | Uses `pageEnd` when present, else `pageStart` | Stories 1.11, 5.2 |
| D3 | Cover removal excluded vs PRD "editable" | Add **Remove cover** to the Edit book panel when a cover exists; `edit-book` with `removeCover: true` clears it, the file is deleted per AD-12, the spine color falls back per AD-11 | Story 1.13 (old 1.11), E, SPINE AD-12 |
| D4 | Focus after deleting the last Book | Focus goes to the empty state's **New book** when the Catalog is empty, else to **Search titles** | Story 1.12 (old 1.10), E |
| E1 | Initial focus unspecified | First field: Start dialog → "Which page?" when shown, else Purpose; Finish dialog → Finished on; Card note panel → Note | E, Stories 3.2, 3.6, 5.1 |
| E2 | No feedback after one-click actions | `status`: "*X* is Up next." / "*X* is on the side." / "*X* is off the side." / "Paused *X* at p.120. It's Up next."; focus moves to Book detail's primary button (its `h1` when there is none); from a spine popover, focus returns to the spine | E Live regions, Stories 4.3, 4.4, 4.7 |
| E3 | Home slice keyboard order and name | On Home, the arrow keys and Home/End follow the rows as displayed; the list is named "Bookcase slice, N rows" with the actual count | E, Story 3.5 |
| E4 | Book detail action order | Set as Up next, Pause, Mark finished, Mark as Side read / Remove from side, Add card note, Edit, Delete; Edit Purpose stays a `link` beside the Purpose line (DESIGN.md Current reading block), not a stack button. Card-note page refs are compact chip buttons (DESIGN.md Card notes list) | D Book detail, Story 4.6 |
| F1 | Messages missing from E's tables | Add "Which page? is required.", "Note is required." and "Cover must be a JPEG, PNG or WebP image." (cover messages in the Agent Label Contract). Over 20 MB: 413 `cover_too_large`, field message "Cover must be 20 MB or smaller." | E, SPINE AD-9/AD-12, Story 1.13 |
| F2 | Edit Purpose rule | Optional, no length limit; empty clears it; whitespace trimmed. Edit Purpose is removed from E's validated-forms list | E |

## Editorial fixes

- SPINE:45 says "Export and restore are intents". Correct it: export is `GET /api/export` (module `intents/export` may stay as the implementation location, but it is not under `/api/intents/`), and restore is `POST /api/intents/restore`.
- Story 1.1: AC that the template's `tsconfig` compiles under TS 5.9 (`tsc -b` passes).
- Story 1.4 (old 1.2): the schema includes Reading, `pausedAt`, `upNextBookId` and `sideReadBookIds` from the start, so Story 1.12 can seed them.
- Story 5.4: AC re-running the export → restore byte-identical round trip with Card notes, a paused Reading, an Up next Book and Side reads.
- Story 5.3: fix the contradictory "When it has Card notes" / zero-notes condition.
- PRD Home slice wording aligned with E (rows chosen by priority, Main row first, the others in bookcase order).
