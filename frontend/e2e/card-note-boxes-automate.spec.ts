// Story 14.2 See my card notes as boxes: test automation after the story was
// done, beside the ATDD leaves in card-note-boxes.spec.ts. A restore keeps the
// remembered view; the toggle matches Catalog's in dark and keeps its
// Highlight indicator under forced colors; twin titles get one box each in
// Book-id order; a white front is still drawn by its shadow; Boxes view and
// Back to top pass axe; the count line's singular Book and dark color; a focus
// refetch adds a box; and typing back to blank brings the boxes back.

import { rmSync } from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { backToTop, scrollToY } from './back-to-top.ts'
import {
  box,
  boxLinks,
  boxLook,
  boxName,
  cardNotesPage,
  cardNotesViewToggle,
  groupHeadings,
  MANY_BOXES,
  noteCount,
  notesOf,
  PILE_BOXES,
  PILE_COUNT_LINE,
  PILE_SHELF,
  searchField,
  VIEW_KEY,
  viewButton,
} from './card-note-boxes.ts'
import { storedChoice } from './card-note-add-another.ts'
import { systemColor } from './dev-mode.ts'
import { expect, startSeededServer, test } from './fixtures.ts'
import { ADD_CARD_NOTE } from './intents.ts'
import { bookId, rgbOf } from './library.ts'
import { exportOf, restoreButton, restoreFrom } from './restore.ts'
import { AXE_TAGS } from './stats.ts'

/** DESIGN.md → Elevation & Depth → Card note box front, light, as computed style writes a box-shadow. */
const BOX_FRONT_SHADOW = 'rgba(0, 0, 0, 0.12) 0px -3px 0px 0px inset, rgba(43, 46, 42, 0.12) 0px 1px 2px 0px'

/** `ink-tertiary` in dark (DESIGN.md → Colors). */
const INK_TERTIARY_DARK = rgbOf('#9A9E94')

const RESTORED = 'Restored.'

/** A view toggle's computed look: the group, its pressed option and its unpressed one. */
function toggleLook(page: Page, group: string) {
  return page
    .getByRole('main')
    .getByRole('group', { name: group, exact: true })
    .evaluate((element) => {
      const pick = (el: Element) => {
        const s = getComputedStyle(el)
        return [s.backgroundColor, s.borderTop, s.borderBottom, s.borderRadius, s.padding, s.font, s.color].join(' | ')
      }
      const buttons = Array.from(element.querySelectorAll('button'))
      return {
        group: pick(element),
        pressed: pick(buttons.find((b) => b.getAttribute('aria-pressed') === 'true') as Element),
        unpressed: pick(buttons.find((b) => b.getAttribute('aria-pressed') === 'false') as Element),
      }
    })
}

test.describe('Story 14.2 See my card notes as boxes (automate)', () => {
  test.use({ cardNotesView: null })

  test('[P1] AC-3 a restore of another library keeps the remembered view, "boxes" and "list" alike', async ({
    page,
    seededServer,
  }, testInfo) => {
    const source = await seededServer(PILE_SHELF)
    const archive = await exportOf(page, source)
    const target = await startSeededServer(testInfo, 'boxes-restore-target', {
      books: [{ id: bookId(9), title: 'Walden', authors: ['Henry David Thoreau'], cardNotes: notesOf('Walden', 2) }],
    })
    try {
      for (const choice of ['boxes', 'list'] as const) {
        await page.goto(`${target.url}/backup`)
        await page.evaluate(([key, value]) => window.localStorage.setItem(key, value), [VIEW_KEY, choice] as const)
        await expect(restoreButton(page)).toBeEnabled()
        await restoreFrom(page, archive)
        await expect(page.getByRole('status')).toHaveText(RESTORED)
        expect(await storedChoice(page, VIEW_KEY), choice).toBe(choice)
      }

      // The kept "list" applies to the restored library.
      await page.goto(cardNotesPage(target))
      await expect(viewButton(page, 'List')).toHaveAttribute('aria-pressed', 'true')
      await expect(groupHeadings(page)).toHaveText(PILE_BOXES.map(({ title }) => title))
    } finally {
      expect(await target.stop()).toBe('')
      rmSync(target.dataDir, { recursive: true, force: true })
    }
  })

  test('[P2] AC-3 in dark the toggle looks like the Catalog view toggle; under forced colors the pressed option keeps its Highlight indicator', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(PILE_SHELF)
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto(cardNotesPage(server))
    await expect(viewButton(page, 'Boxes')).toHaveAttribute('aria-pressed', 'true')
    const cardNotes = await toggleLook(page, 'Card notes view')
    await page.goto(`${server.url}/catalog`)
    await expect(page.getByRole('main').getByRole('group', { name: 'Catalog view', exact: true })).toBeVisible()
    expect(cardNotes).toEqual(await toggleLook(page, 'Catalog view'))

    await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' })
    await page.goto(cardNotesPage(server))
    await expect(viewButton(page, 'Boxes')).toHaveAttribute('aria-pressed', 'true')
    const highlight = await systemColor(page, 'Highlight')
    await expect(viewButton(page, 'Boxes')).toHaveCSS('border-bottom-color', highlight)
    await expect(viewButton(page, 'List')).not.toHaveCSS('border-bottom-color', highlight)
  })

  test('[P2] AC-5 two Books with the same title get a box each, in Book-id order, under the same name', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [
        { id: bookId(2), title: 'Emma', authors: ['Jane Austen'], pages: 474, cardNotes: notesOf('Emma two', 1) },
        { id: bookId(1), title: 'Emma', authors: ['Jane Austen'], pages: 474, cardNotes: notesOf('Emma one', 1) },
      ],
    })
    await page.goto(cardNotesPage(server))

    await expect(boxLinks(page)).toHaveCount(2)
    for (const [i, id] of [bookId(1), bookId(2)].entries()) {
      await expect(boxLinks(page).nth(i)).toHaveAttribute('href', `/card-notes?book=${id}`)
      await expect(boxLinks(page).nth(i)).toHaveAccessibleName(boxName('Emma', 1))
    }
    await expect(page.getByRole('main').getByText('2 card notes in 2 Books', { exact: true })).toBeVisible()
  })

  test('[P2] AC-6 a white spine color still shows its front, drawn by the box-front shadow with no edge line', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [
        {
          id: bookId(1),
          title: 'Walden',
          authors: ['Henry David Thoreau'],
          spineColorUser: '#FFFFFF',
          cardNotes: notesOf('Walden', 3),
        },
      ],
    })
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(cardNotesPage(server))
    const walden = box(page, boxName('Walden', 3))
    await expect(walden).toBeVisible()

    const look = await boxLook(walden, 'Walden', noteCount(3))
    expect(look.front?.background).toBe('rgb(255, 255, 255)')
    expect(look.front?.boxShadow).toBe(BOX_FRONT_SHADOW)
    expect(look.front?.borderWidth).toBe('0px')
    expect(look.front).toMatchObject({ left: 0, top: 80, width: 216, height: 116 })
    expect(look.cards).toHaveLength(3)
  })

  test('[P1] AC-7 Boxes view passes axe in light and dark with a box focused', async ({ page, seededServer }) => {
    const server = await seededServer(PILE_SHELF)
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await page.goto(cardNotesPage(server))
      await expect(boxLinks(page)).toHaveCount(PILE_BOXES.length)
      const candide = box(page, boxName('Candide', 5))
      await searchField(page).focus()
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await expect(candide).toBeFocused()
      const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
      expect(violations.map(({ id, nodes }) => `${colorScheme}: ${id} (${nodes.length})`)).toEqual([])
    }
  })

  test('[P2] AC-8 the count line reads "12 card notes in 1 Book", in ink-tertiary dark in dark', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [{ id: bookId(1), title: 'Walden', authors: ['Henry David Thoreau'], cardNotes: notesOf('Walden', 12) }],
    })
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto(cardNotesPage(server))

    const line = page.getByRole('main').getByText('12 card notes in 1 Book', { exact: true })
    await expect(line).toBeVisible()
    await expect(line).toHaveCSS('color', INK_TERTIARY_DARK)
    await expect(box(page, boxName('Walden', 12))).toBeVisible()
  })

  test('[P1] AC-8 a note added in another context adds a box and updates the count line once the page regains focus', async ({
    page,
    browser,
    seededServer,
  }) => {
    const server = await seededServer(PILE_SHELF)
    await page.goto(cardNotesPage(server))
    await expect(page.getByRole('main').getByText(PILE_COUNT_LINE, { exact: true })).toBeVisible()
    await expect(boxLinks(page)).toHaveCount(PILE_BOXES.length)

    const otherContext = await browser.newContext()
    try {
      // Austerlitz had no notes, so it had no box.
      const added = await otherContext.request.post(`${server.url}${ADD_CARD_NOTE}`, {
        multipart: { intent: JSON.stringify({ bookId: bookId(7), text: 'Rings of memory.', page: '12' }) },
      })
      expect(added.status()).toBe(200)
    } finally {
      await otherContext.close()
    }

    await page.bringToFront()
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(page.getByRole('main').getByText('56 card notes in 7 Books', { exact: true })).toBeVisible()
    await expect(boxLinks(page)).toHaveCount(PILE_BOXES.length + 1)
    // In the groups' order: title, so second.
    await expect(boxLinks(page).nth(1)).toHaveAccessibleName(boxName('Austerlitz', 1))
    await expect(page.getByRole('alert')).toHaveText('')
  })

  test('[P2] AC-10 deleting the search text character by character brings the boxes and the count line back', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(PILE_SHELF)
    await page.goto(cardNotesPage(server))
    await expect(boxLinks(page)).toHaveCount(PILE_BOXES.length)

    await searchField(page).pressSequentially('Emma')
    await expect(groupHeadings(page)).toHaveText(['Emma'])
    await expect(boxLinks(page)).toHaveCount(0)

    for (const left of ['Emm', 'Em', 'E']) {
      await page.keyboard.press('Backspace')
      await expect(searchField(page)).toHaveValue(left)
      await expect(boxLinks(page), left).toHaveCount(0)
    }
    await page.keyboard.press('Backspace')
    await expect(searchField(page)).toHaveValue('')
    await expect(boxLinks(page)).toHaveCount(PILE_BOXES.length)
    await expect(page.getByRole('main').getByText(PILE_COUNT_LINE, { exact: true })).toBeVisible()
    await expect(groupHeadings(page)).toHaveCount(0)
    await expect(viewButton(page, 'Boxes')).toHaveAttribute('aria-pressed', 'true')
    await expect(cardNotesViewToggle(page)).toBeVisible()
  })

  test('[P2] AC-11 Boxes view passes axe with Back to top shown, in light and dark', async ({ page, seededServer }) => {
    const server = await seededServer(MANY_BOXES)
    await page.setViewportSize({ width: 1280, height: 720 })
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await page.goto(cardNotesPage(server))
      await expect(box(page, boxName('Book 40', 1))).toBeAttached()
      await scrollToY(page, 'bottom')
      await expect(backToTop(page)).toBeVisible()
      const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
      expect(violations.map(({ id, nodes }) => `${colorScheme}: ${id} (${nodes.length})`)).toEqual([])
    }
  })
})
