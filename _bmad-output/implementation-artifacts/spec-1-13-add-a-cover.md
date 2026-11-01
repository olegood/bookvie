---
title: 'Story 1.13: Add a cover'
type: 'feature'
created: '2026-10-31'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'cc103c17fb6c53e33df0c81cd8aac142017157bc'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-1-13-add-a-cover.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Books have no cover, so Book detail can't show what a Book looks like and spines can't take a cover's color.

**Approach:** `add-book` and `edit-book` accept an optional `cover` file part. The server re-decodes and normalizes it with Pillow, stores it under a minted name in the AD-12 order, computes `spineColorFromCover`, serves it at `/media/covers/`, and sweeps unreferenced covers. `edit-book` gains `removeCover`. The client adds the **Cover** field, **Remove cover**, the "From cover" swatch and the cover or no-cover placeholder on Book detail. Turn on the 11 ATDD scaffolds (`backend/tests/test_cover.py`, `frontend/e2e/cover.spec.ts`). The criteria are epics.md → Story 1.13, AC-1…AC-11 in the checklist.

## Boundaries & Constraints

**Always:** Every name, code, message and effect in the checklist's "Contract the Scaffolds Pin". Cover files are written as a temp in `covers/` (prefix `<name>.tmp`) + `fs.replace`, and deleted with `fs.remove`, all through `Store.fs`. Every new file is removed when the change refuses or the commit fails. Only the change that sets a new cover or removes one touches `spineColorFromCover`/`spineColor` (AD-11). Pillow decoding happens before the store lock is taken. The layer rule holds: `http` imports only `intents` and `views`. Un-skip the scaffolds without weakening them; extend `test_contract.py` for 413.

Decisions:
- Size cap: an ASGI wrapper on the two routes refuses with 413 as soon as `Content-Length` or the bytes received pass 20 MiB + 64 KiB (multipart overhead) and stops reading. After parsing, a `cover` part over exactly 20 MiB also gets 413. Both use the same envelope.
- A `cover` part together with `removeCover: true` → 422 `invalid_fields` on `intent`. The client never sends both: choosing a file after **Remove cover** cancels the removal.
- Cleanup after a commit deletes the files the old document referenced and the new one doesn't. That one step serves replace, remove and `delete-book`. Each failure logs one `bookvie: couldn't delete covers/<name>: …` line, and the response is still 200.
- `/media/covers/{name}` (GET and HEAD) serves a file only when a Book's `coverFile` names it, with `Cache-Control: public, max-age=31536000, immutable`. Anything else gets 404.
- `BookDetailView` gains `coverFile` and `spineColorFromCover`. Book detail shows `img` "Cover of *Title*" (`/media/<coverFile>`, 200×300, `object-fit: cover`, `--radius-cover`) or the `role="img"` placeholder "No cover", at the top of the left column above the action stack.
- **Remove cover** is shown beside Cover in edit mode when the Book has a cover. Pressing it hides the button and "From cover", shows "The cover will be removed when you save." under Cover, and moves focus to Cover.
- "From cover" is shown only when a stored cover exists. It comes before the eight swatches, with a dot in `spineColorFromCover` (no dot when that is null), and `aria-pressed` is true when Spine color is empty. Pressing it empties Spine color.

**Never:** No HEIC or other Pillow plugins. No schema bump (`coverFile` and `spineColorFromCover` already exist). No covers on spines, the popover or Home (later stories). No client-side image processing or size check. No planning-doc edits.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Add with cover | valid fields + PNG | 200, `coverFile` minted, color computed and resolved | N/A |
| Replace cover | Book with cover, new file | new name; old file deleted after commit | delete fails → logged, 200, swept at startup |
| Remove cover | `removeCover: true` | `coverFile`/`spineColorFromCover` null, color user else curated | no cover → no-op 200 |
| Bad file | text, truncated, empty, bomb | 422 on `cover`, "Cover must be an image file." | no file written |
| HEIC | unsupported signature | 422 "Cover must be a JPEG, PNG or WebP image." | no file written |
| Too large | > 20 MiB | 413 `cover_too_large` | refused while streaming |
| Refusal in change | dup / gone Book / invalid field + cover | its usual refusal | new file removed |
| Fault | write / fsync / replace | 503, `library.json` byte-identical | new and temp files removed |

</frozen-after-approval>

## Code Map

- `backend/bookvie/store/store.py:94,128,216,247` -- `Store.open` / `_sweep` (add the unreferenced-cover sweep through `fs.remove`, before the `covers/` mkdir) / `apply` (add `new_files: Mapping[str, bytes]`: write files, then change + commit, then cleanup, all inside the lock) / `_write_atomic` (generalize the target directory and prefix; it already removes the temp on fault).
- `backend/bookvie/store/fs.py:19` -- `FileSystem` protocol; no new methods.
- `backend/bookvie/intents/cover.py` (new) -- `prepare_cover(data) -> PreparedCover(data, ext, color)`: `warnings` raise `DecompressionBombWarning`; HEIC/HEIF/AVIF signatures (`ftyp` box) → formats message; `exif_transpose`; first frame; RGBA/LA/P with transparency → PNG, else RGB JPEG; `thumbnail((1200,1200))`; 64px sample fed to the domain color function.
- `backend/bookvie/domain/cover_color.py` (new) -- pure `spine_color_from_pixels(pixels) -> str | None` (the DESIGN.md rule: drop S<0.15, L<0.10 or L>0.90; 24 hue bins; average the fullest bin; cap S at 0.45). Export it from `domain/__init__.py`.
- `backend/bookvie/intents/contract.py:32,96` -- `ErrorCode.COVER_TOO_LARGE`, a `cover_too_large()` helper; `domain/book_fields.py:18` `LABELS["cover"]`, the three messages.
- `backend/bookvie/intents/{add_book,edit_book,delete_book}.py` -- take an optional `PreparedCover`; mint `covers/<book-id>-<uuid4>.<ext>`; set the fields and `resolve_spine_color` (book_fields.py:288). `EditBookIntent` (edit_book.py:55) gains `remove_cover: bool = False`. Fix the delete_book docstring (:10).
- `backend/bookvie/http/api.py:42,81-129` -- add `cover: UploadFile | None = File(None)` to both routes, 413 in `ERROR_RESPONSES`, and the size-cap ASGI wrapper. `http/app.py:30,127-136` -- the media route, before the SPA catch-all.
- `backend/bookvie/views/{models,shelf}.py:55,74` -- `BookDetailView` fields and a `cover_path(store, name) -> Path | None` lookup for the media route.
- `backend/tests/test_add_book.py:58` `_client`, `test_store.py` `FaultyFs`, `builder.py`, `test_contract.py`, `test_views.py`.
- `frontend/src/api/books.ts:42,60` -- `addBookForm`/`editBookForm` get `{cover?: File, removeCover?: true}` → `form.append('cover', file)`, `removeCover` in the intent JSON. `src/api/generated/` comes from `check:api`.
- `frontend/src/pages/NewBookPanel.tsx:79-193` -- the Cover field between Tags (189) and the `.spineColor` block (190). `errors` must keep `cover` (139-144). `src/components/TextField.tsx` shows the label/`aria-describedby` pattern to copy for a `FileField`. `src/components/SwatchRow.tsx` gets an optional `fromCover` prop. `src/lib/bookDetail.ts:61` `toPanelFields`, plus the cover data the panel needs.
- `frontend/src/pages/BookDetailPage.tsx:100-153` and `.module.css:22-41` -- the `.card` grid's left column. Tokens in `src/styles/tokens.css`: `--color-surface-inset`, `--color-spine-unread-outline` (1.5px dashed border, two title bars), `--radius-cover`, `--space-cover-main-*`.
- `frontend/e2e/cover.spec.ts`, `e2e/new-book-panel.spec.ts:29-42` (`CONTRACT_FIELDS` gains Cover), `e2e/fixtures.ts:143`.

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookvie/domain/cover_color.py` (+ `tests/test_cover_color.py`) -- the pure color rule; unit-test bins, neutrals, the cap and B&W.
- [x] `backend/bookvie/intents/cover.py`, `contract.py`, `domain/book_fields.py` -- decode/normalize, the refusals, the code and messages.
- [x] `backend/bookvie/store/store.py` -- `apply(new_files=…)`, the cleanup after the commit, the startup sweep.
- [x] `backend/bookvie/intents/{add_book,edit_book,delete_book}.py` -- covers, `removeCover`, the 422 for both together.
- [x] `backend/bookvie/http/{api,app}.py`, `views/{models,shelf}.py` -- file parts, the size cap, media serving, view fields.
- [x] `backend/tests/test_cover.py`, `test_contract.py`, `test_views.py` -- un-skip all 8; add the checklist's green-phase API follow-ups (AC-2 boundary, WebP and the streaming refusal; AC-3 PNG/opaque RGBA/CMYK/GIF/no-upscale/hostile filenames; AC-4/5 refusal removes the file; AC-7 HEAD; AC-8 recompute and leave-alone; AC-10 API).
- [x] `frontend/src/api/books.ts` (+ test) -- cover part and `removeCover`; run `npm run check:api`.
- [x] `frontend/src/components/{FileField,SwatchRow}.tsx`, `pages/NewBookPanel.tsx`, `lib/bookDetail.ts` (+ test) -- Cover, Remove cover, From cover, per the Decisions.
- [x] `frontend/src/pages/BookDetailPage.tsx` (+ CSS) -- the cover or placeholder.
- [x] `frontend/e2e/cover.spec.ts`, `new-book-panel.spec.ts` -- un-skip all 3; add the AC-1 edit-mode follow-up, the AC-2 field error on Cover, AC-9 with a cover plus From cover pressing, and axe AA on Book detail in both themes with and without a cover.
- [x] `_bmad-output/test-artifacts/atdd-checklist-1-13-add-a-cover.md` -- tick the implementation checklist; link this spec.

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then it exits 0 with all 11 Story 1.13 scaffolds active, every earlier test passing, and the coverage gates met.
- Given a running bookvie, when a cover is added, replaced and removed, then `covers/` holds exactly the files `library.json` references after each step.

### Review Findings

Code review 2026-10-31 (blind hunter, edge-case hunter, verification gap, acceptance auditor) of `cc103c1..5250c62`.

- [x] [Review][Patch] A missing `library.json` only spares `covers/` for one restart [backend/bookvie/store/store.py:144] — resolved by the user (option 1): refuse to start with a `StartupError` when `library.json` is missing and `covers/` holds files, so nothing is deleted. `Store.open` skips the sweep when no file exists, then commits `Library.empty()`. On the next start the empty library is read and `_sweep_covers` deletes every cover. So the E2 fix only postpones the loss. `test_a_missing_library_json_leaves_existing_covers_alone` opens the store once, so it can't see this. (medium, acceptance-auditor)
- [x] [Review][Patch] Choosing a file and then pressing Remove cover is untested [frontend/e2e/cover.spec.ts] — if `markCoverRemoved` stopped dropping the chosen file, `editBookForm` would upload it instead of removing the cover. AC-9 and AC-10 would still pass. Add an e2e: choose a file, press Remove cover, save, then assert `removeCover: true`, no `cover` part and "No cover". (verification-gap)
- [x] [Review][Patch] 413 is declared on every `/api` route [backend/bookvie/http/api.py:58] — `ERROR_RESPONSES` is router-wide, so the generated `schema.d.ts` lists `cover_too_large` on the GET views and on `delete-book`. Declare it only on `add-book` and `edit-book` with `responses=`, then rerun `check:api`. (blind-hunter+acceptance-auditor)
- [x] [Review][Patch] The deferred-work entry is under the story 1.11 heading and in a key/value format [_bmad-output/implementation-artifacts/deferred-work.md:100] — give it its own `## Deferred from: code review of spec-1-13-add-a-cover.md (2026-10-31)` heading and make it a prose bullet like the rest. (blind-hunter)
- [x] [Review][Patch] Rename `_streamed_add_book_scope`, since it also builds edit-book scopes [backend/tests/test_contract.py:388] — rename it `_streamed_cover_scope`. (blind-hunter)
- [x] [Review][Patch] A rewrapped doc comment line runs to 114 characters [frontend/src/pages/BookDetailPage.tsx:199] — rewrap it to the block's width. (blind-hunter)
- [x] [Review][Patch] The `removeCover && !cover` rule is enforced twice [frontend/src/pages/NewBookPanel.tsx:150] — `editBookForm` already drops `removeCover` when a file is sent, and `books.test.ts` pins that. Pass `removeCover` straight through from the panel. (blind-hunter)

**Rejected:**
- A cover between 20 MiB and 20 MiB + 64 KiB is read in full before the 413 (edge-case) — low: the spec's Decisions set this two-stage cap. "While streaming" in the commit message is loose, but commits are not rewritten.
- No client-side size check before upload (edge-case, blind) — the spec says "No client-side … size check"; changing that means editing the spec.
- HEIC/AVIF recognised only by the major brand (edge-case, auditor) — low: the major-brand list already covers `mif1`/`msf1`/`heic`/`avif`. Other brands are rare, and handling them adds a box scan.
- A hand-edited `covers/./x.jpg` could be swept (edge-case) — low: only reachable by hand-editing `library.json`, and the fix adds normalisation.
- Remove cover → pick a file → cancel the picker drops the removal (edge-case) — false: `chooseCover(null)` sets `removeCover` back only when a file is passed (`NewBookPanel.tsx:179`), so the removal and its note stay.
- The old Cover error stays after a new file is picked (edge-case) — low: every field keeps its error until the next save (`setErrors` runs only in `submit`); changing that only for Cover adds a branch.
- No accepted-formats hint on Cover (blind) — low: the spec defines the field without a hint, and adding one is a design addition.
- No way to clear a chosen file in New book (blind) — low: it only matters in Firefox/Safari after a mistaken pick, and the fix adds a control the spec doesn't have.
- The media route could serve a symlink or `.html` (blind) — low: names come only from referenced `coverFile`s minted by the server, so it needs hand edits or local file planting. Guards add code.
- `views/shelf.py` is no longer "pure" (blind) — low: the layer rule allows views → store, and the docstring already names `cover_path`.
- The cover is decoded before the fields are checked (blind) — low: the same issue as B4 from the build review. It only costs time on a refused save.
- Spec `status: done` vs sprint `review` (blind, auditor) — fixing it means editing the spec under review; the status is synced in the review's own final step (B9).
- The axe test skips the note, error and pressed-chip states (blind) — low: the spec's requirement (Book detail in both themes, with and without a cover) is met. Adding more states is extra scope.
- The "From cover" chip has no unit test, and black-and-white with no dot is untested (blind) — low: the frontend has no component unit tests (`node:test` covers `lib/` and `api/`), and the e2e covers the chip.
- The bomb check is not `DecompressionBombWarning` as the Code Map says (auditor) — E3 approved the explicit pixel check; fixing it means editing the spec.
- An oversize cover sent with a bad intent gets 422, not 413 (auditor) — false: the spec doesn't fix the order of checks, and either refusal is correct.
- The client buffers the multipart body (auditor) — already raised as E6/B7. Note for B8: the real client always sends `Content-Length`, so only the header branch of `CoverSizeCap` runs for it.

## Implementation Notes

## Spec Change Log

## Review Triage Log

Iteration 0 (blind hunter, edge-case hunter, verification gap):

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| V1 | Startup cover sweep on a migrated library is untested | medium | patch | Pre-verified: no migration test puts a file in `covers/`; reverting to `_sweep(store._library)` would delete every cover on a schema bump unnoticed. |
| V2 | Streaming 413 cap only tested on add-book | medium | patch | Pre-verified: `_streamed_add_book_scope` hard-codes the add-book path; dropping `EDIT_BOOK_PATH` from `paths` fails no test. |
| V3 | `CoverSizeCap` truncates a response already started | low | reject | Both routes read the whole form before answering, so `started` is never true when the limit is crossed; a fix adds a branch. |
| V4 | Intent part over 64 KiB is blamed on Cover | low | reject | The 20 MiB + 64 KiB budget is a spec Decision; a 64 KiB intent JSON never occurs in normal use. |
| E1 | Media route 500s when a cover is deleted between `is_file` and `FileResponse` | low | reject | Needs a replace/remove racing a GET in a single-user app; a fix adds a guard. |
| E2 | `Store.open` with no `library.json` deletes every file in `covers/` | medium | patch | Verified in `store.py` `open`: when `exists` is false the sweep runs against `Library.empty()`, so covers left by a lost/moved `library.json` are deleted irreversibly; skipping the cover sweep when no file was read is a one-condition fix. |
| E3 | `warnings.catch_warnings` is not thread-safe; sync routes decode in the threadpool | low | patch | Verified `cover.py` `_decode`: concurrent uploads can restore the filter mid-decode so a 1x-2x bomb is accepted; replacing it with an explicit `width*height > MAX_IMAGE_PIXELS` check is a direct correction. |
| E4 | 16-bit grayscale images clip to near-white | low | reject | Rare input for a cover; fix adds mode branches. |
| E5 | Book detail shows a broken image when a referenced cover is missing | low | reject | Only reachable by hand-deleting a referenced file; fix adds state; spec does not ask for a fallback. |
| E6 | Client buffers the whole chosen file before sending (`intents.ts`) | low | reject | Verified: `new Response(form).arrayBuffer()` buffers the body; covers are a few MB, and the wire bytes are identical; moving the observability into the test is more than a direct correction (it touches a pinned scaffold). Raised to the human. |
| B1 | Reds straddling 0 deg split across bins; test name overclaims | low | reject | The 24-bin rule is DESIGN.md's (planning docs are out of bounds); the averaged bin is still red, only the winner can shift when another hue is close. |
| B2 | ICC profile dropped on re-encode | low | reject | Slight desaturation of P3 photos; spec says no metadata is carried over; sRGB conversion adds code. |
| B3 | GIF/BMP/TIFF accepted though the message names JPEG, PNG, WebP | false | reject | Checklist contract: formats message is for formats Pillow can't decode without a plugin; AC-3 pins GIF and CMYK inputs. |
| B4 | `edit_book` writes the file before checking fields | low | reject | The file is removed on refusal (tested); only an extra write; checklist says "where cheap". |
| B5 | Same as E5 (no `onError` fallback) | low | reject | See E5. |
| B6 | "From cover" dot shows the old color after a new file is chosen | low | reject | Spec defines the chip from the stored cover; saving recomputes; cosmetic. |
| B7 | `sendIntent` buffers multipart for test observability | low | reject | Same root cause as E6. |
| B8 | 413 may arrive as a connection reset in a real browser | maybe-false (medium if true) | defer | Unverified: needs an e2e upload of a > 20 MiB file against real uvicorn. |
| B9 | Sprint status and spec sections out of sync | false | reject | Status sync and Verification results are written in the present step, after review. |
| B10 | `async` media route stats the file on the event loop | low | patch | Verified `app.py`: `async def cover` calls `is_file()` and scans books on the loop; making it a plain `def` is a direct correction. |
| B11 | MB vs MiB wording | low | reject | Message "20 MB" is pinned by the checklist, which defines 20 MB = 20 x 1024 x 1024. |
| B12 | No cover-specific pixel cap below Pillow's | low | reject | Single-user local app; adds a parameter. |
| B13 | Empty `cover` part (`filename=""`) refused instead of ignored | low | reject | The client never sends it; spec does not decide; adds a branch. |

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest tests/test_cover.py tests/test_cover_color.py tests/test_contract.py tests/test_views.py tests/test_delete_book.py` -- expected: all pass, none skipped.
- `npm --prefix frontend run check:api` -- expected: no diff afterwards; `tsc -b`, oxlint and unit tests pass.
- `npm run build && TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/cover.spec.ts e2e/new-book-panel.spec.ts e2e/book-detail.spec.ts` -- expected: all pass.
- `npm run check` -- expected: exit 0.
