// Story 11.3 Show the version on the Backup page: test automation after the
// story was done, beside the ATDD leaves in about-this-copy.spec.ts and
// about-this-copy-dev.spec.ts. The card follows bookvie's Theme over the OS in
// dark, its two lines sit as one block a card gap below the heading, a dev
// line and a changed version both come through a focus refetch, the real
// server's folder shows as its absolute path, forced colors keep it readable,
// a screen reader reads heading then lines, and Backup's couldn't-load state
// shows no card.

import { realpathSync } from 'node:fs'
import type { Locator, Page } from '@playwright/test'
import { ABOUT, aboutCard, exportButton, serverAppInfo } from './about-this-copy.ts'
import { liveRegionText, systemColor, watchAppInfo } from './dev-mode.ts'
import { expect, test } from './fixtures.ts'
import { answerAppInfo, INK_SECONDARY_DARK, rgbOf, type AppInfo, type AppInfoAnswer } from './library.ts'
import { BUNDLE_VERSION, focusWindow, NEWER_VERSION, noticeText } from './update-notice.ts'

/** DESIGN.md ink-tertiary, dark theme (tokens.css --color-ink-tertiary under dark). */
const INK_TERTIARY_DARK = rgbOf('#9A9E94')
/** DESIGN.md surface, dark theme. */
const SURFACE_DARK = rgbOf('#222520')
/** DESIGN.md line, dark theme. */
const LINE_DARK = rgbOf('#343831')
/** DESIGN.md space-3: the Backup card's gap between its blocks. */
const CARD_GAP = 12
const COULDNT_LOAD = "Couldn't load. Is bookvie still running?"
const PRODUCTION: AppInfo = { version: BUNDLE_VERSION, mode: 'production', dataDir: '~/bookvie-data', commit: null }
const DEV: AppInfo = { version: BUNDLE_VERSION, mode: 'dev', dataDir: '~/bookvie-data-dev', commit: 'a1b2c3d' }

function heading(card: Locator): Locator {
  return card.getByRole('heading', { level: 2, name: ABOUT, exact: true })
}

/** Picks one of the Theme toggle's options, as a person would. */
async function chooseTheme(page: Page, name: 'Light' | 'Dark' | 'System'): Promise<void> {
  const option = page.getByRole('group', { name: 'Theme' }).getByRole('button', { name, exact: true })
  await option.click()
  await expect(option).toHaveAttribute('aria-pressed', 'true')
}

test.describe('Story 11.3 Show the version on the Backup page (automate)', () => {
  test('[P2] AC-1 in dark the card is surface-dark with a line-dark border, its heading ink-tertiary-dark and its lines ink-secondary-dark, under Theme System with OS dark and Theme Dark with OS light', async ({
    page,
    server,
  }) => {
    await answerAppInfo(page, () => PRODUCTION)
    const card = aboutCard(page)
    const version = card.getByText(`bookvie ${BUNDLE_VERSION}`, { exact: true })
    const folder = card.getByText('Data folder: ~/bookvie-data', { exact: true })
    const expectDark = async (how: string) => {
      await expect(card, how).toHaveCSS('background-color', SURFACE_DARK)
      await expect(card, how).toHaveCSS('border-top-color', LINE_DARK)
      await expect(heading(card), how).toHaveCSS('color', INK_TERTIARY_DARK)
      await expect(version, how).toHaveCSS('color', INK_SECONDARY_DARK)
      await expect(folder, how).toHaveCSS('color', INK_SECONDARY_DARK)
    }

    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto(`${server.url}/backup`)
    await expect(version).toBeVisible()
    await expectDark('Theme System, OS dark')

    await page.emulateMedia({ colorScheme: 'light' })
    await chooseTheme(page, 'Dark')
    await expectDark('Theme Dark, OS light')
  })

  test('[P2] AC-1 the two lines read as one block: line 1 starts one card gap (12px) below the heading, and line 2 sits directly under line 1', async ({
    page,
    server,
  }) => {
    await answerAppInfo(page, () => PRODUCTION)
    await page.goto(`${server.url}/backup`)
    const card = aboutCard(page)
    const version = card.getByText(`bookvie ${BUNDLE_VERSION}`, { exact: true })
    const folder = card.getByText('Data folder: ~/bookvie-data', { exact: true })
    await expect(folder).toBeVisible()

    const headingBox = (await heading(card).boundingBox())!
    const versionBox = (await version.boundingBox())!
    const folderBox = (await folder.boundingBox())!
    expect(versionBox.y - (headingBox.y + headingBox.height)).toBeCloseTo(CARD_GAP, 0)
    expect(folderBox.y - (versionBox.y + versionBox.height)).toBeCloseTo(0, 0)
  })

  test('[P2] AC-2 a dev line 1 stays as it was, and nothing is said, when a focus refetch of app-info fails', async ({
    page,
    server,
  }) => {
    const seen = watchAppInfo(page)
    const failures = () => seen.filter((answer) => answer.status === 500).length
    let answer: AppInfoAnswer = DEV
    await answerAppInfo(page, () => answer)
    await page.goto(`${server.url}/backup`)
    const card = aboutCard(page)
    const line = card.getByText(`bookvie ${BUNDLE_VERSION} (a1b2c3d) · Development server`, { exact: true })
    await expect(line).toBeVisible()

    answer = 'fail'
    await focusWindow(page)
    await expect.poll(failures).toBeGreaterThan(0)

    await expect(line).toBeVisible()
    await expect(card.getByText('Data folder: ~/bookvie-data-dev', { exact: true })).toBeVisible()
    expect(await liveRegionText(page)).toBe('')
  })

  test("[P2] AC-3 on the real production server the folder line is the server's own data folder as a full absolute path", async ({
    page,
    server,
  }) => {
    const info = await serverAppInfo(page, server.url)
    // An e2e data folder is a temp folder outside the home folder, so the server sends it whole.
    expect(info.dataDir).toBe(realpathSync(server.dataDir))
    expect(info.dataDir.startsWith('/')).toBe(true)

    await page.goto(`${server.url}/backup`)

    await expect(aboutCard(page).getByText(`Data folder: ${info.dataDir}`, { exact: true })).toBeVisible()
  })

  test('[P2] AC-4 a tab left open reads the new version after a focus refetch answers it', async ({ page, server }) => {
    const seen = watchAppInfo(page)
    let answer: AppInfo = PRODUCTION
    await answerAppInfo(page, () => answer)
    await page.goto(`${server.url}/backup`)
    const card = aboutCard(page)
    await expect(card.getByText(`bookvie ${BUNDLE_VERSION}`, { exact: true })).toBeVisible()

    answer = { ...PRODUCTION, version: NEWER_VERSION }
    const before = seen.length
    await focusWindow(page)
    await expect.poll(() => seen.length).toBeGreaterThan(before)

    await expect(card.getByText(`bookvie ${NEWER_VERSION}`, { exact: true })).toBeVisible()
    await expect(card).not.toContainText(BUNDLE_VERSION)
    // Nothing complains. Story 11.4's update notice announces its own sentence
    // after the tick, since NEWER_VERSION isn't the bundle's version; that is the only
    // text the live regions may hold.
    expect((await liveRegionText(page)).replace(noticeText(NEWER_VERSION), '')).toBe('')
  })

  test('[P2] AC-5 under forced colors, light and dark, the heading and both lines are CanvasText and the card keeps a visible 1px border', async ({
    page,
    server,
  }) => {
    await answerAppInfo(page, () => PRODUCTION)
    const card = aboutCard(page)
    const version = card.getByText(`bookvie ${BUNDLE_VERSION}`, { exact: true })
    const folder = card.getByText('Data folder: ~/bookvie-data', { exact: true })

    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme, forcedColors: 'active' })
      await page.goto(`${server.url}/backup`)
      await expect(folder).toBeVisible()
      const canvasText = await systemColor(page, 'CanvasText')
      const canvas = await systemColor(page, 'Canvas')

      for (const text of [heading(card), version, folder]) {
        await expect(text, colorScheme).toHaveCSS('color', canvasText)
      }
      for (const side of ['top', 'right', 'bottom', 'left']) {
        await expect(card, `${colorScheme} ${side}`).toHaveCSS(`border-${side}-width`, '1px')
        await expect(card, `${colorScheme} ${side}`).toHaveCSS(`border-${side}-style`, 'solid')
        await expect(card, `${colorScheme} ${side}`).not.toHaveCSS(`border-${side}-color`, canvas)
      }
    }
  })

  test('[P2] AC-5 a screen reader reads the card as its h2 "About this copy", then the version line, then the folder line', async ({
    page,
    server,
  }) => {
    await answerAppInfo(page, () => DEV)
    await page.goto(`${server.url}/backup`)

    await expect(aboutCard(page)).toMatchAriaSnapshot(`
      - region "About this copy":
        - heading "About this copy" [level=2]
        - paragraph: bookvie ${BUNDLE_VERSION} (a1b2c3d) · Development server
        - paragraph: "Data folder: ~/bookvie-data-dev"
    `)
  })

  test("[P2] AC-4 Backup's couldn't-load state shows no About this copy card, even with app-info loaded", async ({
    page,
    server,
  }) => {
    const seen = watchAppInfo(page)
    await answerAppInfo(page, () => PRODUCTION)
    await page.route('**/api/views/backup', (route) =>
      route.fulfill({ status: 503, contentType: 'text/plain', body: 'Service Unavailable' }),
    )
    await page.goto(`${server.url}/backup`)
    await expect(page.getByRole('main').getByText(COULDNT_LOAD, { exact: true })).toBeVisible()
    await expect.poll(() => seen.some((answer) => answer.status === 200)).toBe(true)

    await expect(aboutCard(page)).toHaveCount(0)
    await expect(page.getByRole('main')).not.toContainText(`bookvie ${BUNDLE_VERSION}`)
    await expect(exportButton(page)).toHaveCount(0)
  })
})
