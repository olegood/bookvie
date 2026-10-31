---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-10-31'
storyId: '1.13'
storyKey: '1-13-add-a-cover'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-113-add-a-cover'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-1-13-add-a-cover.md'
generatedTestFiles:
  - 'backend/tests/test_cover.py'
  - 'frontend/e2e/cover.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 1.13, Conventions for every story → TR8, Seeded states)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-3, AD-4, AD-9, AD-11, AD-12)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Cover, No-cover placeholder, Remove cover, Agent Label Contract, cover messages)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Spine colors → Cover rule, No-cover placeholder, cover-main 200×300)'
  - '_bmad-output/test-artifacts/test-design-qa.md (FND-API-002, FND-API-003, CAT-API-008, CAT-UNIT-003; R-03, R-14)'
  - '_bmad-output/test-artifacts/atdd-checklist-1-12-delete-a-book.md'
  - 'backend/bookvie/intents/add_book.py, edit_book.py, delete_book.py, book_form.py, commit.py, contract.py; http/api.py, http/app.py; store/store.py, store/fs.py; domain/book_fields.py; views/models.py'
  - 'backend/tests/builder.py, conftest.py, test_add_book.py, test_edit_book.py, test_delete_book.py, test_store.py (FaultyFs)'
  - 'frontend/e2e/fixtures.ts, book-detail.spec.ts, delete-book.spec.ts, new-book-panel.spec.ts; frontend/src/pages/NewBookPanel.tsx'
  - 'frontend/playwright.config.ts, _bmad/tea/config.yaml'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given the New book or Edit book panel, when I choose a file in Cover (input type=file, exact label "Cover"), then add-book and edit-book send it as the multipart file part, still in one call and one commit' }
  - { id: AC-2, idSource: generated, text: 'Given an uploaded file, when the server receives it, then Pillow re-decodes it, and anything that isn''t an image (including a non-image with an image extension, and a decompression bomb over MAX_IMAGE_PIXELS) is refused with 422 and "Cover must be an image file."; uploads over 20 MB are refused while streaming with 413 cover_too_large and "Cover must be 20 MB or smaller." (R-14); HEIC or any format Pillow can''t decode without a plugin is refused with 422 and "Cover must be a JPEG, PNG or WebP image." (AD-12); every cover message appears on Cover like any other field error and is listed in the Agent Label Contract' }
  - { id: AC-3, idSource: generated, text: 'Given a valid image, when it is stored, then EXIF orientation is applied, CMYK is converted to RGB, only the first frame of an animation is kept, and it is downscaled to a long edge of at most 1200px keeping its aspect ratio; it is re-encoded as JPEG, or PNG when it has transparency, and saved under a new server-minted name covers/<book-id>-<uuid>.<ext> recorded in coverFile, <ext> from the output format; replacing a cover writes a new name and never overwrites or reuses one' }
  - { id: AC-4, idSource: generated, text: 'Given any cover write, when the intent runs, then the order is: new files (temp + rename), then the document commit, then deleting files no Book references' }
  - { id: AC-5, idSource: generated, text: 'Given a cover write, when a fault is injected at the document commit, then the old document and its cover are intact and the new file is cleaned up (R-03)' }
  - { id: AC-6, idSource: generated, text: 'Given a cover write whose document commit succeeded, when a fault is injected while deleting files no Book references, then the response is still 200, the failure is logged to stderr, and the startup sweep removes the leftover file (AD-12)' }
  - { id: AC-7, idSource: generated, text: 'Given a stored cover, when the browser requests /media/covers/<file>, then it is served with immutable caching; and at startup the server deletes cover files that no Book references, and delete-book removes its cover after the commit' }
  - { id: AC-8, idSource: generated, text: 'Given a new or replaced cover, when it is stored, then spineColorFromCover is computed once using the DESIGN.md cover rule (≈64px sample, near-neutral pixels ignored, 24 hue bins, average of the fullest bin, saturation capped at 0.45); a black-and-white cover gives none, so curated applies; the resolved color stays user, else from cover, else curated' }
  - { id: AC-9, idSource: generated, text: 'Given Book detail, when a Book has no cover, then the no-cover placeholder (surface-inset fill, dashed outline, two title bars) appears at the cover''s size and isn''t interactive (UX-DR23); and the "From cover" swatch in the panel appears only when a cover exists, and pressing it empties Spine color' }
  - { id: AC-10, idSource: generated, text: 'Given the Edit book panel for a Book with a cover, when I press Remove cover (shown only when a cover exists) and save, then edit-book is sent with removeCover: true, coverFile and spineColorFromCover are cleared, the file is deleted after the commit (AD-12), and the resolved spine color falls back to user, else curated (AD-11); and Book detail shows the no-cover placeholder' }
  - { id: AC-11, idSource: generated, text: 'The standard intent ACs (TR8) hold for the cover paths of add-book and edit-book' }
---

# ATDD Checklist - Epic 1, Story 1.13: Add a cover

**Date:** 2026-10-31
**Author:** Oleg
**Primary test levels:** API (pytest, `TestClient` against `create_app` with a real `Store` on `tmp_path`, Pillow-made images) for the upload pipeline and the AD-12 file order; E2E (Playwright against a real seeded `bookvie`) for the Cover field, the no-cover placeholder and Remove cover

---

## Story Summary

As Oleg, I want to attach a photo of each Book's cover, so that my Books are recognizable and their spines can take the cover's color.

The server half: `add-book` and `edit-book` accept an optional `cover` file part. Pillow re-decodes it, refuses non-images, HEIC and decompression bombs (422) and anything over 20 MB (413 `cover_too_large`, a new code). It normalizes the image (EXIF orientation, RGB, first frame, ≤ 1200px), re-encodes it as JPEG or PNG, and stores it under a minted, never-reused name. Files go in before the document commit and come out after it (AD-12). `/media/covers/<file>` serves covers immutably, startup sweeps unreferenced covers, and `delete-book` now removes its cover. `spineColorFromCover` is computed once per stored cover. `edit-book` gains `removeCover: true`. The client half: the **Cover** file field, the cover or no-cover placeholder on Book detail, the "From cover" swatch, and **Remove cover**.

**Story source:** `epics.md` → Story 1.13. There is no spec yet (`sprint-status.yaml` has `1-13-add-a-cover: backlog`). The scaffolds took their names from the criteria, AD-12, EXPERIENCE.md and the 1.12 code. The spec should adopt the names under "Contract the Scaffolds Pin" or change the scaffolds with it.

**Stack:** detected `fullstack` (`backend/pyproject.toml` + `frontend/playwright.config.ts`). `tea_use_playwright_utils` is false, so the spec uses the project's `fixtures.ts` and plain Playwright, as in Stories 1.6 to 1.12. Pillow 13 is already a backend dependency.

**Generation mode:** AI generation from the criteria, the architecture and UX docs, and the existing code. No browser recording was done because the Cover field, placeholder and Remove cover don't exist yet. Every locator comes from a role and name the criteria or the Agent Label Contract pin. Execution was **sequential** with a single author, as in Stories 1.6 to 1.12. The context was already loaded, and one author keeps the helpers consistent with `test_edit_book.py`, `test_delete_book.py` and `book-detail.spec.ts`.

---

## Acceptance Criteria

The story's criteria have no ids, so they are numbered AC-1 to AC-11 in source order (one per Given/When/Then block, with the closing TR8 line as AC-11, as in earlier stories). The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | **Cover** (`input type=file`, label "Cover") → `cover` file part, one `add-book` call | E2E | P0 | `[P0] AC-1` |
| AC-2 | Non-image / bomb → 422 "Cover must be an image file."; > 20 MB → 413 `cover_too_large`; HEIC → 422 formats message; on **Cover** | API | P0 | `test_ac2_p0_…` |
| AC-3 | EXIF, CMYK → RGB, first frame, ≤ 1200px; JPEG or PNG; `covers/<book-id>-<uuid>.<ext>`; replace = new name | API | P0 | `test_ac3_p0_…` |
| AC-4 | Order: new file renamed → document commit → old file deleted | API | P0 | `test_ac4_p0_…` |
| AC-5 | Fault at document commit: old document and cover intact, new file cleaned up (R-03) | API | P0 | `test_ac5_p0_…` |
| AC-6 | Fault deleting after commit: still 200, logged, swept at startup | API | P1 | `test_ac6_p1_…` |
| AC-7 | `/media/covers/<file>` immutable; startup sweep; `delete-book` removes the cover | API | P1 | `test_ac7_p1_…` |
| AC-8 | `spineColorFromCover` by the cover rule; B&W → none → curated; user > cover > curated | API | P1 | `test_ac8_p1_…` |
| AC-9 | No cover: placeholder at cover size, not interactive; "From cover" only with a cover | E2E | P1 | `[P1] AC-9` |
| AC-10 | **Remove cover** + **Save changes** → `removeCover: true`; placeholder shown | E2E | P1 | `[P1] AC-10` |
| AC-11 | TR8 for the cover paths: faults → 503 + byte-identical + no file left; invariants; `book_not_found` | API | P0 | `test_ac11_p0_…` |

Priorities: P0 is R-14 (hostile uploads: AC-2, and AC-3's name minted from the output format, never the upload name), R-03 (one commit or none, with files in the AD-12 order: AC-4, AC-5, AC-11) and the skill-facing **Cover** label (AC-1, FR-2). AC-6 to AC-10 are P1. Their failures are visible and recoverable: a leftover file the sweep removes, a stale cache, a wrong but stored color, a missing placeholder.

**Level split (no duplicate coverage):** everything the server does with bytes is proven at API, with images Pillow makes in the test. E2E covers what only a browser shows: the file input and the multipart body it produces, the placeholder, the swatch, and Remove cover's request. AC-10's data side (cleared fields, deleted file, color fallback) is an API follow-up below; its E2E leaf owns the user's journey.

---

## Story Integration Metadata

- **Story ID:** `1.13`
- **Story Key:** `1-13-add-a-cover`
- **Story File:** `_bmad-output/planning-artifacts/epics.md` (Story 1.13)
- **Story Spec:** not written yet (expected at `_bmad-output/implementation-artifacts/spec-1-13-add-a-cover.md`)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-1-13-add-a-cover.md`
- **Generated Test Files:** `backend/tests/test_cover.py`, `frontend/e2e/cover.spec.ts`

---

## Red-Phase Test Scaffolds Created

There is one skipped leaf per criterion, 11 in all. Backend leaves carry `@pytest.mark.skip(reason=RED)`, and their names carry `ac<n>_p<k>`. E2E leaves are `test.skip(...)`, and their titles carry `[P#] AC-n`. Each was un-skipped once on the current code and failed at its first assertion, as listed.

### API Tests (8 tests): `backend/tests/test_cover.py`

- `[P0] AC-2` primary: a text file sent as `cover.jpg` gives **422**. Then the exact envelope (`invalid_fields`, "Not saved. 1 field needs attention: Cover.", one `cover` field with "Cover must be an image file."), `library.json` unchanged and `covers/` empty. Then truncated PNG data and an empty file → the same message. 20 MiB + 4 bytes → 413 `cover_too_large` with "Cover must be 20 MB or smaller." A HEIC header → "Cover must be a JPEG, PNG or WebP image." With `MAX_IMAGE_PIXELS` patched to 10,000, a 120×120 image (where Pillow only warns) and a 200×200 one (where it raises) are both refused as non-images. *Red today: 200 ≠ 422 (the part is ignored).*
- `[P0] AC-3` primary: a 2400×1600 JPEG with EXIF orientation 6, sent as `photo.png`, is **stored as 800×1200**. Then 200, `coverFile` matches `covers/<book-id>-<uuid>.jpg` with the response's `bookId`, the stored file is JPEG/RGB, `covers/` holds only it, and the invariants hold. Two replacements, the second with the same bytes, give three distinct names, and only the last file remains. *Red today: no cover stored.*
- `[P0] AC-4` primary: replacing Dune's seeded cover through a recording `FileSystem` gives **exactly `new cover` → `commit` → `delete old`** among the `replace`/`remove` calls. Then 200, a new `coverFile`, and only the new file in `covers/`. *Red today: only `commit`.*
- `[P0] AC-5` primary: with a fault on the rename onto `library.json`, **exactly one cover was renamed into `covers/` and that same file was removed**. Then 503 `couldnt_save`, `library.json` byte-identical, and only the old cover left, byte-identical. *Red today: no cover written. The rest already holds without covers, so this assertion goes first.*
- `[P1] AC-6` primary: with every `remove` in `covers/` failing, **stderr has a `bookvie: …` line naming the old cover**. Then 200 `{ok: true}`, the new `coverFile`, both files on disk, and after `Store.open` only the new one. *Red today: nothing logged.*
- `[P1] AC-7` primary: `GET /media/<coverFile>` has **`immutable` in `Cache-Control`**. Then 200, `image/jpeg`, and the exact bytes. A stray unreferenced cover was swept by `Store.open` and gives 404. `/media/library.json`, a `..` path and the bare `covers/` give 404. `delete-book` leaves `covers/` empty. *Red today: 404 with no `Cache-Control`.*
- `[P1] AC-8` primary: a cover that is ⅔ white and ⅓ rgb(200, 60, 40) gives **`spineColorFromCover` within ±6 per channel of that hue with saturation capped at 0.45**, so white is ignored. Then 200, `spineColor` = from cover, curated still Sage. A grayscale cover gives `None` and `spineColor` = curated (Slate). A user `#123456` wins, and the cover color is still stored. *Red today: `None`.*
- `[P0] AC-11` primary: **`ErrorCode("cover_too_large")` exists** (TR8: every new code has an API test; its envelope is in AC-2). Then faults at `write`, `fsync` and `replace` for `add-book` and `edit-book` with a cover give 503, byte-identical `library.json`, no new or temp file, and the old cover kept. A successful replace followed by `removeCover: true` keeps `check_invariants()`. `edit-book` with a cover for a gone Book gives 409 `book_not_found` with nothing changed and no file left. *Red today: `ValueError`. The fault clauses already hold on today's cover-less path, so they become meaningful only once covers are written. That is why the new code goes first.*

### E2E Tests (3 tests): `frontend/e2e/cover.spec.ts`

- `[P0] AC-1` primary: in the New book panel, **`getByLabel('Cover', { exact: true })` is an `input` with `type="file"`**. Then, with the fields filled and `dune.png` chosen, **Add book** sends one `add-book` request whose multipart body has `name="cover"; filename="dune.png"` with the PNG bytes beside the `intent` part (title Dune), and the panel closes. *Red today: no Cover field.*
- `[P1] AC-9` primary: Book detail of a seeded Book with no cover shows **`img` "No cover" in `main`**. Then it is 200×300, has no `tabindex`, and no button or link is named "No cover". The Edit book panel has no "From cover" button. *Red today: no placeholder.*
- `[P1] AC-10` primary: after an opaque `edit-book` setup with a cover, the Edit book panel shows **Remove cover**. Then **Remove cover** → **Save changes** sends one `edit-book` with `removeCover: true` and no `cover` part. The panel closes, "No cover" shows, "Cover of Dune" is gone, and the reopened panel has neither Remove cover nor From cover. *Red today: no Remove cover.*

---

## Data Factories Created

None new. Seeded state goes through the existing `LibraryBuilder` (TC-1): `LibraryBuilder()` in pytest and `seededServer({…})` in Playwright, with explicit `id` and `cover_file`. Images are made in the test with Pillow (`_image`, `_rotated_jpeg`, `_animated_gif`, `_half_white`, `_grayscale`); the E2E file embeds one 40×60 PNG as base64 (`COVER_PNG`).

## Fixtures Created

None shared. `test_cover.py` reuses `_client`, `_library_bytes`, `_stored_books`, `VALID` and `ADD_BOOK` from `test_add_book.py`, `DUNE`, `DUNE_FORM` and `EDIT_BOOK` from `test_edit_book.py`, and `FaultyFs` from `test_store.py`. It adds three `OsFileSystem` subclasses: `RecordingFs` (records `replace` destinations and `remove` paths), `DocumentFaultFs` (fails only the rename onto `library.json`) and `CoverRemoveFaultFs` (fails every `remove` in `covers/`). It also adds `_seed_dune_with_cover`, which writes a referenced JPEG into `covers/`. The E2E file has spec-local helpers in the 1.12 style: `coverInput`, `noCover`, `coverImage`, `openEdit`, `attachCover` (an unread `page.request` multipart setup), `requestsTo`, `bodyOf` and `intentOf`.

**Seeding a cover in E2E:** `seededServer` writes only `library.json`, so AC-9's swatch branch and AC-10 attach the cover through `edit-book` and never read the response. If later stories need many covered Books, extend `seedLibrary` to copy cover files into `covers/` before the server starts. That would be the first shared fixture change.

## Mock Requirements

None. Every scaffold runs against a real server or a real `Store`. Faults go through the `FileSystem` seam (TC-3), never a route mock.

## Contract the Scaffolds Pin (names the implementation must use)

- **File part:** `add-book` and `edit-book` take an optional multipart part named `cover` beside `intent` (AD-3). Without it nothing about the cover changes.
- **Refusals:** field `cover`, label "Cover" (add `"cover": "Cover"` to `LABELS` so the summary reads "Not saved. 1 field needs attention: Cover."). 422 `invalid_fields` with "Cover must be an image file." (not decodable, truncated, empty, or over `MAX_IMAGE_PIXELS`, including where Pillow only warns) or "Cover must be a JPEG, PNG or WebP image." (a recognised format that Pillow can't open, such as HEIC). 413 `cover_too_large`, a new `ErrorCode`, with `fields` [`cover`: "Cover must be 20 MB or smaller."], where 20 MB = 20 × 1024 × 1024 bytes.
- **Stored file:** `coverFile` = `covers/<book-id>-<uuid4>.<ext>`, relative to the data folder, with `<ext>` `jpg` (JPEG, RGB) or `png` (when the image has transparency). Long edge ≤ 1200px, never upscaled.
- **Seam:** cover files are written as temp + `fs.replace` into `covers/` and deleted with `fs.remove`, all through `Store.fs`. A cleanup failure after the commit logs one `bookvie: …` line naming the file.
- **Media:** `GET /media/<coverFile>` → the file with `Cache-Control` containing `immutable` and its image content type. Unknown, unreferenced or non-`covers/` paths → 404.
- **Sweep:** `Store.open` removes files in `covers/` that no Book's `coverFile` names.
- **Remove cover:** `EditBookIntent.remove_cover: bool = False` (`removeCover`, strict boolean). It clears `coverFile` and `spineColorFromCover` and re-resolves `spineColor` (AD-11).
- **UI:** **Cover** is an `input type=file` labelled exactly "Cover", placed between Tags and Spine color (Agent Label Contract order). The cover on Book detail is an `img` named "Cover of *Title*" (src `/media/<coverFile>`). The placeholder is `role="img"` named "No cover", 200×300, not focusable. **Remove cover** is a `button` in the Edit book panel beside Cover, only when a cover exists. "From cover" is a `button` with `aria-pressed`, only when a cover exists. This needs `BookDetailView` to carry `coverFile` (or a URL) and `spineColorFromCover`.

**Assumptions for the spec to confirm:** the image names ("Cover of *Title*", "No cover") aren't in EXPERIENCE.md, which only says the placeholder "isn't interactive" and the title is given beside it. They were chosen so tests can find both by role, and they pass axe. If the spec makes the placeholder `aria-hidden`, AC-9 and AC-10 need another locator. The `coverFile` shape follows the story text literally (`covers/…` in `coverFile`).

---

## Implementation Checklist

Activate one test at a time: delete its `@pytest.mark.skip(reason=RED)` line, or change `test.skip(` to `test(`. Watch it fail, implement, then watch it pass. Backend: `cd backend && TZ=Europe/Madrid uv run pytest tests/test_cover.py -k ac2`. E2E: `npm run build && npm --prefix frontend run e2e -- e2e/cover.spec.ts -g "AC-1 "`.

### AC-2 / AC-3 the upload pipeline (do first)
- [ ] `ErrorCode.COVER_TOO_LARGE`, the three messages, `LABELS["cover"] = "Cover"`
- [ ] Count the upload while streaming and refuse past 20 MiB with 413 before reading the rest (a size-capped `UploadFile` read, or an ASGI receive wrapper on the two routes)
- [ ] A cover module (e.g. `store/covers.py` plus a pure `domain/` color function): `Image.open` + `load()` with `DecompressionBombWarning` raised as an error; HEIC/HEIF (and other recognised but unsupported signatures) → formats message; `exif_transpose`; first frame; CMYK/P/LA → RGB or RGBA; transparency → PNG, else JPEG; `thumbnail((1200, 1200))`
- [ ] `add-book` / `edit-book` routes take `cover: UploadFile | None = File(None)`; the intents take the processed bytes
- [ ] Activate AC-2, then AC-3

### AC-4 / AC-5 / AC-6 / AC-11 the AD-12 order
- [ ] Inside `Store.apply`'s lock: write the new cover (temp in `covers/` or the data folder, then `fs.replace`), then commit, then `fs.remove` every unreferenced cover. On a failed commit or a refusal raised by the change, `fs.remove` the new file. After a successful commit, log and swallow `remove` failures (still 200)
- [ ] `Store.open` sweeps unreferenced covers (beside the `.staging/` sweep)
- [ ] Activate AC-4, AC-5, AC-6, then AC-11

### AC-7 / AC-8 media and color
- [ ] `/media/covers/{name}` route: only names in `covers/` (no separators, no `..`), referenced by a Book, `Cache-Control: public, max-age=31536000, immutable`
- [ ] `delete-book` removes its cover after the commit (via the same "delete unreferenced" step)
- [ ] `spine_color_from_cover(image)`: ≈64px sample, ignore S < 0.15 or L < 0.10 or > 0.90, 24 hue bins, average of the fullest bin, cap S at 0.45, `None` when no pixel remains; set on new or replaced cover only; re-resolve `spineColor` (user, else cover, else curated)
- [ ] Activate AC-7, then AC-8

### AC-1 / AC-9 / AC-10 the client
- [ ] `api/books.ts`: send `cover` as a file part (and `removeCover`) in `useAddBook` / `useEditBook`; `BookDetailView` gains the cover fields (regenerate types, `npm run check:api`)
- [ ] `NewBookPanel.tsx`: **Cover** `input type=file` (`accept="image/jpeg,image/png,image/webp"`) between Tags and Spine color, with field errors like any other; **Remove cover** in edit mode when a cover exists; "From cover" swatch only with a cover, which empties Spine color
- [ ] `BookDetailPage.tsx`: `img` "Cover of *Title*" or the `role="img"` "No cover" placeholder, 200×300, `rounded.cover`, DESIGN.md styling
- [ ] Activate AC-1, AC-9, then AC-10

### Green-phase follow-ups (secondary branches, not separate red leaves)
- [ ] **AC-1:** in the Edit book panel, choosing a file sends `cover` in the one `edit-book` call, and Book detail then shows "Cover of Dune" with `src` under `/media/covers/`. Without a chosen file, no `cover` part is sent. The Agent Label Contract test (`new-book-panel.spec.ts` `CONTRACT_FIELDS`) gains Cover in its place
- [ ] **AC-2:** each cover message shows on **Cover** in the panel (`aria-describedby`, the `alert` summary names Cover), and a cover error lists with other field errors in form order (Tags < Cover < Spine color). The 413 is returned before the whole body is read: an ASGI-level test whose `receive` stops being drained past the cap. Boundary: exactly 20 MiB of image data is not refused for size. WebP is accepted
- [ ] **AC-3:** RGBA with partial alpha → PNG `.png`; fully opaque RGBA → JPEG; CMYK JPEG → RGB; an animated GIF keeps only frame 1 (its color); a 40×60 image is not upscaled; 3000×1000 → 1200×400; a `cover` part whose filename has `../` or no extension is still stored under a minted name
- [ ] **AC-4/5:** a refusal raised inside the commit (`duplicate_book`, `pages_below_*`, `invalid_fields` on another field) with a cover also removes the new file. A cover with invalid other fields is refused before any file is written, where cheap
- [ ] **AC-7:** a HEAD request is served too; the dev proxy (`--dev`) forwards `/media` (Vite config already proxies it; add a `dev-proxy.spec.ts` check)
- [ ] **AC-8:** replacing a cover recomputes `spineColorFromCover`; an edit without a new cover leaves it and `spineColor` untouched (AD-11); a user color stays when the cover changes. Unit tests on the pure color function (bins, neutrals, cap, the B&W case) to meet the `domain/` coverage gate
- [ ] **AC-9:** with a cover, Book detail shows "Cover of Dune" at 200×300 and no "No cover"; the panel's "From cover" with a user Spine color: pressing it empties Spine color and sets `aria-pressed="true"`; axe AA on Book detail with the placeholder and with a cover, in both themes
- [ ] **AC-10 (API):** `removeCover: true` clears `coverFile` and `spineColorFromCover`, deletes the file after the commit, and `spineColor` falls back to the user color, else curated. `removeCover` on a Book without a cover is a no-op 200. `removeCover: "true"` (a string) → 422 on `intent`. A new `cover` with `removeCover: true` in one call: decide in the spec (suggest: 422 on `intent`, or the new cover wins)

---

## Notes

- **Storage cost:** the API suite writes a few hundred KB of images per test into `tmp_path`, plus one 20 MiB body in AC-2. That keeps the suite under a second locally (the red check ran all 8 in 0.4s).
- **Pillow's bomb guard:** Pillow raises `DecompressionBombError` only above 2 × `MAX_IMAGE_PIXELS` and only warns above 1 ×. AC-2 says "over MAX_IMAGE_PIXELS", so the scaffold tests both sides. The implementation must turn the warning into a refusal (`warnings.catch_warnings()` + `simplefilter("error", Image.DecompressionBombWarning)`).
- **Story 1.12 follow-through:** 1.12 left cover deletion to this story (`delete_book.py` docstring). AC-7's leaf checks it.

## Validation (step 5)

- Prerequisites: story criteria clear; Playwright and pytest configured; dev environment ran both suites.
- 11 criteria and 11 leaves: every leaf title carries exactly one declared `AC-n`, and every criterion has exactly one leaf.
- Every leaf is skipped (`8 skipped` in pytest, `3 skipped` in Playwright). Un-skipped on today's code, each fails at its first assertion, the criterion-defining one, as listed above. No placeholder assertions.
- Unimplemented setup stays opaque: `attachCover` never reads its response; the API leaves read state only after the call under test.
- State transitions (replace, remove, fault, delete) are exercised in their primary leaf.
- `ruff check` and `ruff format --check` pass on `test_cover.py`; `oxlint` and `tsc -b` pass on `cover.spec.ts`. No browser or CLI sessions left open; temp red-check copies were deleted.
