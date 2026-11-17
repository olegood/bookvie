// Story 11.2 Keep development apart from the real library: test automation
// after the story was done, beside the ATDD leaves in dev-mode.spec.ts,
// dev-mode-production.spec.ts and dev-proxy.spec.ts. The DEV pill follows
// bookvie's Theme over the OS, sits centered and about 20px tall, is never a
// Tab stop and passes axe; a Vite tab shows it; a client-side route change
// after a failed refetch keeps the prefix; forced colors in the dark scheme
// keep the pill readable, and a production page under forced colors shows
// nothing new (its server started in the test, since this file runs --dev). The process-level refusal (exit 2) is in
// backend/tests/test_dev_mode.py.

import AxeBuilder from '@axe-core/playwright'
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Locator, Page } from '@playwright/test'
import { createServer, type ViteDevServer } from 'vite'
import { expect, freePort, startSeededServer, test } from './fixtures.ts'
import {
  designComponentColor,
  devPill,
  elementsColored,
  mainNav,
  ROUTES,
  systemColor,
  watchAppInfo,
} from './dev-mode.ts'
import { DUNE } from './home.ts'
import { rgbOf } from './library.ts'

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const FRONTEND = fileURLToPath(new URL('..', import.meta.url))

function wordmark(page: Page): Locator {
  return devPill(page).locator('xpath=..')
}

/** Picks one of the Theme toggle's options, as a person would. */
async function chooseTheme(page: Page, name: 'Light' | 'Dark' | 'System'): Promise<void> {
  const option = page.getByRole('group', { name: 'Theme' }).getByRole('button', { name, exact: true })
  await option.click()
  await expect(option).toHaveAttribute('aria-pressed', 'true')
}

test.use({ serverDev: true })

test.describe('Story 11.2 Keep development apart from the real library, on a dev server (automate)', () => {
  test('[P2] AC-6 the DEV pill follows bookvie Theme over the OS scheme: Dark under OS light, Light under OS dark', async ({
    page,
    server,
  }) => {
    const pill = devPill(page)
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(`${server.url}/catalog`)
    await expect(pill).toBeVisible()

    await chooseTheme(page, 'Dark')

    await expect(pill).toHaveCSS('background-color', rgbOf(designComponentColor('dev-pill', 'background-dark')))
    await expect(pill).toHaveCSS('color', rgbOf(designComponentColor('dev-pill', 'foreground-dark')))

    await page.emulateMedia({ colorScheme: 'dark' })
    await chooseTheme(page, 'Light')
    await expect(pill).toHaveCSS('background-color', rgbOf(designComponentColor('dev-pill', 'background')))
    await expect(pill).toHaveCSS('color', rgbOf(designComponentColor('dev-pill', 'foreground')))

    // System hands it back to the OS, which is dark now.
    await chooseTheme(page, 'System')
    await expect(pill).toHaveCSS('background-color', rgbOf(designComponentColor('dev-pill', 'background-dark')))
  })

  test('[P2] AC-6 the DEV pill is centered on the word "bookvie" and about 20px tall', async ({ page, server }) => {
    await page.goto(`${server.url}/catalog`)
    await expect(devPill(page)).toBeVisible()

    const box = await devPill(page).boundingBox()
    const word = await wordmark(page).evaluate((element) => {
      const text = Array.from(element.childNodes).find(
        (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').includes('bookvie'),
      )
      if (!text) throw new Error('no "bookvie" text node in the wordmark')
      const start = (text.textContent ?? '').indexOf('bookvie')
      const range = document.createRange()
      range.setStart(text, start)
      range.setEnd(text, start + 'bookvie'.length)
      const rect = range.getBoundingClientRect()
      return { top: rect.top, height: rect.height }
    })

    if (!box) throw new Error('the DEV pill has no box')
    expect(Math.abs(box.height - 20)).toBeLessThanOrEqual(1)
    expect(Math.abs(box.y + box.height / 2 - (word.top + word.height / 2))).toBeLessThanOrEqual(1)
  })

  test('[P1] AC-6 Tab from Skip to content to the Theme toggle never lands in the wordmark', async ({
    page,
    server,
  }) => {
    await page.goto(`${server.url}/catalog`)
    await expect(devPill(page)).toBeVisible()
    const theme = page.getByRole('group', { name: 'Theme' })

    const stops: string[] = []
    for (let press = 0; press < 30; press++) {
      await page.keyboard.press('Tab')
      const stop = await page.evaluate(() => {
        const active = document.activeElement
        return active ? `${active.localName}:${(active.textContent ?? '').trim()}` : ''
      })
      stops.push(stop)
      expect(await wordmark(page).evaluate((element) => element.contains(document.activeElement)), stop).toBe(false)
      if (await theme.evaluate((group) => group.contains(document.activeElement))) break
    }

    expect(stops[0]).toBe('a:Skip to content')
    expect(await theme.evaluate((group) => group.contains(document.activeElement)), stops.join(' → ')).toBe(true)
  })

  test('[P1] AC-6 a dev page passes axe in light and dark, and the banner reads "bookvie DEV"', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE] })
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await page.goto(`${server.url}/catalog`)
      await expect(devPill(page)).toBeVisible()

      const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()

      expect(violations.map(({ id, nodes }) => `${colorScheme}: ${id} (${nodes.length})`)).toEqual([])
      await expect(page.getByRole('banner')).toContainText('bookvie DEV')
    }
  })

  test('[P1] AC-8 after a failed app-info refetch, a client-side route change keeps the DEV prefix and the pill', async ({
    page,
    server,
  }) => {
    let failing = false
    await page.route('**/api/views/app-info', (route) =>
      failing ? route.fulfill({ status: 500, body: '' }) : route.continue(),
    )
    const seen = watchAppInfo(page)
    await page.goto(`${server.url}/`)
    await expect(devPill(page)).toBeVisible()
    await expect(page).toHaveTitle('DEV · Home — bookvie')

    failing = true
    const failures = () => seen.filter((answer) => answer.status === 500).length
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect.poll(failures).toBeGreaterThan(0)

    // A client-side navigation, not a reload: the last app-info stays.
    await mainNav(page).getByRole('link', { name: 'Catalog' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Catalog' })).toBeVisible()

    await expect(page).toHaveTitle('DEV · Catalog — bookvie')
    await expect(devPill(page)).toBeVisible()
  })

  test('[P2] AC-9 under forced colors in the dark scheme the DEV pill is Canvas with CanvasText text and a 1px CanvasText border', async ({
    page,
    server,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' })
    await page.goto(`${server.url}/catalog`)
    const pill = devPill(page)
    await expect(pill).toBeVisible()

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

test.describe('Story 11.2 Keep development apart from the real library, through Vite (automate)', () => {
  let vite: ViteDevServer | undefined

  test.afterEach(async () => {
    await vite?.close()
    vite = undefined
  })

  test('[P1] AC-6 a tab served by Vite shows the DEV pill and the "DEV · " title, read from the dev server', async ({
    page,
    server,
  }) => {
    const port = await freePort()
    // vite.config.ts with only the proxy target moved to this test's dev server (as dev-proxy.spec.ts does).
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
    const seen = watchAppInfo(page)

    await page.goto(`http://127.0.0.1:${port}/catalog`)

    await expect(page.getByRole('heading', { level: 1, name: 'Catalog' })).toBeVisible()
    await expect.poll(() => seen[0]?.body?.mode).toBe('dev')
    await expect(devPill(page)).toBeVisible()
    await expect(page).toHaveTitle('DEV · Catalog — bookvie')
  })
})

test.describe('Story 11.2 Keep development apart from the real library, on a production server (automate)', () => {
  test('[P2] AC-7 a production page under forced colors shows no DEV pill, no prefix and no dev amber', async ({
    page,
  }, testInfo) => {
    // This file's servers run --dev, so the production one is started here.
    const server = await startSeededServer(testInfo, 'production-forced-colors', { books: [DUNE] })
    try {
      const amber = [designComponentColor('favicon', 'dev-fill'), designComponentColor('favicon', 'dev-fill-dark')]
      const seen = watchAppInfo(page)

      for (const colorScheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme, forcedColors: 'active' })
        for (const [route, name] of ROUTES) {
          const answered = seen.length
          await page.goto(`${server.url}${route}`)
          await expect(mainNav(page)).toBeVisible()
          await expect.poll(() => seen.length).toBeGreaterThan(answered)
          await expect.poll(() => seen.at(-1)?.body?.mode).toBe('production')

          await expect(page).toHaveTitle(`${name} — bookvie`)
          await expect(devPill(page)).toHaveCount(0)
          expect(await elementsColored(page, amber), `${colorScheme} ${route}`).toEqual([])
        }
      }
    } finally {
      await server.stop()
      rmSync(server.dataDir, { recursive: true, force: true })
    }
  })
})
