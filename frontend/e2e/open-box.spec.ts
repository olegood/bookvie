// Story 14.3 See the open box in its Book's color. A Book's scoped Card notes
// page (the open box, `/card-notes?book=<id>`) gains the open box strip: an 8px
// band the full width of the window directly under the app shell, above the
// page's top padding, in the scope's `spineColor` exactly, with no edge, label
// or shadow, `aria-hidden`, the same in both themes and `CanvasText` under
// forced colors. It shows once the view has loaded, also for a Book with no
// notes, and never before the load or under "Couldn't load". Everything else
// on the open box is the scoped page as before Epic 14, with no view toggle.
// The strip is found by `openBoxStrip` (card-note-boxes.ts), without class
// names. These specs turn the "list" fixture off, so a box opens from Boxes.

import { readFileSync } from 'node:fs'
import { backToTop, LAST_NOTE, LONG_NOTES, scrollToY } from './back-to-top.ts'
import { seeCardNotes } from './card-note-add-another.ts'
import {
  box,
  boxLinks,
  boxName,
  cardNotesPage,
  cardNotesViewToggle,
  groupHeadings,
  isCardNotesView,
  openBoxColor,
  openBoxStrip,
  PILE_SHELF,
  searchField,
} from './card-note-boxes.ts'
import { cardNotePanel, cardNotesBlock, editOf, editPanel, noteItem, SAVED } from './card-note-keys.ts'
import { systemColor } from './dev-mode.ts'
import { expect, test } from './fixtures.ts'
import { DUNE_ID, LEFT_HAND_ID, mainAt } from './home.ts'
import { bookId, designComponentValue } from './library.ts'
import { DUNE_WITH_NOTES, FEAR, pile, pileOpener, position } from './pile.ts'
import { COULDNT_LOAD } from './stats.ts'

const TOKENS_CSS = new URL('../src/styles/tokens.css', import.meta.url)

/** The shipped page's top padding, `--space-page-top` (tokens.css): the `h1` sits this far under the strip. */
const PAGE_TOP = 24

/** PILE_SHELF's Candide (5 notes, read, curated color) and Beloved (1 note). */
const CANDIDE_ID = bookId(3)
const BELOVED_ID = bookId(2)

test.describe("Story 14.3 See the open box in its Book's color (ATDD)", () => {
  test.use({ cardNotesView: null })

  test("[P1] AC-1 opening a box shows the scoped page under the open box strip, an 8px full-width band in the Book's spine color, shown only once the view has loaded, however the open box is reached", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(PILE_SHELF)
    const candide = await openBoxColor(page, server.url, CANDIDE_ID)
    await page.goto(cardNotesPage(server))
    await box(page, boxName('Candide', 5)).click()

    await expect.poll(async () => (await openBoxStrip(page))?.background).toBe(candide)

    // The strip: directly under the app shell, the full width of the window, 8px, no edge, label or shadow, aria-hidden.
    await expect(page).toHaveURL(cardNotesPage(server, CANDIDE_ID))
    const strip = await openBoxStrip(page)
    expect(strip).toMatchObject({ left: 0, height: 8, borders: '0px 0px 0px 0px', boxShadow: 'none', text: '' })
    expect(strip?.hidden).toBe(true)
    expect(strip?.top).toBe(strip?.headerBottom)
    expect(strip?.width).toBe(strip?.windowWidth)
    // Above the page's top padding: the h1 starts PAGE_TOP under the strip.
    const h1 = page.getByRole('main').getByRole('heading', { level: 1, name: 'Card notes', exact: true })
    expect((await h1.boundingBox())?.y).toBe((strip?.top ?? 0) + 8 + PAGE_TOP)

    // The scoped page as before Epic 14: the chip, the search, the notes, the pile, and no view toggle.
    const main = page.getByRole('main')
    await expect(main.getByText('In Candide', { exact: true })).toBeVisible()
    await expect(searchField(page)).toBeVisible()
    await expect(groupHeadings(page)).toHaveText(['Candide'])
    await expect(main.getByRole('listitem')).toHaveCount(5)
    await expect(pileOpener(main)).toBeVisible()
    await expect(cardNotesViewToggle(page)).toHaveCount(0)
    await expect(boxLinks(page)).toHaveCount(0)

    // The same color in dark theme; CanvasText under forced colors, kept by forced-color-adjust: none.
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect.poll(async () => (await openBoxStrip(page))?.background).toBe(candide)
    await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' })
    const canvasText = await systemColor(page, 'CanvasText')
    await expect.poll(async () => (await openBoxStrip(page))?.background).toBe(canvasText)
    expect((await openBoxStrip(page))?.forcedColorAdjust).toBe('none')
    await page.emulateMedia({ forcedColors: 'none' })

    // Enter on a box opens its open box too, in that Book's color.
    const beloved = await openBoxColor(page, server.url, BELOVED_ID)
    await page.goBack()
    await box(page, boxName('Beloved', 1)).press('Enter')
    await expect(page).toHaveURL(cardNotesPage(server, BELOVED_ID))
    await expect.poll(async () => (await openBoxStrip(page))?.background).toBe(beloved)

    // Not while the view loads: the h1 shows, the strip doesn't, until the view arrives.
    let release: () => void = () => {}
    const held = new Promise<void>((resolve) => (release = resolve))
    await page.route(isCardNotesView, async (route) => {
      await held
      await route.continue()
    })
    await page.reload()
    await expect(h1).toBeVisible()
    expect(await openBoxStrip(page)).toBeNull()
    release()
    // The held view arrives (and the route is done with it) before the strip is read and the route removed.
    await expect(groupHeadings(page)).toHaveText(['Beloved'])
    await expect.poll(async () => (await openBoxStrip(page))?.background).toBe(beloved)
    await page.unroute(isCardNotesView)

    // Not under "Couldn't load".
    await page.route(isCardNotesView, (route) => route.fulfill({ status: 500, body: '' }))
    await page.reload()
    await expect(main.getByText(COULDNT_LOAD, { exact: true })).toBeVisible()
    expect(await openBoxStrip(page)).toBeNull()
    await page.unroute(isCardNotesView)

    // A Book with no notes (the Main book card's bare "See card notes"): the strip shows, and Add card note works there.
    const bare = await seededServer(mainAt(120))
    const leftHand = await openBoxColor(page, bare.url, LEFT_HAND_ID)
    await page.goto(bare.url)
    await seeCardNotes(page, 0).click()
    await expect(page).toHaveURL(cardNotesPage(bare, LEFT_HAND_ID))
    await expect(main.getByText('No card notes yet.', { exact: true })).toBeVisible()
    await expect.poll(async () => (await openBoxStrip(page))?.background).toBe(leftHand)
    await main.getByRole('button', { name: 'Add card note', exact: true }).click()
    const addPanel = cardNotePanel(page)
    await expect(addPanel.getByRole('textbox', { name: 'Page', exact: true })).toHaveValue('120')
    await addPanel.getByRole('textbox', { name: 'Note', exact: true }).fill('Light is the left hand of darkness.')
    await addPanel.getByRole('button', { name: 'Save note', exact: true }).click()
    await expect(addPanel).toBeHidden()
    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(groupHeadings(page)).toHaveText(['The Left Hand of Darkness'])
    // The opener is gone: focus parks on main, as before Epic 14.
    await expect(main).toBeFocused()
    await expect.poll(async () => (await openBoxStrip(page))?.background).toBe(leftHand)

    // "See card notes · N" on the Main book card and "See all card notes" on Book detail give the same open box.
    const seven = Array.from({ length: 7 }, (_, i) => ({ text: `Note ${i + 1}.`, pageStart: 10 * (i + 1) }))
    const full = await seededServer(mainAt(120, { book: { cardNotes: seven }, others: [DUNE_WITH_NOTES] }))
    const fullLeftHand = await openBoxColor(page, full.url, LEFT_HAND_ID)
    const dune = await openBoxColor(page, full.url, DUNE_ID)
    await page.goto(full.url)
    await seeCardNotes(page, 7).click()
    await expect(page).toHaveURL(cardNotesPage(full, LEFT_HAND_ID))
    await expect.poll(async () => (await openBoxStrip(page))?.background).toBe(fullLeftHand)
    await expect(cardNotesViewToggle(page)).toHaveCount(0)
    await page.goto(`${full.url}/book/${DUNE_ID}`)
    await cardNotesBlock(page, 4).getByRole('link', { name: 'See all card notes', exact: true }).click()
    await expect(page).toHaveURL(cardNotesPage(full, DUNE_ID))
    await expect.poll(async () => (await openBoxStrip(page))?.background).toBe(dune)
    await expect(cardNotesViewToggle(page)).toHaveCount(0)

    // Edit there: a save refocuses that note's Edit and says so.
    await editOf(noteItem(main, 'The spice must flow.')).click()
    const edit = editPanel(page)
    await edit.getByRole('textbox', { name: 'Note', exact: true }).fill('The spice must flow, always.')
    await edit.getByRole('button', { name: 'Save note', exact: true }).click()
    await expect(edit).toBeHidden()
    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(editOf(noteItem(main, 'The spice must flow, always.'))).toBeFocused()

    // The pile there: it opens at "1 of 4", and Esc returns focus to the last viewed note's Edit (p.12).
    await pileOpener(main).click()
    const dialog = pile(page, 'Dune')
    await expect(position(dialog)).toHaveText('1 of 4')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(editOf(noteItem(main, FEAR))).toBeFocused()
    await expect.poll(async () => (await openBoxStrip(page))?.background).toBe(dune)
  })

  test('[P1] AC-2 on the open box, Back to top shows past one window height and a press scrolls up and focuses Search card notes', async ({
    page,
    seededServer,
  }) => {
    const books = LONG_NOTES.books.map((book, n) => ({ ...book, id: bookId(n + 1) }))
    const server = await seededServer({ books })
    // Solaris (the third Book) alone: 50 notes, several windows tall.
    const solaris = await openBoxColor(page, server.url, bookId(3))
    await page.goto(cardNotesPage(server))
    await box(page, boxName('Solaris', 50)).click()

    await expect.poll(async () => (await openBoxStrip(page))?.background).toBe(solaris)

    await expect(page.getByText(LAST_NOTE, { exact: true })).toBeAttached()
    const windowHeight = await page.evaluate(() => window.innerHeight)
    await scrollToY(page, windowHeight * 1.5)
    await expect(backToTop(page)).toBeVisible()
    await scrollToY(page, windowHeight - 10)
    await expect(backToTop(page)).toHaveCount(0)
    await scrollToY(page, 'bottom')
    await backToTop(page).click()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    await expect(searchField(page)).toBeFocused()
  })

  test("[P2] AC-3 the open box strip's height is DESIGN.md's open-box-strip.height, and tokens.css copies any open-box-strip value character for character", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(PILE_SHELF)
    await page.goto(cardNotesPage(server, CANDIDE_ID))

    await expect
      .poll(async () => `${(await openBoxStrip(page))?.height}px`)
      .toBe(designComponentValue('open-box-strip', 'height'))

    // Every --open-box-strip-* custom property tokens.css defines equals DESIGN.md's value as written.
    const tokens = readFileSync(TOKENS_CSS, 'utf8')
    for (const [, key, value] of tokens.matchAll(/^\s*--open-box-strip-([\w-]+):\s*([^;]+);/gm)) {
      expect(value.trim(), `--open-box-strip-${key}`).toBe(designComponentValue('open-box-strip', key))
    }
  })
})
