import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { rowCapacity, sliceRows } from './slice.ts'

describe('rowCapacity', () => {
  it('fits floor((W + gap) / (spine + gap)) spines', () => {
    // 10 spines of 28px with 9 gaps of 4px take exactly 316px.
    assert.equal(rowCapacity(316, 28, 4), 10)
    assert.equal(rowCapacity(315.9, 28, 4), 9)
    assert.equal(rowCapacity(1000, 28, 4), 31)
  })

  it('is at least 1, even on a sliver', () => {
    assert.equal(rowCapacity(0, 28, 4), 1)
    assert.equal(rowCapacity(10, 28, 4), 1)
  })
})

/** "b00" … "bNN": `count` ids in bookcase order. */
const shelf = (count: number) => Array.from({ length: count }, (_, n) => `b${String(n).padStart(2, '0')}`)

describe('sliceRows', () => {
  const ids = shelf(20) // rows of 4: b00–b03, b04–b07, …, b16–b19

  it('shows Main’s row first, then Up next’s and a finish’s in bookcase order (full priority)', () => {
    assert.deepEqual(sliceRows(ids, 4, ['b17', 'b05', 'b10', 'b01'], 'b17'), [
      ['b16', 'b17', 'b18', 'b19'],
      ['b04', 'b05', 'b06', 'b07'],
      ['b08', 'b09', 'b10', 'b11'],
    ])
  })

  it('puts every row in bookcase order without a Main book', () => {
    assert.deepEqual(sliceRows(ids, 4, ['b17', 'b05', 'b10'], null), [
      ['b04', 'b05', 'b06', 'b07'],
      ['b08', 'b09', 'b10', 'b11'],
      ['b16', 'b17', 'b18', 'b19'],
    ])
  })

  it('fills from the first bookcase rows when fewer rows qualify', () => {
    assert.deepEqual(sliceRows(ids, 4, ['b13'], 'b13'), [
      ['b12', 'b13', 'b14', 'b15'],
      ['b00', 'b01', 'b02', 'b03'],
      ['b04', 'b05', 'b06', 'b07'],
    ])
    assert.deepEqual(sliceRows(ids, 4, ['b02'], 'b02'), [
      ['b00', 'b01', 'b02', 'b03'],
      ['b04', 'b05', 'b06', 'b07'],
      ['b08', 'b09', 'b10', 'b11'],
    ])
    assert.deepEqual(sliceRows(ids, 4, [], null).length, 3)
  })

  it('counts a row once when Main and Up next share it, and lets the next priority fill', () => {
    assert.deepEqual(sliceRows(ids, 4, ['b09', 'b10', 'b18', 'b01'], 'b09'), [
      ['b08', 'b09', 'b10', 'b11'],
      ['b00', 'b01', 'b02', 'b03'],
      ['b16', 'b17', 'b18', 'b19'],
    ])
  })

  it('shows a partial last row alone and first when it holds the Main book', () => {
    const odd = shelf(10) // rows of 4: b00–b03, b04–b07, b08–b09
    assert.deepEqual(sliceRows(odd, 4, ['b09'], 'b09'), [
      ['b08', 'b09'],
      ['b00', 'b01', 'b02', 'b03'],
      ['b04', 'b05', 'b06', 'b07'],
    ])
  })

  it('shows every row when the library fits in fewer than 3', () => {
    assert.deepEqual(sliceRows(shelf(3), 4, ['b02'], 'b02'), [['b00', 'b01', 'b02']])
    assert.deepEqual(sliceRows(shelf(6), 4, ['b05'], 'b05'), [
      ['b04', 'b05'],
      ['b00', 'b01', 'b02', 'b03'],
    ])
  })

  it('answers no rows for an empty shelf and ignores ids that are not on it', () => {
    assert.deepEqual(sliceRows([], 4, ['gone'], 'gone'), [])
    assert.deepEqual(sliceRows(shelf(2), 4, ['gone', 'b01'], 'gone'), [['b00', 'b01']])
  })

  it('treats a capacity under 1 as 1', () => {
    assert.deepEqual(sliceRows(shelf(3), 0, ['b02'], 'b02'), [['b02'], ['b00'], ['b01']])
  })
})
