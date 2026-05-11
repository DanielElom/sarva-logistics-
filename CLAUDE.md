# Fair-Ride Logistics — Claude Code Briefing

## What this project is
Full-stack logistics dispatch PWA. Similar to Bolt but for package delivery in Abuja, Nigeria.

## Ports
- Backend (NestJS): localhost:3001
- Frontend (Next.js 16): localhost:3000
- PostgreSQL: localhost:5432/fairride
- Redis: localhost:6379

## Start commands
- Backend: cd ~/Documents/fair-ride/backend && pnpm start:dev
- Frontend: cd ~/Documents/fair-ride/frontend && pnpm dev
- Both DBs should already be running via Homebrew services

## Tech stack
- Backend: NestJS + TypeScript + Prisma 7 + PostgreSQL + Redis + BullMQ + Socket.io
- Frontend: Next.js 16 + TypeScript + Tailwind v4 + Zustand + Socket.io client
- Payments: Paystack + Opay
- Email: Resend (RESEND_API_KEY in backend/.env)
- Maps: Google Maps (empty key = mock fallback)

## Critical conventions — DO NOT break these
1. Tailwind v4 config lives in frontend/src/app/globals.css via @theme — NOT tailwind.config.ts
2. All API calls go through frontend/src/lib/api.ts (has JWT + refresh token interceptors)
3. Auth token is stored in BOTH localStorage AND document.cookie (cookie needed for proxy.ts SSR middleware)
4. All user/business screens wrap in ScreenWrapper (max-w-107.5 mobile shell)
5. All admin screens use AdminWrapper (full-width desktop layout)
6. Follow 15 conversion rules in frontend/src/lib/convert-stitch.ts for any new screens
7. Guard pattern: no token → /welcome, wrong role → their home screen

## Route groups (Next.js — no URL impact)
- (auth) → /welcome, /login, /register/*, /status/*
- (user) → /home, /book/*, /tracking/*, /history, /settings, /receipt/*
- (rider) → /rider/*
- (admin) → /admin/*
- shared → /shared/*

## Role routing
- INDIVIDUAL/VENDOR/RESTAURANT/CORPORATE → /home or /business/dashboard
- RIDER → /rider/home
- ADMIN → /admin/dashboard

## Database
- 16 tables in PostgreSQL fairride database
- Prisma 7 with CJS adapter patch in backend/prisma/prisma.service.ts
- Run migrations: cd backend && npx prisma migrate dev

## Current build status
MVP complete. 79 screens built. Documentation pass complete. Pre-deployment.

## Do NOT
- Change the OTP→password auth flow (intentional product decision)
- Use tailwind.config.ts (Tailwind v4 uses globals.css)
- Install packages without checking if already present in package.json
- Change the cookie sync logic in auth.store.ts
- Remove the CJS patch in prisma.service.ts (Prisma 7 requirement)
