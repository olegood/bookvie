// Story 12.6, AC-6: every bookvie server the e2e suite starts runs with a
// temporary HOME, so an agent's backup (export_backup) can never land in a
// real ~/bookvie-backups* folder. pytest's half is conftest.py's
// `_isolated_home` (Story 11.2), which every backend test already runs under.

import { existsSync, realpathSync, rmSync } from 'node:fs'
import path from 'node:path'
import { backupFolders, inside, realHome } from './agent-backup.ts'
import { e2eRoot, runDir } from './guard.ts'
import { expect, freePort, type Server, startServer, test } from './fixtures.ts'
import { callTool } from './library.ts'

const DAY = '2026-11-19'

test('[P0] AC-6 every e2e server runs with a temporary HOME, and no real ~/bookvie-backups* folder changes', async ({
  playwright,
}) => {
  const account = realHome()
  const before = backupFolders(account)
  const area = path.join(runDir(process.env.BOOKVIE_E2E_RUN_ID!), `agent-backup-${test.info().testId}`)
  const home = path.join(area, 'home')
  const api = await playwright.request.newContext()
  const servers: Server[] = []
  // The servers started without `home`: `stop()` must remove the HOME each one made.
  const ownHomes: Server[] = []
  try {
    // `<home>/bookvie-data` is `~/bookvie-data` only for a server whose HOME is `home`:
    // then its backups go to `~/bookvie-backups`, not to a sibling `bookvie-data-backups`.
    const atHome = await startServer(path.join(home, 'bookvie-data'), {
      port: await freePort(),
      fakeToday: DAY,
      home,
    })
    servers.push(atHome)
    const answer = await callTool(api, atHome, 'export_backup')
    const written = answer.structuredContent?.path
    // Compared resolved: `$TMPDIR` may sit behind a symlink (/var -> /private/var on macOS).
    const resolved = typeof written === 'string' && existsSync(written) ? realpathSync(written) : written

    expect(resolved, JSON.stringify(answer)).toBe(
      path.join(realpathSync(home), 'bookvie-backups', `bookvie-backup-${DAY}.zip`),
    )
    expect(atHome.home).toBe(home)
    expect(existsSync(path.join(home, 'bookvie-data-backups'))).toBe(false)

    // A server started as every spec starts one, with no `home`, still gets its own
    // temporary HOME under the e2e root, never the account's home.
    const plain = await startServer(path.join(area, 'library'), { port: await freePort() })
    servers.push(plain)
    ownHomes.push(plain)
    expect(typeof plain.home).toBe('string')
    expect(existsSync(plain.home)).toBe(true)
    expect(inside(plain.home, e2eRoot())).toBe(true)
    expect(realpathSync(plain.home)).not.toBe(realpathSync(account))

    // A `--dev` server (the `serverDev` option) gets one too.
    const dev = await startServer(path.join(area, 'dev-library'), { port: await freePort(), dev: true })
    servers.push(dev)
    ownHomes.push(dev)
    expect(inside(dev.home, e2eRoot())).toBe(true)
    expect(dev.home).not.toBe(plain.home)
  } finally {
    for (const server of servers) await server.stop()
    await api.dispose()
    rmSync(area, { recursive: true, force: true })
  }
  // `stop()` removes every temporary HOME it made.
  for (const server of ownHomes) expect(existsSync(server.home)).toBe(false)
  // Nothing in the account's real home changed: no backups folder created, none touched.
  expect(backupFolders(account)).toEqual(before)
})
