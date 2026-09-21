// Confirmation: shown right after a successful payment.
// Proves the business flow: payment → activation → schedule → meals.

import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { daysRemaining, buildSchedulePreview } from '../services/subscriptionService'
import { getDayMenu } from '../services/menuService'
import { MEAL_ICONS, MEAL_LABELS } from '../data/foodItems'
import { formatDateShort, todayString } from '../utils/date'
import { formatINR } from '../utils/format'
import Screen from '../components/Screen'

export default function Confirmation() {
  const navigate = useNavigate()
  const { state } = useApp()
  const { subscription, preferences, payments } = state

  if (!subscription) {
    return (
      <Screen>
        <div className="empty">
          <div className="empty-icon">🧾</div>
          <p>No recent subscription found.</p>
          <button className="btn btn-primary" onClick={() => navigate('/plans')}>View plans</button>
        </div>
      </Screen>
    )
  }

  const remaining = daysRemaining(subscription)
  const schedule = buildSchedulePreview(preferences, subscription)
  const todayMenu = getDayMenu(preferences, todayString())
  const payment = payments[0]

  return (
    <Screen>
      <div style={{ textAlign: 'center', padding: '26px 0 8px' }}>
        <div style={{ fontSize: 64 }}>🎉</div>
        <h1 className="h1" style={{ marginTop: 8 }}>You&apos;re subscribed!</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Payment verified and subscription activated.
        </p>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="meal-row" style={{ marginTop: 0 }}>
          <h3 className="h2">{subscription.planName}</h3>
          <span className="badge badge-veg">● ACTIVE</span>
        </div>
        <div className="stat-grid">
          <div className="stat">
            <b>{remaining}</b>
            <span>Days left</span>
          </div>
          <div className="stat">
            <b>{subscription.durationDays * 3}</b>
            <span>Meals included</span>
          </div>
          <div className="stat">
            <b>FREE</b>
            <span>Delivery</span>
          </div>
        </div>
        <p className="tiny" style={{ marginTop: 12, marginBottom: 0 }}>
          {formatDateShort(subscription.startDate)} → {formatDateShort(subscription.endDate)}
          {payment && <> • Paid {formatINR(payment.amount)} via {payment.method} • {payment.id}</>}
        </p>
      </div>

      <div className="section-title"><h2 className="h2">📅 Meal schedule generated</h2></div>
      <div className="card">
        {schedule.map((day, index) => (
          <div className="meal-row" key={day.date} style={{ marginTop: index ? 8 : 0 }}>
            <span className="muted">
              {index === 0 ? 'Today' : formatDateShort(day.date)}
            </span>
            <b style={{ fontSize: 13 }}>{day.mealsPerDay} meals • 🌅 ☀️ 🌙</b>
          </div>
        ))}
        <p className="tiny" style={{ marginTop: 10, marginBottom: 0 }}>
          …and every day until {formatDateShort(subscription.endDate)}. Orders are generated
          automatically — pause or skip anytime from My Subscription.
        </p>
      </div>

      <div className="section-title"><h2 className="h2">Today&apos;s first meals</h2></div>
      {todayMenu.meals.map(({ mealType, item }) => (
        <div key={mealType} className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 32 }}>{item.emoji}</div>
          <div style={{ flex: 1 }}>
            <b style={{ fontSize: 14 }}>{MEAL_ICONS[mealType]} {item.name}</b>
            <p className="tiny" style={{ margin: '2px 0 0' }}>{MEAL_LABELS[mealType]} • {item.nutrition.calories} kcal</p>
          </div>
          <span className="badge badge-veg">✓</span>
        </div>
      ))}

      <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/home')}>
        Go to Home 🏠
      </button>
      <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => navigate('/menu')}>
        See full menu →
      </button>
    </Screen>
  )
}
