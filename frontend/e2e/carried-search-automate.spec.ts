// Story 14.5 Keep the search when I open a box and come back, beyond the ATDD
// leaves (carried-search.spec.ts): a box opened by Enter and the singular
// count, Back with a text that matches nothing, the chip in List view and from
// the other ways into an open box, the remaining ways that start empty, a
// fresh body for every history entry of the same scope (the nav link's
// REPLACE and a two-step Back), the chip's arrival drawn at once, reduced
// motion and dark, and axe on the open box. Epic 14 retro item 98 adds four
// stale-cache leaves: an edit in a box, then Back, announces the refetched
// count; a stale empty open box keeps the carried text; and typing, or opening
// Edit, before the carried count speaks drops it. fixtures.ts stores
// "list" before every spec; the Boxes leaves turn that off.

import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { scrollToY } from './back-to-top.ts'
import { focusAtStatus, noteField, recordStatus, seeCardNotes, watchFocusAtStatus } from './card-note-add-another.ts'
import {
  boxFrames,
  boxLinks,
  boxOfBook,
  boxStates,
  boxTrack,
  cardNotesPage,
  groupHeadings,
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
import { addCardNote, cardNotePanel, editOf, editPanel, noteItem, SAVED } from './card-note-keys.ts'
import { mainNav } from './dev-mode.ts'
import { expect, test } from './fixtures.ts'
import { bookId } from './library.ts'
import { pile, pileOpener } from './pile.ts'
import { AXE_TAGS, afterAnnounceDelay } from './stats.ts'

const [ATOMIC, , REFACTORING, , WALDEN] = HABIT_BOXES

/** HABIT_SHELF with Atomic Habits as the Main book, so Home's card offers "See card notes, 12 notes". */
const ATOMIC_ON_HOME = {
  ...HABIT_SHELF,
  mainBookId: ATOMIC.id,
  books: HABIT_SHELF.books.map((b) => (b.id === ATOMIC.id ? { ...b, readings: [{ currentPage: 100 }] } : b)),
}

/** A Main book with no notes yet, beside HABIT_SHELF: Home's card offers "See card notes" and Add card note. */
const EMPTY_MAIN = { id: bookId(16), title: 'Emma', authors: ['Jane Austen'], pages: 474 }
const EMPTY_MAIN_ON_HOME = {
  ...HABIT_SHELF,
  mainBookId: EMPTY_MAIN.id,
  books: [...HABIT_SHELF.books, { ...EMPTY_MAIN, readings: [{ currentPage: 10 }] }],
}

/** How long the stale-cache leaves hold a view's GET, so the cached copy shows for a while first. */
const HELD_MS = 1_500

/** Holds every GET `matches` accepts for HELD_MS before it goes to the server. */
async function holdViewGets(page: Page, matches: (url: string) => boolean): Promise<void> {
  await page.route('**/api/views/card-notes*', async (route) => {
    if (route.request().method() === 'GET' && matches(route.request().url())) {
      await new Promise((resolve) => setTimeout(resolve, HELD_MS))
    }
    await route.continue()
  })
}

/** Inside the search pause (500 ms): the count is still waiting. */
const INSIDE_THE_PAUSE_MS = 400
/** Past the search pause and announce's tick together. */
const PAST_THE_PAUSE_MS = 1_000

/** A text no HABIT_SHELF note holds. */
const NO_MATCH = 'zqx'

function h1(page: Page) {
  return page.getByRole('main').getByRole('heading', { level: 1 })
}

/** The unscoped `card-notes` view's GET, the one the shelf reads. */
function isShelfView(url: string): boolean {
  const { pathname, search } = new URL(url)
  return pathname === '/api/views/card-notes' && search === ''
}

test.describe('Story 14.5 Keep the search when I open a box and come back (automate, Boxes)', () => {
  test.use({ cardNotesView: null, viewport: { width: 1280, height: 400 } })

  test('[P1] AC-1 Enter on a focused box carries the text like a click, and Walden announces the singular "1 note matches." once with the h1 focused', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    await searchTheShelf(page, cardNotesPage(server), 'habit', HABIT_LINE)
    await recordStatus(page)
    await watchFocusAtStatus(page)
    await boxOfBook(page, WALDEN.id).focus()
    await page.keyboard.press('Enter')
    await expect(chip(page, WALDEN.title)).toBeVisible()

    await expect(searchField(page)).toHaveValue('habit')
    await expect(notes(page)).toHaveCount(WALDEN.matches)
    await expect(page.getByRole('main').locator('mark')).toHaveText([/^habit$/i])
    await expect(h1(page)).toBeFocused()
    await expect.poll(() => announced(page)).toEqual(['1 note matches.'])
    await afterAnnounceDelay(page)
    expect(await focusAtStatus(page)).toEqual([{ text: '1 note matches.', focused: H1 }])
  })

  test('[P1] AC-2 Back with a text that matches nothing shows every box faded and announces "No card notes contain “…”." once', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    await searchTheShelf(page, cardNotesPage(server), 'habit', HABIT_LINE)
    await boxOfBook(page, ATOMIC.id).click()
    await expect(chip(page, ATOMIC.title)).toBeVisible()
    await searchField(page).fill(NO_MATCH)
    await expect(page.getByRole('status')).toHaveText('0 notes match.')
    await recordStatus(page)
    await watchFocusAtStatus(page)
    await page.goBack()
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)

    const none = `No card notes contain “${NO_MATCH}”.`
    await expect(searchField(page)).toHaveValue(NO_MATCH)
    await expect.poll(() => boxStates(page)).toEqual(HABIT_BOXES.map((b) => [b.id, 0, FADE]))
    await expect(page.getByRole('main').getByText(none, { exact: true })).toBeVisible()
    await expect.poll(() => announced(page)).toEqual([none])
    await afterAnnounceDelay(page)
    expect(await focusAtStatus(page)).toEqual([{ text: none, focused: H1 }])
  })

  test("[P1] item 98 an edit in the open box, then Back, announces the shelf's refetched count once, never the cached one", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    await searchTheShelf(page, cardNotesPage(server), 'habit', HABIT_LINE)
    await boxOfBook(page, ATOMIC.id).click()
    await expect(chip(page, ATOMIC.title)).toBeVisible()
    await expect(searchField(page)).toHaveValue('habit')

    // Atomic Habits's note 02 ("Every HABIT worth keeping.") stops matching: the shelf now holds 16.
    const main = page.getByRole('main')
    await editOf(noteItem(main, 'AH note 02: Every HABIT worth keeping.')).click()
    await noteField(editPanel(page)).fill('AH note 02: a line worth keeping.')
    await editPanel(page).getByRole('button', { name: 'Save note', exact: true }).click()
    await expect(editPanel(page)).toBeHidden()
    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(notes(page)).toHaveCount(ATOMIC.matches - 1)

    // The shelf's cached view still holds 17; its refetch is held, so the stale copy shows first.
    await holdViewGets(page, isShelfView)
    await recordStatus(page)
    await watchFocusAtStatus(page)
    await page.goBack()
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    await expect(searchField(page)).toHaveValue('habit')
    // The stale window: the cached shelf shows at once, its 17 not yet refetched.
    await expect(page.getByRole('main').getByText(HABIT_LINE, { exact: true })).toBeVisible()

    const fresh = '16 card notes in 4 Books contain “habit”.'
    await expect(page.getByRole('main').getByText(fresh, { exact: true })).toBeVisible()
    await expect.poll(() => announced(page)).toEqual([fresh])
    await afterAnnounceDelay(page)
    expect(await announced(page)).toEqual([fresh])
    expect(await focusAtStatus(page)).toEqual([{ text: fresh, focused: H1 }])
  })

  test('[P1] item 98 a stale empty open box keeps the carried search: the refetched note shows marked, "1 note matches." once', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(EMPTY_MAIN_ON_HOME)
    // Home's "See card notes" caches Emma's open box empty.
    await page.goto(server.url)
    await seeCardNotes(page, 0).click()
    await expect(chip(page, EMPTY_MAIN.title)).toBeVisible()
    await expect(page.getByRole('main').getByText('No card notes yet.', { exact: true })).toBeVisible()

    // Back on Home, a note for Emma: the cached empty view is now stale, not refetched (inactive).
    await mainNav(page).getByRole('link', { name: 'Home', exact: true }).click()
    await addCardNote(page).click()
    await noteField(cardNotePanel(page)).fill('Emma note 01: a habit of matchmaking.')
    await cardNotePanel(page).getByRole('button', { name: 'Save note', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(seeCardNotes(page, 1)).toBeVisible()

    // The shelf, client-side so the cache stays: "habit", then Emma's box with its refetch held.
    await mainNav(page).getByRole('link', { name: 'Card notes', exact: true }).click()
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length + 1)
    await searchField(page).fill('habit')
    await expect(page.getByRole('status')).toHaveText('18 card notes in 5 Books contain “habit”.')
    await holdViewGets(page, (url) => new URL(url).searchParams.get('book') === EMPTY_MAIN.id)
    await recordStatus(page)
    await boxOfBook(page, EMPTY_MAIN.id).click()
    await expect(chip(page, EMPTY_MAIN.title)).toBeVisible()
    // The stale window: the cached empty view shows first.
    await expect(page.getByRole('main').getByText('No card notes yet.', { exact: true })).toBeVisible()

    await expect(notes(page)).toHaveCount(1)
    await expect(searchField(page)).toHaveValue('habit')
    await expect(page.getByRole('main').locator('mark')).toHaveText(['habit'])
    await expect.poll(() => announced(page)).toEqual(['1 note matches.'])
    await afterAnnounceDelay(page)
    expect(await announced(page)).toEqual(['1 note matches.'])
  })

  test('[P1] item 98 typing before a carried search is announced drops it: only the typed count speaks', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    await searchTheShelf(page, cardNotesPage(server), 'habit', HABIT_LINE)
    await boxOfBook(page, ATOMIC.id).click()
    await expect(chip(page, ATOMIC.title)).toBeVisible()
    await expect(searchField(page)).toHaveValue('habit')
    await expect(page.getByRole('status')).toHaveText('3 notes match.')

    // Back with the shelf's refetch held, and "habits" typed before it settles.
    await holdViewGets(page, isShelfView)
    const released = page.waitForResponse((response) => isShelfView(response.url()))
    await recordStatus(page)
    await page.goBack()
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    await searchField(page).fill('habits')
    await released

    await expect(page.getByRole('main').getByText(HABITS_LINE, { exact: true })).toBeVisible()
    await expect.poll(() => announced(page)).toEqual([HABITS_LINE])
    // Past where a late carried line would land (just after the release), then announce's tick.
    await page.evaluate((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)), PAST_THE_PAUSE_MS)
    await afterAnnounceDelay(page)
    expect(await announced(page)).toEqual([HABITS_LINE])
  })

  test('[P1] item 98 opening Edit before a carried search is announced drops it: the count never speaks over the panel', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    // Atomic Habits's open box, visited once so its view is cached, then the shelf again.
    await searchTheShelf(page, cardNotesPage(server), 'habit', HABIT_LINE)
    await boxOfBook(page, ATOMIC.id).click()
    await expect(page.getByRole('status')).toHaveText('3 notes match.')
    await page.goBack()
    await expect(page.getByRole('status')).toHaveText(HABIT_LINE)

    // Into the box again with its refetch held, and Edit opened on the cached copy before it settles.
    await holdViewGets(page, (url) => new URL(url).searchParams.get('book') === ATOMIC.id)
    const released = page.waitForResponse((response) => new URL(response.url()).searchParams.get('book') === ATOMIC.id)
    await recordStatus(page)
    await boxOfBook(page, ATOMIC.id).click()
    await expect(chip(page, ATOMIC.title)).toBeVisible()
    await expect(searchField(page)).toHaveValue('habit')
    await editOf(noteItem(page.getByRole('main'), 'AH note 02: Every HABIT worth keeping.')).click()
    await expect(editPanel(page)).toBeVisible()
    await released

    // Past where a late carried line would land (just after the release), then announce's tick.
    await page.evaluate((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)), PAST_THE_PAUSE_MS)
    await afterAnnounceDelay(page)
    await expect(editPanel(page)).toBeVisible()
    expect(await announced(page)).not.toContain('3 notes match.')
  })

  test('[P1] AC-3 the chip carries the text when the open box was entered by a box, and by Home\'s "See card notes"; Back from the chip\'s shelf to a box-entered open box starts empty', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(ATOMIC_ON_HOME)
    const remove = page.getByRole('main').getByRole('button', { name: `Remove In ${ATOMIC.title}`, exact: true })

    // Entered by a box with "habit", changed to "habits" there, then the chip.
    await searchTheShelf(page, cardNotesPage(server), 'habit', HABIT_LINE)
    await boxOfBook(page, ATOMIC.id).click()
    await expect(chip(page, ATOMIC.title)).toBeVisible()
    await searchField(page).fill('habits')
    await expect(page.getByRole('status')).toHaveText('1 note matches.')
    await recordStatus(page)
    await remove.click()
    await expect(page).toHaveURL(cardNotesPage(server))
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    await expect(searchField(page)).toHaveValue('habits')
    await expect.poll(() => boxStates(page)).toEqual(HABITS_STATE)
    await expect.poll(() => announced(page)).toEqual([HABITS_LINE])
    // The chip's push has no openedFrom: Back to the open box starts empty.
    await page.goBack()
    await expect(chip(page, ATOMIC.title)).toBeVisible()
    await expect(searchField(page)).toHaveValue('')
    await expect(notes(page)).toHaveCount(ATOMIC.notes)

    // Entered by Home's "See card notes", "habit" typed there, then the chip.
    await page.goto(server.url)
    await seeCardNotes(page, ATOMIC.notes).click()
    await expect(chip(page, ATOMIC.title)).toBeVisible()
    await searchField(page).fill('habit')
    await expect(page.getByRole('status')).toHaveText('3 notes match.')
    await recordStatus(page)
    await watchFocusAtStatus(page)
    await remove.click()
    await expect(page).toHaveURL(cardNotesPage(server))
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    await expect(searchField(page)).toHaveValue('habit')
    await expect.poll(() => boxStates(page)).toEqual(HABIT_STATE)
    await expect.poll(() => announced(page)).toEqual([HABIT_LINE])
    await afterAnnounceDelay(page)
    expect(await focusAtStatus(page)).toEqual([{ text: HABIT_LINE, focused: H1 }])
  })

  test('[P1] AC-4 a box opened with an empty field, Home\'s "See card notes" and Book detail\'s "See all card notes" after text typed on the shelf, and the nav link from the open box all start empty with nothing announced', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(ATOMIC_ON_HOME)
    // Book detail is reached from Catalog's List view.
    await page.addInitScript(() => window.localStorage.setItem('bookvie.catalogView', 'list'))

    // A box opened with an empty field.
    await page.goto(cardNotesPage(server))
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    await recordStatus(page)
    await boxOfBook(page, ATOMIC.id).click()
    await expect(chip(page, ATOMIC.title)).toBeVisible()
    await expect(searchField(page)).toHaveValue('')
    await expect(notes(page)).toHaveCount(ATOMIC.notes)
    await afterAnnounceDelay(page)
    expect(await announced(page)).toEqual([])

    // "habit" typed on the shelf, then Home's "See card notes".
    await searchTheShelf(page, cardNotesPage(server), 'habit', HABIT_LINE)
    await mainNav(page).getByRole('link', { name: 'Home', exact: true }).click()
    await recordStatus(page)
    await seeCardNotes(page, ATOMIC.notes).click()
    await expect(chip(page, ATOMIC.title)).toBeVisible()
    await expect(searchField(page)).toHaveValue('')
    await expect(notes(page)).toHaveCount(ATOMIC.notes)
    await afterAnnounceDelay(page)
    expect(await announced(page)).toEqual([])

    // "habit" typed on the shelf, then Catalog, the Book, and its "See all card notes".
    await searchTheShelf(page, cardNotesPage(server), 'habit', HABIT_LINE)
    await mainNav(page).getByRole('link', { name: 'Catalog', exact: true }).click()
    await page.getByRole('table').getByRole('link', { name: ATOMIC.title, exact: true }).click()
    await recordStatus(page)
    await page.getByRole('main').getByRole('link', { name: 'See all card notes', exact: true }).click()
    await expect(chip(page, ATOMIC.title)).toBeVisible()
    await expect(searchField(page)).toHaveValue('')
    await expect(notes(page)).toHaveCount(ATOMIC.notes)
    await afterAnnounceDelay(page)
    expect(await announced(page)).toEqual([])

    // Carried into a box, then the nav link from there: a push without the marker.
    await searchTheShelf(page, cardNotesPage(server), 'habit', HABIT_LINE)
    await boxOfBook(page, ATOMIC.id).click()
    await expect(chip(page, ATOMIC.title)).toBeVisible()
    await expect(searchField(page)).toHaveValue('habit')
    await expect(page.getByRole('status')).toHaveText('3 notes match.')
    await recordStatus(page)
    await mainNav(page).getByRole('link', { name: 'Card notes', exact: true }).click()
    await expect(page).toHaveURL(cardNotesPage(server))
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    await expect(searchField(page)).toHaveValue('')
    await expect.poll(() => boxStates(page)).toEqual(AT_REST)
    await expect(page.getByRole('main').getByText(HABIT_COUNT_LINE, { exact: true })).toBeVisible()
    await afterAnnounceDelay(page)
    expect(await announced(page)).toEqual([])
  })

  test('[P0] AC-5 the nav link on the shelf gives a fresh body: back at the top, the view refetched, and a count still waiting is never announced', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    // The clock is paused only once the shelf is drawn and scrolled (scrollToY waits on frames).
    const start = new Date('2026-11-10T10:00:00+01:00')
    await page.clock.install({ time: start })
    await page.goto(cardNotesPage(server))
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    expect(await scrollToY(page, 'bottom')).toBeGreaterThan(0)
    await page.clock.pauseAt(new Date(start.getTime() + 60_000))
    await recordStatus(page)

    // "habit" typed, and the nav link clicked inside the pause.
    await searchField(page).fill('habit')
    await page.clock.runFor(INSIDE_THE_PAUSE_MS)
    expect(await announced(page)).toEqual([])
    const refetch = page.waitForRequest((request) => request.method() === 'GET' && isShelfView(request.url()))
    await mainNav(page).getByRole('link', { name: 'Card notes', exact: true }).click()
    await refetch

    await expect(searchField(page)).toHaveValue('')
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    await expect(h1(page)).toBeFocused()
    await page.clock.runFor(PAST_THE_PAUSE_MS)
    expect(await announced(page)).toEqual([])
    await expect(page.getByRole('main').getByText(HABIT_COUNT_LINE, { exact: true })).toBeVisible()
  })

  test('[P1] AC-6 a carried search arriving on the shelf by the chip renders the boxes in their search state from their first frame', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    await searchTheShelf(page, cardNotesPage(server), 'habit', HABIT_LINE)
    await boxOfBook(page, ATOMIC.id).click()
    await expect(chip(page, ATOMIC.title)).toBeVisible()
    await expect(searchField(page)).toHaveValue('habit')
    // Sampled from before the click until well after the boxes are drawn (the transition is 150ms).
    const sampling = boxFrames(page, 1500)
    await page
      .getByRole('main')
      .getByRole('button', { name: `Remove In ${ATOMIC.title}`, exact: true })
      .click()
    const frames = await sampling

    expect(new Set(boxTrack(frames, REFACTORING.id).map((f) => f.opacity))).toEqual(new Set([FADE]))
    expect(new Set(boxTrack(frames, ATOMIC.id).map((f) => f.lift))).toEqual(new Set([LIFT]))
    expect(new Set(boxTrack(frames, REFACTORING.id).map((f) => f.lift))).toEqual(new Set([0]))
    expect(boxTrack(frames, REFACTORING.id).length).toBeGreaterThan(30)
    await expect(searchField(page)).toHaveValue('habit')
  })

  test('[P2] a carried arrival by Back under reduced motion and in dark is drawn in its search state from its first frame', async ({
    page,
    seededServer,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' })
    const server = await seededServer(HABIT_SHELF)
    await searchTheShelf(page, cardNotesPage(server), 'habit', HABIT_LINE)
    await expect.poll(() => boxStates(page)).toEqual(HABIT_STATE)
    await boxOfBook(page, ATOMIC.id).click()
    await expect(chip(page, ATOMIC.title)).toBeVisible()
    const sampling = boxFrames(page, 1500)
    await page.goBack()
    const frames = await sampling

    expect(new Set(boxTrack(frames, REFACTORING.id).map((f) => f.opacity))).toEqual(new Set([FADE]))
    expect(new Set(boxTrack(frames, ATOMIC.id).map((f) => f.lift))).toEqual(new Set([LIFT]))
    expect(boxTrack(frames, REFACTORING.id).length).toBeGreaterThan(30)
    await expect.poll(() => boxStates(page)).toEqual(HABIT_STATE)
  })

  test('[P2] the open box arriving with a carried search passes axe in light and dark', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await searchTheShelf(page, cardNotesPage(server), 'habit', HABIT_LINE)
      await boxOfBook(page, ATOMIC.id).click()
      await expect(chip(page, ATOMIC.title)).toBeVisible()
      await expect(searchField(page)).toHaveValue('habit')
      await expect(page.getByRole('main').locator('mark')).toHaveCount(ATOMIC.matches)

      const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
      expect(results.violations.map(({ id, nodes }) => `${colorScheme}: ${id} (${nodes.length})`)).toEqual([])
    }
  })
})

test.describe('Story 14.5 Keep the search when I open a box and come back (automate, List)', () => {
  // fixtures.ts stores "list": the remembered view is List.

  test('[P1] AC-2 in List view the chip carries "habit" into the grouped results: 17 notes, "17 notes match." once with the h1 focused', async ({
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
    await page
      .getByRole('main')
      .getByRole('button', { name: `Remove In ${ATOMIC.title}`, exact: true })
      .click()
    await expect(page).toHaveURL(cardNotesPage(server))

    await expect(searchField(page)).toHaveValue('habit')
    await expect(viewButton(page, 'List')).toHaveAttribute('aria-pressed', 'true')
    await expect(groupHeadings(page)).toHaveText(HABIT_BOXES.filter((b) => b.matches > 0).map((b) => b.title))
    await expect(notes(page)).toHaveCount(17)
    await expect(h1(page)).toBeFocused()
    await expect.poll(() => announced(page)).toEqual(['17 notes match.'])
    await afterAnnounceDelay(page)
    expect(await announced(page)).toEqual(['17 notes match.'])
    expect(await focusAtStatus(page)).toEqual([{ text: '17 notes match.', focused: H1 }])
  })

  test('[P1] AC-5 a two-step Back between two shelf entries (the same scope) gives a fresh body: an open pile is gone', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    // Three entries: the shelf, Home, the shelf again (the nav link from Home is a push).
    await page.goto(cardNotesPage(server))
    await expect(groupHeadings(page)).toHaveCount(HABIT_BOXES.length)
    await mainNav(page).getByRole('link', { name: 'Home', exact: true }).click()
    await expect(page).toHaveURL(`${server.url}/`)
    await mainNav(page).getByRole('link', { name: 'Card notes', exact: true }).click()
    await expect(groupHeadings(page)).toHaveCount(HABIT_BOXES.length)
    await pileOpener(page.getByRole('main')).first().click()
    await expect(pile(page, ATOMIC.title)).toBeVisible()

    // Two entries back at once, as Back's long-press menu does: the first shelf, same URL, another key.
    await page.evaluate(() => window.history.go(-2))
    await expect.poll(() => page.evaluate(() => (window.history.state as { idx: number }).idx)).toBe(0)

    await expect(pile(page, ATOMIC.title)).toHaveCount(0)
    await expect(page).toHaveURL(cardNotesPage(server))
    await expect(groupHeadings(page)).toHaveCount(HABIT_BOXES.length)
    await expect(h1(page)).toBeFocused()
  })
})
