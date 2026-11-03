# Epic 2 Context: Keep the library safe

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Make the user's library survive a dead disk or a new laptop. One click exports all data to a single file, the Backup page shows "Last export: N days ago", and restoring that file on a fresh install reproduces the library byte for byte. Damaged, hostile or newer files are refused before anything changes. Export packages the data folder as a whole, so data added by later epics is covered with no changes here. Done means: a byte-identical export/restore round trip, green tests for every refusal and fault, and the standard per-epic quality gates. These tests retire the risks of a restore that half-applies and of hostile archives.

## Stories

- Story 2.1: Export all data with one click
- Story 2.2: Restore my library from an export
- Story 2.3: Refuse damaged, hostile or newer files

## Requirements & Constraints

- **Export contents:** Books (including spine colors), Readings (finish dates, back-filled Readings, last progress update, paused-at date), Card notes, covers, and any data later features add. One file.
- **Last export** is informational only, never a warning. It reads the same in every browser on the machine.
- **Restore** replaces all current data only after an explicit confirmation. It is the only way to import data. Export followed by restore at the same schema version gives a byte-identical `library.json` and byte-identical covers.
- **Data safety:** nothing is ever deleted silently. A refused or failed restore leaves `library.json` and `covers/` byte-identical to before. A failed save is never silent ("Couldn't save. Your data wasn't changed.").
- **Tone:** no red, no icons, no exclamation marks. Failure copy is one plain ink line.
- **Quality gates:** P0 100%, P1 at least 95%, an API test for every error code, `check:api` clean, coverage of at least 90% on `domain/` and at least 80% on `intents/` and `store/`. Tests must never touch `~/bookvie-data`.
- **Standard intent ACs apply to `restore`:** a fault injected at write, fsync or rename gives 503 `couldnt_save` with the data unchanged, and `check_invariants()` holds after every success.

## Technical Decisions

- **Routes:** export is `GET /api/export`, implemented in `intents/export` but not under `/api/intents/`. Restore is a normal intent, `POST /api/intents/restore`, sent as one multipart call: the JSON `intent` part plus the file part.
- **Locking:** export and restore hold the same in-process lock as every intent. Export builds the zip into a spooled temp file under the lock (in memory up to about 10 MB, then on disk), releases the lock, then sends the file.
- **Export format:** a `.zip` that holds exactly `library.json` and `covers/`, and nothing else. `covers/` is always present as a directory entry, even when empty. The download is named `bookvie-export-<YYYY-MM-DD>.zip`.
- **Export failure:** any read failure happens before a response header is sent. It returns 503 with kind and code `couldnt_export`, and nothing is sent.
- **Last export storage:** the timestamp lives in `local-state.json` in the data folder. It is never exported and restore never touches it. It is recorded only after the last byte is sent with no client disconnect, so a HEAD request or an aborted download records nothing. UI preferences (theme, Catalog view, sort) stay in browser `localStorage`, and restore leaves them alone too.
- **Restore pipeline:**
  1. Empty `.staging/`.
  2. Unpack into `.staging/`. Accept only `library.json` and `covers/<name>`. A missing `covers/` counts as empty.
  3. Validate the whole archive before replacing anything: schema, migrations, document invariants, and every referenced cover present and decodable.
  4. Apply in the cover order: copy the archive's covers in, commit the document atomically (temp file, fsync, rename), then delete covers the new document doesn't reference.
- **Restore cleanup:** `.staging/` is emptied after every restore, whether it succeeded or was refused, and also at startup. Once the document commit succeeds, the restore counts as a success: a failure while deleting covers or emptying `.staging/` is only logged to stderr and left for the startup sweep.
- **Restore safety limits:**
  - No absolute paths, `..` components, symlinks or duplicate names.
  - At most 5,000 entries.
  - An upload of at most 1 GB, and at most 1 GB extracted. The extracted size is counted on bytes actually written, never on zip headers, and extraction stops as soon as a limit is passed.
- **Schema versions:**
  - An older `schemaVersion` goes through the same migration chain as startup, run in memory.
  - A newer `schemaVersion` is refused.
  - Store models forbid unknown keys.
- **Refusal codes**, all in the error-code enum, each with an API test:

  | Code | HTTP | Cause |
  |---|---|---|
  | `restore_invalid` | 422 | Not a zip, damaged, fails schema or invariants, or a cover is missing or undecodable |
  | `restore_newer_version` | 422 | Export is from a newer schema version |
  | `restore_unsafe` | 422 | Breaks a path or size rule; same user copy as `restore_invalid` |
  | `couldnt_save` | 503 | A fault during the cover copy-in or the document commit |

- **Response shape:** every response uses the standard success/failure envelope. The server owns all message copy and the client renders it as is.
- **No optimistic updates:** after a successful restore, all views are invalidated.

## UX & Interaction Patterns

- **Nav:** **Backup** is added at the end of the nav. Until Home ships it reads Catalog · Backup.
- **Backup page:** the `h1` is "Backup" and the title is "Backup — bookvie". It holds two `surface` cards:
  - Export: **Export all data** (`button-primary`), with "Last export: N days ago" or "No export yet" below it in `meta` / `ink-tertiary`.
  - Restore: **Restore from file…** (`button-secondary`) with a one-line explanation.
- **Busy state:** when Export or Restore takes longer than about 300 ms, the button reads "Exporting…" or "Restoring…". It stays accent at 60% opacity, with no spinner. It is natively disabled; these are the only natively disabled controls in the app.
- **Restore confirmation:** an `alertdialog` reads "Replace all data with this file? Your current books, readings and card notes will be replaced." with **Replace all data** and **Cancel**. Cancel has default focus. Cancel or Esc changes nothing and returns focus to **Restore from file…**. If the save fails, the dialog stays open and shows the couldn't-save line above its buttons.
- **Restore success:** the `status` region reads "Restored.", the app navigates to the launch page `/`, and focus moves to that page's `h1`. Before Epic 3, `/` opens Catalog.
- **Messages:**

  | Outcome | Copy |
  |---|---|
  | Export failure | "Couldn't export. Your data wasn't changed." ("Last export" keeps its old value) |
  | Invalid or unsafe file | "This file isn't a bookvie export, or it's damaged. Nothing was changed." |
  | Newer version | "This export is from a newer version of bookvie. Nothing was changed." |

  Each refusal shows as one ink failure line under Restore, and focus returns to **Restore from file…**.
- **Live regions:** empty both live regions before each attempt, and set new text after about 100 ms.

## Cross-Story Dependencies

- **Built on Epic 1:** this epic relies on the atomic store and its filesystem seam for fault injection, the cover rules (immutable names, the startup sweep, and `.staging/`, which until now is only created and emptied at startup), the migration chain, `check_invariants()`, the response envelope and error enum, the `LibraryBuilder` fixture, and the app shell and overlay primitives.
- **Within this epic:** 2.2 builds the restore pipeline and 2.3 adds the refusal and fault paths to it. Both use the Backup page from 2.1.
- **Feeds Epic 3:** Epic 3 adds "Last export: N days ago" to Home's re-entry line and makes Home the launch page that restore navigates to.
