// The server fixture's failure path: a bookvie that exits before answering
// health fails the fixture with its captured stderr.

import { existsSync } from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { runDir } from './guard.ts'
import { expect, startServer, test } from './fixtures.ts'

test('a server that dies before health fails with its stderr', async () => {
  const blocker = net.createServer()
  await new Promise<void>((resolve) => blocker.listen(0, '127.0.0.1', resolve))
  const { port } = blocker.address() as net.AddressInfo
  const dataDir = path.join(runDir(process.env.BOOKVIE_E2E_RUN_ID!), `dies-${test.info().workerIndex}`)
  try {
    await expect(startServer(dataDir, { port })).rejects.toThrow(
      new RegExp(`exited \\(code 1\\)[\\s\\S]*port ${port} is in use by another program`),
    )
  } finally {
    blocker.close()
  }
  expect(existsSync(path.join(dataDir, 'bookvie.lock'))).toBe(false)
})

test('the guard runs before anything is spawned', async () => {
  const outside = '/tmp/bookvie-e2e-should-not-exist'
  await expect(startServer(outside, { port: 1 })).rejects.toThrow(outside)
  expect(existsSync(outside)).toBe(false)
})
