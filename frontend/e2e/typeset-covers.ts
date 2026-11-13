// Shared by the Story 8.3 specs (catalog-typeset-covers.spec.ts and its
// automate leaves): DESIGN.md's colors and sizes for the typeset cover, the
// seeded shelf and its tile names, and `boxFacts` / `typesetOf`, which read
// a tile's cover box from the DOM and from its pixels at device scale 2.

import type { Locator, Page } from '@playwright/test'
import { finished } from './bookcase.ts'
import { startSeededServer } from './fixtures.ts'
import {
  BLUE,
  bookId,
  MARGIN,
  near,
  OLIVE,
  PURPLE,
  RED,
  RIBBON,
  type Rect,
  type Rgb,
  solidPng,
  SPINE_LABEL_STRIP,
} from './tile-marks.ts'

// DESIGN.md colors the typeset covers use (light, then the dark twins).
export const SPINE_LABEL = 'rgb(43, 46, 42)' // #2B2E2A, the same in both themes
export const SPINE_LABEL_STRIP_CSS = 'rgb(251, 248, 241)'
export const UNREAD = {
  light: {
    fill: [253, 252, 249] as Rgb, // #FDFCF9
    outline: [138, 130, 115] as Rgb, // #8A8273
    text: 'rgb(119, 113, 106)', // #77716A
  },
  dark: {
    fill: [37, 40, 34] as Rgb, // #252822
    outline: [112, 118, 106] as Rgb, // #70766A
    text: 'rgb(163, 158, 146)', // #A39E92
  },
}

// DESIGN.md → components.catalog-tile.typeset-*.
export const TYPESET = { plateInset: 10, plateTop: 34, titleLines: 4 }

export const WIDE_COVER = 'covers/wide.png'
export const BROKEN_COVER = 'covers/broken.png'

export const GOOD_OMENS_ID = bookId(1)
export const EMMA_ID = bookId(4)
export const KINDRED_ID = bookId(3)

export const JEKYLL_TITLE = 'The Strange Case of Dr Jekyll and Mr Hyde and Other Tales of Terror and the Supernatural'

/**
 * Seven Books, one row at 1280px. Every one 330 pages, so Emma's p.212 is 64%.
 * Emma is the Main book and Kindred is Up next, both without a cover, so Home
 * shows the old placeholder in the Main book card and the Up next pane.
 */
export const TYPESET_SHELF = {
  mainBookId: EMMA_ID,
  upNextBookId: KINDRED_ID,
  books: [
    // Read, no cover, two authors: the read typeset cover with the first author only, and the ribbon.
    {
      id: GOOD_OMENS_ID,
      title: 'Good Omens',
      authors: ['Terry Pratchett', 'Neil Gaiman'],
      pages: 330,
      spineColorUser: OLIVE.hex,
      readings: finished(330),
    },
    // Read, no cover, a title too long for four lines and an author too long for one.
    {
      id: bookId(2),
      title: JEKYLL_TITLE,
      authors: ['Robert Louis Stevenson'],
      pages: 330,
      spineColorUser: RED.hex,
      readings: finished(330),
    },
    // Unread, no Reading, no cover, Up next: the unread typeset cover.
    { id: KINDRED_ID, title: 'Kindred', authors: ['Octavia E. Butler'], pages: 330, spineColorUser: PURPLE.hex },
    // Main at p.212, never finished, no cover: unread (like its spine), with the reading bar.
    {
      id: EMMA_ID,
      title: 'Emma',
      authors: ['Jane Austen'],
      pages: 330,
      spineColorUser: OLIVE.hex,
      readings: [{ startDate: '2026-10-01', currentPage: 212 }],
    },
    // Read, a cover file that isn't an image: it fails to load.
    {
      id: bookId(5),
      title: 'Middlemarch',
      authors: ['George Eliot'],
      pages: 330,
      coverFile: BROKEN_COVER,
      spineColorUser: RED.hex,
      readings: finished(330),
    },
    // Unread, the same broken cover file.
    {
      id: bookId(6),
      title: 'Nostromo',
      authors: ['Joseph Conrad'],
      pages: 330,
      coverFile: BROKEN_COVER,
      spineColorUser: BLUE.hex,
    },
    // Read, with a real cover: no typeset cover.
    {
      id: bookId(7),
      title: 'Bleak House',
      authors: ['Charles Dickens'],
      pages: 330,
      coverFile: WIDE_COVER,
      spineColorUser: PURPLE.hex,
      readings: finished(330),
    },
  ],
}

export const GOOD_OMENS = 'Good Omens by Terry Pratchett and 1 other, finished'
export const JEKYLL = `${JEKYLL_TITLE} by Robert Louis Stevenson, finished`
export const KINDRED = 'Kindred by Octavia E. Butler, not read yet, Up next'
export const EMMA = 'Emma by Jane Austen, Main book, 64%'
export const MIDDLEMARCH = 'Middlemarch by George Eliot, finished'
export const NOSTROMO = 'Nostromo by Joseph Conrad, not read yet'
export const BLEAK_HOUSE = 'Bleak House by Charles Dickens, finished'

export async function typesetServer(page: Page, testInfo: Parameters<typeof startSeededServer>[0]) {
  const wide = await solidPng(page, 120, 80, [30, 90, 120])
  return startSeededServer(testInfo, 'typeset-covers', TYPESET_SHELF, {
    [WIDE_COVER]: wide,
    [BROKEN_COVER]: 'not an image',
  })
}

/** One run of text inside the cover box: its block's rectangle (relative to the tile) and its computed style. */
export type TextLook = {
  text: string
  rect: Rect
  color: string
  fontFamily: string
  fontSize: string
  fontWeight: string
  lineHeight: number
}

/** What the DOM says about a tile's cover box. */
export type BoxFacts = {
  box: Rect
  /** Every non-blank text node inside the box, in order. */
  texts: TextLook[]
  /** The computed background of every element inside the box (not the box itself) that paints one. */
  backgrounds: string[]
  /** Whether a cover `img` is still on screen in the tile. */
  visibleImg: boolean
}

export function boxFacts(item: Locator): Promise<BoxFacts> {
  return item.evaluate((li) => {
    const origin = li.getBoundingClientRect()
    const relative = (r: DOMRect) => ({ x: r.x - origin.x, y: r.y - origin.y, width: r.width, height: r.height })
    const boxNode = Array.from(li.querySelectorAll('*')).find((node) => {
      const r = node.getBoundingClientRect()
      return Math.abs(r.width - origin.width) <= 1 && Math.abs(r.height - r.width * 1.5) <= 1.5
    })
    if (!boxNode) throw new Error('no 2:3 cover box as wide as the column')
    const texts = []
    const walker = document.createTreeWalker(boxNode, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = (node.textContent ?? '').trim()
      if (text === '') continue
      // The text's block: an inline element's rectangle would include lines a clamp hides.
      let block = node.parentElement!
      while (block !== boxNode && getComputedStyle(block).display === 'inline') block = block.parentElement!
      const style = getComputedStyle(node.parentElement!)
      texts.push({
        text,
        rect: relative(block.getBoundingClientRect()),
        color: style.color,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: parseFloat(style.lineHeight),
      })
    }
    const backgrounds = Array.from(boxNode.querySelectorAll('*'))
      .map((node) => getComputedStyle(node).backgroundColor)
      .filter((color) => color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent')
    const img = li.querySelector('img')
    const visibleImg = img !== null && img.getBoundingClientRect().width > 0 && getComputedStyle(img).opacity !== '0'
    return { box: relative(boxNode.getBoundingClientRect()), texts, backgrounds, visibleImg }
  })
}

/**
 * The colors at `points` (CSS pixels relative to the tile), from a screenshot
 * of the tile plus MARGIN at the page's device scale. As in `lookOf`.
 */
export async function pixelsAt(item: Locator, points: [number, number][]): Promise<Rgb[]> {
  await item.scrollIntoViewIfNeeded()
  const bounds = (await item.boundingBox())!
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
    async (li, { png, clip, points }) => {
      const origin = li.getBoundingClientRect()
      const image = new Image()
      image.src = `data:image/png;base64,${png}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')!
      context.drawImage(image, 0, 0)
      const scale = image.width / clip.width
      const dx = Math.round(origin.x) - clip.x
      const dy = Math.round(origin.y) - clip.y
      return points.map(([px, py]) => {
        const sx = Math.min(image.width - 1, Math.max(0, Math.floor((px + dx) * scale)))
        const sy = Math.min(image.height - 1, Math.max(0, Math.floor((py + dy) * scale)))
        const [r, g, b] = context.getImageData(sx, sy, 1, 1).data
        return [r!, g!, b!] as Rgb
      })
    },
    { png, clip, points },
  )
}

/** What a tile's cover box looks like where DESIGN.md puts the typeset cover's parts. */
export type TypesetLook = BoxFacts & {
  page: Rgb
  /** The box's top-left device pixel: page color with 4px corners. */
  corner: Rgb
  /** On each border's outer device pixel, away from the corners. */
  topEdge: Rgb
  rightEdge: Rgb
  bottomEdge: Rgb
  /** Across the left border at mid-height, every half pixel from 1px outside the box to 4px inside it. */
  leftEdge: Rgb[]
  /** Down the left border's outer device pixel, every half pixel, 10px clear of each corner: a dashed line has gaps. */
  leftRun: Rgb[]
  /** 5px in from the left, at 85% of the box's height: the band of color beside and below the plate. */
  sideFill: Rgb
  /** On the ribbon's center line, 29px below the box's top: between the ribbon (24px) and the plate (34px). */
  belowRibbon: Rgb
  /** The plate, found by its color (`spine-label-strip`): `fill` above and below it, null when there's none. */
  plate: Rect | null
}

/** Reads a tile's cover box. `fill` is the color the box should be filled with (to find where the plate ends). */
export async function typesetOf(item: Locator, fill: Rgb): Promise<TypesetLook> {
  const facts = await boxFacts(item)
  const { box } = facts
  const right = box.x + box.width
  const bottom = box.y + box.height
  const middle = box.y + box.height / 2
  const ribbonCenter = right - RIBBON.inset - RIBBON.width / 2
  const plateColumn = box.x + TYPESET.plateInset + 3
  const columnLength = Math.round(box.height * 2)
  const points: [number, number][] = [
    [box.x + 0.25, box.y + 0.25],
    [box.x + box.width / 2, box.y + 0.25],
    [right - 0.25, middle],
    [box.x + box.width / 2, bottom - 0.25],
    [box.x + 5, box.y + box.height * 0.85],
    [ribbonCenter, box.y + 29],
    ...Array.from({ length: 11 }, (_, n): [number, number] => [box.x - 1 + n / 2, middle]),
    ...Array.from({ length: Math.round((box.height - 20) * 2) }, (_, n): [number, number] => [
      box.x + 0.25,
      box.y + 10 + n / 2,
    ]),
    ...Array.from({ length: columnLength }, (_, n): [number, number] => [plateColumn, box.y + n / 2]),
  ]
  const pixels = await pixelsAt(item, points)
  const [corner, topEdge, rightEdge, bottomEdge, sideFill, belowRibbon] = pixels as [Rgb, Rgb, Rgb, Rgb, Rgb, Rgb]
  const leftEdge = pixels.slice(6, 17)
  const leftRun = pixels.slice(17, pixels.length - columnLength)
  const column = pixels.slice(pixels.length - columnLength)

  // The plate: the first run of strip color down the column, until the fill shows again.
  let plate: Rect | null = null
  const top = column.findIndex((pixel) => near(pixel, SPINE_LABEL_STRIP, 12))
  if (top !== -1) {
    const after = column.findIndex((pixel, n) => n > top && near(pixel, fill, 24))
    const plateTop = box.y + top / 2
    const plateBottom = box.y + (after === -1 ? columnLength : after) / 2
    // Across a row 3px into the plate (below its 2px corners): its first and last strip pixels.
    const row = await pixelsAt(
      item,
      Array.from({ length: Math.round(box.width * 2) }, (_, n): [number, number] => [box.x + n / 2, plateTop + 3]),
    )
    const first = row.findIndex((pixel) => near(pixel, SPINE_LABEL_STRIP, 12))
    const last = row.findLastIndex((pixel) => near(pixel, SPINE_LABEL_STRIP, 12))
    plate = { x: box.x + first / 2, y: plateTop, width: (last - first + 1) / 2, height: plateBottom - plateTop }
  }

  const pageColor = await item
    .page()
    .evaluate(() => getComputedStyle(document.body).backgroundColor.match(/\d+/g)!.slice(0, 3).map(Number))
  return {
    ...facts,
    page: pageColor as Rgb,
    corner,
    topEdge,
    rightEdge,
    bottomEdge,
    leftEdge,
    leftRun,
    sideFill,
    belowRibbon,
    plate,
  }
}

/** Whether `inner` lies inside `outer`, give or take `slack` CSS pixels. */
export function inside(inner: Rect, outer: Rect, slack = 1): boolean {
  return (
    inner.x >= outer.x - slack &&
    inner.y >= outer.y - slack &&
    inner.x + inner.width <= outer.x + outer.width + slack &&
    inner.y + inner.height <= outer.y + outer.height + slack
  )
}

/** How many samples of `scan` are within `tolerance` of `color`. */
export function count(scan: Rgb[], color: Rgb, tolerance = 40): number {
  return scan.filter((pixel) => near(pixel, color, tolerance)).length
}
