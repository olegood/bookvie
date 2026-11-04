// Export all data (FR-22): GET /api/export, handed to the browser's download.
// The server records "Last export" once the last byte has gone out, a moment
// after the browser has the whole file, so the backup view is refetched until
// the record shows up (or a few tries pass).

import type { QueryClient } from '@tanstack/react-query'
import { fetchView, viewKey, type BackupView } from './views.ts'

export const EXPORT_URL = '/api/export'
// The server refuses an export without it (AD-16): a cross-site <img> or
// no-cors GET can't set a custom header, so it can't record "Last export".
export const EXPORT_HEADERS = { 'X-Bookvie-Export': '1' } as const

// Used only when the server's own message didn't arrive (no envelope).
export const COULDNT_EXPORT_MESSAGE = "Couldn't export. Your data wasn't changed."

/** An export that didn't produce a file; `message` is the server's copy. */
export class ExportError extends Error {}

/** `bookvie-export-<YYYY-MM-DD>.zip` for the local date of `now`. */
export function exportFilename(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `bookvie-export-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.zip`
}

/** The `filename` of a `Content-Disposition` header, or `null`. */
export function dispositionFilename(header: string | null): string | null {
  const match = header?.match(/filename="([^"]+)"/)
  return match ? match[1] : null
}

/** The failure line for a non-OK answer: the envelope's message, else the client copy. */
export async function exportFailureMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    const error = (body as { error?: { message?: unknown } } | null)?.error
    if (typeof error?.message === 'string' && error.message) return error.message
  } catch {
    // Not an envelope: fall through to the client copy.
  }
  return COULDNT_EXPORT_MESSAGE
}

/**
 * Fetches the export and hands it to the browser as a download. Throws
 * {@link ExportError} with the message to show when no file was produced.
 */
export async function exportAll(): Promise<void> {
  let response: Response
  let blob: Blob
  try {
    response = await fetch(EXPORT_URL, { headers: EXPORT_HEADERS })
    if (!response.ok) throw new ExportError(await exportFailureMessage(response))
    blob = await response.blob()
  } catch (error) {
    if (error instanceof ExportError) throw error
    throw new ExportError(COULDNT_EXPORT_MESSAGE)
  }
  const name = dispositionFilename(response.headers.get('Content-Disposition')) ?? exportFilename(new Date())
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.hidden = true
  document.body.appendChild(link)
  link.click()
  link.remove()
  // The download has started from the URL; give it a moment before letting go.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export const REFRESH_TRIES = 10
export const REFRESH_DELAY_MS = 100

/**
 * Refetches the backup view until `lastExportAt` differs from `before` (the
 * value when the export started), at most {@link REFRESH_TRIES} times.
 * Never throws: a failed refetch leaves the line as it was.
 */
export async function refreshLastExport(
  queryClient: QueryClient,
  before: string | null,
  wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<void> {
  for (let attempt = 0; attempt < REFRESH_TRIES; attempt++) {
    let view: BackupView
    try {
      view = await queryClient.fetchQuery({
        queryKey: viewKey('backup'),
        queryFn: () => fetchView('backup'),
        staleTime: 0,
      })
    } catch {
      return
    }
    if (view.lastExportAt !== before) return
    await wait(REFRESH_DELAY_MS)
  }
}
