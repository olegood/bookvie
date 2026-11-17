// Story 11.1 favicon helpers: where the icon lives, the path DESIGN.md's prose
// gives it, and what Chromium computes for it. (DESIGN.md's frontmatter colors
// are read in library.ts.)

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'
import { DESIGN_MD } from './library.ts'

// DESIGN.md is read in library.ts; re-exported for the specs that import them from here.
export { DESIGN_MD, designColor } from './library.ts'

/** The drawing as checked in (Vite copies `public/` into the build). */
export const SOURCE_FAVICON = fileURLToPath(new URL('../public/favicon.svg', import.meta.url))
/** The drawing as the build leaves it in the served folder (and the wheel). */
export const BUILT_FAVICON = fileURLToPath(new URL('../../backend/bookvie/http/static/favicon.svg', import.meta.url))
export const SMOKE_SCRIPT = fileURLToPath(new URL('../../scripts/smoke.mjs', import.meta.url))

/** A made-up origin `serveSourceFavicon` answers for; nothing goes to the network. */
export const SOURCE_FAVICON_URL = 'http://favicon.source.test/favicon.svg'

/** The favicon path DESIGN.md → Components → Favicon gives (the F3 drawing). */
export function designFaviconPath(): string {
  const match = readFileSync(DESIGN_MD, 'utf8').match(/Path \(fill `currentColor` in the mock\): `([^`]+)`/)
  if (!match) throw new Error('DESIGN.md → Favicon has no path')
  return match[1]
}

/**
 * Answers `SOURCE_FAVICON_URL` with `frontend/public/favicon.svg` as an SVG
 * document, or a 404 while the file doesn't exist.
 */
export async function serveSourceFavicon(page: Page): Promise<void> {
  await page.route(SOURCE_FAVICON_URL, (route) => {
    let body: Buffer
    try {
      body = readFileSync(SOURCE_FAVICON)
    } catch {
      return route.fulfill({ status: 404, contentType: 'text/plain', body: 'no favicon.svg' })
    }
    return route.fulfill({ status: 200, contentType: 'image/svg+xml', body })
  })
}

/**
 * The computed fill of the only `<path>` in the current document, or `null`
 * when the document isn't an SVG with exactly one path (the SPA's HTML, a 404).
 */
export function svgFill(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const root = document.documentElement
    if (root.namespaceURI !== 'http://www.w3.org/2000/svg' || root.localName !== 'svg') return null
    const paths = root.querySelectorAll('path')
    return paths.length === 1 ? getComputedStyle(paths[0]).fill : null
  })
}

export type SvgShape = {
  viewBox: string | null
  /** Every element under the root, by local name, in document order. */
  elements: string[]
  /** The `d` of each `<path>`. */
  paths: string[]
  stroke: string
  strokeWidth: string
  fillOpacity: string
  opacity: string
}

/** What the current SVG document is drawn with. Read only after `svgFill` has resolved. */
export function svgShape(page: Page): Promise<SvgShape> {
  return page.evaluate(() => {
    const root = document.documentElement
    const paths = Array.from(root.querySelectorAll('path'))
    if (root.localName !== 'svg' || paths.length === 0) throw new Error('svgShape: not an SVG with a path')
    const style = getComputedStyle(paths[0])
    return {
      viewBox: root.getAttribute('viewBox'),
      elements: Array.from(root.querySelectorAll('*')).map((element) => element.localName),
      paths: paths.map((path) => path.getAttribute('d') ?? ''),
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      fillOpacity: style.fillOpacity,
      opacity: style.opacity,
    }
  })
}

/** The text of every `<!-- … -->` comment in an SVG source. */
export function svgComments(source: string): string[] {
  return [...source.matchAll(/<!--([\s\S]*?)-->/g)].map((match) => match[1])
}

export type LinkedIcon = { status: number; type: string | null; cacheControl: string | null }

/**
 * Fetches what the page's one `link[rel="icon"]` points at, or `null` when
 * the head has no such link.
 */
export function linkedIcon(page: Page): Promise<LinkedIcon | null> {
  return page.evaluate(async () => {
    const links = document.head.querySelectorAll<HTMLLinkElement>('link[rel~="icon" i]')
    if (links.length !== 1) return null
    const response = await fetch(links[0].href, { cache: 'no-store' })
    return {
      status: response.status,
      type: response.headers.get('content-type'),
      cacheControl: response.headers.get('cache-control'),
    }
  })
}

export type FaviconRaster = {
  /** Alpha (0–255) of every pixel, `alpha[y][x]`. */
  alpha: number[][]
  /** `rgb(r, g, b)` of every fully opaque pixel, deduplicated. */
  opaqueColors: string[]
}

/**
 * Draws `url` through an `<img>` into a `size`×`size` canvas, as a tab strip
 * rasterizes an icon, and reads every pixel. The image takes the page's
 * color scheme.
 */
export function faviconRaster(page: Page, url: string, size: number): Promise<FaviconRaster> {
  return page.evaluate(
    async ({ url, size }) => {
      const image = new Image(size, size)
      image.src = url
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const context = canvas.getContext('2d')
      if (!context) throw new Error('faviconRaster: no 2d context')
      context.drawImage(image, 0, 0, size, size)
      const data = context.getImageData(0, 0, size, size).data
      const alpha: number[][] = []
      const opaque = new Set<string>()
      for (let y = 0; y < size; y++) {
        const row: number[] = []
        for (let x = 0; x < size; x++) {
          const i = (y * size + x) * 4
          row.push(data[i + 3])
          if (data[i + 3] === 255) opaque.add(`rgb(${data[i]}, ${data[i + 1]}, ${data[i + 2]})`)
        }
        alpha.push(row)
      }
      return { alpha, opaqueColors: [...opaque] }
    },
    { url, size },
  )
}
