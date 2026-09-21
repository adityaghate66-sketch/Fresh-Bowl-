// =====================================================================
// SUPPORT — FAQs + tickets with message history (Stage 7 flow)
// =====================================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Screen from '../components/Screen'

const FAQS = [
  { q: 'When is breakfast delivered?', a: 'Between 7:30 and 9:30 AM. Lunch 12:30–2:30 PM, dinner 7:30–9:30 PM.' },
  { q: 'How do I skip a meal?', a: 'Open My Subscription → Skip a meal. Works until 9 PM the night before.' },
  { q: 'Can I pause my plan?', a: 'Yes — pause from My Subscription. Days allowed depend on your plan (5–20 days).' },
  { q: 'Will I ever get non-veg food as a veg customer?', a: 'Never. Your preference is enforced in the kitchen, not just the app.' },
  { q: 'How do refunds work?', a: 'Failed payments never activate a plan. For other refunds, raise a PAYMENT ticket below.' }
]

export default function Support() {
  const navigate = useNavigate()
  const { state, createTicket } = useApp()
  const [openFaq, setOpenFaq] = useState(null)
  const [form, setForm] = useState({ subject: '', category: 'DELIVERY', message: '' })
  const [sent, setSent] = useState(false)

  function submit(e) {
    e.preventDefault()
    if (!form.subject.trim() || !form.message.trim()) return
    createTicket(form.subject, form.category, form.message)
    setForm({ subject: '', category: 'DELIVERY', message: '' })
    setSent(true)
    setTimeout(() => setSent(false), 2500)
  }

  return (
    <>
      <header className="top-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">←</button>
        <h1 className="h2">💬 Support</h1>
      </header>

      <Screen>
        <div className="section-title" style={{ marginTop: 4 }}><h2 className="h2">Quick answers</h2></div>
        <div className="card">
          {FAQS.map((faq, i) => (
            <div key={faq.q} style={{ borderBottom: i < FAQS.length - 1 ? '1px solid var(--line)' : 'none' }}>
              <button
                type="button"
                className="meal-row"
                style={{ marginTop: 0, width: '100%', background: 'none', border: 'none', padding: '12px 0', cursor: 'pointer', font: 'inherit', textAlign: 'left' }}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <b style={{ fontSize: 13.5 }}>{faq.q}</b>
                <span className="muted">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && <p className="muted" style={{ margin: '0 0 12px', fontSize: 13 }}>{faq.a}</p>}
            </div>
          ))}
        </div>

        <div className="section-title"><h2 className="h2">Raise a ticket</h2></div>
        <form className="card" onSubmit={submit}>
          <div className="field">
            <label>Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="ORDER">Order</option>
              <option value="DELIVERY">Delivery</option>
              <option value="PAYMENT">Payment</option>
              <option value="FOOD">Food quality</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="field">
            <label>Subject</label>
            <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Short summary" />
          </div>
          <div className="field">
            <label>Describe the issue</label>
            <textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us what happened…" />
          </div>
          <button className="btn btn-primary" type="submit">{sent ? '✅ Ticket created!' : 'Submit ticket'}</button>
        </form>

        {state.tickets.length > 0 && (
          <>
            <div className="section-title"><h2 className="h2">Your tickets</h2></div>
            {state.tickets.map((t) => (
              <div key={t.id} className="card">
                <div className="meal-row" style={{ marginTop: 0 }}>
                  <b style={{ fontSize: 14 }}>{t.subject}</b>
                  <span className={`badge ${t.status === 'OPEN' ? 'badge-amber' : t.status === 'RESOLVED' ? 'badge-veg' : 'badge-cuisine'}`}>
                    {t.status}
                  </span>
                </div>
                <p className="tiny" style={{ margin: '4px 0 0' }}>{t.id} • {t.category}</p>
              </div>
            ))}
          </>
        )}
      </Screen>
    </>
  )
}
