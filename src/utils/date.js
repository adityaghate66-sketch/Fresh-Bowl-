// ---------- Date helpers ----------
// All dates inside the app are stored as text like "2026-09-20".
// These helpers convert between that text and real Date objects.

const pad = (n) => String(n).padStart(2, '0')

/** Convert a Date object to "YYYY-MM-DD" text. */
export function toDateString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Today's date as "YYYY-MM-DD". */
export function todayString() {
  return toDateString(new Date())
}

/** Add N days to a "YYYY-MM-DD" string and return the new "YYYY-MM-DD". */
export function addDays(dateString, days) {
  const d = new Date(`${dateString}T00:00:00`)
  d.setDate(d.getDate() + days)
  return toDateString(d)
}

/** "2026-09-20" -> "Saturday, 20 Sept 2026" style friendly text. */
export function formatDateLong(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

/** "2026-09-20" -> "Sat, 20 Sept". */
export function formatDateShort(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
}

/** Number of whole days between two "YYYY-MM-DD" strings (b - a). */
export function daysBetween(a, b) {
  const ms = new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)
  return Math.round(ms / 86400000)
}
