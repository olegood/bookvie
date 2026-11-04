// Story 2.3 Refuse damaged, hostile or newer files: how a refused restore shows
// on the Backup page. Which archives are refused, with which code, and that
// nothing changes on disk is proven at API level
// (backend/tests/test_restore_refusals.py); this reads what the browser shows.
//
// AC-5: every refusal (restore_newer_version, restore_unsafe, restore_invalid,
// couldnt_save) is one ink line under Restore, with no red and no icon, and
// focus goes back to Restore from file…. The server owns the copy (AD-9).

import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { Page } from '@playwright/test'
import { expect, type Server, test } from './fixtures.ts'
import { catalogTitles, rgbOf } from './library.ts'
import {
  ANY_FILE,
  RESTORE_INTENT,
  RESTORE_INVALID,
  exportOf,
  restoreButton,
  restoreCard,
  restoreFrom,
  storedZip,
  zipFile,
} from './restore.ts'

const NEWER_VERSION = 'This export is from a newer version of bookvie. Nothing was changed.'
const COULDNT_SAVE = "Couldn't save. Your data wasn't changed."
// --color-ink in the light theme (tokens.css): the failure line is ink, never red.
const INK = rgbOf('#2B2E2A')

// The library a refused restore must leave alone.
const LEFT_HAND = { title: 'The Left Hand of Darkness', authors: ['Ursula K. Le Guin'], pages: 304 }

/** The server's own library.json, parsed: the base for the hand-made archives. */
function libraryOf(server: Server): Record<string, unknown> & { schemaVersion: number } {
  return JSON.parse(readFileSync(path.join(server.dataDir, 'library.json'), 'utf8'))
}

/** The refusal shows as the one ink failure line under Restore, and focus is back on its button. */
async function expectRefusalLine(page: Page, message: string): Promise<void> {
  const line = restoreCard(page).getByText(message, { exact: true })
  await expect(line).toBeVisible()
  await expect(restoreButton(page)).toBeFocused()
  // The explanation line and this one: one failure line, the previous one gone.
  await expect(restoreCard(page).getByRole('paragraph')).toHaveCount(2)
  await expect(line).toHaveCSS('color', INK)
  await expect(restoreCard(page).locator('svg, img')).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveText(message)
}

test.describe('Story 2.3 Refuse damaged, hostile or newer files (ATDD)', () => {
  test.skip('[P1] AC-5 every refusal is one ink line under Restore, and focus returns to Restore from file…', async ({
    page,
    seededServer,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    const server = await seededServer({ books: [LEFT_HAND] })
    const library = libraryOf(server)
    const newer = { ...library, schemaVersion: library.schemaVersion + 1 }
    const refusals: [file: Buffer, message: string][] = [
      [storedZip([['library.json', JSON.stringify(newer)], ['covers/', '']]), NEWER_VERSION],
      [
        storedZip([['library.json', JSON.stringify(library)], ['covers/', ''], ['../evil.jpg', 'x']]),
        RESTORE_INVALID, // restore_unsafe shares restore_invalid's copy
      ],
      [ANY_FILE.buffer, RESTORE_INVALID],
    ]
    await page.goto(`${server.url}/backup`)

    for (const [file, message] of refusals) {
      await restoreFrom(page, zipFile(file))
      await expectRefusalLine(page, message)
      await expect(page).toHaveURL(`${server.url}/backup`)
    }

    // couldnt_save can't be caused from the browser (it is a disk fault; the
    // API test injects it), so the server's 503 answer is played back here.
    const archive = await exportOf(page, server)
    await page.route(`**${RESTORE_INTENT}`, (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: { kind: 'couldnt_save', code: 'couldnt_save', message: COULDNT_SAVE } }),
      }),
    )
    await restoreFrom(page, archive)
    await expectRefusalLine(page, COULDNT_SAVE)

    expect(await catalogTitles(page, server)).toEqual(['The Left Hand of Darkness'])
  })
})
