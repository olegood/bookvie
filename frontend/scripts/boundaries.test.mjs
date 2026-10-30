// Story 1.6 boundaries: pages reach the server only through `src/api/` (no raw
// fetch), and no `data-testid` leaks into markup or specs (e2e/README.md).

import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const frontend = resolve(fileURLToPath(new URL('..', import.meta.url)))

function sources(dir, { tests }) {
  return readdirSync(join(frontend, dir), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name) && (tests || !/\.test\./.test(entry.name)))
    .map((entry) => join(entry.parentPath, entry.name))
    .filter((file) => !file.includes(`${sep}generated${sep}`))
    .map((file) => ({
      file: relative(frontend, file).split(sep).join('/'),
      source: readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\/|(^|[^:])\/\/.*$/gm, '$1'),
    }))
}

const NETWORK = /\bfetch\s*\(|\bXMLHttpRequest\b|\bEventSource\b|\bWebSocket\b|\bsendBeacon\b/
const TEST_ID = /data-testid|getByTestId|testIdAttribute/

describe('frontend boundaries', () => {
  it('[P1] only src/api/ talks to the server', () => {
    const callers = sources('src', { tests: false })
      .filter(({ source }) => NETWORK.test(source))
      .map(({ file }) => file)

    assert.ok(callers.includes('src/api/views.ts'), 'the API layer was scanned')
    assert.deepEqual(callers.filter((file) => !file.startsWith('src/api/')), [])
  })

  it('[P1] no data-testid in src/ or e2e/', () => {
    const scanned = [...sources('src', { tests: true }), ...sources('e2e', { tests: true })]

    assert.ok(scanned.some(({ file }) => file === 'e2e/app-shell.spec.ts'), 'the e2e specs were scanned')
    assert.deepEqual(scanned.filter(({ source }) => TEST_ID.test(source)).map(({ file }) => file), [])
  })
})
