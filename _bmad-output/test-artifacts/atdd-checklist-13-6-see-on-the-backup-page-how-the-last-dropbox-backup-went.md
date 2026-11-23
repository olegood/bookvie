---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-23'
storyId: '13.6'
storyKey: '13-6-see-on-the-backup-page-how-the-last-dropbox-backup-went'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-136-see-on-the-backup-page-how-the-last-dropbox-backup-went'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-13-6-see-on-the-backup-page-how-the-last-dropbox-backup-went.md'
generatedTestFiles:
  - 'backend/tests/test_dropbox_backup_line.py'
  - 'frontend/e2e/dropbox-backup-line.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 13 notes; Story 13.6)'
  - '_bmad-output/planning-artifacts/sprint-change-proposal-2026-11-23.md (13.6 shrunk to a plain Dropbox backup line)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-22 → Dropbox backup line)'
  - '_bmad-output/implementation-artifacts/epic-13-context.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Foundation → Dates; Pages → Backup page, Dropbox backup line; Dropbox backup line section, Failed reasons table)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (components.dropbox-backup-line; Backup page; Dropbox backup line)'
  - '_bmad/tea/config.yaml'
  - 'backend/bookvie/views/backup.py, views/models.py (BackupView), http/api.py, http/app.py (create_app dev), store/local_state.py, intents/backup_file.py (record_backup_upload, CAUSES), domain/clock.py (FakeClock)'
  - 'backend/tests/helpers.py (api_client, failing_reasons), test_views.py, test_dropbox_backup_guide.py (GUIDE, headed), test_morning_job_removed.py (red-phase style)'
  - 'docs/dropbox-backup.md (Troubleshooting the setup)'
  - 'frontend/src/pages/BackupPage.tsx, BackupPage.module.css, lib/relativeDay.ts'
  - 'frontend/e2e/fixtures.ts, library.ts, home.ts, about-this-copy.ts, restore.ts, update-notice.ts, dev-mode.ts, backup.spec.ts, about-this-copy.spec.ts, agent-backup.spec.ts; playwright.config.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given views/backup, when it is read, then it carries dropboxBackup: {state, reportAt, lastUploadAt, copies, cause} (Pydantic, then api:gen), with state one of dev, none, uploaded, skipped, failed, computed on the server from local-state.json''s upload state; dev on a --dev server whatever is stored; none when there is no report or the state is missing or unreadable; lastUploadAt the upload''s backupAt.' }
  - { id: AC-2, idSource: generated, text: 'Given each state, seeded through local-state.json (fake clock), when the Backup page renders, then the Export card shows one line directly under "Last export", in UX-DR75''s words ("Dropbox backup: never from a development server", "Dropbox backup: none yet · run /bookvie-backup in Claude Code", "Dropbox backup: last upload today at 09:02 · 3 copies in Dropbox", "Dropbox backup: checked today at 09:02, nothing new · last upload on 19 Nov · 3 copies in Dropbox", "Dropbox backup: failed today at 09:02 · *reason* Last upload on 19 Nov." (the last sentence only when there has been an upload)); and each cause shows its UX-DR77 sentence; and "when" follows UX-DR76 ("today at 09:02", "yesterday at 09:02", "on 19 Nov", "19 Nov 2025" outside the current year) and recomputes on focus; copies read "1 copy", "2 copies", "3 copies".' }
  - { id: AC-3, idSource: generated, text: 'Given the line, when it is inspected, then it is meta text, ink for a failure and ink-tertiary otherwise, with no dot, icon, badge shape, tint or color, and a command in a reason in the body font (UX-DR73); and it is plain text: not a control, link, Tab stop or live region, and a change found by the refetch on focus isn''t announced (UX-DR74); and it never appears on Home; and axe passes in both themes.' }
  - { id: AC-4, idSource: generated, text: 'Given a manual Export all data, when it finishes, then "Last export" moves and the line doesn''t; a recorded upload moves the line and not "Last export"; a restore moves neither.' }
  - { id: AC-5, idSource: generated, text: 'Given the guide, when this story lands, then docs/dropbox-backup.md has one troubleshooting entry per failure cause quoting the line''s exact words, and the docs pytest fails unless every cause has its entry.' }
---

# ATDD Checklist: Story 13.6 See on the Backup page how the last Dropbox backup went

## Preflight

- **Stack:** `fullstack`, auto-detected (pytest and Playwright are both in place). The story adds a field to `views/backup` (server), a line on the Backup page (client), and guide entries (docs).
- **Story:** `epics.md` Story 13.6, as `sprint-change-proposal-2026-11-23.md` rewrote it. It has 5 Given/When/Then criteria with no ids, numbered AC-1 to AC-5 in source order. `sprint-status.yaml` reads `13-6-see-on-the-backup-page-how-the-last-dropbox-backup-went: backlog`. No spec file exists yet; the build writes it. This isn't the epic's first story, so the spine-drift gate doesn't apply.
- **Config:** `tea_use_playwright_utils: false`, so the specs are vanilla Playwright on `./fixtures.ts`. No Pact.
- **What exists today (commit `6479a40`):**
  - `views/backup` returns `{lastExportAt}` only, and `views.backup(store)` has no way to know about `--dev` (`create_app(dev=…)` doesn't pass it on).
  - `record_backup_upload` (Story 13.3) writes `local-state.json` → `autoBackup: {lastReport: {outcome, at, cause?}, lastOk: {at, outcome}, lastUpload: {at, backupAt, name, copies, libraryHash}}`.
  - The Export card has the "Last export" `p` (`.lastExport`, `meta`/`ink-tertiary`).
  - `docs/dropbox-backup.md` → "Troubleshooting the setup" already has one `#### \`<cause>\`: …` entry per cause, but none quotes the line's words.
- **Worktree:** this run happened in the git worktree `hogback-creosote`, not in the shared checkout. The build has to see these files. Land them on `master` first, or run the build in this worktree.

## Generation Mode

AI generation. The criteria are clear and the page and its locators already ship, so no recording was needed. Execution was **sequential** in this session, not two subagents. The context loaded here (the stored group's shape, the shipped Backup page, and the e2e and pytest helpers to reuse) would have had to be copied into both briefs, and E11-D1 asks for one de-duplicated helper set anyway.

## Test Strategy

| AC | Level | Priority | Leaf | First assertion (the criterion) |
|---|---|---|---|---|
| AC-1 | API (pytest, in-process app) | P0 | `test_dropbox_backup_line.py:77` `test_views_backup_carries_the_dropbox_backup_state_computed_on_the_server` | `body["dropboxBackup"]["state"] == "uploaded"` for a stored upload |
| AC-2 | E2E | P0 | `dropbox-backup-line.spec.ts:100` | the line reads exactly "Dropbox backup: last upload today at 09:02 · 3 copies in Dropbox" |
| AC-3 | E2E | P1 | `dropbox-backup-line.spec.ts:180` | a Failed line's color is `ink` (`rgbOf(designColor('ink'))`) |
| AC-4 | E2E | P1 | `dropbox-backup-line.spec.ts:284` | after a real recorded upload, the line reads "… last upload today at 12:00 · 2 copies in Dropbox" |
| AC-5 | Docs (pytest) | P1 | `test_dropbox_backup_line.py:155` `test_the_guide_has_one_troubleshooting_entry_per_cause_quoting_the_lines_words` | `dropbox_signin`'s one entry contains its EXPERIENCE.md reason word for word |

What each leaf covers after its first assertion:

- **AC-1.** The whole body for an upload: `lastExportAt` is kept, `lastUploadAt` is `backupAt` (deliberately 36 s before the report's `at`), `copies` is 3 and `cause` is null.
  - A skip keeps the upload's time and count.
  - A failure carries its cause and the upload before it. A failure with no upload ever has null `lastUploadAt` and `copies`.
  - `none` in five cases: no file, no group, `{not json`, a group that isn't an object, and an unknown outcome. Each has exactly the five keys.
  - `dev` on a `--dev` app over a stored upload and over a stored failure.
  - `schema.d.ts` names `dropboxBackup`, so `api:gen` ran.
- **AC-2.** The browser clock is fixed at Sat 21 Nov 2026 10:00 CET. Each state is written to `local-state.json`, then a window `focus` refetches the view.
  - Skipped.
  - Failed with each of the five causes, plus " Last upload on 19 Nov.".
  - Failed yesterday with no upload, so no last sentence.
  - "1 copy" and "2 copies".
  - "on 19 Nov 2025" outside the current year.
  - None, once the file is deleted.
  - Recompute on focus: the clock moves to 00:01 the next day, then `focus`, and "today at 09:02" becomes "yesterday at 09:02".
  - Dev: a second, `--dev` server over a stored upload.
  - The leaf seeds through `local-state.json` and the browser clock. The server needs no `--fake-today`, because no state depends on server time (spine: "no time-out state").
- **AC-3.**
  - The line's previous element sibling is "Last export". It has the same left `x`, and the same computed font family, size, weight, line-height and style as the shipped `meta` "Last export".
  - Text only: no `svg`/`img`/`canvas`/`[role=img]`/`code`/`kbd`/`samp`, no `::before`/`::after` content, transparent background, no background image, no border or outline. Every descendant uses the line's font family, and the line contains "Run bookvie-dropbox auth in Terminal.".
  - Not a control: no `role` or `tabindex` on it, no link or button around it, nothing focusable inside. Tab from Export goes straight to Restore from file….
  - Not a live region, and the refetched change to Uploaded leaves no "Dropbox" in any `status` or `alert` region.
  - Uploaded is `ink-tertiary`. In dark, Uploaded is `ink-tertiary-dark` and Failed is `ink-dark`.
  - axe passes in light and dark with the two-line Failed reason showing.
  - Home shows its re-entry "Last export: …" and no "Dropbox backup" anywhere.
- **AC-4.** The `serverAtFakeToday` setup: the browser at 10:00 and the server at noon on 28 Oct 2026. Seeded with an upload yesterday at 09:02 and "Last export" 8 days ago. The steps run in this order:
  - **A real recorded upload,** done the way the skill does it, through the shipped tools: `export_backup {forUpload: true}`, the file's `contentHash` from `list_local_backups`, then `record_backup_upload {uploaded, copies: 2}`. The line moves, "Last export" still reads "8 days ago", and the stored `lastExportAt` is unchanged.
  - **Export all data:** "Last export: today", and the line is unchanged.
  - **A restore through the page** from that backup file: both lines are unchanged and `local-state.json` is byte-identical.

  The upload runs first on purpose. A forUpload export and a manual export would both stamp the fake noon, so "Last export unmoved" can only be told apart before any export.
- **AC-5.** EXPERIENCE.md's reasons (`failing_reasons()`, the shared reader) are paired with AD-22's `CAUSES`. Each cause has exactly one guide section headed `` `<cause>` ``, and it contains the reason word for word, with whitespace normalized.

## Existing leaves this story changes (for the build)

These pin `views/backup`'s exact body as `{"lastExportAt": …}`. Once `dropboxBackup` is added, they need it in the expected body (or a key-based assert):

- `backend/tests/test_views.py:350`, `:357` and `:368`.
- `backend/tests/test_export.py:546`.
- `backend/tests/test_morning_job_removed.py:126` (Story 13.5's "carries only lastExportAt"). Its intent becomes "no `autoBackup`/launchd field". Keep its `"autoBackup" not in schema` check at `:140` true by not naming any new type or field `autoBackup…`.
- `backend/tests/test_morning_job_removed_follow_ups.py:42`.
- `frontend/src/api/views.test.ts` and `export.test.ts` build `lastExportAt` view objects. If any of them is typed as the generated `BackupView`, `tsc -b` will ask for `dropboxBackup` after `api:gen`.

## Green-phase follow-ups (secondary branches, not red leaves)

- **Unreadable parts:** a `lastReport.at` that isn't an ISO time with an offset; `copies` that isn't a positive int; `cause` outside `CAUSES`. Whether each is `none`, or the state with the bad field dropped, is for the spec. AC-1 only pins "unknown outcome → none".
- **Field values for `none` and `dev`:** AC-1 asserts only `state` (and, for `none`, the five keys). Whether the other fields are null or carry the stored values is for the spec.
- **A timestamp in the future** (clock change) reads "today at HH:MM" (Foundation → Dates). The leaves don't pin it.
- **The year rule's wording:** AC-2 asserts "last upload on 19 Nov 2025". UX-DR76 lists "19 Nov 2025" next to "on 19 Nov", and this run reads it as the same "on" form. If the spec decides otherwise, change that one expected string.
- **Words in the guide:** AC-5 asserts the reason verbatim, so the guide must not put backticks around `bookvie-dropbox auth` or `/bookvie-backup` inside the quoted sentence. That also follows "Fixes in words" (body font, not code).
- **A failed `views/backup`** still shows "Couldn't load" (UX-DR74). That already ships (`backup.spec.ts:287`), and a line inside the loaded page can't change it.
- **Forced colors:** DESIGN.md says the line needs no forced-colors rule, so there is no leaf.

## Helper probes

- **Helpers reused:**
  - `exportButton` (`about-this-copy.ts`)
  - `liveRegionText` (`dev-mode.ts`)
  - `focusWindow` (`update-notice.ts`)
  - `startSeededServer` (`fixtures.ts`, extended: optional `dev`, default `false`, which keeps every caller's behavior; it isn't a measuring helper, so it wasn't probed)
  - `serverAtFakeToday`, `stopAndRemove`, `mainAt`, `mainBookCard` (`home.ts`)
  - `callTool`, `designColor`, `rgbOf` (`library.ts`)
  - `restoreFrom`, `zipFile` (`restore.ts`)
  - `api_client` (`tests/helpers.py`, extended: optional `dev`, default `False`, passed to `create_app`; it isn't a measuring helper, so it wasn't probed)
  - `failing_reasons` (`tests/helpers.py`)
  - `GUIDE`, `headed` (`tests/test_dropbox_backup_guide.py`)
  - `CAUSES` (`bookvie.intents`)
- **Helpers added:**
  - `exportCard` (`about-this-copy.ts`): the Export card region. Before this, it was inline in `about-this-copy.spec.ts:86`, `:139` and `backup.spec.ts:265`, and no export covered it.
  - Spec-local in `dropbox-backup-line.spec.ts`:
    - `dropboxLine` and `lastExportLine`: locators inside `exportCard`. `home.ts`'s `reentryFactsByExport` finds "Last export" on Home's card, not on Backup.
    - `autoBackup` and `localState`: build the stored group in `record_backup_upload`'s shape. No e2e helper writes `autoBackup`; `backup.spec.ts`'s `serverWithLastExport` writes only `lastExportAt`.
    - `writeLocalState` and `readLocalState`: rewrite or read the file under a running server.
    - `refetch`: `focusWindow` plus waiting for the `views/backup` response, so a leaf reads only after the refetch has landed.
    - `REASONS`: the five UX-DR77 sentences. pytest reads them from EXPERIENCE.md with `failing_reasons`, but there is no TS reader of EXPERIENCE.md. The e2e copies the UX words as the other specs do (`COULDNT_LOAD`, `RESTORE_EXPLANATION`).
  - pytest helpers added: none beyond the module's constants and two private readers (`_store`, `_dropbox_backup`).
- **Shipped numbers: none quoted.** The leaves assert no size. The colors are read with `designColor` (`ink #2B2E2A`, `ink-tertiary #666961`, `ink-dark #ECEAE3`, `ink-tertiary-dark #9A9E94`). The `meta` type is compared with the shipped "Last export" line on the same page, not with token values.
- **Widths:** no border or outline width is asserted, so E10-R1 doesn't apply.
- **Storage keys:** no new localStorage key.

Probes ran in Chromium with the default Desktop Chrome viewport, `deviceScaleFactor` 1, light scheme and no forced colors (the conditions AC-3 uses for these reads). Dark mode changes only colors, which are read with `toHaveCSS`. The command was `TZ=Europe/Madrid npx playwright test e2e/dropbox-line.probe.spec.ts` (2 passed, 4.6 s), and the file was then removed with `rm`.

- **`refetch`** (spec-local, a wait):
  - On the shipped Backup page (the worker server), it resolved after `focus`.
  - A bare `waitForResponse` on `views/backup` without a `focus` timed out at 1.5 s, so it refuses. It waits on the focus refetch, not on any request.
- **`type`** (AC-3's computed-type read):
  - Two `13px/1.4 sans-serif` paragraphs return equal arrays, and a `14px` one returns a different one.
  - On the shipped Backup page, the "Last export" line's size reads `13px`, which equals `--font-meta-size` in `tokens.css`.
- **`look`** (AC-3's text-only read):
  - A plain paragraph returns exactly the expected "plain" object, with one font family.
  - It refuses each of these: `<code>` (graphics 1), a monospace `span` (2 families), an `svg` (graphics 1), a tinted background (`rgb(250, 240, 200)`), a solid border, and a `::before` dot (`"•"`).
- **`roles`** (AC-3's plain-text read):
  - A plain paragraph inside `main[tabindex=-1]` returns `{role: null, tabindex: null, control: false, focusable: 0, live: false}`. The main's `tabindex` doesn't count.
  - It refuses a paragraph holding a link (focusable 1), one with `tabindex="0"`, and one inside `role="status"` (live true).
- **Render-before-read**, checked over all 5 leaves; none needed a fix:
  - **AC-2:** every read is a web-first `toHaveText` after `exportButton` is visible (on the dev server too).
  - **AC-3:** each `evaluate`, `textContent` and `boundingBox` follows the web-first `toHaveCSS` on the line and the `toBeVisible` on "Last export". The Home absence check waits on the rendered "Last export: …" in the Main book card. `liveRegionText` follows a web-first `toHaveText` after the refetch.
  - **AC-4:** every page read is a web-first `toHaveText`. The `local-state.json` reads are file reads.
  - **AC-1 and AC-5** are pytest and read no page.

## TDD Red Phase

There are 5 skipped leaves, each with exactly one `[P*] AC-n`:
- 2 pytest leaves in `backend/tests/test_dropbox_backup_line.py`, `@pytest.mark.skip(reason=RED_13_6)`
- 3 Playwright leaves in `frontend/e2e/dropbox-backup-line.spec.ts`, `test.skip(`

**Red today.** These runs came after the probes above passed, on the files as they are now (after Prettier and ruff). The leaves were un-skipped in throwaway copies, `e2e/dropbox-backup-line.red.spec.ts` (`--timeout=30000 --retries=0`) and `tests/test_dropbox_backup_line_red.py`. The copies and `test-results/` were then removed with `rm`. Each leaf fails at its first criterion assertion:

| AC | Fails at | Because |
|---|---|---|
| AC-1 | `:85` | `assert None == 'uploaded'`: the body is `{'lastExportAt': '2026-11-02T18:40:00+01:00'}` |
| AC-2 | `:124` | `toHaveText("Dropbox backup: last upload today at 09:02 · 3 copies in Dropbox")`: element(s) not found |
| AC-3 | `:198` | `toHaveCSS('color', 'rgb(43, 46, 42)')`: element(s) not found |
| AC-4 | `:324` | `toHaveText("Dropbox backup: last upload today at 12:00 · 2 copies in Dropbox")`: element(s) not found |
| AC-5 | `:162` | `dropbox_signin`'s one entry doesn't contain "Dropbox sign-in expired. Nothing in Dropbox was deleted. Run bookvie-dropbox auth in Terminal." |

AC-4's setup was checked in the same red copy: `record_backup_upload` answered `{"ok": true}`, `isError: false`. So the shipped tools record a real upload, and the leaf reaches its criterion with real data.

**Suite after this run:**
- `npm run check:api` passes (389 node tests; Prettier, `tsc -b` and oxlint are clean).
- `npm run check:py` passes: 2422 passed and 2 skipped (this run's leaves), and the coverage gate is ok.
  - The first `check:py` run reported 3 failures, including `tests/test_dropbox_cli_follow_ups.py:253`.
  - A plain `pytest -n auto -rf` and a second `check:py` both passed in full. Neither file this run touched is imported there, so it looks flaky, but I didn't find out which 3 tests failed.
- The full e2e suite wasn't run. The two helper changes are additive, with defaults that keep every caller's behavior, and `tsc -b` passes.

## Implementation checklist (for `bmad-build-auto`)

- [ ] `BackupView.dropbox_backup` (`views/models.py`): a `DropboxBackupView` (don't name it `AutoBackup…`; see `test_morning_job_removed.py:140`) with `state: Literal["dev", "none", "uploaded", "skipped", "failed"]`, `report_at`, `last_upload_at`, `copies`, `cause`. Then `npm --prefix frontend run api:gen`.
- [ ] `views.backup(...)` reads `autoBackup` through `read_group` and gets the server's dev flag (from `create_app(dev=…)`, through `app.state` or the route). `dev` comes first, then `none` for anything unreadable, then `lastReport.outcome`.
- [ ] A client formatter beside `lastExportLine` (`lib/relativeDay.ts` or its own module): "today at HH:MM", "yesterday at HH:MM", "on D Mon", "on D Mon YYYY" outside the current year, all from `useNow()`; "1 copy" and "N copies"; the five UX-DR77 reasons.
- [ ] `BackupPage.tsx`: a second `p` directly after "Last export" in the Export card, styled `meta`, `ink-tertiary`, and `ink` when failed, with no live region. Never on Home.
- [ ] `docs/dropbox-backup.md`: each `` #### `<cause>` `` entry quotes the line's exact reason (no backticks inside the quote).
- [ ] Update the existing leaves listed above, then un-skip the 5 leaves and run `npm run check`.

## Next

1. Run `bmad-build-auto` for Story 13.6 (in this worktree, or after landing these files on `master`).
2. Then `bmad-code-review` in a new session, then `bmad-testarch-automate`.
