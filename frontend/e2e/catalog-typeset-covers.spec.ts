// Story 8.3 Give books without a cover a typeset cover: on Catalog's Tiles, a
// Book without a cover (or whose cover fails to load) gets a typeset cover in
// place of the no-cover placeholder (FR-25, UX-DR57). The read one is the
// Book's exact spine color with a paper plate holding the title and the first
// author, clear of Story 8.2's ribbon; the unread one is an unread spine seen
// from the front. Dark theme, forced colors, and the places that keep the old
// placeholder (Main book card, Up next, Book detail).
//
// "Read" is the catalog view's `finished`, as on the bookcase: a Main book
// never finished is an unread spine with a fill, so its tile is the unread
// typeset cover. The cover's look is checked by its pixels (a screenshot of
// each tile at device scale 2) and its text by computed styles, so the leaves
// don't pin how the build draws it. No API change: `coverFile` and `finished`
// are already in the catalog view (Story 8.1), so there is no API leaf.

import type { Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import { mainBookCard, sizeOf, stopAndRemove, upNextPane } from './home.ts'
import {
  DARK,
  inOrder,
  LIGHT,
  lookOf,
  near,
  OLIVE,
  PURPLE,
  RED,
  RIBBON,
  type Rgb,
  SPINE_LABEL_STRIP,
  storeTiles,
  tileItem,
} from './tile-marks.ts'
import {
  BLEAK_HOUSE,
  boxFacts,
  count,
  EMMA,
  GOOD_OMENS,
  GOOD_OMENS_ID,
  inside,
  JEKYLL,
  JEKYLL_TITLE,
  KINDRED,
  MIDDLEMARCH,
  NOSTROMO,
  pixelsAt,
  SPINE_LABEL,
  SPINE_LABEL_STRIP_CSS,
  type TextLook,
  TYPESET,
  typesetOf,
  typesetServer,
  UNREAD,
  WIDE_COVER,
} from './typeset-covers.ts'

/** The CanvasText and Canvas colors of the current forced-colors palette, read from a probe element. */
function forcedPalette(page: Page): Promise<[Rgb, Rgb]> {
  return page.evaluate(() => {
    const probe = document.createElement('div')
    probe.style.color = 'CanvasText'
    probe.style.backgroundColor = 'Canvas'
    document.body.append(probe)
    const style = getComputedStyle(probe)
    const rgb = (value: string) => value.match(/\d+/g)!.slice(0, 3).map(Number) as [number, number, number]
    const colors: [Rgb, Rgb] = [rgb(style.color), rgb(style.backgroundColor)]
    probe.remove()
    return colors
  })
}

test.describe('Story 8.3 Give books without a cover a typeset cover (ATDD)', () => {
  test.use({ deviceScaleFactor: 2 })

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.setViewportSize({ width: 1280, height: 900 })
  })

  test('[P0] AC-1 a read Book without a cover gets its spine color with a paper plate holding the title and the first author, clear of the ribbon', async ({
    page,
  }, testInfo) => {
    const server = await typesetServer(page, testInfo)
    try {
      await storeTiles(page)
      await page.goto(`${server.url}/catalog`)
      const goodOmens = tileItem(page, GOOD_OMENS)

      // The box is filled with Good Omens' exact spine color (beside and below the plate).
      await expect.poll(async () => near((await typesetOf(goodOmens, OLIVE.rgb)).sideFill, OLIVE.rgb, 24)).toBe(true)

      const look = await typesetOf(goodOmens, OLIVE.rgb)
      // A 1px spine-edge border all round, with 4px corners (the corner pixel is the page).
      const edge = count(look.leftEdge, LIGHT.spineEdge)
      expect(edge).toBeGreaterThanOrEqual(1)
      expect(edge).toBeLessThanOrEqual(2)
      for (const pixel of [look.topEdge, look.rightEdge, look.bottomEdge]) {
        expect(near(pixel, LIGHT.spineEdge, 40)).toBe(true)
      }
      expect(near(look.corner, look.page, 24)).toBe(true)

      // The plate: spine-label-strip, 10px in from each side, starting 34px from the top.
      expect(look.plate).not.toBeNull()
      const plate = look.plate!
      expect(Math.abs(plate.y - look.box.y - TYPESET.plateTop)).toBeLessThanOrEqual(1)
      expect(Math.abs(plate.x - look.box.x - TYPESET.plateInset)).toBeLessThanOrEqual(1)
      expect(Math.abs(look.box.x + look.box.width - (plate.x + plate.width) - TYPESET.plateInset)).toBeLessThanOrEqual(
        1,
      )

      // The title (book-title-sm at 400, spine-label) and the first author only (meta), nothing else.
      expect(look.texts.map((text) => text.text)).toEqual(['Good Omens', 'Terry Pratchett'])
      const [title, author] = look.texts as [TextLook, TextLook]
      expect(title).toMatchObject({ color: SPINE_LABEL, fontSize: '15.5px', fontWeight: '400' })
      expect(title.fontFamily).toMatch(/^ui-serif/)
      expect(author).toMatchObject({ color: SPINE_LABEL, fontSize: '13px', fontWeight: '400' })
      expect(author.fontFamily).toMatch(/^system-ui/)
      // No text straight on the Book's color: every run of text is on the plate.
      for (const text of look.texts) expect(inside(text.rect, plate), text.text).toBe(true)

      // The ribbon (finished) still shows on the colored box, and hangs clear of the plate.
      const marks = await lookOf(goodOmens)
      expect(inOrder(marks.scanRight, [OLIVE.rgb, LIGHT.spineEdge, SPINE_LABEL_STRIP, OLIVE.rgb])).toBe(true)
      expect(near(look.belowRibbon, OLIVE.rgb, 24)).toBe(true)
      expect(plate.y - look.box.y).toBeGreaterThan(RIBBON.height + 1.5)

      // A title too long for four lines stops at four; an author too long for one line stays on one.
      const jekyll = await typesetOf(tileItem(page, JEKYLL), RED.rgb)
      expect(jekyll.plate).not.toBeNull()
      const [longTitle, longAuthor] = jekyll.texts as [TextLook, TextLook]
      expect(longTitle.text).toBe(JEKYLL_TITLE)
      expect(longTitle.rect.height / longTitle.lineHeight).toBeGreaterThan(TYPESET.titleLines - 0.5)
      expect(longTitle.rect.height / longTitle.lineHeight).toBeLessThanOrEqual(TYPESET.titleLines + 0.05)
      expect(longAuthor.text).toBe('Robert Louis Stevenson')
      expect(longAuthor.rect.height / longAuthor.lineHeight).toBeLessThanOrEqual(1.05)
      for (const text of jekyll.texts) expect(inside(text.rect, jekyll.plate!), text.text).toBe(true)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] AC-2 an unread Book without a cover gets the unread typeset cover: unread fill, solid outline, unread text, no plate', async ({
    page,
  }, testInfo) => {
    const server = await typesetServer(page, testInfo)
    try {
      await storeTiles(page)
      await page.goto(`${server.url}/catalog`)
      const kindred = tileItem(page, KINDRED)

      // The title and the author are written on the box, in spine-unread-text.
      await expect
        .poll(async () => (await boxFacts(kindred)).texts.map((text) => [text.text, text.color]))
        .toEqual([
          ['Kindred', UNREAD.light.text],
          ['Octavia E. Butler', UNREAD.light.text],
        ])

      const look = await typesetOf(kindred, UNREAD.light.fill)
      // spine-unread-fill, never the Book's own color.
      expect(near(look.sideFill, UNREAD.light.fill, 2)).toBe(true)
      expect(look.backgrounds).not.toContain(`rgb(${PURPLE.rgb.join(', ')})`)
      // A solid (not dashed) 1.5px spine-unread-outline border.
      expect(look.leftRun.every((pixel) => near(pixel, UNREAD.light.outline, 24))).toBe(true)
      const outline = count(look.leftEdge, UNREAD.light.outline, 24)
      expect(outline).toBeGreaterThanOrEqual(3)
      expect(outline).toBeLessThanOrEqual(4)
      // No plate: nothing in the box paints spine-label-strip.
      expect(look.backgrounds).not.toContain(SPINE_LABEL_STRIP_CSS)

      // The Main book, never finished, is unread too (as on its spine), and keeps its reading bar.
      const emma = await typesetOf(tileItem(page, EMMA), UNREAD.light.fill)
      expect(emma.texts.map((text) => [text.text, text.color])).toEqual([
        ['Emma', UNREAD.light.text],
        ['Jane Austen', UNREAD.light.text],
      ])
      expect(near(emma.sideFill, UNREAD.light.fill, 2)).toBe(true)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] AC-3 a cover image that fails to load is replaced by the typeset cover for its read state', async ({
    page,
  }, testInfo) => {
    const server = await typesetServer(page, testInfo)
    try {
      await storeTiles(page)
      await page.goto(`${server.url}/catalog`)
      const middlemarch = tileItem(page, MIDDLEMARCH)

      // Middlemarch is read and its cover file isn't an image: its box is filled with its spine color.
      await expect.poll(async () => near((await typesetOf(middlemarch, RED.rgb)).sideFill, RED.rgb, 24)).toBe(true)

      const look = await typesetOf(middlemarch, RED.rgb)
      expect(look.visibleImg).toBe(false)
      expect(look.plate).not.toBeNull()
      expect(Math.abs(look.plate!.y - look.box.y - TYPESET.plateTop)).toBeLessThanOrEqual(1)
      expect(look.texts.map((text) => [text.text, text.color])).toEqual([
        ['Middlemarch', SPINE_LABEL],
        ['George Eliot', SPINE_LABEL],
      ])

      // Nostromo is unread with the same broken file: the unread typeset cover.
      const nostromo = await typesetOf(tileItem(page, NOSTROMO), UNREAD.light.fill)
      expect(nostromo.visibleImg).toBe(false)
      expect(near(nostromo.sideFill, UNREAD.light.fill, 2)).toBe(true)
      expect(nostromo.texts.map((text) => [text.text, text.color])).toEqual([
        ['Nostromo', UNREAD.light.text],
        ['Joseph Conrad', UNREAD.light.text],
      ])

      // A cover that loads stays a cover: no typeset text over Bleak House's.
      const bleakHouse = await boxFacts(tileItem(page, BLEAK_HOUSE))
      expect(bleakHouse.visibleImg).toBe(true)
      expect(bleakHouse.texts).toEqual([])
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-4 in the dark theme the read fill and plate stay while spine-edge and the unread colors take their dark twins; under forced colors the typeset cover is Canvas and CanvasText', async ({
    page,
  }, testInfo) => {
    const server = await typesetServer(page, testInfo)
    try {
      await page.emulateMedia({ colorScheme: 'dark' })
      await storeTiles(page)
      await page.goto(`${server.url}/catalog`)
      const goodOmens = tileItem(page, GOOD_OMENS)

      // The read fill is the same spine color in the dark theme.
      await expect.poll(async () => near((await typesetOf(goodOmens, OLIVE.rgb)).sideFill, OLIVE.rgb, 24)).toBe(true)

      const read = await typesetOf(goodOmens, OLIVE.rgb)
      // The plate stays light, its text spine-label; only the edge takes its dark twin.
      expect(read.plate).not.toBeNull()
      expect(Math.abs(read.plate!.y - read.box.y - TYPESET.plateTop)).toBeLessThanOrEqual(1)
      expect(read.texts.map((text) => text.color)).toEqual([SPINE_LABEL, SPINE_LABEL])
      expect(count(read.leftEdge, DARK.spineEdge)).toBeGreaterThanOrEqual(1)
      expect(count(read.leftEdge, LIGHT.spineEdge, 12)).toBe(0)

      // The unread typeset cover takes the dark spine-unread-* colors, and still has no plate.
      const kindred = await typesetOf(tileItem(page, KINDRED), UNREAD.dark.fill)
      expect(near(kindred.sideFill, UNREAD.dark.fill, 6)).toBe(true)
      expect(count(kindred.leftEdge, UNREAD.dark.outline, 24)).toBeGreaterThanOrEqual(3)
      expect(kindred.texts.map((text) => text.color)).toEqual([UNREAD.dark.text, UNREAD.dark.text])
      expect(kindred.plate).toBeNull()

      // Forced colors: Canvas with a CanvasText border and CanvasText text, read or unread.
      await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' })
      const [canvasText, canvas] = await forcedPalette(page)
      const canvasTextCss = `rgb(${canvasText.join(', ')})`
      for (const name of [GOOD_OMENS, KINDRED]) {
        const forced = await typesetOf(tileItem(page, name), canvas)
        expect(near(forced.sideFill, canvas, 12), name).toBe(true)
        expect(count(forced.leftEdge, canvasText), name).toBeGreaterThanOrEqual(1)
        expect(near(forced.topEdge, canvasText, 40), name).toBe(true)
        expect(
          forced.texts.map((text) => text.color),
          name,
        ).toEqual([canvasTextCss, canvasTextCss])
      }
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] AC-5 the Main book card, the Up next thumbnail and Book detail keep the no-cover placeholder; the typeset cover is for tiles only', async ({
    page,
  }, testInfo) => {
    const server = await typesetServer(page, testInfo)
    try {
      await storeTiles(page)
      // Where the old placeholder stays: Home's Main book card (Emma) and Up next pane (Kindred), and Book detail.
      await page.goto(`${server.url}/`)
      const mainCard = await sizeOf(mainBookCard(page).getByRole('img', { name: 'No cover', exact: true }))
      const upNext = await sizeOf(upNextPane(page).getByRole('img', { name: 'No cover', exact: true }))
      await page.goto(`${server.url}/book/${GOOD_OMENS_ID}`)
      const detail = await sizeOf(page.getByRole('main').getByRole('img', { name: 'No cover', exact: true }))

      // One probe across all four places, so the tiles' change is told apart from the places that keep the placeholder.
      await page.goto(`${server.url}/catalog`)
      await expect
        .poll(async () => ({
          mainCard,
          upNext,
          detail,
          tile: near((await typesetOf(tileItem(page, GOOD_OMENS), OLIVE.rgb)).sideFill, OLIVE.rgb, 24)
            ? 'typeset'
            : 'placeholder',
        }))
        .toEqual({
          mainCard: { width: 200, height: 300 },
          upNext: { width: 44, height: 64 },
          detail: { width: 200, height: 300 },
          tile: 'typeset',
        })
    } finally {
      await stopAndRemove(server)
    }
  })
})

test.describe('Story 8.3 Give books without a cover a typeset cover (automate)', () => {
  test.use({ deviceScaleFactor: 2 })

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.setViewportSize({ width: 1280, height: 900 })
  })

  test('[P2] AC-3 while a cover is loading its box is the flat loading fill, not a typeset cover, and the cover shows once it arrives', async ({
    page,
  }, testInfo) => {
    // Hold Bleak House's cover back until the loading box has been read.
    let release: () => void = () => {}
    const held = new Promise<void>((resolve) => (release = resolve))
    await page.route(`**/media/${WIDE_COVER}`, async (route) => {
      await held
      await route.continue()
    })
    const server = await typesetServer(page, testInfo)
    try {
      await storeTiles(page)
      await page.goto(`${server.url}/catalog`)
      const bleakHouse = tileItem(page, BLEAK_HOUSE)
      await expect(bleakHouse.locator('img')).toHaveCount(1)

      // Loading: the flat surface-inset box (#FAF9F6), with no typeset text and nothing painted inside.
      const loading = await boxFacts(bleakHouse)
      expect(loading.texts).toEqual([])
      expect(loading.backgrounds).toEqual([])
      expect(loading.visibleImg).toBe(false)
      const [side] = await pixelsAt(bleakHouse, [[loading.box.x + 5, loading.box.y + loading.box.height * 0.85]])
      expect(near(side!, [250, 249, 246], 1)).toBe(true)

      // Loaded: the cover shows, still with no typeset text, in the same box.
      release()
      await expect.poll(async () => (await boxFacts(bleakHouse)).visibleImg).toBe(true)
      const loaded = await boxFacts(bleakHouse)
      expect(loaded.texts).toEqual([])
      expect(loaded.box).toEqual(loading.box)
    } finally {
      release()
      await stopAndRemove(server)
    }
  })

  test('[P3] AC-1 a view with an empty first author puts only the title on the plate', async ({ page }, testInfo) => {
    // The store refuses a Book without authors (invariants.py), so the view's '' fallback is forced here.
    const server = await typesetServer(page, testInfo)
    try {
      await page.route('**/api/views/catalog', async (route) => {
        const response = await route.fetch()
        const view = await response.json()
        for (const book of view.books) if (book.id === GOOD_OMENS_ID) book.firstAuthor = ''
        await route.fulfill({ response, json: view })
      })
      await storeTiles(page)
      await page.goto(`${server.url}/catalog`)
      const goodOmens = page.getByRole('listitem').filter({ hasText: 'Good Omens' })

      await expect.poll(async () => (await boxFacts(goodOmens)).texts.map((text) => text.text)).toEqual(['Good Omens'])
      const look = await typesetOf(goodOmens, OLIVE.rgb)
      expect(look.plate).not.toBeNull()
      for (const text of look.texts) expect(inside(text.rect, look.plate!), text.text).toBe(true)
      // No empty author line: the plate holds the title's lines and its padding only.
      const [title] = look.texts as [TextLook]
      expect(look.plate!.height).toBeLessThan(title.rect.height + 20)
    } finally {
      await stopAndRemove(server)
    }
  })
})
