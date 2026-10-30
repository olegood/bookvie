// Story 1.8 New book panel: opening, the Agent Label Contract (CAT-E2E-001),
// Tags suggestions, swatches, the add flow (CAT-E2E-002), validation
// (CAT-E2E-004), couldn't save (CAT-E2E-005), closing without saving, and the
// in-flight guard. Fields are found by exact accessible name, never by test id.

import type { Locator, Page } from '@playwright/test'
import { expect, type Server, test } from './fixtures.ts'

const ADD_BOOK = '**/api/intents/add-book'
const COULDNT_SAVE = "Couldn't save. Your data wasn't changed."
// DESIGN.md colors, light theme.
const INK = 'rgb(43, 46, 42)'
const ACCENT = 'rgb(85, 112, 89)'
const SCRIM = 'rgba(43, 46, 42, 0.24)'
// DESIGN.md → Spine colors, in rotation order.
const SWATCHES = {
  Sage: '#749076',
  Slate: '#5B7590',
  Clay: '#9B6753',
  Ochre: '#B48A45',
  Plum: '#7A6283',
  Teal: '#4B7C7B',
  Moss: '#6C7650',
  Stone: '#6F7375',
}
// The panel's fields from the Agent Label Contract (EXPERIENCE.md), in form
// order: accessible name, role, required. Finished on (a date input) has no
// ARIA role and is checked on its own; Cover arrives with Story 1.13.
const CONTRACT_FIELDS = [
  ['Title', 'textbox', true],
  ['Subtitle', 'textbox', false],
  ['Pages', 'spinbutton', true],
  ['Author(s)', 'textbox', true],
  ['Edition', 'spinbutton', true],
  ['Language', 'textbox', true],
  ['Publisher', 'textbox', true],
  ['Type', 'combobox', true],
  ['ISBN', 'textbox', false],
  ['Year', 'spinbutton', false],
  ['Tags', 'combobox', false],
  ['Spine color', 'textbox', false],
] as const
// A complete Book as the cataloging skill types it; Type is picked separately.
const DUNE = {
  Title: 'Dune',
  Pages: '412',
  'Author(s)': 'Frank Herbert',
  Language: 'English',
  Publisher: 'Chilton Books',
}
const NEUROMANCER = { title: 'Neuromancer', authors: ['William Gibson'], pages: 271 }

type CatalogBody = { books: { title: string }[]; tags: string[] }

function newBookPanel(page: Page): Locator {
  return page.getByRole('dialog', { name: 'New book', exact: true })
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

async function catalog(page: Page, server: Server): Promise<CatalogBody> {
  const response = await page.request.get(`${server.url}/api/views/catalog`)
  return (await response.json()) as CatalogBody
}

/** Starts recording every text a live region holds from now on, under `key`. */
async function recordRegion(region: Locator, key: string): Promise<void> {
  await region.evaluate((element, name) => {
    const store = ((window as Window & { regionTexts?: Record<string, string[]> }).regionTexts ??= {})
    const seen: string[] = (store[name] = [])
    new MutationObserver(() => seen.push(element.textContent ?? '')).observe(element, {
      childList: true,
      characterData: true,
      subtree: true,
    })
  }, key)
}

function recordedTexts(page: Page, key: string): Promise<string[] | undefined> {
  return page.evaluate(
    (name) => (window as Window & { regionTexts?: Record<string, string[]> }).regionTexts?.[name],
    key,
  )
}

test.describe('Story 1.8 New book panel (ATDD)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test('[P0] AC-1 New book opens a modal side panel from the right with focus on Title', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [] })
    await page.setViewportSize({ width: 1280, height: 640 })
    await page.goto(`${server.url}/`)
    // The empty state's New book opens the same panel.
    await page.getByRole('button', { name: 'New book', exact: true }).first().click()
    const panel = newBookPanel(page)

    await expect(panel).toBeVisible()
    await expect(panel.getByLabel('Title', { exact: true })).toBeFocused()
    expect(await panel.evaluate((element) => element.matches(':modal'))).toBe(true)
    expect(await panel.evaluate((element) => getComputedStyle(element, '::backdrop').backgroundColor)).toBe(SCRIM)

    // Anchored to the right edge.
    const box = (await panel.boundingBox())!
    const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(Math.round(box.x + box.width)).toBe(viewportWidth)

    // Sticky footer, and scroll-padding-bottom keeps a focused field above it.
    const addBook = panel.getByRole('button', { name: 'Add book', exact: true })
    const spineColor = panel.getByRole('textbox', { name: 'Spine color', exact: true })
    await spineColor.focus()
    await expect(addBook).toBeInViewport()
    await expect(spineColor).toBeInViewport({ ratio: 1 })
    const field = (await spineColor.boundingBox())!
    const footerButton = (await addBook.boundingBox())!
    expect(field.y + field.height).toBeLessThanOrEqual(footerButton.y)
  })

  test('[P0] AC-2 every Agent Label Contract entry is found by exact name with its role', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [NEUROMANCER] })
    await page.goto(`${server.url}/`)
    const panel = await openNewBook(page)

    // "Title" never matches "Subtitle".
    await expect(panel.getByLabel('Title', { exact: true })).toHaveCount(1)
    await expect(panel.getByLabel('Title', { exact: true })).toHaveAccessibleName('Title')

    for (const [name, role, required] of CONTRACT_FIELDS) {
      const field = panel.getByRole(role, { name, exact: true })
      await expect(field, name).toHaveCount(1)
      await expect(field, name).toHaveAccessibleName(name)
      // "(required)" sits outside the label element; requiredness is `required`.
      expect(
        await field.evaluate((element) => Array.from((element as HTMLInputElement).labels!, (label) => label.textContent)),
        name,
      ).toEqual([name])
      expect(await field.evaluate((element) => (element as HTMLInputElement).required), name).toBe(required)
    }
    await expect(panel.getByText('(required)', { exact: true })).toHaveCount(7)

    await expect(panel.getByRole('spinbutton', { name: 'Edition', exact: true })).toHaveValue('1')
    await expect(panel.getByRole('combobox', { name: 'Type', exact: true }).locator('option')).toHaveText([
      '',
      'Paperback',
      'Hardcover',
      'Ebook',
    ])
    await expect(panel.getByLabel('Finished on', { exact: true })).toHaveAttribute('type', 'date')

    for (const swatch of Object.keys(SWATCHES)) {
      await expect(panel.getByRole('button', { name: swatch, exact: true }), swatch).toHaveAttribute('aria-pressed', 'false')
    }
    // From cover only exists once a Book has a cover (Story 1.13).
    await expect(panel.getByRole('button', { name: 'From cover', exact: true })).toHaveCount(0)

    for (const name of ['Add book', 'Cancel', 'Close']) {
      await expect(panel.getByRole('button', { name, exact: true }), name).toHaveCount(1)
    }
    // The only Cancel exposed while the panel is open, and no second New book.
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toHaveCount(1)
    await expect(panel.getByRole('button', { name: 'New book', exact: true })).toHaveCount(0)
  })

  test('[P1] AC-3 Tags suggests existing tags that start with the typed text and accepts any text', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [
        { title: 'Cosmos', tags: ['science', 'classics'] },
        { title: 'Neuromancer', tags: ['sci-fi', 'cyberpunk'] },
      ],
    })
    await page.goto(`${server.url}/`)
    const panel = await openNewBook(page)
    const tags = panel.getByRole('combobox', { name: 'Tags', exact: true })

    await tags.pressSequentially('sc')
    const suggestions = panel.getByRole('listbox')
    await expect(suggestions.getByRole('option')).toHaveCount(2)
    await expect(suggestions.getByRole('option', { name: 'science', exact: true })).toBeVisible()
    await expect(suggestions.getByRole('option', { name: 'sci-fi', exact: true })).toBeVisible()
    await expect(tags).toHaveAttribute('aria-expanded', 'true')

    // Arrow keys and Enter pick a suggestion; Enter does not submit the form.
    await tags.press('ArrowDown')
    const picked = suggestions.getByRole('option', { selected: true })
    await expect(picked).toHaveCount(1)
    const pickedTag = (await picked.textContent())!
    await tags.press('Enter')
    await expect(tags).toHaveValue(new RegExp(`^${pickedTag}(, )?$`))
    await expect(panel).toBeVisible()

    // Esc with suggestions open closes the list, not the panel.
    await tags.pressSequentially('sc')
    await expect(tags).toHaveAttribute('aria-expanded', 'true')
    const typed = await tags.inputValue()
    await tags.press('Escape')
    await expect(panel).toBeVisible()
    await expect(tags).toHaveValue(typed)
    await expect(tags).toHaveAttribute('aria-expanded', 'false')

    // Text that matches no suggestion is kept and saved as a new tag; with no
    // suggestion active, Enter in Tags submits the form.
    await fillFields(panel, DUNE)
    await tags.fill(`${pickedTag}, zines`)
    await expect(tags).toHaveAttribute('aria-expanded', 'false')
    await tags.press('Enter')
    await expect(panel).toBeHidden()
    expect((await catalog(page, server)).tags).toContain('zines')
  })

  test('[P1] AC-4 a swatch fills Spine color with its hex and shows aria-pressed', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [NEUROMANCER] })
    await page.goto(`${server.url}/`)
    const panel = await openNewBook(page)
    const clay = panel.getByRole('button', { name: 'Clay', exact: true })

    await clay.click()
    await expect(panel.getByRole('textbox', { name: 'Spine color', exact: true })).toHaveValue(
      new RegExp(`^${SWATCHES.Clay}$`, 'i'),
    )
    await expect(clay).toHaveAttribute('aria-pressed', 'true')
    for (const swatch of Object.keys(SWATCHES).filter((name) => name !== 'Clay')) {
      await expect(panel.getByRole('button', { name: swatch, exact: true }), swatch).toHaveAttribute('aria-pressed', 'false')
    }
  })

  test('[P0] AC-5 Add book saves, announces "Added Title.", and focuses the new row in the List view', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [NEUROMANCER] })
    await page.goto(`${server.url}/`)
    // A search that would hide the new Book is cleared first.
    const search = page.getByRole('searchbox', { name: 'Search titles', exact: true })
    await search.fill('Neuro')
    const panel = await openNewBook(page)
    const addBook = panel.getByRole('button', { name: 'Add book', exact: true })
    // An invalid press first, so the alert region holds text before the save.
    await addBook.click()
    await expect(page.getByRole('alert')).not.toHaveText('')
    await fillFields(panel, DUNE)
    await recordRegion(page.getByRole('alert'), 'alert')
    await recordRegion(page.getByRole('status'), 'status')

    await addBook.click()
    await expect(page.getByRole('status')).toHaveText('Added Dune.')
    await expect(panel).toBeHidden()
    // Both regions were emptied at the press.
    expect((await recordedTexts(page, 'alert'))?.[0]).toBe('')
    await expect(page.getByRole('alert')).toHaveText('')
    expect((await recordedTexts(page, 'status'))?.filter((text) => text !== '')).toEqual(['Added Dune.'])

    await expect(search).toHaveValue('')
    const row = page.getByRole('table').getByRole('row').filter({ has: page.getByText('Dune', { exact: true }) })
    await expect(row).toHaveCount(1)
    await expect(row.locator(':focus')).toHaveText('Dune')
    // Highlight ring: accent box-shadow on the row or one of its cells, gone
    // after 2 s.
    const ringed = () =>
      row.evaluate(
        (element, accent) =>
          [element, ...Array.from(element.querySelectorAll('*'))].some((node) =>
            getComputedStyle(node).boxShadow.includes(accent),
          ),
        ACCENT,
      )
    await expect.poll(ringed).toBe(true)
    await expect.poll(ringed, { timeout: 4_000 }).toBe(false)
    expect((await catalog(page, server)).books.map((book) => book.title).sort()).toEqual(['Dune', 'Neuromancer'])
  })

  test('[P0] AC-6 invalid fields save nothing, keep every value and name each field', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [NEUROMANCER] })
    await page.goto(`${server.url}/`)
    const panel = await openNewBook(page)
    await fillFields(panel, { Title: 'Dune', 'Author(s)': 'Frank Herbert', Publisher: 'Chilton Books' })

    await panel.getByRole('button', { name: 'Add book', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText('Not saved. 2 fields need attention: Pages, Language.')
    await expect(panel).toBeVisible()

    const pages = panel.getByRole('spinbutton', { name: 'Pages', exact: true })
    const language = panel.getByRole('textbox', { name: 'Language', exact: true })
    await expect(pages).toBeFocused()
    await expect(pages).toHaveAttribute('aria-invalid', 'true')
    await expect(pages).toHaveAccessibleDescription('Pages is required.')
    await expect(language).toHaveAttribute('aria-invalid', 'true')
    await expect(language).toHaveAccessibleDescription('Language is required.')
    await expect(panel.getByLabel('Title', { exact: true })).not.toHaveAttribute('aria-invalid', 'true')

    // Every value kept.
    await expect(panel.getByLabel('Title', { exact: true })).toHaveValue('Dune')
    await expect(panel.getByLabel('Author(s)', { exact: true })).toHaveValue('Frank Herbert')
    await expect(panel.getByLabel('Publisher', { exact: true })).toHaveValue('Chilton Books')
    await expect(panel.getByRole('combobox', { name: 'Type', exact: true })).toHaveValue(/paperback/i)
    await expect(panel.getByRole('spinbutton', { name: 'Edition', exact: true })).toHaveValue('1')

    // No red: the invalid border and the messages are ink.
    await expect(pages).toHaveCSS('border-top-color', INK)
    await expect(pages).toHaveCSS('border-top-width', '2px')
    await expect(panel.getByText('Pages is required.', { exact: true })).toHaveCSS('color', INK)
    await expect(panel.getByText('Language is required.', { exact: true })).toHaveCSS('color', INK)

    expect((await catalog(page, server)).books.map((book) => book.title)).toEqual(['Neuromancer'])
  })

  test('[P0] AC-7 couldn\'t save keeps the panel open with every value and says so in ink', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [NEUROMANCER] })
    await page.route(ADD_BOOK, (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: { kind: 'couldnt_save', code: 'couldnt_save', message: COULDNT_SAVE } }),
      }),
    )
    await page.goto(`${server.url}/`)
    const panel = await openNewBook(page)
    await fillFields(panel, { ...DUNE, Subtitle: 'Book One', Tags: 'sci-fi' })

    await panel.getByRole('button', { name: 'Add book', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText(COULDNT_SAVE)
    await expect(panel).toBeVisible()
    const line = panel.getByText(COULDNT_SAVE, { exact: true })
    await expect(line).toHaveCSS('color', INK)
    // Laid out as a line in the panel, not left visually hidden.
    await expect(line).toHaveCSS('position', 'static')
    expect((await line.boundingBox())?.height ?? 0).toBeGreaterThan(1)

    for (const [label, value] of Object.entries({ ...DUNE, Subtitle: 'Book One', Tags: 'sci-fi' })) {
      await expect(panel.getByLabel(label, { exact: true }), label).toHaveValue(value)
    }
    await expect(panel.getByRole('combobox', { name: 'Type', exact: true })).toHaveValue(/paperback/i)
    await expect(page.getByRole('status')).toHaveText('')
    expect((await catalog(page, server)).books.map((book) => book.title)).toEqual(['Neuromancer'])
  })

  test('[P1] a refusal naming no field of the form shows its message as a line in the panel', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [NEUROMANCER] })
    const message = 'Not saved. The form could not be read.'
    await page.route(ADD_BOOK, (route) =>
      route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            kind: 'refusal',
            code: 'invalid_fields',
            message,
            fields: [{ field: 'intent', message: 'The form could not be read.' }],
          },
        }),
      }),
    )
    await page.goto(`${server.url}/`)
    const panel = await openNewBook(page)
    await fillFields(panel, DUNE)

    await panel.getByRole('button', { name: 'Add book', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText(message)
    await expect(panel).toBeVisible()
    const line = panel.getByText(message, { exact: true })
    await expect(line).toHaveCSS('position', 'static')
    expect((await line.boundingBox())?.height ?? 0).toBeGreaterThan(1)
    await expect(panel.getByLabel('Title', { exact: true })).toHaveValue('Dune')
    expect((await catalog(page, server)).books.map((book) => book.title)).toEqual(['Neuromancer'])
  })

  test('[P1] AC-8 Cancel, Close and Esc discard typed fields without a prompt and refocus New book', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [NEUROMANCER] })
    const prompts: string[] = []
    page.on('dialog', (dialog) => {
      prompts.push(dialog.message())
      void dialog.dismiss()
    })
    await page.goto(`${server.url}/`)
    const newBook = page.getByRole('button', { name: 'New book', exact: true })
    const closers: [string, (panel: Locator) => Promise<void>][] = [
      ['Cancel', (panel) => panel.getByRole('button', { name: 'Cancel', exact: true }).click()],
      ['Close', (panel) => panel.getByRole('button', { name: 'Close', exact: true }).click()],
      // A browser close that skips `cancel` must still close the panel, so the
      // next round can open it again.
      ['native close', (panel) => panel.evaluate((dialog) => (dialog as HTMLDialogElement).close())],
      ['Esc',(panel) => panel.getByLabel('Title', { exact: true }).press('Escape')],
    ]

    for (const [how, close] of closers) {
      const panel = await openNewBook(page)
      // Typed fields from the previous round were discarded.
      await expect(panel.getByLabel('Title', { exact: true }), how).toHaveValue('')
      await panel.getByLabel('Title', { exact: true }).fill('Dune')
      await panel.getByLabel('Pages', { exact: true }).fill('412')

      await close(panel)
      await expect(panel, how).toBeHidden()
      await expect(newBook, how).toBeFocused()
    }
    expect(prompts).toEqual([])
    expect((await catalog(page, server)).books.map((book) => book.title)).toEqual(['Neuromancer'])
  })

  test('[P0] the live regions move into the open panel and back to the shell on close', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [NEUROMANCER] })
    await page.goto(`${server.url}/`)
    const panel = await openNewBook(page)

    // showModal() makes everything outside the dialog inert, so the regions
    // must sit inside it while it is open.
    await expect(panel.getByRole('status')).toHaveCount(1)
    await expect(panel.getByRole('alert')).toHaveCount(1)
    expect(
      await page.evaluate(() =>
        Array.from(document.querySelectorAll('[role="status"], [role="alert"]')).every(
          (region) => region.closest('dialog') !== null && region.closest('[inert]') === null,
        ),
      ),
    ).toBe(true)

    await panel.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(panel).toBeHidden()
    await expect(page.getByRole('status')).toHaveCount(1)
    await expect(page.getByRole('alert')).toHaveCount(1)
    await expect(page.getByRole('main').getByRole('status')).toHaveCount(0)
    await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0)
  })

  test('[P1] AC-12 Add book is aria-disabled while the request is in flight and sends nothing more', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [NEUROMANCER] })
    let release!: () => void
    const held = new Promise<void>((resolve) => (release = resolve))
    let posts = 0
    await page.route(ADD_BOOK, async (route) => {
      posts += 1
      await held
      await route.continue()
    })
    await page.goto(`${server.url}/`)
    const panel = await openNewBook(page)
    await fillFields(panel, DUNE)
    const addBook = panel.getByRole('button', { name: 'Add book', exact: true })
    const sent = page.waitForRequest(ADD_BOOK)

    await addBook.click()
    await sent
    await expect(addBook).toHaveAttribute('aria-disabled', 'true')
    // aria-disabled keeps it focusable and clickable; neither press may send.
    await addBook.click({ force: true })
    await page.keyboard.press('Enter')

    release()
    await expect(page.getByRole('status')).toHaveText('Added Dune.')
    expect(posts).toBe(1)
    expect((await catalog(page, server)).books.map((book) => book.title).sort()).toEqual(['Dune', 'Neuromancer'])
  })
})
