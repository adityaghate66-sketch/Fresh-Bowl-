# 🥗 FreshBowl — Healthy Food Subscription & Delivery Platform

**Healthy meals. Every day. Delivered to you.**

This is your complete starter platform: a customer app, plus role-locked
Kitchen, Delivery and Admin consoles, a real Express backend, and an
automation engine — organised so each stage of your startup can grow
without rewriting anything.

---

## 🚀 How to run it (2 easy ways)

### Way 1 — Instant preview (no installation)
Open the **Preview tab** in this chat. The entire app is packed into the
single file `dist/index.html` and runs right there.

> It starts with the splash screen → onboarding. Try it!

### Way 2 — On your computer (development mode)

You need **Node.js** (version 18 or newer) installed. Then, in this folder:

```bash
npm install        # one time only — downloads the libraries
npm run dev        # starts the app at http://localhost:5173
```

Open **http://localhost:5173** in your browser (press F12 → mobile view 📱
to see it like a phone).

### Optional — run the real backend too

The app works fully **without** a backend (it uses a built-in demo mode).
To switch on the real API server (Stage 2+):

```bash
cd server
npm install        # one time only
npm run dev        # starts the API at http://localhost:4000
```

Restart the frontend (`npm run dev`) — the app detects the server and uses
real accounts, subscriptions and orders automatically.

---

## 🔑 Demo logins (one tap on the Login screen)

| Role | Email | Password |
| --- | --- | --- |
| 🙋 Customer | guest@freshbowl.in | guest123 |
| 👨‍🍳 Kitchen Staff | kitchen@freshbowl.in | kitchen123 |
| 🛵 Delivery Staff | delivery@freshbowl.in | delivery123 |
| 🛡️ Administrator | admin@freshbowl.in | admin123 |

In the app, tap a demo account card → the password fills in → press
**Sign in**.

---

## ✅ What is working right now

**Customer app (Stage 1)**
- Splash screen → 4-step onboarding (Veg/Non-Veg → North/South → Location → live preview)
- Home with a **live preference switch**: change cuisine or food type and every meal updates instantly
- Today / Tomorrow / 7-day upcoming menus (they rotate daily, never random)
- Subscription plans → plan details → checkout → **mock payment** (with a "simulate failure" test switch) → confirmation
- Addresses (add / edit / delete / default / GPS)
- Orders, pause & skip (with the 9 PM cutoff rule), support tickets & FAQ, notifications, profile

**Hard business rules — enforced by the engine, not just the UI**
- 🟢 Veg customers **never** see or receive a non-veg meal. Ever.
- 🔴 Non-Veg customers get non-veg + business-approved veg dishes
- Payment failure → subscription **NOT** activated (server-side rule)
- Skip after 9 PM cutoff → not allowed (kitchen plans at night)
- Pauses respect the plan's pause-day limit
- Preference changes are **locked** while a subscription is active

**Staff consoles (role-locked)**
- 👨‍🍳 Kitchen: live production counts (meal × cuisine × veg/non-veg), prep line, substitutions
- 🛵 Delivery: assigned drops, status updates, history
- 🛡️ Admin: revenue, order pipeline, customers, plans, menu, payments, ratings, support

**Real backend (`server/` folder)** — Express + JWT + bcrypt-hashed
passwords + **MongoDB Atlas** cloud database. See [server/README.md](server/README.md).
The frontend automatically uses the API when it's running, and falls back
to demo mode when it isn't.

```bash
cd server
npm run dev          # API on http://localhost:4000 (reads server/.env)
curl http://localhost:4000/api/health   # → "database":"mongo" when connected
npm run test:mongo   # 13 end-to-end tests against a real MongoDB
```

---

## 🗂️ Where things live (for your developer)

```
src/
  screens/     one file per screen (Home, Checkout, KitchenDashboard…)
  components/  reusable pieces (MealCard, TabBar, StatusTracker…)
  services/    the "brain": menu engine, order engine, storage, API
  data/        demo food database + plans (moves to Admin UI later)
  context/     shared app state (the single source of truth)
  utils/       date & formatting helpers
server/
  src/         Express API (auth, orders, delivery, ratings)
  data/        file database (db.json)
```

Build a shareable one-file app any time with:

```bash
npm run build     # creates dist/index.html — the whole app in one file
```

---

## 🧭 Suggested next stages

1. **Stage 2 polish** — connect a real database (PostgreSQL) instead of files
2. **Stage 3** — real payments (Razorpay: UPI, cards, webhooks + server verification)
3. **Stage 4** — scheduled automation (daily order generation at midnight, expiry reminders)
4. **Stage 6+** — live GPS tracking on the Delivery app
5. **Stage 7** — push notifications (email/WhatsApp/SMS)
