// =====================================================================
// SUBSCRIPTION PLANS (demo data — admin will manage these in Stage 2+)
// =====================================================================
// Every plan includes breakfast, lunch and dinner. The customer's cuisine
// and veg/non-veg choice are applied to whichever plan they buy.

export const PLANS = [
  {
    id: 'starter-15',
    name: 'Starter Plan',
    tagline: 'Try FreshBowl for two weeks',
    durationDays: 15,
    price: 5999,
    mealsPerDay: ['BREAKFAST', 'LUNCH', 'DINNER'],
    popular: false,
    features: [
      '15 days × 3 fresh meals',
      'Your chosen cuisine (North or South)',
      'Veg or Non-Veg, always respected',
      'Free daily doorstep delivery',
      'Pause anytime (up to 5 days)',
      'Skip a meal before 9 PM the night before'
    ],
    terms:
      'Plan starts the day after successful payment. Meals are delivered for 15 consecutive days excluding paused days. Pauses are limited to 5 days per plan. Meals can be skipped until 9 PM the previous night.'
  },
  {
    id: 'monthly-30',
    name: '30 Day Healthy Plan',
    tagline: 'Our most popular plan',
    durationDays: 30,
    price: 9999,
    mealsPerDay: ['BREAKFAST', 'LUNCH', 'DINNER'],
    popular: true,
    features: [
      '30 days × 3 fresh meals',
      'Your chosen cuisine (North or South)',
      'Veg or Non-Veg, always respected',
      'Free daily doorstep delivery',
      'Pause anytime (up to 10 days)',
      'Skip a meal before 9 PM the night before',
      'Weekly nutrition summary'
    ],
    terms:
      'Plan starts the day after successful payment. Meals are delivered for 30 consecutive days excluding paused days. Pauses are limited to 10 days per plan. Meals can be skipped until 9 PM the previous night.'
  },
  {
    id: 'family-30',
    name: 'Family Plan (2 People)',
    tagline: 'Healthy meals for two',
    durationDays: 30,
    price: 17999,
    mealsPerDay: ['BREAKFAST', 'LUNCH', 'DINNER'],
    popular: false,
    features: [
      '30 days × 3 meals × 2 people',
      'One shared cuisine preference',
      'Veg or Non-Veg, always respected',
      'Free daily doorstep delivery',
      'Pause anytime (up to 10 days)',
      'Priority kitchen packing'
    ],
    terms:
      'Plan feeds two people. Starts the day after successful payment. Pauses are limited to 10 days per plan. Meals can be skipped until 9 PM the previous night.'
  },
  {
    id: 'premium-60',
    name: 'Premium 60 Day Plan',
    tagline: 'Best value for long-term health',
    durationDays: 60,
    price: 17999,
    mealsPerDay: ['BREAKFAST', 'LUNCH', 'DINNER'],
    popular: false,
    features: [
      '60 days × 3 fresh meals',
      'Your chosen cuisine (North or South)',
      'Veg or Non-Veg, always respected',
      'Free daily doorstep delivery',
      'Pause anytime (up to 20 days)',
      'Skip a meal before 9 PM the night before',
      'Weekly nutrition summary',
      'Priority customer support'
    ],
    terms:
      'Plan starts the day after successful payment. Meals are delivered for 60 consecutive days excluding paused days. Pauses are limited to 20 days per plan. Meals can be skipped until 9 PM the previous night.'
  }
]
