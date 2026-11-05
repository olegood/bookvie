import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { gaugePageLine, gaugeTicks, gaugeValueText } from './gauge.ts'

describe('the gauge copy', () => {
  it('reads the server percentage with the page', () => {
    assert.equal(gaugeValueText(64, 212, 330), '64%, page 212 of 330')
    assert.equal(gaugePageLine(212, 330), 'p.212 of 330')
  })

  it('puts ticks at 0, the rounded half and the total, without the half under 4 pages', () => {
    assert.deepEqual(gaugeTicks(330), [0, 165, 330])
    assert.deepEqual(gaugeTicks(331), [0, 166, 331])
    assert.deepEqual(gaugeTicks(4), [0, 2, 4])
    assert.deepEqual(gaugeTicks(3), [0, 3])
    assert.deepEqual(gaugeTicks(1), [0, 1])
  })
})
