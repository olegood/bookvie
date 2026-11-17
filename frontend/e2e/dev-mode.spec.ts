// Story 11.2 Keep development apart from the real library, on a dev server.
//
// A `--dev` server marks every tab: the amber favicon (AC-4), the DEV pill and
// the `DEV · ` title prefix (AC-6), read only from `app-info.mode`, and none of
// them while `app-info` hasn't loaded (AC-8). AC-9 is the pill under forced
// colors. dev-mode-production.spec.ts has AC-7, AC-10 and AC-11; AC-1 to AC-3
// are in backend/tests/test_dev_mode.py and AC-5 is in dev-proxy.spec.ts.

import { readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import type { Route } from '@playwright/test'
import { expect, startSeededServer, test } from './fixtures.ts'
import { BUILT_FAVICON, SMOKE_SCRIPT, designFaviconPath, svgFill, svgShape } from './favicon.ts'
import {
  BUILT_FAVICON_DEV,
  FRONTEND_SRC,
  ROUTES,
  SOURCE_FAVICON_DEV,
  designComponentColor,
  devPill,
  gapAfterWord,
  liveRegionText,
  mainNav,
  readText,
  systemColor,
  watchAppInfo,
} from './dev-mode.ts'
import { DUNE } from './home.ts'
import { rgbOf } from './library.ts'

/** The only elements the drawing may have, as in favicon.spec.ts. */
const ALLOWED_ELEMENTS = new Set(['path', 'style', 'title', 'desc'])

test.use({ serverDev: true })

test.describe('Story 11.2 Keep development apart from the real library, on a dev server (ATDD)', () => {
  test('[P0] AC-4 a dev server serves the amber favicon-dev.svg at /favicon.svg and a production server the sage favicon.svg, both uncached SVG', async ({
    page,
    server,
  }, testInfo) => {
    const devFill = designComponentColor('favicon', 'dev-fill')
    const devFillDark = designComponentColor('favicon', 'dev-fill-dark')
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(`${server.url}/favicon.svg`)

    await expect.poll(() => svgFill(page)).toBe(rgbOf(devFill))

    await page.emulateMedia({ colorScheme: 'dark' })
    await expect.poll(() => svgFill(page)).toBe(rgbOf(devFillDark))
    // The values the story names, so a DESIGN.md edit can't move them silently.
    expect([devFill, devFillDark]).toEqual(['#8C5E0E', '#EBC27A'])
    // The same drawing as the sage icon.
    const shape = await svgShape(page)
    expect(shape.viewBox).toBe('0 0 32 32')
    expect(shape.paths).toEqual([designFaviconPath()])
    expect(shape.elements.filter((name) => !ALLOWED_ELEMENTS.has(name))).toEqual([])
    expect(shape.stroke).toBe('none')
    expect(shape.fillOpacity).toBe('1')
    expect(shape.opacity).toBe('1')

    const dev = await page.request.get(`${server.url}/favicon.svg`)
    expect(dev.status()).toBe(200)
    expect(dev.headers()['content-type']).toBe('image/svg+xml')
    expect(dev.headers()['cache-control']).toBe('no-cache')
    const devBody = await dev.body()
    expect(devBody.equals(readFileSync(BUILT_FAVICON_DEV))).toBe(true)
    expect(readFileSync(BUILT_FAVICON_DEV).equals(readFileSync(SOURCE_FAVICON_DEV))).toBe(true)

    const production = await startSeededServer(testInfo, 'production-favicon', {})
    try {
      const sage = await page.request.get(`${production.url}/favicon.svg`)
      expect(sage.status()).toBe(200)
      expect(sage.headers()['content-type']).toBe('image/svg+xml')
      expect(sage.headers()['cache-control']).toBe('no-cache')
      expect((await sage.body()).equals(readFileSync(BUILT_FAVICON))).toBe(true)
      expect((await sage.body()).equals(devBody)).toBe(false)
    } finally {
      await production.stop()
      rmSync(production.dataDir, { recursive: true, force: true })
    }

    // The smoke test checks that the installed wheel ships the dev icon too.
    expect(readText(SMOKE_SCRIPT)).toContain('favicon-dev.svg')
  })

  test('[P0] AC-6 on a dev server the wordmark reads "bookvie DEV" with the amber pill after the word, not interactive, and every title is "DEV · Page — bookvie"', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE] })
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(`${server.url}/catalog`)
    await expect(mainNav(page)).toBeVisible()
    const pill = devPill(page)

    await expect(pill).toBeVisible()

    // Inside the wordmark, after the word, with a space in the DOM.
    const wordmark = pill.locator('xpath=..')
    expect(await wordmark.evaluate((element) => (element.textContent ?? '').replace(/\s+/g, ' ').trim())).toBe(
      'bookvie DEV',
    )
    await expect(pill).toHaveCSS('background-color', rgbOf(designComponentColor('dev-pill', 'background')))
    await expect(pill).toHaveCSS('color', rgbOf(designComponentColor('dev-pill', 'foreground')))
    // section-label: 12px, weight 600, 0.08em tracking.
    await expect(pill).toHaveCSS('font-size', '12px')
    await expect(pill).toHaveCSS('font-weight', '600')
    await expect(pill).toHaveCSS('letter-spacing', '0.96px')
    await expect(pill).toHaveCSS('border-radius', '6px')
    await expect(pill).toHaveCSS('padding', '4px 7px')
    expect(await gapAfterWord(wordmark, 'bookvie')).toBeCloseTo(8, 0)

    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(pill).toHaveCSS('background-color', rgbOf(designComponentColor('dev-pill', 'background-dark')))
    await expect(pill).toHaveCSS('color', rgbOf(designComponentColor('dev-pill', 'foreground-dark')))

    // Not a link, a button or a Tab stop.
    expect(
      await pill.evaluate((element) => element.closest('a, button, [role="link"], [role="button"], [tabindex]')),
    ).toBeNull()
    await pill.evaluate((element) => (element as HTMLElement).focus())
    expect(await pill.evaluate((element) => element.contains(document.activeElement))).toBe(false)

    for (const [route, name] of ROUTES) {
      await page.goto(`${server.url}${route}`)
      await expect(mainNav(page)).toBeVisible()
      await expect(page).toHaveTitle(`DEV · ${name} — bookvie`)
    }

    // Dev comes only from app-info.mode: told "production", the dev server's page shows no mark.
    await page.route('**/api/views/app-info', async (route) => {
      const response = await route.fetch()
      await route.fulfill({ response, json: { ...(await response.json()), mode: 'production' } })
    })
    const seen = watchAppInfo(page)
    await page.goto(`${server.url}/catalog`)
    await expect(mainNav(page)).toBeVisible()
    await expect.poll(() => seen.at(-1)?.body?.mode).toBe('production')
    await expect(page).toHaveTitle('Catalog — bookvie')
    await expect(devPill(page)).toHaveCount(0)
    const usesViteDev = readdirSync(FRONTEND_SRC, { recursive: true, encoding: 'utf8' })
      .map((file) => path.join(FRONTEND_SRC, file))
      .filter((file) => statSync(file).isFile() && readText(file).includes('import.meta.env.DEV'))
    expect(usesViteDev).toEqual([])
  })

  test('[P1] AC-8 on a dev server the shell looks like production while app-info is pending or failing, and a failed refetch after a success keeps the pill and the DEV prefix', async ({
    page,
    server,
  }) => {
    const held: Route[] = []
    await page.route('**/api/views/app-info', (route) => {
      held.push(route)
    })
    const seen = watchAppInfo(page)
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(`${server.url}/`)
    await expect(mainNav(page)).toBeVisible()

    await expect.poll(() => held.length).toBeGreaterThan(0)

    await expect(page).toHaveTitle('Home — bookvie')
    await expect(devPill(page)).toHaveCount(0)
    const productionBanner = await page.getByRole('banner').textContent()
    expect(await liveRegionText(page)).toBe('')

    // It never loads: the first fetch fails.
    for (const route of held.splice(0)) await route.fulfill({ status: 500, body: '' })
    await expect.poll(() => seen.filter((answer) => answer.status === 500).length).toBeGreaterThan(0)
    await expect(page).toHaveTitle('Home — bookvie')
    await expect(devPill(page)).toHaveCount(0)
    await expect(page.getByRole('banner')).toHaveText(productionBanner ?? '')
    expect(await liveRegionText(page)).toBe('')

    // After a success, a refetch that fails keeps the last data.
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    let failing = false
    await page.route('**/api/views/app-info', (route) =>
      failing ? route.fulfill({ status: 500, body: '' }) : route.continue(),
    )
    await page.reload()
    await expect(mainNav(page)).toBeVisible()
    await expect(devPill(page)).toBeVisible()
    await expect(page).toHaveTitle('DEV · Home — bookvie')
    failing = true
    const failures = () => seen.filter((answer) => answer.status === 500).length
    const failedBefore = failures()
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect.poll(failures).toBeGreaterThan(failedBefore)
    await expect(devPill(page)).toBeVisible()
    await expect(page).toHaveTitle('DEV · Home — bookvie')
    expect(await liveRegionText(page)).toBe('')
  })

  test('[P2] AC-9 under forced colors the DEV pill is Canvas with CanvasText text and a 1px CanvasText border', async ({
    page,
    server,
  }) => {
    await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' })
    await page.goto(`${server.url}/catalog`)
    await expect(mainNav(page)).toBeVisible()
    const pill = devPill(page)

    await expect(pill).toHaveCSS('border-top-width', '1px')

    const canvas = await systemColor(page, 'Canvas')
    const canvasText = await systemColor(page, 'CanvasText')
    for (const side of ['top', 'right', 'bottom', 'left']) {
      await expect(pill).toHaveCSS(`border-${side}-width`, '1px')
      await expect(pill).toHaveCSS(`border-${side}-style`, 'solid')
      await expect(pill).toHaveCSS(`border-${side}-color`, canvasText)
    }
    await expect(pill).toHaveCSS('background-color', canvas)
    await expect(pill).toHaveCSS('color', canvasText)
  })
})
