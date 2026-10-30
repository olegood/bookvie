// What a crash looks like: a page that throws shows "Something went wrong"
// inside the shell, and a shell that throws shows it without the shell. Neither
// says "Page not found".

import { expect, test } from './fixtures.ts'

const CATALOG_VIEW = '**/api/views/catalog'
const WENT_WRONG = 'Something went wrong'

test('a page that throws shows the error screen inside the shell', async ({ page }) => {
  // `books` must be an array, so CatalogPage throws while rendering.
  await page.route(CATALOG_VIEW, (route) => route.fulfill({ json: { books: null, tags: [] } }))

  await page.goto('/')
  await expect(page.getByRole('main').getByRole('heading', { level: 1, name: WENT_WRONG })).toBeVisible()
  await expect(page).toHaveTitle(`${WENT_WRONG} — bookvie`)
  await expect(page.getByRole('banner').getByRole('navigation')).toBeVisible()
  await expect(page.getByText('Reload the page to try again.')).toBeVisible()
  await expect(page.getByText('Page not found')).toHaveCount(0)

  await page.unroute(CATALOG_VIEW)
  await page.getByRole('link', { name: 'Back to the catalog' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Catalog' })).toBeVisible()
})

test('a shell that throws shows the error screen without the shell', async ({ page }) => {
  // AppShell appends its live-region host to the body while rendering; the
  // body doesn't exist yet when init scripts run, so patch its prototype.
  await page.addInitScript(() => {
    HTMLBodyElement.prototype.appendChild = () => {
      throw new Error('test: the shell cannot mount')
    }
  })

  await page.goto('/')
  await expect(page.getByRole('main').getByRole('heading', { level: 1, name: WENT_WRONG })).toBeVisible()
  await expect(page).toHaveTitle(`${WENT_WRONG} — bookvie`)
  await expect(page.getByRole('banner')).toHaveCount(0)
  await expect(page.getByText('Reload the page to try again.')).toBeVisible()
  await expect(page.getByText('Page not found')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Back to the catalog' })).toHaveAttribute('href', '/')
})
