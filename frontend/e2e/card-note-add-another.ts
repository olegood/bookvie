// Shared by the Story 9.2 specs (card-note-add-another.spec.ts and its
// automate leaves): the Add another checkbox, its running count and stored
// choice, the Main book card's "See card notes · N" link, the light and dark
// tokens the checkbox reads, and the measuring helpers: `recordStatus` /
// `statusTexts` (every change of the `status` text), `isModal`, `boxOf` and
// `inLiveRegion`; and for the automate leaves `textGapAfterBox`,
// `watchFocusAtStatus` / `focusAtStatus` and `zipEntries`.

import { inflateRawSync } from 'node:zlib'
import type { Locator, Page } from '@playwright/test'
import { mainBookCard } from './home.ts'
import { rgbOf } from './library.ts'

export const STORAGE_KEY = 'bookvie.cardNoteAddAnother'
// tokens.css: accent, ink and ink-tertiary in the light theme, accent and ink in the dark.
export const ACCENT = rgbOf('#557059')
export const INK = rgbOf('#2B2E2A')
export const INK_TERTIARY = rgbOf('#666961')
export const ACCENT_DARK = rgbOf('#93B597')
export const INK_DARK = rgbOf('#ECEAE3')
/** Any running count, so its absence can be asserted. */
export const ANY_COUNT = /\b\d+ notes? saved\b/

/** The panel's **Add another** checkbox (add mode only). */
export function addAnother(panel: Locator): Locator {
  return panel.getByRole('checkbox', { name: 'Add another', exact: true })
}

/** The running count on the checkbox's line. */
export function savedCount(panel: Locator): Locator {
  return panel.getByText(ANY_COUNT)
}

/** The Main book card's "See card notes · N" link, by its name ("See card notes, 2 notes"). */
export function seeCardNotes(page: Page, count: number): Locator {
  const name = count === 0 ? 'See card notes' : `See card notes, ${count} ${count === 1 ? 'note' : 'notes'}`
  return mainBookCard(page).getByRole('link', { name, exact: true })
}

export function noteField(panel: Locator): Locator {
  return panel.getByRole('textbox', { name: 'Note', exact: true })
}

export function pageField(panel: Locator): Locator {
  return panel.getByRole('textbox', { name: 'Page', exact: true })
}

/** The stored Add another choice, as the page's localStorage holds it (null when absent). */
export function storedChoice(page: Page): Promise<string | null> {
  return page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)
}

/**
 * Records the `status` region's text each time it changes from now on, empty
 * included, so a "Card note saved." repeated word for word shows as a new one
 * ([SAVED, '', SAVED]). It follows the region element, which the panel adopts
 * while it is open.
 */
export async function recordStatus(page: Page): Promise<void> {
  await page.evaluate(() => {
    const region = document.querySelector('[role="status"]')
    if (region === null) throw new Error('no status region')
    const seen: string[] = []
    ;(window as unknown as { statusTexts: string[] }).statusTexts = seen
    let last = region.textContent ?? ''
    new MutationObserver(() => {
      const text = region.textContent ?? ''
      if (text === last) return
      last = text
      seen.push(text)
    }).observe(region, { childList: true, characterData: true, subtree: true })
  })
}

export function statusTexts(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { statusTexts: string[] }).statusTexts)
}

/** Whether the element is an open modal dialog (`:modal`). */
export function isModal(locator: Locator): Promise<boolean> {
  return locator.evaluate((element) => element.matches(':modal'))
}

/** The element's box; throws when it isn't rendered. */
export async function boxOf(locator: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await locator.boundingBox()
  if (box === null) throw new Error('not rendered')
  return box
}

/** Whether the element, or an ancestor, is a live region. */
export function inLiveRegion(locator: Locator): Promise<boolean> {
  return locator.evaluate(
    (element) => element.closest('[aria-live], [role="status"], [role="alert"], [role="log"]') !== null,
  )
}

/**
 * How far the label's text starts right of the box, in px: the left edge of a
 * `Range` over the label's first non-blank text node, minus the box's right
 * edge. A Range measures the glyphs, not a wrapping span or the label.
 */
export function textGapAfterBox(box: Locator): Promise<number> {
  return box.evaluate((element) => {
    const label = element.closest('label')
    if (label === null) throw new Error('no label')
    const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT)
    let node = walker.nextNode()
    while (node !== null && (node.textContent ?? '').trim() === '') node = walker.nextNode()
    if (node === null) throw new Error('no label text')
    const range = document.createRange()
    range.selectNodeContents(node)
    return range.getBoundingClientRect().left - element.getBoundingClientRect().right
  })
}

/**
 * Records, each time the `status` region gets text, that text and the name
 * of the focused element at that moment (its label, else `aria-label`, else
 * its text), so focus is seen to land before the line is set.
 */
export async function watchFocusAtStatus(page: Page): Promise<void> {
  await page.evaluate(() => {
    const region = document.querySelector('[role="status"]')
    if (region === null) throw new Error('no status region')
    const seen: { text: string; focused: string }[] = []
    ;(window as unknown as { focusAtStatus: typeof seen }).focusAtStatus = seen
    new MutationObserver(() => {
      const text = region.textContent ?? ''
      if (text === '') return
      const active = document.activeElement as (HTMLElement & { labels?: NodeListOf<HTMLLabelElement> }) | null
      const focused =
        active?.labels?.[0]?.textContent ?? active?.getAttribute('aria-label') ?? active?.textContent ?? ''
      seen.push({ text, focused })
    }).observe(region, { childList: true, characterData: true, subtree: true })
  })
}

export function focusAtStatus(page: Page): Promise<{ text: string; focused: string }[]> {
  return page.evaluate(
    () => (window as unknown as { focusAtStatus: { text: string; focused: string }[] }).focusAtStatus,
  )
}

/**
 * Every entry of a zip (an export), by name, its data inflated: stored
 * (method 0) and deflated (method 8) entries, read through the central
 * directory. Throws on any other method or a missing directory.
 */
export function zipEntries(zip: Buffer): Map<string, Buffer> {
  let end = zip.length - 22
  while (end >= 0 && zip.readUInt32LE(end) !== 0x06054b50) end -= 1
  if (end < 0) throw new Error('no zip directory')
  const count = zip.readUInt16LE(end + 10)
  let at = zip.readUInt32LE(end + 16)
  const entries = new Map<string, Buffer>()
  for (let i = 0; i < count; i += 1) {
    if (zip.readUInt32LE(at) !== 0x02014b50) throw new Error('bad zip directory')
    const method = zip.readUInt16LE(at + 10)
    const size = zip.readUInt32LE(at + 20)
    const nameLength = zip.readUInt16LE(at + 28)
    const extraLength = zip.readUInt16LE(at + 30)
    const commentLength = zip.readUInt16LE(at + 32)
    const local = zip.readUInt32LE(at + 42)
    const name = zip.subarray(at + 46, at + 46 + nameLength).toString('utf8')
    const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28)
    const data = zip.subarray(start, start + size)
    if (method === 0) entries.set(name, data)
    else if (method === 8) entries.set(name, inflateRawSync(data))
    else throw new Error(`zip method ${method}`)
    at += 46 + nameLength + extraLength + commentLength
  }
  return entries
}
