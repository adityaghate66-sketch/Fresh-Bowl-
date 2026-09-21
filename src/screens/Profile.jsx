// Profile: account area — details, preferences, payment history and
// quick access to orders, subscription management and support.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { CUISINE_LABELS, FOOD_TYPE_LABELS, formatINR } from '../utils/format'
import { formatDateShort } from '../utils/date'
import Screen from '../components/Screen'
import TabBar from '../components/TabBar'

export default function Profile() {
  const navigate = useNavigate()
  const { state, currentUser, saveProfile, changePassword, logout, resetAll } = useApp()
  const { profile, preferences, subscription, payments } = state

  const [form, setForm] = useState({ name: profile.name, email: profile.email, phone: profile.phone })
  const [saved, setSaved] = useState(false)
  // Change password (Part 2: manage profile)
  const [pw, setPw] = useState({ current: '', next: '' })
  const [pwMsg, setPwMsg] = useState(null)

  function save() {
    saveProfile(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function submitPassword(e) {
    e.preventDefault()
    const result = changePassword(pw.current, pw.next)
    setPwMsg(result.ok ? { ok: true, text: 'Password changed ✅' } : { ok: false, text: result.error })
    if (result.ok) setPw({ current: '', next: '' })
  }

  return (
    <>
      <header className="top-header">
        <div>
          <h1 className="h2">👤 My Profile</h1>
          <p className="tiny" style={{ marginTop: 2 }}>
            {currentUser ? `Signed in as ${currentUser.email}` : 'Guest mode — sign in for full features'}
          </p>
        </div>
      </header>

      <Screen>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 52 }} className="float">🙂</div>
          <h2 className="h2" style={{ marginTop: 6 }}>{profile.name || 'Guest'}</h2>
          <p className="tiny">{profile.email || 'No email yet'} • {profile.phone || 'No phone yet'}</p>
          {!currentUser && (
            <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => navigate('/login')}>
              Sign in / Register
            </button>
          )}
          {currentUser && (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={logout}>
              Sign out
            </button>
          )}
        </div>

        <div className="section-title"><h2 className="h2">My details</h2></div>
        <div className="card">
          <div className="field">
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
          </div>
          <div className="field">
            <label>Email</label>
            <input value={form.email} inputMode="email" onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
          </div>
          <div className="field">
            <label>Phone</label>
            <input value={form.phone} inputMode="tel" maxLength={10} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} placeholder="10-digit mobile" />
          </div>
          <button className="btn btn-primary" onClick={save}>
            {saved ? '✅ Saved!' : 'Save changes'}
          </button>
        </div>

        {/* ---- Change password (signed-in users) ---- */}
        {currentUser && (
          <>
            <div className="section-title"><h2 className="h2">Change password</h2></div>
            <form className="card" onSubmit={submitPassword}>
              <div className="field">
                <label>Current password</label>
                <input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} placeholder="••••••••" />
              </div>
              <div className="field">
                <label>New password</label>
                <input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} placeholder="At least 4 characters" />
              </div>
              {pwMsg && (
                <p className={`banner ${pwMsg.ok ? 'green' : 'red'}`} style={{ marginBottom: 12 }}>
                  <span>{pwMsg.ok ? '✅' : '⚠️'}</span><span>{pwMsg.text}</span>
                </p>
              )}
              <button className="btn btn-ghost" type="submit">Update password</button>
            </form>
          </>
        )}

        <div className="section-title"><h2 className="h2">Food preferences</h2></div>
        <div className="card">
          <div className="stat-grid" style={{ marginTop: 0 }}>
            <div className="stat">
              <b>{preferences.foodType === 'VEG' ? '🟢 Veg' : '🔴 Non-Veg'}</b>
              <span>Food</span>
            </div>
            <div className="stat">
              <b>{CUISINE_LABELS[preferences.cuisine]}</b>
              <span>Cuisine</span>
            </div>
            <div className="stat">
              <b>3</b>
              <span>Meals/day</span>
            </div>
          </div>
          {subscription && subscription.status === 'ACTIVE' && (
            <p className="banner amber" style={{ marginTop: 12, marginBottom: 0 }}>
              <span>🔒</span>
              <span>Locked while your subscription is active — this protects your generated meal schedule.</span>
            </p>
          )}
        </div>

        <div className="section-title"><h2 className="h2">Quick links</h2></div>
        <button className="link-row" onClick={() => navigate('/orders')}>
          📦 My orders <span className="arrow">›</span>
        </button>
        <button className="link-row" onClick={() => navigate('/subscription')}>
          📋 Manage subscription <span className="arrow">›</span>
        </button>
        <button className="link-row" onClick={() => navigate('/addresses')}>
          📍 Delivery addresses <span className="muted" style={{ marginLeft: 'auto' }}>{state.addresses.length} saved</span>
        </button>
        <button className="link-row" onClick={() => navigate('/support')}>
          💬 Help & support <span className="arrow">›</span>
        </button>

        <div className="section-title"><h2 className="h2">Payment history</h2></div>
        {payments.length === 0 ? (
          <div className="card"><p className="muted" style={{ margin: 0 }}>No payments yet.</p></div>
        ) : (
          payments.map((payment) => (
            <div key={payment.id} className="card">
              <div className="meal-row" style={{ marginTop: 0 }}>
                <b style={{ fontSize: 14 }}>
                  {payment.status === 'SUCCESS' ? '✅' : '❌'} {formatINR(payment.amount)} • {payment.method}
                </b>
                <span className={`badge ${payment.status === 'SUCCESS' ? 'badge-veg' : 'badge-nonveg'}`}>{payment.status}</span>
              </div>
              <p className="tiny" style={{ margin: '4px 0 0' }}>
                {payment.id} • {formatDateShort(payment.createdAt.slice(0, 10))}
              </p>
            </div>
          ))
        )}

        <div className="section-title"><h2 className="h2">Danger zone</h2></div>
        <button
          className="btn btn-danger"
          onClick={() => {
            if (window.confirm('Reset ALL demo data (profile, preferences, subscription, orders, payments)? This cannot be undone.')) {
              resetAll()
              navigate('/onboarding', { replace: true })
            }
          }}
        >
          🧹 Reset demo data
        </button>

        <footer className="legal">FreshBowl v1.0 — full platform demo • data stored in your browser</footer>
      </Screen>
      <TabBar />
    </>
  )
}
