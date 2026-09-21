// =====================================================================
// MY SUBSCRIPTION — pause, resume and skip meals (Stage 4 rules)
// =====================================================================
// Pause rules: limited days per plan, must stay inside plan dates.
// Skip rules: allowed until 9 PM the night before (operational cutoff).

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Screen from '../components/Screen'
import { daysRemaining } from '../services/subscriptionService'
import { BUSINESS_RULES, allPlans } from '../services/engine'
import { formatDateShort, todayString, addDays } from '../utils/date'
import { formatINR, CUISINE_LABELS, FOOD_TYPE_LABELS } from '../utils/format'

export default function MySubscription() {
  const navigate = useNavigate()
  const { state, pauseSubscription, resumeSubscription, skipMeal, renewSubscription } = useApp()
  const { subscription, pauses, skips, preferences } = state
  const [renewing, setRenewing] = useState(false)

  if (!subscription) {
    return (
      <>
        <header className="top-header">
          <div><h1 className="h2">📋 My Subscription</h1></div>
        </header>
        <Screen>
          <div className="empty">
            <div className="empty-icon">🧾</div>
            <p>No subscription yet.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/plans')}>
              View plans
            </button>
          </div>
        </Screen>
      </>
    )
  }

  const status = subscription.status
  const remaining = daysRemaining(subscription)
  const pauseLimit = BUSINESS_RULES.PAUSE_LIMIT_DAYS[subscription.planId] || 5
  const pauseUsed = pauses.reduce((sum, p) => sum + (p.end < todayString() ? 0 : daysBetweenInclusive(p.start, p.end)), 0)

  // Tomorrow's still-skippable meals = meals not already skipped
  const tomorrow = addDays(todayString(), 1)
  const skippable = subscription.mealsPerDay.filter(
    (mealType) => !skips.some((s) => s.date === tomorrow && s.mealType === mealType)
  )

  function handlePause() {
    const start = todayString()
    const end = addDays(start, 2) // demo: 3-day pause
    pauseSubscription(start, end)
  }

  return (
    <>
      <header className="top-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">←</button>
        <h1 className="h2">📋 My Subscription</h1>
      </header>

      <Screen>
        <div className={`card card-hero ${status === 'PAUSED' ? 'dawn' : ''}`}>
          <div className="meal-row" style={{ marginTop: 0 }}>
            <h2 className="h2" style={{ color: '#fff' }}>{subscription.planName}</h2>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.22)', color: '#fff' }}>
              {status === 'ACTIVE' ? '● ACTIVE' : status === 'PAUSED' ? '⏸ PAUSED' : status}
            </span>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13.5, opacity: 0.95 }}>
            {formatDateShort(subscription.startDate)} → {formatDateShort(subscription.endDate)} •{' '}
            {remaining} days remaining
          </p>
        </div>

        <div className="card">
          <div className="stat-grid" style={{ marginTop: 0 }}>
            <div className="stat"><b>{FOOD_TYPE_LABELS[preferences.foodType]}</b><span>Food</span></div>
            <div className="stat"><b>{CUISINE_LABELS[preferences.cuisine].split(' ')[0]}</b><span>Cuisine</span></div>
            <div className="stat"><b>{subscription.mealsPerDay.length}</b><span>Meals/day</span></div>
          </div>
          <p className="tiny" style={{ margin: '12px 0 0' }}>
            Paid {formatINR(subscription.price)} • Free daily delivery • {pauseLimit}-day pause limit ({pauseUsed} used)
          </p>
        </div>

        {/* ---- Pause ---- */}
        <div className="section-title"><h2 className="h2">⏸ Take a break</h2></div>
        <div className="card">
          {status === 'ACTIVE' ? (
            <>
              <p className="muted" style={{ marginTop: 0 }}>
                Going out of town? Pause for 3 days — no meals will be prepared or delivered, and
                your kitchen count updates instantly.
              </p>
              <button className="btn btn-ghost" onClick={handlePause}>⏸ Pause for 3 days</button>
            </>
          ) : (
            <>
              <p className="banner amber" style={{ margin: '0 0 12px' }}>
                <span>⏸</span>
                <span>Subscription paused — active pauses:{' '}
                  {pauses.map((p) => `${formatDateShort(p.start)}→${formatDateShort(p.end)}`).join(', ')}
                </span>
              </p>
              <button className="btn btn-primary" onClick={resumeSubscription}>▶️ Resume deliveries</button>
            </>
          )}
        </div>

        {/* ---- Skip ---- */}
        <div className="section-title"><h2 className="h2">⏭ Skip a meal</h2></div>
        <div className="card">
          <p className="muted" style={{ marginTop: 0 }}>
            Skip any of tomorrow's meals before <b>9 PM tonight</b> (operational cutoff — the kitchen
            plans quantities at night).
          </p>
          {status !== 'ACTIVE' ? (
            <p className="tiny">Resume your subscription first to manage meals.</p>
          ) : skippable.length === 0 ? (
            <p className="tiny">All of tomorrow's meals are already skipped.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {skippable.map((mealType) => (
                <button
                  key={mealType}
                  className="btn btn-ghost"
                  onClick={() => skipMeal(tomorrow, mealType, mealType.charAt(0) + mealType.slice(1).toLowerCase())}
                >
                  ⏭ Skip tomorrow's {mealType.charAt(0) + mealType.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          )}
          {skips.length > 0 && (
            <p className="tiny" style={{ marginBottom: 0 }}>
              {skips.length} skip{skips.length > 1 ? 's' : ''} recorded — the kitchen is informed automatically.
            </p>
          )}
        </div>

        {/* ---- Renew (Part 5 automation: expiry → reminder → renewal) ---- */}
        {renewing && (
          <div className="section-title"><h2 className="h2">🔄 Choose a plan to renew with</h2></div>
        )}
        {renewing && allPlans().map((plan) => (
          <button
            key={plan.id}
            type="button"
            className="plan-card"
            style={{ width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 12 }}
            onClick={() => {
              const result = renewSubscription(plan)
              setRenewing(false)
              if (result.ok) navigate('/home')
            }}
          >
            <div className="meal-row" style={{ marginTop: 0 }}>
              <h3 className="h2">{plan.name}</h3>
              <span className="badge badge-cuisine">{plan.durationDays} days</span>
            </div>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              {formatINR(plan.price)} • {plan.tagline}
            </p>
          </button>
        ))}
        {!renewing && (
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 4 }}
            onClick={() => setRenewing(true)}
          >
            🔄 Renew / extend plan
          </button>
        )}

        <p className="tiny" style={{ textAlign: 'center', marginTop: 16 }}>
          Rules enforced: pause limit {pauseLimit} days • skip cutoff 9 PM previous night • veg/non-veg never violated
        </p>
      </Screen>
    </>
  )
}

function daysBetweenInclusive(a, b) {
  return Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000) + 1
}
