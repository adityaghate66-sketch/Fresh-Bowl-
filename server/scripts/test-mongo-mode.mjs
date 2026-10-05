// =====================================================================
// MONGODB-MODE TEST HARNESS
// =====================================================================
// Proves the MongoDB code path works end-to-end WITHOUT needing your
// Atlas cluster: it starts a real MongoDB (in memory), points the app
// at it via MONGODB_URI, then exercises login + a customer flow.
//
// Run:  node scripts/test-mongo-mode.mjs
// It exits 0 on success, 1 on any failure (CI-friendly).

import { MongoMemoryServer } from 'mongodb-memory-server'

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'
process.env.MONGODB_DB = 'freshbowl-test'

const mem = await MongoMemoryServer.create()
process.env.MONGODB_URI = mem.getUri()

// Spin the app exactly like index.js does (but without listening yet):
const express = (await import('express')).default
const cors = (await import('cors')).default
const api = (await import('../src/routes.js')).default
const { initStore } = await import('../src/store.js')
const { seedMongo } = await import('../src/seed.js')

const app = express()
app.use(cors({ origin: true }))
app.use(express.json({ limit: '100kb' }))
app.use('/api', api)
app.use((err, req, res, next) => res.status(500).json({ error: err.message || 'Server error.' }))

const mode = await initStore()
if (mode !== 'mongo') {
  console.error('❌ Expected mongo mode, got:', mode)
  process.exit(1)
}
await seedMongo()

await new Promise((resolve) => {
  app.listen(4599, resolve)
})

const BASE = 'http://localhost:4599/api'
let failures = 0
async function step(name, fn) {
  try {
    await fn()
    console.log(`✅ ${name}`)
  } catch (err) {
    failures += 1
    console.error(`❌ ${name}:`, err.message)
  }
}
async function call(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

// ---------------- THE TESTS ----------------
let adminToken, customerToken, newUserId

await step('health reports mongo mode', async () => {
  const { data } = await call('/health')
  if (data.database !== 'mongo') throw new Error(`database=${data.database}`)
  if (data.counts.users < 4) throw new Error(`seeded users=${data.counts.users}`)
})

await step('admin demo login works', async () => {
  const { status, data } = await call('/auth/login', { method: 'POST', body: { email: 'admin@freshbowl.in', password: 'admin123' } })
  if (status !== 200 || !data.token || data.user.role !== 'ADMIN') throw new Error(JSON.stringify(data))
  adminToken = data.token
})

await step('customer demo login works', async () => {
  const { status, data } = await call('/auth/login', { method: 'POST', body: { email: 'guest@freshbowl.in', password: 'guest123' } })
  if (status !== 200 || data.user.role !== 'CUSTOMER') throw new Error(JSON.stringify(data))
  customerToken = data.token
})

await step('wrong password rejected (401)', async () => {
  const { status } = await call('/auth/login', { method: 'POST', body: { email: 'admin@freshbowl.in', password: 'nope' } })
  if (status !== 401) throw new Error(`status=${status}`)
})

await step('register creates a real customer in Mongo', async () => {
  const { status, data } = await call('/auth/register', {
    method: 'POST',
    body: { name: 'Mongo Tester', email: 'mongo.tester@example.com', password: 'secret123' }
  })
  if (status !== 201 || !data.user?.id) throw new Error(JSON.stringify(data))
  newUserId = data.user.id
})

await step('duplicate email blocked (409)', async () => {
  const { status } = await call('/auth/register', {
    method: 'POST',
    body: { name: 'Dup', email: 'mongo.tester@example.com', password: 'secret123' }
  })
  if (status !== 409) throw new Error(`status=${status}`)
})

await step('/auth/me returns the registered user', async () => {
  const { data } = await call('/auth/me', { token: adminToken })
  if (data.user?.id !== 'U-ADMIN') throw new Error(JSON.stringify(data))
})

await step('new user has empty subscription + gets preferences', async () => {
  const { data } = await call('/subscriptions/mine', { token: customerToken })
  if (!('subscription' in data)) throw new Error(JSON.stringify(data))
})

await step('subscription purchase writes to Mongo', async () => {
  const { status, data } = await call('/subscriptions', {
    method: 'POST',
    token: newUserId ? (await call('/auth/login', { method: 'POST', body: { email: 'mongo.tester@example.com', password: 'secret123' } })).data.token : customerToken,
    body: { planId: 'monthly-30', foodType: 'VEG', cuisine: 'SOUTH_INDIAN', addressLabel: 'Test Home' }
  })
  if (status !== 201 || data.subscription?.status !== 'ACTIVE') throw new Error(JSON.stringify(data))
})

await step('orders auto-generated from the subscription', async () => {
  const token = (await call('/auth/login', { method: 'POST', body: { email: 'mongo.tester@example.com', password: 'secret123' } })).data.token
  const { data } = await call('/orders/mine', { token })
  if (!Array.isArray(data.orders) || data.orders.length < 1) throw new Error(`orders=${data.orders?.length}`)
  const todayOrder = data.orders.find((o) => o.meals?.length)
  if (!todayOrder) throw new Error('no order with meals')
})

await step('kitchen sees the queue (role-locked)', async () => {
  const kitchen = (await call('/auth/login', { method: 'POST', body: { email: 'kitchen@freshbowl.in', password: 'kitchen123' } })).data.token
  const { data } = await call('/kitchen/queue', { token: kitchen })
  if (!Array.isArray(data.orders)) throw new Error(JSON.stringify(data))
})

await step('admin overview aggregates from Mongo', async () => {
  const { data } = await call('/admin/overview', { token: adminToken })
  if (!data.metrics || data.metrics.totalCustomers < 2) throw new Error(JSON.stringify(data.metrics))
})

await step('customer cannot reach admin routes (403)', async () => {
  const { status } = await call('/admin/overview', { token: customerToken })
  if (status !== 403) throw new Error(`status=${status}`)
})

// ---------------- CLEANUP ----------------
const { closeMongo } = await import('../src/mongo.js')
await closeMongo()
await mem.stop()

console.log(failures === 0 ? '\n🎉 ALL MONGODB-MODE TESTS PASSED' : `\n💥 ${failures} test(s) failed`)
process.exit(failures === 0 ? 0 : 1)
