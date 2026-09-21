// App: decides which screen to show based on the web address.
// Guards:
//   - nobody reaches customer screens before onboarding
//   - staff dashboards require the right role (kitchen / delivery / admin)

import { Routes, Route, Navigate } from 'react-router-dom'
import { useApp } from './context/AppContext'
import Toaster from './components/Toaster'

import SplashScreen from './screens/SplashScreen'
import Onboarding from './screens/Onboarding'
import Login from './screens/Login'
import Home from './screens/Home'
import DailyMenu from './screens/DailyMenu'
import Plans from './screens/Plans'
import PlanDetails from './screens/PlanDetails'
import Checkout from './screens/Checkout'
import Confirmation from './screens/Confirmation'
import Addresses from './screens/Addresses'
import Profile from './screens/Profile'
import Notifications from './screens/Notifications'
import Orders from './screens/Orders'
import MySubscription from './screens/MySubscription'
import Support from './screens/Support'

import KitchenDashboard from './screens/KitchenDashboard'
import DeliveryApp from './screens/DeliveryApp'
import AdminDashboard from './screens/AdminDashboard'

function RequireOnboarded({ children }) {
  const { state } = useApp()
  if (!state.onboarded) return <Navigate to="/onboarding" replace />
  return children
}

function RequireRole({ role, children }) {
  const { currentUser } = useApp()
  if (!currentUser || currentUser.role !== role) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { state } = useApp()

  return (
    <div className="app-shell">
      <Toaster />
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route
          path="/onboarding"
          element={state.onboarded ? <Navigate to="/home" replace /> : <Onboarding />}
        />
        <Route path="/login" element={<Login />} />

        {/* ---------- Customer app ---------- */}
        <Route path="/home" element={<RequireOnboarded><Home /></RequireOnboarded>} />
        <Route path="/menu" element={<RequireOnboarded><DailyMenu /></RequireOnboarded>} />
        <Route path="/plans" element={<RequireOnboarded><Plans /></RequireOnboarded>} />
        <Route path="/plans/:planId" element={<RequireOnboarded><PlanDetails /></RequireOnboarded>} />
        <Route path="/checkout/:planId" element={<RequireOnboarded><Checkout /></RequireOnboarded>} />
        <Route path="/confirmation" element={<RequireOnboarded><Confirmation /></RequireOnboarded>} />
        <Route path="/addresses" element={<RequireOnboarded><Addresses /></RequireOnboarded>} />
        <Route path="/notifications" element={<RequireOnboarded><Notifications /></RequireOnboarded>} />
        <Route path="/profile" element={<RequireOnboarded><Profile /></RequireOnboarded>} />
        <Route path="/orders" element={<RequireOnboarded><Orders /></RequireOnboarded>} />
        <Route path="/subscription" element={<RequireOnboarded><MySubscription /></RequireOnboarded>} />
        <Route path="/support" element={<RequireOnboarded><Support /></RequireOnboarded>} />

        {/* ---------- Staff apps (role-locked) ---------- */}
        <Route path="/kitchen" element={<RequireRole role="KITCHEN"><KitchenDashboard /></RequireRole>} />
        <Route path="/delivery" element={<RequireRole role="DELIVERY"><DeliveryApp /></RequireRole>} />
        <Route path="/admin" element={<RequireRole role="ADMIN"><AdminDashboard /></RequireRole>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
