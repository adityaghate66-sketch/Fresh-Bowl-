// =====================================================================
// MONGODB CONNECTION (the "big professional database" layer)
// =====================================================================
// WHAT THIS DOES (in beginner terms):
//   • Your app's data (users, subscriptions, orders…) is stored in
//     MongoDB Atlas — a cloud database that keeps running even when
//     your computer is off.
//   • We connect using ONE secret string called MONGODB_URI that lives
//     in server/.env (never committed to git).
//   • If the URI is missing or the internet is down, the app does NOT
//     crash — it falls back to the local demo file database. You can
//     always develop offline.
//
// One MongoDB "database" holds several "collections" (like folders of
// similar papers): users, subscriptions, orders, payments, ratings…

import { MongoClient } from 'mongodb'

let client = null
let dbHandle = null

/** True when MONGODB_URI is configured. */
export function mongoConfigured() {
  return Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.trim())
}

/** Database name — override with MONGODB_DB if you ever need to. */
export function mongoDbName() {
  return process.env.MONGODB_DB || 'freshbowl'
}

/**
 * Connect once and reuse the connection.
 * Returns the db handle, or null when not configured / unreachable.
 */
export async function connectMongo() {
  if (dbHandle) return dbHandle
  if (!mongoConfigured()) return null

  const uri = process.env.MONGODB_URI.trim()
  try {
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 8000, // fail fast if URI/IP is wrong
      connectTimeoutMS: 8000
    })
    await client.connect()
    // A cheap "ping" proves the credentials + network actually work.
    await client.db('admin').command({ ping: 1 })
    dbHandle = client.db(mongoDbName())
    console.log(`🍃 MongoDB connected → database "${mongoDbName()}"`)
    return dbHandle
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message)
    console.error('   → Falling back to the local demo file database (server/data/db.json).')
    console.error('   → Check: MONGODB_URI in server/.env, Atlas Network Access (allow your IP / 0.0.0.0), user & password.')
    client = null
    dbHandle = null
    return null
  }
}

/** Handle to a collection (a "folder" inside the database). */
export function collection(name) {
  if (!dbHandle) throw new Error('MongoDB not connected')
  return dbHandle.collection(name)
}

/** Close cleanly on shutdown (Ctrl+C, host restart). */
export async function closeMongo() {
  try {
    if (client) await client.close()
  } catch {
    // ignore — we're shutting down anyway
  }
  client = null
  dbHandle = null
}
