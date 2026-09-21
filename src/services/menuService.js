// =====================================================================
// MENU ENGINE
// =====================================================================
// This is the heart of Stage 1. It answers one question:
//
//     "What should THIS customer eat for breakfast / lunch / dinner
//      on THIS date, given their cuisine and veg/non-veg choice?"
//
// Business rules enforced here (backend will re-enforce them in Stage 2+):
//   1. cuisine must match          (NORTH_INDIAN or SOUTH_INDIAN)
//   2. VEG customer  -> only VEG dishes. NEVER a NON_VEG dish.
//   3. NON_VEG customer -> NON_VEG dishes + business-approved VEG dishes.
//   4. The menu changes from day to day (rotation based on the date),
//      so today, tomorrow and the day after are all different.
//   5. Dishes the admin marks "sold out" never appear.
//
// The rotation is "deterministic": the same customer + same date always
// gets the same meals. It is not random, so kitchen and delivery can
// later rely on it.

import { FOOD_ITEMS, MEAL_TYPES } from '../data/foodItems'
import { todayString, daysBetween } from '../utils/date'

/** A stable number that changes once per day (and per year). */
function dayNumber(dateString) {
  const date = new Date(`${dateString}T00:00:00`)
  const startOfYear = new Date(date.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((date - startOfYear) / 86400000)
  return date.getFullYear() * 400 + dayOfYear
}

/**
 * All dishes that a customer with these preferences is ALLOWED to eat,
 * for a given meal type. `unavailableFoodIds` are dishes the admin has
 * temporarily marked as sold out — they are removed from every list.
 */
export function eligibleMeals(preferences, mealType, unavailableFoodIds = []) {
  return FOOD_ITEMS.filter(
    (item) =>
      item.cuisine === preferences.cuisine &&
      item.mealType === mealType &&
      !unavailableFoodIds.includes(item.id) &&
      // HARD RULE: veg customers never see non-veg food.
      (item.foodType === preferences.foodType ||
        (preferences.foodType === 'NON_VEG' && item.approvedForNonVeg))
  )
}

/** Pick one dish from the eligible pool for a specific date + meal type. */
export function pickMealForDate(preferences, mealType, dateString, unavailableFoodIds = []) {
  const pool = eligibleMeals(preferences, mealType, unavailableFoodIds)
  if (pool.length === 0) return null
  const mealSlot = MEAL_TYPES.indexOf(mealType)
  const seed = dayNumber(dateString) * 7 + mealSlot * 13
  return pool[seed % pool.length]
}

/** Full day menu for a customer: breakfast + lunch + dinner. */
export function getDayMenu(preferences, dateString = todayString(), unavailableFoodIds = []) {
  return {
    date: dateString,
    meals: MEAL_TYPES.map((mealType) => ({
      mealType,
      item: pickMealForDate(preferences, mealType, dateString, unavailableFoodIds)
    }))
  }
}

/** Nutrition totals across the whole day (used on plan details). */
export function getDayNutrition(preferences, dateString = todayString(), unavailableFoodIds = []) {
  const menu = getDayMenu(preferences, dateString, unavailableFoodIds)
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  for (const { item } of menu.meals) {
    if (!item) continue
    totals.calories += item.nutrition.calories
    totals.protein += item.nutrition.protein
    totals.carbs += item.nutrition.carbs
    totals.fat += item.nutrition.fat
    totals.fiber += item.nutrition.fiber
  }
  return totals
}

/** How many days from today an upcoming menu can be previewed. */
export function menuPreviewDays() {
  return 7
}

/** Small helper used by screens to build a list of upcoming dates. */
export function upcomingDates(count) {
  const dates = []
  const today = todayString()
  for (let i = 0; i < count; i += 1) {
    const d = new Date(`${today}T00:00:00`)
    d.setDate(d.getDate() + i)
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  return dates
}

export { todayString, daysBetween }
