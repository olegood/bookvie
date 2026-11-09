// Story 4.7 Keep a few side reads. Mark as Side read / Remove from side on
// Book detail (the `status` line and where focus lands, the routed 503's
// alert line below the button, aria-disabled with "Up to 3 side reads." at
// 3), Home's On the side pane, ", on the side" in spine names with no marker
// of its own, and the Start dialog's "Which page?" (prefill, focus, the
// client checks, a page below the paused one, the last page opening Finish,
// leaving On the side). What the intents store, their refusals and the
// standard intent ACs are proven at API level in
// backend/tests/test_side_reads.py.

import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import { spine } from './bookcase.ts'
import {
  DUNE,
  DUNE_ID,
  LEFT_HAND,
  LEFT_HAND_ID,
  fontFamily,
  libraryBytes,
  mainBookCard,
  rowTitles,
  serverAtFakeToday,
  startDialog,
  stopAndRemove,
  storedBook,
  storedLibrary,
  upNextPane,
  waitingPane,
} from './home.ts'
import { intentOf, MARK_SIDE_READ, requestsTo, START_READING, UNMARK_SIDE_READ } from './intents.ts'

const COULDNT_SAVE = "Couldn't save. Your data wasn't changed."
const FULL_HINT = 'Up to 3 side reads.'
const PAGE_REQUIRED = 'Which page? is required.'

const KINDRED_ID = '7c2d4e6f-8a9b-4c1d-9e2f-3a4b5c6d7e8f'
const KINDRED = { id: KINDRED_ID, title: 'Kindred', authors: ['Octavia E. Butler'], pages: 264 }
const EMMA_ID = '2a7e4b1c-8d3f-4e5a-9b6c-7d8e9f0a1b2c'
const EMMA = { id: EMMA_ID, title: 'Emma', authors: ['Jane Austen'], pages: 400 }
const BELOVED_ID = '0e1f2a3b-4c5d-4e6f-8a7b-9c0d1e2f3a4b'
const BELOVED = { id: BELOVED_ID, title: 'Beloved', authors: ['Toni Morrison'], pages: 324 }

/** Dune as the Main book at p.100 of 412. */
const DUNE_MAIN = { ...DUNE, readings: [{ startDate: '2026-10-01', currentPage: 100 }] }
/** The Left Hand of Darkness paused at p.120 of 330 since 5 October. */
const LEFT_HAND_PAUSED = {
  ...LEFT_HAND,
  readings: [{ startDate: '2026-09-20', currentPage: 120, purpose: 'Gethen', pausedAt: '2026-10-05' }],
}

/** Book detail's own buttons, in `main`. */
function detailButton(page: Page, name: string): Locator {
  return page.getByRole('main').getByRole('button', { name, exact: true })
}

function sidePane(page: Page): Locator {
  return page.getByRole('main').getByRole('region', { name: 'On the side', exact: true })
}

function whichPage(dialog: Locator): Locator {
  return dialog.getByRole('spinbutton', { name: 'Which page?', exact: true })
}

/** Book detail's action stack: the buttons beside Delete, in order. */
function actionStack(page: Page): Locator {
  return page
    .getByRole('main')
    .getByRole('button', { name: 'Delete', exact: true })
    .locator('xpath=..')
    .getByRole('button')
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

async function routeCouldntSave(page: Page, path: string): Promise<void> {
  await page.route(`**${path}`, (route) =>
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

test.describe('Story 4.7 Keep a few side reads', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test('[P0] AC-1 Mark as Side read stores the Book, focuses the primary, then says "X is on the side."; Remove from side reverses it', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ mainBookId: DUNE_ID, books: [DUNE_MAIN, KINDRED] })
    const marks = requestsTo(page, MARK_SIDE_READ)
    const unmarks = requestsTo(page, UNMARK_SIDE_READ)
    const before = storedLibrary(server)
    await page.goto(`${server.url}/book/${KINDRED_ID}`)
    await watchStatus(page)
    const mark = detailButton(page, 'Mark as Side read')

    // Right after Mark finished, before Edit.
    await expect(actionStack(page)).toHaveText([
      'Start reading',
      'Set as Up next',
      'Mark finished',
      'Mark as Side read',
      'Edit',
      'Delete',
    ])
    await mark.click()

    await expect(page.getByRole('status')).toHaveText('Kindred is on the side.')
    const primary = detailButton(page, 'Start reading')
    await expect(primary).toBeFocused()
    expect(await statusSeen(page)).toEqual([{ text: 'Kindred is on the side.', focused: 'Start reading' }])
    expect(marks).toHaveLength(1)
    expect(intentOf(marks[0])).toEqual({ bookId: KINDRED_ID })
    // Only the list changed.
    expect(storedLibrary(server)).toEqual({ ...before, sideReadBookIds: [KINDRED_ID] })

    const remove = detailButton(page, 'Remove from side')
    await expect(remove).toBeVisible()
    await remove.click()

    await expect(page.getByRole('status')).toHaveText('Kindred is off the side.')
    await expect(primary).toBeFocused()
    expect(unmarks).toHaveLength(1)
    expect(intentOf(unmarks[0])).toEqual({ bookId: KINDRED_ID })
    expect(storedLibrary(server)).toEqual(before)
    await expect(detailButton(page, 'Mark as Side read')).toBeVisible()
  })

  test('[P1] AC-1 on a finished Book, focus goes to the primary Start reading; the Main book offers neither button', async ({
    page,
    seededServer,
  }) => {
    const finished = {
      ...KINDRED,
      readings: [{ startDate: null, finishDate: '2026-03-20', finishedPages: 264, currentPage: 264 }],
    }
    const server = await seededServer({ mainBookId: DUNE_ID, books: [DUNE_MAIN, finished] })
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Dune', exact: true })).toBeVisible()
    await expect(page.getByRole('main').getByRole('button', { name: /side/i })).toHaveCount(0)

    await page.goto(`${server.url}/book/${KINDRED_ID}`)
    // A finished Book with no Reading in progress still has Start reading (a re-read).
    const primary = detailButton(page, 'Start reading')
    await detailButton(page, 'Mark as Side read').click()
    await expect(page.getByRole('status')).toHaveText('Kindred is on the side.')
    await expect(primary).toBeFocused()
  })

  for (const [name, path, seeded] of [
    ['Mark as Side read', MARK_SIDE_READ, []],
    ['Remove from side', UNMARK_SIDE_READ, [KINDRED_ID]],
  ] as const) {
    test(`[P1] AC-2 a couldn't-save on ${name} shows the line directly below it, keeps focus there, and nothing changes`, async ({
      page,
      seededServer,
    }) => {
      const server = await seededServer({
        mainBookId: DUNE_ID,
        sideReadBookIds: [...seeded],
        books: [DUNE_MAIN, KINDRED],
      })
      await routeCouldntSave(page, path)
      const before = libraryBytes(server)
      await page.goto(`${server.url}/book/${KINDRED_ID}`)
      const button = detailButton(page, name)
      await expect(button).toBeVisible()
      await button.click()

      await expect(page.getByRole('alert')).toHaveText(COULDNT_SAVE)
      const line = page.getByRole('main').getByText(COULDNT_SAVE, { exact: true })
      await expect(line).toBeVisible()
      expect(await topOf(line)).toBeGreaterThanOrEqual(await bottomOf(button))
      expect(await topOf(detailButton(page, 'Edit'))).toBeGreaterThanOrEqual(await bottomOf(line))
      await expect(button).toBeFocused()
      await expect(page.getByRole('status')).toHaveText('')
      expect(libraryBytes(server)).toBe(before)
    })
  }

  test('[P0] AC-3 at 3 Side reads a fourth Book\'s Mark as Side read is aria-disabled with "Up to 3 side reads." and sends nothing', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      mainBookId: DUNE_ID,
      sideReadBookIds: [KINDRED_ID, EMMA_ID, BELOVED_ID],
      books: [DUNE_MAIN, KINDRED, EMMA, BELOVED, LEFT_HAND],
    })
    const sent = requestsTo(page, MARK_SIDE_READ)
    const before = libraryBytes(server)
    await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
    const mark = detailButton(page, 'Mark as Side read')

    await expect(mark).toHaveAttribute('aria-disabled', 'true')
    await expect(mark).toHaveAccessibleDescription(FULL_HINT)
    const hint = page.getByRole('main').getByText(FULL_HINT, { exact: true })
    await expect(hint).toBeVisible()
    expect(await topOf(hint)).toBeGreaterThanOrEqual(await bottomOf(mark))
    // Still focusable; a press does nothing.
    await mark.focus()
    await expect(mark).toBeFocused()
    await mark.click({ force: true })
    await page.keyboard.press('Enter')
    await expect(page.getByRole('status')).toHaveText('')
    expect(sent).toHaveLength(0)
    expect(libraryBytes(server)).toBe(before)

    // One of the 3 can still be removed.
    await page.goto(`${server.url}/book/${KINDRED_ID}`)
    const remove = detailButton(page, 'Remove from side')
    await expect(remove).not.toHaveAttribute('aria-disabled')
  })

  test('[P0] the On the side pane lists the Side reads after Waiting for you, each with its title link, author line and Start reading; hidden when empty', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      mainBookId: DUNE_ID,
      sideReadBookIds: [KINDRED_ID, LEFT_HAND_ID],
      books: [DUNE_MAIN, LEFT_HAND_PAUSED, KINDRED, EMMA],
    })
    await page.goto(`${server.url}/`)
    const pane = sidePane(page)
    await expect(pane).toBeVisible()
    await expect(pane.getByRole('heading', { level: 2, name: 'On the side', exact: true })).toBeVisible()
    // In sideReadBookIds order.
    expect(await rowTitles(pane)).toEqual(['Kindred', 'The Left Hand of Darkness'])
    const link = pane.getByRole('link', { name: 'Kindred', exact: true })
    await expect(link).toHaveAttribute('href', `/book/${KINDRED_ID}`)
    expect(await fontFamily(link)).toMatch(/^ui-serif/)
    await expect(pane.getByText('Octavia E. Butler', { exact: true })).toBeVisible()
    // Even a paused Side read reads Start reading here.
    await expect(pane.getByRole('button', { name: 'Start reading The Left Hand of Darkness', exact: true })).toHaveText(
      'Start reading',
    )
    // After Waiting for you, which also lists the paused Side read.
    expect(await topOf(pane)).toBeGreaterThanOrEqual(await bottomOf(waitingPane(page)))
    expect(await rowTitles(waitingPane(page))).toEqual(['The Left Hand of Darkness'])

    // The button opens the Start dialog; Cancel gives focus back.
    const start = pane.getByRole('button', { name: 'Start reading Kindred', exact: true })
    await start.click()
    const dialog = startDialog(page, 'Start Kindred?')
    await expect(whichPage(dialog)).toBeFocused()
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(start).toBeFocused()

    // Hidden with no Side reads.
    const empty = await seededServer({ mainBookId: DUNE_ID, books: [DUNE_MAIN, KINDRED] })
    await page.goto(`${empty.url}/`)
    await expect(mainBookCard(page)).toBeVisible()
    await expect(sidePane(page)).toHaveCount(0)
  })

  test('[P1] the On the side pane shows with no Main book', async ({ page, seededServer }) => {
    const server = await seededServer({ sideReadBookIds: [KINDRED_ID], books: [DUNE, KINDRED] })
    await page.goto(`${server.url}/`)
    await expect(mainBookCard(page).getByRole('heading', { name: 'No Main book.' })).toBeVisible()
    expect(await rowTitles(sidePane(page))).toEqual(['Kindred'])
  })

  test('[P1] a Side read that is Up next or waiting: ", on the side" on its spine, only its own marker, and both panes', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      mainBookId: DUNE_ID,
      upNextBookId: KINDRED_ID,
      sideReadBookIds: [KINDRED_ID, LEFT_HAND_ID],
      books: [DUNE_MAIN, KINDRED, LEFT_HAND_PAUSED],
    })
    await page.goto(`${server.url}/catalog`)
    const upNext = spine(page, 'Kindred by Octavia E. Butler, not read yet, Up next, on the side')
    await expect(upNext.locator('[data-marker]')).toHaveAttribute('data-marker', 'upNext')
    const waiting = spine(
      page,
      'The Left Hand of Darkness by Ursula K. Le Guin, waiting for you, page 120, on the side',
    )
    await expect(waiting.locator('[data-marker]')).toHaveAttribute('data-marker', 'waiting')
    await expect(page.locator('[data-marker]')).toHaveCount(3)

    await page.goto(`${server.url}/`)
    await expect(upNextPane(page).getByRole('link', { name: 'Kindred', exact: true })).toBeVisible()
    expect(await rowTitles(waitingPane(page))).toEqual(['The Left Hand of Darkness'])
    expect(await rowTitles(sidePane(page))).toEqual(['Kindred', 'The Left Hand of Darkness'])
  })

  test('[P0] AC-4 the Start dialog asks "Which page?" for a Side read: prefilled and focused, empty and out-of-range refused, a lower page accepted, and it leaves On the side', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      mainBookId: DUNE_ID,
      sideReadBookIds: [LEFT_HAND_ID, KINDRED_ID],
      books: [DUNE_MAIN, LEFT_HAND_PAUSED, KINDRED],
    })
    const sent = requestsTo(page, START_READING)
    await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
    await detailButton(page, 'Resume').click()
    const dialog = startDialog(page, 'Resume The Left Hand of Darkness?')
    const field = whichPage(dialog)

    // Prefilled with the paused page, focused, required.
    await expect(field).toBeFocused()
    await expect(field).toHaveValue('120')
    await expect(field).toHaveAttribute('required')
    await expect(field).toHaveCSS('width', '110px')
    // Before the Purpose field.
    const purpose = dialog.getByRole('textbox', { name: 'Purpose (optional)', exact: true })
    expect(await topOf(purpose)).toBeGreaterThanOrEqual(await bottomOf(field))

    // Empty: nothing sent, the field invalid with the message, and the message in `alert`.
    await field.fill('')
    await dialog.getByRole('button', { name: 'Resume', exact: true }).click()
    await expect(field).toHaveAttribute('aria-invalid', 'true')
    await expect(field).toHaveAccessibleDescription(PAGE_REQUIRED)
    await expect(page.getByRole('alert')).toHaveText(PAGE_REQUIRED)
    expect(sent).toHaveLength(0)

    // Out of range.
    await field.fill('400')
    await field.press('Enter')
    await expect(field).toHaveAccessibleDescription('Page must be between 0 and 330.')
    await expect(page.getByRole('alert')).toHaveText('Page must be between 0 and 330.')
    expect(sent).toHaveLength(0)

    // Below the paused page is fine.
    await field.fill('50')
    await dialog.getByRole('button', { name: 'Resume', exact: true }).click()
    await expect(mainBookCard(page).getByRole('link', { name: 'The Left Hand of Darkness', exact: true })).toBeFocused()
    expect(sent).toHaveLength(1)
    expect(intentOf(sent[0])).toEqual({ bookId: LEFT_HAND_ID, purpose: 'Gethen', page: 50 })
    const stored = storedLibrary(server)
    expect(stored.mainBookId).toBe(LEFT_HAND_ID)
    expect(stored.sideReadBookIds).toEqual([KINDRED_ID])
    expect(storedBook(server, LEFT_HAND_ID).readings[0].currentPage).toBe(50)
    expect(await rowTitles(sidePane(page))).toEqual(['Kindred'])
    // No Finish dialog: not the last page.
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('[P1] AC-4 an unstarted Side read starts with "Which page?" empty, and a book that isn\'t one gets no field and sends no page', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ sideReadBookIds: [KINDRED_ID], books: [KINDRED, EMMA] })
    const sent = requestsTo(page, START_READING)
    await page.goto(`${server.url}/book/${KINDRED_ID}`)
    await detailButton(page, 'Start reading').click()
    const dialog = startDialog(page, 'Start Kindred?')
    await expect(whichPage(dialog)).toBeFocused()
    await expect(whichPage(dialog)).toHaveValue('')
    await whichPage(dialog).fill('12')
    await dialog.getByRole('button', { name: 'Start reading', exact: true }).click()
    await expect(mainBookCard(page).getByRole('link', { name: 'Kindred', exact: true })).toBeFocused()
    expect(storedBook(server, KINDRED_ID).readings[0].currentPage).toBe(12)
    await expect(sidePane(page)).toHaveCount(0)

    await page.goto(`${server.url}/book/${EMMA_ID}`)
    await detailButton(page, 'Start reading').click()
    const other = startDialog(page, 'Start Emma?')
    await expect(other.getByRole('textbox', { name: 'Purpose (optional)', exact: true })).toBeFocused()
    await expect(whichPage(other)).toHaveCount(0)
    await other.getByRole('button', { name: 'Start reading', exact: true }).click()
    await expect(mainBookCard(page).getByRole('link', { name: 'Emma', exact: true })).toBeFocused()
    expect(intentOf(sent[1])).toEqual({ bookId: EMMA_ID, purpose: '' })
  })

  test('[P1] AC-4 a server 422 on page shows on the field like the client check', async ({ page, seededServer }) => {
    const server = await seededServer({ sideReadBookIds: [KINDRED_ID], books: [KINDRED] })
    const message = 'Page must be between 0 and 200.'
    await page.route(`**${START_READING}`, (route) =>
      route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            kind: 'refusal',
            code: 'invalid_fields',
            message: 'Not saved. 1 field needs attention: Which page?.',
            fields: [{ field: 'page', message }],
          },
        }),
      }),
    )
    await page.goto(`${server.url}/book/${KINDRED_ID}`)
    await detailButton(page, 'Start reading').click()
    const dialog = startDialog(page, 'Start Kindred?')
    await whichPage(dialog).fill('250')
    await whichPage(dialog).press('Enter')
    await expect(whichPage(dialog)).toHaveAttribute('aria-invalid', 'true')
    await expect(whichPage(dialog)).toHaveAccessibleDescription(message)
    await expect(page.getByRole('alert')).toHaveText(message)
    await expect(dialog).toBeVisible()
  })

  test('[P1] AC-4 a Side read started at its last page opens the Finish dialog on Home; one finished from Book detail leaves On the side', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'side-last-page', {
      mainBookId: DUNE_ID,
      sideReadBookIds: [LEFT_HAND_ID, KINDRED_ID],
      books: [DUNE_MAIN, LEFT_HAND_PAUSED, KINDRED],
    })
    try {
      await page.goto(`${server.url}/`)
      await sidePane(page).getByRole('button', { name: 'Start reading The Left Hand of Darkness', exact: true }).click()
      const dialog = startDialog(page, 'Resume The Left Hand of Darkness?')
      await whichPage(dialog).fill('330')
      await dialog.getByRole('button', { name: 'Resume', exact: true }).click()

      const finish = page.getByRole('dialog', { name: 'Finished The Left Hand of Darkness', exact: true })
      await expect(finish).toBeVisible()
      await expect(finish).toHaveAccessibleDescription('Page 330 of 330, 100%.')
      // Only finish-reading finishes: the Reading is Main at its last page.
      const stored = storedLibrary(server)
      expect(stored.mainBookId).toBe(LEFT_HAND_ID)
      expect(storedBook(server, LEFT_HAND_ID).readings[0]).toMatchObject({ currentPage: 330, finishDate: null })
      await finish.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(finish).toBeHidden()

      // Kindred, a Side read, finished from Book detail.
      await page.goto(`${server.url}/book/${KINDRED_ID}`)
      await detailButton(page, 'Mark finished').click()
      const done = page.getByRole('dialog', { name: 'Finished Kindred', exact: true })
      await done.getByRole('button', { name: 'Done', exact: true }).click()
      await expect(page.getByRole('status')).toHaveText('Finished Kindred.')
      expect(storedLibrary(server).sideReadBookIds).toEqual([])
      await page.goto(`${server.url}/`)
      await expect(mainBookCard(page)).toBeVisible()
      await expect(sidePane(page)).toHaveCount(0)
    } finally {
      await stopAndRemove(server)
    }
  })
})
