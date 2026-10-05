CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id              UUID PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255),
    full_name       VARCHAR(150) NOT NULL,
    phone           VARCHAR(20) UNIQUE,
    upi_id          VARCHAR(100) UNIQUE,
    role            VARCHAR(20) NOT NULL DEFAULT 'USER',
    kyc_verified    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_users_role CHECK (role IN ('USER', 'ADMIN')),
    CONSTRAINT chk_users_email CHECK (POSITION('@' IN email) > 1)
);

CREATE TABLE bank_accounts (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_number       VARCHAR(30) NOT NULL,
    ifsc_code            VARCHAR(11) NOT NULL,
    bank_name            VARCHAR(100) NOT NULL,
    account_holder_name  VARCHAR(150) NOT NULL,
    balance              NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    currency             CHAR(3) NOT NULL DEFAULT 'INR',
    is_primary           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_bank_accounts_balance CHECK (balance >= 0),
    CONSTRAINT chk_bank_accounts_currency CHECK (currency = 'INR'),
    CONSTRAINT uq_bank_accounts_user_number UNIQUE (user_id, account_number)
);

CREATE TABLE transactions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_ref  VARCHAR(50) NOT NULL UNIQUE,
    sender_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    receiver_id      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    sender_upi_id    VARCHAR(100) NOT NULL,
    receiver_upi_id  VARCHAR(100) NOT NULL,
    amount           NUMERIC(15,2) NOT NULL,
    currency         CHAR(3) NOT NULL DEFAULT 'INR',
    transaction_type VARCHAR(30) NOT NULL DEFAULT 'UPI_TRANSFER',
    idempotency_key  VARCHAR(100),
    remark           VARCHAR(255),
    status           VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    failure_reason   VARCHAR(255),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at     TIMESTAMPTZ,
    CONSTRAINT chk_transactions_amount CHECK (amount > 0),
    CONSTRAINT chk_transactions_currency CHECK (currency = 'INR'),
    CONSTRAINT chk_transactions_type CHECK (transaction_type IN ('UPI_TRANSFER', 'QR_PAYMENT', 'PAYMENT_REQUEST')),
    CONSTRAINT chk_transactions_status CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
    CONSTRAINT chk_transactions_parties CHECK (sender_id <> receiver_id),
    CONSTRAINT uq_transactions_idempotency UNIQUE (sender_id, idempotency_key)
);

CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(150) NOT NULL,
    message     VARCHAR(500) NOT NULL,
    type        VARCHAR(40) NOT NULL,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_upi_id ON users(upi_id) WHERE upi_id IS NOT NULL;
CREATE INDEX idx_users_created_at ON users(created_at DESC);

CREATE INDEX idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE UNIQUE INDEX uq_bank_accounts_one_primary ON bank_accounts(user_id) WHERE is_primary = TRUE;

CREATE INDEX idx_transactions_sender_created ON transactions(sender_id, created_at DESC);
CREATE INDEX idx_transactions_receiver_created ON transactions(receiver_id, created_at DESC);
CREATE INDEX idx_transactions_status_created ON transactions(status, created_at DESC);
CREATE INDEX idx_transactions_ref ON transactions(transaction_ref);

CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, created_at DESC) WHERE is_read = FALSE;
