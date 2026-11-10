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
import { DELETE_BOOK, intentOf, requestsTo, SET_UP_NEXT, START_READING } from './intents.ts'

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const COULDNT_SAVE = "Couldn't save. Your data wasn't changed."
const REPLACES = 'Replaces the current Up next.'
const MAIN_CANT = "Your Main book can't be Up next."
const GONE = "This book isn't in your catalog anymore."

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

test.describe('Epic 4 retro item 43: Set as Up next, second review', () => {
  async function deleteElsewhere(page: Page, url: string, bookId: string): Promise<void> {
    const deleted = await page.request.post(`${url}${DELETE_BOOK}`, {
      multipart: { intent: JSON.stringify({ bookId }) },
    })
    expect(deleted.status()).toBe(200)
  }

  test('[P1] Book detail states the replacement under Set as Up next while another Book is Up next', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      mainBookId: DUNE_ID,
      upNextBookId: NEUROMANCER_ID,
      books: [DUNE_MAIN, NEUROMANCER, FAHRENHEIT],
    })
    await page.goto(`${server.url}/book/${FAHRENHEIT_ID}`)

    await expect(detailButton(page, 'Set as Up next')).toHaveAccessibleDescription(REPLACES)
    await expect(page.getByRole('main').getByText(REPLACES, { exact: true })).toBeVisible()
  })

  test('[P2] Book detail shows no hint when no Book is Up next', async ({ page, seededServer }) => {
    const server = await seededServer({ mainBookId: DUNE_ID, books: [DUNE_MAIN, FAHRENHEIT] })
    await page.goto(`${server.url}/book/${FAHRENHEIT_ID}`)

    await expect(detailButton(page, 'Set as Up next')).toHaveAccessibleDescription('')
    await expect(page.getByRole('main').getByText(REPLACES, { exact: true })).toHaveCount(0)
  })

  test('[P2] a failure after Esc has closed the popover still reads in alert', async ({ page, seededServer }) => {
    const server = await seededServer({ mainBookId: DUNE_ID, books: [DUNE_MAIN, NEUROMANCER] })
    let release = () => {}
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    await page.route(`**${SET_UP_NEXT}`, async (route) => {
      await held
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: { kind: 'couldnt_save', code: 'couldnt_save', message: COULDNT_SAVE } }),
      })
    })
    await page.goto(`${server.url}/catalog`)
    const neuromancer = spine(page, NEUROMANCER_SPINE)
    await neuromancer.click()
    const card = popover(page, 'Neuromancer')
    await card.getByRole('button', { name: 'Set as Up next', exact: true }).click()
    const before = libraryBytes(server)

    await page.keyboard.press('Escape')
    await expect(card).toHaveCount(0)
    await expect(neuromancer).toBeFocused()
    release()

    await expect(page.getByRole('alert')).toHaveText(COULDNT_SAVE)
    expect(libraryBytes(server)).toBe(before)
  })

  test('[P1] a Book deleted in another tab: the popover closes and focus goes to the shelf or main', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ mainBookId: DUNE_ID, books: [DUNE_MAIN, NEUROMANCER] })
    await page.goto(`${server.url}/catalog`)
    await spine(page, NEUROMANCER_SPINE).click()
    const card = popover(page, 'Neuromancer')
    const setUpNext = card.getByRole('button', { name: 'Set as Up next', exact: true })
    await expect(setUpNext).toBeFocused()
    await deleteElsewhere(page, server.url, NEUROMANCER_ID)

    await setUpNext.click()

    await expect(card).toHaveCount(0)
    await expect(page.getByRole('alert')).toHaveText(GONE)
    await expect
      .poll(() =>
        page.evaluate(() => {
          const active = document.activeElement
          return active !== null && active !== document.body && document.getElementById('main')!.contains(active)
        }),
      )
      .toBe(true)
  })

  test('[P1] a Book deleted in another tab: Book detail becomes Page not found with focus on its heading', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ mainBookId: DUNE_ID, books: [DUNE_MAIN, NEUROMANCER] })
    await page.goto(`${server.url}/book/${NEUROMANCER_ID}`)
    const setUpNext = detailButton(page, 'Set as Up next')
    await expect(setUpNext).toBeVisible()
    await deleteElsewhere(page, server.url, NEUROMANCER_ID)

    await setUpNext.click()

    await expect(page.getByRole('heading', { level: 1, name: 'Page not found', exact: true })).toBeFocused()
    await expect(page.getByRole('alert')).toHaveText(GONE)
  })
})

test.describe('Epic 4 retro item 36: Set as Up next, automate', () => {
  /** Signals "visible again" until the Catalog's refetch shows Neuromancer as Up next. */
  async function refetchUntilUpNext(page: Page): Promise<void> {
    await expect(async () => {
      await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange', { bubbles: true })))
      await expect(spine(page, NEUROMANCER_UP_NEXT_SPINE)).toBeVisible({ timeout: 1000 })
    }).toPass()
  }

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test('[P1] AC-2 a stale tab sets the current Up next again: 200, the status line, and nothing written', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ mainBookId: DUNE_ID, books: [DUNE_MAIN, FAHRENHEIT] })
    await page.goto(`${server.url}/book/${FAHRENHEIT_ID}`)
    const setUpNext = detailButton(page, 'Set as Up next')
    await expect(setUpNext).toBeVisible()

    // Another tab makes it Up next first.
    const elsewhere = await page.request.post(`${server.url}${SET_UP_NEXT}`, {
      multipart: { intent: JSON.stringify({ bookId: FAHRENHEIT_ID }) },
    })
    expect(elsewhere.status()).toBe(200)
    const before = libraryBytes(server)
    const answered = page.waitForResponse((response) => response.url().endsWith(SET_UP_NEXT))

    await setUpNext.click()

    // The criterion: the no-op is a 200, said like any success, and writes nothing (AD-9).
    expect((await answered).status()).toBe(200)
    await expect(page.getByRole('status')).toHaveText('Fahrenheit 451 is Up next.')
    await expect(detailButton(page, 'Start reading')).toBeFocused()
    await expect(page.getByRole('alert')).toHaveText('')
    await expect(setUpNext).toHaveCount(0)
    expect(libraryBytes(server)).toBe(before)
  })

  test('[P2] in flight in the spine popover, Set as Up next stays aria-disabled with no hint, even once a refetch shows the Book as Up next, and a second press sends nothing', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ mainBookId: DUNE_ID, books: [DUNE_MAIN, NEUROMANCER] })
    const sent = requestsTo(page, SET_UP_NEXT)
    let release = () => {}
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    // The server commits; only its answer is held.
    await page.route(`**${SET_UP_NEXT}`, async (route) => {
      const response = await route.fetch()
      await held
      await route.fulfill({ response })
    })
    await page.goto(`${server.url}/catalog`)
    await watchStatus(page)
    await spine(page, NEUROMANCER_SPINE).click()
    const card = popover(page, 'Neuromancer')
    const setUpNext = card.getByRole('button', { name: 'Set as Up next', exact: true })

    await setUpNext.click()
    await expect(setUpNext).toHaveAttribute('aria-disabled', 'true')
    await expect(setUpNext).toHaveAccessibleDescription('Setting the book as Up next.')
    await expect.poll(() => storedLibrary(server).upNextBookId).toBe(NEUROMANCER_ID)

    // A refetch (the tab regains focus) shows Neuromancer as Up next while the answer is out.
    await refetchUntilUpNext(page)

    // The criterion: the button and its state are as they were at the press; no hint appears.
    await expect(setUpNext).toHaveAttribute('aria-disabled', 'true')
    await expect(setUpNext).toHaveAccessibleDescription('Setting the book as Up next.')
    await expect(card.getByText(REPLACES, { exact: true })).toHaveCount(0)
    // Playwright waits on aria-disabled; force the press a user can still make.
    await setUpNext.click({ force: true })
    expect(sent).toHaveLength(1)

    release()
    await expect(page.getByRole('status')).toHaveText('Neuromancer is Up next.')
    await expect(card).toBeHidden()
    await expect(spine(page, NEUROMANCER_UP_NEXT_SPINE)).toBeFocused()
    expect((await statusSeen(page)).map((entry) => entry.text)).toEqual(['Neuromancer is Up next.'])
    expect(sent).toHaveLength(1)
  })

  test('[P2] with an Up next, the popover keeps "Replaces the current Up next." while Set as Up next is in flight', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      mainBookId: DUNE_ID,
      upNextBookId: LEFT_HAND_ID,
      books: [DUNE_MAIN, LEFT_HAND, NEUROMANCER],
    })
    let release = () => {}
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    await page.route(`**${SET_UP_NEXT}`, async (route) => {
      const response = await route.fetch()
      await held
      await route.fulfill({ response })
    })
    await page.goto(`${server.url}/catalog`)
    await spine(page, NEUROMANCER_SPINE).click()
    const card = popover(page, 'Neuromancer')
    const setUpNext = card.getByRole('button', { name: 'Set as Up next', exact: true })

    await setUpNext.click()
    await expect.poll(() => storedLibrary(server).upNextBookId).toBe(NEUROMANCER_ID)
    await refetchUntilUpNext(page)

    // The criterion: the hint shown at the press stays, beside the busy reason.
    await expect(card.getByText(REPLACES, { exact: true })).toBeVisible()
    await expect(setUpNext).toHaveAccessibleDescription(`${REPLACES} Setting the book as Up next.`)

    release()
    await expect(page.getByRole('status')).toHaveText('Neuromancer is Up next.')
  })

  test('[P1] AC-4 on Home, a displaced paused Up next joins Waiting for you by its own pausedAt, and a displaced unstarted one is in neither pane', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      mainBookId: DUNE_ID,
      upNextBookId: LEFT_HAND_ID,
      // The Left Hand of Darkness paused 5 October, Fahrenheit 451 on 10 October.
      books: [DUNE_MAIN, LEFT_HAND_WAITING, FAHRENHEIT_WAITING, NEUROMANCER],
    })
    await page.goto(`${server.url}/book/${NEUROMANCER_ID}`)
    await detailButton(page, 'Set as Up next').click()
    await expect(page.getByRole('status')).toHaveText('Neuromancer is Up next.')

    await page.goto(`${server.url}/`)
    await expect(upNextPane(page).getByRole('link', { name: 'Neuromancer', exact: true })).toBeVisible()
    // The criterion: the earlier pause comes first.
    expect(await rowTitles(waitingPane(page))).toEqual(['The Left Hand of Darkness', 'Fahrenheit 451'])

    await page.goto(`${server.url}/book/${FAHRENHEIT_ID}`)
    await detailButton(page, 'Set as Up next').click()
    await expect(page.getByRole('status')).toHaveText('Fahrenheit 451 is Up next.')

    await page.goto(`${server.url}/`)
    await expect(upNextPane(page).getByRole('link', { name: 'Fahrenheit 451', exact: true })).toBeVisible()
    expect(await rowTitles(waitingPane(page))).toEqual(['The Left Hand of Darkness'])
    // Neuromancer, never started, is back in the catalog only.
    await expect(page.getByRole('main').getByRole('region').getByRole('link', { name: 'Neuromancer' })).toHaveCount(0)
  })

  test('[P1] AC-8 a finished Book set as Up next offers Start reading in the pane, and its dialog asks "Start X?" with no Purpose prefilled', async ({
    page,
    seededServer,
  }) => {
    const finished = {
      ...FAHRENHEIT,
      readings: [
        { startDate: '2026-01-05', currentPage: 187, purpose: 'Firemen', finishDate: '2026-02-01', finishedPages: 187 },
      ],
    }
    const server = await seededServer({ mainBookId: DUNE_ID, books: [DUNE_MAIN, finished] })
    await page.goto(`${server.url}/book/${FAHRENHEIT_ID}`)
    await detailButton(page, 'Set as Up next').click()
    await expect(page.getByRole('status')).toHaveText('Fahrenheit 451 is Up next.')

    await page.goto(`${server.url}/`)
    const start = upNextPane(page).getByRole('button', { name: 'Start reading Fahrenheit 451', exact: true })
    // The criterion: a re-read starts, so the pane says Start reading.
    await expect(start).toHaveText('Start reading')
    await start.click()
    const dialog = page.getByRole('dialog', { name: 'Start Fahrenheit 451?', exact: true })
    await expect(dialog.getByRole('textbox', { name: 'Purpose (optional)', exact: true })).toHaveValue('')
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(start).toBeFocused()
  })

  test("[P2] refetch on focus (AD-7): a set-up-next in one context shows in the other's Home panes and Book detail once it regains focus, with no warning", async ({
    page,
    browser,
    seededServer,
  }) => {
    const server = await seededServer({
      mainBookId: DUNE_ID,
      books: [DUNE_MAIN, LEFT_HAND_WAITING, FAHRENHEIT],
    })
    const otherContext = await browser.newContext()
    try {
      const home = await otherContext.newPage()
      await home.goto(`${server.url}/`)
      await expect(waitingHeading(home, 1)).toBeVisible()
      await expect(upNextPane(home).getByText('Nothing up next.', { exact: true })).toBeVisible()
      const detail = await otherContext.newPage()
      await detail.goto(`${server.url}/book/${LEFT_HAND_ID}`)
      await expect(detailButton(detail, 'Set as Up next')).toBeVisible()

      // This context sets it.
      await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
      await detailButton(page, 'Set as Up next').click()
      await expect(page.getByRole('status')).toHaveText('The Left Hand of Darkness is Up next.')

      for (const other of [home, detail]) {
        await other.bringToFront()
        await other.evaluate(() => window.dispatchEvent(new Event('focus')))
      }

      // The criterion: the other context's Home moved it from Waiting for you to Up next.
      await expect(
        upNextPane(home).getByRole('button', { name: 'Resume The Left Hand of Darkness', exact: true }),
      ).toBeVisible()
      await expect(waitingPane(home)).toHaveCount(0)
      await expect(home.getByRole('alert')).toHaveText('')
      await expect(home.getByRole('dialog')).toHaveCount(0)
      // Its Book detail no longer offers it.
      await expect(detailButton(detail, 'Resume')).toBeVisible()
      await expect(detailButton(detail, 'Set as Up next')).toHaveCount(0)
      await expect(detail.getByRole('alert')).toHaveText('')
    } finally {
      await otherContext.close()
    }
  })
})
