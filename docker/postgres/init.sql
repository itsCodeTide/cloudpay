-- CloudPay PostgreSQL initialization
-- Flyway migrations in backend handle schema; this sets up extensions.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
