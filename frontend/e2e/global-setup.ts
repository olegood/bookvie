import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runDir, safeDataDir } from './guard.ts'

const FRONTEND = fileURLToPath(new URL('..', import.meta.url))
// The project's own Vite (never a global one), run with this Node on any platform.
const VITE = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))

/**
 * Builds the SPA the servers serve (backend/bookvie/http/static) once per
 * run, so a run started any way (`npx playwright test`,
 * `npm --prefix frontend run e2e`, CI) tests the checkout as it is when the
 * run starts (Epic 3 retro PL-2). UI mode and watch mode don't rebuild after
 * later edits. Vite only: the type check belongs to `check:api` and the root
 * `build`. A failed build fails the run.
 */
function buildSpa(): void {
  if (!existsSync(VITE)) throw new Error('e2e global setup: Vite is not installed; run `npm install` at the repo root')
  const result = spawnSync(process.execPath, [VITE, 'build', '--logLevel', 'warn'], { cwd: FRONTEND, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) {
    const how = result.signal ? `signal ${result.signal}` : `exit ${result.status}`
    throw new Error(`e2e global setup: vite build failed (${how})`)
  }
}

export default function globalSetup(): void {
  buildSpa()
  const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`
  mkdirSync(safeDataDir(runDir(runId)), { recursive: true })
  process.env.BOOKVIE_E2E_RUN_ID = runId
}
