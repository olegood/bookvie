// Contract drift: the check passes on fresh types and fails, naming the file,
// once they differ from what the backend models generate.

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { appendFileSync, copyFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { after, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const script = join(scriptsDir, 'api-contract.mjs')
const committed = resolve(scriptsDir, '../src/api/generated/schema.d.ts')

function check(target) {
  return spawnSync(process.execPath, [script], {
    encoding: 'utf8',
    env: { ...process.env, API_CONTRACT_TARGET: target },
  })
}

describe('api-contract check', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bookvie-api-contract-'))
  const target = join(dir, 'schema.d.ts')
  after(() => rmSync(dir, { recursive: true, force: true }))

  it('passes when the types match the backend models', () => {
    copyFileSync(committed, target)
    const result = check(target)
    assert.equal(result.status, 0, result.stderr)
  })

  it('fails naming the file when the types drift', () => {
    copyFileSync(committed, target)
    appendFileSync(target, 'export type Stray = true;\n')
    const result = check(target)
    assert.equal(result.status, 1)
    assert.match(result.stderr, /out of date/)
    assert.ok(result.stderr.includes(target), result.stderr)
  })
})
