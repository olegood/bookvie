// Worker-scoped `bookvie` server for the e2e suite.
//
// Each worker gets a free port and its own data dir under
// `$TMPDIR/bookvie-e2e/<run-id>/worker-<n>/`, checked by the path guard before
// anything is spawned. Tests that import `test` from here get `baseURL` set to
// their worker's server. `seedLibrary` pre-seeds a data dir before a server
// starts on it.

import { test as base } from '@playwright/test'
import { type ChildProcess, spawn, spawnSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { e2eRoot, runDir, safeDataDir } from './guard.ts'

const BACKEND = fileURLToPath(new URL('../../backend', import.meta.url))
const START_TIMEOUT_MS = 60_000
const STOP_TIMEOUT_MS = 15_000

export type Server = {
  url: string
  port: number
  dataDir: string
  /** Sends SIGTERM, waits for exit and returns everything written to stdout. */
  stop: () => Promise<string>
}

export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer()
    probe.unref()
    probe.on('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address() as net.AddressInfo
      probe.close(() => resolve(port))
    })
  })
}

function exited(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve()
  return new Promise((resolve) => child.once('exit', () => resolve()))
}

async function health(port: number): Promise<{ app?: string; dataDir?: string } | null> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
      signal: AbortSignal.timeout(1_000),
    })
    return response.ok ? ((await response.json()) as { app?: string; dataDir?: string }) : null
  } catch {
    return null
  }
}

/**
 * Starts `bookvie` on `dataDir`, which must pass the guard against `root`.
 * Resolves once `/api/health` answers for this folder; rejects with the
 * server's stderr when it exits first.
 */
export async function startServer(
  dataDir: string,
  { port, dev = false, root = e2eRoot() }: { port: number; dev?: boolean; root?: string },
): Promise<Server> {
  const dir = safeDataDir(dataDir, root) // before any spawn
  mkdirSync(dir, { recursive: true })
  const args = ['run', '--project', BACKEND, 'bookvie', '--no-browser']
  if (dev) args.push('--dev')
  args.push('--port', String(port), '--data-dir', dir)
  const child = spawn('uv', args, { stdio: ['ignore', 'pipe', 'pipe'] })
  let stdout = ''
  let stderr = ''
  child.stdout!.setEncoding('utf8').on('data', (chunk: string) => (stdout += chunk))
  child.stderr!.setEncoding('utf8').on('data', (chunk: string) => (stderr += chunk))
  const spawnError = new Promise<Error>((resolve) => child.once('error', resolve))
  const earlyExit = exited(child).then(
    () => new Error(`bookvie exited (code ${child.exitCode}) before answering health`),
  )

  const stop = async (): Promise<string> => {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM')
      const timer = setTimeout(() => child.kill('SIGKILL'), STOP_TIMEOUT_MS)
      await exited(child)
      clearTimeout(timer)
    }
    return stdout
  }

  const deadline = Date.now() + START_TIMEOUT_MS
  for (;;) {
    const failure = await Promise.race([
      spawnError,
      earlyExit,
      health(port).then((answer) =>
        answer?.app === 'bookvie' && answer.dataDir === dir ? null : undefined,
      ),
    ])
    if (failure === null) break
    if (failure instanceof Error) {
      await stop()
      throw new Error(`${failure.message}\n--- bookvie stderr ---\n${stderr}`)
    }
    if (Date.now() > deadline) {
      await stop()
      throw new Error(`bookvie never answered health on port ${port}\n--- stderr ---\n${stderr}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return { url: `http://127.0.0.1:${port}`, port, dataDir: dir, stop }
}

/**
 * Writes `<dataDir>/library.json` from a partial camelCase library, with
 * every missing field filled in by the backend's `LibraryBuilder`
 * (`python -m tests.builder`). The data dir must pass the guard against `root`.
 */
export function seedLibrary(
  dataDir: string,
  partial: Record<string, unknown> = {},
  { root = e2eRoot() }: { root?: string } = {},
): string {
  const dir = safeDataDir(dataDir, root) // before any spawn
  const result = spawnSync(
    'uv',
    ['run', '--project', BACKEND, 'python', '-m', 'tests.builder', dir],
    { cwd: BACKEND, input: JSON.stringify(partial), encoding: 'utf8', timeout: START_TIMEOUT_MS },
  )
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`seeding ${dir} failed (code ${result.status})\n${result.stderr}`)
  }
  return path.join(dir, 'library.json')
}

type WorkerFixtures = {
  /** Start the worker's server with `--dev` (Vite origin allowed). */
  serverDev: boolean
  server: Server
}

export const test = base.extend<{}, WorkerFixtures>({
  serverDev: [false, { scope: 'worker', option: true }],
  server: [
    // `provide`, not `use`: the React hooks lint rule reads `use` as a hook.
    // It returns once the worker's tests are done, failed or not.
    async ({ serverDev }, provide, workerInfo) => {
      const runId = process.env.BOOKVIE_E2E_RUN_ID
      if (!runId) throw new Error('BOOKVIE_E2E_RUN_ID is not set; run through playwright.config.ts')
      const dataDir = path.join(runDir(runId), `worker-${workerInfo.workerIndex}`)
      const server = await startServer(dataDir, { port: await freePort(), dev: serverDev })
      await provide(server)
      const stdout = await server.stop()
      rmSync(server.dataDir, { recursive: true, force: true })
      if (stdout !== '') throw new Error(`bookvie wrote to stdout:\n${stdout}`)
    },
    { scope: 'worker', timeout: START_TIMEOUT_MS + STOP_TIMEOUT_MS },
  ],
  baseURL: async ({ server }, provide) => {
    await provide(server.url)
  },
})

export { expect } from '@playwright/test'
