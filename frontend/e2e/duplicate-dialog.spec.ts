// Story 1.9 Duplicate dialog (CAT-E2E-003): the alertdialog over the New book
// panel, Don't add and Add anyway. The duplicate rules themselves are proven at
// API level (backend/tests/test_duplicate_book.py); these tests use the real
// server's refusal and read every outcome by role and accessible name.

import type { Locator, Page, Request } from '@playwright/test'
import { expect, type Server, test } from './fixtures.ts'

const ADD_BOOK = '/api/intents/add-book'
// DESIGN.md ink, light theme.
const INK = 'rgb(43, 46, 42)'
// Ace's Dune: seeded as ISBN-13, typed as the ISBN-10 on older copies.
const DUNE_ISBN13 = '9780441172719'
const DUNE_ISBN10 = '0-441-17271-7'
// A complete Book as the cataloging skill types it; Type is picked separately.
const DUNE = {
  Title: 'Dune',
  Pages: '412',
  'Author(s)': 'Frank Herbert',
  Language: 'English',
  Publisher: 'Chilton Books',
}
const NEUROMANCER = { title: 'Neuromancer', authors: ['William Gibson'], pages: 271 }

type CatalogBody = { books: { title: string }[] }

function newBookPanel(page: Page): Locator {
  return page.getByRole('dialog', { name: 'New book', exact: true })
}

function duplicateDialog(page: Page): Locator {
  return page.getByRole('alertdialog', { name: 'Possible duplicate', exact: true })
}

async function openNewBook(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'New book', exact: true }).click()
  return newBookPanel(page)
}

async function fillFields(panel: Locator, fields: Record<string, string>): Promise<void> {
  for (const [label, value] of Object.entries(fields)) {
    await panel.getByLabel(label, { exact: true }).fill(value)
  }
  await panel.getByRole('combobox', { name: 'Type', exact: true }).selectOption('Paperback')
}

async function catalogTitles(page: Page, server: Server): Promise<string[]> {
  const response = await page.request.get(`${server.url}/api/views/catalog`)
  return ((await response.json()) as CatalogBody).books.map((book) => book.title).sort()
}

/** The JSON `intent` part of a multipart add-book request. */
function intentOf(request: Request): Record<string, unknown> {
  const json = /\{[\s\S]*\}/.exec(request.postData() ?? '')?.[0] ?? '{}'
  return JSON.parse(json) as Record<string, unknown>
}

test.describe('Story 1.9 Duplicate dialog (ATDD)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test.skip('[P0] AC-6 a duplicate refusal opens the "Possible duplicate" alertdialog over an inert panel', async ({
    page,
    seededServer,
  }) => {
    // Five Books share Dune's ISBN, in this catalog order; one doesn't match.
    const server = await seededServer({
      books: [
        { title: 'Dune', authors: ['Frank Herbert'], isbn: DUNE_ISBN13 },
        { title: 'Dune (Ace)', authors: ['Frank Herbert'], isbn: DUNE_ISBN13 },
        { title: 'Dune (Book Club)', authors: ['Frank Herbert'], isbn: DUNE_ISBN13 },
        { title: 'Dune (Anniversary)', authors: ['Frank Herbert'], isbn: DUNE_ISBN13 },
        { title: 'Dune (Deluxe)', authors: ['Frank Herbert'], isbn: DUNE_ISBN13 },
        NEUROMANCER,
      ],
    })
    await page.goto(`${server.url}/`)
    const panel = await openNewBook(page)
    await fillFields(panel, { ...DUNE, ISBN: DUNE_ISBN10 })

    await panel.getByRole('button', { name: 'Add book', exact: true }).click()
    const dialog = duplicateDialog(page)
    await expect(dialog).toBeVisible()

    // Up to three matches by name, then "and N more".
    await expect(dialog).toHaveAccessibleDescription(/\(Ace\)/)
    await expect(dialog).toHaveAccessibleDescription(/\(Book Club\)/)
    await expect(dialog).toHaveAccessibleDescription(/and 2 more/)
    await expect(dialog).not.toHaveAccessibleDescription(/Anniversary|Deluxe|Neuromancer/)

    // Stacked over the panel, which is inert: only the dialog's two buttons.
    expect(await dialog.evaluate((element) => element.matches(':modal'))).toBe(true)
    await expect(panel).toBeVisible()
    await expect(dialog.getByRole('button')).toHaveText(["Don't add", 'Add anyway'])
    await expect(page.getByRole('button', { name: 'Open existing' })).toHaveCount(0)
    const title = panel.getByLabel('Title', { exact: true })
    expect(await title.evaluate((element) => (element.focus(), document.activeElement === element))).toBe(false)
    for (let press = 0; press < 3; press++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((element) => element.contains(document.activeElement)), `Tab ${press + 1}`).toBe(
        true,
      )
    }

    // No warning color, no icon.
    await expect(dialog.getByRole('heading', { name: 'Possible duplicate', exact: true })).toHaveCSS('color', INK)
    await expect(dialog.locator('svg, img')).toHaveCount(0)
    // Nothing saved while the warning is open.
    expect(await catalogTitles(page, server)).toEqual([
      'Dune',
      'Dune (Ace)',
      'Dune (Anniversary)',
      'Dune (Book Club)',
      'Dune (Deluxe)',
      'Neuromancer',
    ])
  })

  test.skip("[P0] AC-7 Don't add (default focus) closes the warning, saves nothing, keeps every field and refocuses Title", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [{ title: 'Dune', authors: ['Frank Herbert'] }, NEUROMANCER] })
    await page.goto(`${server.url}/`)
    const panel = await openNewBook(page)
    const typed = { ...DUNE, Subtitle: 'Book One', ISBN: DUNE_ISBN10, Tags: 'sci-fi' }
    await fillFields(panel, typed)
    await panel.getByRole('button', { name: 'Add book', exact: true }).click()
    const dialog = duplicateDialog(page)
    await dialog.waitFor()
    const focusedOnOpen = await page.evaluate(() => document.activeElement?.textContent ?? '')

    // Enter on the default focus.
    await page.keyboard.press('Enter')
    await expect(dialog).toBeHidden()

    expect(focusedOnOpen).toBe("Don't add")
    await expect(panel).toBeVisible()
    await expect(panel.getByLabel('Title', { exact: true })).toBeFocused()
    for (const [label, value] of Object.entries(typed)) {
      await expect(panel.getByLabel(label, { exact: true }), label).toHaveValue(value)
    }
    await expect(panel.getByRole('combobox', { name: 'Type', exact: true })).toHaveValue(/paperback/i)
    await expect(page.getByRole('status')).toHaveText('')
    expect(await catalogTitles(page, server)).toEqual(['Dune', 'Neuromancer'])
  })

  test.skip('[P0] AC-8 Add anyway resends with confirmDuplicate and saves as a normal "Added Title."', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [{ title: 'Dune', authors: ['Frank Herbert'] }, NEUROMANCER] })
    const sent: Request[] = []
    page.on('request', (request) => {
      if (request.method() === 'POST' && new URL(request.url()).pathname === ADD_BOOK) sent.push(request)
    })
    await page.goto(`${server.url}/`)
    const panel = await openNewBook(page)
    await fillFields(panel, DUNE)
    await panel.getByRole('button', { name: 'Add book', exact: true }).click()
    const dialog = duplicateDialog(page)

    await dialog.getByRole('button', { name: 'Add anyway', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText('Added Dune.')

    await expect(dialog).toBeHidden()
    await expect(panel).toBeHidden()
    // The same intent, sent again with the flag.
    expect(sent).toHaveLength(2)
    const [first, second] = sent.map(intentOf)
    expect(first).not.toHaveProperty('confirmDuplicate')
    expect(second).toEqual({ ...first, confirmDuplicate: true })
    await expect(page.getByRole('table').locator(':focus')).toHaveText('Dune')
    await expect(page.getByRole('alert')).toHaveText('')
    expect(await catalogTitles(page, server)).toEqual(['Dune', 'Dune', 'Neuromancer'])
  })
})
