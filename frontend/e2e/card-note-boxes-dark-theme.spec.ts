// Story 14.2 See my card notes as boxes, beyond the ATDD leaves: an explicit
// Dark theme (the Theme toggle, not the OS scheme) gives the box front its dark
// shadow from tokens.css's `:root[data-theme="dark"]` block. AC-6 in
// card-note-boxes.spec.ts reaches dark only through `emulateMedia`.

import { box, boxLook, boxName, cardNotesPage, noteCount, PILE_SHELF } from './card-note-boxes.ts'
import { expect, test } from './fixtures.ts'
import { rgbOf } from './library.ts'

/** DESIGN.md → Elevation & Depth → Card note box front, dark, as computed style writes a box-shadow. */
const BOX_FRONT_SHADOW_DARK = 'rgba(0, 0, 0, 0.12) 0px -3px 0px 0px inset, rgba(0, 0, 0, 0.35) 0px 1px 2px 0px'

/** DESIGN.md page, dark theme. */
const PAGE_DARK = rgbOf('#191B18')

test.describe('Story 14.2 See my card notes as boxes, the explicit Dark theme', () => {
  test.use({ cardNotesView: null })

  test('[P2] AC-6 an explicit Dark theme gives the box front its dark shadow', async ({ page, seededServer }) => {
    const server = await seededServer(PILE_SHELF)
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(cardNotesPage(server))
    const anathem = box(page, boxName('Anathem', 21))
    await expect(anathem).toBeVisible()

    await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Dark', exact: true }).click()
    await expect(page.locator('body')).toHaveCSS('background-color', PAGE_DARK)

    const look = await boxLook(anathem, 'Anathem', noteCount(21))
    expect(look.front?.boxShadow).toBe(BOX_FRONT_SHADOW_DARK)
  })
})
