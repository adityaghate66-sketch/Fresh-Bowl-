// Plan Details: everything about one plan before checkout.

import { useParams, useNavigate, Link } from 'react-router-dom'
import { PLANS } from '../data/plans'
import { useApp } from '../context/AppContext'
import { getDayNutrition } from '../services/menuService'
import { CUISINE_LABELS, FOOD_TYPE_LABELS, formatINR } from '../utils/format'
import Screen from '../components/Screen'

export default function PlanDetails() {
  const { planId } = useParams()
  const navigate = useNavigate()
  const { state } = useApp()

  const plan = PLANS.find((p) => p.id === planId)
  if (!plan) {
    return (
      <Screen>
        <div className="empty">
          <div className="empty-icon">🤔</div>
          <p>Plan not found.</p>
          <button className="btn btn-ghost" onClick={() => navigate('/plans')}>
            ← Back to plans
          </button>
        </div>
      </Screen>
    )
  }

  const { foodType, cuisine } = state.preferences
  const nutrition = getDayNutrition(state.preferences) // today's personalised day total

  return (
    <>
      <header className="top-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
        <h1 className="h2">{plan.name}</h1>
      </header>

      <Screen>
        <div className="card" style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e)', border: 'none', color: '#fff' }}>
          <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
            {plan.durationDays} DAYS • 3 MEALS A DAY
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 10 }}>
            <span style={{ fontSize: 32, fontWeight: 800 }}>{formatINR(plan.price)}</span>
            <span style={{ opacity: 0.9, fontSize: 14 }}>
              = {formatINR(Math.round(plan.price / (plan.durationDays * 3)))} per meal
            </span>
          </div>
          <p style={{ margin: '8px 0 0', opacity: 0.95, fontSize: 14 }}>{plan.tagline}</p>
        </div>

        <div className="section-title"><h2 className="h2">What you eat</h2></div>
        <div className="card">
          <div className="stat-grid" style={{ marginTop: 0 }}>
            <div className="stat">
              <b>{FOOD_TYPE_LABELS[foodType]}</b>
              <span>Food type</span>
            </div>
            <div className="stat">
              <b>{CUISINE_LABELS[cuisine].split(' ')[0]}</b>
              <span>Cuisine</span>
            </div>
            <div className="stat">
              <b>3</b>
              <span>Meals/day</span>
            </div>
          </div>
          <p className="muted" style={{ marginTop: 12 }}>
            Typical day (from today&apos;s live menu): <b>🔥 {nutrition.calories} kcal</b> •{' '}
            💪 {nutrition.protein}g protein • 🌿 {nutrition.fiber}g fibre. Menus rotate daily —
            no repeats for weeks.
          </p>
        </div>

        <div className="section-title"><h2 className="h2">All benefits</h2></div>
        <div className="card">
          <ul className="plan-features" style={{ marginTop: 0 }}>
            {plan.features.map((feature) => (
              <li key={feature}>
                <span>✓</span> {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="section-title"><h2 className="h2">Delivery times</h2></div>
        <div className="card">
          <p style={{ margin: 0, fontSize: 14, lineHeight: 2 }}>
            🌅 Breakfast — 7:30 to 9:30 AM<br />
            ☀️ Lunch — 12:30 to 2:30 PM<br />
            🌙 Dinner — 7:30 to 9:30 PM
          </p>
        </div>

        <div className="section-title"><h2 className="h2">Terms & conditions</h2></div>
        <div className="card">
          <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>{plan.terms}</p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: 20 }}
          onClick={() => navigate(`/checkout/${plan.id}`)}
        >
          Subscribe for {formatINR(plan.price)} →
        </button>
        <p className="tiny" style={{ textAlign: 'center', marginTop: 10 }}>
          You can pause or skip meals any time within the plan rules.
        </p>
      </Screen>
    </>
  )
}
