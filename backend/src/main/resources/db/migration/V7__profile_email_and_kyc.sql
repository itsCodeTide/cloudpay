ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED';
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_provider VARCHAR(60);
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_reference VARCHAR(80);
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS kyc_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'IN_REVIEW', 'VERIFIED', 'REJECTED')),
    provider VARCHAR(60) NOT NULL,
    external_reference VARCHAR(80) NOT NULL,
    legal_name VARCHAR(150) NOT NULL,
    date_of_birth DATE,
    government_id_last4 VARCHAR(4),
    consented_at TIMESTAMPTZ NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    rejection_reason VARCHAR(255),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_kyc_user_submitted ON kyc_verifications(user_id, submitted_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_kyc_external_reference ON kyc_verifications(external_reference);

CREATE OR REPLACE FUNCTION record_user_profile_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_profile_history(user_id, action, changed_by, after_data)
        VALUES (NEW.id, 'INSERT', auth.uid(), jsonb_build_object(
            'id', NEW.id, 'email', NEW.email, 'pending_email', NEW.pending_email,
            'full_name', NEW.full_name, 'phone', NEW.phone, 'upi_id', NEW.upi_id,
            'role', NEW.role, 'kyc_verified', NEW.kyc_verified, 'kyc_status', NEW.kyc_status
        ));
    ELSIF TG_OP = 'UPDATE' AND (
        OLD.email IS DISTINCT FROM NEW.email OR OLD.pending_email IS DISTINCT FROM NEW.pending_email OR
        OLD.full_name IS DISTINCT FROM NEW.full_name OR OLD.phone IS DISTINCT FROM NEW.phone OR
        OLD.upi_id IS DISTINCT FROM NEW.upi_id OR OLD.role IS DISTINCT FROM NEW.role OR
        OLD.kyc_verified IS DISTINCT FROM NEW.kyc_verified OR OLD.kyc_status IS DISTINCT FROM NEW.kyc_status
    ) THEN
        INSERT INTO user_profile_history(user_id, action, changed_by, before_data, after_data)
        VALUES (NEW.id, 'UPDATE', auth.uid(),
            jsonb_build_object('id', OLD.id, 'email', OLD.email, 'pending_email', OLD.pending_email, 'full_name', OLD.full_name, 'phone', OLD.phone, 'upi_id', OLD.upi_id, 'role', OLD.role, 'kyc_verified', OLD.kyc_verified, 'kyc_status', OLD.kyc_status),
            jsonb_build_object('id', NEW.id, 'email', NEW.email, 'pending_email', NEW.pending_email, 'full_name', NEW.full_name, 'phone', NEW.phone, 'upi_id', NEW.upi_id, 'role', NEW.role, 'kyc_verified', NEW.kyc_verified, 'kyc_status', NEW.kyc_status));
    END IF;
    RETURN NEW;
END;
$$;

ALTER TABLE kyc_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kyc_self_read ON kyc_verifications;
CREATE POLICY kyc_self_read ON kyc_verifications FOR SELECT USING (auth.uid() = user_id);
