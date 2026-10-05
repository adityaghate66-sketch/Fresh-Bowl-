# 🍃 FreshBowl Backend — with MongoDB

The API server that powers login, subscriptions, orders, the kitchen,
delivery and the admin dashboard. Node.js + Express + JWT + **MongoDB**.

## Quick start (3 steps)

```bash
cd server
cp .env.example .env      # 1. create your secrets file
nano .env                  #    (or any editor) — fill JWT_SECRET + MONGODB_URI
npm run dev                # 2. start the API on http://localhost:4000
```

Health check — open in a browser:

```
http://localhost:4000/api/health
```

You'll see `"database":"mongo"` when MongoDB Atlas is connected, or
`"database":"file"` when running in offline demo mode (everything still
works — data is just stored in `server/data/db.json` instead of the cloud).

## Connecting MongoDB Atlas (beginner steps)

1. Go to https://cloud.mongodb.com and open your project.
2. **Connect** → **Drivers** → choose Node.js → copy the connection string.
   It looks like:
   ```
   mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
3. Paste it into `server/.env` as the `MONGODB_URI` value.
4. In Atlas: **Network Access** → add your IP (or `0.0.0.0.0/0` for
   testing from anywhere) so your computer is allowed to connect.
5. Restart the server. You should see:
   ```
   🍃 MongoDB connected → database "freshbowl"
   🌱 Seeded 4 demo account(s) into MongoDB "freshbowl".
   ```

Demo accounts are seeded automatically the first time (they already exist
on later runs — seeding never duplicates):

| Role | Email | Password |
| --- | --- | --- |
| Administrator | admin@freshbowl.in | admin123 |
| Kitchen Staff | kitchen@freshbowl.in | kitchen123 |
| Delivery Staff | delivery@freshbowl.in | delivery123 |
| Customer | guest@freshbowl.in | guest123 |

## Testing

```bash
npm run test:mongo
```

Boots a **real MongoDB in memory**, then runs 13 end-to-end checks:
login, wrong password, register, duplicate email, subscriptions,
auto-generated orders, kitchen queue, admin overview, role locks.
Exits 0 when everything passes.

## Environment variables (server/.env)

| Key | What it is |
| --- | --- |
| `MONGODB_URI` | your Atlas connection string (empty = demo mode) |
| `MONGODB_DB` | database name inside the cluster (default `freshbowl`) |
| `JWT_SECRET` | long random string that signs login tokens |
| `PORT` | API port (default 4000) |
| `CLIENT_ORIGINS` | frontend URLs allowed to call this API |

## Data model (MongoDB collections)

- `users` — accounts for every role (passwords are bcrypt-hashed)
- `subscriptions` — one active plan per customer
- `orders` — auto-generated daily meal orders with status history
- `payments`, `ratings`, `tickets`, `notifications`
- `skips`, `pauses` — customer meal skips and plan pauses
- `appstate` — small shared settings (sold-out dishes, reset tokens)

## Frontend connection

The React app in `../src` auto-detects the server: when this API is
running, sign-in goes through MongoDB; when it isn't, the app falls back
to its built-in demo mode. No frontend changes needed.
