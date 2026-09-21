// =====================================================================
// SUBSCRIPTION SERVICE (Stage 1 = MOCK payments)
// =====================================================================
// In Stage 3 this file will call a REAL payment provider (Razorpay) and a
// REAL backend that verifies the payment on the server before activating
// anything. The screens already talk to this service, so swapping the
// mock for the real thing later will not change the UI.
//
// Business rules honoured here:
//   - Subscription activates ONLY after a successful payment.
//   - A failed payment NEVER activates a subscription.

import { addDays, todayString, daysBetween } from '../utils/date'

let idCounter = 0
function makeId(prefix) {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`
}

/**
 * MOCK payment gateway. Returns a payment record.
 * simulateFailure lets us test the "payment failed" path without money.
 */
export function processPayment({ amount, method = 'UPI', simulateFailure = false }) {
  return {
    id: makeId('PAY'),
    amount,
    method,
    status: simulateFailure ? 'FAILED' : 'SUCCESS',
    createdAt: new Date().toISOString()
  }
}

/** Create an ACTIVE subscription record after payment success. */
export function activateSubscription(plan, addressId) {
  const startDate = todayString() // Stage 4 will make this fully automated
  return {
    id: makeId('SUB'),
    planId: plan.id,
    planName: plan.name,
    price: plan.price,
    durationDays: plan.durationDays,
    mealsPerDay: plan.mealsPerDay,
    startDate,
    endDate: addDays(startDate, plan.durationDays - 1),
    status: 'ACTIVE',
    addressId,
    createdAt: new Date().toISOString()
  }
}

/**
 * Effective status: an ACTIVE subscription whose end date has passed is
 * really EXPIRED. Computed on the fly so no timer is needed.
 */
export function getEffectiveStatus(subscription) {
  if (!subscription) return null
  if (subscription.status === 'CANCELLED') return 'CANCELLED'
  if (subscription.endDate < todayString()) return 'EXPIRED'
  return subscription.status
}

/** Days left in the subscription, counting today. */
export function daysRemaining(subscription) {
  if (!subscription) return 0
  return Math.max(0, daysBetween(todayString(), subscription.endDate) + 1)
}

/**
 * Meal schedule summary (Stage 1 demo). The real per-day schedule and
 * order generation is built by the automation engine in Stage 4.
 */
export function buildSchedulePreview(preferences, subscription, previewDays = 3) {
  const days = []
  for (let i = 0; i < previewDays; i += 1) {
    const date = addDays(subscription.startDate, i)
    if (date > subscription.endDate) break
    days.push({ date, mealsPerDay: subscription.mealsPerDay.length })
  }
  return days
}

export { todayString, addDays, daysBetween }
