// Story 8.1 See my catalog as covers: test automation after the story was
// done, beside the ATDD leaves in catalog-tiles.spec.ts. Forced colors and the
// dark theme on a tile, the stored view choice when storage holds junk or
// throws, the toggle from the keyboard, Tiles and Bookcase agreeing under
// every Sort with a search and a filter on, and the add hand-off's scroll,
// filter clearing and ring timing in Tiles, and the mouse on a tile.

import type { Locator, Page } from '@playwright/test'
import { ACCENT, bookcase, search, spines, SWING_TIME, tabIntoBookcase, viewToggle } from './bookcase.ts'
import { expect, startSeededServer, test } from './fixtures.ts'
import { stopAndRemove } from './home.ts'
import { COVER_PNG } from './intents.ts'

// DESIGN.md colors, dark theme (tokens.css → :root[data-theme="dark"] and the system dark preference).
const INK_DARK = 'rgb(236, 234, 227)'
const INK_SECONDARY_DARK = 'rgb(179, 183, 173)'
const SURFACE_INSET_DARK = 'rgb(29, 32, 27)'
const LINE_DARK = 'rgb(52, 56, 49)'

const DUNE_COVER = 'covers/dune.png'
const DUNE_FILES = { [DUNE_COVER]: COVER_PNG }

// CatalogPage's HIGHLIGHT_MS, then the ring's 600ms fade (CatalogTiles.module.css).
const HIGHLIGHT_MS = 2000
const FADE_MS = 600

/** A stable v4-shaped id for the n-th seeded Book. */
function bookId(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
}

/** Three Books; Dune has a cover file (DUNE_FILES), and sorts second under Author. */
const SMALL_SHELF = [
  { id: bookId(1), title: 'Emma', authors: ['Jane Austen'], type: 'hardcover' },
  { id: bookId(2), title: 'Dune', authors: ['Frank Herbert'], type: 'hardcover', coverFile: DUNE_COVER },
  { id: bookId(3), title: 'Bleak House', authors: ['Charles Dickens'], type: 'hardcover' },
]
/** The same three Books without a cover, for the tests that start a server without cover files. */
const BARE_SHELF = SMALL_SHELF.map((book) => ({ ...book, coverFile: undefined }))
const DUNE = 'Dune by Frank Herbert, not read yet'
const EMMA = 'Emma by Jane Austen, not read yet'
const SWING_TIME_NAME = 'Swing Time by Zadie Smith, not read yet'

function tiles(page: Page): Locator {
  return page.getByRole('list', { name: /^Tiles, \d+ books?$/ })
}

function tileLinks(page: Page): Locator {
  return tiles(page).getByRole('listitem').getByRole('link')
}

function tile(page: Page, name: string): Locator {
  return tiles(page).getByRole('listitem').getByRole('link', { name, exact: true })
}

function viewButton(page: Page, name: 'Bookcase' | 'List' | 'Tiles'): Locator {
  return viewToggle(page).getByRole('button', { name, exact: true })
}

function sortSelect(page: Page): Locator {
  return page.getByRole('main').getByRole('combobox', { name: 'Sort', exact: true })
}

function typeChip(page: Page, name: string): Locator {
  return page
    .getByRole('main')
    .getByRole('group', { name: 'Type', exact: true })
    .getByRole('button', { name, exact: true })
}

/** Opens Catalog in Tiles: the stored choice, set before the app reads it. */
async function storeTiles(page: Page): Promise<void> {
  await page.addInitScript(() => window.localStorage.setItem('bookvie.catalogView', 'tiles'))
}

/** The visible tiles' names, in DOM order. */
function tileNames(page: Page): Promise<(string | null)[]> {
  return tileLinks(page).evaluateAll((links) => links.map((link) => link.getAttribute('aria-label')))
}

/** The visible spines' names, in DOM order. */
function spineNames(page: Page): Promise<(string | null)[]> {
  return spines(page).evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')))
}

type Rect = { x: number; y: number; width: number; height: number }

type BoxLook = {
  /** The cover box: the outermost element in the tile, as wide as its column, at 2:3. */
  box: Rect
  /** Every element filling the box (the box itself, and an image or placeholder at its size). */
  fills: { tag: string; background: string; borderStyle: string; borderWidth: string; borderColor: string }[]
}

/** The tile's cover box, found by its geometry so no class name is pinned. */
function coverBox(link: Locator): Promise<BoxLook> {
  return link.evaluate((element) => {
    const item = element.closest('li') ?? element
    const width = item.getBoundingClientRect().width
    const fits = (node: Element) => {
      const r = node.getBoundingClientRect()
      return Math.abs(r.width - width) <= 1 && Math.abs(r.height - r.width * 1.5) <= 1.5
    }
    const all = Array.from(element.querySelectorAll('*')).filter(fits)
    if (all.length === 0) throw new Error('no 2:3 cover box as wide as the column')
    const r = all[0]!.getBoundingClientRect()
    const box = { x: r.x, y: r.y, width: r.width, height: r.height }
    const fills = all
      .filter((node) => {
        const n = node.getBoundingClientRect()
        return Math.abs(n.x - r.x) <= 1 && Math.abs(n.y - r.y) <= 1
      })
      .map((node) => {
        const style = getComputedStyle(node)
        return {
          tag: node.tagName.toLowerCase(),
          background: style.backgroundColor,
          borderStyle: style.borderTopStyle,
          borderWidth: style.borderTopWidth,
          borderColor: style.borderTopColor,
        }
      })
    return { box, fills }
  })
}

/** The rectangle of whichever element in the tile carries a `color` ring (outline or box-shadow), or null. */
function ringRect(link: Locator, color: string): Promise<(Rect & { outlineWidth: string | null }) | null> {
  return link.evaluate((element, ringColor) => {
    const item = element.closest('li') ?? element
    for (const node of [item, ...Array.from(item.querySelectorAll('*'))]) {
      const style = getComputedStyle(node)
      const outlined = style.outlineStyle !== 'none' && style.outlineColor === ringColor
      if (outlined || style.boxShadow.includes(ringColor)) {
        const r = node.getBoundingClientRect()
        return { x: r.x, y: r.y, width: r.width, height: r.height, outlineWidth: outlined ? style.outlineWidth : null }
      }
    }
    return null
  }, color)
}

function sameRect(a: Rect, b: Rect): boolean {
  return [a.x - b.x, a.y - b.y, a.width - b.width, a.height - b.height].every((d) => Math.abs(d) <= 1)
}

/** Whether the tile's cover box carries a `color` ring at its own size. */
async function ringedCoverBox(link: Locator, color: string): Promise<boolean> {
  const ring = await ringRect(link, color)
  return ring !== null && sameRect(ring, (await coverBox(link)).box)
}

/** What a CSS system color resolves to here, on a probe that keeps its colors. */
function systemColor(page: Page, color: 'CanvasText' | 'Highlight'): Promise<string> {
  return page.evaluate((value) => {
    const probe = document.createElement('span')
    probe.style.forcedColorAdjust = 'none'
    probe.style.color = value
    document.body.append(probe)
    const resolved = getComputedStyle(probe).color
    probe.remove()
    return resolved
  }, color)
}

/** Holds a cover's request until the returned function is called. */
async function holdCover(page: Page, glob: string): Promise<() => void> {
  let release: () => void = () => {}
  const held = new Promise<void>((resolve) => (release = resolve))
  await page.route(glob, async (route) => {
    await held
    await route.continue()
  })
  return () => release()
}

/** Adds Swing Time (a paperback) from the New book panel. */
async function addSwingTime(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'New book', exact: true }).click()
  const panel = page.getByRole('dialog', { name: 'New book', exact: true })
  for (const [label, value] of Object.entries(SWING_TIME)) {
    await panel.getByLabel(label, { exact: true }).fill(value)
  }
  await panel.getByRole('combobox', { name: 'Type', exact: true }).selectOption('Paperback')
  await panel.getByRole('button', { name: 'Add book', exact: true }).click()
  await expect(panel).toBeHidden()
}

/**
 * Six Books for the parity check. Search "an" with the Paperback chip leaves
 * four, in a different order under each Sort; Manon Lescaut (hardcover) and
 * Dune (no "an") stay hidden.
 */
const PARITY_SHELF = [
  {
    id: bookId(1),
    title: 'Anna Karenina',
    authors: ['Leo Tolstoy'],
    pages: 864,
    type: 'paperback',
    createdAt: '2026-01-05T10:00:00+00:00',
  },
  {
    id: bookId(2),
    title: 'Mansfield Park',
    authors: ['Jane Austen'],
    pages: 480,
    type: 'paperback',
    createdAt: '2026-03-01T10:00:00+00:00',
  },
  {
    id: bookId(3),
    title: 'Nana',
    authors: ['Zola'],
    pages: 320,
    type: 'paperback',
    createdAt: '2026-02-01T10:00:00+00:00',
  },
  {
    id: bookId(4),
    title: 'Cannery Row',
    authors: ['John Steinbeck'],
    pages: 180,
    type: 'paperback',
    createdAt: '2026-01-20T10:00:00+00:00',
  },
  {
    id: bookId(5),
    title: 'Manon Lescaut',
    authors: ['Abbé Prévost'],
    pages: 200,
    type: 'hardcover',
    createdAt: '2026-02-10T10:00:00+00:00',
  },
  { id: bookId(6), title: 'Dune', authors: ['Frank Herbert'], pages: 412, type: 'paperback' },
]

test.describe('Story 8.1 See my catalog as covers (automate)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.setViewportSize({ width: 1280, height: 900 })
  })

  test('[P2] AC-4 forced colors: the loading box and the loaded cover keep a CanvasText hairline', async ({ page }) => {
    await storeTiles(page)
    await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' })
    const release = await holdCover(page, '**/media/covers/dune.png')
    const server = await startSeededServer(test.info(), 'tiles-forced', { books: SMALL_SHELF }, DUNE_FILES)
    try {
      await page.goto(`${server.url}/catalog`)
      const canvasText = await systemColor(page, 'CanvasText')
      const dune = tile(page, DUNE)
      const image = dune.locator('img')

      // Loading: the box's hairline is CanvasText.
      await expect(image).toHaveAttribute('src', '/media/covers/dune.png')
      const loading = await coverBox(dune)
      expect(loading.fills).toContainEqual(
        expect.objectContaining({ borderStyle: 'solid', borderWidth: '1px', borderColor: canvasText }),
      )

      // Loaded: the image's own hairline is CanvasText.
      release()
      await expect
        .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
        .toBe(true)
      await expect(image).toHaveCSS('border-top-style', 'solid')
      await expect(image).toHaveCSS('border-top-color', canvasText)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-4 forced colors: the focus ring and the post-add highlight ring on the cover box are Highlight outlines', async ({
    page,
    seededServer,
  }) => {
    await storeTiles(page)
    await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' })
    const server = await seededServer({ books: BARE_SHELF })
    await page.goto(`${server.url}/catalog`)
    const highlight = await systemColor(page, 'Highlight')
    expect(highlight).not.toBe(await systemColor(page, 'CanvasText'))

    // The keyboard focus ring: a 2px Highlight outline around the cover box.
    await tabIntoBookcase(page)
    const first = tileLinks(page).first()
    await expect(first).toBeFocused()
    const focusRing = await ringRect(first, highlight)
    expect(focusRing).not.toBeNull()
    expect(sameRect(focusRing!, (await coverBox(first)).box)).toBe(true)
    expect(focusRing!.outlineWidth).toBe('2px')

    // The highlight ring after an add: an outline in Highlight around the new cover box.
    await addSwingTime(page)
    const added = tile(page, SWING_TIME_NAME)
    await expect(added).toBeFocused()
    await expect.poll(() => ringedCoverBox(added, highlight)).toBe(true)
    expect((await ringRect(added, highlight))!.outlineWidth).toBe('2px')
  })

  test('[P2] AC-3 dark theme: the caption is dark ink and ink-secondary, the loading box the dark fill and hairline', async ({
    page,
  }) => {
    await storeTiles(page)
    await page.emulateMedia({ colorScheme: 'dark' })
    const release = await holdCover(page, '**/media/covers/dune.png')
    const server = await startSeededServer(test.info(), 'tiles-dark', { books: SMALL_SHELF }, DUNE_FILES)
    try {
      await page.goto(`${server.url}/catalog`)
      const dune = tile(page, DUNE)
      await expect(dune.locator('img')).toHaveAttribute('src', '/media/covers/dune.png')

      await expect(dune.getByText('Dune', { exact: true })).toHaveCSS('color', INK_DARK)
      await expect(dune.getByText('Frank Herbert', { exact: true })).toHaveCSS('color', INK_SECONDARY_DARK)
      const loading = await coverBox(dune)
      expect(loading.fills).toContainEqual(
        expect.objectContaining({
          background: SURFACE_INSET_DARK,
          borderStyle: 'solid',
          borderWidth: '1px',
          borderColor: LINE_DARK,
        }),
      )
      release()
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-2 a junk stored view opens Catalog in Bookcase', async ({ page, seededServer }) => {
    await page.addInitScript(() => window.localStorage.setItem('bookvie.catalogView', 'mosaic'))
    const server = await seededServer({ books: BARE_SHELF })
    await page.goto(`${server.url}/catalog`)

    await expect(viewButton(page, 'Bookcase')).toHaveAttribute('aria-pressed', 'true')
    await expect(viewButton(page, 'Tiles')).toHaveAttribute('aria-pressed', 'false')
    await expect(bookcase(page)).toBeVisible()
    await expect(tiles(page)).toHaveCount(0)
  })

  test('[P2] AC-2 with storage that throws, Catalog opens in Bookcase and Tiles still shows for the visit', async ({
    page,
    seededServer,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    // Only the view's key throws, so the rest of the app reads its storage as usual.
    await page.addInitScript(() => {
      const { getItem, setItem } = Storage.prototype
      Storage.prototype.getItem = function (this: Storage, key: string) {
        if (key === 'bookvie.catalogView') throw new DOMException('denied', 'SecurityError')
        return getItem.call(this, key)
      }
      Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
        if (key === 'bookvie.catalogView') throw new DOMException('denied', 'SecurityError')
        setItem.call(this, key, value)
      }
    })
    const server = await seededServer({ books: BARE_SHELF })
    await page.goto(`${server.url}/catalog`)

    await expect(viewButton(page, 'Bookcase')).toHaveAttribute('aria-pressed', 'true')
    await expect(bookcase(page)).toBeVisible()

    await viewButton(page, 'Tiles').click()
    await expect(viewButton(page, 'Tiles')).toHaveAttribute('aria-pressed', 'true')
    await expect(tiles(page)).toHaveAccessibleName('Tiles, 3 books')
    await expect(bookcase(page)).toBeHidden()
    expect(errors).toEqual([])
  })

  test('[P3] AC-2 the view toggle works from the keyboard: Space presses Tiles, Enter presses List', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: BARE_SHELF })
    await page.goto(`${server.url}/catalog`)

    await viewButton(page, 'Tiles').focus()
    await page.keyboard.press('Space')
    await expect(viewButton(page, 'Tiles')).toHaveAttribute('aria-pressed', 'true')
    await expect(tiles(page)).toBeVisible()
    await expect(bookcase(page)).toBeHidden()

    await viewButton(page, 'List').focus()
    await page.keyboard.press('Enter')
    await expect(viewButton(page, 'List')).toHaveAttribute('aria-pressed', 'true')
    await expect(viewButton(page, 'Tiles')).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByRole('table')).toBeVisible()
    await expect(tiles(page)).toBeHidden()
  })

  test('[P2] AC-6 with a search and a filter on, every Sort shows the same Books in the same order in Tiles as in Bookcase', async ({
    page,
    seededServer,
  }) => {
    await storeTiles(page)
    const server = await seededServer({ books: PARITY_SHELF })
    await page.goto(`${server.url}/catalog`)
    await search(page).fill('an')
    await typeChip(page, 'Paperback').click()
    await expect(page.getByRole('status')).toHaveText('4 books match.')

    const orders: string[] = []
    for (const label of ['Author', 'Title', 'Date added', 'Pages']) {
      await sortSelect(page).selectOption({ label })
      await viewButton(page, 'Tiles').click()
      await expect(tileLinks(page)).toHaveCount(4)
      const shownTiles = await tileNames(page)
      await viewButton(page, 'Bookcase').click()
      await expect(spines(page)).toHaveCount(4)
      expect(await spineNames(page), label).toEqual(shownTiles)
      expect(shownTiles.join(' | '), label).not.toMatch(/Manon Lescaut|Dune/)
      orders.push(shownTiles.join(' | '))
    }
    // Each Sort put the four in a different order, so the parity is not one order checked four times.
    expect(new Set(orders).size).toBe(4)
  })

  for (const [reducedMotion, behavior] of [
    ['reduce', 'auto'],
    ['no-preference', 'smooth'],
  ] as const) {
    test(`[P2] AC-7 an add in Tiles with reduced motion "${reducedMotion}" scrolls the new tile's list item with behavior "${behavior}"`, async ({
      page,
      seededServer,
    }) => {
      await storeTiles(page)
      await page.emulateMedia({ colorScheme: 'light', reducedMotion })
      await page.addInitScript(() => {
        const scrolls: unknown[] = []
        Object.assign(window, { scrolls })
        const original = Element.prototype.scrollIntoView
        Element.prototype.scrollIntoView = function (this: Element, options?: boolean | ScrollIntoViewOptions) {
          const link = this.querySelector('a')
          scrolls.push({ tag: this.tagName, name: link?.getAttribute('aria-label') ?? null, options })
          original.call(this, options)
        }
      })
      const server = await seededServer({ books: BARE_SHELF })
      await page.goto(`${server.url}/catalog`)

      await addSwingTime(page)
      await expect(tile(page, SWING_TIME_NAME)).toBeFocused()
      const scrolls = await page.evaluate(() => (window as unknown as { scrolls: unknown[] }).scrolls)
      expect(scrolls).toEqual([{ tag: 'LI', name: SWING_TIME_NAME, options: { block: 'nearest', behavior } }])
    })
  }

  test('[P2] AC-7 an add in Tiles clears a filter that would hide the new Book, then focuses and rings its tile', async ({
    page,
    seededServer,
  }) => {
    await storeTiles(page)
    const server = await seededServer({ books: BARE_SHELF })
    await page.goto(`${server.url}/catalog`)
    // All three seeded Books are hardcovers; the new one is a paperback.
    await typeChip(page, 'Hardcover').click()
    await expect(typeChip(page, 'Hardcover')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('status')).toHaveText('3 books match.')

    await addSwingTime(page)
    const added = tile(page, SWING_TIME_NAME)
    await expect(added).toBeFocused()
    await expect(typeChip(page, 'Hardcover')).toHaveAttribute('aria-pressed', 'false')
    await expect(tileLinks(page)).toHaveCount(4)
    await expect(tiles(page).locator('li[hidden]')).toHaveCount(0)
    await expect(page.getByRole('status')).toHaveText('Added Swing Time.')
    await expect.poll(() => ringedCoverBox(added, ACCENT)).toBe(true)
  })

  test('[P2] AC-7 the highlight ring stays on the new cover box for HIGHLIGHT_MS, then fades off', async ({
    page,
    seededServer,
  }) => {
    await storeTiles(page)
    const server = await seededServer({ books: BARE_SHELF })
    await page.goto(`${server.url}/catalog`)

    await addSwingTime(page)
    const added = tile(page, SWING_TIME_NAME)
    await expect.poll(() => ringedCoverBox(added, ACCENT)).toBe(true)
    const ringSeen = Date.now()

    // The ring comes off after HIGHLIGHT_MS (not before), then its box-shadow fades to none.
    await expect.poll(() => ringRect(added, ACCENT), { timeout: HIGHLIGHT_MS + 3000 }).toBeNull()
    expect(Date.now() - ringSeen).toBeGreaterThanOrEqual(HIGHLIGHT_MS / 2)
    const shadows = () =>
      added.evaluate((element) =>
        [element, ...Array.from(element.querySelectorAll('*'))].map((node) => getComputedStyle(node).boxShadow),
      )
    // The ring is never inset: an unread typeset cover's inset shadow is part of its 1.5px outline, not the ring.
    await expect
      .poll(
        async () =>
          (await shadows()).every(
            (shadow) => shadow === 'none' || shadow.split(/,(?![^(]*\))/).every((one) => one.includes('inset')),
          ),
        {
          timeout: FADE_MS + 3000,
        },
      )
      .toBe(true)
    await expect(added).toBeFocused()
  })

  test("[P2] AC-9 a click on a tile's cover box or on its caption opens that Book's detail", async ({
    page,
    seededServer,
  }) => {
    await storeTiles(page)
    const server = await seededServer({ books: BARE_SHELF })
    await page.goto(`${server.url}/catalog`)
    const heading = page.getByRole('heading', { level: 1, name: 'Emma', exact: true })

    // The middle of the cover box.
    const { box } = await coverBox(tile(page, EMMA))
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await expect(page).toHaveURL(`${server.url}/book/${bookId(1)}`)
    await expect(heading).toBeVisible()

    await page.goBack()
    await expect(tiles(page)).toBeVisible()
    // The caption: the title, then the author line (the last of each, after the typeset cover's own text).
    await tile(page, EMMA).getByText('Emma', { exact: true }).last().click()
    await expect(page).toHaveURL(`${server.url}/book/${bookId(1)}`)
    await expect(heading).toBeVisible()

    await page.goBack()
    await tile(page, EMMA).getByText('Jane Austen', { exact: true }).last().click()
    await expect(page).toHaveURL(`${server.url}/book/${bookId(1)}`)
    await expect(heading).toBeVisible()
  })
})
