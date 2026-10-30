#!/usr/bin/env node
// CI gate: the e2e run executed every test Playwright discovers. Run it after
// `npm --prefix frontend run e2e -- <args>` with the same <args> (--shard,
// --repeat-each, ...). It lists the tests for those args, reads the run's
// JUnit report, and exits 1 when the executed count (tests - skipped) differs
// or is zero, so a suite that quietly stopped running part of itself fails
// instead of passing faster.

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const REPO = fileURLToPath(new URL('..', import.meta.url))
const JUNIT = 'frontend/test-results/junit.xml'

const args = process.argv.slice(2)
const list = spawnSync('npm', ['--prefix', 'frontend', 'exec', '--', 'playwright', 'test', '--list', ...args], {
  cwd: REPO,
  encoding: 'utf8',
})
const listed = Number(/^Total: (\d+) tests?/m.exec(list.stdout ?? '')?.[1])
if (list.status !== 0 || !Number.isInteger(listed)) {
  console.error(`e2e-count: playwright test --list failed\n${list.stdout ?? ''}${list.stderr ?? ''}`)
  process.exit(1)
}

const root = /<testsuites\b[^>]*>/.exec(readFileSync(`${REPO}/${JUNIT}`, 'utf8'))?.[0] ?? ''
const attr = (name) => Number(new RegExp(`\\b${name}="(\\d+)"`).exec(root)?.[1])
const executed = attr('tests') - attr('skipped')

console.error(`e2e-count: discovered ${listed}, executed ${executed} (${JUNIT})`)
if (!Number.isInteger(executed) || executed === 0 || executed !== listed) {
  console.error('e2e-count: executed count does not match the discovered count')
  process.exit(1)
}
