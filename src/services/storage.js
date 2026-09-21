// =====================================================================
// LOCAL STORAGE (browser memory)
// =====================================================================
// The browser can remember small amounts of data between visits. In Stage 1
// this replaces the real database. In Stage 2 a Node.js + PostgreSQL backend
// takes over, and this file simply becomes a cache.

const STORAGE_KEY = 'freshbowl_state_v1'

export function loadState(fallback) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const saved = JSON.parse(raw)
    return {
      ...fallback,
      ...saved,
      profile: { ...fallback.profile, ...(saved.profile || {}) },
      preferences: { ...fallback.preferences, ...(saved.preferences || {}) }
    }
  } catch {
    return fallback
  }
}

export function saveState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or blocked — the app still works, it just won't remember.
  }
}

export function clearState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export { STORAGE_KEY }
