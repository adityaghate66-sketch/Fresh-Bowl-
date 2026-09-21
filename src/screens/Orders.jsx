// =====================================================================
// ORDERS — every meal day as a trackable order (Stage 4 flow)
// =====================================================================
// Status chain: Preparing → Ready → Assigned → Picked Up →
// Out for Delivery → Delivered. Rate any DELIVERED order from here.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { HorizontalTracker, DELIVERY_STEPS } from '../components/StatusTracker'
import BottomSheet from '../components/BottomSheet'
import StarRating from '../components/StarRating'
import Screen from '../components/Screen'
import { formatDateShort } from '../utils/date'

const STATUS_BADGE = {
  PREPARING: 'badge-amber',
  READY: 'badge-violet',
  ASSIGNED: 'badge-cuisine',
  'PICKED UP': 'badge-cuisine',
  'OUT FOR DELIVERY': 'badge-amber',
  DELIVERED: 'badge-veg'
}

export default function Orders() {
  const navigate = useNavigate()
  const { state, rateOrder } = useApp()
  const [rateFor, setRateFor] = useState(null) // order being rated
  const [scores, setScores] = useState({ food: 5, taste: 5, packaging: 5, delivery: 5 })
  const [review, setReview] = useState('')

  const orders = state.orders

  function submitRating() {
    rateOrder(rateFor.id, scores, review)
    setRateFor(null)
    setReview('')
    setScores({ food: 5, taste: 5, packaging: 5, delivery: 5 })
  }

  if (!orders.length) {
    return (
      <>
        <header className="top-header">
          <div>
            <h1 className="h2">📦 My Orders</h1>
            <p className="tiny" style={{ marginTop: 2 }}>Every meal day, tracked end-to-end</p>
          </div>
        </header>
        <Screen>
          <div className="empty">
            <div className="empty-icon">🛍️</div>
            <p>No orders yet.</p>
            <p className="tiny">Subscribe to a plan — your daily meal orders will appear here automatically.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/plans')}>
              Browse plans
            </button>
          </div>
        </Screen>
      </>
    )
  }

  return (
    <>
      <header className="top-header">
        <div>
          <h1 className="h2">📦 My Orders</h1>
          <p className="tiny" style={{ marginTop: 2 }}>{orders.length} order{orders.length > 1 ? 's' : ''} • auto-generated daily</p>
        </div>
      </header>

      <Screen>
        {orders.map((order) => {
          const stepIndex = DELIVERY_STEPS.indexOf(order.status)
          const canRate = order.status === 'DELIVERED' && !order.rated
          return (
            <div key={order.id} className="card" style={{ marginBottom: 14 }}>
              <div className="meal-row" style={{ marginTop: 0 }}>
                <div>
                  <b style={{ fontSize: 14 }}>{formatDateShort(order.date)}</b>
                  <p className="tiny" style={{ margin: '2px 0 0' }}>{order.id} • {order.meals.length} meals</p>
                </div>
                <span className={`badge ${STATUS_BADGE[order.status] || 'badge-gray'}`}>{order.status}</span>
              </div>

              <HorizontalTracker currentStep={stepIndex} />

              <div style={{ display: 'grid', gap: 6 }}>
                {order.meals.map((meal) => (
                  <div key={meal.mealType} className="meal-row" style={{ marginTop: 0 }}>
                    <span style={{ fontSize: 13.5 }}>
                      {meal.mealType === 'BREAKFAST' ? '🌅' : meal.mealType === 'LUNCH' ? '☀️' : '🌙'}{' '}
                      {meal.name}
                      {meal.substituted && <span className="badge badge-amber" style={{ marginLeft: 6 }}>🔄</span>}
                    </span>
                    <span className="tiny">{meal.foodType === 'VEG' ? '🟢' : '🔴'}</span>
                  </div>
                ))}
              </div>

              {canRate && (
                <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setRateFor(order)}>
                  ⭐ Rate this meal day
                </button>
              )}
              {order.rated && (
                <p className="tiny" style={{ margin: '10px 0 0', textAlign: 'center' }}>
                  ⭐ You rated this order — thank you!
                </p>
              )}
            </div>
          )
        })}
      </Screen>

      {/* Rating sheet */}
      <BottomSheet open={!!rateFor} onClose={() => setRateFor(null)} title="Rate your meal day">
        {rateFor && (
          <>
            <p className="muted" style={{ textAlign: 'center', marginTop: -4 }}>
              {formatDateShort(rateFor.date)} • {rateFor.meals.map((m) => m.name.split(' ')[0]).join(', ')}
            </p>
            {[
              ['food', '🍽️ Food quality'],
              ['taste', '😋 Taste'],
              ['packaging', '📦 Packaging'],
              ['delivery', '🛵 Delivery']
            ].map(([key, label]) => (
              <div key={key} style={{ marginTop: 10 }}>
                <p className="tiny" style={{ textAlign: 'center', fontWeight: 700, marginBottom: 0 }}>{label}</p>
                <StarRating value={scores[key]} onChange={(v) => setScores((s) => ({ ...s, [key]: v }))} size={30} />
              </div>
            ))}
            <div className="field" style={{ marginTop: 12 }}>
              <textarea
                rows={2}
                placeholder="Optional review — what did you love?"
                value={review}
                onChange={(e) => setReview(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={submitRating}>Submit rating</button>
          </>
        )}
      </BottomSheet>
    </>
  )
}
