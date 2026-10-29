// The only module in the frontend that talks to the server.
// Pages and components import from `src/api/`, never call `fetch` themselves.

export const API_BASE = '/api'

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  return fetch(url, init)
}
