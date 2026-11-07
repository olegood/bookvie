import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { detailPrimary, popoverStart, upNextStart } from './startReading.ts'

const READING = { status: 'upNext', startDate: null, currentPage: 120, percent: 29, purpose: null } as const

describe('detailPrimary', () => {
  it('is none for the Main book, Resume when paused, else Start reading', () => {
    assert.equal(detailPrimary({ role: 'main', currentReading: { ...READING, status: 'main' } }), null)
    assert.equal(detailPrimary({ role: 'waiting', currentReading: { ...READING, status: 'waiting' } }), 'Resume')
    assert.equal(detailPrimary({ role: null, currentReading: null }), 'Start reading')
  })

  it('is Resume for a paused Up next and Start reading for one with no Reading in progress', () => {
    assert.equal(detailPrimary({ role: 'upNext', currentReading: READING }), 'Resume')
    assert.equal(detailPrimary({ role: 'upNext', currentReading: null }), 'Start reading')
  })
})

describe('popoverStart', () => {
  it('offers Start reading only for a Book never started and never finished', () => {
    assert.equal(popoverStart({ role: null, finished: false, currentPage: null }), 'Start reading')
    assert.equal(popoverStart({ role: null, finished: true, currentPage: null }), null)
  })

  it('offers Resume for a paused Up next, and Start reading for one never started or finished', () => {
    assert.equal(popoverStart({ role: 'upNext', finished: false, currentPage: 120 }), 'Resume')
    assert.equal(popoverStart({ role: 'upNext', finished: true, currentPage: 40 }), 'Resume')
    assert.equal(popoverStart({ role: 'upNext', finished: false, currentPage: null }), 'Start reading')
    assert.equal(popoverStart({ role: 'upNext', finished: true, currentPage: null }), 'Start reading')
  })

  it('offers Resume for a paused Book, re-read included, and nothing for the Main book', () => {
    assert.equal(popoverStart({ role: 'waiting', finished: false, currentPage: 120 }), 'Resume')
    assert.equal(popoverStart({ role: 'waiting', finished: true, currentPage: 40 }), 'Resume')
    assert.equal(popoverStart({ role: 'main', finished: false, currentPage: 212 }), null)
  })
})

describe('upNextStart', () => {
  it('is Resume for a paused Up next, else Start reading', () => {
    assert.equal(upNextStart({ paused: true }), 'Resume')
    assert.equal(upNextStart({ paused: false }), 'Start reading')
  })
})
