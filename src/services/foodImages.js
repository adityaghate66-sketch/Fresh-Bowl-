// =====================================================================
// FOOD PHOTOGRAPHY
// =====================================================================
// Real food photos (Unsplash CDN, free to use). Each dish maps to a
// photo; if the network is unavailable the card falls back to a big
// emoji on a soft pastel gradient, so the UI NEVER looks broken.
//
// Stage 2+ note: in production these URLs are replaced by images
// uploaded from the Admin dashboard to cloud storage (S3/Firebase).

const img = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=720&q=80`

export const FOOD_IMAGES = {
  // NORTH — VEG
  'n-veg-b1': img('1567337710282-00832b415979'), // paratha
  'n-veg-b2': img('1585937421612-70a008356fbe'), // poha
  'n-veg-b3': img('1565557623262-b51c2513a641'), // chilla
  'n-veg-l1': img('1606491956689-2ea866880c84'), // rajma chawal
  'n-veg-l2': img('1504674900247-0877df9cc836'), // chole bowl
  'n-veg-l3': img('1631452180519-c014fe946bc7'), // paneer butter masala
  'n-veg-d1': img('1630322193477-74fe1a532d2c'), // palak paneer
  'n-veg-d2': img('1613292443284-8d10ef9383fe'), // dal makhani
  'n-veg-d3': img('1540420773420-3366772f4999'), // veg thali
  // NORTH — NON-VEG
  'n-nveg-b1': img('1510693206972-df098062cb71'), // egg bhurji
  'n-nveg-b2': img('1601050690597-df0568f70950'), // keema paratha
  'n-nveg-b3': img('1603894584373-5ac82b2ae398'), // keema pao
  'n-nveg-l1': img('1631515243349-e0cb75fb8d3a'), // butter chicken
  'n-nveg-l2': img('1589301760014-d929f3979dbc'), // biryani
  'n-nveg-l3': img('1546833999-b9f581a1996d'), // mutton curry
  'n-nveg-d1': img('1594041680534-e8c8cdebd659'), // tandoori
  'n-nveg-d2': img('1596560548464-f010549b84d7'), // chicken curry roti
  'n-nveg-d3': img('1519708227418-c8fd9a32b7a2'), // fish curry
  // SOUTH — VEG
  's-veg-b1': img('1668236543090-82eba5ee5976'), // idli
  's-veg-b2': img('1637849943595-a12b1915e9fe'), // dosa
  's-veg-b3': img('1590301157890-4810ed352733'), // pongal
  's-veg-l1': img('1512058564366-18510be2db19'), // sambar rice
  's-veg-l2': img('1563379091339-03b21ab4a4f8'), // veg biryani
  's-veg-l3': img('1626074353765-517a681e40be'), // lemon rice
  's-veg-d1': img('1565557623262-b51c2513a641'), // kurma chapati
  's-veg-d2': img('1547592166-23ac45744acd'), // rasam rice
  's-veg-d3': img('1626132647523-66f5bf380027'), // rava idli
  // SOUTH — NON-VEG
  's-nveg-b1': img('1510693206972-df098062cb71'), // egg curry appam
  's-nveg-b2': img('1604908176997-125f25cc6f3d'), // chicken stew
  's-nveg-b3': img('1585937421612-70a008356fbe'), // keema dosa
  's-nveg-l1': img('1631515243349-e0cb75fb8d3a'), // chettinad biryani
  's-nveg-l2': img('1559847844-5315695dadae'), // meen kuzhambu
  's-nveg-l3': img('1603360946369-dc9bb6258143'), // pepper chicken
  's-nveg-d1': img('1596560548464-f010549b84d7'), // chettinad appam
  's-nveg-d2': img('1519708227418-c8fd9a32b7a2'), // fish fry
  's-nveg-d3': img('1603360946369-dc9bb6258143') // pepper chicken chapati
}

// Soft pastel gradients used behind the emoji fallback + card accents.
export const HERO_TONES = {
  'n-veg-b1': ['#fde8d7', '#f9c9a3'],
  'n-veg-b2': ['#fff3d6', '#ffe1a8'],
  'n-veg-b3': ['#e8f6d5', '#cdebb0'],
  'n-veg-l1': ['#fde2e2', '#fbc4c4'],
  'n-veg-l2': ['#ffe8cc', '#ffd6a5'],
  'n-veg-l3': ['#ffecd2', '#fcb69f'],
  'n-veg-d1': ['#dcf5e3', '#b8e6c9'],
  'n-veg-d2': ['#fce1e4', '#f8c8dc'],
  'n-veg-d3': ['#e0f2fe', '#bae6fd'],
  'n-nveg-b1': ['#ffedd5', '#fed7aa'],
  'n-nveg-b2': ['#fee2e2', '#fecaca'],
  'n-nveg-b3': ['#ffedd5', '#fdba74'],
  'n-nveg-l1': ['#ffdfd3', '#ffc5a5'],
  'n-nveg-l2': ['#ffe5d4', '#ffd0a4'],
  'n-nveg-l3': ['#fee2e2', '#fca5a5'],
  'n-nveg-d1': ['#ffedcc', '#ffd199'],
  'n-nveg-d2': ['#ffe4d6', '#ffc4a3'],
  'n-nveg-d3': ['#e0f2fe', '#a5d8ff'],
  's-veg-b1': ['#e0f2fe', '#c3e7fd'],
  's-veg-b2': ['#fef9c3', '#fde68a'],
  's-veg-b3': ['#fff7d6', '#ffecb0'],
  's-veg-l1': ['#dcfce7', '#bbf7d0'],
  's-veg-l2': ['#ffe8cc', '#ffd6a5'],
  's-veg-l3': ['#fef9c3', '#fef08a'],
  's-veg-d1': ['#e8f6d5', '#cdebb0'],
  's-veg-d2': ['#dbeafe', '#bfdbfe'],
  's-veg-d3': ['#e0f2fe', '#c3e7fd'],
  's-nveg-b1': ['#ffedd5', '#fed7aa'],
  's-nveg-b2': ['#ffedd5', '#fed7aa'],
  's-nveg-b3': ['#fee2e2', '#fecaca'],
  's-nveg-l1': ['#ffe5d4', '#ffc4a8'],
  's-nveg-l2': ['#dbeafe', '#a5d8ff'],
  's-nveg-l3': ['#ffedcc', '#ffc9a3'],
  's-nveg-d1': ['#ffe4d6', '#ffc4a3'],
  's-nveg-d2': ['#dbeafe', '#bfdbfe'],
  's-nveg-d3': ['#ffedcc', '#ffc9a3']
}

export function heroFor(item) {
  const [a, b] = HERO_TONES[item.id] || ['#f1f5f9', '#e2e8f0']
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`
}
