-- ============================================================================
-- Add dashboard columns to subscriptions table
-- ============================================================================
-- Adds plan_interval, price_cents, canceled_at, cancellation_reason required
-- for admin dashboard metrics (MRR, churn, cancellation breakdown).
--
-- Rollback:
--   ALTER TABLE subscriptions DROP COLUMN IF EXISTS plan_interval;
--   ALTER TABLE subscriptions DROP COLUMN IF EXISTS price_cents;
--   ALTER TABLE subscriptions DROP COLUMN IF EXISTS canceled_at;
--   ALTER TABLE subscriptions DROP COLUMN IF EXISTS cancellation_reason;
--   DROP INDEX IF EXISTS idx_subscriptions_canceled_at;
-- ============================================================================

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS plan_interval TEXT CHECK (plan_interval IN ('monthly', 'annual'));

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS price_cents INTEGER;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_canceled_at
  ON subscriptions (canceled_at);
