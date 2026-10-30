// Story 1.10 Bookcase view: the Catalog view toggle (UX-DR21), spine size and
// color (UX-DR24), spine names (UX-DR25), the bookcase card (UX-DR26,
// UX-DR30), every spine in the page at 500 Books (NFR7), roving-tabindex
// keyboard (UX-DR27), Search titles on the shelf, focus after an add, the
// cataloging skill's spine check (CAT-E2E-002) and both themes. The view
// numbers come from the server (backend/tests/test_bookcase_view.py); these
// tests read every outcome by role, accessible name and computed style.

import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'

// DESIGN.md colors, light theme.
const INK = 'rgb(43, 46, 42)'
const ACCENT = 'rgb(85, 112, 89)'
const SHELF_WALL = 'rgb(239, 234, 224)'
const SPINE_EDGE = 'rgb(94, 88, 77)'
const SPINE_LABEL_STRIP = 'rgb(251, 248, 241)'
const SPINE_UNREAD_FILL = 'rgb(253, 252, 249)'
const SPINE_UNREAD_OUTLINE = 'rgb(138, 130, 115)'
const SPINE_UNREAD_TEXT = 'rgb(119, 113, 106)'
const TRANSPARENT = 'rgba(0, 0, 0, 0)'
// A pale yellow the user picked: shown exactly, never darkened for contrast.
const PALE_YELLOW = { hex: '#F2D35B', rgb: 'rgb(242, 211, 91)' }
// DESIGN.md → Spine: the label strip is at most 96px long.
const STRIP_MAX = 96
// Long enough that its height reaches the 200px cap on any platform font.
const TUFTE = 'The Visual Display of Quantitative Information, Second Edition'
// A complete Book as the cataloging skill types it; Type is picked separately.
const SWING_TIME = {
  Title: 'Swing Time',
  Pages: '453',
  'Author(s)': 'Zadie Smith',
  Language: 'English',
  Publisher: 'Hamish Hamilton',
}

/** A finished Reading back-filled with Finished on (no start date). */
function finished(pages = 300) {
  return [{ startDate: null, currentPage: pages, finishDate: '2026-03-20', finishedPages: pages }]
}

/** `count` Books by one author, titled "Book 001", "Book 002", … in sort order. */
function shelfOf(count: number, author = 'Author') {
  return Array.from({ length: count }, (_, n) => ({
    title: `Book ${String(n + 1).padStart(3, '0')}`,
    authors: [author],
  }))
}

function bookcase(page: Page): Locator {
  return page.getByRole('list', { name: /^Bookcase, \d+ books?$/ })
}

function spines(page: Page): Locator {
  return bookcase(page).getByRole('button')
}

function spine(page: Page, name: string): Locator {
  return bookcase(page).getByRole('listitem').getByRole('button', { name, exact: true })
}

function viewToggle(page: Page): Locator {
  return page.getByRole('group', { name: 'Catalog view', exact: true })
}

function search(page: Page): Locator {
  return page.getByRole('searchbox', { name: 'Search titles', exact: true })
}

function bookRows(page: Page): Locator {
  return page.getByRole('table').getByRole('row').filter({ hasNot: page.getByRole('columnheader') })
}

/** Moves focus into the bookcase the way a keyboard user does: Tab from New book. */
async function tabIntoBookcase(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'New book', exact: true }).focus()
  await page.keyboard.press('Tab')
}

async function press(page: Page, key: string, times: number): Promise<void> {
  for (let n = 0; n < times; n++) await page.keyboard.press(key)
}

/** Spine indexes grouped into shelf rows (spines stand on one plank: same bottom). */
async function shelfRows(page: Page): Promise<number[][]> {
  const bottoms = await spines(page).evaluateAll((elements) =>
    elements.map((element) => Math.round(element.getBoundingClientRect().bottom)),
  )
  const rows: number[][] = []
  bottoms.forEach((bottom, index) => {
    if (index === 0 || bottom !== bottoms[index - 1]) rows.push([])
    rows.at(-1)!.push(index)
  })
  return rows
}

type SpineLook = {
  fill: string
  edgeColors: [string, string, string]
  edgeWidths: [string, string, string]
  bottomWidth: string
  labelColor: string
  labelOverflow: string
  labelWhiteSpace: string
  /** The plate behind the label: its fill and its longer side, or null. */
  strip: { fill: string; length: number } | null
}

/** The computed look of a spine and of the element holding its `title` label. */
function look(spineButton: Locator, title: string): Promise<SpineLook> {
  return spineButton.evaluate(
    (element, { text, transparent }) => {
      const style = getComputedStyle(element)
      const nodes = [element, ...Array.from(element.querySelectorAll('*'))]
      const label = nodes.filter((node) => node.textContent === text).at(-1) ?? element
      const labelStyle = getComputedStyle(label)
      let strip: { fill: string; length: number } | null = null
      for (let node: Element | null = label; node && node !== element; node = node.parentElement) {
        const fill = getComputedStyle(node).backgroundColor
        if (fill !== transparent) {
          const box = node.getBoundingClientRect()
          strip = { fill, length: Math.max(box.width, box.height) }
          break
        }
      }
      return {
        fill: style.backgroundColor,
        edgeColors: [style.borderTopColor, style.borderLeftColor, style.borderRightColor],
        edgeWidths: [style.borderTopWidth, style.borderLeftWidth, style.borderRightWidth],
        bottomWidth: style.borderBottomWidth,
        labelColor: labelStyle.color,
        labelOverflow: labelStyle.textOverflow,
        labelWhiteSpace: labelStyle.whiteSpace,
        strip,
      } as SpineLook
    },
    { text: title, transparent: TRANSPARENT },
  )
}

test.describe('Story 1.10 Bookcase view (ATDD)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test.skip('[P1] AC-1 Bookcase is the default view and the remembered Catalog view toggle switches to List', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [
        { title: 'Dune', authors: ['Frank Herbert'] },
        { title: 'Neuromancer', authors: ['William Gibson'] },
      ],
    })
    await page.goto(`${server.url}/`)
    const toggle = viewToggle(page)
    const bookcaseButton = toggle.getByRole('button', { name: 'Bookcase', exact: true })
    const listButton = toggle.getByRole('button', { name: 'List', exact: true })

    await expect(bookcaseButton).toHaveAttribute('aria-pressed', 'true')
    await expect(toggle.getByRole('button')).toHaveText(['Bookcase', 'List'])
    await expect(listButton).toHaveAttribute('aria-pressed', 'false')
    await expect(bookcase(page)).toBeVisible()
    await expect(page.getByRole('table')).toBeHidden()

    // Search titles narrows the shelf…
    await search(page).fill('Dune')
    await expect(spines(page)).toHaveCount(1)
    // …and keeps applying after switching to List.
    await listButton.click()
    await expect(listButton).toHaveAttribute('aria-pressed', 'true')
    await expect(bookcaseButton).toHaveAttribute('aria-pressed', 'false')
    await expect(bookcase(page)).toBeHidden()
    await expect(search(page)).toHaveValue('Dune')
    await expect(bookRows(page)).toHaveCount(1)

    // Remembered across visits, in both directions.
    await page.reload()
    await expect(listButton).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('table')).toBeVisible()
    await bookcaseButton.click()
    await page.reload()
    await expect(bookcaseButton).toHaveAttribute('aria-pressed', 'true')
    await expect(bookcase(page)).toBeVisible()
  })

  test.skip('[P0] AC-3 spines are 28px wide, grow with the title up to 200px, read in exact color, unread outlined', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [
        {
          title: 'Dune',
          authors: ['Frank Herbert'],
          spineColorUser: PALE_YELLOW.hex,
          readings: finished(),
        },
        { title: 'The Left Hand of Darkness', authors: ['Ursula K. Le Guin'] },
        { title: TUFTE, authors: ['Edward R. Tufte'], readings: finished() },
      ],
    })
    await page.goto(`${server.url}/`)
    const dune = spine(page, 'Dune by Frank Herbert, finished')
    const leftHand = spine(page, 'The Left Hand of Darkness by Ursula K. Le Guin, not read yet')
    const tufte = spine(page, `${TUFTE} by Edward R. Tufte, finished`)

    // 120 + 0.3 × the title's one-line length, rounded up to 8px, capped at 200.
    expect(await dune.boundingBox().then((box) => box && { width: box.width, height: box.height })).toEqual({
      width: 28,
      height: 136,
    })
    expect((await leftHand.boundingBox())?.height).toBe(168)
    expect((await tufte.boundingBox())?.height).toBe(200)
    expect((await leftHand.boundingBox())?.width).toBe(28)

    // Read: the exact stored color, the edge line on top and sides only, and
    // the title on the paper strip in spine-label ink.
    const read = await look(dune, 'Dune')
    expect(read.fill).toBe(PALE_YELLOW.rgb)
    expect(read.edgeColors).toEqual([SPINE_EDGE, SPINE_EDGE, SPINE_EDGE])
    expect(read.edgeWidths).not.toContain('0px')
    expect(read.bottomWidth).toBe('0px')
    expect(read.labelColor).toBe(INK)
    expect(read.strip?.fill).toBe(SPINE_LABEL_STRIP)

    // A long label stays one line, cut with an ellipsis, on a strip of at most 96px.
    const long = await look(tufte, TUFTE)
    expect(long.labelWhiteSpace).toBe('nowrap')
    expect(long.labelOverflow).toBe('ellipsis')
    expect(long.strip?.length).toBeLessThanOrEqual(STRIP_MAX)

    // Unread: the unread fill, an outline on top and sides, unread text, no strip.
    const unread = await look(leftHand, 'The Left Hand of Darkness')
    expect(unread.fill).toBe(SPINE_UNREAD_FILL)
    expect(unread.edgeColors).toEqual([SPINE_UNREAD_OUTLINE, SPINE_UNREAD_OUTLINE, SPINE_UNREAD_OUTLINE])
    expect(unread.edgeWidths).not.toContain('0px')
    expect(unread.bottomWidth).toBe('0px')
    expect(unread.labelColor).toBe(SPINE_UNREAD_TEXT)
    expect(unread.strip).toBeNull()
  })

  test.skip('[P0] AC-4 each spine is a button in a list item named with full title, first author and status', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [
        { title: 'Dune', authors: ['Frank Herbert'], readings: finished() },
        { title: 'The Science of Discworld', authors: ['Terry Pratchett', 'Ian Stewart', 'Jack Cohen'] },
        { title: TUFTE, authors: ['Edward R. Tufte'], readings: finished() },
      ],
    })
    await page.goto(`${server.url}/`)

    await expect(spine(page, 'Dune by Frank Herbert, finished')).toBeVisible()
    await expect(spine(page, 'The Science of Discworld by Terry Pratchett and 2 others, not read yet')).toBeVisible()
    // The full title even though the label is cut.
    await expect(spine(page, `${TUFTE} by Edward R. Tufte, finished`)).toBeVisible()
    // One button per list item, nothing else in the list.
    await expect(bookcase(page).getByRole('listitem')).toHaveCount(3)
    await expect(spines(page)).toHaveCount(3)
  })

  test.skip('[P1] AC-5 the bookcase is a shelf-wall card with header, library meter, legend and a named list in sort order', async ({
    page,
    seededServer,
  }) => {
    // Seeded out of order; Intl.Collator puts "bell hooks" and "Émile Zola"
    // among the capitalized authors.
    const server = await seededServer({
      books: [
        { title: 'The Dispossessed', authors: ['Ursula K. Le Guin'] },
        { title: 'Nana', authors: ['Émile Zola'], readings: finished() },
        { title: 'Dune', authors: ['Frank Herbert'] },
        { title: 'All About Love', authors: ['bell hooks'] },
        { title: 'A Wizard of Earthsea', authors: ['Ursula K. Le Guin'], readings: finished() },
      ],
    })
    await page.goto(`${server.url}/`)
    const main = page.getByRole('main')

    await expect(page.getByRole('list', { name: 'Bookcase, 5 books', exact: true })).toBeVisible()
    // By first author, then title.
    const order = [
      'All About Love by bell hooks, not read yet',
      'Nana by Émile Zola, finished',
      'Dune by Frank Herbert, not read yet',
      'A Wizard of Earthsea by Ursula K. Le Guin, finished',
      'The Dispossessed by Ursula K. Le Guin, not read yet',
    ]
    for (const [index, name] of order.entries()) {
      await expect(spines(page).nth(index), `spine ${index + 1}`).toHaveAccessibleName(name)
    }

    // Header and library meter.
    await expect(main.getByRole('heading', { name: /^bookcase$/i })).toBeVisible()
    const meter = main.getByRole('progressbar')
    await expect(meter).toHaveAttribute('aria-valuetext', '2 of 5 finished')
    await expect(meter).toHaveAttribute('aria-valuemin', '0')
    await expect(meter).toHaveAttribute('aria-valuemax', '5')
    await expect(meter).toHaveAttribute('aria-valuenow', '2')
    await expect(main.getByText('2 of 5 finished', { exact: true })).toBeVisible()
    // Legend.
    await expect(main.getByText(/^finished$/i)).toBeVisible()
    await expect(main.getByText(/^not read yet$/i)).toBeVisible()

    // A shelf-wall card, and nothing between it and the page scrolls on its own.
    const card = await bookcase(page).evaluate((element, wall) => {
      let onWall = false
      let scrolls = false
      for (let node: Element | null = element; node && node !== document.body; node = node.parentElement) {
        const style = getComputedStyle(node)
        if (style.backgroundColor === wall) onWall = true
        if (/(auto|scroll)/.test(style.overflowY)) scrolls = true
      }
      return { onWall, scrolls }
    }, SHELF_WALL)
    expect(card).toEqual({ onWall: true, scrolls: false })
  })

  test.skip('[P1] AC-6 all 500 spines of a 500-Book library are in the page and reachable by keyboard', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: shelfOf(500) })
    await page.goto(`${server.url}/`)

    await expect(page.getByRole('list', { name: 'Bookcase, 500 books', exact: true }).getByRole('button')).toHaveCount(500)
    // No lazy rows: the last title is text in the page for find-in-page…
    await expect(bookcase(page).getByText('Book 500', { exact: true })).toBeAttached()
    // …and the keyboard reaches it.
    await tabIntoBookcase(page)
    await page.keyboard.press('End')
    await expect(spine(page, 'Book 500 by Author, not read yet')).toBeFocused()
  })

  test.skip('[P0] AC-7 the bookcase is one Tab stop with roving tabindex, arrows, Home and End, and no type-ahead', async ({
    page,
    seededServer,
  }) => {
    // Two rows at 1280px (about 36 spines a row).
    const server = await seededServer({ books: shelfOf(50) })
    await page.goto(`${server.url}/`)
    const all = spines(page)

    await tabIntoBookcase(page)
    await expect(all.first()).toBeFocused()
    await expect(bookcase(page).locator('[tabindex="0"]')).toHaveCount(1)

    // Left and Right in sort order.
    await page.keyboard.press('ArrowRight')
    await expect(all.nth(1)).toBeFocused()
    await page.keyboard.press('ArrowLeft')
    await expect(all.first()).toBeFocused()

    const rows = await shelfRows(page)
    expect(rows).toHaveLength(2)
    const [top, bottom] = rows
    // Right crosses into the next row.
    await press(page, 'ArrowRight', top.length - 1)
    await expect(all.nth(top.at(-1)!)).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(all.nth(bottom[0])).toBeFocused()
    // Left crosses back.
    await page.keyboard.press('ArrowLeft')
    await expect(all.nth(top.at(-1)!)).toBeFocused()
    // Down from the far right of a full row: the shorter row's last spine has
    // the nearest horizontal center.
    await page.keyboard.press('ArrowDown')
    await expect(all.nth(bottom.at(-1)!)).toBeFocused()
    // Up: the spine straight above (spines are packed left, 28px each).
    await page.keyboard.press('ArrowUp')
    await expect(all.nth(top[bottom.length - 1])).toBeFocused()

    // Home and End: first and last spine of the bookcase.
    await page.keyboard.press('End')
    await expect(all.last()).toBeFocused()
    await page.keyboard.press('Home')
    await expect(all.first()).toBeFocused()

    // No type-ahead: a letter moves nothing.
    await page.keyboard.press('B')
    await expect(all.first()).toBeFocused()

    // Tab returns to the last focused spine; still one Tab stop.
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Shift+Tab')
    await expect(page.getByRole('button', { name: 'New book', exact: true })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(all.nth(1)).toBeFocused()
    await expect(bookcase(page).locator('[tabindex="0"]')).toHaveCount(1)
  })

  test.skip('[P1] AC-8 Search titles hides spines, closes up the shelf and moves the Tab stop to the nearest spine', async ({
    page,
    seededServer,
  }) => {
    const author = 'Author'
    // In sort order: Arcadia, Blue Moon, Cosmos, Dracula, Eclipse Moon.
    const server = await seededServer({
      books: ['Eclipse Moon', 'Cosmos', 'Arcadia', 'Dracula', 'Blue Moon'].map((title) => ({
        title,
        authors: [author],
      })),
    })
    await page.goto(`${server.url}/`)
    const name = (title: string) => `${title} by ${author}, not read yet`

    // Cosmos holds the Tab stop, then "moon" hides it.
    await tabIntoBookcase(page)
    await press(page, 'ArrowRight', 2)
    await expect(spine(page, name('Cosmos'))).toBeFocused()
    await search(page).fill('moon')

    await expect(spines(page)).toHaveCount(2)
    await expect(spines(page).first()).toHaveAccessibleName(name('Blue Moon'))
    await expect(spines(page).last()).toHaveAccessibleName(name('Eclipse Moon'))
    await expect(bookcase(page).getByRole('listitem')).toHaveCount(2)
    // The shelf closes up: the two spines stand side by side.
    const [blue, eclipse] = await Promise.all([
      spine(page, name('Blue Moon')).boundingBox(),
      spine(page, name('Eclipse Moon')).boundingBox(),
    ])
    expect(eclipse!.x - (blue!.x + blue!.width)).toBe(4)
    // The Tab stop moved to the nearest remaining spine in sort order (Blue
    // Moon is one away, Eclipse Moon two).
    await tabIntoBookcase(page)
    await expect(spine(page, name('Blue Moon'))).toBeFocused()

    // None remain: the shelf shows the no-match line and focus stays in Search titles.
    await search(page).fill('zzz')
    await expect(search(page)).toBeFocused()
    await expect(spines(page)).toHaveCount(0)
    await expect(page.getByRole('main').getByText('No titles match “zzz”.', { exact: true })).toBeVisible()
  })

  test.skip('[P0] AC-9 after an add in Bookcase view the new spine is scrolled into view, ringed and focused', async ({
    page,
    seededServer,
  }) => {
    // About nine rows: the new Book sorts last, below the fold.
    const server = await seededServer({ books: shelfOf(300) })
    await page.goto(`${server.url}/`)
    await page.getByRole('button', { name: 'New book', exact: true }).click()
    const panel = page.getByRole('dialog', { name: 'New book', exact: true })
    for (const [label, value] of Object.entries(SWING_TIME)) {
      await panel.getByLabel(label, { exact: true }).fill(value)
    }
    await panel.getByRole('combobox', { name: 'Type', exact: true }).selectOption('Paperback')
    await panel.getByRole('button', { name: 'Add book', exact: true }).click()
    const added = spine(page, 'Swing Time by Zadie Smith, not read yet')

    await expect(added).toBeFocused()
    await expect(panel).toBeHidden()
    await expect(added).toBeInViewport()
    await expect(page.getByRole('status')).toHaveText('Added Swing Time.')
    // Highlight ring: an accent box-shadow on the spine or inside it, gone after about 2 s.
    const ringed = () =>
      added.evaluate(
        (element, accent) =>
          [element, element.parentElement!, ...Array.from(element.querySelectorAll('*'))].some((node) =>
            getComputedStyle(node).boxShadow.includes(accent),
          ),
        ACCENT,
      )
    await expect.poll(ringed).toBe(true)
    await expect.poll(ringed, { timeout: 4_000 }).toBe(false)
  })

  test.skip('[P0] AC-10 the cataloging skill confirms a save from a spine named "Dune by …", in Bookcase and List view', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [
        { title: 'Dune Messiah', authors: ['Frank Herbert'] },
        { title: 'Neuromancer', authors: ['William Gibson'] },
      ],
    })
    await page.goto(`${server.url}/`)
    await page.getByRole('button', { name: 'New book', exact: true }).click()
    const panel = page.getByRole('dialog', { name: 'New book', exact: true })
    for (const [label, value] of Object.entries({
      Title: 'Dune',
      Pages: '412',
      'Author(s)': 'Frank Herbert',
      Language: 'English',
      Publisher: 'Chilton Books',
    })) {
      await panel.getByLabel(label, { exact: true }).fill(value)
    }
    await panel.getByRole('combobox', { name: 'Type', exact: true }).selectOption('Paperback')
    await panel.getByRole('button', { name: 'Add book', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText('Added Dune.')
    await search(page).fill('Dune')

    await expect(bookcase(page).getByRole('button', { name: /^Dune by / })).toHaveCount(1)
    // "Dune Messiah by …" matches the search but never the "Dune by " prefix.
    await expect(spines(page)).toHaveCount(2)
    await expect(bookcase(page).getByRole('button', { name: /^Dune Messiah by / })).toHaveCount(1)

    // The same check in List view: the row whose title equals "Dune" exactly.
    await viewToggle(page).getByRole('button', { name: 'List', exact: true }).click()
    await expect(bookRows(page).filter({ has: page.getByText('Dune', { exact: true }) })).toHaveCount(1)
    await expect(bookRows(page)).toHaveCount(2)

    // Bookcase remembered, then opened again: the spine check still holds.
    await viewToggle(page).getByRole('button', { name: 'Bookcase', exact: true }).click()
    await page.reload()
    await search(page).fill('Dune')
    await expect(bookcase(page).getByRole('button', { name: /^Dune by / })).toHaveCount(1)
  })

  test.skip('[P1] AC-11 read and unread spines stay distinct in both themes and forced colors, and axe passes', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [
        { title: 'Dune', authors: ['Frank Herbert'], readings: finished() },
        { title: 'Neuromancer', authors: ['William Gibson'] },
      ],
    })
    const read = spine(page, 'Dune by Frank Herbert, finished')
    const unread = spine(page, 'Neuromancer by William Gibson, not read yet')
    const fills = () =>
      Promise.all([read, unread].map((button) => button.evaluate((element) => getComputedStyle(element).backgroundColor)))

    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme, forcedColors: 'none' })
      await page.goto(`${server.url}/`)
      const [readFill, unreadFill] = await fills()
      expect(readFill, colorScheme).not.toBe(unreadFill)
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(violations.map(({ id, nodes }) => `${colorScheme}: ${id} (${nodes.length})`)).toEqual([])
    }

    // Forced colors: the read fill stays solid, the unread spine keeps an
    // outline that differs from its fill.
    await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' })
    await page.goto(`${server.url}/`)
    const [readFill, unreadFill] = await fills()
    expect(readFill).not.toBe(unreadFill)
    const outline = await unread.evaluate((element) => {
      const style = getComputedStyle(element)
      return { edge: style.borderTopColor, fill: style.backgroundColor }
    })
    expect(outline.edge).not.toBe(outline.fill)
  })
})
