// Shared by the Story 10.1 specs (catalog-sort-direction.spec.ts and its
// automate leaves to come): the Sort group with its select and the Sort
// direction toggle, the two storage keys, the seeded shelves with every key's
// natural and reversed order, the light and dark tokens the toggle reads, and
// the measuring helpers `spineOrder` (spine names in DOM order), `stored`
// (one localStorage value), `raisedHalf` (which half of the Sort group paints
// on top) and `systemColor` (a CSS system color as the page resolves it).

import type { Locator, Page } from '@playwright/test'
import { finished } from './bookcase.ts'
import { bookId, rgbOf } from './library.ts'

export {
  ACCENT,
  ACCENT_DARK,
  bookId,
  INK,
  INK_DARK,
  INK_SECONDARY,
  INK_SECONDARY_DARK,
  SURFACE_INSET,
  SURFACE_INSET_DARK,
  sortSelect,
} from './library.ts'

export const SORT_KEY = 'bookvie.catalogSort'
export const REVERSED_KEY = 'bookvie.catalogSortReversed'
/** The stored "reversed" value (plan D6: `"true"`, or the key absent). */
export const REVERSED = 'true'

// tokens.css input-border, light and dark. surface-inset, ink, ink-secondary
// and accent (and their dark twins) are re-exported above from library.ts.
export const INPUT_BORDER = rgbOf('#8A8273')
export const INPUT_BORDER_DARK = rgbOf('#767A6F')

/**
 * Story 7.1's SORT_SHELF. Every key orders these differently. The two Dune
 * editions share title, author, pages and `createdAt`, so only the Book id
 * separates them: id 3 (not read yet) before id 4 (finished) under every key
 * and in both directions, since the tie-breaks never flip. A plain reverse of
 * the natural array would put id 4 first, so it shows up.
 */
export const SORT_SHELF = [
  {
    id: bookId(1),
    title: 'Kindred',
    authors: ['Octavia E. Butler'],
    pages: 286,
    createdAt: '2026-01-10T10:00:00+00:00',
  },
  { id: bookId(2), title: 'Emma', authors: ['Jane Austen'], pages: 474, createdAt: '2026-03-01T10:00:00+00:00' },
  {
    id: bookId(4),
    title: 'Dune',
    authors: ['Frank Herbert'],
    pages: 412,
    createdAt: '2026-02-01T09:00:00+00:00',
    readings: finished(412),
  },
  { id: bookId(3), title: 'Dune', authors: ['Frank Herbert'], pages: 412, createdAt: '2026-02-01T09:00:00+00:00' },
  { id: bookId(5), title: 'Beloved', authors: ['Toni Morrison'], pages: 324, createdAt: '2026-04-15T10:00:00+00:00' },
]

export const KINDRED = 'Kindred by Octavia E. Butler, not read yet'
export const EMMA = 'Emma by Jane Austen, not read yet'
export const DUNE_UNREAD = 'Dune by Frank Herbert, not read yet' // id 3
export const DUNE_FINISHED = 'Dune by Frank Herbert, finished' // id 4
export const BELOVED = 'Beloved by Toni Morrison, not read yet'

// Natural directions (Story 7.1).
export const BY_AUTHOR = [DUNE_UNREAD, DUNE_FINISHED, EMMA, KINDRED, BELOVED]
export const BY_TITLE = [BELOVED, DUNE_UNREAD, DUNE_FINISHED, EMMA, KINDRED]
export const BY_DATE_ADDED = [BELOVED, EMMA, DUNE_UNREAD, DUNE_FINISHED, KINDRED]
export const BY_PAGES = [KINDRED, BELOVED, DUNE_UNREAD, DUNE_FINISHED, EMMA]
// Reversed: only the primary compare flips; the Dunes stay id 3, then id 4.
export const AUTHOR_Z_A = [BELOVED, KINDRED, EMMA, DUNE_UNREAD, DUNE_FINISHED]
export const TITLE_Z_A = [KINDRED, EMMA, DUNE_UNREAD, DUNE_FINISHED, BELOVED]
export const OLDEST_FIRST = [KINDRED, DUNE_UNREAD, DUNE_FINISHED, EMMA, BELOVED]
export const MOST_FIRST = [EMMA, DUNE_UNREAD, DUNE_FINISHED, BELOVED, KINDRED]

/**
 * Two Books by one first author (Emma, Persuasion) and two with one title
 * (the Dune editions, told apart by "edition N" in their names), seeded in
 * an order that a stored-order sort would show: Persuasion before Emma, the
 * newer Dune before the older. Emma is newer than Persuasion, so a tie broken
 * by `createdAt` instead of title shows up too.
 */
export const TIE_SHELF = [
  { id: bookId(11), title: 'Kindred', authors: ['Octavia E. Butler'], createdAt: '2026-01-10T10:00:00+00:00' },
  { id: bookId(12), title: 'Persuasion', authors: ['Jane Austen'], createdAt: '2026-03-01T10:00:00+00:00' },
  { id: bookId(13), title: 'Emma', authors: ['Jane Austen'], createdAt: '2026-04-01T10:00:00+00:00' },
  {
    id: bookId(14),
    title: 'Dune',
    authors: ['Frank Herbert'],
    edition: 2,
    pages: 412,
    createdAt: '2026-05-01T10:00:00+00:00',
  },
  {
    id: bookId(15),
    title: 'Dune',
    authors: ['Frank Herbert'],
    edition: 1,
    pages: 412,
    createdAt: '2026-02-01T10:00:00+00:00',
  },
]

export const T_KINDRED = 'Kindred by Octavia E. Butler, not read yet'
export const T_PERSUASION = 'Persuasion by Jane Austen, not read yet'
export const T_EMMA = 'Emma by Jane Austen, not read yet'
export const T_DUNE_1 = 'Dune by Frank Herbert, edition 1, not read yet' // added 1 Feb
export const T_DUNE_2 = 'Dune by Frank Herbert, edition 2, not read yet' // added 1 May

// Author: the Austens by title (Emma, Persuasion), the Dunes by the one added earlier, in both directions.
export const TIES_BY_AUTHOR = [T_DUNE_1, T_DUNE_2, T_EMMA, T_PERSUASION, T_KINDRED]
export const TIES_AUTHOR_Z_A = [T_KINDRED, T_EMMA, T_PERSUASION, T_DUNE_1, T_DUNE_2]
// Title: the Dunes by the one added earlier, in both directions.
export const TIES_BY_TITLE = [T_DUNE_1, T_DUNE_2, T_EMMA, T_KINDRED, T_PERSUASION]
export const TIES_TITLE_Z_A = [T_PERSUASION, T_KINDRED, T_EMMA, T_DUNE_1, T_DUNE_2]

/** The Sort group: the select and the toggle, labelled by the visible "Sort". */
export function sortGroup(page: Page): Locator {
  return page.getByRole('main').getByRole('group', { name: 'Sort', exact: true })
}

/** The Sort direction toggle: the one button in the Sort group. */
export function sortToggle(page: Page): Locator {
  return sortGroup(page).getByRole('button')
}

/** The toggle's arrow: its `aria-hidden` part. */
export function toggleArrow(page: Page): Locator {
  return sortToggle(page).locator('[aria-hidden="true"]')
}

/** The spine names in `list` (the Catalog bookcase or Home's slice), in DOM order. */
export function spineOrder(list: Locator): Promise<(string | null)[]> {
  return list.getByRole('button').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')))
}

/** One localStorage value, or `null` when the key is absent. */
export function stored(page: Page, key: string): Promise<string | null> {
  return page.evaluate((name) => window.localStorage.getItem(name), key)
}

/** Stores `values` before the app loads, on the first load of this tab only (a reload keeps what the app wrote). */
export async function storeOnce(page: Page, values: Record<string, string>): Promise<void> {
  await page.addInitScript((entries) => {
    if (window.sessionStorage.getItem('e2e.seeded') !== null) return
    window.sessionStorage.setItem('e2e.seeded', '1')
    for (const [key, value] of Object.entries(entries)) window.localStorage.setItem(key, value)
  }, values)
}

/**
 * Which half of `group` paints on top where the select and the button meet:
 * `'select'`, `'toggle'` or `'neither'`. Each half's stacking level is the
 * highest `z-index` that takes effect on the path from it up to (not
 * including) the two halves' common ancestor: on a positioned element, or on
 * a flex or grid item. With no such `z-index` a half is at level 0.
 */
export function raisedHalf(group: Locator): Promise<'select' | 'toggle' | 'neither'> {
  return group.evaluate((element) => {
    const select = element.querySelector('select')
    const toggle = element.querySelector('button')
    if (select === null || toggle === null) throw new Error('the group has no select or no button')
    const ancestors = (node: Element): Element[] => {
      const chain: Element[] = []
      for (let at: Element | null = node; at !== null; at = at.parentElement) chain.push(at)
      return chain
    }
    const toggleChain = ancestors(toggle)
    const common = ancestors(select).find((node) => toggleChain.includes(node))!
    const level = (node: Element): number => {
      let highest = 0
      for (let at: Element | null = node; at !== null && at !== common; at = at.parentElement) {
        const style = getComputedStyle(at)
        const parent = at.parentElement === null ? '' : getComputedStyle(at.parentElement).display
        const applies = style.position !== 'static' || /flex|grid/.test(parent)
        const z = parseInt(style.zIndex, 10)
        if (applies && !Number.isNaN(z)) highest = Math.max(highest, z)
      }
      return highest
    }
    const s = level(select)
    const t = level(toggle)
    return s > t ? 'select' : t > s ? 'toggle' : 'neither'
  })
}

/** A CSS system color (`ButtonFace`, `ButtonText`, …) as this page resolves it now, as `rgb(…)`. */
export function systemColor(page: Page, name: string): Promise<string> {
  return page.evaluate((keyword) => {
    const probe = document.createElement('div')
    probe.style.setProperty('forced-color-adjust', 'none')
    probe.style.setProperty('color', keyword)
    document.body.append(probe)
    const color = getComputedStyle(probe).color
    probe.remove()
    return color
  }, name)
}

// Automate leaves (after the story was done): the select's dark focus halo,
// as a computed `box-shadow` value. ACCENT_DARK comes from library.ts.
export const FOCUS_HALO_DARK = 'rgba(147, 181, 151, 0.18) 0px 0px 0px 4px'

/**
 * Where the toggle's text sits inside it, measured with a `Range` on each of
 * its two text nodes (the arrow, then the label; the hidden `::after` twin is
 * no text node): `left` from the inner border edge to the arrow, `gap` from
 * the arrow to the label, `right` from the label to the inner border edge.
 */
export function toggleInsets(toggle: Locator): Promise<{ left: number; gap: number; right: number }> {
  return toggle.evaluate((button) => {
    const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT)
    const texts: Node[] = []
    while (walker.nextNode()) if ((walker.currentNode.textContent ?? '').trim() !== '') texts.push(walker.currentNode)
    if (texts.length !== 2) throw new Error(`expected an arrow and a label text node, found ${texts.length}`)
    const [arrow, label] = texts.map((node) => {
      const range = document.createRange()
      range.selectNodeContents(node)
      return range.getBoundingClientRect()
    })
    const box = button.getBoundingClientRect()
    const style = getComputedStyle(button)
    return {
      left: arrow.left - box.left - parseFloat(style.borderLeftWidth),
      gap: label.left - arrow.right,
      right: box.right - parseFloat(style.borderRightWidth) - label.right,
    }
  })
}
