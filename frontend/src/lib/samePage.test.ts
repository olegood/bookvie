import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isSamePageReplace, samePageState } from './page.ts'

describe('a same-page replace (AD-7)', () => {
  it('is a REPLACE carrying the marker', () => {
    assert.equal(isSamePageReplace('REPLACE', samePageState()), true)
  })

  it('is not a REPLACE without the marker', () => {
    assert.equal(isSamePageReplace('REPLACE', null), false)
    assert.equal(isSamePageReplace('REPLACE', undefined), false)
    assert.equal(isSamePageReplace('REPLACE', {}), false)
    assert.equal(isSamePageReplace('REPLACE', 'bookvieSamePage'), false)
  })

  it('is not a PUSH, even with the marker', () => {
    assert.equal(isSamePageReplace('PUSH', samePageState()), false)
    assert.equal(isSamePageReplace('PUSH', null), false)
  })

  it('ignores a marker that history.state brings back on Back, Forward or reload (POP)', () => {
    assert.equal(isSamePageReplace('POP', samePageState()), false)
    assert.equal(isSamePageReplace('POP', JSON.parse(JSON.stringify(samePageState()))), false)
  })

  it('gives a fresh marker each time', () => {
    assert.notEqual(samePageState(), samePageState())
    assert.deepEqual(samePageState(), samePageState())
  })
})
