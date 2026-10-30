// FND-UNIT-003: the e2e data-dir guard. Pure path checks; no server starts.

import { test, expect } from '@playwright/test'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { e2eRoot, safeDataDir } from './guard.ts'

let root: string
let outside: string

test.beforeEach(() => {
  root = mkdtempSync(path.join(os.tmpdir(), 'bookvie-guard-root-'))
  outside = mkdtempSync(path.join(os.tmpdir(), 'bookvie-guard-outside-'))
})

test.afterEach(() => {
  rmSync(root, { recursive: true, force: true })
  rmSync(outside, { recursive: true, force: true })
})

test('the root is $TMPDIR/bookvie-e2e', () => {
  expect(e2eRoot()).toBe(path.join(os.tmpdir(), 'bookvie-e2e'))
})

test('accepts a worker folder inside the root, created or not', () => {
  const dir = path.join(root, 'run-1', 'worker-0')
  expect(safeDataDir(dir, root)).toBe(path.join(realpathSync.native(root), 'run-1', 'worker-0'))
  mkdirSync(dir, { recursive: true })
  expect(safeDataDir(dir, root)).toBe(realpathSync.native(dir))
})

for (const [name, dir] of [
  ['an unrelated temp path', () => path.join(outside, 'x')],
  ['/tmp/x', () => '/tmp/x'],
  ['the root itself', () => root],
  ['the root with a trailing slash', () => `${root}/`],
  ['a path that climbs out with ..', () => path.join(root, '..', 'x')],
  ['a path that climbs out from below', () => `${root}/run/../../x`],
  ['a sibling that shares the root as a prefix', () => `${root}-evil/worker-0`],
] as const) {
  test(`refuses ${name}`, () => {
    const target = dir()
    expect(() => safeDataDir(target, root)).toThrow(target)
  })
}

test('refuses a symlink that points out of the root', () => {
  mkdirSync(path.join(root, 'run'))
  const link = path.join(root, 'run', 'link')
  symlinkSync(outside, link)
  const dir = path.join(link, 'worker-0')
  expect(() => safeDataDir(dir, root)).toThrow(dir)
  expect(() => safeDataDir(link, root)).toThrow(link)
})

test('refuses a dangling symlink inside the root', () => {
  const link = path.join(root, 'dangling')
  symlinkSync(path.join(outside, 'missing'), link)
  expect(() => safeDataDir(link, root)).toThrow(link)
  expect(() => safeDataDir(path.join(link, 'worker-0'), root)).toThrow(link)
})

test('accepts a symlink that stays inside the root', () => {
  mkdirSync(path.join(root, 'real'))
  symlinkSync(path.join(root, 'real'), path.join(root, 'alias'))
  expect(safeDataDir(path.join(root, 'alias', 'w'), root)).toBe(
    path.join(realpathSync.native(root), 'real', 'w'),
  )
})

test.describe('the real library', () => {
  const home = os.homedir()
  const library = path.join(home, 'bookvie-data')

  for (const [name, dir] of [
    ['~/bookvie-data', library],
    ['~/bookvie-data/', `${library}/`],
    ['a folder inside it', path.join(library, 'covers')],
    ['a deeper folder inside it', path.join(library, 'a', 'b')],
    ['a different case on a case-insensitive disk', path.join(home, 'Bookvie-Data')],
    ['a path that reaches it through ..', path.join(home, 'x', '..', 'bookvie-data')],
  ] as const) {
    test(`is refused even when the root is ~: ${name}`, () => {
      expect(() => safeDataDir(dir, home)).toThrow(dir)
      expect(() => safeDataDir(dir, '/')).toThrow(/real library/)
    })
  }

  test('is refused through a symlink inside the root', () => {
    const link = path.join(root, 'lib')
    symlinkSync(library, link)
    expect(() => safeDataDir(link, root)).toThrow(link)
    expect(() => safeDataDir(path.join(link, 'covers'), root)).toThrow(link)
  })

  test('is refused through a symlink to an existing library', () => {
    const savedHome = process.env.HOME
    const fakeHome = mkdtempSync(path.join(os.tmpdir(), 'bookvie-guard-home-'))
    try {
      mkdirSync(path.join(fakeHome, 'bookvie-data'))
      process.env.HOME = fakeHome
      const link = path.join(root, 'lib')
      symlinkSync(path.join(fakeHome, 'bookvie-data'), link)
      expect(() => safeDataDir(link, root)).toThrow(/real library/)
      expect(() => safeDataDir(path.join(link, 'covers'), root)).toThrow(/real library/)
    } finally {
      if (savedHome === undefined) delete process.env.HOME
      else process.env.HOME = savedHome
      rmSync(fakeHome, { recursive: true, force: true })
    }
  })

  test('a neighbour of the library is not mistaken for it when the root allows it', () => {
    expect(safeDataDir(path.join(root, 'bookvie-data'), root)).toBe(
      path.join(realpathSync.native(root), 'bookvie-data'),
    )
  })
})
