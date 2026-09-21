// =====================================================================
// APP STATE (React Context) — the app's shared memory
// =====================================================================
// Every screen reads and writes through here; changes auto-save to the
// browser's localStorage. The automation engine (services/engine.js)
// supplies seed users and business-rule validation.

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { loadState, saveState, clearState, STORAGE_KEY } from '../services/storage'
import { activateSubscription, processPayment } from '../services/subscriptionService'
import {
  SEED_USERS, SEED_TICKETS, generateOrdersForDate, canSkip as engineCanSkip,
  canPause as engineCanPause, BUSINESS_RULES
} from '../services/engine'
import { todayString, addDays } from '../utils/date'

const AppContext = createContext(null)

const DEFAULT_STATE = {
  onboarded: false,
  authUserId: null, // null = logged out (guest mode still works for customers)
  users: SEED_USERS,
  profile: { name: '', email: '', phone: '' },
  preferences: { foodType: 'VEG', cuisine: 'SOUTH_INDIAN' },
  addresses: [],
  subscription: null,
  payments: [],
  notifications: [],
  orders: [],
  pauses: [],
  skips: [],
  substitutions: [],
  ratings: [],
  tickets: SEED_TICKETS,
  resetTokens: {},
  unavailableFoodIds: [],
  deliveryStep: 0
}

let idCounter = 0
function makeId(prefix) {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`
}

export function AppProvider({ children }) {
  const [state, setState] = useState(() => loadState(DEFAULT_STATE))
  const [toasts, setToasts] = useState([])
  const toastTimers = useRef({})

  // Persist every change so nothing is lost on refresh.
  useEffect(() => {
    saveState(state)
  }, [state])

  // =====================================================================
  // DAILY AUTOMATION HEART (runs when the app opens and every minute)
  // =====================================================================
  // This is what a real server would run at midnight. In order:
  //   1. Expires an active subscription whose end date has passed.
  //   2. Sends a renewal reminder 3 days before expiry (once only).
  //   3. Generates today's + tomorrow's meal orders for active plans.
  const automateDay = useMemo(
    () =>
      (s) => {
        let next = s
        const today = todayString()
        const sub = next.subscription
        if (sub && sub.status === 'ACTIVE' && sub.endDate < today) {
          next = {
            ...next,
            subscription: { ...sub, status: 'EXPIRED' },
            notifications: [{
              id: makeId('NTF'), icon: '⌛', title: 'Subscription expired',
              body: `${sub.planName} has ended. Renew now to keep your meals coming — your history is safe.`,
              at: new Date().toISOString(), read: false
            }, ...next.notifications]
          }
        }
        const fresh = next.subscription
        if (fresh && fresh.status === 'ACTIVE') {
          const msLeft = new Date(`${fresh.endDate}T00:00:00`) - new Date(`${today}T00:00:00`)
          const daysLeft = Math.round(msLeft / 86400000)
          if (daysLeft === 3 && !next.notifications.some((n) => n.title === 'Renewal reminder')) {
            next = {
              ...next,
              notifications: [{
                id: makeId('NTF'), icon: '🔔', title: 'Renewal reminder',
                body: `Only 3 days left in ${fresh.planName}. Renew from My Subscription so you never miss a meal.`,
                at: new Date().toISOString(), read: false
              }, ...next.notifications]
            }
          }
          // Generate today's + tomorrow's orders if they don't exist yet.
          const needed = [today, addDays(today, 1)]
          const existing = new Set(next.orders.map((o) => o.date))
          const newOrders = needed
            .filter((d) => !existing.has(d))
            .flatMap((d) => generateOrdersForDate(fresh, next.preferences, d, next.skips, next.pauses))
          if (newOrders.length) next = { ...next, orders: [...newOrders, ...next.orders] }
        }
        return next
      },
    []
  )

  useEffect(() => {
    setState((s) => automateDay(s))
    const timer = setInterval(() => setState((s) => automateDay(s)), 60 * 1000)
    return () => clearInterval(timer)
  }, [automateDay])

  const pushToast = (emoji, title, body, tone = 'green') => {
    const id = makeId('TST')
    setToasts((t) => [...t, { id, emoji, title, body, tone }])
    toastTimers.current[id] = setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
      delete toastTimers.current[id]
    }, 4200)
  }
  const dismissToast = (id) =>
    setToasts((t) => t.filter((x) => x.id !== id))

  const currentUser = useMemo(
    () => state.users.find((u) => u.id === state.authUserId) || null,
    [state.users, state.authUserId]
  )

  const value = useMemo(() => {
    const notify = (icon, title, body) =>
      setState((s) => ({ ...s, notifications: [{ id: makeId('NTF'), icon, title, body, at: new Date().toISOString(), read: false }, ...s.notifications].slice(0, 50) }))

    const logToast = (emoji, title, body, tone) => {
      pushToast(emoji, title, body, tone)
      notify(emoji, title, body)
    }

    return {
      state,
      currentUser,
      toasts,
      dismissToast,
      toast: pushToast,
      rules: BUSINESS_RULES,

      // ================= AUTH (Stage 2 roles) =================
      login: async ({ identifier, password, role }) => {
        await new Promise((r) => setTimeout(r, 700)) // feels like a real network call
        const user = state.users.find(
          (u) =>
            (u.email === identifier.trim().toLowerCase() || u.phone === identifier.trim()) &&
            u.password === password
        )
        if (!user) return { ok: false, error: 'Email/mobile or password is incorrect.' }
        if (role && user.role !== role) {
          return { ok: false, error: `This account is not a ${role.toLowerCase()} account.` }
        }
        setState((s) => ({
          ...s,
          authUserId: user.id,
          onboarded: true,
          profile: user.role === 'CUSTOMER'
            ? { name: user.name, email: user.email, phone: user.phone }
            : s.profile
        }))
        pushToast('👋', `Welcome, ${user.name.split(' ')[0]}!`, `Signed in as ${user.role === 'CUSTOMER' ? 'Customer' : user.role.charAt(0) + user.role.slice(1).toLowerCase()}.`)
        return { ok: true, user }
      },

      register: async ({ name, email, phone, password, role = 'CUSTOMER' }) => {
        await new Promise((r) => setTimeout(r, 700))
        if (state.users.some((u) => u.email === email.trim().toLowerCase())) {
          return { ok: false, error: 'That email is already registered.' }
        }
        const user = {
          id: makeId('U'), name: name.trim() || 'Guest', email: email.trim().toLowerCase(),
          phone: phone || '', role, password
        }
        setState((s) => ({
          ...s,
          users: [...s.users, user],
          authUserId: user.id,
          onboarded: true,
          profile: { name: user.name, email: user.email, phone: user.phone }
        }))
        logToast('🎉', 'Account created', `Welcome to FreshBowl, ${user.name}!`, 'green')
        return { ok: true, user }
      },

      logout: () => {
        setState((s) => ({ ...s, authUserId: null }))
        pushToast('👋', 'Signed out', 'See you at the next meal!', 'amber')
      },

      // ================= Preferences (core business choice) =================
      setPreferences: (patch) => {
        setState((s) => {
          if (s.subscription && s.subscription.status === 'ACTIVE') return s // locked
          return { ...s, preferences: { ...s.preferences, ...patch } }
        })
      },

      // ================= Onboarding =================
      completeOnboarding: ({ profile, preferences }) => {
        const welcome = {
          id: makeId('NTF'), icon: '🎉', title: 'Welcome to FreshBowl!',
          body: 'Your taste profile is saved. Explore today\u2019s menu and pick a plan to start eating healthy every day.',
          at: new Date().toISOString(), read: false
        }
        setState((s) => ({
          ...s,
          onboarded: true,
          profile: profile ?? s.profile,
          preferences: preferences ?? s.preferences,
          notifications: [welcome, ...s.notifications]
        }))
      },

      // ================= Profile =================
      saveProfile: (patch) => setState((s) => ({ ...s, profile: { ...s.profile, ...patch } })),

      // ================= Addresses =================
      addAddress: (addr) =>
        setState((s) => {
          const address = { id: makeId('ADR'), isDefault: s.addresses.length === 0, ...addr }
          return { ...s, addresses: [...s.addresses, address] }
        }),
      updateAddress: (id, patch) =>
        setState((s) => ({ ...s, addresses: s.addresses.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      deleteAddress: (id) =>
        setState((s) => {
          const rest = s.addresses.filter((a) => a.id !== id)
          if (rest.length && !rest.some((a) => a.isDefault)) rest[0] = { ...rest[0], isDefault: true }
          return { ...s, addresses: rest }
        }),
      setDefaultAddress: (id) =>
        setState((s) => ({ ...s, addresses: s.addresses.map((a) => ({ ...a, isDefault: a.id === id })) })),

      // ================= Renew / extend (Part 5: Subscription expiry) ====
      renewSubscription: (plan) => {
        if (!state.subscription) return { ok: false, error: 'No previous subscription.' }
        const payment = processPayment({ amount: plan.price, method: 'UPI' })
        if (payment.status !== 'SUCCESS') {
          logToast('❌', 'Payment failed', 'Renewal was NOT activated. You can safely try again.', 'red')
          setState((s) => ({ ...s, payments: [payment, ...s.payments] }))
          return { ok: false, payment }
        }
        setState((s) => {
          const old = s.subscription
          const startDate = old.endDate < todayString() ? todayString() : addDays(old.endDate, 1)
          const renewed = {
            ...activateSubscription(plan, old.addressId),
            startDate,
            endDate: addDays(startDate, plan.durationDays - 1),
            customerName: s.profile.name || 'Guest',
            addressLabel: old.addressLabel,
            cycle: (old.cycle || 1) + 1
          }
          const orders = [
            ...generateOrdersForDate(renewed, s.preferences, todayString(), s.skips, s.pauses),
            ...generateOrdersForDate(renewed, s.preferences, addDays(todayString(), 1), s.skips, s.pauses)
          ]
          const reminder = s.notifications.find((n) => n.title === 'Renewal reminder')
          return {
            ...s,
            subscription: renewed,
            payments: [{ ...payment, planName: plan.name }, ...s.payments],
            orders: [...orders, ...s.orders],
            notifications: reminder
              ? s.notifications.map((n) => (n.title === 'Renewal reminder' ? { ...n, read: true } : n))
              : s.notifications
          }
        })
        logToast('🔄', 'Renewed!', `${plan.name} is active again — meals continue right away.`, 'green')
        return { ok: true }
      },

      // ================= Subscription + payment (Stage 1+3 flow) =================
      subscribe: (plan, addressId, options = {}) => {
        const payment = processPayment({
          amount: plan.price,
          method: options.method || 'UPI',
          simulateFailure: !!options.simulateFailure
        })

        if (payment.status !== 'SUCCESS') {
          logToast('❌', 'Payment failed', `${plan.name} was NOT activated. You can safely try again.`, 'red')
          setState((s) => ({ ...s, payments: [payment, ...s.payments] }))
          return { ok: false, payment }
        }

        const address = state.addresses.find((a) => a.id === addressId)
        const subscription = {
          ...activateSubscription(plan, addressId),
          customerName: state.profile.name || 'Guest',
          addressLabel: address ? address.label : 'Default address'
        }
        // AUTOMATION: generate today's AND tomorrow's orders immediately
        // (the daily job would do this every midnight in production).
        const today = todayString()
        const tomorrow = addDays(today, 1)
        const orders = [
          ...generateOrdersForDate(subscription, state.preferences, today, state.skips, state.pauses),
          ...generateOrdersForDate(subscription, state.preferences, tomorrow, state.skips, state.pauses)
        ]

        setState((s) => ({
          ...s,
          subscription,
          deliveryStep: 0,
          payments: [payment, ...s.payments],
          orders: [...orders, ...s.orders]
        }))
        logToast('💳', 'Payment successful', `₹${plan.price.toLocaleString('en-IN')} paid. Subscription active!`, 'green')
        return { ok: true, payment, subscription }
      },

      // ================= Pause / resume (Rule 12) =================
      pauseSubscription: (start, end) => {
        const check = engineCanPause(state.subscription, state.pauses, start, end)
        if (!check.ok) {
          pushToast('⚠️', 'Cannot pause', check.reason, 'red')
          return { ok: false, error: check.reason }
        }
        setState((s) => ({
          ...s,
          subscription: { ...s.subscription, status: 'PAUSED' },
          pauses: [...s.pauses, { id: makeId('PSE'), start, end }]
        }))
        logToast('⏸️', 'Subscription paused', `${check.days} day${check.days > 1 ? 's' : ''} paused — no meals will be generated. Enjoy your break!`, 'amber')
        return { ok: true }
      },

      resumeSubscription: () => {
        setState((s) => {
          if (!s.subscription) return s
          const today = todayString()
          const activePauses = s.pauses.filter((p) => p.end >= today)
          return { ...s, subscription: { ...s.subscription, status: 'ACTIVE' }, pauses: activePauses }
        })
        logToast('▶️', 'Subscription resumed', 'Meals resume with the next generated order.', 'green')
      },

      // ================= Skip a meal (Rule 11) =================
      skipMeal: (date, mealType, mealName) => {
        const check = engineCanSkip(state.subscription, date, mealType)
        if (!check.ok) {
          pushToast('⚠️', 'Cannot skip', check.reason, 'red')
          return { ok: false, error: check.reason }
        }
        setState((s) => ({
          ...s,
          skips: [...s.skips, { id: makeId('SKP'), date, mealType, mealName }],
          orders: s.orders.map((o) =>
            o.date === date ? { ...o, meals: o.meals.filter((m) => m.mealType !== mealType) } : o
          ).filter((o) => o.meals.length > 0)
        }))
        logToast('⏭️', 'Meal skipped', `${mealName} on ${date} will not be prepared or delivered.`, 'amber')
        return { ok: true }
      },

      // ================= Password reset (demo — token shown on screen) ===
      requestPasswordReset: (identifier) => {
        const user = state.users.find(
          (u) => u.email === identifier.trim().toLowerCase() || u.phone === identifier.trim()
        )
        if (!user) {
          return { ok: false, error: 'No account found with that email or mobile number.' }
        }
        const token = `FB-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
        setState((s) => ({ ...s, resetTokens: { ...s.resetTokens, [user.id]: token } }))
        return { ok: true, token }
      },

      resetPassword: (identifier, token, newPassword) => {
        const user = state.users.find(
          (u) => u.email === identifier.trim().toLowerCase() || u.phone === identifier.trim()
        )
        if (!user) return { ok: false, error: 'No account found.' }
        if (state.resetTokens?.[user.id] !== token.trim().toUpperCase()) {
          return { ok: false, error: 'That reset code is not valid. Request a new one.' }
        }
        if ((newPassword || '').length < 4) {
          return { ok: false, error: 'New password must be at least 4 characters.' }
        }
        setState((s) => {
          const users = s.users.map((u) => (u.id === user.id ? { ...u, password: newPassword } : u))
          const resetTokens = { ...s.resetTokens }
          delete resetTokens[user.id]
          return { ...s, users, resetTokens }
        })
        return { ok: true }
      },

      changePassword: (currentPassword, newPassword) => {
        if (!currentUser || currentUser.password !== currentPassword) {
          return { ok: false, error: 'Current password is incorrect.' }
        }
        if ((newPassword || '').length < 4) {
          return { ok: false, error: 'New password must be at least 4 characters.' }
        }
        setState((s) => ({
          ...s,
          users: s.users.map((u) => (u.id === currentUser.id ? { ...u, password: newPassword } : u))
        }))
        return { ok: true }
      },

      // ================= Ratings (Rule 10 — only after delivery) =================
      rateOrder: (orderId, scores, review = '') => {
        const order = state.orders.find((o) => o.id === orderId)
        if (!order || order.status !== 'DELIVERED') {
          pushToast('⚠️', 'Not allowed', 'You can only rate meals after delivery.', 'red')
          return { ok: false }
        }
        const rating = { id: makeId('RTG'), orderId, date: order.date, ...scores, review, at: new Date().toISOString() }
        setState((s) => ({ ...s, ratings: [rating, ...s.ratings], orders: s.orders.map((o) => (o.id === orderId ? { ...o, rated: true } : o)) }))
        logToast('⭐', 'Thanks for rating!', 'Your feedback reaches the kitchen directly.', 'green')
        return { ok: true }
      },

      // ================= Support tickets (Stage 7) =================
      createTicket: (subject, category, message) => {
        const ticket = {
          id: makeId('TKT'), subject, category, status: 'OPEN', customer: state.profile.name || 'Guest',
          messages: [{ from: 'CUSTOMER', text: message, at: new Date().toISOString() }]
        }
        setState((s) => ({ ...s, tickets: [ticket, ...s.tickets] }))
        logToast('🎟️', 'Ticket created', `${ticket.id} — our team will respond within 24 hours.`, 'blue')
        return { ok: true, ticket }
      },

      replyTicket: (ticketId, text, from = 'SUPPORT') => {
        setState((s) => ({
          ...s,
          tickets: s.tickets.map((t) =>
            t.id === ticketId
              ? { ...t, status: from === 'SUPPORT' ? 'IN_PROGRESS' : 'OPEN', messages: [...t.messages, { from, text, at: new Date().toISOString() }] }
              : t
          )
        }))
      },

      setTicketStatus: (ticketId, status) =>
        setState((s) => ({ ...s, tickets: s.tickets.map((t) => (t.id === ticketId ? { ...t, status } : t)) })),

      // ================= Order status (kitchen/delivery/admin actions) =================
      setOrderStatus: (orderId, status, who = 'System') => {
        setState((s) => ({
          ...s,
          orders: s.orders.map((o) =>
            o.id === orderId
              ? { ...o, status, history: [...(o.history || []), { status, at: new Date().toISOString(), by: who }] }
              : o
          )
        }))
        if (status === 'DELIVERED') {
          const order = state.orders.find((o) => o.id === orderId)
          logToast('📦', 'Order delivered!', `Enjoy your meal${order ? `, ${order.customerName}` : ''}! Rate it from Orders.`, 'green')
        }
      },

      assignDelivery: (orderId, staffId) => {
        setState((s) => ({
          ...s,
          orders: s.orders.map((o) => (o.id === orderId ? { ...o, assignedTo: staffId, status: o.status === 'ASSIGNED' || o.status === 'READY' ? 'ASSIGNED' : o.status } : o))
        }))
        pushToast('🛵', 'Delivery assigned', `${orderId} assigned to ${staffId === 'U-DELIVERY' ? 'Dev Delivery' : staffId}.`, 'blue')
      },

      // Kitchen substitution (Rule 13 — always recorded)
      substituteMeal: (orderId, mealType, newName, reason) => {
        const order = state.orders.find((o) => o.id === orderId)
        const meal = order?.meals.find((m) => m.mealType === mealType)
        const record = {
          id: makeId('SUB'), orderId, date: order?.date, mealType,
          original: meal?.name || '—', replacement: newName, reason,
          by: 'Kitchen', at: new Date().toISOString()
        }
        setState((s) => ({
          ...s,
          substitutions: [record, ...s.substitutions],
          orders: s.orders.map((o) =>
            o.id === orderId
              ? { ...o, meals: o.meals.map((m) => (m.mealType === mealType ? { ...m, name: newName, substituted: true } : m)) }
              : o
          )
        }))
        logToast('🔄', 'Meal substituted', `${meal?.name || 'Meal'} → ${newName} (${reason}). Customer notified.`, 'amber')
      },

      // ================= Admin: broadcast + menu availability toggle =================
      broadcastNotification: (icon, title, body) => {
        logToast(icon, title, body, 'blue')
      },

      toggleFoodAvailability: (foodId) => {
        setState((s) => ({
          ...s,
          unavailableFoodIds: s.unavailableFoodIds.includes(foodId)
            ? s.unavailableFoodIds.filter((f) => f !== foodId)
            : [...s.unavailableFoodIds, foodId]
        }))
      },

      // ================= Notifications =================
      markNotificationsRead: () =>
        setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

      // ================= Demo helpers =================
      advanceDeliveryStep: () => setState((s) => ({ ...s, deliveryStep: Math.min(5, s.deliveryStep + 1) })),

      resetAll: () => {
        clearState()
        setState({ ...DEFAULT_STATE, profile: { ...DEFAULT_STATE.profile } })
        setToasts([])
      }
    }
  }, [state, currentUser, toasts])

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}

export { STORAGE_KEY }
