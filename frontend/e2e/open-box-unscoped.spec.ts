// Story 14.3 See the open box in its Book's color, beyond the ATDD leaves: the
// open box strip is on the open box only. The unscoped page, in Boxes view and
// in List view, has no strip, and removing the "In X" chip takes it away.

import {
  boxLinks,
  cardNotesPage,
  groupHeadings,
  openBoxColor,
  openBoxStrip,
  PILE_BOXES,
  PILE_SHELF,
  viewButton,
} from './card-note-boxes.ts'
import { expect, test } from './fixtures.ts'
import { bookId } from './library.ts'

/** The List view's group titles for PILE_SHELF, in the groups' order (from PILE_BOXES). */
const ALL_GROUPS = PILE_BOXES.map((entry) => entry.title)

test.describe("Story 14.3 See the open box in its Book's color, the unscoped page", () => {
  test.use({ cardNotesView: null })

  test('[P1] AC-1 the unscoped Boxes and List views show no open box strip, and removing the chip takes it away', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(PILE_SHELF)
    const candide = await openBoxColor(page, server.url, bookId(3))
    await page.goto(cardNotesPage(server))

    // Boxes view: every box has rendered, and nothing paints a strip.
    await expect(boxLinks(page)).toHaveCount(PILE_BOXES.length)
    expect(await openBoxStrip(page)).toBeNull()

    // List view: the groups have rendered, and still no strip.
    await viewButton(page, 'List').click()
    await expect(groupHeadings(page)).toHaveText(ALL_GROUPS)
    expect(await openBoxStrip(page)).toBeNull()

    // Back to Boxes (remembered), so removing the chip below lands in Boxes view.
    await viewButton(page, 'Boxes').click()
    await expect(boxLinks(page)).toHaveCount(PILE_BOXES.length)

    // The open box has it; "Remove In Candide" goes back to the unscoped page without it.
    await page.goto(cardNotesPage(server, bookId(3)))
    await expect.poll(async () => (await openBoxStrip(page))?.background).toBe(candide)
    await page.getByRole('button', { name: 'Remove In Candide', exact: true }).click()
    await expect(page).toHaveURL(cardNotesPage(server))
    // Every Book's box: the scoped page has gone.
    await expect(boxLinks(page)).toHaveCount(PILE_BOXES.length)
    expect(await openBoxStrip(page)).toBeNull()
  })
})
