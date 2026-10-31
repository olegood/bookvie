// Story 1.11 Book detail and the Edit book panel: opening a Book from the List
// view, editing it, the Duplicate dialog in edit mode, and field refusals in
// the panel. The edit-book rules themselves (validation, Pages floors,
// Finished on, spine color, TR8) are proven at API level
// (backend/tests/test_edit_book.py); these tests read what the browser shows by
// role and exact accessible name.

import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page, Request } from '@playwright/test'
import { spine, viewToggle } from './bookcase.ts'
import { expect, type Server, test } from './fixtures.ts'

const EDIT_BOOK = '/api/intents/edit-book'
// DESIGN.md surface, light theme.
const SURFACE = 'rgb(255, 255, 255)'
const DUNE_ISBN13 = '9780441172719'
const DUNE_ID = '6f1c1d2e-9a4b-4c3d-8e5f-0a1b2c3d4e5f'
const COULDNT_SAVE = "Couldn't save. Your data wasn't changed."
const COULDNT_LOAD = "Couldn't load. Is bookvie still running?"
// DESIGN.md ink, light theme.
const INK = 'rgb(43, 46, 42)'
// DESIGN.md → Spine colors: the Clay swatch, as typed and as computed.
const CLAY = { hex: '#9B6753', rgb: 'rgb(155, 103, 83)' }
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

type CatalogBody = { books: { title: string }[] }

function editPanel(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Edit book', exact: true })
}

function duplicateDialog(page: Page): Locator {
  return page.getByRole('alertdialog', { name: 'Possible duplicate', exact: true })
}

function titleLink(page: Page, title: string): Locator {
  return page.getByRole('table').getByRole('link', { name: title, exact: true })
}

/** Catalog in List view, then the Book's title link: its Book detail. */
async function openBook(page: Page, server: Server, title: string): Promise<void> {
  await page.goto(`${server.url}/`)
  await titleLink(page, title).click()
}

async function openEdit(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  return editPanel(page)
}

async function catalogTitles(page: Page, server: Server): Promise<string[]> {
  const response = await page.request.get(`${server.url}/api/views/catalog`)
  return ((await response.json()) as CatalogBody).books.map((book) => book.title).sort()
}

/** Waits until `element` and its subtree finish their open animations, so axe sees final colors. */
async function settled(element: Locator): Promise<void> {
  await element.evaluate((node) => Promise.all(node.getAnimations({ subtree: true }).map((a) => a.finished)))
}

/** Every edit-book POST the page sends, in order. */
function editBookRequests(page: Page): Request[] {
  const sent: Request[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === EDIT_BOOK) sent.push(request)
  })
  return sent
}

/** The JSON `intent` part of a multipart edit-book request. */
function intentOf(request: Request): Record<string, unknown> {
  const json = /\{[\s\S]*\}/.exec(request.postData() ?? '')?.[0] ?? '{}'
  return JSON.parse(json) as Record<string, unknown>
}

test.describe('Story 1.11 Book detail and Edit book (ATDD)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    // The title links are in the List view; Bookcase is the default.
    await page.addInitScript(() => window.localStorage.setItem('bookvie.catalogView', 'list'))
  })

  test('[P0] AC-1 a List view title opens Book detail: serif h1, metadata grid, chips, Readings', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [
        {
          title: 'Dune',
          subtitle: 'A Novel',
          authors: ['Frank Herbert'],
          pages: 412,
          language: 'English',
          publisher: 'Chilton Books',
          type: 'hardcover',
          isbn: DUNE_ISBN13,
          year: 1965,
          tags: ['sci-fi', 'classics'],
          // Back-filled with Finished on: no start date.
          readings: [{ startDate: null, currentPage: 412, finishDate: '2019-08-14', finishedPages: 412 }],
        },
        { title: 'Neuromancer', authors: ['William Gibson'], pages: 271, edition: 3 },
      ],
    })
    await page.goto(`${server.url}/`)

    // The title in the List view is a link now.
    await expect(titleLink(page, 'Dune')).toBeVisible()

    await titleLink(page, 'Dune').click()
    const heading = page.getByRole('heading', { level: 1, name: 'Dune', exact: true })
    await expect(heading).toBeVisible()
    await expect(heading).toBeFocused()
    await expect(page).toHaveTitle('Dune — bookvie')
    await expect(heading).toHaveCSS('font-family', /ui-serif/)
    // A surface card holds the page.
    const onSurface = await heading.evaluate((element, surface) => {
      for (let node = element.parentElement; node && node.tagName !== 'MAIN'; node = node.parentElement) {
        if (getComputedStyle(node).backgroundColor === surface) return true
      }
      return false
    }, SURFACE)
    expect(onSurface).toBe(true)

    const main = page.getByRole('main')
    await expect(main.getByText('A Novel', { exact: true })).toBeVisible()
    await expect(main.getByText('Frank Herbert', { exact: true })).toBeVisible()
    // The metadata grid, in DESIGN.md order; Edition is left out when it is 1.
    await expect(main.getByRole('term')).toHaveText(['Pages', 'Language', 'Publisher', 'Type', 'ISBN', 'Year'])
    await expect(main.getByRole('definition')).toHaveText([
      '412',
      'English',
      'Chilton Books',
      'Hardcover',
      DUNE_ISBN13,
      '1965',
    ])
    // Tags are plain chips: shown, not interactive.
    for (const tag of ['sci-fi', 'classics']) {
      await expect(main.getByText(tag, { exact: true })).toBeVisible()
      await expect(main.getByRole('button', { name: tag })).toHaveCount(0)
      await expect(main.getByRole('link', { name: tag })).toHaveCount(0)
    }
    // The back-filled Reading: a finish date and no start.
    const readings = page.getByRole('region', { name: 'Readings', exact: true })
    await expect(readings.getByText('Finished 14 Aug 2019', { exact: true })).toBeVisible()
    await expect(readings.getByText(/start/i)).toHaveCount(0)

    // Edition shows when it isn't 1.
    await page.goBack()
    await titleLink(page, 'Neuromancer').click()
    await expect(page.getByRole('heading', { level: 1, name: 'Neuromancer', exact: true })).toBeVisible()
    await expect(page).toHaveTitle('Neuromancer — bookvie')
    await expect(main.getByRole('term')).toContainText(['Pages', 'Edition'])
    await expect(main.getByRole('definition').nth(1)).toHaveText('3')
  })

  test('[P0] AC-2 Edit opens the prefilled "Edit book" panel; Save changes announces "Saved Title." and refocuses Edit', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [
        {
          title: 'Dune',
          subtitle: 'A Novel',
          authors: ['Frank Herbert', 'Brian Herbert'],
          pages: 412,
          language: 'English',
          publisher: 'Chilton Books',
          type: 'hardcover',
          isbn: DUNE_ISBN13,
          year: 1965,
          tags: ['sci-fi', 'classics'],
          readings: [
            { startDate: null, currentPage: 412, finishDate: '2019-08-14', finishedPages: 412 },
            { startDate: '2024-01-02', currentPage: 412, finishDate: '2024-02-10', finishedPages: 412 },
          ],
        },
      ],
    })
    await openBook(page, server, 'Dune')
    const edit = page.getByRole('button', { name: 'Edit', exact: true })

    await edit.click()
    const panel = editPanel(page)
    await expect(panel).toBeVisible()

    // Prefilled with the Book as stored; Finished on shows the latest finish.
    await expect(panel.getByLabel('Title', { exact: true })).toBeFocused()
    await expect(panel.getByLabel('Title', { exact: true })).toHaveValue('Dune')
    await expect(panel.getByLabel('Subtitle', { exact: true })).toHaveValue('A Novel')
    await expect(panel.getByLabel('Pages', { exact: true })).toHaveValue('412')
    await expect(panel.getByLabel('Author(s)', { exact: true })).toHaveValue('Frank Herbert; Brian Herbert')
    await expect(panel.getByLabel('Edition', { exact: true })).toHaveValue('1')
    await expect(panel.getByLabel('Language', { exact: true })).toHaveValue('English')
    await expect(panel.getByLabel('Publisher', { exact: true })).toHaveValue('Chilton Books')
    await expect(panel.getByRole('combobox', { name: 'Type', exact: true })).toHaveValue('hardcover')
    await expect(panel.getByLabel('ISBN', { exact: true })).toHaveValue(DUNE_ISBN13)
    await expect(panel.getByLabel('Year', { exact: true })).toHaveValue('1965')
    await expect(panel.getByLabel('Finished on', { exact: true })).toHaveValue('2024-02-10')
    await expect(panel.getByLabel('Tags', { exact: true })).toHaveValue('sci-fi, classics')
    await expect(panel.getByLabel('Spine color', { exact: true })).toHaveValue('')
    // Save changes is the submit; there is no Add book here.
    const save = panel.getByRole('button', { name: 'Save changes', exact: true })
    await expect(save).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Add book', exact: true })).toHaveCount(0)

    await panel.getByLabel('Subtitle', { exact: true }).fill('Deluxe Edition')
    await save.click()
    await expect(page.getByRole('status')).toHaveText('Saved Dune.')
    await expect(panel).toBeHidden()
    await expect(edit).toBeFocused()
    await expect(page.getByRole('main').getByText('Deluxe Edition', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Dune', exact: true })).toBeVisible()
  })

  test("[P0] AC-4 a duplicate_book refusal on Save changes opens Possible duplicate with Don't save and Save anyway", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [
        { title: 'Dune', authors: ['Frank Herbert'], pages: 412 },
        { title: 'Dune Messiah', authors: ['Frank Herbert'], pages: 256 },
      ],
    })
    await openBook(page, server, 'Dune Messiah')
    const panel = await openEdit(page)
    const title = panel.getByLabel('Title', { exact: true })
    const save = panel.getByRole('button', { name: 'Save changes', exact: true })
    await title.fill('Dune')

    await save.click()
    const dialog = duplicateDialog(page)
    await expect(dialog).toBeVisible()

    await expect(dialog.getByRole('button')).toHaveText(["Don't save", 'Save anyway'])
    await expect(dialog.getByRole('button', { name: "Don't save", exact: true })).toBeFocused()

    // Don't save: nothing saved, the panel unchanged, focus on Save changes.
    await dialog.getByRole('button', { name: "Don't save", exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(panel).toBeVisible()
    await expect(title).toHaveValue('Dune')
    await expect(save).toBeFocused()
    expect(await catalogTitles(page, server)).toEqual(['Dune', 'Dune Messiah'])

    // Save anyway: resent with confirmDuplicate, then a normal save.
    const sent = editBookRequests(page)
    await save.click()
    await dialog.getByRole('button', { name: 'Save anyway', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText('Saved Dune.')
    await expect(panel).toBeHidden()
    await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeFocused()
    expect(sent.map((request) => intentOf(request).confirmDuplicate)).toEqual([undefined, true])
    expect(await catalogTitles(page, server)).toEqual(['Dune', 'Dune'])
  })

  test('[P1] AC-5 a refusal with fields marks each field, fills the alert and focuses the first invalid field', async ({
    page,
    seededServer,
  }) => {
    // Dune is the Main book, read to page 300.
    const server = await seededServer({
      mainBookId: DUNE_ID,
      books: [
        {
          id: DUNE_ID,
          title: 'Dune',
          authors: ['Frank Herbert'],
          pages: 412,
          readings: [{ startDate: '2026-09-01', currentPage: 300 }],
        },
      ],
    })
    await openBook(page, server, 'Dune')
    const panel = await openEdit(page)
    const pages = panel.getByRole('spinbutton', { name: 'Pages', exact: true })
    const save = panel.getByRole('button', { name: 'Save changes', exact: true })
    await pages.fill('250')
    const refusal = page.waitForResponse((response) => new URL(response.url()).pathname === EDIT_BOOK)

    // A 409 pages_below_current_page carries fields, shown like a 422.
    await save.click()
    await expect(pages).toHaveAttribute('aria-invalid', 'true')

    await expect(pages).toHaveAccessibleDescription("Pages can't be less than 300, the page you're on.")
    await expect(pages).toBeFocused()
    const body = (await (await refusal).json()) as { error: { code: string; message: string } }
    expect(body.error.code).toBe('pages_below_current_page')
    await expect(page.getByRole('alert')).toHaveText(body.error.message)
    await expect(panel).toBeVisible()

    // A 422 the same way, and the earlier field error is gone.
    await pages.fill('412')
    await panel.getByLabel('Title', { exact: true }).fill('')
    await save.click()
    const title = panel.getByLabel('Title', { exact: true })
    await expect(title).toHaveAttribute('aria-invalid', 'true')
    await expect(title).toHaveAccessibleDescription('Title is required.')
    await expect(page.getByRole('alert')).toHaveText('Not saved. 1 field needs attention: Title.')
    await expect(title).toBeFocused()
    await expect(pages).not.toHaveAttribute('aria-invalid', 'true')
  })

  test('[P0] an unknown Book id shows the not-found page', async ({ page, seededServer }) => {
    const server = await seededServer({ books: [{ title: 'Dune', authors: ['Frank Herbert'], pages: 412 }] })

    await page.goto(`${server.url}/book/00000000-0000-4000-8000-000000000000`)

    await expect(page.getByRole('heading', { level: 1, name: 'Page not found', exact: true })).toBeVisible()
    await expect(page).toHaveTitle('Page not found — bookvie')
  })

  test('[P1] AC-1 a Book with no subtitle, ISBN or Year leaves those rows out; Readings list newest first', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [
        {
          id: DUNE_ID,
          title: 'Dune',
          authors: ['Frank Herbert', 'Brian Herbert'],
          pages: 1412,
          readings: [
            { startDate: null, currentPage: 412, finishDate: '2019-08-14', finishedPages: 412 },
            { startDate: '2024-01-02', currentPage: 412, finishDate: '2024-02-10', finishedPages: 412 },
            { startDate: '2026-09-02', currentPage: 30 },
          ],
        },
        { title: 'Neuromancer', authors: ['William Gibson'], pages: 271 },
      ],
    })
    await page.goto(`${server.url}/book/${DUNE_ID}`)

    const main = page.getByRole('main')
    await expect(page.getByRole('heading', { level: 1, name: 'Dune', exact: true })).toBeVisible()
    await expect(main.getByText('Frank Herbert; Brian Herbert', { exact: true })).toBeVisible()
    await expect(main.getByRole('term')).toHaveText(['Pages', 'Language', 'Publisher', 'Type'])
    await expect(main.getByRole('definition').first()).toHaveText('1,412')
    await expect(main.getByRole('list', { name: 'Tags' })).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Readings', exact: true }).getByRole('listitem')).toHaveText([
      'Started 2 Sep 2026',
      'Started 2 Jan 2024 · Finished 10 Feb 2024',
      'Finished 14 Aug 2019',
    ])

    // Never read: "Not read yet."
    await page.goto(`${server.url}/`)
    await titleLink(page, 'Neuromancer').click()
    await expect(page.getByRole('region', { name: 'Readings', exact: true })).toHaveText(/Not read yet\./)
  })

  test("[P1] AC-12 couldn't save keeps the Edit book panel open with every value; Save changes is aria-disabled in flight", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [{ title: 'Dune', authors: ['Frank Herbert'], pages: 412 }] })
    let release!: () => void
    const held = new Promise<void>((resolve) => (release = resolve))
    await page.route(`**${EDIT_BOOK}`, async (route) => {
      await held
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: { kind: 'couldnt_save', code: 'couldnt_save', message: COULDNT_SAVE } }),
      })
    })
    await openBook(page, server, 'Dune')
    const panel = await openEdit(page)
    const save = panel.getByRole('button', { name: 'Save changes', exact: true })
    await panel.getByLabel('Subtitle', { exact: true }).fill('Book One')
    await panel.getByLabel('Pages', { exact: true }).fill('500')
    const sent = page.waitForRequest((request) => new URL(request.url()).pathname === EDIT_BOOK)

    await save.click()
    await sent
    await expect(save).toHaveAttribute('aria-disabled', 'true')
    release()

    await expect(page.getByRole('alert')).toHaveText(COULDNT_SAVE)
    await expect(panel).toBeVisible()
    const line = panel.getByText(COULDNT_SAVE, { exact: true })
    await expect(line).toHaveCSS('color', INK)
    await expect(line).toHaveCSS('position', 'static')
    await expect(save).not.toHaveAttribute('aria-disabled', 'true')
    await expect(panel.getByLabel('Title', { exact: true })).toHaveValue('Dune')
    await expect(panel.getByLabel('Subtitle', { exact: true })).toHaveValue('Book One')
    await expect(panel.getByLabel('Pages', { exact: true })).toHaveValue('500')
    await expect(page.getByRole('status')).toHaveText('')
  })

  test('[P1] AC-2 Cancel, Close and Esc discard edits and return focus to Edit', async ({ page, seededServer }) => {
    const server = await seededServer({ books: [{ title: 'Dune', authors: ['Frank Herbert'], pages: 412 }] })
    await openBook(page, server, 'Dune')
    const edit = page.getByRole('button', { name: 'Edit', exact: true })
    const closers: [string, (panel: Locator) => Promise<void>][] = [
      ['Cancel', (panel) => panel.getByRole('button', { name: 'Cancel', exact: true }).click()],
      ['Close', (panel) => panel.getByRole('button', { name: 'Close', exact: true }).click()],
      ['Esc', (panel) => panel.getByLabel('Title', { exact: true }).press('Escape')],
    ]

    for (const [how, close] of closers) {
      const panel = await openEdit(page)
      // The previous round's edit was discarded.
      await expect(panel.getByLabel('Title', { exact: true }), how).toHaveValue('Dune')
      await panel.getByLabel('Title', { exact: true }).fill('Dune Messiah')

      await close(panel)
      await expect(panel, how).toBeHidden()
      await expect(edit, how).toBeFocused()
    }
    await expect(page.getByRole('heading', { level: 1, name: 'Dune', exact: true })).toBeVisible()
  })

  test("[P1] a failed first load of Book detail shows Couldn't load with Try again, which refetches", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [{ id: DUNE_ID, title: 'Dune', authors: ['Frank Herbert'], pages: 412 }],
    })
    let down = true
    await page.route('**/api/views/book**', async (route) => {
      if (!down) return route.continue()
      down = false
      // Any non-404 failure is a load failure; the body is never read.
      await route.fulfill({ status: 503, contentType: 'text/plain', body: 'Service Unavailable' })
    })

    await page.goto(`${server.url}/book/${DUNE_ID}`)
    await expect(page.getByRole('alert')).toHaveText(COULDNT_LOAD)
    await expect(page.getByRole('main').getByText(COULDNT_LOAD, { exact: true })).toBeVisible()
    await expect(page).toHaveTitle('Book — bookvie')

    await page.getByRole('button', { name: 'Try again', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Dune', exact: true })).toBeVisible()
    await expect(page).toHaveTitle('Dune — bookvie')
    await expect(page.getByText(COULDNT_LOAD)).toHaveCount(0)
  })

  test('[P1] CAT-E2E-007 a back-fill and a swatch saved through Edit show on the bookcase spine and in the meter', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [
        { id: DUNE_ID, title: 'Dune', authors: ['Frank Herbert'], pages: 412 },
        { title: 'Neuromancer', authors: ['William Gibson'], pages: 271 },
      ],
    })
    await openBook(page, server, 'Dune')
    await expect(page.getByRole('region', { name: 'Readings', exact: true })).toHaveText(/Not read yet\./)
    const panel = await openEdit(page)
    const clay = panel.getByRole('button', { name: 'Clay', exact: true })

    await clay.click()
    await expect(panel.getByLabel('Spine color', { exact: true })).toHaveValue(new RegExp(`^${CLAY.hex}$`, 'i'))
    await expect(clay).toHaveAttribute('aria-pressed', 'true')
    await panel.getByLabel('Finished on', { exact: true }).fill('2026-03-20')
    await panel.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText('Saved Dune.')
    await expect(panel).toBeHidden()
    await expect(page.getByRole('region', { name: 'Readings', exact: true }).getByRole('listitem')).toHaveText([
      'Finished 20 Mar 2026',
    ])

    // Reopened: prefilled with what was saved, and the live regions start empty.
    await openEdit(page)
    await expect(page.getByRole('status')).toHaveText('')
    await expect(page.getByRole('alert')).toHaveText('')
    await expect(panel.getByLabel('Finished on', { exact: true })).toHaveValue('2026-03-20')
    await expect(panel.getByLabel('Spine color', { exact: true })).toHaveValue(new RegExp(`^${CLAY.hex}$`, 'i'))
    await expect(clay).toHaveAttribute('aria-pressed', 'true')
    await panel.getByRole('button', { name: 'Cancel', exact: true }).click()

    // The Bookcase view: the spine reads as finished, in Clay, and the meter counts it.
    await page.goto(`${server.url}/`)
    await viewToggle(page).getByRole('button', { name: 'Bookcase', exact: true }).click()
    const dune = spine(page, 'Dune by Frank Herbert, finished')
    await expect(dune).toBeVisible()
    await expect(dune).toHaveCSS('background-color', CLAY.rgb)
    const meter = page.getByRole('main').getByRole('progressbar')
    await expect(meter).toHaveAttribute('aria-valuetext', '1 of 2 finished')
    await expect(meter).toHaveAttribute('aria-valuenow', '1')
  })

  test('[P2] AC-2 Tags suggests existing tags in edit mode and the picked tag is saved', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [
        { title: 'Dune', authors: ['Frank Herbert'], pages: 412, tags: ['sci-fi'] },
        { title: 'Cosmos', authors: ['Carl Sagan'], pages: 365, tags: ['science', 'classics'] },
      ],
    })
    await openBook(page, server, 'Dune')
    const panel = await openEdit(page)
    const tags = panel.getByRole('combobox', { name: 'Tags', exact: true })
    await expect(tags).toHaveValue('sci-fi')

    await tags.press('End')
    await tags.pressSequentially(', cl')
    const suggestions = panel.getByRole('listbox')
    await expect(suggestions.getByRole('option')).toHaveText(['classics'])
    await expect(tags).toHaveAttribute('aria-expanded', 'true')

    await tags.press('ArrowDown')
    await tags.press('Enter')
    await expect(tags).toHaveValue(/^sci-fi, classics(, )?$/)
    await expect(panel).toBeVisible()
    await panel.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText('Saved Dune.')
    const main = page.getByRole('main')
    for (const tag of ['sci-fi', 'classics']) {
      await expect(main.getByText(tag, { exact: true }), tag).toBeVisible()
    }
  })

  test("[P2] AC-4 Esc on Possible duplicate acts as Don't save; Tab and Shift+Tab cycle its two buttons", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [
        { title: 'Dune', authors: ['Frank Herbert'], pages: 412 },
        { title: 'Dune Messiah', authors: ['Frank Herbert'], pages: 256 },
      ],
    })
    await openBook(page, server, 'Dune Messiah')
    const panel = await openEdit(page)
    const save = panel.getByRole('button', { name: 'Save changes', exact: true })
    await panel.getByLabel('Title', { exact: true }).fill('Dune')
    await save.click()
    const dialog = duplicateDialog(page)
    const dontSave = dialog.getByRole('button', { name: "Don't save", exact: true })
    const saveAnyway = dialog.getByRole('button', { name: 'Save anyway', exact: true })
    await expect(dontSave).toBeFocused()

    for (const [key, focused] of [
      ['Tab', saveAnyway],
      ['Tab', dontSave],
      ['Shift+Tab', saveAnyway],
      ['Shift+Tab', dontSave],
    ] as const) {
      await page.keyboard.press(key)
      await expect(focused, key).toBeFocused()
    }

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(panel).toBeVisible()
    await expect(panel.getByLabel('Title', { exact: true })).toHaveValue('Dune')
    await expect(save).toBeFocused()
    expect(await catalogTitles(page, server)).toEqual(['Dune', 'Dune Messiah'])
  })

  test('[P2] AC-1 AC-4 Book detail, the Edit book panel and the edit-mode duplicate dialog pass axe in both themes', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [
        {
          title: 'Dune',
          subtitle: 'A Novel',
          authors: ['Frank Herbert'],
          pages: 412,
          isbn: DUNE_ISBN13,
          year: 1965,
          tags: ['sci-fi', 'classics'],
          readings: [
            { startDate: '2024-01-02', currentPage: 412, finishDate: '2024-02-10', finishedPages: 412 },
            { startDate: '2026-09-02', currentPage: 30 },
          ],
        },
        { title: 'Dune Messiah', authors: ['Frank Herbert'], pages: 256 },
      ],
    })
    const axe = async (where: string): Promise<string[]> => {
      const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
      return violations.map(({ id, nodes }) => `${where}: ${id} (${nodes.length})`)
    }

    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await openBook(page, server, 'Dune')
      await expect(page.getByRole('heading', { level: 1, name: 'Dune', exact: true })).toBeFocused()
      expect(await axe(`${colorScheme} detail`)).toEqual([])

      const panel = await openEdit(page)
      await expect(panel.getByLabel('Title', { exact: true })).toBeFocused()
      await settled(panel)
      expect(await axe(`${colorScheme} panel`)).toEqual([])

      // Retitled onto Dune Messiah: the duplicate dialog over the panel.
      await panel.getByLabel('Title', { exact: true }).fill('Dune Messiah')
      await panel.getByLabel('ISBN', { exact: true }).fill('')
      await panel.getByRole('button', { name: 'Save changes', exact: true }).click()
      await expect(duplicateDialog(page)).toBeVisible()
      await settled(duplicateDialog(page))
      expect(await axe(`${colorScheme} dialog`)).toEqual([])
    }
  })
})
