// Story 1.6 Catalog states: nothing but the header before the
// first view response, the couldn't-load state, the empty shelf, and axe in
// both themes.

import AxeBuilder from '@axe-core/playwright'
import { rmSync } from 'node:fs'
import path from 'node:path'
import { runDir } from './guard.ts'
import { expect, freePort, seedLibrary, startServer, test } from './fixtures.ts'

const CATALOG_VIEW = '**/api/views/catalog'
const EMPTY_SHELF = 'Your shelf is empty. Add your first book.'
const COULDNT_LOAD = "Couldn't load. Is bookvie still running?"

test.describe('Story 1.6 Catalog states (ATDD)', () => {
  test('[P1] AC-6 before the first view response only the header and nav render', async ({ page }) => {
    let release!: () => void
    const held = new Promise<void>((resolve) => (release = resolve))
    await page.route(CATALOG_VIEW, async (route) => {
      await held
      await route.continue()
    })
    const viewRequested = page.waitForRequest(CATALOG_VIEW)

    await page.goto('/')
    await viewRequested
    await expect(page.getByRole('banner').getByRole('navigation')).toBeVisible()
    await expect(page.getByRole('main')).toBeEmpty()
    await expect(page.getByText(EMPTY_SHELF)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'New book' })).toHaveCount(0)
    await expect(page.getByRole('progressbar')).toHaveCount(0)

    release()
    await expect(page.getByRole('button', { name: 'New book' }).first()).toBeVisible()
  })

  test('[P0] AC-7 a failed first load shows Couldn\'t load with Try again, which refetches', async ({ page }) => {
    let down = true
    await page.route(CATALOG_VIEW, (route) => (down ? route.abort('connectionrefused') : route.continue()))

    await page.goto('/')
    await expect(page.getByRole('alert')).toHaveText(COULDNT_LOAD)
    await expect(page.getByRole('main').getByText(COULDNT_LOAD)).toBeVisible()
    await expect(page.getByRole('banner').getByRole('navigation')).toBeVisible()
    await expect(page.getByRole('main').getByRole('heading', { level: 1, name: 'Catalog' })).toBeVisible()

    down = false
    // Keyboard path: the button unmounts while loading, so focus is parked on main.
    await page.getByRole('button', { name: 'Try again' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: 'New book' }).first()).toBeVisible()
    await expect(page.getByText(COULDNT_LOAD)).toHaveCount(0)
    await expect(page.getByRole('main')).toBeFocused()
  })

  test('[P1] AC-7 a failed background refetch keeps the last data and shows no message', async ({ page }) => {
    await page.goto('/')
    const newBook = page.getByRole('button', { name: 'New book' }).first()
    await expect(newBook).toBeVisible()

    await page.route(CATALOG_VIEW, (route) => route.abort('connectionrefused'))
    const refetchFailed = page.waitForEvent('requestfailed', (request) => request.url().endsWith('/api/views/catalog'))
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await refetchFailed

    await expect(newBook).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Catalog' })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveText('')
    await expect(page.getByText(COULDNT_LOAD)).toHaveCount(0)
  })

  test('[P0] AC-8 an empty library opens Catalog to the empty shelf with only New book', async ({ page }) => {
    const dataDir = path.join(runDir(process.env.BOOKVIE_E2E_RUN_ID!), `empty-shelf-${test.info().workerIndex}`)
    rmSync(dataDir, { recursive: true, force: true })
    seedLibrary(dataDir, { books: [] })
    const server = await startServer(dataDir, { port: await freePort() })
    try {
      await page.goto(`${server.url}/`)
      const main = page.getByRole('main')

      await expect(main.getByText(EMPTY_SHELF)).toBeVisible()
      await expect(page.getByRole('heading', { level: 1, name: 'Catalog' })).toBeVisible()
      await expect(main.getByRole('button', { name: 'New book' }).first()).toBeVisible()
      await expect(main.getByRole('button').filter({ hasNotText: 'New book' })).toHaveCount(0)
      await expect(main.getByRole('textbox')).toHaveCount(0)
      await expect(main.getByRole('searchbox')).toHaveCount(0)
      await expect(main.getByRole('progressbar')).toHaveCount(0)
    } finally {
      expect(await server.stop()).toBe('')
    }
    rmSync(dataDir, { recursive: true, force: true })
  })

  test('[P1] AC-8 a library with a book shows no empty-shelf sentence', async ({ page }) => {
    const dataDir = path.join(runDir(process.env.BOOKVIE_E2E_RUN_ID!), `one-book-${test.info().workerIndex}`)
    rmSync(dataDir, { recursive: true, force: true })
    seedLibrary(dataDir, { books: [{ title: 'Dune' }] })
    const server = await startServer(dataDir, { port: await freePort() })
    try {
      await page.goto(`${server.url}/`)

      await expect(page.getByRole('heading', { level: 1, name: 'Catalog' })).toBeVisible()
      await expect(page.getByRole('main').getByRole('button', { name: 'New book' })).toBeVisible()
      await expect(page.getByText(EMPTY_SHELF)).toHaveCount(0)
    } finally {
      expect(await server.stop()).toBe('')
    }
    rmSync(dataDir, { recursive: true, force: true })
  })

  test('[P2] AC-13 axe finds no WCAG 2.2 AA violations on Catalog in either theme', async ({ page }) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1, name: 'Catalog' })).toBeVisible()

      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(violations.map(({ id, nodes }) => `${colorScheme}: ${id} (${nodes.length})`)).toEqual([])
    }
  })
})

test.describe('Story 1.6 Catalog states (automate)', () => {
  test('[P2] AC-7 a Try again that fails again shows and announces Couldn\'t load again', async ({ page }) => {
    await page.route(CATALOG_VIEW, (route) => route.abort('connectionrefused'))
    await page.goto('/')
    const alert = page.getByRole('alert')
    await expect(alert).toHaveText(COULDNT_LOAD)

    // Every text the alert region holds from here on, in order.
    await alert.evaluate((region) => {
      const seen: string[] = []
      ;(window as Window & { alertTexts?: string[] }).alertTexts = seen
      new MutationObserver(() => seen.push(region.textContent ?? '')).observe(region, {
        childList: true,
        characterData: true,
        subtree: true,
      })
    })
    await page.getByRole('button', { name: 'Try again' }).click()

    await expect(page.getByRole('main').getByText(COULDNT_LOAD)).toBeVisible()
    await expect
      .poll(() => page.evaluate(() => (window as Window & { alertTexts?: string[] }).alertTexts))
      .toEqual(['', COULDNT_LOAD])
  })

  test('[P2] AC-9 Try again is a button-secondary', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.route(CATALOG_VIEW, (route) => route.abort('connectionrefused'))
    await page.goto('/')
    const tryAgain = page.getByRole('button', { name: 'Try again' })

    // DESIGN.md button-secondary: surface-inset, ink, 1px input-border, rounded md.
    await expect(tryAgain).toHaveCSS('background-color', 'rgb(250, 249, 246)')
    await expect(tryAgain).toHaveCSS('color', 'rgb(43, 46, 42)')
    await expect(tryAgain).toHaveCSS('border', '1px solid rgb(138, 130, 115)')
    await expect(tryAgain).toHaveCSS('border-radius', '9px')
  })
})
