// =====================================================================
// OOTA BACKEND — SERVER ENTRY POINT
// =====================================================================
// Loads environment variables, sets up security middleware (CORS, JSON
// limits), mounts all API routes under /api and starts listening.

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import api from './routes.js'

const app = express()

// ---- Environment ------------------------------------------------------
// PORT: prefer .env; only fall back if it's missing or empty/0.
const rawPort = Number(process.env.PORT)
const PORT = Number.isInteger(rawPort) && rawPort > 0 ? rawPort : 4000
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
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

app.listen(PORT, () => {
  console.log(`🥗 Oota API running on http://localhost:${PORT}`)
  console.log(`   Allowed origins: ${CLIENT_ORIGINS.join(', ')}`)
})
