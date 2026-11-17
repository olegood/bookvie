import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { noticeText, noticeVersion } from './updateNotice.ts'

describe('the update notice', () => {
  it('shows nothing when the server runs the bundle’s own version', () => {
    assert.equal(noticeVersion('1.1.0', '1.1.0'), undefined)
  })

  it('names a newer server version', () => {
    assert.equal(noticeVersion('1.1.0', '1.2.0'), '1.2.0')
  })

  it('names an older server version too (a rollback)', () => {
    assert.equal(noticeVersion('1.1.0', '1.0.0'), '1.0.0')
  })

  it('shows nothing while app-info is pending or has never loaded', () => {
    assert.equal(noticeVersion('1.1.0', undefined), undefined)
  })

  it('says which version the server runs and to reload', () => {
    assert.equal(noticeText('1.2.0'), 'bookvie was updated to 1.2.0. Reload to use it.')
  })
})
