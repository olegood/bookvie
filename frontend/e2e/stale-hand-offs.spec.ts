// Epic 3 retro F-R2, F-R3, F-R4: client paths that act on state another tab
// (here: a direct intent request) has already changed.
//
// - The Start and Finish dialogs fix their answers from a `book` view fetched
//   after they open, never from a stale cached copy of an earlier visit.
// - A finished hand-off that lands on Home while another Book is Main is
//   dropped, so a later reload with no Main book never replays it (AD-7).
// - A refusal that unmounts Edit Purpose still reaches `alert`.
//
// Each leaf caches a `book` view by visiting Book detail first, then changes
// the server behind the page's back, then moves within the app (no reload, so
// the cache survives).

import type { Page } from '@playwright/test'
import { expect, test, type Server } from './fixtures.ts'
import {
  DUNE,
  DUNE_ID,
  LEFT_HAND,
  LEFT_HAND_ID,
  mainAt,
  mainBookCard,
  serverAtFakeToday,
  stopAndRemove,
  storedBook,
} from './home.ts'
import { EDIT_PURPOSE, FINISH_READING, START_READING } from './intents.ts'

const PURPOSE = 'To see how Le Guin builds a world'
const FINISH_DIALOG = 'Finished The Left Hand of Darkness'
const ALREADY_FINISHED = 'This reading is already finished.'

/** An intent sent as another tab would: straight to the server, bypassing this page's cache. */
async function elsewhere(page: Page, server: Server, path: string, intent: Record<string, unknown>): Promise<void> {
  const response = await page.request.post(`${server.url}${path}`, { multipart: { intent: JSON.stringify(intent) } })
  expect(response.status(), await response.text()).toBe(200)
}

function nav(page: Page, name: string) {
  return page.getByRole('navigation').getByRole('link', { name, exact: true })
}

test.describe('Epic 3 retro: stale client hand-offs', () => {
  test('[P1] F-R2 the Finish dialog asks about the Purpose the server has, not a cached one', async ({ page }) => {
    const server = await serverAtFakeToday(
      page,
      'stale-finish',
      mainAt(300, { reading: { startDate: '2026-10-01', purpose: PURPOSE }, others: [DUNE] }),
    )
    try {
      // Book detail caches the Reading with its Purpose.
      await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
      await expect(page.getByRole('main').getByText(PURPOSE)).toBeVisible()
      // Another tab clears the Purpose.
      await elsewhere(page, server, EDIT_PURPOSE, { bookId: LEFT_HAND_ID, purpose: '' })

      await nav(page, 'Home').click()
      const field = mainBookCard(page).getByRole('spinbutton', { name: 'Page', exact: true })
      await field.fill('330')
      await field.press('Enter')

      const dialog = page.getByRole('dialog', { name: FINISH_DIALOG, exact: true })
      await expect(dialog).toBeVisible()
      await expect(dialog.getByRole('radiogroup', { name: 'Rating', exact: true })).toBeVisible()
      await expect(dialog.getByRole('radiogroup', { name: 'Purpose fulfilled?', exact: true })).toHaveCount(0)
      await expect(dialog.getByText(PURPOSE)).toHaveCount(0)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] F-R2 the Start dialog resumes with the stored Purpose when the cached view still says Start', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stale-start', { books: [{ ...LEFT_HAND, readings: [] }, DUNE] })
    try {
      // Book detail caches The Left Hand of Darkness as never started.
      await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
      await expect(page.getByRole('main').getByRole('button', { name: 'Start reading', exact: true })).toBeVisible()
      // Another tab starts it with a Purpose, then starts Dune, which pauses it.
      await elsewhere(page, server, START_READING, { bookId: LEFT_HAND_ID, purpose: PURPOSE })
      await elsewhere(page, server, START_READING, { bookId: DUNE_ID, purpose: null })

      await nav(page, 'Catalog').click()
      await page
        .getByRole('button', { name: /^The Left Hand of Darkness by Ursula K\. Le Guin, waiting for you/ })
        .click()
      await page
        .getByRole('dialog', { name: 'The Left Hand of Darkness', exact: true })
        .getByRole('button', { name: 'Resume', exact: true })
        .click()

      const dialog = page.getByRole('dialog', { name: 'Resume The Left Hand of Darkness?', exact: true })
      await expect(dialog).toBeVisible()
      await expect(dialog.getByRole('textbox', { name: 'Purpose (optional)', exact: true })).toHaveValue(PURPOSE)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] F-R3 a finish that lands on Home with another Main book never replays on a later reload', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(
      page,
      'stale-hand-off',
      mainAt(300, { reading: { startDate: '2026-10-01' }, others: [DUNE] }),
    )
    try {
      // This tab still shows The Left Hand of Darkness as Main …
      await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
      const markFinished = page.getByRole('main').getByRole('button', { name: 'Mark finished', exact: true })
      await expect(markFinished).toBeVisible()
      // … while another tab makes Dune Main, pausing it.
      await elsewhere(page, server, START_READING, { bookId: DUNE_ID, purpose: null })

      await markFinished.click()
      const dialog = page.getByRole('dialog', { name: FINISH_DIALOG, exact: true })
      await dialog.getByRole('button', { name: 'Done', exact: true }).click()
      await expect(dialog).toHaveCount(0)
      await expect(mainBookCard(page).getByRole('link', { name: 'Dune', exact: true })).toBeVisible()
      expect(storedBook(server, LEFT_HAND_ID).readings[0]?.finishDate).toBe('2026-10-28')

      // Another tab finishes Dune too: now there is no Main book.
      await elsewhere(page, server, FINISH_READING, {
        bookId: DUNE_ID,
        finishedOn: '2026-10-28',
        purposeFulfilled: null,
        rating: null,
      })
      await page.reload()

      const empty = mainBookCard(page).getByRole('heading', { name: 'No Main book.', exact: true })
      await expect(empty).toBeVisible()
      await expect(empty).not.toBeFocused()
      await expect(page.getByText('Finished The Left Hand of Darkness.')).toHaveCount(0)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] F-R4 a refusal that removes Edit Purpose still reads in alert', async ({ page }) => {
    const server = await serverAtFakeToday(
      page,
      'stale-purpose',
      mainAt(300, { reading: { startDate: '2026-10-01', purpose: PURPOSE }, others: [DUNE] }),
    )
    try {
      await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
      await page.getByRole('main').getByRole('button', { name: 'Edit Purpose', exact: true }).click()
      const field = page.getByRole('main').getByRole('textbox', { name: 'Purpose', exact: true })
      await field.fill('For the politics')
      // Another tab finishes the Reading.
      await elsewhere(page, server, FINISH_READING, {
        bookId: LEFT_HAND_ID,
        finishedOn: '2026-10-28',
        purposeFulfilled: null,
        rating: null,
      })

      await field.press('Enter')

      await expect(page.getByRole('alert')).toHaveText(ALREADY_FINISHED)
      await expect(field).toHaveCount(0)
    } finally {
      await stopAndRemove(server)
    }
  })
})
