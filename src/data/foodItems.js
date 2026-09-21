// =====================================================================
// FOOD DATABASE (demo data — in Stage 2 this moves into a real database)
// =====================================================================
// Every single dish has two business attributes that the WHOLE system obeys:
//
//   cuisine  : 'NORTH_INDIAN' | 'SOUTH_INDIAN'
//   foodType : 'VEG' | 'NON_VEG'
//
// HARD BUSINESS RULE:
//   - A VEG customer must NEVER be shown (or served) a NON_VEG dish.
//   - A NON_VEG customer may be shown NON_VEG dishes PLUS veg dishes that
//     are business-approved for them (approvedForNonVeg: true).
//
// mealType : 'BREAKFAST' | 'LUNCH' | 'DINNER'

export const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER']

export const MEAL_LABELS = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner'
}

export const MEAL_ICONS = {
  BREAKFAST: '🌅',
  LUNCH: '☀️',
  DINNER: '🌙'
}

const food = (data) => ({
  approvedForNonVeg: false,
  ...data
})

export const FOOD_ITEMS = [
  // ---------------------------------------------------------------
  // NORTH INDIAN — VEG
  // ---------------------------------------------------------------
  food({
    id: 'n-veg-b1',
    name: 'Aloo Paratha with Curd',
    emoji: '🫓',
    cuisine: 'NORTH_INDIAN',
    foodType: 'VEG',
    mealType: 'BREAKFAST',
    description:
      'Whole-wheat flatbread stuffed with spiced potato, cooked on a tawa with minimal ghee. Served with fresh curd and homemade mango pickle.',
    ingredients: ['Wheat flour', 'Potato', 'Onion', 'Cumin', 'Coriander', 'Ghee', 'Curd', 'Mango pickle'],
    nutrition: { calories: 480, protein: 14, carbs: 68, fat: 15, fiber: 8 },
    allergens: ['Gluten', 'Dairy'],
    rating: 4.6
  }),
  food({
    id: 'n-veg-b2',
    name: 'Vegetable Poha',
    emoji: '🍚',
    cuisine: 'NORTH_INDIAN',
    foodType: 'VEG',
    mealType: 'BREAKFAST',
    description:
      'Light flattened-rice breakfast tossed with onion, peas, curry leaves and lemon. Easy to digest and full of iron.',
    ingredients: ['Flattened rice', 'Onion', 'Green peas', 'Peanuts', 'Curry leaves', 'Lemon', 'Turmeric'],
    nutrition: { calories: 350, protein: 9, carbs: 60, fat: 8, fiber: 6 },
    allergens: ['Peanuts'],
    rating: 4.4
  }),
  food({
    id: 'n-veg-b3',
    name: 'Besan Chilla with Mint Chutney',
    emoji: '🥞',
    cuisine: 'NORTH_INDIAN',
    foodType: 'VEG',
    mealType: 'BREAKFAST',
    description:
      'Savoury gram-flour pancakes loaded with grated vegetables, served with a fresh mint-coriander chutney. High in plant protein.',
    ingredients: ['Gram flour', 'Tomato', 'Onion', 'Capsicum', 'Ginger', 'Mint', 'Coriander'],
    nutrition: { calories: 320, protein: 16, carbs: 42, fat: 9, fiber: 9 },
    allergens: [],
    rating: 4.5
  }),
  food({
    id: 'n-veg-l1',
    name: 'Rajma Chawal',
    emoji: '🍛',
    cuisine: 'NORTH_INDIAN',
    foodType: 'VEG',
    mealType: 'LUNCH',
    description:
      'Slow-cooked kidney beans in a tomato-onion gravy, served with steamed basmati rice. Comfort food with protein and fibre.',
    ingredients: ['Kidney beans', 'Basmati rice', 'Tomato', 'Onion', 'Ginger-garlic', 'Garam masala'],
    nutrition: { calories: 540, protein: 19, carbs: 88, fat: 10, fiber: 14 },
    allergens: [],
    rating: 4.8
  }),
  food({
    id: 'n-veg-l2',
    name: 'Chole with Brown Rice',
    emoji: '🥘',
    cuisine: 'NORTH_INDIAN',
    foodType: 'VEG',
    mealType: 'LUNCH',
    description:
      'Punjabi chickpea curry with brown rice and a side of onion salad. High fibre, low GI — keeps you full for hours.',
    ingredients: ['Chickpeas', 'Brown rice', 'Tomato', 'Tea leaf infusion', 'Anardana', 'Onion salad'],
    nutrition: { calories: 520, protein: 20, carbs: 82, fat: 9, fiber: 16 },
    allergens: [],
    rating: 4.7
  }),
  food({
    id: 'n-veg-l3',
    name: 'Paneer Butter Masala with Roti',
    emoji: '🧀',
    cuisine: 'NORTH_INDIAN',
    foodType: 'VEG',
    mealType: 'LUNCH',
    approvedForNonVeg: true,
    description:
      'Cottage cheese cubes in a creamy tomato-cashew gravy with two tandoori-style whole-wheat rotis. A restaurant favourite, made lighter.',
    ingredients: ['Paneer', 'Tomato', 'Cashew', 'Butter', 'Kasuri methi', 'Wheat roti'],
    nutrition: { calories: 610, protein: 24, carbs: 58, fat: 28, fiber: 7 },
    allergens: ['Dairy', 'Nuts', 'Gluten'],
    rating: 4.9
  }),
  food({
    id: 'n-veg-d1',
    name: 'Palak Paneer with Chapati',
    emoji: '🥬',
    cuisine: 'NORTH_INDIAN',
    foodType: 'VEG',
    mealType: 'DINNER',
    description:
      'Iron-rich spinach gravy with soft paneer cubes and two soft chapatis. A light yet protein-packed dinner.',
    ingredients: ['Spinach', 'Paneer', 'Garlic', 'Green chilli', 'Cream', 'Wheat chapati'],
    nutrition: { calories: 480, protein: 21, carbs: 44, fat: 22, fiber: 9 },
    allergens: ['Dairy', 'Gluten'],
    rating: 4.7
  }),
  food({
    id: 'n-veg-d2',
    name: 'Dal Makhani with Jeera Rice',
    emoji: '🍲',
    cuisine: 'NORTH_INDIAN',
    foodType: 'VEG',
    mealType: 'DINNER',
    description:
      'Overnight-simmered black lentils finished with a touch of cream, served with cumin-tempered rice.',
    ingredients: ['Black urad dal', 'Rajma', 'Butter', 'Cream', 'Cumin', 'Basmati rice'],
    nutrition: { calories: 560, protein: 20, carbs: 72, fat: 18, fiber: 12 },
    allergens: ['Dairy'],
    rating: 4.8
  }),
  food({
    id: 'n-veg-d3',
    name: 'Mixed Veg Sabzi with Roti & Salad',
    emoji: '🥗',
    cuisine: 'NORTH_INDIAN',
    foodType: 'VEG',
    mealType: 'DINNER',
    description:
      'Seasonal vegetables in a homestyle masala with two rotis, cucumber salad and lemon. Simple, balanced, everyday healthy.',
    ingredients: ['Cauliflower', 'Carrot', 'Beans', 'Peas', 'Potato', 'Wheat roti', 'Cucumber salad'],
    nutrition: { calories: 420, protein: 13, carbs: 62, fat: 11, fiber: 12 },
    allergens: ['Gluten'],
    rating: 4.3
  }),

  // ---------------------------------------------------------------
  // NORTH INDIAN — NON-VEG
  // ---------------------------------------------------------------
  food({
    id: 'n-nveg-b1',
    name: 'Egg Bhurji with Butter Toast',
    emoji: '🍳',
    cuisine: 'NORTH_INDIAN',
    foodType: 'NON_VEG',
    mealType: 'BREAKFAST',
    description:
      'Punjabi-style scrambled eggs with onion, tomato and green chilli, served with whole-wheat butter toast.',
    ingredients: ['Eggs', 'Onion', 'Tomato', 'Green chilli', 'Butter toast', 'Coriander'],
    nutrition: { calories: 430, protein: 22, carbs: 34, fat: 22, fiber: 4 },
    allergens: ['Egg', 'Gluten', 'Dairy'],
    rating: 4.6
  }),
  food({
    id: 'n-nveg-b2',
    name: 'Mutton Keema Paratha',
    emoji: '🥟',
    cuisine: 'NORTH_INDIAN',
    foodType: 'NON_VEG',
    mealType: 'BREAKFAST',
    description:
      'Whole-wheat paratha stuffed with spiced minced mutton, served with mint chutney and sliced onions.',
    ingredients: ['Minced mutton', 'Wheat flour', 'Onion', 'Garam masala', 'Mint chutney'],
    nutrition: { calories: 560, protein: 28, carbs: 48, fat: 26, fiber: 5 },
    allergens: ['Gluten'],
    rating: 4.7
  }),
  food({
    id: 'n-nveg-b3',
    name: 'Chicken Keema Pao',
    emoji: '🥖',
    cuisine: 'NORTH_INDIAN',
    foodType: 'NON_VEG',
    mealType: 'BREAKFAST',
    description:
      'Protein-rich minced chicken cooked with peas and spices, paired with soft pao and lemon wedge.',
    ingredients: ['Minced chicken', 'Green peas', 'Pao', 'Tomato', 'Lemon', 'Spices'],
    nutrition: { calories: 470, protein: 30, carbs: 40, fat: 18, fiber: 4 },
    allergens: ['Gluten'],
    rating: 4.5
  }),
  food({
    id: 'n-nveg-l1',
    name: 'Butter Chicken with Naan',
    emoji: '🍗',
    cuisine: 'NORTH_INDIAN',
    foodType: 'NON_VEG',
    mealType: 'LUNCH',
    description:
      'Tandoori-style chicken in a silky tomato-butter gravy, served with one butter naan and jeera rice.',
    ingredients: ['Chicken', 'Tomato', 'Butter', 'Cream', 'Naan', 'Jeera rice'],
    nutrition: { calories: 680, protein: 34, carbs: 62, fat: 30, fiber: 5 },
    allergens: ['Dairy', 'Gluten'],
    rating: 4.9
  }),
  food({
    id: 'n-nveg-l2',
    name: 'Chicken Biryani with Raita',
    emoji: '🍛',
    cuisine: 'NORTH_INDIAN',
    foodType: 'NON_VEG',
    mealType: 'LUNCH',
    description:
      'Long-grain basmati rice dum-cooked with marinated chicken, saffron and fried onions. Served with boondi raita.',
    ingredients: ['Chicken', 'Basmati rice', 'Saffron', 'Fried onion', 'Yogurt', 'Biryani masala'],
    nutrition: { calories: 650, protein: 32, carbs: 78, fat: 20, fiber: 6 },
    allergens: ['Dairy'],
    rating: 4.8
  }),
  food({
    id: 'n-nveg-l3',
    name: 'Mutton Curry with Jeera Rice',
    emoji: '🥘',
    cuisine: 'NORTH_INDIAN',
    foodType: 'NON_VEG',
    mealType: 'LUNCH',
    description:
      'Slow-cooked mutton in a robust onion-tomato gravy with cumin rice. Rich in iron and vitamin B12.',
    ingredients: ['Mutton', 'Onion', 'Tomato', 'Yogurt', 'Cumin rice', 'Whole spices'],
    nutrition: { calories: 640, protein: 36, carbs: 58, fat: 26, fiber: 4 },
    allergens: ['Dairy'],
    rating: 4.6
  }),
  food({
    id: 'n-nveg-d1',
    name: 'Tandoori Chicken with Mint Chutney',
    emoji: '🔥',
    cuisine: 'NORTH_INDIAN',
    foodType: 'NON_VEG',
    mealType: 'DINNER',
    description:
      'Clay-oven grilled chicken marinated in yogurt and spices, with mint chutney and a green salad. High protein, low carb.',
    ingredients: ['Chicken', 'Yogurt marinade', 'Tandoori spices', 'Mint chutney', 'Salad'],
    nutrition: { calories: 480, protein: 38, carbs: 18, fat: 24, fiber: 5 },
    allergens: ['Dairy'],
    rating: 4.8
  }),
  food({
    id: 'n-nveg-d2',
    name: 'Chicken Curry with Roti',
    emoji: '🍛',
    cuisine: 'NORTH_INDIAN',
    foodType: 'NON_VEG',
    mealType: 'DINNER',
    description:
      'Homestyle chicken curry with two whole-wheat rotis and kachumber salad. Comforting and balanced.',
    ingredients: ['Chicken', 'Onion', 'Tomato', 'Ginger-garlic', 'Wheat roti', 'Kachumber'],
    nutrition: { calories: 540, protein: 33, carbs: 44, fat: 22, fiber: 6 },
    allergens: ['Gluten'],
    rating: 4.7
  }),
  food({
    id: 'n-nveg-d3',
    name: 'Amritsari Fish Curry with Rice',
    emoji: '🐟',
    cuisine: 'NORTH_INDIAN',
    foodType: 'NON_VEG',
    mealType: 'DINNER',
    description:
      'River fish simmered in a tangy tomato-mustard gravy, served with steamed rice. Omega-3 rich.',
    ingredients: ['Fish', 'Tomato', 'Mustard seeds', 'Rice', 'Fenugreek', 'Lemon'],
    nutrition: { calories: 500, protein: 32, carbs: 52, fat: 16, fiber: 4 },
    allergens: ['Fish'],
    rating: 4.5
  }),

  // ---------------------------------------------------------------
  // SOUTH INDIAN — VEG
  // ---------------------------------------------------------------
  food({
    id: 's-veg-b1',
    name: 'Idli with Sambar & Coconut Chutney',
    emoji: '🍥',
    cuisine: 'SOUTH_INDIAN',
    foodType: 'VEG',
    mealType: 'BREAKFAST',
    description:
      'Three steamed rice-lentil idlis with piping-hot vegetable sambar and fresh coconut chutney. Steamed, light and gut-friendly.',
    ingredients: ['Rice', 'Urad dal', 'Toor dal', 'Mixed vegetables', 'Coconut', 'Curry leaves'],
    nutrition: { calories: 380, protein: 14, carbs: 64, fat: 6, fiber: 7 },
    allergens: [],
    rating: 4.8
  }),
  food({
    id: 's-veg-b2',
    name: 'Masala Dosa',
    emoji: '🥞',
    cuisine: 'SOUTH_INDIAN',
    foodType: 'VEG',
    mealType: 'BREAKFAST',
    description:
      'Golden crisp rice-lentil crepe rolled around spiced potato filling, with sambar and two chutneys.',
    ingredients: ['Rice batter', 'Potato', 'Onion', 'Mustard seeds', 'Sambar', 'Chutney'],
    nutrition: { calories: 420, protein: 10, carbs: 70, fat: 11, fiber: 6 },
    allergens: [],
    rating: 4.9
  }),
  food({
    id: 's-veg-b3',
    name: 'Ven Pongal with Chutney',
    emoji: '🥣',
    cuisine: 'SOUTH_INDIAN',
    foodType: 'VEG',
    mealType: 'BREAKFAST',
    description:
      'Creamy rice and moong dal cooked with black pepper, cumin, ginger and ghee. Gentle on the stomach, warming breakfast.',
    ingredients: ['Rice', 'Moong dal', 'Black pepper', 'Cumin', 'Ghee', 'Ginger', 'Cashew'],
    nutrition: { calories: 400, protein: 12, carbs: 62, fat: 11, fiber: 5 },
    allergens: ['Dairy', 'Nuts'],
    rating: 4.6
  }),
  food({
    id: 's-veg-l1',
    name: 'Sambar Rice with Papad',
    emoji: '🍛',
    cuisine: 'SOUTH_INDIAN',
    foodType: 'VEG',
    mealType: 'LUNCH',
    description:
      'Comforting sambar mixed with steamed rice, drizzled with ghee, served with roasted papad and pickle.',
    ingredients: ['Toor dal', 'Mixed vegetables', 'Rice', 'Ghee', 'Papad', 'Tamarind'],
    nutrition: { calories: 480, protein: 15, carbs: 84, fat: 9, fiber: 10 },
    allergens: [],
    rating: 4.6
  }),
  food({
    id: 's-veg-l2',
    name: 'Vegetable Biryani with Raita',
    emoji: '🍚',
    cuisine: 'SOUTH_INDIAN',
    foodType: 'VEG',
    mealType: 'LUNCH',
    approvedForNonVeg: true,
    description:
      'Seeraga samba rice layered with garden vegetables, mint and whole spices. Served with onion raita.',
    ingredients: ['Seeraga samba rice', 'Vegetables', 'Mint', 'Whole spices', 'Onion raita'],
    nutrition: { calories: 520, protein: 12, carbs: 88, fat: 12, fiber: 8 },
    allergens: ['Dairy'],
    rating: 4.7
  }),
  food({
    id: 's-veg-l3',
    name: 'Lemon Rice with Potato Fry',
    emoji: '🍋',
    cuisine: 'SOUTH_INDIAN',
    foodType: 'VEG',
    mealType: 'LUNCH',
    description:
      'Zesty rice tempered with mustard, chana dal and peanuts, paired with crispy potato roast and papad.',
    ingredients: ['Rice', 'Lemon', 'Peanuts', 'Mustard seeds', 'Potato', 'Curry leaves'],
    nutrition: { calories: 470, protein: 9, carbs: 80, fat: 13, fiber: 7 },
    allergens: ['Peanuts'],
    rating: 4.5
  }),
  food({
    id: 's-veg-d1',
    name: 'Vegetable Kurma with Chapati',
    emoji: '🥘',
    cuisine: 'SOUTH_INDIAN',
    foodType: 'VEG',
    mealType: 'DINNER',
    description:
      'Coconut-based mixed vegetable kurma with two soft chapatis. Mildly spiced, perfect for dinner.',
    ingredients: ['Mixed vegetables', 'Coconut', 'Poppy seeds', 'Chapati', 'Coriander'],
    nutrition: { calories: 450, protein: 12, carbs: 58, fat: 17, fiber: 9 },
    allergens: ['Gluten', 'Nuts'],
    rating: 4.5
  }),
  food({
    id: 's-veg-d2',
    name: 'Rasam Rice with Papad',
    emoji: '🍲',
    cuisine: 'SOUTH_INDIAN',
    foodType: 'VEG',
    mealType: 'DINNER',
    description:
      'Tamarind-pepper rasam over hot rice with ghee and papad. A soothing, digestion-friendly dinner.',
    ingredients: ['Tamarind', 'Black pepper', 'Tomato', 'Rice', 'Ghee', 'Papad'],
    nutrition: { calories: 390, protein: 8, carbs: 74, fat: 7, fiber: 6 },
    allergens: [],
    rating: 4.4
  }),
  food({
    id: 's-veg-d3',
    name: 'Rava Idli with Sambar',
    emoji: '🍥',
    cuisine: 'SOUTH_INDIAN',
    foodType: 'VEG',
    mealType: 'DINNER',
    description:
      'Soft semolina idlis tempered with cashews and curry leaves, served with vegetable sambar.',
    ingredients: ['Semolina', 'Curd', 'Cashew', 'Sambar', 'Curry leaves'],
    nutrition: { calories: 410, protein: 12, carbs: 66, fat: 10, fiber: 5 },
    allergens: ['Dairy', 'Nuts'],
    rating: 4.3
  }),

  // ---------------------------------------------------------------
  // SOUTH INDIAN — NON-VEG
  // ---------------------------------------------------------------
  food({
    id: 's-nveg-b1',
    name: 'Egg Curry with Appam',
    emoji: '🍳',
    cuisine: 'SOUTH_INDIAN',
    foodType: 'NON_VEG',
    mealType: 'BREAKFAST',
    description:
      'Kerala-style eggs in coconut milk gravy with two lacy appams. Rich in protein, perfect weekend-morning feel.',
    ingredients: ['Eggs', 'Coconut milk', 'Appam', 'Onion', 'Curry leaves', 'Spices'],
    nutrition: { calories: 460, protein: 20, carbs: 44, fat: 20, fiber: 4 },
    allergens: ['Egg'],
    rating: 4.7
  }),
  food({
    id: 's-nveg-b2',
    name: 'Chicken Stew with Idiyappam',
    emoji: '🥣',
    cuisine: 'SOUTH_INDIAN',
    foodType: 'NON_VEG',
    mealType: 'BREAKFAST',
    description:
      'Mild white chicken stew with coconut milk and string hoppers (idiyappam). Light yet filling.',
    ingredients: ['Chicken', 'Coconut milk', 'Idiyappam', 'Carrot', 'Beans', 'Black pepper'],
    nutrition: { calories: 490, protein: 26, carbs: 52, fat: 17, fiber: 4 },
    allergens: [],
    rating: 4.6
  }),
  food({
    id: 's-nveg-b3',
    name: 'Mutton Keema Dosa',
    emoji: '🥞',
    cuisine: 'SOUTH_INDIAN',
    foodType: 'NON_VEG',
    mealType: 'BREAKFAST',
    description:
      'Crisp dosa folded over spiced minced mutton roast, with onion-tomato chutney.',
    ingredients: ['Minced mutton', 'Dosa batter', 'Onion', 'Tomato chutney', 'Pepper'],
    nutrition: { calories: 540, protein: 27, carbs: 50, fat: 24, fiber: 4 },
    allergens: [],
    rating: 4.5
  }),
  food({
    id: 's-nveg-l1',
    name: 'Chettinad Chicken Biryani',
    emoji: '🍛',
    cuisine: 'SOUTH_INDIAN',
    foodType: 'NON_VEG',
    mealType: 'LUNCH',
    description:
      'Fiery Chettinad-style biryani with pepper-marinated chicken, seeraga samba rice and boiled egg. Served with raita.',
    ingredients: ['Chicken', 'Seeraga samba rice', 'Black pepper', 'Boiled egg', 'Raita', 'Chettinad masala'],
    nutrition: { calories: 670, protein: 34, carbs: 80, fat: 22, fiber: 6 },
    allergens: ['Egg', 'Dairy'],
    rating: 4.9
  }),
  food({
    id: 's-nveg-l2',
    name: 'Meen Kuzhambu with Steamed Rice',
    emoji: '🐟',
    cuisine: 'SOUTH_INDIAN',
    foodType: 'NON_VEG',
    mealType: 'LUNCH',
    description:
      'Tamarind-based Tamil fish curry with steamed rice and poriyal. Light, tangy and omega-3 rich.',
    ingredients: ['Fish', 'Tamarind', 'Steamed rice', 'Poriyal', 'Shallots', 'Curry leaves'],
    nutrition: { calories: 520, protein: 30, carbs: 66, fat: 13, fiber: 6 },
    allergens: ['Fish'],
    rating: 4.6
  }),
  food({
    id: 's-nveg-l3',
    name: 'Pepper Chicken with Rice',
    emoji: '🍗',
    cuisine: 'SOUTH_INDIAN',
    foodType: 'NON_VEG',
    mealType: 'LUNCH',
    description:
      'Black-pepper chicken roast with steamed rice, rasam and cabbage poriyal. High-protein comfort meal.',
    ingredients: ['Chicken', 'Black pepper', 'Rice', 'Rasam', 'Cabbage poriyal'],
    nutrition: { calories: 580, protein: 33, carbs: 70, fat: 17, fiber: 7 },
    allergens: [],
    rating: 4.7
  }),
  food({
    id: 's-nveg-d1',
    name: 'Chicken Chettinad with Appam',
    emoji: '🔥',
    cuisine: 'SOUTH_INDIAN',
    foodType: 'NON_VEG',
    mealType: 'DINNER',
    description:
      'Signature Chettinad pepper chicken with two soft appams. Bold, aromatic and protein packed.',
    ingredients: ['Chicken', 'Chettinad masala', 'Coconut', 'Appam', 'Fennel', 'Curry leaves'],
    nutrition: { calories: 560, protein: 34, carbs: 40, fat: 26, fiber: 5 },
    allergens: [],
    rating: 4.8
  }),
  food({
    id: 's-nveg-d2',
    name: 'Meen Varuval with Rasam Rice',
    emoji: '🐠',
    cuisine: 'SOUTH_INDIAN',
    foodType: 'NON_VEG',
    mealType: 'DINNER',
    description:
      'Pan-seared fish fry with rasam rice and papad. Protein-rich and easy on digestion.',
    ingredients: ['Fish', 'Rava coating', 'Rasam', 'Rice', 'Papad', 'Lemon'],
    nutrition: { calories: 500, protein: 30, carbs: 60, fat: 14, fiber: 5 },
    allergens: ['Fish'],
    rating: 4.6
  }),
  food({
    id: 's-nveg-d3',
    name: 'Pepper Chicken with Chapati',
    emoji: '🌯',
    cuisine: 'SOUTH_INDIAN',
    foodType: 'NON_VEG',
    mealType: 'DINNER',
    description:
      'Coastal-style pepper chicken rolled with two chapatis and a side of onion salad. Simple, protein-forward dinner.',
    ingredients: ['Chicken', 'Black pepper', 'Chapati', 'Onion salad', 'Coriander'],
    nutrition: { calories: 530, protein: 35, carbs: 42, fat: 20, fiber: 6 },
    allergens: ['Gluten'],
    rating: 4.5
  })
]
