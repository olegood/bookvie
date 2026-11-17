// The Vite dev proxy reaches `bookvie --dev` through the server's Host/Origin
// guard. Vite runs on a free port; the inline config overrides the port and
// proxy target, and deep-merges with vite.config.ts, so `changeOrigin` still
// comes from the file.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createServer, loadConfigFromFile, type ViteDevServer } from 'vite'
import { BUILT_FAVICON_DEV, DEV_BACKEND, designComponentColor } from './dev-mode.ts'
import { SOURCE_FAVICON, svgFill } from './favicon.ts'
import { expect, freePort, test } from './fixtures.ts'
import { rgbOf } from './library.ts'

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
  await page.goto(`${origin}/catalog`)
  await expect(page.getByRole('heading', { level: 1, name: 'Catalog' })).toBeVisible()
  const status = await page.evaluate(async () => (await fetch('/api/health')).status)
  expect(status).toBe(200)

  // /media is forwarded too: bookvie's 404 for an unknown cover, not Vite's SPA fallback.
  const media = await fetch(`${origin}/media/covers/none.jpg`)
  expect(media.status).toBe(404)
  expect(media.headers.get('content-type') ?? '').not.toContain('text/html')
})

// Story 11.2 AC-5. ATDD red phase: skipped until vite.config.ts proxies
// /favicon.svg to the --dev default port and a dev server serves the amber icon.
test.skip('[P1] AC-5 vite.config.ts proxies /api, /media and /favicon.svg to 127.0.0.1:8766, and a tab through Vite gets the backend amber favicon, not public/', async ({
  server,
  page,
}) => {
  const loaded = await loadConfigFromFile(
    { command: 'serve', mode: 'development' },
    `${FRONTEND}/vite.config.ts`,
    FRONTEND,
    'silent',
  )
  const proxy = loaded?.config.server?.proxy ?? {}
  const targets = Object.fromEntries(
    Object.entries(proxy).map(([prefix, options]) => [prefix, typeof options === 'string' ? options : options.target]),
  )

  expect(targets).toEqual({ '/api': DEV_BACKEND, '/media': DEV_BACKEND, '/favicon.svg': DEV_BACKEND })

  const port = await freePort()
  vite = await createServer({
    root: FRONTEND,
    configFile: `${FRONTEND}/vite.config.ts`,
    logLevel: 'silent',
    clearScreen: false,
    server: {
      port,
      strictPort: true,
      proxy: {
        '/api': { target: server.url },
        '/media': { target: server.url },
        '/favicon.svg': { target: server.url },
      },
    },
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${port}`

  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto(`${origin}/favicon.svg`)
  await expect.poll(() => svgFill(page)).toBe(rgbOf(designComponentColor('favicon', 'dev-fill')))
  const body = await (await fetch(`${origin}/favicon.svg`)).text()
  expect(body).toBe(readFileSync(BUILT_FAVICON_DEV, 'utf8'))
  expect(body).not.toBe(readFileSync(SOURCE_FAVICON, 'utf8'))
})
