# Fair-Ride

A production-ready logistics and dispatch platform built for the Nigerian market. Fair-Ride connects senders with riders for on-demand, scheduled, and same-day deliveries. The platform supports individual users, vendors, restaurants, and corporate accounts, with a full admin dashboard and real-time order tracking.

---

## Monorepo Structure

```
fair-ride/
├── backend/      # NestJS 11 REST + WebSocket API
└── frontend/     # Next.js 16 PWA (in development)
```

---

## Backend

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | NestJS 11 |
| Language | TypeScript 5.7 (`moduleResolution: nodenext`) |
| Database | PostgreSQL 16 via Prisma 7 |
| Cache / Queues | Redis (ioredis) + BullMQ |
| Auth | OTP (Africa's Talking SMS) + JWT (passport-jwt) |
| Payments | Paystack + OPay |
| Push Notifications | Firebase Cloud Messaging (FCM v1) |
| SMS | Africa's Talking |
| Real-time | Socket.io (WebSocket gateways) |
| Package Manager | pnpm (with `COREPACK_INTEGRITY_KEYS=0`) |

---

### Prerequisites

- Node.js 20+
- PostgreSQL 16
- Redis 7+
- pnpm (`npm i -g pnpm`)

---

### Environment Variables

Copy `.env.example` to `.env` and fill in values:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/fairride"
JWT_SECRET="your-secret-key"
REDIS_URL="redis://localhost:6379"
GOOGLE_MAPS_API_KEY=""       # for real distance calculation
PAYSTACK_SECRET_KEY=""       # Paystack live/test key
OPAY_SECRET_KEY=""           # OPay key
AFRICAS_TALKING_API_KEY=""   # for OTP SMS
FCM_SERVER_KEY=""            # Firebase service account JSON (stringified)
```

All third-party keys are optional — the app runs in dev-mode fallback (logs to console) when keys are empty.

---

### Setup & Running

```bash
cd backend

# Install dependencies
COREPACK_INTEGRITY_KEYS=0 pnpm install

# Run database migrations
pnpm exec prisma migrate deploy

# Seed admin user and default pricing
pnpm exec prisma db seed

# Start development server (port 3001)
COREPACK_INTEGRITY_KEYS=0 pnpm start:dev

# Production build
pnpm build && pnpm start:prod
```

---

### Database Schema

The schema lives in `backend/prisma/schema.prisma`. Migrations are in `backend/prisma/migrations/`.

**Models:**

| Model | Description |
|-------|-------------|
| `User` | All user types — individual, vendor, restaurant, corporate, rider, admin |
| `BusinessAccount` | Linked account for vendor/restaurant/corporate users |
| `RiderProfile` | KYC documents, GPS coordinates, wallet, commission model |
| `Order` | Full delivery order with pricing breakdown and status lifecycle |
| `GpsLog` | Per-order GPS breadcrumb trail |
| `Payment` | Payment record with commission split |
| `Subscription` | Business and rider subscription plans |
| `Rating` | Bidirectional user ↔ rider ratings |
| `Notification` | Persisted push/SMS notifications |
| `ChatMessage` | In-app order-scoped messages |
| `CallLog` | In-app and dial-out call records |
| `Dispute` | Order disputes with resolution workflow |
| `Payout` | Rider bank payout records |
| `SavedAddress` | User address book |
| `PromoCode` | Discount codes (percentage or fixed) |
| `AppConfig` | Dynamic config key-value store (pricing, etc.) |

**Key Enums:** `UserRole`, `OrderStatus` (11 states), `DeliveryType`, `PaymentMethod`, `SubscriptionPlan`, `CommissionModel`, `RiderType`

---

### Modules

#### Auth (`/auth`)
- Phone-based OTP authentication via Africa's Talking SMS
- OTP stored in Redis with 5-minute TTL
- JWT issued on verify; contains `sub`, `phone`, `role`
- `JwtAuthGuard` + `RolesGuard` protect all subsequent routes

#### Users (`/users`)
- Profile management (name, email, FCM token)
- Business account creation (vendors, restaurants, corporates)
- Saved address book
- Admin user status control (active / suspended)

#### Riders (`/riders`)
- KYC document submission (ID, licence, bike papers, BVN, NIN)
- Real-time GPS location updates stored on `RiderProfile`
- Online/offline toggle
- Wallet balance tracking
- Bank account details for payouts
- Two fleet types: `MARKETPLACE` (pay-per-order) and `FLEET` (subscription)

#### Orders (`/orders`)
- Dynamic pricing: `finalPrice = (baseFare + distanceKm × perKmRate) × surgeMultiplier`
- Pricing values read live from Redis (admin-configurable)
- Distance computed via Google Maps Distance Matrix API (with straight-line fallback)
- Supports `ON_DEMAND`, `SCHEDULED`, `SAME_DAY` delivery types
- Payment methods: `CARD`, `OPAY`, `BANK_TRANSFER`, `CASH`
- 11-state order status lifecycle

**Order Status Flow:**
```
PENDING → ASSIGNED → EN_ROUTE_TO_PICKUP → ARRIVED_AT_PICKUP
       → PICKED_UP → IN_TRANSIT → ARRIVED_AT_DELIVERY
       → DELIVERED_REQUESTED → DELIVERED_CONFIRMED
                             ↘ DISPUTED / CANCELLED
```

#### Matching (`/matching`)
- BullMQ job queue for async rider matching
- Searches Redis geo index for nearby online verified riders
- Broadcasts available order to candidates via Socket.io (`/` namespace)
- Rider accept/reject flow with automatic re-broadcast on reject
- Fires `NO_RIDERS` notification if no candidates found

#### Tracking (`/tracking`)
- Persists GPS breadcrumbs to `GpsLog` table per order
- Returns full GPS trail for an order

#### Payments (`/payments`)
- Paystack payment initialization and webhook verification
- Revenue split: platform takes **15%** (pay-per-order) or **5%** (subscribed rider)
- Net rider earnings credited to `RiderProfile.walletBalance`
- Cash order confirmation flow
- OPay integration (pluggable)

#### Subscriptions (`/subscriptions`)
- Four plans across two axes (business volume, business flat, rider weekly, rider monthly)
- Subscribing sets `commissionModel = SUBSCRIPTION` on `RiderProfile` → reduces platform cut to 5%
- BullMQ cron runs hourly to detect and expire ended subscriptions, resetting commission model
- Admin can view all subscriptions and stats

**Subscription Plans:**

| Plan | Price | Duration | Benefit |
|------|-------|----------|---------|
| Business Volume | ₦15,000 | 30 days | Unlimited deliveries |
| Business Flat | ₦8,000 | 30 days | 50 deliveries/month |
| Rider Weekly | ₦2,000 | 7 days | 5% commission (vs 15%) |
| Rider Monthly | ₦6,500 | 30 days | 5% commission (vs 15%) |

#### Notifications (`/notifications`)
- Persisted to database for in-app notification centre
- FCM push sent when user has a registered `fcmToken`
- SMS via Africa's Talking for critical events
- Full trigger map across every order lifecycle event:

| Event | Recipient | Channel |
|-------|-----------|---------|
| Order placed | User | Push + DB |
| Rider assigned | User | Push + DB |
| Rider arrived at pickup | User | Push + SMS + DB |
| Order picked up | User | Push + DB |
| Delivered (rider confirms) | User | Push + DB |
| Delivery confirmed | Rider | Push + DB |
| Order cancelled | Rider (if assigned) | Push + DB |
| Payment captured | User + Rider | Push + DB |
| No riders found | User | Push + DB |
| Subscription expired | User/Rider | Push + DB |

#### Chat (`/chat`)
- Order-scoped messaging between user and assigned rider
- Socket.io `/chat` namespace with JWT auth on connect
- Admins auto-join `admin:chat` room and receive all messages in real time
- REST endpoints for message and call history
- Call logging (in-app and dial-out) with duration tracking

#### Admin (`/admin`)
Full admin dashboard, all routes require `ADMIN` role JWT.

- **Dashboard KPIs:** trips today, online riders, pending/completed orders, revenue, commission, open disputes, pending KYC, active subscriptions
- **User management:** list, detail, ban/activate
- **Rider management:** list, detail, KYC approval/rejection, fleet type change
- **Order management:** detail, status override, rider reassignment
- **Dispute management:** list, detail, resolve with notes
- **Finance:** revenue summary, date-range daily breakdown report, rider payout processing
- **Dynamic pricing:** GET/PATCH base fare, per-km rate, surge multiplier (stored in Redis + DB)
- **Promo codes:** create, list, toggle active/inactive

---

### API Reference

All endpoints are prefixed `http://localhost:3001`. Protected routes require `Authorization: Bearer <JWT>`.

#### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/request-otp` | No | Send OTP to phone |
| POST | `/auth/verify-otp` | No | Verify OTP, receive JWT |
| POST | `/auth/register` | JWT | Complete profile (name, role) |

#### Users
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/me` | JWT | Get own profile |
| PATCH | `/users/me` | JWT | Update name / email |
| PATCH | `/users/me/fcm-token` | JWT | Register FCM push token |
| POST | `/users/me/business-account` | JWT | Create business account |
| POST | `/users/me/addresses` | JWT | Save address |
| GET | `/users/me/addresses` | JWT | List saved addresses |

#### Riders
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/riders/profile` | JWT | Submit KYC / create rider profile |
| GET | `/riders/profile` | JWT | Get own rider profile |
| PATCH | `/riders/profile` | JWT | Update profile |
| PATCH | `/riders/location` | JWT | Update GPS coordinates |
| PATCH | `/riders/status` | JWT | Toggle online / offline |
| GET | `/riders/nearby` | JWT | Find nearby riders (`lat`, `lng`, `radius`) |

#### Orders
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/orders` | JWT | Create order (triggers matching) |
| GET | `/orders` | JWT | List own orders (`page`, `limit`) |
| GET | `/orders/:id` | JWT | Order detail |
| PATCH | `/orders/:id/cancel` | JWT | Cancel order |

#### Matching
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/matching/accept` | JWT (RIDER) | Accept matched order |
| POST | `/matching/reject` | JWT (RIDER) | Reject match |
| PATCH | `/matching/orders/:id/status` | JWT (RIDER) | Update order status |

**WebSocket** — connect to `ws://localhost:3001` (namespace `/`):
- Server emits `order:available` to nearby riders with order details
- Rider emits `order:accept` / `order:reject`

#### Payments
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/payments/initialize` | JWT | Init Paystack transaction |
| POST | `/payments/verify` | JWT | Verify + capture payment |
| POST | `/payments/cash/confirm` | JWT (RIDER) | Confirm cash payment received |
| GET | `/payments/history` | JWT | Own payment history |

#### Subscriptions
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/subscriptions/plans` | JWT | List all available plans |
| POST | `/subscriptions/subscribe` | JWT | Subscribe to a plan |
| GET | `/subscriptions/me` | JWT | Active subscription |
| POST | `/subscriptions/cancel` | JWT | Cancel subscription |

#### Notifications
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | JWT | List notifications (`page`, `limit`) |
| GET | `/notifications/unread-count` | JWT | Unread count |
| PATCH | `/notifications/read-all` | JWT | Mark all read |
| PATCH | `/notifications/:id/read` | JWT | Mark one read |

#### Chat
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/chat/:orderId/messages` | JWT | Chat history for order |
| POST | `/chat/:orderId/messages` | JWT | Send message |
| GET | `/chat/:orderId/calls` | JWT | Call log for order |
| POST | `/chat/:orderId/calls` | JWT | Log a call |

**WebSocket** — connect to `ws://localhost:3001/chat` with `auth: { token: "<JWT>" }`:
- Client emits `send_message` → `{ orderId, content, messageType }`
- Server emits `new_message` to `chat:{orderId}` room and `admin:chat` room
- Admin clients auto-join `admin:chat` on connect

#### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/dashboard` | KPI summary |
| GET | `/admin/users` | List users (`role`, `status`, `page`, `limit`) |
| GET | `/admin/users/:id` | User detail |
| PATCH | `/admin/users/:id/status` | Update user status |
| GET | `/admin/riders` | List riders (`verificationStatus`, `riderType`, `isOnline`) |
| GET | `/admin/riders/:id` | Rider detail |
| PATCH | `/admin/riders/:id/verify` | Approve / reject KYC (`status`, `reason`) |
| PATCH | `/admin/riders/:id/fleet` | Change rider type (`type`) |
| GET | `/admin/orders/:id` | Order detail |
| PATCH | `/admin/orders/:id/status` | Override order status |
| POST | `/admin/orders/:id/reassign` | Reassign to new rider |
| GET | `/admin/disputes` | List disputes (`status`, `page`, `limit`) |
| GET | `/admin/disputes/:id` | Dispute detail |
| PATCH | `/admin/disputes/:id/resolve` | Resolve dispute |
| GET | `/admin/finance/summary` | Revenue & payout totals |
| GET | `/admin/finance/report` | Daily breakdown (`startDate`, `endDate`) |
| POST | `/admin/payouts/process` | Process rider payout (`riderId`, `amount`) |
| GET | `/admin/pricing` | Current pricing config |
| PATCH | `/admin/pricing` | Update pricing (`baseFare`, `perKmRate`, `surgeMultiplier`) |
| GET | `/admin/promos` | List promo codes |
| POST | `/admin/promos` | Create promo code |
| PATCH | `/admin/promos/:id` | Toggle promo active (`active=true/false`) |
| GET | `/admin/subscriptions` | All subscriptions |
| GET | `/admin/subscriptions/stats` | Subscription statistics |

---

### Generating an Admin JWT (Dev)

The seeded admin phone (`+2340000000000`) bypasses the Nigerian phone validator, so generate the token directly:

```bash
node -e "
const jwt = require('jsonwebtoken');
console.log(jwt.sign(
  { sub: '<ADMIN_USER_ID>', phone: '+2340000000000', role: 'ADMIN' },
  'your-jwt-secret',
  { expiresIn: '7d' }
));
"
```

Get the admin user ID from the database:
```bash
PGPASSWORD=postgres psql -U postgres -d fairride \
  -c "SELECT id FROM \"User\" WHERE role='ADMIN';"
```

---

## Frontend

The frontend is a Next.js 16 + React 19 + TypeScript 5 + Tailwind CSS 4 PWA targeting mobile-first delivery UX. It is currently scaffolded and ready for feature development.

```bash
cd frontend
npm install
npm run dev   # runs on port 3000
```

---

## Architecture Notes

- **Dynamic pricing** — `baseFare`, `perKmRate`, `surgeMultiplier` are stored in Redis for zero-latency reads on every order. `PATCH /admin/pricing` updates both Redis and the `AppConfig` DB table for persistence across restarts.
- **Commission split** — 15% platform fee by default; drops to 5% for subscribed riders. Checked live via `SubscriptionsService.hasActiveSubscription()` at payment capture time.
- **BullMQ queues** — two separate IORedis connections per queue (one for Queue, one for Worker) with `maxRetriesPerRequest: null` as required by BullMQ.
- **Circular dependency** — `SubscriptionsService` and `NotificationsService` reference each other; resolved with NestJS `forwardRef()`.
- **DB access pattern** — `private get db() { return this.prisma as any; }` used across services to avoid TypeScript inference limitations with the generated Prisma 7 client.
- **Prisma CJS patch** — after every `prisma generate`, `generated/prisma/client.ts` requires a CJS-safe `__dirname` guard for compatibility with NestJS's CommonJS output.

---

## Code Architecture & Developer Notes

### Backend Module Map

```
AppModule
├── PrismaModule (@Global)      — PostgreSQL via Prisma 7 + pg pool adapter
├── RedisModule  (@Global)      — ioredis shared client (OTP, pricing, matching locks)
├── SmsModule    (@Global)      — Africa's Talking SMS
├── EmailModule  (@Global)      — Resend transactional email
├── AuthModule                  — OTP + password auth, JWT dual-token strategy
├── UsersModule                 — Customer profile, saved addresses, business account
├── RidersModule                — Rider profile, KYC, online toggle, earnings
├── OrdersModule ←→ MatchingModule (forwardRef circular)
│   └── MapsModule              — Google Maps Distance Matrix (Haversine fallback)
├── MatchingModule              — 5-step geo+EMA matching, Socket.io, BullMQ 30s timeout
├── TrackingModule              — GPS log, ETA calc, route trail
├── PaymentsModule              — Paystack + OPay, HMAC webhook, commission split
├── SubscriptionsModule         — Rider/business plans, BullMQ hourly expiry cron
├── ChatModule                  — Socket.io /chat namespace, call logs
├── NotificationsModule         — FCM push + SMS, per-order event fan-out
└── AdminModule                 — Dashboard, KYC review, disputes, finance, pricing
```

### Matching Algorithm (5 Steps)

1. **Premium detection** — if `order.isPremium`, only FLEET-type riders are considered
2. **Geo filter** — Haversine SQL (`$queryRawUnsafe`) finds riders within 3 km who are `isOnline=true` and `verificationStatus=VERIFIED`
3. **Ranking** — sorted by `acceptanceRate DESC`, `avgResponseTime ASC` (both use EMA α=0.1 so one bad outcome doesn't dominate history)
4. **Request dispatch** — Redis `setNx` lock with 30s TTL prevents double-dispatch; Socket.io emits `job_request` to rider personal room `user:{userId}`; BullMQ enqueues a `rider-timeout` delayed job
5. **Timeout / fallback** — if the rider doesn't respond within 30s, `MatchingProcessor` fires `riderRejected()` which advances to the next candidate; if all candidates are exhausted, `no_riders_available` is emitted to the customer

### Dynamic Pricing Formula

```
finalPrice = (baseFare + distanceKm × perKmRate) × surgeMultiplier
```

- Redis keys: `config:baseFare` (₦300 default), `config:perKmRate` (₦120), `config:surgeMultiplier` (1.0)
- Admin can update via `PATCH /admin/pricing` — takes effect immediately on the next order, no server restart needed
- `GET /orders/estimate` uses Haversine (fast, no API key); `POST /orders` uses Google Maps Distance Matrix (accurate road distance)

### Payment Flow

```
POST /orders/pay              → initiatePayment() → redirect to Paystack/OPay checkout
POST /payments/paystack/webhook → verifyWebhookSignature() → splitAndCredit()
POST /payments/cash-confirm   → confirmCashPayment() → splitAndCredit()
```

Commission split inside `splitAndCredit()`:
- Standard rider: platform 15%, rider 85%
- Subscribed rider: platform 5%, rider 95%
- Idempotent via Prisma `upsert` — safe to call twice on duplicate webhook delivery

### Token Strategy

- **Access token** — JWT, 30-day expiry, contains `{ sub, phone, role }`
- **Refresh token** — JWT, 1-year expiry, stored in `User.refreshToken` DB column
- **Silent refresh** — frontend Axios 401 interceptor exchanges refresh token transparently; concurrent 401s deduplicated via module-level `refreshing` promise
- **Logout** — clears `User.refreshToken` in DB and removes both localStorage + cookie tokens

### Frontend Route Groups

```
(auth)/     — unauthenticated: welcome, role picker, OTP, profile completion, KYC status
(user)/     — customers: home, booking wizard (type→address→confirm), tracking, history, settings
(rider)/    — riders: home, delivery lifecycle (request→navigate→pickup→transit→complete), earnings
(admin)/    — operators: dashboard, operations, trips, riders, payments, pricing, settings
shared/     — cross-role: about, support, menu
```

### Key Redis Key Namespaces

| Prefix | TTL | Purpose |
|--------|-----|---------|
| `otp:{phone}` | 10 min | Registration/login OTP |
| `forgot:{phone}` | 10 min | Password reset OTP |
| `match:{orderId}:{riderId}` | 30s | Rider dispatch lock (prevents double-send) |
| `match:{orderId}:candidates` | 5 min | Candidate list for multi-step fallback |
| `config:baseFare` | none | Dynamic pricing — base fare |
| `config:perKmRate` | none | Dynamic pricing — per km rate |
| `config:surgeMultiplier` | none | Dynamic pricing — surge multiplier |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_SECRET` | Yes | JWT signing secret |
| `PAYSTACK_SECRET_KEY` | Prod | Paystack secret key |
| `OPAY_SECRET_KEY` | Prod | OPay secret key |
| `OPAY_MERCHANT_ID` | Prod | OPay merchant ID |
| `GOOGLE_MAPS_API_KEY` | Prod | Distance Matrix API (falls back to 5.2km mock) |
| `AFRICAS_TALKING_API_KEY` | Prod | SMS gateway |
| `AFRICAS_TALKING_USERNAME` | Prod | SMS username (default: sandbox) |
| `RESEND_API_KEY` | Prod | Transactional email |
| `FCM_SERVER_KEY` | Prod | Firebase Cloud Messaging OAuth2 token |
| `FCM_PROJECT_ID` | Prod | Firebase project ID |
| `APP_URL` | Prod | Public frontend URL for payment callbacks |

---

## License

Private — all rights reserved.
