// Story 8.2 See what I've read and what I'm reading on the tiles: the
// finished ribbon and the reading bar on Catalog's Tiles (FR-25, AR24,
// UX-DR56). Where the ribbon hangs and how it is drawn, the bar and its
// `percent`, both on a re-read, no mark on an unread Book, both kept out of
// the accessibility tree, the dark theme and forced colors.
//
// The marks are checked by their pixels, from a screenshot of each tile at
// device scale 2, so the leaves don't care whether the build draws them with
// SVG, CSS shapes or borders. The catalog view's `finished` and `percent`
// already exist (backend/tests/test_book_states.py), so there is no API leaf.

import type { Page } from '@playwright/test'
import { finished } from './bookcase.ts'
import { expect, startSeededServer, test } from './fixtures.ts'
import { stopAndRemove } from './home.ts'
import { COVER_PNG } from './intents.ts'
import {
  BAR,
  BLUE,
  bookId,
  barPercent,
  coversLoaded,
  DARK,
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
  tiles,
} from './tile-marks.ts'

// A landscape cover 120×80, one flat color: in a 2:3 box it sits at the
// bottom with empty box above it, so "the visible cover's top" isn't the box's.
const WIDE_COVER = 'covers/wide.png'
const WIDE_COVER_RGB: Rgb = [30, 90, 120]
// COVER_PNG: 40×60, rgb(200, 60, 40), shown at its own size at the bottom of the box.
const DUNE_COVER = 'covers/dune.png'

const EMMA_ID = bookId(3)

const PAUSED_AT_40 = { startDate: '2026-09-20', currentPage: 40, pausedAt: '2026-10-05' }

/**
 * Six Books, one row at 1280px under the default Author sort: Bleak House,
 * Dune, Emma, Kindred, Good Omens, Austerlitz. Every one 330 pages, so p.212
 * is 64%, p.120 is 36% and p.40 is 12%.
 */
const MARK_SHELF = {
  mainBookId: EMMA_ID,
  books: [
    // Finished, with a wide cover: the ribbon hangs from the cover, not the box.
    {
      id: bookId(1),
      title: 'Bleak House',
      authors: ['Charles Dickens'],
      pages: 330,
      coverFile: WIDE_COVER,
      spineColorUser: RED.hex,
      readings: finished(330),
    },
    // Finished, re-read paused at p.40: ribbon and bar.
    {
      id: bookId(2),
      title: 'Dune',
      authors: ['Frank Herbert'],
      pages: 330,
      coverFile: DUNE_COVER,
      spineColorUser: BLUE.hex,
      readings: [...finished(330), PAUSED_AT_40],
    },
    // Main at p.212 (64%), no cover: bar only.
    {
      id: EMMA_ID,
      title: 'Emma',
      authors: ['Jane Austen'],
      pages: 330,
      spineColorUser: OLIVE.hex,
      readings: [{ startDate: '2026-10-01', currentPage: 212 }],
    },
    // Unread, no Reading: no mark.
    { id: bookId(4), title: 'Kindred', authors: ['Octavia E. Butler'], pages: 330, spineColorUser: PURPLE.hex },
    // Finished, no cover: the ribbon hangs from the typeset cover's top.
    {
      id: bookId(5),
      title: 'Good Omens',
      authors: ['Terry Pratchett'],
      pages: 330,
      spineColorUser: OLIVE.hex,
      readings: finished(330),
    },
    // Never finished, paused at p.120 (36%): bar only.
    {
      id: bookId(6),
      title: 'Austerlitz',
      authors: ['W. G. Sebald'],
      pages: 330,
      spineColorUser: BLUE.hex,
      readings: [{ startDate: '2026-09-20', currentPage: 120, pausedAt: '2026-10-05' }],
    },
  ],
}

const BLEAK_HOUSE = 'Bleak House by Charles Dickens, finished'
const DUNE = 'Dune by Frank Herbert, finished, waiting for you, page 40'
const EMMA = 'Emma by Jane Austen, Main book, 64%'
const KINDRED = 'Kindred by Octavia E. Butler, not read yet'
const GOOD_OMENS = 'Good Omens by Terry Pratchett, finished'
const AUSTERLITZ = 'Austerlitz by W. G. Sebald, waiting for you, page 120'

const SPINE_COLOR: Record<string, Rgb> = {
  [BLEAK_HOUSE]: RED.rgb,
  [DUNE]: BLUE.rgb,
  [EMMA]: OLIVE.rgb,
  [KINDRED]: PURPLE.rgb,
  [GOOD_OMENS]: OLIVE.rgb,
  [AUSTERLITZ]: BLUE.rgb,
}

/** Starts a server on MARK_SHELF with its two cover files. The caller stops it. */
async function markServer(page: Page, testInfo: Parameters<typeof startSeededServer>[0]) {
  const wide = await solidPng(page, 120, 80, WIDE_COVER_RGB)
  return startSeededServer(testInfo, 'tile-marks', MARK_SHELF, { [WIDE_COVER]: wide, [DUNE_COVER]: COVER_PNG })
}

test.describe("Story 8.2 See what I've read and what I'm reading on the tiles (ATDD)", () => {
  test.use({ deviceScaleFactor: 2 })

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.setViewportSize({ width: 1280, height: 900 })
  })

  test("[P0] AC-1 a finished Book's tile carries a ribbon in its spine color, hanging from the visible cover's top", async ({
    page,
  }, testInfo) => {
    const server = await markServer(page, testInfo)
    try {
      await storeTiles(page)
      await page.goto(`${server.url}/catalog`)
      await coversLoaded(page)
      const bleakHouse = tileItem(page, BLEAK_HOUSE)

      // Bleak House's wide cover sits low in its box: the ribbon is on the cover, in the exact spine color.
      await expect.poll(async () => near((await lookOf(bleakHouse)).ribbonMiddle, RED.rgb, 24)).toBe(true)

      const look = await lookOf(bleakHouse)
      expect(look.cover.y, 'the wide cover starts below the box top').toBeGreaterThan(look.box.y + 40)
      // Not on the empty part of the box above the cover.
      expect(near(look.boxTopMiddle, RED.rgb, 60)).toBe(false)
      // It hangs from the cover's very top, and reaches down to the notch's apex.
      expect(near(look.aboveRibbon, RED.rgb, 60)).toBe(false)
      expect(near(look.ribbonTop, RED.rgb, 24)).toBe(true)
      expect(near(look.aboveApex, RED.rgb, 24)).toBe(true)
      // The V-notch: the cover shows through at the ribbon's lower end.
      expect(near(look.notch, RED.rgb, 60)).toBe(false)
      expect(near(look.notch, WIDE_COVER_RGB, 60)).toBe(true)
      // From the fill outward: the spine-edge line, then the light halo, then the cover.
      expect(inOrder(look.scanRight, [RED.rgb, LIGHT.spineEdge, SPINE_LABEL_STRIP, WIDE_COVER_RGB])).toBe(true)
      // Nothing written on it: the link holds only the caption's text.
      await expect(tileItem(page, BLEAK_HOUSE).getByRole('link')).toHaveText('Bleak HouseCharles Dickens')

      // A finished Book without a cover: the ribbon hangs from the top of the box (the typeset cover).
      const goodOmens = await lookOf(tileItem(page, GOOD_OMENS))
      expect(near(goodOmens.ribbonMiddle, OLIVE.rgb, 24)).toBe(true)
      expect(goodOmens.cover).toEqual(goodOmens.box)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P0] AC-2 a Book with a percent shows a reading bar filled to that percent, never recomputed, and a null percent leaves the slot empty', async ({
    page,
  }, testInfo) => {
    const server = await markServer(page, testInfo)
    try {
      // The view says 25% while Emma's Reading is at p.212 of 330 (64%): the bar must follow `percent`.
      await page.route('**/api/views/catalog', async (route) => {
        const response = await route.fetch()
        const view = await response.json()
        for (const book of view.books) if (book.id === EMMA_ID) book.percent = 25
        await route.fulfill({ response, json: view })
      })
      await storeTiles(page)
      await page.goto(`${server.url}/catalog`)
      await coversLoaded(page)
      const emma = tileItem(page, 'Emma by Jane Austen, Main book, 25%')

      await expect.poll(async () => Math.round(barPercent(await lookOf(emma), LIGHT) ?? -1)).toBeGreaterThanOrEqual(24)
      const look = await lookOf(emma)
      expect(barPercent(look, LIGHT)).toBeLessThanOrEqual(26)

      // 6px below the box, 5px tall, the box's width, accent fill from the left, accent-soft track to the right.
      // barRow runs from box.left - 3 to box.right + 3 inclusive: the samples in [box.left, box.right).
      const inBox = look.barRow.slice(6, -7)
      expect(near(inBox[0]!, LIGHT.accent)).toBe(true)
      expect(near(inBox.at(-1)!, LIGHT.accentSoft)).toBe(true)
      expect(near(look.barRow[0]!, LIGHT.accent) || near(look.barRow[0]!, LIGHT.accentSoft)).toBe(false)
      expect(near(look.barRow.at(-1)!, LIGHT.accent) || near(look.barRow.at(-1)!, LIGHT.accentSoft)).toBe(false)
      expect(near(look.aboveBar, look.page)).toBe(true)
      expect(near(look.belowSlot, look.page)).toBe(true)
      // Square ends: the very corner pixels are the fill and the track, not blended with the page.
      expect(near(look.barCorners[0], LIGHT.accent)).toBe(true)
      expect(near(look.barCorners[1], LIGHT.accentSoft)).toBe(true)

      // A paused Book's bar too: Austerlitz at 36%.
      const austerlitz = barPercent(await lookOf(tileItem(page, AUSTERLITZ)), LIGHT)
      expect(austerlitz).not.toBeNull()
      expect(Math.abs(austerlitz! - 36)).toBeLessThanOrEqual(1.5)

      // percent: null: no bar, the slot stays empty, and the captions still share one line across the row.
      const kindred = await lookOf(tileItem(page, KINDRED))
      expect(barPercent(kindred, LIGHT)).toBeNull()
      expect(kindred.barRow.every((pixel) => near(pixel, kindred.page))).toBe(true)
      const titleTops = await tiles(page)
        .getByRole('listitem')
        .evaluateAll((items) =>
          items.map((item) => {
            const link = item.querySelector('a')!
            // The caption's title: the second-to-last leaf with text (a typeset cover's own text comes first).
            const title = Array.from(link.querySelectorAll('*'))
              .filter((node) => node.children.length === 0 && (node.textContent ?? '').trim() !== '')
              .at(-2)!
            return Math.round(title.getBoundingClientRect().top)
          }),
        )
      expect(new Set(titleTops).size).toBe(1)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] AC-3 a finished Book being re-read shows both the ribbon and the bar', async ({ page }, testInfo) => {
    const server = await markServer(page, testInfo)
    try {
      await storeTiles(page)
      await page.goto(`${server.url}/catalog`)
      await coversLoaded(page)
      const dune = tileItem(page, DUNE)

      await expect.poll(async () => marksOf(await lookOf(dune), BLUE.rgb, LIGHT)).toEqual({ ribbon: true, bar: true })

      const look = await lookOf(dune)
      // The re-read's percent: p.40 of 330 is 12%.
      expect(Math.abs(barPercent(look, LIGHT)! - 12)).toBeLessThanOrEqual(1.5)
      // The ribbon hangs from Dune's own (small) cover: fill, edge, halo, then the cover's red-orange.
      expect(inOrder(look.scanRight, [BLUE.rgb, LIGHT.spineEdge, SPINE_LABEL_STRIP, [200, 60, 40]])).toBe(true)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] AC-4 an unread Book with no Reading has no mark, while the others carry theirs', async ({
    page,
  }, testInfo) => {
    const server = await markServer(page, testInfo)
    try {
      await storeTiles(page)
      await page.goto(`${server.url}/catalog`)
      await coversLoaded(page)

      // One probe for every tile, so Kindred's "no mark" is told apart by the same check that sees the others' marks.
      await expect
        .poll(async () => {
          const marks: Record<string, { ribbon: boolean; bar: boolean }> = {}
          for (const name of [BLEAK_HOUSE, DUNE, EMMA, KINDRED, GOOD_OMENS, AUSTERLITZ]) {
            marks[name] = marksOf(await lookOf(tileItem(page, name)), SPINE_COLOR[name]!, LIGHT)
          }
          return marks
        })
        .toEqual({
          [BLEAK_HOUSE]: { ribbon: true, bar: false },
          [DUNE]: { ribbon: true, bar: true },
          [EMMA]: { ribbon: false, bar: true },
          [KINDRED]: { ribbon: false, bar: false },
          [GOOD_OMENS]: { ribbon: true, bar: false },
          [AUSTERLITZ]: { ribbon: false, bar: true },
        })

      // Kindred's box and slot: no ribbon over its (unread) typeset cover, and an empty slot.
      const kindred = await lookOf(tileItem(page, KINDRED))
      expect(kindred.barRow.every((pixel) => near(pixel, kindred.page))).toBe(true)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] AC-5 the ribbon and the bar are hidden from screen readers, and the status is in the link name', async ({
    page,
  }, testInfo) => {
    const server = await markServer(page, testInfo)
    try {
      await storeTiles(page)
      await page.goto(`${server.url}/catalog`)
      await coversLoaded(page)

      /**
       * Every element inside the tile's link that sits under a point and is smaller than
       * `max` (so the link and the box don't count), and whether it is in an `aria-hidden` subtree.
       */
      const hiddenAt = (name: string, where: 'bar' | 'ribbon') =>
        tileItem(page, name).evaluate(
          (li, { where, ribbon, bar }) => {
            const link = li.querySelector('a')!
            const origin = li.getBoundingClientRect()
            const box = Array.from(li.querySelectorAll('*'))
              .map((node) => node.getBoundingClientRect())
              .find((r) => Math.abs(r.width - origin.width) <= 1 && Math.abs(r.height - r.width * 1.5) <= 1.5)!
            const img = li.querySelector('img')
            const cover = img && img.naturalWidth > 0 ? img.getBoundingClientRect() : box
            const [x, y, max] =
              where === 'bar'
                ? [box.x + box.width * 0.05, box.bottom + bar.gap + bar.height / 2, 11]
                : [cover.right - ribbon.inset - ribbon.width / 2, cover.y + 9, 30]
            const under = Array.from(link.querySelectorAll('*')).filter((node) => {
              const r = node.getBoundingClientRect()
              return r.left <= x && x <= r.right && r.top <= y && y <= r.bottom && Math.min(r.width, r.height) <= max
            })
            return {
              found: under.length > 0,
              hidden: under.every((node) => node.closest('[aria-hidden="true"]') !== null),
            }
          },
          { where, ribbon: RIBBON, bar: BAR },
        )

      // Emma's bar (and whatever draws it) is out of the accessibility tree.
      await expect.poll(() => hiddenAt(EMMA, 'bar')).toEqual({ found: true, hidden: true })

      expect(await hiddenAt(DUNE, 'bar')).toEqual({ found: true, hidden: true })
      expect(await hiddenAt(DUNE, 'ribbon')).toEqual({ found: true, hidden: true })
      expect(await hiddenAt(BLEAK_HOUSE, 'ribbon')).toEqual({ found: true, hidden: true })

      // The status is in each link's name, so it never rests on color or shape alone.
      for (const name of [BLEAK_HOUSE, DUNE, EMMA, KINDRED, GOOD_OMENS, AUSTERLITZ]) {
        await expect(tiles(page).getByRole('link', { name, exact: true })).toHaveCount(1)
      }
      // The marks add no text to the link.
      await expect(tileItem(page, DUNE).getByRole('link')).toHaveText('DuneFrank Herbert')
      // Emma has no cover: the text ends with the caption, after at most one copy from her aria-hidden typeset cover.
      await expect(tileItem(page, EMMA).getByRole('link')).toHaveText(/^(?:EmmaJane Austen)?EmmaJane Austen$/)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-6 in the dark theme the ribbon fill, its halo and the bar keep their meaning; spine-edge and chrome take their dark twins', async ({
    page,
  }, testInfo) => {
    const server = await markServer(page, testInfo)
    try {
      await page.emulateMedia({ colorScheme: 'dark' })
      await storeTiles(page)
      await page.goto(`${server.url}/catalog`)
      await coversLoaded(page)
      const bleakHouse = tileItem(page, BLEAK_HOUSE)

      // The ribbon is the same spine color in the dark theme.
      await expect.poll(async () => near((await lookOf(bleakHouse)).ribbonMiddle, RED.rgb, 24)).toBe(true)

      // The halo stays light; only the edge line takes its dark twin.
      const look = await lookOf(bleakHouse)
      expect(inOrder(look.scanRight, [RED.rgb, DARK.spineEdge, SPINE_LABEL_STRIP, WIDE_COVER_RGB])).toBe(true)
      expect(look.scanRight.some((pixel) => near(pixel, LIGHT.spineEdge, 12))).toBe(false)

      // The bar: dark accent on dark accent-soft, still filled to the percent (Emma, 64%).
      const emma = await lookOf(tileItem(page, EMMA))
      expect(Math.abs(barPercent(emma, DARK)! - 64)).toBeLessThanOrEqual(1.5)
      expect(emma.barRow.some((pixel) => near(pixel, DARK.accentSoft))).toBe(true)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-7 under forced colors the ribbon and the bar draw in CanvasText and Canvas', async ({
    page,
  }, testInfo) => {
    const server = await markServer(page, testInfo)
    try {
      await page.emulateMedia({ forcedColors: 'active' })
      await storeTiles(page)
      await page.goto(`${server.url}/catalog`)
      await coversLoaded(page)
      const [canvasText, canvas] = await page.evaluate(() => {
        const probe = document.createElement('div')
        probe.style.color = 'CanvasText'
        probe.style.backgroundColor = 'Canvas'
        document.body.append(probe)
        const style = getComputedStyle(probe)
        const rgb = (value: string) => value.match(/\d+/g)!.slice(0, 3).map(Number) as [number, number, number]
        const colors = [rgb(style.color), rgb(style.backgroundColor)]
        probe.remove()
        return colors
      })
      const bleakHouse = tileItem(page, BLEAK_HOUSE)

      // The ribbon's fill is CanvasText, whatever the spine color.
      await expect.poll(async () => near((await lookOf(bleakHouse)).ribbonMiddle, canvasText!, 24)).toBe(true)

      // Its halo becomes Canvas, between the fill and the cover.
      const look = await lookOf(bleakHouse)
      expect(inOrder(look.scanRight, [canvasText!, canvas!, WIDE_COVER_RGB])).toBe(true)

      // The bar: CanvasText fill to the percent, a Canvas track, outlined in CanvasText.
      const emma = await lookOf(tileItem(page, EMMA))
      expect(Math.abs(barPercent(emma, { accent: canvasText!, accentSoft: canvas! })! - 64)).toBeLessThanOrEqual(1.5)
      const inBox = emma.barRow.slice(6, -7)
      expect(near(inBox.at(-2)!, canvas!)).toBe(true)
      const trackEdge = await tileItem(page, EMMA).evaluate(
        (li, { bar }) => {
          const origin = li.getBoundingClientRect()
          const box = Array.from(li.querySelectorAll('*'))
            .map((node) => node.getBoundingClientRect())
            .find((r) => Math.abs(r.width - origin.width) <= 1 && Math.abs(r.height - r.width * 1.5) <= 1.5)!
          return { x: box.right - origin.x - 4, top: box.bottom - origin.y + bar.gap }
        },
        { bar: BAR },
      )
      const png = (await tileItem(page, EMMA).screenshot()).toString('base64')
      const column = await page.evaluate(
        async ({ png, x, top, width }) => {
          const image = new Image()
          image.src = `data:image/png;base64,${png}`
          await image.decode()
          const c = document.createElement('canvas')
          c.width = image.width
          c.height = image.height
          const context = c.getContext('2d')!
          context.drawImage(image, 0, 0)
          const scale = image.width / width
          // From 3px above the bar's top to 1px inside it, every device pixel.
          return Array.from({ length: Math.round(4 * scale) + 1 }, (_, n) => {
            const [r, g, b] = context.getImageData(Math.floor(x * scale), Math.floor((top - 3) * scale) + n, 1, 1).data
            return [r!, g!, b!] as [number, number, number]
          })
        },
        { png, ...trackEdge, width: (await tileItem(page, EMMA).boundingBox())!.width },
      )
      expect(column.some((pixel) => near(pixel, canvasText!, 40))).toBe(true)

      // The cover hairline is CanvasText (Story 8.1 already does this).
      const hairline = await bleakHouse.locator('img').evaluate((img) => getComputedStyle(img).borderTopColor)
      expect(hairline).toBe(`rgb(${canvasText!.join(', ')})`)
    } finally {
      await stopAndRemove(server)
    }
  })
})

/** A finished Book whose cover file isn't an image, and one whose cover is narrower than the ribbon plus its inset. */
const BROKEN_COVER = 'covers/broken.png'
const NARROW_COVER = 'covers/narrow.png'
const EDGE_SHELF = {
  books: [
    {
      id: bookId(11),
      title: 'Middlemarch',
      authors: ['George Eliot'],
      pages: 330,
      coverFile: BROKEN_COVER,
      spineColorUser: RED.hex,
      readings: finished(330),
    },
    {
      id: bookId(12),
      title: 'Nostromo',
      authors: ['Joseph Conrad'],
      pages: 330,
      coverFile: NARROW_COVER,
      spineColorUser: RED.hex,
      readings: finished(330),
    },
  ],
}
const MIDDLEMARCH = 'Middlemarch by George Eliot, finished'
const NOSTROMO = 'Nostromo by Joseph Conrad, finished'

test.describe("Story 8.2 See what I've read and what I'm reading on the tiles (spec matrix)", () => {
  test.use({ deviceScaleFactor: 2 })

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.setViewportSize({ width: 1280, height: 900 })
  })

  test("[P1] AC-1 no ribbon while a finished Book's cover loads; it appears with the cover, and the box doesn't move", async ({
    page,
  }, testInfo) => {
    const server = await markServer(page, testInfo)
    // Hold Bleak House's cover back until the loading tile has been read.
    let release: () => void = () => {}
    const held = new Promise<void>((resolve) => (release = resolve))
    try {
      await page.route(`**/media/${WIDE_COVER}`, async (route) => {
        await held
        await route.continue()
      })
      await storeTiles(page)
      await page.goto(`${server.url}/catalog`)
      const bleakHouse = tileItem(page, BLEAK_HOUSE)
      await expect(bleakHouse.locator('img')).toHaveCount(1)

      // Loading: no spine-red pixel anywhere in the tile.
      const loading = await lookOf(bleakHouse, RED.rgb)
      expect(loading.found).toBe(0)
      expect(marksOf(loading, RED.rgb, LIGHT).ribbon).toBe(false)

      release()
      await coversLoaded(page)
      await expect.poll(async () => marksOf(await lookOf(bleakHouse), RED.rgb, LIGHT).ribbon).toBe(true)
      const loaded = await lookOf(bleakHouse)
      expect(loaded.box).toEqual(loading.box)
      // On the cover, which sits below the box's top.
      expect(loaded.cover.y).toBeGreaterThan(loaded.box.y + 40)
    } finally {
      release()
      await stopAndRemove(server)
    }
  })

  test("[P1] AC-1 a finished Book whose cover file isn't an image gets the ribbon at the box's top", async ({
    page,
  }, testInfo) => {
    const narrow = await solidPng(page, 20, 60, WIDE_COVER_RGB)
    const server = await startSeededServer(testInfo, 'tile-marks-edge', EDGE_SHELF, {
      [BROKEN_COVER]: 'not an image',
      [NARROW_COVER]: narrow,
    })
    try {
      await storeTiles(page)
      await page.goto(`${server.url}/catalog`)
      const middlemarch = tileItem(page, MIDDLEMARCH)
      // Once the file fails, the typeset cover: no img left.
      await expect(middlemarch.locator('img')).toHaveCount(0)

      await expect.poll(async () => near((await lookOf(middlemarch)).ribbonMiddle, RED.rgb, 24)).toBe(true)
      const look = await lookOf(middlemarch)
      expect(look.cover).toEqual(look.box)
      expect(inOrder(look.scanRight, [RED.rgb, LIGHT.spineEdge, SPINE_LABEL_STRIP])).toBe(true)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] AC-2 percent 0 shows a full track and no fill; percent 100 a full fill', async ({ page }, testInfo) => {
    const server = await markServer(page, testInfo)
    try {
      await page.route('**/api/views/catalog', async (route) => {
        const response = await route.fetch()
        const view = await response.json()
        for (const book of view.books) {
          if (book.id === EMMA_ID) book.percent = 0
          if (book.id === bookId(6)) book.percent = 100
        }
        await route.fulfill({ response, json: view })
      })
      await storeTiles(page)
      await page.goto(`${server.url}/catalog`)
      await coversLoaded(page)
      const byTitle = (title: string) =>
        tiles(page)
          .getByRole('listitem')
          .filter({ has: page.getByRole('link', { name: new RegExp(`^${title} by `) }) })

      // Emma at 0%: the whole track, not one accent pixel.
      await expect.poll(async () => barPercent(await lookOf(byTitle('Emma')), LIGHT)).toBe(0)
      const emma = (await lookOf(byTitle('Emma'))).barRow.slice(6, -7)
      expect(emma.every((pixel) => near(pixel, LIGHT.accentSoft))).toBe(true)

      // Austerlitz at 100%: the whole fill, not one track pixel.
      const austerlitz = await lookOf(byTitle('Austerlitz'))
      expect(Math.abs(barPercent(austerlitz, LIGHT)! - 100)).toBeLessThanOrEqual(1)
      expect(austerlitz.barRow.slice(6, -7).every((pixel) => near(pixel, LIGHT.accent))).toBe(true)
    } finally {
      await stopAndRemove(server)
    }
  })

  test("[P2] AC-1 on a cover narrower than the ribbon plus its inset, the ribbon stays inside the cover's left edge", async ({
    page,
  }, testInfo) => {
    const narrow = await solidPng(page, 20, 60, WIDE_COVER_RGB)
    const server = await startSeededServer(testInfo, 'tile-marks-edge', EDGE_SHELF, {
      [BROKEN_COVER]: 'not an image',
      [NARROW_COVER]: narrow,
    })
    try {
      await storeTiles(page)
      await page.goto(`${server.url}/catalog`)
      await coversLoaded(page)
      const nostromo = tileItem(page, NOSTROMO)

      // The ribbon is on the 20px cover...
      await expect
        .poll(async () => (await lookOf(nostromo)).coverRow.some((pixel) => near(pixel, RED.rgb, 24)))
        .toBe(true)
      const look = await lookOf(nostromo)
      expect(look.cover.width).toBeLessThan(RIBBON.width + RIBBON.inset)
      // ...and no fill pixel sits left of the cover's left edge (coverRow starts 6px left of it).
      const firstFill = look.coverRow.findIndex((pixel) => near(pixel, RED.rgb, 24))
      expect(firstFill / 2 - 6).toBeGreaterThanOrEqual(0)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] AC-1 a large wide cover and a large cover taller than 2:3 stay whole inside their boxes, bottom-aligned', async ({
    page,
  }, testInfo) => {
    const wide = await solidPng(page, 600, 300, WIDE_COVER_RGB)
    const tall = await solidPng(page, 300, 900, WIDE_COVER_RGB)
    const server = await startSeededServer(
      testInfo,
      'tile-marks-large',
      {
        books: [
          {
            id: bookId(21),
            title: 'Ulysses',
            authors: ['James Joyce'],
            pages: 330,
            coverFile: 'covers/large-wide.png',
          },
          {
            id: bookId(22),
            title: 'Villette',
            authors: ['Charlotte Bronte'],
            pages: 330,
            coverFile: 'covers/large-tall.png',
            spineColorUser: RED.hex,
            readings: finished(330),
          },
        ],
      },
      { 'covers/large-wide.png': wide, 'covers/large-tall.png': tall },
    )
    try {
      await storeTiles(page)
      await page.goto(`${server.url}/catalog`)
      await coversLoaded(page)
      for (const title of ['Ulysses', 'Villette']) {
        const look = await lookOf(
          tiles(page)
            .getByRole('listitem')
            .filter({ has: page.getByRole('link', { name: new RegExp(`^${title} by `) }) }),
        )
        const { box, cover } = look
        expect(cover, title).not.toEqual(box)
        expect(cover.x, title).toBeGreaterThanOrEqual(box.x - 1)
        expect(cover.y, title).toBeGreaterThanOrEqual(box.y - 1)
        expect(cover.x + cover.width, title).toBeLessThanOrEqual(box.x + box.width + 1)
        expect(Math.abs(cover.y + cover.height - (box.y + box.height)), title).toBeLessThanOrEqual(1)
        // Centered: Villette's tall cover is narrower than its box, with equal gaps left and right.
        const leftGap = cover.x - box.x
        const rightGap = box.x + box.width - (cover.x + cover.width)
        expect(Math.abs(leftGap - rightGap), title).toBeLessThanOrEqual(1)
        if (title === 'Villette') expect(cover.width, 'narrower than its box').toBeLessThan(box.width - 20)
        if (title === 'Villette') expect(marksOf(look, RED.rgb, LIGHT).ribbon).toBe(true)
      }
    } finally {
      await stopAndRemove(server)
    }
  })
})
