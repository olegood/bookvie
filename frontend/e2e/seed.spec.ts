// A data dir seeded with LibraryBuilder before the server starts is served as
// is: the server loads it without rewriting a byte.

import { test, expect } from '@playwright/test'
import { readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { runDir } from './guard.ts'
import { freePort, seedLibrary, startServer } from './fixtures.ts'

test('a seeded per-test server starts and leaves library.json byte-identical', async () => {
  const dataDir = path.join(runDir(process.env.BOOKVIE_E2E_RUN_ID!), `seed-${test.info().workerIndex}`)
  rmSync(dataDir, { recursive: true, force: true })
  const library = seedLibrary(dataDir, {
    books: [
      { id: 'dune', title: 'Dune', authors: ['Frank Herbert'], pages: 412, readings: [{ currentPage: 120 }] },
      { title: 'Cien años de soledad', authors: ['Gabriel García Márquez'], pages: 417 },
    ],
    mainBookId: 'dune',
  })
  const before = readFileSync(library)
  expect(JSON.parse(before.toString('utf8')).books).toHaveLength(2)

  const server = await startServer(dataDir, { port: await freePort() })
  try {
    const health = await fetch(`${server.url}/api/health`)
    expect(((await health.json()) as { dataDir: string }).dataDir).toBe(server.dataDir)
    expect(readFileSync(library).equals(before)).toBe(true)
  } finally {
    expect(await server.stop()).toBe('')
  }
  expect(readFileSync(library).equals(before)).toBe(true)
  rmSync(dataDir, { recursive: true, force: true })
})

test('seeding refuses a data dir outside the e2e root', () => {
  expect(() => seedLibrary('/tmp/bookvie-e2e-should-not-exist', {})).toThrow(
    '/tmp/bookvie-e2e-should-not-exist',
  )
})
