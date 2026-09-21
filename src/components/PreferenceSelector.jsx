// PreferenceSelector: the two core business switches.
// Changing these instantly changes every meal in the app.
// `disabled` = locked while a subscription is active (business rule).

import { CUISINE_LABELS, FOOD_TYPE_LABELS } from '../utils/format'

export default function PreferenceSelector({ preferences, onChange, compact = false, disabled = false }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div className="pref-toggle">
        <button
          type="button"
          className={`pref-option veg ${preferences.foodType === 'VEG' ? 'active' : ''}`}
          disabled={disabled}
          onClick={() => onChange({ foodType: 'VEG' })}
        >
          🟢 {FOOD_TYPE_LABELS.VEG}
        </button>
        <button
          type="button"
          className={`pref-option nonveg ${preferences.foodType === 'NON_VEG' ? 'active' : ''}`}
          disabled={disabled}
          onClick={() => onChange({ foodType: 'NON_VEG' })}
        >
          🔴 {FOOD_TYPE_LABELS.NON_VEG}
        </button>
      </div>
      <div className="pref-toggle">
        <button
          type="button"
          className={`pref-option north ${preferences.cuisine === 'NORTH_INDIAN' ? 'active' : ''}`}
          disabled={disabled}
          onClick={() => onChange({ cuisine: 'NORTH_INDIAN' })}
        >
          {compact ? '🇮🇳' : ''} {CUISINE_LABELS.NORTH_INDIAN}
        </button>
        <button
          type="button"
          className={`pref-option south ${preferences.cuisine === 'SOUTH_INDIAN' ? 'active' : ''}`}
          disabled={disabled}
          onClick={() => onChange({ cuisine: 'SOUTH_INDIAN' })}
        >
          {compact ? '🌴' : ''} {CUISINE_LABELS.SOUTH_INDIAN}
        </button>
      </div>
    </div>
  )
}
