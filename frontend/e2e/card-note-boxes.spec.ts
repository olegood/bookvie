// Story 14.2 See my card notes as boxes. The unscoped Card notes page gains a
// remembered Boxes · List toggle (`bookvie.cardNotesView`, Boxes by default):
// Boxes shows one Card note box per Book with notes, in the groups' order, in
// the Book's spine color with a pile of 1, 3, 5 or 7 cards, each a link to the
// Book's scoped page; a count line sums the notes. List is the page as it was.
// fixtures.ts stores "list" before every other spec; the specs here turn that
// off, except the two about the List itself.

import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'
import { backToTop, scrollToY } from './back-to-top.ts'
import { SPINE_LABEL } from './bookcase.ts'
import { boxOf, inLiveRegion, recordStatus, statusTexts, storedChoice, zipEntries } from './card-note-add-another.ts'
import {
  ANATHEM_COLOR,
  box,
  boxLinks,
  boxLook,
  boxName,
  cardNotesPage,
  cardNotesViewToggle,
  columnsOf,
  FLIGHTS,
  groupHeadings,
  MANY_BOXES,
  noteCount,
  PILE_BOXES,
  PILE_COUNT_LINE,
  PILE_SHELF,
  searchField,
  VIEW_KEY,
  viewButton,
} from './card-note-boxes.ts'
import { systemColor } from './dev-mode.ts'
import { expect, test } from './fixtures.ts'
import {
  ACCENT,
  ACCENT_DARK,
  designComponentColor,
  designComponentValue,
  designTokens,
  INK_TERTIARY,
  PAGE,
  rgbOf,
  SPINE_LABEL_STRIP,
} from './library.ts'
import { exportOf } from './restore.ts'
import { afterAnnounceDelay, COULDNT_LOAD } from './stats.ts'

const TOKENS_CSS = new URL('../src/styles/tokens.css', import.meta.url)
const PILE_TITLES = PILE_BOXES.map(({ title }) => title)

/** DESIGN.md → Elevation & Depth → Card note box front, as computed style writes a box-shadow. */
const BOX_FRONT_SHADOW = 'rgba(0, 0, 0, 0.12) 0px -3px 0px 0px inset, rgba(43, 46, 42, 0.12) 0px 1px 2px 0px'
const BOX_FRONT_SHADOW_DARK = 'rgba(0, 0, 0, 0.12) 0px -3px 0px 0px inset, rgba(0, 0, 0, 0.35) 0px 1px 2px 0px'

/** DESIGN.md → Card note box → Cards: the angles from the back, in degrees. */
const CARD_ANGLES = [-1.6, 1.2, -0.6, 1.8, -1.2, 0.8, -1.8]

/** DESIGN.md page, dark theme. */
const PAGE_DARK = rgbOf('#191B18')

/** Each Book's spine color as the card-notes view gives it (Story 14.1), by Book id, as `rgb(…)`. */
async function spineColors(page: Page, url: string): Promise<Map<string, string>> {
  const response = await page.request.get(`${url}/api/views/card-notes`)
  const body = (await response.json()) as { groups: { bookId: string; spineColor: string }[] }
  return new Map(body.groups.map((group) => [group.bookId, rgbOf(group.spineColor)]))
}

test.describe('Story 14.2 See my card notes as boxes, the List view (ATDD)', () => {
  // No test.use here: the default fixture stores "list", as for every Card notes spec written before Epic 14.

  test('[P0] AC-1 the default fixture stores "list", so the existing Card notes specs open the List view unchanged', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(PILE_SHELF)
    await page.goto(cardNotesPage(server))

    await expect(viewButton(page, 'List')).toHaveAttribute('aria-pressed', 'true')

    await expect(viewButton(page, 'Boxes')).toHaveAttribute('aria-pressed', 'false')
    await expect(groupHeadings(page)).toHaveText(PILE_TITLES)
    await expect(boxLinks(page)).toHaveCount(0)
    expect(await storedChoice(page, VIEW_KEY)).toBe('list')
  })

  test('[P0] AC-4 List view is the unscoped page as before: groups, search with highlights and "N notes match.", Edit and "Go through as a pile"', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(PILE_SHELF)
    await page.goto(cardNotesPage(server))

    await expect(viewButton(page, 'List')).toHaveAttribute('aria-pressed', 'true')

    const main = page.getByRole('main')
    await expect(groupHeadings(page)).toHaveText(PILE_TITLES)
    await expect(main.getByRole('button', { name: 'Go through as a pile', exact: true })).toHaveCount(PILE_BOXES.length)
    await expect(main.getByRole('button', { name: 'Edit p.1', exact: true })).toHaveCount(PILE_BOXES.length)
    await expect(main.getByText(PILE_COUNT_LINE, { exact: true })).toHaveCount(0)

    await searchField(page).fill('beloved NOTE')
    await expect(groupHeadings(page)).toHaveText(['Beloved'])
    await expect(main.locator('mark')).toHaveText(['Beloved note'])
    await expect(page.getByRole('status')).toHaveText('1 note matches.')

    await searchField(page).fill('')
    await expect(groupHeadings(page)).toHaveText(PILE_TITLES)
    await main.getByRole('button', { name: 'Go through as a pile', exact: true }).first().click()
    await expect(page.getByRole('dialog')).toContainText('1 of 21')
  })
})

test.describe('Story 14.2 See my card notes as boxes (ATDD)', () => {
  test.use({ cardNotesView: null })

  test('[P0] AC-2 with nothing stored, an empty or junk value, or storage whose read throws, the page opens in Boxes; a stored "list" opens List', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(PILE_SHELF)
    await page.goto(cardNotesPage(server))

    await expect(viewButton(page, 'Boxes')).toHaveAttribute('aria-pressed', 'true')

    await expect(viewButton(page, 'List')).toHaveAttribute('aria-pressed', 'false')
    await expect(boxLinks(page)).toHaveCount(PILE_BOXES.length)
    expect(await storedChoice(page, VIEW_KEY)).toBeNull()

    for (const junk of ['', 'grid', 'LIST', ' list']) {
      await page.evaluate(([key, value]) => window.localStorage.setItem(key, value), [VIEW_KEY, junk] as const)
      await page.reload()
      await expect(viewButton(page, 'Boxes'), `stored ${JSON.stringify(junk)}`).toHaveAttribute('aria-pressed', 'true')
      await expect(boxLinks(page)).toHaveCount(PILE_BOXES.length)
    }

    await page.evaluate((key) => window.localStorage.setItem(key, 'list'), VIEW_KEY)
    await page.reload()
    await expect(viewButton(page, 'List')).toHaveAttribute('aria-pressed', 'true')
    await expect(groupHeadings(page)).toHaveText(PILE_TITLES)
    await expect(boxLinks(page)).toHaveCount(0)

    // A read that throws means Boxes, even with "list" stored, and nothing breaks.
    const throwing = await page.context().newPage()
    const errors: string[] = []
    throwing.on('pageerror', (error) => errors.push(error.message))
    await throwing.addInitScript((key) => {
      const { getItem } = Storage.prototype
      Storage.prototype.getItem = function (this: Storage, name: string) {
        if (name === key) throw new DOMException('denied', 'SecurityError')
        return getItem.call(this, name)
      }
    }, VIEW_KEY)
    await throwing.goto(cardNotesPage(server))
    await expect(viewButton(throwing, 'Boxes')).toHaveAttribute('aria-pressed', 'true')
    await expect(boxLinks(throwing)).toHaveCount(PILE_BOXES.length)
    expect(errors).toEqual([])
    await throwing.close()
  })

  test('[P0] AC-3 the toolbar holds Search card notes, the Card notes view toggle and the count line; List switches in place, keeps focus and text, stays silent, and is stored', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(PILE_SHELF)
    await page.goto(cardNotesPage(server))

    await expect(cardNotesViewToggle(page).getByRole('button')).toHaveText(['Boxes', 'List'])

    // Search card notes, then the toggle and the count line, spacing.4 (16px) apart on one row.
    const countLine = page.getByRole('main').getByText(PILE_COUNT_LINE, { exact: true })
    await expect(countLine).toBeVisible()
    const field = await boxOf(searchField(page))
    const toggle = await boxOf(cardNotesViewToggle(page))
    const line = await boxOf(countLine)
    expect(Math.round(toggle.x - (field.x + field.width))).toBe(16)
    expect(Math.round(line.x - (toggle.x + toggle.width))).toBe(16)
    expect(Math.abs(toggle.y + toggle.height / 2 - (field.y + field.height / 2))).toBeLessThanOrEqual(1)

    // The Catalog view toggle's visual (components.card-notes-view-toggle), text only.
    const look = (page: Page, group: string) =>
      page
        .getByRole('main')
        .getByRole('group', { name: group, exact: true })
        .evaluate((element) => {
          const pick = (el: Element) => {
            const s = getComputedStyle(el)
            return [s.backgroundColor, s.borderTop, s.borderBottom, s.borderRadius, s.padding, s.font, s.color].join(
              ' | ',
            )
          }
          const buttons = Array.from(element.querySelectorAll('button'))
          return {
            group: pick(element),
            pressed: pick(buttons.find((b) => b.getAttribute('aria-pressed') === 'true') as Element),
            unpressed: pick(buttons.find((b) => b.getAttribute('aria-pressed') === 'false') as Element),
            glyphs: element.querySelectorAll('svg, img').length,
          }
        })
    const cardNotesToggle = await look(page, 'Card notes view')
    await page.goto(`${server.url}/catalog`)
    await expect(page.getByRole('main').getByRole('group', { name: 'Catalog view', exact: true })).toBeVisible()
    expect(cardNotesToggle).toEqual(await look(page, 'Catalog view'))
    expect(cardNotesToggle.glyphs).toBe(0)

    // A press of List: List in place, focus kept, text kept, status silent, stored at once.
    await page.goto(cardNotesPage(server))
    await expect(boxLinks(page)).toHaveCount(PILE_BOXES.length)
    await searchField(page).fill('Candide note')
    await expect(page.getByRole('status')).toHaveText('5 card notes in 1 Book contain “Candide note”.')
    await recordStatus(page)
    await viewButton(page, 'List').click()
    await expect(viewButton(page, 'List')).toHaveAttribute('aria-pressed', 'true')
    await expect(viewButton(page, 'List')).toBeFocused()
    await expect(page).toHaveURL(cardNotesPage(server))
    await expect(searchField(page)).toHaveValue('Candide note')
    await expect(groupHeadings(page)).toHaveText(['Candide'])
    expect(await storedChoice(page, VIEW_KEY)).toBe('list')
    await afterAnnounceDelay(page)
    expect(await statusTexts(page)).toEqual([])

    await page.reload()
    await expect(viewButton(page, 'List')).toHaveAttribute('aria-pressed', 'true')
    await expect(groupHeadings(page)).toHaveText(PILE_TITLES)

    // Enter presses Boxes, Space presses List.
    await viewButton(page, 'Boxes').focus()
    await page.keyboard.press('Enter')
    await expect(viewButton(page, 'Boxes')).toHaveAttribute('aria-pressed', 'true')
    await expect(boxLinks(page)).toHaveCount(PILE_BOXES.length)
    expect(await storedChoice(page, VIEW_KEY)).toBe('boxes')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Space')
    await expect(viewButton(page, 'List')).toHaveAttribute('aria-pressed', 'true')
    await expect(viewButton(page, 'List')).toBeFocused()

    // A write that throws still switches for this visit, with no message.
    const throwing = await page.context().newPage()
    const errors: string[] = []
    throwing.on('pageerror', (error) => errors.push(error.message))
    await throwing.addInitScript((key) => {
      const { setItem } = Storage.prototype
      Storage.prototype.setItem = function (this: Storage, name: string, value: string) {
        if (name === key) throw new DOMException('denied', 'SecurityError')
        setItem.call(this, name, value)
      }
    }, VIEW_KEY)
    await throwing.goto(cardNotesPage(server))
    await expect(viewButton(throwing, 'List')).toHaveAttribute('aria-pressed', 'true')
    await viewButton(throwing, 'Boxes').click()
    await expect(viewButton(throwing, 'Boxes')).toHaveAttribute('aria-pressed', 'true')
    await expect(boxLinks(throwing)).toHaveCount(PILE_BOXES.length)
    await expect(throwing.getByRole('alert')).toHaveText('')
    expect(errors).toEqual([])
    await throwing.close()

    // Never in an export.
    const archive = await exportOf(page, server)
    const texts = [...zipEntries(archive.buffer)].map(([name, data]) => `${name}\n${data.toString('utf8')}`)
    expect(texts.length).toBeGreaterThan(0)
    expect(texts.filter((text) => /cardNotesView/i.test(text))).toEqual([])
  })

  test('[P1] AC-5 one box per Book with notes, in the groups\' order, with 1, 3, 3, 5, 5 and 7 cards, its label, and a link named "Title, N card notes"', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(PILE_SHELF)
    await page.goto(cardNotesPage(server))

    await expect(boxLinks(page)).toHaveCount(PILE_BOXES.length)

    // In the groups' order, named with the full title; none for Austerlitz or Middlemarch.
    for (const [i, { title, id, notes }] of PILE_BOXES.entries()) {
      await expect(boxLinks(page).nth(i)).toHaveAccessibleName(boxName(title, notes))
      await expect(boxLinks(page).nth(i)).toHaveAttribute('href', `/card-notes?book=${id}`)
    }
    await expect(page.getByRole('main')).not.toContainText('Austerlitz')
    await expect(page.getByRole('main')).not.toContainText('Middlemarch')

    // The pile step, the label's title and "N card notes" ("1 card note").
    for (const { title, notes, cards } of PILE_BOXES) {
      const look = await boxLook(box(page, boxName(title, notes)), title, noteCount(notes))
      expect(look.cards.length, title).toBe(cards)
      expect(look.title, title).not.toBeNull()
      expect(look.count, title).not.toBeNull()
    }
    // The long title shows two lines, then an ellipsis; a short one fits on one.
    const flights = await boxLook(box(page, boxName(FLIGHTS, 20)), FLIGHTS, noteCount(20))
    expect(flights.title?.lines).toBe(2)
    expect(flights.title?.truncated).toBe(true)
    const emma = await boxLook(box(page, boxName('Emma', 6)), 'Emma', noteCount(6))
    expect(emma.title?.lines).toBe(1)
    expect(emma.title?.truncated).toBe(false)

    // One Tab stop per box, in grid order.
    await boxLinks(page).first().focus()
    for (const { title, notes } of PILE_BOXES.slice(1)) {
      await page.keyboard.press('Tab')
      await expect(box(page, boxName(title, notes))).toBeFocused()
    }

    // Click and Enter open the scoped page as it is before this story.
    await box(page, boxName('Candide', 5)).click()
    await expect(page).toHaveURL(cardNotesPage(server, PILE_BOXES[2].id))
    await expect(page.getByRole('main').getByText('In Candide', { exact: true })).toBeVisible()
    await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(5)
    await expect(cardNotesViewToggle(page)).toHaveCount(0)
    await page.goBack()
    await box(page, boxName('Beloved', 1)).focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(cardNotesPage(server, PILE_BOXES[1].id))
    await expect(page.getByRole('main').getByText('In Beloved', { exact: true })).toBeVisible()
  })

  test('[P1] AC-6 a left-aligned grid of 216 × 196 boxes in 4, 5 and 5 columns; the front in the exact spine color, the label strip and the turned paper cards, the same in dark', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(PILE_SHELF)
    const colors = await spineColors(page, server.url)
    await page.emulateMedia({ colorScheme: 'light' })
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto(cardNotesPage(server))

    await expect.poll(() => columnsOf(page)).toBe(4)

    for (const [width, columns] of [
      [1280, 5],
      [1440, 5],
      [1024, 4],
    ] as const) {
      await page.setViewportSize({ width, height: 900 })
      await expect.poll(() => columnsOf(page), `${width}px`).toBe(columns)
      const rects = await Promise.all(PILE_BOXES.map(({ title, notes }) => boxOf(box(page, boxName(title, notes)))))
      for (const rect of rects) expect([rect.width, rect.height], `${width}px`).toEqual([216, 196])
      // spacing.6 between columns, spacing.8 (36px) between rows, left-aligned with the h1.
      expect(Math.round(rects[1].x - rects[0].x), `${width}px`).toBe(216 + 24)
      expect(Math.round(rects[columns].y - (rects[0].y + rects[0].height)), `${width}px`).toBe(36)
      const h1 = await boxOf(page.getByRole('heading', { level: 1, name: 'Card notes', exact: true }))
      expect(Math.round(rects[0].x), `${width}px`).toBe(Math.round(h1.x))
    }

    const countColor = rgbOf(designComponentColor('card-note-box', 'count-color'))
    const cardBackground = rgbOf(designComponentColor('card-note-box', 'card-background'))
    const cardBorder = `1px solid ${rgbOf('#E4DFD5')}`
    const titleFamily = designTokens().light.get('--font-book-title-sm-family')
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme })
      await expect(page.locator('body')).toHaveCSS('background-color', scheme === 'light' ? PAGE : PAGE_DARK)
      for (const { title, id, notes, cards } of PILE_BOXES) {
        const look = await boxLook(box(page, boxName(title, notes)), title, noteCount(notes))
        const at = `${title} (${scheme})`
        // The front: the lower 116px, its corners, its shadow, no edge, the exact spine color read or unread.
        expect(look.front, at).toMatchObject({
          left: 0,
          top: 196 - 116,
          width: 216,
          height: 116,
          background: colors.get(id),
          radius: '6px 6px 12px 12px',
          boxShadow: scheme === 'light' ? BOX_FRONT_SHADOW : BOX_FRONT_SHADOW_DARK,
          borderWidth: '0px',
        })
        // The label: a spine-label-strip plate, 14px in from the front's sides, centered.
        const front = look.front as NonNullable<typeof look.front>
        const label = look.label as NonNullable<typeof look.label>
        expect(label, at).toMatchObject({ background: SPINE_LABEL_STRIP, radius: '4px', padding: '10px 12px' })
        expect(label.left - front.left, at).toBe(14)
        expect(label.width, at).toBe(216 - 28)
        const above = label.top - front.top
        const below = front.top + front.height - (label.top + label.height)
        expect(Math.abs(above - below), at).toBeLessThanOrEqual(1)
        expect(look.title, at).toMatchObject({ fontFamily: titleFamily, fontSize: '15.5px', color: SPINE_LABEL })
        expect(look.count, at).toEqual({ fontSize: '13px', color: countColor })
        // The cards: 176 × 96 paper, 20px in, card i of k topped at 70 − (k − 1 − i) × 8px, turned by the first k angles.
        expect(
          look.cards.map(({ left, top, width, height, angle, background, border, radius }) => ({
            left,
            top,
            width,
            height,
            angle,
            background,
            border,
            radius,
          })),
          at,
        ).toEqual(
          Array.from({ length: cards }, (_, i) => ({
            left: 20,
            top: 70 - (cards - 1 - i) * 8,
            width: 176,
            height: 96,
            angle: CARD_ANGLES[i],
            background: cardBackground,
            border: cardBorder,
            radius: '4px',
          })),
        )
      }
    }
    // Anathem's color was set by hand, and Emma (unread) keeps its own color, never an unread fill.
    expect(colors.get(PILE_BOXES[0].id)).toBe(rgbOf(ANATHEM_COLOR))
  })

  test('[P1] AC-7 a focused box shows a 2px accent ring 4px out with rounded.lg corners in both themes, no hover change, and system colors under forced colors', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(PILE_SHELF)
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(cardNotesPage(server))
    const first = box(page, boxName('Anathem', 21))
    await searchField(page).focus()
    await page.keyboard.press('Tab') // Boxes
    await page.keyboard.press('Tab') // List
    await page.keyboard.press('Tab') // the first box

    await expect(first).toHaveCSS('outline', `${ACCENT} solid 2px`)

    await expect(first).toBeFocused()
    await expect(first).toHaveCSS('outline-offset', '4px')
    await expect(first).toHaveCSS('border-radius', '12px')
    expect(await boxOf(first)).toMatchObject({ width: 216, height: 196 })
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(first).toHaveCSS('outline', `${ACCENT_DARK} solid 2px`)

    // No hover change apart from the pointer cursor.
    await page.emulateMedia({ colorScheme: 'light' })
    const second = box(page, boxName('Beloved', 1))
    const looks = () =>
      second.evaluate((link) =>
        [link, ...Array.from(link.querySelectorAll('*'))].map((el) => {
          const s = getComputedStyle(el)
          return [s.transform, s.rotate, s.translate, s.opacity, s.backgroundColor, s.boxShadow, s.color].join(' | ')
        }),
      )
    await page.mouse.move(0, 0)
    const before = await looks()
    await second.hover()
    await expect(second).toHaveCSS('cursor', 'pointer')
    expect(await looks()).toEqual(before)

    // Forced colors: the front CanvasText, the label Canvas with CanvasText text, each card Canvas with a 1px CanvasText border.
    await page.emulateMedia({ forcedColors: 'active' })
    const canvas = await systemColor(page, 'Canvas')
    const canvasText = await systemColor(page, 'CanvasText')
    const look = await boxLook(box(page, boxName('Candide', 5)), 'Candide', noteCount(5))
    expect(look.front?.background).toBe(canvasText)
    expect(look.label?.background).toBe(canvas)
    expect(look.title?.color).toBe(canvasText)
    expect(look.count?.color).toBe(canvasText)
    expect(look.cards.map(({ background, border }) => [background, border])).toEqual(
      Array.from({ length: 3 }, () => [canvas, `1px solid ${canvasText}`]),
    )
    await first.focus()
    await expect(first).toHaveCSS('outline-style', 'solid')
    await expect(first).not.toHaveCSS('outline-color', ACCENT)
  })

  test('[P1] AC-8 with an empty search the toolbar ends with "55 card notes in 6 Books" in meta/ink-tertiary, not a live region; no toggle or count line while loading, under "Couldn\'t load" or in List', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(PILE_SHELF)
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(cardNotesPage(server))
    const line = page.getByRole('main').getByText(PILE_COUNT_LINE, { exact: true })

    await expect(line).toBeVisible()

    await expect(line).toHaveCSS('font-size', '13px')
    await expect(line).toHaveCSS('color', INK_TERTIARY)
    expect(await inLiveRegion(line)).toBe(false)

    // In List view the count line goes.
    await viewButton(page, 'List').click()
    await expect(groupHeadings(page)).toHaveText(PILE_TITLES)
    await expect(line).toHaveCount(0)
    await viewButton(page, 'Boxes').click()
    await expect(line).toBeVisible()

    // While the view loads: no toggle, no count line.
    let release: () => void = () => {}
    const held = new Promise<void>((resolve) => (release = resolve))
    await page.route('**/api/views/card-notes', async (route) => {
      await held
      await route.continue()
    })
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Card notes', exact: true })).toBeVisible()
    await expect(cardNotesViewToggle(page)).toHaveCount(0)
    await expect(line).toHaveCount(0)
    release()
    await expect(line).toBeVisible()
    await page.unroute('**/api/views/card-notes')

    // Under "Couldn't load": no toggle, no count line.
    await page.route('**/api/views/card-notes', (route) => route.fulfill({ status: 500, body: '' }))
    await page.reload()
    await expect(page.getByRole('main').getByText(COULDNT_LOAD, { exact: true })).toBeVisible()
    await expect(cardNotesViewToggle(page)).toHaveCount(0)
    await expect(line).toHaveCount(0)
  })

  test('[P1] AC-9 with no card notes at all the page reads "No card notes yet." with no toggle, no count line and no boxes', async ({
    page,
    seededServer,
  }) => {
    // Witness first: one note brings the toggle and the count line, so their absence below means something.
    const one = await seededServer({
      books: [
        {
          title: 'Emma',
          authors: ['Jane Austen'],
          pages: 474,
          cardNotes: [{ text: 'Badly done, Emma!', pageStart: 12 }],
        },
      ],
    })
    await page.goto(cardNotesPage(one))

    await expect(cardNotesViewToggle(page)).toBeVisible()

    await expect(page.getByRole('main').getByText('1 card note in 1 Book', { exact: true })).toBeVisible()

    const none = await seededServer({ books: PILE_SHELF.books.map((book) => ({ ...book, cardNotes: [] })) })
    await page.goto(cardNotesPage(none))
    await expect(page.getByRole('main').getByText('No card notes yet.', { exact: true })).toBeVisible()
    await expect(cardNotesViewToggle(page)).toHaveCount(0)
    await expect(page.getByRole('main').getByText(/card notes? in \d+ Books?/)).toHaveCount(0)
    await expect(boxLinks(page)).toHaveCount(0)
    await expect(searchField(page)).toHaveCount(0)
  })

  test('[P1] AC-11 Back to top shows past one window height in Boxes and in List view, and moves focus to Search card notes', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(MANY_BOXES)
    await page.goto(cardNotesPage(server))
    const last = box(page, boxName('Book 40', 1))

    await expect(last).toBeAttached()

    const windowHeight = await page.evaluate(() => window.innerHeight)
    for (const view of ['Boxes', 'List'] as const) {
      if (view === 'List') {
        await viewButton(page, 'List').click()
        await expect(groupHeadings(page)).toHaveCount(40)
      }
      await scrollToY(page, windowHeight * 1.5)
      await expect(backToTop(page), view).toBeVisible()
      await scrollToY(page, windowHeight - 10)
      await expect(backToTop(page), view).toHaveCount(0)
      await scrollToY(page, 'bottom')
      await backToTop(page).click()
      await expect.poll(() => page.evaluate(() => window.scrollY), view).toBe(0)
      await expect(searchField(page), view).toBeFocused()
    }
  })

  test("[P2] AC-12 the box, the toggle and the count line take DESIGN.md's component values, and tokens.css copies any of them character for character", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(PILE_SHELF)
    await page.goto(cardNotesPage(server))
    const anathem = box(page, boxName('Anathem', 21))

    await expect(anathem).toHaveCSS('width', designComponentValue('card-note-box', 'width'))

    await expect(anathem).toHaveCSS('height', designComponentValue('card-note-box', 'height'))
    const look = await boxLook(anathem, 'Anathem', noteCount(21))
    expect(`${look.front?.height}px`).toBe(designComponentValue('card-note-box', 'front-height'))
    expect(look.front?.radius).toBe(designComponentValue('card-note-box', 'front-radius'))
    expect(`${look.cards[0].width}px`).toBe(designComponentValue('card-note-box', 'card-width'))
    expect(`${look.cards[0].height}px`).toBe(designComponentValue('card-note-box', 'card-height'))
    expect(`${look.cards[0].left}px`).toBe(designComponentValue('card-note-box', 'card-inset'))
    expect(`${look.cards.at(-1)?.top}px`).toBe(designComponentValue('card-note-box', 'card-top'))
    expect(look.cards[0].border).toBe(
      designComponentValue('card-note-box', 'card-border').replace(/#[0-9A-Fa-f]{6}/, (hex) => rgbOf(hex)),
    )
    await anathem.focus()
    await expect(anathem).toHaveCSS('outline-offset', designComponentValue('card-note-box', 'focus-offset'))

    // Every custom property tokens.css defines for these components equals DESIGN.md's value as written.
    const tokens = readFileSync(TOKENS_CSS, 'utf8')
    const copied = [
      ...tokens.matchAll(/^\s*--(card-note-box|card-notes-view-toggle|card-notes-count-line)-([\w-]+):\s*([^;]+);/gm),
    ]
    for (const [, component, key, value] of copied) {
      expect(value.trim(), `--${component}-${key}`).toBe(designComponentValue(component, key))
    }
  })
})
