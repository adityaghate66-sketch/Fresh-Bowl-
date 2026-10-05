// =====================================================================
// SEED — put the starting data into MongoDB (only if it's not there yet)
// =====================================================================
// Runs every time the server starts, but only INSERTS what is missing.
// That makes it "idempotent": safe to run a million times.
//
// Creates:
//   • the 4 demo accounts (admin / kitchen / delivery / customer)
//   • indexes (database "sorting rules" that make login fast and
//     prevent two accounts with the same email)

import bcrypt from 'bcryptjs'
import { collection, mongoDbName } from './mongo.js'

const SEED_USERS = [
  { id: 'U-ADMIN', name: 'Aarav Admin', email: 'admin@freshbowl.in', phone: '9000000001', role: 'ADMIN', password: 'admin123' },
  { id: 'U-KITCHEN', name: 'Kiran Kitchen', email: 'kitchen@freshbowl.in', phone: '9000000002', role: 'KITCHEN', password: 'kitchen123' },
  { id: 'U-DELIVERY', name: 'Dev Delivery', email: 'delivery@freshbowl.in', phone: '9000000003', role: 'DELIVERY', password: 'delivery123' },
  { id: 'U-CUSTOMER', name: 'Guest', email: 'guest@freshbowl.in', phone: '9000000004', role: 'CUSTOMER', password: 'guest123' }
]

export async function seedMongo() {
  const users = collection('users')

  // ---- Indexes: fast lookups + no duplicate emails/phones ----
  await users.createIndex({ id: 1 }, { unique: true })
  await users.createIndex(
    { email: 1 },
    {
      unique: true,
      partialFilterExpression: { email: { $type: 'string' } },
      collation: { locale: 'en', strength: 2 } // case-insensitive emails
    }
  )
  await users.createIndex(
    { phone: 1 },
    {
      unique: true,
      partialFilterExpression: { phone: { $type: 'string' } },
      collation: { locale: 'en', strength: 2 }
    }
  )
  await collection('orders').createIndex({ id: 1 }, { unique: true })
  await collection('orders').createIndex({ date: 1 })
  await collection('orders').createIndex({ userId: 1, date: 1 })
  await collection('subscriptions').createIndex({ id: 1 }, { unique: true })
  await collection('subscriptions').createIndex({ userId: 1, status: 1 })
  await collection('notifications').createIndex({ userId: 1 })
  await collection('payments').createIndex({ id: 1 }, { unique: true })
  await collection('ratings').createIndex({ orderId: 1, userId: 1 }, { unique: true })
  await collection('tickets').createIndex({ id: 1 }, { unique: true })

  // ---- Demo accounts ----
  let created = 0
  for (const u of SEED_USERS) {
    const exists = await users.findOne({ id: u.id })
    if (exists) continue
    const { password, ...safe } = u
    await users.insertOne({
      ...safe,
      email: safe.email.toLowerCase(),
      passwordHash: bcrypt.hashSync(password, 10),
      preferences: { foodType: 'VEG', cuisine: 'SOUTH_INDIAN' },
      createdAt: new Date().toISOString()
    })
    created += 1
  }

  if (created) {
    console.log(`🌱 Seeded ${created} demo account(s) into MongoDB "${mongoDbName()}".`)
  } else {
    console.log('🌱 Seed check: demo accounts already present.')
  }
}
