// =====================================================================
// OOTA BACKEND — API ROUTES
// =====================================================================
// All routes are mounted under /api. Auth uses JWT bearer tokens.
// Data access goes through store.js: MongoDB when configured, otherwise
// the local file database. The routes never need to know which one.
//
// Role rules: CUSTOMER sees only their own data; KITCHEN / DELIVERY / ADMIN
// see exactly the operational data their job needs — nothing more.

import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import {
  findMany, findOne, insert, updateOne, updateMany, deleteMany,
  getSingletons, setSingletons, storeMode
} from './store.js'
import { PLANS } from './plans.js'
import { auth, allow } from './auth.js'
import { generateOrdersForDate, eligibleMeals } from './db.js'
import foodCatalog from './food-catalog.json' with { type: 'json' }

const api = Router()

// Async error safety net: any thrown error reaches the JSON error handler.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// ---------------- Small helpers ---------------------------------------
function issueToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' })
}

function publicUser(u) {
  if (!u) return null
  const { passwordHash, _id, ...safe } = u
  return safe
}

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function todayString() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function addDays(dateString, days) {
  const d = new Date(`${dateString}T00:00:00`)
  d.setDate(d.getDate() + days)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function clamp5(n) {
  const v = Number(n)
  if (!Number.isFinite(v) || v < 1) return 1
  return Math.min(5, Math.round(v))
}

async function pushNotification(userId, icon, title, body) {
  await insert('notifications', {
    id: makeId('NTF'),
    userId,
    icon,
    title,
    body,
    at: new Date().toISOString(),
    read: false
  })
}

/** The signed-in user's latest subscription (newest first). */
async function latestSubscription(userId) {
  const subs = await findMany('subscriptions', { userId })
  return (
    subs.sort((a, b) => (a.startedAt || a.createdAt || '') < (b.startedAt || b.createdAt || '') ? 1 : -1)[0] || null
  )
}

/** Generate today's + tomorrow's orders for a customer (idempotent). */
async function runDailyAutomation(user, preferences) {
  const sub = (await findMany('subscriptions', { userId: user.id })).find((s) => s.status === 'ACTIVE')
  if (!sub) return
  const today = todayString()

  if (sub.endDate < today) {
    await updateOne('subscriptions', { id: sub.id }, { status: 'EXPIRED' })
    await pushNotification(user.id, '⌛', 'Subscription expired', `${sub.planName} has ended. Renew to keep your meals coming.`)
    return
  }

  const existing = new Set((await findMany('orders', { userId: user.id })).map((o) => o.date))
  const pauses = await findMany('pauses', { userId: user.id })
  const skips = await findMany('skips', { userId: user.id })
  const { unavailableFoodIds } = await getSingletons()

  for (const date of [today, addDays(today, 1)]) {
    if (existing.has(date)) continue
    const orders = generateOrdersForDate(sub, preferences, date, { pauses, skips, unavailableFoodIds })
    for (const order of orders) await insert('orders', order)
  }
}

// =====================================================================
// HEALTH
// =====================================================================
api.get('/health', wrap(async (req, res) => {
  const count = async (name) => (await findMany(name)).length
  res.json({
    ok: true,
    service: 'oota-api',
    time: new Date().toISOString(),
    database: storeMode(), // 'mongo' or 'file'
    counts: {
      users: await count('users'),
      subscriptions: await count('subscriptions'),
      orders: await count('orders'),
      payments: await count('payments'),
      ratings: await count('ratings')
    }
  })
}))

// =====================================================================
// AUTH — register / login / me / forgot-password / reset-password
// =====================================================================
api.post('/auth/register', wrap(async (req, res) => {
  const { name, email, phone, password } = req.body || {}
  if (!name || !password || (!email && !phone)) {
    return res.status(400).json({ error: 'Name, password and (email or mobile) are required.' })
  }
  if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' })

  const key = String(email || phone).toLowerCase().trim()
  const users = await findMany('users')
  const exists = users.some(
    (u) => (u.email && u.email.toLowerCase() === key) || (u.phone && u.phone === key)
  )
  if (exists) return res.status(409).json({ error: 'An account with this email/mobile already exists. Try signing in.' })

  const user = {
    id: makeId('U'),
    name: String(name).trim(),
    email: email ? String(email).trim().toLowerCase() : null,
    phone: phone ? String(phone).trim() : null,
    role: 'CUSTOMER',
    passwordHash: bcrypt.hashSync(String(password), 10),
    preferences: { foodType: 'VEG', cuisine: 'SOUTH_INDIAN' },
    createdAt: new Date().toISOString()
  }
  await insert('users', user)
  await pushNotification(user.id, '🎉', 'Welcome to Oota!', 'Your account is ready. Pick a plan to start healthy meals.')
  res.status(201).json({ token: issueToken(user), user: publicUser(user) })
}))

api.post('/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Email/mobile and password are required.' })
  const key = String(email).toLowerCase().trim()
  const users = await findMany('users')
  const user = users.find((u) => (u.email && u.email.toLowerCase() === key) || (u.phone && u.phone === key))
  if (!user || !bcrypt.compareSync(String(password), user.passwordHash)) {
    return res.status(401).json({ error: 'Email/mobile or password is incorrect.' })
  }
  res.json({ token: issueToken(user), user: publicUser(user) })
}))

api.get('/auth/me', auth(), wrap(async (req, res) => {
  const user = await findOne('users', { id: req.user.id })
  if (!user) return res.status(401).json({ error: 'Account no longer exists.' })
  const preferences = user.preferences || { foodType: 'VEG', cuisine: 'SOUTH_INDIAN' }
  await runDailyAutomation(user, preferences)
  res.json({ user: publicUser(user), preferences })
}))

// Forgot password: returns a reset token (in production this would be emailed).
api.post('/auth/forgot-password', wrap(async (req, res) => {
  const { email } = req.body || {}
  const key = String(email || '').toLowerCase().trim()
  const user = await findMany('users').then((list) => list.find((u) => u.email && u.email.toLowerCase() === key))
  // Always answer ok so attackers cannot discover which emails exist.
  if (user) {
    const token = makeId('RST')
    const { resetTokens } = await getSingletons()
    resetTokens[token] = { userId: user.id, expiresAt: Date.now() + 15 * 60 * 1000 }
    await setSingletons({ resetTokens })
    return res.json({ ok: true, message: 'Reset link generated.', resetToken: token })
  }
  res.json({ ok: true, message: 'If that email exists, a reset link has been generated.' })
}))

api.post('/auth/reset-password', wrap(async (req, res) => {
  const { resetToken, password } = req.body || {}
  const { resetTokens } = await getSingletons()
  const entry = resetTokens[resetToken]
  if (!entry || entry.expiresAt < Date.now()) return res.status(400).json({ error: 'Reset link is invalid or expired.' })
  if (!password || String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' })
  const user = await findOne('users', { id: entry.userId })
  if (!user) return res.status(400).json({ error: 'Account no longer exists.' })
  await updateOne('users', { id: user.id }, { passwordHash: bcrypt.hashSync(String(password), 10) })
  delete resetTokens[resetToken]
  await setSingletons({ resetTokens })
  await pushNotification(user.id, '🔒', 'Password changed', 'Your password was reset successfully.')
  res.json({ ok: true })
}))

api.post('/auth/change-password', auth(), wrap(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  const user = await findOne('users', { id: req.user.id })
  if (!user || !bcrypt.compareSync(String(currentPassword || ''), user.passwordHash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' })
  }
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' })
  }
  await updateOne('users', { id: user.id }, { passwordHash: bcrypt.hashSync(String(newPassword), 10) })
  res.json({ ok: true })
}))

// =====================================================================
// PROFILE & PREFERENCES
// =====================================================================
api.put('/profile', auth(), wrap(async (req, res) => {
  const { name, phone } = req.body || {}
  const patch = {}
  if (name) patch.name = String(name).trim()
  if (phone) patch.phone = String(phone).trim()
  const user = await updateOne('users', { id: req.user.id }, patch)
  res.json({ user: publicUser(user) })
}))

api.put('/preferences', auth(), wrap(async (req, res) => {
  const { foodType, cuisine } = req.body || {}
  const active = (await findMany('subscriptions', { userId: req.user.id })).find((s) => s.status === 'ACTIVE')
  if (active) {
    return res.status(400).json({ error: 'Preferences are locked while a plan is active (your meal schedule already exists).' })
  }
  const preferences = {
    foodType: foodType === 'NON_VEG' ? 'NON_VEG' : 'VEG',
    cuisine: cuisine === 'NORTH_INDIAN' ? 'NORTH_INDIAN' : 'SOUTH_INDIAN'
  }
  await updateOne('users', { id: req.user.id }, { preferences })
  res.json({ preferences })
}))

// =====================================================================
// FOOD & MENU
// =====================================================================
api.get('/food', wrap(async (req, res) => {
  const { unavailableFoodIds } = await getSingletons()
  res.json({ items: foodCatalog, unavailableFoodIds })
}))

api.get('/menu/:date', auth(false), wrap(async (req, res) => {
  const user = req.user ? await findOne('users', { id: req.user.id }) : null
  const preferences = (user && user.preferences) ||
    {
      foodType: req.query.foodType === 'NON_VEG' ? 'NON_VEG' : 'VEG',
      cuisine: req.query.cuisine === 'NORTH_INDIAN' ? 'NORTH_INDIAN' : 'SOUTH_INDIAN'
    }
  const date = req.params.date
  const { unavailableFoodIds } = await getSingletons()
  const meals = ['BREAKFAST', 'LUNCH', 'DINNER'].map((mealType) => ({
    mealType,
    item: pickMealPublic(preferences, mealType, date, unavailableFoodIds)
  }))
  res.json({ date, meals })
}))

// public menu picker uses the same engine
function pickMealPublic(preferences, mealType, dateString, unavailableFoodIds) {
  const pool = eligibleMeals(preferences, mealType, unavailableFoodIds)
  if (!pool.length) return null
  const mealSlot = ['BREAKFAST', 'LUNCH', 'DINNER'].indexOf(mealType)
  const d = new Date(`${dateString}T00:00:00`)
  const startOfYear = new Date(d.getFullYear(), 0, 0)
  const dayNum = d.getFullYear() * 400 + Math.floor((d - startOfYear) / 86400000)
  return pool[(dayNum * 7 + mealSlot * 13) % pool.length]
}

// =====================================================================
// SUBSCRIPTION — plans, purchase (simulated payment), renew
// =====================================================================
api.get('/plans', (req, res) => res.json({ plans: PLANS }))

api.post('/subscriptions', auth(), wrap(async (req, res) => {
  const user = await findOne('users', { id: req.user.id })
  const { planId, addressLabel, foodType, cuisine } = req.body || {}
  const plan = PLANS.find((p) => p.id === planId)
  if (!plan) return res.status(400).json({ error: 'Unknown plan.' })
  const active = (await findMany('subscriptions', { userId: user.id })).find((s) => s.status === 'ACTIVE')
  if (active) return res.status(400).json({ error: 'You already have an active subscription. Renew or wait for it to end.' })
  if (!foodType || !cuisine) return res.status(400).json({ error: 'Food preference is required.' })

  const startDate = addDays(todayString(), 1)
  const endDate = addDays(startDate, plan.durationDays - 1)
  const payment = {
    id: makeId('PAY'),
    userId: user.id,
    planId: plan.id,
    amount: plan.price,
    status: 'SUCCESS',
    method: 'UPI (simulated)',
    at: new Date().toISOString()
  }
  const sub = {
    id: makeId('SUB'),
    userId: user.id,
    planId: plan.id,
    planName: plan.name,
    price: plan.price,
    durationDays: plan.durationDays,
    mealsPerDay: plan.mealsPerDay,
    customerName: user.name,
    addressLabel: addressLabel || 'Default address',
    foodType,
    cuisine,
    startDate,
    endDate,
    status: 'ACTIVE',
    startedAt: new Date().toISOString()
  }
  await insert('payments', payment)
  await insert('subscriptions', sub)
  await pushNotification(user.id, '✅', 'Payment successful', `₹${plan.price} paid for ${plan.name}.`)
  await pushNotification(user.id, '🎉', 'Subscription active!', `${plan.name} runs ${startDate} → ${endDate}. 3 meals daily.`)
  res.status(201).json({ subscription: sub, payment })
}))

api.get('/subscriptions/mine', auth(), wrap(async (req, res) => {
  res.json({ subscription: await latestSubscription(req.user.id) })
}))

api.post('/subscriptions/renew', auth(), wrap(async (req, res) => {
  const old = await latestSubscription(req.user.id)
  if (!old) return res.status(400).json({ error: 'Nothing to renew.' })
  const plan = PLANS.find((p) => p.id === old.planId) || PLANS[1]
  const startDate = old.status === 'ACTIVE' ? addDays(old.endDate, 1) : addDays(todayString(), 1)
  const endDate = addDays(startDate, plan.durationDays - 1)
  const payment = {
    id: makeId('PAY'),
    userId: req.user.id,
    planId: plan.id,
    amount: plan.price,
    status: 'SUCCESS',
    method: 'UPI (simulated)',
    at: new Date().toISOString()
  }
  const sub = {
    ...old,
    id: makeId('SUB'),
    startDate,
    endDate,
    status: 'ACTIVE',
    startedAt: new Date().toISOString()
  }
  await insert('payments', payment)
  await insert('subscriptions', sub)
  if (old.status !== 'ACTIVE') await updateOne('subscriptions', { id: old.id }, { status: 'EXPIRED' })
  await pushNotification(req.user.id, '🔄', 'Renewal successful', `${plan.name} extended until ${endDate}.`)
  res.status(201).json({ subscription: sub, payment })
}))

// =====================================================================
// ORDERS — mine, one, skip, pause
// =====================================================================
api.get('/orders/mine', auth(), wrap(async (req, res) => {
  const user = await findOne('users', { id: req.user.id })
  await runDailyAutomation(user, user.preferences || { foodType: 'VEG', cuisine: 'SOUTH_INDIAN' })
  const mine = (await findMany('orders', { userId: req.user.id })).sort((a, b) => (a.date < b.date ? 1 : -1))
  const myRatings = await findMany('ratings', { userId: req.user.id })
  const ratedIds = new Set(myRatings.map((r) => r.orderId))
  res.json({ orders: mine.map((o) => ({ ...o, rated: ratedIds.has(o.id) })) })
}))

api.get('/orders/:id', auth(), wrap(async (req, res) => {
  const order = await findOne('orders', { id: req.params.id })
  if (!order) return res.status(404).json({ error: 'Order not found.' })
  const isOwner = order.userId === req.user.id
  const isStaff = ['ADMIN', 'KITCHEN', 'DELIVERY'].includes(req.user.role)
  if (!isOwner && !isStaff) return res.status(403).json({ error: 'Not your order.' })
  res.json({ order })
}))

api.post('/orders/skip', auth(), wrap(async (req, res) => {
  const { date, mealType } = req.body || {}
  const sub = (await findMany('subscriptions', { userId: req.user.id })).find((s) => s.status === 'ACTIVE')
  if (!sub) return res.status(400).json({ error: 'No active subscription.' })
  const cutoff = new Date(`${date}T21:00:00`)
  cutoff.setDate(cutoff.getDate() - 1)
  if (new Date() > cutoff) return res.status(400).json({ error: 'Skip cutoff passed (9 PM the night before).' })

  await insert('skips', { userId: req.user.id, date, mealType })
  // Remove that meal from any order already generated for that date.
  const orders = await findMany('orders', { userId: req.user.id, date })
  for (const o of orders) {
    const meals = (o.meals || []).filter((m) => m.mealType !== mealType)
    if (meals.length === 0) await deleteMany('orders', { id: o.id })
    else await updateOne('orders', { id: o.id }, { meals })
  }
  res.json({ ok: true })
}))

api.post('/orders/pause', auth(), wrap(async (req, res) => {
  const { start, end } = req.body || {}
  if (!start || !end || end < start) return res.status(400).json({ error: 'Pick a valid pause range.' })
  const sub = (await findMany('subscriptions', { userId: req.user.id })).find((s) => s.status === 'ACTIVE')
  if (!sub) return res.status(400).json({ error: 'No active subscription.' })
  await insert('pauses', { userId: req.user.id, start, end })
  // Stop deliveries inside the pause window.
  const mine = await findMany('orders', { userId: req.user.id })
  for (const o of mine) {
    if (o.date >= start && o.date <= end) await deleteMany('orders', { id: o.id })
  }
  res.json({ ok: true })
}))

// Resume after a pause: clear future pauses; automation regenerates those days.
api.post('/orders/resume', auth(), wrap(async (req, res) => {
  const today = todayString()
  const mine = await findMany('pauses', { userId: req.user.id })
  for (const p of mine) {
    if (p.end >= today) await deleteMany('pauses', { userId: req.user.id, start: p.start, end: p.end })
  }
  res.json({ ok: true })
}))

// =====================================================================
// STAFF — kitchen queue, delivery runs, admin overview
// =====================================================================
api.get('/kitchen/queue', auth(), allow('KITCHEN', 'ADMIN'), wrap(async (req, res) => {
  const date = req.query.date || todayString()
  res.json({ date, orders: await findMany('orders', { date }) })
}))

api.get('/delivery/mine', auth(), allow('DELIVERY', 'ADMIN'), wrap(async (req, res) => {
  const mine = await findMany('orders', { assignedTo: req.user.id })
  res.json({ orders: mine.filter((o) => o.status !== 'DELIVERED') })
}))

api.get('/delivery/history', auth(), allow('DELIVERY', 'ADMIN'), wrap(async (req, res) => {
  res.json({ orders: await findMany('orders', { assignedTo: req.user.id, status: 'DELIVERED' }) })
}))

api.post('/orders/:id/status', auth(), wrap(async (req, res) => {
  const order = await findOne('orders', { id: req.params.id })
  if (!order) return res.status(404).json({ error: 'Order not found.' })
  const { status } = req.body || {}
  const allowed = ['PREPARING', 'READY', 'ASSIGNED', 'PICKED UP', 'OUT FOR DELIVERY', 'DELIVERED']
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Unknown status.' })

  const role = req.user.role
  const roleAllowed =
    (role === 'KITCHEN' && ['PREPARING', 'READY'].includes(status)) ||
    (role === 'ADMIN' && status !== 'DELIVERED') ||
    (role === 'DELIVERY' && ['PICKED UP', 'OUT FOR DELIVERY', 'DELIVERED'].includes(status)) ||
    (role === 'CUSTOMER' && false)
  if (!roleAllowed) return res.status(403).json({ error: 'Your role cannot set this status.' })

  const history = [...(order.history || []), { status, at: new Date().toISOString() }]
  const patch = { status, history }
  if (status === 'DELIVERED') patch.deliveredAt = new Date().toISOString()
  const updated = await updateOne('orders', { id: order.id }, patch)
  if (status === 'DELIVERED') {
    await pushNotification(order.userId, '📦', 'Order delivered!', 'Enjoy your meal — rate it from My Orders.')
  }
  res.json({ order: updated })
}))

// Kitchen substitution (always recorded + customer is notified).
api.post('/orders/:id/substitute', auth(), allow('KITCHEN', 'ADMIN'), wrap(async (req, res) => {
  const order = await findOne('orders', { id: req.params.id })
  if (!order) return res.status(404).json({ error: 'Order not found.' })
  const { mealType, newName, reason } = req.body || {}
  const meal = (order.meals || []).find((m) => m.mealType === mealType)
  if (!meal) return res.status(400).json({ error: 'Meal type not in this order.' })
  const meals = order.meals.map((m) =>
    m.mealType === mealType ? { ...m, name: String(newName || m.name), substituted: true } : m
  )
  const updated = await updateOne('orders', { id: order.id }, { meals })
  await pushNotification(order.userId, '🔄', 'Meal substituted', `${meal.name} → ${newName} (${reason || 'kitchen decision'}).`)
  res.json({ order: updated })
}))

api.post('/orders/:id/assign', auth(), allow('ADMIN'), wrap(async (req, res) => {
  const order = await findOne('orders', { id: req.params.id })
  if (!order) return res.status(404).json({ error: 'Order not found.' })
  const staffId = req.body.staffId || 'U-DELIVERY'
  const history = [...(order.history || []), { status: 'ASSIGNED', at: new Date().toISOString() }]
  const updated = await updateOne('orders', { id: order.id }, { assignedTo: staffId, status: 'ASSIGNED', history })
  res.json({ order: updated })
}))

api.get('/admin/overview', auth(), allow('ADMIN'), wrap(async (req, res) => {
  const today = todayString()
  const [orders, payments, ratings, tickets, users, subscriptions, pauses, skips] = await Promise.all([
    findMany('orders'),
    findMany('payments'),
    findMany('ratings'),
    findMany('tickets'),
    findMany('users'),
    findMany('subscriptions'),
    findMany('pauses'),
    findMany('skips')
  ])
  const { unavailableFoodIds } = await getSingletons()
  const todays = orders.filter((o) => o.date === today)
  res.json({
    metrics: {
      totalCustomers: users.filter((u) => u.role === 'CUSTOMER').length,
      activeSubscriptions: subscriptions.filter((s) => s.status === 'ACTIVE').length,
      ordersToday: todays.length,
      deliveredToday: todays.filter((o) => o.status === 'DELIVERED').length,
      revenue: payments.filter((p) => p.status === 'SUCCESS').reduce((s, p) => s + p.amount, 0),
      ratingsCount: ratings.length
    },
    orders,
    payments,
    ratings,
    tickets: tickets.map((t) => ({ ...t, customer: users.find((u) => u.id === t.userId)?.name || 'Customer' })),
    users: users.map(publicUser),
    subscriptions,
    pauses,
    skips,
    unavailableFoodIds
  })
}))

// Admin: broadcast a notification to every user.
api.post('/admin/broadcast', auth(), allow('ADMIN'), wrap(async (req, res) => {
  const { icon, title, body } = req.body || {}
  if (!title || !body) return res.status(400).json({ error: 'Title and body are required.' })
  const users = await findMany('users')
  for (const u of users) {
    await pushNotification(u.id, icon || '📣', String(title).slice(0, 80), String(body).slice(0, 300))
  }
  res.json({ ok: true, sent: users.length })
}))

api.put('/admin/food/:id/availability', auth(), allow('ADMIN'), wrap(async (req, res) => {
  const { available } = req.body || {}
  const id = req.params.id
  const { unavailableFoodIds } = await getSingletons()
  const set = new Set(unavailableFoodIds)
  if (available) set.delete(id)
  else set.add(id)
  const next = [...set]
  await setSingletons({ unavailableFoodIds: next })
  res.json({ unavailableFoodIds: next })
}))

// =====================================================================
// RATINGS (only after delivery)
// =====================================================================
api.post('/ratings', auth(), wrap(async (req, res) => {
  const { orderId, food, taste, packaging, delivery, review } = req.body || {}
  const order = await findOne('orders', { id: orderId })
  if (!order) return res.status(404).json({ error: 'Order not found.' })
  if (order.userId !== req.user.id) return res.status(403).json({ error: 'Not your order.' })
  if (order.status !== 'DELIVERED') return res.status(400).json({ error: 'You can rate only after delivery.' })
  const existing = await findMany('ratings', { orderId, userId: req.user.id })
  if (existing.length) return res.status(409).json({ error: 'Already rated this meal day.' })

  const rating = {
    id: makeId('RTG'),
    orderId,
    userId: req.user.id,
    date: order.date,
    food: clamp5(food),
    taste: clamp5(taste),
    packaging: clamp5(packaging),
    delivery: clamp5(delivery),
    review: String(review || '').slice(0, 500),
    at: new Date().toISOString()
  }
  await insert('ratings', rating)
  await pushNotification(req.user.id, '⭐', 'Thanks for rating!', 'Your feedback reaches the kitchen every day.')
  res.status(201).json({ rating })
}))

// =====================================================================
// NOTIFICATIONS (per-user inbox)
// =====================================================================
api.get('/notifications', auth(), wrap(async (req, res) => {
  res.json({ notifications: await findMany('notifications', { userId: req.user.id }) })
}))

api.post('/notifications/read', auth(), wrap(async (req, res) => {
  await updateMany('notifications', { userId: req.user.id }, { read: true })
  res.json({ ok: true })
}))

// Customer's own payment history.
api.get('/payments/mine', auth(), wrap(async (req, res) => {
  res.json({ payments: await findMany('payments', { userId: req.user.id }) })
}))

// =====================================================================
// SUPPORT TICKETS
// =====================================================================
api.get('/tickets/mine', auth(), wrap(async (req, res) => {
  if (req.user.role === 'ADMIN') {
    const [tickets, users] = await Promise.all([findMany('tickets'), findMany('users')])
    return res.json({
      tickets: tickets.map((t) => ({ ...t, customer: users.find((u) => u.id === t.userId)?.name || 'Customer' }))
    })
  }
  res.json({ tickets: await findMany('tickets', { userId: req.user.id }) })
}))

api.post('/tickets', auth(), wrap(async (req, res) => {
  const { subject, category, message } = req.body || {}
  if (!subject || !message) return res.status(400).json({ error: 'Subject and message are required.' })
  const ticket = {
    id: makeId('TKT'),
    userId: req.user.id,
    subject: String(subject).slice(0, 120),
    category: ['DELIVERY', 'PAYMENT', 'ORDER', 'OTHER'].includes(category) ? category : 'OTHER',
    status: 'OPEN',
    messages: [{ from: 'CUSTOMER', text: String(message).slice(0, 1000), at: new Date().toISOString() }]
  }
  await insert('tickets', ticket)
  res.status(201).json({ ticket })
}))

api.post('/tickets/:id/reply', auth(), wrap(async (req, res) => {
  const ticket = await findOne('tickets', { id: req.params.id })
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' })
  const isOwner = ticket.userId === req.user.id
  const isStaff = ['ADMIN'].includes(req.user.role)
  if (!isOwner && !isStaff) return res.status(403).json({ error: 'Not your ticket.' })
  const { text } = req.body || {}
  if (!text) return res.status(400).json({ error: 'Message text required.' })
  const messages = [
    ...(ticket.messages || []),
    { from: isOwner ? 'CUSTOMER' : 'SUPPORT', text: String(text).slice(0, 1000), at: new Date().toISOString() }
  ]
  const patch = { messages }
  if (isStaff && ticket.status === 'OPEN') patch.status = 'IN_PROGRESS'
  const updated = await updateOne('tickets', { id: ticket.id }, patch)
  await pushNotification(ticket.userId, '💬', 'Support replied', ticket.subject)
  res.json({ ticket: updated })
}))

api.post('/tickets/:id/status', auth(), wrap(async (req, res) => {
  const ticket = await findOne('tickets', { id: req.params.id })
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' })
  const isOwner = ticket.userId === req.user.id
  if (req.user.role !== 'ADMIN' && !isOwner) return res.status(403).json({ error: 'Not your ticket.' })
  const { status } = req.body || {}
  if (!['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(status)) return res.status(400).json({ error: 'Unknown status.' })
  const updated = await updateOne('tickets', { id: ticket.id }, { status })
  res.json({ ticket: updated })
}))

export default api
