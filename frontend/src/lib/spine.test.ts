import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { nearestVisible, spineHeight } from './spine.ts'

describe('spineHeight', () => {
  it('starts at 120 for an empty label', () => {
    assert.equal(spineHeight(0), 120)
  })

  it('rounds up to the 8px step', () => {
    // The step boundary is w = 80 / 3 ≈ 26.667: 120 + 0.3 × 26.7 = 128.01.
    assert.equal(spineHeight(26.66), 128)
    assert.equal(spineHeight(26.67), 136)
    assert.equal(spineHeight(26.8), 136)
    assert.equal(spineHeight(53.3), 136)
    assert.equal(spineHeight(53.4), 144)
  })

  it('caps at 200', () => {
    assert.equal(spineHeight(240), 192)
    assert.equal(spineHeight(240.1), 200)
    assert.equal(spineHeight(266.7), 200)
    assert.equal(spineHeight(1000), 200)
  })
})

describe('nearestVisible', () => {
  const ids = ['a', 'b', 'c', 'd', 'e']
  const only = (...shown: string[]) => (id: string) => shown.includes(id)

  it('keeps the stop when it is visible', () => {
    assert.equal(nearestVisible(ids, 2, only('a', 'c')), 'c')
  })

  it('moves to the nearest visible id', () => {
    assert.equal(nearestVisible(ids, 2, only('b', 'e')), 'b')
    assert.equal(nearestVisible(ids, 2, only('a', 'd')), 'd')
    assert.equal(nearestVisible(ids, 0, only('e')), 'e')
    assert.equal(nearestVisible(ids, 4, only('a')), 'a')
  })

  it('prefers the previous id on a tie', () => {
    assert.equal(nearestVisible(ids, 2, only('b', 'd')), 'b')
    assert.equal(nearestVisible(ids, 2, only('a', 'e')), 'a')
  })

  it('returns null when nothing is visible', () => {
    assert.equal(nearestVisible(ids, 2, only()), null)
    assert.equal(nearestVisible([], 0, only()), null)
  })
})
