// =====================================================================
// CHECKOUT — Stage 1 uses a MOCK payment gateway.
// =====================================================================
// The flow is exactly the real-world flow so Stage 3 (real Razorpay
// payments + server verification) can drop in without redesign:
//
//   choose plan → checkout → "payment" → success?
//     → YES: subscription activates, schedule generated, notification
//     → NO : subscription NOT activated, failure notification
//
// A "simulate failure" switch is included so the failure path can be
// tested safely. No card data is stored anywhere.

import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { PLANS } from '../data/plans'
import { useApp } from '../context/AppContext'
import { formatINR, CUISINE_LABELS, FOOD_TYPE_LABELS } from '../utils/format'
import Screen from '../components/Screen'

const PAY_METHODS = [
  { id: 'UPI', label: 'UPI (GPay / PhonePe / Paytm)', icon: '📲' },
  { id: 'Card', label: 'Credit / Debit Card', icon: '💳' },
  { id: 'Netbanking', label: 'Net Banking', icon: '🏦' }
]

export default function Checkout() {
  const { planId } = useParams()
  const navigate = useNavigate()
  const { state, subscribe } = useApp()

  const plan = PLANS.find((p) => p.id === planId)
  const [addressId, setAddressId] = useState(state.addresses.find((a) => a.isDefault)?.id || state.addresses[0]?.id)
  const [method, setMethod] = useState('UPI')
  const [simulateFailure, setSimulateFailure] = useState(false)
  const [paying, setPaying] = useState(false)

  if (!plan) {
    return (
      <Screen>
        <div className="empty">
          <div className="empty-icon">🤔</div>
          <p>Plan not found.</p>
          <button className="btn btn-ghost" onClick={() => navigate('/plans')}>← Back to plans</button>
        </div>
      </Screen>
    )
  }

  if (state.subscription) {
    return (
      <Screen>
        <div className="empty">
          <div className="empty-icon">📦</div>
          <h2 className="h2">You already have an active plan</h2>
          <p className="muted" style={{ margin: '8px 0 20px' }}>
            {state.subscription.planName} is running until {state.subscription.endDate}.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/home')}>Go to Home</button>
        </div>
      </Screen>
    )
  }

  function pay() {
    if (!addressId) return
    setPaying(true)
    // Mock "talking to the payment gateway" delay.
    setTimeout(() => {
      const result = subscribe(plan, addressId, { method, simulateFailure })
      setPaying(false)
      if (result.ok) navigate('/confirmation', { replace: true })
      // On failure we stay here; the red banner below explains what happened.
      else setSimulateFailure(false)
    }, 1800)
  }

  const selectedAddress = state.addresses.find((a) => a.id === addressId)

  return (
    <>
      <header className="top-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">←</button>
        <h1 className="h2">Checkout</h1>
      </header>

      <Screen>
        {/* Order summary */}
        <div className="card">
          <div className="meal-row" style={{ marginTop: 0 }}>
            <h3 className="h2">{plan.name}</h3>
            <span className="badge badge-cuisine">{plan.durationDays} days</span>
          </div>
          <p className="muted" style={{ margin: '6px 0 10px' }}>
            🟢/🔴 {FOOD_TYPE_LABELS[state.preferences.foodType]} • 🍛 {CUISINE_LABELS[state.preferences.cuisine]} • Breakfast + Lunch + Dinner
          </p>
          <div className="divider" />
          <div className="meal-row" style={{ marginTop: 0 }}>
            <span className="muted">Plan price</span>
            <b>{formatINR(plan.price)}</b>
          </div>
          <div className="meal-row" style={{ marginTop: 4 }}>
            <span className="muted">Delivery</span>
            <b style={{ color: 'var(--green)' }}>FREE</b>
          </div>
          <div className="meal-row" style={{ marginTop: 4 }}>
            <b>To pay</b>
            <b style={{ fontSize: 18 }}>{formatINR(plan.price)}</b>
          </div>
        </div>

        {/* Address selection */}
        <div className="section-title">
          <h2 className="h2">Delivery address</h2>
          <Link to="/addresses" style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>Manage →</Link>
        </div>
        {state.addresses.length === 0 ? (
          <p className="banner amber">
            <span>⚠️</span>
            <span>No address yet. <Link to="/addresses" style={{ color: 'inherit' }}>Add an address</Link> to continue.</span>
          </p>
        ) : (
          state.addresses.map((address) => (
            <button
              key={address.id}
              type="button"
              className={`address-card ${address.id === addressId ? 'selected' : ''}`}
              style={{ width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}
              onClick={() => setAddressId(address.id)}
            >
              <b>{address.label}</b> {address.isDefault && <span className="badge badge-veg">DEFAULT</span>}
              <p className="muted" style={{ margin: '4px 0 0' }}>
                {address.line}{address.city ? `, ${address.city}` : ''}{address.pincode ? ` - ${address.pincode}` : ''}
              </p>
            </button>
          ))
        )}

        {/* Payment method */}
        <div className="section-title"><h2 className="h2">Payment method</h2></div>
        {PAY_METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`address-card ${method === m.id ? 'selected' : ''}`}
            style={{ width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', gap: 10, alignItems: 'center' }}
            onClick={() => setMethod(m.id)}
          >
            <span style={{ fontSize: 20 }}>{m.icon}</span>
            <b style={{ fontSize: 14 }}>{m.label}</b>
            {method === m.id && <span style={{ marginLeft: 'auto' }}>✅</span>}
          </button>
        ))}

        {/* Test switch for the failure path */}
        <p className="banner blue" style={{ marginTop: 14 }}>
          <span>🧪</span>
          <span>
            This demo uses a <b>mock payment gateway</b> — no real money moves. Tick the box
            below to preview what customers see when a payment fails.
          </span>
        </p>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '4px 4px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          <input type="checkbox" checked={simulateFailure} onChange={(e) => setSimulateFailure(e.target.checked)} />
          Simulate payment failure (for testing)
        </label>

        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: 18 }}
          onClick={pay}
          disabled={paying || !addressId || state.addresses.length === 0}
        >
          {paying ? '⏳ Processing payment…' : `Pay ${formatINR(plan.price)} securely`}
        </button>
        <p className="tiny" style={{ textAlign: 'center', marginTop: 10 }}>
          🔒 Demo checkout — no card data is stored. Real payments arrive in Stage 3.
        </p>

        {paying && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <div className="card" style={{ textAlign: 'center', padding: 28 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>⏳</div>
              <b>Contacting payment gateway…</b>
              <p className="tiny" style={{ marginTop: 4 }}>Do not close the app</p>
            </div>
          </div>
        )}

        {/* Failure feedback (after a failed attempt) */}
        {state.payments[0]?.status === 'FAILED' && !paying && (
          <p className="banner red" style={{ marginTop: 16 }}>
            <span>❌</span>
            <span>
              Last payment failed — your subscription was <b>NOT activated</b> and nothing was
              charged. You can safely try again{selectedAddress ? '' : ''}.
            </span>
          </p>
        )}
      </Screen>
    </>
  )
}
