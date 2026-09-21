// =====================================================================
// APP STATE (React Context) — the app's shared memory, two modes
// =====================================================================
// MODE 1 — LOCAL (guest / onboarding / offline):
//     Everything lives in browser memory exactly as before. Every original
//     behavior, business rule and toast is preserved untouched.
//
// MODE 2 — SERVER (after signing in):
//     state is built from the live API (services/serverMode.js) and every
//     business action hits the real backend. Screens don't change — they
//     still read state.orders, currentUser, etc. — because this file gives
//     them identical shapes in both modes.
//
// Which mode? Signing in returns a token → server mode. Logging out or
// clearing the token → back to local mode automatically.

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { loadState, saveState, clearState, STORAGE_KEY } from '../services/storage'
import { activateSubscription, processPayment } from '../services/subscriptionService'
import {
  SEED_USERS, SEED_TICKETS, generateOrdersForDate, canSkip as engineCanSkip,
  canPause as engineCanPause, BUSINESS_RULES
} from '../services/engine'
import { todayString, addDays } from '../utils/date'
import * as srv from '../services/serverMode'

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

// (address helpers live in services/serverMode.js so both modes share them)

let idCounter = 0
function makeId(prefix) {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`
}

export function AppProvider({ children }) {
  const [state, setState] = useState(() => loadState(DEFAULT_STATE))
  const [serverState, setServerState] = useState(null)
  const [booted, setBooted] = useState(false)
  const [toasts, setToasts] = useState([])
  const toastTimers = useRef({})

  // On boot: if we have a saved token, restore the server session.
  useEffect(() => {
    let live = true
    srv.buildServerState().then((s) => {
      if (!live) return
      if (s) setServerState(s)
      setBooted(true)
    })
    return () => {
      live = false
    }
  }, [])

  // Persist every local change so nothing is lost on refresh.
  useEffect(() => {
    if (!serverState) saveState(state)
  }, [state, serverState])

  // =====================================================================
  // DAILY AUTOMATION HEART (local mode; the server runs its own)
  // =====================================================================
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

  const currentUser = serverState
    ? serverState.currentUser
    : state.users.find((u) => u.id === state.authUserId) || null

  const refreshServer = async () => {
    const s = await srv.buildServerState()
    if (s) setServerState(s)
    return s
  }

  const value = useMemo(() => {
    const notify = (icon, title, body) =>
      setState((s) => ({ ...s, notifications: [{ id: makeId('NTF'), icon, title, body, at: new Date().toISOString(), read: false }, ...s.notifications].slice(0, 50) }))

    const logToast = (emoji, title, body, tone) => {
      pushToast(emoji, title, body, tone)
      notify(emoji, title, body)
    }

    // ===================================================================
    // UNIFIED AUTH — server first, offline demo fallback
    // ===================================================================
    // Signing in ALWAYS tries the real backend. Only if the network itself
    // is down do we fall back to the local demo accounts, so the app still
    // works completely offline. Wrong-password responses from the server
    // are shown as-is (no silent fallback).
    const isNetworkError = (err) =>
      err instanceof TypeError || /failed to fetch|network|load failed/i.test(err?.message || '')

    const unifiedAuth = {
      login: async ({ identifier, password, role }) => {
        try {
          const r = await srv.serverLogin({ identifier, password, role })
          const s = await refreshServer()
          if (!s) return { ok: false, error: 'Could not load your account. Try again.' }
          pushToast('👋', `Welcome, ${r.user.name.split(' ')[0]}!`, `Signed in as ${r.user.role === 'CUSTOMER' ? 'Customer' : r.user.role.charAt(0) + r.user.role.slice(1).toLowerCase()}.`)
          return { ok: true, user: r.user }
        } catch (err) {
          if (isNetworkError(err)) {
            const localResult = await localLogin({ identifier, password, role })
            if (localResult.ok) {
              pushToast('📴', 'Offline demo mode', 'Server unreachable — using the demo on this device.', 'amber')
            }
            return localResult
          }
          return { ok: false, error: err.message }
        }
      },

      register: async (d) => {
        try {
          const r = await srv.serverRegister(d)
          await refreshServer()
          logToast('🎉', 'Account created', `Welcome to FreshBowl, ${r.user.name}!`, 'green')
          return { ok: true, user: r.user }
        } catch (err) {
          if (isNetworkError(err)) {
            const localResult = localRegister(d)
            if (localResult.ok) {
              pushToast('📴', 'Offline demo mode', 'Server unreachable — account saved on this device.', 'amber')
            }
            return localResult
          }
          return { ok: false, error: err.message }
        }
      },

      requestPasswordReset: async (identifier) => {
        try {
          return await srv.serverRequestPasswordReset(identifier)
        } catch (err) {
          if (isNetworkError(err)) return localRequestPasswordReset(identifier)
          return { ok: false, error: err.message }
        }
      },

      resetPassword: async (identifier, token, newPassword) => {
        try {
          return await srv.serverResetPassword(identifier, token, newPassword)
        } catch (err) {
          if (isNetworkError(err)) return localResetPassword(identifier, token, newPassword)
          return { ok: false, error: err.message }
        }
      }
    }

    // ===================================================================
    // LOCAL MODE ACTIONS (unchanged from the original implementation)
    // ===================================================================
    const localLogin = async ({ identifier, password, role }) => {
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
    }

    const localRegister = ({ name, email, phone, password, role = 'CUSTOMER' }) => {
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
    }

    const localRequestPasswordReset = (identifier) => {
      const user = state.users.find(
        (u) => u.email === identifier.trim().toLowerCase() || u.phone === identifier.trim()
      )
      if (!user) {
        return { ok: false, error: 'No account found with that email or mobile number.' }
      }
      const token = `FB-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
      setState((s) => ({ ...s, resetTokens: { ...s.resetTokens, [user.id]: token } }))
      return { ok: true, token }
    }

    const localResetPassword = (identifier, token, newPassword) => {
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
    }

    const local = {
      state,
      currentUser,
      toasts,
      dismissToast,
      toast: pushToast,
      rules: BUSINESS_RULES,
      ...unifiedAuth,

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
      // (moved into unifiedAuth — tries the server first, offline fallback)

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

    // ===================================================================
    // SERVER MODE ACTIONS — same contracts, real backend behind them
    // ===================================================================
    if (!serverState) {
      return { ...local, booted, mode: 'local' }
    }

    const S = serverState
    const activeState = { ...S, deliveryStep: 0 }

    const serverAddressActions = {
      addAddress: (addr) =>
        setServerState((s) => {
          const addresses = [...s.addresses, { id: makeId('ADR'), isDefault: s.addresses.length === 0, ...addr }]
          saveLocalAddresses(addresses)
          return { ...s, addresses }
        }),
      updateAddress: (id, patch) =>
        setServerState((s) => {
          const addresses = s.addresses.map((a) => (a.id === id ? { ...a, ...patch } : a))
          saveLocalAddresses(addresses)
          return { ...s, addresses }
        }),
      deleteAddress: (id) =>
        setServerState((s) => {
          let addresses = s.addresses.filter((a) => a.id !== id)
          if (addresses.length && !addresses.some((a) => a.isDefault)) {
            addresses = addresses.map((a, i) => (i === 0 ? { ...a, isDefault: true } : a))
          }
          saveLocalAddresses(addresses)
          return { ...s, addresses }
        }),
      setDefaultAddress: (id) =>
        setServerState((s) => {
          const addresses = s.addresses.map((a) => ({ ...a, isDefault: a.id === id }))
          saveLocalAddresses(addresses)
          return { ...s, addresses }
        })
    }

    const server = {
      state: activeState,
      currentUser,
      toasts,
      dismissToast,
      toast: pushToast,
      rules: BUSINESS_RULES,
      ...serverAddressActions,

      // (login / register / password reset come from unifiedAuth above —
      //  they try the real server first and fall back offline)

      logout: () => {
        srv.serverLogout()
        setServerState(null)
        pushToast('👋', 'Signed out', 'See you at the next meal!', 'amber')
      },

      setPreferences: (patch) => {
        if (S.subscription && S.subscription.status === 'ACTIVE') return // locked, same rule as local
        setServerState((s) => ({ ...s, preferences: { ...s.preferences, ...patch } }))
        srv.serverSetPreferences(S.token, { ...S.preferences, ...patch }).catch((e) =>
          pushToast('⚠️', 'Preference not saved', e.message, 'red')
        )
      },

      completeOnboarding: ({ preferences }) => {
        if (preferences) server.setPreferences(preferences)
      },

      saveProfile: (patch) => {
        setServerState((s) => ({ ...s, profile: { ...s.profile, ...patch } }))
        srv.serverSaveProfile(S.token, patch)
          .then(refreshServer)
          .catch((e) => pushToast('⚠️', 'Save failed', e.message, 'red'))
      },

      changePassword: (cur, next) => srv.serverChangePassword(S.token, cur, next),

      subscribe: async (plan, addressId, options = {}) => {
        if (options.simulateFailure) {
          const payment = { id: makeId('PAY'), status: 'FAILED', amount: plan.price, method: options.method || 'UPI', at: new Date().toISOString() }
          logToast('❌', 'Payment failed', `${plan.name} was NOT activated. You can safely try again.`, 'red')
          setServerState((s) => ({ ...s, payments: [payment, ...s.payments] }))
          return { ok: false, payment }
        }
        const address = S.addresses.find((a) => a.id === addressId)
        try {
          await srv.serverSubscribe(S.token, plan, S.preferences, address ? address.label : 'Default address')
          await refreshServer()
          logToast('💳', 'Payment successful', `₹${plan.price.toLocaleString('en-IN')} paid. Subscription active!`, 'green')
          return { ok: true }
        } catch (err) {
          if (/already have an active/i.test(err.message)) {
            await refreshServer()
            pushToast('ℹ️', 'Already subscribed', err.message, 'amber')
            return { ok: false, error: err.message }
          }
          logToast('❌', 'Payment failed', `${err.message} You can safely try again.`, 'red')
          return { ok: false, error: err.message }
        }
      },

      renewSubscription: async (plan) => {
        try {
          await srv.serverRenew(S.token)
          await refreshServer()
          logToast('🔄', 'Renewed!', `${plan.name} is active again — meals continue right away.`, 'green')
          return { ok: true }
        } catch (err) {
          logToast('❌', 'Renewal failed', err.message, 'red')
          return { ok: false, error: err.message }
        }
      },

      pauseSubscription: async (start, end) => {
        const check = engineCanPause(S.subscription, S.pauses, start, end)
        if (!check.ok) {
          pushToast('⚠️', 'Cannot pause', check.reason, 'red')
          return { ok: false, error: check.reason }
        }
        try {
          await srv.serverPause(S.token, start, end)
          setServerState((s) => ({
            ...s,
            subscription: s.subscription ? { ...s.subscription, status: 'PAUSED' } : s.subscription,
            pauses: [...s.pauses, { id: makeId('PSE'), start, end }]
          }))
          logToast('⏸️', 'Subscription paused', `${check.days} day${check.days > 1 ? 's' : ''} paused — no meals will be generated. Enjoy your break!`, 'amber')
          refreshServer().catch(() => {})
          return { ok: true }
        } catch (err) {
          pushToast('⚠️', 'Cannot pause', err.message, 'red')
          return { ok: false, error: err.message }
        }
      },

      resumeSubscription: async () => {
        try {
          await srv.serverResume(S.token)
          await refreshServer()
          logToast('▶️', 'Subscription resumed', 'Meals resume with the next generated order.', 'green')
          return { ok: true }
        } catch {
          return { ok: false }
        }
      },

      skipMeal: async (date, mealType, mealName) => {
        const check = engineCanSkip(S.subscription, date, mealType)
        if (!check.ok) {
          pushToast('⚠️', 'Cannot skip', check.reason, 'red')
          return { ok: false, error: check.reason }
        }
        try {
          await srv.serverSkip(S.token, date, mealType)
          setServerState((s) => ({
            ...s,
            skips: [...s.skips, { id: makeId('SKP'), date, mealType, mealName }],
            orders: s.orders
              .map((o) => (o.date === date ? { ...o, meals: o.meals.filter((m) => m.mealType !== mealType) } : o))
              .filter((o) => o.meals.length > 0)
          }))
          logToast('⏭️', 'Meal skipped', `${mealName} on ${date} will not be prepared or delivered.`, 'amber')
          refreshServer().catch(() => {})
          return { ok: true }
        } catch (err) {
          pushToast('⚠️', 'Cannot skip', err.message, 'red')
          return { ok: false, error: err.message }
        }
      },

      rateOrder: async (orderId, scores, review = '') => {
        const r = await srv.serverRate(S.token, orderId, scores, review)
        if (!r.ok) {
          pushToast('⚠️', 'Not allowed', r.error, 'red')
          return r
        }
        setServerState((s) => ({
          ...s,
          ratings: [r.rating, ...s.ratings],
          orders: s.orders.map((o) => (o.id === orderId ? { ...o, rated: true } : o))
        }))
        logToast('⭐', 'Thanks for rating!', 'Your feedback reaches the kitchen directly.', 'green')
        return { ok: true }
      },

      setOrderStatus: async (orderId, status, who = 'System') => {
        setServerState((s) => ({
          ...s,
          orders: s.orders.map((o) =>
            o.id === orderId
              ? { ...o, status, history: [...(o.history || []), { status, at: new Date().toISOString(), by: who }] }
              : o
          )
        }))
        try {
          await srv.serverSetOrderStatus(S.token, orderId, status)
          if (status === 'DELIVERED') {
            const order = S.orders.find((o) => o.id === orderId)
            logToast('📦', 'Order delivered!', `Enjoy your meal${order ? `, ${order.customerName}` : ''}! Rate it from Orders.`, 'green')
          }
          refreshServer().catch(() => {})
        } catch (err) {
          pushToast('⚠️', 'Update failed', err.message, 'red')
          refreshServer().catch(() => {})
        }
      },

      assignDelivery: async (orderId, staffId) => {
        setServerState((s) => ({
          ...s,
          orders: s.orders.map((o) =>
            o.id === orderId
              ? { ...o, assignedTo: staffId, status: o.status === 'ASSIGNED' || o.status === 'READY' ? 'ASSIGNED' : o.status }
              : o
          )
        }))
        try {
          await srv.serverAssignDelivery(S.token, orderId, staffId)
          pushToast('🛵', 'Delivery assigned', `${orderId} assigned.`, 'blue')
          refreshServer().catch(() => {})
        } catch (err) {
          pushToast('⚠️', 'Assign failed', err.message, 'red')
          refreshServer().catch(() => {})
        }
      },

      substituteMeal: async (orderId, mealType, newName, reason) => {
        setServerState((s) => ({
          ...s,
          substitutions: [{ id: makeId('SUB'), orderId, mealType, original: '—', replacement: newName, reason, by: 'Kitchen', at: new Date().toISOString() }, ...s.substitutions],
          orders: s.orders.map((o) =>
            o.id === orderId
              ? { ...o, meals: o.meals.map((m) => (m.mealType === mealType ? { ...m, name: newName, substituted: true } : m)) }
              : o
          )
        }))
        try {
          await srv.serverSubstitute(S.token, orderId, mealType, newName, reason)
          logToast('🔄', 'Meal substituted', `${newName} (${reason}). Customer notified.`, 'amber')
          refreshServer().catch(() => {})
        } catch (err) {
          pushToast('⚠️', 'Substitute failed', err.message, 'red')
          refreshServer().catch(() => {})
        }
      },

      createTicket: async (subject, category, message) => {
        try {
          const r = await srv.serverCreateTicket(S.token, subject, category, message)
          setServerState((s) => ({ ...s, tickets: [r.ticket, ...s.tickets] }))
          logToast('🎟️', 'Ticket created', `${r.ticket.id} — our team will respond within 24 hours.`, 'blue')
          return { ok: true, ticket: r.ticket }
        } catch (err) {
          pushToast('⚠️', 'Could not create ticket', err.message, 'red')
          return { ok: false, error: err.message }
        }
      },

      replyTicket: async (ticketId, text, from = 'SUPPORT') => {
        try {
          const r = await srv.serverReplyTicket(S.token, ticketId, text)
          setServerState((s) => ({ ...s, tickets: s.tickets.map((t) => (t.id === ticketId ? r.ticket : t)) }))
        } catch (err) {
          pushToast('⚠️', 'Reply failed', err.message, 'red')
        }
      },

      setTicketStatus: async (ticketId, status) => {
        try {
          const r = await srv.serverSetTicketStatus(S.token, ticketId, status)
          setServerState((s) => ({ ...s, tickets: s.tickets.map((t) => (t.id === ticketId ? r.ticket : t)) }))
        } catch (err) {
          pushToast('⚠️', 'Update failed', err.message, 'red')
        }
      },

      broadcastNotification: async (icon, title, body) => {
        try {
          const r = await srv.serverBroadcast(S.token, icon, title, body)
          logToast(icon, title, `${body} (sent to ${r.sent} users)`, 'blue')
        } catch (err) {
          pushToast('⚠️', 'Broadcast failed', err.message, 'red')
        }
      },

      toggleFoodAvailability: async (foodId) => {
        const turningOff = !S.unavailableFoodIds.includes(foodId)
        setServerState((s) => ({
          ...s,
          unavailableFoodIds: turningOff
            ? [...s.unavailableFoodIds, foodId]
            : s.unavailableFoodIds.filter((f) => f !== foodId)
        }))
        try {
          await srv.serverToggleFood(S.token, foodId, !turningOff)
        } catch (err) {
          pushToast('⚠️', 'Menu update failed', err.message, 'red')
          refreshServer().catch(() => {})
        }
      },

      markNotificationsRead: () => {
        setServerState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }))
        srv.serverMarkNotificationsRead(S.token).catch(() => {})
      },

      advanceDeliveryStep: () => {},

      resetAll: () => {
        srv.serverLogout()
        clearState()
        setServerState(null)
        setState({ ...DEFAULT_STATE, profile: { ...DEFAULT_STATE.profile } })
        setToasts([])
      }
    }

    return { ...local, ...server, booted, mode: 'server' }
  }, [state, serverState, currentUser, toasts, booted])

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
