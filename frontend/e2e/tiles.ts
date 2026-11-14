// The Tiles e2e helpers: the seeded cover file names and ids, the stored view
// choice, the Tiles locators by role and name, the cover box and ring found by
// their geometry (no class name is pinned), and the waits for the grid and its
// covers. tile-marks.ts re-exports the helpers it used to define.

import type { Locator, Page } from '@playwright/test'
import { expect } from './fixtures.ts'

// Cover file paths, relative to the data dir; each spec writes its own bytes there.
export const WIDE_COVER = 'covers/wide.png'
export const DUNE_COVER = 'covers/dune.png'
/** Seeded with bytes that aren't an image, so the browser fails to decode it and the tile falls back. */
export const BROKEN_COVER = 'covers/broken.png'

/** A stable v4-shaped id for the n-th seeded Book. */
export function bookId(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
}

/** Opens Catalog in Tiles: the stored choice, set before the app reads it. */
export async function storeTiles(page: Page): Promise<void> {
  await page.addInitScript(() => window.localStorage.setItem('bookvie.catalogView', 'tiles'))
}

export function tiles(page: Page): Locator {
  return page.getByRole('list', { name: /^Tiles, \d+ books?$/ })
}

export function tileLinks(page: Page): Locator {
  return tiles(page).getByRole('listitem').getByRole('link')
}

/** The tile's link, by its accessible name. */
export function tile(page: Page, name: string): Locator {
  return tiles(page).getByRole('listitem').getByRole('link', { name, exact: true })
}

/** The tile's list item, found by its link's accessible name. */
export function tileItem(page: Page, name: string): Locator {
  return tiles(page)
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name, exact: true }) })
}

/** The visible tiles' accessible names, in DOM order (`aria-label`, else `aria-labelledby`, else text). */
export function tileNames(page: Page): Promise<string[]> {
  return tileLinks(page).evaluateAll((links) =>
    links.map((link) => {
      const label = link.getAttribute('aria-label')
      if (label !== null) return label
      const ids = link.getAttribute('aria-labelledby')
      if (ids !== null) {
        return ids
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent ?? '')
          .join(' ')
      }
      return link.textContent ?? ''
    }),
  )
}

/**
 * Waits until the grid holds at least one cover `img` and every one has
 * loaded and is shown: complete, decoded to a real size, and at a computed
 * opacity of 1 (the app shows a cover only after its `load`).
 */
export async function coversLoaded(page: Page): Promise<void> {
  await expect
    .poll(() =>
      tiles(page)
        .locator('img')
        .evaluateAll(
          (images) =>
            images.length > 0 &&
            (images as HTMLImageElement[]).every(
              (img) => img.complete && img.naturalWidth > 0 && getComputedStyle(img).opacity === '1',
            ),
        ),
    )
    .toBe(true)
}

/** Opens Catalog in Tiles at `url`, waits for the grid, and with `covers` for every cover to load. */
export async function openTiles(page: Page, url: string, { covers = false }: { covers?: boolean } = {}): Promise<void> {
  await storeTiles(page)
  await page.goto(`${url}/catalog`)
  await expect(tiles(page)).toBeVisible()
  if (covers) await coversLoaded(page)
}

/** Goes to Catalog through the app's navigation, waits for the grid, and with `covers` for every cover to load. */
export async function navigateToCatalog(page: Page, { covers = false }: { covers?: boolean } = {}): Promise<void> {
  await page.getByRole('navigation').getByRole('link', { name: 'Catalog', exact: true }).click()
  await expect(tiles(page)).toBeVisible()
  if (covers) await coversLoaded(page)
}

export type Rect = { x: number; y: number; width: number; height: number }

export type BoxLook = {
  /** The cover box: the outermost element in the tile, as wide as its column, at 2:3. */
  box: Rect
  /** Every element filling the box (the box itself, and an image or typeset cover at its size). */
  fills: { tag: string; background: string; borderStyle: string; borderWidth: string; borderColor: string }[]
}

/** The tile's cover box, found by its geometry so no class name is pinned. */
export function coverBox(link: Locator): Promise<BoxLook> {
  return link.evaluate((element) => {
    const item = element.closest('li') ?? element
    const width = item.getBoundingClientRect().width
    const fits = (node: Element) => {
      const r = node.getBoundingClientRect()
      return Math.abs(r.width - width) <= 1 && Math.abs(r.height - r.width * 1.5) <= 1.5
    }
    const all = Array.from(element.querySelectorAll('*')).filter(fits)
    if (all.length === 0) throw new Error('no 2:3 cover box as wide as the column')
    const r = all[0]!.getBoundingClientRect()
    const box = { x: r.x, y: r.y, width: r.width, height: r.height }
    const fills = all
      .filter((node) => {
        const n = node.getBoundingClientRect()
        return Math.abs(n.x - r.x) <= 1 && Math.abs(n.y - r.y) <= 1
      })
      .map((node) => {
        const style = getComputedStyle(node)
        return {
          tag: node.tagName.toLowerCase(),
          background: style.backgroundColor,
          borderStyle: style.borderTopStyle,
          borderWidth: style.borderTopWidth,
          borderColor: style.borderTopColor,
        }
      })
    return { box, fills }
  })
}

/** The rectangle of whichever element in the tile carries a `color` ring (outline or box-shadow), or null. */
export function ringRect(link: Locator, color: string): Promise<(Rect & { outlineWidth: string | null }) | null> {
  return link.evaluate((element, ringColor) => {
    const item = element.closest('li') ?? element
    for (const node of [item, ...Array.from(item.querySelectorAll('*'))]) {
      const style = getComputedStyle(node)
      const outlined = style.outlineStyle !== 'none' && style.outlineColor === ringColor
      if (outlined || style.boxShadow.includes(ringColor)) {
        const r = node.getBoundingClientRect()
        return { x: r.x, y: r.y, width: r.width, height: r.height, outlineWidth: outlined ? style.outlineWidth : null }
      }
    }
    return null
  }, color)
}

/** Whether two rectangles match to within a pixel on every side. */
export function sameRect(a: Rect, b: Rect): boolean {
  return [a.x - b.x, a.y - b.y, a.width - b.width, a.height - b.height].every((d) => Math.abs(d) <= 1)
}
