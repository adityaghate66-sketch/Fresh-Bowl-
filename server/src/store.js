// =====================================================================
// STORE — ONE INTERFACE, TWO DATABASES
// =====================================================================
// All API routes talk to this module using four simple verbs:
//     findMany(collection, filter)   → list of documents
//     findOne(collection, filter)    → single document (or null)
//     insert(collection, document)   → add one
//     updateOne(collection, filter, patch) → change one
// plus getSingletons()/setSingletons() for small app-wide settings.
//
// MODE A — MongoDB (production): every verb becomes a real database call.
// MODE B — File fallback (demo/offline): same verbs over db.json.
//
// Routes don't know (or care) which mode is active. That's the point.

import { getDb, save as saveFileDb } from './db.js'
import { connectMongo, collection, mongoConfigured } from './mongo.js'

let MODE = 'file' // 'mongo' | 'file'

export async function initStore() {
  if (mongoConfigured()) {
    const db = await connectMongo()
    if (db) {
      MODE = 'mongo'
      return 'mongo'
    }
  }
  MODE = 'file'
  return 'file'
}

export function storeMode() {
  return MODE
}

// ---------------------------------------------------------------------
// MongoDB-side helpers
// ---------------------------------------------------------------------

// Fields that the demo file layer keeps as arrays; in MongoDB they are
// their own collections.
const MULTI_COLLECTIONS = {
  users: 'users',
  subscriptions: 'subscriptions',
  payments: 'payments',
  orders: 'orders',
  ratings: 'ratings',
  tickets: 'tickets',
  notifications: 'notifications',
  skips: 'skips',
  pauses: 'pauses',
  substitutions: 'substitutions'
}
function mongoFilter(filter) {
  // The file layer matches by plain properties; same shape works in Mongo.
  return { ...(filter || {}) }
}

async function mongoFindMany(name, filter) {
  if (name === 'orders' && filter?.date) {
    // Compound index-friendly query path
    return collection('orders').find({ date: filter.date }).sort({ createdAt: 1 }).toArray()
  }
  return collection(name).find(mongoFilter(filter)).toArray()
}

async function mongoFindOne(name, filter) {
  return collection(name).findOne(mongoFilter(filter))
}

async function mongoInsert(name, doc) {
  const withTime = { createdAt: new Date().toISOString(), ...doc }
  await collection(name).insertOne({ ...withTime })
  return withTime
}

async function mongoUpdateOne(name, filter, patch) {
  const res = await collection(name).findOneAndUpdate(
    mongoFilter(filter),
    { $set: patch },
    { returnDocument: 'after' }
  )
  return res || null
}

// ---------------------------------------------------------------------
// File-side helpers (existing demo database)
// ---------------------------------------------------------------------
function fileMany(name, filter) {
  const db = getDb()
  const list = db[name] || []
  if (!filter || Object.keys(filter).length === 0) return list.slice()
  return list.filter((item) => Object.entries(filter).every(([k, v]) => item[k] === v))
}

function fileOne(name, filter) {
  return fileMany(name, filter)[0] || null
}

function fileInsert(name, doc) {
  const db = getDb()
  if (!db[name]) db[name] = []
  db[name].push(doc)
  saveFileDb()
  return doc
}

function fileUpdate(name, filter, patch) {
  const list = fileMany(name, filter)
  if (!list.length) return null
  Object.assign(list[0], patch)
  saveFileDb()
  return list[0]
}

// ---------------------------------------------------------------------
// PUBLIC API — every route uses only these
// ---------------------------------------------------------------------

/** All documents in a "collection", optionally filtered. */
export async function findMany(name, filter) {
  if (MODE === 'mongo') return mongoFindMany(name, filter)
  return fileMany(name, filter)
}

/** First matching document, or null. */
export async function findOne(name, filter) {
  if (MODE === 'mongo') return mongoFindOne(name, filter)
  return fileOne(name, filter)
}

/** Add one document. */
export async function insert(name, doc) {
  if (MODE === 'mongo') return mongoInsert(name, doc)
  return fileInsert(name, doc)
}

/** Patch the first matching document; returns the updated doc or null. */
export async function updateOne(name, filter, patch) {
  if (MODE === 'mongo') return mongoUpdateOne(name, filter, patch)
  return fileUpdate(name, filter, patch)
}

/** Patch EVERY matching document (e.g. mark all my notifications read). */
export async function updateMany(name, filter, patch) {
  if (MODE === 'mongo') {
    const res = await collection(name).updateMany(mongoFilter(filter), { $set: patch })
    return res.modifiedCount
  }
  const db = getDb()
  const list = fileMany(name, filter)
  for (const item of list) Object.assign(item, patch)
  if (list.length) saveFileDb()
  return list.length
}

/** Replace or create a document that matches `filter` (upsert-lite). */
export async function upsertOne(name, filter, doc) {
  const existing = await findOne(name, filter)
  if (existing) return updateOne(name, filter, doc)
  return insert(name, { ...filter, ...doc })
}

/** Remove documents matching a filter (used by resume/skip cleanup). */
export async function deleteMany(name, filter) {
  if (MODE === 'mongo') {
    const res = await collection(name).deleteMany(mongoFilter(filter))
    return res.deletedCount
  }
  const db = getDb()
  const before = (db[name] || []).length
  if (!filter || Object.keys(filter).length === 0) {
    db[name] = []
  } else {
    db[name] = (db[name] || []).filter(
      (item) => !Object.entries(filter).every(([k, v]) => item[k] === v)
    )
  }
  saveFileDb()
  return before - (db[name] || []).length
}

// Small app-wide settings kept outside collections:
// resetTokens { token: { userId, expiresAt } }, unavailableFoodIds [..]
export async function getSingletons() {
  if (MODE === 'mongo') {
    const col = collection('appstate')
    const docs = await col.find({}).toArray()
    const state = {}
    for (const d of docs) state[d._id] = d.value
    return {
      resetTokens: state.resetTokens || {},
      unavailableFoodIds: state.unavailableFoodIds || []
    }
  }
  const db = getDb()
  return {
    resetTokens: db.resetTokens || {},
    unavailableFoodIds: db.unavailableFoodIds || []
  }
}

export async function setSingletons(patch) {
  if (MODE === 'mongo') {
    const col = collection('appstate')
    for (const [key, value] of Object.entries(patch)) {
      await col.updateOne({ _id: key }, { $set: { value } }, { upsert: true })
    }
    return
  }
  const db = getDb()
  Object.assign(db, patch)
  saveFileDb()
}

export { MULTI_COLLECTIONS }