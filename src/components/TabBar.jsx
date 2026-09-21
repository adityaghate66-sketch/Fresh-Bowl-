// TabBar: floating glass navigation for customer screens.

import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/home', icon: '🏠', label: 'Home' },
  { to: '/menu', icon: '🍽️', label: 'Menu' },
  { to: '/orders', icon: '📦', label: 'Orders' },
  { to: '/plans', icon: '⭐', label: 'Plans' },
  { to: '/profile', icon: '👤', label: 'Profile' }
]

export default function TabBar() {
  return (
    <nav className="tabbar">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}
        >
          <span className="tab-icon">{tab.icon}</span>
          {tab.label}
          <span className="tab-underline" />
        </NavLink>
      ))}
    </nav>
  )
}
