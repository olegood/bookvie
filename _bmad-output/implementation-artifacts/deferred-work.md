- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-scaffold-and-install-bookvie.md`
  summary: Add an automated build → install → `GET /` smoke check proving Vite `outDir`, `STATIC_DIR` and the wheel `artifacts` rule name the same folder.
  evidence: Changing `outDir` or `artifacts` leaves every pytest test green; only the manual curl step in Story 1.1 Verification catches it. Belongs with the Story 1.3 smoke test.
  resolved: Story 1.3, `scripts/smoke.mjs` (`npm run check:smoke`).
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-run-one-safe-instance.md`
  summary: Before `GET /api/export` (Epic 2) ships, reject cross-site simple GETs (e.g. `Sec-Fetch-Site: cross-site`) or make sure no GET route has side effects such as recording "Last export".
  evidence: The Host/Origin guard passes a cross-site `<img>`/no-cors GET because it sends `Host: 127.0.0.1:<port>` and no Origin. The page can't read the response, but a full export download would record "Last export".

## Deferred from: code review of spec-1-2-run-one-safe-instance (2026-10-29)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-run-one-safe-instance.md`
  summary: Verify the Vite proxy end to end: a request through `npm run dev` with `changeOrigin: true` must pass the Host/Origin guard. Today `test_packaging.py` only regex-matches `frontend/vite.config.ts`.
  evidence: If Vite ignored or misplaced the option, every proxied dev request would get 403 and pytest would stay green. Belongs with the Story 1.3 e2e harness.
  resolved: Story 1.3, `frontend/e2e/dev-proxy.spec.ts`.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-keep-the-library-in-one-safe-file.md`
  summary: Inject time (AD-20, TR2): a `Clock` protocol in `domain/clock.py` with system and fake-today implementations, `--fake-today YYYY-MM-DD` accepted only with `--no-browser`, `TZ=Europe/Madrid` pinned for `check:py` and `check:e2e`, the Playwright fixture setting `timezoneId` and `page.clock` to the fake day, DST tests on the last Sundays of March and October, and a test that `domain/` reads the clock only through `Clock`.
  evidence: Split from Story 1.4 at planning (spec ~2,650 tokens vs the 1,600 target). It is the one part of the story independent of the store; Story 1.4's last acceptance-criteria block stays open until it lands, and it must ship before any intent that reads "today" (Story 1.7's Finished on).

## Deferred from: build review of spec-1-4-keep-the-library-in-one-safe-file (2026-10-30)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-keep-the-library-in-one-safe-file.md`
  summary: Add uniqueness invariants to AD-18 and `check_invariants()`: unique Book IDs, unique Reading and Card note IDs within a Book, no repeated ID in `sideReadBookIds`, and the Up next book not also a Side read.
  evidence: `check_invariants` builds a set of Book IDs, so duplicates pass, and `sideReadBookIds: ["a","a"]` counts as two Side reads. AD-18's rule list doesn't name these rules. Needed before Story 1.7 creates IDs.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-keep-the-library-in-one-safe-file.md`
  summary: Decide whether commits on macOS need `fcntl(F_FULLFSYNC)` instead of `os.fsync`.
  evidence: Unverified, medium if true. `os.fsync` on darwin doesn't flush the drive's write cache. Settled by whether APFS can leave `library.json` empty or torn after a power cut when write → fsync → rename was done (SQLite uses `F_FULLFSYNC` for this reason).
