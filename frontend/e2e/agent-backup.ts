// Helpers for e2e/agent-backup.spec.ts (Story 12.6, AC-6): the server's HOME,
// the account's real home, and the backups folders in it.

import { readdirSync, realpathSync, statSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { type Server, startServer } from './fixtures.ts'

// RED PHASE: `startServer` has no `home` option and `Server` no `home` yet
// (AC-6). This cast names what the build adds; the build removes it and calls
// `startServer` directly.
export type HomeServer = Server & { home: string }
export type StartOptions = Parameters<typeof startServer>[1] & { home?: string }
export const startWithHome = startServer as unknown as (dataDir: string, options: StartOptions) => Promise<HomeServer>

/** The account's own home, whatever `$HOME` says. */
export function realHome(): string {
  try {
    return os.userInfo().homedir
  } catch {
    return os.homedir()
  }
}

/** Each `bookvie-backups*` folder in `home`, with its names and modification time. */
export function backupFolders(home: string): string[] {
  return readdirSync(home)
    .filter((name) => name.startsWith('bookvie-backups'))
    .sort()
    .map((name) => {
      const folder = path.join(home, name)
      return `${name} ${statSync(folder).mtimeMs} ${readdirSync(folder).sort().join(',')}`
    })
}

/** Whether `child` is strictly inside `parent`, after resolving symlinks. */
export function inside(child: string, parent: string): boolean {
  const rel = path.relative(realpathSync(parent), realpathSync(child))
  return rel !== '' && rel.split(path.sep)[0] !== '..' && !path.isAbsolute(rel)
}
