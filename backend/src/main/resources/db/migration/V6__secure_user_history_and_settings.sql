ALTER TABLE users ADD COLUMN IF NOT EXISTS transaction_pin_set_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS transaction_pin_version INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS user_profile_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE')),
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    before_data JSONB,
    after_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(40) NOT NULL,
    pin_version INTEGER,
    hash_algorithm VARCHAR(30),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    marketing_enabled BOOLEAN NOT NULL DEFAULT false,
    biometric_enabled BOOLEAN NOT NULL DEFAULT false,
    language VARCHAR(20) NOT NULL DEFAULT 'en-IN',
    theme VARCHAR(20) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bank_account_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    account_last4 VARCHAR(4),
    ifsc_code VARCHAR(11),
    bank_name VARCHAR(100),
    account_holder_name VARCHAR(150),
    upi_id VARCHAR(100),
    upi_name VARCHAR(150),
    upi_number VARCHAR(20),
    is_primary BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    referral_code VARCHAR(32) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
    reward_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (reward_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS rewards_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source VARCHAR(40) NOT NULL,
    amount NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CREDITED', 'REVERSED')),
    reference_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_profile_history_user_created ON user_profile_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user_created ON user_security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bank_account_history_user_created ON bank_account_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rewards_user_created ON rewards_ledger(user_id, created_at DESC);

DROP TRIGGER IF EXISTS user_settings_set_updated_at ON user_settings;
CREATE TRIGGER user_settings_set_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION record_user_profile_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_profile_history(user_id, action, changed_by, after_data)
        VALUES (NEW.id, 'INSERT', auth.uid(), jsonb_build_object(
            'id', NEW.id, 'email', NEW.email, 'full_name', NEW.full_name,
            'phone', NEW.phone, 'upi_id', NEW.upi_id, 'role', NEW.role,
            'kyc_verified', NEW.kyc_verified
        ));
    ELSIF TG_OP = 'UPDATE' AND (
        OLD.email IS DISTINCT FROM NEW.email OR OLD.full_name IS DISTINCT FROM NEW.full_name OR
        OLD.phone IS DISTINCT FROM NEW.phone OR OLD.upi_id IS DISTINCT FROM NEW.upi_id OR
        OLD.role IS DISTINCT FROM NEW.role OR OLD.kyc_verified IS DISTINCT FROM NEW.kyc_verified
    ) THEN
        INSERT INTO user_profile_history(user_id, action, changed_by, before_data, after_data)
        VALUES (NEW.id, 'UPDATE', auth.uid(), jsonb_build_object(
            'id', OLD.id, 'email', OLD.email, 'full_name', OLD.full_name,
            'phone', OLD.phone, 'upi_id', OLD.upi_id, 'role', OLD.role,
            'kyc_verified', OLD.kyc_verified
        ), jsonb_build_object(
            'id', NEW.id, 'email', NEW.email, 'full_name', NEW.full_name,
            'phone', NEW.phone, 'upi_id', NEW.upi_id, 'role', NEW.role,
            'kyc_verified', NEW.kyc_verified
        ));
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION record_user_security_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF OLD.transaction_pin_hash IS DISTINCT FROM NEW.transaction_pin_hash THEN
        NEW.transaction_pin_version = COALESCE(OLD.transaction_pin_version, 0) + 1;
        NEW.transaction_pin_set_at = now();
        INSERT INTO user_security_events(user_id, event_type, pin_version, hash_algorithm)
        VALUES (NEW.id,
                CASE WHEN OLD.transaction_pin_hash IS NULL THEN 'PIN_CREATED' ELSE 'PIN_CHANGED' END,
                NEW.transaction_pin_version,
                CASE WHEN NEW.transaction_pin_hash LIKE '$2%' THEN 'bcrypt' ELSE 'scrypt' END);
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION record_bank_account_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO bank_account_history(bank_account_id, user_id, action, account_last4, ifsc_code, bank_name, account_holder_name, upi_id, upi_name, upi_number, is_primary)
    VALUES (
        COALESCE(NEW.id, OLD.id), COALESCE(NEW.user_id, OLD.user_id), TG_OP,
        RIGHT(COALESCE(NEW.account_number, OLD.account_number), 4), COALESCE(NEW.ifsc_code, OLD.ifsc_code),
        COALESCE(NEW.bank_name, OLD.bank_name), COALESCE(NEW.account_holder_name, OLD.account_holder_name),
        COALESCE(NEW.upi_id, OLD.upi_id), COALESCE(NEW.upi_name, OLD.upi_name),
        COALESCE(NEW.upi_number, OLD.upi_number), COALESCE(NEW.is_primary, OLD.is_primary)
    );
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_profile_history ON users;
CREATE TRIGGER users_profile_history AFTER INSERT OR UPDATE ON users FOR EACH ROW EXECUTE FUNCTION record_user_profile_history();
DROP TRIGGER IF EXISTS users_security_history ON users;
CREATE TRIGGER users_security_history BEFORE UPDATE OF transaction_pin_hash ON users FOR EACH ROW EXECUTE FUNCTION record_user_security_event();
DROP TRIGGER IF EXISTS bank_accounts_history ON bank_accounts;
CREATE TRIGGER bank_accounts_history AFTER INSERT OR UPDATE OR DELETE ON bank_accounts FOR EACH ROW EXECUTE FUNCTION record_bank_account_history();

INSERT INTO user_profile_history(user_id, action, changed_by, after_data)
SELECT u.id, 'INSERT', NULL, jsonb_build_object('id', u.id, 'email', u.email, 'full_name', u.full_name, 'phone', u.phone, 'upi_id', u.upi_id, 'role', u.role, 'kyc_verified', u.kyc_verified)
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM user_profile_history h WHERE h.user_id = u.id);

INSERT INTO bank_account_history(bank_account_id, user_id, action, account_last4, ifsc_code, bank_name, account_holder_name, upi_id, upi_name, upi_number, is_primary)
SELECT b.id, b.user_id, 'INSERT', RIGHT(b.account_number, 4), b.ifsc_code, b.bank_name, b.account_holder_name, b.upi_id, b.upi_name, b.upi_number, b.is_primary
FROM bank_accounts b
WHERE NOT EXISTS (SELECT 1 FROM bank_account_history h WHERE h.bank_account_id = b.id);

INSERT INTO user_settings(user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;
