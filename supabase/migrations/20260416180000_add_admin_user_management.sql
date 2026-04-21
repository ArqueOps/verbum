-- ============================================================================
-- Verbum — Admin user management support
-- ============================================================================
-- Adds columns and tables required by admin user management endpoints:
--   1. profiles.is_active          — soft-deactivate accounts
--   2. subscriptions columns       — canceled_at, cancellation_reason, plan_interval
--   3. subscription_admin_actions  — audit log for admin subscription operations
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. profiles.is_active
-- ----------------------------------------------------------------------------

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ----------------------------------------------------------------------------
-- 2. subscriptions — extra columns for admin operations
-- ----------------------------------------------------------------------------

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS plan_interval TEXT CHECK (plan_interval IN ('monthly', 'annual'));

-- ----------------------------------------------------------------------------
-- 3. subscription_admin_actions — audit log
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS subscription_admin_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type     TEXT NOT NULL CHECK (action_type IN ('grant', 'revoke', 'extend')),
  reason          TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_admin_actions_user_id
  ON subscription_admin_actions (user_id);

CREATE INDEX IF NOT EXISTS idx_subscription_admin_actions_admin_id
  ON subscription_admin_actions (admin_id);

ALTER TABLE subscription_admin_actions ENABLE ROW LEVEL SECURITY;
