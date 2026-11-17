import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { AppInfoView } from '../api/views.ts'
import { folderLine, versionLine } from './aboutThisCopy.ts'

const production: AppInfoView = { version: '1.1.0', mode: 'production', dataDir: '~/bookvie-data', commit: null }
const dev: AppInfoView = { version: '1.1.0', mode: 'dev', dataDir: '~/bookvie-data-dev', commit: 'a1b2c3d' }

describe('the About this copy lines', () => {
  it('reads "bookvie <version>" in production', () => {
    assert.equal(versionLine(production), 'bookvie 1.1.0')
  })

  it('never shows a commit in production, even when one is sent', () => {
    assert.equal(versionLine({ ...production, version: '1.2.0', commit: 'a1b2c3d' }), 'bookvie 1.2.0')
  })

  it('adds the commit and " · Development server" on a dev server', () => {
    assert.equal(versionLine(dev), 'bookvie 1.1.0 (a1b2c3d) · Development server')
  })

  it('has no brackets on a dev server without a commit', () => {
    assert.equal(versionLine({ ...dev, commit: null }), 'bookvie 1.1.0 · Development server')
  })

  it('reads the version it is given on a dev server', () => {
    assert.equal(versionLine({ ...dev, version: '2.0.0' }), 'bookvie 2.0.0 (a1b2c3d) · Development server')
  })

  it('gives the data folder verbatim', () => {
    const long = `/private/var/folders/${'x'.repeat(150)}/bookvie-data`
    assert.equal(folderLine(production), 'Data folder: ~/bookvie-data')
    assert.equal(folderLine({ ...production, dataDir: long }), `Data folder: ${long}`)
  })
})
