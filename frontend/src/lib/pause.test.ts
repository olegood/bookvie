import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { displacementLine, pausedStatus, pauseHeading } from './pause.ts'

describe('pauseHeading', () => {
  it("states the Main book's page and the server's percent", () => {
    assert.equal(pauseHeading('Dune', 150, 58), 'Pause Dune at p.150 (58%)?')
    assert.equal(pauseHeading('Emma', 0, 0), 'Pause Emma at p.0 (0%)?')
  })
})

describe('displacementLine', () => {
  it('sends a paused Up next to Waiting for you', () => {
    assert.equal(displacementLine({ title: 'Neuromancer', paused: true }), 'Neuromancer moves to Waiting for you.')
  })

  it('returns an unstarted Up next to the catalog', () => {
    assert.equal(displacementLine({ title: 'Emma', paused: false }), 'Emma returns to the catalog.')
  })
})

describe('pausedStatus', () => {
  it('says where the Book went', () => {
    assert.equal(pausedStatus('Dune', 150), "Paused Dune at p.150. It's Up next.")
  })
})
