// Story 4.4 Choose what to read next (ATDD red phase). Set as Up next on
// Book detail and in the spine popover: the `status` line and where focus
// lands, the routed 503's alert line below the button, the popover's
// "Replaces the current Up next." hint, and a paused Book moving from
// Waiting for you to Up next. What `set-up-next` stores (displacement, the
// no-op, the Main book refusal, TR8) is proven at API level in
// backend/tests/test_set_up_next.py.
//
// Activate a leaf by changing `test.skip(` to `test(`.

import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import {
  DUNE,
  DUNE_ID,
  LEFT_HAND,
  LEFT_HAND_ID,
  libraryBytes,
  rowTitles,
  storedBook,
  storedLibrary,
  upNextPane,
  waitingHeading,
  waitingPane,
} from './home.ts'
import { bookcase } from './bookcase.ts'
import { intentOf, requestsTo } from './intents.ts'

const SET_UP_NEXT = '/api/intents/set-up-next'
const COULDNT_SAVE = "Couldn't save. Your data wasn't changed."
const REPLACES = 'Replaces the current Up next.'

const FAHRENHEIT_ID = '9d4e7a10-2b3c-4d5e-8f60-718293a4b5c6'
const FAHRENHEIT = { id: FAHRENHEIT_ID, title: 'Fahrenheit 451', authors: ['Ray Bradbury'], pages: 187 }
const NEUROMANCER_ID = '1b6e2c4a-3d5f-4e7a-9b8c-0d1e2f3a4b5c'
const NEUROMANCER = { id: NEUROMANCER_ID, title: 'Neuromancer', authors: ['William Gibson'], pages: 271 }
const LEFT_HAND_READING_ID = '5a4b3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d'

/** Dune as the Main book at p.100 of 412. */
const DUNE_MAIN = { ...DUNE, readings: [{ startDate: '2026-10-01', currentPage: 100 }] }
/** The Left Hand of Darkness paused at p.120 of 330 since 5 October. */
const LEFT_HAND_WAITING = {
  ...LEFT_HAND,
  readings: [
    {
      id: LEFT_HAND_READING_ID,
      startDate: '2026-09-20',
      currentPage: 120,
      purpose: 'Gethen',
      pausedAt: '2026-10-05',
    },
  ],
}
/** Fahrenheit 451 paused at p.40 of 187 since 10 October. */
const FAHRENHEIT_WAITING = {
  ...FAHRENHEIT,
  readings: [{ startDate: '2026-10-02', currentPage: 40, pausedAt: '2026-10-10' }],
}

/** Book detail's own buttons, in `main`. */
function detailButton(page: Page, name: string): Locator {
  return page.getByRole('main').getByRole('button', { name, exact: true })
}

/** The Spine popover: a non-modal `dialog` named by the Book's title. */
function popover(page: Page, title: string): Locator {
  return page.getByRole('dialog', { name: title, exact: true })
}

/** A spine by its title and first author, whatever status its name ends with (Story 4.6 adds "Up next"). */
function spineOf(page: Page, titleAndAuthor: string): Locator {
  return bookcase(page)
    .getByRole('listitem')
    .getByRole('button', { name: new RegExp(`^${titleAndAuthor}, `) })
}

/**
 * Records, each time the `status` region gets text, that text and the
 * accessible name of the focused element at that moment: focus must land
 * before the line is set.
 */
async function watchStatus(page: Page): Promise<void> {
  await page.evaluate(() => {
    const region = document.querySelector('[role="status"]')
    if (region === null) throw new Error('no status region')
    const seen: { text: string; focused: string }[] = []
    ;(window as unknown as { statusSeen: typeof seen }).statusSeen = seen
    new MutationObserver(() => {
      const text = region.textContent ?? ''
      if (text === '') return
      const active = document.activeElement
      seen.push({ text, focused: active?.getAttribute('aria-label') ?? active?.textContent ?? '' })
    }).observe(region, { childList: true, characterData: true, subtree: true })
  })
}

async function statusSeen(page: Page): Promise<{ text: string; focused: string }[]> {
  return page.evaluate(() => (window as unknown as { statusSeen: { text: string; focused: string }[] }).statusSeen)
}

async function routeCouldntSave(page: Page): Promise<void> {
  await page.route(`**${SET_UP_NEXT}`, (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: { kind: 'couldnt_save', code: 'couldnt_save', message: COULDNT_SAVE } }),
    }),
  )
}

async function bottomOf(locator: Locator): Promise<number> {
  const box = await locator.boundingBox()
  if (box === null) throw new Error('not rendered')
  return box.y + box.height
}

async function topOf(locator: Locator): Promise<number> {
  const box = await locator.boundingBox()
  if (box === null) throw new Error('not rendered')
  return box.y
}

test.describe('Story 4.4 Choose what to read next (ATDD)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test.skip('[P0] AC-1 Set as Up next on Book detail makes the Book Up next, focuses the primary button, then says "X is Up next."', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ mainBookId: DUNE_ID, books: [DUNE_MAIN, FAHRENHEIT] })
    const sent = requestsTo(page, SET_UP_NEXT)
    await page.goto(`${server.url}/book/${FAHRENHEIT_ID}`)
    await watchStatus(page)
    const setUpNext = detailButton(page, 'Set as Up next')

    // The criterion's opener: a secondary action on a Book that isn't Main and isn't Up next.
    await expect(setUpNext).toBeVisible()

    // A secondary action: after the primary, before Edit (EXPERIENCE.md → Book detail actions).
    const primary = detailButton(page, 'Start reading')
    expect(await topOf(setUpNext)).toBeGreaterThanOrEqual(await bottomOf(primary))
    expect(await topOf(detailButton(page, 'Edit'))).toBeGreaterThanOrEqual(await bottomOf(setUpNext))

    await setUpNext.click()

    await expect(page.getByRole('status')).toHaveText('Fahrenheit 451 is Up next.')
    await expect(primary).toBeFocused()
    expect(await statusSeen(page)).toEqual([{ text: 'Fahrenheit 451 is Up next.', focused: 'Start reading' }])
    // Already Up next: no longer offered.
    await expect(setUpNext).toHaveCount(0)
    expect(sent).toHaveLength(1)
    expect(intentOf(sent[0])).toEqual({ bookId: FAHRENHEIT_ID })
    const stored = storedLibrary(server)
    expect([stored.mainBookId, stored.upNextBookId]).toEqual([DUNE_ID, FAHRENHEIT_ID])
    expect(storedBook(server, FAHRENHEIT_ID).readings).toEqual([])
  })

  test.skip("[P1] AC-3 a couldn't-save shows the line directly below Set as Up next, keeps focus there, and nothing changes", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ mainBookId: DUNE_ID, books: [DUNE_MAIN, FAHRENHEIT] })
    await routeCouldntSave(page)
    const before = libraryBytes(server)
    await page.goto(`${server.url}/book/${FAHRENHEIT_ID}`)
    const setUpNext = detailButton(page, 'Set as Up next')

    // The criterion's opener.
    await expect(setUpNext).toBeVisible()
    await setUpNext.click()

    await expect(page.getByRole('alert')).toHaveText(COULDNT_SAVE)
    const line = page.getByRole('main').getByText(COULDNT_SAVE, { exact: true })
    await expect(line).toBeVisible()
    expect(await topOf(line)).toBeGreaterThanOrEqual(await bottomOf(setUpNext))
    expect(await topOf(detailButton(page, 'Edit'))).toBeGreaterThanOrEqual(await bottomOf(line))
    await expect(setUpNext).toBeFocused()
    await expect(page.getByRole('status')).toHaveText('')
    expect(libraryBytes(server)).toBe(before)
  })

  test.skip('[P2] AC-5 with an Up next, the spine popover\'s Set as Up next carries "Replaces the current Up next." and hands focus back to the spine', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      mainBookId: DUNE_ID,
      upNextBookId: LEFT_HAND_ID,
      books: [DUNE_MAIN, LEFT_HAND, NEUROMANCER],
    })
    await page.goto(`${server.url}/catalog`)
    await watchStatus(page)
    const neuromancer = spineOf(page, 'Neuromancer by William Gibson')
    await neuromancer.click()
    const card = popover(page, 'Neuromancer')

    // The hint, under the popover's primary action.
    await expect(card.getByText(REPLACES, { exact: true })).toBeVisible()

    const setUpNext = card.getByRole('button', { name: 'Set as Up next', exact: true })
    await expect(setUpNext).toHaveAccessibleDescription(REPLACES)
    expect(await topOf(card.getByText(REPLACES, { exact: true }))).toBeGreaterThanOrEqual(await bottomOf(setUpNext))
    // The primary action takes focus on open; the "Start reading" link stays beside it.
    await expect(setUpNext).toBeFocused()
    await expect(card.getByRole('button', { name: 'Start reading', exact: true })).toBeVisible()

    await setUpNext.click()

    await expect(page.getByRole('status')).toHaveText('Neuromancer is Up next.')
    await expect(card).toBeHidden()
    await expect(neuromancer).toBeFocused()
    const seen = await statusSeen(page)
    expect(seen.map((entry) => entry.text)).toEqual(['Neuromancer is Up next.'])
    expect(seen[0].focused).toMatch(/^Neuromancer by William Gibson, /)
    const stored = storedLibrary(server)
    expect([stored.mainBookId, stored.upNextBookId]).toEqual([DUNE_ID, NEUROMANCER_ID])
  })

  test.skip('[P1] AC-7 a paused Book set as Up next leaves Waiting for you and shows in Up next with Resume', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      mainBookId: DUNE_ID,
      books: [DUNE_MAIN, LEFT_HAND_WAITING, FAHRENHEIT_WAITING],
    })
    const leftHandBefore = storedBook(server, LEFT_HAND_ID)
    await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
    const setUpNext = detailButton(page, 'Set as Up next')

    // The criterion's opener: a paused Book in Waiting for you offers it.
    await expect(setUpNext).toBeVisible()
    await setUpNext.click()

    await expect(page.getByRole('status')).toHaveText('The Left Hand of Darkness is Up next.')
    await expect(detailButton(page, 'Resume')).toBeFocused()

    await page.goto(`${server.url}/`)
    await expect(
      upNextPane(page).getByRole('button', { name: 'Resume The Left Hand of Darkness', exact: true }),
    ).toBeVisible()
    await expect(waitingHeading(page, 1)).toBeVisible()
    expect(await rowTitles(waitingPane(page))).toEqual(['Fahrenheit 451'])
    await expect(waitingPane(page).getByRole('button', { name: 'Resume The Left Hand of Darkness' })).toHaveCount(0)
    // Only the pointer moved: the paused Reading keeps its page and its pausedAt.
    expect(storedBook(server, LEFT_HAND_ID)).toEqual(leftHandBefore)
    expect(storedLibrary(server).upNextBookId).toBe(LEFT_HAND_ID)
  })
})
