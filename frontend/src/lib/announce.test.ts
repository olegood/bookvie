import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import {
  ANNOUNCE_DELAY_MS,
  adoptRegions,
  announce,
  clearAnnouncements,
  regionHost,
  registerRegion,
  releaseRegions,
  resetRegionHost,
  type Region,
  type RegionParent,
} from './announce.ts'

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

describe('region host', () => {
  type FakeNode = { parent: FakeParent | null }
  type FakeParent = { name: string; children: FakeNode[]; appendChild(node: FakeNode): void }

  function parent(name: string): FakeParent {
    const self: FakeParent = {
      name,
      children: [],
      appendChild(node) {
        if (node.parent) node.parent.children = node.parent.children.filter((child) => child !== node)
        node.parent = self
        self.children.push(node)
      },
    }
    return self
  }

  let body: FakeParent
  let created: number
  const doc = () =>
    ({
      body,
      createElement: () => {
        created += 1
        return { parent: null }
      },
    }) as unknown as Document

  beforeEach(() => {
    resetRegionHost()
    body = parent('body')
    created = 0
  })

  afterEach(() => resetRegionHost())

  it('creates one host at the end of the body and returns it on every call', () => {
    const host = regionHost(doc())
    assert.equal(regionHost(doc()), host)
    assert.equal(created, 1)
    assert.deepEqual(body.children, [host])
  })

  it('moves the host into a dialog and back to the body', () => {
    const host = regionHost(doc()) as unknown as FakeNode
    const dialog = parent('dialog')

    adoptRegions(dialog as unknown as RegionParent)
    assert.equal(host.parent, dialog)
    assert.deepEqual(body.children, [])

    releaseRegions()
    assert.equal(host.parent, body)
    assert.deepEqual(dialog.children, [])
  })

  it('follows the topmost modal and returns to the one below when it closes', () => {
    const host = regionHost(doc()) as unknown as FakeNode
    const panel = parent('panel')
    const dialog = parent('dialog')

    adoptRegions(panel as unknown as RegionParent)
    adoptRegions(dialog as unknown as RegionParent)
    assert.equal(host.parent, dialog)

    releaseRegions()
    assert.equal(host.parent, panel)
    assert.deepEqual(dialog.children, [])

    releaseRegions()
    assert.equal(host.parent, body)
  })

  it('releases a named modal wherever it is in the stack', () => {
    const host = regionHost(doc()) as unknown as FakeNode
    const panel = parent('panel')
    const dialog = parent('dialog')
    adoptRegions(panel as unknown as RegionParent)
    adoptRegions(dialog as unknown as RegionParent)

    // The panel unmounts first: the dialog keeps the regions.
    releaseRegions(panel as unknown as RegionParent)
    assert.equal(host.parent, dialog)
    releaseRegions(dialog as unknown as RegionParent)
    assert.equal(host.parent, body)
    // Releasing a modal that holds nothing changes nothing.
    releaseRegions(dialog as unknown as RegionParent)
    assert.equal(host.parent, body)
  })

  it('does nothing before the host exists', () => {
    const dialog = parent('dialog')
    adoptRegions(dialog as unknown as RegionParent)
    releaseRegions()
    assert.deepEqual(dialog.children, [])
    assert.deepEqual(body.children, [])
  })
})
