// Story 11.2 Keep development apart from the real library, on a production
// server and in the source.
//
// A production server, once `app-info` says so, shows no DEV pill, no
// `DEV · ` prefix and no dev amber (AC-7). AC-10 and AC-11 read the source
// files. The dev-server leaves are in dev-mode.spec.ts.
//
// ATDD red phase: every leaf is `test.skip` until the build lands what it
// checks; the build removes each skip as its criterion turns green.

import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from './fixtures.ts'
import { SOURCE_FAVICON } from './favicon.ts'
import {
  FRONTEND_SRC,
  README,
  ROUTES,
  SOURCE_FAVICON_DEV,
  TOKENS_CSS,
  designComponentColor,
  devPill,
  elementsColored,
  mainNav,
  readText,
  watchAppInfo,
} from './dev-mode.ts'
import { DUNE } from './home.ts'

test.describe('Story 11.2 Keep development apart from the real library, on a production server (ATDD)', () => {
  test.skip('[P1] AC-7 on a production server, once app-info says production, there is no DEV pill, titles are "Page — bookvie" and nothing is dev amber', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE] })
    const amber = [designComponentColor('favicon', 'dev-fill'), designComponentColor('favicon', 'dev-fill-dark')]
    const seen = watchAppInfo(page)
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(`${server.url}/`)
    await expect(mainNav(page)).toBeVisible()

    await expect.poll(() => seen[0]?.body?.mode).toBe('production')

    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme })
      for (const [route, name] of ROUTES) {
        const answered = seen.length
        await page.goto(`${server.url}${route}`)
        await expect(mainNav(page)).toBeVisible()
        await expect.poll(() => seen.length).toBeGreaterThan(answered)
        await expect(page).toHaveTitle(`${name} — bookvie`)
        await expect(devPill(page)).toHaveCount(0)
        expect(await elementsColored(page, amber), `${scheme} ${route}`).toEqual([])
      }
    }
  })
})

test.describe('Story 11.2 Keep development apart from the real library, in the source (ATDD)', () => {
  test.skip('[P2] AC-10 dev amber lives as literals in favicon-dev.svg and the pill CSS Module, never in tokens.css or anywhere else in the source', () => {
    const amber = [designComponentColor('favicon', 'dev-fill'), designComponentColor('favicon', 'dev-fill-dark')]
    const has = (text: string, hex: string) => text.toLowerCase().includes(hex.toLowerCase())
    const files = readdirSync(FRONTEND_SRC, { recursive: true, encoding: 'utf8' })
      .map((file) => path.join(FRONTEND_SRC, file))
      .filter((file) => statSync(file).isFile())
    const modules = files.filter(
      (file) => file.endsWith('.module.css') && amber.every((hex) => has(readText(file), hex)),
    )

    expect(modules.map((file) => path.relative(FRONTEND_SRC, file))).toHaveLength(1)

    const elsewhere = files.filter((file) => !modules.includes(file) && amber.some((hex) => has(readText(file), hex)))
    expect(elsewhere.map((file) => path.relative(FRONTEND_SRC, file))).toEqual([])
    expect(amber.some((hex) => has(readText(TOKENS_CSS), hex))).toBe(false)
    expect(amber.every((hex) => has(readText(SOURCE_FAVICON_DEV), hex))).toBe(true)
    expect(amber.some((hex) => has(readText(SOURCE_FAVICON), hex))).toBe(false)
  })

  test.skip('[P2] AC-11 the README says bookvie --dev --no-browser uses ~/bookvie-data-dev on 8766 and refuses the real library, npm run dev proxies to 8766, and never says to stop a normal bookvie first', () => {
    const readme = readText(README)
    const paragraph = (label: string) =>
      readme.split(/\n[ \t]*\n/).find((block) => block.startsWith(`**${label}:**`)) ?? ''
    const development = paragraph('Development')

    expect(development).toContain('~/bookvie-data-dev')

    expect(development).toContain('bookvie --dev --no-browser')
    expect(development).toContain('8766')
    expect(development).toMatch(/real library/i)
    expect(development).toMatch(/npm run dev[\s\S]*prox[\s\S]*8766/)
    const options = paragraph('Options')
    expect(options).toContain('~/bookvie-data-dev')
    expect(options).toContain('8766')
    expect(readme).not.toMatch(/stop any normal `?bookvie`? first/i)
  })
})
