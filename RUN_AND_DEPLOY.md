# CloudPay: Run, Configure, Deploy, and Transfer Money

This guide covers the working local setup and a low-cost cloud deployment. CloudPay is currently a wallet simulator: it moves balances inside the application database. It does not connect to a bank or settle real UPI funds until a licensed payment provider and compliance flow are added.

## Recommended deployment

Use **Vercel for the Next.js frontend**, **Google Cloud Run for the Spring Boot API**, and **Supabase for Auth/PostgreSQL**. Cloud Run can scale to zero and has a request-based free tier, but Google still requires billing setup and usage beyond the free tier can cost money. AWS ECS/Fargate is also production-capable, but it bills the underlying compute and is not the best free-first option for this small deployment.

- Cloud Run pricing: https://cloud.google.com/run/pricing
- Cloud Run overview: https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run
- AWS ECS pricing: https://aws.amazon.com/ecs/pricing/

Redis and Kafka are optional integrations. Kafka publishes completed-payment events; Redis is available for future shared cache/session workloads. The application no longer rate-limits login or signup. Managed Redis/Kafka services are not guaranteed to be free.

## 1. Local prerequisites

- Java 21
- Maven 3.9+
- Node.js 20+
- pnpm
- Docker Desktop (needed for the complete Compose stack)
- A Supabase project

The backend build is intentionally run with Java 21. If the IDE reports Lombok errors such as `TypeTag.UNKNOWN`, set the project SDK and Maven runner to Java 21, reload the Maven project, and restart the IDE index.

## 2. Local run

### Option A: run the full stack with Docker

1. Copy `.env.example` to `.env` and fill in the Supabase publishable key.
2. Start the services:

```powershell
docker compose up --build
```

The services are available at:

- Frontend: http://localhost:3000
- API: http://localhost:8080
- Swagger: http://localhost:8080/swagger-ui.html
- Health: http://localhost:8080/actuator/health

Compose starts PostgreSQL, Redis, Kafka, the API, and the frontend. The Compose database is separate from Supabase.

### Option B: run Next.js and Spring Boot locally

Start PostgreSQL on port `5433` with database/user `cloudpay` and password `cloudpay_secret`, or change the `DB_*` values in `backend/src/main/resources/application.yml`.

```powershell
npm install
npm run start:all
```

The single command starts both the Next.js frontend and Spring Boot backend. The local script reads `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from `.env.local` and does not commit secrets to source control. Redis and Kafka are disabled in this mode unless you set `CLOUDPAY_REDIS_ENABLED=true` and `CLOUDPAY_EVENTS_ENABLED=true` and run those services.

To store application data in Supabase during this run, add `SUPABASE_DB_URL`, `SUPABASE_DB_USER`, and `SUPABASE_DB_PASSWORD` to `.env.local`. If they are absent, the script uses the local PostgreSQL fallback on port `5433`.

## 3. Supabase setup

For a fresh Supabase project, open **SQL Editor**, paste the complete contents of [`supabase/schema.sql`](supabase/schema.sql), and run it once. That script creates the application tables, foreign keys, indexes, audit columns, triggers, and RLS policies.

Do not run the standalone Supabase schema blindly against a database already managed by Flyway. The local Spring profile uses the migrations in `backend/src/main/resources/db/migration`.

In Supabase Authentication:

1. Enable Email provider.
2. Decide whether development email confirmation is enabled. When confirmation is required, signup succeeds but the user must click the email link before login.
3. To enable Google login, create a Google OAuth web client, add the Supabase callback URL shown in the Supabase provider settings, and add the local and production application callback URLs to the allowed redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://YOUR_FRONTEND_DOMAIN/auth/callback`
4. Use only the publishable key in the browser. Never put the Supabase secret/service-role key in Next.js, Git, Docker images, or client-visible environment variables. Rotate any secret key that has been pasted into chat or committed anywhere.

Required frontend variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
NEXT_PUBLIC_AUTH_CALLBACK_URL=http://localhost:3000/auth/callback
```

Required backend variables:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_JWKS_URL=https://YOUR_PROJECT.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_ISSUER_URI=https://YOUR_PROJECT.supabase.co/auth/v1
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

For a cloud database connection also provide `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`. Use the Supabase connection pooler for serverless/container deployments.

## 4. Deploy the API to Google Cloud Run

Create a Google Cloud project, enable billing, install the Google Cloud CLI, and authenticate:

```powershell
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com
```

Build and push the backend image to Artifact Registry:

```powershell
gcloud artifacts repositories create cloudpay --repository-format=docker --location=asia-south2
gcloud builds submit --tag asia-south2-docker.pkg.dev/YOUR_PROJECT_ID/cloudpay/cloudpay-api .\backend
```

Create secrets in Secret Manager for the Supabase publishable key and database password. Then deploy the API. The exact secret resource names can be changed to match your project:

```powershell
gcloud run deploy cloudpay-api `
  --image asia-south2-docker.pkg.dev/YOUR_PROJECT_ID/cloudpay/cloudpay-api `
  --region asia-south2 `
  --port 8080 `
  --allow-unauthenticated `
  --min 0 `
  --max 3 `
  --set-env-vars "SPRING_PROFILES_ACTIVE=prod,SUPABASE_URL=https://YOUR_PROJECT.supabase.co,SUPABASE_JWKS_URL=https://YOUR_PROJECT.supabase.co/auth/v1/.well-known/jwks.json,SUPABASE_ISSUER_URI=https://YOUR_PROJECT.supabase.co/auth/v1,CORS_ALLOWED_ORIGINS=https://YOUR_FRONTEND_DOMAIN,CLOUDPAY_REDIS_ENABLED=false,CLOUDPAY_EVENTS_ENABLED=false" `
  --set-secrets "SUPABASE_PUBLISHABLE_KEY=supabase-publishable:latest,DB_PASSWORD=cloudpay-db-password:latest"
```

For production, provide the managed database pooler variables as secrets too. Leave Redis and Kafka disabled when you do not have managed endpoints; the API remains functional without them. Enable them only after setting `REDIS_URL`, `KAFKA_BOOTSTRAP_SERVERS`, `CLOUDPAY_REDIS_ENABLED=true`, and `CLOUDPAY_EVENTS_ENABLED=true`.

Copy the Cloud Run HTTPS URL. The frontend API base URL must be:

```text
https://YOUR_CLOUD_RUN_URL/api/v1
```

## 5. Deploy the frontend to Vercel

1. Import this repository into Vercel.
2. Set the project root to the repository root.
3. Add these environment variables for Production, Preview, and Development:

```env
NEXT_PUBLIC_API_URL=https://YOUR_CLOUD_RUN_URL/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
NEXT_PUBLIC_AUTH_CALLBACK_URL=https://YOUR_FRONTEND_DOMAIN/auth/callback
```

4. Deploy.
5. Add the Vercel domain to the backend `CORS_ALLOWED_ORIGINS` and Supabase Auth redirect URLs, then redeploy the API if needed.

## 6. How to transfer money in the current app

1. Open the frontend and choose **Sign up** or **Continue with Google**.
2. If email confirmation is enabled, confirm the email first, then sign in.
3. Add or select a wallet/bank account in the application. This demo does not link to a real bank account.
4. Generate a CloudPay UPI ID from the authenticated user API (`POST /api/v1/users/upi-id`) or the profile flow.
5. Ensure the sender wallet has a balance. For local testing, fund a test wallet only through a controlled development seed/top-up process; real money cannot be created by editing a production balance.
6. In **Send Money**, enter the recipient's CloudPay UPI ID, amount, and optional remark, then submit. The backend performs an atomic debit/credit transaction, writes transaction history, creates notifications, and publishes an optional Kafka payment event.
7. For QR payments, the receiver shares the generated QR payload. The sender opens QR Pay, scans/pastes the payload, verifies the recipient and amount, and confirms payment.
8. Check Dashboard and Transaction History for the result.

The current flow is an internal wallet ledger. Real bank/UPI settlement requires a payment-provider integration, webhooks, KYC/AML controls, idempotency keys, reconciliation, fraud controls, and legal/compliance approval. Do not use this demo to handle real customer funds without completing that work.

## 7. Verification commands

```powershell
cd backend
mvn -q test
cd ..
npx tsc --noEmit
npm run build
docker compose config --quiet
```

Smoke-test the running services:

```powershell
Invoke-WebRequest http://localhost:3000/login -UseBasicParsing
Invoke-WebRequest http://localhost:3000/register -UseBasicParsing
Invoke-WebRequest http://localhost:8080/actuator/health -UseBasicParsing
Invoke-WebRequest http://localhost:8080/swagger-ui.html -UseBasicParsing
```

An unauthenticated payment request must return `401`. A successful payment requires a valid Supabase access token in the `Authorization: Bearer ...` header.

## Troubleshooting

- **Signup says rate limited:** wait before retrying; Supabase protects the Auth endpoint. Use one test account and configure a real email provider rather than repeatedly creating disposable accounts.
- **Signup succeeds but login fails:** confirm the email if Supabase requires confirmation. Check that frontend and backend use the same Supabase project.
- **Google button fails:** enable Google in Supabase, configure the Google client secret there, and check both Supabase and application redirect URLs.
- **401 from protected API:** inspect the browser network request and confirm the Supabase access token is attached. Do not send the publishable key as a bearer token.
- **Redis/Kafka connection errors:** set both feature flags to `false` when running without those services. Compose enables and wires them automatically.
- **IDE Lombok errors while Maven passes:** use Java 21 for the IDE/Maven runner, reload Maven, and invalidate/restart the IDE index.
