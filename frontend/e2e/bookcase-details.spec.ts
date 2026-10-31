// Story 1.10 Bookcase view, the secondary branches of its criteria: Tab
// order through the toolbar, spine geometry and text spacing, rows by
// viewport width, keys that do nothing yet, focus when a focused spine is
// hidden, focus after an add under reduced motion or from Add anyway, the
// dark tokens, the focus ring and axe at 500 spines. The main paths are in
// bookcase.spec.ts.

import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import {
  INK,
  ACCENT,
  SPINE_LABEL_STRIP,
  TRANSPARENT,
  TUFTE,
  SWING_TIME,
  finished,
  shelfOf,
  bookcase,
  spines,
  spine,
  viewToggle,
  search,
  tabIntoBookcase,
  press,
  shelfRows,
  look,
} from './bookcase.ts'
// DESIGN.md colors, dark theme. The label strip and its ink have no dark
// token: the strip stays paper in both themes.
const PAGE = 'rgb(246, 244, 239)'
const SPINE_EDGE_DARK = 'rgb(133, 138, 127)'
const SPINE_UNREAD_FILL_DARK = 'rgb(37, 40, 34)'
const SPINE_UNREAD_OUTLINE_DARK = 'rgb(112, 118, 106)'
const SPINE_UNREAD_TEXT_DARK = 'rgb(163, 158, 146)'
// DESIGN.md → Bookcase: a list item is one shelf row high; the plank starts below it.
const ROW_HEIGHT = 204
// A spine plus the gap to the next one.
const SPINE_PITCH = 28 + 4
const SHELF_PADDING = 12
// WCAG 1.4.12 text spacing, as a user stylesheet would set it.
const TEXT_SPACING =
  '* { letter-spacing: 0.12em !important; word-spacing: 0.16em !important; line-height: 1.5 !important; }'

/** Opens New book and fills a complete Book by label (Type: Paperback). */
async function fillNewBook(page: Page, fields: Record<string, string>): Promise<Locator> {
  await page.getByRole('button', { name: 'New book', exact: true }).click()
  const panel = page.getByRole('dialog', { name: 'New book', exact: true })
  for (const [label, value] of Object.entries(fields)) {
    await panel.getByLabel(label, { exact: true }).fill(value)
  }
  await panel.getByRole('combobox', { name: 'Type', exact: true }).selectOption('Paperback')
  return panel
}

/**
 * Sets Search titles the way a script does, leaving focus where it is. Only
 * Search titles can hide spines in this story, and typing in it takes focus
 * off the shelf; filters (Epic 7) and Delete (Story 1.12) will hide a spine
 * that has focus.
 */
async function setSearchKeepingFocus(page: Page, value: string): Promise<void> {
  await search(page).evaluate((input: HTMLInputElement, text) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }, value)
}

test.describe('Story 1.10 Bookcase view details (automate)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test('[P2] AC-1 Tab order is Search titles, Bookcase, List, New book, then the shelf', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [{ title: 'Dune', authors: ['Frank Herbert'] }] })
    await page.goto(`${server.url}/`)
    const toggle = viewToggle(page)

    await search(page).focus()
    await page.keyboard.press('Tab')
    await expect(toggle.getByRole('button', { name: 'Bookcase', exact: true })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(toggle.getByRole('button', { name: 'List', exact: true })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'New book', exact: true })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(spine(page, 'Dune by Frank Herbert, not read yet')).toBeFocused()
  })

  test('[P2] AC-3 spines of different heights stand on one plank, with a 6px band of fill beside the strip', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [
        { title: 'Dune', authors: ['Frank Herbert'], readings: finished() },
        { title: 'The Left Hand of Darkness', authors: ['Ursula K. Le Guin'], readings: finished() },
        { title: TUFTE, authors: ['Edward R. Tufte'], readings: finished() },
      ],
    })
    await page.goto(`${server.url}/`)
    const names = [
      'Dune by Frank Herbert, finished',
      'The Left Hand of Darkness by Ursula K. Le Guin, finished',
      `${TUFTE} by Edward R. Tufte, finished`,
    ]
    const shelfTop = (await bookcase(page).boundingBox())!.y

    const boxes = await Promise.all(names.map((name) => spine(page, name).boundingBox()))
    expect(new Set(boxes.map((box) => box!.height)).size).toBe(3)
    for (const [index, box] of boxes.entries()) {
      expect(box!.y + box!.height - shelfTop, names[index]).toBe(ROW_HEIGHT)
    }

    // The strip is the plate behind the label, the button's only painted descendant.
    const bands = await spine(page, names[0]).evaluate((element, transparent) => {
      const button = element.getBoundingClientRect()
      const strip = Array.from(element.querySelectorAll('*'))
        .find((node) => getComputedStyle(node).backgroundColor !== transparent)!
        .getBoundingClientRect()
      return [strip.left - button.left, button.right - strip.right]
    }, TRANSPARENT)
    expect(bands).toEqual([6, 6])
  })

  test('[P2] AC-3 a user-set near-black and pure white are shown exactly', async ({ page, seededServer }) => {
    const server = await seededServer({
      books: [
        { title: 'Dune', authors: ['Frank Herbert'], spineColorUser: '#111111', readings: finished() },
        { title: 'Neuromancer', authors: ['William Gibson'], spineColorUser: '#FFFFFF', readings: finished() },
      ],
    })
    await page.goto(`${server.url}/`)

    await expect(spine(page, 'Dune by Frank Herbert, finished')).toHaveCSS('background-color', 'rgb(17, 17, 17)')
    await expect(spine(page, 'Neuromancer by William Gibson, finished')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    )
  })

  test('[P2] AC-3 a text-spacing override grows the spine by the formula', async ({ page, seededServer }) => {
    const server = await seededServer({
      books: [{ title: 'The Left Hand of Darkness', authors: ['Ursula K. Le Guin'] }],
    })
    const leftHand = spine(page, 'The Left Hand of Darkness by Ursula K. Le Guin, not read yet')
    const measure = () =>
      leftHand.evaluate((element, title) => {
        // The label: the deepest element whose text is the title, as in look().
        const label = Array.from(element.querySelectorAll('*'))
          .filter((node) => node.textContent === title)
          .at(-1)!
        return { height: element.getBoundingClientRect().height, length: label.scrollHeight }
      }, 'The Left Hand of Darkness')
    const formula = (length: number) => Math.min(200, Math.ceil((120 + 0.3 * length) / 8) * 8)

    await page.goto(`${server.url}/`)
    await expect(leftHand).toBeVisible()
    const plain = await measure()

    // Adopted before the app's own styles load, so the first measurement sees it.
    await page.addInitScript((css) => {
      const sheet = new CSSStyleSheet()
      sheet.replaceSync(css)
      document.adoptedStyleSheets = [sheet]
    }, TEXT_SPACING)
    await page.reload()
    await expect(leftHand).toBeVisible()
    const spaced = await measure()

    expect(spaced.length).toBeGreaterThan(plain.length)
    expect(spaced.height).toBeGreaterThan(plain.height)
    expect(spaced.height).toBe(formula(spaced.length))
  })

  test('[P2] AC-5 rows follow the viewport width, about 35 spines a plank at 1280px, 12px in from the ends', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: shelfOf(120) })
    await page.goto(`${server.url}/`)
    const topRow = async () => (await shelfRows(page))[0].length

    await page.setViewportSize({ width: 1280, height: 800 })
    await expect(spines(page)).toHaveCount(120)
    const shelf = (await bookcase(page).boundingBox())!
    const capacity = Math.floor((shelf.width - 2 * SHELF_PADDING + 4) / SPINE_PITCH)
    expect(capacity).toBeGreaterThanOrEqual(33)
    expect(capacity).toBeLessThanOrEqual(37)
    expect(await topRow()).toBe(capacity)
    const first = (await spines(page).first().boundingBox())!
    expect(first.x - shelf.x).toBe(SHELF_PADDING)
    const endOfRow = (await spines(page).nth(capacity - 1).boundingBox())!
    const rightGap = shelf.x + shelf.width - (endOfRow.x + endOfRow.width)
    expect(rightGap).toBeGreaterThanOrEqual(SHELF_PADDING)
    expect(rightGap).toBeLessThan(SHELF_PADDING + SPINE_PITCH)

    await page.setViewportSize({ width: 1024, height: 800 })
    await expect.poll(topRow).toBeLessThan(capacity)
    await page.setViewportSize({ width: 1440, height: 800 })
    await expect.poll(topRow).toBeGreaterThan(capacity)
  })

  test('[P2] AC-7 Enter and Space on a spine do nothing yet', async ({ page, seededServer }) => {
    const server = await seededServer({ books: shelfOf(3) })
    await page.goto(`${server.url}/`)
    const url = page.url()

    await tabIntoBookcase(page)
    await page.keyboard.press('ArrowRight')
    const focused = spine(page, 'Book 002 by Author, not read yet')
    await expect(focused).toBeFocused()
    for (const key of ['Enter', 'Space']) {
      await page.keyboard.press(key)
      await expect(focused, key).toBeFocused()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(page.getByRole('alertdialog')).toHaveCount(0)
      expect(page.url(), key).toBe(url)
    }
    await expect(bookcase(page).locator('[tabindex="0"]')).toHaveAccessibleName('Book 002 by Author, not read yet')
  })

  test('[P3] AC-8 a hidden Tab stop between two equally near spines moves to the previous one', async ({
    page,
    seededServer,
  }) => {
    const author = 'Author'
    // In sort order: Arcadia, Blue Moon, Cosmos, Dark Moon, Eclipse.
    const server = await seededServer({
      books: ['Eclipse', 'Dark Moon', 'Cosmos', 'Blue Moon', 'Arcadia'].map((title) => ({
        title,
        authors: [author],
      })),
    })
    await page.goto(`${server.url}/`)

    await tabIntoBookcase(page)
    await press(page, 'ArrowRight', 2)
    await expect(spine(page, `Cosmos by ${author}, not read yet`)).toBeFocused()
    await search(page).fill('moon')
    await expect(spines(page)).toHaveCount(2)

    await tabIntoBookcase(page)
    await expect(spine(page, `Blue Moon by ${author}, not read yet`)).toBeFocused()
  })

  test('[P2] AC-8 a focused spine that gets hidden hands focus on, and to Search titles when none remain', async ({
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

    await tabIntoBookcase(page)
    await press(page, 'ArrowRight', 2)
    await expect(spine(page, name('Cosmos'))).toBeFocused()

    // Blue Moon is one away, Eclipse Moon two.
    await setSearchKeepingFocus(page, 'moon')
    await expect(spines(page)).toHaveCount(2)
    await expect(spine(page, name('Blue Moon'))).toBeFocused()

    await setSearchKeepingFocus(page, 'zzz')
    await expect(spines(page)).toHaveCount(0)
    await expect(search(page)).toBeFocused()
  })

  test('[P2] AC-9 under reduced motion a search is cleared, the scroll is instant and the ring has no fade', async ({
    page,
    seededServer,
  }) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
    await page.addInitScript(() => {
      const scrolls: unknown[] = []
      Object.assign(window, { scrolls })
      const original = Element.prototype.scrollIntoView
      Element.prototype.scrollIntoView = function (this: Element, options?: boolean | ScrollIntoViewOptions) {
        scrolls.push(options)
        original.call(this, options)
      }
    })
    const server = await seededServer({ books: shelfOf(300) })
    await page.goto(`${server.url}/`)
    // Every seeded title matches; Swing Time would be hidden.
    await search(page).fill('Book')

    const panel = await fillNewBook(page, SWING_TIME)
    await panel.getByRole('button', { name: 'Add book', exact: true }).click()
    const added = spine(page, 'Swing Time by Zadie Smith, not read yet')

    await expect(added).toBeFocused()
    await expect(search(page)).toHaveValue('')
    await expect(spines(page)).toHaveCount(301)
    await expect(added).toBeInViewport()
    const scrolls = await page.evaluate(() => (window as unknown as { scrolls: unknown[] }).scrolls)
    expect(scrolls).toEqual([{ block: 'nearest', behavior: 'auto' }])
    await expect(added).toHaveCSS('box-shadow', new RegExp(ACCENT.replace(/[()]/g, '\\$&')))
    await expect(added).toHaveCSS('transition-duration', '0s')
  })

  test('[P2] AC-9 Add anyway from the Duplicate dialog focuses the new spine, not the old one', async ({
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
    const dune = 'Dune by Frank Herbert, not read yet'
    const old = await spine(page, dune).elementHandle()

    const panel = await fillNewBook(page, {
      Title: 'Dune',
      Pages: '412',
      'Author(s)': 'Frank Herbert',
      Language: 'English',
      Publisher: 'Chilton Books',
    })
    await panel.getByRole('button', { name: 'Add book', exact: true }).click()
    await page
      .getByRole('alertdialog', { name: 'Possible duplicate', exact: true })
      .getByRole('button', { name: 'Add anyway', exact: true })
      .click()
    await expect(page.getByRole('status')).toHaveText('Added Dune.')

    await expect(bookcase(page).getByRole('button', { name: dune, exact: true })).toHaveCount(2)
    const focus = await page.evaluate(
      (previous) => ({ name: document.activeElement?.getAttribute('aria-label'), old: document.activeElement === previous }),
      old,
    )
    expect(focus).toEqual({ name: dune, old: false })
  })

  test('[P2] AC-11 dark theme: edge, strip, unread fill, outline and text are the dark tokens', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [
        { title: 'Dune', authors: ['Frank Herbert'], readings: finished() },
        { title: 'Neuromancer', authors: ['William Gibson'] },
      ],
    })
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto(`${server.url}/`)

    const read = await look(spine(page, 'Dune by Frank Herbert, finished'), 'Dune')
    expect(read.edgeColors).toEqual([SPINE_EDGE_DARK, SPINE_EDGE_DARK, SPINE_EDGE_DARK])
    expect(read.strip?.fill).toBe(SPINE_LABEL_STRIP)
    expect(read.labelColor).toBe(INK)

    const unread = await look(spine(page, 'Neuromancer by William Gibson, not read yet'), 'Neuromancer')
    expect(unread.fill).toBe(SPINE_UNREAD_FILL_DARK)
    expect(unread.edgeColors).toEqual([
      SPINE_UNREAD_OUTLINE_DARK,
      SPINE_UNREAD_OUTLINE_DARK,
      SPINE_UNREAD_OUTLINE_DARK,
    ])
    expect(unread.labelColor).toBe(SPINE_UNREAD_TEXT_DARK)
    expect(unread.strip).toBeNull()
  })

  test('[P2] AC-11 a focused spine has the two-tone ring: a page band, then the accent outline', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [{ title: 'Dune', authors: ['Frank Herbert'] }] })
    await page.goto(`${server.url}/`)
    const dune = spine(page, 'Dune by Frank Herbert, not read yet')

    await tabIntoBookcase(page)
    await expect(dune).toBeFocused()
    await expect(dune).toHaveCSS('outline-style', 'solid')
    await expect(dune).toHaveCSS('outline-color', ACCENT)
    await expect(dune).toHaveCSS('outline-width', '2px')
    await expect(dune).toHaveCSS('outline-offset', '2px')
    await expect(dune).toHaveCSS('box-shadow', `${PAGE} 0px 0px 0px 2px`)
  })

  test('[P2] AC-11 axe finds nothing with 500 spines, in both themes', async ({ page, seededServer }) => {
    const server = await seededServer({
      books: shelfOf(500).map((book, index) => (index % 2 ? book : { ...book, readings: finished() })),
    })
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await page.goto(`${server.url}/`)
      await expect(spines(page)).toHaveCount(500)
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(violations.map(({ id, nodes }) => `${colorScheme}: ${id} (${nodes.length})`)).toEqual([])
    }
  })
})
