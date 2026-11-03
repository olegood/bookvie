// Story 2.1 Export all data with one click: the Backup nav item and page
// (UX-DR53), the Export and Restore cards with the "Last export" line, and the
// busy Export button. What GET /api/export sends and records (zip contents,
// the AD-4 lock, local-state.json, aborted and HEAD requests, couldnt_export)
// is proven at API level (backend/tests/test_export.py); these tests read what
// the browser shows by role and exact accessible name.
//
// The page is /backup. "Last export" comes from local-state.json in the data
// folder, {"lastExportAt": "<ISO-8601>"}; a test that needs an earlier export
// writes that file before its server starts (serverWithLastExport).

import { rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { Page, TestInfo } from '@playwright/test'
import { runDir } from './guard.ts'
import { expect, freePort, type Server, seedLibrary, startServer, test } from './fixtures.ts'

const EXPORT_ALL = 'Export all data'
const EXPORTING = 'Exporting…'
const RESTORE = 'Restore from file…'

const DUNE = { title: 'Dune', authors: ['Frank Herbert'], pages: 412 }

/** Local noon `days` calendar days ago, as an ISO-8601 instant (TZ is Europe/Madrid). */
function localNoonDaysAgo(days: number): string {
  const day = new Date()
  day.setDate(day.getDate() - days)
  day.setHours(12, 0, 0, 0)
  return day.toISOString()
}

/**
 * Seeds a fresh data dir with `local-state.json` already holding
 * `lastExportAt`, then starts a server on it. The caller stops it.
 */
async function serverWithLastExport(testInfo: TestInfo, lastExportAt: string): Promise<Server> {
  const dataDir = path.join(runDir(process.env.BOOKVIE_E2E_RUN_ID!), `last-export-${testInfo.testId}`)
  rmSync(dataDir, { recursive: true, force: true })
  seedLibrary(dataDir, { books: [DUNE] })
  writeFileSync(path.join(dataDir, 'local-state.json'), JSON.stringify({ lastExportAt }))
  return startServer(dataDir, { port: await freePort() })
}

function exportButton(page: Page, name = EXPORT_ALL) {
  return page.getByRole('button', { name, exact: true })
}

test.describe('Story 2.1 Export all data with one click (ATDD)', () => {
  test.skip('[P1] AC-1 the top nav ends with Backup, which opens the Backup page with its h1', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('banner').getByRole('navigation')

    await expect(nav.getByRole('link')).toHaveText(['Catalog', 'Backup'])

    const backup = nav.getByRole('link', { name: 'Backup', exact: true })
    await backup.click()
    await expect(page).toHaveURL(/\/backup$/)
    await expect(backup).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Catalog', exact: true })).not.toHaveAttribute('aria-current')
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toHaveText(['Backup'])
    await expect(heading).toBeFocused()
    await expect(page).toHaveTitle('Backup — bookvie')
  })

  test.skip('[P2] AC-2 the Backup page shows the Export and Restore cards, with "No export yet" or "Last export: N days ago"', async ({
    page,
    seededServer,
  }, testInfo) => {
    const fresh = await seededServer({ books: [DUNE] })
    await page.goto(`${fresh.url}/backup`)

    await expect(exportButton(page)).toBeVisible()

    await expect(page.getByText('No export yet', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: RESTORE, exact: true })).toBeVisible()
    await expect(page.getByText(/^Last export:/)).toHaveCount(0)

    const earlier = await serverWithLastExport(testInfo, localNoonDaysAgo(3))
    try {
      await page.goto(`${earlier.url}/backup`)
      await expect(page.getByText('Last export: 3 days ago', { exact: true })).toBeVisible()
      await expect(page.getByText('No export yet', { exact: true })).toHaveCount(0)
    } finally {
      expect(await earlier.stop()).toBe('')
      rmSync(earlier.dataDir, { recursive: true, force: true })
    }
  })

  test.skip('[P2] AC-4 a slow export shows "Exporting…" on a natively disabled button at 60% opacity, with no spinner, until it finishes', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE] })
    // Hold the export until the test lets it go: "slow" without a timer.
    let release!: () => void
    const released = new Promise<void>((resolve) => (release = resolve))
    await page.route('**/api/export', async (route) => {
      await released
      await route.continue()
    })
    await page.goto(`${server.url}/backup`)

    await expect(exportButton(page)).toBeEnabled()

    await exportButton(page).click()
    const busy = exportButton(page, EXPORTING)
    await expect(busy).toBeDisabled()
    await expect(busy).toHaveJSProperty('disabled', true)
    await expect(busy).toHaveCSS('opacity', '0.6')
    await expect(busy).toHaveCSS('animation-name', 'none')
    await expect(page.getByRole('progressbar')).toHaveCount(0)

    const download = page.waitForEvent('download')
    release()
    await download
    await expect(exportButton(page)).toBeEnabled()
    await expect(exportButton(page)).toHaveCSS('opacity', '1')
    await expect(exportButton(page, EXPORTING)).toHaveCount(0)
  })
})
