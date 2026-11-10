// Story 5.4 Go through a book's notes as a pile. "Go through as a pile" on a
// group of the Card notes page or in Book detail's block opens a modal named
// "Card notes pile, X": one note at a time, Previous · "N of M" · Next with no
// wrap, a polite live region announcing each move, and an "Order" radio group
// (Page order · Shuffled). A note's page ref becomes a chip button, "Open
// p.42 in the pile", that opens the pile in Page order at that note, searched
// or not. Close or Esc returns focus to the last viewed note's Edit. The
// full-data export → restore re-run (AC-7) is in
// backend/tests/test_full_data_round_trip.py.
//
// Decided with Oleg (2026-11-10): the pile always holds every note of the
// Book, even when opened from a search result; a change of order restarts at
// "1 of M"; "Go through as a pile" is a `button` (it opens a dialog).

import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import { DUNE, DUNE_ID, LEFT_HAND } from './home.ts'

const NEUROMANCER_ID = '2a7b9c1d-3e4f-4a5b-9c6d-7e8f9a0b1c2d'
const SCRIM = 'rgba(43, 46, 42, 0.24)'
/** `page` in the light theme (#F6F4EF). */
const PAGE_LIGHT = 'rgb(246, 244, 239)'

const FEAR = 'Fear is the mind-killer.'
const BEGINNING = 'A beginning is the time for taking the most delicate care.'
const SPICE = 'The spice must flow.'
const MYSTERY = 'The mystery of life isn’t a problem to solve.'
/** Dune's notes in page order: p.12, pp.42–45, p.96, p.300. */
const DUNE_IN_PAGE_ORDER = [FEAR, BEGINNING, SPICE, MYSTERY]

/** Dune with four notes, seeded out of page order. The block shows the first three. */
const DUNE_WITH_NOTES = {
  ...DUNE,
  cardNotes: [
    { text: MYSTERY, pageStart: 300 },
    { text: FEAR, pageStart: 12 },
    { text: SPICE, pageStart: 96 },
    { text: BEGINNING, pageStart: 42, pageEnd: 45 },
  ],
}
const LEFT_HAND_WITH_NOTES = {
  ...LEFT_HAND,
  cardNotes: [
    { text: 'On the Ice, the two of them were alone.', pageStart: 151 },
    { text: 'Light is the left hand of darkness.', pageStart: 42 },
  ],
}
/** A one-note pile: both Previous and Next are disabled. */
const NEUROMANCER = {
  id: NEUROMANCER_ID,
  title: 'Neuromancer',
  authors: ['William Gibson'],
  pages: 271,
  cardNotes: [{ text: 'The sky above the port was the color of television.', pageStart: 3 }],
}

/** Seven notes in three Books; the Card notes page lists Dune, The Left Hand of Darkness, Neuromancer. */
const LIBRARY = { books: [NEUROMANCER, DUNE_WITH_NOTES, LEFT_HAND_WITH_NOTES] }

function cardNotesPage(server: { url: string }, bookId?: string): string {
  return bookId === undefined ? `${server.url}/card-notes` : `${server.url}/card-notes?book=${bookId}`
}

/** The pile: a modal named "Card notes pile, X". */
function pile(page: Page, title: string): Locator {
  return page.getByRole('dialog', { name: `Card notes pile, ${title}`, exact: true })
}

/** "Go through as a pile": a `button`, since it opens a dialog. */
function pileOpener(scope: Locator): Locator {
  return scope.getByRole('button', { name: 'Go through as a pile', exact: true })
}

/** A note's page ref: a chip `button` named "Open p.42 in the pile", reading "p.42". */
function pageRefButton(scope: Locator, ref: string): Locator {
  return scope.getByRole('button', { name: `Open ${ref} in the pile`, exact: true })
}

/** "N of M" in the pile. */
function position(dialog: Locator): Locator {
  return dialog.getByText(/^\d+ of \d+$/)
}

/** The pile's polite live region. */
function announcement(dialog: Locator): Locator {
  return dialog.getByRole('status')
}

function nextButton(dialog: Locator): Locator {
  return dialog.getByRole('button', { name: 'Next', exact: true })
}

function previousButton(dialog: Locator): Locator {
  return dialog.getByRole('button', { name: 'Previous', exact: true })
}

/** The "Order" radio group: Page order · Shuffled. */
function orderGroup(dialog: Locator): Locator {
  return dialog.getByRole('radiogroup', { name: 'Order', exact: true })
}

/** One Book's group on the Card notes page: the section headed by its serif title. */
function group(page: Page, title: string): Locator {
  return page
    .getByRole('main')
    .locator('section')
    .filter({ has: page.getByRole('heading', { level: 2, name: title, exact: true }) })
}

/** Book detail's Card notes block, named by its heading "Card notes (N)". */
function cardNotesBlock(page: Page, count: number): Locator {
  return page.getByRole('main').getByRole('region', { name: `Card notes (${count})`, exact: true })
}

function searchField(scope: Locator): Locator {
  return scope.getByRole('searchbox', { name: 'Search card notes', exact: true })
}

/** Presses a pile button by keyboard: an `aria-disabled` button stays focusable and pressable. */
async function press(button: Locator): Promise<void> {
  await button.focus()
  await button.press('Enter')
}

/** The text of the note just announced: "Note 2 of 4, pp.42–45: <text>". */
async function announcedNote(dialog: Locator): Promise<string> {
  const text = (await announcement(dialog).textContent()) ?? ''
  return text.replace(/^Note \d+ of \d+, pp?\.[\d–]+: /, '')
}

test.describe("Story 5.4 Go through a book's notes as a pile", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test.skip('[P0] AC-1 "Go through as a pile" opens a modal "Card notes pile, X" showing one note, Close, Previous · N of M · Next and an Order radio group', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server, DUNE_ID))
    await pileOpener(page.getByRole('main')).click()
    const dialog = pile(page, 'Dune')

    // The criterion: the pile, named for its Book.
    await expect(dialog).toBeVisible()

    // One note at a time, the first in page order, in pile-text (17px, 1.6).
    await expect(dialog.getByText(FEAR, { exact: true })).toBeVisible()
    for (const other of [BEGINNING, SPICE, MYSTERY]) {
      await expect(dialog.getByText(other, { exact: true })).toHaveCount(0)
    }
    const note = dialog.getByText(FEAR, { exact: true })
    expect(await note.evaluate((element) => getComputedStyle(element).fontSize)).toBe('17px')
    expect(await note.evaluate((element) => getComputedStyle(element).lineHeight)).toBe('27.2px')

    // Previous · "1 of 4" · Next, and Order with Page order checked.
    await expect(previousButton(dialog)).toBeVisible()
    await expect(position(dialog)).toHaveText('1 of 4')
    await expect(nextButton(dialog)).toBeVisible()
    const order = orderGroup(dialog)
    await expect(order.getByRole('radio')).toHaveCount(2)
    await expect(order.getByRole('radio', { name: 'Page order', exact: true })).toBeChecked()
    await expect(order.getByRole('radio', { name: 'Shuffled', exact: true })).not.toBeChecked()

    // A Close button with a text label, at the top right.
    const close = dialog.getByRole('button', { name: 'Close', exact: true })
    await expect(close).toHaveText('Close')
    const box = (await dialog.boundingBox())!
    const closeBox = (await close.boundingBox())!
    expect(closeBox.x + closeBox.width).toBeGreaterThan(box.x + box.width * 0.75)
    expect(closeBox.y).toBeLessThan((await note.boundingBox())!.y)

    // The `page` background over the scrim.
    expect(await dialog.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(PAGE_LIGHT)
    expect(await dialog.evaluate((element) => getComputedStyle(element, '::backdrop').backgroundColor)).toBe(SCRIM)
  })

  test.skip('[P0] AC-2 Next and Previous change the note and announce "Note N of M, p.X: text."; the ends are aria-disabled with no wrap, and a one-note pile disables both', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server, DUNE_ID))
    await pileOpener(page.getByRole('main')).click()
    const dialog = pile(page, 'Dune')
    await press(nextButton(dialog))

    // The criterion: the move is announced in the polite live region.
    await expect(announcement(dialog)).toHaveText(`Note 2 of 4, pp.42–45: ${BEGINNING}`)
    await expect(announcement(dialog)).toHaveAttribute('aria-live', 'polite')
    await expect(dialog.getByText(BEGINNING, { exact: true })).toBeVisible()
    await expect(position(dialog)).toHaveText('2 of 4')

    // Previous goes back.
    await press(previousButton(dialog))
    await expect(announcement(dialog)).toHaveText(`Note 1 of 4, p.12: ${FEAR}`)
    await expect(position(dialog)).toHaveText('1 of 4')

    // At the first note, Previous stays focusable with aria-disabled and does not wrap.
    await expect(previousButton(dialog)).toHaveAttribute('aria-disabled', 'true')
    await press(previousButton(dialog))
    await expect(previousButton(dialog)).toBeFocused()
    await expect(position(dialog)).toHaveText('1 of 4')
    await expect(nextButton(dialog)).not.toHaveAttribute('aria-disabled', 'true')

    // To the last note: Next is disabled there, and does not wrap.
    await press(nextButton(dialog))
    await press(nextButton(dialog))
    await press(nextButton(dialog))
    await expect(announcement(dialog)).toHaveText(`Note 4 of 4, p.300: ${MYSTERY}`)
    await expect(nextButton(dialog)).toHaveAttribute('aria-disabled', 'true')
    await press(nextButton(dialog))
    await expect(nextButton(dialog)).toBeFocused()
    await expect(position(dialog)).toHaveText('4 of 4')
    await expect(dialog.getByText(MYSTERY, { exact: true })).toBeVisible()
    await expect(previousButton(dialog)).not.toHaveAttribute('aria-disabled', 'true')

    // A pile of one note has both disabled.
    await page.goto(cardNotesPage(server, NEUROMANCER_ID))
    await pileOpener(page.getByRole('main')).click()
    const single = pile(page, 'Neuromancer')
    await expect(position(single)).toHaveText('1 of 1')
    await expect(previousButton(single)).toHaveAttribute('aria-disabled', 'true')
    await expect(nextButton(single)).toHaveAttribute('aria-disabled', 'true')
  })

  test.skip('[P1] AC-3 picking Shuffled reshuffles once for that change with "N of M" following the order, and Page order restores page order', async ({
    page,
    seededServer,
  }) => {
    // A seeded Math.random (mulberry32), so the shuffle is the same on every run.
    await page.addInitScript(() => {
      let seed = 42
      Math.random = () => {
        seed = (seed + 0x6d2b79f5) | 0
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }
    })
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server, DUNE_ID))
    await pileOpener(page.getByRole('main')).click()
    const dialog = pile(page, 'Dune')
    const order = orderGroup(dialog)
    await press(nextButton(dialog))
    await order.getByRole('radio', { name: 'Shuffled', exact: true }).check()

    // The criterion: a new order restarts at "1 of 4".
    await expect(position(dialog)).toHaveText('1 of 4')
    await expect(order.getByRole('radio', { name: 'Shuffled', exact: true })).toBeChecked()

    // Walk to the end and back, reading each announcement: the order holds still while stepping.
    const forward: string[] = []
    for (let n = 2; n <= 4; n++) {
      await press(nextButton(dialog))
      await expect(position(dialog)).toHaveText(`${n} of 4`)
      forward.push(await announcedNote(dialog))
    }
    const backward: string[] = []
    for (let n = 3; n >= 1; n--) {
      await press(previousButton(dialog))
      await expect(position(dialog)).toHaveText(`${n} of 4`)
      backward.push(await announcedNote(dialog))
    }
    expect(backward.slice(0, 2)).toEqual([forward[1], forward[0]])
    const shuffled = [backward[2], ...forward]
    // Every note once, not in page order.
    expect([...shuffled].sort()).toEqual([...DUNE_IN_PAGE_ORDER].sort())
    expect(shuffled).not.toEqual(DUNE_IN_PAGE_ORDER)

    // Page order restores page order, from "1 of 4".
    await order.getByRole('radio', { name: 'Page order', exact: true }).check()
    await expect(position(dialog)).toHaveText('1 of 4')
    await expect(dialog.getByText(FEAR, { exact: true })).toBeVisible()
    for (const [index, text] of DUNE_IN_PAGE_ORDER.slice(1).entries()) {
      await press(nextButton(dialog))
      await expect(position(dialog)).toHaveText(`${index + 2} of 4`)
      await expect(dialog.getByText(text, { exact: true })).toBeVisible()
    }
  })

  test.skip("[P1] AC-4 opening a search result on the Card notes page or in Book detail's block opens the pile in Page order at that note", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server))
    const main = page.getByRole('main')
    await searchField(main).pressSequentially('spice')
    await pageRefButton(main, 'p.96').click()
    const dialog = pile(page, 'Dune')

    // The criterion: the pile opens at that note, at its place among all of Dune's notes.
    await expect(position(dialog)).toHaveText('3 of 4')
    await expect(dialog.getByText(SPICE, { exact: true })).toBeVisible()
    await expect(orderGroup(dialog).getByRole('radio', { name: 'Page order', exact: true })).toBeChecked()
    // The pile holds every note of the Book, not only the matches.
    await press(nextButton(dialog))
    await expect(dialog.getByText(MYSTERY, { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    // Book detail's block: a match beyond the first three.
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const block = cardNotesBlock(page, 4)
    await searchField(block).pressSequentially('mystery')
    await pageRefButton(block, 'p.300').click()
    await expect(position(dialog)).toHaveText('4 of 4')
    await expect(dialog.getByText(MYSTERY, { exact: true })).toBeVisible()
    await expect(orderGroup(dialog).getByRole('radio', { name: 'Page order', exact: true })).toBeChecked()
  })

  test.skip('[P1] AC-5 a note\'s page ref is a chip button "Open p.42 in the pile" that opens the pile in Page order at that note, separate from its Edit', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const block = cardNotesBlock(page, 4)
    const ref = pageRefButton(block, 'pp.42–45')

    // The criterion: the page ref is a button with that name, reading "pp.42–45".
    await expect(ref).toHaveText('pp.42–45')

    // Edit stays a separate button on the same note.
    const item = block.getByRole('listitem').filter({ has: ref })
    await expect(item.getByRole('button', { name: 'Edit pp.42–45', exact: true })).toBeVisible()
    await expect(item.getByRole('button')).toHaveCount(2)

    await ref.click()
    const dialog = pile(page, 'Dune')
    await expect(position(dialog)).toHaveText('2 of 4')
    await expect(dialog.getByText(BEGINNING, { exact: true })).toBeVisible()
    await expect(orderGroup(dialog).getByRole('radio', { name: 'Page order', exact: true })).toBeChecked()
    await page.keyboard.press('Escape')

    // The Card notes page, unsearched: the same chip in another Book's group.
    await page.goto(cardNotesPage(server))
    await pageRefButton(group(page, 'The Left Hand of Darkness'), 'p.42').click()
    const other = pile(page, 'The Left Hand of Darkness')
    await expect(position(other)).toHaveText('1 of 2')
    await expect(other.getByText('Light is the left hand of darkness.', { exact: true })).toBeVisible()
  })

  test.skip("[P1] AC-6 Close or Esc returns to the list at the last viewed note with focus on its Edit, on Book detail that note's Edit if shown, else Go through as a pile; the pile has no search and no editing", async ({
    page,
    seededServer,
  }) => {
    await page.setViewportSize({ width: 1280, height: 480 })
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server))
    const dune = group(page, 'Dune')
    await pileOpener(dune).click()
    const dialog = pile(page, 'Dune')
    await press(nextButton(dialog))
    await press(nextButton(dialog))
    await press(nextButton(dialog))
    await expect(position(dialog)).toHaveText('4 of 4')
    await page.keyboard.press('Escape')

    // The criterion: focus is on the last viewed note's Edit, scrolled into view.
    const editLast = dune.getByRole('button', { name: 'Edit p.300', exact: true })
    await expect(editLast).toBeFocused()
    await expect(dialog).toBeHidden()
    await expect(editLast).toBeInViewport()

    // Read-only: no search field, no text field, no Edit or Delete in the pile.
    await pileOpener(dune).click()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('searchbox')).toHaveCount(0)
    await expect(dialog.getByRole('textbox')).toHaveCount(0)
    await expect(dialog.getByRole('button', { name: /^(Edit|Delete)\b/ })).toHaveCount(0)
    await dialog.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(dune.getByRole('button', { name: 'Edit p.12', exact: true })).toBeFocused()

    // Book detail: p.300 is not among the three shown, so Close goes to "Go through as a pile".
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const block = cardNotesBlock(page, 4)
    await pileOpener(block).click()
    await press(nextButton(dialog))
    await press(nextButton(dialog))
    await press(nextButton(dialog))
    await expect(position(dialog)).toHaveText('4 of 4')
    await dialog.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(pileOpener(block)).toBeFocused()

    // pp.42–45 is shown, so Esc goes to its Edit.
    await pileOpener(block).click()
    await press(nextButton(dialog))
    await expect(position(dialog)).toHaveText('2 of 4')
    await page.keyboard.press('Escape')
    await expect(block.getByRole('button', { name: 'Edit pp.42–45', exact: true })).toBeFocused()
  })
})
