# CloudPay AWS reference deployment

These CloudFormation templates provision the requested production shape:

```text
Users -> CloudFront + AWS WAF -> HTTPS ALB -> ECS/Fargate Spring Boot API
                                      |-> Supabase PostgreSQL
                                      |-> ElastiCache Redis (endpoint supplied as REDIS_URL)
                                      |-> SQS notification/reconciliation queue
                                      |-> CloudWatch logs, metrics, and alarms
                                      |-> S3 encrypted backup bucket -> DR-region replica
```

The templates are deployment artifacts; they do not run automatically and do not contain database passwords or payment secrets. Supply those through AWS Secrets Manager and pass the secret ARN to the ECS task definition.

## Deployment order

1. Deploy `dr-stack.yaml` in the disaster-recovery region. Keep the output `BackupReplicaBucketArn`.
2. In the primary region, deploy `primary-stack.yaml` with an existing VPC, public/private/cache subnet IDs, ACM certificate ARN, container image URI, and the DR bucket ARN. The stack creates a two-node encrypted ElastiCache Redis replication group in the cache subnets.
3. Upload the frontend to the chosen CloudFront origin and deploy `edge-stack.yaml` in `us-east-1` with the primary ALB DNS name and a CloudFront certificate. The WAF web ACL is `CLOUDFRONT` scoped and therefore belongs in `us-east-1`.
4. Store the output `NotificationQueueUrl` as `CLOUDPAY_SQS_QUEUE_URL`. Set `CLOUDPAY_BACKUP_S3_BUCKET` and `CLOUDPAY_DR_REGION` in the application environment.
5. Configure Supabase/Spring secrets in the Secrets Manager JSON object expected by `primary-stack.yaml`:

```json
{
  "SUPABASE_DB_URL": "jdbc:postgresql://POOLER_HOST:6543/postgres?sslmode=require&prepareThreshold=0",
  "SUPABASE_DB_USER": "postgres.PROJECT_REF",
  "SUPABASE_DB_PASSWORD": "...",
  "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_...",
  "SUPABASE_JWKS_URL": "https://PROJECT_REF.supabase.co/auth/v1/.well-known/jwks.json",
  "SUPABASE_ISSUER_URI": "https://PROJECT_REF.supabase.co/auth/v1",
  "JWT_SECRET": "..."
}
```

The task role is intentionally limited to CloudWatch metrics, SQS send/receive/delete, and S3 backup replication. Add provider-specific permissions only when a real, signed provider integration is introduced.

## Operational expectations

- ALB health checks use `/actuator/health`; ECS deployment circuit breaking and two-AZ placement are enabled.
- WAF includes AWS managed common rules and a per-IP rate limit. Add stricter country, bot, and API rules after observing normal traffic.
- SQS has a dead-letter queue and a visible-depth CloudWatch alarm. A worker must consume the queue before enabling production notification fan-out.
- S3 uses versioning, SSE-S3 encryption, lifecycle transition, and cross-region replication. Test a restore into a clean account before calling DR ready.
- PostgreSQL remains Supabase in this repository. Supabase PITR/backups and a tested transaction reconciliation export are required for database DR; an S3 replica alone is not a database failover.
