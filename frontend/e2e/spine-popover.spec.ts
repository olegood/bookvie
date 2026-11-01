// Story 1.14 Change a book's color from the shelf: the Spine popover (UX-DR28),
// its focus and closing rules, its read-only details, and the Change color
// block in the popover and on Book detail (UX-DR29). What set-spine-color does
// to the library (user color set or cleared, re-resolved spineColor, TR8) is
// proven at API level (backend/tests/test_set_spine_color.py); these tests
// read what the browser shows by role, exact accessible name and geometry.

import type { Locator, Page, Request } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import { finished, shelfOf, spine } from './bookcase.ts'

const SET_SPINE_COLOR = '/api/intents/set-spine-color'
const COULDNT_SAVE = "Couldn't save. Your data wasn't changed."
const COULDNT_SAVE_BODY = JSON.stringify({
  error: { kind: 'couldnt_save', code: 'couldnt_save', message: COULDNT_SAVE },
})
const SWATCH_NAMES = ['Sage', 'Slate', 'Clay', 'Ochre', 'Plum', 'Teal', 'Moss', 'Stone']
const SAGE = '#749076'
const TEAL = '#4B7C7B'

const DUNE_ID = '6f1c1d2e-9a4b-4c3d-8e5f-0a1b2c3d4e5f'
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

/** `#rrggbb` as the `rgb(r, g, b)` computed style reports. */
function rgbOf(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16))
  return `rgb(${r}, ${g}, ${b})`
}

/** Every POST to `path` the page sends, in order. */
function requestsTo(page: Page, path: string): Request[] {
  const sent: Request[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === path) sent.push(request)
  })
  return sent
}

/** The JSON `intent` part of a multipart intent request. */
function intentOf(request: Request): Record<string, unknown> {
  const body = (request.postDataBuffer() ?? Buffer.alloc(0)).toString('latin1')
  const json = /name="intent"[^]*?\r\n\r\n(\{[^]*?\})\r\n--/.exec(body)?.[1] ?? '{}'
  return JSON.parse(json) as Record<string, unknown>
}

test.describe('Story 1.14 Change a book’s color from the shelf (ATDD)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test.skip('[P1] AC-1 a click, Enter or Space opens one non-modal dialog popover above the spine (below on the top row), inside the viewport', async ({
    page,
    seededServer,
  }) => {
    // Eighty Books by "Author" sort before Dune and Neuromancer, so the shelf
    // wraps: Book 001 starts the top row, Dune stands on a lower one.
    const server = await seededServer({ books: [DUNE, NEUROMANCER, ...shelfOf(80)] })
    await page.goto(`${server.url}/`)
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

  test.skip('[P1] AC-2 focus moves into the popover on open; Esc, an outside click, ×, Tab past the last control and Shift+Tab from the first close it and return focus to the spine', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE, NEUROMANCER] })
    await page.goto(`${server.url}/`)
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
    for (let step = 0; step < 20 && (await card.isVisible()); step += 1) {
      await page.keyboard.press('Tab')
    }
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

  test.skip('[P1] AC-3 the popover shows title, subtitle, authors, "N pages · year", the status and color lines and "Open book →", with no primary action', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE, NEUROMANCER] })
    await page.goto(`${server.url}/`)
    await spine(page, DUNE_SPINE).click()
    const card = popover(page, 'Dune')

    await expect(card.getByText('412 pages · 1965', { exact: true })).toBeVisible()

    for (const line of ['Dune', 'Book One', 'Frank Herbert', 'finished', 'Color: Sage']) {
      await expect(card.getByText(line, { exact: true })).toBeVisible()
    }
    // No primary action until Stories 3.2 and 4.4: the only buttons are ×
    // and the eight swatches (no cover, so no "From cover").
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

  test.skip('[P0] AC-4 picking a swatch in the popover or on Book detail sends set-spine-color at once, announces "Color set to Teal." and names where the color comes from', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE, NEUROMANCER] })
    const sent = requestsTo(page, SET_SPINE_COLOR)
    await page.goto(`${server.url}/`)
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
    await page.goto(`${server.url}/`)
    await spine(page, NEUROMANCER_SPINE).click()
    await expect(popover(page, 'Neuromancer').getByText(/^Change color\s*· shown once read$/)).toBeVisible()
  })

  test.skip("[P1] AC-5 a color change that couldn't be saved shows the failure line and keeps the previous selection", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE, NEUROMANCER] })
    await page.route(`**${SET_SPINE_COLOR}`, async (route) => {
      await route.fulfill({ status: 503, contentType: 'application/json', body: COULDNT_SAVE_BODY })
    })
    await page.goto(`${server.url}/`)
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
