// Story 1.12 Delete a book: the Confirm dialog on Book detail, its role lines,
// Cancel and Esc, and couldn't-save inside the dialog. What delete-book does to
// the library (Readings, Card notes, pointers, nothing promoted, TR8) is proven
// at API level (backend/tests/test_delete_book.py); these tests read what the
// browser shows by role and exact accessible name.

import type { Locator, Page, Request } from '@playwright/test'
import { expect, type Server, test } from './fixtures.ts'

const DELETE_BOOK = '/api/intents/delete-book'
const COULDNT_SAVE = "Couldn't save. Your data wasn't changed."
const CONSEQUENCE = 'Its readings and card notes are deleted too.'

const DUNE_ID = '6f1c1d2e-9a4b-4c3d-8e5f-0a1b2c3d4e5f'
const NEUROMANCER_ID = '1b6e2c4a-3d5f-4e7a-9b8c-0d1e2f3a4b5c'
const DISPOSSESSED_ID = '7c2d9e1f-4a6b-4c8d-a0e1-2f3a4b5c6d7e'
const PIRANESI_ID = '9e4f0a2b-5c7d-4e9f-b1a2-3c4d5e6f7a8b'

type CatalogBody = { books: { title: string }[] }

/** The Confirm dialog: the only `alertdialog` on Book detail. */
function confirmDialog(page: Page): Locator {
  return page.getByRole('alertdialog')
}

function deleteButton(page: Page): Locator {
  return page.getByRole('main').getByRole('button', { name: 'Delete', exact: true })
}

async function openBook(page: Page, server: Server, bookId: string): Promise<void> {
  await page.goto(`${server.url}/book/${bookId}`)
}

async function catalogTitles(page: Page, server: Server): Promise<string[]> {
  const response = await page.request.get(`${server.url}/api/views/catalog`)
  return ((await response.json()) as CatalogBody).books.map((book) => book.title).sort()
}

/** Every delete-book POST the page sends, in order. */
function deleteBookRequests(page: Page): Request[] {
  const sent: Request[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === DELETE_BOOK) sent.push(request)
  })
  return sent
}

// Dune is the Main book at p.150, Neuromancer is Up next (paused at p.80), The
// Dispossessed waits for you at p.120, and Piranesi has no role.
const ROLES_LIBRARY = {
  mainBookId: DUNE_ID,
  upNextBookId: NEUROMANCER_ID,
  books: [
    {
      id: DUNE_ID,
      title: 'Dune',
      authors: ['Frank Herbert'],
      pages: 412,
      readings: [{ currentPage: 150 }],
      cardNotes: [{ text: 'Fear is the mind-killer.', pageStart: 19 }],
    },
    {
      id: NEUROMANCER_ID,
      title: 'Neuromancer',
      authors: ['William Gibson'],
      pages: 271,
      readings: [{ currentPage: 80, pausedAt: '2026-10-01' }],
    },
    {
      id: DISPOSSESSED_ID,
      title: 'The Dispossessed',
      authors: ['Ursula K. Le Guin'],
      pages: 387,
      readings: [{ currentPage: 120, pausedAt: '2026-09-15' }],
    },
    { id: PIRANESI_ID, title: 'Piranesi', authors: ['Susanna Clarke'], pages: 245 },
  ],
}

test.describe('Story 1.12 Delete a book (ATDD)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test('[P0] AC-1 Delete opens the Confirm dialog: consequence, role line, Delete book · Cancel, Cancel focused', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(ROLES_LIBRARY)
    await openBook(page, server, PIRANESI_ID)

    await deleteButton(page).click()
    const dialog = confirmDialog(page)
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAccessibleName(/^Delete Piranesi\?/)
    await expect(dialog).toHaveText(new RegExp(`Delete Piranesi\\?\\s*${CONSEQUENCE.replace(/\./g, '\\.')}`))
    // A Book with no role gets no role line.
    await expect(dialog).not.toHaveText(/It is /)
    await expect(dialog.getByRole('button')).toHaveCount(2)
    await expect(dialog.getByRole('button', { name: 'Delete book', exact: true })).toBeVisible()
    const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true })
    await expect(cancel).toBeFocused()
    await cancel.click()

    // The Book's role, when it has one, is named after the consequence.
    const roles: [string, string, string][] = [
      [DUNE_ID, 'Dune', 'It is your Main book.'],
      [NEUROMANCER_ID, 'Neuromancer', 'It is Up next.'],
      [DISPOSSESSED_ID, 'The Dispossessed', 'It is waiting for you at p.120.'],
    ]
    for (const [id, title, line] of roles) {
      await openBook(page, server, id)
      await deleteButton(page).click()
      await expect(dialog, title).toHaveAccessibleName(new RegExp(`^Delete ${title}\\?`))
      await expect(dialog, title).toContainText(CONSEQUENCE)
      await expect(dialog, title).toContainText(line)
      await expect(dialog.getByRole('button', { name: 'Cancel', exact: true }), title).toBeFocused()
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    }
  })

  test('[P1] AC-2 Cancel or Esc changes nothing and returns focus to Delete', async ({ page, seededServer }) => {
    const server = await seededServer(ROLES_LIBRARY)
    const sent = deleteBookRequests(page)
    await openBook(page, server, DUNE_ID)
    const dialog = confirmDialog(page)

    await deleteButton(page).click()
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(deleteButton(page)).toBeFocused()
    await expect(dialog).toBeHidden()

    await deleteButton(page).click()
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(deleteButton(page)).toBeFocused()

    // Nothing was sent and nothing changed: still on Dune's Book detail.
    expect(sent).toHaveLength(0)
    await expect(page.getByRole('heading', { level: 1, name: 'Dune', exact: true })).toBeVisible()
    expect(await catalogTitles(page, server)).toEqual(['Dune', 'Neuromancer', 'Piranesi', 'The Dispossessed'])
  })

  test(
    "[P1] AC-4 couldn't save keeps the Confirm dialog open with the alert line above its buttons; the Book is unchanged",
    async ({ page, seededServer }) => {
      const server = await seededServer(ROLES_LIBRARY)
      await page.route(`**${DELETE_BOOK}`, (route) =>
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: { kind: 'couldnt_save', code: 'couldnt_save', message: COULDNT_SAVE } }),
        }),
      )
      await openBook(page, server, PIRANESI_ID)
      const dialog = confirmDialog(page)
      await deleteButton(page).click()
      const confirm = dialog.getByRole('button', { name: 'Delete book', exact: true })
      const answered = page.waitForResponse((response) => new URL(response.url()).pathname === DELETE_BOOK)

      await confirm.click()
      await answered
      await expect(dialog.getByRole('alert')).toHaveText(COULDNT_SAVE)
      await expect(dialog).toBeVisible()
      // The line sits above the dialog's buttons.
      const line = await dialog.getByRole('alert').boundingBox()
      const button = await confirm.boundingBox()
      expect(line && button && line.y + line.height <= button.y).toBe(true)
      // The Book is unchanged, and the page still shows it.
      expect(await catalogTitles(page, server)).toContain('Piranesi')
      await expect(page).toHaveURL(`${server.url}/book/${PIRANESI_ID}`)
      await expect(page.getByRole('status')).toHaveText('')
    },
  )

  test('[P0] AC-3 Delete book goes to Catalog with Search titles focused; Back does not return to the deleted Book', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(ROLES_LIBRARY)
    // Catalog first, so there is a history entry behind Book detail.
    await page.goto(server.url)
    await openBook(page, server, DUNE_ID)
    await expect(page.getByRole('heading', { level: 1, name: 'Dune', exact: true })).toBeVisible()
    // Record any moment the not-found page renders between the commit and Catalog.
    const notFound: string[] = []
    await page.exposeFunction('sawNotFound', (text: string) => notFound.push(text))
    await page.evaluate(() => {
      const report = (window as unknown as { sawNotFound: (text: string) => void }).sawNotFound
      // Read the added nodes, not the live DOM: a not-found page replaced
      // within the same task would be gone by the time the callback runs.
      new MutationObserver((records) => {
        for (const record of records) {
          for (const node of Array.from(record.addedNodes)) {
            if (node instanceof HTMLElement && /Page not found/.test(node.textContent ?? '')) {
              void report(node.textContent ?? '')
            }
          }
        }
      }).observe(document.body, { subtree: true, childList: true, characterData: true })
    })

    await deleteButton(page).click()
    await confirmDialog(page).getByRole('button', { name: 'Delete book', exact: true }).click()

    await expect(page).toHaveURL(`${server.url}/`)
    await expect(page.getByRole('heading', { level: 1, name: 'Catalog', exact: true })).toBeVisible()
    await expect(page.getByLabel('Search titles', { exact: true })).toBeFocused()
    await expect(page.getByRole('status')).toHaveText('Deleted Dune.')
    await expect(page.getByRole('main').getByRole('button', { name: /^Dune by / })).toHaveCount(0)
    expect(await catalogTitles(page, server)).toEqual(['Neuromancer', 'Piranesi', 'The Dispossessed'])
    expect(notFound).toEqual([])

    // The Book detail entry was replaced: Back skips it.
    await page.goBack()
    await expect(page).toHaveURL(`${server.url}/`)
    await expect(page.getByRole('heading', { level: 1, name: 'Catalog', exact: true })).toBeVisible()
  })

  test('[P1] AC-3 Back to the Catalog entry a delete replaced does not focus Search titles or announce again', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(ROLES_LIBRARY)
    // The title links are in the List view.
    await page.addInitScript(() => window.localStorage.setItem('bookvie.catalogView', 'list'))
    // Opened directly: the delete replaces this entry with Catalog, carrying the hand-off.
    await openBook(page, server, DUNE_ID)
    await deleteButton(page).click()
    await confirmDialog(page).getByRole('button', { name: 'Delete book', exact: true }).click()
    const search = page.getByLabel('Search titles', { exact: true })
    await expect(search).toBeFocused()
    await expect(page.getByRole('status')).toHaveText('Deleted Dune.')

    // Open another Book client-side, then come back to that Catalog entry.
    await page.getByRole('table').getByRole('link', { name: 'Piranesi', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Piranesi', exact: true })).toBeVisible()
    // The status region keeps its last text across pages; empty it so only a
    // new announcement could put "Deleted Dune." back, and record every text set.
    await page.evaluate(() => {
      const status = document.querySelector('[role="status"]')!
      status.textContent = ''
      const seen: string[] = []
      ;(window as unknown as { statusSeen: string[] }).statusSeen = seen
      new MutationObserver(() => seen.push(status.textContent ?? '')).observe(status, {
        childList: true,
        characterData: true,
        subtree: true,
      })
    })
    await page.goBack()

    await expect(page.getByRole('heading', { level: 1, name: 'Catalog', exact: true })).toBeFocused()
    await expect(search).not.toBeFocused()
    // Let a re-announcement's delay (ANNOUNCE_DELAY_MS, 100 ms) pass in the page's own timers.
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 300)))
    const seen = await page.evaluate(() => (window as unknown as { statusSeen: string[] }).statusSeen)
    expect(seen).not.toContain('Deleted Dune.')
    await expect(page.getByRole('status')).not.toHaveText('Deleted Dune.')
  })

  test('[P1] AC-3 deleting the last Book leaves the empty shelf with New book focused', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [{ id: PIRANESI_ID, title: 'Piranesi', authors: ['Susanna Clarke'] }] })
    await openBook(page, server, PIRANESI_ID)

    await deleteButton(page).click()
    await confirmDialog(page).getByRole('button', { name: 'Delete book', exact: true }).click()

    await expect(page).toHaveURL(`${server.url}/`)
    await expect(page.getByText('Your shelf is empty. Add your first book.')).toBeVisible()
    await expect(page.getByRole('main').getByRole('button', { name: 'New book', exact: true })).toBeFocused()
    await expect(page.getByRole('status')).toHaveText('Deleted Piranesi.')
    expect(await catalogTitles(page, server)).toEqual([])
  })

  test('[P1] AC-4 Delete book and Cancel are aria-disabled in flight, Esc is ignored, and a retry succeeds', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(ROLES_LIBRARY)
    let release!: () => void
    const held = new Promise<void>((resolve) => (release = resolve))
    let calls = 0
    await page.route(`**${DELETE_BOOK}`, async (route) => {
      calls += 1
      if (calls > 1) return route.continue()
      await held
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: { kind: 'couldnt_save', code: 'couldnt_save', message: COULDNT_SAVE } }),
      })
    })
    await openBook(page, server, PIRANESI_ID)
    const dialog = confirmDialog(page)
    await deleteButton(page).click()
    const confirm = dialog.getByRole('button', { name: 'Delete book', exact: true })
    const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true })
    const sent = page.waitForRequest((request) => new URL(request.url()).pathname === DELETE_BOOK)

    await confirm.click()
    await sent
    await expect(confirm).toHaveAttribute('aria-disabled', 'true')
    await expect(cancel).toHaveAttribute('aria-disabled', 'true')
    // Neither Cancel nor Esc closes the dialog while the request is in flight.
    await cancel.click({ force: true })
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
    // A native close that skips `cancel` is undone, and Cancel keeps focus.
    await page.evaluate(() => document.querySelector('dialog')?.close())
    await expect(dialog).toBeVisible()
    expect(await page.evaluate(() => document.querySelector('dialog')?.open)).toBe(true)
    await expect(cancel).toBeFocused()
    release()

    await expect(dialog.getByRole('alert')).toHaveText(COULDNT_SAVE)
    await expect(dialog).toBeVisible()
    await expect(confirm).not.toHaveAttribute('aria-disabled', 'true')
    await expect(cancel).not.toHaveAttribute('aria-disabled', 'true')

    // A second press that succeeds goes to Catalog.
    await confirm.click()
    await expect(page).toHaveURL(`${server.url}/`)
    await expect(page.getByLabel('Search titles', { exact: true })).toBeFocused()
    expect(await catalogTitles(page, server)).toEqual(['Dune', 'Neuromancer', 'The Dispossessed'])
  })

  test('[P1] AC-3 a Book already gone answers book_not_found; the views refetch and Book detail shows not-found', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(ROLES_LIBRARY)
    await openBook(page, server, PIRANESI_ID)
    await deleteButton(page).click()
    await expect(confirmDialog(page)).toBeVisible()
    // Another tab deletes it first.
    const first = await page.request.post(`${server.url}${DELETE_BOOK}`, {
      multipart: { intent: JSON.stringify({ bookId: PIRANESI_ID }) },
    })
    expect(first.status()).toBe(200)

    const refused = page.waitForResponse((response) => new URL(response.url()).pathname === DELETE_BOOK)
    await confirmDialog(page).getByRole('button', { name: 'Delete book', exact: true }).click()
    expect((await refused).status()).toBe(409)

    await expect(page).toHaveURL(`${server.url}/book/${PIRANESI_ID}`)
    await expect(page.getByRole('main').getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
    await expect(confirmDialog(page)).toHaveCount(0)
    expect(await catalogTitles(page, server)).toEqual(['Dune', 'Neuromancer', 'The Dispossessed'])
  })

  test('[P2] AC-1 Up next with a paused Reading says only "It is Up next."; Tab stays inside the dialog', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(ROLES_LIBRARY)
    await openBook(page, server, NEUROMANCER_ID)
    await deleteButton(page).click()
    const dialog = confirmDialog(page)
    await expect(dialog).toContainText('It is Up next.')
    await expect(dialog).not.toContainText('waiting')
    const confirm = dialog.getByRole('button', { name: 'Delete book', exact: true })
    const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true })
    await expect(cancel).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(confirm).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(cancel).toBeFocused()
  })
})

