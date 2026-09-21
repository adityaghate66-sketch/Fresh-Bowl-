// StarRating: tappable 1–5 stars (used for meal ratings after delivery)
// or read-only display stars.

export default function StarRating({ value = 0, onChange, size = 34, readOnly = false }) {
  return (
    <div className="star-row" style={readOnly ? { margin: 0 } : undefined}>
      {[1, 2, 3, 4, 5].map((star) =>
        readOnly ? (
          <span key={star} style={{ fontSize: size * 0.5, color: star <= Math.round(value) ? '#f59e0b' : '#e2ddd5' }}>★</span>
        ) : (
          <button
            key={star}
            type="button"
            className={`star-btn ${star <= value ? 'on' : ''}`}
            style={{ fontSize: size }}
            onClick={() => onChange?.(star)}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
          >
            ★
          </button>
        )
      )}
    </div>
  )
}
