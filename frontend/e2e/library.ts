// Shared by the specs that work with Books: the seeded ids, the catalog as the
// API returns it, the New book and Edit book panels, computed colors, DESIGN.md's
// frontmatter, the `app-info` view a test answers in place of the server, and
// `openPaused` (a page opened under Playwright's clock, paused once it shows),
// and three measures: an element's first line box, a row's height without one
// of its parts, and a press made inside a poll.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { APIRequestContext, Locator, Page, Route } from '@playwright/test'
import type { components } from '../src/api/generated/schema.d.ts'
import { expect, type Server } from './fixtures.ts'

/** A stable v4-shaped id for the n-th seeded Book. */
export function bookId(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
}

/** The id the specs seed Dune with, so a test can open its Book detail. */
export const DUNE_ID = '6f1c1d2e-9a4b-4c3d-8e5f-0a1b2c3d4e5f'

/** Every title in the catalog view, sorted. */
export async function catalogTitles(page: Page, server: Server): Promise<string[]> {
  const response = await page.request.get(`${server.url}/api/views/catalog`)
  const body = (await response.json()) as { books: { title: string }[] }
  return body.books.map((book) => book.title).sort()
}

export function newBookPanel(page: Page): Locator {
  return page.getByRole('dialog', { name: 'New book', exact: true })
}

export async function openNewBook(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'New book', exact: true }).click()
  return newBookPanel(page)
}

/** Fills each field by its label, then picks Type: Paperback. */
export async function fillFields(panel: Locator, fields: Record<string, string>): Promise<void> {
  for (const [label, value] of Object.entries(fields)) {
    await panel.getByLabel(label, { exact: true }).fill(value)
  }
  await panel.getByRole('combobox', { name: 'Type', exact: true }).selectOption('Paperback')
}

/** The Catalog's Sort select, inside main. */
export function sortSelect(page: Page): Locator {
  return page.getByRole('main').getByRole('combobox', { name: 'Sort', exact: true })
}

export function editPanel(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Edit book', exact: true })
}

/** Book detail's Edit button: the Edit book panel. */
export async function openEdit(page: Page): Promise<Locator> {
  await page.getByRole('main').getByRole('button', { name: 'Edit', exact: true }).click()
  return editPanel(page)
}

/** Waits until `element` and its subtree finish their open animations, so axe sees final colors. */
export async function settled(element: Locator): Promise<void> {
  await element.evaluate((node) => Promise.all(node.getAnimations({ subtree: true }).map((a) => a.finished)))
}

/** `#rrggbb` as the `rgb(r, g, b)` computed style reports. */
export function rgbOf(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16))
  return `rgb(${r}, ${g}, ${b})`
}

// DESIGN.md colors, as computed style reports them. Specs and helper modules import these instead of copying them.
/** DESIGN.md page, light theme. */
export const PAGE = rgbOf('#F6F4EF')
/** DESIGN.md scrim, light theme (tokens.css --color-scrim). */
export const SCRIM = 'rgba(43, 46, 42, 0.24)'
/** DESIGN.md ink, light theme. */
export const INK = rgbOf('#2B2E2A')
/** DESIGN.md ink, dark theme. */
export const INK_DARK = rgbOf('#ECEAE3')
/** DESIGN.md ink-secondary, light theme. */
export const INK_SECONDARY = rgbOf('#5F635C')
/** DESIGN.md ink-secondary, dark theme. */
export const INK_SECONDARY_DARK = rgbOf('#B3B7AD')
/** DESIGN.md ink-tertiary, light theme. */
export const INK_TERTIARY = rgbOf('#666961')
/** DESIGN.md accent, light theme. */
export const ACCENT = rgbOf('#557059')
/** DESIGN.md accent, dark theme. */
export const ACCENT_DARK = rgbOf('#93B597')
/** DESIGN.md surface-inset, light theme. */
export const SURFACE_INSET = rgbOf('#FAF9F6')
/** DESIGN.md surface-inset, dark theme. */
export const SURFACE_INSET_DARK = rgbOf('#1D201B')
/** DESIGN.md spine-label-strip: light in both themes. */
export const SPINE_LABEL_STRIP = rgbOf('#FBF8F1')
/** DESIGN.md spine-unread-text, light theme. */
export const SPINE_UNREAD_TEXT = rgbOf('#77716A')
/** DESIGN.md favourite gold, light theme; also the cover and spine star in both themes (`components.favourite-star.tile-on`). */
export const FAVOURITE = rgbOf('#9A7120')
/** DESIGN.md favourite gold, dark theme (Book detail and the Spine popover). */
export const FAVOURITE_DARK = rgbOf('#D2A54E')

export const DESIGN_MD = fileURLToPath(
  new URL('../../_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md', import.meta.url),
)

/** DESIGN.md's frontmatter: the text between its first two `---` lines. Every reader below starts here. */
function designFrontmatter(): string {
  return readFileSync(DESIGN_MD, 'utf8').split(/^---$/m)[1]
}

/** One top-level frontmatter block (`colors:`, `components:` …), up to the next top-level key. */
function designSection(name: string): string {
  return (
    designFrontmatter()
      .split(new RegExp(`^${name}:[ \\t]*$`, 'm'))[1]
      ?.split(/^\S/m)[0] ?? ''
  )
}

/** A color primitive from DESIGN.md's frontmatter `colors:` block, as written (`#557059`). */
export function designColor(name: string): string {
  const match = designSection('colors').match(new RegExp(`^ {2}${name}:\\s*'(#[0-9A-Fa-f]{6})'\\s*$`, 'm'))
  if (!match) throw new Error(`DESIGN.md has no color ${name}`)
  return match[1]
}

/**
 * A literal `#rrggbb` from DESIGN.md's frontmatter `components:` block, as
 * written (`components.favicon.dev-fill` → `#8C5E0E`). Throws when the
 * component or key is missing, or the value is a token reference.
 */
export function designComponentColor(component: string, key: string): string {
  const block = designSection('components')
    .split(new RegExp(`^ {2}${component}:[ \\t]*$`, 'm'))[1]
    ?.split(/^ {2}\S/m)[0]
  if (block === undefined) throw new Error(`DESIGN.md has no component ${component}`)
  const match = block.match(new RegExp(`^ {4}${key}:\\s*'(#[0-9A-Fa-f]{6})'\\s*$`, 'm'))
  if (!match) throw new Error(`DESIGN.md components.${component} has no color literal ${key}`)
  return match[1]
}

/**
 * Any value from DESIGN.md's frontmatter `components:` block, as written, its
 * quotes removed (`components.card-note-box.width` → `216px`,
 * `components.card-note-box.radius` → `{rounded.lg}`). Throws when the
 * component or key is missing.
 */
export function designComponentValue(component: string, key: string): string {
  const block = designSection('components')
    .split(new RegExp(`^ {2}${component}:[ \\t]*$`, 'm'))[1]
    ?.split(/^ {2}\S/m)[0]
  if (block === undefined) throw new Error(`DESIGN.md has no component ${component}`)
  const match = block.match(new RegExp(`^ {4}${key}:[ \\t]*(.+?)[ \\t]*$`, 'm'))
  if (!match) throw new Error(`DESIGN.md components.${component} has no ${key}`)
  return match[1].replace(/^'(.*)'$/, '$1')
}

const TYPOGRAPHY_PROPS: Record<string, string> = {
  fontFamily: 'family',
  fontSize: 'size',
  fontWeight: 'weight',
  lineHeight: 'line-height',
  letterSpacing: 'letter-spacing',
}

export type DesignTokens = { light: Map<string, string>; dark: Map<string, string> }

/**
 * Every primitive in DESIGN.md frontmatter as the custom property tokens.css
 * names it (`--color-*`, `--font-<role>-*`, `--radius-*`, `--space-*`), with
 * its light value and, for colors with a `-dark` twin, its dark value.
 */
export function designTokens(): DesignTokens {
  const light = new Map<string, string>()
  const dark = new Map<string, string>()
  let section = ''
  let role = ''
  for (const line of designFrontmatter().split('\n')) {
    if (/^\s*(#|$)/.test(line)) continue
    const top = line.match(/^(\w[\w-]*):\s*$/)
    if (top) {
      section = top[1]
      continue
    }
    const entry = line.match(/^( +)'?([\w-]+)'?:\s*(.*)$/)
    if (!entry) continue
    const [, indent, key, raw] = entry
    const value = raw.replace(/^'(.*)'$/, '$1')
    if (section === 'colors') {
      if (key.endsWith('-dark')) dark.set(`--color-${key.slice(0, -'-dark'.length)}`, value)
      else light.set(`--color-${key}`, value)
    } else if (section === 'typography') {
      if (indent.length === 2) role = key
      else light.set(`--font-${role}-${TYPOGRAPHY_PROPS[key]}`, value)
    } else if (section === 'rounded') {
      light.set(`--radius-${key}`, value)
    } else if (section === 'spacing') {
      light.set(`--space-${key}`, value)
    }
  }
  return { light, dark }
}

/** The `app-info` view as the server sends it (`views/app_info`), from the generated schema. */
export type AppInfo = components['schemas']['AppInfoView']

/** What `answerAppInfo` does with one request: fulfil this body, let it reach the server, or answer 500. */
export type AppInfoAnswer = AppInfo | 'pass' | 'fail'

/**
 * Answers every `app-info` request with what `answer()` returns at the time:
 * `'pass'` lets it reach the server, `'fail'` is a 500, a body is fulfilled.
 * Call before navigating.
 */
export async function answerAppInfo(page: Page, answer: () => AppInfoAnswer): Promise<void> {
  await page.route('**/api/views/app-info', (route: Route) => {
    const body = answer()
    if (body === 'pass') return route.continue()
    if (body === 'fail') return route.fulfill({ status: 500, body: '' })
    return route.fulfill({ json: body })
  })
}

/** One agent tool's answer over `/mcp` (AD-21): its content, structured content and error flag. */
export type ToolResult = {
  content: { type: string; text?: string }[]
  structuredContent?: Record<string, unknown>
  isError?: boolean
}

/** The MCP handshake revision Claude Code speaks (as `backend/tests/agent_client.py`). */
const MCP_PROTOCOL_VERSION = '2025-11-25'

/**
 * Calls the agent tool `name` on `server`'s `/mcp` with `args`, as Claude Code
 * does: `initialize`, `notifications/initialized`, then `tools/call`. Never
 * throws on the tool's own answer: a JSON-RPC error comes back as an
 * `isError` result holding that error as its text, so a leaf's first
 * assertion is the one that fails. It throws only when the HTTP exchange
 * itself fails (a status other than the handshake's).
 */
export async function callTool(
  api: APIRequestContext,
  server: Server,
  name: string,
  args: Record<string, unknown> = {},
): Promise<ToolResult> {
  const post = (message: Record<string, unknown>, initialized: boolean) =>
    api.post(`${server.url}/mcp`, {
      headers: {
        Accept: 'application/json, text/event-stream',
        'Content-Type': 'application/json',
        ...(initialized ? { 'MCP-Protocol-Version': MCP_PROTOCOL_VERSION } : {}),
      },
      data: message,
      maxRedirects: 0,
    })
  const expectStatus = async (step: string, response: Awaited<ReturnType<typeof post>>, status: number) => {
    if (response.status() !== status) {
      throw new Error(`${step}: HTTP ${response.status()} ${(await response.text()).slice(0, 300)}`)
    }
  }
  const handshake = await post(
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: 'bookvie-e2e', version: '0' },
      },
    },
    false,
  )
  await expectStatus('initialize', handshake, 200)
  await expectStatus('initialized', await post({ jsonrpc: '2.0', method: 'notifications/initialized' }, true), 202)
  const called = await post({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name, arguments: args } }, true)
  await expectStatus(`tools/call ${name}`, called, 200)
  const body = (await called.json()) as { result?: ToolResult; error?: unknown }
  return body.result ?? { isError: true, content: [{ type: 'text', text: JSON.stringify(body.error) }] }
}

/**
 * Opens `url` with Playwright's clock installed, then pauses it once `loaded`
 * shows, so the search pause (500 ms) and announce's 100 ms tick only run when
 * the test calls `runFor`. Pausing before the page has its data could strand
 * the first load: TanStack Query hands a result to React through a
 * `setTimeout(0)`, which a paused clock never fires, so a view that answered
 * after the pause left only the `h1` (Epic 6 trace flake, `deferred-work.md`).
 * `beforePause` runs once `loaded` shows, while the clock still runs: for a
 * step that waits on frames, such as a scroll.
 */
export async function openPaused(
  page: Page,
  url: string,
  loaded: Locator,
  beforePause?: () => Promise<void>,
): Promise<void> {
  const start = new Date('2026-11-10T10:00:00+01:00')
  await page.clock.install({ time: start })
  await page.goto(url)
  await expect(loaded).toBeVisible()
  await beforePause?.()
  // A minute on: always ahead of the running clock, and still the same day.
  await page.clock.pauseAt(new Date(start.getTime() + 60_000))
}

/** A box in viewport pixels, as `getBoundingClientRect` reports it. */
export type Box = { x: number; y: number; width: number; height: number }

/**
 * The first line box of `element`'s text: the first client rect of a Range
 * over its contents, so a title that wraps gives only its first line.
 */
export function firstLineRect(element: Locator): Promise<Box> {
  return element.evaluate((node) => {
    const range = document.createRange()
    range.selectNodeContents(node)
    const first = Array.from(range.getClientRects()).find((rect) => rect.width > 0 && rect.height > 0)
    if (first === undefined) throw new Error('firstLineRect: the element has no rendered text')
    return { x: first.x, y: first.y, width: first.width, height: first.height }
  })
}

/**
 * The height of the table row (or list item) holding `part`, as rendered and
 * with `part` taken out of the layout (`display: none`), which is put back
 * before it returns: "the row is no taller than before" in one leaf.
 */
export function rowHeightWithout(part: Locator): Promise<{ with: number; without: number }> {
  return part.evaluate((element) => {
    const row = element.closest('tr, li')
    if (row === null) throw new Error('rowHeightWithout: no enclosing tr or li')
    const style = (element as HTMLElement | SVGElement).style
    const before = style.getPropertyValue('display')
    const priority = style.getPropertyPriority('display')
    const withPart = row.getBoundingClientRect().height
    style.setProperty('display', 'none', 'important')
    const withoutPart = row.getBoundingClientRect().height
    if (before === '') style.removeProperty('display')
    else style.setProperty('display', before, priority)
    return { with: withPart, without: withoutPart }
  })
}

/**
 * A reader for `expect.poll` that clicks `control` once, as soon as it is in
 * the page, and from then on returns what `read` returns; it returns null
 * while `control` is absent. So a leaf whose criterion is "after a press, X"
 * fails on that assertion, not on a click that waits for a missing control.
 */
export function pressOnceThen<T>(control: Locator, read: () => Promise<T>): () => Promise<T | null> {
  let pressed = false
  return async () => {
    if (!pressed) {
      if ((await control.count()) !== 1) return null
      await control.click()
      pressed = true
    }
    return read()
  }
}

/**
 * Whether `element` has focus now: a one-shot reader for `expect.poll`, where
 * `toBeFocused` can't sit (it is an assertion of its own).
 */
export function isFocused(element: Locator): Promise<boolean> {
  return element.evaluate((node) => node === document.activeElement)
}
