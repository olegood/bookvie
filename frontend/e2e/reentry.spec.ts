// Story 3.4 See where I left off and how long is left (ATDD). The Main book
// card ends with the re-entry line: up to three muted facts separated by dots,
// "Last updated …", "~N days left" and "Last export …". This spec reads what
// the browser shows: the line and its tone, where "Last export" sits, the last
// page, and a tab left open past midnight. Measured pace (AC-1) and days left
// (AC-2) are proven in backend/tests/test_reentry.py.
//
// Dates: `serverAtFakeToday` starts `bookvie --fake-today 2026-10-28` and
// fixes the browser clock at 10:00 that day in Europe/Madrid (TC-2, AD-20).
// "Last updated" counts local calendar days in the browser from the home
// view's `lastProgressUpdate`; days left comes from the server.
//
// Pace: Emma (400 pages, 2026-09-01 to 2026-09-20, 20 days inclusive) is the
// only finished Reading with a start date, so Measured pace is 20 pages a day.
// The Left Hand of Darkness at p.151 of 330 has 179 pages left: 8.95, so ~9.

import type { Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import {
  FAKE_TODAY,
  LEFT_HAND,
  LEFT_HAND_ID,
  mainAt,
  mainBookCard,
  reentryFacts,
  reentryFactsByExport,
  serverAtFakeToday,
  stopAndRemove,
} from './home.ts'
import { rgbOf } from './library.ts'

const EMMA_ID = '2a7e4b1c-8d3f-4e5a-9b6c-7d8e9f0a1b2c'
/** Emma, finished in 20 days: Measured pace 20 pages a day. */
const EMMA = {
  id: EMMA_ID,
  title: 'Emma',
  authors: ['Jane Austen'],
  pages: 400,
  readings: [{ startDate: '2026-09-01', finishDate: '2026-09-20', finishedPages: 400, currentPage: 400 }],
}

const THREE_DAYS_AGO = '2026-10-25T21:00:00+01:00' // CET: DST ended on 25 October
const YESTERDAY_LATE = '2026-10-27T23:59:00+01:00' // one local day before FAKE_TODAY
const TODAY_EARLY = `${FAKE_TODAY}T08:00:00+01:00`
// 16 October in CEST is 12 local days before the fake today.
const EXPORTED_12_DAYS_AGO = { 'local-state.json': JSON.stringify({ lastExportAt: '2026-10-16T09:30:00+02:00' }) }

const DATE_HEADER = 'Wednesday, 28 October'
// tokens.css: the re-entry line is ink-secondary, its dots ink-tertiary (DESIGN.md → Re-entry line).
const INK_SECONDARY = { light: rgbOf('#5F635C'), dark: rgbOf('#B3B7AD') }
const INK_TERTIARY = { light: rgbOf('#666961'), dark: rgbOf('#9A9E94') }

/** The Left Hand of Darkness as the Main book at `page`, last updated at `lastProgressUpdate`, plus Emma. */
function pacedMainAt(page: number, lastProgressUpdate: string | null = THREE_DAYS_AGO, others: object[] = [EMMA]) {
  return mainAt(page, { others, reading: { startDate: '2026-10-11', lastProgressUpdate } })
}

/** The ::before dot of each fact: its content (none: no dot), width and background. */
async function dots(page: Page, count: number): Promise<{ content: string; width: string; background: string }[]> {
  const result = []
  for (let i = 0; i < count; i++) {
    result.push(
      await reentryFactsByExport(page)
        .nth(i)
        .evaluate((element) => {
          const before = getComputedStyle(element, '::before')
          return { content: before.content, width: before.width, background: before.backgroundColor }
        }),
    )
  }
  return result
}

test.describe('Story 3.4 See where I left off and how long is left (ATDD)', () => {
  test('[P1] AC-3 the re-entry line shows Last updated, ~N days left and Last export as muted facts separated by dots, never a warning', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    const paced = await serverAtFakeToday(page, 'reentry-paced', pacedMainAt(151), EXPORTED_12_DAYS_AGO)
    const lastPage = await serverAtFakeToday(page, 'reentry-one-day', pacedMainAt(329, YESTERDAY_LATE))
    const noPace = await serverAtFakeToday(page, 'reentry-no-pace', pacedMainAt(151, TODAY_EARLY, []))
    try {
      await page.goto(paced.url)

      await expect(reentryFacts(page)).toHaveText(['Last updated 3 days ago', '~9 days left', 'Last export: 12 days ago'])

      // Muted in both themes: ink-secondary text, a 6px ink-tertiary dot before
      // every fact but the first, and nothing announced as an alert (UX-DR37, NFR6).
      for (const theme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme: theme })
        const facts = reentryFacts(page)
        for (let i = 0; i < 3; i++) {
          const fact = facts.nth(i)
          await expect(fact).toHaveCSS('color', INK_SECONDARY[theme])
          const dot = await fact.evaluate((element) => {
            const before = getComputedStyle(element, '::before')
            return { width: before.width, background: before.backgroundColor }
          })
          if (i === 0) expect(dot.width).not.toBe('6px')
          else expect(dot).toEqual({ width: '6px', background: INK_TERTIARY[theme] })
        }
      }
      await expect(page.getByRole('alert')).toHaveText('')
      // The line closes the card: below the page field and its Update.
      const update = (await mainBookCard(page).getByRole('button', { name: 'Update', exact: true }).boundingBox())!
      const line = (await reentryFacts(page).first().boundingBox())!
      expect(line.y).toBeGreaterThanOrEqual(update.y + update.height)

      // One local day, the minimum "~1 day left" (1 page at 20 a day), and no export yet.
      await page.goto(lastPage.url)
      await expect(reentryFacts(page)).toHaveText(['Last updated yesterday', '~1 day left', 'No export yet'])

      // Updated this morning, and no Measured pace: days left is hidden, not "~0".
      await page.goto(noPace.url)
      await expect(reentryFacts(page)).toHaveText(['Last updated today', 'No export yet'])
      await expect(mainBookCard(page)).not.toContainText(/days? left/)
    } finally {
      await stopAndRemove(paced)
      await stopAndRemove(lastPage)
      await stopAndRemove(noPace)
    }
  })

  test('[P2] AC-4 with a Main book, Last export sits in the re-entry line; with none, it returns to the Home header line', async ({
    page,
  }) => {
    const withMain = await serverAtFakeToday(page, 'reentry-export-main', pacedMainAt(151), EXPORTED_12_DAYS_AGO)
    const noMain = await serverAtFakeToday(page, 'reentry-export-no-main', { books: [LEFT_HAND, EMMA] }, EXPORTED_12_DAYS_AGO)
    try {
      await page.goto(withMain.url)
      const main = page.getByRole('main')

      await expect(mainBookCard(page).getByText('Last export: 12 days ago', { exact: true })).toBeVisible()

      // Only there: not also on the header line.
      await expect(main.getByText(/^Last export/)).toHaveCount(1)
      await expect(main.getByText(DATE_HEADER, { exact: true }).locator('..')).not.toContainText(/Last export/)

      await page.goto(noMain.url)
      await expect(main.getByText(DATE_HEADER, { exact: true }).locator('..')).toContainText('Last export: 12 days ago')
      await expect(mainBookCard(page)).not.toContainText(/Last export|Last updated/)
      await expect(main.getByText(/^Last export/)).toHaveCount(1)
    } finally {
      await stopAndRemove(withMain)
      await stopAndRemove(noMain)
    }
  })

  test('[P1] AC-5 a Main book at its last page shows a 100% gauge and hides ~N days left', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'reentry-last-page', pacedMainAt(330), EXPORTED_12_DAYS_AGO)
    try {
      await page.goto(server.url)

      await expect(reentryFacts(page)).toHaveText(['Last updated 3 days ago', 'Last export: 12 days ago'])

      await expect(mainBookCard(page).getByRole('progressbar')).toHaveAttribute('aria-valuetext', '100%, page 330 of 330')
      await expect(mainBookCard(page)).not.toContainText(/days? left/)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] AC-6 a tab left open past midnight recomputes Last updated and the Home date when it regains focus or visibility', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(pacedMainAt(151, `${FAKE_TODAY}T09:00:00+01:00`))
    await page.clock.setFixedTime(new Date(`${FAKE_TODAY}T23:59:00+01:00`))
    await page.goto(server.url)
    const main = page.getByRole('main')
    await main.getByText(DATE_HEADER, { exact: true }).waitFor()

    await page.clock.setFixedTime(new Date('2026-10-29T00:01:00+01:00'))
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))

    await expect(mainBookCard(page).getByText('Last updated yesterday', { exact: true })).toBeVisible()

    await expect(main.getByText('Thursday, 29 October', { exact: true })).toBeVisible()

    await page.clock.setFixedTime(new Date('2026-10-30T00:01:00+01:00'))
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await expect(mainBookCard(page).getByText('Last updated 2 days ago', { exact: true })).toBeVisible()
    await expect(main.getByText('Friday, 30 October', { exact: true })).toBeVisible()
  })

  // --- Green-phase follow-ups ---------------------------------------------------

  test('[P2] AC-3 a last update over a year ago reads "Last updated over a year ago"', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'reentry-a-year', pacedMainAt(151, '2025-10-01T09:00:00+02:00'))
    try {
      await page.goto(server.url)

      await expect(reentryFacts(page)).toHaveText(['Last updated over a year ago', '~9 days left', 'No export yet'])
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-3 without a lastProgressUpdate the "Last updated" fact is omitted and the first remaining fact has no dot', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    const server = await serverAtFakeToday(page, 'reentry-no-update', pacedMainAt(151, null), EXPORTED_12_DAYS_AGO)
    try {
      await page.goto(server.url)

      await expect(reentryFactsByExport(page)).toHaveText(['~9 days left', 'Last export: 12 days ago'])
      await expect(mainBookCard(page)).not.toContainText('Last updated')
      const [first, second] = await dots(page, 2)
      // The first fact has no generated ::before box at all, not just a smaller one.
      expect(['none', 'normal']).toContain(first.content)
      expect(second).toEqual({ content: '""', width: '6px', background: INK_TERTIARY.light })
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-4 deleting the Main book moves "Last export" back to the Home header line', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'reentry-delete-main', pacedMainAt(151), EXPORTED_12_DAYS_AGO)
    try {
      await page.goto(server.url)
      const main = page.getByRole('main')
      await expect(mainBookCard(page).getByText('Last export: 12 days ago', { exact: true })).toBeVisible()

      await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
      await main.getByRole('button', { name: 'Delete', exact: true }).click()
      await page.getByRole('alertdialog').getByRole('button', { name: 'Delete book', exact: true }).click()
      await expect(page.getByRole('alertdialog')).toBeHidden()
      await page.getByRole('navigation').getByRole('link', { name: 'Home', exact: true }).click()

      await expect(main.getByText(DATE_HEADER, { exact: true }).locator('..')).toContainText('Last export: 12 days ago')
      await expect(mainBookCard(page)).toContainText('No Main book.')
      await expect(mainBookCard(page)).not.toContainText(/Last export|Last updated/)
      await expect(main.getByText(/^Last export/)).toHaveCount(1)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-6 past midnight, "Last export" in the line recomputes from the same now', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'reentry-export-midnight', pacedMainAt(151), EXPORTED_12_DAYS_AGO)
    try {
      await page.clock.setFixedTime(new Date(`${FAKE_TODAY}T23:59:00+01:00`))
      await page.goto(server.url)
      await expect(reentryFacts(page)).toHaveText(['Last updated 3 days ago', '~9 days left', 'Last export: 12 days ago'])

      await page.clock.setFixedTime(new Date('2026-10-29T00:01:00+01:00'))
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))

      await expect(reentryFacts(page)).toHaveText(['Last updated 4 days ago', '~9 days left', 'Last export: 13 days ago'])
      await expect(page.getByRole('main').getByText('Thursday, 29 October', { exact: true })).toBeVisible()
    } finally {
      await stopAndRemove(server)
    }
  })
})
