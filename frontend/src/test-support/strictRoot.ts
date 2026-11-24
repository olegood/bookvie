// Test support for `node --test` (Story 14.5, AD-7): renders a React tree
// under `<StrictMode>` with the real client renderer, so a hook's render-phase
// decision is double-invoked as it is in development. e2e runs a production
// build, where StrictMode does nothing. There is no DOM in node, so a stub
// window, document and container stand in for the few properties React reads
// to mount a root. The tree must render no host elements (components that
// return `null`); anything that creates a DOM node fails.

import { act, createElement, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'

type Scope = { window?: unknown; IS_REACT_ACT_ENVIRONMENT?: boolean }

export type StrictRoot = {
  /** Renders `tree` (inside `<StrictMode>`) in place of the last one, and waits for React to settle. */
  render: (tree: ReactNode) => Promise<void>
  /** Runs `action` (a navigation, a state setter) inside `act`, and waits for React to settle. */
  run: (action: () => void) => Promise<void>
  /** Unmounts the tree and removes the stub window. */
  unmount: () => Promise<void>
}

/** Mounts `tree` under `<StrictMode>` on a stub container. */
export async function strictRoot(tree: ReactNode): Promise<StrictRoot> {
  const scope = globalThis as Scope
  const noop = () => {}
  const stubWindow: Record<string, unknown> = {
    event: undefined,
    addEventListener: noop,
    removeEventListener: noop,
    HTMLIFrameElement: class {},
  }
  const stubDocument = {
    nodeType: 9,
    defaultView: stubWindow,
    activeElement: null,
    addEventListener: noop,
    removeEventListener: noop,
  }
  stubWindow.document = stubDocument
  const container = {
    nodeType: 1,
    nodeName: 'DIV',
    tagName: 'DIV',
    ownerDocument: stubDocument,
    addEventListener: noop,
    removeEventListener: noop,
  }
  const hadWindow = 'window' in scope
  const previousWindow = scope.window
  scope.window = stubWindow
  scope.IS_REACT_ACT_ENVIRONMENT = true
  const root = createRoot(container as unknown as Element)
  const render = async (next: ReactNode) => {
    await act(async () => root.render(createElement(StrictMode, null, next)))
  }
  await render(tree)
  return {
    render,
    run: async (action) => {
      await act(async () => action())
    },
    unmount: async () => {
      await act(async () => root.unmount())
      if (hadWindow) scope.window = previousWindow
      else delete scope.window
      delete scope.IS_REACT_ACT_ENVIRONMENT
    },
  }
}
