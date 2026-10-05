# CloudPay cloud deployment guide

For the lowest-cost demo deployment, start with the step-by-step [free deployment guide](./FREE_DEPLOYMENT.md). It uses Vercel + Supabase and includes an optional Render Blueprint for the Spring Boot API.

This repository is deployable as two stateless services:

- Next.js frontend: Vercel, CloudFront/S3, or the included Docker image.
- Spring Boot API: AWS ECS Fargate behind an Application Load Balancer, or any managed container platform.
- Identity and PostgreSQL: Supabase Auth and Supabase Postgres using the pooler connection string.

The synchronous transfer is an atomic CloudPay internal ledger transfer. It is not a regulated bank/UPI settlement rail. To move money between real bank accounts, add a licensed payment provider, KYC/AML controls, signed webhooks, reconciliation, limits, and a regulated operating model before production use.

## 1. Configure Supabase

In the Supabase project:

1. Run the backend Flyway migrations against the production database, or start the API once with the production pooler URL so Flyway applies them.
2. Enable Google under Authentication → Providers → Google.
3. Add the Google OAuth client ID and secret to Supabase. The Google console callback is the Supabase callback URL shown in the provider configuration.
4. Add these redirect URLs in Supabase Authentication → URL Configuration:
   - `http://localhost:3000/auth/callback`
   - `https://YOUR_FRONTEND_DOMAIN/auth/callback`

Create Google credentials in Google Cloud Console as a Web application. Never put the Google client secret, Supabase secret/service-role key, database password, or provider webhook secret in the browser or Git.

## 2. Required environment variables

Backend secrets belong in AWS Secrets Manager, Render/Vercel environment settings, or an equivalent secret store:

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_JWKS_URL=https://YOUR_PROJECT.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_ISSUER_URI=https://YOUR_PROJECT.supabase.co/auth/v1
SUPABASE_DB_URL=jdbc:postgresql://POOLER_HOST:6543/postgres?sslmode=require&prepareThreshold=0
SUPABASE_DB_USER=postgres.PROJECT_REF
SUPABASE_DB_PASSWORD=...
CORS_ALLOWED_ORIGINS=https://YOUR_FRONTEND_DOMAIN
SPRING_PROFILES_ACTIVE=prod
CLOUDWATCH_METRICS_ENABLED=true
CLOUDWATCH_METRICS_NAMESPACE=CloudPay
CLOUDWATCH_METRICS_STEP=1m
```

Frontend build-time variables:

```text
NEXT_PUBLIC_API_URL=https://YOUR_API_DOMAIN/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_AUTH_CALLBACK_URL=https://YOUR_FRONTEND_DOMAIN/auth/callback
```

Only the publishable key may be used in the frontend. The API verifies Supabase JWTs using the JWKS endpoint and the issuer; it does not trust a browser-supplied user ID.

## 3. Fastest production path

### Backend on AWS ECS Fargate

1. Create an ECR repository and build/push the backend image:

```bash
aws ecr get-login-password --region REGION | docker login --username AWS --password-stdin ACCOUNT.dkr.ecr.REGION.amazonaws.com
docker build -t cloudpay-api ./backend
docker tag cloudpay-api:latest ACCOUNT.dkr.ecr.REGION.amazonaws.com/cloudpay-api:latest
docker push ACCOUNT.dkr.ecr.REGION.amazonaws.com/cloudpay-api:latest
```

2. Create an ECS Fargate service in private subnets, with an ALB in public subnets. The ALB target health check is `GET /actuator/health` on port `8080`.
3. Attach a security group that permits port 8080 only from the ALB. The database must not be publicly exposed.
4. Add the backend variables above as ECS task secrets. Set the ALB DNS name as the API origin.
5. Configure HTTPS on the ALB with ACM and redirect HTTP to HTTPS.
6. Configure the ECS `awslogs` driver for `/cloudpay/backend`, attach an IAM task role with `cloudwatch:PutMetricData`, and keep CloudWatch metrics enabled only in the backend task definition. The repository includes [cloudwatch-agent-config.json](../../docker/cloudwatch-agent-config.json) for VM-based deployments.
7. Configure CloudWatch logs, CPU/memory autoscaling, deployment circuit breaker, and at least two Availability Zones.

### Frontend on Vercel

1. Import this repository and set the frontend variables above.
2. Set the project root to the repository root. The runnable Next.js application is the root `app/` directory.
3. Deploy, then add the final Vercel domain to `CORS_ALLOWED_ORIGINS` and Supabase redirect URLs.

### Docker alternative

For a single-host or private test deployment:

```bash
Copy-Item .env.example .env
# Fill .env with non-secret local values
docker compose up --build
```

For public production traffic, put a TLS reverse proxy or load balancer in front of both services, use managed PostgreSQL, and replace local compose credentials with a secret manager.

## 4. AWS architecture mapping

The supplied architecture maps to: CloudFront + WAF → ALB → ECS/Fargate API tasks; Supabase Postgres/Auth initially; Redis for rate limits and short-lived QR/session data; SQS for notification and reconciliation jobs; Lambda workers for asynchronous notifications; CloudWatch for logs/metrics/alarms; S3 for encrypted backups and exported reports. Add multi-region failover only after backup restore and transaction reconciliation drills are automated.

The current payment write is deliberately synchronous and transactional: both participant accounts are locked in deterministic order, debit/credit and notifications are committed together, and an exception rolls the transaction back. For external providers, consume webhooks idempotently and persist provider event IDs before applying a ledger transition.

For a fresh Supabase project, paste [supabase/schema.sql](../../supabase/schema.sql) into the Supabase SQL Editor. The existing Flyway migrations remain the backend's local/managed-database migration path; do not run both migration strategies against the same production database without reviewing the current schema first.

Redis and Kafka are optional runtime integrations. `CLOUDPAY_EVENTS_ENABLED=true` publishes committed payment events to Kafka; Redis is available for future shared cache/session workloads. Login and signup are not application-rate-limited. The included Docker Compose file starts Redis on `6379` and Kafka on `9092` for local development. In cloud, use managed Redis and Kafka/MSK or another managed Kafka-compatible service.

Deployable reference templates are in [infra/aws](../../infra/aws): `dr-stack.yaml` creates the versioned disaster-recovery bucket, `primary-stack.yaml` creates ECS/ALB/SQS/CloudWatch/backup resources, and `edge-stack.yaml` creates the CloudFront distribution and global-scope WAF. The templates are parameterized around an existing VPC, ACM certificates, ECR image, Redis endpoint, and Secrets Manager ARN; they do not embed credentials.

The backend accepts `CLOUDPAY_SQS_QUEUE_URL`, `CLOUDPAY_BACKUP_S3_BUCKET`, `CLOUDPAY_DR_REGION`, and `CLOUDPAY_SQS_ENABLED`. The database notification record remains the source of truth. SQS is provisioned for asynchronous notification/reconciliation workers; enable a worker only after its retry, idempotency, and dead-letter handling are tested.

## 5. Production checklist

- Rotate any credentials that were pasted into chat or committed locally.
- Use a dedicated Supabase production project and least-privilege database credentials.
- Enable MFA and email verification in Supabase.
- Add rate limiting at WAF/API gateway and per-user transfer limits.
- Add provider webhook signature verification and idempotency before real bank settlement.
- Add CloudWatch alarms for `cloudpay.transfer.attempts{status=pin_failed|failed}`, HTTP 5xx counts, database connection exhaustion, failed migrations, and queue depth.
- Test database restore, expired JWTs, duplicate requests, insufficient balance, and concurrent transfers.
- Do not describe this internal ledger as a live bank transfer until a licensed provider integration is complete.
