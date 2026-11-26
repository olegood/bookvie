// Epic 16 retro item 107 (E16-R1): an unstar whose catalog refetch failed
// stays pending in CatalogPage. The fix drops it when the person acts (Search
// titles, a filter, the next star press, a New book save) and moves focus only
// when the refetched render took it away. The AC-2 chip-off leaf below
// replaces favourites-chip.spec.ts's "an unstar saved while the refetch fails
// waits…" leaf, which pinned the old chip-off line. Split out of
// favourites-chip.spec.ts, which would pass 1000 lines with these leaves.

import type { Page } from '@playwright/test'
import { search } from './bookcase.ts'
import { chip, favouritesChip, recordStatus } from './catalog-filter.ts'
import { favouriteStar, routeCouldntSave } from './favourite.ts'
import { AUSTERLITZ, BLEAK_HOUSE, FAVOURITES_SHELF, spoken, STARRED } from './favourites-shelf.ts'
import { expect, test } from './fixtures.ts'
import { SET_FAVOURITE } from './intents.ts'
import { sortSelect } from './library.ts'
import { afterAnnounceDelay } from './stats.ts'
import { storeTiles, tile, tileLinks, tileNames, tiles } from './tiles.ts'
import { focusWindow } from './update-notice.ts'

test.describe('Epic 16 retro item 107 Clear a stuck pending unstar (ATDD)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.emulateMedia({ colorScheme: 'light' })
  })

  /**
   * Tiles, Favourites on, Emma unstarred from her tile, and the catalog
   * refetch after that save answered 503 once: the save committed, the view
   * still shows Emma starred with focus on her star, nothing more was said,
   * and her unstar is pending. Returns the status recorder.
   */
  async function stuckUnstarOfEmma(page: Page, url: string): Promise<() => Promise<string[]>> {
    await storeTiles(page)
    await page.goto(`${url}/catalog`)
    await expect(tileLinks(page)).toHaveCount(6)
    const announced = await recordStatus(page)
    await favouritesChip(page).click()
    await expect(tileLinks(page)).toHaveCount(3)
    await expect(page.getByRole('status')).toHaveText('3 books match.')
    const saved = page.waitForResponse((response) => new URL(response.url()).pathname === SET_FAVOURITE)
    await page.route('**/api/views/catalog', (route) => route.fulfill({ status: 503, body: '' }), { times: 1 })
    const refetchFailed = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/views/catalog' && response.status() === 503,
    )
    const emmaStar = favouriteStar(tiles(page), 'Favourite Emma')
    await emmaStar.click()
    expect((await saved).status()).toBe(200)
    await refetchFailed
    await afterAnnounceDelay(page)
    expect(await tileNames(page)).toEqual(STARRED)
    await expect(emmaStar).toBeFocused()
    expect(await spoken(announced)).toEqual(['3 books match.'])
    return announced
  }

  /** The window regains focus and the catalog view refetches with a 200. */
  async function refetchCatalog(page: Page): Promise<void> {
    const refetched = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/views/catalog' && response.status() === 200,
    )
    await focusWindow(page)
    await refetched
  }

  /** The "*Title* is not a favourite." lines spoken since `from`. */
  async function unstarLines(announced: () => Promise<string[]>, from = 0): Promise<string[]> {
    return (await spoken(announced)).slice(from).filter((text) => text.includes('is not a favourite.'))
  }

  // Before the fix the first key hid Emma, CatalogPage's unstar effect focused
  // the Bleak House tile and the "l" landed on its link: the box held "B".
  test('[P0] AC-1 typing in Search titles while an unstar waits keeps every character and focus in the box, and the unstar never speaks, then or after the next refetch', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FAVOURITES_SHELF })
    const announced = await stuckUnstarOfEmma(page, server.url)

    await search(page).click()
    await search(page).pressSequentially('Bl')
    await expect(search(page)).toHaveValue('Bl')
    await expect(search(page)).toBeFocused()
    await expect.poll(() => tileNames(page)).toEqual([BLEAK_HOUSE])
    await expect(page.getByRole('status')).toHaveText('1 book matches.')
    expect(await unstarLines(announced)).toEqual([])

    await refetchCatalog(page)
    await afterAnnounceDelay(page)
    expect(await unstarLines(announced)).toEqual([])
    await expect(search(page)).toBeFocused()
    await expect(search(page)).toHaveValue('Bl')
  })

  // Before the fix the chip-off press spoke the waiting unstar's plain line
  // ("Emma is not a favourite.") over the chip's own count.
  test('[P1] AC-2 turning Favourites off while an unstar waits speaks only the chip’s count, keeps focus on the chip, and the next refetch says nothing more', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FAVOURITES_SHELF })
    const announced = await stuckUnstarOfEmma(page, server.url)
    const before = (await spoken(announced)).length
    const favourites = favouritesChip(page)

    await favourites.click()
    await expect(favourites).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByRole('status')).toHaveText('6 books match.')
    await expect(favourites).toBeFocused()
    await expect(tileLinks(page)).toHaveCount(6)

    await refetchCatalog(page)
    await expect(favouriteStar(tiles(page), 'Favourite Emma')).toHaveAttribute('aria-pressed', 'false')
    await afterAnnounceDelay(page)
    expect((await spoken(announced)).slice(before)).toEqual(['6 books match.'])
    await expect(favourites).toBeFocused()
  })

  // Before the fix Read hid Emma, so the unstar effect moved focus to the
  // Austerlitz tile and spoke "Emma is not a favourite. 1 book matches.".
  test('[P1] AC-2 pressing another chip while an unstar waits speaks only its count and leaves focus on that chip, then and after the next refetch', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FAVOURITES_SHELF })
    const announced = await stuckUnstarOfEmma(page, server.url)
    const before = (await spoken(announced)).length
    const read = chip(page, 'Status', 'Read')

    await read.click()
    await expect(read).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => tileNames(page)).toEqual([AUSTERLITZ])
    await afterAnnounceDelay(page)
    await expect(read).toBeFocused()
    expect((await spoken(announced)).slice(before)).toEqual(['1 book matches.'])

    await refetchCatalog(page)
    await afterAnnounceDelay(page)
    expect((await spoken(announced)).slice(before)).toEqual(['1 book matches.'])
    await expect(read).toBeFocused()
  })

  // Passed before the fix too, by design: onSaved overwrote the pending unstar
  // with the newer one. This guards that dropping it at the press keeps Story
  // 16.2's AC-6 for the new press.
  test('[P1] AC-3 unstarring another Book while one waits makes it the only pending unstar: once its refetch renders, focus goes to the next shown Book and one line names it', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FAVOURITES_SHELF })
    const announced = await stuckUnstarOfEmma(page, server.url)
    const before = (await spoken(announced)).length
    const refetched = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/views/catalog' && response.status() === 200,
    )

    await favouriteStar(tiles(page), 'Favourite Bleak House').click()
    await refetched
    await expect.poll(() => tileNames(page)).toEqual([AUSTERLITZ])
    await expect(tile(page, AUSTERLITZ)).toBeFocused()
    await afterAnnounceDelay(page)
    expect((await spoken(announced)).slice(before)).toEqual(['Bleak House is not a favourite. 1 book matches.'])
  })

  // The waiting Book still shows starred, so its star can be pressed again:
  // that press replaces the waiting one and behaves as a normal unstar.
  test('[P1] AC-3 pressing the waiting Book’s star again makes it a normal unstar: once its refetch renders, focus goes to the next shown Book and one line names it', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FAVOURITES_SHELF })
    const announced = await stuckUnstarOfEmma(page, server.url)
    const before = (await spoken(announced)).length
    const refetched = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/views/catalog' && response.status() === 200,
    )

    await favouriteStar(tiles(page), 'Favourite Emma').click()
    await refetched
    await expect.poll(() => tileNames(page)).toEqual([BLEAK_HOUSE, AUSTERLITZ])
    await expect(tile(page, AUSTERLITZ)).toBeFocused()
    await afterAnnounceDelay(page)
    expect((await spoken(announced)).slice(before)).toEqual(['Emma is not a favourite. 2 books match.'])
  })

  // Before the fix the late refetch's render ran the unstar effect, which
  // focused the next shown Book (the Austerlitz tile) although focus was on Sort.
  test('[P1] AC-4 a late refetch that hides the waiting Book while focus is on another control leaves focus there and speaks the combined line once', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FAVOURITES_SHELF })
    const announced = await stuckUnstarOfEmma(page, server.url)
    const before = (await spoken(announced)).length
    await sortSelect(page).focus()
    await expect(sortSelect(page)).toBeFocused()

    await refetchCatalog(page)
    await expect.poll(() => tileNames(page)).toEqual([BLEAK_HOUSE, AUSTERLITZ])
    await afterAnnounceDelay(page)
    await expect(sortSelect(page)).toBeFocused()
    expect((await spoken(announced)).slice(before)).toEqual(['Emma is not a favourite. 2 books match.'])
  })

  // Pins focusTakenAway's `main` clause: a closed Spine popover's fallback
  // sometimes puts focus on `main` before the unstar effect runs (16.2 AC-7,
  // favourites-chip.spec.ts:685), and the effect must still move focus on.
  test('[P1] AC-4 a refetch that hides the waiting Book while focus is on main moves focus to the next shown Book and speaks the combined line once', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FAVOURITES_SHELF })
    const announced = await stuckUnstarOfEmma(page, server.url)
    const before = (await spoken(announced)).length
    const main = page.locator('#main')
    await main.focus()
    await expect(main).toBeFocused()

    await refetchCatalog(page)
    await expect.poll(() => tileNames(page)).toEqual([BLEAK_HOUSE, AUSTERLITZ])
    await expect(tile(page, AUSTERLITZ)).toBeFocused()
    await afterAnnounceDelay(page)
    expect((await spoken(announced)).slice(before)).toEqual(['Emma is not a favourite. 2 books match.'])
  })

  // Guards the drop in the wrapped press: a press whose save fails never
  // reaches onSaved, so without the drop Emma's unstar would still wait and
  // the next refetch would speak her line. Only the unstarLines check catches
  // that: focus would stay on the visible Bleak House star either way.
  test('[P1] AC-3 a star press whose save fails while an unstar waits drops it: the next refetch says nothing about the waiting Book and leaves focus on the pressed star', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FAVOURITES_SHELF })
    const announced = await stuckUnstarOfEmma(page, server.url)
    await routeCouldntSave(page)
    const failed = page.waitForResponse(
      (response) => new URL(response.url()).pathname === SET_FAVOURITE && response.status() === 503,
    )
    const bleakStar = favouriteStar(tiles(page), 'Favourite Bleak House')

    await bleakStar.click()
    await failed
    await refetchCatalog(page)
    await expect.poll(() => tileNames(page)).toEqual([BLEAK_HOUSE, AUSTERLITZ])
    await afterAnnounceDelay(page)
    expect(await unstarLines(announced)).toEqual([])
    await expect(bleakStar).toBeFocused()
  })
})
