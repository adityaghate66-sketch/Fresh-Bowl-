// =====================================================================
// DELIVERY APP — big buttons, zero clutter (Stage 6)
// =====================================================================
// Staff see only what they need: address, contact, meal count and the
// next status action. No payments, no analytics (permission Rule 8).

import { useApp } from '../context/AppContext'
import Screen from '../components/Screen'
import { todayString } from '../services/engine'

const FLOW = {
  READY: 'ASSIGNED',
  ASSIGNED: 'PICKED UP',
  'PICKED UP': 'OUT FOR DELIVERY',
  'OUT FOR DELIVERY': 'DELIVERED'
}

const BTN_LABEL = {
  'PICKED UP': '✅ Confirm PICKED UP',
  'OUT FOR DELIVERY': '🛵 Start delivery',
  DELIVERED: '🏁 Mark DELIVERED'
}

export default function DeliveryApp() {
  const { state, currentUser, setOrderStatus, logout } = useApp()
  const staffId = currentUser?.id

  const mine = state.orders.filter(
    (o) => o.date === todayString() && ['ASSIGNED', 'PICKED UP', 'OUT FOR DELIVERY'].includes(o.status)
  )
  const deliveredToday = state.orders.filter(
    (o) => o.date === todayString() && o.status === 'DELIVERED' && o.history?.some((h) => h.by === staffId)
  )

  function advance(order) {
    const next = FLOW[order.status]
    if (next) setOrderStatus(order.id, next, staffId)
  }

  return (
    <>
      <header className="top-header">
        <div style={{ flex: 1 }}>
          <h1 className="h2">🛵 Delivery Run</h1>
          <p className="tiny" style={{ marginTop: 2 }}>
            {currentUser?.name} • {mine.length} active • {deliveredToday.length} delivered today
          </p>
        </div>
        <button className="icon-btn" onClick={logout} aria-label="Sign out">🚪</button>
      </header>

      <Screen>
        {mine.length === 0 && deliveredToday.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🗺️</div>
            <p>No drops assigned yet.</p>
            <p className="tiny">Orders appear here once the kitchen marks them READY and admin assigns you.</p>
          </div>
        ) : (
          <>
            {mine.map((order, i) => (
              <div key={order.id} className={`card deliv-card ${i === 0 ? 'next' : ''}`} style={{ marginBottom: 14 }}>
                <div className="meal-row" style={{ marginTop: 0 }}>
                  <div>
                    <b style={{ fontSize: 15 }}>{order.customerName}</b>
                    <p className="tiny" style={{ margin: '2px 0 0' }}>
                      📍 {order.addressLabel} • {order.meals.length} meal box{order.meals.length > 1 ? 'es' : ''}
                    </p>
                  </div>
                  <span className={`badge ${order.status === 'ASSIGNED' ? 'badge-cuisine' : 'badge-amber'}`}>{order.status}</span>
                </div>

                <p className="tiny" style={{ margin: '10px 0 6px' }}>
                  🍱 {order.meals.map((m) => `${m.foodType === 'VEG' ? '🟢' : '🔴'} ${m.name.split(' ').slice(0, 2).join(' ')}`).join(' • ')}
                </p>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => window.alert(`Call customer for ${order.id} (demo)`)}>📞 Call</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => window.alert(`Opening maps for ${order.addressLabel} (demo)`)}>🗺️ Navigate</button>
                </div>

                {FLOW[order.status] && (
                  <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => advance(order)}>
                    {BTN_LABEL[FLOW[order.status]] || `→ ${FLOW[order.status]}`}
                  </button>
                )}
              </div>
            ))}

            {deliveredToday.length > 0 && (
              <>
                <div className="section-title"><h2 className="h2">Delivered today</h2></div>
                {deliveredToday.map((o) => (
                  <div key={o.id} className="card" style={{ marginBottom: 10, opacity: 0.75 }}>
                    <div className="meal-row" style={{ marginTop: 0 }}>
                      <b style={{ fontSize: 13.5 }}>✅ {o.customerName}</b>
                      <span className="badge badge-veg">DELIVERED</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </Screen>
    </>
  )
}
