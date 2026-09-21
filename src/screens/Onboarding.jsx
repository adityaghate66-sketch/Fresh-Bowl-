// =====================================================================
// ONBOARDING — 4 quick steps before the customer sees the app:
//   1. Food preference (Veg / Non-Veg)   <- core business choice
//   2. Cuisine (North Indian / South Indian) <- core business choice
//   3. Delivery location
//   4. Personalised preview of "Your Food Plan"
// =====================================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { getDayMenu } from '../services/menuService'
import { MEAL_ICONS, MEAL_LABELS } from '../data/foodItems'
import MealCard from '../components/MealCard'
import { CUISINE_LABELS, FOOD_TYPE_LABELS } from '../utils/format'
import { todayString } from '../utils/date'

const HERO_EMOJI = ['🍽️', '🇮🇳', '📍', '🎁']
const HERO_BG = ['green', 'orange', 'blue', 'violet']

const STEP_TITLES = [
  { title: 'What do you eat?', subtitle: 'We will never show you food outside this choice.' },
  { title: 'Pick your cuisine', subtitle: 'Authentic recipes from your favourite region.' },
  { title: 'Where do we deliver?', subtitle: 'Your fresh meals arrive here every day.' },
  { title: 'Your Food Plan', subtitle: 'A live preview based on your choices.' }
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { completeOnboarding, addAddress } = useApp()

  const [step, setStep] = useState(0)
  const [foodType, setFoodType] = useState(null)
  const [cuisine, setCuisine] = useState(null)
  const [address, setAddress] = useState({ label: 'Home', line: '', city: '', pincode: '', phone: '' })
  const [locating, setLocating] = useState(false)
  const [locationNote, setLocationNote] = useState('')
  const [error, setError] = useState('')

  const preferences = { foodType: foodType || 'VEG', cuisine: cuisine || 'SOUTH_INDIAN' }
  const previewMenu = getDayMenu(preferences, todayString())

  function next() {
    setError('')
    if (step === 0 && !foodType) return setError('Please choose Veg or Non-Veg to continue.')
    if (step === 1 && !cuisine) return setError('Please choose a cuisine to continue.')
    if (step === 2) {
      if (!address.line.trim()) return setError('Please enter your delivery address (or use current location).')
      addAddress(address)
    }
    if (step === 3) {
      completeOnboarding({
        preferences: { foodType, cuisine },
        profile: { name: 'Guest', phone: address.phone }
      })
      return navigate('/home', { replace: true })
    }
    setStep((s) => s + 1)
  }

  function back() {
    setError('')
    setStep((s) => Math.max(0, s - 1))
  }

  // "Use my current location" — the phone/browser reports GPS coordinates.
  // A full map picker comes in a later stage (needs a maps provider key).
  function useCurrentLocation() {
    setError('')
    if (!navigator.geolocation) {
      setLocationNote('Your browser does not support location. Please type your address.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setAddress((a) => ({
          ...a,
          line: `GPS location (lat ${latitude.toFixed(4)}, lng ${longitude.toFixed(4)}) — please edit with your flat / street details`,
          city: a.city || 'Bengaluru'
        }))
        setLocationNote('📍 Location captured! Please add your flat/street and pincode.')
        setLocating(false)
      },
      () => {
        setLocationNote('Could not get location permission. Please type your address.')
        setLocating(false)
      },
      { timeout: 8000 }
    )
  }

  const stepInfo = STEP_TITLES[step]

  return (
    <div className="page">
      <div
        className={`onboard-hero ${HERO_BG[step]}`}
        style={{ margin: '-14px -16px 0', height: '30dvh', minHeight: 190 }}
      >
        <span className="float" style={{ fontSize: 56 }}>{HERO_EMOJI[step]}</span>
        <span className="badge" style={{ background: 'rgba(255,255,255,0.22)', color: '#fff' }}>
          STEP {step + 1} OF 4
        </span>
      </div>
      <div className="onboard-dots">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i === step ? 'on' : ''} />
        ))}
      </div>

      <h1 className="h1">{stepInfo.title}</h1>
      <p className="muted" style={{ marginTop: 6 }}>{stepInfo.subtitle}</p>

      {/* ---------- STEP 1: Food preference ---------- */}
      {step === 0 && (
        <div className="big-choice">
          <button
            type="button"
            className={`veg ${foodType === 'VEG' ? 'active' : ''}`}
            onClick={() => setFoodType('VEG')}
          >
            <span className="big-emoji">🟢</span> VEG
          </button>
          <button
            type="button"
            className={`nonveg ${foodType === 'NON_VEG' ? 'active' : ''}`}
            onClick={() => setFoodType('NON_VEG')}
          >
            <span className="big-emoji">🔴</span> NON-VEG
          </button>
        </div>
      )}

      {/* ---------- STEP 2: Cuisine ---------- */}
      {step === 1 && (
        <div className="big-choice">
          <button
            type="button"
            className={`north ${cuisine === 'NORTH_INDIAN' ? 'active' : ''}`}
            onClick={() => setCuisine('NORTH_INDIAN')}
          >
            <span className="big-emoji">🇮🇳</span> North Indian
            <span className="tiny">Roti • Paneer • Rajma</span>
          </button>
          <button
            type="button"
            className={`south ${cuisine === 'SOUTH_INDIAN' ? 'active' : ''}`}
            onClick={() => setCuisine('SOUTH_INDIAN')}
          >
            <span className="big-emoji">🌴</span> South Indian
            <span className="tiny">Idli • Dosa • Sambar</span>
          </button>
        </div>
      )}

      {/* ---------- STEP 3: Location ---------- */}
      {step === 2 && (
        <div className="card" style={{ marginTop: 14 }}>
          <button type="button" className="btn btn-ghost" style={{ marginBottom: 16 }} onClick={useCurrentLocation} disabled={locating}>
            {locating ? '📍 Finding you…' : '📍 Use my current location'}
          </button>
          {locationNote && <p className="banner blue" style={{ marginBottom: 14 }}>{locationNote}</p>}

          <div className="field">
            <label>Save as</label>
            <select value={address.label} onChange={(e) => setAddress({ ...address, label: e.target.value })}>
              <option>Home</option>
              <option>Work</option>
              <option>Other</option>
            </select>
          </div>
          <div className="field">
            <label>Full address *</label>
            <textarea
              rows={3}
              placeholder="Flat / House no, Street, Landmark"
              value={address.line}
              onChange={(e) => setAddress({ ...address, line: e.target.value })}
            />
          </div>
          <div className="field">
            <label>City</label>
            <input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} placeholder="e.g. Bengaluru" />
          </div>
          <div className="field">
            <label>Pincode</label>
            <input
              value={address.pincode}
              inputMode="numeric"
              maxLength={6}
              onChange={(e) => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, '') })}
              placeholder="6 digits"
            />
          </div>
          <div className="field">
            <label>Phone (for delivery calls)</label>
            <input value={address.phone} inputMode="tel" maxLength={10} onChange={(e) => setAddress({ ...address, phone: e.target.value.replace(/\D/g, '') })} placeholder="10-digit mobile" />
          </div>
        </div>
      )}

      {/* ---------- STEP 4: Personalised preview ---------- */}
      {step === 3 && (
        <>
          <div className="banner green" style={{ margin: '14px 0' }}>
            <span>✅</span>
            <div>
              <b>{CUISINE_LABELS[cuisine]} • {FOOD_TYPE_LABELS[foodType]}</b>
              <div className="tiny" style={{ color: 'inherit', marginTop: 2 }}>
                This is your personal plan. Meals below are picked fresh for you.
              </div>
            </div>
          </div>
          {previewMenu.meals.map(({ mealType, item }) => (
            <MealCard key={mealType} mealType={mealType} label={MEAL_LABELS[mealType]} icon={MEAL_ICONS[mealType]} item={item} />
          ))}
        </>
      )}

      {error && (
        <p className="banner red" style={{ marginTop: 12 }}>
          ⚠️ {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        {step > 0 && (
          <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={back}>
            ← Back
          </button>
        )}
        <button type="button" className="btn btn-primary" style={{ flex: 2 }} onClick={next}>
          {step === 3 ? 'Start eating healthy 🚀' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}
