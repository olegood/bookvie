// Story 11.1 A favicon for bookvie.
//
// AC-1 reads `frontend/public/favicon.svg` as Chromium draws it and compares
// its fills with DESIGN.md, in the spirit of app-shell.spec.ts. AC-2, AC-5
// and AC-6 run on the worker's production server, AC-4 checks the build and
// the smoke script. AC-3 (the route) is in backend/tests/test_app.py.

import { existsSync, readFileSync } from 'node:fs'
import { test, expect } from './fixtures.ts'
import {
  BUILT_FAVICON,
  SMOKE_SCRIPT,
  SOURCE_FAVICON,
  SOURCE_FAVICON_URL,
  designColor,
  designFaviconPath,
  linkedIcon,
  serveSourceFavicon,
  svgComments,
  svgFill,
  svgShape,
} from './favicon.ts'
import { rgbOf } from './library.ts'

/** The only elements the drawing may have: one path, its style, and an accessible title or description. */
const ALLOWED_ELEMENTS = new Set(['path', 'style', 'title', 'desc'])

test.describe('Story 11.1 A favicon for bookvie (ATDD)', () => {
  test('[P1] AC-1 favicon.svg is the F3 drawing on a 0 0 32 32 viewBox with one flat fill, accent in light and accent-dark under the dark scheme, and an MIT comment', async ({
    page,
  }) => {
    const accent = designColor('accent')
    const accentDark = designColor('accent-dark')
    await serveSourceFavicon(page)
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(SOURCE_FAVICON_URL)

    await expect.poll(() => svgFill(page)).toBe(rgbOf(accent))

    await page.emulateMedia({ colorScheme: 'dark' })
    await expect.poll(() => svgFill(page)).toBe(rgbOf(accentDark))
    // The values the story names, so a DESIGN.md edit can't move them silently.
    expect([accent, accentDark]).toEqual(['#557059', '#93B597'])

    const dark = await svgShape(page)
    await page.emulateMedia({ colorScheme: 'light' })
    await expect.poll(() => svgFill(page)).toBe(rgbOf(accent))
    const light = await svgShape(page)
    for (const shape of [light, dark]) {
      expect(shape.viewBox).toBe('0 0 32 32')
      expect(shape.paths).toEqual([designFaviconPath()])
      expect(shape.elements.filter((name) => !ALLOWED_ELEMENTS.has(name))).toEqual([])
      // One flat fill: no outline, nothing see-through.
      expect(shape.stroke).toBe('none')
      expect(shape.fillOpacity).toBe('1')
      expect(shape.opacity).toBe('1')
    }

    const comments = svgComments(readFileSync(SOURCE_FAVICON, 'utf8'))
    expect(comments.filter((text) => /bookvie/i.test(text) && /\bMIT\b/.test(text))).toHaveLength(1)
  })

  test('[P1] AC-2 every page head has exactly one icon link, rel icon to /favicon.svg as image/svg+xml, and no PNG or .ico fallback', async ({
    page,
  }) => {
    await page.goto('/')
    const icons = page.locator('head link[rel*="icon" i]')

    await expect(icons).toHaveCount(1)

    for (const route of ['/', '/catalog', '/backup', '/no-such-page']) {
      if (route !== '/') await page.goto(route)
      await expect(page.getByRole('banner').getByRole('navigation')).toBeVisible()
      await expect(icons).toHaveCount(1)
      await expect(icons).toHaveAttribute('rel', 'icon')
      await expect(icons).toHaveAttribute('href', '/favicon.svg')
      await expect(icons).toHaveAttribute('type', 'image/svg+xml')
      await expect(page.locator('link[href*=".png" i], link[href*=".ico" i], link[rel*="apple-touch" i]')).toHaveCount(
        0,
      )
    }
  })

  test('[P1] AC-4 the build copies favicon.svg into the served folder unchanged, the server sends it as image/svg+xml, and the smoke test checks the installed wheel serves it', async ({
    request,
  }) => {
    expect(existsSync(BUILT_FAVICON)).toBe(true)

    const source = readFileSync(SOURCE_FAVICON)
    expect(readFileSync(BUILT_FAVICON).equals(source)).toBe(true)

    const response = await request.get('/favicon.svg')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe('image/svg+xml')
    expect((await response.body()).equals(source)).toBe(true)

    // The installed wheel is only reachable from scripts/smoke.mjs: it must ask
    // for /favicon.svg and refuse anything but image/svg+xml.
    const smoke = readFileSync(SMOKE_SCRIPT, 'utf8')
    expect(smoke).toContain('/favicon.svg')
    expect(smoke).toContain('image/svg+xml')
  })

  test("[P2] AC-5 the served favicon follows Chromium's own color scheme, not bookvie's Theme, so its fill matches the tab strip", async ({
    page,
  }) => {
    // bookvie's Theme set opposite to the browser's scheme.
    await page.addInitScript(() => localStorage.setItem('bookvie.theme', 'light'))
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/favicon.svg')

    await expect.poll(() => svgFill(page)).toBe(rgbOf(designColor('accent-dark')))

    await page.emulateMedia({ colorScheme: 'light' })
    await expect.poll(() => svgFill(page)).toBe(rgbOf(designColor('accent')))

    await page.addInitScript(() => localStorage.setItem('bookvie.theme', 'dark'))
    await page.reload()
    await expect.poll(() => svgFill(page)).toBe(rgbOf(designColor('accent')))
  })

  test('[P1] AC-6 the icon link resolves to the icon, uncached, and adds nothing to the page itself', async ({
    page,
    baseURL,
  }) => {
    const failed: string[] = []
    page.on('response', (response) => {
      if (response.url().startsWith(baseURL ?? '') && response.status() >= 400) {
        failed.push(`${response.status()} ${response.url()}`)
      }
    })
    await page.goto('/')

    await expect.poll(() => linkedIcon(page)).toEqual({ status: 200, type: 'image/svg+xml', cacheControl: 'no-cache' })

    await expect(page.getByRole('banner').getByRole('navigation')).toBeVisible()
    await expect(page.getByRole('main')).toBeVisible()
    // The icon lives in the head only: nothing in the page draws or links it.
    await expect(page.locator('body [src*="favicon" i], body [href*="favicon" i]')).toHaveCount(0)
    expect(failed).toEqual([])
  })
})
