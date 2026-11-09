// Story 4.4 Choose what to read next. Set as Up next on
// Book detail and in the spine popover: the `status` line and where focus
// lands, the routed 503's alert line below the button, the popover's
// "Replaces the current Up next." hint, and a paused Book moving from
// Waiting for you to Up next. What `set-up-next` stores (displacement, the
// no-op, the Main book refusal, TR8) is proven at API level in
// backend/tests/test_set_up_next.py.

import AxeBuilder from '@axe-core/playwright'
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
import { spine } from './bookcase.ts'
import { intentOf, requestsTo, SET_UP_NEXT, START_READING } from './intents.ts'

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const COULDNT_SAVE = "Couldn't save. Your data wasn't changed."
const REPLACES = 'Replaces the current Up next.'
const MAIN_CANT = "Your Main book can't be Up next."

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

const NEUROMANCER_SPINE = 'Neuromancer by William Gibson, not read yet'
const NEUROMANCER_UP_NEXT_SPINE = 'Neuromancer by William Gibson, not read yet, Up next'

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

  test('[P0] AC-1 Set as Up next on Book detail makes the Book Up next, focuses the primary button, then says "X is Up next."', async ({
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

  test("[P1] AC-3 a couldn't-save shows the line directly below Set as Up next, keeps focus there, and nothing changes", async ({
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

  test('[P2] AC-5 with an Up next, the spine popover\'s Set as Up next carries "Replaces the current Up next." and hands focus back to the spine', async ({
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
    const neuromancer = spine(page, NEUROMANCER_SPINE)
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
    await expect(spine(page, NEUROMANCER_UP_NEXT_SPINE)).toBeFocused()
    const seen = await statusSeen(page)
    expect(seen.map((entry) => entry.text)).toEqual(['Neuromancer is Up next.'])
    expect(seen[0].focused).toBe(NEUROMANCER_UP_NEXT_SPINE)
    const stored = storedLibrary(server)
    expect([stored.mainBookId, stored.upNextBookId]).toEqual([DUNE_ID, NEUROMANCER_ID])
  })

  test('[P1] AC-7 a paused Book set as Up next leaves Waiting for you and shows in Up next with Resume', async ({
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

test.describe('Story 4.4 Choose what to read next (automate)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test("[P2] AC-1 with no Up next, the spine popover's Set as Up next has no hint and no description, and still hands focus back to the spine", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ mainBookId: DUNE_ID, books: [DUNE_MAIN, NEUROMANCER] })
    await page.goto(`${server.url}/catalog`)
    await watchStatus(page)
    const neuromancer = spine(page, NEUROMANCER_SPINE)
    await neuromancer.click()
    const card = popover(page, 'Neuromancer')
    const setUpNext = card.getByRole('button', { name: 'Set as Up next', exact: true })

    await expect(setUpNext).toBeFocused()
    await expect(card.getByText(REPLACES, { exact: true })).toHaveCount(0)
    await expect(setUpNext).toHaveAccessibleDescription('')

    await setUpNext.click()

    await expect(page.getByRole('status')).toHaveText('Neuromancer is Up next.')
    await expect(card).toBeHidden()
    await expect(spine(page, NEUROMANCER_UP_NEXT_SPINE)).toBeFocused()
    const seen = await statusSeen(page)
    expect(seen.map((entry) => entry.text)).toEqual(['Neuromancer is Up next.'])
    expect(seen[0].focused).toBe(NEUROMANCER_UP_NEXT_SPINE)
    expect(storedLibrary(server).upNextBookId).toBe(NEUROMANCER_ID)
  })

  test("[P1] AC-6 Set as Up next isn't offered on the Main book's or the Up next Book's Book detail", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      mainBookId: DUNE_ID,
      upNextBookId: LEFT_HAND_ID,
      books: [DUNE_MAIN, LEFT_HAND],
    })
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    await expect(detailButton(page, 'Pause')).toBeVisible()
    await expect(detailButton(page, 'Set as Up next')).toHaveCount(0)

    await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
    await expect(detailButton(page, 'Start reading')).toBeVisible()
    await expect(detailButton(page, 'Set as Up next')).toHaveCount(0)
  })

  test("[P2] AC-3 a couldn't-save in the spine popover shows the line below Set as Up next, keeps focus there, and the popover stays open", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ mainBookId: DUNE_ID, books: [DUNE_MAIN, NEUROMANCER] })
    await routeCouldntSave(page)
    const before = libraryBytes(server)
    await page.goto(`${server.url}/catalog`)
    await spine(page, NEUROMANCER_SPINE).click()
    const card = popover(page, 'Neuromancer')
    const setUpNext = card.getByRole('button', { name: 'Set as Up next', exact: true })
    await expect(setUpNext).toBeFocused()

    await setUpNext.click()

    await expect(page.getByRole('alert')).toHaveText(COULDNT_SAVE)
    const line = card.getByText(COULDNT_SAVE, { exact: true })
    await expect(line).toBeVisible()
    expect(await topOf(line)).toBeGreaterThanOrEqual(await bottomOf(setUpNext))
    await expect(setUpNext).toBeFocused()
    await expect(card).toBeVisible()
    await expect(page.getByRole('status')).toHaveText('')
    expect(libraryBytes(server)).toBe(before)
  })

  test('[P2] while Set as Up next is in flight on Book detail, it is aria-disabled with "Setting the book as Up next." and a second press sends nothing', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ mainBookId: DUNE_ID, books: [DUNE_MAIN, FAHRENHEIT] })
    const sent = requestsTo(page, SET_UP_NEXT)
    let release = () => {}
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    await page.route(`**${SET_UP_NEXT}`, async (route) => {
      await held
      await route.continue()
    })
    await page.goto(`${server.url}/book/${FAHRENHEIT_ID}`)
    const setUpNext = detailButton(page, 'Set as Up next')
    await setUpNext.click()

    await expect(setUpNext).toHaveAttribute('aria-disabled', 'true')
    await expect(setUpNext).toHaveAccessibleDescription('Setting the book as Up next.')
    // Playwright waits on aria-disabled; force the press a user can still make.
    await setUpNext.click({ force: true })
    expect(sent).toHaveLength(1)

    release()
    await expect(detailButton(page, 'Start reading')).toBeFocused()
    await expect(page.getByRole('status')).toHaveText('Fahrenheit 451 is Up next.')
    expect(sent).toHaveLength(1)
    expect(storedLibrary(server).upNextBookId).toBe(FAHRENHEIT_ID)
  })

  test('[P2] axe finds nothing on Book detail with Set as Up next and on the spine popover with its hint, in both themes', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      mainBookId: DUNE_ID,
      upNextBookId: LEFT_HAND_ID,
      books: [DUNE_MAIN, LEFT_HAND, NEUROMANCER],
    })
    for (const colorScheme of ['light', 'dark'] as const) {
      // No fade-in: axe would read the popover's colors mid-animation.
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
      await page.goto(`${server.url}/book/${NEUROMANCER_ID}`)
      await expect(detailButton(page, 'Set as Up next')).toBeVisible()
      let { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
      expect(violations.map(({ id, nodes }) => `${colorScheme} Book detail: ${id} (${nodes.length})`)).toEqual([])

      await page.goto(`${server.url}/catalog`)
      await spine(page, NEUROMANCER_SPINE).click()
      await expect(popover(page, 'Neuromancer').getByText(REPLACES, { exact: true })).toBeVisible()
      ;({ violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze())
      expect(violations.map(({ id, nodes }) => `${colorScheme} popover: ${id} (${nodes.length})`)).toEqual([])
    }
  })

  test("[P2] AC-3 a stale tab's refusal on Book detail moves focus to the h1 and keeps the line where Set as Up next was", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ mainBookId: DUNE_ID, books: [DUNE_MAIN, FAHRENHEIT] })
    await page.goto(`${server.url}/book/${FAHRENHEIT_ID}`)
    const setUpNext = detailButton(page, 'Set as Up next')
    await expect(setUpNext).toBeVisible()

    // Another tab makes the Book Main.
    const started = await page.request.post(`${server.url}${START_READING}`, {
      multipart: { intent: JSON.stringify({ bookId: FAHRENHEIT_ID, purpose: null }) },
    })
    expect(started.status()).toBe(200)
    const before = libraryBytes(server)

    await setUpNext.click()

    await expect(page.getByRole('alert')).toHaveText(MAIN_CANT)
    await expect(setUpNext).toHaveCount(0)
    await expect(page.locator('main h1')).toBeFocused()
    const line = page.getByRole('main').getByText(MAIN_CANT, { exact: true })
    await expect(line).toBeVisible()
    expect(await topOf(detailButton(page, 'Edit'))).toBeGreaterThanOrEqual(await bottomOf(line))
    await expect(page.getByRole('status')).toHaveText('')
    expect(libraryBytes(server)).toBe(before)
  })

  test("[P2] AC-3 a stale tab's refusal in the spine popover moves focus to Open book and keeps the popover open with the line", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ mainBookId: DUNE_ID, books: [DUNE_MAIN, NEUROMANCER] })
    await page.goto(`${server.url}/catalog`)
    await spine(page, NEUROMANCER_SPINE).click()
    const card = popover(page, 'Neuromancer')
    const setUpNext = card.getByRole('button', { name: 'Set as Up next', exact: true })
    await expect(setUpNext).toBeFocused()

    const started = await page.request.post(`${server.url}${START_READING}`, {
      multipart: { intent: JSON.stringify({ bookId: NEUROMANCER_ID, purpose: null }) },
    })
    expect(started.status()).toBe(200)
    const before = libraryBytes(server)

    await setUpNext.click()

    await expect(page.getByRole('alert')).toHaveText(MAIN_CANT)
    await expect(setUpNext).toHaveCount(0)
    await expect(card.getByRole('link', { name: 'Open book →', exact: true })).toBeFocused()
    await expect(card).toBeVisible()
    await expect(card.getByText(MAIN_CANT, { exact: true })).toBeVisible()
    await expect(page.getByRole('status')).toHaveText('')
    expect(libraryBytes(server)).toBe(before)
  })
})
