/**
 * Central API helper — all fetch calls go through here.
 * Set NEXT_PUBLIC_API_URL in .env.local (dev) and Vercel env vars (prod).
 *
 * Dev:  http://localhost:3001
 * Prod: https://auraprotocol.onrender.com
 */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'production'
    ? 'https://auraprotocol.onrender.com'
    : 'http://localhost:3001')

/** Build a full backend URL from a /api/v1/... path */
export function apiUrl(path: string): string {
  return `${API_URL}${path}`
}

/** Authenticated GET */
export async function apiFetch(path: string, token?: string | null, init?: RequestInit) {
  return fetch(apiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
}

/** Convenience POST */
export async function apiPost(path: string, body: unknown, token?: string | null) {
  return apiFetch(path, token, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** Convenience PATCH */
export async function apiPatch(path: string, body: unknown, token?: string | null) {
  return apiFetch(path, token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}
