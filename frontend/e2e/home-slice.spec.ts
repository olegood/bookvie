// Story 3.5 See my reading on Home's shelf (ATDD). Home gets a slice of the
// bookcase: up to 3 shelf rows chosen from the full bookcase packed at the
// current width, the Main book's row first, with the Main book's spine filled
// to its percentage. This spec reads what the browser shows: the rows and
// their order, the list's name, the keyboard on the rows as displayed, the
// Main spine's fill (sampled from pixels), a re-read's spine, the slice
// header and legend, and the fill moving with the gauge after an update. The
// server's slice priority (AC-1) is proven at API level in
// backend/tests/test_home_slice.py.
//
// Contract the scaffolds pin (see the ATDD checklist):
// - the slice is a `region` named "Bookcase" in Home's `main`, holding a
//   `list` named "Bookcase slice, N rows", one spine `button` per Book, named
//   as on Catalog (`spineName`);
// - a row is the spines standing on one plank (same bottom edge);
// - the label strip is the nearest ancestor of the title text with a painted
//   background, on the Main spine too (DESIGN.md → Spine, key-home.html).

import type { Locator, Page } from '@playwright/test'
import { SPINE_EDGE, SPINE_UNREAD_FILL, SPINE_UNREAD_TEXT, TRANSPARENT, shelfOf } from './bookcase.ts'
import { expect, test } from './fixtures.ts'
import { LEFT_HAND, LEFT_HAND_ID, mainAt, mainBookCard } from './home.ts'

const MAIN_COLOR = { hex: '#4F7096', rgb: [79, 112, 150] as RGB }
const LEGEND_MAIN = 'Main book, filled to its %'

type RGB = [number, number, number]

/** "rgb(r, g, b)" as numbers. */
function rgb(css: string): RGB {
  const [r, g, b] = css.match(/\d+/g)!.map(Number)
  return [r, g, b]
}

const EDGE = rgb(SPINE_EDGE)
const UNREAD_FILL = rgb(SPINE_UNREAD_FILL)
const MAIN_MARKER = rgb(SPINE_UNREAD_TEXT)

function near(a: RGB, b: RGB, tolerance = 4): boolean {
  return a.every((channel, i) => Math.abs(channel - b[i]) <= tolerance)
}

/** A stable v4-shaped id for the n-th seeded Book. */
function bookId(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
}

function homeBookcase(page: Page): Locator {
  return page.getByRole('main').getByRole('region', { name: 'Bookcase', exact: true })
}

function slice(page: Page): Locator {
  return page.getByRole('main').getByRole('list', { name: /^Bookcase slice, \d+ rows?$/ })
}

function sliceSpines(page: Page): Locator {
  return slice(page).getByRole('button')
}

function sliceSpine(page: Page, title: string): Locator {
  return slice(page).getByRole('button', { name: new RegExp(`^${title} by `) })
}

/** The slice's spine titles grouped into rows as displayed (same bottom edge = one plank). */
async function sliceRows(page: Page): Promise<string[][]> {
  const spines = await sliceSpines(page).evaluateAll((elements) =>
    elements.map((element) => ({
      title: (element.getAttribute('aria-label') ?? '').split(' by ')[0],
      bottom: Math.round(element.getBoundingClientRect().bottom),
    })),
  )
  const rows: string[][] = []
  spines.forEach((spine, index) => {
    if (index === 0 || spine.bottom !== spines[index - 1].bottom) rows.push([])
    rows.at(-1)!.push(spine.title)
  })
  return rows
}

/** How many spines fit on one plank of the slice at the current width. */
async function rowCapacity(page: Page): Promise<number> {
  return slice(page).evaluate((list) => {
    const style = getComputedStyle(list)
    const width = list.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
    const [first, second] = Array.from(list.querySelectorAll('button')).map((b) => b.getBoundingClientRect())
    const gap = second.left - first.right
    return Math.floor((width + gap) / (first.width + gap))
  })
}

/**
 * The test's oracle for UX-DR31: pack `titles` (bookcase order) into rows of
 * `k`, choose up to 3 rows (Main's, Up next's, then the finishes' in the
 * server's priority order, else the first rows), display Main's row first and
 * the rest in bookcase order.
 */
function expectedSlice(titles: string[], k: number, priority: string[], hasMain: boolean): string[][] {
  const rows = Array.from({ length: Math.ceil(titles.length / k) }, (_, r) => titles.slice(r * k, (r + 1) * k))
  const chosen: number[] = []
  for (const title of priority) {
    const row = Math.floor(titles.indexOf(title) / k)
    if (!chosen.includes(row) && chosen.length < 3) chosen.push(row)
  }
  for (let row = 0; row < rows.length && chosen.length < 3; row++) if (!chosen.includes(row)) chosen.push(row)
  const [first, ...rest] = chosen
  const order = hasMain ? [first, ...rest.sort((a, b) => a - b)] : [...chosen].sort((a, b) => a - b)
  return order.map((row) => rows[row])
}

type Column = { pixels: RGB[]; stripBottom: number; stripTop: number }

/**
 * The spine's center pixel column, top to bottom (from a screenshot, decoded
 * in the page), and where its label strip starts and ends, in px from the
 * spine's top.
 */
async function spineColumn(page: Page, spine: Locator): Promise<Column> {
  const strip = await spine.evaluate((element, transparent) => {
    const top = element.getBoundingClientRect().top
    const nodes = [element, ...Array.from(element.querySelectorAll('*'))]
    const title = (element.getAttribute('aria-label') ?? '').split(' by ')[0]
    const label = nodes.filter((node) => node.textContent === title).at(-1) ?? element
    for (let node: Element | null = label; node && node !== element; node = node.parentElement) {
      if (getComputedStyle(node).backgroundColor !== transparent) {
        const box = node.getBoundingClientRect()
        return { stripTop: box.top - top, stripBottom: box.bottom - top }
      }
    }
    return null
  }, TRANSPARENT)
  if (strip === null) throw new Error('the spine has no painted label strip')
  const png = (await spine.screenshot({ animations: 'disabled' })).toString('base64')
  const pixels = await page.evaluate(async (data) => {
    const bytes = Uint8Array.from(atob(data), (char) => char.charCodeAt(0))
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const context = canvas.getContext('2d')!
    context.drawImage(bitmap, 0, 0)
    const column = context.getImageData(Math.floor(bitmap.width / 2), 0, 1, bitmap.height).data
    const out: [number, number, number][] = []
    for (let y = 0; y < bitmap.height; y++) out.push([column[y * 4], column[y * 4 + 1], column[y * 4 + 2]])
    return out
  }, png)
  return { pixels, ...strip }
}

type Fill = {
  /** Rows of the spine's color counted up from the plank. */
  fillPx: number
  /** Rows of `spine-edge` directly above the fill. */
  linePx: number
  /** The open area below the label strip: 0% at the plank, 100% at the strip's lower end. */
  areaPx: number
  /** The pixel just above the fill line. */
  above: RGB
}

function measureFill({ pixels, stripBottom }: Column, color: RGB): Fill {
  let y = pixels.length - 1
  while (y >= 0 && near(pixels[y], color)) y--
  const fillPx = pixels.length - 1 - y
  const lineStart = y
  while (y >= 0 && near(pixels[y], EDGE, 24)) y--
  return { fillPx, linePx: lineStart - y, areaPx: pixels.length - stripBottom, above: pixels[Math.max(0, y)] }
}

/** Whether the Main-book marker dot is painted above the label strip. */
function hasMainMarker({ pixels, stripTop }: Column): boolean {
  return pixels.slice(0, Math.ceil(stripTop)).some((pixel) => near(pixel, MAIN_MARKER, 6))
}

/** The Main spine fill's computed style: the absolutely placed descendant topped by the 2px line. */
async function fillStyle(spine: Locator) {
  return spine.evaluate((element) => {
    for (const node of Array.from(element.querySelectorAll('*'))) {
      const style = getComputedStyle(node)
      if (style.position === 'absolute' && style.borderTopWidth === '2px') {
        return {
          transitionProperty: style.transitionProperty,
          transitionDuration: style.transitionDuration,
          transitionTimingFunction: style.transitionTimingFunction,
          background: style.backgroundColor,
          line: style.borderTopColor,
        }
      }
    }
    throw new Error('the spine has no fill')
  })
}

/** 180 Books, "Book 001" … "Book 180", one author: bookcase order is title order. */
function bigShelf() {
  return shelfOf(180).map((book, n) => ({ ...book, id: bookId(n + 1), pages: 300 }))
}

test.describe('Story 3.5 See my reading on Home’s shelf (ATDD)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test('[P1] AC-2 the slice shows the Main book’s row first, then the other chosen rows in bookcase order, follows resizes, and keys move through the rows as displayed', async ({
    page,
    seededServer,
  }) => {
    // Main: Book 170; Up next: Book 090; newest finish: Book 130; an older finish: Book 010.
    const books = bigShelf()
    const at = (n: number) => books[n - 1]
    Object.assign(at(170), { readings: [{ startDate: '2026-10-01', currentPage: 30 }] })
    Object.assign(at(130), {
      readings: [{ startDate: '2026-10-01', finishDate: '2026-10-20', finishedPages: 300, currentPage: 300 }],
    })
    Object.assign(at(10), {
      readings: [{ startDate: null, finishDate: '2026-03-20', finishedPages: 300, currentPage: 300 }],
    })
    const server = await seededServer({ mainBookId: bookId(170), upNextBookId: bookId(90), books })
    const titles = books.map((book) => book.title)
    const priority = ['Book 170', 'Book 090', 'Book 130', 'Book 010']
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(server.url)

    // The criterion: 3 rows, Main's first, then Up next's and the newest finish's in bookcase order.
    await expect(slice(page)).toHaveAccessibleName('Bookcase slice, 3 rows')
    const k = await rowCapacity(page)
    expect(k).toBeGreaterThanOrEqual(10)
    const wide = expectedSlice(titles, k, priority, true)
    expect(wide[0]).toContain('Book 170')
    expect(wide.flat()).not.toContain('Book 010') // the older finish lost its place
    expect(await sliceRows(page)).toEqual(wide)

    // It never scrolls internally.
    for (const box of [slice(page), homeBookcase(page)]) {
      const scroll = await box.evaluate((element) => ({
        overflowY: getComputedStyle(element).overflowY,
        hidden: element.scrollHeight - element.clientHeight,
      }))
      expect(['auto', 'scroll']).not.toContain(scroll.overflowY)
      expect(scroll.hidden).toBeLessThanOrEqual(1)
    }

    // Resizing re-packs the bookcase and chooses again.
    await page.setViewportSize({ width: 900, height: 900 })
    await expect.poll(() => rowCapacity(page)).toBeLessThan(k)
    const narrow = expectedSlice(titles, await rowCapacity(page), priority, true)
    await expect.poll(() => sliceRows(page)).toEqual(narrow)
    await page.setViewportSize({ width: 1280, height: 900 })
    await expect.poll(() => sliceRows(page)).toEqual(wide)

    // Catalog's Search titles never reaches the slice.
    await page.goto(`${server.url}/catalog`)
    await page.getByRole('searchbox', { name: 'Search titles', exact: true }).fill('Book 17')
    await page.getByRole('navigation').getByRole('link', { name: 'Home', exact: true }).click()
    await expect(slice(page)).toHaveAccessibleName('Bookcase slice, 3 rows')
    expect(await sliceRows(page)).toEqual(wide)

    // Keys follow the rows as displayed: Home is the Main row's first spine,
    // End the last row's last, and Right from the end of the Main row goes to
    // the next displayed row, not the next row of the bookcase.
    await sliceSpine(page, 'Book 170').focus()
    await page.keyboard.press('Home')
    await expect(sliceSpine(page, wide[0][0])).toBeFocused()
    await page.keyboard.press('End')
    await expect(sliceSpine(page, wide[2].at(-1)!)).toBeFocused()
    await sliceSpine(page, wide[0].at(-1)!).focus()
    await page.keyboard.press('ArrowRight')
    await expect(sliceSpine(page, wide[1][0])).toBeFocused()
    await page.keyboard.press('ArrowLeft')
    await expect(sliceSpine(page, wide[0].at(-1)!)).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(slice(page).getByRole('button').and(page.locator(':focus'))).toHaveAccessibleName(
      new RegExp(`^(${wide[1].join('|')}) by `),
    )
  })

  test('[P1] AC-3 a never-finished Main book at 64% is outlined, filled in its color from the plank to 64% of the area below the strip, topped by a 2px spine-edge line, with the Main-book marker', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(
      mainAt(212, { book: { spineColorUser: MAIN_COLOR.hex }, others: [{ title: 'Dune', authors: ['Frank Herbert'] }] }),
    )
    await page.goto(server.url)
    const spine = sliceSpine(page, LEFT_HAND.title)

    // The criterion: the fill reaches 64% of the open area, then the 2px line, then the unread body.
    const column = await spineColumn(page, spine)
    const fill = measureFill(column, MAIN_COLOR.rgb)
    expect(Math.abs(fill.fillPx - 0.64 * fill.areaPx)).toBeLessThanOrEqual(2)
    expect(fill.linePx).toBeGreaterThanOrEqual(2)
    expect(fill.linePx).toBeLessThanOrEqual(3)
    expect(near(fill.above, UNREAD_FILL)).toBe(true)
    expect(hasMainMarker(column)).toBe(true)

    // The unread outline, and the name the Catalog already gives it.
    await expect(spine).toHaveCSS('border-left-color', 'rgb(138, 130, 115)')
    await expect(spine).toHaveAccessibleName('The Left Hand of Darkness by Ursula K. Le Guin, Main book, 64%')
  })

  test('[P2] AC-4 a re-read Main book keeps its full-color spine with the Main-book marker, named "finished, re-reading, 12%"', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      mainBookId: LEFT_HAND_ID,
      books: [
        {
          ...LEFT_HAND,
          spineColorUser: MAIN_COLOR.hex,
          readings: [
            { startDate: '2026-03-01', finishDate: '2026-04-01', finishedPages: 330, currentPage: 330 },
            { startDate: '2026-10-11', currentPage: 40 },
          ],
        },
      ],
    })
    await page.goto(server.url)
    const spine = sliceSpine(page, LEFT_HAND.title)

    // The criterion.
    await expect(spine).toHaveAccessibleName('The Left Hand of Darkness by Ursula K. Le Guin, finished, re-reading, 12%')

    // Full color below the strip (no fill line), plus the marker.
    const column = await spineColumn(page, spine)
    const fill = measureFill(column, MAIN_COLOR.rgb)
    expect(fill.fillPx).toBeGreaterThanOrEqual(fill.areaPx - 1)
    expect(hasMainMarker(column)).toBe(true)
  })

  test('[P2] AC-5 the slice header shows BOOKCASE, the meter and See all in Catalog; the legend names the Main fill on Home and Catalog', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(
      mainAt(212, {
        others: [
          { title: 'Dune', authors: ['Frank Herbert'] },
          {
            title: 'Emma',
            authors: ['Jane Austen'],
            readings: [{ startDate: null, finishDate: '2026-03-20', finishedPages: 300, currentPage: 300 }],
          },
        ],
      }),
    )
    await page.goto(server.url)
    const header = homeBookcase(page)

    // The criterion.
    await expect(header.getByRole('link', { name: 'See all in Catalog', exact: true })).toBeVisible()

    const heading = header.getByRole('heading', { name: 'Bookcase', exact: true })
    await expect(heading).toHaveCSS('text-transform', 'uppercase')
    await expect(header.getByRole('progressbar', { name: 'Books finished', exact: true })).toHaveAttribute(
      'aria-valuetext',
      '1 of 3 finished',
    )
    await expect(header.getByText(LEGEND_MAIN, { exact: true })).toBeVisible()

    await header.getByRole('link', { name: 'See all in Catalog', exact: true }).click()
    await expect(page).toHaveURL(`${server.url}/catalog`)
    await expect(page.getByRole('main').getByText(LEGEND_MAIN, { exact: true })).toBeVisible()
  })

  test('[P1] AC-6 after a page update the Main spine fill moves to the new percentage with the gauge, instantly under reduced motion', async ({
    page,
    seededServer,
  }) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
    const server = await seededServer(
      mainAt(150, { book: { spineColorUser: MAIN_COLOR.hex }, others: [{ title: 'Dune', authors: ['Frank Herbert'] }] }),
    )
    await page.goto(server.url)
    const gauge = mainBookCard(page).getByRole('progressbar')
    await expect(gauge).toHaveAttribute('aria-valuetext', '45%, page 150 of 330')

    await mainBookCard(page).getByRole('spinbutton', { name: 'Page', exact: true }).fill('212')
    await mainBookCard(page).getByRole('button', { name: 'Update', exact: true }).click()
    await expect(gauge).toHaveAttribute('aria-valuetext', '64%, page 212 of 330')

    // The criterion: read once, with no wait, since reduced motion makes it instant.
    const fill = measureFill(await spineColumn(page, sliceSpine(page, LEFT_HAND.title)), MAIN_COLOR.rgb)
    expect(Math.abs(fill.fillPx - 0.64 * fill.areaPx)).toBeLessThanOrEqual(2)

    await expect(sliceSpine(page, LEFT_HAND.title)).toHaveAccessibleName(
      'The Left Hand of Darkness by Ursula K. Le Guin, Main book, 64%',
    )
  })

  test('[P2] AC-2 a library smaller than 3 rows shows every row, named "Bookcase slice, 1 row"', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [
        { title: 'Kindred', authors: ['Octavia E. Butler'] },
        { title: 'Dune', authors: ['Frank Herbert'] },
        { title: 'Emma', authors: ['Jane Austen'] },
      ],
    })
    await page.goto(server.url)

    await expect(slice(page)).toHaveAccessibleName('Bookcase slice, 1 row')
    expect(await sliceRows(page)).toEqual([['Dune', 'Emma', 'Kindred']]) // by first author, as Catalog sorts
    await expect(slice(page).getByRole('listitem')).toHaveCount(1)
    await expect(homeBookcase(page).getByText(LEGEND_MAIN, { exact: true })).toBeVisible()
  })

  test('[P2] AC-2 without a Main book the chosen rows are all in bookcase order', async ({ page, seededServer }) => {
    // Up next: Book 170; newest finish: Book 090; then Book 010.
    const books = bigShelf()
    const at = (n: number) => books[n - 1]
    Object.assign(at(90), {
      readings: [{ startDate: '2026-10-01', finishDate: '2026-10-20', finishedPages: 300, currentPage: 300 }],
    })
    Object.assign(at(10), {
      readings: [{ startDate: null, finishDate: '2026-03-20', finishedPages: 300, currentPage: 300 }],
    })
    const server = await seededServer({ upNextBookId: bookId(170), books })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(server.url)

    await expect(slice(page)).toHaveAccessibleName('Bookcase slice, 3 rows')
    const k = await rowCapacity(page)
    const expected = expectedSlice(
      books.map((book) => book.title),
      k,
      ['Book 170', 'Book 090', 'Book 010'],
      false,
    )
    expect(expected.at(-1)).toContain('Book 170') // Up next's row is last: bookcase order
    expect(await sliceRows(page)).toEqual(expected)
  })

  test('[P2] AC-3 at 0% only the 2px fill line shows, at the plank', async ({ page, seededServer }) => {
    const server = await seededServer(
      mainAt(0, { book: { spineColorUser: MAIN_COLOR.hex }, others: [{ title: 'Dune', authors: ['Frank Herbert'] }] }),
    )
    await page.goto(server.url)
    const spine = sliceSpine(page, LEFT_HAND.title)
    await expect(spine).toHaveAccessibleName('The Left Hand of Darkness by Ursula K. Le Guin, Main book, 0%')

    const column = await spineColumn(page, spine)
    const fill = measureFill(column, MAIN_COLOR.rgb)
    expect(fill.fillPx).toBe(0)
    expect(fill.linePx).toBeGreaterThanOrEqual(2)
    expect(fill.linePx).toBeLessThanOrEqual(3)
    expect(near(fill.above, UNREAD_FILL)).toBe(true)
    expect(hasMainMarker(column)).toBe(true)
  })

  test('[P2] AC-3 at the last page the fill reaches the strip’s lower end and the marker stays', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(
      mainAt(330, { book: { spineColorUser: MAIN_COLOR.hex }, others: [{ title: 'Dune', authors: ['Frank Herbert'] }] }),
    )
    await page.goto(server.url)
    const spine = sliceSpine(page, LEFT_HAND.title)
    await expect(spine).toHaveAccessibleName('The Left Hand of Darkness by Ursula K. Le Guin, Main book, 100%')

    const column = await spineColumn(page, spine)
    const fill = measureFill(column, MAIN_COLOR.rgb)
    expect(fill.fillPx).toBeGreaterThanOrEqual(fill.areaPx - 1)
    expect(hasMainMarker(column)).toBe(true)
  })

  test('[P1] AC-2 a focused slice spine keeps focus when a resize repacks the rows', async ({ page, seededServer }) => {
    const books = bigShelf()
    Object.assign(books[169], { readings: [{ startDate: '2026-10-01', currentPage: 30 }] })
    const server = await seededServer({ mainBookId: bookId(170), books })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(server.url)
    await expect(slice(page)).toHaveAccessibleName('Bookcase slice, 3 rows')
    const k = await rowCapacity(page)

    // Book 170 is the Main book: its row is always displayed.
    await sliceSpine(page, 'Book 170').focus()
    await page.setViewportSize({ width: 900, height: 900 })
    await expect.poll(() => rowCapacity(page)).toBeLessThan(k)
    // Wait for the repack itself, not only the new width.
    const titles = books.map((book) => book.title)
    const narrow = expectedSlice(titles, await rowCapacity(page), ['Book 170'], true)
    await expect.poll(() => sliceRows(page)).toEqual(narrow)
    await expect(sliceSpine(page, 'Book 170')).toBeFocused()
  })

  test('[P1] AC-3 the Main spine on Catalog is filled to 64% with the line and the marker', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(
      mainAt(212, { book: { spineColorUser: MAIN_COLOR.hex }, others: [{ title: 'Dune', authors: ['Frank Herbert'] }] }),
    )
    await page.goto(`${server.url}/catalog`)
    const spine = page
      .getByRole('main')
      .getByRole('list', { name: /^Bookcase, \d+ books?$/ })
      .getByRole('button', { name: new RegExp(`^${LEFT_HAND.title} by `) })

    const column = await spineColumn(page, spine)
    const fill = measureFill(column, MAIN_COLOR.rgb)
    expect(Math.abs(fill.fillPx - 0.64 * fill.areaPx)).toBeLessThanOrEqual(2)
    expect(fill.linePx).toBeGreaterThanOrEqual(2)
    expect(fill.linePx).toBeLessThanOrEqual(3)
    expect(hasMainMarker(column)).toBe(true)
  })

  test('[P2] AC-2 a slice spine opens its popover, and Escape returns focus to it', async ({ page, seededServer }) => {
    const server = await seededServer(mainAt(212, { others: [{ title: 'Dune', authors: ['Frank Herbert'] }] }))
    await page.goto(server.url)
    const dune = sliceSpine(page, 'Dune')

    await dune.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(dune).toBeFocused()
  })

  test('[P2] AC-2 an open slice popover follows its spine when a resize repacks the rows', async ({
    page,
    seededServer,
  }) => {
    const books = bigShelf()
    Object.assign(books[169], { readings: [{ startDate: '2026-10-01', currentPage: 30 }] })
    const server = await seededServer({ mainBookId: bookId(170), books })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(server.url)
    const k = await rowCapacity(page)
    await sliceSpine(page, 'Book 170').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await page.setViewportSize({ width: 900, height: 900 })
    await expect.poll(() => rowCapacity(page)).toBeLessThan(k)
    await expect(dialog).toBeVisible()

    // The criterion: the popover already sits where a fresh placement puts it.
    const placed = await dialog.boundingBox()
    await page.evaluate(() => window.dispatchEvent(new Event('scroll')))
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(null))))
    expect(await dialog.boundingBox()).toEqual(placed)
  })

  test('[P2] AC-6 the Main spine fill moves its height over 600ms ease-out, and not at all under reduced motion', async ({
    page,
    seededServer,
  }) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
    const server = await seededServer(
      mainAt(212, { book: { spineColorUser: MAIN_COLOR.hex }, others: [{ title: 'Dune', authors: ['Frank Herbert'] }] }),
    )
    await page.goto(server.url)
    const spine = sliceSpine(page, LEFT_HAND.title)

    expect(await fillStyle(spine)).toMatchObject({
      transitionProperty: 'height',
      transitionDuration: '0.6s',
      transitionTimingFunction: 'ease-out',
    })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect((await fillStyle(spine)).transitionDuration).toBe('0s')
  })

  test('[P2] AC-3 under forced colors the Main spine fill, its line and the marker stay distinct from the body', async ({
    page,
    seededServer,
  }) => {
    await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' })
    const server = await seededServer(
      mainAt(212, { book: { spineColorUser: MAIN_COLOR.hex }, others: [{ title: 'Dune', authors: ['Frank Herbert'] }] }),
    )
    await page.goto(server.url)
    const spine = sliceSpine(page, LEFT_HAND.title)
    const body = await spine.evaluate((element) => getComputedStyle(element).backgroundColor)

    const fill = await fillStyle(spine)
    expect(fill.background).not.toBe(body)
    expect(fill.line).not.toBe(body)
    expect(fill.line).not.toBe(fill.background)

    // The marker: a dot in a ring whose color differs from the body.
    const ring = await spine.evaluate((element) => {
      for (const node of Array.from(element.querySelectorAll('*'))) {
        const style = getComputedStyle(node)
        if (style.position === 'absolute' && style.boxShadow !== 'none') return style.boxShadow
      }
      return null
    })
    expect(ring).not.toBeNull()
    expect(ring!.startsWith(body)).toBe(false)
  })
})
