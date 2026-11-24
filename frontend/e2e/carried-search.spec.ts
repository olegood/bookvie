// Story 14.5 Keep the search when I open a box and come back. Text typed on the
// shelf goes into the box it opens (only its matches, in <mark>, "3 notes
// match." once focus is on the h1), and Back from the open box, or removing
// its "In X" chip, brings the open box's latest text out to the shelf, faded
// and lifted for it at once, with the shelf sentence announced once. Every
// other way in starts empty, and the text is never in the URL, in
// localStorage or in history.state (AD-7, AR65). The decision itself is
// unit-tested under <StrictMode> in src/lib/carriedSearch.test.ts.
// fixtures.ts stores "list" before every other spec; this one turns that off.

import { scrollToY } from './back-to-top.ts'
import { recordStatus, watchFocusAtStatus, focusAtStatus } from './card-note-add-another.ts'
import { editOf, noteItem } from './card-note-keys.ts'
import {
  boxFrames,
  boxLinks,
  boxOfBook,
  boxStates,
  boxTrack,
  cardNotesPage,
  HABIT_BOXES,
  HABIT_COUNT_LINE,
  HABIT_SHELF,
  searchField,
  viewButton,
} from './card-note-boxes.ts'
import {
  announced,
  AT_REST,
  chip,
  FADE,
  H1,
  HABIT_LINE,
  HABIT_STATE,
  HABITS_LINE,
  HABITS_STATE,
  LIFT,
  notes,
  searchTheShelf,
} from './carried-search.ts'
import { mainNav } from './dev-mode.ts'
import { expect, test } from './fixtures.ts'
import { afterAnnounceDelay } from './stats.ts'

const [ATOMIC, , REFACTORING, TINY, WALDEN] = HABIT_BOXES

test.describe('Story 14.5 Keep the search when I open a box and come back (ATDD)', () => {
  test.use({ cardNotesView: null, viewport: { width: 1280, height: 400 } })

  test('[P0] AC-1 opening a box with "habit" on the shelf opens it with "habit" applied: only its matches, in <mark>, focus on the h1, at the top, "3 notes match." once; a faded box reads "No card notes contain “habit”." and announces "0 notes match."; the URL has no search text', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    await searchTheShelf(page, cardNotesPage(server), 'habit', HABIT_LINE)
    await recordStatus(page)
    await watchFocusAtStatus(page)
    // At 400px the shelf scrolls 76px (measured): open the box from the bottom.
    await scrollToY(page, 'bottom')
    await boxOfBook(page, ATOMIC.id).click()
    await expect(chip(page, ATOMIC.title)).toBeVisible()

    await expect(searchField(page)).toHaveValue('habit')

    // Exactly as if typed there: Atomic Habits's 3 matching notes of 12, each match in <mark>.
    await expect(notes(page)).toHaveCount(ATOMIC.matches)
    await expect(page.getByRole('main').locator('mark')).toHaveText([/^habit$/i, /^habit$/i, /^habit$/i])
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeFocused()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    await expect.poll(() => announced(page)).toEqual(['3 notes match.'])
    await afterAnnounceDelay(page)
    expect(await announced(page)).toEqual(['3 notes match.'])
    expect(await focusAtStatus(page)).toEqual([{ text: '3 notes match.', focused: H1 }])
    await expect(page).toHaveURL(cardNotesPage(server, ATOMIC.id))

    // A faded box: no match, the pile stays, "0 notes match." once.
    await searchTheShelf(page, cardNotesPage(server), 'habit', HABIT_LINE)
    await recordStatus(page)
    await watchFocusAtStatus(page)
    await boxOfBook(page, REFACTORING.id).click()
    await expect(chip(page, REFACTORING.title)).toBeVisible()
    await expect(searchField(page)).toHaveValue('habit')
    await expect(page.getByRole('main').getByText('No card notes contain “habit”.', { exact: true })).toBeVisible()
    await expect(notes(page)).toHaveCount(0)
    await expect(
      page.getByRole('main').getByRole('button', { name: 'Go through as a pile', exact: true }),
    ).toBeVisible()
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeFocused()
    await expect.poll(() => announced(page)).toEqual(['0 notes match.'])
    await afterAnnounceDelay(page)
    expect(await focusAtStatus(page)).toEqual([{ text: '0 notes match.', focused: H1 }])
    await expect(page).toHaveURL(cardNotesPage(server, REFACTORING.id))
  })

  test('[P0] AC-2 Back from a box opened with "habit" and changed to "habits" returns to the shelf in Boxes with "habits", faded and lifted for it, focus on the h1, at the top, the shelf sentence once; a cleared field comes back empty with every box at rest', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    await searchTheShelf(page, cardNotesPage(server), 'habit', HABIT_LINE)
    // The shelf is left scrolled to its bottom (76px), which the browser restores on Back today.
    await scrollToY(page, 'bottom')
    await boxOfBook(page, ATOMIC.id).click()
    await expect(chip(page, ATOMIC.title)).toBeVisible()
    await searchField(page).fill('habits')
    await expect(page.getByRole('status')).toHaveText('1 note matches.')
    await scrollToY(page, 'bottom')
    await recordStatus(page)
    await watchFocusAtStatus(page)
    await page.goBack()
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)

    await expect(searchField(page)).toHaveValue('habits')

    await expect.poll(() => boxStates(page)).toEqual(HABITS_STATE)
    await expect(page.getByRole('main').getByText(HABITS_LINE, { exact: true })).toBeVisible()
    await expect(viewButton(page, 'Boxes')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeFocused()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    await expect.poll(() => announced(page)).toEqual([HABITS_LINE])
    await afterAnnounceDelay(page)
    expect(await announced(page)).toEqual([HABITS_LINE])
    expect(await focusAtStatus(page)).toEqual([{ text: HABITS_LINE, focused: H1 }])
    await expect(page).toHaveURL(cardNotesPage(server))

    // Into Tiny Habits with "habits", clear the field there, then Back: empty, every box at rest.
    await boxOfBook(page, TINY.id).click()
    await expect(chip(page, TINY.title)).toBeVisible()
    await expect(searchField(page)).toHaveValue('habits')
    // Its own carried count first, so it can't land in the recording below.
    await expect(page.getByRole('status')).toHaveText('4 notes match.')
    await searchField(page).fill('')
    await expect(notes(page)).toHaveCount(TINY.notes)
    await recordStatus(page)
    await page.goBack()
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    await expect(searchField(page)).toHaveValue('')
    await expect.poll(() => boxStates(page)).toEqual(AT_REST)
    await expect(page.getByRole('main').getByText(HABIT_COUNT_LINE, { exact: true })).toBeVisible()
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeFocused()
    await afterAnnounceDelay(page)
    expect(await announced(page)).toEqual([])
  })

  test('[P1] AC-3 removing the "In X" chip of a box entered by "See all card notes" with "habit" pushes /card-notes with "habit", faded and lifted, announced once; Back returns to the open box with an empty field', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    await page.goto(`${server.url}/book/${ATOMIC.id}`)
    await page.getByRole('main').getByRole('link', { name: 'See all card notes', exact: true }).click()
    await expect(chip(page, ATOMIC.title)).toBeVisible()
    await searchField(page).fill('habit')
    await expect(page.getByRole('status')).toHaveText('3 notes match.')
    await recordStatus(page)
    await watchFocusAtStatus(page)
    await page.getByRole('main').getByRole('button', { name: 'Remove In Atomic Habits', exact: true }).click()
    await expect(page).toHaveURL(cardNotesPage(server))
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)

    await expect(searchField(page)).toHaveValue('habit')

    await expect.poll(() => boxStates(page)).toEqual(HABIT_STATE)
    await expect(page.getByRole('main').getByText(HABIT_LINE, { exact: true })).toBeVisible()
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeFocused()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    await expect.poll(() => announced(page)).toEqual([HABIT_LINE])
    await afterAnnounceDelay(page)
    expect(await focusAtStatus(page)).toEqual([{ text: HABIT_LINE, focused: H1 }])

    // The chip pushed /card-notes: Back returns to the open box, which starts empty.
    await page.goBack()
    await expect(page).toHaveURL(cardNotesPage(server, ATOMIC.id))
    await expect(chip(page, ATOMIC.title)).toBeVisible()
    await expect(searchField(page)).toHaveValue('')
    await expect(notes(page)).toHaveCount(ATOMIC.notes)
  })

  test('[P0] AC-4 the nav link from the shelf, Forward, a reload, Back from another page and a typed URL all start empty with nothing announced; the text is never in the URL, localStorage or history.state', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    await searchTheShelf(page, cardNotesPage(server), 'habit', HABIT_LINE)
    await recordStatus(page)
    await mainNav(page).getByRole('link', { name: 'Card notes', exact: true }).click()

    await expect(searchField(page)).toHaveValue('')

    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    await expect.poll(() => boxStates(page)).toEqual(AT_REST)
    await expect(page.getByRole('main').getByText(HABIT_COUNT_LINE, { exact: true })).toBeVisible()
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeFocused()
    await afterAnnounceDelay(page)
    expect(await announced(page)).toEqual([])

    // Carried into a box: the text is in React state only.
    await searchField(page).fill('habit')
    await boxOfBook(page, ATOMIC.id).click()
    await expect(chip(page, ATOMIC.title)).toBeVisible()
    await expect(searchField(page)).toHaveValue('habit')
    expect(page.url()).not.toMatch(/habit/i)
    expect(await page.evaluate(() => JSON.stringify(window.history.state))).not.toMatch(/habit/i)
    expect(
      await page.evaluate(() => Object.entries(window.localStorage).map(([key, value]) => `${key}=${value}`)),
    ).not.toContainEqual(expect.stringMatching(/habit/i))

    // Back carries it to the shelf; Forward to the open box starts empty.
    await page.goBack()
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    await expect(searchField(page)).toHaveValue('habit')
    await page.goForward()
    await expect(chip(page, ATOMIC.title)).toBeVisible()
    await expect(searchField(page)).toHaveValue('')
    await expect(notes(page)).toHaveCount(ATOMIC.notes)

    // A reload of the same history entry starts empty.
    await searchField(page).fill('habit')
    await page.reload()
    await expect(chip(page, ATOMIC.title)).toBeVisible()
    await expect(searchField(page)).toHaveValue('')

    // Back to the shelf from another page starts empty.
    await page.goto(cardNotesPage(server))
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    await searchField(page).fill('habit')
    await mainNav(page).getByRole('link', { name: 'Catalog', exact: true }).click()
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText('Catalog')
    await page.goBack()
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    await expect(searchField(page)).toHaveValue('')
    await expect.poll(() => boxStates(page)).toEqual(AT_REST)

    // A typed URL starts empty.
    await searchField(page).fill('habit')
    await page.goto(cardNotesPage(server, ATOMIC.id))
    await expect(chip(page, ATOMIC.title)).toBeVisible()
    await expect(searchField(page)).toHaveValue('')
  })

  test('[P1] AC-6 a carried search arriving on the shelf by Back renders the boxes in their search state from their first frame, with no lift or fade animation', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    await searchTheShelf(page, cardNotesPage(server), 'habit', HABIT_LINE)
    await expect.poll(() => boxStates(page)).toEqual(HABIT_STATE)
    await boxOfBook(page, ATOMIC.id).click()
    await expect(chip(page, ATOMIC.title)).toBeVisible()
    // Sampled from before Back until well after the boxes are drawn (the transition is 150ms).
    const sampling = boxFrames(page, 1500)
    await page.goBack()
    const frames = await sampling

    expect(new Set(boxTrack(frames, REFACTORING.id).map((f) => f.opacity))).toEqual(new Set([FADE]))

    expect(new Set(boxTrack(frames, ATOMIC.id).map((f) => f.lift))).toEqual(new Set([LIFT]))
    expect(new Set(boxTrack(frames, REFACTORING.id).map((f) => f.lift))).toEqual(new Set([0]))
    // The boxes were drawn for most of the sample, so "every frame" isn't a handful.
    expect(boxTrack(frames, REFACTORING.id).length).toBeGreaterThan(30)
    await expect(searchField(page)).toHaveValue('habit')
  })

  test('[P1] AC-5 a search carried into a box whose only note is then deleted is dropped: removing the chip shows the shelf with an empty field and nothing announced', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    await searchTheShelf(page, cardNotesPage(server), 'woods', '1 card note in 1 Book contains “woods”.')
    await boxOfBook(page, WALDEN.id).click()
    await expect(chip(page, WALDEN.title)).toBeVisible()
    await expect(searchField(page)).toHaveValue('woods')
    await expect(page.getByRole('status')).toHaveText('1 note matches.')

    const main = page.getByRole('main')
    await editOf(noteItem(main, 'Walden note 01: a habit of the woods.')).click()
    await page
      .getByRole('dialog', { name: 'Edit card note', exact: true })
      .getByRole('button', { name: 'Delete', exact: true })
      .click()
    await page
      .getByRole('alertdialog', { name: 'Delete this card note?', exact: true })
      .getByRole('button', { name: 'Delete card note', exact: true })
      .click()
    await expect(main.getByText('No card notes yet.', { exact: true })).toBeVisible()
    await afterAnnounceDelay(page)
    await recordStatus(page)

    await main.getByRole('button', { name: `Remove In ${WALDEN.title}`, exact: true }).click()
    await expect(page).toHaveURL(cardNotesPage(server))
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length - 1)
    await expect(searchField(page)).toHaveValue('')
    await expect.poll(() => boxStates(page)).toEqual(AT_REST.filter(([id]) => id !== WALDEN.id))
    await afterAnnounceDelay(page)
    expect(await announced(page)).toEqual([])
  })
})
