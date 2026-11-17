// Story 11.1 A favicon for bookvie: test automation after the story was done,
// beside the ATDD leaves in favicon.spec.ts. The served icon drawn at tab size
// (16×16) keeps its three spines and plank apart and takes Chromium's scheme,
// the raw index.html of every route links it once, and forced colors leave its
// fill alone. HEAD, the not-built 404, the foreign-Host 403 and the wheel are
// in backend/tests (test_app.py, test_wheel_build.py); the smoke body check is
// in scripts/smoke.mjs.

import { test, expect } from './fixtures.ts'
import { designColor, faviconRaster, svgFill } from './favicon.ts'
import { rgbOf } from './library.ts'

/** Tab size in device pixels (deviceScaleFactor 1). */
const TAB_SIZE = 16
/** At 16 px the drawing's x halves: spines at 1.5–5.5, 6.25–10.25 and 11–14.5, plank 0.5–15.5 from y 13. */
const SPINE_COLUMNS = [2, 3, 4, 7, 8, 9, 12, 13]
const GAP_COLUMNS = [5, 10]
/** Rows where all three spines stand full height, above the half-covered row 12. */
const SPINE_ROWS = [7, 8, 9, 10, 11]
const PLANK_ROWS = [13, 14]
const PLANK_COLUMNS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
/** Anything below this alpha lets the tab strip show through. */
const SEE_THROUGH = 160

test.describe('Story 11.1 A favicon for bookvie (automate)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`[P2] AC-1 drawn at 16×16 under the ${scheme} scheme, the three spines and the plank stay apart in one flat fill`, async ({
      page,
    }) => {
      const fill = rgbOf(designColor(scheme === 'light' ? 'accent' : 'accent-dark'))
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto('/')
      await expect(page.getByRole('banner').getByRole('navigation')).toBeVisible()

      const { alpha, opaqueColors } = await faviconRaster(page, '/favicon.svg', TAB_SIZE)

      // The tab strip rasterizes the icon in Chromium's scheme, in one flat fill.
      expect(opaqueColors).toEqual([fill])
      for (const y of SPINE_ROWS) {
        expect(
          SPINE_COLUMNS.map((x) => alpha[y][x]),
          `row ${y}, spine columns`,
        ).toEqual(SPINE_COLUMNS.map(() => 255))
        for (const x of GAP_COLUMNS) expect(alpha[y][x], `row ${y}, gap column ${x}`).toBeLessThan(SEE_THROUGH)
      }
      // The spines stand on the plank without merging into it.
      for (const x of PLANK_COLUMNS) expect(alpha[12][x], `row 12, column ${x}`).toBeLessThan(SEE_THROUGH)
      for (const y of PLANK_ROWS) {
        expect(
          PLANK_COLUMNS.map((x) => alpha[y][x]),
          `plank row ${y}`,
        ).toEqual(PLANK_COLUMNS.map(() => 255))
      }
      // A clear frame: nothing in the top and bottom rows, nor the side columns above the plank.
      expect(Math.max(...alpha[0], ...alpha[TAB_SIZE - 1])).toBe(0)
      expect(Math.max(...SPINE_ROWS.map((y) => Math.max(alpha[y][0], alpha[y][TAB_SIZE - 1])))).toBe(0)
    })
  }

  test('[P2] AC-2 the served index.html of every route holds exactly one icon link, before any script runs', async ({
    request,
  }) => {
    for (const route of ['/', '/catalog', '/backup', '/no-such-page']) {
      const response = await request.get(route)
      expect(response.status(), route).toBe(200)
      expect(response.headers()['content-type'], route).toMatch(/^text\/html/)
      const html = await response.text()
      const head = html.split(/<\/head>/i)[0]

      expect(html.match(/<link\b[^>]*\brel\s*=\s*["'][^"']*icon/gi), route).toHaveLength(1)
      expect(head, route).toContain('<link rel="icon" href="/favicon.svg" type="image/svg+xml" />')
      expect(html, route).not.toMatch(/\.ico\b|\.png\b|apple-touch/i)
    }
  })

  test('[P3] AC-5 under forced colors the served favicon keeps its accent fill in both schemes', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' })
    await page.goto('/favicon.svg')

    await expect.poll(() => svgFill(page)).toBe(rgbOf(designColor('accent')))

    await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' })
    await expect.poll(() => svgFill(page)).toBe(rgbOf(designColor('accent-dark')))
  })
})
