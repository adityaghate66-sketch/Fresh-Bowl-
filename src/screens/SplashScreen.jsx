// Splash: the short branded opening screen. After ~2 seconds it sends
// staff to their dashboard, new users to onboarding, customers to Home.

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { ROLE_HOME } from '../services/engine'

export default function SplashScreen() {
  const navigate = useNavigate()
  const { state, currentUser } = useApp()

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentUser && currentUser.role !== 'CUSTOMER') {
        navigate(ROLE_HOME[currentUser.role], { replace: true })
      } else {
        navigate(state.onboarded ? '/home' : '/onboarding', { replace: true })
      }
    }, 2200)
    return () => clearTimeout(timer)
  }, [navigate, state.onboarded, currentUser])

  return (
    <div className="splash">
      <div className="splash-logo">🥗</div>
      <h1 style={{ fontSize: 36, letterSpacing: '-0.5px' }}>FreshBowl</h1>
      <p style={{ margin: 0, opacity: 0.9 }}>Healthy meals. Every day. Delivered to you.</p>
      <div className="splash-bar"><span /></div>
      <p className="tiny" style={{ color: 'rgba(255,255,255,0.75)', marginTop: 18 }}>
        Fresh • Hygienic • Nutritious
      </p>
    </div>
  )
}
