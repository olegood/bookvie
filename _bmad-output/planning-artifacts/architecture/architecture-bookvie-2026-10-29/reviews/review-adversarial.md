---
type: architecture-review
lens: adversarial (compliant-but-incompatible unit pairs)
target: ../ARCHITECTURE-SPINE.md
against: ../../../prds/prd-bookvie-2026-10-28/prd.md (+ UX EXPERIENCE.md where the PRD defers to it)
created: '2026-10-29'
---

# Adversarial review: bookvie architecture spine

## Verdict

The paradigm is sound: one process, one document, intents, server views. But the spine fixes *where* code lives and *how* it commits, not *what the document looks like* or *which state is stored and which is derived*. Two agents can each follow every AD exactly and still ship units that corrupt each other's data. The worst gaps are the Reading lifecycle (how "current", "paused" and "active" are represented), stale confirmations across browsers, and restore and cover writes that sit outside the atomicity the spine promises.

Method: each hole names two units built independently one level down (epics or stories), shows that both comply with the spine as written, and gives the concrete clash plus a rule of one or two sentences that closes it. Holes are ranked by severity: **Critical** means silent data corruption or loss, **High** means user-visible wrong behavior or a broken flow, **Medium** means divergence a test would catch late, and **Low** means friction.

---

## H1. Reading status and "current Reading" are under-specified [Critical]

**Spine text:** "A Reading's status (active, paused or finished) is derived from its dates and from whether it is the Main book's current Reading." The root holds `mainBookId`, a *Book* pointer. Nothing defines "the Main book's current Reading", how many unfinished Readings a Book may have, or what `pausedAt` means once a Reading is resumed.

**Unit A: Epic "Main book & pausing" (`start_reading`, `pause`).** It stores `pausedAt` on pause and leaves it set on resume, keeping it as history ("last paused"). It treats active as "unfinished, and its Book is `mainBookId`".

**Unit B: Epic "Home & Waiting for you" (`views/home`, library pace scope).** It derives paused as `finishDate == null && pausedAt != null`. That is reasonable, because the spine says status is derived "from its dates".

**Clash:** After a pause and a resume, the Main book's Reading still has `pausedAt`. Unit B lists the Main book in Waiting for you, counts it in "(N)", and gives it the sand marker. The pairing also fails the other way. A third story, "Resume from Waiting", is written as a separate `resume-reading` intent, while the Start dialog story calls `start-reading`. For a Book that has a finished Reading and a paused re-read, `start-reading` follows FR-5 ("starting a finished Book creates a new Reading") and creates a *second* unfinished Reading. Every "current Reading" lookup (`readings[-1]`, first unfinished, max `startDate`) now returns a different answer.

**Rule (tighten AD-11 or add AD-18):** A Book has at most one unfinished Reading (`finishDate == null`), and it *is* that Book's current Reading. It is active if and only if `book.id == mainBookId`, and paused otherwise. `pausedAt` is a timestamp set by every pause and ignored while the Reading is active. One `start-reading` intent, keyed by `bookId`, resumes the current Reading when one exists and otherwise creates a new one. Status, "Waiting for you" membership and the pace scopes come only from `domain.reading_status()`.

## H2. Confirmations are computed on one state and applied to another [Critical]

**Spine text:** AD-3 says "last write wins means the last *intent* wins". AD-7 refetches on focus. Intents carry only their target (`bookId`).

**Unit A: Start dialog (frontend).** It renders "This pauses *Y* at p.120 (64%). *Z* moves to Waiting for you." from the `home` view it last fetched. The client is allowed to "format copy", and whether Z has a paused Reading is a field already in the view.

**Unit B: `start_reading` intent.** It applies FR-5 to whatever the server state is when the request arrives.

**Clash:** The agent's browser, or the user's second tab, changes Main or Up next between the render and the confirm. The user confirmed "pauses *Y*", but the server pauses *W* and evicts some other Up next that the user never saw. That breaks the PRD's core promise: "every switch is a deliberate, visible trade-off". The same thing happens with Pause's displacement confirm, Delete book ("It is your Main book."), and Restore. Each unit is compliant. Their combination silently overrides a confirmation.

**Rule (extend AD-3):** The document carries a monotonically increasing `revision`. Every view returns it, and every intent with a confirmation sends `expectedRevision`. The server refuses with `state_changed` when it differs, and the client refetches and shows the dialog again. Trade-off lines come from a server-computed `consequences` list (AD-6) and are never inferred in the client.

## H3. Restore and export run outside the write lock and swap in two steps [Critical]

**Spine text:** AD-4 puts a lock around intents. AD-14 puts restore in `store/restore`, which is not an intent: "replaces the covers folder and the document, document last". AD-14 also says "a failure before the swap leaves current data untouched", which says nothing about a failure *during* the swap.

**Unit A: Backup epic (`store/restore`).** It validates the archive in staging, renames `covers/` aside, moves the staged covers in, then writes `library.json` with AD-2. It reloads in-memory state afterwards. It doesn't take the intent lock, because AD-4 says the lock covers intents.

**Unit B: Cataloging and intents.** These are compliant with AD-4: load the in-memory state, apply, and write.

**Clash:** (1) An `add-book` from the agent's browser that runs during the restore reads the *pre-restore* in-memory state and writes it back over the restored document, so the restore is lost. Or it gets written into the old document and vanishes. (2) If the document write fails after covers were swapped, the old document now points at the archive's covers. The AD-12 startup sweep then deletes every cover the old document still referenced. (3) Export zips `covers/` while an intent's cover replace is mid-flight and produces an archive that fails its own restore validation ("every referenced cover present").

**Rule (tighten AD-4 and AD-14):** Export and restore run under the AD-4 lock, and restore replaces in-memory state inside the same critical section. Restore stages covers *additively* under their archive filenames (see H4), commits the document, and only then deletes covers the new document doesn't reference. A failure at any step therefore leaves a document whose every cover exists.

## H4. A deterministic cover filename makes "files before document" destructive, and new Books have no ID to upload against [High]

**Spine text:** AD-12 says covers are stored as `covers/<book-id>.<ext>` and "written with temp + rename before the document commit". The Capability map puts FR-21 in `store/covers`, with no cover intent. IDs are server-minted, and "the client never mints IDs".

**Unit A: `edit_book` with cover replace.** It writes the new JPEG to `covers/<id>.jpg` (renamed over the old file), then commits.

**Unit B: The same intent's commit fails (`couldnt_save`).**

**Clash:** The old document now references a file that already holds the *new* image, so "Your data wasn't changed" is false. Even when the commit succeeds, the URL hasn't changed, and the browser keeps showing the cached old cover after the AD-7 refetch. Separately, the New book panel story can't upload a cover before `add-book` returns an ID. So one developer makes `add-book` multipart, another adds a `set-cover` call after `add-book`, and the second is the "one action split across calls that can half-fail" that AD-3 forbids.

**Rule (amend AD-12):** Each upload gets a unique, server-minted filename (`covers/<book-id>-<uuid>.<ext>`), and the Book stores that filename. Upload is a staging endpoint (`POST /api/uploads/cover` → `uploadId`), and `add-book` and `edit-book` carry `coverUploadId`. The intent moves the staged file in under the lock, before it commits.

## H5. The shape of `library.json` is left to whoever writes the first model [High]

**Spine text:** The ER diagram shows `BOOK ||--o{ READING` and `BOOK ||--o{ CARD_NOTE`. "Exact field shapes are owned by the Pydantic models once written." JSON is camelCase "via the Pydantic alias generator". AD-14 requires byte-identical round trips.

**Unit A: Card notes epic.** It stores `library.cardNotes[]` with `bookId`, which suits the cross-Book search view. It stores ranges as text: `"page": "42–45"`.

**Unit B: Catalog epic (`delete_book`, `edit_book`).** It deletes `book.readings` and `book.cardNotes` (nested, as the ER diagram suggests) and checks "Pages below the highest Card note page" against `book.cardNotes[*].pageEnd`.

**Clash:** Deleting a Book orphans its Card notes, and the Pages-below-notes refusal never fires. Serialization diverges too. One `store.save` calls `model_dump_json(by_alias=True)`, and restore re-serializes with a bare `model_dump_json()`, which writes snake_case and drops or keeps `None` differently. The loader accepts both because of `populate_by_name`, so the files drift and the byte-identical test fails or passes depending on the path taken.

**Rule (new AD):** `library.json` has the canonical shape `{schemaVersion, revision, mainBookId, upNextBookId, sideReadBookIds[], books[{…, readings[], cardNotes[{pageStart, pageEnd|null, …}]}]}`, with children nested under their Book so deletes cascade structurally. Exactly one function, `store.serialize()` (by_alias, explicit nulls, fixed key order, UTF-8, trailing newline), produces those bytes, and every write path uses it.

## H6. Reaching the last page: auto-finish or dialog? [High]

**Spine text:** AD-3 says an intent "applies every consequence". FR-14 says: "When the current page reaches the Book's last page… the Reading gets a finish date." FR-10 says: "Entering the last page opens the finish flow; if the user cancels it, the Reading stays active."

**Unit A: `update_page` intent.** It reads FR-14 as a consequence, so it sets `finishDate = today` when `page == pages`, clears `mainBookId`, and commits once, as AD-3 asks.

**Unit B: Main book card.** It sends `update-page` and then opens the Finish dialog, which calls `finish-reading` with Purpose fulfilled, stars and **Finished on**.

**Clash:** Either `finish-reading` is refused because the Reading is already finished, or a second compliant implementation creates a back-filled Reading ("Marking a Book with no Reading finished…"). Cancel can't keep the Reading active. Stars, Purpose and a past **Finished on** are lost. The finish moment either doesn't play or plays twice.

**Rule (add to AD-3):** `update-page` never finishes a Reading. Only `finish-reading` sets `finishDate`. `update-page` returns `reachedLastPage: true` so the client can open the Finish dialog. The same applies to `start-reading` with "Which page?" equal to the last page.

## H7. Root-pointer invariants are enforced by no one in particular [High]

**Spine text:** "At most one" is enforced structurally by root fields. Nothing states the cross-field invariants.

**Unit A: `set_up_next`.** It refuses when the target is Main, which matches the UX rule ("not Main").

**Unit B: `start_reading`.** It takes the Up next Book as Main but forgets to clear `upNextBookId`, because the PRD only describes displacing *another* Up next. Meanwhile `delete_book` clears `mainBookId` and `upNextBookId` but not `sideReadBookIds`, and `finish_reading` on a non-Main Book clears Up next but leaves it in Side reads.

**Clash:** The same Book is Main and Up next, so Home renders it twice and the marker priority breaks. A dangling Side read ID makes `views/home` crash with a KeyError. No single intent is wrong by its own story's acceptance criteria.

**Rule (new AD):** `domain.check_invariants(library)` runs after every intent and every migration, before commit. It enforces these:
- `mainBookId != upNextBookId`.
- `mainBookId ∉ sideReadBookIds`.
- `len(sideReadBookIds) <= 3`.
- Every pointer resolves to an existing Book.
- A Book has at most one unfinished Reading.
- `0 <= currentPage <= pages`.
- Card note pages are within `pages`.

A violation is a bug and aborts with `couldnt_save`. It is never written.

## H8. Validation errors escape the envelope [High]

**Spine text:** AD-9 defines one envelope. AD-8 says Pydantic defines every intent body.

**Unit A: `add_book` body.** It uses `title: str = Field(min_length=1)` and `pages: PositiveInt`, so FastAPI rejects the request before the handler runs and returns its default `422 {"detail":[…]}`.

**Unit B: New book panel and the agent skill.** These parse `error.kind`, `error.field` and `error.message` into the live region that FR-2 requires for unattended cataloging.

**Clash:** Missing-field failures, the most common case in UJ-1, produce no announced outcome, so the agent stalls.

**Rule (amend AD-9):** A global `RequestValidationError` handler maps every body-validation failure to `{kind: "refusal", code: "invalid_field", field, message}` with user copy, so no endpoint ever returns FastAPI's default error shape.

## H9. "Refetch the views it affects" has no owner [Medium]

**Spine text:** AD-7 says to refetch "the views it affects".

**Unit A: Home page story.** After `update-page` it invalidates `home`.

**Unit B: Catalog and Stats stories.** These assume the intent author invalidates `catalog` (library pace scope, Main spine fill, meter) and `stats`. After `finish-reading` from Book detail, the catalog shows the old spine and meter until the window loses focus.

**Rule (amend AD-7):** After any intent response, the client invalidates *all* views. That is cheap for one user, needs no per-intent dependency map, and no unit may narrow it.

## H10. "Today", date/timestamp choice and tie order [Medium]

**Spine text:** Dates are local `YYYY-MM-DD`, server and browser are on the same machine, and the client formats relative dates.

**Unit A: Finish dialog.** It pre-fills `new Date()` in browser local time. **Unit B: `finish_reading`.** It validates "not in the future" against `date.today()` in a server process whose timezone was fixed at startup. After the user travels or changes timezone, or with the tab open across midnight before a focus event, a legitimate "today" is refused, or a future date is accepted. Separately, one developer stores `pausedAt` as a date (the PRD says "paused-at date") and another as a timestamp, so the Waiting for you order is unstable for two pauses on the same day. A third uses `lastProgressAt` as a date and loses "today vs yesterday" accuracy in other timezones.

**Rule (extend Conventions › Dates):** The server is the only source of "today". Every view returns `today` (server local date at request time), and the client pre-fills and computes "N days ago" from it. `pausedAt`, `lastProgressAt` and `createdAt` are ISO timestamps with an offset. `startDate` and `finishDate` are local dates. Lists ordered by a date break ties by the timestamp, then by `id`.

## H11. Back-filled Readings have two creators and an ambiguous "most recent" [Medium]

**Spine text:** AD-11 says "A back-filled Reading has `startDate: null`." FR-1 (add or edit **Finished on**) and FR-14 (Mark finished with no Reading) both create one.

**Unit A: `edit_book`.** It sets **Finished on** by mutating `readings[-1].finishDate` ("most recent" means last appended).

**Unit B: `finish_reading`.** It appends Readings in action order, so a back-fill dated 2019 that was added after a 2025 re-read becomes `readings[-1]`. Edit Book now shows 2019 as "most recent", and changing it moves the wrong Reading. Unit A may also not store `pagesAtFinish` for the back-fill, which AD-11 requires only for "a finished Reading".

**Rule (amend AD-11):** Back-filled Readings are created only through `domain.backfill_reading(book, date)`, which stores `pagesAtFinish = book.pages`. "Most recent finish" means the finished Reading with the greatest `(finishDate, finishedAt timestamp)`, never array position. Editing it may not move it before its own `startDate`.

## H12. Migration numbering and additive fields [Medium]

**Spine text:** AD-13 defines one ordered chain. The "Deferred" section says each later feature adds fields "under a new `schemaVersion` plus a migration".

**Unit A: Side reads (Should).** It adds `sideReadBookIds` with a Pydantic default and no version bump ("it's optional"). **Unit B: Card note extras.** It adds `migrations/v2.py` in parallel. A third branch adds its own `v2.py`. A build that predates Side reads loads a file that has `sideReadBookIds`, Pydantic ignores the extra key, and the next intent rewrites the file *without it*, silently deleting data.

**Rule (amend AD-13):** Store models use `extra="forbid"`, and any change to the persisted shape bumps `schemaVersion` with a migration. Versions are contiguous integers, a test enforces that, and they are assigned at merge time. Version 1 freezes at the first release that writes real user data.

## H13. Spine color: what is "resolved", and does a new cover change it? [Low]

**Spine text:** AD-11 says a Book stores "its resolved spine color and its curated palette color", and the derived color is stored at upload. The PRD says an empty spine color means "automatic: derived from the cover, else palette".

**Unit A: Cover upload.** It recomputes `resolvedColor` from the new cover. **Unit B: Change color / Catalog view.** It treats `resolvedColor` as frozen ("stats or spine colors don't change when the cover is edited") and resolves it as `userColor ?? resolvedColor`. Clearing the user color then shows a stale derived color, or a new cover recolors a read spine in one view and not in another.

**Rule (amend AD-11):** Store `userSpineColor | null`, `coverColor | null` (replaced on each cover upload) and `paletteColor` (set at creation), and resolve them only in `domain.spine_color()`. Either store no separate "resolved" field, or state explicitly that a cover change recolors automatic spines.

## H14. "Which page?" for a Side read [Low]

**Unit A: Waiting for you "Resume".** It sends `start-reading {bookId}`. **Unit B: `start_reading`.** It requires `startPage` for Side reads (FR-8 says "by any route"). A paused Book that is also a Side read gets resumed from Waiting for you without the prompt, or Unit B refuses with a code that Unit A doesn't handle.

**Rule:** `start-reading` takes `startPage`, which is required when the Book is in `sideReadBookIds` (refusal `start_page_required`) and ignored otherwise. Every Start dialog variant comes from one shared component.

## H15. Export recording "Last export" [Low]

**Unit A: Export endpoint.** It writes `local-state.json` when the zip is built. **Unit B: Backup page.** It calls a separate "mark exported" endpoint after the download starts. Two writers then exist for one field, and AD-3 says nothing about mutations that aren't intents.

**Rule:** The export response writes `lastExportAt` once the archive has been fully built and streamed, under the AD-4 lock, and that is the only writer of `local-state.json`.

---

## Summary table

| # | Severity | Area | Closing rule (short) |
| --- | --- | --- | --- |
| H1 | Critical | Reading lifecycle | One unfinished Reading per Book; active iff its Book is Main; one `start-reading` resumes or creates |
| H2 | Critical | Stale confirmations | `revision` plus `expectedRevision`; server-computed consequences |
| H3 | Critical | Restore and export | Under the lock; additive covers, document commit, then sweep |
| H4 | High | Covers | Unique filename per upload; staged `coverUploadId` |
| H5 | High | Document shape | Canonical nested shape; single `store.serialize()` |
| H6 | High | Last page | Only `finish-reading` finishes; `reachedLastPage` flag |
| H7 | High | Root pointers | `check_invariants()` before every commit |
| H8 | High | Error envelope | Global validation-error handler to `invalid_field` |
| H9 | Medium | Refetch | Invalidate all views after every intent |
| H10 | Medium | Time | Server `today` in views; timestamps vs dates; tie-break |
| H11 | Medium | Back-fill | One creator; "most recent" by finishDate |
| H12 | Medium | Migrations | `extra="forbid"`; every shape change bumps the version |
| H13 | Low | Spine color | Store inputs, resolve in one function |
| H14 | Low | Side read start | `startPage` required iff Side read |
| H15 | Low | Last export | Single writer, under the lock |
