// Toaster: floating success/error notifications (top of screen).
// Rendered once at the app root; fed by context `toasts`.

import { useApp } from '../context/AppContext'

export default function Toaster() {
  const { toasts, dismissToast } = useApp()
  if (!toasts.length) return null
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span className="toast-emoji">{t.emoji}</span>
          <div style={{ flex: 1 }}>
            <b>{t.title}</b>
            {t.body && <p>{t.body}</p>}
          </div>
          <span className={`toast-tone ${t.tone || 'green'}`} />
          <button className="toast-x" onClick={() => dismissToast(t.id)} aria-label="Dismiss">✕</button>
        </div>
      ))}
    </div>
  )
}
