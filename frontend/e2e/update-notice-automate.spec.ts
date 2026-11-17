// Story 11.4 Tell me when a tab is older than the app: test automation after
// the story was done, beside the ATDD leaves in update-notice.spec.ts. The
// band follows bookvie's Theme over the OS in dark, keeps its 10px padding and
// stays whole at a narrow width, shows without amber beside the DEV pill,
// stays on Book detail and is inert under a modal panel, is gone after Reload
// once the server answers the bundle's version, appears (announced once) when
// app-info first failed and then loads, reads in order in the banner, keeps a
// visible Reload border under forced colors, and passes axe in light and dark.

import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { aboutCard } from './about-this-copy.ts'
import { noteField, recordStatus, statusTexts } from './card-note-add-another.ts'
import { addCardNote, cardNotePanel } from './card-note-keys.ts'
import { devPill, liveRegionText, systemColor, watchAppInfo } from './dev-mode.ts'
import { expect, test } from './fixtures.ts'
import { LEFT_HAND, mainAt, mainBookCard } from './home.ts'
import { rgbOf } from './library.ts'
import { afterAnnounceDelay } from './stats.ts'
import {
  type Answer,
  answerAppInfo,
  anyNoticeSentence,
  backgroundsIn,
  BUNDLE_VERSION,
  focusWindow,
  NEWER_VERSION,
  noticeBand,
  noticeSentence,
  noticeText,
  productionInfo,
  reloadButton,
} from './update-notice.ts'

/** DESIGN.md dark tokens: surface, line, ink. */
const SURFACE_DARK = rgbOf('#222520')
const LINE_DARK = rgbOf('#343831')
const INK_DARK = rgbOf('#ECEAE3')
/** Dev amber, light and dark: the DEV pill's fill (AppShell.module.css `.devPill`). */
const AMBER = [rgbOf('#8C5E0E'), rgbOf('#EBC27A')]
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

function exportButton(page: Page) {
  return page.getByRole('main').getByRole('button', { name: 'Export all data', exact: true })
}

async function chooseTheme(page: Page, name: 'Light' | 'Dark' | 'System'): Promise<void> {
  const option = page.getByRole('group', { name: 'Theme' }).getByRole('button', { name, exact: true })
  await option.click()
  await expect(option).toHaveAttribute('aria-pressed', 'true')
}

test.describe('Story 11.4 Tell me when a tab is older than the app (automate)', () => {
  test('[P2] AC-3 dark: the band is surface-dark with a line-dark hairline and the sentence ink-dark, under Theme System with OS dark and Theme Dark with OS light', async ({
    page,
    server,
  }) => {
    await answerAppInfo(page, () => productionInfo(NEWER_VERSION))
    const band = noticeBand(page)
    const sentence = noticeSentence(page, NEWER_VERSION)

    for (const [os, theme] of [
      ['dark', 'System'],
      ['light', 'Dark'],
    ] as const) {
      await page.emulateMedia({ colorScheme: os })
      await page.goto(`${server.url}/backup`)
      await expect(exportButton(page)).toBeVisible()
      await chooseTheme(page, theme)
      const label = `OS ${os}, Theme ${theme}`
      await expect(band, label).toHaveCSS('background-color', SURFACE_DARK)
      await expect(band, label).toHaveCSS('border-bottom-color', LINE_DARK)
      await expect(sentence, label).toHaveCSS('color', INK_DARK)
    }
  })

  test('[P2] AC-3 the band has 10px vertical padding, and at a narrow width the sentence and Reload stay inside it with nothing overflowing', async ({
    page,
    server,
  }) => {
    await answerAppInfo(page, () => productionInfo(NEWER_VERSION))
    await page.goto(`${server.url}/backup`)
    await expect(exportButton(page)).toBeVisible()
    const band = noticeBand(page)
    await expect(band).toHaveCSS('padding-top', '10px')
    await expect(band).toHaveCSS('padding-bottom', '10px')

    await page.setViewportSize({ width: 360, height: 640 })
    const sentence = noticeSentence(page, NEWER_VERSION)
    await expect(sentence).toBeVisible()
    const bandBox = (await band.boundingBox())!
    for (const [name, part] of [
      ['sentence', sentence],
      ['Reload', reloadButton(page)],
    ] as const) {
      const box = (await part.boundingBox())!
      expect(box.x, name).toBeGreaterThanOrEqual(bandBox.x)
      expect(box.x + box.width, name).toBeLessThanOrEqual(bandBox.x + bandBox.width + 0.5)
      expect(box.y, name).toBeGreaterThanOrEqual(bandBox.y)
      expect(box.y + box.height, name).toBeLessThanOrEqual(bandBox.y + bandBox.height + 0.5)
    }
    expect(await band.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  })

  test('[P2] AC-3 beside the DEV pill the notice shows the same way and paints no amber, while the pill keeps its amber', async ({
    page,
    server,
  }) => {
    await answerAppInfo(page, () => ({ ...productionInfo(NEWER_VERSION), mode: 'dev', dataDir: '~/bookvie-data-dev' }))
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(`${server.url}/backup`)
    await expect(exportButton(page)).toBeVisible()

    await expect(devPill(page)).toBeVisible()
    await expect(noticeSentence(page, NEWER_VERSION)).toBeVisible()
    await expect(reloadButton(page)).toBeVisible()
    const painted = await backgroundsIn(noticeBand(page))
    expect(painted.filter((entry) => AMBER.some((color) => entry.endsWith(color)))).toEqual([])
    await expect(devPill(page)).toHaveCSS('background-color', AMBER[0])
  })

  test('[P2] AC-4 with a modal side panel open the notice is inert, and it stays on Book detail reached by a link', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(150))
    await answerAppInfo(page, () => productionInfo(NEWER_VERSION))
    await page.goto(server.url)
    const sentence = noticeSentence(page, NEWER_VERSION)
    await expect(sentence).toBeVisible()
    const reload = reloadButton(page)
    const takesFocus = () =>
      reload.evaluate((element) => {
        ;(element as HTMLElement).focus()
        return document.activeElement === element
      })

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    await expect(panel).toBeVisible()
    // Under the modal panel Reload can't take focus, and the panel still works.
    expect(await takesFocus()).toBe(false)
    await noteField(panel).fill('The unknown is what makes life possible.')
    await expect(noteField(panel)).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await expect(sentence).toBeVisible()
    expect(await takesFocus()).toBe(true)

    await mainBookCard(page).getByRole('link', { name: LEFT_HAND.title, exact: true }).click()
    await expect(page).toHaveURL(/\/book\//)
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText(LEFT_HAND.title)
    await expect(sentence).toBeVisible()
    await expect(reload).toBeVisible()
  })

  test('[P1] AC-5 after Reload, with the server now on the bundle’s version, the notice is gone and About this copy reads that version', async ({
    page,
    server,
  }) => {
    let answer: Answer = productionInfo(NEWER_VERSION)
    await answerAppInfo(page, () => answer)
    await page.goto(`${server.url}/backup`)
    await expect(exportButton(page)).toBeVisible()
    await expect(noticeSentence(page, NEWER_VERSION)).toBeVisible()
    await expect(aboutCard(page).getByText(`bookvie ${NEWER_VERSION}`, { exact: true })).toBeVisible()

    // The real server answers from here on: the tab now runs what it serves.
    answer = 'pass'
    const loaded = page.waitForEvent('load')
    await reloadButton(page).click()
    await loaded
    await expect(exportButton(page)).toBeVisible()
    await expect(aboutCard(page).getByText(`bookvie ${BUNDLE_VERSION}`, { exact: true })).toBeVisible()
    await expect(anyNoticeSentence(page)).toHaveCount(0)
    await expect(reloadButton(page)).toHaveCount(0)
  })

  test('[P1] AC-7 app-info fails on load, then a refetch finds another version: the notice appears and is announced once', async ({
    page,
    server,
  }) => {
    const seen = watchAppInfo(page)
    let answer: Answer = 'fail'
    await answerAppInfo(page, () => answer)
    await page.goto(`${server.url}/backup`)
    await expect(exportButton(page)).toBeVisible()
    await expect.poll(() => seen.filter((response) => response.status === 500).length).toBeGreaterThan(0)
    await afterAnnounceDelay(page)
    await expect(anyNoticeSentence(page)).toHaveCount(0)
    expect(await liveRegionText(page)).toBe('')
    await recordStatus(page)

    answer = productionInfo(NEWER_VERSION)
    await focusWindow(page)
    await expect(noticeSentence(page, NEWER_VERSION)).toBeVisible()
    const announced = async () => (await statusTexts(page)).filter((text) => text !== '')
    await expect.poll(announced).toEqual([noticeText(NEWER_VERSION)])

    const before = seen.length
    await focusWindow(page)
    await expect.poll(() => seen.length).toBeGreaterThan(before)
    await afterAnnounceDelay(page)
    expect(await announced()).toEqual([noticeText(NEWER_VERSION)])
  })

  test('[P2] AC-8 the banner reads skip link, wordmark, nav, Theme group, then the sentence and Reload', async ({
    page,
    server,
  }) => {
    await answerAppInfo(page, () => productionInfo(NEWER_VERSION))
    await page.goto(`${server.url}/backup`)
    await expect(exportButton(page)).toBeVisible()

    await expect(page.getByRole('banner')).toMatchAriaSnapshot(`
      - banner:
        - link "Skip to content"
        - text: bookvie
        - navigation "Main":
          - list:
            - listitem:
              - link "Home"
            - listitem:
              - link "Catalog"
            - listitem:
              - link "Stats"
            - listitem:
              - link "Card notes"
            - listitem:
              - link "Backup"
        - group "Theme":
          - button "Light"
          - button "Dark"
          - button "System"
        - paragraph: ${noticeText(NEWER_VERSION)}
        - button "Reload"
    `)
    // Reload's description is the sentence, so it reads in context when tabbed to.
    await expect(reloadButton(page)).toHaveAccessibleDescription(noticeText(NEWER_VERSION))
  })

  test('[P2] AC-9 under forced colors Reload keeps a visible 1px system border, light and dark', async ({
    page,
    server,
  }) => {
    await answerAppInfo(page, () => productionInfo(NEWER_VERSION))
    const reload = reloadButton(page)

    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme, forcedColors: 'active' })
      await page.goto(`${server.url}/backup`)
      await expect(exportButton(page)).toBeVisible()
      const canvas = await systemColor(page, 'Canvas')
      for (const side of ['top', 'right', 'bottom', 'left']) {
        await expect(reload, `${colorScheme} ${side}`).toHaveCSS(`border-${side}-style`, 'solid')
        await expect(reload, `${colorScheme} ${side}`).toHaveCSS(`border-${side}-width`, '1px')
        await expect(reload, `${colorScheme} ${side}`).not.toHaveCSS(`border-${side}-color`, canvas)
      }
    }
  })

  test('[P2] AC-3 with the notice shown, Backup and Home pass axe in light and dark', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(150))
    await answerAppInfo(page, () => productionInfo(NEWER_VERSION))

    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      for (const [route, ready] of [
        ['/backup', () => exportButton(page)],
        ['/', () => mainBookCard(page).getByRole('spinbutton', { name: 'Page', exact: true })],
      ] as const) {
        await page.goto(`${server.url}${route}`)
        await expect(ready()).toBeVisible()
        await expect(noticeSentence(page, NEWER_VERSION)).toBeVisible()
        const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
        expect(violations.map(({ id, nodes }) => `${colorScheme} ${route}: ${id} (${nodes.length})`)).toEqual([])
      }
    }
  })
})
