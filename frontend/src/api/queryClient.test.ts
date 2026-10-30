import assert from 'node:assert/strict'
import { afterEach, describe, it, mock } from 'node:test'
import { focusManager } from '@tanstack/react-query'
import { createQueryClient, focusAndVisibility } from './queryClient.ts'

describe('focusAndVisibility', () => {
  it('re-checks focus on window focus and on visibilitychange', () => {
    const target = new EventTarget()
    const calls: (boolean | undefined)[] = []
    const cleanup = focusAndVisibility(target)((focused) => calls.push(focused))
    target.dispatchEvent(new Event('focus'))
    target.dispatchEvent(new Event('visibilitychange'))
    // No argument: TanStack falls back to document.visibilityState.
    assert.deepEqual(calls, [undefined, undefined])

    cleanup()
    target.dispatchEvent(new Event('focus'))
    target.dispatchEvent(new Event('visibilitychange'))
    assert.equal(calls.length, 2)
  })
})

describe('createQueryClient', () => {
  it('does not retry and refetches on focus', () => {
    const queries = createQueryClient().getDefaultOptions().queries
    assert.equal(queries?.retry, false)
    assert.equal(queries?.refetchOnWindowFocus, true)
  })

  it('does not pause requests while navigator is offline', () => {
    const defaults = createQueryClient().getDefaultOptions()
    assert.equal(defaults.queries?.networkMode, 'always')
    assert.equal(defaults.mutations?.networkMode, 'always')
  })

  describe('with a window', () => {
    afterEach(() => {
      mock.restoreAll()
      Reflect.deleteProperty(globalThis, 'window')
      focusManager.setEventListener(() => undefined)
    })

    it('installs the focus and visibility listener on focusManager', () => {
      const win = new EventTarget()
      Object.defineProperty(globalThis, 'window', { value: win, configurable: true })
      createQueryClient()
      const onFocus = mock.method(focusManager, 'onFocus', () => undefined)
      win.dispatchEvent(new Event('focus'))
      win.dispatchEvent(new Event('visibilitychange'))
      assert.equal(onFocus.mock.callCount(), 2)
    })
  })
})
