#!/usr/bin/env node
// CI gate: the e2e run executed every test Playwright discovers. Run it after
// `npm --prefix frontend run e2e -- <args>` with the same <args> (--shard,
// --repeat-each, ...). It lists the tests for those args, reads the run's
// JUnit report, and exits 1 when the executed count (tests - skipped) differs
// from the expected count or is zero, so a suite that quietly stopped running
// part of itself fails instead of passing faster.
//
// Expected = discovered - declared skips. A declared skip is a leaf written as
// `test.skip(title, body)` (or inside `test.describe.skip`): the form the ATDD's
// red-phase leaves take, which Playwright already reports as skipped when it
// lists the tests. A pushed red-phase commit therefore stays green (Epic 17
// retro item 117). Any other skip still fails the count: a runtime
// `test.skip()` / `test.skip(condition)`, and `test.fixme`.

import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = fileURLToPath(new URL('..', import.meta.url))
const JUNIT = 'frontend/test-results/junit.xml'

const args = process.argv.slice(2)
const dir = mkdtempSync(join(tmpdir(), 'e2e-count-'))
const listFile = join(dir, 'list.json')
const list = spawnSync(
  'npm',
  ['--prefix', 'frontend', 'exec', '--', 'playwright', 'test', '--list', '--reporter=json', ...args],
  { cwd: REPO, encoding: 'utf8', env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: listFile } },
)
let report
try {
  report = JSON.parse(readFileSync(listFile, 'utf8'))
} catch {
  report = undefined
} finally {
  rmSync(dir, { recursive: true, force: true })
}
if (list.status !== 0 || !report || report.errors?.length) {
  console.error(`e2e-count: playwright test --list failed\n${list.stdout ?? ''}${list.stderr ?? ''}`)
  for (const error of report?.errors ?? []) console.error(error.message ?? error)
  process.exit(1)
}

let listed = 0
const declared = []
const walk = (suite) => {
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests) {
      listed += 1
      const skip = test.annotations.find((a) => a.type === 'skip')
      if (test.expectedStatus === 'skipped' && skip) declared.push(`${spec.file}:${skip.location?.line ?? spec.line}`)
    }
  }
  for (const child of suite.suites ?? []) walk(child)
}
for (const suite of report.suites) walk(suite)
const expected = listed - declared.length

const root = /<testsuites\b[^>]*>/.exec(readFileSync(`${REPO}/${JUNIT}`, 'utf8'))?.[0] ?? ''
const attr = (name) => Number(new RegExp(`\\b${name}="(\\d+)"`).exec(root)?.[1])
const executed = attr('tests') - attr('skipped')

console.error(
  `e2e-count: discovered ${listed}, declared skips ${declared.length}, expected ${expected}, executed ${executed} (${JUNIT})`,
)
for (const where of [...new Set(declared)]) console.error(`  declared skip: ${where}`)
if (!Number.isInteger(executed) || executed === 0 || executed !== expected) {
  console.error('e2e-count: executed count does not match the expected count')
  process.exit(1)
}
