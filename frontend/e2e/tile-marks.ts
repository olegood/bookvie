// Shared by the Story 8.2 specs (catalog-tile-marks.spec.ts and its
// automate leaves): DESIGN.md's colors for the finished ribbon and the
// reading bar, the Tiles locators, and `lookOf`, which samples a tile's
// pixels where the marks belong from a screenshot at device scale 2.

import type { Locator, Page } from '@playwright/test'
import { expect } from './fixtures.ts'

export type Rgb = [number, number, number]

// DESIGN.md colors.
export const LIGHT = {
  accent: [85, 112, 89] as Rgb, // #557059
  accentSoft: [227, 235, 226] as Rgb, // #E3EBE2
  spineEdge: [94, 88, 77] as Rgb, // #5E584D
}
export const DARK = {
  accent: [147, 181, 151] as Rgb, // #93B597
  accentSoft: [44, 58, 46] as Rgb, // #2C3A2E
  spineEdge: [133, 138, 127] as Rgb, // #858A7F
}
// Light in both themes, like a spine's label strip.
export const SPINE_LABEL_STRIP: Rgb = [251, 248, 241] // #FBF8F1

// Spine colors set by the user, so no cover decides them, each far from the covers below.
export const RED = { hex: '#B03A2E', rgb: [176, 58, 46] as Rgb }
export const BLUE = { hex: '#2E5A88', rgb: [46, 90, 136] as Rgb }
export const OLIVE = { hex: '#6B8E23', rgb: [107, 142, 35] as Rgb }
export const PURPLE = { hex: '#7A4E8C', rgb: [122, 78, 140] as Rgb }

// DESIGN.md → Catalog tile.
export const RIBBON = { width: 16, height: 24, notch: 6, inset: 10 }
export const BAR = { gap: 6, height: 5 }

export function bookId(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
}

/** A `width`×`height` PNG of one flat color, drawn in the browser. */
export async function solidPng(page: Page, width: number, height: number, [r, g, b]: Rgb): Promise<Buffer> {
  const base64 = await page.evaluate(
    ({ width, height, color }) => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')!
      context.fillStyle = color
      context.fillRect(0, 0, width, height)
      return canvas.toDataURL('image/png').split(',')[1]!
    },
    { width, height, color: `rgb(${r}, ${g}, ${b})` },
  )
  return Buffer.from(base64, 'base64')
}

export async function storeTiles(page: Page): Promise<void> {
  await page.addInitScript(() => window.localStorage.setItem('bookvie.catalogView', 'tiles'))
}

export function tiles(page: Page): Locator {
  return page.getByRole('list', { name: /^Tiles, \d+ books?$/ })
}

export function tileItem(page: Page, name: string): Locator {
  return tiles(page)
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name, exact: true }) })
}

/** Waits until every cover `img` in the grid has loaded (the 8.1 behavior the marks sit on). */
export async function coversLoaded(page: Page): Promise<void> {
  await expect
    .poll(() =>
      tiles(page)
        .locator('img')
        .evaluateAll((images) => (images as HTMLImageElement[]).every((img) => img.complete && img.naturalWidth > 0)),
    )
    .toBe(true)
}

export type Rect = { x: number; y: number; width: number; height: number }

/** What a tile's pixels show where the marks belong. Coordinates are CSS pixels relative to the tile. */
export type TileLook = {
  /** The 2:3 cover box. */
  box: Rect
  /** The visible cover: the loaded `img`'s rectangle, else the box (typeset cover). */
  cover: Rect
  /** At the ribbon's middle, 9px below the visible cover's top. */
  ribbonMiddle: Rgb
  /** Same x, 9px below the box's top: differs from ribbonMiddle only when the cover is shorter than the box. */
  boxTopMiddle: Rgb
  /** On the ribbon's center line, 1px above and 1px below the visible cover's top: where the ribbon starts. */
  aboveRibbon: Rgb
  ribbonTop: Rgb
  /** On the center line, 3px above the visible cover's top: where a focus or highlight ring runs over a typeset cover. */
  ringAbove: Rgb
  /** On the center line, 2px above the notch's apex (18px down): still the fill if the ribbon is 24px tall. */
  aboveApex: Rgb
  /** Inside the V-notch, 1px above the ribbon's lower end, on its center line. */
  notch: Rgb
  /** From the ribbon's center line rightward, every half pixel for 16px, at the ribbon's middle. */
  scanRight: Rgb[]
  /** From the ribbon's center line leftward, every half pixel for 16px, at the ribbon's middle. */
  scanLeft: Rgb[]
  /** Down the ribbon's center line, every half pixel from 12px to 24px below the visible cover's top. */
  scanDown: Rgb[]
  /** The bar's middle row, every half pixel from 3px left of the box to 3px right of it. */
  barRow: Rgb[]
  /** The bar's top-left and top-right device pixels inside the box's width. */
  barCorners: [Rgb, Rgb]
  /** 3px below the box (between box and bar) and 2px below the slot, at the box's middle. */
  aboveBar: Rgb
  belowSlot: Rgb
  /** The page's background color. */
  page: Rgb
  /** At the ribbon's middle, every half pixel from 6px left of the visible cover to 6px right of it. */
  coverRow: Rgb[]
  /** How many device pixels of the tile are within 24 of `find` (lookOf's second argument), else 0. */
  found: number
}

/**
 * How far around the tile `lookOf` screenshots, so the samples 3px outside
 * the box are real page pixels (an element screenshot stops at the tile).
 */
export const MARGIN = 8

/** Screenshots the tile (plus MARGIN around it) and samples its pixels where DESIGN.md puts the ribbon and the bar. */
export async function lookOf(item: Locator, find: Rgb | null = null): Promise<TileLook> {
  await item.scrollIntoViewIfNeeded()
  const bounds = (await item.boundingBox())!
  // On whole CSS pixels: a fractional clip is rounded, which would shift every sample.
  const x = Math.floor(bounds.x) - MARGIN
  const y = Math.floor(bounds.y) - MARGIN
  const clip = {
    x,
    y,
    width: Math.ceil(bounds.x + bounds.width) + MARGIN - x,
    height: Math.ceil(bounds.y + bounds.height) + MARGIN - y,
  }
  const png = (await item.page().screenshot({ clip, animations: 'disabled' })).toString('base64')
  return item.evaluate(
    async (li, { png, ribbon, bar, clip, find }) => {
      const origin = li.getBoundingClientRect()
      const relative = (r: DOMRect) => ({ x: r.x - origin.x, y: r.y - origin.y, width: r.width, height: r.height })
      const boxNode = Array.from(li.querySelectorAll('*')).find((node) => {
        const r = node.getBoundingClientRect()
        return Math.abs(r.width - origin.width) <= 1 && Math.abs(r.height - r.width * 1.5) <= 1.5
      })
      if (!boxNode) throw new Error('no 2:3 cover box as wide as the column')
      const box = relative(boxNode.getBoundingClientRect())
      const img = li.querySelector('img')
      const shown = img && img.complete && img.naturalWidth > 0 && getComputedStyle(img).visibility !== 'hidden'
      const cover = shown ? relative(img.getBoundingClientRect()) : box

      const image = new Image()
      image.src = `data:image/png;base64,${png}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')!
      context.drawImage(image, 0, 0)
      const scale = image.width / clip.width
      // Tile coordinates to the screenshot's. The tile can sit on a half pixel
      // (y 282.5 at 1280px), and Chromium paints it on the whole pixel it rounds to.
      const dx = Math.round(origin.x) - clip.x
      const dy = Math.round(origin.y) - clip.y
      const at = (x: number, y: number): [number, number, number] => {
        const px = Math.min(image.width - 1, Math.max(0, Math.floor((x + dx) * scale)))
        const py = Math.min(image.height - 1, Math.max(0, Math.floor((y + dy) * scale)))
        const [r, g, b] = context.getImageData(px, py, 1, 1).data
        return [r!, g!, b!]
      }

      const right = cover.x + cover.width - ribbon.inset
      const center = right - ribbon.width / 2
      const middle = cover.y + 9
      const scanRight = Array.from({ length: 33 }, (_, n) => at(center + n / 2, middle))
      const scanLeft = Array.from({ length: 33 }, (_, n) => at(center - n / 2, middle))
      const scanDown = Array.from({ length: 25 }, (_, n) => at(center, cover.y + 12 + n / 2))
      const barTop = box.y + box.height + bar.gap
      const barMiddle = barTop + bar.height / 2
      const barRow = Array.from({ length: Math.round((box.width + 6) * 2) + 1 }, (_, n) =>
        at(box.x - 3 + n / 2, barMiddle),
      )
      const device = 1 / scale
      const coverRow = Array.from({ length: Math.round((cover.width + 12) * 2) + 1 }, (_, n) =>
        at(cover.x - 6 + n / 2, middle),
      )
      let found = 0
      if (find) {
        const left = Math.floor(dx * scale)
        const top = Math.floor(dy * scale)
        const { data } = context.getImageData(
          left,
          top,
          Math.round(origin.width * scale),
          Math.round(origin.height * scale),
        )
        for (let n = 0; n < data.length; n += 4) {
          if (Math.hypot(data[n]! - find[0], data[n + 1]! - find[1], data[n + 2]! - find[2]) <= 24) found += 1
        }
      }
      const pageColor = getComputedStyle(document.body).backgroundColor.match(/\d+/g)!.map(Number)
      return {
        box,
        cover,
        ribbonMiddle: at(center, middle),
        boxTopMiddle: at(center, box.y + 9),
        aboveRibbon: at(center, cover.y - 1),
        ribbonTop: at(center, cover.y + 1),
        ringAbove: at(center, cover.y - 3),
        aboveApex: at(center, cover.y + ribbon.height - ribbon.notch - 2),
        notch: at(center, cover.y + ribbon.height - 1),
        scanRight,
        scanLeft,
        scanDown,
        barRow,
        barCorners: [at(box.x + device / 2, barTop + device / 2), at(box.x + box.width - device, barTop + device / 2)],
        aboveBar: at(box.x + box.width / 2, box.y + box.height + 3),
        belowSlot: at(box.x + box.width / 2, barTop + bar.height + 2),
        page: [pageColor[0]!, pageColor[1]!, pageColor[2]!],
        coverRow,
        found,
      } as TileLook
    },
    { png, ribbon: RIBBON, bar: BAR, clip, find },
  )
}

function distance(a: Rgb, b: Rgb): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

export function near(a: Rgb, b: Rgb, tolerance = 20): boolean {
  return distance(a, b) <= tolerance
}

/** Whether `colors` appear in `scan` in this order (each after the previous one's first match). */
export function inOrder(scan: Rgb[], colors: Rgb[], tolerance = 40): boolean {
  let from = 0
  for (const color of colors) {
    const found = scan.findIndex((pixel, n) => n >= from && near(pixel, color, tolerance))
    if (found === -1) return false
    from = found + 1
  }
  return true
}

/** The bar's fill as a percentage of the box's width (accent pixels on the bar's middle row), or null without a bar. */
export function barPercent(look: TileLook, palette: { accent: Rgb; accentSoft: Rgb }): number | null {
  const fill = look.barRow.filter((pixel) => near(pixel, palette.accent)).length / 2
  const track = look.barRow.filter((pixel) => near(pixel, palette.accentSoft)).length / 2
  if (fill === 0 && track === 0) return null
  return (fill / look.box.width) * 100
}

/** Whether the tile shows the ribbon (its spine color at the ribbon's middle) and the bar. */
export function marksOf(look: TileLook, spineColor: Rgb, palette: { accent: Rgb; accentSoft: Rgb }) {
  return { ribbon: near(look.ribbonMiddle, spineColor, 24), bar: barPercent(look, palette) !== null }
}
