// Story 8.1 See my catalog as covers: the third Catalog view, Tiles (FR-25,
// UX-DR54, UX-DR55, UX-DR58). The toggle's three options and the remembered
// choice, the grid and its tiles, covers loading without moving the grid,
// the typeset cover (Story 8.3) in place of a missing one, search, sort and filters in Tiles, the add and
// delete hand-offs, the keyboard, and the 500-cover speed check (NFR7).
// The catalog view's `coverFile` is pinned at API level
// (backend/tests/test_bookcase_view.py), the stored choice in
// src/lib/catalogView.test.ts.

import type { Locator, Page } from '@playwright/test'
import {
  ACCENT,
  bookcase,
  finished,
  search,
  shelfOf,
  spines,
  SWING_TIME,
  tabIntoBookcase,
  TUFTE,
  viewToggle,
} from './bookcase.ts'
import { expect, startSeededServer, test } from './fixtures.ts'
import { stopAndRemove } from './home.ts'
import { COVER_PNG } from './intents.ts'
import {
  BROKEN_COVER,
  bookId,
  coverBox,
  DUNE_COVER,
  ringRect,
  sameRect,
  storeTiles,
  tile,
  tileLinks,
  tileNames,
  tiles,
} from './tiles.ts'

// DESIGN.md colors, light theme.
const LINE = 'rgb(228, 223, 213)'
const SURFACE_INSET = 'rgb(250, 249, 246)'
const INK_SECONDARY = 'rgb(95, 99, 92)'
const SPINE_UNREAD_TEXT = 'rgb(119, 113, 106)'

// "About 1 second" (FR-25, EXPERIENCE.md → Tiles → Covers), with a fifth of slack.
const FIRST_SCREEN_BUDGET_MS = 1200

/**
 * Nine Books seeded out of order. Under the default Author sort they stand
 * Bleak House, Tufte, Dune (edition 1), Dune (edition 2), Emma, Kindred,
 * Good Omens, The Science of Discworld, Austerlitz: seven on the first row at
 * 1280px, two on the second. The Dunes are twins, Good Omens has two authors
 * and Discworld three, Tufte's title needs an ellipsis, Dune (edition 1) has
 * a cover and Kindred's cover file is broken.
 */
const TILE_SHELF = [
  { id: bookId(1), title: 'Austerlitz', authors: ['W. G. Sebald'], readings: finished() },
  { id: bookId(2), title: 'Emma', authors: ['Jane Austen'] },
  { id: bookId(3), title: 'Dune', authors: ['Frank Herbert'], edition: 1, coverFile: DUNE_COVER },
  { id: bookId(4), title: 'Good Omens', authors: ['Terry Pratchett', 'Neil Gaiman'] },
  { id: bookId(5), title: 'Dune', authors: ['Frank Herbert'], edition: 2 },
  { id: bookId(6), title: 'Bleak House', authors: ['Charles Dickens'], readings: finished() },
  { id: bookId(7), title: 'The Science of Discworld', authors: ['Terry Pratchett', 'Ian Stewart', 'Jack Cohen'] },
  { id: bookId(8), title: TUFTE, authors: ['Edward R. Tufte'] },
  { id: bookId(9), title: 'Kindred', authors: ['Octavia E. Butler'], coverFile: BROKEN_COVER },
]
/** The Book with no cover, for the tests that start a server without cover files. */
function withoutCover<B extends { coverFile?: string }>(book: B): B {
  return { ...book, coverFile: undefined }
}

const TILE_FILES = { [DUNE_COVER]: COVER_PNG, [BROKEN_COVER]: 'not an image' }

const BLEAK_HOUSE = 'Bleak House by Charles Dickens, finished'
const TUFTE_NAME = `${TUFTE} by Edward R. Tufte, not read yet`
const DUNE_1 = 'Dune by Frank Herbert, edition 1, not read yet'
const DUNE_2 = 'Dune by Frank Herbert, edition 2, not read yet'
const EMMA = 'Emma by Jane Austen, not read yet'
const KINDRED = 'Kindred by Octavia E. Butler, not read yet'
const GOOD_OMENS = 'Good Omens by Terry Pratchett and 1 other, not read yet'
const DISCWORLD = 'The Science of Discworld by Terry Pratchett and 2 others, not read yet'
const AUSTERLITZ = 'Austerlitz by W. G. Sebald, finished'
const BY_AUTHOR = [BLEAK_HOUSE, TUFTE_NAME, DUNE_1, DUNE_2, EMMA, KINDRED, GOOD_OMENS, DISCWORLD, AUSTERLITZ]

function sortSelect(page: Page): Locator {
  return page.getByRole('main').getByRole('combobox', { name: 'Sort', exact: true })
}

test.describe('Story 8.1 See my catalog as covers (ATDD)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.setViewportSize({ width: 1280, height: 900 })
  })

  test('[P1] AC-2 the Catalog view toggle offers Bookcase, List and Tiles, and remembers Tiles', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: TILE_SHELF.slice(0, 3).map(withoutCover) })
    await page.goto(`${server.url}/catalog`)
    const toggle = viewToggle(page)

    await expect(toggle.getByRole('button')).toHaveText(['Bookcase', 'List', 'Tiles'])
    const tilesButton = toggle.getByRole('button', { name: 'Tiles', exact: true })
    await expect(toggle.getByRole('button', { name: 'Bookcase', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(tilesButton).toHaveAttribute('aria-pressed', 'false')

    await tilesButton.click()
    await expect(tilesButton).toHaveAttribute('aria-pressed', 'true')
    await expect(toggle.getByRole('button', { name: 'Bookcase', exact: true })).toHaveAttribute('aria-pressed', 'false')
    await expect(toggle.getByRole('button', { name: 'List', exact: true })).toHaveAttribute('aria-pressed', 'false')
    await expect(tiles(page)).toBeVisible()
    await expect(bookcase(page)).toBeHidden()
    await expect(page.getByRole('table')).toBeHidden()
    // In the theme toggle's look: a pressed option looks like the pressed theme option.
    const pressedLook = (button: Locator) =>
      button.evaluate((element) => {
        const style = getComputedStyle(element)
        return [style.backgroundColor, style.color, style.borderTopColor, style.fontSize, style.height]
      })
    const theme = page.getByRole('group', { name: 'Theme', exact: true })
    expect(await pressedLook(tilesButton)).toEqual(await pressedLook(theme.locator('button[aria-pressed="true"]')))

    // Remembered under bookvie.catalogView.
    expect(await page.evaluate(() => window.localStorage.getItem('bookvie.catalogView'))).toBe('tiles')
    await page.reload()
    await expect(tilesButton).toHaveAttribute('aria-pressed', 'true')
    await expect(tiles(page)).toBeVisible()
  })

  test('[P0] AC-3 Tiles show the Books as a list of tiles, 7 to a row at 1280px, each one link named like its spine', async ({
    page,
  }) => {
    await storeTiles(page)
    const server = await startSeededServer(test.info(), 'tiles-grid', { books: TILE_SHELF }, TILE_FILES)
    try {
      await page.goto(`${server.url}/catalog`)

      await expect(tiles(page)).toHaveAccessibleName('Tiles, 9 books')
      // One link per list item, in sort order, named like the spines (twins and "and N others" included).
      await expect(tiles(page).getByRole('listitem')).toHaveCount(9)
      await expect(tileLinks(page)).toHaveCount(9)
      expect(await tileNames(page)).toEqual(BY_AUTHOR)

      // The grid: plain page background, 24px columns gaps, 32px row gaps, 7 columns at 1280px.
      const grid = await tiles(page).evaluate((element) => {
        const style = getComputedStyle(element)
        return {
          display: style.display,
          columns: style.gridTemplateColumns.split(' ').length,
          columnGap: style.columnGap,
          rowGap: style.rowGap,
          background: style.backgroundColor,
          minColumn: Math.min(...style.gridTemplateColumns.split(' ').map((width) => parseFloat(width))),
        }
      })
      expect(grid).toMatchObject({ display: 'grid', columns: 7, columnGap: '24px', rowGap: '32px' })
      expect(grid.background).toBe('rgba(0, 0, 0, 0)')
      expect(grid.minColumn).toBeGreaterThanOrEqual(140)
      const tops = await tiles(page)
        .getByRole('listitem')
        .evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().top)))
      expect(tops.filter((top) => top === tops[0])).toHaveLength(7)

      // Each tile: a 2:3 cover box, the 11px reading-bar slot and the 8px caption gap, then title and author.
      const dune = tile(page, DUNE_1)
      const { box } = await coverBox(dune)
      expect(Math.abs(box.height - box.width * 1.5)).toBeLessThanOrEqual(1.5)
      const title = dune.getByText('Dune', { exact: true })
      const titleBox = (await title.boundingBox())!
      expect(Math.round(titleBox.y - (box.y + box.height))).toBe(11 + 8)
      await expect(title).toHaveCSS('font-family', /^ui-serif/)
      await expect(title).toHaveCSS('font-size', '15.5px')
      await expect(title).toHaveCSS('font-weight', '600')
      // The first author only: "and 1 other" is in the name, not the caption.
      const omens = tile(page, GOOD_OMENS)
      // Good Omens has no cover, so its typeset cover writes the author first: the caption's is the last.
      await expect(omens.getByText('Terry Pratchett', { exact: true }).last()).toBeVisible()
      await expect(omens).not.toContainText('Neil Gaiman')
      const author = omens.getByText('Terry Pratchett', { exact: true }).last()
      await expect(author).toHaveCSS('font-size', '14px')
      await expect(author).toHaveCSS('color', INK_SECONDARY)
      // One line each, cut with an ellipsis.
      // Tufte has no cover either: the caption's title is the last.
      const tufteTitle = tile(page, TUFTE_NAME).getByText(TUFTE, { exact: true }).last()
      for (const line of [tufteTitle, author]) {
        await expect(line).toHaveCSS('white-space', 'nowrap')
        await expect(line).toHaveCSS('text-overflow', 'ellipsis')
        await expect(line).toHaveCSS('overflow', 'hidden')
      }
      expect(await tufteTitle.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true)

      // Built by the spine's function: the bookcase names the same Books the same way.
      await viewToggle(page).getByRole('button', { name: 'Bookcase', exact: true }).click()
      const names = await spines(page).evaluateAll((buttons) => buttons.map((b) => b.getAttribute('aria-label')))
      expect(names).toEqual(BY_AUTHOR)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-3 the grid packs 5 columns at 1024px and 8 at 1440px', async ({ page, seededServer }) => {
    await storeTiles(page)
    const server = await seededServer({ books: TILE_SHELF.map(withoutCover) })
    await page.goto(`${server.url}/catalog`)
    const columns = () =>
      tiles(page).evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)

    // DESIGN.md → Layout → Tiles.
    await page.setViewportSize({ width: 1024, height: 900 })
    await expect.poll(columns).toBe(5)
    await page.setViewportSize({ width: 1440, height: 900 })
    await expect.poll(columns).toBe(8)
  })

  test('[P1] AC-3 a twin tile keeps its edition in its name when a filter hides the other twin', async ({
    page,
    seededServer,
  }) => {
    await storeTiles(page)
    const herbert = ['Frank Herbert']
    const server = await seededServer({
      books: [
        { title: 'Dune', authors: herbert, edition: 1, type: 'hardcover' },
        { title: 'Dune', authors: herbert, edition: 2, type: 'paperback' },
        { title: 'Emma', authors: ['Jane Austen'], type: 'paperback' },
      ],
    })
    await page.goto(`${server.url}/catalog`)
    // The grid renders after the catalog view arrives, so wait for it.
    await expect.poll(() => tileNames(page)).toEqual([DUNE_1, DUNE_2, EMMA])

    // Hardcover hides edition 2; the shown Dune keeps its qualifier.
    const type = page.getByRole('main').getByRole('group', { name: 'Type', exact: true })
    await type.getByRole('button', { name: 'Hardcover', exact: true }).click()
    await expect(tiles(page).locator('li[hidden]')).toHaveCount(2)
    expect(await tileNames(page)).toEqual([DUNE_1])
  })

  test('[P1] AC-4 a cover is shown whole at the bottom of a box that never changes size, flat until it loads', async ({
    page,
  }) => {
    await storeTiles(page)
    // Hold Dune's cover back until the empty box has been read.
    let release: () => void = () => {}
    const held = new Promise<void>((resolve) => (release = resolve))
    await page.route('**/media/covers/dune.png', async (route) => {
      await held
      await route.continue()
    })
    const server = await startSeededServer(test.info(), 'tiles-cover', { books: TILE_SHELF }, TILE_FILES)
    try {
      await page.goto(`${server.url}/catalog`)
      const dune = tile(page, DUNE_1)
      const image = dune.locator('img')

      await expect(image).toHaveAttribute('src', '/media/covers/dune.png')
      await expect(image).toHaveAttribute('loading', 'lazy')
      await expect(image).toHaveAttribute('decoding', 'async')
      await expect(image).toHaveAttribute('alt', '')

      // Loading: a flat surface-inset fill with the 1px line hairline.
      const loading = await coverBox(dune)
      expect(loading.fills).toContainEqual(
        expect.objectContaining({
          background: SURFACE_INSET,
          borderStyle: 'solid',
          borderWidth: '1px',
          borderColor: LINE,
        }),
      )

      release()
      await expect
        .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
        .toBe(true)
      const loaded = await coverBox(dune)
      expect(sameRect(loaded.box, loading.box)).toBe(true)
      // Shown whole, at the bottom, 4px corners, a 1px line hairline, never dimmed or shadowed.
      const look = await image.evaluate((img) => {
        const style = getComputedStyle(img)
        const r = img.getBoundingClientRect()
        return {
          objectFit: style.objectFit,
          objectPosition: style.objectPosition,
          radius: style.borderTopLeftRadius,
          border: [style.borderTopStyle, style.borderTopWidth, style.borderTopColor],
          shadow: style.boxShadow,
          filter: style.filter,
          opacity: style.opacity,
          bottom: r.bottom,
          top: r.top,
          left: r.left,
          right: r.right,
        }
      })
      expect(look).toMatchObject({
        objectFit: 'contain',
        radius: '4px',
        border: ['solid', '1px', LINE],
        shadow: 'none',
        filter: 'none',
        opacity: '1',
      })
      expect(look.objectPosition).toMatch(/ 100%$/)
      const { box } = loaded
      expect(Math.abs(look.bottom - (box.y + box.height))).toBeLessThanOrEqual(1)
      expect(look.top).toBeGreaterThanOrEqual(box.y - 1)
      expect(look.left).toBeGreaterThanOrEqual(box.x - 1)
      expect(look.right).toBeLessThanOrEqual(box.x + box.width + 1)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] AC-5 a Book without a cover, or with a cover that fails to load, shows the typeset cover at the box size', async ({
    page,
  }) => {
    await storeTiles(page)
    const server = await startSeededServer(test.info(), 'tiles-no-cover', { books: TILE_SHELF }, TILE_FILES)
    try {
      await page.goto(`${server.url}/catalog`)
      // Story 8.3 replaced the no-cover placeholder in Tiles with the typeset cover (its look is pinned in
      // catalog-typeset-covers.spec.ts): here, the title is written in the box, with no image, at the box size.
      const boxText = (link: Locator) =>
        link.evaluate((element) => {
          const width = (element.closest('li') ?? element).getBoundingClientRect().width
          const box = Array.from(element.querySelectorAll('*')).find((node) => {
            const r = node.getBoundingClientRect()
            return Math.abs(r.width - width) <= 1 && Math.abs(r.height - r.width * 1.5) <= 1.5
          })
          return box?.textContent ?? ''
        })
      // The color of the title written in the box: spine-label on a read Book's plate, spine-unread-text on an unread one.
      const titleColor = (link: Locator, title: string) =>
        link.evaluate((element, title) => {
          const width = (element.closest('li') ?? element).getBoundingClientRect().width
          const box = Array.from(element.querySelectorAll('*')).find((node) => {
            const r = node.getBoundingClientRect()
            return Math.abs(r.width - width) <= 1 && Math.abs(r.height - r.width * 1.5) <= 1.5
          })
          const leaf = Array.from(box?.querySelectorAll('*') ?? []).find(
            (node) => node.children.length === 0 && (node.textContent ?? '').trim() === title,
          )
          return leaf ? getComputedStyle(leaf).color : null
        }, title)

      await expect.poll(() => boxText(tile(page, DUNE_2))).toContain('Dune')
      await expect(tile(page, DUNE_2).locator('img')).toHaveCount(0)
      // Dune 2 is unread: the unread typeset cover.
      expect(await titleColor(tile(page, DUNE_2), 'Dune')).toBe(SPINE_UNREAD_TEXT)
      // Kindred's file is there but isn't an image: once it fails, the typeset cover, and no broken image.
      await expect.poll(() => boxText(tile(page, KINDRED))).toContain('Kindred')
      await expect(tile(page, KINDRED).locator('img:visible')).toHaveCount(0)
      // Kindred is unread too.
      expect(await titleColor(tile(page, KINDRED), 'Kindred')).toBe(SPINE_UNREAD_TEXT)
      // Same box as a covered tile's.
      const dune = await coverBox(tile(page, DUNE_1))
      const dune2 = await coverBox(tile(page, DUNE_2))
      const kindred = await coverBox(tile(page, KINDRED))
      expect([dune2.box.width, dune2.box.height]).toEqual([dune.box.width, dune.box.height])
      expect([kindred.box.width, kindred.box.height]).toEqual([dune.box.width, dune.box.height])
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P0] AC-6 Search, Sort and filters reorder and hide tiles, announce the count, and the empty states replace the grid', async ({
    page,
    seededServer,
  }) => {
    await storeTiles(page)
    const server = await seededServer({ books: TILE_SHELF.map(withoutCover) })
    await page.goto(`${server.url}/catalog`)

    await sortSelect(page).selectOption({ label: 'Title' })
    await expect
      .poll(() => tileNames(page))
      .toEqual([AUSTERLITZ, BLEAK_HOUSE, DUNE_1, DUNE_2, EMMA, GOOD_OMENS, KINDRED, DISCWORLD, TUFTE_NAME])

    // Search titles hides the rest, the grid closes up, and the count is announced.
    await search(page).fill('dune')
    await expect(page.getByRole('status')).toHaveText('2 books match.')
    expect(await tileNames(page)).toEqual([DUNE_1, DUNE_2])
    await expect(tiles(page).locator('li[hidden]')).toHaveCount(7)
    const first = (await tile(page, DUNE_1).boundingBox())!
    const second = (await tile(page, DUNE_2).boundingBox())!
    expect(Math.round(second.y)).toBe(Math.round(first.y))
    expect(second.x - (first.x + first.width)).toBeLessThanOrEqual(24 + 1)

    // A filter chip, the same way.
    await search(page).fill('')
    await page
      .getByRole('group', { name: 'Status', exact: true })
      .getByRole('button', { name: 'Read', exact: true })
      .click()
    await expect(page.getByRole('status')).toHaveText('2 books match.')
    expect(await tileNames(page)).toEqual([AUSTERLITZ, BLEAK_HOUSE])

    // Search and filters together matching nothing: the filters' line and link, in place of the grid.
    await search(page).fill('dune')
    const main = page.getByRole('main')
    await expect(main.getByText('No books match these filters.', { exact: true })).toBeVisible()
    await expect(tiles(page)).toBeHidden()
    await main.getByRole('button', { name: 'Clear filters', exact: true }).last().click()
    await expect.poll(() => tileNames(page)).toEqual([DUNE_1, DUNE_2])

    // The search alone matching nothing.
    await search(page).fill('zzz')
    await expect(main.getByText('No titles match “zzz”.', { exact: true })).toBeVisible()
    await expect(tiles(page)).toBeHidden()

    // An empty library: the empty shelf and New book, no grid.
    const empty = await seededServer({ books: [] })
    await page.goto(`${empty.url}/catalog`)
    await expect(main.getByText('Your shelf is empty. Add your first book.', { exact: true })).toBeVisible()
    await expect(main.getByRole('button', { name: 'New book', exact: true })).toBeVisible()
    await expect(tiles(page)).toHaveCount(0)
  })

  test('[P1] AC-7 a Book added in Tiles is cleared into view, scrolled to, focused and ringed around its cover box', async ({
    page,
    seededServer,
  }) => {
    await storeTiles(page)
    // Under Author the new Book (Zadie Smith) sorts last, far below the fold.
    const server = await seededServer({ books: shelfOf(300) })
    await page.goto(`${server.url}/catalog`)
    // A search that would hide the new Book.
    await search(page).fill('Book 001')
    await page.getByRole('button', { name: 'New book', exact: true }).click()
    const panel = page.getByRole('dialog', { name: 'New book', exact: true })
    for (const [label, value] of Object.entries(SWING_TIME)) {
      await panel.getByLabel(label, { exact: true }).fill(value)
    }
    await panel.getByRole('combobox', { name: 'Type', exact: true }).selectOption('Paperback')
    await panel.getByRole('button', { name: 'Add book', exact: true }).click()
    const added = tile(page, 'Swing Time by Zadie Smith, not read yet')

    await expect(added).toBeFocused()
    await expect(panel).toBeHidden()
    await expect(search(page)).toHaveValue('')
    await expect(tileLinks(page)).toHaveCount(301)
    await expect(added).toBeInViewport()
    await expect(page.getByRole('status')).toHaveText('Added Swing Time.')
    // The highlight ring goes around the cover box, not the whole tile.
    // Both read on each try: a smooth scroll can still be settling its last pixels.
    await expect
      .poll(async () => {
        const ring = await ringRect(added, ACCENT)
        return ring !== null && sameRect(ring, (await coverBox(added)).box)
      })
      .toBe(true)
  })

  test('[P1] AC-8 after a delete, Catalog comes back in Tiles with Search titles focused', async ({
    page,
    seededServer,
  }) => {
    await storeTiles(page)
    const server = await seededServer({ books: TILE_SHELF.slice(0, 3).map(withoutCover) })
    // Catalog first, so there is a history entry behind Book detail.
    await page.goto(`${server.url}/catalog`)
    await page.goto(`${server.url}/book/${bookId(2)}`)
    await page.getByRole('main').getByRole('button', { name: 'Delete', exact: true }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete book', exact: true }).click()

    await expect(tiles(page)).toHaveAccessibleName('Tiles, 2 books')
    await expect(search(page)).toBeFocused()
    await expect(page.getByRole('status')).toHaveText('Deleted Emma.')
    expect(await tileNames(page)).toEqual(['Dune by Frank Herbert, not read yet', AUSTERLITZ])
  })

  test('[P1] AC-9 each tile is one Tab stop in sort order, ringed around its cover box, and Enter opens Book detail', async ({
    page,
    seededServer,
  }) => {
    await storeTiles(page)
    const server = await seededServer({ books: TILE_SHELF.map(withoutCover) })
    await page.goto(`${server.url}/catalog`)
    // The Tab stop before the grid is "How long until…?", as for the bookcase.
    await tabIntoBookcase(page)

    await expect(tile(page, BLEAK_HOUSE)).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(tile(page, TUFTE_NAME)).toBeFocused()
    await page.keyboard.press('Tab')
    const dune = tile(page, DUNE_1)
    await expect(dune).toBeFocused()
    // The 2px accent focus ring, around the cover box.
    const ring = await ringRect(dune, ACCENT)
    expect(ring).not.toBeNull()
    expect(sameRect(ring!, (await coverBox(dune)).box)).toBe(true)
    // An outline is 2px; a box-shadow ring shows 2px of accent outside a 2px page gap.
    expect(ring!.outlineWidth ?? '2px').toBe('2px')

    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(`${server.url}/book/${bookId(3)}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Dune', exact: true })).toBeVisible()
  })

  test('[P1] AC-10 with 500 Books with 1200px covers, Tiles shows its first screen of covers in about 1 second, and scrolling shifts nothing', async ({
    page,
  }, testInfo) => {
    test.setTimeout(240_000)
    // An 800×1200 JPEG with enough detail to weigh like a real cover.
    await page.goto('about:blank')
    const jpeg = Buffer.from(
      await page.evaluate(() => {
        const canvas = document.createElement('canvas')
        canvas.width = 800
        canvas.height = 1200
        const context = canvas.getContext('2d')!
        let seed = 7
        const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
        for (let y = 0; y < 1200; y += 20) {
          for (let x = 0; x < 800; x += 20) {
            context.fillStyle = `hsl(${Math.floor(random() * 360)} 50% ${30 + Math.floor(random() * 40)}%)`
            context.fillRect(x, y, 20, 20)
          }
        }
        return canvas.toDataURL('image/jpeg', 0.85).split(',')[1]!
      }),
      'base64',
    )
    const books = shelfOf(500).map((book, n) => ({
      ...book,
      coverFile: `covers/c-${String(n + 1).padStart(3, '0')}.jpg`,
    }))
    const files = Object.fromEntries(books.map((book) => [book.coverFile, jpeg]))
    const server = await startSeededServer(testInfo, 'tiles-500', { books }, files)
    try {
      await page.goto(`${server.url}/catalog`)
      await bookcase(page).waitFor()

      // From pressing Tiles to the grid with every cover on the first screen decoded.
      const elapsed = await page.evaluate(
        () =>
          new Promise<number>((resolve, reject) => {
            const group = document.querySelector('[role="group"][aria-label="Catalog view"]')
            const button = Array.from(group?.querySelectorAll('button') ?? []).find((b) => b.textContent === 'Tiles')
            if (!button) return reject(new Error('no Tiles option'))
            const start = performance.now()
            button.click()
            const check = () => {
              const onScreen = Array.from(document.querySelectorAll<HTMLImageElement>('main li img')).filter((img) => {
                const r = img.getBoundingClientRect()
                return r.bottom > 0 && r.top < window.innerHeight
              })
              if (onScreen.length > 0 && onScreen.every((img) => img.complete && img.naturalWidth > 0)) {
                resolve(performance.now() - start)
              } else if (performance.now() - start > 30_000) {
                reject(new Error('the first screen of covers never finished'))
              } else {
                requestAnimationFrame(check)
              }
            }
            requestAnimationFrame(check)
          }),
      )
      testInfo.annotations.push({ type: 'tiles first screen (ms)', description: String(Math.round(elapsed)) })
      expect(elapsed).toBeLessThanOrEqual(FIRST_SCREEN_BUDGET_MS)
      await expect(tiles(page)).toHaveAccessibleName('Tiles, 500 books')

      // Scroll to the end a screen at a time: covers arrive, nothing moves.
      const shift = await page.evaluate(async () => {
        let total = 0
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as (PerformanceEntry & { value: number })[]) total += entry.value
        })
        observer.observe({ type: 'layout-shift' })
        const pause = () => new Promise((resolve) => setTimeout(resolve, 100))
        while (window.scrollY + window.innerHeight < document.documentElement.scrollHeight - 1) {
          window.scrollBy(0, window.innerHeight)
          await pause()
        }
        await pause()
        observer.disconnect()
        return total
      })
      testInfo.annotations.push({ type: 'tiles layout shift while scrolling', description: String(shift) })
      expect(shift).toBe(0)
    } finally {
      await stopAndRemove(server)
    }
  })
})
