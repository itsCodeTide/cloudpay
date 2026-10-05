# CloudPay database schema

PostgreSQL 16, managed by Flyway. Supabase Auth owns passwords and JWTs; the CloudPay `users.id` stores the authenticated Supabase UUID from the JWT `sub` claim.

Canonical SQL:

- `backend/src/main/resources/db/migration/V1__create_initial_schema.sql`
- `backend/src/main/resources/db/migration/V2__audit_columns_and_updated_at_triggers.sql`
- `backend/src/main/resources/db/migration/V5__widen_transaction_pin_hash.sql`
- `backend/src/main/resources/db/migration/V6__secure_user_history_and_settings.sql`

## Tables

- `users`: profile, email, phone, UPI ID, role, KYC flag, and audit timestamps.
- `bank_accounts`: user-owned accounts, INR balance, primary-account flag, and audit timestamps.
- `transactions`: sender/receiver transfer ledger, amount, currency, status, idempotency key, and audit timestamps.
- `notifications`: user-owned messages, read state, read timestamp, and audit timestamps.
- `user_profile_history`: immutable profile snapshots for name, phone, UPI ID, KYC, and role changes. Passwords and PIN values are excluded.
- `user_security_events`: PIN-created/PIN-changed events, version, and hash algorithm metadata. It never stores plaintext PINs or reusable old hashes.
- `user_settings`: notification, marketing, biometric, language, and theme preferences.
- `bank_account_history`: masked account and UPI snapshots for link/update/remove history; only the final four account digits are retained.
- `referrals` and `rewards_ledger`: referral lifecycle and reward accounting records.

Every table has a UUID primary key. Every relationship has a foreign key. User-owned records are cascade deleted where safe; transaction users use RESTRICT to preserve the financial ledger. A partial unique index permits at most one primary bank account per user.

## Audit behavior

All tables expose `created_at` and `updated_at`. Migration V2 installs the `cloudpay_set_updated_at()` trigger on every table so database updates cannot silently leave stale audit timestamps.

The API masks bank account numbers in responses. Balance responses require PIN verification. For production banking integrations, encrypt account numbers at rest or store only a tokenized reference supplied by the banking provider.
