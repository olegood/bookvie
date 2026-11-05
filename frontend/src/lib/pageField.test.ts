import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { pageRangeMessage, pageSavedCopy, parsePage } from './pageField.ts'

describe('the page field', () => {
  it('takes a whole number from 0 to the page count, a lower one and 0 included', () => {
    assert.equal(parsePage('212', 330), 212)
    assert.equal(parsePage(' 0 ', 330), 0)
    assert.equal(parsePage('330', 330), 330)
    assert.equal(parsePage('007', 330), 7)
  })

  it('refuses empty, fractional, negative, too-large and non-numeric values', () => {
    for (const typed of ['', '   ', '212.5', '212.0', '-1', '331', '1e2', 'abc', '+5']) {
      assert.equal(parsePage(typed, 330), null, typed)
    }
  })

  it('words the range message and the saved line', () => {
    assert.equal(pageRangeMessage(330), 'Page must be between 0 and 330.')
    assert.equal(pageSavedCopy(212, 330, 64), 'Page 212 of 330, 64%.')
    assert.equal(pageSavedCopy(330, 330, 100), 'Page 330 of 330, 100%.')
  })
})
