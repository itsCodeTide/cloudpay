# Simple Render deployment

The root `render.yaml` is a small Render Blueprint with two services:

- `cloudpay-web`: the Next.js frontend and its `/api/*` routes.
- `cloudpay-api`: the Spring Boot API.

Redis, Kafka, SQS, backups, CloudWatch, and their credentials are intentionally not part of this deployment.

## Important database note

Render Blueprints cannot create or configure Firebase. In this project, Supabase provides the PostgreSQL database and authentication used by the application. Firebase is only optional client-side configuration for Google sign-in.

Keep using the existing Supabase project and database migrations. Do not replace the Supabase database with Firebase unless the application is refactored to use Firebase instead of PostgreSQL/Supabase.

## Deploy

1. Push this repository to GitHub with `render.yaml` at the repository root.
2. In Render, choose **New → Blueprint**.
3. Select the repository and branch, then click **Apply**.
4. Enter the prompted secret values below.

Render creates both services and deploys future commits automatically.

## Required `cloudpay-web` variables

```text
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_KEY
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=YOUR_SERVER_ONLY_SUPABASE_SECRET
JWT_SECRET=generate-a-long-random-secret
```

Firebase Google sign-in is optional. If enabled, also set:

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_DATABASE_URL
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
```

## Required `cloudpay-api` variables

```text
SPRING_PROFILES_ACTIVE=prod
PORT=10000
SERVER_PORT=10000
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_KEY
SUPABASE_SECRET_KEY=YOUR_SERVER_ONLY_SUPABASE_SECRET
SUPABASE_JWKS_URL=https://YOUR_PROJECT.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_ISSUER_URI=https://YOUR_PROJECT.supabase.co/auth/v1
SUPABASE_DB_URL=jdbc:postgresql://POOLER_HOST:6543/postgres?sslmode=require&prepareThreshold=0
SUPABASE_DB_USER=postgres.PROJECT_REF
SUPABASE_DB_PASSWORD=YOUR_DATABASE_PASSWORD
CORS_ALLOWED_ORIGINS=https://YOUR_WEB.onrender.com
```

The Blueprint generates `JWT_SECRET` automatically. Flyway applies the Java migrations when the API starts.

## Health checks

```text
Frontend: https://YOUR_WEB.onrender.com/api/openapi.json
API:      https://YOUR_API.onrender.com/actuator/health
```

After Render assigns the real service URL, set `CORS_ALLOWED_ORIGINS` to the frontend URL and add `https://YOUR_WEB.onrender.com/auth/callback` to Supabase Authentication → URL Configuration.

Render Free services can sleep when idle, so the first request may be slow. This setup is suitable for a demo, not real-money banking traffic.
