// =====================================================================
// APP CONFIGURATION
// =====================================================================
// VITE_API_URL is set in Netlify's dashboard (Environment Variables) and
// points at the live backend. In local dev it falls back to localhost.
// The trailing slash is trimmed so joins never end up with "//".

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, '')

// Tiny helper: all fetches go through here so every request carries the
// login token automatically and errors come back as clean messages.
export async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    // non-JSON response (shouldn't happen, but stay safe)
  }
  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`)
  }
  return data
}
