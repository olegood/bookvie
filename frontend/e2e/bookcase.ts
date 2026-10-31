// Shared by the Story 1.10 bookcase specs: DESIGN.md colors, seed builders,
// the bookcase locators by role and name, and the computed look of a spine.

import type { Locator, Page } from '@playwright/test'

// DESIGN.md colors, light theme.
export const INK = 'rgb(43, 46, 42)'
export const ACCENT = 'rgb(85, 112, 89)'
export const SHELF_WALL = 'rgb(239, 234, 224)'
export const SPINE_EDGE = 'rgb(94, 88, 77)'
export const SPINE_LABEL_STRIP = 'rgb(251, 248, 241)'
export const SPINE_UNREAD_FILL = 'rgb(253, 252, 249)'
export const SPINE_UNREAD_OUTLINE = 'rgb(138, 130, 115)'
export const SPINE_UNREAD_TEXT = 'rgb(119, 113, 106)'
export const TRANSPARENT = 'rgba(0, 0, 0, 0)'
// A pale yellow the user picked: shown exactly, never darkened for contrast.
export const PALE_YELLOW = { hex: '#F2D35B', rgb: 'rgb(242, 211, 91)' }
// DESIGN.md → Spine: the label strip is at most 96px long.
export const STRIP_MAX = 96
// Long enough that its height reaches the 200px cap on any platform font.
export const TUFTE = 'The Visual Display of Quantitative Information, Second Edition'
// A complete Book as the cataloging skill types it; Type is picked separately.
export const SWING_TIME = {
  Title: 'Swing Time',
  Pages: '453',
  'Author(s)': 'Zadie Smith',
  Language: 'English',
  Publisher: 'Hamish Hamilton',
}

/** A finished Reading back-filled with Finished on (no start date). */
export function finished(pages = 300) {
  return [{ startDate: null, currentPage: pages, finishDate: '2026-03-20', finishedPages: pages }]
}

/** `count` Books by one author, titled "Book 001", "Book 002", … in sort order. */
export function shelfOf(count: number, author = 'Author') {
  return Array.from({ length: count }, (_, n) => ({
    title: `Book ${String(n + 1).padStart(3, '0')}`,
    authors: [author],
  }))
}

export function bookcase(page: Page): Locator {
  return page.getByRole('list', { name: /^Bookcase, \d+ books?$/ })
}

export function spines(page: Page): Locator {
  return bookcase(page).getByRole('button')
}

export function spine(page: Page, name: string): Locator {
  return bookcase(page).getByRole('listitem').getByRole('button', { name, exact: true })
}

export function viewToggle(page: Page): Locator {
  return page.getByRole('group', { name: 'Catalog view', exact: true })
}

export function search(page: Page): Locator {
  return page.getByRole('searchbox', { name: 'Search titles', exact: true })
}

export function bookRows(page: Page): Locator {
  return page.getByRole('table').getByRole('row').filter({ hasNot: page.getByRole('columnheader') })
}

/** Moves focus into the bookcase the way a keyboard user does: Tab from New book. */
export async function tabIntoBookcase(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'New book', exact: true }).focus()
  await page.keyboard.press('Tab')
}

export async function press(page: Page, key: string, times: number): Promise<void> {
  for (let n = 0; n < times; n++) await page.keyboard.press(key)
}

/** Spine indexes grouped into shelf rows (spines stand on one plank: same bottom). */
export async function shelfRows(page: Page): Promise<number[][]> {
  const bottoms = await spines(page).evaluateAll((elements) =>
    elements.map((element) => Math.round(element.getBoundingClientRect().bottom)),
  )
  const rows: number[][] = []
  bottoms.forEach((bottom, index) => {
    if (index === 0 || bottom !== bottoms[index - 1]) rows.push([])
    rows.at(-1)!.push(index)
  })
  return rows
}

export type SpineLook = {
  fill: string
  edgeColors: [string, string, string]
  edgeWidths: [string, string, string]
  bottomWidth: string
  labelColor: string
  labelOverflow: string
  labelWhiteSpace: string
  /** The plate behind the label: its fill and its longer side, or null. */
  strip: { fill: string; length: number } | null
}

/** The computed look of a spine and of the element holding its `title` label. */
export function look(spineButton: Locator, title: string): Promise<SpineLook> {
  return spineButton.evaluate(
    (element, { text, transparent }) => {
      const style = getComputedStyle(element)
      const nodes = [element, ...Array.from(element.querySelectorAll('*'))]
      const label = nodes.filter((node) => node.textContent === text).at(-1) ?? element
      const labelStyle = getComputedStyle(label)
      let strip: { fill: string; length: number } | null = null
      for (let node: Element | null = label; node && node !== element; node = node.parentElement) {
        const fill = getComputedStyle(node).backgroundColor
        if (fill !== transparent) {
          const box = node.getBoundingClientRect()
          strip = { fill, length: Math.max(box.width, box.height) }
          break
        }
      }
      return {
        fill: style.backgroundColor,
        edgeColors: [style.borderTopColor, style.borderLeftColor, style.borderRightColor],
        edgeWidths: [style.borderTopWidth, style.borderLeftWidth, style.borderRightWidth],
        bottomWidth: style.borderBottomWidth,
        labelColor: labelStyle.color,
        labelOverflow: labelStyle.textOverflow,
        labelWhiteSpace: labelStyle.whiteSpace,
        strip,
      } as SpineLook
    },
    { text: title, transparent: TRANSPARENT },
  )
}
