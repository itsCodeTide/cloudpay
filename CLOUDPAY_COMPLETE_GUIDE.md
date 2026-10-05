# CloudPay — Complete Setup, Run & Deploy Guide

> **Status:** Frontend ✅ Working | Backend needs DB credentials | Razorpay needs Key Secret

---

## 🔑 Step 1: Fill In Your Credentials (REQUIRED)

Open [`.env.local`](file:///c:/Users/LABH/Downloads/cloud-pay-fintech-web-app/.env.local) and fill in these values:

### A) Razorpay Key Secret
You have the **Key ID**: `rzp_test_Tj43ge6CFq9oFL`  
You need the **Key Secret** — get it from:
1. Go to [https://dashboard.razorpay.com/app/keys](https://dashboard.razorpay.com/app/keys)
2. Click **"Reveal"** next to your test key
3. Copy the Key Secret and paste it in `.env.local`:
```
RAZORPAY_KEY_SECRET=rzp_test_your_secret_here
```

### B) Supabase Database Connection
Get from: [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → **Connect** → **Transaction Pooler** tab

```
SUPABASE_DB_URL=jdbc:postgresql://aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require
SUPABASE_DB_USER=postgres.qqqrziqluolfidyelgvr
SUPABASE_DB_PASSWORD=your_database_password
```

> [!IMPORTANT]
> Without the DB credentials, the backend cannot start. The frontend login/register will fail with connection errors.

### C) Run the Database Schema
1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/qqqrziqluolfidyelgvr/sql)
2. Paste the contents of [`supabase/schema.sql`](file:///c:/Users/LABH/Downloads/cloud-pay-fintech-web-app/supabase/schema.sql)
3. Click **Run**

### D) Disable Supabase Rate Limiting (Email Confirmations)
In Supabase Dashboard → **Authentication** → **Email** tab:
- Set **"Email Confirmations"** to **OFF** (so you can login without verifying email)
- Or under **Rate Limits**, increase the limits

---

## 🚀 Step 2: Run Everything (Single Command)

```powershell
# Open PowerShell in the project directory, then:
npm run start:all
```

This single command will:
1. ✅ Load all environment variables from `.env.local`
2. ✅ Start the **Spring Boot backend** on port 8080
3. ✅ Start the **Next.js frontend** on port 3000
4. ✅ Wait for both services to be ready
5. ✅ Open your browser automatically

### Manual Start (Alternative)

**Terminal 1 — Backend:**
```powershell
cd backend
# Windows (no Maven installed):
.\mvnw.cmd spring-boot:run -Dspring-boot.run.jvmArguments="-DSUPABASE_URL=https://qqqrziqluolfidyelgvr.supabase.co -DSUPABASE_PUBLISHABLE_KEY=sb_publishable_oEzUovLWW2ExsiASnsDXSA_plr38vLC -DSUPABASE_JWKS_URL=https://qqqrziqluolfidyelgvr.supabase.co/auth/v1/.well-known/jwks.json -DSUPABASE_DB_URL=YOUR_DB_URL -DSUPABASE_DB_USER=YOUR_DB_USER -DSUPABASE_DB_PASSWORD=YOUR_DB_PASSWORD -DCORS_ALLOWED_ORIGINS=http://localhost:3000 -DCLOUDPAY_REDIS_ENABLED=false -DCLOUDPAY_EVENTS_ENABLED=false"
```

**Terminal 2 — Frontend:**
```powershell
pnpm run dev
# Open: http://localhost:3000
```

---

## 💳 Step 3: How to Transfer Money (UPI Flow)

### Method 1: UPI ID Transfer (CloudPay → CloudPay)
1. **Login** with your account
2. **Generate your UPI ID**: Click Profile → "Generate UPI ID" → You get e.g. `rahul@cloudpay`
3. **Add Bank Account**: Dashboard → Banking → Add Account (set a balance for testing)
4. Click **"Send Money"** in the sidebar
5. Enter receiver's **UPI ID** (e.g., `john@cloudpay`)
6. Enter **amount** and optional remark
7. Click **"Send Securely"** → Money transfers instantly!

### Method 2: Razorpay UPI/Card Payment
1. Click **"Send Money"** and select **"Pay via Razorpay"**
2. Razorpay checkout opens — supports:
   - UPI (Google Pay, PhonePe, BHIM, Paytm)
   - Credit/Debit Cards
   - Net Banking
3. In **test mode**, use:
   - **Test UPI ID**: `success@razorpay`
   - **Test Card**: `4111 1111 1111 1111`, Expiry: any future date, CVV: `123`

### Method 3: QR Payment
1. Go to **"Receive Money"** → Your QR code appears
2. The other user scans it or pastes the payload in **"QR Payment"**

---

## ☁️ Step 4: Deploy to Cloud

### Option A: Vercel (Frontend) + Railway (Backend) — Recommended

#### Deploy Frontend to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set these environment variables in Vercel Dashboard:
# NEXT_PUBLIC_SUPABASE_URL=https://qqqrziqluolfidyelgvr.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_oEzUovLWW2ExsiASnsDXSA_plr38vLC
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_oEzUovLWW2ExsiASnsDXSA_plr38vLC
# NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1
# NEXT_PUBLIC_AUTH_CALLBACK_URL=https://your-app.vercel.app/auth/callback
# NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_Tj43ge6CFq9oFL
# RAZORPAY_KEY_ID=rzp_test_Tj43ge6CFq9oFL
# RAZORPAY_KEY_SECRET=your_secret
```

#### Deploy Backend to Railway
1. Go to [railway.app](https://railway.app) → New Project → **Deploy from GitHub**
2. Point to the `/backend` folder (or use `RAILWAY_ROOT_DIR=backend`)
3. Add these environment variables in Railway:
```
SUPABASE_URL=https://qqqrziqluolfidyelgvr.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_oEzUovLWW2ExsiASnsDXSA_plr38vLC
SUPABASE_JWKS_URL=https://qqqrziqluolfidyelgvr.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_DB_URL=your_supabase_db_url
SUPABASE_DB_USER=your_db_user
SUPABASE_DB_PASSWORD=your_db_password
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
JWT_SECRET=generate_a_64_char_random_string
CLOUDPAY_REDIS_ENABLED=false
CLOUDPAY_EVENTS_ENABLED=false
SERVER_PORT=8080
```

### Option B: Docker Compose (Local/VPS)
```bash
# Fill .env.local first, then:
docker-compose up --build -d

# Services:
# Frontend: http://localhost:3000
# Backend:  http://localhost:8080
# Swagger:  http://localhost:8080/swagger-ui.html
```

---

## 🔧 Troubleshooting

| Problem | Fix |
|---------|-----|
| "Authentication required" on login | Backend not running — check `.runtime-logs/backend.err.log` |
| "Invalid email or password" | Check email confirmation is OFF in Supabase Auth settings |
| "Supabase rate limited" | Wait 1 hour OR go to Supabase → Auth → Rate Limits → increase limits |
| Backend won't start | DB credentials missing in `.env.local` |
| Payment fails | Add Razorpay Key Secret to `.env.local` |
| Google Sign-In fails | Add `http://localhost:3000` to Supabase → Auth → URL Configuration → Redirect URLs |

---

## 📋 What's Been Fixed

- ✅ **Login page** — complete rewrite with Google Pay-like design, show/hide password, proper error messages
- ✅ **Register page** — same premium design, all fields validated, Google OAuth working
- ✅ **Auth context** — fixed session restoration, Supabase OAuth state listener, proper token management
- ✅ **Supabase client** — supports both old and new publishable key format
- ✅ **Rate limiting** — removed from code; disable email confirmation in Supabase dashboard
- ✅ **Razorpay integration** — server API route + frontend service + UPI/card support + demo mode
- ✅ **Backend** — Kafka and Redis disabled by default (no services needed locally)
- ✅ **CORS** — fixed to allow frontend origin with proper headers
- ✅ **Maven wrapper** — added `mvnw.cmd` so you can build without installing Maven globally
- ✅ **Single command** — `npm run start:all` runs everything

---

## 🗂️ Project Structure

```
cloud-pay-fintech-web-app/
├── app/                    # Next.js pages
│   ├── login/page.tsx      # ✅ Fixed login page
│   ├── register/page.tsx   # ✅ Fixed register page
│   ├── auth/callback/      # OAuth callback handler
│   └── api/razorpay/       # ✅ NEW: Razorpay API route
├── frontend/
│   ├── lib/
│   │   ├── auth-context.tsx # ✅ Fixed auth context
│   │   └── supabase.ts      # ✅ Fixed Supabase client
│   └── services/
│       └── razorpay.service.ts # ✅ NEW: Razorpay service
├── backend/                # Spring Boot API
│   ├── mvnw.cmd            # ✅ NEW: Maven wrapper
│   └── src/main/java/com/cloudpay/
│       ├── CloudPayApplication.java  # ✅ Fixed (Kafka/Redis excluded)
│       └── infrastructure/security/ # ✅ Fixed SecurityConfig
├── supabase/schema.sql     # Run this in Supabase SQL editor
├── .env.local              # ✅ Updated with your credentials
└── scripts/run-all.ps1     # ✅ Fixed single-command startup
```
UPSTASH_REDIS_REST_URL="https://intense-turkey-185379.upstash.io"
