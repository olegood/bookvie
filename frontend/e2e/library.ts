// Shared by the specs that work with Books: the seeded ids, the catalog as the
// API returns it, the New book and Edit book panels, and computed colors.

import type { Locator, Page } from '@playwright/test'
import type { Server } from './fixtures.ts'

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
