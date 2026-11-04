---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-04'
storyId: '2.3'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-2-3-refuse-damaged-hostile-or-newer-files.md (incl. Review Findings and Triage Log)
  - _bmad-output/implementation-artifacts/deferred-work.md (story 2.3 entries)
  - _bmad-output/test-artifacts/atdd-checklist-2-3-refuse-damaged-hostile-or-newer-files.md
  - _bmad/tea/config.yaml
  - backend/bookvie/store/restore.py, intents/restore.py, store/store.py (cover_names, LibraryNewer), http/api.py (BodySizeCap)
  - backend/tests/test_restore_refusals.py, test_restore.py, helpers.py (existing coverage)
  - frontend/e2e/restore-refusals.spec.ts, frontend/e2e/fixtures.ts
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
  - knowledge/fixture-architecture.md
  - knowledge/network-first.md
  - knowledge/playwright-cli.md
---

# Automation Summary: Story 2.3, Refuse damaged, hostile or newer files

The Story 2.2 summary that used to live in this file is in git history (`92fe581`).

**Execution mode:** BMad-Integrated (the story spec with its review findings and triage log, the deferred-work log, and the ATDD checklist).
**Detected stack:** fullstack (`backend/pyproject.toml` + `frontend/playwright.config.ts`).
**Playwright Utils mandate:** off (`tea_use_playwright_utils: false`).
**Pact.js Utils mandate:** not applicable (the repo has no contract testing).
**Subagent execution:** SEQUENTIAL. There were two small API targets, and neither needed a browser.
**Total tests added:** 2 API tests covering 5 cases. Backend 863 → 865, all green, coverage gate OK. E2E unchanged.
**Browser exploration:** skipped. No E2E target was selected.

## Coverage Plan by Test Level and Priority

Scope: **selective**. Story 2.3 already covers the 5 ATDD leaves (the full BKP-API-003/004/005 matrices) and the checklist's follow-ups. Both review passes added more: the central-directory cap, the `covers/` listing fault, and the read-only `.staging/`. I found the gaps with a branch-coverage run (`--cov-branch`) over `store/restore.py`, `intents/restore.py`, `store/store.py` and `http/api.py`:

| # | Gap | Evidence | Level | Priority |
|---|---|---|---|---|
| G1 | An entry that passes every safety rule but can't be unpacked: a damaged deflate stream, an encrypted entry, or an unsupported compression method | `store/restore.py` 125–126 and 131–132 uncovered. AC-1's damaged cases all fail earlier (at `ZipFile()` or on the CRC). These two branches are new in 2.3: the byte budget opens each entry through a copied `ZipInfo`. If they regressed, damage would become `restore_unsafe` (it shares the copy, so the user wouldn't notice, but the precedence would be wrong) or an uncaught 500. A password-protected zip of an export is a realistic user mistake. | API | P1 |
| G2 | A disk fault while unpacking into `.staging/`: can't open the target, or the disk fills mid-entry | `store/restore.py` 115–116 and 142–143 uncovered. The existing read-only `.staging/` test fails earlier, at the `covers/` mkdir. The spec's Never keeps these writes off the `FileSystem` seam. Unpacking up to 1 GiB makes ENOSPC the likeliest real fault, and it must be 503 `couldnt_save` with the partly staged files emptied, not a 500. | API | P1 |

**Not selected:**
- `store/restore.py` 91–92 and 280–281: reading a staged file back fails. That is a fault on a file this request just wrote. It maps through the same `CouldntSave` → 503 path G2 pins.
- `store/restore.py` 161–162 and 176–177: `seek` on the spooled upload fails. Starlette owns that file, and a fault there can't happen without mocking its internals.
- `intents/restore.py` 112–114, `InvariantViolation` → 500. Defensive; 2.2 triage already rejected it as dead.
- `store.py` 535, `cover_names()` when `covers/` is missing or a symlink. Startup refuses or creates `covers/`, so only hand-tampering mid-run reaches it, and the result (no collision check) is harmless.
- `http/api.py` 164 and 166→171 (a second `receive` after the cap, and a non-body message). These lines predate 2.3: `CoverSizeCap`'s streaming path, carried into `BodySizeCap` unchanged.
- **E2E: the body cap in a real browser** (deferred-work.md, 2.3 review pass 1). Testing it needs a body over 1 GiB + 64 KiB from Chromium, which the Backup page reads into memory first. Or it needs a way to lower the cap in the e2e server, and `bookvie` has no such seam (no env or flag reads the limits). Adding one is a production change, outside this workflow. It stays deferred.

## Tests Added (`backend/tests/test_restore_unpack_faults.py`, new)

A new file, because `test_restore_refusals.py` is 792 lines and these tests would take it past the 1,000-line limit (TEA rule H5). It imports that file's seeds (`_Source`, `_seed_target`), its `_Snapshot` and its body constants, so "nothing changed" means the same thing in both files.

1. **`test_ac1_an_entry_that_cannot_be_unpacked_is_restore_invalid_not_unsafe`** (P1, G1). Three cases, each with Piranesi's cover (the last entry unpacked) damaged by `_deflated_with`: `0xFF` over the start of its deflate stream (`zlib.error`, raised mid-read); the encryption flag (`RuntimeError`, raised at `open`); compression method 99 (`NotImplementedError`, raised at `open`). Each gives 422 `restore_invalid` and the log line `couldn't restore: the file covers/<name> is damaged` or `… can't be read`. `library.json`, `covers/` and both folder listings are unchanged, and `.staging/` is empty even though `library.json` and Dune's cover were already staged.
2. **`test_ac4_a_disk_fault_while_unpacking_into_staging_is_503_with_nothing_changed`** (P1, G2). `open` in `bookvie.store.restore` is patched, as `test_ac3_extraction_stops_before_staging_passes_the_cap` already does. In one case opening `.staging/library.json` fails (`EACCES`). In the other, writing Piranesi's cover fails with `ENOSPC` after two entries are staged. Both give 503 `couldnt_save`, the log line `couldn't save: can't write .staging/<entry>`, nothing changed and an empty `.staging/`. After both faults, the same archive restores with 200, so nothing was left half-done.

## Validation

- `npm run check:py`: 865 passed. The gate shows domain 100% and intents+store 97.44%. `store/restore.py` goes from 16 uncovered lines to 8 (93% → 95%).
- Mutation check, each one run against the new file and then reverted (`git diff backend/bookvie/` is empty):
  - a damaged read raises `ArchiveUnsafe` instead: test 1 fails;
  - an `open` error raises `ArchiveUnsafe` instead: test 1 fails;
  - the `open` error isn't caught: test 1 fails;
  - the `write` `OSError` isn't wrapped as `CouldntSave`: test 2 fails;
  - the target `open` `OSError` isn't wrapped: test 2 fails.
- `ruff check` is clean on the new file. `ruff format` isn't used: it rewraps the existing files.
- Quality: no hard waits, and each test uses its own `tmp_path`. Cases loop with the case name in every assertion, as in the AC-1 and AC-4 leaves. Patches are scoped with `monkeypatch.context()`. The file is 164 lines.
- No browser was opened, so no CLI sessions were left behind.

## Assumptions and Risks

- G1 pins today's precedence for an encrypted or unsupported-method entry: `restore_invalid`, decided at unpack time. That matches the spec's "damage → invalid". If a future story calls an encrypted archive hostile, the second and third cases are the place to change.
- The new file imports private helpers from `test_restore_refusals.py`. If that file is split or renamed, move `_Source`, `_seed_target` and `_Snapshot` into `tests/helpers.py`.
- The real-browser body-cap check stays deferred (deferred-work.md, 2026-11-04).

## Next Steps

- Commit: `git add backend/tests/test_restore_unpack_faults.py _bmad-output/test-artifacts/automation-summary.md && git commit -m "test: expand automation coverage for refusing damaged, hostile or newer files (story 2.3)"`
- `bmad-testarch-trace` for Epic 2: 2.3 was the last story, and the epic gate is "every refusal and fault test green (BKP-API-003..005)".
