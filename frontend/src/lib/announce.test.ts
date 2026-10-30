import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import { ANNOUNCE_DELAY_MS, announce, clearAnnouncements, registerRegion, type Region } from './announce.ts'

describe('announce', () => {
  let status: Region
  let alert: Region

  beforeEach(() => {
    mock.timers.enable({ apis: ['setTimeout'] })
    status = { textContent: 'old status' }
    alert = { textContent: 'old alert' }
    registerRegion('status', status)
    registerRegion('alert', alert)
  })

  afterEach(() => {
    clearAnnouncements()
    registerRegion('status', null)
    registerRegion('alert', null)
    mock.timers.reset()
  })

  it('empties both regions at once, then sets the text after the delay', () => {
    announce('alert', 'Not saved.')
    assert.equal(status.textContent, '')
    assert.equal(alert.textContent, '')

    mock.timers.tick(ANNOUNCE_DELAY_MS - 1)
    assert.equal(alert.textContent, '')
    mock.timers.tick(1)
    assert.equal(alert.textContent, 'Not saved.')
    assert.equal(status.textContent, '')
  })

  it('re-announces an identical message by emptying it first', () => {
    announce('status', 'Added Dune.')
    mock.timers.tick(ANNOUNCE_DELAY_MS)
    assert.equal(status.textContent, 'Added Dune.')

    announce('status', 'Added Dune.')
    assert.equal(status.textContent, '')
    mock.timers.tick(ANNOUNCE_DELAY_MS)
    assert.equal(status.textContent, 'Added Dune.')
  })

  it('clearAnnouncements empties both and cancels a pending message', () => {
    announce('alert', 'Not saved.')
    clearAnnouncements()
    mock.timers.tick(ANNOUNCE_DELAY_MS)
    assert.equal(alert.textContent, '')
    assert.equal(status.textContent, '')
  })

  it('a newer message replaces one still pending', () => {
    announce('status', 'First.')
    announce('alert', 'Second.')
    mock.timers.tick(ANNOUNCE_DELAY_MS)
    assert.equal(status.textContent, '')
    assert.equal(alert.textContent, 'Second.')
  })
})
