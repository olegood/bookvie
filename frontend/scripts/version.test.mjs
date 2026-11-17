// Story 11.4 AC-1, the one version (AR34, AD-8): the bundle bakes its own
// version from frontend/package.json through a Vite `define`, declared for
// `tsc -b`, and `npm run check` (check:api runs this file) fails unless
// `bookvie.__version__`, backend/pyproject.toml, package.json and
// frontend/package.json hold the same version. A tab whose bundle and server
// disagree shows the update notice, so a hand edit or a merge that splits
// them would show a false notice in every tab.

import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { resolveConfig } from 'vite'

const frontend = resolve(fileURLToPath(new URL('..', import.meta.url)))
const repo = resolve(frontend, '..')
const VITE_CONFIG = join(frontend, 'vite.config.ts')
const SRC = join(frontend, 'src')

const read = (file) => readFileSync(file, 'utf8')
const packageVersion = (file) => JSON.parse(read(file)).version

/** `version = "…"` in pyproject.toml's `[project]` table. */
function pyprojectVersion() {
  const project = read(join(repo, 'backend', 'pyproject.toml'))
    .split(/^\[project\][ \t]*$/m)[1]
    ?.split(/^\[/m)[0]
  const match = project?.match(/^version\s*=\s*"([^"]+)"\s*$/m)
  if (!match) throw new Error('backend/pyproject.toml has no [project] version')
  return match[1]
}

/** `__version__ = "…"` in the backend package. */
function initVersion() {
  const match = read(join(repo, 'backend', 'bookvie', '__init__.py')).match(/^__version__\s*=\s*"([^"]+)"\s*$/m)
  if (!match) throw new Error('backend/bookvie/__init__.py has no __version__')
  return match[1]
}

/** The `define` keys of the resolved build config whose value is `version` as a JS string literal. */
export async function bakedVersionKeys(version, inlineConfig = { configFile: VITE_CONFIG }) {
  const config = await resolveConfig({ logLevel: 'silent', ...inlineConfig }, 'build')
  return Object.entries(config.define ?? {})
    .filter(([, value]) => value === JSON.stringify(version))
    .map(([key]) => key)
}

function sourceFiles(predicate) {
  return readdirSync(SRC, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && predicate(entry.name))
    .map((entry) => join(entry.parentPath, entry.name))
}

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

test('[P0] AC-1 the bundle bakes frontend/package.json’s version through a Vite define declared for tsc, and the four version copies agree', async () => {
  const version = packageVersion(join(frontend, 'package.json'))
  const keys = await bakedVersionKeys(version)

  // The criterion: one `define` bakes frontend/package.json's version.
  assert.equal(keys.length, 1, `vite build defines ${JSON.stringify(version)} under ${keys.length} keys, not 1`)

  const [key] = keys
  // Read from package.json, never typed into the config.
  assert.ok(!read(VITE_CONFIG).includes(version), `vite.config.ts spells the version ${version} itself`)
  // Declared so `tsc -b` knows its type.
  const declared = sourceFiles((name) => name.endsWith('.d.ts')).filter((file) =>
    new RegExp(`declare\\s+const\\s+${escape(key)}\\s*:\\s*string\\b`).test(read(file)),
  )
  assert.equal(declared.length, 1, `${key} is declared as a string in ${declared.length} .d.ts files under src, not 1`)
  // And the app reads it.
  const readers = sourceFiles((name) => /\.tsx?$/.test(name) && !/\.(d|test)\.ts$/.test(name)).filter((file) =>
    new RegExp(`\\b${escape(key)}\\b`).test(read(file)),
  )
  assert.ok(readers.length > 0, `no module under src reads ${key}`)

  // The four copies agree (AR34).
  assert.deepEqual(
    {
      'bookvie.__version__': initVersion(),
      'backend/pyproject.toml': pyprojectVersion(),
      'package.json': packageVersion(join(repo, 'package.json')),
      'frontend/package.json': version,
    },
    {
      'bookvie.__version__': version,
      'backend/pyproject.toml': version,
      'package.json': version,
      'frontend/package.json': version,
    },
    `the version copies disagree (${relative(repo, frontend)}/package.json has ${version})`,
  )
})
