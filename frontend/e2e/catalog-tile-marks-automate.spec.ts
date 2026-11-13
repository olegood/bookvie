// Story 8.2 See what I've read and what I'm reading on the tiles: test
// automation after the story was done, beside the ATDD and spec-matrix leaves
// in catalog-tile-marks.spec.ts. The ribbon following a cover change, its
// left leg and the notch's apex, the bar following a page update on Home, the
// marks for the Up next, re-read-as-Main and Side read states, and the focus
// and highlight rings around a box with the ribbon on it.
//
// Like the ATDD leaves, the marks are read from the tile's pixels at device
// scale 2 (`lookOf` in tile-marks.ts). axe on Tiles with both marks on screen
// is already covered by catalog-pace-calculator.spec.ts, whose Flow 5 seed has
// a finished Book (Fahrenheit 451) and two Books with a percent.

import type { Page } from '@playwright/test'
import { finished, SWING_TIME, tabIntoBookcase } from './bookcase.ts'
import { expect, startSeededServer, test } from './fixtures.ts'
import { mainAt, mainBookCard, stopAndRemove } from './home.ts'
import { fillFields, openEdit, openNewBook } from './library.ts'
import {
  barPercent,
  BLUE,
  bookId,
  coversLoaded,
  inOrder,
  LIGHT,
  lookOf,
  marksOf,
  near,
  OLIVE,
  PURPLE,
  RED,
  RIBBON,
  type Rgb,
  solidPng,
  SPINE_LABEL_STRIP,
  storeTiles,
  tileItem,
} from './tile-marks.ts'

// A landscape cover 120×80 and a portrait one 60×120, one flat color each, far from the spine colors.
const COVER_RGB: Rgb = [30, 90, 120]
const WIDE_COVER = 'covers/wide.png'

/** Opens Catalog in Tiles from `url` and waits for every cover to load. */
async function openTiles(page: Page, url: string): Promise<void> {
  await storeTiles(page)
  await page.goto(`${url}/catalog`)
  await coversLoaded(page)
}

/** Goes to Catalog through the app's navigation, as a user would after working on Home or Book detail. */
async function navigateToCatalog(page: Page): Promise<void> {
  await page.getByRole('navigation').getByRole('link', { name: 'Catalog', exact: true }).click()
  await coversLoaded(page)
}

const BLEAK_HOUSE_ID = bookId(1)
/** Bleak House, finished, with a wide cover and a red spine. */
const BLEAK_HOUSE_BOOK = {
  id: BLEAK_HOUSE_ID,
  title: 'Bleak House',
  authors: ['Charles Dickens'],
  pages: 330,
  language: 'English',
  publisher: 'Bradbury and Evans',
  type: 'paperback',
  coverFile: WIDE_COVER,
  spineColorUser: RED.hex,
  readings: finished(330),
}
const BLEAK_HOUSE = 'Bleak House by Charles Dickens, finished'

/**
 * A re-read as Main and a paused Up next, each 330 pages: Persuasion is
 * finished and being re-read at p.40 (12%), Nostromo is Up next, paused at
 * p.99 (30%).
 */
const PERSUASION_ID = bookId(31)
const NOSTROMO_ID = bookId(32)
const ROLES_SHELF = {
  mainBookId: PERSUASION_ID,
  upNextBookId: NOSTROMO_ID,
  books: [
    {
      id: PERSUASION_ID,
      title: 'Persuasion',
      authors: ['Jane Austen'],
      pages: 330,
      spineColorUser: RED.hex,
      readings: [...finished(330), { startDate: '2026-10-01', currentPage: 40 }],
    },
    {
      id: NOSTROMO_ID,
      title: 'Nostromo',
      authors: ['Joseph Conrad'],
      pages: 330,
      spineColorUser: BLUE.hex,
      readings: [{ startDate: '2026-09-20', currentPage: 99, pausedAt: '2026-10-05' }],
    },
  ],
}
const PERSUASION = 'Persuasion by Jane Austen, finished, re-reading, 12%'
const NOSTROMO = 'Nostromo by Joseph Conrad, Up next, paused at page 99'

/**
 * Up next never started (Kindred) and a Side read with no Reading (Emma),
 * beside a finished Book (Middlemarch) and a paused one at p.120 of 330
 * (Austerlitz, 36%), so the same probe that sees no mark sees the others'.
 */
const KINDRED_ID = bookId(41)
const EMMA_ID = bookId(42)
const NO_MARK_SHELF = {
  upNextBookId: KINDRED_ID,
  sideReadBookIds: [EMMA_ID],
  books: [
    { id: KINDRED_ID, title: 'Kindred', authors: ['Octavia E. Butler'], pages: 330, spineColorUser: PURPLE.hex },
    { id: EMMA_ID, title: 'Emma', authors: ['Jane Austen'], pages: 330, spineColorUser: OLIVE.hex },
    {
      id: bookId(43),
      title: 'Middlemarch',
      authors: ['George Eliot'],
      pages: 330,
      spineColorUser: RED.hex,
      readings: finished(330),
    },
    {
      id: bookId(44),
      title: 'Austerlitz',
      authors: ['W. G. Sebald'],
      pages: 330,
      spineColorUser: BLUE.hex,
      readings: [{ startDate: '2026-09-20', currentPage: 120, pausedAt: '2026-10-05' }],
    },
  ],
}
const KINDRED = 'Kindred by Octavia E. Butler, not read yet, Up next'
const EMMA = 'Emma by Jane Austen, not read yet, on the side'
const MIDDLEMARCH = 'Middlemarch by George Eliot, finished'
const AUSTERLITZ = 'Austerlitz by W. G. Sebald, waiting for you, page 120'

test.describe("Story 8.2 See what I've read and what I'm reading on the tiles (automate)", () => {
  test.use({ deviceScaleFactor: 2 })

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.setViewportSize({ width: 1280, height: 900 })
  })

  test("[P2] AC-1 after a finished Book's cover is changed to a different shape, the ribbon hangs from the new cover", async ({
    page,
  }, testInfo) => {
    const wide = await solidPng(page, 120, 80, COVER_RGB)
    const tall = await solidPng(page, 60, 120, COVER_RGB)
    const server = await startSeededServer(
      testInfo,
      'tile-marks-cover-change',
      { books: [BLEAK_HOUSE_BOOK] },
      {
        [WIDE_COVER]: wide,
      },
    )
    try {
      await openTiles(page, server.url)
      const bleakHouse = tileItem(page, BLEAK_HOUSE)
      await expect.poll(async () => near((await lookOf(bleakHouse)).ribbonMiddle, RED.rgb, 24)).toBe(true)
      const before = await lookOf(bleakHouse, RED.rgb)
      // The img's rectangle includes its 1px hairline on each side.
      expect(Math.round(before.cover.width), 'the wide cover, as seeded').toBe(120 + 2)

      // Change the cover on Book detail, through the Edit book panel.
      await page.goto(`${server.url}/book/${BLEAK_HOUSE_ID}`)
      const panel = await openEdit(page)
      await panel.getByLabel('Cover', { exact: true }).setInputFiles({
        name: 'tall.png',
        mimeType: 'image/png',
        buffer: tall,
      })
      await panel.getByRole('button', { name: 'Save changes', exact: true }).click()
      await expect(panel).toBeHidden()

      await navigateToCatalog(page)
      // The tile now shows the portrait cover: narrower and taller, so its top and right edge moved.
      await expect.poll(async () => Math.round((await lookOf(bleakHouse)).cover.width)).toBe(60 + 2)
      const after = await lookOf(bleakHouse)
      expect(Math.round(after.cover.height)).toBe(120 + 2)
      expect(after.cover.y).toBeLessThan(before.cover.y - 30)
      expect(after.cover.x + after.cover.width).toBeLessThan(before.cover.x + before.cover.width - 20)

      // The ribbon hangs from the new cover's top, 10px in from its right, as on any cover.
      expect(near(after.ribbonMiddle, RED.rgb, 24)).toBe(true)
      expect(near(after.aboveRibbon, RED.rgb, 60)).toBe(false)
      expect(near(after.ribbonTop, RED.rgb, 24)).toBe(true)
      expect(near(after.notch, COVER_RGB, 60)).toBe(true)
      expect(inOrder(after.scanRight, [RED.rgb, LIGHT.spineEdge, SPINE_LABEL_STRIP, COVER_RGB])).toBe(true)
      // One ribbon's worth of spine red, as before the change: none left behind on the old cover's top.
      const redBefore = before.found
      const redAfter = (await lookOf(bleakHouse, RED.rgb)).found
      expect(Math.abs(redAfter - redBefore)).toBeLessThanOrEqual(redBefore * 0.1)
    } finally {
      await stopAndRemove(server)
    }
  })

  test("[P3] AC-1 the ribbon is 16px wide with a left leg like its right one, and the notch's apex is 18px below the cover's top", async ({
    page,
  }, testInfo) => {
    const wide = await solidPng(page, 120, 80, COVER_RGB)
    const server = await startSeededServer(
      testInfo,
      'tile-marks-notch',
      { books: [BLEAK_HOUSE_BOOK] },
      {
        [WIDE_COVER]: wide,
      },
    )
    try {
      await openTiles(page, server.url)
      const bleakHouse = tileItem(page, BLEAK_HOUSE)
      await expect.poll(async () => near((await lookOf(bleakHouse)).ribbonMiddle, RED.rgb, 24)).toBe(true)
      const look = await lookOf(bleakHouse)

      // Leftward from the center line: the fill, the spine-edge line, the light halo, then the cover.
      expect(inOrder(look.scanLeft, [RED.rgb, LIGHT.spineEdge, SPINE_LABEL_STRIP, COVER_RGB])).toBe(true)
      // Both legs are about as far from the center: the fill ends within a pixel of 8px on each side.
      const fillRun = (scan: Rgb[]) => scan.findIndex((pixel) => !near(pixel, RED.rgb, 40)) / 2
      expect(Math.abs(fillRun(look.scanLeft) - fillRun(look.scanRight))).toBeLessThanOrEqual(1)
      // 16px across, less the inner half of the 1px edge line on each side.
      const fillWidth = look.coverRow.filter((pixel) => near(pixel, RED.rgb, 40)).length / 2
      expect(fillWidth).toBeGreaterThanOrEqual(RIBBON.width - 2)
      expect(fillWidth).toBeLessThanOrEqual(RIBBON.width)

      // Down the center line from 12px: the fill stops at the apex, 18px down (±1), then edge, halo and cover.
      const apex = 12 + look.scanDown.findIndex((pixel) => !near(pixel, RED.rgb, 40)) / 2
      expect(Math.abs(apex - (RIBBON.height - RIBBON.notch))).toBeLessThanOrEqual(1)
      expect(inOrder(look.scanDown, [RED.rgb, LIGHT.spineEdge, SPINE_LABEL_STRIP, COVER_RGB])).toBe(true)
      // Just below the apex's edge and halo, the cover shows through (the notch's upper part, above `notch`).
      const belowApex = look.scanDown[(RIBBON.height - RIBBON.notch + 3 - 12) * 2]!
      expect(near(belowApex, COVER_RGB, 60)).toBe(true)
    } finally {
      await stopAndRemove(server)
    }
  })

  test("[P2] AC-2 after Update page on Home, the Main book's tile shows the bar at the new percent", async ({
    page,
  }, testInfo) => {
    const server = await startSeededServer(testInfo, 'tile-marks-update', mainAt(150))
    try {
      // Before: p.150 of 330 is 45%.
      await openTiles(page, server.url)
      const before = tileItem(page, 'The Left Hand of Darkness by Ursula K. Le Guin, Main book, 45%')
      await expect.poll(async () => Math.round(barPercent(await lookOf(before), LIGHT) ?? -1)).toBe(45)

      await page.getByRole('navigation').getByRole('link', { name: 'Home', exact: true }).click()
      const field = mainBookCard(page).getByRole('spinbutton', { name: 'Page', exact: true })
      await field.fill('212')
      await mainBookCard(page).getByRole('button', { name: 'Update', exact: true }).click()
      await expect(page.getByRole('status')).toHaveText('Page 212 of 330, 64%.')

      // After: p.212 of 330 is 64%, from the catalog view the page fetched again.
      await navigateToCatalog(page)
      const after = tileItem(page, 'The Left Hand of Darkness by Ursula K. Le Guin, Main book, 64%')
      await expect.poll(async () => Math.round(barPercent(await lookOf(after), LIGHT) ?? -1)).toBe(64)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-2 an Up next Book paused at a page shows its bar, and no ribbon', async ({ page }, testInfo) => {
    const server = await startSeededServer(testInfo, 'tile-marks-up-next', ROLES_SHELF)
    try {
      await openTiles(page, server.url)
      const nostromo = tileItem(page, NOSTROMO)

      await expect
        .poll(async () => marksOf(await lookOf(nostromo), BLUE.rgb, LIGHT))
        .toEqual({ ribbon: false, bar: true })
      // p.99 of 330 is 30%.
      expect(Math.abs(barPercent(await lookOf(nostromo), LIGHT)! - 30)).toBeLessThanOrEqual(1.5)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-3 a finished Book being re-read as the Main book shows both the ribbon and the bar', async ({
    page,
  }, testInfo) => {
    const server = await startSeededServer(testInfo, 'tile-marks-reread-main', ROLES_SHELF)
    try {
      await openTiles(page, server.url)
      const persuasion = tileItem(page, PERSUASION)

      await expect
        .poll(async () => marksOf(await lookOf(persuasion), RED.rgb, LIGHT))
        .toEqual({ ribbon: true, bar: true })
      const look = await lookOf(persuasion)
      // The re-read's percent: p.40 of 330 is 12%.
      expect(Math.abs(barPercent(look, LIGHT)! - 12)).toBeLessThanOrEqual(1.5)
      // No cover: the ribbon hangs from the typeset cover's top.
      expect(look.cover).toEqual(look.box)
      expect(near(look.ribbonTop, RED.rgb, 24)).toBe(true)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-4 an Up next Book never started and a Side read without a Reading have no mark, while the others carry theirs', async ({
    page,
  }, testInfo) => {
    const server = await startSeededServer(testInfo, 'tile-marks-no-mark', NO_MARK_SHELF)
    try {
      await openTiles(page, server.url)
      const spineColor: Record<string, Rgb> = {
        [KINDRED]: PURPLE.rgb,
        [EMMA]: OLIVE.rgb,
        [MIDDLEMARCH]: RED.rgb,
        [AUSTERLITZ]: BLUE.rgb,
      }

      // One probe for every tile, so "no mark" is told apart by the same check that sees the others' marks.
      await expect
        .poll(async () => {
          const marks: Record<string, { ribbon: boolean; bar: boolean }> = {}
          for (const [name, color] of Object.entries(spineColor)) {
            marks[name] = marksOf(await lookOf(tileItem(page, name)), color, LIGHT)
          }
          return marks
        })
        .toEqual({
          [KINDRED]: { ribbon: false, bar: false },
          [EMMA]: { ribbon: false, bar: false },
          [MIDDLEMARCH]: { ribbon: true, bar: false },
          [AUSTERLITZ]: { ribbon: false, bar: true },
        })

      // Their slots are empty: only the page below the box.
      for (const name of [KINDRED, EMMA]) {
        const look = await lookOf(tileItem(page, name))
        expect(
          look.barRow.every((pixel) => near(pixel, look.page)),
          name,
        ).toBe(true)
      }
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P3] AC-1 the focus ring and the post-add highlight ring run around the box with the ribbon on it, without clipping it', async ({
    page,
  }, testInfo) => {
    // Agnes Grey (Bronte) sorts first under Author, so Tab from the calculator's link lands on it.
    const server = await startSeededServer(testInfo, 'tile-marks-rings', {
      books: [
        {
          id: bookId(51),
          title: 'Agnes Grey',
          authors: ['Anne Bronte'],
          pages: 330,
          spineColorUser: RED.hex,
          readings: finished(330),
        },
        { id: bookId(52), title: 'Kindred', authors: ['Octavia E. Butler'], pages: 330 },
      ],
    })
    try {
      await openTiles(page, server.url)

      /** The column through the ribbon's center at the box's top: ring, gap, then the ribbon's fill. */
      const ringColumn = async (name: string, spine: Rgb) => {
        const look = await lookOf(tileItem(page, name))
        return {
          ring: near(look.ringAbove, LIGHT.accent),
          gap: near(look.aboveRibbon, look.page),
          ribbonTop: near(look.ribbonTop, spine, 24),
          ribbon: near(look.ribbonMiddle, spine, 24),
          sides: inOrder(look.scanRight, [spine, LIGHT.spineEdge, SPINE_LABEL_STRIP]),
          placeholder: look.cover.y === look.box.y,
        }
      }
      const ringed = { ring: true, gap: true, ribbonTop: true, ribbon: true, sides: true, placeholder: true }

      // The keyboard focus ring on Agnes Grey, the first tile: around the box, outside the ribbon's top.
      await tabIntoBookcase(page)
      const agnesGrey = 'Agnes Grey by Anne Bronte, finished'
      await expect(tileItem(page, agnesGrey).getByRole('link')).toBeFocused()
      await expect.poll(() => ringColumn(agnesGrey, RED.rgb)).toEqual(ringed)

      // The highlight ring on a finished Book just added (no cover: the ribbon is at the box's top).
      const panel = await openNewBook(page)
      await fillFields(panel, { ...SWING_TIME, 'Finished on': '2026-03-20', 'Spine color': BLUE.hex })
      await panel.getByRole('button', { name: 'Add book', exact: true }).click()
      await expect(panel).toBeHidden()
      const swingTime = 'Swing Time by Zadie Smith, finished'
      await expect(tileItem(page, swingTime).getByRole('link')).toBeFocused()
      await expect.poll(() => ringColumn(swingTime, BLUE.rgb)).toEqual(ringed)
    } finally {
      await stopAndRemove(server)
    }
  })
})
