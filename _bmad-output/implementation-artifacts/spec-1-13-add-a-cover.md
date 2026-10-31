---
title: 'Story 1.13: Add a cover'
type: 'feature'
created: '2026-10-31'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
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
- [ ] `backend/bookvie/domain/cover_color.py` (+ `tests/test_cover_color.py`) -- the pure color rule; unit-test bins, neutrals, the cap and B&W.
- [ ] `backend/bookvie/intents/cover.py`, `contract.py`, `domain/book_fields.py` -- decode/normalize, the refusals, the code and messages.
- [ ] `backend/bookvie/store/store.py` -- `apply(new_files=…)`, the cleanup after the commit, the startup sweep.
- [ ] `backend/bookvie/intents/{add_book,edit_book,delete_book}.py` -- covers, `removeCover`, the 422 for both together.
- [ ] `backend/bookvie/http/{api,app}.py`, `views/{models,shelf}.py` -- file parts, the size cap, media serving, view fields.
- [ ] `backend/tests/test_cover.py`, `test_contract.py`, `test_views.py` -- un-skip all 8; add the checklist's green-phase API follow-ups (AC-2 boundary, WebP and the streaming refusal; AC-3 PNG/opaque RGBA/CMYK/GIF/no-upscale/hostile filenames; AC-4/5 refusal removes the file; AC-7 HEAD; AC-8 recompute and leave-alone; AC-10 API).
- [ ] `frontend/src/api/books.ts` (+ test) -- cover part and `removeCover`; run `npm run check:api`.
- [ ] `frontend/src/components/{FileField,SwatchRow}.tsx`, `pages/NewBookPanel.tsx`, `lib/bookDetail.ts` (+ test) -- Cover, Remove cover, From cover, per the Decisions.
- [ ] `frontend/src/pages/BookDetailPage.tsx` (+ CSS) -- the cover or placeholder.
- [ ] `frontend/e2e/cover.spec.ts`, `new-book-panel.spec.ts` -- un-skip all 3; add the AC-1 edit-mode follow-up, the AC-2 field error on Cover, AC-9 with a cover plus From cover pressing, and axe AA on Book detail in both themes with and without a cover.
- [ ] `_bmad-output/test-artifacts/atdd-checklist-1-13-add-a-cover.md` -- tick the implementation checklist; link this spec.

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then it exits 0 with all 11 Story 1.13 scaffolds active, every earlier test passing, and the coverage gates met.
- Given a running bookvie, when a cover is added, replaced and removed, then `covers/` holds exactly the files `library.json` references after each step.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest tests/test_cover.py tests/test_cover_color.py tests/test_contract.py tests/test_views.py tests/test_delete_book.py` -- expected: all pass, none skipped.
- `npm --prefix frontend run check:api` -- expected: no diff afterwards; `tsc -b`, oxlint and unit tests pass.
- `npm run build && TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/cover.spec.ts e2e/new-book-panel.spec.ts e2e/book-detail.spec.ts` -- expected: all pass.
- `npm run check` -- expected: exit 0.
