// Daily Menu: browse today's, tomorrow's and upcoming menus.
// Meals always match the saved cuisine + veg/non-veg preference.

import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { getDayMenu, upcomingDates } from '../services/menuService'
import { MEAL_ICONS, MEAL_LABELS } from '../data/foodItems'
import MealCard from '../components/MealCard'
import TabBar from '../components/TabBar'
import { formatDateLong, formatDateShort, todayString } from '../utils/date'

export default function DailyMenu() {
  const { state } = useApp()
  const dates = useMemo(() => upcomingDates(7), [])
  const [selectedDate, setSelectedDate] = useState(todayString())

  const menu = useMemo(
    () => getDayMenu(state.preferences, selectedDate, state.unavailableFoodIds),
    [state.preferences, selectedDate, state.unavailableFoodIds]
  )

  return (
    <>
      <header className="top-header">
        <div>
          <h1 className="h2">🍽️ Daily Menu</h1>
          <p className="tiny" style={{ marginTop: 2 }}>
            Personalised • {state.preferences.foodType === 'VEG' ? '🟢 Veg' : '🔴 Non-Veg'}
          </p>
        </div>
      </header>

      <div className="page" style={{ paddingTop: 8 }}>
        {/* Date tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {dates.map((date, index) => (
            <button
              key={date}
              type="button"
              onClick={() => setSelectedDate(date)}
              className="pref-option"
              style={{
                minWidth: 86,
                padding: '10px 12px',
                ...(date === selectedDate
                  ? { borderColor: 'var(--green)', background: 'var(--green-soft)', color: 'var(--green-dark)' }
                  : {})
              }}
            >
              {index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : formatDateShort(date)}
            </button>
          ))}
        </div>

        <p className="muted" style={{ margin: '14px 0 12px' }}>
          📅 {formatDateLong(selectedDate)}
        </p>

        {menu.meals.map(({ mealType, item }) => (
          <MealCard
            key={mealType}
            mealType={mealType}
            label={MEAL_LABELS[mealType]}
            icon={MEAL_ICONS[mealType]}
            item={item}
          />
        ))}
      </div>
      <TabBar />
    </>
  )
}
