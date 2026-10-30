import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { runDir, safeDataDir } from './guard.ts'

// One folder per run: workers put their data dirs in `<root>/<run-id>/worker-<n>/`.
// Workers start after this and inherit the environment variable.
export default function globalSetup(): void {
  const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`
  mkdirSync(safeDataDir(runDir(runId)), { recursive: true })
  process.env.BOOKVIE_E2E_RUN_ID = runId
}
