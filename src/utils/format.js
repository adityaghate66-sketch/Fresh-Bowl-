// ---------- Formatting helpers ----------

/** 1899 -> "₹1,899" (Indian number format). */
export function formatINR(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`
}

/** Convert internal codes into readable labels. */
export const CUISINE_LABELS = {
  NORTH_INDIAN: 'North Indian',
  SOUTH_INDIAN: 'South Indian'
}

export const FOOD_TYPE_LABELS = {
  VEG: 'Veg',
  NON_VEG: 'Non-Veg'
}
