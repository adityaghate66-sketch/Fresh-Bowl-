// =====================================================================
// KITCHEN DASHBOARD — "what do we cook today?" (Stage 6)
// =====================================================================
// Aggregates every active subscription into production quantities per
// meal × cuisine × veg/non-veg, then works orders through the prep
// pipeline: Preparing → Ready. Substitutions are recorded (Rule 13).

import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { kitchenQuantities, todayString } from '../services/engine'
import { MEAL_TYPES, MEAL_LABELS, MEAL_ICONS } from '../data/foodItems'
import BottomSheet from '../components/BottomSheet'
import { BUSINESS_RULES } from '../services/engine'
import { CUISINE_LABELS } from '../utils/format'

const NEXT_STATUS = { PREPARING: 'READY' }

export default function KitchenDashboard() {
  const { state, currentUser, setOrderStatus, substituteMeal, logout } = useApp()
  const [tab, setTab] = useState('QUANTITIES')
  const [subFor, setSubFor] = useState(null) // { orderId, mealType, meal }
  const [newName, setNewName] = useState('')
  const [reason, setReason] = useState(BUSINESS_RULES.SUBSTITUTION_REASONS[0])

  const today = todayString()
  const todaysOrders = state.orders.filter((o) => o.date === today)
  const { grid, total } = kitchenQuantities(state.orders, today)
  const maxQty = Math.max(1, ...Object.values(grid))

  function submitSubstitution() {
    if (!newName.trim()) return
    substituteMeal(subFor.orderId, subFor.mealType, newName.trim(), reason)
    setSubFor(null)
    setNewName('')
  }

  return (
    <>
      <header className="top-header">
        <div style={{ flex: 1 }}>
          <h1 className="h2">👨‍🍳 Kitchen Console</h1>
          <p className="tiny" style={{ marginTop: 2 }}>
            {currentUser?.name} • {todaysOrders.length} orders • {total} meals to produce
          </p>
        </div>
        <button className="icon-btn" onClick={logout} aria-label="Sign out">🚪</button>
      </header>

      <div className="page" style={{ paddingTop: 8 }}>
        <div className="admin-nav">
          {['QUANTITIES', 'PREP LINE', 'SUBSTITUTIONS'].map((t) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {/* ---------- Production quantities ---------- */}
        {tab === 'QUANTITIES' && (
          <>
            {MEAL_TYPES.map((mealType) => (
              <div key={mealType} className="card" style={{ marginBottom: 14 }}>
                <div className="meal-row" style={{ marginTop: 0 }}>
                  <h3 className="h2">{MEAL_ICONS[mealType]} {MEAL_LABELS[mealType]}</h3>
                  <span className="badge badge-amber">
                    {MEAL_TYPES.reduce((s, m) => s + ['NORTH_INDIAN', 'SOUTH_INDIAN'].reduce((s2, c) => s2 + ['VEG', 'NON_VEG'].reduce((s3, f) => s3 + grid[`${m}|${c}|${f}`], 0), 0), 0) === 0
                      ? '—'
                      : `${['NORTH_INDIAN', 'SOUTH_INDIAN'].reduce((s2, c) => s2 + ['VEG', 'NON_VEG'].reduce((s3, f) => s3 + grid[`${mealType}|${c}|${f}`], 0), 0)} boxes`}
                  </span>
                </div>
                <div className="kds-grid" style={{ marginTop: 10 }}>
                  {['NORTH_INDIAN', 'SOUTH_INDIAN'].map((cuisine) =>
                    ['VEG', 'NON_VEG'].map((foodType) => {
                      const qty = grid[`${mealType}|${cuisine}|${foodType}`]
                      const key = `${mealType}|${cuisine}|${foodType}`
                      return (
                        <div key={key} className={`kds-cell ${qty === 0 ? '' : qty > 0 ? '' : ''}`}>
                          <b>{qty}</b>
                          <span>{cuisine === 'NORTH_INDIAN' ? 'NORTH' : 'SOUTH'} • {foodType === 'VEG' ? '🟢 VEG' : '🔴 NON-VEG'}</span>
                          <div className="qty-bar"><span style={{ width: `${(qty / maxQty) * 100}%` }} /></div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            ))}
            <p className="tiny" style={{ textAlign: 'center' }}>
              Counts update live from active subscriptions, minus pauses and skips.
            </p>
          </>
        )}

        {/* ---------- Prep line ---------- */}
        {tab === 'PREP LINE' && (
          <>
            {todaysOrders.length === 0 && (
              <div className="empty"><div className="empty-icon">🍽️</div><p>No orders on the line today.</p></div>
            )}
            {todaysOrders.map((order) => (
              <div key={order.id} className="card" style={{ marginBottom: 12 }}>
                <div className="meal-row" style={{ marginTop: 0 }}>
                  <b style={{ fontSize: 14 }}>{order.customerName} • {order.addressLabel}</b>
                  <span className={`badge ${order.status === 'PREPARING' ? 'badge-amber' : 'badge-veg'}`}>{order.status}</span>
                </div>
                <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
                  {order.meals.map((meal) => (
                    <div key={meal.mealType} className="meal-row" style={{ marginTop: 0 }}>
                      <span style={{ fontSize: 13.5 }}>
                        {meal.foodType === 'VEG' ? '🟢' : '🔴'} {meal.name}
                        {meal.substituted && <span className="badge badge-amber" style={{ marginLeft: 6 }}>sub</span>}
                      </span>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setSubFor({ orderId: order.id, mealType: meal.mealType, meal })}
                      >
                        🔄 Substitute
                      </button>
                    </div>
                  ))}
                </div>
                {order.status === 'PREPARING' && (
                  <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setOrderStatus(order.id, NEXT_STATUS[order.status], 'Kitchen')}>
                    ✅ Mark READY for delivery
                  </button>
                )}
              </div>
            ))}
          </>
        )}

        {/* ---------- Substitution audit log ---------- */}
        {tab === 'SUBSTITUTIONS' && (
          <>
            {state.substitutions.length === 0 ? (
              <div className="empty"><div className="empty-icon">🔄</div><p>No substitutions recorded.</p></div>
            ) : (
              state.substitutions.map((sub) => (
                <div key={sub.id} className="card" style={{ marginBottom: 10 }}>
                  <div className="meal-row" style={{ marginTop: 0 }}>
                    <b style={{ fontSize: 13.5 }}>{sub.original} → {sub.replacement}</b>
                    <span className="badge badge-amber">{sub.reason}</span>
                  </div>
                  <p className="tiny" style={{ margin: '4px 0 0' }}>
                    Order {sub.orderId} • {sub.mealType} • by {sub.by} • {new Date(sub.at).toLocaleString('en-IN')}
                  </p>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Substitution sheet */}
      <BottomSheet open={!!subFor} onClose={() => setSubFor(null)} title="Substitute a meal">
        {subFor && (
          <>
            <p className="muted" style={{ marginTop: -4 }}>
              Replacing <b>{subFor.meal.name}</b> ({subFor.mealType.toLowerCase()}) for order {subFor.orderId}.
              The customer is notified and the change is recorded.
            </p>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Replacement dish (same cuisine & veg status)</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Paneer Butter Masala" />
            </div>
            <div className="field">
              <label>Reason</label>
              <select value={reason} onChange={(e) => setReason(e.target.value)}>
                {BUSINESS_RULES.SUBSTITUTION_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" onClick={submitSubstitution} disabled={!newName.trim()}>
              Record substitution
            </button>
          </>
        )}
      </BottomSheet>
    </>
  )
}
