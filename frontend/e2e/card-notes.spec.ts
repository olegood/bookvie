// Story 5.3 Find a note across all my books. The top nav gains Card notes,
// leading to a page whose h1 is "Card notes": every note grouped under its
// Book's serif title, with Search card notes filtering while typing (ignoring
// case), matches in <mark>, and "N notes match." once typing pauses. The Main
// book card's "See card notes · N" and Book detail's "See all card notes" open
// the page scoped to one Book, with a removable "In X" chip. Book detail's
// block gets its own Search card notes. What the card-notes view selects and
// orders (groups by title, notes in page order) is proven at API level in
// backend/tests/test_card_notes_view.py.

import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import { DUNE, DUNE_ID, LEFT_HAND, LEFT_HAND_ID, mainAt, mainBookCard } from './home.ts'

const EMMA_ID = '9c4d2b1a-7e6f-4a5b-8c9d-0e1f2a3b4c5d'
const SAVED = 'Card note saved.'
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const NEUROMANCER_ID = '2a7b9c1d-3e4f-4a5b-9c6d-7e8f9a0b1c2d'

/** Dune with four notes, seeded out of page order. The block shows the first three. */
const DUNE_WITH_NOTES = {
  ...DUNE,
  cardNotes: [
    { text: 'The mystery of life isn’t a problem to solve.', pageStart: 300 },
    { text: 'Fear is the mind-killer.', pageStart: 12 },
    { text: 'The spice must flow.', pageStart: 96 },
    { text: 'A beginning is the time for taking the most delicate care.', pageStart: 42, pageEnd: 45 },
  ],
}
const LEFT_HAND_WITH_NOTES = {
  ...LEFT_HAND,
  cardNotes: [
    { text: 'On the Ice, the two of them were alone.', pageStart: 151 },
    { text: 'Light is the left hand of darkness.', pageStart: 42 },
  ],
}
const NEUROMANCER = {
  id: NEUROMANCER_ID,
  title: 'Neuromancer',
  authors: ['William Gibson'],
  pages: 271,
  cardNotes: [{ text: 'The sky above the port was the color of television.', pageStart: 3 }],
}
/** A Book with no notes: no group, an empty scoped view, no search in its block. */
const EMMA = { id: EMMA_ID, title: 'Emma', authors: ['Jane Austen'], pages: 474 }

/** Seven notes in three Books, stored in no particular order, plus Emma with none. */
const LIBRARY = { books: [NEUROMANCER, EMMA, DUNE_WITH_NOTES, LEFT_HAND_WITH_NOTES] }

function cardNotesPage(server: { url: string }, bookId?: string): string {
  return bookId === undefined ? `${server.url}/card-notes` : `${server.url}/card-notes?book=${bookId}`
}

/** The Search card notes field: a `searchbox` named by its visible label. */
function searchField(scope: Locator): Locator {
  return scope.getByRole('searchbox', { name: 'Search card notes', exact: true })
}

/** The Book titles heading the groups on the Card notes page, in order. */
function groupHeadings(page: Page): Locator {
  return page.getByRole('main').getByRole('heading', { level: 2 })
}

/** Every note listed on the page or in a block. */
function notes(scope: Locator): Locator {
  return scope.getByRole('listitem')
}

/** The scope chip "In X", with its remove button. */
function scopeChip(page: Page, title: string): Locator {
  return page.getByRole('main').getByText(`In ${title}`, { exact: true })
}

/** Book detail's Card notes block, named by its heading "Card notes (N)". */
function cardNotesBlock(page: Page, count: number): Locator {
  return page.getByRole('main').getByRole('region', { name: `Card notes (${count})`, exact: true })
}

/** Records every text the `status` region shows, to prove one announcement after typing pauses. */
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

test.describe('Story 5.3 Find a note across all my books', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test('[P1] AC-1 the top nav adds Card notes between Catalog and Backup, leading to a page whose h1 is "Card notes"', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(server.url)
    const nav = page.getByRole('banner').getByRole('navigation')

    // The criterion: Card notes in its place in the order, until Stats arrives.
    await expect(nav.getByRole('link')).toHaveText(['Home', 'Catalog', 'Card notes', 'Backup'])

    await nav.getByRole('link', { name: 'Card notes', exact: true }).click()
    await expect(page).toHaveURL(cardNotesPage(server))
    const h1 = page.getByRole('main').getByRole('heading', { level: 1 })
    await expect(h1).toHaveText('Card notes')
    await expect(h1).toBeFocused()
    await expect(page).toHaveTitle('Card notes — bookvie')
    await expect(nav.getByRole('link', { name: 'Card notes', exact: true })).toHaveAttribute('aria-current', 'page')
  })

  test('[P0] AC-3 Search card notes keeps only the notes containing the text, grouped by Book, with matches in <mark> and "N notes match."', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server))
    const main = page.getByRole('main')
    const search = searchField(main)

    // The criterion's field: a visible label, no placeholder.
    await expect(search).toBeVisible()
    await expect(search).not.toHaveAttribute('placeholder')
    await expect(main.getByText('Search card notes', { exact: true })).toBeVisible()
    await expect(notes(main)).toHaveCount(7)
    const announced = await recordStatus(page)

    // Ignoring case. "I" alone matches more notes, so a count announced per
    // keystroke instead of after typing pauses shows up as a second text.
    await search.pressSequentially('ICE')
    await expect(notes(main)).toHaveCount(2)
    await expect(groupHeadings(page)).toHaveText(['Dune', 'The Left Hand of Darkness'])
    await expect(main.getByText('Fear is the mind-killer.', { exact: true })).toBeHidden()
    await expect(main.getByText('Neuromancer', { exact: true })).toBeHidden()
    // Matches wrapped in <mark>, as written in the note, weight 600.
    const marks = main.locator('mark')
    await expect(marks).toHaveText(['ice', 'Ice'])
    await expect(marks.first()).toHaveCSS('font-weight', '600')
    // accent-soft background and a 1px accent underline.
    await expect(marks.first()).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await expect(marks.first()).toHaveCSS('text-decoration-line', 'underline')
    await expect(marks.first()).toHaveCSS('text-decoration-thickness', '1px')
    await expect(page.getByRole('status')).toHaveText('2 notes match.')
    expect(await announced()).toEqual(['2 notes match.'])

    // No matches.
    await search.fill('zzz')
    await expect(main.getByText('No card notes contain “zzz”.', { exact: true })).toBeVisible()
    await expect(notes(main)).toHaveCount(0)

    // Esc clears the field, and every note is back.
    await search.press('Escape')
    await expect(search).toHaveValue('')
    await expect(notes(main)).toHaveCount(7)
    await expect(groupHeadings(page)).toHaveText(['Dune', 'Neuromancer', 'The Left Hand of Darkness'])
  })

  test('[P1] AC-4 the Main book card\'s "See card notes · 7" and Book detail\'s "See all card notes" open the Card notes page scoped to that Book', async ({
    page,
    seededServer,
  }) => {
    const seven = Array.from({ length: 7 }, (_, i) => ({ text: `Note ${i + 1}.`, pageStart: 10 * (i + 1) }))
    const server = await seededServer(mainAt(120, { book: { cardNotes: seven }, others: [DUNE_WITH_NOTES] }))
    await page.goto(server.url)
    const card = mainBookCard(page)
    const seeSeven = card.getByRole('link', { name: 'See card notes, 7 notes', exact: true })

    // The criterion: the count link, its label "See card notes · 7".
    await expect(seeSeven).toBeVisible()
    await expect(seeSeven).toHaveText('See card notes · 7')

    await seeSeven.click()
    await expect(page).toHaveURL(cardNotesPage(server, LEFT_HAND_ID))
    await expect(scopeChip(page, 'The Left Hand of Darkness')).toBeVisible()
    await expect(groupHeadings(page)).toHaveText(['The Left Hand of Darkness'])
    await expect(notes(page.getByRole('main'))).toHaveCount(7)

    // Book detail's block adds "See all card notes": the same scoped view.
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    await cardNotesBlock(page, 4).getByRole('link', { name: 'See all card notes', exact: true }).click()
    await expect(page).toHaveURL(cardNotesPage(server, DUNE_ID))
    await expect(scopeChip(page, 'Dune')).toBeVisible()
    await expect(groupHeadings(page)).toHaveText(['Dune'])
    await expect(notes(page.getByRole('main'))).toHaveCount(4)

    // A Main book with no notes: just "See card notes", to the same scoped view.
    const bare = await seededServer(mainAt(120))
    await page.goto(bare.url)
    const see = mainBookCard(page).getByRole('link', { name: 'See card notes', exact: true })
    await expect(see).toHaveText('See card notes')
    await see.click()
    await expect(page).toHaveURL(cardNotesPage(bare, LEFT_HAND_ID))
  })

  test('[P1] AC-5 the scoped view shows only that Book\'s notes under a removable "In X" chip, searches that Book only, and widens when the chip is cleared', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server, DUNE_ID))
    const main = page.getByRole('main')

    // The criterion: the scope chip "In Dune".
    await expect(scopeChip(page, 'Dune')).toBeVisible()
    await expect(main.getByRole('heading', { level: 1 })).toHaveText('Card notes')
    await expect(groupHeadings(page)).toHaveText(['Dune'])
    await expect(notes(main)).toHaveCount(4)

    // The search covers Dune only: "the" is in all four of its notes, and in
    // three notes of other Books that stay out.
    await searchField(main).pressSequentially('the')
    await expect(notes(main)).toHaveCount(4)
    await expect(page.getByRole('status')).toHaveText('4 notes match.')
    await expect(main.getByText('Light is the left hand of darkness.')).toBeHidden()
    await searchField(main).press('Escape')
    await expect(searchField(main)).toHaveValue('')

    // Clearing the chip widens to all Books.
    await main.getByRole('button', { name: /^Remove\b/ }).click()
    await expect(page).toHaveURL(cardNotesPage(server))
    await expect(scopeChip(page, 'Dune')).toBeHidden()
    await expect(groupHeadings(page)).toHaveText(['Dune', 'Neuromancer', 'The Left Hand of Darkness'])
    await expect(notes(main)).toHaveCount(7)

    // A Book with no notes: "No card notes yet." with Add card note.
    await page.goto(cardNotesPage(server, EMMA_ID))
    await expect(scopeChip(page, 'Emma')).toBeVisible()
    await expect(main.getByText('No card notes yet.', { exact: true })).toBeVisible()
    await expect(main.getByRole('button', { name: 'Add card note', exact: true })).toBeVisible()
    await expect(notes(main)).toHaveCount(0)
  })

  test("[P1] AC-6 Book detail's Search card notes shows every matching note of that Book, not only three, and is absent without notes", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const block = cardNotesBlock(page, 4)
    const search = searchField(block)

    // The criterion's field, inside the block.
    await expect(search).toBeVisible()
    await expect(notes(block)).toHaveCount(3)

    // "the" is in all four of Dune's notes: the block shows all four, including
    // p.300, which the first-three cut leaves out.
    await search.pressSequentially('the')
    await expect(notes(block)).toHaveCount(4)
    await expect(block.getByText('p.300', { exact: true })).toBeVisible()
    // Every match is marked: "the time for taking the most" holds two.
    await expect(block.locator('mark')).toHaveCount(5)
    await expect(page.getByRole('status')).toHaveText('4 notes match.')

    // No matches.
    await search.fill('zzz')
    await expect(block.getByText('No card notes contain “zzz”.', { exact: true })).toBeVisible()
    await expect(notes(block)).toHaveCount(0)

    // Esc clears it: back to the first three.
    await search.press('Escape')
    await expect(search).toHaveValue('')
    await expect(notes(block)).toHaveCount(3)

    // A Book with no notes has no search field.
    await page.goto(`${server.url}/book/${EMMA_ID}`)
    const empty = page.getByRole('main').getByRole('region', { name: 'Card notes', exact: true })
    await expect(empty.getByText('No card notes yet.', { exact: true })).toBeVisible()
    await expect(searchField(empty)).toHaveCount(0)
  })
})

/** The note on the page or in a block whose text is `text`. */
function noteItem(scope: Locator, text: string): Locator {
  return scope.getByRole('listitem').filter({ has: scope.page().getByText(text, { exact: true }) })
}

/** A note's Edit: named "Edit p.96". */
function editOf(item: Locator): Locator {
  return item.getByRole('button', { name: /^Edit\b/ })
}

/** The Card note panel: "Card note" (add) or "Edit card note" (edit). */
function notePanel(page: Page, heading: 'Card note' | 'Edit card note'): Locator {
  return page.getByRole('dialog', { name: heading, exact: true })
}

/** The group heading of the Book titled `title` on the Card notes page. */
function groupHeading(page: Page, title: string): Locator {
  return page.getByRole('main').getByRole('heading', { level: 2, name: title, exact: true })
}

test.describe('Story 5.3 follow-ups', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test('[P1] AC-2 the page renders serif group titles, notes in page order with their page refs and Edits; an empty library reads "No card notes yet."', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server))
    const main = page.getByRole('main')

    await expect(groupHeadings(page)).toHaveText(['Dune', 'Neuromancer', 'The Left Hand of Darkness'])
    await expect(groupHeading(page, 'Dune')).toHaveCSS('font-family', /^ui-serif/)
    // Dune's notes in page order on screen, each with its page ref and its Edit.
    // A group is headed by its h2, not a named region: a landmark per Book would bury main and the nav.
    await expect(main.getByRole('region')).toHaveCount(0)
    const dune = main
      .locator('section')
      .filter({ has: page.getByRole('heading', { level: 2, name: 'Dune', exact: true }) })
    await expect(dune.getByRole('listitem')).toHaveCount(4)
    await expect(dune.getByRole('button', { name: /^Edit\b/ })).toHaveText(['Edit', 'Edit', 'Edit', 'Edit'])
    const names = await dune
      .getByRole('button', { name: /^Edit\b/ })
      .evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')))
    expect(names).toEqual(['Edit p.12', 'Edit pp.42–45', 'Edit p.96', 'Edit p.300'])
    await expect(noteItem(dune, 'Fear is the mind-killer.').getByText('p.12', { exact: true })).toBeVisible()
    await expect(
      noteItem(dune, 'A beginning is the time for taking the most delicate care.').getByText('pp.42–45', {
        exact: true,
      }),
    ).toBeVisible()
    // Page refs are plain text in 5.3: no pile buttons, no "Go through as a pile".
    await expect(main.getByRole('button', { name: /^Open p/ })).toHaveCount(0)
    await expect(main.getByText('Go through as a pile')).toHaveCount(0)

    // An empty library: "No card notes yet.", no groups, no field, no Add card note.
    const empty = await seededServer({ books: [EMMA] })
    await page.goto(cardNotesPage(empty))
    await expect(main.getByText('No card notes yet.', { exact: true })).toBeVisible()
    await expect(groupHeadings(page)).toHaveCount(0)
    await expect(searchField(main)).toHaveCount(0)
    await expect(main.getByRole('button', { name: 'Add card note', exact: true })).toHaveCount(0)
  })

  test("[P1] AC-2 Edit from the page: a save refocuses that note's Edit and says so; a delete focuses the next note's Edit, else the group heading", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server))
    const main = page.getByRole('main')

    await editOf(noteItem(main, 'The spice must flow.')).click()
    const panel = notePanel(page, 'Edit card note')
    await expect(panel.getByRole('textbox', { name: 'Note', exact: true })).toHaveValue('The spice must flow.')
    await panel.getByRole('textbox', { name: 'Note', exact: true }).fill('The spice must flow, always.')
    await panel.getByRole('button', { name: 'Save note', exact: true }).click()
    await expect(panel).toBeHidden()
    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(editOf(noteItem(main, 'The spice must flow, always.'))).toBeFocused()

    // Delete p.42 in The Left Hand of Darkness: p.151 moves into its place.
    await editOf(noteItem(main, 'Light is the left hand of darkness.')).click()
    await panel.getByRole('button', { name: 'Delete', exact: true }).click()
    await page
      .getByRole('alertdialog', { name: 'Delete this card note?', exact: true })
      .getByRole('button', { name: 'Delete card note', exact: true })
      .click()
    await expect(panel).toBeHidden()
    await expect(editOf(noteItem(main, 'On the Ice, the two of them were alone.'))).toBeFocused()

    // Delete the last note of Dune: none after it in the group, so its heading.
    await editOf(noteItem(main, 'The mystery of life isn’t a problem to solve.')).click()
    await panel.getByRole('button', { name: 'Delete', exact: true }).click()
    await page
      .getByRole('alertdialog', { name: 'Delete this card note?', exact: true })
      .getByRole('button', { name: 'Delete card note', exact: true })
      .click()
    await expect(groupHeading(page, 'Dune')).toBeFocused()
  })

  test('[P1] AC-3 an edit while searching that stops the note matching focuses its group heading', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server))
    const main = page.getByRole('main')
    await searchField(main).fill('the')
    await expect(notes(main)).toHaveCount(7)

    await editOf(noteItem(main, 'Fear is the mind-killer.')).click()
    const panel = notePanel(page, 'Edit card note')
    await panel.getByRole('textbox', { name: 'Note', exact: true }).fill('Fear kills.')
    await panel.getByRole('button', { name: 'Save note', exact: true }).click()
    await expect(panel).toBeHidden()
    await expect(page.getByRole('status')).toHaveText(SAVED)
    // The search still holds "the": the note is gone from the results.
    await expect(searchField(main)).toHaveValue('the')
    await expect(notes(main)).toHaveCount(6)
    await expect(groupHeading(page, 'Dune')).toBeFocused()
  })

  test('[P2] AC-3 one match reads "1 note matches."; regex characters match literally', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server))
    const main = page.getByRole('main')
    await searchField(main).pressSequentially('mind-killer')
    await expect(notes(main)).toHaveCount(1)
    await expect(page.getByRole('status')).toHaveText('1 note matches.')

    await searchField(main).fill('p.4(')
    await expect(main.getByText('No card notes contain “p.4(”.', { exact: true })).toBeVisible()
    // Spaces only filter nothing.
    await searchField(main).fill('   ')
    await expect(notes(main)).toHaveCount(7)
  })

  test('[P1] AC-4 "See card notes, 1 note", and the count follows an Add card note on Home without a reload', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(
      mainAt(120, { book: { cardNotes: [{ text: 'Light is the left hand of darkness.', pageStart: 42 }] } }),
    )
    await page.goto(server.url)
    const card = mainBookCard(page)
    await expect(card.getByRole('link', { name: 'See card notes, 1 note', exact: true })).toHaveText(
      'See card notes · 1',
    )

    await card.getByRole('button', { name: 'Add card note', exact: true }).click()
    const panel = notePanel(page, 'Card note')
    await panel.getByRole('textbox', { name: 'Note', exact: true }).fill('On the Ice.')
    await panel.getByRole('button', { name: 'Save note', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(card.getByRole('link', { name: 'See card notes, 2 notes', exact: true })).toHaveText(
      'See card notes · 2',
    )
  })

  test('[P1] AC-5 Add card note on the empty scoped view saves and the note shows', async ({ page, seededServer }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server, EMMA_ID))
    const main = page.getByRole('main')

    await main.getByRole('button', { name: 'Add card note', exact: true }).click()
    const panel = notePanel(page, 'Card note')
    // Emma has no Reading: Page starts empty.
    await expect(panel.getByRole('textbox', { name: 'Page', exact: true })).toHaveValue('')
    await panel.getByRole('textbox', { name: 'Note', exact: true }).fill('Badly done, Emma!')
    await panel.getByRole('textbox', { name: 'Page', exact: true }).fill('368')
    await panel.getByRole('button', { name: 'Save note', exact: true }).click()

    await expect(panel).toBeHidden()
    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(groupHeadings(page)).toHaveText(['Emma'])
    await expect(noteItem(main, 'Badly done, Emma!').getByText('p.368', { exact: true })).toBeVisible()
    await expect(main.getByText('No card notes yet.', { exact: true })).toHaveCount(0)
    // The opener is gone: focus parks on `main`.
    await expect(main).toBeFocused()
  })

  test("[P1] AC-5 Add card note on the empty scoped view prefills Page with the Book's current page", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(88))
    await page.goto(cardNotesPage(server, LEFT_HAND_ID))
    await page.getByRole('main').getByRole('button', { name: 'Add card note', exact: true }).click()
    await expect(notePanel(page, 'Card note').getByRole('textbox', { name: 'Page', exact: true })).toHaveValue('88')
  })

  test('[P1] AC-2 deleting the only note of a group from the page focuses the h1', async ({ page, seededServer }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server))
    const main = page.getByRole('main')

    await editOf(noteItem(main, 'The sky above the port was the color of television.')).click()
    await notePanel(page, 'Edit card note').getByRole('button', { name: 'Delete', exact: true }).click()
    await page
      .getByRole('alertdialog', { name: 'Delete this card note?', exact: true })
      .getByRole('button', { name: 'Delete card note', exact: true })
      .click()
    await expect(groupHeadings(page)).toHaveText(['Dune', 'The Left Hand of Darkness'])
    await expect(main.getByRole('heading', { level: 1, name: 'Card notes', exact: true })).toBeFocused()
  })

  test('[P1] AC-5 removing the chip while searching starts the wider view with an empty search', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server, DUNE_ID))
    const main = page.getByRole('main')
    await searchField(main).fill('spice')
    await expect(notes(main)).toHaveCount(1)

    await main.getByRole('button', { name: 'Remove In Dune', exact: true }).click()
    await expect(page).toHaveURL(cardNotesPage(server))
    await expect(searchField(main)).toHaveValue('')
    await expect(groupHeadings(page)).toHaveText(['Dune', 'Neuromancer', 'The Left Hand of Darkness'])
    await expect(notes(main)).toHaveCount(7)
  })

  test('[P1] AC-5 an unknown ?book= shows the not-found page', async ({ page, seededServer }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server, 'nope'))
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText('Page not found')
    await expect(page).toHaveTitle('Page not found — bookvie')
  })

  test('[P2] AC-5 an empty ?book= is unscoped: every group, no chip', async ({ page, seededServer }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(`${server.url}/card-notes?book=`)
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText('Card notes')
    await expect(groupHeadings(page)).toHaveText(['Dune', 'Neuromancer', 'The Left Hand of Darkness'])
    await expect(page.getByRole('main').getByRole('button', { name: /^Remove In / })).toHaveCount(0)
  })

  test('[P1] AC-1 removing the chip focuses the h1, and Back and Forward restore the scope from the URL', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server, DUNE_ID))
    const main = page.getByRole('main')
    const nav = page.getByRole('banner').getByRole('navigation')
    await expect(nav.getByRole('link', { name: 'Card notes', exact: true })).toHaveAttribute('aria-current', 'page')

    await main.getByRole('button', { name: 'Remove In Dune', exact: true }).click()
    await expect(page).toHaveURL(cardNotesPage(server))
    await expect(main.getByRole('heading', { level: 1 })).toBeFocused()
    await expect(groupHeadings(page)).toHaveCount(3)

    await page.goBack()
    await expect(page).toHaveURL(cardNotesPage(server, DUNE_ID))
    await expect(scopeChip(page, 'Dune')).toBeVisible()
    await expect(groupHeadings(page)).toHaveText(['Dune'])

    await page.goForward()
    await expect(scopeChip(page, 'Dune')).toBeHidden()
    await expect(groupHeadings(page)).toHaveCount(3)
  })

  test('[P1] AC-6 an edit from a searched block beyond the first three refocuses its Edit', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const block = cardNotesBlock(page, 4)
    await searchField(block).fill('mystery')
    const mystery = noteItem(block, 'The mystery of life isn’t a problem to solve.')
    await editOf(mystery).click()
    const panel = notePanel(page, 'Edit card note')
    await panel.getByRole('textbox', { name: 'Note', exact: true }).fill('The mystery of life is to be lived.')
    await panel.getByRole('button', { name: 'Save note', exact: true }).click()
    await expect(panel).toBeHidden()
    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(editOf(noteItem(block, 'The mystery of life is to be lived.'))).toBeFocused()

    // "See all card notes" only with notes; the heading's count stays the total.
    await expect(block.getByRole('link', { name: 'See all card notes', exact: true })).toBeVisible()
    await page.goto(`${server.url}/book/${EMMA_ID}`)
    const empty = page.getByRole('main').getByRole('region', { name: 'Card notes', exact: true })
    await expect(empty.getByRole('link', { name: 'See all card notes', exact: true })).toHaveCount(0)
  })

  test('[P2] axe finds nothing on the Card notes page (unscoped, scoped, searching, empty) or the searched block, in both themes', async ({
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
      const main = page.getByRole('main')
      await expect(notes(main)).toHaveCount(7)
      expect(await axe(`${colorScheme} unscoped`)).toEqual([])

      await searchField(main).fill('ice')
      await expect(main.locator('mark')).toHaveCount(2)
      expect(await axe(`${colorScheme} searching`)).toEqual([])

      await page.goto(cardNotesPage(server, DUNE_ID))
      await expect(scopeChip(page, 'Dune')).toBeVisible()
      expect(await axe(`${colorScheme} scoped`)).toEqual([])

      await page.goto(cardNotesPage(server, EMMA_ID))
      await expect(main.getByText('No card notes yet.', { exact: true })).toBeVisible()
      expect(await axe(`${colorScheme} empty`)).toEqual([])

      await page.goto(`${server.url}/book/${DUNE_ID}`)
      const block = cardNotesBlock(page, 4)
      await searchField(block).fill('the')
      await expect(notes(block)).toHaveCount(4)
      expect(await axe(`${colorScheme} searched block`)).toEqual([])
    }
  })
})
