// Restore (FR-23): POST /api/intents/restore, one multipart call with an
// `intent` part holding {} and the export zip as the `archive` file part.
// Like every intent it invalidates every view, whatever the outcome; the
// server owns the failure copy.

import type { QueryClient } from '@tanstack/react-query'
import type { IntentResult } from './envelope.ts'
import { sendIntent } from './intents.ts'

export function restoreForm(file: File): FormData {
  const form = new FormData()
  form.set('intent', '{}')
  form.append('archive', file, file.name)
  return form
}

/** Sends `restore`; resolves after the views have refetched. */
export function restore(client: QueryClient, file: File): Promise<IntentResult> {
  return sendIntent(client, 'restore', restoreForm(file))
}
