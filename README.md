# CloudPay — UPI Payment Platform

Full-stack fintech application with Supabase authentication, real-time wallet transfers, Razorpay integration, and a Next.js 16 frontend.

## ✅ Current Status — All Systems Working

| Service | Status | URL |
|---------|--------|-----|
| Frontend (Next.js 16) | ✅ Live | http://localhost:3000 |
| Backend API (Spring Boot) | ✅ Live | http://localhost:8080 |
| Database (Supabase PostgreSQL) | ✅ Connected | Cloud |
| Auth (Supabase Auth) | ✅ Working | Email/Password |

## Monorepo Layout

```
├── app/           Next.js App Router pages + API routes (auth, payments, dashboard)
├── frontend/      Shared client services, auth context, Supabase helpers
├── backend/       Spring Boot 3 · Java 21 · Supabase PostgreSQL
├── supabase/      Database schema (schema.sql)
└── scripts/       Startup scripts
```

## Features

| Module | Capabilities |
|--------|-------------|
| **Auth** | Register, Login (Email/Password), OAuth-ready JWT |
| **Users** | Profile, Auto-generate UPI ID (name@cloudpay) |
| **Banking** | Auto-seeded bank account (₹50,000 test balance) |
| **Payments** | UPI Transfer (instant ledger), Transaction History |
| **QR** | Generate payment QR, Pay via QR payload |
| **Razorpay** | Gateway integration (test mode) |

## Tech Stack

**Frontend:** Next.js 16, TypeScript, Tailwind CSS, ShadCN UI  
**Backend:** Spring Boot 3, Java 21, Supabase PostgreSQL  
**Auth & DB:** Supabase (Auth + PostgreSQL with RLS)  
**Payments:** Razorpay (test keys configured)

## Quick Start

### ⚡ One-Command Startup (Frontend + Backend)

```powershell
pnpm run start:all
```

*Or start just the frontend (no Java required):*
```powershell
pnpm dev
# Open: http://localhost:3000
```

> **The app works without the Spring Boot backend** — all auth, payments, and data are handled by Next.js API routes talking directly to Supabase.

### 🛠️ Full Stack (with Spring Boot backend)

```powershell
# Terminal 1 — Frontend
pnpm dev

# Terminal 2 — Backend
cd backend
.\mvnw.cmd spring-boot:run

# Docker
docker compose up --build
```

## Architecture: How It Works

```
Browser → Next.js (/api/* routes) → Supabase (Auth + PostgreSQL)
                                  → Razorpay (payment gateway)
```

All API routes live in `app/api/`:
- `POST /api/auth/register` — creates user in Supabase Auth + public.users + seeds ₹50,000 bank account
- `POST /api/auth/login` — authenticates via Supabase, returns JWT
- `POST /api/auth/sync` — syncs OAuth sessions (Google)
- `GET  /api/users/me` — current user profile
- `GET  /api/dashboard` — balance + stats
- `POST /api/users/upi-id` — generate UPI ID
- `POST /api/transactions/send` — atomic wallet transfer
- `GET  /api/transactions` — paginated history
- `GET  /api/qr/generate` — UPI QR payload
- `POST /api/qr/pay` — pay via QR
- `POST /api/razorpay` — create Razorpay order
- `PUT  /api/razorpay` — verify payment signature

## Money Transfer Flow

1. **Register / Login** at http://localhost:3000
2. Your account is auto-created with:
   - UPI ID: `yourname@cloudpay`
   - Test bank balance: **₹50,000**
3. **Send money**: Sidebar → Send Money → Enter receiver's UPI ID → Amount → Send
4. **Receive money**: Your QR code shows under "Receive Money"
5. **Test accounts** available: `alex@cloudpay`, `labh@cloudpay`

## Important Notes

- Money transfer is **internal CloudPay-to-CloudPay ledger** — not real bank settlement
- For real UPI settlement you need NPCI registration + bank partnership
- Razorpay in test mode: use `success@razorpay` as test UPI, or card `4111 1111 1111 1111`

## License

MIT
