// =====================================================================
// OOTA BACKEND — SERVER ENTRY POINT
// =====================================================================
// Boot order (why it matters):
//   1. Try to connect to MongoDB Atlas (if MONGODB_URI is set).
//   2. Seed the demo accounts + indexes (only what's missing).
//   3. Only then start accepting web requests.
// If MongoDB is not configured or unreachable → automatic local file
// database fallback, so development never blocks.

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import api from './routes.js'
import { initStore, storeMode } from './store.js'
import { seedMongo } from './seed.js'
import { closeMongo } from './mongo.js'

const app = express()

// ---- Environment ------------------------------------------------------
const rawPort = Number(process.env.PORT)
const PORT = Number.isInteger(rawPort) && rawPort > 0 ? rawPort : 4000
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGINS ||
  [
    'https://fresh-bowl-lovat.vercel.app', // the live website
    'http://localhost:5173', // laptop dev server
    'http://127.0.0.1:5173', // laptop dev server (alternate)
    'https://localhost', // Android app (Capacitor)
    'capacitor://localhost' // iOS app (Capacitor)
  ].join(',')
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET is not set — using a temporary development secret. Set it in server/.env before real use.')
}

// ---- CORS (which websites may call this API) --------------------------
app.use(
  cors({
    origin(origin, cb) {
      // Allow same-origin/no-origin tools (curl, mobile apps) and listed sites.
      if (!origin || CLIENT_ORIGINS.includes(origin) || CLIENT_ORIGINS.includes('*')) return cb(null, true)
      cb(new Error('Not allowed by CORS'))
    }
  })
)
app.use(express.json({ limit: '100kb' }))

// ---- Routes -----------------------------------------------------------
app.use('/api', api)

// 404 for unknown API paths
app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found.' }))

// Error handler (keeps responses JSON)
app.use((err, req, res, next) => {
  console.error('API error:', err.message)
  res.status(err.message === 'Not allowed by CORS' ? 403 : 500).json({ error: err.message || 'Server error.' })
})

// ---- Boot: database first, then listen --------------------------------
async function start() {
  const mode = await initStore()
  if (mode === 'mongo') {
    try {
      await seedMongo()
    } catch (err) {
      console.error('Seeding failed (continuing):', err.message)
    }
  } else {
    console.log('📁 Using local demo file database (server/data/db.json).')
  }

  const server = app.listen(PORT, () => {
    console.log(`🥗 Oota API running on http://localhost:${PORT}`)
    console.log(`   Database: ${storeMode() === 'mongo' ? '🍃 MongoDB Atlas' : '📁 local file (demo)'}`)
    console.log(`   Allowed origins: ${CLIENT_ORIGINS.join(', ')}`)
  })

  // Graceful shutdown: stop accepting, close the DB connection cleanly.
  const shutdown = async () => {
    console.log('\nShutting down…')
    server.close(async () => {
      await closeMongo()
      process.exit(0)
    })
    setTimeout(() => process.exit(0), 3000).unref()
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

start().catch((err) => {
  console.error('Fatal startup error:', err)
  process.exit(1)
})
