// Notifications: every important event (payment, subscription,
// delivery…) lands here. Real push notifications arrive in Stage 7.

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Screen from '../components/Screen'

function timeAgo(iso) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`
  return `${Math.floor(seconds / 86400)} d ago`
}

export default function Notifications() {
  const navigate = useNavigate()
  const { state, markNotificationsRead } = useApp()

  useEffect(() => {
    // Opening the screen clears the red dot on the bell.
    markNotificationsRead()
  }, []) // eslint-disable-line

  return (
    <>
      <header className="top-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">←</button>
        <h1 className="h2">🔔 Notifications</h1>
      </header>

      <Screen>
        {state.notifications.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🔔</div>
            <p>No notifications yet.</p>
          </div>
        ) : (
          <div className="card">
            {state.notifications.map((n) => (
              <div key={n.id} className="notif">
                <div className="notif-icon">{n.icon}</div>
                <div style={{ flex: 1 }}>
                  <b style={{ fontSize: 14 }}>{n.title}</b>
                  <p className="muted" style={{ margin: '3px 0 0', fontSize: 13, lineHeight: 1.5 }}>{n.body}</p>
                  <span className="tiny">{timeAgo(n.at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Screen>
    </>
  )
}
