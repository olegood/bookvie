// Parses an intent response into one of three outcomes. Anything that is not
// a well-formed envelope (a proxy error page, a truncated body, a status that
// contradicts the body) counts as couldnt_save.

import type { components } from './generated/schema.d.ts'

type Schemas = components['schemas']
export type ErrorCode = Schemas['ErrorCode']
export type ErrorKind = Schemas['ErrorKind']
export type FieldError = Schemas['FieldError']
export type ErrorBody = Schemas['ErrorBody']
export type OkResponse = Schemas['OkResponse']

// The only copy the client owns: used when no server message arrived at all.
export const COULDNT_SAVE_MESSAGE = "Couldn't save. Your data wasn't changed."

export type IntentResult =
  | { kind: 'ok'; ids: string[]; reachedLastPage: boolean }
  | {
      kind: 'refusal'
      status: number
      code: ErrorCode
      message: string
      fields: FieldError[]
    }
  | { kind: 'couldnt_save'; message: string }

export function couldntSave(message: string = COULDNT_SAVE_MESSAGE): IntentResult {
  return { kind: 'couldnt_save', message }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFieldError(value: unknown): value is FieldError {
  return isObject(value) && typeof value.field === 'string' && typeof value.message === 'string'
}

/** The outcome of a parsed body with an HTTP status; pure, for tests. */
export function toIntentResult(status: number, body: unknown): IntentResult {
  if (!isObject(body)) return couldntSave()
  const success = status >= 200 && status < 300
  if (success) {
    if (body.ok !== true) return couldntSave()
    const ids = Array.isArray(body.ids) && body.ids.every((id) => typeof id === 'string')
    return { kind: 'ok', ids: ids ? (body.ids as string[]) : [], reachedLastPage: body.reachedLastPage === true }
  }
  const error = body.error
  if (!isObject(error) || typeof error.code !== 'string' || typeof error.message !== 'string') {
    return couldntSave()
  }
  if (error.kind === 'couldnt_save') return couldntSave(error.message)
  if (error.kind !== 'refusal') return couldntSave()
  const fields = error.fields ?? []
  if (!Array.isArray(fields) || !fields.every(isFieldError)) return couldntSave()
  return {
    kind: 'refusal',
    status,
    code: error.code as ErrorCode,
    message: error.message,
    fields,
  }
}

/** Reads and parses an intent response; never throws. */
export async function parseIntentResponse(response: Response): Promise<IntentResult> {
  let body: unknown
  try {
    body = JSON.parse(await response.text())
  } catch {
    return couldntSave()
  }
  return toIntentResult(response.status, body)
}
