ALTER TABLE users ADD COLUMN IF NOT EXISTS transaction_pin_hash VARCHAR(100);

ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS upi_name VARCHAR(150);
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS upi_number VARCHAR(20);

CREATE UNIQUE INDEX IF NOT EXISTS uq_bank_accounts_upi_id
    ON bank_accounts(upi_id) WHERE upi_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bank_accounts_upi_id ON bank_accounts(upi_id);

UPDATE bank_accounts
SET upi_name = COALESCE(NULLIF(account_holder_name, ''), 'CloudPay User'),
    upi_id = LOWER(
        COALESCE(NULLIF(REGEXP_REPLACE(account_holder_name, '[^a-zA-Z0-9]', '', 'g'), ''), 'user')
        || RIGHT(account_number, 4)
        || SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 4)
        || '@cloudpay'
    )
WHERE upi_id IS NULL;
