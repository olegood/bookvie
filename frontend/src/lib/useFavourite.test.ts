import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { favouriteStatus } from './useFavourite.ts'

describe('favouriteStatus', () => {
  it('says the Book is a favourite once starred', () => {
    assert.equal(favouriteStatus('Dune', true), 'Dune is a favourite.')
  })

  it('says the Book is not a favourite once unstarred', () => {
    assert.equal(favouriteStatus('Dune', false), 'Dune is not a favourite.')
  })
})
