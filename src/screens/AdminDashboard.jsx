// =====================================================================
// ADMIN DASHBOARD — the command centre (Stage 5 + PART 3 of the spec)
// =====================================================================
// Tabs: Overview (metrics + charts) • Orders (assign/status) •
// Customers • Plans • Menu (food availability) • Payments •
// Support (tickets) • Ratings • Notify (broadcasts).
// Data comes from the live app state.

import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { adminMetrics, todayString, allFood, allPlans } from '../services/engine'
import Screen from '../components/Screen'
import { formatINR } from '../utils/format'
import { formatDateShort } from '../utils/date'

const ORDER_FLOW = ['PREPARING', 'READY', 'ASSIGNED', 'PICKED UP', 'OUT FOR DELIVERY', 'DELIVERED']
const TABS = ['OVERVIEW', 'ORDERS', 'CUSTOMERS', 'PLANS', 'MENU', 'PAYMENTS', 'SUPPORT', 'RATINGS', 'NOTIFY']

export default function AdminDashboard() {
  const { state, currentUser, setOrderStatus, assignDelivery, setTicketStatus, replyTicket, broadcastNotification, toggleFoodAvailability, logout } = useApp()
  const [tab, setTab] = useState('OVERVIEW')
  const [replyTo, setReplyTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  // Broadcast notification form (PART 3 → Notifications)
  const [bcast, setBcast] = useState({ icon: '📣', title: '', body: '' })
  // Customer search (PART 3 → Customer Management)
  const [customerQuery, setCustomerQuery] = useState('')

  const metrics = adminMetrics(state)
  const todaysOrders = state.orders.filter((o) => o.date === todayString())

  // Simple bar chart: orders per status
  const statusCounts = ORDER_FLOW.map((s) => ({
    status: s,
    count: state.orders.filter((o) => o.status === s).length
  }))
  const maxCount = Math.max(1, ...statusCounts.map((s) => s.count))

  // Ratings breakdown
  const ratingKeys = ['food', 'taste', 'packaging', 'delivery']
  const ratingAvg = ratingKeys.map((k) => ({
    key: k,
    avg: state.ratings.length
      ? (state.ratings.reduce((s, r) => s + r[k], 0) / state.ratings.length).toFixed(1)
      : '—'
  }))

  // Customer management (search + subscriptions + payments per customer)
  const customers = state.users.filter(
    (u) =>
      u.role === 'CUSTOMER' &&
      (u.name.toLowerCase().includes(customerQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(customerQuery.toLowerCase()) ||
        u.phone.includes(customerQuery))
  )
  // Expiring soon = active subscriptions with ≤5 days left
  const expiringSoon =
    state.subscription &&
    state.subscription.status === 'ACTIVE' &&
    (new Date(`${state.subscription.endDate}T00:00:00`) - new Date(`${todayString()}T00:00:00`)) / 86400000 <= 5
      ? [state.subscription]
      : []

  return (
    <>
      <header className="top-header">
        <div style={{ flex: 1 }}>
          <h1 className="h2">🛡️ Admin Console</h1>
          <p className="tiny" style={{ marginTop: 2 }}>{currentUser?.name} • {formatDateShort(todayString())}</p>
        </div>
        <button className="icon-btn" onClick={logout} aria-label="Sign out">🚪</button>
      </header>

      <div className="page" style={{ paddingTop: 8 }}>
        <div className="admin-nav">
          {TABS.map((t) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {/* ================= OVERVIEW ================= */}
        {tab === 'OVERVIEW' && (
          <>
            <div className="stat-grid-2" style={{ marginBottom: 12 }}>
              <div className="stat card" style={{ marginBottom: 0 }}>
                <b style={{ color: 'var(--green-dark)' }}>{metrics.activeSubs}</b>
                <span>Active subscriptions</span>
              </div>
              <div className="stat card" style={{ marginBottom: 0 }}>
                <b>{formatINR(metrics.revenue)}</b>
                <span>Revenue (all time)</span>
              </div>
              <div className="stat card" style={{ marginBottom: 0 }}>
                <b>{metrics.todayOrders}</b>
                <span>Orders today</span>
              </div>
              <div className="stat card" style={{ marginBottom: 0 }}>
                <b>{metrics.deliveredToday}/{metrics.todayOrders}</b>
                <span>Delivered today</span>
              </div>
            </div>

            <div className="card">
              <h3 className="h2">📊 Pipeline (all orders)</h3>
              <div style={{ marginTop: 10 }}>
                {statusCounts.map(({ status, count }) => (
                  <div key={status} className="bar-row">
                    <span className="bar-label">{status}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${(count / maxCount) * 100}%` }} />
                    </div>
                    <span className="bar-val">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="h2">📈 At a glance</h3>
              <div className="stat-grid" style={{ marginTop: 10 }}>
                <div className="stat"><b>{metrics.pausedSubs}</b><span>Paused</span></div>
                <div className="stat"><b>{metrics.failedPayments}</b><span>Failed payments</span></div>
                <div className="stat"><b>{metrics.openTickets}</b><span>Open tickets</span></div>
                <div className="stat"><b>{metrics.avgRating}</b><span>Avg rating</span></div>
              </div>
            </div>

            <div className="card">
              <h3 className="h2">🔁 Substitutions log</h3>
              {state.substitutions.length === 0 ? (
                <p className="muted" style={{ marginBottom: 0 }}>None recorded.</p>
              ) : (
                state.substitutions.slice(0, 4).map((s) => (
                  <p className="muted" key={s.id} style={{ margin: '8px 0 0', fontSize: 13 }}>
                    🔄 {s.original} → <b>{s.replacement}</b> <span className="tiny">({s.reason})</span>
                  </p>
                ))
              )}
            </div>
          </>
        )}

        {/* ================= ORDERS ================= */}
        {tab === 'ORDERS' && (
          <>
            {state.orders.length === 0 && (
              <div className="empty"><div className="empty-icon">📦</div><p>No orders in the system.</p></div>
            )}
            {state.orders.map((order) => (
              <div key={order.id} className="card" style={{ marginBottom: 12 }}>
                <div className="meal-row" style={{ marginTop: 0 }}>
                  <div>
                    <b style={{ fontSize: 14 }}>{order.customerName} • {formatDateShort(order.date)}</b>
                    <p className="tiny" style={{ margin: '2px 0 0' }}>
                      {order.id} • {order.meals.length} meals • {order.addressLabel}
                    </p>
                  </div>
                  <span className="badge badge-gray">{order.status}</span>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {!order.assignedTo && (
                    <button className="btn btn-ghost btn-sm" onClick={() => assignDelivery(order.id, 'U-DELIVERY')}>
                      🛵 Assign Dev D.
                    </button>
                  )}
                  {order.assignedTo && (
                    <span className="badge badge-teal" style={{ alignSelf: 'center' }}>🛵 {order.assignedTo === 'U-DELIVERY' ? 'Dev Delivery' : order.assignedTo}</span>
                  )}
                  {order.status !== 'DELIVERED' && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setOrderStatus(order.id, ORDER_FLOW[ORDER_FLOW.indexOf(order.status) + 1], 'Admin')}
                    >
                      → {ORDER_FLOW[ORDER_FLOW.indexOf(order.status) + 1]}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ================= CUSTOMERS (PART 3) ================= */}
        {tab === 'CUSTOMERS' && (
          <>
            <div className="field">
              <input
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                placeholder="🔍 Search by name, email or mobile…"
              />
            </div>
            {customers.length === 0 && (
              <div className="empty"><div className="empty-icon">👥</div><p>No customers match.</p></div>
            )}
            {customers.map((c) => (
              <div key={c.id} className="card" style={{ marginBottom: 12 }}>
                <div className="meal-row" style={{ marginTop: 0 }}>
                  <div>
                    <b style={{ fontSize: 14 }}>{c.name}</b>
                    <p className="tiny" style={{ margin: '2px 0 0' }}>{c.email} • {c.phone || 'no phone'}</p>
                  </div>
                  <span className="badge badge-teal">CUSTOMER</span>
                </div>
                <p className="tiny" style={{ margin: '10px 0 0' }}>
                  📦 {state.subscription ? `Subscribed to ${state.subscription.planName} (${state.subscription.status})` : 'No subscription yet'}
                </p>
                <p className="tiny" style={{ margin: '4px 0 0' }}>
                  📍 {state.addresses.length} address{state.addresses.length === 1 ? '' : 'es'} • 💳 {state.payments.length} payment{state.payments.length === 1 ? '' : 's'} • 🛍️ {state.orders.length} orders
                </p>
              </div>
            ))}
          </>
        )}

        {/* ================= PLANS (PART 3: Subscription Management) ================= */}
        {tab === 'PLANS' && (
          <>
            <p className="banner blue">
              <span>🏷️</span>
              <span>
                Catalogue preview — every customer sees these plans. Editing prices here is part of
                the live backend (Stage 2+); today they come from the shared plan catalogue.
              </span>
            </p>
            {allPlans().map((plan) => (
              <div key={plan.id} className="card" style={{ marginBottom: 12 }}>
                <div className="meal-row" style={{ marginTop: 0 }}>
                  <div>
                    <b style={{ fontSize: 14 }}>{plan.name}</b>
                    <p className="tiny" style={{ margin: '2px 0 0' }}>{plan.tagline}</p>
                  </div>
                  <span className="badge badge-cuisine">{plan.durationDays} days</span>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 18, fontWeight: 800 }}>{formatINR(plan.price)}</p>
                <p className="tiny" style={{ margin: '4px 0 0' }}>
                  {plan.mealsPerDay.length} meals/day • {plan.id === 'family-30' ? 'feeds 2 people' : '1 person'}
                </p>
              </div>
            ))}
            {expiringSoon.length > 0 && (
              <div className="card">
                <h3 className="h2">⌛ Expiring soon</h3>
                {expiringSoon.map((s) => (
                  <p key={s.id} className="tiny" style={{ margin: '6px 0 0' }}>
                    {s.customerName} • {s.planName} • ends {formatDateShort(s.endDate)}
                  </p>
                ))}
              </div>
            )}
          </>
        )}

        {/* ================= MENU (PART 3: Food/Menu Management) ================= */}
        {tab === 'MENU' && (
          <>
            <p className="banner blue">
              <span>👨‍🍳</span>
              <span>
                Tap a dish to mark it <b>SOLD OUT</b> — it disappears from every customer&apos;s menu
                instantly and the daily automation picks a replacement.
              </span>
            </p>
            {allFood().map((item) => {
              const off = state.unavailableFoodIds.includes(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleFoodAvailability(item.id)}
                  className="card"
                  style={{
                    width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                    marginBottom: 10, opacity: off ? 0.55 : 1, border: off ? '1.5px dashed var(--red)' : undefined
                  }}
                >
                  <div className="meal-row" style={{ marginTop: 0 }}>
                    <div>
                      <b style={{ fontSize: 13.5 }}>{item.emoji} {item.name}</b>
                      <p className="tiny" style={{ margin: '2px 0 0' }}>
                        {item.foodType === 'VEG' ? '🟢 Veg' : '🔴 Non-Veg'} • {item.mealType} • ⭐ {item.rating}
                      </p>
                    </div>
                    <span className={`badge ${off ? 'badge-nonveg' : 'badge-veg'}`}>{off ? 'SOLD OUT' : 'AVAILABLE'}</span>
                  </div>
                </button>
              )
            })}
          </>
        )}

        {/* ================= PAYMENTS (PART 3) ================= */}
        {tab === 'PAYMENTS' && (
          <>
            <div className="stat-grid-2" style={{ marginBottom: 12 }}>
              <div className="stat card" style={{ marginBottom: 0 }}>
                <b style={{ color: 'var(--green-dark)' }}>{formatINR(metrics.revenue)}</b>
                <span>Successful revenue</span>
              </div>
              <div className="stat card" style={{ marginBottom: 0 }}>
                <b>{metrics.failedPayments}</b>
                <span>Failed payments</span>
              </div>
            </div>
            {state.payments.length === 0 ? (
              <div className="empty"><div className="empty-icon">💳</div><p>No transactions yet.</p></div>
            ) : (
              state.payments.map((p) => (
                <div key={p.id} className="card" style={{ marginBottom: 10 }}>
                  <div className="meal-row" style={{ marginTop: 0 }}>
                    <b style={{ fontSize: 14 }}>
                      {p.status === 'SUCCESS' ? '✅' : '❌'} {formatINR(p.amount)} • {p.method}
                    </b>
                    <span className={`badge ${p.status === 'SUCCESS' ? 'badge-veg' : 'badge-nonveg'}`}>{p.status}</span>
                  </div>
                  <p className="tiny" style={{ margin: '4px 0 0' }}>
                    {p.id}{p.planName ? ` • ${p.planName}` : ''} • {formatDateShort(p.createdAt.slice(0, 10))} • no card data stored
                  </p>
                </div>
              ))
            )}
          </>
        )}

        {/* ================= NOTIFY (PART 3: Notifications) ================= */}
        {tab === 'NOTIFY' && (
          <>
            <div className="card">
              <h3 className="h2">📣 Send a broadcast</h3>
              <p className="tiny" style={{ margin: '6px 0 12px' }}>
                Lands instantly in the customer&apos;s notification bell and as a pop-up toast.
              </p>
              <div className="field">
                <label>Title</label>
                <input value={bcast.title} onChange={(e) => setBcast({ ...bcast, title: e.target.value })} placeholder="e.g. Menu update — new dishes this week!" />
              </div>
              <div className="field">
                <label>Message</label>
                <textarea rows={3} value={bcast.body} onChange={(e) => setBcast({ ...bcast, body: e.target.value })} placeholder="Write the announcement…" />
              </div>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!bcast.title.trim() || !bcast.body.trim()) return
                  broadcastNotification(bcast.icon, bcast.title.trim(), bcast.body.trim())
                  setBcast({ icon: '📣', title: '', body: '' })
                }}
              >
                Send to all customers
              </button>
            </div>
            <div className="section-title"><h2 className="h2">Recent notifications</h2></div>
            {state.notifications.length === 0 ? (
              <div className="card"><p className="muted" style={{ margin: 0 }}>Nothing sent yet.</p></div>
            ) : (
              state.notifications.slice(0, 8).map((n) => (
                <div key={n.id} className="card" style={{ marginBottom: 8 }}>
                  <b style={{ fontSize: 13.5 }}>{n.icon} {n.title}</b>
                  <p className="tiny" style={{ margin: '4px 0 0' }}>{n.body}</p>
                </div>
              ))
            )}
          </>
        )}

        {/* ================= SUPPORT ================= */}
        {tab === 'SUPPORT' && (
          <>
            {state.tickets.length === 0 ? (
              <div className="empty"><div className="empty-icon">🎟️</div><p>No tickets. Customers are happy! 🎉</p></div>
            ) : (
              state.tickets.map((t) => (
                <div key={t.id} className="card" style={{ marginBottom: 12 }}>
                  <div className="meal-row" style={{ marginTop: 0 }}>
                    <div>
                      <b style={{ fontSize: 14 }}>{t.subject}</b>
                      <p className="tiny" style={{ margin: '2px 0 0' }}>{t.id} • {t.category} • {t.customer}</p>
                    </div>
                    <span className={`badge ${t.status === 'OPEN' ? 'badge-amber' : t.status === 'RESOLVED' ? 'badge-veg' : 'badge-cuisine'}`}>{t.status}</span>
                  </div>

                  <div style={{ margin: '10px 0', display: 'grid', gap: 6 }}>
                    {t.messages.map((m, i) => (
                      <p key={i} className="muted" style={{
                        margin: 0, fontSize: 13,
                        background: m.from === 'SUPPORT' ? 'var(--green-soft)' : 'var(--bg)',
                        borderRadius: 10, padding: '8px 10px'
                      }}>
                        <b>{m.from === 'SUPPORT' ? 'FreshBowl' : t.customer}:</b> {m.text}
                      </p>
                    ))}
                  </div>

                  {t.status !== 'RESOLVED' && (
                    <>
                      {replyTo === t.id ? (
                        <div style={{ display: 'grid', gap: 8 }}>
                          <textarea rows={2} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Type your response…" />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-primary btn-sm" onClick={() => { replyTicket(t.id, replyText || 'Thanks! We are on it.', 'SUPPORT'); setReplyTo(null); setReplyText('') }}>
                              Send
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setTicketStatus(t.id, 'RESOLVED')}>Resolve</button>
                          </div>
                        </div>
                      ) : (
                        <button className="btn btn-ghost btn-sm" onClick={() => { setReplyTo(t.id); setReplyText('') }}>💬 Reply</button>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
          </>
        )}

        {/* ================= RATINGS ================= */}
        {tab === 'RATINGS' && (
          <>
            <div className="card">
              <h3 className="h2">⭐ Average scores</h3>
              <div style={{ marginTop: 10 }}>
                {ratingAvg.map(({ key, avg }) => (
                  <div key={key} className="bar-row">
                    <span className="bar-label" style={{ textTransform: 'capitalize' }}>{key}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${avg === '—' ? 0 : (avg / 5) * 100}%` }} />
                    </div>
                    <span className="bar-val">{avg}</span>
                  </div>
                ))}
              </div>
            </div>

            {state.ratings.length === 0 ? (
              <div className="empty"><div className="empty-icon">⭐</div><p>No ratings yet.</p></div>
            ) : (
              state.ratings.map((r) => (
                <div key={r.id} className="card" style={{ marginBottom: 10 }}>
                  <div className="meal-row" style={{ marginTop: 0 }}>
                    <b style={{ fontSize: 13.5 }}>Order {r.orderId}</b>
                    <span className="rating-stars">{'★'.repeat(Math.round((r.food + r.taste + r.packaging + r.delivery) / 4))}</span>
                  </div>
                  <p className="tiny" style={{ margin: '4px 0 0' }}>
                    Food {r.food} • Taste {r.taste} • Packaging {r.packaging} • Delivery {r.delivery}
                  </p>
                  {r.review && <p className="muted" style={{ margin: '6px 0 0', fontSize: 13 }}>"{r.review}"</p>}
                </div>
              ))
            )}
          </>
        )}
      </div>
    </>
  )
}
