# SmartCare — AI-Powered Babysitter Marketplace

> **Purpose of this document:** it is written to be consumed by both humans **and AI coding agents**.
> Every claim here was verified by reading the source code. If you are an AI agent picking up this
> repo, read sections 1–6 first, then jump to **§14 Quick Change Map** to find exactly which file to edit.

---

## 1. TL;DR

SmartCare is a **two-app monorepo** for a babysitter marketplace (India / Delhi-NCR focused):

| App | Folder | Stack | Dev URL | Prod entry |
|---|---|---|---|---|
| REST + Realtime API | `backend/` | Node.js, Express 4, MongoDB (Mongoose 8), Socket.IO 4, CommonJS | `http://localhost:5000` | `node server.js` or `node cluster.js` |
| Web client (SPA) | `react-frontend/` | React 19, Vite 8, React Router 7, Tailwind CSS v4, ESM | `http://localhost:3000` | `npm run build` → `dist/` |

**What the product does**

- **Parents** sign up → verify email via OTP → browse / `AI Smart Match` babysitters → view them on a live Google Map → chat in real time → book → pay via Razorpay → leave a review.
- **Babysitters** sign up → complete profile → submit **KYC** (Aadhaar/PAN) → get admin-verified → set map location → accept job requests → track earnings.
- **Admins** review KYC requests, verify/block users, moderate reviews, view revenue analytics.
- An **AI layer** (Google Gemini) provides (a) a floating support chatbot on every page and (b) per-sitter, natural-language explanations of *why* a sitter matched a parent's requirements.

**There is no test suite.** `jest` is listed in `backend/package.json` devDependencies and `npm test` runs `jest`, but no `__tests__` / `*.test.js` files exist. `npm run seed` points at `backend/seed.js`, **which does not exist**. Treat both as "planned".

---

## 2. Tech Stack (exact versions from `package.json`)

### Backend — `backend/package.json` (`babycare-backend` v1.0.0, `"main": "server.js"`, CommonJS)

**Runtime deps**

| Package | Version | Used for |
|---|---|---|
| `express` | ^4.18.2 | HTTP server + routing |
| `mongoose` | ^8.24.4 | MongoDB ODM |
| `jsonwebtoken` | ^9.0.2 | JWT auth (`{ id, role }` payload) |
| `bcryptjs` | ^2.4.3 | Password hashing (salt rounds = 10) |
| `socket.io` | ^4.6.1 | Realtime chat + live location |
| `@google/generative-ai` | ^0.24.1 | Gemini chatbot + match explanations |
| `razorpay` | ^2.9.2 | Payments (INR) |
| `cloudinary` | ^2.11.0 | Profile photo storage |
| `nodemailer` | ^10.0.9 | SMTP email (OTP, welcome mail) |
| `multer` | ^1.4.5-lts.1 | Multipart upload → memory storage |
| `helmet`, `cors`, `express-mongo-sanitize`, `hpp`, `express-rate-limit` | — | Security hardening |
| `express-validator` | ^7.0.1 | Input validation (auth routes) |
| `morgan`, `winston` | — | HTTP + application logging |
| `dotenv` | ^16.3.1 | Env loading |
| `uuid` | ^9.0.0 | Listed but not imported anywhere |

**Dev deps:** `nodemon` ^3.0.2, `jest` ^29.7.0 · **Engine:** `node >= 16`

**npm scripts:** `start` → `node server.js` · `start:cluster` → `node cluster.js` · `dev` → `nodemon server.js` · `test` → `jest` · `seed` → `node seed.js` (missing file)

### Frontend — `react-frontend/package.json` (`react-frontend` v0.0.0, `"type": "module"`, ESM)

**Deps:** `react` / `react-dom` ^19.2.8 · `react-router-dom` ^7.18.2 · `axios` ^1.19.0 · `socket.io-client` ^4.8.3 · `@vis.gl/react-google-maps` ^1.10.0 · `react-hot-toast` ^2.6.0

**Dev deps:** `vite` ^8.2.0 · `@vitejs/plugin-react` ^6.0.4 · `tailwindcss` + `@tailwindcss/vite` ^4.3.3 · `oxlint` ^1.75.0 (**linter — not ESLint**)

**npm scripts:** `dev` → `vite` · `build` → `vite build` · `lint` → `oxlint` · `preview` → `vite preview`

> ⚠️ **No TypeScript.** Plain `.jsx` / `.js`. Tailwind v4 uses the Vite plugin + `@import "tailwindcss"` in CSS — there is **no `tailwind.config.js` and no PostCSS config**.

---

## 3. Running the Project (local development)

### Prerequisites
- Node.js ≥ 18 (engine says 16, but React 19 / Vite 8 tooling prefers 18+)
- MongoDB running locally (`mongodb://localhost:27017/babycare`) **or** a MongoDB Atlas URI
- A Google Maps JavaScript API key (enable **Maps JavaScript API**, **Routes API**)
- Optional but needed for full fidelity: Gmail app password (SMTP), Cloudinary account, Razorpay test keys, Gemini API key

### Step 1 — Backend

```powershell
cd backend
npm install
Copy-Item .env.example .env      # then edit .env  (see §4)
npm run dev                      # nodemon, http://localhost:5000
```

Startup will **hard-exit** (code 1) if `MONGODB_URI` or `JWT_SECRET` is missing or if `JWT_SECRET` is shorter than 32 characters.
In `NODE_ENV=production` it additionally requires non-placeholder `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.

Sanity check: `GET http://localhost:5000/api/health` → `{ "status": "OK", "timestamp": "..." }`

### Step 2 — Frontend

```powershell
cd react-frontend
npm install
# .env already contains VITE_SOCKET_URL + VITE_GOOGLE_MAPS_KEY (see §4)
npm run dev                      # Vite on http://localhost:3000
```

Vite proxies `/api` and `/socket.io` to `http://localhost:5000` (`vite.config.js`), so the frontend
always talks to **relative** URLs (`axios baseURL = '/api'`) — **no CORS problems in dev**.

### Step 3 — Create an admin user
There is **no admin-seeding script**. Create a normal user via `/signup`, verify the email OTP, then
flip the role directly in MongoDB:

```js
db.users.updateOne({ email: "you@example.com" }, { $set: { role: "admin", emailVerified: true } })
```

`ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env.example` are **documented but never read by any code**.

### Production notes
- `npm run start:cluster` (`backend/cluster.js`) forks one worker per CPU core with auto-restart on crash. Each worker runs the full Express + Socket.IO server (port shared by Node's cluster module).
- Build the frontend with `npm run build` → `react-frontend/dist/`, serve it behind a reverse proxy/CDN, and point `/api` + `/socket.io` at the Node server.
- Set `FRONTEND_URL` to your real origin(s) — comma-separated is supported — otherwise CORS and CSP `connectSrc` will reject the browser.

---

## 4. Environment Variables

### `backend/.env` — copy from `backend/.env.example`

| Variable | Required | Default / example | Notes |
|---|---|---|---|
| `PORT` | no | `5000` | |
| `NODE_ENV` | no | `development` | `production` changes rate limits, log level, morgan format, stack traces |
| `MONGODB_URI` | **YES** | `mongodb://localhost:27017/babycare` | Server exits if missing |
| `JWT_SECRET` | **YES** | — | **Must be ≥ 32 chars**, else server exits |
| `JWT_EXPIRE` | no | `7d` | Token TTL |
| `FRONTEND_URL` | no | `http://localhost:5500` | Comma-separated allow-list for CORS/CSP. `http://localhost:3000` and `:5500` are always appended |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | prod only | `rzp_test_xxx` | Required & non-placeholder when `NODE_ENV=production` |
| `GEMINI_API_KEY` | no (degrades gracefully) | — | Free key from aistudio.google.com. If missing/placeholder, chatbot + explanations use built-in fallbacks |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | for photo upload | — | Read by `config/cloudinary.js` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `FROM_EMAIL` | for email | `smtp.gmail.com`, `587` | If `SMTP_USER`/`SMTP_PASS` unset the server logs `📧 SMTP not configured`. **Signup fails if the OTP email cannot be sent** (the created user is rolled back) |
| `RATE_LIMIT_WINDOW` / `RATE_LIMIT_MAX` | no | `15` / `100` | **Read but not actually used** — `server.js` hardcodes the limits |
| `AGORA_*`, `FIREBASE_*`, `TWILIO_*`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | no | — | Present in `.env.example` only. **Zero code references** — aspirational / roadmap |

### `react-frontend/.env` (Vite — the `VITE_` prefix is mandatory)

| Variable | Example | Notes |
|---|---|---|
| `VITE_SOCKET_URL` | `http://localhost:5000` | Socket.IO origin. Falls back to `http://localhost:5000` in `Chat.jsx` / `ChatInbox.jsx` |
| `VITE_GOOGLE_MAPS_KEY` | `AIza...` | Passed to `<APIProvider>` in `main.jsx`; also used directly for the Routes REST call in `MapView.jsx` |

> 🔐 `VITE_*` values are **inlined into the browser bundle and publicly visible**. The Maps key must be restricted in Google Cloud Console by HTTP referrer + API restriction. `.env` files are correctly git-ignored (only `backend/.env.example` is tracked), so no secrets are committed.

---

## 5. Repository Layout (annotated)

```
ProProject/
├── .gitignore                  # ignores .env, node_modules, logs, dist, editor folders
├── README.md                   # ← this file
├── backend/                    # Node/Express API (CommonJS)
│   ├── .env                    # local secrets (git-ignored)
│   ├── .env.example            # template for the above
│   ├── package.json
│   ├── server.js               # ⭐ ENTRY POINT: env validation, security, routes, socket, error handler
│   ├── cluster.js              # multi-core production entry (forks server.js per CPU)
│   ├── logs/                   # winston output: error.log, combined.log
│   ├── config/
│   │   ├── cloudinary.js       # cloudinary v2 client (reads CLOUDINARY_* env)
│   │   └── db.js               # ⚠️ standalone connectDB helper — NOT imported by server.js
│   ├── models/                 # Mongoose schemas (see §7)
│   │   ├── User.js             # parents + babysitters + admins, geo, KYC, OTPs
│   │   ├── Booking.js          # booking lifecycle, pricing, payment, stream, review flags
│   │   ├── Message.js          # chat messages + conversation statics
│   │   ├── Review.js           # two-way reviews, auto rating recalculation
│   │   └── ParentPreference.js # one "what I'm looking for" doc per parent (SmartMatch)
│   ├── middleware/
│   │   ├── auth.js             # protect, authorize(...roles), requireVerified, adminOnly
│   │   └── upload.js           # multer memory storage + uploadToCloudinary(buffer, folder)
│   ├── routes/                 # ⭐ ALL API endpoints (see §8)
│   │   ├── auth.js             # signup, OTP verify, login, me, profile, KYC, password reset
│   │   ├── babysitters.js      # public listing/search/nearby/detail, availability, map location
│   │   ├── bookings.js         # create, list, get one, status transitions, monitoring, stats
│   │   ├── payments.js         # razorpay create-order / verify / refund, history, earnings
│   │   ├── chat.js             # conversations, messages, read receipts, soft delete
│   │   ├── review.js           # create + list reviews  (⚠️ see §11 for a schema mismatch)
│   │   ├── admin.js            # stats, users, verify, block, KYC queue, bookings, analytics
│   │   ├── ai.js               # POST /ai/match (heuristic scoring), POST /ai/chat (Gemini)
│   │   └── smartmatch.js       # parent preferences CRUD + full AI match run
│   ├── ai/                     # ⭐ AI subsystem (see §9)
│   │   ├── matchEngine.js      # 8-dimension weighted scorer (0-100 + breakdown)
│   │   └── explainMatch.js     # Gemini-generated explanation + deterministic fallback
│   ├── socket/
│   │   └── chat.js             # Socket.IO JWT auth + all realtime events (see §10)
│   └── utils/
│       ├── AppError.js         # operational error class (message + statusCode)
│       ├── asyncHandler.js     # wraps async handlers, forwards rejections to next()
│       ├── logger.js           # winston: console (colorized) + logs/error.log + logs/combined.log
│       └── sendEmail.js        # nodemailer SMTP helper: sendEmail({ to, subject, html })
```

### Frontend tree — `react-frontend/`

```
react-frontend/
├── .env                    # VITE_SOCKET_URL, VITE_GOOGLE_MAPS_KEY (git-ignored)
├── .oxlintrc.json          # oxlint config (react/rules-of-hooks = error)
├── index.html              # SEO meta, Google Fonts (Poppins, Nunito Sans), Font Awesome CDN
├── vite.config.js          # dev port 3000, /api + /socket.io proxy to :5000, manualChunks
├── README.md               # ⚠️ default Vite template readme — superseded by this file
├── public/favicon.svg, public/icons.svg
└── src/
    ├── main.jsx            # createRoot + <APIProvider apiKey={VITE_GOOGLE_MAPS_KEY} libraries={['geometry']}>
    ├── App.jsx             # ⭐ all client routes + <AuthProvider> + <Toaster> + floating <AIChatbot>
    ├── index.css           # Tailwind v4 import + custom utilities (.gradient-bg, .gradient-text, .blob…)
    ├── App.css             # ⚠️ DEAD FILE — not imported anywhere
    ├── assets/             # hero.png used; react.svg / vite.svg unused leftovers
    ├── services/api.js     # ⭐ axios: baseURL '/api', Bearer interceptor, global 401 → /login
    ├── context/
    │   ├── AuthContextDef.js  # createContext(null) — split out to satisfy react-refresh lint rule
    │   ├── AuthContext.jsx    # AuthProvider: user in localStorage, rehydrate via GET /auth/me
    │   └── useAuth.js         # useContext(AuthContext)
    ├── components/
    │   ├── Navbar.jsx         # sticky nav, transparent over landing hero, unread badge polled every 30s
    │   ├── ProtectedRoute.jsx # role-gated wrapper, spinner while auth is loading
    │   ├── AIChatbot.jsx      # floating Gemini chatbot, quick prompts, mini markdown renderer
    │   ├── MapView.jsx        # ⭐ Google Map, markers, geolocation, Routes polyline, live sitters
    │   ├── PhotoUpload.jsx    # Cloudinary-backed avatar upload + exports InitialsAvatar
    │   └── landing/           # Hero, Stats, HowItWorks, Features, ForWho, Testimonials, CTA, Footer
    └── pages/
        ├── Landing.jsx        # composes components/landing/*
        ├── Login.jsx          # POST /auth/login
        ├── Signup.jsx         # 2 steps: signup → OTP verify-email → auto-login
        ├── ForgotPassword.jsx # email → OTP → new password
        ├── Search.jsx         # filter list + map/list toggle + AI-results mode + pagination
        ├── SmartMatch.jsx     # 4-step AI wizard + score-breakdown result cards
        ├── Profile.jsx        # public profile of any user + booking modal
        ├── ParentDashboard.jsx     # overview / bookings / payments / profile
        ├── BabysitterDashboard.jsx # overview / requests / schedule / earnings / profile / KYC + map pin
        ├── AdminDashboard.jsx      # overview / users / KYC / bookings / reviews / analytics tabs
        ├── ChatInbox.jsx      # conversation list, live updates via socket
        └── Chat.jsx           # 1:1 thread, typing, emoji picker, date separators, delete
```

> Note: `node_modules/` exists in **both** `backend/` and `react-frontend/` but is git-ignored.
> The only files currently modified vs. `HEAD` are `react-frontend/src/components/MapView.jsx` and `react-frontend/src/main.jsx`.

---

## 6. Architecture & Data Flows

### 6.1 Runtime topology

```
Browser (React 19 SPA, :3000)
  │
  │  axios  baseURL "/api"          ← Vite proxy → :5000
  │  socket.io-client  VITE_SOCKET_URL
  ▼
Node/Express (:5000)
  ├── helmet + CSP → cors(allow-list) → mongoSanitize → hpp → json(10mb) → morgan → rate-limit
  ├── /api/*  REST routers ──► Mongoose models ──► MongoDB
  └── Socket.IO ──► in-memory Maps per worker (onlineUsers, userGeoRoom)

External services: MongoDB · Cloudinary (photos) · SMTP/Nodemailer (OTP email)
                   Razorpay (payments) · Google Gemini (AI) · Google Maps JS + Routes API
```

> **Cluster caveat:** `cluster.js` runs N independent workers. `onlineUsers` / `userGeoRoom` are
> **per-worker in-memory maps** with no Redis adapter, so with `start:cluster` a user's socket may
> live on a different worker than the one handling their HTTP request. Single-process `server.js`
> is unaffected. Adding `@socket.io/redis-adapter` is the standard fix when scaling out.

### 6.2 Auth & session flow

```
Signup  →  POST /api/auth/signup
           ├─ express-validator checks (name/email/phone/password/role/location)
           ├─ reject if email or phone already exists
           ├─ create User { emailVerified:false, emailVerificationOTP:<6 digits>, expire:+10min }
           ├─ sendEmail(OTP). On failure → user is DELETED and 500 returned
           └─ 201 { needsVerification:true, email }
        →  POST /api/auth/verify-email { email, otp }
           ├─ match email + OTP + not-expired → emailVerified = true, clear OTP
           ├─ send role-specific welcome email (best-effort, inside try/catch)
           └─ 200 { token, user }        ← client calls AuthContext.login() immediately

Login   →  POST /api/auth/login { email, password }
           ├─ 401 invalid credentials · 403 if isBlocked · 403 if !emailVerified
           └─ 200 { token, user }        (JWT payload = { id, role }, TTL JWT_EXPIRE)
```

`AuthContext` persists `token` + `user` in `localStorage`, exposes
`{ user, login, logout, loading, updateUser }`, and revalidates on boot with `GET /api/auth/me`.
Every axios request adds `Authorization: Bearer <token>`. Any `401` (except from `/auth/login`)
clears storage and hard-redirects to `/login`.

**Two layers of route protection in the UI:**
1. `ProtectedRoute` — client-side: `<ProtectedRoute>` (any authed user) or `<ProtectedRoute role="parent|babysitter|admin">`.
2. `middleware/auth.js` — server-side: `protect` (JWT) → `authorize(...roles)`.

### 6.3 Booking lifecycle

Allowed transitions enforced in `PUT /api/bookings/:id/status`:

```
pending ──► confirmed ──► in-progress ──► completed
   │            │              │
   └────────────┴──────────────┴──► cancelled        disputed ⇄ {completed, cancelled}
```

| Transition | Side effects in `routes/bookings.js` |
|---|---|
| → `in-progress` | sets `checkInTime` |
| → `completed` | sets `checkOutTime` and computes `actualDuration` in hours |
| → `cancelled` | sets `cancelledBy` (role of caller) + `cancellationReason` |
| any paid booking | `razorpayPaymentId` + `paidAt` set by `/api/payments/verify`, which also flips `pending → confirmed` |

On `Booking.save()` the model pre-hook computes `platformFee = round(totalAmount * 0.15)` and
`babysitterEarnings = totalAmount - platformFee` (**15 % platform commission, hardcoded**).
`totalAmount` itself is computed at creation time as `duration × babysitter.hourlyRate`; the client
shows the same maths in the Profile booking modal.

### 6.4 Payment flow (Razorpay, server-verified)

```
Parent clicks Book (Profile.jsx)  →  POST /api/bookings                → booking: pending / unpaid
Parent clicks Pay                 →  POST /api/payments/create-order   → Razorpay order; stores razorpayOrderId
Razorpay checkout (client-side)
                                  →  POST /api/payments/verify { order, payment, signature, bookingId }
                                     └─ HMAC-SHA256(`${order}|${payment}`, KEY_SECRET) vs signature
                                     └─ paymentStatus='paid'; status pending → confirmed
Admin                             →  POST /api/payments/refund (authorize('admin')) → razorpay.payments.refund
```

> `create-order` and `verify` are **fully implemented server-side**, but no frontend code calls them —
> `Profile.jsx` stops after booking creation. Wiring the Razorpay Checkout script is an open TODO.

### 6.5 KYC / verification flow

```
Babysitter fills KYC form (BabysitterDashboard → KYC section)
  →  POST /api/auth/submit-kyc { idType, idNumber, documentUrl }
     └─ kycStatus: 'pending' → 'submitted', kycData.submittedAt = now
  →  AdminDashboard "KYC Requests" tab → GET /api/admin/kyc-requests
     └─ PUT /api/admin/users/:id/verify { verified: true|false } → verified; kycStatus approved|rejected
  →  Verified babysitters:
     ├─ appear in GET /api/babysitters (listing hard-filters `verified: true`)
     ├─ can be booked (POST /api/bookings rejects unverified sitters)
     └─ can NO LONGER change their map location
        (PUT /api/babysitters/location → 403 "Location is locked after KYC verification")
```

### 6.6 AI Smart Match flow

```
SmartMatch.jsx (4-step wizard)
  steps 1-3 gather prefs (childAgeGroup, numberOfChildren, maxBudget, minExperience,
                          requiredSkills, requiredDays, preferredLanguages, specialNeeds…)
  → POST /api/smartmatch/preferences   (only when logged in; upsert by user id)
  → POST /api/smartmatch/run { preferences }
        ├─ if body.preferences empty AND an Authorization header is present → load saved ParentPreference
        ├─ query babysitters (role, isActive, !isBlocked, verified, +maxBudget, +minExperience)
        ├─ scoreSitter() from ai/matchEngine.js  (8 weighted dimensions, 0-100)
        ├─ sort desc → keep score ≥ 20 (unless fewer than 3 survive, then keep all) → top 10
        ├─ explainTopMatches() from ai/explainMatch.js
        │     ├─ top 5 → Gemini (parallel) · remaining → deterministic fallback
        │     └─ returns { [sitterId]: "2-3 sentence explanation" }
        └─ 200 { totalScored, preferences, babysitters:[{...sitter, finalScore, breakdown, reliability,
                                                         strengths, gaps, aiExplanation, matchLabel}] }
  → SmartMatch renders breakdown bars + AI explanation per card
  → results cached in localStorage key `smartmatch_results`
  → Search.jsx reads that key on mount → sets aiMode → filters map/list to those sitters
```

`matchLabel` bands (`routes/smartmatch.js`): `≥85 Excellent Match` (green) · `≥70 Great Match` (blue)
· `≥55 Good Match` (amber) · else `Partial Match` (pink).

### 6.7 Realtime chat flow

```
Chat.jsx connects io(SOCKET_URL, { auth: { token } })
  → socket/chat.js io.use() verifies JWT, loads user, rejects if missing/blocked
  → socket.join(userId) + onlineUsers.set(userId, socketId)
  → emits `online_users` to self, broadcasts `user_online`

Send: socket.emit('send_message', { to, text })
  → persists a Message with conversationId = [a,b].sort().join('_')
  → io.to(to).emit('receive_message', payload)   ← recipient
  → socket.emit('message_sent', payload)         ← sender confirmation / optimistic reconcile

REST fallback: POST /api/chat/send (same persistence, no push)
```

### 6.8 Live location (geo-room fan-out)

Babysitters emit `location_update`; the server buckets coordinates into ~11 km grid cells and only
broadcasts to nearby cells — deliberately avoiding a global firehose.

```js
geoRoom(lat, lng)   → `geo_${round(lat*10)/10}_${round(lng*10)/10}`   // ~0.1° grid cell
nearbyRooms(lat,lng) → current cell + 8 neighbours (9 rooms, ~33 km max reach)
```

`MapView.jsx` mirrors this on the client: it watches `navigator.geolocation`, emits `location_update`,
and renders other users' `user_location` / `user_location_gone` events as live markers. It also draws
a driving route with the modern **Routes API** (`POST https://routes.googleapis.com/directions/v2:computeRoutes`)
and decodes the polyline with `window.google.maps.geometry` (which is why `main.jsx` requests the
`geometry` library). Haversine distance is computed locally; `≤ 10 km` is labelled "Nearby".

---

## 7. Data Models (MongoDB via Mongoose)

All models use `{ timestamps: true }` (so `createdAt` / `updatedAt` exist everywhere).

### 7.1 `User` — `models/User.js`

One collection holds **parents, babysitters and admins**, discriminated by `role`.

| Field | Type | Rules / notes |
|---|---|---|
| `name` | String | required, trimmed, max 50 |
| `email` | String | required, unique, lowercased, regex-validated |
| `phone` | String | required, `^[+]?[\d\s-]{10,15}$` |
| `password` | String | required, min 6, **`select: false`** — must `.select('+password')` to read |
| `role` | String | enum `parent` \| `babysitter` \| `admin`, default `parent` |
| `location` | String | required — human-readable locality (e.g. "South Delhi") |
| `coordinates` | GeoJSON Point | `{ type:'Point', coordinates:[lng, lat] }`, **default `[77.2090, 28.6139]` (Delhi)** |
| `photo` | String | URL; defaults to a stock Unsplash image |
| `bio` | String | max 500 (sitter) |
| `experience` | Number | years, default 0 |
| `hourlyRate` | Number | default 200, min 100 (**₹**) |
| `skills` | [String] | free-form (e.g. "First Aid") |
| `availability` | [String] | enum of weekday names |
| `ageGroups` | [String] | enum `Infant (0-1)` \| `Toddler (1-3)` \| `Preschool (3-5)` \| `School Age (5+)` |
| `languages` | [String] | |
| `education` | String | |
| `rating` / `reviewCount` | Number | denormalised, recalculated by the Review model |
| `verified` | Boolean | default false — set by admin KYC approval |
| `phoneVerified` | Boolean | default false — set by `verifyOTP()` |
| `kycStatus` | String | `pending` \| `submitted` \| `approved` \| `rejected` |
| `kycData` | Object | `{ idType, idNumber, documentUrl, submittedAt, reviewedAt, reviewedBy }` |
| `isActive` / `isBlocked` | Boolean | `isBlocked` makes `protect` reject with 403 |
| `resetPasswordToken/Expire`, `resetPasswordOTP/Expire` | | password-reset flow (OTP path is what's used) |
| `otp`, `otpExpire`, `phoneVerified` | | phone OTP flow |
| `emailVerified`, `emailVerificationOTP`, `emailVerificationOTPExpire` | | email verification flow |

**Indexes:** `coordinates: '2dsphere'` (enables `$near` geo queries), `{ role, verified }`.

**Middleware / methods**
- `pre('save')` — bcrypt-hashes `password` (salt 10) when modified
- `matchPassword(plain)` → Promise&lt;Boolean&gt;
- `getSignedJwtToken()` → `jwt.sign({ id, role }, JWT_SECRET, { expiresIn: JWT_EXPIRE || '7d' })`
- `generateOTP()` → 6-digit code, expires in 10 min, stored in `otp`
- `verifyOTP(code)` → clears `otp`, sets `phoneVerified = true`

> The `emailVerified` / phone-verification booleans and the `otp`-vs-`emailVerificationOTP` split are
> two separate flows — don't confuse them. **Login requires `emailVerified === true`.**

### 7.2 `Booking` — `models/Booking.js`

| Field | Type | Notes |
|---|---|---|
| `parent`, `babysitter` | ObjectId → User | required |
| `parentName`, `parentPhone`, `babysitterName` | String | denormalised snapshots |
| `date` | Date | required |
| `startTime`, `endTime` | String | required (`"14:00"` style) |
| `duration` | Number | hours, required |
| `childrenCount` | Number | 1–5, default 1 |
| `childrenAges` | [String] | free-form (`["2","5"]`) |
| `specialInstructions` | String | max 500 |
| `address` | String | required |
| `coordinates` | `{ lat, lng }` | plain numbers (not GeoJSON) |
| `hourlyRate`, `totalAmount` | Number | required |
| `platformFee` | Number | default 0 → **15 % of total** via pre-save |
| `babysitterEarnings` | Number | `totalAmount - platformFee` |
| `status` | String | enum `pending` \| `confirmed` \| `in-progress` \| `completed` \| `cancelled` \| `disputed` |
| `cancelledBy` | String | `parent` \| `babysitter` \| `admin` \| `null` |
| `cancellationReason` | String | |
| `paymentStatus` | String | `unpaid` \| `paid` \| `refunded` \| `failed` |
| `paymentMethod` | String | `razorpay` \| `cash` \| `wallet` (default `razorpay`) |
| `razorpayOrderId`, `razorpayPaymentId`, `razorpaySignature`, `paidAt` | | set by payments routes |
| `monitoringEnabled`, `streamId`, `streamStartedAt`, `streamEndedAt` | | live-monitoring hook (**API exists, no frontend**; Agora env vars unused) |
| `checkInTime`, `checkOutTime`, `actualDuration` | | session tracking |
| `parentReviewGiven`, `babysitterReviewGiven` | Boolean | declared but **never written** — review state is actually derived from `Review.findOne({ reviewer, booking })` |

**Indexes:** `{parent, createdAt:-1}`, `{babysitter, createdAt:-1}`, `{status}`, `{date}`
**Virtual:** `formattedDate` (en-IN long date). Note virtuals are **not** included in `res.json()` unless `.toObject({ virtuals:true })` — the routes don't do that.

### 7.3 `Message` — `models/Message.js`

| Field | Type | Notes |
|---|---|---|
| `sender`, `receiver` | ObjectId → User | required |
| `senderName`, `receiverName` | String | required snapshots |
| `conversationId` | String | **`[id1, id2].sort().join('_')`** — canonical pair key |
| `messageType` | String | `text` \| `image` \| `file` \| `audio` \| `video` \| `location` \| `booking` |
| `text` | String | max 2000 |
| `mediaUrl` | String | |
| `mediaMetadata` | Object | `{ fileName, fileSize, mimeType, duration }` |
| `booking` | ObjectId → Booking | optional card reference |
| `location` | Object | `{ lat, lng, address }` |
| `status` | String | `sent` \| `delivered` \| `read` |
| `deliveredAt`, `readAt` | Date | |
| `deletedBySender`, `deletedByReceiver` | Boolean | soft delete; row is hard-deleted when **both** are true |
| `replyTo` | ObjectId → Message | |

**Statics**
- `getConversationId(a, b)` → sorted `_`-joined string
- `getConversation(userId1, userId2, limit, skip)` → messages for a pair, newest first, `replyTo` populated
- `getUserConversations(userId)` → aggregation producing `{ _id: conversationId, lastMessage, unreadCount }`
- `markAsRead(conversationId, userId)` → bulk-set `status:'read'`, `readAt`

### 7.4 `Review` — `models/Review.js` (two-way: parent ↔ babysitter)

| Field | Type | Notes |
|---|---|---|
| `reviewer`, `reviewee` | ObjectId → User | required |
| `reviewerName`, `revieweeName` | String | required |
| `reviewerRole` | String | required, enum `parent` \| `babysitter` |
| `booking` | ObjectId → Booking | required |
| `rating` | Number | 1–5 required |
| `title` | String | max 100 |
| `text` | String | **required**, max 1000 |
| `subRatings` | Object | `{ punctuality, communication, childCare, professionalism }` |
| `response` | Object | `{ text, respondedAt }` |
| `isPublic`, `isReported`, `reportReason`, `moderatedBy`, `moderatedAt` | | moderation |
| `helpfulVotes`, `votedBy` | | |

**Indexes:** `{reviewee, createdAt:-1}`, `{reviewer}`, `{booking}`, `{rating:-1}`, and a **unique** `{reviewer, booking}`.
**Statics/hooks:** `calculateAverageRating(userId)` rewrites `User.rating` + `User.reviewCount`;
`post('save')` runs it automatically.

> ⚠️ `routes/review.js` still writes the **old** field names (`babysitter`, `comment`) and queries
> `{ babysitter: userId }`. See §11 — this makes `POST /api/reviews` fail validation and
> `GET /api/reviews/:userId` always return `[]`.

### 7.5 `ParentPreference` — `models/ParentPreference.js`

Exactly **one document per parent** (`parent` is `unique`), upserted by `POST /api/smartmatch/preferences`.

`childAgeGroup` (same enum as `User.ageGroups`) · `numberOfChildren` (1–10) · `maxBudget` (₹/hr) ·
`minExperience` (years) · `requiredSkills[]` · `requiredDays[]` · `preferredLanguages[]` ·
`specialNeeds` (Boolean) · `specialNeedsDetails` · `additionalNotes`.

These fields map **1:1 onto the inputs of `scoreSitter()`** in `ai/matchEngine.js`.

---

## 8. Complete API Reference

Base URL: `/api` · All responses are JSON · Errors are `{ "error": "message" }`
(validation errors on auth routes return `{ "errors": [ { msg, path, ... } ] }`).

Legend for access: **Public** · **Private** (any valid JWT) · **parent** / **babysitter** / **admin** (role-gated).

### 8.1 Health

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/health` | Public | `{ status:'OK', timestamp }` — mounted before all routers |

### 8.2 Auth — `routes/auth.js`

| Method | Path | Access | Body / Query | Behaviour |
|---|---|---|---|---|
| POST | `/auth/signup` | Public | `{ name, email, phone, password, role, location }` | Validates + `escape()`s input. Password **min 8, needs ≥1 uppercase and ≥1 digit**. Creates unverified user, emails OTP. Rolls back on mail failure |
| POST | `/auth/verify-email` | Public | `{ email, otp }` | Sets `emailVerified`, sends welcome mail, **returns `{ token, user }`** |
| POST | `/auth/login` | Public | `{ email, password }` | 401 bad creds · 403 blocked · 403 unverified |
| POST | `/auth/upload-photo` | Private | multipart `photo` | ≤5 MB, image MIME only → Cloudinary (400×400 face crop) → updates `user.photo` |
| GET | `/auth/me` | Private | — | Full current user document |
| POST | `/auth/send-otp` | Private | — | Generates phone OTP. **SMS sending is a TODO** — the code is only stored server-side |
| POST | `/auth/verify-otp` | Private | `{ otp }` | Sets `phoneVerified` |
| PUT | `/auth/update-profile` | Private | any of `name, phone, location, photo, bio, experience, hourlyRate, skills, availability, ageGroups, languages, education` | Whitelisted, `runValidators:true` |
| PUT | `/auth/change-password` | Private | `{ currentPassword, newPassword }` | min 6 chars here (differs from signup's 8!) |
| POST | `/auth/submit-kyc` | Private (**babysitter**) | `{ idType, idNumber, documentUrl }` | `kycStatus → 'submitted'` |
| POST | `/auth/forgot-password` | Public | `{ email }` | Always 200 (anti-enumeration). Emails 6-digit OTP, 10-min TTL |
| POST | `/auth/reset-password` | Public | `{ email, otp, newPassword }` | newPassword min 8 + uppercase + digit |
| GET | `/auth/user/:id` | Private | — | Public profile of any user (limited field set) |

### 8.3 Babysitters — `routes/babysitters.js`

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/babysitters/public-stats` | Public | Landing-page counters: `totalBabysitters, verifiedBabysitters, totalParents, avgRating, localities (hardcoded 15)` |
| GET | `/babysitters` | Public | **Base query always forces `role:'babysitter', isActive:true, isBlocked:false, verified:true`.** Query params: `location` (regex, `all` = ignore), `minRating`, `maxRate`, `minExperience`, `ageGroup`, `verifiedOnly='true'`, `sortBy=rating\|price-low\|price-high\|experience\|reviews`, `page` (default 1), `limit` (default 10). Returns `{ count, total, pages, currentPage, babysitters }` |
| GET | `/babysitters/nearby` | Public | `lat`, `lng`, `maxDistance` (metres, default 10000). Uses `$near` + 2dsphere. Requires `lat`/`lng` or 400 |
| GET | `/babysitters/:id` | Public | Single sitter; excludes password/otp/kycData |
| PUT | `/babysitters/availability` | **babysitter** | `{ availability: [...] }` |
| PUT | `/babysitters/location` | **babysitter** | `{ lat, lng }`; validates ranges; **403 if already `verified`** |

> `GET /babysitters` and `/:id` leak **nothing sensitive** (`-password -otp -otpExpire -kycData`), but
> they *do* expose `phone` and `email` for sitters to any caller. Keep in mind if hardening privacy.

### 8.4 Bookings — `routes/bookings.js`

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/bookings` | **parent** | `{ babysitterId, date, startTime, endTime, duration, childrenCount, childrenAges, specialInstructions, address }`. Rejects unverified sitter. `totalAmount = duration × hourlyRate` |
| GET | `/bookings` | Private | Auto-scoped to `parent` or `babysitter` by role; optional `status`, `page`, `limit`. Populates both parties |
| GET | `/bookings/:id` | Private | 403 unless you are the parent, the sitter, or an admin |
| PUT | `/bookings/:id/status` | Private | `{ status, cancellationReason }`. Enforces the transition matrix in §6.3 |
| PUT | `/bookings/:id/monitoring` | Private | `{ action:'start'\|'stop', streamId }`. **Only while `status === 'in-progress'`** |
| GET | `/bookings/user/stats` | Private | Aggregation: `totalBookings, completedBookings, pendingBookings, totalAmount, totalEarnings` |

> The frontend calls `GET /api/bookings/user/stats`. Because `router.get('/:id')` is registered *before*
> it, verify with care: `/:id` matches a **single** segment only, so `/user/stats` correctly reaches the
> later handler. Reordering these routes is unnecessary but reordering *and* changing `/:id` to a
> wildcard would break it.

### 8.5 Payments — `routes/payments.js`

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/payments/create-order` | **parent** | `{ bookingId }`. 404 if missing, 403 if not your booking, 400 if already paid. Creates a Razorpay order for `totalAmount × 100` paise, INR, receipt `booking_<id>`. Returns `{ order, booking, key }` |
| POST | `/payments/verify` | Private | `{ razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId }`. HMAC-SHA256 check → `paid`, `pending → confirmed` |
| POST | `/payments/refund` | **admin** | `{ bookingId, amount?, reason? }` → Razorpay refund, `paymentStatus='refunded'` |
| GET | `/payments/history` | Private | Role-scoped paid bookings + `totals { totalPaid, totalEarnings, totalFees }` |
| GET | `/payments/earnings` | **babysitter** | `?period=week\|month\|year` → per-day earnings buckets from `paidAt` |

### 8.6 Chat (REST) — `routes/chat.js`

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/chat/unread/count` | Private | `{ unreadCount }` — polled by `Navbar.jsx` every 30 s |
| GET | `/chat/conversations` | Private | Inbox list via `Message.getUserConversations()` + hydrated `user` object per thread |
| GET | `/chat/:userId` | Private | Last 50 messages for the pair (page/limit supported) and **marks them read as a side effect** |
| POST | `/chat/send` | Private | `{ receiverId, text, messageType, mediaUrl, location, bookingId }` — REST alternative to the socket event |
| PUT | `/chat/read/:conversationId` | Private | Bulk mark read |
| DELETE | `/chat/message/:id` | Private | Soft delete for the calling party only; hard-deletes when both sides deleted |
| DELETE | `/chat/conversation/:userId` | Private | Soft-delete whole thread for caller; purges rows both sides deleted |

### 8.7 Reviews — `routes/review.js`

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/reviews` | Private | `{ babysitterId, bookingId, rating, comment }` — booking must be `completed`; one review per `(reviewer, booking)`. ⚠️ **currently broken, see §11** |
| GET | `/reviews/:userId` | Public | Reviews for a sitter, newest first, `reviewer` populated with `name photo`. ⚠️ **currently always `[]`, see §11** |

### 8.8 Admin — `routes/admin.js` (every route passes `protect` + `authorize('admin')`)

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/stats` | `{ users{total,parents,babysitters,verifiedBabysitters,pendingKYC}, bookings{total,completed,cancelled,completionRate}, revenue{totalRevenue,platformEarnings,babysitterPayouts} }` |
| GET | `/admin/users` | `role`, `verified`, `blocked`, `search`, `page`, `limit`. Excludes admins and passwords |
| GET | `/admin/users/:id` | User + per-user booking stats (`totalBookings, completedBookings, totalSpent, totalEarned`) |
| PUT | `/admin/users/:id/verify` | `{ verified }` — the KYC approve/reject action |
| PUT | `/admin/users/:id/block` | `{ blocked, reason }` |
| GET | `/admin/kyc-requests` | Sitters with `kycStatus:'submitted'`, oldest first |
| GET | `/admin/bookings` | Optional `status` filter, paginated, both parties populated |
| GET | `/admin/reviews` | `?reported=true` filter |
| PUT | `/admin/reviews/:id/moderate` | `{ action: 'approve'\|'hide'\|'delete' }`. ⚠️ uses `review.remove()` which **no longer exists in Mongoose 7+** — the `delete` branch will throw |
| GET | `/admin/analytics` | `?period=week\|month\|year` → `{ bookingsOverTime, signupsOverTime, topLocations, topBabysitters }` |

### 8.9 AI — `routes/ai.js`

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/ai/match` | Public | `{ maxRate, minRating, skills, ageGroup, location, limit=10 }`. **Self-contained heuristic scorer** (different implementation from `ai/matchEngine.js`!) returning `babysitters[].matchScore` (0–100). ⚠️ **Not called by any frontend code** — `SmartMatch.jsx` uses `/api/smartmatch/run` instead |
| POST | `/ai/chat` | Public | `{ messages: [{ role:'user'\|'assistant', content }] }` → `{ reply }`. Uses Gemini `startChat` with history + system instruction. **Falls back to keyword-matched canned replies** when `GEMINI_API_KEY` is missing/placeholder or on any API error |

### 8.10 Smart Match — `routes/smartmatch.js`

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/smartmatch/preferences` | Private | Upsert `ParentPreference` for `req.user._id` (`runValidators:true`) |
| GET | `/smartmatch/preferences` | Private | `{ preferences: <doc \| null> }` |
| POST | `/smartmatch/run` | Public (optional auth) | `{ preferences }`. Inline prefs win; if empty **and** an `Authorization` header is present it verifies the JWT manually with `jsonwebtoken` and loads saved prefs. Returns `{ noResults, message, suggestions }` when nothing matched, otherwise scored + explained babysitters |

### 8.11 Error responses (global handler in `server.js`)

| Trigger | Status | Body |
|---|---|---|
| `AppError` (any route via `next(new AppError(...))`) | `err.statusCode` | `{ error: <message> }` |
| Unknown route | 404 | `{ error: "Route not found" }` |
| Mongo duplicate key (`err.code === 11000`) | 400 | `{ error: "<field> already exists" }` |
| Mongoose `ValidationError` | 400 | `{ error: "msg1, msg2" }` |
| `JsonWebTokenError` | 401 | `{ error: "Invalid token" }` |
| `TokenExpiredError` | 401 | `{ error: "Token expired, please login again" }` |
| Anything else | 500 | `{ error: "Internal server error" }` + `stack` when `NODE_ENV !== 'production'` |

Rate limits: **global** `/api/*` → 1000 req / 15 min in dev, 200 in prod. **Auth** (`/auth/login`,
`/auth/signup`, `/auth/send-otp`) → 100 / 15 min in dev, 20 in prod. Exceeding returns
`{ error: "Too many requests, please try again later." }` (429).

---

## 9. AI Subsystem

### 9.1 Model

Both Gemini call-sites lazily initialise **`gemini-3.6-flash`** via `@google/generative-ai`:

```js
let geminiModel = null
function getGemini() {
  if (!geminiModel) {
    const { GoogleGenerativeAI } = require('@google/generative-ai')
    geminiModel = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      .getGenerativeModel({ model: 'gemini-3.6-flash' })
  }
  return geminiModel
}
```

Files: `routes/ai.js` (chatbot) and `ai/explainMatch.js` (match explanations). If the model name
becomes unavailable, change these two string literals.

### 9.2 `ai/matchEngine.js` — the 8-dimension scorer

`scoreSitter(sitter, parentPrefs)` returns:

```js
{
  finalScore,             // 0-100, rounded, capped at 100
  breakdown: {            // per dimension
    budget: { score: 0-100, weight: 20, contribution: 0-20 }, …
  },
  reliability,            // 0-100 = rating*0.5 + verified*0.3 + experience*0.2
  strengths: ['skills', …], // dimensions scoring >= 0.8
  gaps: ['availability', …] // dimensions scoring <  0.4
}
```

**Weights (sum = 100):**

| Dimension | Weight | Function | Rule |
|---|---|---|---|
| `budget` | 20 | `scoreBudget` | `0.7` neutral if no `maxBudget`; **0** if `hourlyRate > maxBudget`; else `0.5 + 0.5 × (rate / maxBudget)` |
| `rating` | 20 | `scoreRating` | `(rating/5) × (0.6 + 0.4 × min(reviewCount/10, 1))` — confidence-weighted |
| `experience` | 15 | `scoreExperience` | below `minExperience` → `exp/minExp × 0.5`; else `min(exp/8, 1)` |
| `skills` | 15 | `scoreSkills` | fraction of required skills found (substring, case-insensitive); `0.6` neutral if none required |
| `ageGroup` | 10 | `scoreAgeGroup` | 1 on match, `0.1` mismatch, `0.6` neutral, `0.3` if sitter lists none |
| `availability` | 10 | `scoreAvailability` | fraction of `requiredDays` present in `sitter.availability` |
| `languages` | 5 | `scoreLanguages` | fraction of `preferredLanguages` matched (min 0.2 if none match) |
| `verified` | 5 | `scoreVerified` | 1 if `sitter.verified` |

Because `verified` is worth only 5 points and the DB query already filters `verified: true`, the
`verified` contribution is effectively always the maximum 5 — it never discriminates in practice.

### 9.3 `ai/explainMatch.js` — natural-language justification

- `explainSitterMatch(sitter, parentPrefs, scoreData)` builds a prompt containing the parent's needs,
  the sitter's profile, the score, reliability, strengths and gaps. Rules in the prompt: 2–3
  sentences, ≤60 words, cite real numbers, mention gaps gently, no bullets, address the sitter by name.
- `explainTopMatches(sitters, prefs, scoreMap)` → **only the top 5** go to Gemini (in parallel via
  `Promise.all`); the rest use the deterministic fallback — a deliberate free-tier rate-limit guard.
- `generateFallbackExplanation(...)` composes a sentence from real facts: score band, rating +
  review count, KYC status, budget fit, top-2 skills, and a gentle mismatch note.

### 9.4 `routes/ai.js` chatbot fallback

`getFallbackReply(userMsg)` is a keyword router covering: find/search/sitter, price/rate/cost/₹,
safe/verify/kyc/trust, book/booking, pay/payment/razorpay, hello/hi/hey/namaste, map/location/near —
plus a default. This means **the chatbot works fully offline** with no API key.

### 9.5 Known AI-layer duplication

There are **two independent scoring implementations**:

| | `routes/ai.js → scoreSitter()` | `ai/matchEngine.js → scoreSitter()` |
|---|---|---|
| Endpoint | `POST /api/ai/match` | `POST /api/smartmatch/run` |
| Used by frontend? | ❌ No | ✅ `SmartMatch.jsx` |
| Dimensions | 7 additive buckets, ad-hoc points | 8 weighted dimensions |
| Output | `matchScore` (0–100) | `finalScore` + `breakdown` + `reliability` + `strengths/gaps` |

If you change matching logic, change `ai/matchEngine.js` — that is the live one.

---

## 10. Socket.IO Event Contract — `socket/chat.js`

**Connection:** `io(SOCKET_URL, { auth: { token }, transports: ['websocket','polling'] })`
**Handshake auth:** JWT is verified in `io.use()`; the user document is loaded and rejected if missing
or `isBlocked`. On success `socket.user` holds `{ _id, name, role }`.
**Rooms:** each user auto-joins a personal room named after their **userId**, plus optional `geo_*` rooms.

### Server → client

| Event | Payload | When |
|---|---|---|
| `online_users` | `{ userIds: string[] }` | Immediately on connect (full snapshot) |
| `user_online` | `{ userId }` | Broadcast to everyone when someone connects |
| `user_offline` | `{ userId }` | Broadcast on disconnect |
| `receive_message` | `{ _id, from, to, text, senderName, createdAt }` | Sent to the recipient's personal room |
| `message_sent` | same shape | Echoed to the sender (optimistic-UI reconciliation) |
| `message_error` | `{ error }` | Recipient not found / persistence failure |
| `typing` / `stop_typing` | `{ from }` | Other party's typing indicators |
| `user_location` | `{ userId, lat, lng }` | To the 9 nearby geo-rooms (never back to sender) |
| `user_location_gone` | `{ userId }` | To the room being left, on disconnect |

### Client → server

| Event | Payload | Effect |
|---|---|---|
| `send_message` | `{ to, text }` | Validates recipient, persists a `Message`, fans out (`text` is `.trim()`ed, empty rejected) |
| `typing` / `stop_typing` | `{ to }` | Relayed to the target's personal room |
| `location_update` | `{ lat, lng }` (**must be numbers**) | Leaves the previous geo-room, joins the new one, broadcasts to 9 cells |

> No `disconnect`-side DB writes besides deleting the local map entries. If you add horizontal scaling,
> swap the `io.to(userId)` targeting for a Redis adapter — the room naming already supports it.

---

## 11. Frontend Architecture

### 11.1 Route table — `src/App.jsx`

| Path | Component | Guard |
|---|---|---|
| `/` | `Landing` | Public |
| `/login` | `Login` | Public |
| `/signup` | `Signup` | Public |
| `/forgot-password` | `ForgotPassword` | Public |
| `/search` | `Search` | Public (chat button hidden when logged out) |
| `/smart-match` | `SmartMatch` | Public (works as guest) |
| `/profile/:id` | `Profile` | Public |
| `/dashboard` | `RedirectDashboard` | Sends users to `/admin`, `/babysitter-dashboard`, or `/parent-dashboard` by role |
| `/parent-dashboard` | `ParentDashboard` | `<ProtectedRoute role="parent">` |
| `/babysitter-dashboard` | `BabysitterDashboard` | `<ProtectedRoute role="babysitter">` |
| `/admin` | `AdminDashboard` | `<ProtectedRoute role="admin">` |
| `/chat` | `ChatInbox` | `<ProtectedRoute>` |
| `/chat/:userId` | `Chat` | `<ProtectedRoute>` |
| `*` | → `/` | — |

`<AIChatbot />` and `<Toaster position="top-right" duration={3000} />` are mounted **outside** `<Routes>`,
so they appear on every page.

### 11.2 State management

There is **no Redux / Zustand / React Query**. State is local `useState` + two cross-cutting stores:

1. **`AuthContext`** — the only global context: `{ user, login(token, user), logout(), loading, updateUser(partialUser) }`.
   `user` is mirrored to `localStorage.user`; the JWT to `localStorage.token`.
2. **`localStorage`** as a poor-man's store for the SmartMatch hand-off (`smartmatch_results`).

Data fetching is done inline in `useEffect` with `api.get(...)`; loading flags are local `useState`s.
Toasts via `react-hot-toast` (`toast.success` / `toast.error`) are the universal error surface.

### 11.3 Axios client — `src/services/api.js`

```js
const api = axios.create({ baseURL: '/api' })
// request  → attach Authorization: Bearer <token> from localStorage
// response → on 401 (and not /auth/login) clear token+user and window.location = '/login'
```

Because `baseURL` is **relative**, dev traffic goes through the Vite proxy and prod traffic goes to
whatever origin serves the bundle. Always use `api.*` — never a hard-coded `http://localhost:5000`.

### 11.4 Google Maps integration

- `main.jsx` wraps the entire app in `<APIProvider apiKey={VITE_GOOGLE_MAPS_KEY} libraries={['geometry']}>`.
- `MapView.jsx` uses `<Map>`, `<AdvancedMarker>` and `useMap()` from `@vis.gl/react-google-maps`.
- A **class error boundary** (`MapErrorBoundary` inside `Search.jsx`) catches render crashes from
  Google Maps quota/API errors and shows "Map temporarily unavailable" instead of a white screen.
  Preserve this pattern when touching the map.
- Live sitters: `GET /api/babysitters/nearby` (lat/lng/maxDistance) + socket `user_location` events.
- Route drawing: direct `fetch` to the Routes REST API with the `X-Goog-Api-Key` header, then
  `window.google.maps.geometry.encoding.decodePath(encodedPolyline)` → `google.maps.Polyline`.

### 11.5 Styling conventions

- **Tailwind v4 utility classes inline.** No CSS modules, no styled-components.
- **Brand palette is hardcoded as hex literals** in class strings — search & replace these exact values:
  - `#6EC1E4` — brand blue (primary)
  - `#F9CADA` — brand pink (soft accent)
  - `#E91E63` / `#e879a0` — deep pink (gradients, .gradient-text)
- Custom utilities live in `src/index.css` (`@layer utilities`): `.gradient-bg`, `.gradient-bg-btn`,
  `.gradient-text`, `.nunito`, `.card-hover`, `.blob`, `.slide-in`, `.pulse-badge`, plus `float` /
  `pulse-anim` keyframes. **`src/App.css` is dead code — do not import it.**
- Fonts: **Poppins** (default via `*` selector) and **Nunito Sans** (`.nunito` class for body copy),
  loaded from Google Fonts in `index.html`. Icons: **Font Awesome 6.4.0 via CDN** (`<i className="fas fa-…">`).
- Page shell pattern: `<div className="min-h-screen">` → `<Navbar />` → content with `pt-20` (fixed nav
  is 64 px tall, `h-16`).

### 11.6 Notable component behaviours

| Component | Behaviour worth preserving |
|---|---|
| `Navbar.jsx` | Transparent + white text over the landing hero until `window.scrollY > 40`; polls `/chat/unread/count` every 30 s; closes menus on `pathname` change; dropdown closes on outside `mousedown` |
| `ProtectedRoute.jsx` | Shows a spinner while `loading`; redirects to `/login` if no user; redirects to `/` on role mismatch |
| `PhotoUpload.jsx` | Client-side 5 MB guard, `URL.createObjectURL` preview, uploads then calls `updateUser({ photo })`; exports the reusable `InitialsAvatar` |
| `AIChatbot.jsx` | Floating widget; `renderContent()` hand-rolls bold/bullet/line-break rendering then uses `dangerouslySetInnerHTML`; quick-prompt chips; Enter sends, Shift+Enter newlines |
| `Chat.jsx` | Optimistic messages reconciled via the `message_sent` socket echo; emoji picker; date separators ("Today"/"Yesterday"/weekday); debounced typing events |
| `Search.jsx` | Three view modes (map / list / AI results). Reads `localStorage.smartmatch_results` on mount — **`clearAI()` removes the key and returns to normal search** |
| `SmartMatch.jsx` | 4-step wizard; requires auth only for *saving* prefs — guests can still run the match |
| `BabysitterDashboard.jsx` | Includes a map picker for the service location; the map is **locked once `verified`** (matches the server's 403) |

---

## 12. Coding Conventions (match these when contributing)

**Backend**
- CommonJS (`require` / `module.exports`). Semi-colons are used in `models/`, `routes/`, `utils/`,
  `middleware/`; the newer AI files (`ai/*`, `routes/ai.js`, `routes/smartmatch.js`, `socket/chat.js`,
  `cluster.js`) are written **without** semicolons — follow the file you're editing.
- Async route handlers go through `asyncHandler()` and throw `new AppError(msg, statusCode)`.
  `server.js` centralises error formatting — do **not** hand-roll error JSON in new routes.
- Every route file follows the comment banner convention:
  ```js
  // ============================================
  // @route   POST /api/x
  // @desc    What it does
  // @access  Private (role)
  // ============================================
  ```
- Sensitive fields are excluded with `.select('-password -otp -otpExpire -kycData')`.
- Ownership checks are manual (`booking.parent.toString() === req.user.id`) — `protect` only
  authenticates, it does not authorise per-resource.
- Use `utils/logger.js` for server-level events; `console.error` inside route `catch` blocks is the
  existing pattern for route-level failures.

**Frontend**
- ESM, no semicolons in JSX files, single quotes, 2-space indent, function components + hooks only.
- One default export per page/component file. The auth context was split into `AuthContextDef.js` +
  `AuthContext.jsx` + `useAuth.js` specifically to satisfy the `react/only-export-components` oxlint rule.
- Guard numeric ids before interpolating them into URLs (see `ParentDashboard.cancelBooking`, which
  validates `/^[a-f\d]{24}$/i` first).
- Use `toast.*` for user feedback; `<Link>` for navigation and `useNavigate()` for programmatic jumps.
- Lint with `npm run lint` (oxlint) inside `react-frontend/`.

---

## 13. Known Issues, Gaps & Gotchas

Everything below was verified by reading the code. Fix these or work around them.

### 🔴 Functional bugs

1. **`routes/review.js` does not match the `Review` schema.**
   - It creates `{ babysitter, reviewer, booking, rating, comment }`, but `models/Review.js` requires
     `reviewee`, `revieweeName`, `reviewerName`, `reviewerRole` and `text` (required) and has
     **no** `babysitter` or `comment` path. → `POST /api/reviews` throws a `ValidationError`
     (surfaced as `500 "Failed to add review"`), so **reviews can never be created**.
   - `GET /api/reviews/:userId` queries `{ babysitter: userId }` → always returns `[]`, so the Profile
     page review list is permanently empty.
   - `updateBabysitterRating()` is only reachable from the broken POST. The model's own
     `calculateAverageRating` + `post('save')` hook is the working implementation.
   - **Fix direction:** rewrite the route to the current schema (`reviewee`, `reviewerName`,
     `reviewerRole`, `revieweeName`, `text`) and drop `updateBabysitterRating()` in favour of the hook.

2. **`routes/admin.js` review moderation calls `review.remove()`** — removed in Mongoose 7+.
   The `'delete'` branch throws; use `Review.findByIdAndDelete(id)`. Likewise
   `reviewSchema.post('remove')` in `models/Review.js` never fires (should be
   `post('findOneAndDelete')`).

3. **`config/db.js` is dead code.** `server.js` has its own inline `connectDB()`. Two competing
   connection helpers exist — edit `server.js`, not `config/db.js`.

4. **`npm run seed` fails** — `backend/seed.js` does not exist. Demo data must be inserted manually.

5. **Payment UI is missing.** `/api/payments/*` is complete, but nothing in `react-frontend/` calls it,
   so bookings stay `unpaid` / `pending` unless you update them manually.

6. **`/api/ai/match` is orphaned.** It duplicates Smart Match with a different algorithm and is never called.

7. **Phone OTP is never actually sent** — `POST /api/auth/send-otp` still carries
   `// TODO: Send OTP via SMS (Twilio/MSG91)`. Twilio env vars exist but are unused, so
   `phoneVerified` is unreachable through the UI.

8. **`RATE_LIMIT_WINDOW` / `RATE_LIMIT_MAX` are ignored** — the limits are hardcoded in `server.js`.

### 🟠 Design / robustness notes

9. **Socket.IO state is per-worker.** With `start:cluster`, `onlineUsers` and geo rooms are not shared
   across workers. Add `@socket.io/redis-adapter` before scaling horizontally.
10. **Smart Match scores at most 100 sitters** (`limit(100)`), `/api/ai/match` at most 50 — fine at
    current scale; a large marketplace needs DB-side scoring or caching.
11. **The `verified` weight in `matchEngine` is redundant** — the DB query already filters
    `verified: true`, so it contributes a constant 5 points to everyone.
12. **Two different password minimums:** signup/reset enforce 8 chars + uppercase + digit, while
    `PUT /auth/change-password` only enforces 6 characters. Align these.
13. **Public sitter endpoints expose `email` and `phone`** to unauthenticated callers.
14. **`Booking.parentReviewGiven` / `babysitterReviewGiven` are never written** — review state is
    derived from the `Review` collection instead.
15. **The `formattedDate` virtual is never serialised** — `res.json()` on a Mongoose document omits
    virtuals; add `.toObject({ virtuals: true })` if you need it.
16. **Live monitoring / Agora is schema-only.** The Booking fields and
    `PUT /bookings/:id/monitoring` exist, but there is no client-side video integration.
17. **`react-frontend/src/App.css`, `src/assets/react.svg`, `src/assets/vite.svg` are unused**, and
    `react-frontend/README.md` is the untouched Vite template readme.

### 🟡 "Don't-break-this" cautions

18. Route ordering in `routes/babysitters.js` matters: `/public-stats` and `/nearby` are declared
    **before** `/:id`. Keep static paths above parameterised ones.
19. `MapErrorBoundary` in `Search.jsx` exists because Google Maps can throw during render (quota /
    invalid key). Keep it wrapping `<MapView>`.
20. `AuthContext` deliberately does **not** block the UI on `/auth/me` when a cached user exists — it
    renders from cache and reconciles in the background. Preserve that for instant page loads.
21. Login hard-requires `emailVerified`. Any seeding script that creates users must set it, or it must
    drive the OTP flow.
22. `AIChatbot.jsx` uses `dangerouslySetInnerHTML` on model output. If you extend the renderer, keep
    escaping in mind.

---

## 14. Quick Change Map ("I want to change X → edit Y")

| Task | File(s) |
|---|---|
| Add a new REST endpoint | create/extend a file in `backend/routes/`, register it in `backend/server.js` |
| Add a DB field | the relevant `backend/models/*.js`, then add it to `.select()` allow-lists and the `allowedUpdates` array in `routes/auth.js` |
| Change the platform commission (15 %) | `backend/models/Booking.js` → the `pre('save')` hook |
| Change booking status rules | `backend/routes/bookings.js` → `allowedTransitions` |
| Change matching weights / add a dimension | `backend/ai/matchEngine.js` (`WEIGHTS` + a `scoreX()` function) |
| Change the AI explanation tone/rules | `backend/ai/explainMatch.js` → the `prompt` template string |
| Change the chatbot persona / canned replies | `backend/routes/ai.js` → `SYSTEM_PROMPT` and `getFallbackReply()` |
| Change the Gemini model | `backend/routes/ai.js` and `backend/ai/explainMatch.js` (`getGenerativeModel` calls) |
| Change rate limits | `backend/server.js` → `globalLimiter` / `authLimiter` |
| Change the CORS allow-list | `backend/server.js` → `allowedOrigins`, driven by `FRONTEND_URL` |
| Add a Socket.IO event | `backend/socket/chat.js` (server) + the consuming page/component (client) |
| Add a page/route | `react-frontend/src/App.jsx` + a file in `src/pages/` |
| Change API calls / auth headers | `react-frontend/src/services/api.js` |
| Change login/session behaviour | `react-frontend/src/context/AuthContext.jsx` |
| Change brand colours | `react-frontend/src/index.css` utilities **and** the inline `#6EC1E4` / `#F9CADA` literals across components |
| Change validation rules | `backend/routes/auth.js` (`express-validator` chains), model schemas, and the matching form in `src/pages/Signup.jsx` |
| Add/alter email templates | `backend/routes/auth.js` (inline HTML) and `backend/utils/sendEmail.js` |
| Configure env vars | `backend/.env.example` (document) + the consuming file + `README §4` |

---

## 15. Roadmap / Not-Yet-Implemented (from code comments & unused deps)

| Item | Evidence |
|---|---|
| Seed/demo-data script | `package.json` `"seed": "node seed.js"` — file missing |
| Real SMS OTP | `// TODO: Send OTP via SMS (Twilio/MSG91)` in `routes/auth.js`; unused `TWILIO_*` env vars |
| Live video/audio monitoring | `monitoringEnabled`, `streamId`, stream timestamps in `Booking`; unused `AGORA_*` env vars |
| Push notifications | unused `FIREBASE_*` env vars; `// TODO: Send notification to babysitter` in `routes/bookings.js` |
| Booking status notifications | `// TODO: Send notifications` in `routes/bookings.js` |
| Review submission UI | Review route exists but is broken and no page posts a review |
| Review replies / helpful votes | `Review.response`, `helpfulVotes`, `votedBy` declared but unused |
| Unit/integration tests | `jest` installed, zero test files |
| Message media uploads | `messageType: image/file/audio/video` and `mediaUrl` exist; no upload endpoint |
| Wallet payments | `paymentMethod` enum includes `wallet` with no implementation |
| `uuid` dependency | declared in `backend/package.json`, never imported |

---

## 16. Glossary & Seed-Account Facts

| Term | Meaning in this codebase |
|---|---|
| **Sitter / Babysitter** | `User` with `role: 'babysitter'`. Only **verified** sitters appear in public search or can be booked |
| **KYC** | Government-ID verification. `kycStatus: pending → submitted → approved/rejected`; approval flips `verified = true` |
| **Smart Match** | The 8-dimension AI ranking feature (`/smart-match` page + `/api/smartmatch/*`) |
| **Match score** | 0–100 from `ai/matchEngine.js`; ≥85 Excellent, ≥70 Great, ≥55 Good, else Partial |
| **Conversation ID** | `[userA, userB].sort().join('_')` — the canonical key for a 1:1 thread |
| **Geo room** | `geo_<lat1dp>_<lng1dp>` Socket.IO room; 9 adjacent rooms ≈ 33 km reach |
| **Platform fee** | 15 % of `totalAmount`, computed on `Booking` save |
| **OTP** | 6-digit numeric code, 10-minute TTL. Two independent variants: `emailVerificationOTP` (signup) and `resetPasswordOTP` (forgot password), plus the unused `otp` (phone) |

**Loose ends to know before debugging:**
- All IDs are Mongo `ObjectId` 24-char hex strings. The frontend treats `user._id` and `user.id` as interchangeable (`user?._id || user?.id`) because `/auth/login` returns `id` while `/auth/me` returns `_id`.
- Money is always **INR**, integers, no decimals, no currency library.
- Dates: `Booking.date` is a Date; `startTime`/`endTime` are plain `"HH:mm"` strings; display formatting uses `toLocaleDateString('en-IN')`.

---

*Generated by analysing the SmartCare repository at commit `05b1390` (branch `main`). If code and this
document ever disagree, the code wins — please update the relevant section when you change behaviour.*

