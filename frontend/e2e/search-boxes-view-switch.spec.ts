// Story 14.4 Search the boxes: a Boxes ⇄ List press during the typing pause.
// `status` reads the count once the pause ends, in the view shown then: "N
// notes match." in List, the shelf sentence in Boxes. fixtures.ts stores
// "list" before every other spec; this one turns that off. The clock is
// paused, so each press lands inside the pause however slow the machine is.

import type { Locator, Page } from '@playwright/test'
import { recordStatus, statusTexts } from './card-note-add-another.ts'
import {
  boxLinks,
  cardNotesPage,
  HABIT_BOXES,
  HABIT_COUNT_LINE,
  HABIT_SHELF,
  searchField,
  viewButton,
} from './card-note-boxes.ts'
import { expect, test } from './fixtures.ts'

/** HABIT_SHELF's shelf sentence for "habit". */
const SHELF_LINE = '17 card notes in 4 Books contain “habit”.'

/** Past the search pause and announce's tick together. */
const PAST_THE_PAUSE_MS = 1_000

/**
 * Opens `url` with Playwright's clock installed, then pauses it once `loaded`
 * shows, so the search pause (500 ms) and announce's 100 ms tick only run when
 * the test calls `runFor`. Pausing before the page has its data could strand
 * the first load (TanStack Query's `setTimeout(0)`; the Epic 6 trace flake,
 * `card-notes.spec.ts`).
 */
async function openPaused(page: Page, url: string, loaded: Locator): Promise<void> {
  const start = new Date('2026-11-10T10:00:00+01:00')
  await page.clock.install({ time: start })
  await page.goto(url)
  await expect(loaded).toBeVisible()
  // A minute on: always ahead of the running clock, and still the same day.
  await page.clock.pauseAt(new Date(start.getTime() + 60_000))
}

test.describe('Story 14.4 Search the boxes (view switch in the pause)', () => {
  test.use({ cardNotesView: null })

  test('[P1] a view press during the typing pause announces the count of the view shown when the pause ends', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    await openPaused(page, cardNotesPage(server), boxLinks(page).first())
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    await recordStatus(page)

    // Typed in Boxes, List pressed inside the pause: List's count.
    await searchField(page).fill('habit')
    await viewButton(page, 'List').click()
    await page.clock.runFor(PAST_THE_PAUSE_MS)
    await expect(page.getByRole('status')).toHaveText('17 notes match.')
    expect((await statusTexts(page)).filter(Boolean)).toEqual(['17 notes match.'])

    // Typed in List, Boxes pressed inside the pause: the shelf sentence.
    await searchField(page).press('Escape')
    await viewButton(page, 'Boxes').click()
    await expect(page.getByRole('main').getByText(HABIT_COUNT_LINE, { exact: true })).toBeVisible()
    await viewButton(page, 'List').click()
    const before = (await statusTexts(page)).length
    await searchField(page).fill('habit')
    await viewButton(page, 'Boxes').click()
    await page.clock.runFor(PAST_THE_PAUSE_MS)
    await expect(page.getByRole('status')).toHaveText(SHELF_LINE)
    const after = (await statusTexts(page)).slice(before).filter(Boolean)
    expect(after).toEqual([SHELF_LINE])
  })
})
