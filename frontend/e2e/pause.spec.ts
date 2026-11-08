// Story 4.3 Pause my Main book. The Main book card's "⋯" menu (keyboard,
// Esc, an outside press, Open book), Pause from Home and from Book detail
// with and without the Confirm dialog, the focus targets and the `status`
// line, a routed 503 on both paths, and axe on the open menu and the dialog.
// The stored state of every matrix row is proven at API level in
// backend/tests/test_pause.py.

import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import {
  DUNE,
  DUNE_ID,
  FAKE_TODAY,
  LEFT_HAND,
  LEFT_HAND_ID,
  libraryBytes,
  mainBookCard,
  serverAtFakeToday,
  stopAndRemove,
  storedBook,
  storedLibrary,
} from './home.ts'
import { PAUSE, requestsTo } from './intents.ts'

const FAHRENHEIT_ID = '9d4e7a10-2b3c-4d5e-8f60-718293a4b5c6'
const FAHRENHEIT = { id: FAHRENHEIT_ID, title: 'Fahrenheit 451', authors: ['Ray Bradbury'], pages: 187 }
const LEFT_HAND_READING_ID = '5a4b3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d'
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const COULDNT_SAVE = "Couldn't save. Your data wasn't changed."
const HEADING = 'Pause The Left Hand of Darkness at p.212 (64%)?'
const PAUSED_LINE = "Paused The Left Hand of Darkness at p.212. It's Up next."
const RESUME_LEFT_HAND = 'Resume The Left Hand of Darkness'

/** The Left Hand of Darkness as the Main book at p.212 of 330 (64%). */
const LEFT_HAND_MAIN = {
  ...LEFT_HAND,
  readings: [{ id: LEFT_HAND_READING_ID, startDate: '2026-10-02', currentPage: 212 }],
}
/** Dune paused at p.120 since 20 October. */
const DUNE_PAUSED = {
  ...DUNE,
  readings: [{ startDate: '2026-10-01', currentPage: 120, pausedAt: '2026-10-20' }],
}

const NO_UP_NEXT = { mainBookId: LEFT_HAND_ID, books: [LEFT_HAND_MAIN, DUNE_PAUSED, FAHRENHEIT] }
const PAUSED_UP_NEXT = { ...NO_UP_NEXT, upNextBookId: DUNE_ID }
const UNSTARTED_UP_NEXT = { ...NO_UP_NEXT, upNextBookId: FAHRENHEIT_ID }

function moreButton(page: Page): Locator {
  return mainBookCard(page).getByRole('button', { name: 'More actions', exact: true })
}

function menu(page: Page): Locator {
  return page.getByRole('menu', { name: 'More actions', exact: true })
}

function item(page: Page, name: string): Locator {
  return menu(page).getByRole('menuitem', { name, exact: true })
}

function pauseDialog(page: Page): Locator {
  return page.getByRole('alertdialog', { name: HEADING, exact: true })
}

/** Book detail's own buttons, in `main`. */
function detailButton(page: Page, name: string): Locator {
  return page.getByRole('main').getByRole('button', { name, exact: true })
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
  await page.route(`**${PAUSE}`, (route) =>
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

test.describe('Story 4.3 Pause my Main book', () => {
  test('[P1] the "⋯" menu opens with focus on Pause, the arrows move with wrap, Home and End jump, Esc closes it back to "⋯"', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(NO_UP_NEXT)
    await page.goto(`${server.url}/`)
    const more = moreButton(page)
    await expect(more).toHaveAttribute('aria-haspopup', 'menu')
    await expect(more).toHaveAttribute('aria-expanded', 'false')

    await more.focus()
    await page.keyboard.press('Enter')
    await expect(menu(page)).toBeVisible()
    await expect(more).toHaveAttribute('aria-expanded', 'true')
    await expect(menu(page).getByRole('menuitem')).toHaveText(['Pause', 'Open book'])
    await expect(item(page, 'Pause')).toBeFocused()

    await page.keyboard.press('ArrowDown')
    await expect(item(page, 'Open book')).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(item(page, 'Pause')).toBeFocused()
    await page.keyboard.press('ArrowUp')
    await expect(item(page, 'Open book')).toBeFocused()
    await page.keyboard.press('Home')
    await expect(item(page, 'Pause')).toBeFocused()
    await page.keyboard.press('End')
    await expect(item(page, 'Open book')).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(menu(page)).toHaveCount(0)
    await expect(more).toBeFocused()
    await expect(more).toHaveAttribute('aria-expanded', 'false')
  })

  test('[P1] an outside press closes the menu and returns focus to "⋯"; Tab closes it too', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(NO_UP_NEXT)
    await page.goto(`${server.url}/`)
    const more = moreButton(page)

    await more.click()
    await expect(menu(page)).toBeVisible()
    // The author line: not a control, so focus goes back to "⋯".
    await mainBookCard(page).getByText(LEFT_HAND.authors[0], { exact: true }).click()
    await expect(menu(page)).toHaveCount(0)
    await expect(more).toBeFocused()

    // A press on another control closes the menu and leaves focus on that control.
    await more.click()
    await expect(menu(page)).toBeVisible()
    const pageField = mainBookCard(page).getByRole('spinbutton', { name: 'Page', exact: true })
    await pageField.click()
    await expect(menu(page)).toHaveCount(0)
    await expect(pageField).toBeFocused()

    // A press on "⋯" itself toggles the open menu shut.
    await more.click()
    await expect(menu(page)).toBeVisible()
    await more.click()
    await expect(menu(page)).toHaveCount(0)
    await expect(more).toHaveAttribute('aria-expanded', 'false')

    await more.click()
    await expect(item(page, 'Pause')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(menu(page)).toHaveCount(0)
  })

  test("[P1] Open book goes to the Main book's Book detail", async ({ page, seededServer }) => {
    const server = await seededServer(NO_UP_NEXT)
    await page.goto(`${server.url}/`)
    await moreButton(page).click()
    await item(page, 'Open book').click()
    await expect(page).toHaveURL(`${server.url}/book/${LEFT_HAND_ID}`)
    await expect(page.getByRole('heading', { level: 1, name: LEFT_HAND.title })).toBeVisible()
  })

  test('[P0] with no Up next, Pause from Home applies with no dialog, focus lands on Resume, then status reads the line', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'pause-home-immediate', NO_UP_NEXT)
    try {
      const pauses = requestsTo(page, PAUSE)
      await page.goto(`${server.url}/`)
      await watchStatus(page)
      await moreButton(page).click()
      await item(page, 'Pause').click()

      const resume = mainBookCard(page).getByRole('button', { name: RESUME_LEFT_HAND, exact: true })
      await expect(resume).toBeFocused()
      await expect(page.getByRole('status')).toHaveText(PAUSED_LINE)
      expect(await statusSeen(page)).toEqual([{ text: PAUSED_LINE, focused: RESUME_LEFT_HAND }])
      await expect(page.getByRole('alertdialog')).toHaveCount(0)
      expect(pauses).toHaveLength(1)

      const library = storedLibrary(server)
      expect(library.mainBookId).toBeNull()
      expect(library.upNextBookId).toBe(LEFT_HAND_ID)
      expect(storedBook(server, LEFT_HAND_ID).readings).toEqual([
        expect.objectContaining({ id: LEFT_HAND_READING_ID, currentPage: 212, pausedAt: FAKE_TODAY }),
      ])
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P0] with a paused Up next, Pause from Home closes the menu, then the Confirm dialog says Dune moves to Waiting for you.; Esc and Cancel send nothing', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(PAUSED_UP_NEXT)
    const pauses = requestsTo(page, PAUSE)
    await page.goto(`${server.url}/`)
    const more = moreButton(page)
    const dialog = pauseDialog(page)

    await more.click()
    await item(page, 'Pause').click()
    await expect(dialog).toBeVisible()
    // One overlay level: the menu went before the dialog opened.
    await expect(menu(page)).toHaveCount(0)
    await expect(dialog).toHaveAccessibleDescription('Dune moves to Waiting for you.')
    await expect(dialog).not.toContainText('returns to the catalog')
    await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(more).toBeFocused()

    await more.click()
    await item(page, 'Pause').click()
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(more).toBeFocused()
    expect(pauses).toHaveLength(0)

    await watchStatus(page)
    await more.click()
    await item(page, 'Pause').click()
    await dialog.getByRole('button', { name: 'Pause', exact: true }).click()
    const resume = mainBookCard(page).getByRole('button', { name: RESUME_LEFT_HAND, exact: true })
    await expect(resume).toBeFocused()
    await expect(page.getByRole('status')).toHaveText(PAUSED_LINE)
    expect(await statusSeen(page)).toEqual([{ text: PAUSED_LINE, focused: RESUME_LEFT_HAND }])
    expect(pauses).toHaveLength(1)

    const library = storedLibrary(server)
    expect(library.mainBookId).toBeNull()
    expect(library.upNextBookId).toBe(LEFT_HAND_ID)
    // Dune keeps its Reading, so it is in Waiting for you.
    await expect(page.getByRole('main').getByRole('button', { name: 'Resume Dune', exact: true })).toBeVisible()
  })

  test('[P0] with an unstarted Up next, Pause from Book detail says Fahrenheit 451 returns to the catalog.; Cancel returns to Pause, confirming lands on Resume', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(UNSTARTED_UP_NEXT)
    const pauses = requestsTo(page, PAUSE)
    await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
    const pause = detailButton(page, 'Pause')
    // Placed before Mark finished.
    const names = await page.getByRole('main').getByRole('button').allTextContents()
    expect(names.indexOf('Pause')).toBeGreaterThanOrEqual(0)
    expect(names.indexOf('Pause')).toBe(names.indexOf('Mark finished') - 1)
    const dialog = pauseDialog(page)

    await pause.click()
    await expect(dialog).toHaveAccessibleDescription('Fahrenheit 451 returns to the catalog.')
    await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(pause).toBeFocused()
    expect(pauses).toHaveLength(0)

    await watchStatus(page)
    await pause.click()
    await dialog.getByRole('button', { name: 'Pause', exact: true }).click()
    await expect(detailButton(page, 'Resume')).toBeFocused()
    await expect(page.getByRole('status')).toHaveText(PAUSED_LINE)
    expect(await statusSeen(page)).toEqual([{ text: PAUSED_LINE, focused: 'Resume' }])
    await expect(detailButton(page, 'Pause')).toHaveCount(0)

    const library = storedLibrary(server)
    expect(library.mainBookId).toBeNull()
    expect(library.upNextBookId).toBe(LEFT_HAND_ID)
    expect(storedBook(server, FAHRENHEIT_ID).readings).toEqual([])
  })

  test('[P0] with no Up next, Pause from Book detail applies with no dialog and lands on Resume', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(NO_UP_NEXT)
    await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
    await watchStatus(page)
    await detailButton(page, 'Pause').click()
    await expect(detailButton(page, 'Resume')).toBeFocused()
    await expect(page.getByRole('status')).toHaveText(PAUSED_LINE)
    expect(await statusSeen(page)).toEqual([{ text: PAUSED_LINE, focused: 'Resume' }])
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    expect(storedLibrary(server).upNextBookId).toBe(LEFT_HAND_ID)
  })

  test("[P2] a double click on Book detail's Pause sends one pause", async ({ page, seededServer }) => {
    const server = await seededServer(NO_UP_NEXT)
    const pauses = requestsTo(page, PAUSE)
    await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)

    await detailButton(page, 'Pause').dblclick()
    await expect(page.getByRole('status')).toHaveText(PAUSED_LINE)

    expect(pauses).toHaveLength(1)
    await expect(page.getByRole('alert')).toHaveText('')
    expect(storedLibrary(server).upNextBookId).toBe(LEFT_HAND_ID)
  })

  test("[P2] a double click on the Confirm dialog's Pause sends one pause", async ({ page, seededServer }) => {
    const server = await seededServer(PAUSED_UP_NEXT)
    const pauses = requestsTo(page, PAUSE)
    await page.goto(`${server.url}/`)
    await moreButton(page).click()
    await item(page, 'Pause').click()

    await pauseDialog(page).getByRole('button', { name: 'Pause', exact: true }).dblclick()
    await expect(page.getByRole('status')).toHaveText(PAUSED_LINE)

    expect(pauses).toHaveLength(1)
    await expect(page.getByRole('alert')).toHaveText('')
    expect(storedLibrary(server).upNextBookId).toBe(LEFT_HAND_ID)
  })

  test('[P1] a couldn\'t-save on Home without the dialog shows the line below "⋯", keeps focus there, and nothing changes', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(NO_UP_NEXT)
    await routeCouldntSave(page)
    const before = libraryBytes(server)
    await page.goto(`${server.url}/`)
    const more = moreButton(page)
    await more.click()
    await item(page, 'Pause').click()

    await expect(page.getByRole('alert')).toHaveText(COULDNT_SAVE)
    const line = mainBookCard(page).getByText(COULDNT_SAVE, { exact: true })
    await expect(line).toBeVisible()
    expect(await topOf(line)).toBeGreaterThanOrEqual(await bottomOf(more))
    await expect(more).toBeFocused()
    await expect(mainBookCard(page).getByRole('link', { name: LEFT_HAND.title, exact: true })).toBeVisible()
    expect(libraryBytes(server)).toBe(before)
  })

  test("[P1] a couldn't-save on Book detail without the dialog shows the line below Pause, keeps focus there, and nothing changes", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(NO_UP_NEXT)
    await routeCouldntSave(page)
    const before = libraryBytes(server)
    await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
    const pause = detailButton(page, 'Pause')
    await pause.click()

    await expect(page.getByRole('alert')).toHaveText(COULDNT_SAVE)
    const line = page.getByRole('main').getByText(COULDNT_SAVE, { exact: true })
    await expect(line).toBeVisible()
    const pauseBottom = await bottomOf(pause)
    expect(await topOf(line)).toBeGreaterThanOrEqual(pauseBottom)
    expect(await topOf(detailButton(page, 'Mark finished'))).toBeGreaterThanOrEqual(await bottomOf(line))
    await expect(pause).toBeFocused()
    expect(libraryBytes(server)).toBe(before)
  })

  test("[P1] a couldn't-save in the Confirm dialog keeps it open with the line above its buttons, and nothing changes", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(PAUSED_UP_NEXT)
    await routeCouldntSave(page)
    const before = libraryBytes(server)
    await page.goto(`${server.url}/`)
    await moreButton(page).click()
    await item(page, 'Pause').click()
    const dialog = pauseDialog(page)
    const confirm = dialog.getByRole('button', { name: 'Pause', exact: true })
    await confirm.click()

    await expect(page.getByRole('alert')).toHaveText(COULDNT_SAVE)
    const line = dialog.getByText(COULDNT_SAVE, { exact: true })
    await expect(line).toBeVisible()
    expect(await topOf(confirm)).toBeGreaterThanOrEqual(await bottomOf(line))
    await expect(dialog).toBeVisible()
    expect(libraryBytes(server)).toBe(before)
  })

  test('[P2] axe finds nothing on the open menu and on the Confirm dialog, in both themes', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(PAUSED_UP_NEXT)
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await page.goto(`${server.url}/`)
      await moreButton(page).click()
      await expect(menu(page)).toBeVisible()
      let { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
      expect(violations.map(({ id, nodes }) => `${colorScheme} menu: ${id} (${nodes.length})`)).toEqual([])

      await item(page, 'Pause').click()
      await expect(pauseDialog(page)).toBeVisible()
      ;({ violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze())
      expect(violations.map(({ id, nodes }) => `${colorScheme} dialog: ${id} (${nodes.length})`)).toEqual([])
      await page.keyboard.press('Escape')
    }
  })
})
