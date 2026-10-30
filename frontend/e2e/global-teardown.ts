import { rmSync } from 'node:fs'
import { runDir, safeDataDir } from './guard.ts'

export default function globalTeardown(): void {
  const runId = process.env.BOOKVIE_E2E_RUN_ID
  if (!runId) return
  rmSync(safeDataDir(runDir(runId)), { recursive: true, force: true })
}
