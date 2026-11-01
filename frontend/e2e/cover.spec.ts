// Story 1.13 Add a cover: the Cover field in the New book and Edit book panels,
// the no-cover placeholder and the "From cover" swatch, and Remove cover. What
// the server does with an upload (re-decoding, refusals, downscale, minted
// names, the AD-12 order, the startup sweep, spineColorFromCover, TR8) is
// proven at API level (backend/tests/test_cover.py); these tests read what the
// browser shows by role and exact accessible name.

import AxeBuilder from '@axe-core/playwright'
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
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

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

  test('[P0] AC-1 Cover (input type=file, label "Cover") is sent as the multipart file part in one add-book call', async ({
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

  test('[P1] AC-9 a Book with no cover shows the no-cover placeholder at the cover size, not interactive', async ({
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

  test('[P1] AC-10 Remove cover, then Save changes, sends removeCover: true and Book detail shows the placeholder', async ({
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

  test('[P2] AC-10 Remove cover after choosing a file drops the file and still removes the cover', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE] })
    await attachCover(page, server)
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const panel = await openEdit(page)
    const sent = requestsTo(page, EDIT_BOOK)

    await coverInput(panel).setInputFiles({ name: 'dune.png', mimeType: 'image/png', buffer: COVER_PNG })
    await panel.getByRole('button', { name: 'Remove cover', exact: true }).click()
    expect(await coverInput(panel).evaluate((input) => (input as HTMLInputElement).files?.length ?? 0)).toBe(0)
    await panel.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(panel).toBeHidden()

    expect(sent).toHaveLength(1)
    expect(intentOf(sent[0]!).removeCover).toBe(true)
    expect(bodyOf(sent[0]!)).not.toContain('name="cover"')
    await expect(noCover(page)).toBeVisible()
    await expect(coverImage(page, 'Dune')).toHaveCount(0)
  })

  test('[P1] AC-1 in the Edit book panel a chosen file is sent in the one edit-book call and Book detail shows it', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE] })
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    let panel = await openEdit(page)
    const sent = requestsTo(page, EDIT_BOOK)

    await coverInput(panel).setInputFiles({ name: 'dune.png', mimeType: 'image/png', buffer: COVER_PNG })
    await panel.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(panel).toBeHidden()

    expect(sent).toHaveLength(1)
    expect(bodyOf(sent[0]!)).toMatch(/Content-Disposition: form-data; name="cover"; filename="dune\.png"/)
    expect(intentOf(sent[0]!)).not.toHaveProperty('removeCover')
    await expect(coverImage(page, 'Dune')).toBeVisible()
    await expect(coverImage(page, 'Dune')).toHaveAttribute('src', /^\/media\/covers\/[^/]+\.jpg$/)
    await expect(noCover(page)).toHaveCount(0)
    const box = await coverImage(page, 'Dune').boundingBox()
    expect(box && [Math.round(box.width), Math.round(box.height)]).toEqual([200, 300])
    expect(await coverImage(page, 'Dune').evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)

    // Without a chosen file, no cover part is sent.
    panel = await openEdit(page)
    await panel.getByLabel('Subtitle', { exact: true }).fill('A Novel')
    await panel.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(panel).toBeHidden()
    expect(sent).toHaveLength(2)
    expect(bodyOf(sent[1]!)).not.toContain('name="cover"')
    await expect(coverImage(page, 'Dune')).toBeVisible()
  })

  test('[P1] AC-2 a cover refusal shows on Cover like any other field error, in form order', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [] })
    await page.goto(`${server.url}/`)
    await page.getByRole('main').getByRole('button', { name: 'New book', exact: true }).click()
    const panel = newBookPanel(page)
    for (const [label, value] of Object.entries({
      Title: 'Dune',
      Pages: '412',
      'Author(s)': 'Frank Herbert',
      Language: 'English',
      Publisher: 'Chilton Books',
      'Spine color': 'red',
    })) {
      await panel.getByLabel(label, { exact: true }).fill(value)
    }
    await panel.getByRole('combobox', { name: 'Type', exact: true }).selectOption('Paperback')
    await coverInput(panel).setInputFiles({
      name: 'cover.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('not an image at all\n'),
    })

    await panel.getByRole('button', { name: 'Add book', exact: true }).click()

    await expect(page.getByRole('alert')).toHaveText('Not saved. 2 fields need attention: Cover, Spine color.')
    await expect(coverInput(panel)).toHaveAttribute('aria-invalid', 'true')
    await expect(coverInput(panel)).toHaveAccessibleDescription('Cover must be an image file.')
    // Cover comes before Spine color, so it takes the focus.
    await expect(coverInput(panel)).toBeFocused()
    await expect(panel.getByLabel('Spine color', { exact: true })).toHaveAttribute('aria-invalid', 'true')
    await expect(panel).toBeVisible()
  })

  test('[P1] AC-9 with a cover, Book detail shows it, and From cover and Remove cover act in the panel', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE] })
    await attachCover(page, server)
    await page.goto(`${server.url}/book/${DUNE_ID}`)

    await expect(coverImage(page, 'Dune')).toBeVisible()
    await expect(noCover(page)).toHaveCount(0)

    const panel = await openEdit(page)
    const spineColor = panel.getByLabel('Spine color', { exact: true })
    const fromCover = panel.getByRole('button', { name: 'From cover', exact: true })
    // Spine color is empty: automatic, so From cover is pressed.
    await expect(fromCover).toHaveAttribute('aria-pressed', 'true')
    await spineColor.fill('#123456')
    await expect(fromCover).toHaveAttribute('aria-pressed', 'false')
    await fromCover.click()
    await expect(spineColor).toHaveValue('')
    await expect(fromCover).toHaveAttribute('aria-pressed', 'true')
    // From cover comes before the eight swatches.
    expect(await fromCover.evaluate((chip) => chip.nextElementSibling?.getAttribute('aria-label'))).toBe('Sage')

    // Remove cover: the button and From cover go, a line under Cover says so, focus moves to Cover.
    await panel.getByRole('button', { name: 'Remove cover', exact: true }).click()
    await expect(coverInput(panel)).toBeFocused()
    await expect(coverInput(panel)).toHaveAccessibleDescription('The cover will be removed when you save.')
    await expect(panel.getByRole('button', { name: 'Remove cover', exact: true })).toHaveCount(0)
    await expect(fromCover).toHaveCount(0)

    // Choosing a file cancels the removal: a new cover replaces the old one.
    const sent = requestsTo(page, EDIT_BOOK)
    await coverInput(panel).setInputFiles({ name: 'dune.png', mimeType: 'image/png', buffer: COVER_PNG })
    await expect(coverInput(panel)).not.toHaveAccessibleDescription('The cover will be removed when you save.')
    await expect(panel.getByRole('button', { name: 'Remove cover', exact: true })).toBeVisible()
    await panel.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(panel).toBeHidden()
    expect(sent).toHaveLength(1)
    expect(intentOf(sent[0]!)).not.toHaveProperty('removeCover')
    expect(bodyOf(sent[0]!)).toContain('name="cover"')
    await expect(coverImage(page, 'Dune')).toBeVisible()
  })

  test('[P2] AC-9 Book detail and the Edit book panel pass axe in both themes, with and without a cover', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE] })
    const axe = async (where: string): Promise<string[]> => {
      const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
      return violations.map(({ id, nodes }) => `${where}: ${id} (${nodes.length})`)
    }

    for (const covered of [false, true]) {
      if (covered) await attachCover(page, server)
      for (const colorScheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme })
        await page.goto(`${server.url}/book/${DUNE_ID}`)
        await expect(covered ? coverImage(page, 'Dune') : noCover(page)).toBeVisible()
        const where = `${colorScheme} ${covered ? 'cover' : 'no cover'}`
        expect(await axe(`${where} detail`)).toEqual([])

        const panel = await openEdit(page)
        await expect(panel.getByLabel('Title', { exact: true })).toBeFocused()
        await panel.evaluate((node) => Promise.all(node.getAnimations({ subtree: true }).map((a) => a.finished)))
        expect(await axe(`${where} panel`)).toEqual([])
      }
    }
  })
})
