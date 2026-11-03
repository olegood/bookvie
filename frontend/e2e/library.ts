// Shared by the specs that work with Books: the seeded ids, the catalog as the
// API returns it, the New book and Edit book panels, and computed colors.

import type { Locator, Page } from '@playwright/test'
import type { Server } from './fixtures.ts'

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
