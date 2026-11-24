// Story 14.5 Keep the search when I open a box and come back: the carried-search
// decision (AD-7, AR65), run under <StrictMode> because e2e runs a production
// build. The text lives only in React state of the Card notes route component.
// It is kept on a `location.key` change only on a PUSH carrying the page's
// marker, or on a POP landing on the `openedFrom` of the entry just left.
// Every other change starts empty, and while the view has no groups the text is
// dropped. The decision runs during render: never in an effect, never by
// writing a ref in render.
//
// The module is imported statically and passed to the probe as `CarriedSearch`.

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import { createElement, useLayoutEffect } from 'react'
import { MemoryRouter, useLocation, useNavigate, type NavigateFunction } from 'react-router'
import { strictRoot } from '../test-support/strictRoot.ts'
import { carryState, useCarriedSearch } from './carriedSearch.ts'

/** The shape of `lib/carriedSearch.ts` that the page uses. */
type CarriedSearch = {
  /**
   * The search text of this history entry and its setter. `noGroups` is true
   * while the entry's view is ready with no groups: the text is dropped then.
   */
  useCarriedSearch: (options: { noGroups: boolean }) => readonly [string, (text: string) => void]
  /** Router state for a push from the page: a box link's (`openedFrom`, the shelf entry's key) or the chip's (none). */
  carryState: (openedFrom?: string) => unknown
}

const SOURCE = new URL('./carriedSearch.ts', import.meta.url)

/** The module, as the page uses it. */
async function load(): Promise<CarriedSearch> {
  return { useCarriedSearch, carryState }
}

/** One committed render of the probe: the entry it showed and the text the hook gave it. */
type Commit = { key: string; state: unknown; text: string }

/**
 * Mounts the hook under <StrictMode> in a MemoryRouter at `entry` and records
 * every commit (from a layout effect in the probe, not in the hook). A render
 * React throws away (a render-phase update) isn't a commit; an effect that
 * fixes the text afterwards shows as a commit with the old text.
 */
async function mount(mod: CarriedSearch, entry: { pathname: string; search?: string; state?: unknown }) {
  const commits: Commit[] = []
  const live: { navigate?: NavigateFunction; setText?: (text: string) => void } = {}
  function Probe({ noGroups }: { noGroups: boolean }) {
    const [text, setText] = mod.useCarriedSearch({ noGroups })
    const location = useLocation()
    const navigate = useNavigate()
    useLayoutEffect(() => {
      live.navigate = navigate
      live.setText = setText
      commits.push({ key: location.key, state: location.state, text })
    })
    return null
  }
  const tree = (noGroups: boolean) =>
    createElement(MemoryRouter, { initialEntries: [entry] }, createElement(Probe, { noGroups }))
  const root = await strictRoot(tree(false))
  /** Runs `action` and returns the texts of the commits it caused. */
  const step = async (action: () => void): Promise<Commit[]> => {
    const from = commits.length
    await root.run(action)
    return commits.slice(from)
  }
  return {
    commits,
    root,
    /** Sets the field's text, as typing does. */
    type: (text: string) => step(() => live.setText?.(text)),
    navigate: (to: string | number, options?: { replace?: boolean; state?: unknown }) =>
      step(() => {
        if (typeof to === 'number') void live.navigate?.(to)
        else void live.navigate?.(to, options)
      }),
    /** Re-renders with the view's groups present or not. */
    groups: async (present: boolean) => {
      const from = commits.length
      await root.render(tree(!present))
      return commits.slice(from)
    },
  }
}

/** The distinct texts of some commits, in order of first appearance. */
function texts(commits: readonly Commit[]): string[] {
  return [...new Set(commits.map((commit) => commit.text))]
}

/** The key of the last commit. */
function keyOf(commits: readonly Commit[]): string {
  const last = commits.at(-1)
  assert.ok(last, 'the step committed a render')
  return last.key
}

describe('Story 14.5 carried search decision (ATDD)', () => {
  test('[P0] AC-5 under <StrictMode> the text is kept only on a PUSH carrying the marker and on a POP landing on the openedFrom of the entry just left; every other key change starts empty; decided in render; dropped while the view has no groups', async () => {
    const mod = await load()
    const shelf = await mount(mod, { pathname: '/card-notes' })
    try {
      await shelf.type('habit')
      // Read without asserting: the criterion below is the first thing that can fail.
      const shelfKey = shelf.commits.at(-1)?.key ?? ''

      // A box link's push carries the marker and the shelf's key ("default" here).
      const intoBox = await shelf.navigate('/card-notes?book=11', { state: mod.carryState(shelfKey) })

      // Every commit of the new entry already shows the carried text: decided in render.
      assert.deepEqual(texts(intoBox), ['habit'])

      assert.equal(shelfKey, 'default')
      const boxKey = keyOf(intoBox)
      assert.notEqual(boxKey, shelfKey)

      // Back lands on the box's openedFrom: the open box's latest text comes back.
      await shelf.type('habits')
      const back = await shelf.navigate(-1)
      assert.equal(keyOf(back), shelfKey)
      assert.deepEqual(texts(back), ['habits'])

      // Forward is a POP too, but the entry just left (the shelf) has no openedFrom: empty.
      const forward = await shelf.navigate(1)
      assert.equal(keyOf(forward), boxKey)
      assert.deepEqual(texts(forward), [''])

      // The chip's push carries the marker without openedFrom: the text goes along.
      await shelf.type('zettel')
      const chip = await shelf.navigate('/card-notes', { state: mod.carryState() })
      const chipKey = keyOf(chip)
      assert.deepEqual(texts(chip), ['zettel'])

      // Back from there to the open box: the entry just left has no openedFrom, so it starts empty.
      const backToBox = await shelf.navigate(-1)
      assert.equal(keyOf(backToBox), boxKey)
      assert.deepEqual(texts(backToBox), [''])

      // Any other link (a push without the marker): empty.
      await shelf.type('habit')
      const otherLink = await shelf.navigate('/card-notes?book=13')
      assert.deepEqual(texts(otherLink), [''])

      // The nav link on the page itself is a REPLACE: a new key, empty, with or without state.
      await shelf.type('habit')
      const nav = await shelf.navigate('/card-notes', { replace: true })
      assert.notEqual(keyOf(nav), chipKey)
      assert.deepEqual(texts(nav), [''])
      await shelf.type('habit')
      const replaced = await shelf.navigate('/card-notes', { replace: true, state: mod.carryState(keyOf(nav)) })
      assert.deepEqual(texts(replaced), [''])

      // Switching views is no navigation; the text stays while the view has groups.
      await shelf.type('habit')
      assert.deepEqual(texts(await shelf.groups(true)), ['habit'])
      // While the view has no groups the text is dropped, and doesn't come back with them.
      assert.deepEqual(texts(await shelf.groups(false)), [''])
      assert.deepEqual(texts(await shelf.groups(true)), [''])

      // The text is never in router state.
      for (const { state } of shelf.commits) {
        assert.doesNotMatch(JSON.stringify(state ?? null), /habit|zettel/i)
      }
    } finally {
      await shelf.root.unmount()
    }

    // The marker is ignored on mount (a reload, an arrival from another route).
    const reloaded = await mount(mod, {
      pathname: '/card-notes',
      search: '?book=11',
      state: mod.carryState('default'),
    })
    try {
      assert.deepEqual(texts(reloaded.commits), [''])
    } finally {
      await reloaded.root.unmount()
    }

    // Router state holds only navigation facts: the marker, and openedFrom on a box link's push.
    assert.ok(JSON.stringify(mod.carryState('k-42')).includes('k-42'))
    assert.ok(Object.keys(mod.carryState('k-42') as object).length <= 2)
    assert.ok(Object.keys(mod.carryState() as object).length <= 1)

    // Decided during render: no effect and no ref in the module.
    assert.ok(existsSync(SOURCE), 'lib/carriedSearch.ts exists')
    assert.doesNotMatch(readFileSync(SOURCE, 'utf8'), /\buse(Layout|Insertion)?Effect\b|\buseRef\b/)
  })
})

describe('Story 14.5 carried search decision (automate)', () => {
  test('[P1] AC-5 a move of two entries at once counts from the entry just left, not from the entry it skipped', async () => {
    const mod = await load()
    const shelf = await mount(mod, { pathname: '/card-notes' })
    try {
      await shelf.type('habit')
      const shelfKey = keyOf(shelf.commits)
      // Shelf → box (openedFrom: the shelf) → the chip's shelf (no openedFrom).
      const intoBox = await shelf.navigate('/card-notes?book=11', { state: mod.carryState(shelfKey) })
      assert.deepEqual(texts(intoBox), ['habit'])
      const chip = await shelf.navigate('/card-notes', { state: mod.carryState() })
      assert.deepEqual(texts(chip), ['habit'])

      // Two back to the first shelf: the box skipped over named it, but the entry just left didn't.
      await shelf.type('zettel')
      const twoBack = await shelf.navigate(-2)
      assert.equal(keyOf(twoBack), shelfKey)
      assert.deepEqual(texts(twoBack), [''])

      // Two forward to the chip's shelf: a POP from an entry with no openedFrom.
      await shelf.type('habit')
      const twoForward = await shelf.navigate(2)
      assert.equal(keyOf(twoForward), keyOf(chip))
      assert.deepEqual(texts(twoForward), [''])

      // One back to the box, then one back to the shelf: the entry just left names it, so the text comes out.
      const backToBox = await shelf.navigate(-1)
      assert.deepEqual(texts(backToBox), [''])
      await shelf.type('habits')
      const backToShelf = await shelf.navigate(-1)
      assert.equal(keyOf(backToShelf), shelfKey)
      assert.deepEqual(texts(backToShelf), ['habits'])
    } finally {
      await shelf.root.unmount()
    }
  })
})
