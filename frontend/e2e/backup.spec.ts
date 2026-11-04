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

import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import type { Page, TestInfo } from '@playwright/test'
import { runDir } from './guard.ts'
import { expect, freePort, type Server, seedLibrary, startServer, test } from './fixtures.ts'

const EXPORT_ALL = 'Export all data'
const EXPORTING = 'Exporting…'
const RESTORE = 'Restore from file…'

const DUNE = { title: 'Dune', authors: ['Frank Herbert'], pages: 412 }
const RESTORE_EXPLANATION = 'Replaces everything here with the contents of an export file.'
const COULDNT_EXPORT = "Couldn't export. Your data wasn't changed."
const COULDNT_LOAD = "Couldn't load. Is bookvie still running?"
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04])
const COVER_FILE = 'covers/dune-cover.jpg'

/** Local noon `days` calendar days ago, as an ISO-8601 instant (TZ is Europe/Madrid). */
function localNoonDaysAgo(days: number): string {
  const day = new Date()
  day.setDate(day.getDate() - days)
  day.setHours(12, 0, 0, 0)
  return day.toISOString()
}

/**
 * Seeds a fresh data dir with `local-state.json` already holding
 * `lastExportAt`, then starts a server on it. The caller stops it. With
 * `cover`, Dune references `covers/dune-cover.jpg`, written with those bytes.
 */
async function serverWithLastExport(
  testInfo: TestInfo,
  lastExportAt: string,
  { cover }: { cover?: Buffer } = {},
): Promise<Server> {
  const dataDir = path.join(runDir(process.env.BOOKVIE_E2E_RUN_ID!), `last-export-${testInfo.testId}`)
  rmSync(dataDir, { recursive: true, force: true })
  seedLibrary(dataDir, { books: [cover ? { ...DUNE, coverFile: COVER_FILE } : DUNE] })
  if (cover) {
    mkdirSync(path.join(dataDir, 'covers'), { recursive: true })
    writeFileSync(path.join(dataDir, COVER_FILE), cover)
  }
  writeFileSync(path.join(dataDir, 'local-state.json'), JSON.stringify({ lastExportAt }))
  return startServer(dataDir, { port: await freePort() })
}

/** Today's local date as the browser names the download. */
function localDate(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function exportButton(page: Page, name = EXPORT_ALL) {
  return page.getByRole('button', { name, exact: true })
}

test.describe('Story 2.1 Export all data with one click (ATDD)', () => {
  test('[P1] AC-1 the top nav ends with Backup, which opens the Backup page with its h1', async ({ page }) => {
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

  test('[P2] AC-2 the Backup page shows the Export and Restore cards, with "No export yet" or "Last export: N days ago"', async ({
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

  test('[P2] AC-4 a slow export shows "Exporting…" on a natively disabled button at 60% opacity, with no spinner, until it finishes', async ({
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
    // Natively disabled while busy, it loses focus; it gets it back once done.
    await expect(exportButton(page)).toBeFocused()
  })

  test('[P2] AC-4 a double-click before the button goes busy starts one export, not two', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE] })
    // Hold the export so both clicks land while the first one is in flight.
    let requests = 0
    let release!: () => void
    const released = new Promise<void>((resolve) => (release = resolve))
    await page.route('**/api/export', async (route) => {
      requests++
      await released
      await route.continue()
    })
    await page.goto(`${server.url}/backup`)

    // Both clicks land well inside BUSY_DELAY_MS, while the button is still enabled.
    await exportButton(page).dblclick()
    await expect.poll(() => requests).toBe(1)

    const download = page.waitForEvent('download')
    release()
    await download
    await expect(page.getByText('Last export: today', { exact: true })).toBeVisible()
    expect(requests).toBe(1)
  })

  test('[P2] AC-2 the Restore card explains itself, and its button is unavailable until restore arrives', async ({
    page,
  }) => {
    await page.goto('/backup')

    await expect(page.getByText(RESTORE_EXPLANATION, { exact: true })).toBeVisible()
    const restore = page.getByRole('button', { name: RESTORE, exact: true })
    await expect(restore).toHaveAttribute('aria-disabled', 'true')
    await expect(restore).toHaveAccessibleDescription('Restore arrives in the next update.')
    await expect(restore).toHaveJSProperty('disabled', false)
    // Export is the only natively disabled control, and only while busy.
    await expect(page.locator(':disabled')).toHaveCount(0)
  })

  test('[P2] AC-2 the Export and Restore buttons and the Last export line use their tokens', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/backup')

    await expect(exportButton(page)).toHaveCSS('background-color', 'rgb(85, 112, 89)')
    await expect(page.getByRole('button', { name: RESTORE, exact: true })).toHaveCSS(
      'background-color',
      'rgb(250, 249, 246)',
    )
    await expect(page.getByText('No export yet', { exact: true })).toHaveCSS('color', 'rgb(102, 105, 97)')
  })

  test('[P1] AC-3 AC-5 a real export downloads bookvie-export-<today>.zip, then reads "Last export: today" in every browser', async ({
    page,
    browser,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE] })
    await page.goto(`${server.url}/backup`)
    await expect(page.getByText('No export yet', { exact: true })).toBeVisible()

    const download = page.waitForEvent('download')
    await exportButton(page).click()
    const file = await download

    expect(file.suggestedFilename()).toBe(`bookvie-export-${localDate()}.zip`)
    const saved = await file.path()
    expect(readFileSync(saved).subarray(0, 4)).toEqual(ZIP_SIGNATURE)
    await expect(page.getByText('Last export: today', { exact: true })).toBeVisible()
    await expect(page.getByText('No export yet', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('status')).toHaveText('')
    await expect(page.getByRole('alert')).toHaveText('')

    // A second browser context, with its own localStorage, reads the same record.
    const other = await browser.newContext()
    try {
      const second = await other.newPage()
      await second.goto(`${server.url}/backup`)
      await expect(second.getByText('Last export: today', { exact: true })).toBeVisible()
    } finally {
      await other.close()
    }
  })

  test('[P2] AC-4 a fast export never shows "Exporting…"', async ({ page, seededServer }) => {
    const server = await seededServer({ books: [DUNE] })
    await page.goto(`${server.url}/backup`)
    // Record every name the button takes while the export runs.
    await page.evaluate(() => {
      const names: string[] = []
      ;(window as unknown as { names: string[] }).names = names
      const main = document.getElementById('main')!
      new MutationObserver(() => {
        for (const button of Array.from(main.querySelectorAll('button'))) names.push(button.textContent ?? '')
      }).observe(main, { subtree: true, childList: true, characterData: true, attributes: true })
    })

    const download = page.waitForEvent('download')
    await exportButton(page).click()
    await download
    await expect(page.getByText('Last export: today', { exact: true })).toBeVisible()

    const names = await page.evaluate(() => (window as unknown as { names: string[] }).names)
    expect(names).not.toContain(EXPORTING)
    await expect(exportButton(page)).toBeEnabled()
  })

  test("[P1] AC-6 an export that fails shows the couldn't-export line and keeps Last export", async ({
    page,
  }, testInfo) => {
    test.skip(process.getuid?.() === 0, 'root can read a chmod 000 cover')
    const server = await serverWithLastExport(testInfo, localNoonDaysAgo(3), { cover: Buffer.from('not read') })
    const cover = path.join(server.dataDir, COVER_FILE)
    try {
      await page.goto(`${server.url}/backup`)
      await expect(page.getByText('Last export: 3 days ago', { exact: true })).toBeVisible()
      chmodSync(cover, 0o000)

      await exportButton(page).click()

      const card = page.getByRole('region', { name: 'Export' })
      await expect(card.getByText(COULDNT_EXPORT, { exact: true })).toBeVisible()
      await expect(page.getByRole('alert')).toHaveText(COULDNT_EXPORT)
      await expect(page.getByRole('status')).toHaveText('')
      await expect(page.getByText('Last export: 3 days ago', { exact: true })).toBeVisible()
      await expect(exportButton(page)).toBeEnabled()

      // Once the cover is readable again, a successful export clears the failure.
      chmodSync(cover, 0o644)
      const download = page.waitForEvent('download')
      await exportButton(page).click()
      await download
      await expect(card.getByText(COULDNT_EXPORT, { exact: true })).toHaveCount(0)
      await expect(page.getByRole('alert')).toHaveText('')
      await expect(page.getByText('Last export: today', { exact: true })).toBeVisible()
    } finally {
      chmodSync(cover, 0o644)
      expect(await server.stop()).toBe('')
      rmSync(server.dataDir, { recursive: true, force: true })
    }
  })

  test("[P1] a failed first load of the Backup page shows Couldn't load with Try again, which refetches", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE] })
    let down = true
    await page.route('**/api/views/backup', async (route) => {
      if (!down) return route.continue()
      down = false
      await route.fulfill({ status: 503, contentType: 'text/plain', body: 'Service Unavailable' })
    })

    await page.goto(`${server.url}/backup`)
    await expect(page.getByRole('alert')).toHaveText(COULDNT_LOAD)
    await expect(page.getByRole('main').getByText(COULDNT_LOAD, { exact: true })).toBeVisible()
    await expect(exportButton(page)).toHaveCount(0)

    await page.getByRole('button', { name: 'Try again', exact: true }).click()
    await expect(exportButton(page)).toBeVisible()
    await expect(page.getByText('No export yet', { exact: true })).toBeVisible()
    await expect(page.getByText(COULDNT_LOAD)).toHaveCount(0)
  })

  test('[P2] AC-2 axe finds nothing on /backup in both themes, with and without a failure line', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE] })
    await page.route('**/api/export', (route) =>
      route.fulfill({
        status: 503,
        json: { error: { kind: 'couldnt_export', code: 'couldnt_export', message: COULDNT_EXPORT } },
      }),
    )
    const axe = async (where: string): Promise<string[]> => {
      const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
      return violations.map(({ id, nodes }) => `${where}: ${id} (${nodes.length})`)
    }

    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await page.goto(`${server.url}/backup`)
      await expect(exportButton(page)).toBeVisible()
      expect(await axe(`${colorScheme} page`)).toEqual([])

      await exportButton(page).click()
      await expect(page.getByText(COULDNT_EXPORT, { exact: true })).toBeVisible()
      expect(await axe(`${colorScheme} failure`)).toEqual([])
    }
  })
})
