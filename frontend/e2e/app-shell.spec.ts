// Story 1.6 app shell, ATDD red phase: tokens, top nav, theme toggle,
// landmarks, live regions, shared primitives, motion and minimum width.
// Each test stays skipped until the task that implements it un-skips it.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'
import { test, expect } from './fixtures.ts'

const DESIGN_MD = fileURLToPath(
  new URL('../../_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md', import.meta.url),
)

const TYPOGRAPHY_PROPS: Record<string, string> = {
  fontFamily: 'family',
  fontSize: 'size',
  fontWeight: 'weight',
  lineHeight: 'line-height',
  letterSpacing: 'letter-spacing',
}

type Tokens = { light: Map<string, string>; dark: Map<string, string> }

/**
 * Every primitive in DESIGN.md frontmatter as the custom property tokens.css
 * names it (`--color-*`, `--font-<role>-*`, `--radius-*`, `--space-*`), with
 * its light value and, for colors with a `-dark` twin, its dark value.
 */
function designTokens(): Tokens {
  const frontmatter = readFileSync(DESIGN_MD, 'utf8').split(/^---$/m)[1]
  const light = new Map<string, string>()
  const dark = new Map<string, string>()
  let section = ''
  let role = ''
  for (const line of frontmatter.split('\n')) {
    if (/^\s*(#|$)/.test(line)) continue
    const top = line.match(/^(\w[\w-]*):\s*$/)
    if (top) {
      section = top[1]
      continue
    }
    const entry = line.match(/^( +)'?([\w-]+)'?:\s*(.*)$/)
    if (!entry) continue
    const [, indent, key, raw] = entry
    const value = raw.replace(/^'(.*)'$/, '$1')
    if (section === 'colors') {
      if (key.endsWith('-dark')) dark.set(`--color-${key.slice(0, -'-dark'.length)}`, value)
      else light.set(`--color-${key}`, value)
    } else if (section === 'typography') {
      if (indent.length === 2) role = key
      else light.set(`--font-${role}-${TYPOGRAPHY_PROPS[key]}`, value)
    } else if (section === 'rounded') {
      light.set(`--radius-${key}`, value)
    } else if (section === 'spacing') {
      light.set(`--space-${key}`, value)
    }
  }
  return { light, dark }
}

// DESIGN.md → Elevation & Depth keeps shadows and the scrim as literal values;
// these are the custom properties tokens.css gives them.
const ELEVATION = {
  light: {
    '--shadow-cover': '0 14px 30px rgba(60,80,100,.18)',
    '--shadow-overlay': '0 18px 40px rgba(40,40,30,.18), 0 2px 6px rgba(40,40,30,.08)',
    '--shadow-plank': '0 6px 10px rgba(120,100,60,.12)',
    '--color-scrim': 'rgba(43,46,42,0.24)',
  },
  dark: {
    '--shadow-cover': '0 14px 30px rgba(0,0,0,.45)',
    '--shadow-overlay': '0 18px 40px rgba(0,0,0,.5)',
    '--shadow-plank': '0 6px 10px rgba(0,0,0,.35)',
    '--color-scrim': 'rgba(25,27,24,0.60)',
  },
}

function customProperties(page: Page, names: string[]): Promise<Record<string, string>> {
  return page.evaluate((props) => {
    const style = getComputedStyle(document.documentElement)
    return Object.fromEntries(props.map((name) => [name, style.getPropertyValue(name).trim()]))
  }, names)
}

const squash = (values: Record<string, string>) =>
  Object.fromEntries(Object.entries(values).map(([name, value]) => [name, value.replace(/\s+/g, ' ')]))

const catalogHeading = (page: Page) => page.getByRole('heading', { level: 1, name: 'Catalog' })

test.describe('Story 1.6 app shell (ATDD)', () => {
  test.skip('[P1] AC-1 every DESIGN.md token is a CSS custom property, and UI text is sans', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    await expect(catalogHeading(page)).toBeVisible()

    expect(squash(await customProperties(page, Object.keys(ELEVATION.light)))).toEqual(ELEVATION.light)

    const { light, dark } = designTokens()
    expect(light.size).toBeGreaterThan(100)
    expect(await customProperties(page, [...light.keys()])).toEqual(Object.fromEntries(light))

    await page.emulateMedia({ colorScheme: 'dark' })
    expect(await customProperties(page, [...dark.keys()])).toEqual(Object.fromEntries(dark))
    expect(squash(await customProperties(page, Object.keys(ELEVATION.dark)))).toEqual(ELEVATION.dark)

    // No book titles render on an empty shelf, so nothing may use the serif stack.
    const serif = await page.evaluate(() =>
      Array.from(document.querySelectorAll('body *'))
        .filter((el) => getComputedStyle(el).fontFamily.startsWith('ui-serif'))
        .map((el) => el.tagName),
    )
    expect(serif).toEqual([])
    await expect(catalogHeading(page)).toHaveCSS('font-family', /^system-ui/)
  })

  test.skip('[P0] AC-2 the top nav shows Skip to content, the wordmark and only Catalog, marked current', async ({ page }) => {
    await page.goto('/')

    const nav = page.getByRole('banner').getByRole('navigation')
    await expect(nav.getByRole('link', { name: 'Catalog', exact: true })).toHaveAttribute('aria-current', 'page')
    for (const later of ['Home', 'Stats', 'Card notes', 'Backup']) {
      await expect(nav.getByRole('link', { name: later, exact: true })).toHaveCount(0)
    }
    await expect(page.getByRole('banner')).toContainText('bookvie')
    await expect(catalogHeading(page)).toBeVisible()

    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Skip to content' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('main')).toBeFocused()
  })

  test.skip('[P0] AC-3 the theme toggle switches instantly, follows the OS on System and is remembered', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    const theme = page.getByRole('group', { name: 'Theme' })
    const body = page.locator('body')

    await theme.getByRole('button', { name: 'Dark', exact: true }).click()
    await expect(body).toHaveCSS('background-color', 'rgb(25, 27, 24)')
    await expect(theme.getByRole('button', { name: 'Dark', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(theme.getByRole('button', { name: 'Light', exact: true })).toHaveAttribute('aria-pressed', 'false')
    await expect(theme.getByRole('button', { name: 'System', exact: true })).toHaveAttribute('aria-pressed', 'false')

    await page.reload()
    await expect(body).toHaveCSS('background-color', 'rgb(25, 27, 24)')
    await expect(theme.getByRole('button', { name: 'Dark', exact: true })).toHaveAttribute('aria-pressed', 'true')

    await theme.getByRole('button', { name: 'System', exact: true }).click()
    await expect(body).toHaveCSS('background-color', 'rgb(246, 244, 239)')
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(body).toHaveCSS('background-color', 'rgb(25, 27, 24)')

    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(theme.getByRole('button', { name: 'System', exact: true })).toHaveAttribute('aria-pressed', 'true')
  })

  test.skip('[P1] AC-4 each route has header, nav and main, one h1, its title, and focus on the h1 after navigating', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('Catalog — bookvie')
    await expect(page.getByRole('banner').getByRole('navigation')).toBeVisible()
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)

    await page.goto('/no/such/page')
    await page.getByRole('link', { name: 'Back to the catalog' }).click()
    await expect(catalogHeading(page)).toBeFocused()
    await expect(page).toHaveTitle('Catalog — bookvie')
  })

  test.skip('[P1] AC-5 every page holds one status and one alert region', async ({ page }) => {
    await page.goto('/')
    await expect(catalogHeading(page)).toBeVisible()
    await expect(page.getByRole('status')).toHaveCount(1)
    await expect(page.getByRole('alert')).toHaveCount(1)
  })

  test.skip('[P2] AC-9 button-primary, link and the focus ring match DESIGN.md', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    const newBook = page.getByRole('button', { name: 'New book' }).first()

    await expect(newBook).toHaveCSS('background-color', 'rgb(85, 112, 89)')
    await expect(newBook).toHaveCSS('color', 'rgb(255, 255, 255)')
    await expect(newBook).toHaveCSS('border-radius', '9px')
    await expect(newBook).toHaveCSS('height', '42px')

    await newBook.focus()
    await expect(newBook).toHaveCSS('outline', 'rgb(85, 112, 89) solid 2px')
    await expect(newBook).toHaveCSS('outline-offset', '2px')

    await page.goto('/no/such/page')
    const link = page.getByRole('link', { name: 'Back to the catalog' })
    await expect(link).toHaveCSS('color', 'rgb(85, 112, 89)')
    await expect(link).toHaveCSS('text-underline-offset', '3px')
  })

  test.skip('[P1] AC-10 reduced motion turns every transition and animation off', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(catalogHeading(page)).toBeVisible()

    // A probe that asks for motion inline; the reduced-motion rules must win.
    const seconds = await page.evaluate(() => {
      const probe = document.createElement('div')
      probe.style.transition = 'opacity 150ms ease-out'
      probe.style.animation = 'probe 600ms ease-out'
      document.querySelector('main')!.append(probe)
      const style = getComputedStyle(probe)
      const longest = (list: string) => Math.max(...list.split(',').map((value) => parseFloat(value)))
      const result = { transition: longest(style.transitionDuration), animation: longest(style.animationDuration) }
      probe.remove()
      return result
    })
    expect(seconds.transition).toBeLessThanOrEqual(0.001)
    expect(seconds.animation).toBeLessThanOrEqual(0.001)
  })

  test.skip('[P2] AC-11 below 1024px the page scrolls horizontally instead of reflowing', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 700 })
    await page.goto('/')
    await expect(catalogHeading(page)).toBeVisible()

    const width = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(width).toBeGreaterThanOrEqual(1024)
    expect((await page.getByRole('banner').boundingBox())?.width).toBeGreaterThanOrEqual(1024)
  })
})
