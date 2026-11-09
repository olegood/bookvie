import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  detailOffersSetUpNext,
  popoverOffersSetUpNext,
  REPLACES_UP_NEXT,
  SETTING_UP_NEXT,
  upNextStatus,
} from './setUpNext.ts'

describe('upNextStatus', () => {
  it('names the Book now Up next', () => {
    assert.equal(upNextStatus('Fahrenheit 451'), 'Fahrenheit 451 is Up next.')
  })
})

describe('copy', () => {
  it('pins the hint and the busy reason', () => {
    assert.equal(REPLACES_UP_NEXT, 'Replaces the current Up next.')
    assert.equal(SETTING_UP_NEXT, 'Setting the book as Up next.')
  })
})

describe('detailOffersSetUpNext', () => {
  it('is offered for every role but Main and Up next', () => {
    assert.equal(detailOffersSetUpNext(null), true)
    assert.equal(detailOffersSetUpNext('waiting'), true)
    assert.equal(detailOffersSetUpNext('main'), false)
    assert.equal(detailOffersSetUpNext('upNext'), false)
  })
})

describe('popoverOffersSetUpNext', () => {
  it('is offered only for a never-read Book with no role', () => {
    assert.equal(popoverOffersSetUpNext({ role: null, finished: false }), true)
    assert.equal(popoverOffersSetUpNext({ role: null, finished: true }), false)
    assert.equal(popoverOffersSetUpNext({ role: 'waiting', finished: false }), false)
    assert.equal(popoverOffersSetUpNext({ role: 'upNext', finished: false }), false)
    assert.equal(popoverOffersSetUpNext({ role: 'main', finished: false }), false)
  })
})
