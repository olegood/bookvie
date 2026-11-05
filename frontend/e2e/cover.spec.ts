// Story 1.13 Add a cover: the Cover field in the New book and Edit book panels,
// the no-cover placeholder and the "From cover" swatch, and Remove cover. What
// the server does with an upload (re-decoding, refusals, downscale, minted
// names, the AD-12 order, the startup sweep, spineColorFromCover, TR8) is
// proven at API level (backend/tests/test_cover.py); these tests read what the
// browser shows by role and exact accessible name.

import AxeBuilder from '@axe-core/playwright'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { Locator, Page } from '@playwright/test'
import { expect, type Server, test } from './fixtures.ts'
import {
  ADD_BOOK,
  COVER_PNG,
  DELETE_BOOK,
  EDIT_BOOK,
  attachCover,
  bodyOf,
  intentOf,
  requestsTo,
} from './intents.ts'
import { DUNE_ID, newBookPanel, openEdit, rgbOf } from './library.ts'

const MIB = 1024 * 1024

// A 40×60 solid blue PNG (rgb 40, 90, 200): a second, different cover.
const BLUE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAIAAACb22+3AAAAZUlEQVR4nO3NMQHDQADEsI/RFFMRF1bXHAFniEVA1+f7O0/gkfUUizCzu2INXrWKNXjVKtbgVatYg1etYg1etYo1eNUq1uBVq1iDV61iDV61ijV41SrW4FWrWINXrWINXnVeHv8BT9UBwsEIGK8AAAAASUVORK5CYII=',
  'base64',
)
// A 40×60 solid gray PNG (L 90): a black-and-white cover, so no spineColorFromCover.
const GRAY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAAAAAAx0qc8AAAAPUlEQVR4nO3QoREAMAzDwFRjdv9BCs10YSV+aiGfOzssu2mo8DkaKnyOhgqfo6HC52io8DkaKnyOhurjPQ+q9QDSd9oi6wAAAABJRU5ErkJggg==',
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

function coverInput(panel: Locator): Locator {
  return panel.getByLabel('Cover', { exact: true })
}

function noCover(page: Page): Locator {
  return page.getByRole('main').getByRole('img', { name: 'No cover', exact: true })
}

function coverImage(page: Page, title: string): Locator {
  return page.getByRole('main').getByRole('img', { name: `Cover of ${title}`, exact: true })
}

type StoredLibrary = { books: { id: string; coverFile: string | null }[] }

/** The server's library.json, read from its data folder. */
function library(server: Server): StoredLibrary {
  return JSON.parse(readFileSync(path.join(server.dataDir, 'library.json'), 'utf8')) as StoredLibrary
}

/** The files in covers/, as `covers/<name>`, sorted. */
function onDisk(server: Server): string[] {
  return readdirSync(path.join(server.dataDir, 'covers'))
    .map((name) => `covers/${name}`)
    .sort()
}

/** Every coverFile library.json names, sorted. */
function referenced(server: Server): string[] {
  return library(server)
    .books.flatMap((book) => (book.coverFile ? [book.coverFile] : []))
    .sort()
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
    await page.goto(`${server.url}/catalog`)
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
    await attachCover(page, server, DUNE_FORM)
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
    await attachCover(page, server, DUNE_FORM)
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
    await page.goto(`${server.url}/catalog`)
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
    await attachCover(page, server, DUNE_FORM)
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
      if (covered) await attachCover(page, server, DUNE_FORM)
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

  test('[P1] AC-2 a cover over 20 MB shows "Cover must be 20 MB or smaller." on Cover in a real browser, not Couldn\'t save', async ({
    page,
    seededServer,
  }) => {
    // Two sizes, one per branch of the cap: past 20 MiB + 64 KiB the Content-Length
    // header alone is refused (the body is never read); just past 20 MiB the
    // body is parsed and the cover part is refused for its size.
    const server = await seededServer({ books: [] })
    await page.goto(`${server.url}/catalog`)
    await page.getByRole('main').getByRole('button', { name: 'New book', exact: true }).click()
    const panel = newBookPanel(page)
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

    for (const size of [21 * MIB, 20 * MIB + 1]) {
      await coverInput(panel).setInputFiles({ name: 'huge.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(size) })
      const answered = page.waitForResponse((r) => new URL(r.url()).pathname === ADD_BOOK)
      await panel.getByRole('button', { name: 'Add book', exact: true }).click()
      expect((await answered).status(), `${size} bytes`).toBe(413)

      await expect(page.getByRole('alert')).toHaveText('Not saved. 1 field needs attention: Cover.')
      await expect(coverInput(panel)).toHaveAttribute('aria-invalid', 'true')
      await expect(coverInput(panel)).toHaveAccessibleDescription('Cover must be 20 MB or smaller.')
      await expect(panel).toBeVisible()
    }
    // Nothing was added and no file was written.
    expect(onDisk(server)).toEqual([])
    expect(referenced(server)).toEqual([])
  })

  test('[P1] adding, replacing, removing and deleting a cover in the app leaves covers/ holding exactly what library.json references', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [] })
    const inSync = (): void => expect(onDisk(server)).toEqual(referenced(server))

    // Add: a new Book with a cover.
    await page.goto(`${server.url}/catalog`)
    await page.getByRole('main').getByRole('button', { name: 'New book', exact: true }).click()
    const newPanel = newBookPanel(page)
    for (const [label, value] of Object.entries({
      Title: 'Dune',
      Pages: '412',
      'Author(s)': 'Frank Herbert',
      Language: 'English',
      Publisher: 'Chilton Books',
    })) {
      await newPanel.getByLabel(label, { exact: true }).fill(value)
    }
    await newPanel.getByRole('combobox', { name: 'Type', exact: true }).selectOption('Paperback')
    await coverInput(newPanel).setInputFiles({ name: 'dune.png', mimeType: 'image/png', buffer: COVER_PNG })
    await newPanel.getByRole('button', { name: 'Add book', exact: true }).click()
    await expect(newPanel).toBeHidden()
    inSync()
    const bookId = library(server).books[0]!.id
    const [added] = onDisk(server)
    expect(added).toMatch(new RegExp(`^covers/${bookId}-[0-9a-f-]{32,36}\\.jpg$`))

    // Replace: a new name, the old file gone.
    await page.goto(`${server.url}/book/${bookId}`)
    let panel = await openEdit(page)
    await coverInput(panel).setInputFiles({ name: 'blue.png', mimeType: 'image/png', buffer: BLUE_PNG })
    await panel.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(panel).toBeHidden()
    inSync()
    expect(onDisk(server)).toHaveLength(1)
    expect(onDisk(server)).not.toContain(added)

    // Remove: no file left, coverFile cleared.
    panel = await openEdit(page)
    await panel.getByRole('button', { name: 'Remove cover', exact: true }).click()
    await panel.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(panel).toBeHidden()
    await expect(noCover(page)).toBeVisible()
    inSync()
    expect(onDisk(server)).toEqual([])

    // A cover again, then Delete: the Book and its file go together.
    panel = await openEdit(page)
    await coverInput(panel).setInputFiles({ name: 'dune.png', mimeType: 'image/png', buffer: COVER_PNG })
    await panel.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(panel).toBeHidden()
    await expect(coverImage(page, 'Dune')).toBeVisible()
    inSync()
    expect(onDisk(server)).toHaveLength(1)
    await page.getByRole('main').getByRole('button', { name: 'Delete', exact: true }).click()
    const deleted = page.waitForResponse((r) => new URL(r.url()).pathname === DELETE_BOOK)
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete book', exact: true }).click()
    expect((await deleted).status()).toBe(200)
    expect(library(server).books).toEqual([])
    expect(onDisk(server)).toEqual([])
  })

  test('[P3] AC-9 the From cover chip carries a dot in the cover color, and none for a black-and-white cover', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE] })
    const fromCover = (panel: Locator): Locator => panel.getByRole('button', { name: 'From cover', exact: true })

    // A colored cover: the dot is spineColorFromCover, as the view reports it.
    await attachCover(page, server, DUNE_FORM)
    const view = (await (await page.request.get(`${server.url}/api/views/book?id=${DUNE_ID}`)).json()) as {
      spineColorFromCover: string | null
    }
    expect(view.spineColorFromCover).toMatch(/^#[0-9a-f]{6}$/i)
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    let panel = await openEdit(page)
    const dot = fromCover(panel).locator('[aria-hidden="true"]')
    await expect(dot).toHaveCount(1)
    await expect(dot).toHaveCSS('background-color', rgbOf(view.spineColorFromCover!))
    await expect(fromCover(panel)).toHaveAccessibleName('From cover')
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()

    // A grayscale cover: no color, so the chip is there but has no dot.
    await page.request.post(`${server.url}${EDIT_BOOK}`, {
      multipart: {
        intent: JSON.stringify(DUNE_FORM),
        cover: { name: 'gray.png', mimeType: 'image/png', buffer: GRAY_PNG },
      },
    })
    await page.reload()
    panel = await openEdit(page)
    await expect(fromCover(panel)).toBeVisible()
    await expect(fromCover(panel)).toHaveAttribute('aria-pressed', 'true')
    await expect(fromCover(panel).locator('[aria-hidden="true"]')).toHaveCount(0)
  })
})
