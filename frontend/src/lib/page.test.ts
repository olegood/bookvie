import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { pageTitle } from './page.ts'

describe('the page title', () => {
  it('is "Page — bookvie" in production and while app-info is pending or failed', () => {
    assert.equal(pageTitle('Catalog', 'production'), 'Catalog — bookvie')
    assert.equal(pageTitle('Catalog', undefined), 'Catalog — bookvie')
  })

  it('gets "DEV · " in front on a dev server, Book detail included', () => {
    assert.equal(pageTitle('Catalog', 'dev'), 'DEV · Catalog — bookvie')
    assert.equal(pageTitle('Dune', 'dev'), 'DEV · Dune — bookvie')
  })
})
