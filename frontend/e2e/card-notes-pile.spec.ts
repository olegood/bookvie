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
import { DUNE_ID } from './home.ts'
import {
  announcedNote,
  announcement,
  BEGINNING,
  cardNotesPage,
  DUNE_EDIT_BY_TEXT,
  DUNE_IN_PAGE_ORDER,
  FEAR,
  group,
  LIBRARY,
  MYSTERY,
  nextButton,
  NEUROMANCER,
  NEUROMANCER_ID,
  orderGroup,
  pile,
  pileOpener,
  position,
  press,
  previousButton,
  seededRandom,
  SPICE,
} from './pile.ts'

const SCRIM = 'rgba(43, 46, 42, 0.24)'
/** `page` in the light theme (#F6F4EF). */
const PAGE_LIGHT = 'rgb(246, 244, 239)'
/** `page` and the scrim in the dark theme (#191B18, rgba(25,27,24,0.60)). */
const PAGE_DARK = 'rgb(25, 27, 24)'
const SCRIM_DARK = 'rgba(25, 27, 24, 0.6)'
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/** A Book without notes: its block has no pile opener. */
const EMMA = { id: '9c4d2b1a-7e6f-4a5b-8c9d-0e1f2a3b4c5d', title: 'Emma', authors: ['Jane Austen'], pages: 474 }

/** A note's page ref: a chip `button` named "Open p.42 in the pile", reading "p.42". */
function pageRefButton(scope: Locator, ref: string): Locator {
  return scope.getByRole('button', { name: `Open ${ref} in the pile`, exact: true })
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

type ScrollCall = { name: string | null; focused: boolean; options: ScrollIntoViewOptions | boolean | undefined }

/** Records every `scrollIntoView` call (and still scrolls): its element's name, whether it had focus, its options. */
async function recordScrolls(page: Page): Promise<() => Promise<ScrollCall[]>> {
  await page.addInitScript(() => {
    const calls: ScrollCall[] = []
    ;(window as Window & { scrollCalls?: ScrollCall[] }).scrollCalls = calls
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function (this: Element, options?: ScrollIntoViewOptions | boolean) {
      calls.push({ name: this.getAttribute('aria-label'), focused: this === document.activeElement, options })
      return original.call(this, options)
    }
  })
  return async () => (await page.evaluate(() => (window as Window & { scrollCalls?: ScrollCall[] }).scrollCalls)) ?? []
}

/** Splits a computed `box-shadow` into its layers (commas inside `rgb(...)` don't split). */
function shadowLayers(shadow: string): string[] {
  return shadow.split(/,(?![^(]*\))/).map((layer) => layer.trim())
}

test.describe('Story 5.4 automate', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test('[P2] AC-6 closing scrolls the focused Edit into view smoothly, and instantly under reduced motion', async ({
    page,
    seededServer,
  }) => {
    const scrolls = await recordScrolls(page)
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server, DUNE_ID))
    const main = page.getByRole('main')
    const dialog = pile(page, 'Dune')

    // Default motion: smooth, to the nearest edge.
    await pageRefButton(main, 'p.96').click()
    await expect(position(dialog)).toHaveText('3 of 4')
    await page.keyboard.press('Escape')
    const edit = main.getByRole('button', { name: 'Edit p.96', exact: true })
    await expect(edit).toBeFocused()
    const smooth = (await scrolls()).filter((call) => call.focused && call.name === 'Edit p.96')
    expect(smooth.map((call) => call.options)).toEqual([{ block: 'nearest', behavior: 'smooth' }])

    // Reduced motion: the same scroll, instant.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await pageRefButton(main, 'p.12').click()
    await expect(position(dialog)).toHaveText('1 of 4')
    await page.keyboard.press('Escape')
    await expect(main.getByRole('button', { name: 'Edit p.12', exact: true })).toBeFocused()
    const instant = (await scrolls()).filter((call) => call.focused && call.name === 'Edit p.12')
    expect(instant.map((call) => call.options)).toEqual([{ block: 'nearest', behavior: 'auto' }])
  })

  test('[P2] AC-6 in a list of 30 notes, closing at "30 of 30" focuses p.30\'s Edit and brings it into the viewport', async ({
    page,
    seededServer,
  }) => {
    await page.setViewportSize({ width: 1280, height: 480 })
    const thirty = Array.from({ length: 30 }, (_, index) => ({
      text: `Note number ${index + 1} of the long list.`,
      pageStart: index + 1,
    }))
    const server = await seededServer({ books: [{ ...NEUROMANCER, cardNotes: thirty }] })
    await page.goto(cardNotesPage(server, NEUROMANCER_ID))
    const main = page.getByRole('main')
    const editLast = main.getByRole('button', { name: 'Edit p.30', exact: true })
    // The last note starts out of view.
    await expect(editLast).not.toBeInViewport()

    await pageRefButton(main, 'p.1').click()
    const dialog = pile(page, 'Neuromancer')
    await expect(position(dialog)).toHaveText('1 of 30')
    for (let n = 2; n <= 30; n++) {
      await press(nextButton(dialog))
      await expect(position(dialog)).toHaveText(`${n} of 30`)
    }
    await expect(dialog.getByText('Note number 30 of the long list.', { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')

    await expect(dialog).toBeHidden()
    await expect(editLast).toBeFocused()
    await expect(editLast).toBeInViewport()
  })

  test('[P2] AC-1 in forced colors the checked Order segment is underlined in Highlight and a disabled end reads GrayText', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' })
    await page.goto(cardNotesPage(server, DUNE_ID))
    await pileOpener(page.getByRole('main')).click()
    const dialog = pile(page, 'Dune')
    await expect(position(dialog)).toHaveText('1 of 4')
    await expect(previousButton(dialog)).toHaveAttribute('aria-disabled', 'true')

    // The system colors, resolved by the browser on a probe inside the dialog.
    const { highlight, grayText } = await dialog.evaluate((element) => {
      const resolve = (value: string): string => {
        const probe = document.createElement('span')
        probe.style.forcedColorAdjust = 'none'
        probe.style.color = value
        element.append(probe)
        const color = getComputedStyle(probe).color
        probe.remove()
        return color
      }
      return { highlight: resolve('Highlight'), grayText: resolve('GrayText') }
    })
    expect(highlight).not.toBe(grayText)

    // The checked segment is the radio's label.
    const checkedSegment = orderGroup(dialog)
      .locator('label')
      .filter({ has: page.getByRole('radio', { checked: true }) })
    await expect(checkedSegment).toHaveText('Page order')
    await expect(checkedSegment).toHaveCSS('border-bottom-color', highlight)
    await expect(previousButton(dialog)).toHaveCSS('color', grayText)
    // An enabled step isn't GrayText.
    await expect(nextButton(dialog)).not.toHaveCSS('color', grayText)
  })

  test('[P2] AC-1 in the light theme the pile has the dialog radius and overlay shadow, the note a stacked edge in `line`, and a disabled end keeps its shape in `ink-tertiary`', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server, DUNE_ID))
    await pileOpener(page.getByRole('main')).click()
    const dialog = pile(page, 'Dune')
    await expect(position(dialog)).toHaveText('1 of 4')

    // The tokens, resolved by the browser on probes.
    const tokens = await dialog.evaluate((element) => {
      const probe = document.createElement('div')
      probe.style.borderRadius = 'var(--radius-lg)'
      probe.style.boxShadow = 'var(--shadow-overlay)'
      probe.style.color = 'var(--color-ink-tertiary)'
      probe.style.backgroundColor = 'var(--color-line)'
      element.append(probe)
      const style = getComputedStyle(probe)
      const resolved = {
        radius: style.borderTopLeftRadius,
        shadow: style.boxShadow,
        inkTertiary: style.color,
        line: style.backgroundColor,
      }
      probe.remove()
      return resolved
    })
    expect(tokens.radius).toBe('12px')
    expect(tokens.shadow).not.toBe('none')

    await expect(dialog).toHaveCSS('border-top-left-radius', tokens.radius)
    await expect(dialog).toHaveCSS('box-shadow', tokens.shadow)

    // The note card: four layers, the second and fourth in `line` at 4px and 8px.
    const card = dialog.getByText(FEAR, { exact: true }).locator('..')
    const layers = shadowLayers(await card.evaluate((element) => getComputedStyle(element).boxShadow))
    expect(layers).toHaveLength(4)
    expect(layers[1]).toBe(`${tokens.line} 4px 4px 0px 0px`)
    expect(layers[3]).toBe(`${tokens.line} 8px 8px 0px 0px`)

    // A disabled end reads `ink-tertiary`, and has the same box as when enabled.
    const previous = previousButton(dialog)
    await expect(previous).toHaveAttribute('aria-disabled', 'true')
    await expect(previous).toHaveCSS('color', tokens.inkTertiary)
    const disabledBox = (await previous.boundingBox())!
    await press(nextButton(dialog))
    await expect(position(dialog)).toHaveText('2 of 4')
    await expect(previous).not.toHaveAttribute('aria-disabled', 'true')
    await expect(previous).not.toHaveCSS('color', tokens.inkTertiary)
    const enabledBox = (await previous.boundingBox())!
    expect(disabledBox.width).toBe(enabledBox.width)
    expect(disabledBox.height).toBe(enabledBox.height)
  })

  test('[P2] AC-4 on the scoped Card notes page a search result opens the pile in Page order at that note, holding every note', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server, DUNE_ID))
    const main = page.getByRole('main')
    await searchField(main).pressSequentially('spice')
    await expect(pageRefButton(main, 'p.300')).toHaveCount(0)
    await pageRefButton(main, 'p.96').click()
    const dialog = pile(page, 'Dune')

    await expect(position(dialog)).toHaveText('3 of 4')
    await expect(dialog.getByText(SPICE, { exact: true })).toBeVisible()
    await expect(orderGroup(dialog).getByRole('radio', { name: 'Page order', exact: true })).toBeChecked()
    // p.300 doesn't match "spice", but the pile holds it.
    await press(nextButton(dialog))
    await expect(position(dialog)).toHaveText('4 of 4')
    await expect(dialog.getByText(MYSTERY, { exact: true })).toBeVisible()
  })

  test("[P2] AC-6 closing a Shuffled pile focuses the Edit of the note last shown in the shuffle, not page order's", async ({
    page,
    seededServer,
  }) => {
    await seededRandom(page)
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server))
    const dune = group(page, 'Dune')
    await pileOpener(dune).click()
    const dialog = pile(page, 'Dune')
    await orderGroup(dialog).getByRole('radio', { name: 'Shuffled', exact: true }).check()
    await expect(position(dialog)).toHaveText('1 of 4')
    await press(nextButton(dialog))
    await expect(position(dialog)).toHaveText('2 of 4')
    const shown = await announcedNote(dialog)
    await expect(dialog.getByText(shown, { exact: true })).toBeVisible()
    // The seeded shuffle moved another note to second place, so page order would point elsewhere.
    expect(shown).not.toBe(BEGINNING)
    expect(Object.keys(DUNE_EDIT_BY_TEXT)).toContain(shown)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(dune.getByRole('button', { name: DUNE_EDIT_BY_TEXT[shown], exact: true })).toBeFocused()
  })
})
