# Free Cloud Deployment Guide

For deploying both the Next.js frontend and Spring Boot backend together on Render, use [Full Render deployment](./RENDER_FULL_DEPLOYMENT.md). This guide remains the minimal Vercel + Supabase path.

This guide deploys the current CloudPay project with no planned monthly infrastructure charge:

- **Vercel Hobby**: Next.js frontend and the `/api/*` routes used by the UI.
- **Supabase Free**: PostgreSQL, Auth, and Storage.
- **Optional Render Free**: the separate Spring Boot API in `backend/`.
- **Aiven Free Kafka**: Kafka REST events through the `KAFKA_REST_*` variables.

This is suitable for a demo, college project, and small test group. It is not a production banking or UPI settlement deployment. Render free services sleep after inactivity, Supabase free projects can be paused, and free plans have usage limits.

## 1. Security preparation

Before pushing the repository:

1. Rotate any Supabase database password, Supabase secret/service-role key, and Razorpay secret that has ever been pasted into chat, logs, screenshots, or a committed file.
2. Keep `.env.local` untracked. It is already ignored by this repository.
3. Never put `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD`, `RAZORPAY_KEY_SECRET`, or `JWT_SECRET` in a `NEXT_PUBLIC_*` variable.
4. Use Razorpay test keys for the demo. Do not enable real-money payments until provider webhooks, reconciliation, limits, KYC/AML, and licensing are implemented.

The server-side Supabase client now fails closed when its secret environment variable is missing. Do not restore hardcoded credential fallbacks.

## 2. Prepare Supabase

Create a Supabase project and copy these values from the Supabase Dashboard:

```text
Project URL
Publishable key (or legacy anon key)
Secret key (or legacy service-role key)
Database transaction-pooler URL
Database user
Database password
```

For a **new** project used only by this deployment, open SQL Editor and run:

```text
supabase/schema.sql
```

For an existing project that already has the Flyway migrations applied, do not run the schema file again. The current local database is already at migration v7. Use one migration strategy per database.

In Authentication → URL Configuration, add:

```text
https://YOUR-VERCEL-DOMAIN.vercel.app/auth/callback
```

Also configure email confirmation and any OAuth provider redirect URL required by your Supabase project.

## 3. Deploy the Next.js application to Vercel

1. Push the repository to a private GitHub repository.
2. Open Vercel → **Add New Project** → import the repository.
3. Keep the project root at the repository root. Do not select `backend` as the root.
4. The included `vercel.json` sets the build command to `pnpm run build`.
5. Add the following Environment Variables in Vercel. Add them to Production, Preview, and Development as appropriate:

```text
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_KEY
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=YOUR_SERVER_ONLY_SECRET_KEY
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=YOUR_SERVER_ONLY_RAZORPAY_SECRET
```

6. Deploy. Vercel will build the Next.js app and expose the application and its `/api/*` routes on one domain.
7. Return to Supabase and add the final Vercel URL to the Auth redirect URLs.

The current UI calls the Next.js `/api/*` routes directly, so `NEXT_PUBLIC_API_URL` is not required for the main web experience. It can remain configured for separate Spring Boot API clients.

## 4. Optional Spring Boot API on Render

The main web UI does not require the separate Java service, but the repository includes a Render Blueprint for it:

1. Open Render → **New** → **Blueprint**.
2. Connect the GitHub repository and select `render.yaml`.
3. Render will use `backend/Dockerfile`, port `8080`, and `/actuator/health`.
4. Enter every `sync: false` value in the Render dashboard:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
SUPABASE_JWKS_URL
SUPABASE_ISSUER_URI
SUPABASE_DB_URL
SUPABASE_DB_USER
SUPABASE_DB_PASSWORD
CORS_ALLOWED_ORIGINS=https://YOUR-VERCEL-DOMAIN.vercel.app
```

5. The application will run Flyway migrations on startup. Confirm the Render logs show the schema version and `Started CloudPayApplication`.
6. Verify:

```text
https://YOUR-RENDER-DOMAIN.onrender.com/actuator/health
https://YOUR-RENDER-DOMAIN.onrender.com/v3/api-docs
```

The free Render service sleeps after 15 minutes without traffic and the first request after sleeping is slow. Do not use it for real financial traffic.

## 5. One-command Vercel deployment

After installing Node.js, pnpm, and logging into the Vercel CLI, run from the repository root:

```powershell
.\scripts\deploy-free.ps1 -DeployVercel
```

The script:

1. Confirms it is in the repository.
2. Refuses to continue if `.env.local` is tracked.
3. Installs the locked dependencies.
4. Runs the production build.
5. Starts `vercel --prod` without reading or printing secret values.

Without the switch, it only validates and prints the next deployment steps:

```powershell
.\scripts\deploy-free.ps1
```

Render cannot safely be fully configured by a repository script because its secret values must be entered in the Render dashboard. The included `render.yaml` creates the service shape and asks for those values securely.

## 6. Free-tier limitations

- Vercel Hobby is intended for personal/non-commercial use and has platform usage limits.
- Supabase Free has limited database/storage/egress capacity and may pause inactive projects.
- Render Free sleeps when idle and has limited monthly instance hours.
- Redis is optional for this demo; the app has an in-memory fallback. Use managed Redis only when running multiple instances or requiring shared rate limits.
- CloudFront, WAF, ALB, ECS, SQS, CloudWatch, S3 backup, and multi-region disaster recovery should be added when moving to a paid production architecture.

## 7. Smoke-test checklist

After deployment:

1. Register and confirm a user.
2. Configure a transaction PIN.
3. Add/select a bank account and UPI ID.
4. Confirm the dashboard does not expose balance before PIN verification.
5. Check monthly spending and income.
6. Edit name, phone, and email.
7. Submit KYC and confirm the status is stored.
8. Test Swagger/OpenAPI and the notification flow.
9. Check Vercel and Render logs for secrets, SQL errors, and failed migrations.
