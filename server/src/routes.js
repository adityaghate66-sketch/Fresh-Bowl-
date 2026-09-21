// =====================================================================
// OOTA BACKEND — API ROUTES
// =====================================================================
// All routes are mounted under /api. Auth uses JWT bearer tokens.
// Role rules: CUSTOMER sees only their own data; KITCHEN / DELIVERY / ADMIN
// see exactly the operational data their job needs — nothing more.

import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import {
  getDb, save, publicUser, makeId, todayString, addDays,
  pushNotification, generateOrdersForDate, eligibleMeals
} from './db.js'
import { PLANS } from './plans.js'
import { auth, allow } from './auth.js'

const api = Router()

// ---------------- Signing helper --------------------------------------
function issueToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' })
}

function findUser(id) {
  return getDb().users.find((u) => u.id === id)
}

// Generate today's + tomorrow's orders for a customer (idempotent).
function runDailyAutomation(db, user, preferences) {
  const today = todayString()
  const sub = db.subscriptions.find((s) => s.userId === user.id && s.status === 'ACTIVE')
  if (!sub) return

  if (sub.endDate < today) {
    sub.status = 'EXPIRED'
    pushNotification(db, user.id, '⌛', 'Subscription expired', `${sub.planName} has ended. Renew to keep your meals coming.`)
    save()
    return
  }

  const existing = new Set(db.orders.filter((o) => o.userId === user.id).map((o) => o.date))
  const needed = [today, addDays(today, 1)]
  let created = false
  for (const date of needed) {
    if (existing.has(date)) continue
    const orders = generateOrdersForDate(sub, preferences, date, db)
    if (orders.length) {
      db.orders.push(...orders)
      created = true
    }
  }
  if (created) save()
}

// =====================================================================
// HEALTH
// =====================================================================
api.get('/health', (req, res) => {
  const db = getDb()
  res.json({
    ok: true,
    service: 'oota-api',
    time: new Date().toISOString(),
    counts: {
      users: db.users.length,
      subscriptions: db.subscriptions.length,
      orders: db.orders.length,
      payments: db.payments.length,
      ratings: db.ratings.length
    }
  })
})

// =====================================================================
// AUTH — register / login / me / forgot-password / reset-password
// =====================================================================
api.post('/auth/register', (req, res) => {
  const db = getDb()
  const { name, email, phone, password } = req.body || {}
  if (!name || !password || (!email && !phone)) {
    return res.status(400).json({ error: 'Name, password and (email or mobile) are required.' })
  }
  const key = (email || phone).toLowerCase()
  const exists = db.users.some((u) => (u.email && u.email.toLowerCase() === key) || (u.phone && u.phone === phone))
  if (exists) return res.status(409).json({ error: 'An account with this email/mobile already exists. Try signing in.' })
  if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' })

  const user = {
    id: makeId('U'),
    name: String(name).trim(),
    email: email ? String(email).trim().toLowerCase() : null,
    phone: phone ? String(phone).trim() : null,
    role: 'CUSTOMER',
    passwordHash: bcrypt.hashSync(String(password), 10),
    createdAt: new Date().toISOString()
  }
  db.users.push(user)
  pushNotification(db, user.id, '🎉', 'Welcome to Oota!', 'Your account is ready. Pick a plan to start healthy meals.')
  save()
  res.status(201).json({ token: issueToken(user), user: publicUser(user) })
})

api.post('/auth/login', (req, res) => {
  const db = getDb()
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Email/mobile and password are required.' })
  const key = String(email).toLowerCase().trim()
  const user = db.users.find((u) => (u.email && u.email.toLowerCase() === key) || (u.phone && u.phone === key))
  if (!user || !bcrypt.compareSync(String(password), user.passwordHash)) {
    return res.status(401).json({ error: 'Email/mobile or password is incorrect.' })
  }
  res.json({ token: issueToken(user), user: publicUser(user) })
})

api.get('/auth/me', auth(), (req, res) => {
  const user = findUser(req.user.id)
  if (!user) return res.status(401).json({ error: 'Account no longer exists.' })
  const db = getDb()
  const preferences = user.preferences || { foodType: 'VEG', cuisine: 'SOUTH_INDIAN' }
  runDailyAutomation(db, user, preferences)
  res.json({ user: publicUser(user), preferences })
})

// Forgot password: returns a reset token (in production this would be emailed).
api.post('/auth/forgot-password', (req, res) => {
  const db = getDb()
  const { email } = req.body || {}
  const key = String(email || '').toLowerCase().trim()
  const user = db.users.find((u) => u.email && u.email.toLowerCase() === key)
  // Always answer ok so attackers cannot discover which emails exist.
  if (user) {
    const token = makeId('RST')
    db.resetTokens = db.resetTokens || {}
    db.resetTokens[token] = { userId: user.id, expiresAt: Date.now() + 15 * 60 * 1000 }
    save()
    // NOTE: a real deployment emails this link instead of returning it.
    return res.json({ ok: true, message: 'Reset link generated.', resetToken: token })
  }
  res.json({ ok: true, message: 'If that email exists, a reset link has been generated.' })
})

api.post('/auth/reset-password', (req, res) => {
  const db = getDb()
  const { resetToken, password } = req.body || {}
  const entry = (db.resetTokens || {})[resetToken]
  if (!entry || entry.expiresAt < Date.now()) return res.status(400).json({ error: 'Reset link is invalid or expired.' })
  if (!password || String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' })
  const user = findUser(entry.userId)
  if (!user) return res.status(400).json({ error: 'Account no longer exists.' })
  user.passwordHash = bcrypt.hashSync(String(password), 10)
  delete db.resetTokens[resetToken]
  save()
  pushNotification(db, user.id, '🔒', 'Password changed', 'Your password was reset successfully.')
  res.json({ ok: true })
})

api.post('/auth/change-password', auth(), (req, res) => {
  const db = getDb()
  const { currentPassword, newPassword } = req.body || {}
  const user = findUser(req.user.id)
  if (!user || !bcrypt.compareSync(String(currentPassword || ''), user.passwordHash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' })
  }
  if (!newPassword || String(newPassword).length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' })
  user.passwordHash = bcrypt.hashSync(String(newPassword), 10)
  save()
  res.json({ ok: true })
})

// =====================================================================
// PROFILE & PREFERENCES
// =====================================================================
api.put('/profile', auth(), (req, res) => {
  const db = getDb()
  const user = findUser(req.user.id)
  const { name, phone } = req.body || {}
  if (name) user.name = String(name).trim()
  if (phone) user.phone = String(phone).trim()
  save()
  res.json({ user: publicUser(user) })
})

api.put('/preferences', auth(), (req, res) => {
  const db = getDb()
  const user = findUser(req.user.id)
  const { foodType, cuisine } = req.body || {}
  const active = db.subscriptions.find((s) => s.userId === user.id && s.status === 'ACTIVE')
  if (active) {
    return res.status(400).json({ error: 'Preferences are locked while a plan is active (your meal schedule already exists).' })
  }
  user.preferences = {
    foodType: foodType === 'NON_VEG' ? 'NON_VEG' : 'VEG',
    cuisine: cuisine === 'NORTH_INDIAN' ? 'NORTH_INDIAN' : 'SOUTH_INDIAN'
  }
  save()
  res.json({ preferences: user.preferences })
})

// =====================================================================
// FOOD & MENU
// =====================================================================
api.get('/food', (req, res) => {
  const db = getDb()
  res.json({ items: getDb().foodItems || [], unavailableFoodIds: db.unavailableFoodIds })
})

api.get('/menu/:date', auth(false), (req, res) => {
  const db = getDb()
  const user = req.user ? findUser(req.user.id) : null
  const preferences = (req.user && (user.preferences || { foodType: 'VEG', cuisine: 'SOUTH_INDIAN' })) ||
    { foodType: req.query.foodType === 'NON_VEG' ? 'NON_VEG' : 'VEG', cuisine: req.query.cuisine === 'NORTH_INDIAN' ? 'NORTH_INDIAN' : 'SOUTH_INDIAN' }
  const date = req.params.date
  const meals = ['BREAKFAST', 'LUNCH', 'DINNER'].map((mealType) => ({
    mealType,
    item: pickMealPublic(preferences, mealType, date, db.unavailableFoodIds)
  }))
  res.json({ date, meals })
})

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
// SUBSCRIPTION — plans, purchase (simulated payment), renew, cancel
// =====================================================================
api.get('/plans', (req, res) => res.json({ plans: PLANS }))

api.post('/subscriptions', auth(), (req, res) => {
  const db = getDb()
  const user = findUser(req.user.id)
  const { planId, addressLabel, foodType, cuisine } = req.body || {}
  const plan = PLANS.find((p) => p.id === planId)
  if (!plan) return res.status(400).json({ error: 'Unknown plan.' })
  const existing = db.subscriptions.find((s) => s.userId === user.id && s.status === 'ACTIVE')
  if (existing) return res.status(400).json({ error: 'You already have an active subscription. Renew or wait for it to end.' })
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
  db.payments.push(payment)
  db.subscriptions.push(sub)
  pushNotification(db, user.id, '✅', 'Payment successful', `₹${plan.price} paid for ${plan.name}.`)
  pushNotification(db, user.id, '🎉', 'Subscription active!', `${plan.name} runs ${startDate} → ${endDate}. 3 meals daily.`)
  save()
  res.status(201).json({ subscription: sub, payment })
})

api.get('/subscriptions/mine', auth(), (req, res) => {
  const db = getDb()
  const sub = db.subscriptions.find((s) => s.userId === req.user.id)
  res.json({ subscription: sub || null })
})

api.post('/subscriptions/renew', auth(), (req, res) => {
  const db = getDb()
  const user = findUser(req.user.id)
  const old = db.subscriptions
    .filter((s) => s.userId === user.id)
    .sort((a, b) => (a.endDate < b.endDate ? 1 : -1))[0]
  if (!old) return res.status(400).json({ error: 'Nothing to renew.' })
  const plan = PLANS.find((p) => p.id === old.planId) || PLANS[1]
  const startDate = old.status === 'ACTIVE' ? addDays(old.endDate, 1) : addDays(todayString(), 1)
  const endDate = addDays(startDate, plan.durationDays - 1)
  const payment = { id: makeId('PAY'), userId: user.id, planId: plan.id, amount: plan.price, status: 'SUCCESS', method: 'UPI (simulated)', at: new Date().toISOString() }
  const sub = { ...old, id: makeId('SUB'), startDate, endDate, status: 'ACTIVE', startedAt: new Date().toISOString() }
  db.payments.push(payment)
  db.subscriptions.push(sub)
  if (old.status !== 'ACTIVE') old.status = 'EXPIRED'
  pushNotification(db, user.id, '🔄', 'Renewal successful', `${plan.name} extended until ${endDate}.`)
  save()
  res.status(201).json({ subscription: sub, payment })
})

// =====================================================================
// ORDERS — mine, one, skip, pause
// =====================================================================
api.get('/orders/mine', auth(), (req, res) => {
  const db = getDb()
  const user = findUser(req.user.id)
  runDailyAutomation(db, user, user.preferences || { foodType: 'VEG', cuisine: 'SOUTH_INDIAN' })
  res.json({ orders: db.orders.filter((o) => o.userId === req.user.id) })
})

api.get('/orders/:id', auth(), (req, res) => {
  const db = getDb()
  const order = db.orders.find((o) => o.id === req.params.id)
  if (!order) return res.status(404).json({ error: 'Order not found.' })
  const isOwner = order.userId === req.user.id
  const isStaff = ['ADMIN', 'KITCHEN', 'DELIVERY'].includes(req.user.role)
  if (!isOwner && !isStaff) return res.status(403).json({ error: 'Not your order.' })
  res.json({ order })
})

api.post('/orders/skip', auth(), (req, res) => {
  const db = getDb()
  const { date, mealType } = req.body || {}
  const sub = db.subscriptions.find((s) => s.userId === req.user.id && s.status === 'ACTIVE')
  if (!sub) return res.status(400).json({ error: 'No active subscription.' })
  const cutoff = new Date(`${date}T21:00:00`)
  cutoff.setDate(cutoff.getDate() - 1)
  if (new Date() > cutoff) return res.status(400).json({ error: 'Skip cutoff passed (9 PM the night before).' })
  db.skips.push({ userId: req.user.id, date, mealType })
  db.orders = db.orders.filter(
    (o) => !(o.userId === req.user.id && o.date === date) ||
      (o.meals = o.meals.filter((m) => m.mealType !== mealType)).length >= 0
  )
  // remove order entirely if no meals remain
  db.orders = db.orders.filter((o) => !(o.userId === req.user.id && o.date === date && o.meals.length === 0))
  save()
  res.json({ ok: true })
})

api.post('/orders/pause', auth(), (req, res) => {
  const db = getDb()
  const { start, end } = req.body || {}
  if (!start || !end || end < start) return res.status(400).json({ error: 'Pick a valid pause range.' })
  const sub = db.subscriptions.find((s) => s.userId === req.user.id && s.status === 'ACTIVE')
  if (!sub) return res.status(400).json({ error: 'No active subscription.' })
  db.pauses.push({ userId: req.user.id, start, end })
  db.orders = db.orders.filter((o) => !(o.userId === req.user.id && o.date >= start && o.date <= end))
  save()
  res.json({ ok: true })
})

// =====================================================================
// STAFF — kitchen queue, delivery runs, admin overview
// =====================================================================
api.get('/kitchen/queue', auth(), allow('KITCHEN', 'ADMIN'), (req, res) => {
  const db = getDb()
  const date = req.query.date || todayString()
  res.json({ date, orders: db.orders.filter((o) => o.date === date) })
})

api.get('/delivery/mine', auth(), allow('DELIVERY', 'ADMIN'), (req, res) => {
  const db = getDb()
  const mine = db.orders.filter((o) => o.assignedTo === req.user.id && o.status !== 'DELIVERED')
  res.json({ orders: mine })
})

api.get('/delivery/history', auth(), allow('DELIVERY', 'ADMIN'), (req, res) => {
  const db = getDb()
  res.json({ orders: db.orders.filter((o) => o.assignedTo === req.user.id && o.status === 'DELIVERED') })
})

api.post('/orders/:id/status', auth(), (req, res) => {
  const db = getDb()
  const order = db.orders.find((o) => o.id === req.params.id)
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

  order.status = status
  order.history = order.history || []
  order.history.push({ status, at: new Date().toISOString() })
  if (status === 'DELIVERED') {
    order.deliveredAt = new Date().toISOString()
    pushNotification(db, order.userId, '📦', 'Order delivered!', 'Enjoy your meal — rate it from My Orders.')
  }
  save()
  res.json({ order })
})

api.post('/orders/:id/assign', auth(), allow('ADMIN'), (req, res) => {
  const db = getDb()
  const order = db.orders.find((o) => o.id === req.params.id)
  if (!order) return res.status(404).json({ error: 'Order not found.' })
  const staffId = req.body.staffId || 'U-DELIVERY'
  order.assignedTo = staffId
  order.status = 'ASSIGNED'
  order.history = order.history || []
  order.history.push({ status: 'ASSIGNED', at: new Date().toISOString() })
  save()
  res.json({ order })
})

api.get('/admin/overview', auth(), allow('ADMIN'), (req, res) => {
  const db = getDb()
  const today = todayString()
  const todays = db.orders.filter((o) => o.date === today)
  res.json({
    metrics: {
      totalCustomers: db.users.filter((u) => u.role === 'CUSTOMER').length,
      activeSubscriptions: db.subscriptions.filter((s) => s.status === 'ACTIVE').length,
      ordersToday: todays.length,
      deliveredToday: todays.filter((o) => o.status === 'DELIVERED').length,
      revenue: db.payments.filter((p) => p.status === 'SUCCESS').reduce((s, p) => s + p.amount, 0),
      ratingsCount: db.ratings.length
    },
    orders: db.orders,
    payments: db.payments,
    ratings: db.ratings,
    tickets: db.tickets,
    users: db.users.map(publicUser),
    subscriptions: db.subscriptions,
    unavailableFoodIds: db.unavailableFoodIds
  })
})

api.put('/admin/food/:id/availability', auth(), allow('ADMIN'), (req, res) => {
  const db = getDb()
  const { available } = req.body || {}
  const id = req.params.id
  const set = new Set(db.unavailableFoodIds)
  if (available) set.delete(id)
  else set.add(id)
  db.unavailableFoodIds = [...set]
  save()
  res.json({ unavailableFoodIds: db.unavailableFoodIds })
})

// =====================================================================
// RATINGS (only after delivery)
// =====================================================================
api.post('/ratings', auth(), (req, res) => {
  const db = getDb()
  const { orderId, food, taste, packaging, delivery, review } = req.body || {}
  const order = db.orders.find((o) => o.id === orderId)
  if (!order) return res.status(404).json({ error: 'Order not found.' })
  if (order.userId !== req.user.id) return res.status(403).json({ error: 'Not your order.' })
  if (order.status !== 'DELIVERED') return res.status(400).json({ error: 'You can rate only after delivery.' })
  if (db.ratings.some((r) => r.orderId === orderId && r.userId === req.user.id)) {
    return res.status(409).json({ error: 'Already rated this meal day.' })
  }
  const rating = {
    id: makeId('RTG'),
    orderId,
    userId: req.user.id,
    date: order.date,
    food: clamp5(food), taste: clamp5(taste), packaging: clamp5(packaging), delivery: clamp5(delivery),
    review: String(review || '').slice(0, 500),
    at: new Date().toISOString()
  }
  db.ratings.push(rating)
  pushNotification(db, req.user.id, '⭐', 'Thanks for rating!', 'Your feedback reaches the kitchen every day.')
  save()
  res.status(201).json({ rating })
})

function clamp5(n) {
  const v = Number(n)
  if (!Number.isFinite(v) || v < 1) return 1
  return Math.min(5, Math.round(v))
}

// =====================================================================
// SUPPORT TICKETS
// =====================================================================
api.get('/tickets/mine', auth(), (req, res) => {
  const db = getDb()
  const mine = req.user.role === 'CUSTOMER'
    ? db.tickets.filter((t) => t.userId === req.user.id)
    : db.tickets
  res.json({ tickets: mine })
})

api.post('/tickets', auth(), (req, res) => {
  const db = getDb()
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
  db.tickets.push(ticket)
  save()
  res.status(201).json({ ticket })
})

api.post('/tickets/:id/reply', auth(), (req, res) => {
  const db = getDb()
  const ticket = db.tickets.find((t) => t.id === req.params.id)
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' })
  const isOwner = ticket.userId === req.user.id
  const isStaff = ['ADMIN'].includes(req.user.role)
  if (!isOwner && !isStaff) return res.status(403).json({ error: 'Not your ticket.' })
  const { text } = req.body || {}
  if (!text) return res.status(400).json({ error: 'Message text required.' })
  ticket.messages.push({ from: isOwner ? 'CUSTOMER' : 'SUPPORT', text: String(text).slice(0, 1000), at: new Date().toISOString() })
  if (isStaff && ticket.status === 'OPEN') ticket.status = 'IN_PROGRESS'
  save()
  pushNotification(db, ticket.userId, '💬', 'Support replied', ticket.subject)
  res.json({ ticket })
})

export default api
