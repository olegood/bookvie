// Shared helpers: a headless Chromium from the repo's own Playwright (frontend/node_modules),
// always closed when the work is done, even on error.
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
export const repoRoot = path.resolve(here, '../../../../..')
const require = createRequire(path.join(repoRoot, 'frontend', 'package.json'))
const { chromium } = require('playwright')

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'

/** Runs `work(page)` in a hidden browser and closes the browser afterwards, whatever happens. */
export async function withHeadlessPage(work) {
  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({ userAgent: USER_AGENT, locale: 'en-US' })
    const page = await context.newPage()
    page.setDefaultTimeout(15000)
    return await work(page)
  } finally {
    await browser.close()
  }
}

/** Prints the result as JSON and sets the exit code; errors become {"outcome":"error"}. */
export async function run(main) {
  try {
    const result = await main()
    process.stdout.write(JSON.stringify(result, null, 1) + '\n')
    process.exitCode = result?.exitCode ?? 0
  } catch (error) {
    process.stdout.write(JSON.stringify({ outcome: 'error', message: String(error?.message ?? error) }, null, 1) + '\n')
    process.exitCode = 1
  }
}
