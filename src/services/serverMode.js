// =====================================================================
// SERVER MODE — connects the app to the real backend when signed in
// =====================================================================
// HOW IT WORKS (simple):
//   • Guest / onboarding → everything stays local (browser memory), exactly
//     as before. Nothing breaks when offline.
//   • Signed in          → this module builds `state` from the live API and
//     every business action (subscribe, skip, rate, status changes…) goes to
//     the server. The rest of the app cannot tell the difference, because we
//     return the same shapes it already reads: state.orders, state.payments,
//     currentUser, etc.
//
// Each role gets exactly the data its screens need — nothing more:
//   CUSTOMER → own subscription/orders/payments/tickets/notifications
//   KITCHEN  → today's production queue (all customers)
//   DELIVERY → assigned runs + own delivered history
//   ADMIN    → full operational overview

import { api, API_URL } from '../config'

const TOKEN_KEY = 'oota_token'

// Delivery addresses stay on the device (per-device demo data) in both
// modes so the checkout flow keeps working without an address API.
const ADDR_KEY = 'oota_addresses'

export function loadLocalAddresses() {
  try {
    return JSON.parse(window.localStorage.getItem(ADDR_KEY)) || []
  } catch {
    return []
  }
}

export function saveLocalAddresses(list) {
  try {
    window.localStorage.setItem(ADDR_KEY, JSON.stringify(list))
  } catch {
    // ignore
  }
}

export function getToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function setToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token)
    else window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    // private mode — session simply won't survive refresh
  }
}

async function tryApi(path, options) {
  try {
    return await api(path, options)
  } catch (err) {
    if (err.message && /Session expired|sign in/i.test(err.message)) throw err
    throw err
  }
}

// ---------------------------------------------------------------------
// Session boot / refresh: "who am I?" + fresh data from the server
// ---------------------------------------------------------------------
export async function buildServerState() {
  const token = getToken()
  if (!token) return null
  let me
  try {
    me = await tryApi('/auth/me', { token })
  } catch (err) {
    console.warn('Server session unavailable, using local mode:', err.message)
    setToken(null)
    return null
  }

  const u = me.user
  const base = {
    mode: 'server',
    token,
    currentUser: u,
    profile: { name: u.name || '', email: u.email || '', phone: u.phone || '' },
    preferences: me.preferences || { foodType: 'VEG', cuisine: 'SOUTH_INDIAN' },
    subscription: null,
    orders: [],
    notifications: [],
    tickets: [],
    payments: [],
    ratings: [],
    subscriptions: [],
    addresses: loadLocalAddresses(),
    users: [u],
    unavailableFoodIds: [],
    skips: [],
    pauses: [],
    substitutions: []
  }

  const grab = async (key, path) => {
    try {
      const data = await tryApi(path, { token })
      return data[key] !== undefined ? data[key] : data
    } catch {
      return null
    }
  }

  if (u.role === 'ADMIN') {
    const full = await api('/admin/overview', { token }).catch(() => null)
    if (full) {
      base.orders = full.orders || []
      base.users = full.users || [u]
      base.payments = full.payments || []
      base.ratings = full.ratings || []
      base.tickets = full.tickets || []
      base.unavailableFoodIds = full.unavailableFoodIds || []
      base.subscriptions = full.subscriptions || []
      base.metrics = full.metrics || null
    }
  } else if (u.role === 'KITCHEN') {
    const q = await grab('orders', '/kitchen/queue')
    base.orders = q || []
    base.users = [u]
  } else if (u.role === 'DELIVERY') {
    const mine = (await grab('orders', '/delivery/mine')) || []
    const history = (await grab('orders', '/delivery/history')) || []
    base.orders = [...mine, ...history]
    base.users = [u]
  } else {
    // CUSTOMER — only their own world
    const [sub, orders, notifs, tickets, payments, food] = await Promise.all([
      grab('subscription', '/subscriptions/mine'),
      grab('orders', '/orders/mine'),
      grab('notifications', '/notifications'),
      grab('tickets', '/tickets/mine'),
      grab('payments', '/payments/mine'),
      grab('unavailableFoodIds', '/food')
    ])
    base.subscription = sub || null
    base.orders = orders || []
    base.notifications = (notifs || []).map((n) => ({ ...n, read: !!n.read }))
    base.tickets = tickets || []
    base.payments = payments || []
    base.unavailableFoodIds = food || []
  }

  return base
}

// ---------------------------------------------------------------------
// Local state the app needs while in server mode
// ---------------------------------------------------------------------
export const SERVER_MODE_DEFAULTS = {
  onboarded: true,
  addresses: [],
  skips: [],
  pauses: [],
  substitutions: [],
  ratings: []
}

// ---------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------
export async function serverLogin({ identifier, password, role }) {
  const data = await api('/auth/login', { method: 'POST', body: { email: identifier, password } })
  if (role && data.user.role !== role) {
    return { ok: false, error: `This account is not a ${String(role).toLowerCase()} account.` }
  }
  setToken(data.token)
  return { ok: true, user: data.user, token: data.token }
}

export async function serverRegister({ name, email, phone, password }) {
  const data = await api('/auth/register', { method: 'POST', body: { name, email, phone, password } })
  setToken(data.token)
  return { ok: true, user: data.user, token: data.token }
}

export function serverLogout() {
  setToken(null)
}

// ---------------------------------------------------------------------
// PROFILE & PREFERENCES
// ---------------------------------------------------------------------
export function serverSaveProfile(token, patch) {
  return api('/profile', { method: 'PUT', token, body: patch })
}

export function serverSetPreferences(token, preferences) {
  return api('/preferences', { method: 'PUT', token, body: preferences })
}

export async function serverChangePassword(token, currentPassword, newPassword) {
  try {
    await api('/auth/change-password', { method: 'POST', token, body: { currentPassword, newPassword } })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

export async function serverRequestPasswordReset(identifier) {
  try {
    const data = await api('/auth/forgot-password', { method: 'POST', body: { email: identifier } })
    if (!data.resetToken) return { ok: false, error: 'No account found with that email or mobile number.' }
    return { ok: true, token: data.resetToken }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

export async function serverResetPassword(identifier, resetToken, newPassword) {
  try {
    await api('/auth/reset-password', { method: 'POST', body: { resetToken, password: newPassword } })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ---------------------------------------------------------------------
// SUBSCRIPTION
// ---------------------------------------------------------------------
export function serverSubscribe(token, plan, preferences, addressLabel) {
  return api('/subscriptions', {
    method: 'POST',
    token,
    body: { planId: plan.id, foodType: preferences.foodType, cuisine: preferences.cuisine, addressLabel }
  })
}

export function serverRenew(token) {
  return api('/subscriptions/renew', { method: 'POST', token })
}

// ---------------------------------------------------------------------
// ORDERS
// ---------------------------------------------------------------------
export function serverPause(token, start, end) {
  return api('/orders/pause', { method: 'POST', token, body: { start, end } })
}

export function serverResume(token) {
  return api('/orders/resume', { method: 'POST', token })
}

export function serverSkip(token, date, mealType) {
  return api('/orders/skip', { method: 'POST', token, body: { date, mealType } })
}

export async function serverRate(token, orderId, scores, review) {
  try {
    const data = await api('/ratings', { method: 'POST', token, body: { orderId, ...scores, review } })
    return { ok: true, rating: data.rating }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ---------------------------------------------------------------------
// STAFF ACTIONS
// ---------------------------------------------------------------------
export function serverSetOrderStatus(token, orderId, status) {
  return api(`/orders/${encodeURIComponent(orderId)}/status`, { method: 'POST', token, body: { status } })
}

export function serverAssignDelivery(token, orderId, staffId) {
  return api(`/orders/${encodeURIComponent(orderId)}/assign`, { method: 'POST', token, body: { staffId } })
}

export function serverSubstitute(token, orderId, mealType, newName, reason) {
  return api(`/orders/${encodeURIComponent(orderId)}/substitute`, {
    method: 'POST',
    token,
    body: { mealType, newName, reason }
  })
}

export function serverToggleFood(token, foodId, available) {
  return api(`/admin/food/${encodeURIComponent(foodId)}/availability`, {
    method: 'PUT',
    token,
    body: { available }
  })
}

export function serverBroadcast(token, icon, title, body) {
  return api('/admin/broadcast', { method: 'POST', token, body: { icon, title, body } })
}

// ---------------------------------------------------------------------
// SUPPORT
// ---------------------------------------------------------------------
export function serverCreateTicket(token, subject, category, message) {
  return api('/tickets', { method: 'POST', token, body: { subject, category, message } })
}

export function serverReplyTicket(token, ticketId, text) {
  return api(`/tickets/${encodeURIComponent(ticketId)}/reply`, { method: 'POST', token, body: { text } })
}

export function serverSetTicketStatus(token, ticketId, status) {
  return api(`/tickets/${encodeURIComponent(ticketId)}/status`, { method: 'POST', token, body: { status } })
}

export function serverMarkNotificationsRead(token) {
  return api('/notifications/read', { method: 'POST', token })
}

export { API_URL }
