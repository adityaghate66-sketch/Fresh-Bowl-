// =====================================================================
// FRESHBOWL "BACKEND" — DATA + AUTOMATION ENGINE (single-file demo DB)
// =====================================================================
// This module plays the role of the Stage 2/3/4 backend inside the
// browser: seed data for every role + the business rules that generate
// orders, kitchen production quantities, delivery assignments and more.
// Swapping it for a real Node/PostgreSQL backend later means replacing
// ONLY this file's functions — the UI code already talks to them.

import { FOOD_ITEMS, MEAL_TYPES } from '../data/foodItems'
import { PLANS } from '../data/plans'
import { todayString, addDays, daysBetween } from '../utils/date'
import { eligibleMeals as rawEligibleMeals } from './menuService'

// ---------------------------------------------------------------
// SEEDED ACCOUNTS (login with any of these; password: any 4+ chars)
// ---------------------------------------------------------------
export const SEED_USERS = [
  {
    id: 'U-ADMIN', name: 'Aarav Admin', email: 'admin@freshbowl.in', phone: '9000000001',
    role: 'ADMIN', password: 'admin123'
  },
  {
    id: 'U-KITCHEN', name: 'Kiran Kitchen', email: 'kitchen@freshbowl.in', phone: '9000000002',
    role: 'KITCHEN', password: 'kitchen123'
  },
  {
    id: 'U-DELIVERY', name: 'Dev Delivery', email: 'delivery@freshbowl.in', phone: '9000000003',
    role: 'DELIVERY', password: 'delivery123'
  },
  {
    id: 'U-CUSTOMER', name: 'Guest', email: 'guest@freshbowl.in', phone: '9000000004',
    role: 'CUSTOMER', password: 'guest123'
  }
]

export const ROLE_LABELS = {
  CUSTOMER: 'Customer',
  KITCHEN: 'Kitchen Staff',
  DELIVERY: 'Delivery Staff',
  ADMIN: 'Administrator'
}

export const ROLE_HOME = {
  CUSTOMER: '/home',
  KITCHEN: '/kitchen',
  DELIVERY: '/delivery',
  ADMIN: '/admin'
}

// ---------------------------------------------------------------
// BUSINESS RULES (what the admin can configure in the real system)
// ---------------------------------------------------------------
export const BUSINESS_RULES = {
  SKIP_CUTOFF_HOUR: 21, // skip allowed until 9 PM the night before
  PAUSE_LIMIT_DAYS: { 'starter-15': 5, 'monthly-30': 10, 'family-30': 10, 'premium-60': 20 },
  SUBSTITUTION_REASONS: ['Item unavailable', 'Quality not met', 'Shortage reported', 'Admin decision']
}

// ---------------------------------------------------------------
// DEMO SUPPORT / DELIVERY STAFF SEEDS
// ---------------------------------------------------------------
export const SEED_TICKETS = [
  {
    id: 'TKT-1001', subject: 'Meal arrived slightly cold', category: 'DELIVERY', status: 'OPEN',
    customer: 'Priya S.', messages: [
      { from: 'CUSTOMER', text: 'Today\'s lunch box was warm, not hot.', at: '2026-09-20T13:05:00' },
      { from: 'SUPPORT', text: 'Sorry about that! We\'ve flagged your route for insulated bags.', at: '2026-09-20T14:10:00' }
    ]
  }
]

export const SEED_DELIVERY_STAFF = [
  { id: 'U-DELIVERY', name: 'Dev Delivery', phone: '9000000003', active: true }
]

// ---------------------------------------------------------------
// ORDER GENERATION — the daily automation heart
// ---------------------------------------------------------------
/**
 * Generate today's ORDER for a subscription, honouring:
 *  - cuisine + food preference (hard rule)
 *  - dishes marked "sold out" by the admin (unavailableFoodIds)
 *  - active pause (no order)
 *  - skipped meals (no order item)
 * Deterministic meal picks come from the menu engine.
 */
export function generateOrdersForDate(subscription, preferences, dateString, skips = [], pauses = [], unavailableFoodIds = []) {
  if (!subscription || subscription.status !== 'ACTIVE') return []
  if (dateString < subscription.startDate || dateString > subscription.endDate) return []

  const onPause = pauses.some((p) => dateString >= p.start && dateString <= p.end)
  if (onPause) return []

  const orderMeals = subscription.mealsPerDay
    .filter((mealType) => !skips.some((s) => s.date === dateString && s.mealType === mealType))
    .map((mealType) => {
      const pool = rawEligibleMeals(preferences, mealType, unavailableFoodIds)
      // stable pick per date+meal (same logic as menuService)
      const item = pool.length ? pool[Math.abs(hashString(dateString + mealType)) % pool.length] : null
      return item
        ? { mealType, itemId: item.id, name: item.name, emoji: item.emoji, foodType: item.foodType }
        : null
    })
    .filter(Boolean)

  if (!orderMeals.length) return []

  return [{
    id: `ORD-${hashString(dateString + subscription.id)}`,
    date: dateString,
    subscriptionId: subscription.id,
    customerName: subscription.customerName || 'Customer',
    addressLabel: subscription.addressLabel || 'Default address',
    cuisine: preferences.cuisine,
    meals: orderMeals,
    status: 'PREPARING',
    history: [{ status: 'PREPARING', at: new Date().toISOString() }]
  }]
}

function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) | 0
  return h
}

// ---------------------------------------------------------------
// KITCHEN QUANTITIES — aggregate orders into the production grid
// ---------------------------------------------------------------
export function kitchenQuantities(orders, date) {
  const grid = {}
  for (const mealType of MEAL_TYPES) {
    for (const cuisine of ['NORTH_INDIAN', 'SOUTH_INDIAN']) {
      for (const foodType of ['VEG', 'NON_VEG']) {
        grid[`${mealType}|${cuisine}|${foodType}`] = 0
      }
    }
  }
  let total = 0
  for (const order of orders) {
    if (order.date !== date) continue
    for (const meal of order.meals) {
      const key = `${meal.mealType}|${order.cuisine}|${meal.foodType}`
      if (key in grid) {
        grid[key] += 1
        total += 1
      }
    }
  }
  return { grid, total }
}

// ---------------------------------------------------------------
// DELIVERY ASSIGNMENT helper
// ---------------------------------------------------------------
export function assignDelivery(order, staffId) {
  return {
    ...order,
    assignedTo: staffId || SEED_DELIVERY_STAFF[0].id,
    status: order.status === 'ASSIGNED' ? order.status : 'ASSIGNED'
  }
}

// ---------------------------------------------------------------
// PAUSE / SKIP VALIDATION (rules 11 & 12)
// ---------------------------------------------------------------
export function canSkip(subscription, date, mealType, now = new Date()) {
  if (!subscription || subscription.status !== 'ACTIVE') return { ok: false, reason: 'No active subscription.' }
  if (date < subscription.startDate || date > subscription.endDate) return { ok: false, reason: 'Outside your plan dates.' }
  const cutoff = new Date(`${date}T${String(BUSINESS_RULES.SKIP_CUTOFF_HOUR).padStart(2, '0')}:00:00`)
  cutoff.setDate(cutoff.getDate() - 1) // 9 PM the previous night
  if (now > cutoff) return { ok: false, reason: `Cutoff passed (9 PM the night before).` }
  return { ok: true }
}

export function canPause(subscription, existingPauses, start, end) {
  if (!subscription || subscription.status !== 'ACTIVE') return { ok: false, reason: 'No active subscription.' }
  if (!start || !end) return { ok: false, reason: 'Pick start and end dates.' }
  if (end < start) return { ok: false, reason: 'End date must be after start date.' }
  if (start < todayString()) return { ok: false, reason: 'Pause must start today or later.' }
  if (start < subscription.startDate || end > subscription.endDate) {
    return { ok: false, reason: 'Pause must stay inside your plan dates.' }
  }
  const days = daysBetween(start, end) + 1
  const limit = BUSINESS_RULES.PAUSE_LIMIT_DAYS[subscription.planId] || 5
  const used = existingPauses.reduce((sum, p) => sum + (daysBetween(p.start, p.end) + 1), 0)
  if (used + days > limit) {
    return { ok: false, reason: `Pause limit is ${limit} days for this plan (you've used ${used}).` }
  }
  return { ok: true, days }
}

// ---------------------------------------------------------------
// MENU / FOOD LOOKUPS for the Admin dashboard
// ---------------------------------------------------------------
export function allFood() { return FOOD_ITEMS }
export function allPlans() { return PLANS }

// ---------------------------------------------------------------
// DEMO ADMIN ANALYTICS (derived from the running local state)
// ---------------------------------------------------------------
export function adminMetrics(state) {
  // The demo state keeps one logged-in customer's data, so we derive the
  // numbers from `users` + `subscription`. A real backend would pass full
  // collections here — the shape of the RESULT stays the same.
  const customers = (state.users || []).filter((u) => u.role === 'CUSTOMER')
  const subscriptions = state.subscription ? [state.subscription] : []
  const orders = state.orders || []
  const payments = state.payments || []
  const ratings = state.ratings || []
  const tickets = state.tickets || []
  const today = todayString()
  const todaysOrders = orders.filter((o) => o.date === today)
  return {
    totalCustomers: customers.length,
    activeSubs: subscriptions.filter((s) => s.status === 'ACTIVE').length,
    pausedSubs: subscriptions.filter((s) => s.status === 'PAUSED').length,
    todayOrders: todaysOrders.length,
    deliveredToday: todaysOrders.filter((o) => o.status === 'DELIVERED').length,
    pendingToday: todaysOrders.filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length,
    revenue: payments.filter((p) => p.status === 'SUCCESS').reduce((s, p) => s + p.amount, 0),
    failedPayments: payments.filter((p) => p.status === 'FAILED').length,
    avgRating: ratings.length
      ? (ratings.reduce((s, r) => s + (r.food + r.taste + r.packaging + r.delivery) / 4, 0) / ratings.length).toFixed(1)
      : '—',
    openTickets: tickets.filter((t) => t.status === 'OPEN').length
  }
}

export { todayString, addDays, daysBetween }
