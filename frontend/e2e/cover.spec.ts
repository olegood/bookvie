// Story 1.13 Add a cover: the Cover field in the New book and Edit book panels,
// the no-cover placeholder and the "From cover" swatch, and Remove cover. What
// the server does with an upload (re-decoding, refusals, downscale, minted
// names, the AD-12 order, the startup sweep, spineColorFromCover, TR8) is
// proven at API level (backend/tests/test_cover.py); these tests read what the
// browser shows by role and exact accessible name.

import type { Locator, Page, Request } from '@playwright/test'
import { expect, type Server, test } from './fixtures.ts'

const ADD_BOOK = '/api/intents/add-book'
const EDIT_BOOK = '/api/intents/edit-book'
const DUNE_ID = '6f1c1d2e-9a4b-4c3d-8e5f-0a1b2c3d4e5f'

// A 40×60 solid red-orange PNG (rgb 200, 60, 40): a colored cover.
const COVER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAIAAACb22+3AAAAO0lEQVR42u3NMQ0AMAgAMJgaROA/yJoHHp7WQHO64sKLI2KxWCwWi8VisVgsFovFYrFYLBaLxWKxeOMD/k0BpCMi0m0AAAAASUVORK5CYII=',
  'base64',
)
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

// Dune as seeded, and as the Edit book panel prefills it.
const DUNE = {
  id: DUNE_ID,
  title: 'Dune',
  authors: ['Frank Herbert'],
  pages: 412,
  language: 'English',
  publisher: 'Chilton Books',
}
const DUNE_FORM = {
  bookId: DUNE_ID,
  title: 'Dune',
  subtitle: '',
  pages: '412',
  authors: 'Frank Herbert',
  edition: '1',
  language: 'English',
  publisher: 'Chilton Books',
  type: 'paperback',
  isbn: '',
  year: '',
  finishedOn: '',
  tags: '',
  spineColor: '',
}

function newBookPanel(page: Page): Locator {
  return page.getByRole('dialog', { name: 'New book', exact: true })
}

function editPanel(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Edit book', exact: true })
}

function coverInput(panel: Locator): Locator {
  return panel.getByLabel('Cover', { exact: true })
}

function noCover(page: Page): Locator {
  return page.getByRole('main').getByRole('img', { name: 'No cover', exact: true })
}

function coverImage(page: Page, title: string): Locator {
  return page.getByRole('main').getByRole('img', { name: `Cover of ${title}`, exact: true })
}

async function openEdit(page: Page): Promise<Locator> {
  await page.getByRole('main').getByRole('button', { name: 'Edit', exact: true }).click()
  return editPanel(page)
}

/**
 * Setup: gives the seeded Dune a cover through edit-book, as the panel would.
 * The response is not read: the cover part is what this story builds.
 */
async function attachCover(page: Page, server: Server): Promise<void> {
  await page.request.post(`${server.url}${EDIT_BOOK}`, {
    multipart: {
      intent: JSON.stringify(DUNE_FORM),
      cover: { name: 'dune.png', mimeType: 'image/png', buffer: COVER_PNG },
    },
  })
}

/** Every POST to `path` the page sends, in order. */
function requestsTo(page: Page, path: string): Request[] {
  const sent: Request[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === path) sent.push(request)
  })
  return sent
}

/** The multipart body as text, binary parts included byte for byte (latin1). */
function bodyOf(request: Request): string {
  return (request.postDataBuffer() ?? Buffer.alloc(0)).toString('latin1')
}

/** The JSON `intent` part of a multipart intent request. */
function intentOf(request: Request): Record<string, unknown> {
  const json = /name="intent"[^]*?\r\n\r\n(\{[^]*?\})\r\n--/.exec(bodyOf(request))?.[1] ?? '{}'
  return JSON.parse(json) as Record<string, unknown>
}

test.describe('Story 1.13 Add a cover (ATDD)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test.skip('[P0] AC-1 Cover (input type=file, label "Cover") is sent as the multipart file part in one add-book call', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [] })
    await page.goto(`${server.url}/`)
    await page.getByRole('main').getByRole('button', { name: 'New book', exact: true }).click()
    const panel = newBookPanel(page)

    await expect(coverInput(panel)).toHaveAttribute('type', 'file')

    const sent = requestsTo(page, ADD_BOOK)
    for (const [label, value] of Object.entries({
      Title: 'Dune',
      Pages: '412',
      'Author(s)': 'Frank Herbert',
      Language: 'English',
      Publisher: 'Chilton Books',
    })) {
      await panel.getByLabel(label, { exact: true }).fill(value)
    }
    await panel.getByRole('combobox', { name: 'Type', exact: true }).selectOption('Paperback')
    await coverInput(panel).setInputFiles({ name: 'dune.png', mimeType: 'image/png', buffer: COVER_PNG })
    const request = page.waitForRequest((r) => r.method() === 'POST' && new URL(r.url()).pathname === ADD_BOOK)
    await panel.getByRole('button', { name: 'Add book', exact: true }).click()
    const body = bodyOf(await request)

    // The file part is named "cover" and carries the chosen bytes, beside the intent part.
    expect(body).toMatch(/Content-Disposition: form-data; name="cover"; filename="dune\.png"/)
    expect(body).toContain(PNG_SIGNATURE.toString('latin1'))
    expect(intentOf(await request).title).toBe('Dune')
    await expect(panel).toBeHidden()
    expect(sent).toHaveLength(1)
  })

  test.skip('[P1] AC-9 a Book with no cover shows the no-cover placeholder at the cover size, not interactive', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE] })
    await page.goto(`${server.url}/book/${DUNE_ID}`)

    await expect(noCover(page)).toBeVisible()

    // 200×300 (DESIGN.md cover-main), not focusable, not a control.
    const box = await noCover(page).boundingBox()
    expect(box && [Math.round(box.width), Math.round(box.height)]).toEqual([200, 300])
    await expect(noCover(page)).not.toHaveAttribute('tabindex', /.*/)
    await expect(page.getByRole('main').getByRole('button', { name: 'No cover' })).toHaveCount(0)
    await expect(page.getByRole('main').getByRole('link', { name: 'No cover' })).toHaveCount(0)
    // No cover: no "From cover" swatch in the panel.
    const panel = await openEdit(page)
    await expect(panel.getByRole('button', { name: 'From cover', exact: true })).toHaveCount(0)
  })

  test.skip('[P1] AC-10 Remove cover, then Save changes, sends removeCover: true and Book detail shows the placeholder', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE] })
    await attachCover(page, server)
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const panel = await openEdit(page)
    const removeCover = panel.getByRole('button', { name: 'Remove cover', exact: true })

    await expect(removeCover).toBeVisible()

    const sent = requestsTo(page, EDIT_BOOK)
    await removeCover.click()
    await panel.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(panel).toBeHidden()
    expect(sent).toHaveLength(1)
    expect(intentOf(sent[0]!).removeCover).toBe(true)
    expect(bodyOf(sent[0]!)).not.toContain('name="cover"')
    await expect(noCover(page)).toBeVisible()
    await expect(coverImage(page, 'Dune')).toHaveCount(0)
    // Without a cover, Remove cover and From cover are gone from the panel.
    const reopened = await openEdit(page)
    await expect(reopened.getByRole('button', { name: 'Remove cover', exact: true })).toHaveCount(0)
    await expect(reopened.getByRole('button', { name: 'From cover', exact: true })).toHaveCount(0)
  })
})
