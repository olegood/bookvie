// The built SPA, served by the worker's own bookvie.

import { test, expect } from './fixtures.ts'

test('/ shows the Catalog heading', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1, name: 'Catalog' })).toBeVisible()
})

test('an unknown path falls back to the SPA', async ({ page, request }) => {
  const raw = await request.get('/no/such/page')
  expect(raw.status()).toBe(200)
  expect(await raw.text()).toContain('<div id="root">')

  const response = await page.goto('/no/such/page')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
})

test('each worker has its own data dir under the run folder', async ({ server, request }) => {
  const runId = process.env.BOOKVIE_E2E_RUN_ID!
  expect(server.dataDir).toMatch(new RegExp(`/bookvie-e2e/${runId}/worker-\\d+$`))
  const health = await (await request.get('/api/health')).json()
  expect(health).toMatchObject({ app: 'bookvie', dataDir: server.dataDir })
})
