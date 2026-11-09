import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { displacementLine, displacementOutcome, pausedStatus, pauseHeading } from './pause.ts'

describe('pauseHeading', () => {
  it("states the Main book's page and the server's percent", () => {
    assert.equal(pauseHeading('Dune', 150, 58), 'Pause Dune at p.150 (58%)?')
    assert.equal(pauseHeading('Emma', 0, 0), 'Pause Emma at p.0 (0%)?')
  })
})

describe('displacementLine', () => {
  it('sends a paused Up next to Waiting for you', () => {
    assert.equal(
      displacementLine({ title: 'Neuromancer', paused: true, sideRead: false }),
      'Neuromancer moves to Waiting for you.',
    )
  })

  it('sends a paused Side read to Waiting for you too', () => {
    assert.equal(
      displacementLine({ title: 'Neuromancer', paused: true, sideRead: true }),
      'Neuromancer moves to Waiting for you.',
    )
  })

  it('returns an unstarted Up next to the catalog', () => {
    assert.equal(displacementLine({ title: 'Emma', paused: false, sideRead: false }), 'Emma returns to the catalog.')
  })

  it('keeps a not-paused Side read on the side', () => {
    assert.equal(displacementLine({ title: 'Emma', paused: false, sideRead: true }), 'Emma stays on the side.')
  })
})

describe('displacementOutcome', () => {
  it('is the text after the title, for each state', () => {
    assert.equal(displacementOutcome({ paused: true, sideRead: false }), 'moves to Waiting for you.')
    assert.equal(displacementOutcome({ paused: true, sideRead: true }), 'moves to Waiting for you.')
    assert.equal(displacementOutcome({ paused: false, sideRead: false }), 'returns to the catalog.')
    assert.equal(displacementOutcome({ paused: false, sideRead: true }), 'stays on the side.')
  })
})

describe('pausedStatus', () => {
  it('says where the Book went', () => {
    assert.equal(pausedStatus('Dune', 150), "Paused Dune at p.150. It's Up next.")
  })
})
