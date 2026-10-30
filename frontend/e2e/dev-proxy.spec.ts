// The Vite dev proxy reaches `bookvie --dev` through the server's Host/Origin
// guard. Vite runs on a free port; the inline config overrides the port and
// proxy target, and deep-merges with vite.config.ts, so `changeOrigin` still
// comes from the file.

import { fileURLToPath } from 'node:url'
import { createServer, type ViteDevServer } from 'vite'
import { expect, freePort, test } from './fixtures.ts'

const FRONTEND = fileURLToPath(new URL('..', import.meta.url))

test.use({ serverDev: true })

let vite: ViteDevServer | undefined

test.afterEach(async () => {
  await vite?.close()
  vite = undefined
})

test('GET /api/health through the Vite proxy answers 200', async ({ server, page }) => {
  const port = await freePort()
  vite = await createServer({
    root: FRONTEND,
    configFile: `${FRONTEND}/vite.config.ts`,
    logLevel: 'silent',
    clearScreen: false,
    server: {
      port,
      strictPort: true,
      proxy: { '/api': { target: server.url }, '/media': { target: server.url } },
    },
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${port}`

  const direct = await fetch(`${origin}/api/health`)
  expect(direct.status).toBe(200)
  expect(await direct.json()).toMatchObject({ app: 'bookvie', dataDir: server.dataDir })

  // From the dev page itself, as the browser sends it during `npm run dev`.
  await page.goto(`${origin}/`)
  await expect(page.getByRole('heading', { level: 1, name: 'Catalog' })).toBeVisible()
  const status = await page.evaluate(async () => (await fetch('/api/health')).status)
  expect(status).toBe(200)
})
