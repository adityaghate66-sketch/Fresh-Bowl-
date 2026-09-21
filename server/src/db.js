// =====================================================================
// OOTA BACKEND — DATA LAYER (JSON file database)
// =====================================================================
// A tiny file-based database. On every write the whole state is saved to
// server/data/db.json. This keeps the backend dependency-free and lets it
// run on any free host (Render/Railway/fly.io) with zero setup.
//
// Swapping to MongoDB/PostgreSQL later only requires rewriting THIS file —
// every route uses the same load()/save() interface.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')
const DB_FILE = join(DATA_DIR, 'db.json')

// ---------------- Menu engine (mirrors the frontend's exact rules) ----
const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER']

// Food catalog is shipped as JSON (exported from the app's data file) so
// the server never needs to import anything from the frontend source.
import foodCatalog from './food-catalog.json' with { type: 'json' }
const FOOD_ITEMS = foodCatalog

function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) | 0
  return h
}

function dayNumber(dateString) {
  const date = new Date(`${dateString}T00:00:00`)
  const startOfYear = new Date(date.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((date - startOfYear) / 86400000)
  return date.getFullYear() * 400 + dayOfYear
}

// HARD BUSINESS RULE: veg customers never receive non-veg dishes.
// Non-veg customers get non-veg + business-approved veg dishes.
export function eligibleMeals(preferences, mealType, unavailableFoodIds = []) {
  return FOOD_ITEMS.filter(
    (item) =>
      item.cuisine === preferences.cuisine &&
      item.mealType === mealType &&
      !unavailableFoodIds.includes(item.id) &&
      (item.foodType === preferences.foodType ||
        (preferences.foodType === 'NON_VEG' && item.approvedForNonVeg))
  )
}

export function pickMealForDate(preferences, mealType, dateString, unavailableFoodIds = []) {
  const pool = eligibleMeals(preferences, mealType, unavailableFoodIds)
  if (pool.length === 0) return null
  const mealSlot = MEAL_TYPES.indexOf(mealType)
  const seed = dayNumber(dateString) * 7 + mealSlot * 13
  return pool[seed % pool.length]
}

// ---------------- Seed data (same demo accounts as the app) ----------
const SEED_USERS = [
  { id: 'U-ADMIN', name: 'Aarav Admin', email: 'admin@freshbowl.in', phone: '9000000001', role: 'ADMIN', password: 'admin123' },
  { id: 'U-KITCHEN', name: 'Kiran Kitchen', email: 'kitchen@freshbowl.in', phone: '9000000002', role: 'KITCHEN', password: 'kitchen123' },
  { id: 'U-DELIVERY', name: 'Dev Delivery', email: 'delivery@freshbowl.in', phone: '9000000003', role: 'DELIVERY', password: 'delivery123' },
  { id: 'U-CUSTOMER', name: 'Guest', email: 'guest@freshbowl.in', phone: '9000000004', role: 'CUSTOMER', password: 'guest123' }
]

function defaultDb() {
  const users = SEED_USERS.map((u) => {
    const { password, ...safe } = u
    return { ...safe, passwordHash: bcrypt.hashSync(password, 10) }
  })
  return {
    users,
    subscriptions: [], // one active subscription per customer
    payments: [],
    orders: [],
    ratings: [],
    tickets: [
      {
        id: 'TKT-1001',
        userId: 'U-CUSTOMER',
        subject: 'Meal arrived slightly cold',
        category: 'DELIVERY',
        status: 'OPEN',
        messages: [
          { from: 'CUSTOMER', text: "Today's lunch box was warm, not hot.", at: '2026-09-20T13:05:00' },
          { from: 'SUPPORT', text: "Sorry about that! We've flagged your route for insulated bags.", at: '2026-09-20T14:10:00' }
        ]
      }
    ],
    notifications: [], // per-user: [{ id, userId, icon, title, body, at, read }]
    unavailableFoodIds: [],
    skips: [], // { userId, date, mealType }
    pauses: [] // { userId, start, end }
  }
}

// ---------------- Load / save -----------------------------------------
let db
try {
  db = JSON.parse(readFileSync(DB_FILE, 'utf8'))
} catch {
  db = defaultDb()
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

export function getDb() {
  return db
}

export function save() {
  try {
    mkdirSync(DATA_DIR, { recursive: true })
    writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
  } catch (err) {
    console.error('DB save failed:', err.message)
  }
}

// ---------------- Small helpers used by routes ------------------------
export function publicUser(u) {
  if (!u) return null
  const { passwordHash, ...safe } = u
  return safe
}

export function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function todayString() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function addDays(dateString, days) {
  const d = new Date(`${dateString}T00:00:00`)
  d.setDate(d.getDate() + days)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function pushNotification(dbRef, userId, icon, title, body) {
  dbRef.notifications.unshift({
    id: makeId('NTF'),
    userId,
    icon,
    title,
    body,
    at: new Date().toISOString(),
    read: false
  })
}

// ---------------- Daily order automation ------------------------------
// Generates an order for one customer for one date, honouring:
//   veg/non-veg hard rule • sold-out dishes • pauses • skipped meals
export function generateOrdersForDate(sub, preferences, dateString, dbRef) {
  if (!sub || sub.status !== 'ACTIVE') return []
  if (dateString < sub.startDate || dateString > sub.endDate) return []

  const onPause = dbRef.pauses.some((p) => p.userId === sub.userId && dateString >= p.start && dateString <= p.end)
  if (onPause) return []

  const orderMeals = sub.mealsPerDay
    .filter((mealType) => !dbRef.skips.some((s) => s.userId === sub.userId && s.date === dateString && s.mealType === mealType))
    .map((mealType) => {
      const item = pickMealForDate(preferences, mealType, dateString, dbRef.unavailableFoodIds)
      return item
        ? { mealType, itemId: item.id, name: item.name, emoji: item.emoji, foodType: item.foodType }
        : null
    })
    .filter(Boolean)

  if (!orderMeals.length) return []

  return [
    {
      id: `ORD-${hashString(dateString + sub.id)}`,
      date: dateString,
      subscriptionId: sub.id,
      userId: sub.userId,
      customerName: sub.customerName || 'Customer',
      addressLabel: sub.addressLabel || 'Default address',
      cuisine: preferences.cuisine,
      meals: orderMeals,
      status: 'PREPARING',
      history: [{ status: 'PREPARING', at: new Date().toISOString() }]
    }
  ]
}
