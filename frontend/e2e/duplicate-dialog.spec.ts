// Story 1.9 Duplicate dialog (CAT-E2E-003): the alertdialog over the New book
// panel, Don't add and Add anyway. The duplicate rules themselves are proven at
// API level (backend/tests/test_duplicate_book.py); these tests use the real
// server's refusal and read every outcome by role and accessible name.

import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page, Request } from '@playwright/test'
import { expect, type Server, test } from './fixtures.ts'

const ADD_BOOK = '/api/intents/add-book'
const COULDNT_SAVE = "Couldn't save. Your data wasn't changed."
// DESIGN.md ink, light theme.
const INK = 'rgb(43, 46, 42)'
// DESIGN.md ink, dark theme.
const INK_DARK = 'rgb(236, 234, 227)'
// Ace's Dune: seeded as ISBN-13, typed as the ISBN-10 on older copies.
const DUNE_ISBN13 = '9780441172719'
const DUNE_ISBN10 = '0-441-17271-7'
// Ace's 2005 Dune: another edition, so another ISBN.
const DUNE_2005_ISBN13 = '978-0-441-01359-3'
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

/** Every add-book POST the page sends, in order. */
function addBookRequests(page: Page): Request[] {
  const sent: Request[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === ADD_BOOK) sent.push(request)
  })
  return sent
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

  test('[P0] AC-6 a duplicate refusal opens the "Possible duplicate" alertdialog over an inert panel', async ({
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
    // Rendered by the client from `duplicates`, each with its stored ISBN.
    await expect(dialog).toHaveAccessibleDescription(
      `Already in your catalog: Dune by Frank Herbert (ISBN ${DUNE_ISBN13}), ` +
        `Dune (Ace) by Frank Herbert (ISBN ${DUNE_ISBN13}) and ` +
        `Dune (Book Club) by Frank Herbert (ISBN ${DUNE_ISBN13}), and 2 more.`,
    )

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

  test("[P0] AC-7 Don't add (default focus) closes the warning, saves nothing, keeps every field and refocuses Title", async ({
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
    // The warning is the dialog alone: no alert text.
    await expect(page.getByRole('alert')).toHaveText('')

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
    await expect(page.getByRole('alert')).toHaveText('')
    expect(await catalogTitles(page, server)).toEqual(['Dune', 'Neuromancer'])
  })

  test('[P0] AC-8 Add anyway resends with confirmDuplicate and saves as a normal "Added Title."', async ({
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

  test('[P1] AC-6 Esc acts as Don\'t add and the live regions follow the topmost modal', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [{ title: 'Dune', authors: ['Frank Herbert'] }, NEUROMANCER] })
    await page.goto(`${server.url}/`)
    const panel = await openNewBook(page)
    await fillFields(panel, DUNE)
    await panel.getByRole('button', { name: 'Add book', exact: true }).click()
    const dialog = duplicateDialog(page)
    await expect(dialog).toBeVisible()
    // One match with no ISBN: no "(ISBN …)".
    await expect(dialog).toHaveAccessibleDescription('Already in your catalog: Dune by Frank Herbert.')

    // While the dialog is open, both regions are inside it (not inert).
    await expect(dialog.getByRole('status')).toHaveCount(1)
    await expect(dialog.getByRole('alert')).toHaveCount(1)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(panel).toBeVisible()
    await expect(panel.getByLabel('Title', { exact: true })).toBeFocused()
    await expect(panel.getByLabel('Title', { exact: true })).toHaveValue('Dune')
    // Back inside the panel once the dialog closes.
    await expect(panel.getByRole('status')).toHaveCount(1)
    await expect(panel.getByRole('alert')).toHaveCount(1)
    expect(await catalogTitles(page, server)).toEqual(['Dune', 'Neuromancer'])
  })

  test('[P1] AC-7 a duplicate refusal clears the field errors of an earlier refusal', async ({ page, seededServer }) => {
    const server = await seededServer({ books: [{ title: 'Dune', authors: ['Frank Herbert'] }, NEUROMANCER] })
    await page.goto(`${server.url}/`)
    const panel = await openNewBook(page)
    const { Pages, ...withoutPages } = DUNE
    await fillFields(panel, withoutPages)
    const addBook = panel.getByRole('button', { name: 'Add book', exact: true })
    await addBook.click()
    const pages = panel.getByLabel('Pages', { exact: true })
    await expect(pages).toHaveAttribute('aria-invalid', 'true')

    await pages.fill(Pages)
    await addBook.click()
    const dialog = duplicateDialog(page)
    await expect(dialog).toBeVisible()
    await expect(panel.locator('[aria-invalid="true"]')).toHaveCount(0)
    await expect(panel.getByText('Pages is required.', { exact: true })).toHaveCount(0)

    await dialog.getByRole('button', { name: "Don't add", exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(panel.locator('[aria-invalid="true"]')).toHaveCount(0)
    await expect(panel.getByText('Pages is required.', { exact: true })).toHaveCount(0)
  })

  // The description's list wording, rendered by the client from `duplicates`.
  const descriptions = [
    {
      name: 'two matches join with " and ", and a multi-author match with "; "',
      books: [
        { title: 'Dune', authors: ['Frank Herbert', 'Brian Herbert'] },
        { title: 'Dune', authors: ['Frank Herbert'], isbn: DUNE_ISBN13 },
      ],
      typed: DUNE,
      description:
        'Already in your catalog: Dune by Frank Herbert; Brian Herbert and ' +
        `Dune by Frank Herbert (ISBN ${DUNE_ISBN13}).`,
    },
    {
      name: 'four matches name three, then ", and 1 more."',
      books: ['Dune', 'Dune (Ace)', 'Dune (Book Club)', 'Dune (Anniversary)'].map((title) => ({
        title,
        authors: ['Frank Herbert'],
        isbn: DUNE_ISBN13,
      })),
      typed: { ...DUNE, ISBN: DUNE_ISBN10 },
      description:
        `Already in your catalog: Dune by Frank Herbert (ISBN ${DUNE_ISBN13}), ` +
        `Dune (Ace) by Frank Herbert (ISBN ${DUNE_ISBN13}) and ` +
        `Dune (Book Club) by Frank Herbert (ISBN ${DUNE_ISBN13}), and 1 more.`,
    },
  ]
  for (const { name, books, typed, description } of descriptions) {
    test(`[P2] AC-6 description: ${name}`, async ({ page, seededServer }) => {
      const server = await seededServer({ books: [...books, NEUROMANCER] })
      await page.goto(`${server.url}/`)
      const panel = await openNewBook(page)
      await fillFields(panel, typed)
      await panel.getByRole('button', { name: 'Add book', exact: true }).click()
      await expect(duplicateDialog(page)).toHaveAccessibleDescription(description)
    })
  }

  test("[P1] AC-8 a couldn't save on Add anyway keeps the panel and its values, and doesn't reopen the dialog", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [{ title: 'Dune', authors: ['Frank Herbert'] }, NEUROMANCER] })
    // Only the resend (the second send) fails; the first gets the real refusal.
    let sends = 0
    await page.route(`**${ADD_BOOK}`, (route) =>
      ++sends === 1
        ? route.continue()
        : route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ error: { kind: 'couldnt_save', code: 'couldnt_save', message: COULDNT_SAVE } }),
          }),
    )
    await page.goto(`${server.url}/`)
    const panel = await openNewBook(page)
    await fillFields(panel, DUNE)
    await panel.getByRole('button', { name: 'Add book', exact: true }).click()
    const dialog = duplicateDialog(page)

    await dialog.getByRole('button', { name: 'Add anyway', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText(COULDNT_SAVE)

    await expect(dialog).toHaveCount(0)
    await expect(panel).toBeVisible()
    await expect(panel.getByText(COULDNT_SAVE, { exact: true })).toBeVisible()
    for (const [label, value] of Object.entries(DUNE)) {
      await expect(panel.getByLabel(label, { exact: true }), label).toHaveValue(value)
    }
    expect(await catalogTitles(page, server)).toEqual(['Dune', 'Neuromancer'])
  })
})

test.describe('Story 1.9 Duplicate dialog (automate)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test('[P1] AC-8 while the Add anyway resend is in flight, Add book sends nothing', async ({ page, seededServer }) => {
    const server = await seededServer({ books: [{ title: 'Dune', authors: ['Frank Herbert'] }, NEUROMANCER] })
    // The resend (the second send) is held until the extra presses are made.
    let release!: () => void
    const held = new Promise<void>((resolve) => (release = resolve))
    let resendArrived!: () => void
    const resendHeld = new Promise<void>((resolve) => (resendArrived = resolve))
    let sends = 0
    await page.route(`**${ADD_BOOK}`, async (route) => {
      if (++sends === 2) {
        resendArrived()
        await held
      }
      await route.continue()
    })
    const sent = addBookRequests(page)
    await page.goto(`${server.url}/`)
    const panel = await openNewBook(page)
    await fillFields(panel, DUNE)
    await panel.getByRole('button', { name: 'Add book', exact: true }).click()
    await duplicateDialog(page).getByRole('button', { name: 'Add anyway', exact: true }).click()
    await resendHeld

    const addBook = panel.getByRole('button', { name: 'Add book', exact: true })
    await expect(addBook).toHaveAttribute('aria-disabled', 'true')
    // A real press still lands on an aria-disabled button; Playwright needs force.
    await addBook.click({ force: true })
    // A submit that skips the button (a script or agent) reaches the in-flight guard.
    await panel.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit())
    release()

    await expect(page.getByRole('status')).toHaveText('Added Dune.')
    expect(sent).toHaveLength(2)
    expect(sent.map(intentOf).map((intent) => intent.confirmDuplicate)).toEqual([undefined, true])
    await expect(duplicateDialog(page)).toHaveCount(0)
    expect(await catalogTitles(page, server)).toEqual(['Dune', 'Dune', 'Neuromancer'])
  })

  test("[P2] AC-7 after Don't add, an ISBN edited to another edition saves without a warning", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [{ title: 'Dune', authors: ['Frank Herbert'], isbn: DUNE_ISBN13 }, NEUROMANCER],
    })
    const sent = addBookRequests(page)
    await page.goto(`${server.url}/`)
    const panel = await openNewBook(page)
    await fillFields(panel, { ...DUNE, ISBN: DUNE_ISBN10 })
    const addBook = panel.getByRole('button', { name: 'Add book', exact: true })
    await addBook.click()
    const dialog = duplicateDialog(page)
    await dialog.getByRole('button', { name: "Don't add", exact: true }).click()
    await expect(dialog).toBeHidden()

    // Same title and author, but both Books now have different ISBNs.
    await panel.getByLabel('ISBN', { exact: true }).fill(DUNE_2005_ISBN13)
    await addBook.click()

    await expect(page.getByRole('status')).toHaveText('Added Dune.')
    await expect(dialog).toHaveCount(0)
    await expect(panel).toBeHidden()
    expect(sent).toHaveLength(2)
    expect(sent.map(intentOf).map((intent) => [intent.isbn, intent.confirmDuplicate])).toEqual([
      [DUNE_ISBN10, undefined],
      [DUNE_2005_ISBN13, undefined],
    ])
    expect(await catalogTitles(page, server)).toEqual(['Dune', 'Dune', 'Neuromancer'])
  })

  test('[P2] AC-6 Tab and Shift+Tab cycle between the two buttons in both directions', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [{ title: 'Dune', authors: ['Frank Herbert'] }, NEUROMANCER] })
    await page.goto(`${server.url}/`)
    const panel = await openNewBook(page)
    await fillFields(panel, DUNE)
    await panel.getByRole('button', { name: 'Add book', exact: true }).click()
    const dialog = duplicateDialog(page)
    const dontAdd = dialog.getByRole('button', { name: "Don't add", exact: true })
    const addAnyway = dialog.getByRole('button', { name: 'Add anyway', exact: true })
    await expect(dontAdd).toBeFocused()

    for (const [key, focused] of [
      ['Tab', addAnyway],
      ['Tab', dontAdd],
      ['Shift+Tab', addAnyway],
      ['Shift+Tab', dontAdd],
    ] as const) {
      await page.keyboard.press(key)
      await expect(focused).toBeFocused()
    }
  })

  test('[P2] AC-6 the open dialog passes axe in both themes, and its heading is ink in dark', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [{ title: 'Dune', authors: ['Frank Herbert'] }, NEUROMANCER] })
    for (const [colorScheme, ink] of [
      ['light', INK],
      ['dark', INK_DARK],
    ] as const) {
      await page.emulateMedia({ colorScheme })
      await page.goto(`${server.url}/`)
      const panel = await openNewBook(page)
      await fillFields(panel, DUNE)
      await panel.getByRole('button', { name: 'Add book', exact: true }).click()
      const dialog = duplicateDialog(page)
      await expect(dialog).toBeVisible()

      await expect(dialog.getByRole('heading', { name: 'Possible duplicate', exact: true }), colorScheme).toHaveCSS(
        'color',
        ink,
      )
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(violations.map(({ id, nodes }) => `${colorScheme}: ${id} (${nodes.length})`)).toEqual([])
    }
  })
})
