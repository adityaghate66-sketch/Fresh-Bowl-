// =====================================================================
// OOTA BACKEND — JWT MIDDLEWARE
// =====================================================================
// Checks the "Authorization: Bearer <token>" header, verifies the token
// and attaches req.user = { id, role } for the routes to use.

import jwt from 'jsonwebtoken'

export function auth(required = true) {
  return (req, res, next) => {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) {
      if (!required) return next()
      return res.status(401).json({ error: 'Please sign in.' })
    }
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET)
      next()
    } catch {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' })
    }
  }
}

/** Restrict a route to specific roles. */
export function allow(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission for this.' })
    }
    next()
  }
}
