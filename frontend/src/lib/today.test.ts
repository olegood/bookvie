import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatToday } from './today.ts'

describe('formatToday', () => {
  it('reads the local date as "Weekday, D Month" with no year', () => {
    assert.equal(formatToday(new Date(2026, 9, 28, 10, 0)), 'Wednesday, 28 October')
    assert.equal(formatToday(new Date(2026, 0, 1, 0, 0)), 'Thursday, 1 January')
    // A minute before local midnight is still that day.
    assert.equal(formatToday(new Date(2026, 11, 31, 23, 59)), 'Thursday, 31 December')
  })
})
