// MealCard: the big, beautiful dish card — real food photography with a
// graceful emoji fallback, veg/non-veg mark, cuisine badge, nutrition
// chips, ingredients, allergens and an optional Skip / Rate action.

import { useState } from 'react'
import { CUISINE_LABELS, FOOD_TYPE_LABELS } from '../utils/format'
import { FOOD_IMAGES, heroFor } from '../services/foodImages'
import StarRating from './StarRating'

export default function MealCard({ mealType, label, icon, item, action = null }) {
  const [imgFailed, setImgFailed] = useState(false)
  if (!item) return null

  const isVeg = item.foodType === 'VEG'
  const nutrition = item.nutrition
  const photo = FOOD_IMAGES[item.id]

  return (
    <article className="meal-card">
      <div className="food-hero" style={imgFailed || !photo ? { background: heroFor(item) } : undefined}>
        {photo && !imgFailed ? (
          <img src={photo} alt={item.name} loading="lazy" onError={() => setImgFailed(true)} />
        ) : (
          <span className="hero-emoji">{item.emoji}</span>
        )}
        <span className="badge" style={{ top: 10, left: 10, background: 'rgba(255,255,255,0.94)', color: isVeg ? 'var(--green-dark)' : '#b91c1c' }}>
          <span className={`veg-mark ${isVeg ? '' : 'nonveg'}`} style={{ width: 12, height: 12 }} />
          {isVeg ? 'VEG' : 'NON-VEG'}
        </span>
        <span className="badge" style={{ top: 10, right: 10, background: 'rgba(255,255,255,0.94)', color: 'var(--blue)' }}>
          {CUISINE_LABELS[item.cuisine]}
        </span>
        {item.substituted && (
          <span className="badge" style={{ bottom: 10, right: 10, background: 'var(--amber)', color: '#fff' }}>
            🔄 Substituted
          </span>
        )}
      </div>

      <div className="meal-body">
        <div className="meal-row" style={{ marginTop: 0 }}>
          <h3 style={{ fontSize: 16.5 }}>
            {icon} {item.name}
          </h3>
          <span className="rating-stars">★ {item.rating.toFixed(1)}</span>
        </div>
        <p className="muted" style={{ margin: '6px 0 0', lineHeight: 1.55, fontSize: 13.5 }}>
          {item.description}
        </p>

        <div className="nutrition-chips">
          <span className="chip">🔥 {nutrition.calories} kcal</span>
          <span className="chip">💪 {nutrition.protein}g protein</span>
          <span className="chip">🌾 {nutrition.carbs}g carbs</span>
          <span className="chip">🥑 {nutrition.fat}g fat</span>
          <span className="chip">🌿 {nutrition.fiber}g fibre</span>
        </div>

        <p className="tiny" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
          <b>Ingredients:</b> {item.ingredients.join(', ')}
        </p>
        <p className="tiny" style={{ margin: '6px 0 0' }}>
          <b>Allergens:</b> {item.allergens.length ? item.allergens.join(', ') : 'None'}
        </p>
        <p className="tiny" style={{ margin: '6px 0 0', color: 'var(--muted)' }}>
          {label} • {FOOD_TYPE_LABELS[item.foodType]} • {CUISINE_LABELS[item.cuisine]}
        </p>

        {action && <div style={{ marginTop: 12 }}>{action}</div>}
      </div>
    </article>
  )
}

export { StarRating }
