import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { BookDetailView } from '../api/index.ts'
import { detailOffersFinish, finishedStatus } from './markFinished.ts'

const reading = { purpose: null } as unknown as NonNullable<BookDetailView['currentReading']>

describe('finishedStatus', () => {
  it('names the finished Book', () => {
    assert.equal(finishedStatus('Neuromancer'), 'Finished Neuromancer.')
  })
})

describe('detailOffersFinish', () => {
  it('is offered for the Main book', () => {
    assert.equal(detailOffersFinish({ role: 'main', currentReading: reading, finished: false }), true)
    assert.equal(detailOffersFinish({ role: 'main', currentReading: reading, finished: true }), true)
  })

  it('is offered for a Book with a Reading in progress, whatever its role', () => {
    assert.equal(detailOffersFinish({ role: 'upNext', currentReading: reading, finished: false }), true)
    assert.equal(detailOffersFinish({ role: 'waiting', currentReading: reading, finished: true }), true)
    assert.equal(detailOffersFinish({ role: null, currentReading: reading, finished: true }), true)
  })

  it('is offered for a Book never finished, even with no Reading', () => {
    assert.equal(detailOffersFinish({ role: null, currentReading: null, finished: false }), true)
    assert.equal(detailOffersFinish({ role: 'upNext', currentReading: null, finished: false }), true)
  })

  it('is not offered for a finished Book with no Reading in progress, Up next or not', () => {
    assert.equal(detailOffersFinish({ role: null, currentReading: null, finished: true }), false)
    assert.equal(detailOffersFinish({ role: 'upNext', currentReading: null, finished: true }), false)
  })
})
