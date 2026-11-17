// Story 11.3 Show the version on the Backup page, on a production server.
//
// The third Backup card, About this copy, shows the version and the data
// folder from `app-info` (AC-1), a long absolute folder wraps inside it
// (AC-3), it is left out silently while `app-info` is missing and kept after
// a failed refetch (AC-4), it is plain text after the `h1` (AC-5), and Backup
// is otherwise as before (AC-6). The dev lines (AC-2) are in
// about-this-copy-dev.spec.ts, which runs on a `--dev` server.

import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page, Route } from '@playwright/test'
import { ABOUT, aboutCard, exportButton, fulfilAppInfo, serverAppInfo, wrapOf } from './about-this-copy.ts'
import { liveRegionText, watchAppInfo } from './dev-mode.ts'
import { expect, test } from './fixtures.ts'
import { DUNE } from './home.ts'
import { BUNDLE_VERSION, NEWER_VERSION } from './update-notice.ts'

const RESTORE = 'Restore from file…'
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
/** DESIGN.md → typography: `body-sm` and `section-label` are both this sans stack. */
const SANS = 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif'
/** A data folder outside the home folder, as an e2e server on macOS sends it, long enough to wrap. */
const LONG_FOLDER = `/private/var/folders/x8/${'k'.repeat(30)}/T/bookvie-e2e/run-1763380800000/seeded-${'0123456789abcdef'.repeat(6)}-0`

function restoreButton(page: Page): Locator {
  return page.getByRole('main').getByRole('button', { name: RESTORE, exact: true })
}

/** The computed frame of a Backup card: what "the same frame" compares. */
function frameOf(card: Locator): Promise<string> {
  return card.evaluate((element) => {
    const style = getComputedStyle(element)
    return [
      style.backgroundColor,
      style.borderTopWidth,
      style.borderTopStyle,
      style.borderTopColor,
      style.borderRadius,
      style.padding,
      style.maxWidth,
    ].join(' | ')
  })
}

test.describe('Story 11.3 Show the version on the Backup page (ATDD)', () => {
  test('[P0] AC-1 on a production server Backup ends with a third surface card "About this copy" giving the version and the data folder from app-info on two lines, with no commit and no Development server', async ({
    page,
    server,
  }) => {
    const info = await serverAppInfo(page, server.url)
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(`${server.url}/backup`)
    await expect(exportButton(page)).toBeVisible()
    const card = aboutCard(page)
    const version = card.getByText(`bookvie ${info.version}`, { exact: true })

    // The criterion.
    await expect(version).toBeVisible()

    const folder = card.getByText(`Data folder: ${info.dataDir}`, { exact: true })
    await expect(folder).toBeVisible()
    // Two lines: the folder's line starts below the version's.
    const versionBox = (await version.boundingBox())!
    const folderBox = (await folder.boundingBox())!
    expect(folderBox.y).toBeGreaterThanOrEqual(versionBox.y + versionBox.height - 0.5)

    // The heading: "About this copy", shown uppercase in section-label/ink-tertiary.
    const heading = card.getByRole('heading', { level: 2, name: ABOUT, exact: true })
    await expect(heading).toHaveText(ABOUT)
    await expect(heading).toHaveCSS('text-transform', 'uppercase')
    await expect(heading).toHaveCSS('color', 'rgb(102, 105, 97)')
    await expect(heading).toHaveCSS('font-family', SANS)
    await expect(heading).toHaveCSS('font-size', '12px')
    await expect(heading).toHaveCSS('font-weight', '600')
    await expect(heading).toHaveCSS('letter-spacing', '0.96px')
    // Both lines in body-sm/ink-secondary, sans.
    for (const line of [version, folder]) {
      await expect(line).toHaveCSS('color', 'rgb(95, 99, 92)')
      await expect(line).toHaveCSS('font-family', SANS)
      await expect(line).toHaveCSS('font-size', '14px')
      await expect(line).toHaveCSS('font-weight', '400')
    }

    // A third surface card in the same frame as Export, after Restore.
    const exportCard = page.getByRole('main').getByRole('region', { name: 'Export', exact: true })
    const restoreCard = page.getByRole('main').getByRole('region', { name: 'Restore', exact: true })
    await expect(card).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    expect(await frameOf(card)).toBe(await frameOf(exportCard))
    const restoreBox = (await restoreCard.boundingBox())!
    const cardBox = (await card.boundingBox())!
    expect(cardBox.y).toBeGreaterThanOrEqual(restoreBox.y + restoreBox.height)

    // Production: no commit, no Development server.
    await expect(card).not.toContainText('Development server')
    await expect(card).not.toContainText('(')

    // The lines come from app-info: a different answer shows different lines,
    // and a commit is never shown in production even when sent.
    await fulfilAppInfo(page, {
      version: NEWER_VERSION,
      mode: 'production',
      dataDir: '~/bookvie-data',
      commit: 'a1b2c3d',
    })
    await page.reload()
    await expect(card.getByText(`bookvie ${NEWER_VERSION}`, { exact: true })).toBeVisible()
    await expect(card.getByText('Data folder: ~/bookvie-data', { exact: true })).toBeVisible()
    await expect(card).not.toContainText('a1b2c3d')
    await expect(card).not.toContainText('Development server')
  })

  test('[P1] AC-3 a data folder outside the home folder shows as the full absolute path, wrapping anywhere inside the card and never cut short', async ({
    page,
    server,
  }) => {
    await fulfilAppInfo(page, { version: BUNDLE_VERSION, mode: 'production', dataDir: LONG_FOLDER, commit: null })
    await page.goto(`${server.url}/backup`)
    await expect(exportButton(page)).toBeVisible()
    const card = aboutCard(page)
    const folder = card.getByText(`Data folder: ${LONG_FOLDER}`, { exact: true })

    // The criterion.
    await expect(folder).toBeVisible()

    await expect(folder).toHaveCSS('overflow-wrap', 'anywhere')
    await expect(folder).not.toHaveCSS('text-overflow', 'ellipsis')
    const wrap = await wrapOf(folder)
    expect(wrap.lines).toBeGreaterThan(1)
    expect(wrap.overflow).toBe(0)
    // Inside the card, which keeps Export's width (max-width 560px is the content box).
    const cardBox = (await card.boundingBox())!
    const folderBox = (await folder.boundingBox())!
    const exportBox = (await page.getByRole('main').getByRole('region', { name: 'Export', exact: true }).boundingBox())!
    expect(folderBox.x + folderBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width)
    expect(cardBox.width).toBe(exportBox.width)
  })

  test('[P1] AC-4 the card is left out silently while app-info is pending or failing, Export and Restore work as before, and a failed refetch after a success keeps the card as it was', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE] })
    const seen = watchAppInfo(page)
    const failures = () => seen.filter((answer) => answer.status === 500).length
    let answer: 'pass' | 'fail' | 'hold' = 'pass'
    const held: Route[] = []
    await page.route('**/api/views/app-info', (route) => {
      if (answer === 'pass') return route.continue()
      if (answer === 'fail') return route.fulfill({ status: 500, body: '' })
      held.push(route)
    })
    await page.goto(`${server.url}/backup`)
    await expect(exportButton(page)).toBeVisible()
    const card = aboutCard(page)

    // The criterion: after a success, a refetch that fails keeps the card.
    await expect(card).toBeVisible()

    const shown = await card.textContent()
    answer = 'fail'
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect.poll(failures).toBeGreaterThan(0)
    await expect(card).toBeVisible()
    await expect(card).toHaveText(shown ?? '')
    expect(await liveRegionText(page)).toBe('')

    // Not loaded yet: no card, nothing said.
    answer = 'hold'
    await page.reload()
    await expect(exportButton(page)).toBeVisible()
    await expect.poll(() => held.length).toBeGreaterThan(0)
    await expect(card).toHaveCount(0)
    await expect(page.getByRole('main').getByRole('heading')).toHaveText(['Backup'])
    expect(await liveRegionText(page)).toBe('')

    // Never loads: still no card, nothing said.
    const failedBefore = failures()
    answer = 'fail'
    for (const route of held.splice(0)) await route.fulfill({ status: 500, body: '' })
    await expect.poll(failures).toBeGreaterThan(failedBefore)
    await expect(card).toHaveCount(0)
    await expect(page.getByRole('main')).not.toContainText("Couldn't")
    expect(await liveRegionText(page)).toBe('')

    // Export and Restore work as before.
    const download = page.waitForEvent('download')
    await exportButton(page).click()
    await download
    await expect(page.getByText('Last export: today', { exact: true })).toBeVisible()
    const chooser = page.waitForEvent('filechooser')
    await restoreButton(page).click()
    await chooser
  })

  test('[P1] AC-5 the card is plain read-only text with no copy button and no Tab stop, the headings run h1 Backup then h2 About this copy, and axe passes in light and dark', async ({
    page,
    server,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(`${server.url}/backup`)
    await expect(exportButton(page)).toBeVisible()
    const headings = page.getByRole('main').getByRole('heading')

    // The criterion.
    await expect(headings).toHaveText(['Backup', ABOUT])

    expect(await headings.evaluateAll((elements) => elements.map((element) => element.localName))).toEqual(['h1', 'h2'])
    const card = aboutCard(page)
    await expect(card.getByRole('button')).toHaveCount(0)
    await expect(card.getByRole('link')).toHaveCount(0)
    await expect(card.locator('input, select, textarea, [tabindex], [contenteditable]')).toHaveCount(0)
    // Tab from Restore, the last control, never lands in the card.
    await restoreButton(page).focus()
    await page.keyboard.press('Tab')
    expect(await card.evaluate((element) => element.contains(document.activeElement))).toBe(false)

    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await page.goto(`${server.url}/backup`)
      await expect(card.getByRole('heading', { level: 2, name: ABOUT, exact: true })).toBeVisible()
      const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
      expect(violations.map(({ id, nodes }) => `${colorScheme}: ${id} (${nodes.length})`)).toEqual([])
    }
  })

  test('[P1] AC-6 with the card shown, Backup keeps its Export and Restore cards first, its focused h1, its title and its silent live regions', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE] })
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(`${server.url}/catalog`)
    await page.getByRole('banner').getByRole('link', { name: 'Backup', exact: true }).click()
    await expect(exportButton(page)).toBeVisible()
    const regions = page.getByRole('main').getByRole('region')

    // The criterion: the card is added after the two existing cards.
    await expect(regions).toHaveCount(3)

    await expect(regions.nth(0)).toHaveAccessibleName('Export')
    await expect(regions.nth(1)).toHaveAccessibleName('Restore')
    await expect(regions.nth(2)).toHaveAccessibleName(ABOUT)
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
    await expect(page).toHaveTitle('Backup — bookvie')
    expect(await liveRegionText(page)).toBe('')
    await expect(exportButton(page)).toBeEnabled()
    await expect(exportButton(page)).toHaveCSS('background-color', 'rgb(85, 112, 89)')
    await expect(restoreButton(page)).toBeEnabled()
    await expect(restoreButton(page)).toHaveCSS('background-color', 'rgb(250, 249, 246)')
    await expect(page.getByText('No export yet', { exact: true })).toHaveCSS('color', 'rgb(102, 105, 97)')
  })
})
