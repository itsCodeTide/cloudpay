# Full Render deployment

The root `render.yaml` defines two Render web services:

- `cloudpay-web`: Next.js frontend plus its `/api/*` routes.
- `cloudpay-api`: Spring Boot Java API with Flyway migrations.

The Blueprint does not create Supabase, Firebase, Upstash Redis, or Aiven Kafka. Those are external managed services, so their credentials are marked `sync: false` and must be entered in the Render Dashboard instead of being committed to Git.

## Before creating the Blueprint

Rotate any credentials previously pasted into chat or committed locally. In particular, rotate the Aiven Kafka password, Redis token, Supabase database password, Supabase server key, and Razorpay secret.

Create/configure:

1. A Supabase project and database schema. For a new project, run `supabase/schema.sql` in SQL Editor. For the existing project, keep using Flyway and do not run both migration strategies against the same database.
2. An Upstash Redis database. Copy its REST URL and token.
3. An Aiven Kafka service with Kafka REST/Karapace enabled. Create the `cloudpay-events` topic and a producer service user.
4. A Firebase Web app if Firebase Google sign-in is used. Copy the public web configuration values.
5. Razorpay test credentials. Keep the secret server-side.

## Create the Render Blueprint

1. Push this repository to GitHub.
2. Open Render → **New → Blueprint**.
3. Select the repository and branch containing `render.yaml`.
4. Review the two services and keep the `free` plans.
5. When Render prompts for `sync: false` values, enter the values listed below.

Render Blueprints support Docker services, health checks, generated secrets, and `sync: false` dashboard secrets. ([Render Blueprint reference](https://render.com/docs/blueprint-spec))

## `cloudpay-web` environment variables

Set these on the frontend service:

```text
PORT=10000
NEXT_PUBLIC_API_URL=https://cloudpay-api.onrender.com/api/v1
NEXT_PUBLIC_AUTH_CALLBACK_URL=https://cloudpay-web.onrender.com/auth/callback

NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_KEY
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=YOUR_SERVER_ONLY_SUPABASE_SECRET

UPSTASH_REDIS_REST_URL=https://YOUR_REDIS_ENDPOINT
UPSTASH_REDIS_REST_TOKEN=YOUR_REDIS_TOKEN

KAFKA_REST_URL=YOUR_AIVEN_KAFKA_REST_PROXY_URL
KAFKA_USERNAME=YOUR_AIVEN_SERVICE_USER
KAFKA_PASSWORD=YOUR_AIVEN_SERVICE_PASSWORD
KAFKA_TOPIC=cloudpay-events

NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=YOUR_SERVER_ONLY_RAZORPAY_SECRET

NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_WEB_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_DATABASE_URL=YOUR_FIREBASE_DATABASE_URL
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_FIREBASE_MEASUREMENT_ID
```

Firebase web configuration values are public client configuration, but they should still be supplied through Render so the repository is not tied to one Firebase project.

## `cloudpay-api` environment variables

Set these on the Java service:

```text
SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=8080
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_KEY
SUPABASE_SECRET_KEY=YOUR_SERVER_ONLY_SUPABASE_SECRET
SUPABASE_JWKS_URL=https://YOUR_PROJECT.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_ISSUER_URI=https://YOUR_PROJECT.supabase.co/auth/v1

SUPABASE_DB_URL=jdbc:postgresql://POOLER_HOST:6543/postgres?sslmode=require&prepareThreshold=0
SUPABASE_DB_USER=postgres.PROJECT_REF
SUPABASE_DB_PASSWORD=YOUR_DATABASE_PASSWORD
CORS_ALLOWED_ORIGINS=https://cloudpay-web.onrender.com
JWT_SECRET=generate-a-long-random-secret

CLOUDPAY_REDIS_ENABLED=false
CLOUDPAY_EVENTS_ENABLED=false
CLOUDPAY_SQS_ENABLED=false
CLOUDWATCH_METRICS_ENABLED=false
```

The Java service currently has a no-op Kafka publisher and does not consume Upstash REST Redis. Therefore, keep `CLOUDPAY_EVENTS_ENABLED=false` and `CLOUDPAY_REDIS_ENABLED=false` unless the Java integrations are implemented with native Aiven Kafka and TCP Redis/Valkey credentials. The active web event publisher is the Next.js Aiven REST publisher.

## Build and health checks

The Blueprint uses:

```text
Frontend Dockerfile: Dockerfile.render.frontend
Frontend health: /api/openapi.json
Backend Dockerfile: backend/Dockerfile
Backend health: /actuator/health
```

The Java container runs Flyway at startup. Wait for the backend logs to show a successful migration and `Started CloudPayApplication` before testing the frontend.

## Configure Supabase redirects after deployment

Render service URLs are known only after creation. In Supabase → Authentication → URL Configuration, add:

```text
https://cloudpay-web.onrender.com/auth/callback
```

Also update `NEXT_PUBLIC_AUTH_CALLBACK_URL` in Render with the actual frontend URL and redeploy.

## Validate the deployment

Open:

```text
https://cloudpay-web.onrender.com/api/openapi.json
https://cloudpay-api.onrender.com/actuator/health
https://cloudpay-api.onrender.com/v3/api-docs
```

Then test registration, PIN setup, balance verification, a test payment, profile editing, KYC submission, and notifications.

For Kafka, trigger registration or a successful test payment and check the `cloudpay-events` topic in Aiven. For Redis, check the Upstash metrics and confirm the Render web logs do not contain `KAFKA_REST_URL not set` or `UPSTASH_REDIS_REST_URL not set`.

## Free-tier behavior

Render Free web services sleep after inactivity, so the first request can be slow. External Supabase, Redis, and Kafka services have their own free-tier limits and may pause or power off when idle. This deployment is for development/demo use, not real-money banking traffic.
