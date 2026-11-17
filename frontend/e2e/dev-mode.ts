// Story 11.2 helpers: the dev favicon's files, DESIGN.md's component
// literals, the DEV pill's geometry, the app-info responses a page sees,
// and the checks that production shows no dev amber.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Locator, Page } from '@playwright/test'
import { DESIGN_MD } from './favicon.ts'
import { DUNE_ID } from './home.ts'

/** The dev drawing as checked in. */
export const SOURCE_FAVICON_DEV = fileURLToPath(new URL('../public/favicon-dev.svg', import.meta.url))
/** The dev drawing as the build leaves it in the served folder (and the wheel). */
export const BUILT_FAVICON_DEV = fileURLToPath(
  new URL('../../backend/bookvie/http/static/favicon-dev.svg', import.meta.url),
)
export const TOKENS_CSS = fileURLToPath(new URL('../src/styles/tokens.css', import.meta.url))
export const FRONTEND_SRC = fileURLToPath(new URL('../src', import.meta.url))
export const README = fileURLToPath(new URL('../../README.md', import.meta.url))

/** Where `npm run dev` proxies server paths: the `--dev` default port (AD-16). */
export const DEV_BACKEND = 'http://127.0.0.1:8766'

/** Every kind of route, with the page name its title carries (Book detail is the seeded Dune). */
export const ROUTES: [string, string][] = [
  ['/', 'Home'],
  ['/catalog', 'Catalog'],
  ['/stats', 'Stats'],
  ['/card-notes', 'Card notes'],
  ['/backup', 'Backup'],
  [`/book/${DUNE_ID}`, 'Dune'],
  ['/no-such-page', 'Page not found'],
]

/** The header's Main navigation, which ships on every page. */
export function mainNav(page: Page): Locator {
  return page.getByRole('banner').getByRole('navigation', { name: 'Main' })
}

/** The text of every live region on the page, joined. */
export function liveRegionText(page: Page): Promise<string> {
  return page
    .locator('[role="alert"], [role="status"]')
    .evaluateAll((regions) => regions.map((region) => region.textContent ?? '').join(''))
}

export function readText(file: string): string {
  return readFileSync(file, 'utf8')
}

/**
 * A literal `#rrggbb` from DESIGN.md's frontmatter `components:` block, as
 * written (`components.favicon.dev-fill` → `#8C5E0E`). Throws when the
 * component or key is missing, or the value is a token reference.
 */
export function designComponentColor(component: string, key: string): string {
  const frontmatter = readFileSync(DESIGN_MD, 'utf8').split(/^---$/m)[1]
  const components = frontmatter.split(/^components:[ \t]*$/m)[1]?.split(/^\S/m)[0] ?? ''
  const block = components.split(new RegExp(`^ {2}${component}:[ \\t]*$`, 'm'))[1]?.split(/^ {2}\S/m)[0]
  if (block === undefined) throw new Error(`DESIGN.md has no component ${component}`)
  const match = block.match(new RegExp(`^ {4}${key}:\\s*'(#[0-9A-Fa-f]{6})'\\s*$`, 'm'))
  if (!match) throw new Error(`DESIGN.md components.${component} has no color literal ${key}`)
  return match[1]
}

/** The DEV pill: the exact text "DEV" inside the header. */
export function devPill(page: Page): Locator {
  return page.getByRole('banner').getByText('DEV', { exact: true })
}

/**
 * The horizontal distance in CSS px from the last glyph of `word` (in a text
 * node directly inside `container`) to the left border edge of the element
 * that follows that text node.
 */
export function gapAfterWord(container: Locator, word: string): Promise<number> {
  return container.evaluate((element, word) => {
    const text = Array.from(element.childNodes).find(
      (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').includes(word),
    )
    if (!text) throw new Error(`gapAfterWord: no text node with ${word}`)
    let next = text.nextSibling
    while (next && next.nodeType !== Node.ELEMENT_NODE) next = next.nextSibling
    if (!next) throw new Error('gapAfterWord: nothing follows the word')
    const start = (text.textContent ?? '').indexOf(word)
    const range = document.createRange()
    range.setStart(text, start)
    range.setEnd(text, start + word.length)
    return (next as Element).getBoundingClientRect().left - range.getBoundingClientRect().right
  }, word)
}

/**
 * The computed `rgb(…)` of a CSS system color (`Canvas`, `CanvasText`) in the
 * page's current color scheme and forced-colors state. Throws on a name CSS
 * doesn't accept.
 */
export function systemColor(page: Page, name: string): Promise<string> {
  return page.evaluate((name) => {
    if (!CSS.supports('color', name)) throw new Error(`systemColor: ${name} is not a color`)
    const probe = document.createElement('div')
    probe.style.color = name
    document.body.append(probe)
    const color = getComputedStyle(probe).color
    probe.remove()
    return color
  }, name)
}

/**
 * Every element (or `::before`/`::after`) whose computed colors include
 * `rgb(…)` of one of `hexes`, as `tag#id.class::pseudo property`. Reads color,
 * background, borders, outline, fill, stroke, shadows and decorations.
 */
export function elementsColored(page: Page, hexes: string[]): Promise<string[]> {
  return page.evaluate((hexes) => {
    const wanted = hexes.map((hex) => {
      const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16))
      return `rgb(${r}, ${g}, ${b})`
    })
    const properties = [
      'color',
      'background-color',
      'background-image',
      'border-top-color',
      'border-right-color',
      'border-bottom-color',
      'border-left-color',
      'outline-color',
      'fill',
      'stroke',
      'box-shadow',
      'text-shadow',
      'text-decoration-color',
      'caret-color',
      'column-rule-color',
    ]
    const found: string[] = []
    for (const element of [document.documentElement, ...Array.from(document.querySelectorAll('*'))]) {
      for (const pseudo of [null, '::before', '::after']) {
        const style = getComputedStyle(element, pseudo)
        // A pseudo-element with no content isn't drawn.
        if (pseudo && ['none', 'normal'].includes(style.getPropertyValue('content'))) continue
        for (const property of properties) {
          const value = style.getPropertyValue(property)
          if (wanted.some((rgb) => value.includes(rgb))) {
            const id = element.id ? `#${element.id}` : ''
            found.push(`${element.localName}${id}.${element.getAttribute('class') ?? ''}${pseudo ?? ''} ${property}`)
          }
        }
      }
    }
    return found
  }, hexes)
}

export type AppInfoSeen = { status: number; body: { mode?: string } | null }

/**
 * Records every `/api/views/app-info` response the page gets, in order, with
 * its parsed JSON once read (`null` until then, or when it isn't JSON).
 * Call before navigating.
 */
export function watchAppInfo(page: Page): AppInfoSeen[] {
  const seen: AppInfoSeen[] = []
  page.on('response', async (response) => {
    if (new URL(response.url()).pathname !== '/api/views/app-info') return
    // Recorded on arrival, so the order is the order the page got them.
    const entry: AppInfoSeen = { status: response.status(), body: null }
    seen.push(entry)
    try {
      entry.body = (await response.json()) as AppInfoSeen['body']
    } catch {
      entry.body = null
    }
  })
  return seen
}
