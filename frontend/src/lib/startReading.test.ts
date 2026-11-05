import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { detailPrimary, popoverStart } from './startReading.ts'

describe('detailPrimary', () => {
  it('is none for the Main book, Resume when paused, else Start reading', () => {
    assert.equal(detailPrimary({ role: 'main' }), null)
    assert.equal(detailPrimary({ role: 'waiting' }), 'Resume')
    assert.equal(detailPrimary({ role: 'upNext' }), 'Start reading')
    assert.equal(detailPrimary({ role: null }), 'Start reading')
  })
})

describe('popoverStart', () => {
  it('offers Start reading only for a Book never started and never finished', () => {
    assert.equal(popoverStart({ role: null, finished: false }), 'Start reading')
    assert.equal(popoverStart({ role: null, finished: true }), null)
  })

  it('offers nothing for an Up next Book, finished or not, until Epic 4', () => {
    assert.equal(popoverStart({ role: 'upNext', finished: false }), null)
    assert.equal(popoverStart({ role: 'upNext', finished: true }), null)
  })

  it('offers Resume for a paused Book, re-read included, and nothing for the Main book', () => {
    assert.equal(popoverStart({ role: 'waiting', finished: false }), 'Resume')
    assert.equal(popoverStart({ role: 'waiting', finished: true }), 'Resume')
    assert.equal(popoverStart({ role: 'main', finished: false }), null)
  })
})
