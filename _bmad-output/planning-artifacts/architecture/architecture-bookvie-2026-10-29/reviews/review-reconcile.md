---
review: reconcile
target: ../ARCHITECTURE-SPINE.md
inputs:
  - prds/prd-bookvie-2026-10-28/prd.md
  - prds/prd-bookvie-2026-10-28/addendum.md
  - ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md
  - ux-designs/ux-bookvie-2026-10-28/prd-deltas.md (A1–A6)
  - ux-designs/ux-bookvie-2026-10-28/DESIGN.md (spine colors, stored values only)
date: 2026-10-29
---

# Reconcile review: architecture spine vs PRD, addendum, UX

## Verdict

A1–A6 are all honored in substance, and the paradigm (server-owned domain, intents, computed views, atomic single-document store) fits the inputs well. Four places will make independently built units diverge or weaken data safety: the error envelope can't express multi-field validation (and FastAPI's default 422 bypasses it), cover file naming and the restore swap aren't crash-safe, the Book/Reading stored fields the PRD requires are only partly fixed, and AD-6 assigns layout-dependent and locale-collated work to the server that the UX defines on the client. None of these needs a paradigm change. Each is a one-rule fix.

Ordering: highest severity first. Each finding gives the type: (a) contradiction, (b) missing architectural requirement, (c) silence that lets builders diverge.

---

## F1. Error envelope can't carry form validation; FastAPI's default 422 bypasses it. HIGH (a, c)

**Spine:** AD-9 (single `field?`), AD-3, AD-8.
**Inputs:** EXPERIENCE → State Patterns → Validation error ("`alert`: Not saved. 2 fields need attention: Pages, Language.", each invalid field gets `aria-invalid` and its own message). Agent Label Contract → validation table and outcome signals. FR-1 "refuses to save while any required field is empty". FR-2 "every outcome … exposed".

**Problem:**
1. The envelope has one `field`, but the New book panel has to report every failing field at once. The Agent Label Contract depends on that ("1 field needs attention: Pages").
2. AD-3 says domain rules live only on the server. Builders will diverge: one validates required fields in the client (which duplicates rules and breaks AD-3), the other relies on the server and can only surface one field.
3. Pydantic intent bodies with required fields make FastAPI return its own `422 {"detail":[…]}` before the handler runs, so this path never produces the AD-9 shape. The client's error parser then sees two shapes.

**Fix:** Change AD-9 to `{ error: { kind, code, message, fields?: [{ field, code, message }] } }`, where `kind: "refusal"` covers validation. Add a rule that the app installs a `RequestValidationError` handler mapping to this envelope, and that intent bodies accept form input loosely (strings or optional values) so the domain produces the per-field refusals with the UX copy. Also state the split explicitly: the client may do only presentational pre-checks (none required), and the server is authoritative for every validation message in the Agent Label Contract table.

## F2. Cover file naming and the restore swap aren't crash-safe. HIGH (a, b — Data-safety NFR, A3)

**Spine:** AD-12 (`covers/<book-id>.<ext>`, "written … before the document commit"), AD-14 ("replaces the covers folder and the document, document last").
**Inputs:** NFR Data safety ("Your data wasn't changed"), A3 (no partial writes), A6 (restore validates before replacing anything).

**Problem:**
1. Replacing a cover with one of the same extension writes the new file onto the path the committed document already references. If the document commit then fails, the UI says "Your data wasn't changed" but the old cover is gone. This contradicts AD-12's own "removed only after commit".
2. Restore replaces the covers folder before writing the document. A crash or failure between the two leaves the old `library.json` pointing at a covers folder from the export. Old covers are missing, and startup GC then deletes nothing useful. "A failure before the swap leaves current data untouched" is true, but a failure *during* the two-step swap is not covered.

**Fix:** Make cover filenames immutable and unique per upload, e.g. `covers/<book-id>-<content-hash>.<ext>`, with the document storing the filename. That gives one protocol for every write: add new files, commit the document atomically (AD-2), then delete unreferenced files. Restore uses the same protocol: copy the staged covers in alongside the existing ones (no name clashes), commit the document last, then GC. The document rename stays the single commit point. Byte-identical round trip (AD-14) still holds because filenames travel inside the zip.

## F3. Stored fields the PRD requires aren't fixed, and Reading status derivation is underspecified. HIGH (b, c)

**Spine:** AD-11, the ER diagram and the "A Reading's status … is derived" paragraph, AD-14.
**Inputs:** PRD §3 Reading ("current page, Purpose, start and finish dates, star rating, the time of its last progress update, and, once paused, the date it was paused"). FR-6 (every pause records paused-at). FR-7 (Waiting order by paused-at). FR-10 (page save records last progress update). FR-22 (export includes last progress update and paused-at). FR-20 (sort by Date added). FR-1 (Ownership = owned by default). EXPERIENCE → Re-entry line ("Last updated" is set by every page save, by starting, and by resuming). Spine popover ("Color: Teal, from cover" / "Color: Sage" / "Color: set by you"). DESIGN.md → Spine colors (user-set wins *and stays when the cover changes*; cover color is recomputed when a cover is replaced; a black-and-white cover falls back to curated).

**Problem:** The intents unit writes these fields and the views and export units read them. The spine fixes only spine color, curated color, finish date and finished page count, so the following are left open:
- `lastProgressUpdate` (timestamp with offset) and `pausedAt` (local date) are absent. Builders may store `pausedAt` as a timestamp or clear it on resume, and they may update `lastProgressUpdate` only on page saves, not on start or resume. The Waiting order and "Last updated" would then differ.
- AD-11 says "stores its resolved spine color". With only the resolved value, replacing a cover can't tell whether to recolor (user-set must stay), the popover can't show the source, and "From cover" can't show the derived dot. Two builders will model this differently.
- `dateAdded` (Date added sort, List view) and `ownership` are not named as stored.
- Status derivation needs an invariant that the spine doesn't state: **at most one unfinished Reading per Book**. A Book can hold finished Readings plus one current one (FR-1 Finished on, FR-5 re-read). Without it, "the Main book's current Reading" and "paused" are ambiguous. It also isn't stated that "paused" means unfinished and not Main's current Reading, so every Main → not-Main transition must set `pausedAt`.

**Fix:** Add a short "Stored fields" rule to AD-11 (shapes, not a full schema):
- Book: `createdAt` (timestamp), `ownership` (`"owned"`), `spineColorUser: hex|null`, `spineColorCover: hex|null` (recomputed on cover add or replace, null for no cover or a B&W cover), `spineColorCurated: hex` (assigned at creation). The resolved color = user ?? cover ?? curated, a pure precedence function in `domain/`. Alternatively store `resolved` + `source`, but pick one.
- Reading: `startDate: date|null`, `finishDate: date|null`, `currentPage`, `finishedPages|null`, `purpose|null`, `purposeFulfilled|null`, `rating|null`, `lastProgressUpdate: timestamp`, `pausedAt: date|null` (overwritten on every pause, kept on resume).
- Invariants: at most one unfinished Reading per Book. "Active" = the Main book's unfinished Reading. "Paused" = any other unfinished Reading. `lastProgressUpdate` is set by update-page, start and resume.
- AD-14 / FR-22: state that the export carries every stored field, which follows from the zip being the store.

## F4. AD-6 gives the server work that the UX defines as layout- or locale-dependent; filter chips are unassigned. MEDIUM-HIGH (a, c)

**Spine:** AD-6 ("bookcase order … from a server view"; client may only (a) format, (b) text-filter, (c) pace arithmetic). Capability map row FR-4/FR-20/FR-24.
**Inputs:** EXPERIENCE → Sort select (Author sort uses locale-aware collation via `Intl.Collator`). Bookcase → Home slice ("Up to 3 shelf rows … the row holding the Main book … rows with the most recent finishes … recomputes when the window is resized"). Filter chips (OR within a group, AND across groups and with Search; values that exist in the library; not remembered). Sort stored per browser (AD-15).

**Problem:**
- Shelf rows depend on viewport width and spine sizes, so the server can't pick "the row holding the Main book". One builder will make the server return slice rows for an assumed width. Another will compute them client-side, which AD-6 forbids.
- Python's default string sort doesn't match `Intl.Collator`. Without ICU, server ordering will differ from the UX rule, and builders will "fix" this by re-sorting client-side.
- Filter chips aren't covered by AD-6's allowed client operations, so it's unclear whether `views/catalog` takes filter parameters or the client filters.

**Fix:** Amend AD-6. The server supplies the **canonical order** for the requested sort (a param, since sort is a per-browser preference) plus per-Book facts: status, marker, `fill%`, `lastFinishDate`, isMain/isUpNext, type, language and tags. The client may additionally (d) pack spines into rows and choose the Home slice rows from those facts, and (e) apply filter chips to a fetched view. For collation, either (1) let the client sort with `Intl.Collator` from server-provided keys and drop "ordering" from AD-6's server list, or (2) keep server ordering with a declared collation (e.g. `casefold()` + NFKD, accent-insensitive) and note the deviation from the UX `Intl.Collator` wording. Pick one.

## F5. Cover upload transport isn't specified, so "one action = one intent" is at risk. MEDIUM (c)

**Spine:** AD-3 (one action = one intent, no split calls), AD-8 (JSON contract via OpenAPI), AD-12.
**Inputs:** Agent Label Contract (Cover is a file input on the same form as Add book, and the agent confirms by one save). FR-1. A3.

**Problem:** `add-book` with a cover is one user action, but the spine's intents are implicitly JSON. Builders will diverge between (i) a multipart `add-book`, (ii) a separate upload endpoint followed by the intent (two calls that can half-fail, against AD-3 and A3), and (iii) base64 in JSON. Each affects the generated TS client (openapi-typescript handles multipart awkwardly) and the "files before document" ordering.

**Fix:** State one transport. Two options: `add-book`, `edit-book` and `set-cover` are `multipart/form-data` with an `intent` JSON part plus an optional `cover` file part, with the fetch wrapper hand-written for these three. Or the client uploads to `/api/uploads`, which writes only into a staging area (not domain data, expires), and the intent references the upload token, so the intent is still the single commit.

## F6. Restore and export aren't under the write lock, and success responses are unspecified. MEDIUM (c)

**Spine:** AD-4 (lock covers intents), AD-14, AD-7 (refetch after every intent).
**Inputs:** EXPERIENCE → Backup page ("Last export" is set only once the file has been built and handed over). Focus after close (Added: focus goes to the new spine, "its row is in the page before focus moves"). Agent Label Contract (status "Added *Title*." is the signal the skill reads). Finish moment ("never replays, not on reload, not on revisit").

**Problem:**
- Restore is a store operation, not an intent. Without the AD-4 lock, an intent arriving mid-restore can commit against the old state and overwrite the restored document. Export must also read the document and covers as one consistent snapshot.
- The intent success body is unspecified. The client needs the created Book's id to scroll to and focus the new spine, and it needs to know which Reading was finished to play the finish moment once. If builders instead detect "newly finished" by diffing refetched views, the fill would replay in other tabs or on focus refetch (AD-7), which contradicts "never replays".
- The order "refetch, then announce" matters for the unattended skill. If `status` reads "Added *Title*." before the refetched catalog has rendered, the skill's Search-titles check can race.

**Fix:** Extend AD-4: export and restore take the same lock, and restore's swap is a single locked operation. Add a line to AD-9/AD-7: a successful intent returns `{ ok: true, ids?: { bookId?, readingId?, cardNoteId? } }`. The client sets success live-region text only after the affected views have refetched and rendered. The finish moment is triggered only by the `finish-reading` response in the tab that sent it, never from view diffs. Export records `lastExport` in `local-state.json` once the zip has been fully streamed.

---

## Lower-severity notes

- **L1. Dev-mode Host/Origin guard (AD-16).** With the Vite proxy on :5173, the browser's `Origin` is `localhost:5173`, so a strict guard rejects every dev request. Fix: in `--dev` the allow-list includes the Vite origin, or the proxy rewrites `Origin` (`changeOrigin`). State which.
- **L2. Stale confirmations across tabs (A2 vs FR-5).** A Start dialog says "This pauses *Y*", but another tab may have changed the Main book meanwhile, so confirming pauses a different Book than the copy promised. A2 accepts last-write-wins, so this is optional. A cheap guard: `start-reading` and `pause` carry `expectedMainBookId` / `expectedUpNextBookId`, and the server refuses with `state_changed` ("This changed in another window. Nothing was changed.") so the client refetches. Recommended because FR-5's rule is that every trade-off is visible.
- **L3. Dates (Conventions).** The convention is right, but two consequences aren't written down. "Not in the future" and "today" defaults are evaluated with the server's local date. Measured pace counts inclusive days between local `startDate` and `finishDate` (a same-day start and finish = 1). `startDate` must be a local date, not a timestamp. One line in Conventions closes this.
- **L4. Stats range ownership.** `views/stats` should take `from`/`to` local dates (the client resolves the This month / This year / Last year presets from its local today), plus an `allTime` flag resolved on the server to the earliest finish, back-fills included. Bars should be computed on the server (months, or years above 24 months), counting with `finishedPages`. This is implied by AD-6 and worth one line so the client doesn't bucket.
- **L5. AD-6(b) cites "the case-insensitive match the PRD defines".** The PRD defines only "ignores case" (FR-19, Search titles). The FR-3 normalization is for duplicates. Name the rule (e.g. `toLocaleLowerCase` substring, whitespace not collapsed) so Search titles and Search card notes behave the same, and keep it distinct from `domain/` duplicate normalization.
- **L6. UI preferences "per browser" vs "remembered on this computer".** AD-15 puts them in `localStorage`, so the agent's browser and the user's have separate preferences. That's acceptable and arguably desirable, but it's a deliberate reading of "on this computer". Note it in AD-15 so nobody moves preferences into `local-state.json`.
- **L7. Tone ownership.** AD-9 makes the server author refusal `message` copy. The rules "Couldn't save…", "Couldn't export…" and the restore refusal copy ("This file isn't a bookvie export…", "newer version…") should be listed as either server-supplied (refusal codes `restore_invalid`, `restore_newer_version`) or client-fixed, so the copy isn't written twice.

## Checked and consistent (no action)

- A1 shared storage: AD-1, AD-5, AD-16. A2: AD-3, AD-7 ("last intent wins"; refetch on focus also covers the EXPERIENCE rule to "recompute relative times on focus/visible"). A3: AD-2, AD-7, AD-9. A4: AD-11, partly; see F3. A5: AD-12. A6: AD-13, AD-14, AD-15.
- Local-first and no network: Logging convention. DESIGN uses system font stacks, so nothing loads from outside.
- Agent Label Contract as the public interface: AD-17.
- Duplicate detection on the server, with the confirm flag: AD-10 matches FR-3 and the edit-only-when-changed rule.
- Export = the store packaged, versioned, migrated on restore, newer versions refused: AD-13, AD-14 match the addendum's "same format as internal storage".
- No optimistic UI and the couldn't-save copy: AD-7 matches the State Patterns.
