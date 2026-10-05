-- CloudPay Supabase schema
-- Paste this into Supabase Dashboard -> SQL Editor for a fresh project.
-- Supabase Auth owns passwords, refresh tokens, and email verification in auth.users.
-- Never store the Supabase service-role key or a plaintext password in these tables.

create extension if not exists pgcrypto;

create table if not exists public.users (
    id uuid primary key references auth.users(id) on delete cascade,
    email varchar(255) not null unique,
    password_hash varchar(255),
    pending_email varchar(255),
    email_verified_at timestamptz,
    transaction_pin_hash varchar(255),
    transaction_pin_set_at timestamptz,
    transaction_pin_version integer not null default 0,
    full_name varchar(150) not null,
    phone varchar(20) unique,
    upi_id varchar(100) unique,
    role varchar(20) not null default 'USER' check (role in ('USER', 'ADMIN')),
    is_verified boolean not null default false,
    kyc_verified boolean not null default false,
    kyc_status varchar(20) not null default 'NOT_STARTED',
    kyc_provider varchar(60),
    kyc_reference varchar(80),
    kyc_submitted_at timestamptz,
    kyc_verified_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.bank_accounts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    account_number varchar(30) not null,
    ifsc_code varchar(11) not null,
    bank_name varchar(100) not null,
    account_holder_name varchar(150) not null,
    upi_id varchar(100) unique,
    upi_name varchar(150),
    upi_number varchar(20),
    balance numeric(15,2) not null default 0 check (balance >= 0),
    currency char(3) not null default 'INR' check (currency = 'INR'),
    is_primary boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, account_number)
);

create table if not exists public.transactions (
    id uuid primary key default gen_random_uuid(),
    transaction_ref varchar(50) not null unique,
    sender_id uuid not null references public.users(id) on delete restrict,
    receiver_id uuid not null references public.users(id) on delete restrict,
    sender_upi_id varchar(100) not null,
    receiver_upi_id varchar(100) not null,
    amount numeric(15,2) not null check (amount > 0),
    currency char(3) not null default 'INR' check (currency = 'INR'),
    transaction_type varchar(30) not null default 'UPI_TRANSFER',
    idempotency_key varchar(100),
    remark varchar(255),
    status varchar(20) not null default 'PENDING' check (status in ('PENDING', 'SUCCESS', 'FAILED')),
    failure_reason varchar(255),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    completed_at timestamptz,
    check (sender_id <> receiver_id),
    unique (sender_id, idempotency_key)
);

create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    title varchar(150) not null,
    message varchar(500) not null,
    type varchar(40) not null,
    is_read boolean not null default false,
    read_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete set null,
    action varchar(80) not null,
    resource_type varchar(80),
    resource_id uuid,
    ip_address inet,
    user_agent text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

-- History contains profile snapshots and security events, never plaintext passwords or PINs.
create table if not exists public.user_profile_history (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    action varchar(20) not null check (action in ('INSERT', 'UPDATE')),
    changed_by uuid references public.users(id) on delete set null,
    before_data jsonb,
    after_data jsonb not null,
    created_at timestamptz not null default now()
);

create table if not exists public.user_security_events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    event_type varchar(40) not null,
    pin_version integer,
    hash_algorithm varchar(30),
    ip_address inet,
    user_agent text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists public.user_settings (
    user_id uuid primary key references public.users(id) on delete cascade,
    notifications_enabled boolean not null default true,
    marketing_enabled boolean not null default false,
    biometric_enabled boolean not null default false,
    language varchar(20) not null default 'en-IN',
    theme varchar(20) not null default 'system',
    updated_at timestamptz not null default now()
);

create table if not exists public.bank_account_history (
    id uuid primary key default gen_random_uuid(),
    bank_account_id uuid references public.bank_accounts(id) on delete set null,
    user_id uuid not null references public.users(id) on delete cascade,
    action varchar(20) not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
    account_last4 varchar(4),
    ifsc_code varchar(11),
    bank_name varchar(100),
    account_holder_name varchar(150),
    upi_id varchar(100),
    upi_name varchar(150),
    upi_number varchar(20),
    is_primary boolean,
    created_at timestamptz not null default now()
);

create table if not exists public.referrals (
    id uuid primary key default gen_random_uuid(),
    referrer_user_id uuid not null references public.users(id) on delete cascade,
    referred_user_id uuid references public.users(id) on delete set null,
    referral_code varchar(32) not null unique,
    status varchar(20) not null default 'PENDING' check (status in ('PENDING', 'COMPLETED', 'CANCELLED')),
    reward_amount numeric(15,2) not null default 0 check (reward_amount >= 0),
    created_at timestamptz not null default now(),
    completed_at timestamptz
);

create table if not exists public.rewards_ledger (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    source varchar(40) not null,
    amount numeric(15,2) not null check (amount >= 0),
    currency char(3) not null default 'INR' check (currency = 'INR'),
    status varchar(20) not null default 'PENDING' check (status in ('PENDING', 'CREDITED', 'REVERSED')),
    reference_id uuid,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists public.kyc_verifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    status varchar(20) not null default 'SUBMITTED' check (status in ('SUBMITTED', 'IN_REVIEW', 'VERIFIED', 'REJECTED')),
    provider varchar(60) not null,
    external_reference varchar(80) not null unique,
    legal_name varchar(150) not null,
    date_of_birth date,
    government_id_last4 varchar(4),
    consented_at timestamptz not null,
    submitted_at timestamptz not null default now(),
    reviewed_at timestamptz,
    rejection_reason varchar(255),
    metadata jsonb not null default '{}'::jsonb
);

create or replace function public.set_updated_at() returns trigger
language plpgsql security invoker as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create or replace function public.record_user_profile_history() returns trigger
language plpgsql security definer set search_path = public as $$
begin
    if TG_OP = 'INSERT' then
        insert into public.user_profile_history(user_id, action, changed_by, after_data)
        values (NEW.id, 'INSERT', auth.uid(), jsonb_build_object('id', NEW.id, 'email', NEW.email, 'pending_email', NEW.pending_email, 'full_name', NEW.full_name, 'phone', NEW.phone, 'upi_id', NEW.upi_id, 'role', NEW.role, 'kyc_verified', NEW.kyc_verified, 'kyc_status', NEW.kyc_status));
    elsif TG_OP = 'UPDATE' and (OLD.email is distinct from NEW.email or OLD.pending_email is distinct from NEW.pending_email or OLD.full_name is distinct from NEW.full_name or OLD.phone is distinct from NEW.phone or OLD.upi_id is distinct from NEW.upi_id or OLD.role is distinct from NEW.role or OLD.kyc_verified is distinct from NEW.kyc_verified or OLD.kyc_status is distinct from NEW.kyc_status) then
        insert into public.user_profile_history(user_id, action, changed_by, before_data, after_data)
        values (NEW.id, 'UPDATE', auth.uid(), jsonb_build_object('id', OLD.id, 'email', OLD.email, 'pending_email', OLD.pending_email, 'full_name', OLD.full_name, 'phone', OLD.phone, 'upi_id', OLD.upi_id, 'role', OLD.role, 'kyc_verified', OLD.kyc_verified, 'kyc_status', OLD.kyc_status), jsonb_build_object('id', NEW.id, 'email', NEW.email, 'pending_email', NEW.pending_email, 'full_name', NEW.full_name, 'phone', NEW.phone, 'upi_id', NEW.upi_id, 'role', NEW.role, 'kyc_verified', NEW.kyc_verified, 'kyc_status', NEW.kyc_status));
    end if;
    return NEW;
end;
$$;

create or replace function public.record_user_security_event() returns trigger
language plpgsql security definer set search_path = public as $$
begin
    if OLD.transaction_pin_hash is distinct from NEW.transaction_pin_hash then
        NEW.transaction_pin_version = coalesce(OLD.transaction_pin_version, 0) + 1;
        NEW.transaction_pin_set_at = now();
        insert into public.user_security_events(user_id, event_type, pin_version, hash_algorithm)
        values (NEW.id, case when OLD.transaction_pin_hash is null then 'PIN_CREATED' else 'PIN_CHANGED' end, NEW.transaction_pin_version, case when NEW.transaction_pin_hash like '$2%' then 'bcrypt' else 'scrypt' end);
    end if;
    return NEW;
end;
$$;

create or replace function public.record_bank_account_history() returns trigger
language plpgsql security definer set search_path = public as $$
begin
    insert into public.bank_account_history(bank_account_id, user_id, action, account_last4, ifsc_code, bank_name, account_holder_name, upi_id, upi_name, upi_number, is_primary)
    values (coalesce(NEW.id, OLD.id), coalesce(NEW.user_id, OLD.user_id), TG_OP, right(coalesce(NEW.account_number, OLD.account_number), 4), coalesce(NEW.ifsc_code, OLD.ifsc_code), coalesce(NEW.bank_name, OLD.bank_name), coalesce(NEW.account_holder_name, OLD.account_holder_name), coalesce(NEW.upi_id, OLD.upi_id), coalesce(NEW.upi_name, OLD.upi_name), coalesce(NEW.upi_number, OLD.upi_number), coalesce(NEW.is_primary, OLD.is_primary));
    if TG_OP = 'DELETE' then return OLD; end if;
    return NEW;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at before update on public.users for each row execute function public.set_updated_at();
drop trigger if exists users_profile_history on public.users;
create trigger users_profile_history after insert or update on public.users for each row execute function public.record_user_profile_history();
drop trigger if exists users_security_history on public.users;
create trigger users_security_history before update of transaction_pin_hash on public.users for each row execute function public.record_user_security_event();
drop trigger if exists bank_accounts_set_updated_at on public.bank_accounts;
create trigger bank_accounts_set_updated_at before update on public.bank_accounts for each row execute function public.set_updated_at();
drop trigger if exists bank_accounts_history on public.bank_accounts;
create trigger bank_accounts_history after insert or update or delete on public.bank_accounts for each row execute function public.record_bank_account_history();
drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at before update on public.transactions for each row execute function public.set_updated_at();
drop trigger if exists notifications_set_updated_at on public.notifications;
create trigger notifications_set_updated_at before update on public.notifications for each row execute function public.set_updated_at();
drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at before update on public.user_settings for each row execute function public.set_updated_at();

create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_upi_id on public.users(upi_id) where upi_id is not null;
create index if not exists idx_bank_accounts_user on public.bank_accounts(user_id);
create index if not exists idx_bank_accounts_upi_id on public.bank_accounts(upi_id);
create unique index if not exists idx_one_primary_bank_account on public.bank_accounts(user_id) where is_primary = true;
create index if not exists idx_transactions_sender_created on public.transactions(sender_id, created_at desc);
create index if not exists idx_transactions_receiver_created on public.transactions(receiver_id, created_at desc);
create index if not exists idx_transactions_status_created on public.transactions(status, created_at desc);
create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications(user_id, created_at desc) where is_read = false;
create index if not exists idx_audit_logs_user_created on public.audit_logs(user_id, created_at desc);
create index if not exists idx_profile_history_user_created on public.user_profile_history(user_id, created_at desc);
create index if not exists idx_security_events_user_created on public.user_security_events(user_id, created_at desc);
create index if not exists idx_bank_account_history_user_created on public.bank_account_history(user_id, created_at desc);
create index if not exists idx_rewards_user_created on public.rewards_ledger(user_id, created_at desc);
create index if not exists idx_kyc_user_submitted on public.kyc_verifications(user_id, submitted_at desc);

insert into public.user_settings(user_id)
select id from public.users
on conflict (user_id) do nothing;

-- These policies protect direct Supabase client access. The Spring API uses the
-- authenticated JWT for authorization and should remain the only payment writer.
alter table public.users enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.user_profile_history enable row level security;
alter table public.user_security_events enable row level security;
alter table public.user_settings enable row level security;
alter table public.bank_account_history enable row level security;
alter table public.referrals enable row level security;
alter table public.rewards_ledger enable row level security;
alter table public.kyc_verifications enable row level security;

drop policy if exists users_self_read on public.users;
create policy users_self_read on public.users for select using (auth.uid() = id);
drop policy if exists bank_accounts_self_read on public.bank_accounts;
create policy bank_accounts_self_read on public.bank_accounts for select using (auth.uid() = user_id);
drop policy if exists transactions_participant_read on public.transactions;
create policy transactions_participant_read on public.transactions for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
drop policy if exists notifications_self_read on public.notifications;
create policy notifications_self_read on public.notifications for select using (auth.uid() = user_id);
drop policy if exists audit_logs_self_read on public.audit_logs;
create policy audit_logs_self_read on public.audit_logs for select using (auth.uid() = user_id);
drop policy if exists user_profile_history_self_read on public.user_profile_history;
create policy user_profile_history_self_read on public.user_profile_history for select using (auth.uid() = user_id);
drop policy if exists user_security_events_self_read on public.user_security_events;
create policy user_security_events_self_read on public.user_security_events for select using (auth.uid() = user_id);
drop policy if exists user_settings_self_read on public.user_settings;
create policy user_settings_self_read on public.user_settings for select using (auth.uid() = user_id);
drop policy if exists bank_account_history_self_read on public.bank_account_history;
create policy bank_account_history_self_read on public.bank_account_history for select using (auth.uid() = user_id);
drop policy if exists referrals_self_read on public.referrals;
create policy referrals_self_read on public.referrals for select using (auth.uid() = referrer_user_id or auth.uid() = referred_user_id);
drop policy if exists rewards_self_read on public.rewards_ledger;
create policy rewards_self_read on public.rewards_ledger for select using (auth.uid() = user_id);
drop policy if exists kyc_self_read on public.kyc_verifications;
create policy kyc_self_read on public.kyc_verifications for select using (auth.uid() = user_id);

-- Enable Supabase Realtime for instant balance and transaction push updates
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.bank_accounts;
alter publication supabase_realtime add table public.notifications;
