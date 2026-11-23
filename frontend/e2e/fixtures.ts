// Worker-scoped `bookvie` server for the e2e suite.
//
// Each worker gets a free port and its own data dir under
// `$TMPDIR/bookvie-e2e/<run-id>/worker-<n>/`, checked by the path guard before
// anything is spawned. Tests that import `test` from here get `baseURL` set to
// their worker's server. `seedLibrary` pre-seeds a data dir before a server
// starts on it. Every server runs with a temporary `HOME` (Story 12.6), so
// nothing it writes under `~`, such as an agent's backup, reaches the
// account's real home.

import { test as base, type TestInfo } from '@playwright/test'
import { type ChildProcess, spawn, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
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
  /** The server's `HOME`: the one passed to `startServer`, or a temporary one it made. */
  home: string
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

let uvDirs: Record<string, string> | undefined

/**
 * The runner's own `UV_CACHE_DIR` and `UV_PYTHON_INSTALL_DIR`, so a server with
 * a temporary `HOME` keeps uv's warm cache and installed Pythons (as pytest's
 * `conftest._real_uv_dirs` does).
 */
function realUvDirs(): Record<string, string> {
  if (uvDirs !== undefined) return uvDirs
  const dirs: Record<string, string> = {}
  for (const [name, args] of [
    ['UV_CACHE_DIR', ['cache', 'dir']],
    ['UV_PYTHON_INSTALL_DIR', ['python', 'dir']],
  ] as const) {
    let value = process.env[name]
    if (!value) {
      const result = spawnSync('uv', args, { encoding: 'utf8', timeout: START_TIMEOUT_MS })
      if (result.status === 0) value = result.stdout.trim()
    }
    if (value) dirs[name] = value
  }
  uvDirs = dirs
  return dirs
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
 * server's stderr when it exits first. `fakeToday` (`YYYY-MM-DD`) starts it
 * with `--fake-today`; the test sets the browser clock to the same date (AD-20).
 * `home` is the server's `HOME`; without one, a temporary `HOME` is made beside
 * the data folder and removed by `stop()`.
 */
export async function startServer(
  dataDir: string,
  {
    port,
    dev = false,
    root = e2eRoot(),
    fakeToday,
    home,
  }: { port: number; dev?: boolean; root?: string; fakeToday?: string; home?: string },
): Promise<Server> {
  const dir = safeDataDir(dataDir, root) // before any spawn
  mkdirSync(dir, { recursive: true })
  let ownHome: string | undefined
  if (home === undefined) {
    // Beside the data folder, so a worker that dies before `stop()` leaves it in
    // the run folder, which global-teardown removes.
    ownHome = mkdtempSync(path.join(path.dirname(dir), 'home-'))
  } else {
    mkdirSync(home, { recursive: true })
  }
  const serverHome = home ?? ownHome!
  const args = ['run', '--project', BACKEND, 'bookvie', '--no-browser']
  if (dev) args.push('--dev')
  if (fakeToday !== undefined) args.push('--fake-today', fakeToday)
  args.push('--port', String(port), '--data-dir', dir)
  const env = { ...process.env, ...realUvDirs(), HOME: serverHome }
  const child = spawn('uv', args, { stdio: ['ignore', 'pipe', 'pipe'], env })
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
    if (ownHome !== undefined) rmSync(ownHome, { recursive: true, force: true })
    return stdout
  }

  const deadline = Date.now() + START_TIMEOUT_MS
  for (;;) {
    const failure = await Promise.race([
      spawnError,
      earlyExit,
      health(port).then((answer) => (answer?.app === 'bookvie' && answer.dataDir === dir ? null : undefined)),
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
  return { url: `http://127.0.0.1:${port}`, port, dataDir: dir, home: serverHome, stop }
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
  const result = spawnSync('uv', ['run', '--project', BACKEND, 'python', '-m', 'tests.builder', dir], {
    cwd: BACKEND,
    input: JSON.stringify(partial),
    encoding: 'utf8',
    timeout: START_TIMEOUT_MS,
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`seeding ${dir} failed (code ${result.status})\n${result.stderr}`)
  }
  return path.join(dir, 'library.json')
}

/**
 * Seeds `<run dir>/<name>-<test id>` with `partial`, writes each of `files`
 * (paths relative to the data dir, e.g. `local-state.json` or a cover) before
 * the server starts, then starts it, with `--fake-today` when `fakeToday` is
 * given and with `--dev` when `dev` is. Unlike `seededServer`, the caller stops
 * it and removes its data dir, in a `finally`.
 */
export async function startSeededServer(
  testInfo: TestInfo,
  name: string,
  partial: Record<string, unknown>,
  files: Record<string, string | Buffer> = {},
  { fakeToday, dev = false }: { fakeToday?: string; dev?: boolean } = {},
): Promise<Server> {
  const runId = process.env.BOOKVIE_E2E_RUN_ID
  if (!runId) throw new Error('BOOKVIE_E2E_RUN_ID is not set; run through playwright.config.ts')
  const dataDir = path.join(runDir(runId), `${name}-${testInfo.testId}`)
  rmSync(dataDir, { recursive: true, force: true })
  seedLibrary(dataDir, partial)
  for (const [relative, data] of Object.entries(files)) {
    const file = path.join(dataDir, relative)
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, data)
  }
  return startServer(dataDir, { port: await freePort(), fakeToday, dev })
}

type TestFixtures = {
  /**
   * Seeds a fresh data dir under the run folder with `seedLibrary` and starts
   * a server on it. Every server it started is stopped and its data dir
   * removed after the test; the test fails if one wrote to stdout.
   */
  seededServer: (partial?: Record<string, unknown>) => Promise<Server>
}

type WorkerFixtures = {
  /** Start the worker's server with `--dev` (Vite origin allowed). */
  serverDev: boolean
  server: Server
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  seededServer: async ({ serverDev }, provide, testInfo) => {
    const runId = process.env.BOOKVIE_E2E_RUN_ID
    if (!runId) throw new Error('BOOKVIE_E2E_RUN_ID is not set; run through playwright.config.ts')
    const servers: Server[] = []
    await provide(async (partial = {}) => {
      const dataDir = path.join(runDir(runId), `seeded-${testInfo.testId}-${servers.length}`)
      rmSync(dataDir, { recursive: true, force: true })
      seedLibrary(dataDir, partial)
      const server = await startServer(dataDir, { port: await freePort(), dev: serverDev })
      servers.push(server)
      return server
    })
    const noisy: string[] = []
    for (const server of servers) {
      const stdout = await server.stop()
      rmSync(server.dataDir, { recursive: true, force: true })
      if (stdout !== '') noisy.push(stdout)
    }
    if (noisy.length > 0) throw new Error(`bookvie wrote to stdout:\n${noisy.join('\n')}`)
  },
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
