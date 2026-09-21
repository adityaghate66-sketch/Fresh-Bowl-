// Addresses: save multiple delivery addresses, pick a default one,
// edit or remove them. In Stage 1 this is local-only (no server yet).

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Screen from '../components/Screen'

const EMPTY_FORM = { label: 'Home', line: '', city: '', pincode: '', phone: '' }

export default function Addresses() {
  const navigate = useNavigate()
  const { state, addAddress, updateAddress, deleteAddress, setDefaultAddress } = useApp()
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(state.addresses.length === 0)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')

  function startEdit(address) {
    setEditingId(address.id)
    setForm({ label: address.label, line: address.line, city: address.city, pincode: address.pincode, phone: address.phone || '' })
    setShowForm(true)
    window.scrollTo(0, 0)
  }

  function save() {
    if (!form.line.trim()) return setError('Please enter the full address.')
    if (form.pincode && form.pincode.length !== 6) return setError('Pincode must be 6 digits.')
    if (editingId) updateAddress(editingId, form)
    else addAddress(form)
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(false)
    setError('')
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError('Your browser does not support location.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setForm((f) => ({
          ...f,
          line: f.line || `GPS location (lat ${latitude.toFixed(4)}, lng ${longitude.toFixed(4)}) — edit with flat/street details`,
          city: f.city || 'Bengaluru'
        }))
        setLocating(false)
      },
      () => {
        setError('Could not get location permission.')
        setLocating(false)
      },
      { timeout: 8000 }
    )
  }

  return (
    <>
      <header className="top-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">←</button>
        <h1 className="h2">📍 Delivery Addresses</h1>
      </header>

      <Screen>
        {state.addresses.map((address) => (
          <div key={address.id} className="address-card">
            <div className="meal-row" style={{ marginTop: 0 }}>
              <h3 style={{ fontSize: 16 }}>
                {address.label === 'Home' ? '🏠' : address.label === 'Work' ? '🏢' : '📌'} {address.label}
                {address.isDefault && <span className="badge badge-veg" style={{ marginLeft: 8 }}>DEFAULT</span>}
              </h3>
            </div>
            <p className="muted" style={{ margin: '6px 0 0', lineHeight: 1.5 }}>
              {address.line}
              {address.city ? `, ${address.city}` : ''}
              {address.pincode ? ` - ${address.pincode}` : ''}
            </p>
            {address.phone && <p className="tiny" style={{ marginTop: 4 }}>📞 {address.phone}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {!address.isDefault && (
                <button className="btn btn-ghost" style={{ flex: 1, minHeight: 44 }} onClick={() => setDefaultAddress(address.id)}>
                  Set default
                </button>
              )}
              <button className="btn btn-ghost" style={{ flex: 1, minHeight: 44 }} onClick={() => startEdit(address)}>
                ✏️ Edit
              </button>
              <button
                className="btn btn-danger"
                style={{ flex: 1, minHeight: 44 }}
                onClick={() => {
                  if (window.confirm('Delete this address?')) deleteAddress(address.id)
                }}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}

        {!showForm && (
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM) }}>
            + Add new address
          </button>
        )}

        {showForm && (
          <div className="card" style={{ marginTop: 12 }}>
            <h3 className="h2" style={{ marginBottom: 12 }}>
              {editingId ? 'Edit address' : 'New address'}
            </h3>
            <button type="button" className="btn btn-ghost" style={{ marginBottom: 14 }} onClick={useCurrentLocation} disabled={locating}>
              {locating ? '📍 Finding you…' : '📍 Use my current location'}
            </button>
            <div className="field">
              <label>Save as</label>
              <select value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}>
                <option>Home</option>
                <option>Work</option>
                <option>Other</option>
              </select>
            </div>
            <div className="field">
              <label>Full address *</label>
              <textarea rows={3} value={form.line} onChange={(e) => setForm({ ...form, line: e.target.value })} placeholder="Flat / House no, Street, Landmark" />
            </div>
            <div className="field">
              <label>City</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="field">
              <label>Pincode</label>
              <input value={form.pincode} inputMode="numeric" maxLength={6} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '') })} />
            </div>
            <div className="field">
              <label>Phone (for delivery calls)</label>
              <input value={form.phone} inputMode="tel" maxLength={10} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} />
            </div>
            {error && <p className="banner red" style={{ marginBottom: 12 }}>⚠️ {error}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setShowForm(false); setEditingId(null); setError('') }}>
                Cancel
              </button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={save}>
                Save address
              </button>
            </div>
          </div>
        )}
      </Screen>
    </>
  )
}
