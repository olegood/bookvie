// Story 2.2 Restore my library from an export: the Confirm dialog after
// Restore from file… and a file, Cancel and Esc, the busy "Restoring…" button,
// and "Restored." on the launch page. What POST /api/intents/restore does to
// the data folder (staging, validation, the AD-12 order, the AD-4 lock,
// migrations, the byte-identical round trip, faults after the commit) is
// proven at API level (backend/tests/test_restore.py); these tests read what
// the browser shows by role and exact accessible name.
//
// Pinned with Oleg (2026-11-04): confirming closes the dialog and Restore
// from file… itself goes busy as "Restoring…". The request is multipart, with
// an `intent` part holding {} and the zip in a file part named `archive`.
//
// After the four ATDD leaves come the green-phase follow-ups: a fast restore
// never shows "Restoring…", a double confirm sends one request, Esc after
// Cancel changes nothing, a refusal's ink line under Restore, and axe with the
// dialog open in both themes.

import { readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, type Server, startSeededServer, test } from './fixtures.ts'
import { requestsTo } from './intents.ts'
import { DUNE_ID, catalogTitles } from './library.ts'

const RESTORE = 'Restore from file…'
const RESTORING = 'Restoring…'
const REPLACE_ALL = 'Replace all data'
const CONFIRM_HEADING = 'Replace all data with this file?'
const CONFIRM_LINE = 'Your current books, readings and card notes will be replaced.'
const RESTORED = 'Restored.'
const RESTORE_INTENT = '/api/intents/restore'
const RESTORE_INVALID = "This file isn't a bookvie export, or it's damaged. Nothing was changed."
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const NEUROMANCER_ID = '1b6e2c4a-3d5f-4e7a-9b8c-0d1e2f3a4b5c'
const DUNE = { id: DUNE_ID, title: 'Dune', authors: ['Frank Herbert'], pages: 412 }
const NEUROMANCER = { id: NEUROMANCER_ID, title: 'Neuromancer', authors: ['William Gibson'], pages: 271 }
// The library a restore replaces.
const LEFT_HAND = { title: 'The Left Hand of Darkness', authors: ['Ursula K. Le Guin'], pages: 304 }
// Dune is the Main book at p.150; Neuromancer is unread.
const SOURCE_LIBRARY = {
  mainBookId: DUNE_ID,
  books: [{ ...DUNE, readings: [{ currentPage: 150 }] }, NEUROMANCER],
}
const EARLIER_EXPORT = JSON.stringify({ lastExportAt: '2026-10-01T09:30:00+02:00' })

type FilePayload = { name: string; mimeType: string; buffer: Buffer }

// For the dialog alone: never sent, so its bytes don't matter.
const ANY_FILE: FilePayload = {
  name: 'bookvie-export-2026-10-30.zip',
  mimeType: 'application/zip',
  buffer: Buffer.from('PK\x03\x04 a file the dialog never sends'),
}

function restoreButton(page: Page, name = RESTORE) {
  return page.getByRole('main').getByRole('button', { name, exact: true })
}

function confirmDialog(page: Page) {
  return page.getByRole('alertdialog')
}

/** Presses Restore from file… and picks `file` in the chooser it opens. */
async function pickFile(page: Page, file: FilePayload): Promise<void> {
  const chooser = page.waitForEvent('filechooser')
  await restoreButton(page).click()
  await (await chooser).setFiles(file)
}

/** A real export of `server` (Story 2.1), as the browser would have saved it. */
async function exportOf(page: Page, server: Server): Promise<FilePayload> {
  const response = await page.request.get(`${server.url}/api/export`, { headers: { 'X-Bookvie-Export': '1' } })
  return { name: 'bookvie-export-2026-10-30.zip', mimeType: 'application/zip', buffer: await response.body() }
}

/** Every localStorage entry, sorted: theme, Catalog view and (later) sort. */
async function preferences(page: Page): Promise<[string, string][]> {
  return page.evaluate(() => Object.entries(window.localStorage).sort(([a], [b]) => a.localeCompare(b)))
}

test.describe('Story 2.2 Restore my library from an export (ATDD)', () => {
  test('[P1] AC-1 Restore from file… and a file open the Confirm alertdialog, with Cancel focused', async ({
    page,
  }) => {
    await page.goto('/backup')

    // The idle state first, so a disabled button fails here, not as a click
    // timeout (the checklist, "Why E2E leaves start with toBeEnabled").
    await expect(restoreButton(page)).toBeEnabled()

    await pickFile(page, ANY_FILE)
    const dialog = confirmDialog(page)
    await expect(dialog).toHaveAccessibleName(CONFIRM_HEADING)
    await expect(dialog).toHaveAccessibleDescription(CONFIRM_LINE)
    await expect(dialog.getByRole('button')).toHaveText([REPLACE_ALL, 'Cancel'])
    await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
  })

  test('[P1] AC-2 Cancel or Esc in the Confirm dialog changes nothing and returns focus to Restore from file…', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [LEFT_HAND] })
    const sent = requestsTo(page, RESTORE_INTENT)
    await page.goto(`${server.url}/backup`)

    await expect(restoreButton(page)).toBeEnabled()

    await pickFile(page, ANY_FILE)
    await confirmDialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(confirmDialog(page)).toHaveCount(0)
    await expect(restoreButton(page)).toBeFocused()

    // Esc does the same, and the same file can be picked again.
    await pickFile(page, ANY_FILE)
    await expect(confirmDialog(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(confirmDialog(page)).toHaveCount(0)
    await expect(restoreButton(page)).toBeFocused()

    expect(sent).toHaveLength(0)
    expect(await catalogTitles(page, server)).toEqual(['The Left Hand of Darkness'])
    await expect(page.getByRole('status')).toHaveText('')
  })

  test('[P1] AC-4 a restore says "Restored." and opens / on the restored data, keeping Last export and preferences', async ({
    page,
    seededServer,
  }, testInfo) => {
    const source = await seededServer(SOURCE_LIBRARY)
    const archive = await exportOf(page, source)
    const target = await startSeededServer(testInfo, 'restore-target', { books: [LEFT_HAND] }, {
      'local-state.json': EARLIER_EXPORT,
    })
    try {
      const localState = path.join(target.dataDir, 'local-state.json')
      await page.goto(`${target.url}/backup`)
      await page.evaluate(() => {
        window.localStorage.setItem('bookvie.theme', 'dark')
        window.localStorage.setItem('bookvie.catalogView', 'list')
      })
      const preferencesBefore = await preferences(page)

      await expect(restoreButton(page)).toBeEnabled()

      await pickFile(page, archive)
      await confirmDialog(page).getByRole('button', { name: REPLACE_ALL, exact: true }).click()
      await expect(page.getByRole('status')).toHaveText(RESTORED)
      await expect(page).toHaveURL(`${target.url}/`)
      await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
      expect(await catalogTitles(page, target)).toEqual(['Dune', 'Neuromancer'])
      await expect(page.getByRole('main')).toContainText('Neuromancer')
      await expect(page.getByRole('main')).not.toContainText(LEFT_HAND.title)
      await expect(page.getByRole('alert')).toHaveText('')

      // "Last export" and the browser's preferences stay this machine's own (AD-15).
      expect(readFileSync(localState, 'utf8')).toBe(EARLIER_EXPORT)
      expect(await preferences(page)).toEqual(preferencesBefore)
    } finally {
      expect(await target.stop()).toBe('')
      rmSync(target.dataDir, { recursive: true, force: true })
    }
  })

  test('[P2] AC-7 a slow restore shows "Restoring…" on a natively disabled Restore button until it finishes', async ({
    page,
    seededServer,
  }) => {
    const source = await seededServer(SOURCE_LIBRARY)
    const archive = await exportOf(page, source)
    const target = await seededServer({ books: [LEFT_HAND] })
    // Hold the restore until the test lets it go: "slow" without a timer.
    let release!: () => void
    const released = new Promise<void>((resolve) => (release = resolve))
    await page.route(`**${RESTORE_INTENT}`, async (route) => {
      await released
      await route.continue()
    })
    await page.goto(`${target.url}/backup`)

    await expect(restoreButton(page)).toBeEnabled()

    await pickFile(page, archive)
    await confirmDialog(page).getByRole('button', { name: REPLACE_ALL, exact: true }).click()
    const busy = restoreButton(page, RESTORING)
    await expect(busy).toBeDisabled()
    await expect(busy).toHaveJSProperty('disabled', true)
    await expect(busy).toHaveCSS('opacity', '0.6')
    await expect(busy).toHaveCSS('animation-name', 'none')
    await expect(page.getByRole('progressbar')).toHaveCount(0)
    await expect(confirmDialog(page)).toHaveCount(0)

    release()
    await expect(page.getByRole('status')).toHaveText(RESTORED)
    await expect(page.getByRole('button', { name: RESTORING, exact: true })).toHaveCount(0)
  })

  test('[P2] AC-1 Replace all data is button-primary and axe finds nothing with the dialog open, in both themes', async ({
    page,
  }) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await page.goto('/backup')
      await pickFile(page, ANY_FILE)
      const dialog = confirmDialog(page)
      await expect(dialog).toBeVisible()
      if (colorScheme === 'light') {
        await expect(dialog.getByRole('button', { name: REPLACE_ALL, exact: true })).toHaveCSS(
          'background-color',
          'rgb(85, 112, 89)',
        )
      }
      const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
      expect(violations.map(({ id, nodes }) => `${colorScheme}: ${id} (${nodes.length})`)).toEqual([])
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
    }
  })

  test('[P2] AC-2 Esc after Cancel has closed the dialog keeps focus on Restore from file… and announces nothing', async ({
    page,
  }) => {
    await page.goto('/backup')
    await pickFile(page, ANY_FILE)
    await confirmDialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(restoreButton(page)).toBeFocused()

    await page.keyboard.press('Escape')

    await expect(restoreButton(page)).toBeFocused()
    await expect(page.getByRole('status')).toHaveText('')
    await expect(page.getByRole('alert')).toHaveText('')
  })

  test('[P2] AC-7 a fast restore never shows "Restoring…"', async ({ page, seededServer }) => {
    const source = await seededServer(SOURCE_LIBRARY)
    const archive = await exportOf(page, source)
    const target = await seededServer({ books: [LEFT_HAND] })
    await page.goto(`${target.url}/backup`)
    // Record every name a button in `main` takes while the restore runs.
    await page.evaluate(() => {
      const names: string[] = []
      ;(window as unknown as { names: string[] }).names = names
      const main = document.getElementById('main')!
      new MutationObserver(() => {
        for (const button of Array.from(main.querySelectorAll('button'))) names.push(button.textContent ?? '')
      }).observe(main, { subtree: true, childList: true, characterData: true, attributes: true })
    })

    await pickFile(page, archive)
    await confirmDialog(page).getByRole('button', { name: REPLACE_ALL, exact: true }).click()
    await expect(page.getByRole('status')).toHaveText(RESTORED)

    const names = await page.evaluate(() => (window as unknown as { names: string[] }).names)
    expect(names).not.toContain(RESTORING)
  })

  test('[P2] AC-7 a double click on Replace all data sends one restore', async ({ page, seededServer }) => {
    const source = await seededServer(SOURCE_LIBRARY)
    const archive = await exportOf(page, source)
    const target = await seededServer({ books: [LEFT_HAND] })
    const sent = requestsTo(page, RESTORE_INTENT)
    await page.goto(`${target.url}/backup`)

    await pickFile(page, archive)
    await confirmDialog(page).getByRole('button', { name: REPLACE_ALL, exact: true }).dblclick()
    await expect(page.getByRole('status')).toHaveText(RESTORED)

    expect(sent).toHaveLength(1)
    expect(await catalogTitles(page, target)).toEqual(['Dune', 'Neuromancer'])
  })

  test('[P1] a file that isn\'t an export shows the ink line under Restore and returns focus there', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [LEFT_HAND] })
    await page.goto(`${server.url}/backup`)

    await pickFile(page, ANY_FILE)
    await confirmDialog(page).getByRole('button', { name: REPLACE_ALL, exact: true }).click()

    const restoreCard = page.getByRole('region', { name: 'Restore', exact: true })
    await expect(restoreCard.getByText(RESTORE_INVALID, { exact: true })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveText(RESTORE_INVALID)
    await expect(restoreButton(page)).toBeFocused()
    await expect(page).toHaveURL(`${server.url}/backup`)
    expect(await catalogTitles(page, server)).toEqual(['The Left Hand of Darkness'])

    // Picking a file and cancelling keeps the line (Cancel only empties the live regions).
    await pickFile(page, ANY_FILE)
    await expect(restoreCard.getByText(RESTORE_INVALID, { exact: true })).toBeVisible()
    await confirmDialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText('')
    await expect(restoreCard.getByText(RESTORE_INVALID, { exact: true })).toBeVisible()

    // The next confirmed attempt clears it while it runs (held, so the answer can't bring it back yet).
    let release!: () => void
    const released = new Promise<void>((resolve) => (release = resolve))
    await page.route(`**${RESTORE_INTENT}`, async (route) => {
      await released
      await route.continue()
    })
    await pickFile(page, ANY_FILE)
    await confirmDialog(page).getByRole('button', { name: REPLACE_ALL, exact: true }).click()
    await expect(restoreCard.getByText(RESTORE_INVALID, { exact: true })).toHaveCount(0)
    release()
    await expect(restoreCard.getByText(RESTORE_INVALID, { exact: true })).toBeVisible()
  })
})
