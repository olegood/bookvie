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

import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import { DUNE, DUNE_ID, LEFT_HAND } from './home.ts'

const NEUROMANCER_ID = '2a7b9c1d-3e4f-4a5b-9c6d-7e8f9a0b1c2d'
const SCRIM = 'rgba(43, 46, 42, 0.24)'
/** `page` in the light theme (#F6F4EF). */
const PAGE_LIGHT = 'rgb(246, 244, 239)'
/** `page` and the scrim in the dark theme (#191B18, rgba(25,27,24,0.60)). */
const PAGE_DARK = 'rgb(25, 27, 24)'
const SCRIM_DARK = 'rgba(25, 27, 24, 0.6)'
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

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

/** A Book without notes: its block has no pile opener. */
const EMMA = { id: '9c4d2b1a-7e6f-4a5b-8c9d-0e1f2a3b4c5d', title: 'Emma', authors: ['Jane Austen'], pages: 474 }

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

async function pausedClock(page: Page): Promise<void> {
  const start = new Date('2026-11-10T10:00:00+01:00')
  await page.clock.install({ time: start })
  await page.clock.pauseAt(new Date(start.getTime() + 1_000))
}

/** Past the search pause and announce's tick together. */
const PAST_THE_PAUSE_MS = 1_000

/** Records every non-empty text the shell's `status` takes from now on. Call while no pile is open. */
async function recordStatus(page: Page): Promise<() => Promise<string[]>> {
  await page.getByRole('status').evaluate((region) => {
    const seen: string[] = []
    ;(window as Window & { statusTexts?: string[] }).statusTexts = seen
    new MutationObserver(() => seen.push(region.textContent ?? '')).observe(region, {
      childList: true,
      characterData: true,
      subtree: true,
    })
  })
  return async () =>
    ((await page.evaluate(() => (window as Window & { statusTexts?: string[] }).statusTexts)) ?? []).filter(
      (text) => text !== '',
    )
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

  test('[P0] AC-1 "Go through as a pile" opens a modal "Card notes pile, X" showing one note, Close, Previous · N of M · Next and an Order radio group', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server, DUNE_ID))
    await pileOpener(page.getByRole('main')).click()
    const dialog = pile(page, 'Dune')

    // The criterion: the pile, named for its Book.
    await expect(dialog).toBeVisible()
    // The pile's status isn't set on open; the shown note is the dialog's description instead.
    await expect(announcement(dialog)).toHaveText('')
    await expect(dialog).toHaveAccessibleDescription(`${FEAR} p.12 1 of 4`)

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

  test('[P0] AC-2 Next and Previous change the note and announce "Note N of M, p.X: text" (no period added); the ends are aria-disabled with no wrap, and a one-note pile disables both', async ({
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

  test('[P1] AC-3 picking Shuffled reshuffles once for that change with "N of M" following the order, and Page order restores page order', async ({
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
    // A change of order isn't announced.
    await expect(announcement(dialog)).toHaveText('')

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
    await expect(announcement(dialog)).toHaveText('')
    await expect(position(dialog)).toHaveText('1 of 4')
    await expect(dialog.getByText(FEAR, { exact: true })).toBeVisible()
    for (const [index, text] of DUNE_IN_PAGE_ORDER.slice(1).entries()) {
      await press(nextButton(dialog))
      await expect(position(dialog)).toHaveText(`${index + 2} of 4`)
      await expect(dialog.getByText(text, { exact: true })).toBeVisible()
    }
  })

  test("[P1] AC-4 opening a search result on the Card notes page or in Book detail's block opens the pile in Page order at that note", async ({
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

  test('[P1] AC-5 a note\'s page ref is a chip button "Open p.42 in the pile" that opens the pile in Page order at that note, separate from its Edit', async ({
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
    // `has` is matched inside each item, so its locator starts from the page, not the block.
    const item = block
      .getByRole('listitem')
      .filter({ has: page.getByRole('button', { name: 'Open pp.42–45 in the pile', exact: true }) })
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

  test("[P1] AC-6 Close or Esc returns to the list at the last viewed note with focus on its Edit, on Book detail that note's Edit if shown, else Go through as a pile; the pile has no search and no editing", async ({
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

  // Green-phase follow-ups (ATDD checklist → Green-phase follow-ups).

  test('[P1] AC-1 each group\'s "Go through as a pile" on the unscoped page opens its own Book\'s pile', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server))
    for (const [title, count, first] of [
      ['Dune', 4, FEAR],
      ['The Left Hand of Darkness', 2, 'Light is the left hand of darkness.'],
      ['Neuromancer', 1, 'The sky above the port was the color of television.'],
    ] as const) {
      await pileOpener(group(page, title)).click()
      const dialog = pile(page, title)
      await expect(position(dialog)).toHaveText(`1 of ${count}`)
      await expect(dialog.getByText(first, { exact: true })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
    }
  })

  test('[P2] AC-1 focus opens on Next, and Tab and Shift+Tab stay inside the pile, reaching only the checked radio', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server, DUNE_ID))
    await pileOpener(page.getByRole('main')).click()
    const dialog = pile(page, 'Dune')
    const close = dialog.getByRole('button', { name: 'Close', exact: true })
    const pageOrder = orderGroup(dialog).getByRole('radio', { name: 'Page order', exact: true })
    await expect(nextButton(dialog)).toBeFocused()

    // Forward: Next → Page order → (wrap) Close → Previous → Next.
    for (const expected of [pageOrder, close, previousButton(dialog), nextButton(dialog)]) {
      await page.keyboard.press('Tab')
      await expect(expected).toBeFocused()
    }
    // Backward: Next → Previous → Close → (wrap) Page order.
    for (const expected of [previousButton(dialog), close, pageOrder]) {
      await page.keyboard.press('Shift+Tab')
      await expect(expected).toBeFocused()
    }

    // With Shuffled checked, Tab reaches Shuffled instead (arrow keys move within the group).
    await page.keyboard.press('ArrowRight')
    const shuffledRadio = orderGroup(dialog).getByRole('radio', { name: 'Shuffled', exact: true })
    await expect(shuffledRadio).toBeChecked()
    await expect(shuffledRadio).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(close).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(shuffledRadio).toBeFocused()
  })

  test('[P2] AC-3 picking Shuffled again while it is checked keeps the order and the place', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server, DUNE_ID))
    await pileOpener(page.getByRole('main')).click()
    const dialog = pile(page, 'Dune')
    const shuffledRadio = orderGroup(dialog).getByRole('radio', { name: 'Shuffled', exact: true })
    await shuffledRadio.check()
    await expect(position(dialog)).toHaveText('1 of 4')
    await press(nextButton(dialog))
    await expect(position(dialog)).toHaveText('2 of 4')
    const second = await announcedNote(dialog)

    await shuffledRadio.click()
    await expect(shuffledRadio).toBeChecked()
    await expect(position(dialog)).toHaveText('2 of 4')
    await expect(dialog.getByText(second, { exact: true })).toBeVisible()
  })

  test('[P2] AC-1 the dark theme puts the pile on dark `page` over the dark scrim', async ({ page, seededServer }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server, DUNE_ID))
    await pileOpener(page.getByRole('main')).click()
    const dialog = pile(page, 'Dune')
    await expect(dialog).toBeVisible()
    expect(await dialog.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(PAGE_DARK)
    expect(await dialog.evaluate((element) => getComputedStyle(element, '::backdrop').backgroundColor)).toBe(SCRIM_DARK)
  })

  test('[P2] AC-5 a page-ref chip is at least 24px tall, on the page and in the block', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server))
    const onPage = (await pageRefButton(group(page, 'Dune'), 'p.12').boundingBox())!
    expect(onPage.height).toBeGreaterThanOrEqual(24)
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const inBlock = (await pageRefButton(cardNotesBlock(page, 4), 'pp.42–45').boundingBox())!
    expect(inBlock.height).toBeGreaterThanOrEqual(24)
  })

  test('[P1] AC-6 closing on the page when a search hides the last viewed note focuses that group\'s "Go through as a pile"', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server))
    const main = page.getByRole('main')
    await searchField(main).pressSequentially('spice')
    await pageRefButton(main, 'p.96').click()
    const dialog = pile(page, 'Dune')
    await expect(position(dialog)).toHaveText('3 of 4')
    // p.300 doesn't match "spice", so its Edit isn't shown.
    await press(nextButton(dialog))
    await expect(position(dialog)).toHaveText('4 of 4')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(pileOpener(group(page, 'Dune'))).toBeFocused()
  })

  test('[P2] the block clamps a long note to 6 lines while its search is empty, and not while it holds text', async ({
    page,
    seededServer,
  }) => {
    const long = Array.from({ length: 10 }, (_, index) => `Line ${index + 1} of a long note.`).join('\n')
    const server = await seededServer({ books: [{ ...NEUROMANCER, cardNotes: [{ text: long, pageStart: 3 }] }] })
    await page.goto(`${server.url}/book/${NEUROMANCER_ID}`)
    const block = cardNotesBlock(page, 1)
    const text = block.getByRole('listitem').getByRole('paragraph')
    const box = () =>
      text.evaluate((element) => ({
        height: element.clientHeight,
        scrolled: element.scrollHeight,
        line: parseFloat(getComputedStyle(element).lineHeight),
      }))

    const clamped = await box()
    expect(clamped.height).toBeLessThanOrEqual(clamped.line * 6 + 1)
    expect(clamped.scrolled).toBeGreaterThan(clamped.height)

    await searchField(block).fill('line 10')
    await expect(block.locator('mark')).toHaveText('Line 10')
    await expect(block.locator('mark')).toBeVisible()
    const searched = await box()
    expect(searched.height).toBeGreaterThan(searched.line * 9)
  })

  test('[P2] axe finds nothing on the open pile (light and dark) or on the lists with page-ref chips', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    const axe = async (where: string): Promise<string[]> => {
      const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
      return violations.map(({ id, nodes }) => `${where}: ${id} (${nodes.length})`)
    }
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await page.goto(cardNotesPage(server))
      await expect(pageRefButton(group(page, 'Dune'), 'p.12')).toBeVisible()
      expect(await axe(`${colorScheme} page with chips`)).toEqual([])

      await pileOpener(group(page, 'Dune')).click()
      const dialog = pile(page, 'Dune')
      await press(nextButton(dialog))
      await expect(position(dialog)).toHaveText('2 of 4')
      expect(await axe(`${colorScheme} open pile`)).toEqual([])
      await page.keyboard.press('Escape')

      await page.goto(`${server.url}/book/${DUNE_ID}`)
      await expect(pileOpener(cardNotesBlock(page, 4))).toBeVisible()
      expect(await axe(`${colorScheme} block with chips`)).toEqual([])
    }
  })

  test('[P2] AC-1 Book detail\'s "Go through as a pile" stays while the block\'s search matches nothing, and a Book without notes has none', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [...LIBRARY.books, { ...EMMA }] })
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const block = cardNotesBlock(page, 4)
    await searchField(block).fill('zzz')
    await expect(block.getByText('No card notes contain “zzz”.', { exact: true })).toBeVisible()
    await expect(pileOpener(block)).toBeVisible()
    await pileOpener(block).click()
    const dialog = pile(page, 'Dune')
    await expect(position(dialog)).toHaveText('1 of 4')
    await expect(dialog.getByText(FEAR, { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')

    await page.goto(`${server.url}/book/${EMMA.id}`)
    const empty = page.getByRole('main').getByRole('region', { name: 'Card notes', exact: true })
    await expect(empty.getByText('No card notes yet.', { exact: true })).toBeVisible()
    await expect(pileOpener(empty)).toHaveCount(0)
  })

  test('[P2] AC-1 the scoped Card notes page keeps its Book\'s "Go through as a pile" while the search matches nothing', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server, DUNE_ID))
    const main = page.getByRole('main')
    await searchField(main).fill('zzz')
    await expect(main.getByText('No card notes contain “zzz”.', { exact: true })).toBeVisible()
    await expect(pileOpener(main)).toHaveCount(1)
    await pileOpener(main).click()
    const dialog = pile(page, 'Dune')
    await expect(position(dialog)).toHaveText('1 of 4')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(pileOpener(main)).toBeFocused()

    // Unscoped, a Book with no match has no group, so no opener either.
    await page.goto(cardNotesPage(server))
    await searchField(main).fill('zzz')
    await expect(main.getByText('No card notes contain “zzz”.', { exact: true })).toBeVisible()
    await expect(pileOpener(main)).toHaveCount(0)
  })

  test("[P2] AC-1 opening and closing the pile leaves the shell's status as it was", async ({ page, seededServer }) => {
    const server = await seededServer(LIBRARY)
    await pausedClock(page)
    await page.goto(cardNotesPage(server))
    const main = page.getByRole('main')
    // The shell's own status, outside any dialog.
    const shellStatus = page.locator('[role="status"]:not(dialog [role="status"])')
    await searchField(main).pressSequentially('spice')
    await page.clock.runFor(PAST_THE_PAUSE_MS)
    await expect(shellStatus).toHaveText('1 note matches.')

    await pageRefButton(main, 'p.96').click()
    const dialog = pile(page, 'Dune')
    await expect(position(dialog)).toHaveText('3 of 4')
    await page.clock.runFor(PAST_THE_PAUSE_MS)
    await expect(shellStatus).toHaveText('1 note matches.')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(shellStatus).toHaveText('1 note matches.')
  })

  test('[P2] AC-4 opening the pile from a chip on the Card notes page while typing pauses drops the pending "N notes match."', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await pausedClock(page)
    await page.goto(cardNotesPage(server))
    const main = page.getByRole('main')
    await expect(pageRefButton(main, 'p.96')).toBeVisible()

    const announced = await recordStatus(page)
    await searchField(main).pressSequentially('spice')
    await pageRefButton(main, 'p.96').click()
    const dialog = pile(page, 'Dune')
    await expect(position(dialog)).toHaveText('3 of 4')
    await page.clock.runFor(PAST_THE_PAUSE_MS)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await page.clock.runFor(PAST_THE_PAUSE_MS)
    expect(await announced()).toEqual([])
  })

  test('[P2] AC-4 opening the pile from a chip in Book detail\'s block while typing pauses drops the pending "N notes match."', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await pausedClock(page)
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const block = cardNotesBlock(page, 4)
    await expect(pageRefButton(block, 'p.12')).toBeVisible()

    const announced = await recordStatus(page)
    await searchField(block).pressSequentially('mystery')
    await pageRefButton(block, 'p.300').click()
    const dialog = pile(page, 'Dune')
    await expect(position(dialog)).toHaveText('4 of 4')
    await page.clock.runFor(PAST_THE_PAUSE_MS)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await page.clock.runFor(PAST_THE_PAUSE_MS)
    expect(await announced()).toEqual([])
  })
})
