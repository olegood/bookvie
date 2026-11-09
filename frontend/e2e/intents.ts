// Shared by the specs that drive or inspect intents: the intent paths, the
// requests a page sends, the JSON `intent` part of a multipart request, and
// a cover attached through edit-book as setup.

import type { Page, Request } from '@playwright/test'
import { expect, type Server } from './fixtures.ts'

export const ADD_BOOK = '/api/intents/add-book'
export const EDIT_BOOK = '/api/intents/edit-book'
export const DELETE_BOOK = '/api/intents/delete-book'
export const SET_SPINE_COLOR = '/api/intents/set-spine-color'
export const START_READING = '/api/intents/start-reading'
export const EDIT_PURPOSE = '/api/intents/edit-purpose'
export const UPDATE_PAGE = '/api/intents/update-page'
export const FINISH_READING = '/api/intents/finish-reading'
export const PAUSE = '/api/intents/pause'
export const SET_UP_NEXT = '/api/intents/set-up-next'
export const MARK_SIDE_READ = '/api/intents/mark-side-read'
export const UNMARK_SIDE_READ = '/api/intents/unmark-side-read'

// A 40×60 solid red-orange PNG (rgb 200, 60, 40): a colored cover.
export const COVER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAIAAACb22+3AAAAO0lEQVR42u3NMQ0AMAgAMJgaROA/yJoHHp7WQHO64sKLI2KxWCwWi8VisVgsFovFYrFYLBaLxWKxeOMD/k0BpCMi0m0AAAAASUVORK5CYII=',
  'base64',
)

/** Every POST to `path` the page sends from now on, in order. */
export function requestsTo(page: Page, path: string): Request[] {
  const sent: Request[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === path) sent.push(request)
  })
  return sent
}

/** The multipart body as text, binary parts included byte for byte (latin1). */
export function bodyOf(request: Request): string {
  return (request.postDataBuffer() ?? Buffer.alloc(0)).toString('latin1')
}

/**
 * The JSON `intent` part of a multipart intent request. Only that part is
 * read, so a `cover` file part beside it (which may hold `{` or `}` bytes)
 * never changes the result. Throws when there is no `intent` part, so a
 * check that a key is absent can't pass on a request it couldn't read.
 */
export function intentOf(request: Request): Record<string, unknown> {
  const json = /name="intent"[^]*?\r\n\r\n(\{[^]*?\})\r\n--/.exec(bodyOf(request))?.[1]
  if (json === undefined) throw new Error(`no intent part in the ${request.url()} request`)
  return JSON.parse(json) as Record<string, unknown>
}

/** Setup: gives a Book a cover through edit-book, as the Edit book panel would. */
export async function attachCover(
  page: Page,
  server: Server,
  form: Record<string, unknown>,
  cover: Buffer = COVER_PNG,
): Promise<void> {
  const response = await page.request.post(`${server.url}${EDIT_BOOK}`, {
    multipart: {
      intent: JSON.stringify(form),
      cover: { name: 'cover.png', mimeType: 'image/png', buffer: cover },
    },
  })
  expect(response.status()).toBe(200)
}
