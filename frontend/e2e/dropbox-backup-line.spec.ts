// Story 13.6 See on the Backup page how the last Dropbox backup went: the
// Dropbox backup line, a second `meta` line in the Export card directly under
// "Last export" (UX-DR73–UX-DR77, EXPERIENCE.md → Dropbox backup line).
//
// The server computes the state from local-state.json's `autoBackup` group
// (backend/tests/test_dropbox_backup_line.py); the client only formats it.
// These tests write that group by hand, in the shape record_backup_upload
// writes (Story 13.3), before the server starts or between refetches: the
// server reads the file on every views/backup request. The browser clock is
// fixed, so every "when" is known (TZ is Europe/Madrid, playwright.config.ts).

import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page } from '@playwright/test'
import { exportButton, exportCard } from './about-this-copy.ts'
import { liveRegionText } from './dev-mode.ts'
import { expect, type Server, startSeededServer, test } from './fixtures.ts'
import { mainAt, mainBookCard, serverAtFakeToday, stopAndRemove } from './home.ts'
import { callTool, designColor, rgbOf } from './library.ts'
import { restoreFrom, zipFile } from './restore.ts'
import { focusWindow } from './update-notice.ts'

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const DUNE = { title: 'Dune', authors: ['Frank Herbert'], pages: 412 }

// UX-DR77, in AD-22's cause order: the words after "failed *when* · ".
const REASONS = {
  dropbox_signin: 'Dropbox sign-in expired. Nothing in Dropbox was deleted. Run bookvie-dropbox auth in Terminal.',
  upload_incomplete: "the last upload didn't finish. Nothing in Dropbox was deleted; run /bookvie-backup again.",
  dropbox_full: 'Dropbox is full. Nothing in Dropbox was deleted; free some space there.',
  backup_write: "bookvie couldn't write the backup file. See docs/dropbox-backup.md → Troubleshooting.",
  other: 'the last run stopped with an error. See docs/dropbox-backup.md → Troubleshooting.',
} as const
type Cause = keyof typeof REASONS

// Saturday 21 Nov 2026, 10:00 in Madrid (CET, +01:00).
const NOW = new Date('2026-11-21T10:00:00+01:00')
const TODAY_0902 = '2026-11-21T09:02:00+01:00'
const YESTERDAY_0902 = '2026-11-20T09:02:00+01:00'
const NOV_19_0902 = '2026-11-19T09:02:00+01:00'
const LAST_YEAR_0902 = '2025-11-19T09:02:00+01:00'

type Upload = { at: string; copies: number }

/** The `autoBackup` group as record_backup_upload leaves it after this last report. */
function autoBackup(
  report: { outcome: 'uploaded' | 'skipped' | 'failed'; at: string; cause?: Cause },
  upload?: Upload,
): Record<string, unknown> {
  const group: Record<string, unknown> = { lastReport: report }
  if (report.outcome !== 'failed') group.lastOk = { at: report.at, outcome: report.outcome }
  if (upload) {
    group.lastUpload = {
      at: upload.at,
      backupAt: upload.at,
      name: `bookvie-backup-${upload.at.slice(0, 10)}.zip`,
      copies: upload.copies,
      libraryHash: 'a'.repeat(64),
    }
  }
  return group
}

function localState(group: Record<string, unknown> | null, lastExportAt?: string): string {
  return JSON.stringify({ ...(lastExportAt ? { lastExportAt } : {}), ...(group ? { autoBackup: group } : {}) })
}

const UPLOADED_TODAY = autoBackup({ outcome: 'uploaded', at: TODAY_0902 }, { at: TODAY_0902, copies: 3 })

/** The Dropbox backup line in the Export card. */
function dropboxLine(page: Page): Locator {
  return exportCard(page).getByText(/^Dropbox backup: /)
}

/** The "Last export" line in the Export card, which ships. */
function lastExportLine(page: Page): Locator {
  return exportCard(page).getByText(/^(Last export: .+|No export yet)$/)
}

/** Replaces local-state.json under a running server; the next views/backup request reads it. */
function writeLocalState(server: Server, contents: string | null): void {
  const file = path.join(server.dataDir, 'local-state.json')
  if (contents === null) rmSync(file, { force: true })
  else writeFileSync(file, contents)
}

function readLocalState(server: Server): string {
  return readFileSync(path.join(server.dataDir, 'local-state.json'), 'utf8')
}

/** The window regains focus: views/backup refetches and every relative time recomputes. */
async function refetch(page: Page): Promise<void> {
  const response = page.waitForResponse((r) => r.url().endsWith('/api/views/backup') && r.ok())
  await focusWindow(page)
  await response
}

test.describe('Story 13.6 See on the Backup page how the last Dropbox backup went (ATDD)', () => {
  test.skip('[P0] AC-2 the Export card shows the Dropbox backup line under "Last export" in UX-DR75 words for every state, cause, "when" and count', async ({
    page,
  }, testInfo) => {
    await page.clock.setFixedTime(NOW)
    const server = await startSeededServer(
      testInfo,
      'dropbox-line',
      { books: [DUNE] },
      {
        'local-state.json': localState(UPLOADED_TODAY),
      },
    )
    const devServer = await startSeededServer(
      testInfo,
      'dropbox-line-dev',
      { books: [DUNE] },
      { 'local-state.json': localState(UPLOADED_TODAY) },
      { dev: true },
    )
    try {
      await page.goto(`${server.url}/backup`)
      await expect(exportButton(page)).toBeVisible()

      // The criterion: the latest report, an upload today, in the line's words.
      await expect(dropboxLine(page)).toHaveText('Dropbox backup: last upload today at 09:02 · 3 copies in Dropbox')

      const shows = async (group: Record<string, unknown> | null, line: string) => {
        writeLocalState(server, group === null ? null : localState(group))
        await refetch(page)
        await expect(dropboxLine(page)).toHaveText(line)
      }

      // Skipped: when it checked, then the last upload's "when" and count.
      await shows(
        autoBackup({ outcome: 'skipped', at: TODAY_0902 }, { at: NOV_19_0902, copies: 3 }),
        'Dropbox backup: checked today at 09:02, nothing new · last upload on 19 Nov · 3 copies in Dropbox',
      )
      // Failed: each cause's reason, then the last upload when there was one.
      for (const [cause, reason] of Object.entries(REASONS) as [Cause, string][]) {
        await shows(
          autoBackup({ outcome: 'failed', at: TODAY_0902, cause }, { at: NOV_19_0902, copies: 3 }),
          `Dropbox backup: failed today at 09:02 · ${reason} Last upload on 19 Nov.`,
        )
      }
      await shows(
        autoBackup({ outcome: 'failed', at: YESTERDAY_0902, cause: 'dropbox_full' }),
        `Dropbox backup: failed yesterday at 09:02 · ${REASONS.dropbox_full}`,
      )
      // Counts, and a date outside the current year.
      await shows(
        autoBackup({ outcome: 'uploaded', at: YESTERDAY_0902 }, { at: YESTERDAY_0902, copies: 1 }),
        'Dropbox backup: last upload yesterday at 09:02 · 1 copy in Dropbox',
      )
      await shows(
        autoBackup({ outcome: 'uploaded', at: NOV_19_0902 }, { at: NOV_19_0902, copies: 2 }),
        'Dropbox backup: last upload on 19 Nov · 2 copies in Dropbox',
      )
      await shows(
        autoBackup({ outcome: 'skipped', at: YESTERDAY_0902 }, { at: LAST_YEAR_0902, copies: 3 }),
        'Dropbox backup: checked yesterday at 09:02, nothing new · last upload on 19 Nov 2025 · 3 copies in Dropbox',
      )
      // None: no report yet.
      await shows(null, 'Dropbox backup: none yet · run /bookvie-backup in Claude Code')

      // "when" recomputes on focus: past midnight, today's upload is yesterday's.
      await shows(UPLOADED_TODAY, 'Dropbox backup: last upload today at 09:02 · 3 copies in Dropbox')
      await page.clock.setFixedTime(new Date('2026-11-22T00:01:00+01:00'))
      await focusWindow(page)
      await expect(dropboxLine(page)).toHaveText('Dropbox backup: last upload yesterday at 09:02 · 3 copies in Dropbox')

      // Dev: a --dev server never uploads, whatever is stored.
      await page.goto(`${devServer.url}/backup`)
      await expect(exportButton(page)).toBeVisible()
      await expect(dropboxLine(page)).toHaveText('Dropbox backup: never from a development server')
    } finally {
      await stopAndRemove(server)
      await stopAndRemove(devServer)
    }
  })

  test.skip('[P1] AC-3 the line is plain meta text, ink only when failed, not a control or live region, never on Home, and axe passes in both themes', async ({
    page,
  }, testInfo) => {
    await page.clock.setFixedTime(NOW)
    const failed = autoBackup(
      { outcome: 'failed', at: TODAY_0902, cause: 'dropbox_signin' },
      { at: NOV_19_0902, copies: 3 },
    )
    const server = await startSeededServer(testInfo, 'dropbox-line-style', mainAt(120, { others: [DUNE] }), {
      'local-state.json': localState(failed, '2026-11-02T18:40:00+01:00'),
    })
    try {
      await page.emulateMedia({ colorScheme: 'light' })
      await page.goto(`${server.url}/backup`)
      await expect(lastExportLine(page)).toBeVisible()
      const line = dropboxLine(page)

      // The criterion: a failure is `ink`, like every failure line.
      await expect(line).toHaveCSS('color', rgbOf(designColor('ink')))

      // Directly under "Last export", in the same left alignment and the same `meta` type.
      const lastExport = lastExportLine(page)
      expect(await line.evaluate((el) => el.previousElementSibling?.textContent)).toBe(await lastExport.textContent())
      expect((await line.boundingBox())!.x).toBe((await lastExport.boundingBox())!.x)
      const type = (el: Element) => {
        const s = getComputedStyle(el)
        return [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight, s.fontStyle]
      }
      expect(await line.evaluate(type)).toEqual(await lastExport.evaluate(type))

      // Text only: no dot, icon, badge shape, tint or color; a command in a reason stays in the body font.
      const look = await line.evaluate((el) => {
        const s = getComputedStyle(el)
        const fonts = [el, ...Array.from(el.querySelectorAll('*'))].map((node) => getComputedStyle(node).fontFamily)
        return {
          graphics: el.querySelectorAll('svg, img, canvas, [role="img"], code, kbd, samp').length,
          before: getComputedStyle(el, '::before').content,
          after: getComputedStyle(el, '::after').content,
          background: s.backgroundColor,
          backgroundImage: s.backgroundImage,
          border: [s.borderTopStyle, s.borderRightStyle, s.borderBottomStyle, s.borderLeftStyle],
          outline: s.outlineStyle,
          fonts: [...new Set(fonts)],
        }
      })
      expect(look).toEqual({
        graphics: 0,
        before: 'none',
        after: 'none',
        background: 'rgba(0, 0, 0, 0)',
        backgroundImage: 'none',
        border: ['none', 'none', 'none', 'none'],
        outline: 'none',
        fonts: [await line.evaluate((el) => getComputedStyle(el).fontFamily)],
      })
      await expect(line).toContainText('Run bookvie-dropbox auth in Terminal.')

      // Plain text: not a control, link, Tab stop or live region.
      const roles = await line.evaluate((el) => ({
        role: el.getAttribute('role'),
        tabindex: el.getAttribute('tabindex'),
        control: el.closest('a, button, label, [role="button"], [role="link"], [contenteditable]') !== null,
        focusable: el.querySelectorAll('a, button, input, select, textarea, [tabindex], [contenteditable]').length,
        live: el.closest('[aria-live], [role="status"], [role="alert"], [role="log"]') !== null,
      }))
      expect(roles).toEqual({ role: null, tabindex: null, control: false, focusable: 0, live: false })
      await exportButton(page).focus()
      await page.keyboard.press('Tab')
      await expect(exportCard(page).locator(':focus')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Restore from file…', exact: true })).toBeFocused()

      // Every other state is `ink-tertiary`, and a change found by the refetch isn't announced.
      writeLocalState(server, localState(UPLOADED_TODAY, '2026-11-02T18:40:00+01:00'))
      await refetch(page)
      await expect(line).toHaveText('Dropbox backup: last upload today at 09:02 · 3 copies in Dropbox')
      await expect(line).toHaveCSS('color', rgbOf(designColor('ink-tertiary')))
      expect(await liveRegionText(page)).not.toContain('Dropbox')

      // Dark: the same roles in their dark values.
      await page.emulateMedia({ colorScheme: 'dark' })
      await expect(line).toHaveCSS('color', rgbOf(designColor('ink-tertiary-dark')))
      writeLocalState(server, localState(failed, '2026-11-02T18:40:00+01:00'))
      await refetch(page)
      await expect(line).toContainText('Dropbox backup: failed today at 09:02 · ')
      await expect(line).toHaveCSS('color', rgbOf(designColor('ink-dark')))

      // axe in both themes, with the two-line Failed reason showing.
      for (const colorScheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme })
        await page.goto(`${server.url}/backup`)
        await expect(dropboxLine(page)).toContainText('failed today at 09:02')
        const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
        expect(violations.map(({ id, nodes }) => `${colorScheme}: ${id} (${nodes.length})`)).toEqual([])
      }

      // Never on Home: its re-entry line shows "Last export" and nothing about Dropbox.
      await page.goto(`${server.url}/`)
      await expect(mainBookCard(page).getByText(/^Last export: /)).toBeVisible()
      await expect(page.getByText(/Dropbox backup/)).toHaveCount(0)
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P1] AC-4 a recorded upload moves the line and not "Last export", Export all data moves "Last export" and not the line, and a restore moves neither', async ({
    page,
  }) => {
    // The browser at 10:00 on 28 Oct 2026; the server's clock at noon that day (--fake-today).
    const uploadedYesterday = autoBackup(
      { outcome: 'uploaded', at: '2026-10-27T09:02:00+01:00' },
      { at: '2026-10-27T09:02:00+01:00', copies: 3 },
    )
    const server = await serverAtFakeToday(
      page,
      'dropbox-line-moves',
      { books: [DUNE] },
      { 'local-state.json': localState(uploadedYesterday, '2026-10-20T18:00:00+02:00') },
    )
    let backups: string | null = null
    try {
      await page.goto(`${server.url}/backup`)
      await expect(lastExportLine(page)).toHaveText('Last export: 8 days ago')

      // A recorded upload, as the backup skill makes it: export_backup for the upload,
      // its content hash from list_local_backups, then record_backup_upload.
      const backup = (await callTool(page.request, server, 'export_backup', { forUpload: true })).structuredContent as {
        path: string
      }
      backups = path.dirname(backup.path)
      const listed = (await callTool(page.request, server, 'list_local_backups')).structuredContent as {
        backups: { path: string; kind: string; contentHash: string }[]
      }
      const daily = listed.backups.find(
        (b) => b.kind === 'daily' && path.basename(b.path) === path.basename(backup.path),
      )
      const recorded = await callTool(page.request, server, 'record_backup_upload', {
        outcome: 'uploaded',
        path: backup.path,
        copies: 2,
        contentHash: daily?.contentHash,
      })
      await refetch(page)

      // The criterion: the upload moves the line, and "Last export" stays.
      await expect(dropboxLine(page)).toHaveText('Dropbox backup: last upload today at 12:00 · 2 copies in Dropbox')
      await expect(lastExportLine(page)).toHaveText('Last export: 8 days ago')
      expect(recorded.isError ?? false).toBe(false)
      expect(JSON.parse(readLocalState(server)).lastExportAt).toBe('2026-10-20T18:00:00+02:00')

      // Export all data moves "Last export" and not the line.
      const download = page.waitForEvent('download')
      await exportButton(page).click()
      await download
      await expect(lastExportLine(page)).toHaveText('Last export: today')
      await expect(dropboxLine(page)).toHaveText('Dropbox backup: last upload today at 12:00 · 2 copies in Dropbox')
      const afterExport = JSON.parse(readLocalState(server))
      expect(afterExport.autoBackup.lastUpload.copies).toBe(2)

      // A restore moves neither, and leaves local-state.json as it was.
      const before = readLocalState(server)
      await restoreFrom(page, zipFile(readFileSync(backup.path)))
      await expect(page).toHaveURL(`${server.url}/`)
      await page.goto(`${server.url}/backup`)
      await expect(lastExportLine(page)).toHaveText('Last export: today')
      await expect(dropboxLine(page)).toHaveText('Dropbox backup: last upload today at 12:00 · 2 copies in Dropbox')
      expect(readLocalState(server)).toBe(before)
    } finally {
      await stopAndRemove(server)
      if (backups !== null) rmSync(backups, { recursive: true, force: true })
    }
  })
})
