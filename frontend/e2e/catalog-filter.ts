// Shared by the Catalog filter specs (Story 7.2, Story 15.2): the toolbar's
// chips and checkbox lists found by role and name, the spine names in a list,
// the keys in storage, and an add from the New book panel. Story 15.2 moved
// them here from catalog-filter.spec.ts and added the list chips' readers.

import type { Locator, Page } from '@playwright/test'
import { bookcase, SWING_TIME } from './bookcase.ts'
import { expect } from './fixtures.ts'

export function main(page: Page): Locator {
  return page.getByRole('main')
}

export function chipGroup(page: Page, name: 'Status' | 'Type'): Locator {
  return main(page).getByRole('group', { name, exact: true })
}

export function chip(page: Page, group: 'Status' | 'Type', name: string): Locator {
  return chipGroup(page, group).getByRole('button', { name, exact: true })
}

/** A list chip (Language ▾, Tag ▾, Publisher ▾); its name becomes "Language: 2" with two values checked. */
export function listChip(page: Page, label: ListLabel): Locator {
  return main(page).getByRole('button', { name: new RegExp(`^${label}\\b`) })
}

/** The Language ▾ chip; its name becomes "Language: 2" with two values checked. */
export function languageChip(page: Page): Locator {
  return listChip(page, 'Language')
}

export function tagChip(page: Page): Locator {
  return listChip(page, 'Tag')
}

/** The Publisher ▾ chip (Story 15.2). */
export function publisherChip(page: Page): Locator {
  return listChip(page, 'Publisher')
}

export type ListLabel = 'Language' | 'Tag' | 'Publisher'

/** The open popup of a list chip: the `group` named after the chip. */
export function listPopup(page: Page, label: ListLabel): Locator {
  return main(page).getByRole('group', { name: label, exact: true })
}

export function clearFilters(page: Page): Locator {
  return main(page).getByRole('button', { name: 'Clear filters', exact: true })
}

/** The spine names in `list`, in DOM order, visible ones only. */
export function spineNames(list: Locator): Promise<(string | null)[]> {
  return list.getByRole('button').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')))
}

/** The accessible names of the checkboxes on the page, in DOM order. */
export function checkboxNames(page: Page): Promise<string[]> {
  return page.getByRole('checkbox').evaluateAll((boxes) =>
    boxes.map((box) => {
      const input = box as HTMLInputElement
      const labelledBy = input.getAttribute('aria-labelledby')
      if (labelledBy) {
        return labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent ?? '')
          .join(' ')
          .trim()
      }
      return (input.getAttribute('aria-label') ?? input.labels?.[0]?.textContent ?? input.textContent ?? '').trim()
    }),
  )
}

/**
 * The checkboxes' accessible names in `label`'s popup, in order, as the
 * browser's accessibility tree computes them (a visually hidden noun and an
 * `aria-label` both count). Opens the popup with a click on its chip when it
 * is closed, and returns `[]` when there is no such chip, so it can run inside
 * `expect.poll` as a leaf's first assertion before the chip exists.
 */
export async function listNames(page: Page, label: ListLabel): Promise<string[]> {
  const popup = listPopup(page, label)
  if ((await popup.count()) === 0) {
    const chipButton = listChip(page, label)
    if ((await chipButton.count()) !== 1) return []
    await chipButton.click()
    if ((await popup.count()) === 0) return []
  }
  const snapshot = await popup.ariaSnapshot()
  return [...snapshot.matchAll(/^\s*- checkbox "((?:[^"\\]|\\.)*)"/gm)].map((match) => JSON.parse(`"${match[1]}"`))
}

/** How a list row draws its count: the text node's element's color and font, and the row's own. */
export type CountLook = {
  /** The row's whole text (its `label`'s `textContent`), trimmed. */
  rowText: string
  /** The innermost element whose own text is exactly the count. */
  count: { color: string; fontSize: string; fontFamily: string; lineHeight: string } | null
  /** The row (`label`) itself. */
  row: { color: string; fontSize: string; fontFamily: string; lineHeight: string }
}

/**
 * The row in `label`'s open popup whose checkbox is named `name` (exactly, or
 * matching a pattern), and how it
 * draws `count`: the innermost element inside the row whose trimmed own text
 * (its direct text nodes) is exactly `count`, or `null` when none is.
 */
export function countLook(page: Page, label: ListLabel, name: string | RegExp, count: string): Promise<CountLook> {
  return listPopup(page, label)
    .getByRole('checkbox', { name, exact: typeof name === 'string' })
    .evaluate((input, wanted) => {
      const row = (input as HTMLInputElement).labels?.[0] ?? input.closest('label') ?? input.parentElement!
      const font = (element: Element) => {
        const style = getComputedStyle(element)
        return {
          color: style.color,
          fontSize: style.fontSize,
          fontFamily: style.fontFamily,
          lineHeight: style.lineHeight,
        }
      }
      const ownText = (element: Element) =>
        Array.from(element.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent ?? '')
          .join('')
          .trim()
      const holders = [row, ...Array.from(row.querySelectorAll('*'))].filter((element) => ownText(element) === wanted)
      const holder = holders.at(-1)
      return {
        rowText: (row.textContent ?? '').trim(),
        count: holder ? font(holder) : null,
        row: font(row),
      }
    }, count)
}

/** A spine by its exact name, even while it is hidden. */
export function anySpine(page: Page, name: string): Locator {
  return bookcase(page).locator(`button[aria-label="${name}"]`)
}

/** The keys in localStorage and sessionStorage, sorted. */
export function storageKeys(page: Page): Promise<{ local: string[]; session: string[] }> {
  return page.evaluate(() => ({
    local: Object.keys(window.localStorage).sort(),
    session: Object.keys(window.sessionStorage).sort(),
  }))
}

/** Adds Swing Time (unread, English, Paperback, no tags, Hamish Hamilton) from the New book panel. */
export async function addSwingTime(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'New book', exact: true }).click()
  const panel = page.getByRole('dialog', { name: 'New book', exact: true })
  for (const [label, value] of Object.entries(SWING_TIME)) {
    await panel.getByLabel(label, { exact: true }).fill(value)
  }
  await panel.getByRole('combobox', { name: 'Type', exact: true }).selectOption('Paperback')
  await panel.getByRole('button', { name: 'Add book', exact: true }).click()
  await expect(panel).toBeHidden()
}

export const SWING = 'Swing Time by Zadie Smith, not read yet'
