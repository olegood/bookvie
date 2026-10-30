// Sends one intent: POST /api/intents/<kebab-verb>. The client never patches
// cached data: whatever the outcome, every ['view', …] query is invalidated,
// and the promise resolves only after the active views have refetched.

import type { QueryClient } from '@tanstack/react-query'
import { couldntSave, parseIntentResponse, type IntentResult } from './envelope.ts'
import { VIEW_ROOT } from './views.ts'

export const INTENTS_BASE = '/api/intents'

function requestInit(body: unknown): RequestInit {
  if (body instanceof FormData) return { method: 'POST', body }
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
    const response = await fetch(`${INTENTS_BASE}/${verb}`, requestInit(body))
    result = await parseIntentResponse(response)
  } catch {
    // Network failure. The server may still have committed, so refetch anyway.
    result = couldntSave()
  }
  await client.invalidateQueries({ queryKey: [VIEW_ROOT] })
  return result
}
