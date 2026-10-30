// Data-dir path guard for every server the e2e suite starts (FND-UNIT-003).
//
// A data dir is accepted only when, after resolving symlinks, it lies strictly
// inside the e2e root. Refusing the real library (`~/bookvie-data`) is a
// separate check, so even a root set to `~` can never allow it.

import { lstatSync, realpathSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const LIBRARY_NAME = 'bookvie-data'

/** `$TMPDIR/bookvie-e2e`: every e2e run and worker folder lives under it. */
export function e2eRoot(): string {
  return path.join(os.tmpdir(), 'bookvie-e2e')
}

/** `<root>/<run-id>` for the current Playwright run. */
export function runDir(runId: string, root: string = e2eRoot()): string {
  if (!/^[A-Za-z0-9-]+$/.test(runId)) {
    throw new Error(`e2e guard: bad run id ${JSON.stringify(runId)}`)
  }
  return path.join(root, runId)
}

/**
 * `p` with every symlink in its existing part resolved. Missing trailing
 * segments are appended as written, so a folder that is about to be created
 * can be checked. A dangling symlink is refused: mkdir would follow it.
 */
function resolveReal(p: string): string {
  let current = path.resolve(p)
  const missing: string[] = []
  for (;;) {
    try {
      return path.join(realpathSync.native(current), ...missing)
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code !== 'ENOENT') throw error
    }
    if (lstatSync(current, { throwIfNoEntry: false })?.isSymbolicLink()) {
      throw new Error(`e2e guard: refusing data dir ${p}: ${current} is a dangling symlink`)
    }
    const parent = path.dirname(current)
    if (parent === current) return path.join(current, ...missing)
    missing.unshift(path.basename(current))
    current = parent
  }
}

/** True when `child` is `parent` itself or below it. */
function within(child: string, parent: string, ignoreCase = false): boolean {
  const a = ignoreCase ? child.toLowerCase() : child
  const b = ignoreCase ? parent.toLowerCase() : parent
  const rel = path.relative(b, a)
  return rel === '' || (rel.split(path.sep)[0] !== '..' && !path.isAbsolute(rel))
}

/** Every spelling of the real library: `$HOME` and the account's own home. */
function libraries(): string[] {
  const homes = new Set([os.homedir()])
  try {
    homes.add(os.userInfo().homedir)
  } catch {
    // No passwd entry; `$HOME` is still checked.
  }
  const found = new Set<string>()
  for (const home of homes) {
    const library = path.join(home, LIBRARY_NAME)
    found.add(path.resolve(library))
    found.add(resolveReal(library))
  }
  return [...found]
}

/**
 * The resolved data dir, or a thrown Error naming `dir` when it is not
 * strictly inside `root` or is (or is inside) the real library.
 */
export function safeDataDir(dir: string, root: string = e2eRoot()): string {
  const resolved = resolveReal(dir)
  for (const library of libraries()) {
    // Case-insensitive: macOS disks treat `~/Bookvie-Data` as the same folder.
    if (within(resolved, library, true) || within(path.resolve(dir), library, true)) {
      throw new Error(`e2e guard: refusing data dir ${dir}: it is the real library ${library}`)
    }
  }
  const resolvedRoot = resolveReal(root)
  if (resolved === resolvedRoot || !within(resolved, resolvedRoot)) {
    throw new Error(
      `e2e guard: refusing data dir ${dir} (resolves to ${resolved}): ` +
        `it must be strictly inside ${resolvedRoot}`,
    )
  }
  return resolved
}
