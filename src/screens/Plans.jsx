// Plans: the subscription catalogue. Prices and plan content come from
// src/data/plans.js (admin will manage them from a dashboard later).

import { useNavigate } from 'react-router-dom'
import { PLANS } from '../data/plans'
import { useApp } from '../context/AppContext'
import { CUISINE_LABELS, FOOD_TYPE_LABELS, formatINR } from '../utils/format'
import TabBar from '../components/TabBar'
import Screen from '../components/Screen'

export default function Plans() {
  const navigate = useNavigate()
  const { state } = useApp()
  const { foodType, cuisine } = state.preferences

  return (
    <>
      <header className="top-header">
        <div>
          <h1 className="h2">⭐ Subscription Plans</h1>
          <p className="tiny" style={{ marginTop: 2 }}>
            Built for you: {FOOD_TYPE_LABELS[foodType]} • {CUISINE_LABELS[cuisine]}
          </p>
        </div>
      </header>

      <Screen>
        <p className="banner green">
          <span>🥗</span>
          <span>
            Every plan includes <b>breakfast, lunch and dinner</b>, freshly made daily for{' '}
            <b>{FOOD_TYPE_LABELS[foodType]}</b> food lovers of <b>{CUISINE_LABELS[cuisine]}</b> cuisine.
          </span>
        </p>

        <div style={{ marginTop: 18 }}>
          {PLANS.map((plan) => (
            <div key={plan.id} className={`plan-card ${plan.popular ? 'popular' : ''}`}>
              {plan.popular && <span className="plan-popular-tag">MOST POPULAR</span>}
              <div className="meal-row" style={{ marginTop: 0 }}>
                <h3 className="h2">{plan.name}</h3>
                <span className="badge badge-cuisine">{plan.durationDays} days</span>
              </div>
              <p className="muted" style={{ margin: '4px 0 10px' }}>{plan.tagline}</p>

              <div className="plan-row" style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span className="plan-price">{formatINR(plan.price)}</span>
                <span className="tiny">
                  ≈ {formatINR(Math.round(plan.price / (plan.durationDays * 3)))} / meal
                </span>
              </div>

              <ul className="plan-features">
                {plan.features.slice(0, 3).map((feature) => (
                  <li key={feature}>
                    <span>✓</span> {feature}
                  </li>
                ))}
                {plan.features.length > 3 && (
                  <li className="tiny" style={{ color: 'var(--muted)' }}>
                    +{plan.features.length - 3} more benefits
                  </li>
                )}
              </ul>

              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: 14 }}
                onClick={() => navigate(`/plans/${plan.id}`)}
              >
                View plan →
              </button>
            </div>
          ))}
        </div>
      </Screen>
      <TabBar />
    </>
  )
}
