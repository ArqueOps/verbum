-- Migration: 20260415010000_add_credits_and_subscriptions.sql
-- Description: Add credits_remaining to profiles, create subscriptions and payments tables
-- Rollback: ALTER TABLE profiles DROP COLUMN IF EXISTS credits_remaining;
--           DROP TABLE IF EXISTS payments; DROP TABLE IF EXISTS subscriptions;

-- =============================================================================
-- 1. Add credits_remaining to profiles (free tier = 3 credits)
-- =============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS credits_remaining INTEGER NOT NULL DEFAULT 3;

-- =============================================================================
-- 2. Create subscriptions table
-- =============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id               UUID NULL,
  status                TEXT NOT NULL DEFAULT 'inactive',
  current_period_start  TIMESTAMPTZ NULL,
  current_period_end    TIMESTAMPTZ NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- updated_at trigger (reuses existing function from initial_schema)
DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- 3. Create payments table
-- =============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id   UUID NULL REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount            NUMERIC NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'BRL',
  status            TEXT NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON payments(subscription_id);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- 4. Row Level Security
-- =============================================================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Subscriptions: users can SELECT only their own
DROP POLICY IF EXISTS subscriptions_select ON subscriptions;
CREATE POLICY subscriptions_select ON subscriptions
  FOR SELECT USING (user_id = auth.uid());

-- Payments: users can SELECT only their own
DROP POLICY IF EXISTS payments_select ON payments;
CREATE POLICY payments_select ON payments
  FOR SELECT USING (user_id = auth.uid());
