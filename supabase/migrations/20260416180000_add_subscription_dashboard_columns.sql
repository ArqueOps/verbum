-- ============================================================================
-- Add dashboard-metric columns to subscriptions
-- ============================================================================
-- Columns needed for admin dashboard: MRR calculation (price_cents,
-- plan_interval), churn analysis (canceled_at, cancellation_reason).
--
-- Rollback: ALTER TABLE subscriptions DROP COLUMN plan_interval,
--           DROP COLUMN price_cents, DROP COLUMN canceled_at,
--           DROP COLUMN cancellation_reason;
--           DROP INDEX IF EXISTS idx_subscriptions_canceled_at;
-- ============================================================================

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS plan_interval TEXT NOT NULL DEFAULT 'monthly'
    CHECK (plan_interval IN ('monthly', 'annual'));

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS price_cents INTEGER NOT NULL DEFAULT 0;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_canceled_at
  ON subscriptions (canceled_at)
  WHERE canceled_at IS NOT NULL;
