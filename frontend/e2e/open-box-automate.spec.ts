// Story 14.3 See the open box in its Book's color: test automation after the
// story was done, beside the ATDD leaves in open-box.spec.ts. The open box
// passes axe, with notes and without, and with Back to top shown. An unread
// Book's strip keeps its own color, and a white one is still painted with no
// edge. Back after "Remove In X" brings the strip back. The strip spans the
// window at 1024px and 1440px and scrolls away with the page. It starts under
// the update notice when that shows. It stays through a focus refetch, takes a
// new spine color, and takes its height from `--open-box-strip-height`.

import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page } from '@playwright/test'
import { backToTop, LAST_NOTE, LONG_NOTES, scrollToY } from './back-to-top.ts'
import {
  box,
  boxLinks,
  boxName,
  cardNotesPage,
  DUBLINERS_COLOR,
  groupHeadings,
  notesOf,
  openBoxColor,
  openBoxStrip,
  PILE_BOXES,
  PILE_SHELF,
} from './card-note-boxes.ts'
import { cardNotesBlock } from './card-note-keys.ts'
import { expect, test } from './fixtures.ts'
import { ADD_CARD_NOTE } from './intents.ts'
import { bookId, rgbOf } from './library.ts'
import { AXE_TAGS } from './stats.ts'
import { answerAppInfo, NEWER_VERSION, noticeSentence, productionInfo } from './update-notice.ts'

/** PILE_SHELF's Candide (5 notes, read), Dubliners (2 notes, unread, set by the user) and Austerlitz (no notes). */
const CANDIDE_ID = bookId(3)
const DUBLINERS_ID = bookId(4)
const AUSTERLITZ_ID = bookId(7)

/** The top bar's height, `--space-topbar-height` (tokens.css): the header's bottom with no update notice. */
const TOPBAR_HEIGHT = 60

/** A curated swatch on Book detail's Change color block (spine-popover.spec.ts). */
const TEAL = '#4B7C7B'

/** The strip element itself: the `aria-hidden` child of `main` before the page (for node identity, not looks). */
function stripNode(page: Page): Locator {
  return page.getByRole('main').locator(':scope > [aria-hidden="true"]')
}

test.describe("Story 14.3 See the open box in its Book's color (automate)", () => {
  test.use({ cardNotesView: null })

  test('[P1] AC-1 the open box passes axe in light and dark, with notes and without', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(PILE_SHELF)
    const colors = {
      Candide: await openBoxColor(page, server.url, CANDIDE_ID),
      Austerlitz: await openBoxColor(page, server.url, AUSTERLITZ_ID),
    }
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      for (const [title, id] of [
        ['Candide', CANDIDE_ID],
        ['Austerlitz', AUSTERLITZ_ID],
      ] as const) {
        await page.goto(cardNotesPage(server, id))
        await expect.poll(async () => (await openBoxStrip(page))?.background).toBe(colors[title])
        const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
        expect(violations.map(({ id: rule, nodes }) => `${colorScheme} ${title}: ${rule} (${nodes.length})`)).toEqual(
          [],
        )
      }
    }
  })

  test("[P1] AC-1 an unread Book's strip is its own spine color, never an unread color", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(PILE_SHELF)
    await page.goto(cardNotesPage(server))
    await box(page, boxName('Dubliners', 2)).click()

    await expect(page).toHaveURL(cardNotesPage(server, DUBLINERS_ID))
    // Dubliners has no finished reading, and its strip is the color the user set, exactly.
    await expect.poll(async () => (await openBoxStrip(page))?.background).toBe(rgbOf(DUBLINERS_COLOR))
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect.poll(async () => (await openBoxStrip(page))?.background).toBe(rgbOf(DUBLINERS_COLOR))
  })

  test('[P2] AC-1 a white spine color still paints the strip, with no edge or shadow added', async ({
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
    await page.goto(cardNotesPage(server, bookId(1)))

    await expect.poll(async () => (await openBoxStrip(page))?.background).toBe('rgb(255, 255, 255)')
    expect(await openBoxStrip(page)).toMatchObject({ height: 8, borders: '0px 0px 0px 0px', boxShadow: 'none' })
  })

  test('[P2] AC-1 Back after "Remove In Candide" returns to the open box, and the strip comes back', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(PILE_SHELF)
    const candide = await openBoxColor(page, server.url, CANDIDE_ID)
    await page.goto(cardNotesPage(server))
    await box(page, boxName('Candide', 5)).click()
    await expect.poll(async () => (await openBoxStrip(page))?.background).toBe(candide)

    await page.getByRole('button', { name: 'Remove In Candide', exact: true }).click()
    await expect(page).toHaveURL(cardNotesPage(server))
    await expect(boxLinks(page)).toHaveCount(PILE_BOXES.length)
    expect(await openBoxStrip(page)).toBeNull()

    await page.goBack()
    await expect(page).toHaveURL(cardNotesPage(server, CANDIDE_ID))
    await expect(groupHeadings(page)).toHaveText(['Candide'])
    await expect.poll(async () => (await openBoxStrip(page))?.background).toBe(candide)
  })

  for (const width of [1024, 1440]) {
    test(`[P2] AC-1 at ${width}px the strip spans the window and scrolls away with the page`, async ({
      page,
      seededServer,
    }) => {
      const books = LONG_NOTES.books.map((book, n) => ({ ...book, id: bookId(n + 1) }))
      const server = await seededServer({ books })
      await page.setViewportSize({ width, height: 720 })
      // Solaris (the third Book): 50 notes, several windows tall.
      const solaris = await openBoxColor(page, server.url, bookId(3))
      await page.goto(cardNotesPage(server, bookId(3)))
      await expect.poll(async () => (await openBoxStrip(page))?.background).toBe(solaris)
      await expect(page.getByText(LAST_NOTE, { exact: true })).toBeAttached()

      const top = await openBoxStrip(page)
      expect(top).toMatchObject({ left: 0, width, windowWidth: width, top: TOPBAR_HEIGHT })

      // Not fixed: one window down, the strip has moved up by exactly the scroll.
      await scrollToY(page, 720)
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(720)
      const scrolled = await openBoxStrip(page)
      expect(scrolled?.top).toBe(TOPBAR_HEIGHT - 720)
      expect(scrolled?.top).toBe(scrolled?.headerBottom)
      expect(scrolled?.width).toBe(width)
    })
  }

  test('[P2] AC-1 with the update notice showing, the strip starts under the notice, at the header’s new bottom', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(PILE_SHELF)
    const candide = await openBoxColor(page, server.url, CANDIDE_ID)
    await answerAppInfo(page, () => productionInfo(NEWER_VERSION))
    await page.goto(cardNotesPage(server, CANDIDE_ID))
    await expect(noticeSentence(page, NEWER_VERSION)).toBeVisible()
    await expect.poll(async () => (await openBoxStrip(page))?.background).toBe(candide)

    const strip = await openBoxStrip(page)
    const banner = await page.getByRole('banner').boundingBox()
    expect(strip?.headerBottom).toBe((banner?.y ?? 0) + (banner?.height ?? 0))
    expect(strip?.headerBottom).toBeGreaterThan(TOPBAR_HEIGHT)
    expect(strip?.top).toBe(strip?.headerBottom)
  })

  test('[P1] AC-1 a note added in another context shows on an empty open box after a focus refetch, and the strip stays the whole time', async ({
    page,
    browser,
    seededServer,
  }) => {
    const server = await seededServer(PILE_SHELF)
    const austerlitz = await openBoxColor(page, server.url, AUSTERLITZ_ID)
    await page.goto(cardNotesPage(server, AUSTERLITZ_ID))
    await expect(page.getByRole('main').getByText('No card notes yet.', { exact: true })).toBeVisible()
    await expect.poll(async () => (await openBoxStrip(page))?.background).toBe(austerlitz)
    const node = await stripNode(page).elementHandle()

    const otherContext = await browser.newContext()
    try {
      const added = await otherContext.request.post(`${server.url}${ADD_CARD_NOTE}`, {
        multipart: { intent: JSON.stringify({ bookId: AUSTERLITZ_ID, text: 'Rings of memory.', page: '12' }) },
      })
      expect(added.status()).toBe(200)
    } finally {
      await otherContext.close()
    }

    await page.bringToFront()
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(groupHeadings(page)).toHaveText(['Austerlitz'])
    await expect(page.getByText('Rings of memory.', { exact: true })).toBeVisible()
    // The same strip node, never removed and redrawn: it stayed through the refetch.
    expect(await node?.evaluate((element) => element.isConnected)).toBe(true)
    expect((await openBoxStrip(page))?.background).toBe(austerlitz)
    await expect(page.getByRole('alert')).toHaveText('')
  })

  test("[P2] AC-1 after the Book's spine color changes on Book detail, its open box strip shows the new color", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(PILE_SHELF)
    const candide = await openBoxColor(page, server.url, CANDIDE_ID)
    expect(candide).not.toBe(rgbOf(TEAL))
    await page.goto(`${server.url}/book/${CANDIDE_ID}`)
    await cardNotesBlock(page, 5).getByRole('link', { name: 'See all card notes', exact: true }).click()
    await expect(page).toHaveURL(cardNotesPage(server, CANDIDE_ID))
    await expect.poll(async () => (await openBoxStrip(page))?.background).toBe(candide)

    // Back to Book detail in the app, so the open box's view stays cached, and pick Teal there.
    await page.goBack()
    const block = page.getByRole('main').getByRole('region', { name: /^Change color/ })
    await block.getByRole('button', { name: 'Teal', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText('Color set to Teal.')

    // Forward to the open box: its strip has the new color.
    await page.goForward()
    await expect(page).toHaveURL(cardNotesPage(server, CANDIDE_ID))
    await expect.poll(async () => (await openBoxStrip(page))?.background).toBe(rgbOf(TEAL))
  })

  test('[P1] AC-2 the open box passes axe with Back to top shown, in light and dark', async ({
    page,
    seededServer,
  }) => {
    const books = LONG_NOTES.books.map((book, n) => ({ ...book, id: bookId(n + 1) }))
    const server = await seededServer({ books })
    const solaris = await openBoxColor(page, server.url, bookId(3))
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await page.goto(cardNotesPage(server, bookId(3)))
      await expect.poll(async () => (await openBoxStrip(page))?.background).toBe(solaris)
      await expect(page.getByText(LAST_NOTE, { exact: true })).toBeAttached()
      await scrollToY(page, 'bottom')
      await expect(backToTop(page)).toBeVisible()
      const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
      expect(violations.map(({ id, nodes }) => `${colorScheme}: ${id} (${nodes.length})`)).toEqual([])
    }
  })

  test("[P2] AC-3 the strip's height comes from --open-box-strip-height", async ({ page, seededServer }) => {
    const server = await seededServer(PILE_SHELF)
    await page.goto(cardNotesPage(server, CANDIDE_ID))
    await expect.poll(async () => (await openBoxStrip(page))?.height).toBe(8)

    // Change the token on :root, and the strip follows it.
    await page.evaluate(() => document.documentElement.style.setProperty('--open-box-strip-height', '12px'))
    await expect.poll(async () => (await openBoxStrip(page))?.height).toBe(12)
  })
})
