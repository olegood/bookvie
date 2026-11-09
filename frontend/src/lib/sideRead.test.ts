import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  detailOffersSideRead,
  MARKING_SIDE_READ,
  REMOVING_FROM_SIDE,
  SIDE_READS_FULL_HINT,
  sideReadLabel,
  sideReadStatus,
} from './sideRead.ts'

describe('sideReadStatus', () => {
  it('says whether the Book is on or off the side', () => {
    assert.equal(sideReadStatus('Kindred', true), 'Kindred is on the side.')
    assert.equal(sideReadStatus('Kindred', false), 'Kindred is off the side.')
  })
})

describe('sideReadLabel', () => {
  it('names the action the press takes', () => {
    assert.equal(sideReadLabel(false), 'Mark as Side read')
    assert.equal(sideReadLabel(true), 'Remove from side')
  })
})

describe('copy', () => {
  it('pins the hint and the busy reasons', () => {
    assert.equal(SIDE_READS_FULL_HINT, 'Up to 3 side reads.')
    assert.equal(MARKING_SIDE_READ, 'Marking the book as a Side read.')
    assert.equal(REMOVING_FROM_SIDE, 'Removing the book from the side.')
  })
})

describe('detailOffersSideRead', () => {
  it('is offered for every role but Main', () => {
    assert.equal(detailOffersSideRead(null), true)
    assert.equal(detailOffersSideRead('waiting'), true)
    assert.equal(detailOffersSideRead('upNext'), true)
    assert.equal(detailOffersSideRead('main'), false)
  })
})
