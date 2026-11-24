// Story 14.4 Search the boxes: a Boxes ⇄ List press during the typing pause.
// `status` reads the count once the pause ends, in the view shown then: "N
// notes match." in List, the shelf sentence in Boxes. fixtures.ts stores
// "list" before every other spec; this one turns that off. The clock is
// paused, so each press lands inside the pause however slow the machine is.

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
import { openPaused } from './library.ts'

/** HABIT_SHELF's shelf sentence for "habit". */
const SHELF_LINE = '17 card notes in 4 Books contain “habit”.'

/** Past the search pause and announce's tick together. */
const PAST_THE_PAUSE_MS = 1_000

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
