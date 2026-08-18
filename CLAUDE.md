# Sarva Logistics — Claude Code Briefing

## What this project is
Full-stack logistics dispatch PWA. Package delivery app for Abuja, Nigeria.
Similar to Bolt but for deliveries. Single app with role-based routing.

## Roles
- INDIVIDUAL → books deliveries → /home
- VENDOR / RESTAURANT / CORPORATE → business accounts → /business/dashboard
- RIDER → accepts + completes deliveries → /rider/home
- ADMIN → manages everything → /admin/dashboard

## Ports
- Backend (NestJS):  localhost:3001
- Frontend (Next.js): localhost:3000
- PostgreSQL:         localhost:5432/fairride
- Redis:             localhost:6379

## Start commands
```bash
# Backend
cd ~/Documents/fair-ride/backend && pnpm start:dev

# Frontend
cd ~/Documents/fair-ride/frontend && pnpm dev

# Check PostgreSQL
brew services list | grep postgresql

# Check Redis
redis-cli ping
```

## Tech stack
- Backend:  NestJS + TypeScript + Prisma 7 + PostgreSQL + Redis + BullMQ + Socket.io
- Frontend: Next.js 16 + TypeScript + Tailwind v4 + Zustand + Socket.io client
- Email:    Resend (RESEND_API_KEY in backend/.env)
- Payments: Paystack + Opay (keys in backend/.env)
- Maps:     Google Maps API (empty key = mock fallback in dev)
- SMS:      Africa's Talking (empty key = console log fallback in dev)

## Project structure
sarva/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        ← all 16 DB models + enums
│   │   └── migrations/          ← migration history
│   ├── src/
│   │   ├── auth/                ← OTP + JWT + password flows
│   │   ├── users/               ← user profiles + KYC
│   │   ├── riders/              ← rider profiles + wallet
│   │   ├── orders/              ← booking + lifecycle
│   │   ├── matching/            ← matching engine + Socket.io gateway
│   │   ├── tracking/            ← GPS logging + ETA
│   │   ├── payments/            ← Paystack + Opay + splits
│   │   ├── subscriptions/       ← plans + billing + cron
│   │   ├── notifications/       ← FCM + email + SMS
│   │   ├── chat/                ← messages + call logs
│   │   ├── admin/               ← dashboard APIs
│   │   ├── prisma/              ← global PrismaService
│   │   ├── redis/               ← global RedisService
│   │   ├── email/               ← Resend email service
│   │   └── sms/                 ← Africa's Talking SMS
│   └── .env                     ← ALL backend secrets live here
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/          ← /welcome /login /register /status
│   │   │   ├── (user)/          ← /home /book /tracking /history /settings
│   │   │   ├── (rider)/         ← /rider/*
│   │   │   ├── (admin)/         ← /admin/*
│   │   │   └── shared/          ← /shared/support /shared/about
│   │   ├── components/
│   │   │   ├── layout/          ← ScreenWrapper AdminWrapper NavigationDrawer BottomNav
│   │   │   └── ui/              ← Button Input Card StatusBadge Logo
│   │   ├── stores/
│   │   │   ├── auth.store.ts    ← user + token + role + pendingProfile
│   │   │   ├── booking.store.ts ← multi-step booking state
│   │   │   └── order.store.ts   ← active order + rider location
│   │   └── lib/
│   │       ├── api.ts           ← Axios instance + JWT interceptor + refresh
│   │       └── socket.ts        ← Socket.io client factory
│   └── .env.local               ← NEXT_PUBLIC_* keys live here
│
├── README.md                    ← full project documentation
├── CLAUDE.md                    ← this file
└── PROGRESS.md                  ← build log + known issues

## Critical conventions — NEVER break these

### 1. Tailwind v4
Config lives in `frontend/src/app/globals.css` via `@theme` blocks.
There is NO `tailwind.config.ts` — do not create one.
All color tokens: primary, surface, on-surface, etc. are defined there.

### 2. Auth token dual storage
Token is stored in BOTH `localStorage` AND `document.cookie`.
Cookie name: `sarva-token`
This is intentional — Next.js `src/middleware.ts` reads the cookie for SSR route protection.
Do not remove the cookie sync from `auth.store.ts`.

### 3. API calls
All API calls go through `src/lib/api.ts`.
It has JWT attachment + silent refresh token interceptor built in.
Never use raw `fetch()` — always use the `api` instance.

### 4. Screen wrappers
- User + rider screens → wrap in `<ScreenWrapper>` (430px mobile shell)
- Admin screens → wrap in `<AdminWrapper>` (full-width desktop)
- Never mix them up

### 5. Route guards
Every protected screen must have this pattern at the top:
```typescript
const { isAuthenticated, role } = useAuthStore()
useEffect(() => {
  if (!isAuthenticated) router.replace('/welcome')
  if (role === 'RIDER') router.replace('/rider/home')
}, [isAuthenticated, role])
```

### 6. Prisma 7 CJS patch
`backend/src/prisma/prisma.service.ts` has a CJS compatibility patch.
Do not remove or modify it — Prisma 7 requires it.

### 7. New screen checklist
When adding a new screen:
- [ ] Add `'use client'` at top
- [ ] Wrap in correct wrapper (ScreenWrapper or AdminWrapper)
- [ ] Add auth guard
- [ ] Follow 15 rules in `src/lib/convert-stitch.ts`
- [ ] Add to `src/middleware.ts` public routes if pre-auth screen
- [ ] Add `@page` JSDoc comment at top

### 8. Adding a backend module
- [ ] Create module + service + controller + DTOs
- [ ] Add to `app.module.ts`
- [ ] Add `@module` JSDoc to module file
- [ ] Add `@route` JSDoc to every controller endpoint
- [ ] Add `@param`/`@returns` JSDoc to every service method

## Key business logic locations

| Logic | File |
|-------|------|
| Pricing formula | `backend/src/orders/orders.service.ts` → `createOrder()` |
| Commission split | `backend/src/payments/payments.service.ts` → `splitAndCredit()` |
| Matching algorithm | `backend/src/matching/matching.service.ts` → `findMatch()` |
| OTP flow | `backend/src/auth/auth.service.ts` → `requestOtp()` |
| Token strategy | `backend/src/auth/auth.service.ts` → `generateTokens()` |
| GPS tracking | `backend/src/tracking/tracking.service.ts` → `logLocation()` |
| Subscription expiry | `backend/src/subscriptions/subscriptions.processor.ts` |
| Dynamic pricing config | Redis keys: `config:baseFare`, `config:perKmRate`, `config:surgeMultiplier` |

## Socket.io events reference

### Matching gateway (namespace: /)
| Event | Direction | Description |
|-------|-----------|-------------|
| `join_order` | client→server | Join order room for updates |
| `location_update` | client→server | Rider sends GPS position |
| `job_request` | server→client | Rider receives new job |
| `order_assigned` | server→client | User notified rider accepted |
| `no_riders_available` | server→client | No riders found nearby |
| `rider_location` | server→client | Broadcast rider position to user |

### Chat gateway (namespace: /chat)
| Event | Direction | Description |
|-------|-----------|-------------|
| `join_order_chat` | client→server | Join chat room for order |
| `send_message` | client→server | Send chat message |
| `new_message` | server→client | Broadcast message to room |
| `leave_order_chat` | client→server | Leave chat room |

## Redis keys reference
| Key | Value | TTL |
|-----|-------|-----|
| `otp:{phone}` | 6-digit OTP | 10 minutes |
| `forgot:{phone}` | 6-digit OTP | 10 minutes |
| `match:{orderId}:{riderId}` | lock string | 30 seconds |
| `config:baseFare` | ₦300 | none |
| `config:perKmRate` | ₦120 | none |
| `config:surgeMultiplier` | 1.0 | none |

## Environment variables

### Backend (`backend/.env`)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fairride
JWT_SECRET=
REDIS_URL=redis://localhost:6379
GOOGLE_MAPS_API_KEY=          ← empty = mock 5.2km fallback
PAYSTACK_SECRET_KEY=          ← empty = mock payment response
OPAY_SECRET_KEY=              ← empty = mock payment response
TWILIO_ACCOUNT_SID=           ← not yet implemented
TWILIO_AUTH_TOKEN=            ← not yet implemented
AFRICAS_TALKING_API_KEY=      ← empty = console log OTP
FCM_SERVER_KEY=               ← empty = console log notification
RESEND_API_KEY=               ← SET - email OTP working

### Frontend (`frontend/.env.local`)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=   ← empty = SVG map placeholder
NEXT_PUBLIC_API_URL=http://localhost:3001

## Current status
MVP complete. All 59 screens built across 4 role flows.
Documentation pass complete. Pre-deployment manual testing in progress.

## Known issues (tech debt)
- Google Maps → mock placeholder (needs real API key)
- Africa's Talking → console fallback (needs real API key for production)
- FCM push notifications → not configured (needs Firebase setup)
- S3 file uploads → base64 in dev (needs AWS S3 for production)
- PDF receipt → toast 'coming soon' (not implemented)
- PostGIS → using Haversine formula (PostGIS upgrade marked in code)
- Twilio VOIP → not implemented (in-app calls show placeholder)

## Next steps
1. Manual testing of all 4 role flows
2. Fix any bugs found during testing
3. Deploy backend to Railway
4. Deploy frontend to Railway
5. Configure production environment variables
6. Wire real API keys (Google Maps, Paystack, Africa's Talking)
7. Set up custom domain
