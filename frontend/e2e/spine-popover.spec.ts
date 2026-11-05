// Story 1.14 Change a book's color from the shelf: the Spine popover (UX-DR28),
// its focus and closing rules, its read-only details, and the Change color
// block in the popover and on Book detail (UX-DR29). What set-spine-color does
// to the library (user color set or cleared, re-resolved spineColor, TR8) is
// proven at API level (backend/tests/test_set_spine_color.py); these tests
// read what the browser shows by role, exact accessible name and geometry.

import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import { SET_SPINE_COLOR, attachCover, intentOf, requestsTo } from './intents.ts'
import { DUNE_ID, rgbOf } from './library.ts'
import { finished, search, shelfOf, spine, spines } from './bookcase.ts'

const COULDNT_SAVE = "Couldn't save. Your data wasn't changed."
const COULDNT_SAVE_BODY = JSON.stringify({
  error: { kind: 'couldnt_save', code: 'couldnt_save', message: COULDNT_SAVE },
})
const SWATCH_NAMES = ['Sage', 'Slate', 'Clay', 'Ochre', 'Plum', 'Teal', 'Moss', 'Stone']
const SAGE = '#749076'
const TEAL = '#4B7C7B'
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const NEUROMANCER_ID = '1b6e2c4a-3d5f-4e7a-9b8c-0d1e2f3a4b5c'
const DUNE_SPINE = 'Dune by Frank Herbert, finished'
const NEUROMANCER_SPINE = 'Neuromancer by William Gibson, not read yet'

// Dune is first, so its curated color is Sage; it is finished, so the spine
// shows it. Neuromancer is unread (curated Slate, outlined on the shelf).
const DUNE = {
  id: DUNE_ID,
  title: 'Dune',
  subtitle: 'Book One',
  authors: ['Frank Herbert'],
  pages: 412,
  year: 1965,
  readings: finished(412),
}
const NEUROMANCER = {
  id: NEUROMANCER_ID,
  title: 'Neuromancer',
  authors: ['William Gibson'],
  pages: 271,
  year: 1984,
}
// DUNE as the Edit book panel prefills it, to attach a cover with.
const DUNE_EDIT_FORM = {
  bookId: DUNE_ID,
  title: 'Dune',
  subtitle: 'Book One',
  pages: '412',
  authors: 'Frank Herbert',
  edition: '1',
  language: 'English',
  publisher: 'Publisher',
  type: 'paperback',
  isbn: '',
  year: '1965',
  finishedOn: '2026-03-20',
  tags: '',
  spineColor: '',
}

/** The Spine popover: a non-modal `dialog` named by the Book's title. */
function popover(page: Page, title: string): Locator {
  return page.getByRole('dialog', { name: title, exact: true })
}

function swatch(scope: Locator, name: string): Locator {
  return scope.getByRole('button', { name, exact: true })
}

/** Book detail's Change color block: the section under its "Change color" heading. */
function changeColor(page: Page): Locator {
  return page.getByRole('main').getByRole('region', { name: /^Change color/ })
}

test.describe('Story 1.14 Change a book’s color from the shelf (ATDD)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test('[P1] AC-1 a click, Enter or Space opens one non-modal dialog popover above the spine (below on the top row), inside the viewport', async ({
    page,
    seededServer,
  }) => {
    // Eighty Books by "Author" sort before Dune and Neuromancer, so the shelf
    // wraps: Book 001 starts the top row, Dune stands on a lower one.
    const server = await seededServer({ books: [DUNE, NEUROMANCER, ...shelfOf(80)] })
    await page.goto(`${server.url}/catalog`)
    const dune = spine(page, DUNE_SPINE)

    await dune.click()
    await expect(popover(page, 'Dune')).toBeVisible()

    const duneCard = popover(page, 'Dune')
    await expect(dune).toHaveAttribute('aria-haspopup', 'dialog')
    await expect(dune).toHaveAttribute('aria-expanded', 'true')
    await expect(duneCard).not.toHaveAttribute('aria-modal', 'true')
    // Above the spine, at most the viewport width − 32px, inside the viewport.
    const viewport = page.viewportSize()!
    const spineBox = (await dune.boundingBox())!
    const cardBox = (await duneCard.boundingBox())!
    expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(spineBox.y)
    expect(cardBox.width).toBeLessThanOrEqual(viewport.width - 32)
    expect(cardBox.x).toBeGreaterThanOrEqual(0)
    expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(viewport.width)

    // Only one popover at a time: opening Neuromancer's closes Dune's.
    const neuromancer = spine(page, NEUROMANCER_SPINE)
    await neuromancer.click()
    await expect(popover(page, 'Neuromancer')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(1)
    await expect(dune).toHaveAttribute('aria-expanded', 'false')
    await expect(neuromancer).toHaveAttribute('aria-expanded', 'true')

    // Enter and Space open it too.
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(neuromancer).toHaveAttribute('aria-expanded', 'false')
    await neuromancer.focus()
    await page.keyboard.press('Enter')
    await expect(popover(page, 'Neuromancer')).toBeVisible()
    await page.keyboard.press('Escape')
    await neuromancer.focus()
    await page.keyboard.press(' ')
    await expect(popover(page, 'Neuromancer')).toBeVisible()
    await page.keyboard.press('Escape')

    // The top row has no room above: the popover flips below, and at the
    // left edge it shifts inward instead of leaving the viewport.
    const first = spine(page, 'Book 001 by Author, not read yet')
    await first.click()
    const firstCard = popover(page, 'Book 001')
    await expect(firstCard).toBeVisible()
    const firstSpine = (await first.boundingBox())!
    const firstBox = (await firstCard.boundingBox())!
    expect(firstSpine.y + firstSpine.height).toBeLessThan(spineBox.y + spineBox.height)
    expect(firstBox.y).toBeGreaterThanOrEqual(firstSpine.y + firstSpine.height)
    expect(firstBox.x).toBeGreaterThanOrEqual(0)
    expect(firstBox.x + firstBox.width).toBeLessThanOrEqual(viewport.width)
  })

  test('[P1] AC-2 focus moves into the popover on open; Esc, an outside click, ×, Tab past the last control and Shift+Tab from the first close it and return focus to the spine', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE, NEUROMANCER] })
    await page.goto(`${server.url}/catalog`)
    const dune = spine(page, DUNE_SPINE)
    const card = popover(page, 'Dune')
    const openBook = card.getByRole('link', { name: 'Open book →', exact: true })

    await dune.click()
    await expect(openBook).toBeFocused()

    // Esc.
    await page.keyboard.press('Escape')
    await expect(card).toBeHidden()
    await expect(dune).toBeFocused()
    await expect(dune).toHaveAttribute('aria-expanded', 'false')

    // Shift+Tab from the first control (focus starts there).
    await page.keyboard.press('Enter')
    await expect(openBook).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(card).toBeHidden()
    await expect(dune).toBeFocused()

    // Tab through every control; Tab from the last one closes it.
    await page.keyboard.press('Enter')
    await expect(openBook).toBeFocused()
    // Tab until × (the last control) has focus, then once more: a loop on the
    // card's visibility could send an extra Tab while the close is rendering.
    const close = card.getByRole('button', { name: 'Close', exact: true })
    for (let step = 0; step < 20 && !(await close.evaluate((el) => el === document.activeElement)); step += 1) {
      await page.keyboard.press('Tab')
    }
    await expect(close).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(card).toBeHidden()
    await expect(dune).toBeFocused()

    // ×.
    await page.keyboard.press('Enter')
    await card.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(card).toBeHidden()
    await expect(dune).toBeFocused()

    // An outside click on something that takes no focus.
    await page.keyboard.press('Enter')
    await expect(card).toBeVisible()
    await page.getByRole('heading', { name: 'Bookcase', exact: true }).click()
    await expect(card).toBeHidden()
    await expect(dune).toBeFocused()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('[P1] AC-3 the popover shows title, subtitle, authors, "N pages · year", the status and color lines and "Open book →", with no primary action', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE, NEUROMANCER] })
    await page.goto(`${server.url}/catalog`)
    await spine(page, DUNE_SPINE).click()
    const card = popover(page, 'Dune')

    await expect(card.getByText('412 pages · 1965', { exact: true })).toBeVisible()

    for (const line of ['Dune', 'Book One', 'Frank Herbert', 'finished', 'Color: Sage']) {
      await expect(card.getByText(line, { exact: true })).toBeVisible()
    }
    // A finished Book with no Reading in progress has no start action (Story
    // 3.2; its re-read starts from Book detail): the only buttons are × and
    // the eight swatches (no cover, so no "From cover").
    await expect(card.getByRole('button')).toHaveCount(1 + SWATCH_NAMES.length)
    await expect(card.getByRole('button', { name: 'Close', exact: true })).toBeVisible()
    for (const name of SWATCH_NAMES) {
      await expect(swatch(card, name)).toHaveAttribute('aria-pressed', name === 'Sage' ? 'true' : 'false')
    }
    await expect(card.getByRole('button', { name: 'From cover', exact: true })).toHaveCount(0)

    // An unread Book's status line.
    await page.keyboard.press('Escape')
    await spine(page, NEUROMANCER_SPINE).click()
    const unread = popover(page, 'Neuromancer')
    await expect(unread.getByText('271 pages · 1984', { exact: true })).toBeVisible()
    await expect(unread.getByText('not read yet', { exact: true })).toBeVisible()
    await expect(unread.getByText('Color: Slate', { exact: true })).toBeVisible()

    // "Open book →" goes to Book detail.
    await page.keyboard.press('Escape')
    await spine(page, DUNE_SPINE).click()
    const link = card.getByRole('link', { name: 'Open book →', exact: true })
    await expect(link).toHaveAttribute('href', `/book/${DUNE_ID}`)
    await link.click()
    await expect(page).toHaveURL(`${server.url}/book/${DUNE_ID}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dune')
  })

  test('[P0] AC-4 picking a swatch in the popover or on Book detail sends set-spine-color at once, announces "Color set to Teal." and names where the color comes from', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE, NEUROMANCER] })
    const sent = requestsTo(page, SET_SPINE_COLOR)
    await page.goto(`${server.url}/catalog`)
    const dune = spine(page, DUNE_SPINE)
    await dune.click()
    const card = popover(page, 'Dune')

    // The swatches are toggle buttons; the curated Sage is the current color.
    await expect(swatch(card, 'Teal')).toHaveAttribute('aria-pressed', 'false')

    await swatch(card, 'Teal').click()
    await expect.poll(() => sent.map(intentOf)).toEqual([{ bookId: DUNE_ID, spineColor: TEAL }])

    await expect(page.getByRole('status')).toHaveText('Color set to Teal.')
    // Saved at once: the popover stays open with the new selection and line.
    await expect(card).toBeVisible()
    await expect(swatch(card, 'Teal')).toHaveAttribute('aria-pressed', 'true')
    await expect(swatch(card, 'Sage')).toHaveAttribute('aria-pressed', 'false')
    await expect(card.getByText('Color: set by you', { exact: true })).toBeVisible()
    await expect(dune).toHaveCSS('background-color', rgbOf(TEAL))

    // Book detail has the same block, with the line naming the source.
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const block = changeColor(page)
    await expect(block.getByRole('heading', { name: 'Change color', exact: true })).toBeVisible()
    await expect(block.getByText('Color: set by you', { exact: true })).toBeVisible()
    await expect(swatch(block, 'Teal')).toHaveAttribute('aria-pressed', 'true')
    await swatch(block, 'Sage').click()
    await expect.poll(() => sent.map(intentOf)).toEqual([
      { bookId: DUNE_ID, spineColor: TEAL },
      { bookId: DUNE_ID, spineColor: SAGE },
    ])
    await expect(page.getByRole('status')).toHaveText('Color set to Sage.')
    await expect(swatch(block, 'Sage')).toHaveAttribute('aria-pressed', 'true')
    await expect(swatch(block, 'Teal')).toHaveAttribute('aria-pressed', 'false')

    // On an unread Book the heading adds "· shown once read", here and in the popover.
    await page.goto(`${server.url}/book/${NEUROMANCER_ID}`)
    await expect(
      changeColor(page).getByRole('heading', { name: /^Change color\s*· shown once read$/ }),
    ).toBeVisible()
    await expect(changeColor(page).getByText('Color: Slate', { exact: true })).toBeVisible()
    await page.goto(`${server.url}/catalog`)
    await spine(page, NEUROMANCER_SPINE).click()
    await expect(popover(page, 'Neuromancer').getByText(/^Change color\s*· shown once read$/)).toBeVisible()
  })

  test("[P1] AC-5 a color change that couldn't be saved shows the failure line and keeps the previous selection", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE, NEUROMANCER] })
    await page.route(`**${SET_SPINE_COLOR}`, async (route) => {
      await route.fulfill({ status: 503, contentType: 'application/json', body: COULDNT_SAVE_BODY })
    })
    await page.goto(`${server.url}/catalog`)
    const dune = spine(page, DUNE_SPINE)
    await dune.click()
    const card = popover(page, 'Dune')

    // The selection before the attempt, which must stay shown.
    await expect(swatch(card, 'Sage')).toHaveAttribute('aria-pressed', 'true')

    await swatch(card, 'Teal').click()
    await expect(card.getByText(COULDNT_SAVE, { exact: true })).toBeVisible()

    await expect(page.getByRole('alert')).toHaveText(COULDNT_SAVE)
    await expect(page.getByRole('status')).toHaveText('')
    await expect(card).toBeVisible()
    await expect(swatch(card, 'Sage')).toHaveAttribute('aria-pressed', 'true')
    await expect(swatch(card, 'Teal')).toHaveAttribute('aria-pressed', 'false')
    await expect(card.getByText('Color: Sage', { exact: true })).toBeVisible()
    await expect(dune).toHaveCSS('background-color', rgbOf(SAGE))
  })
})

/** The popover's pointer: its first child, a rotated square. */
function pointerOf(card: Locator): Locator {
  return card.locator(':scope > span[aria-hidden="true"]').first()
}

/** The horizontal centre of a box. */
function centre(box: { x: number; width: number }): number {
  return box.x + box.width / 2
}

test.describe('Story 1.14 Change a book’s color from the shelf (follow-ups)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  })

  test('[P1] AC-1 at 1024px every popover is inside the viewport, at most 992px wide, its pointer at the spine; shifted inward at the right edge', async ({
    page,
    seededServer,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 })
    const server = await seededServer({ books: [DUNE, NEUROMANCER, ...shelfOf(60)] })
    await page.goto(`${server.url}/catalog`)

    // The first spine (top row, left edge), the last spine of the second row
    // (right edge), Dune (above) and the very last spine.
    const boxes = await spines(page).evaluateAll((all) =>
      all.map((el) => {
        const rect = el.getBoundingClientRect()
        return { name: el.getAttribute('aria-label')!, x: rect.x, bottom: Math.round(rect.bottom) }
      }),
    )
    const rows = [...new Set(boxes.map((box) => box.bottom))].sort((a, b) => a - b)
    expect(rows.length).toBeGreaterThanOrEqual(3)
    const secondRow = boxes.filter((box) => box.bottom === rows[1])
    const rightmost = secondRow.reduce((a, b) => (b.x > a.x ? b : a))
    const names = [boxes[0].name, rightmost.name, DUNE_SPINE, boxes.at(-1)!.name]

    for (const name of names) {
      const button = spine(page, name)
      await button.scrollIntoViewIfNeeded()
      await button.click()
      const card = page.getByRole('dialog')
      await expect(card).toBeVisible()
      const viewport = page.viewportSize()!
      const spineBox = (await button.boundingBox())!
      const cardBox = (await card.boundingBox())!
      expect(cardBox.width, name).toBeLessThanOrEqual(viewport.width - 32)
      expect(cardBox.x, name).toBeGreaterThanOrEqual(16)
      expect(cardBox.x + cardBox.width, name).toBeLessThanOrEqual(viewport.width - 16 + 0.5)
      expect(cardBox.y, name).toBeGreaterThanOrEqual(16 - 0.5)
      expect(cardBox.y + cardBox.height, name).toBeLessThanOrEqual(viewport.height - 16 + 0.5)
      const pointer = (await pointerOf(card).boundingBox())!
      expect(Math.abs(centre(pointer) - centre(spineBox)), name).toBeLessThanOrEqual(1)
      if (name === rightmost.name) {
        // Shifted inward: not centred on a spine this close to the right edge.
        expect(centre(cardBox)).toBeLessThan(centre(spineBox) - 1)
      }
      // The pointer sits between the card and the spine.
      if (cardBox.y > spineBox.y) expect(pointer.y).toBeLessThan(cardBox.y)
      else expect(pointer.y + pointer.height).toBeGreaterThan(cardBox.y + cardBox.height)
      await page.keyboard.press('Escape')
      await expect(card).toBeHidden()
    }
  })

  test('[P2] AC-3 a Book with no subtitle or year shows no empty line and no " · "; several authors are joined with "; "', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [{ title: 'Good Omens', authors: ['Terry Pratchett', 'Neil Gaiman'], pages: 1 }],
    })
    await page.goto(`${server.url}/catalog`)
    await spine(page, 'Good Omens by Terry Pratchett and 1 other, not read yet').click()
    const card = popover(page, 'Good Omens')
    await expect(card.getByText('Terry Pratchett; Neil Gaiman', { exact: true })).toBeVisible()
    await expect(card.getByText('1 page', { exact: true })).toBeVisible()
    await expect(card).not.toContainText(' · 1')
    // Title, authors, pages, status: no blank subtitle line.
    const lines = await card.locator('p').evaluateAll((all) => all.map((el) => el.textContent ?? ''))
    expect(lines.filter((line) => line.trim() === '')).toEqual([])
  })

  test('[P1] AC-4 with a cover, From cover comes first and is pressed; a swatch, then From cover, send their colors and the line names the source', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE, NEUROMANCER] })
    await attachCover(page, server, DUNE_EDIT_FORM)
    const sent = requestsTo(page, SET_SPINE_COLOR)
    await page.goto(`${server.url}/catalog`)
    const dune = spine(page, DUNE_SPINE)
    await dune.click()
    const card = popover(page, 'Dune')
    const fromCover = card.getByRole('button', { name: 'From cover', exact: true })

    await expect(fromCover).toHaveAttribute('aria-pressed', 'true')
    for (const name of SWATCH_NAMES) await expect(swatch(card, name)).toHaveAttribute('aria-pressed', 'false')
    const names = await card.getByRole('button').evaluateAll((all) => all.map((el) => el.textContent || el.getAttribute('aria-label')))
    expect(names.slice(0, 2)).toEqual(['From cover', 'Sage'])
    // rgb(200, 60, 40) is nearest to Clay.
    await expect(card.getByText('Color: Clay, from cover', { exact: true })).toBeVisible()
    const coverFill = await dune.evaluate((el) => getComputedStyle(el).backgroundColor)

    await swatch(card, 'Teal').click()
    await expect(page.getByRole('status')).toHaveText('Color set to Teal.')
    await expect(card.getByText('Color: set by you', { exact: true })).toBeVisible()
    await expect(fromCover).toHaveAttribute('aria-pressed', 'false')
    await expect(swatch(card, 'Teal')).toBeFocused()

    await fromCover.click()
    await expect(page.getByRole('status')).toHaveText('Color set to Clay.')
    await expect(fromCover).toHaveAttribute('aria-pressed', 'true')
    await expect(card.getByText('Color: Clay, from cover', { exact: true })).toBeVisible()
    await expect(dune).toHaveCSS('background-color', coverFill)
    expect(sent.map(intentOf)).toEqual([
      { bookId: DUNE_ID, spineColor: TEAL },
      { bookId: DUNE_ID, spineColor: null },
    ])
  })

  test('[P2] AC-4 picking the pressed swatch sends nothing; the swatches are reached with Tab and picked with Space', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE, NEUROMANCER] })
    const sent = requestsTo(page, SET_SPINE_COLOR)
    await page.goto(`${server.url}/catalog`)
    await spine(page, DUNE_SPINE).click()
    const card = popover(page, 'Dune')

    await swatch(card, 'Sage').click()
    await expect(card).toBeVisible()
    // Tab from "Open book →" reaches Sage, then Slate; Space picks it.
    await card.getByRole('link', { name: 'Open book →', exact: true }).focus()
    await page.keyboard.press('Tab')
    await expect(swatch(card, 'Sage')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(swatch(card, 'Slate')).toBeFocused()
    await page.keyboard.press('Space')
    await expect(page.getByRole('status')).toHaveText('Color set to Slate.')
    await expect(swatch(card, 'Slate')).toHaveAttribute('aria-pressed', 'true')
    await expect(swatch(card, 'Slate')).toBeFocused()
    // Only the Slate pick reached the server.
    expect(sent.map(intentOf)).toEqual([{ bookId: DUNE_ID, spineColor: '#5B7590' }])
  })

  test('[P1] AC-2 an outside click on Search titles closes the popover and leaves focus there; a search that hides the open spine closes it', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE, NEUROMANCER] })
    await page.goto(`${server.url}/catalog`)
    const dune = spine(page, DUNE_SPINE)
    await dune.click()
    await expect(popover(page, 'Dune')).toBeVisible()

    await search(page).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(search(page)).toBeFocused()
    await expect(dune).toHaveAttribute('aria-expanded', 'false')

    // A click on the "Search titles" label focuses its field, so focus stays there too.
    await dune.click()
    await expect(popover(page, 'Dune')).toBeVisible()
    await page.getByText('Search titles', { exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(search(page)).toBeFocused()

    // Clicking the open spine again closes it.
    await dune.click()
    await expect(popover(page, 'Dune')).toBeVisible()
    await dune.click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(dune).toBeFocused()

    // Opening another spine's popover moves focus into it: to its first
    // control, "Start reading" for a Book never started (Story 3.2).
    await dune.click()
    await spine(page, NEUROMANCER_SPINE).click()
    await expect(
      popover(page, 'Neuromancer').getByRole('button', { name: 'Start reading', exact: true }),
    ).toBeFocused()

    // A search that hides the open spine closes its popover.
    await page.keyboard.press('Escape')
    await dune.click()
    await search(page).focus()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await dune.click()
    await expect(popover(page, 'Dune')).toBeVisible()
    await search(page).evaluate((input: HTMLInputElement) => {
      // Typed without moving focus out of the popover first would close it anyway;
      // set the value as typing would, to prove the search alone closes it.
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(input, 'Neuro')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('[P1] AC-5 the failure line clears on the next pick and when the popover closes; on Book detail it shows under the block', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE, NEUROMANCER] })
    let fail = true
    await page.route(`**${SET_SPINE_COLOR}`, async (route) => {
      if (fail) await route.fulfill({ status: 500, contentType: 'application/json', body: COULDNT_SAVE_BODY })
      else await route.continue()
    })
    await page.goto(`${server.url}/catalog`)
    const dune = spine(page, DUNE_SPINE)
    await dune.click()
    const card = popover(page, 'Dune')

    await swatch(card, 'Teal').click()
    await expect(card.getByText(COULDNT_SAVE, { exact: true })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveText(COULDNT_SAVE)
    // The taller card is placed again, still clear of its spine.
    await expect
      .poll(async () => {
        const spineBox = (await dune.boundingBox())!
        const cardBox = (await card.boundingBox())!
        return cardBox.y + cardBox.height <= spineBox.y || cardBox.y >= spineBox.y + spineBox.height
      })
      .toBe(true)
    // Closing clears it.
    await page.keyboard.press('Escape')
    await expect(page.getByRole('alert')).toHaveText('')
    await dune.click()
    await expect(card.getByText(COULDNT_SAVE, { exact: true })).toHaveCount(0)

    // The next pick clears it too.
    await swatch(card, 'Teal').click()
    await expect(card.getByText(COULDNT_SAVE, { exact: true })).toBeVisible()
    fail = false
    await swatch(card, 'Plum').click()
    await expect(page.getByRole('status')).toHaveText('Color set to Plum.')
    await expect(card.getByText(COULDNT_SAVE, { exact: true })).toHaveCount(0)
    await expect(page.getByRole('alert')).toHaveText('')

    // Book detail: under the block, the previous selection kept.
    fail = true
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const block = changeColor(page)
    await swatch(block, 'Moss').click()
    await expect(block.getByText(COULDNT_SAVE, { exact: true })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveText(COULDNT_SAVE)
    await expect(swatch(block, 'Plum')).toHaveAttribute('aria-pressed', 'true')
    await expect(swatch(block, 'Moss')).toHaveAttribute('aria-pressed', 'false')
    await expect(block.getByText('Color: set by you', { exact: true })).toBeVisible()
  })

  test('[P1] AC-4 on Book detail with a cover, From cover comes first and is pressed; a swatch, then From cover, send their colors', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE, NEUROMANCER] })
    await attachCover(page, server, DUNE_EDIT_FORM)
    const sent = requestsTo(page, SET_SPINE_COLOR)
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const block = changeColor(page)
    const fromCover = block.getByRole('button', { name: 'From cover', exact: true })

    await expect(fromCover).toHaveAttribute('aria-pressed', 'true')
    const names = await block.getByRole('button').evaluateAll((all) => all.map((el) => el.textContent || el.getAttribute('aria-label')))
    expect(names.slice(0, 2)).toEqual(['From cover', 'Sage'])
    await expect(block.getByText('Color: Clay, from cover', { exact: true })).toBeVisible()

    await swatch(block, 'Teal').click()
    await expect(page.getByRole('status')).toHaveText('Color set to Teal.')
    await expect(block.getByText('Color: set by you', { exact: true })).toBeVisible()
    await expect(fromCover).toHaveAttribute('aria-pressed', 'false')

    await fromCover.click()
    await expect(page.getByRole('status')).toHaveText('Color set to Clay.')
    await expect(fromCover).toHaveAttribute('aria-pressed', 'true')
    await expect(block.getByText('Color: Clay, from cover', { exact: true })).toBeVisible()
    expect(sent.map(intentOf)).toEqual([
      { bookId: DUNE_ID, spineColor: TEAL },
      { bookId: DUNE_ID, spineColor: null },
    ])
  })

  test('[P2] AC-4 a pick made while one is in flight is ignored; the first pick ends up pressed', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE, NEUROMANCER] })
    const sent = requestsTo(page, SET_SPINE_COLOR)
    let release!: () => void
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    await page.route(`**${SET_SPINE_COLOR}`, async (route) => {
      await held
      await route.continue()
    })
    await page.goto(`${server.url}/catalog`)
    await spine(page, DUNE_SPINE).click()
    const card = popover(page, 'Dune')

    await swatch(card, 'Teal').click()
    await expect.poll(() => sent.length).toBe(1)
    await swatch(card, 'Plum').click()
    release()
    await expect(page.getByRole('status')).toHaveText('Color set to Teal.')
    await expect(swatch(card, 'Teal')).toHaveAttribute('aria-pressed', 'true')
    await expect(swatch(card, 'Plum')).toHaveAttribute('aria-pressed', 'false')
    expect(sent.map(intentOf)).toEqual([{ bookId: DUNE_ID, spineColor: TEAL }])
  })

  test('[P2] AC-1 the popover follows its spine when the page scrolls', async ({ page, seededServer }) => {
    await page.setViewportSize({ width: 1024, height: 700 })
    const server = await seededServer({ books: [DUNE, NEUROMANCER, ...shelfOf(80)] })
    await page.goto(`${server.url}/catalog`)
    const dune = spine(page, DUNE_SPINE)
    await dune.scrollIntoViewIfNeeded()
    await dune.click()
    const card = popover(page, 'Dune')
    await expect(card).toBeVisible()

    const check = async (when: string) => {
      const viewport = page.viewportSize()!
      const spineBox = (await dune.boundingBox())!
      const cardBox = (await card.boundingBox())!
      const pointer = (await pointerOf(card).boundingBox())!
      expect(Math.abs(centre(pointer) - centre(spineBox)), when).toBeLessThanOrEqual(1)
      expect(cardBox.x, when).toBeGreaterThanOrEqual(16 - 0.5)
      expect(cardBox.x + cardBox.width, when).toBeLessThanOrEqual(viewport.width - 16 + 0.5)
      expect(cardBox.y, when).toBeGreaterThanOrEqual(16 - 0.5)
      expect(cardBox.y + cardBox.height, when).toBeLessThanOrEqual(viewport.height - 16 + 0.5)
      return spineBox.y
    }
    const before = await check('before scrolling')
    await card.hover()
    await page.mouse.wheel(0, -120)
    await expect.poll(async () => (await dune.boundingBox())!.y).not.toBe(before)
    await expect(card).toBeVisible()
    await check('after scrolling')
  })

  test('[P2] AC-1 the popover follows its spine when the window is resized', async ({ page, seededServer }) => {
    await page.setViewportSize({ width: 1024, height: 900 })
    const server = await seededServer({ books: [DUNE, NEUROMANCER, ...shelfOf(40)] })
    await page.goto(`${server.url}/catalog`)
    const dune = spine(page, DUNE_SPINE)
    await dune.click()
    const card = popover(page, 'Dune')
    await expect(card).toBeVisible()
    const before = (await dune.boundingBox())!

    // Wider: the spines reflow, so Dune moves and its popover must follow.
    await page.setViewportSize({ width: 1400, height: 800 })
    await expect.poll(async () => {
      const box = (await dune.boundingBox())!
      return box.x !== before.x || box.y !== before.y
    }).toBe(true)
    await expect(card).toBeVisible()
    await expect
      .poll(async () => {
        const spineBox = (await dune.boundingBox())!
        const pointer = (await pointerOf(card).boundingBox())!
        return Math.abs(centre(pointer) - centre(spineBox))
      })
      .toBeLessThanOrEqual(1)
    const viewport = page.viewportSize()!
    const cardBox = (await card.boundingBox())!
    expect(cardBox.x).toBeGreaterThanOrEqual(16 - 0.5)
    expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(viewport.width - 16 + 0.5)
    expect(cardBox.y).toBeGreaterThanOrEqual(16 - 0.5)
    expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(viewport.height - 16 + 0.5)
  })

  test('[P2] AC-1 axe finds nothing on the open popover, in both themes', async ({ page, seededServer }) => {
    const server = await seededServer({ books: [DUNE, NEUROMANCER] })
    await attachCover(page, server, DUNE_EDIT_FORM)
    const found: string[] = []
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
      for (const name of [DUNE_SPINE, NEUROMANCER_SPINE]) {
        await page.goto(`${server.url}/catalog`)
        await spine(page, name).click()
        await expect(page.getByRole('dialog')).toBeVisible()
        const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
        found.push(...violations.map(({ id, nodes }) => `${colorScheme} ${name}: ${id} (${nodes.length})`))
      }
    }
    expect(found).toEqual([])
  })
})
