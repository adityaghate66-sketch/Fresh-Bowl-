// BottomSheet: mobile-style modal that slides up from the bottom.
// Used for rating, skipping meals, substitutions and confirmations.

export default function BottomSheet({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grab" />
        {title && <h3 className="h2" style={{ marginBottom: 12 }}>{title}</h3>}
        {children}
      </div>
    </div>
  )
}
