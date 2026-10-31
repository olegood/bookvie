// Sends one intent: POST /api/intents/<kebab-verb>. The client never patches
// cached data: whatever the outcome, every ['view', …] query is invalidated,
// and the promise resolves only after the active views have refetched.

import type { QueryClient } from '@tanstack/react-query'
import { couldntSave, parseIntentResponse, type IntentResult } from './envelope.ts'
import { VIEW_ROOT } from './views.ts'

export const INTENTS_BASE = '/api/intents'

function hasFile(form: FormData): boolean {
  let found = false
  form.forEach((value) => {
    if (typeof value !== 'string') found = true
  })
  return found
}

async function requestInit(body: unknown): Promise<RequestInit> {
  if (body instanceof FormData) {
    if (!hasFile(body)) return { method: 'POST', body }
    // A form with a file (the cover) is encoded to its multipart bytes here, by
    // the platform, and sent as such: the same body on the wire, but one the
    // browser's network tools (and the e2e tests) can read in full; Chromium
    // leaves file parts out of a FormData request's recorded body.
    const encoded = new Response(body)
    return {
      method: 'POST',
      headers: { 'Content-Type': encoded.headers.get('Content-Type') ?? 'multipart/form-data' },
      body: await encoded.arrayBuffer(),
    }
  }
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export async function sendIntent(
  client: QueryClient,
  verb: string,
  body: unknown,
): Promise<IntentResult> {
  let result: IntentResult
  try {
    const response = await fetch(`${INTENTS_BASE}/${verb}`, await requestInit(body))
    result = await parseIntentResponse(response)
  } catch {
    // Network failure. The server may still have committed, so refetch anyway.
    result = couldntSave()
  }
  await client.invalidateQueries({ queryKey: [VIEW_ROOT] })
  return result
}
