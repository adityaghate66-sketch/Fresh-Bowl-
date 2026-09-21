// =====================================================================
// LOGIN / REGISTER — role-based entry to the platform (Stage 2)
// =====================================================================
// One screen for every role. Seeded demo accounts are one tap away
// (password is pre-filled) so you can explore each dashboard instantly.
// In Stage 3+ this calls the real backend; the flow stays identical.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { ROLE_HOME, ROLE_LABELS } from '../services/engine'

const DEMO_ACCOUNTS = [
  { role: 'CUSTOMER', email: 'guest@freshbowl.in', password: 'guest123', icon: '🙋', desc: 'Shop, subscribe, track & rate meals' },
  { role: 'KITCHEN', email: 'kitchen@freshbowl.in', password: 'kitchen123', icon: '👨‍🍳', desc: 'Production counts & meal prep' },
  { role: 'DELIVERY', email: 'delivery@freshbowl.in', password: 'delivery123', icon: '🛵', desc: 'Assigned drops & status updates' },
  { role: 'ADMIN', email: 'admin@freshbowl.in', password: 'admin123', icon: '🛡️', desc: 'Everything, at a glance' }
]

const ROLE_TABS = ['CUSTOMER', 'KITCHEN', 'DELIVERY', 'ADMIN']

export default function Login() {
  const navigate = useNavigate()
  const { state, login, register, requestPasswordReset, resetPassword } = useApp()

  const [mode, setMode] = useState('login') // login | register | forgot
  const [role, setRole] = useState('CUSTOMER')
  const [form, setForm] = useState({ identifier: '', password: '', name: '', email: '', phone: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // Password reset (Part 2 requirement): request a code → enter it + new password.
  const [resetStep, setResetStep] = useState(0) // 0 = ask email, 1 = code + new password
  const [resetToken, setResetToken] = useState('')
  const [resetNew, setResetNew] = useState('')
  const [resetDone, setResetDone] = useState(false)

  async function submit(e) {
    e?.preventDefault()
    setError('')
    setBusy(true)
    const result = mode === 'login'
      ? await login({ identifier: form.identifier, password: form.password, role })
      : await register({ name: form.name, email: form.email, phone: form.phone, password: form.password, role })
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    // Staff go to their dashboard; customers finish onboarding first if needed.
    if (result.user.role === 'CUSTOMER') {
      navigate(state.onboarded ? '/home' : '/onboarding', { replace: true })
    } else {
      navigate(ROLE_HOME[result.user.role], { replace: true })
    }
  }

  function quickFill(account) {
    setRole(account.role)
    setMode('login')
    setForm((f) => ({ ...f, identifier: account.email, password: account.password }))
    setError('')
  }

  // ---------- Password reset helpers ----------
  function requestReset() {
    setError('')
    const result = requestPasswordReset(form.identifier)
    if (!result.ok) return setError(result.error)
    // In production this code is emailed/SMS'd. In the demo we show it here.
    setResetToken(result.token)
    setResetStep(1)
  }

  function confirmReset() {
    setError('')
    const result = resetPassword(form.identifier, resetToken, resetNew)
    if (!result.ok) return setError(result.error)
    setResetDone(true)
    setResetStep(0)
    setResetNew('')
    setMode('login')
  }

  return (
    <div>
      <div className="auth-hero">
        <div style={{ fontSize: 44 }} className="float">🥗</div>
        <h1 className="h1" style={{ marginTop: 8 }}>FreshBowl</h1>
        <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: 14 }}>
          Healthy meals. Every day. Delivered to you.
        </p>
      </div>

      <div className="page" style={{ paddingTop: 18 }}>
        {/* Role selector */}
        <p className="tiny" style={{ marginBottom: 8, fontWeight: 700, letterSpacing: '0.04em' }}>WHO'S SIGNING IN?</p>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
          {ROLE_TABS.map((r) => (
            <button key={r} type="button" className={`role-chip ${role === r ? 'active' : ''}`} onClick={() => setRole(r)}>
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>

        {/* Mode switch */}
        <div className="pref-toggle" style={{ margin: '16px 0 18px' }}>
          <button type="button" className={`pref-option ${mode === 'login' ? 'active' : ''}`}
            style={mode === 'login' ? { borderColor: 'var(--ink)', background: 'var(--ink)', color: '#fff' } : undefined}
            onClick={() => { setMode('login'); setError('') }}>
            Sign in
          </button>
          <button type="button" className={`pref-option ${mode === 'register' ? 'active' : ''}`}
            style={mode === 'register' ? { borderColor: 'var(--ink)', background: 'var(--ink)', color: '#fff' } : undefined}
            onClick={() => { setMode('register'); setError('') }}>
            Create account
          </button>
        </div>

        {/* ---------- FORGOT PASSWORD ---------- */}
        {mode === 'forgot' && (
          <div className="card" style={{ marginBottom: 16 }}>
            <h2 className="h2" style={{ marginTop: 0 }}>🔑 Reset password</h2>
            {resetDone ? (
              <p className="banner green" style={{ marginBottom: 0 }}>
                <span>✅</span>
                <span>Password updated! Sign in with your new password.</span>
              </p>
            ) : (
              <>
                <div className="field">
                  <label>Email or mobile</label>
                  <input value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} placeholder="you@example.com" />
                </div>
                {resetStep === 1 && (
                  <>
                    <p className="banner blue" style={{ marginTop: 0 }}>
                      <span>📩</span>
                      <span>Demo mode: your reset code is <b>{resetToken}</b> (in production this is emailed/SMS'd to you).</span>
                    </p>
                    <div className="field">
                      <label>Reset code</label>
                      <input value={resetToken} onChange={(e) => setResetToken(e.target.value)} placeholder="FB-XXXXXX" />
                    </div>
                    <div className="field">
                      <label>New password</label>
                      <input type="password" value={resetNew} onChange={(e) => setResetNew(e.target.value)} placeholder="At least 4 characters" />
                    </div>
                  </>
                )}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={resetStep === 0 ? requestReset : confirmReset}
                >
                  {resetStep === 0 ? 'Send reset code' : 'Set new password'}
                </button>
              </>
            )}
            <button type="button" className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => { setMode('login'); setError(''); setResetStep(0) }}>
              ← Back to sign in
            </button>
          </div>
        )}

        <form onSubmit={submit} style={mode === 'forgot' ? { display: 'none' } : undefined}>
          {mode === 'register' && (
            <>
              <div className="field">
                <label>Full name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
              </div>
              <div className="field">
                <label>Email</label>
                <input value={form.email} inputMode="email" onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
              </div>
              <div className="field">
                <label>Mobile</label>
                <input value={form.phone} inputMode="tel" maxLength={10} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} placeholder="10-digit mobile" />
              </div>
            </>
          )}
          {mode === 'login' && (
            <div className="field">
              <label>Email or mobile</label>
              <input value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} placeholder="you@example.com" />
            </div>
          )}
          <div className="field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
          </div>

          {error && (
            <p className="banner red" style={{ marginBottom: 14 }}>
              <span>⚠️</span><span>{error}</span>
            </p>
          )}

          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Checking…' : mode === 'login' ? `Sign in as ${ROLE_LABELS[role]}` : `Create ${ROLE_LABELS[role]} account`}
          </button>
        </form>

        {mode !== 'forgot' && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ marginTop: 12 }}
            onClick={() => { setMode('forgot'); setError(''); setResetDone(false) }}
          >
            🔑 Forgot password?
          </button>
        )}

        {/* Quick demo logins */}
        <div className="section-title"><h2 className="h2">One-tap demo accounts</h2></div>
        {DEMO_ACCOUNTS.map((a) => (
          <button key={a.role} type="button" className="link-row" onClick={() => quickFill(a)}>
            <span style={{ fontSize: 22 }}>{a.icon}</span>
            <span style={{ flex: 1 }}>
              {ROLE_LABELS[a.role]}
              <span className="tiny" style={{ display: 'block', fontWeight: 500 }}>{a.desc}</span>
            </span>
            <span className="badge badge-gray">{a.email.split('@')[0]}</span>
          </button>
        ))}
        <p className="tiny" style={{ textAlign: 'center', marginTop: 6 }}>
          Tap an account → password fills in → press Sign in. (Demo auth — real JWT arrives with the live backend.)
        </p>
      </div>
    </div>
  )
}
