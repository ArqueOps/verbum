-- Migration: 20260416180000_add_admin_moderation_and_subscription_management.sql
-- Description: Add columns for admin moderation (studies unpublish reason, profile
--   deactivation) and subscription lifecycle tracking (plan_interval, canceled_at,
--   cancellation_reason). Create subscription_admin_actions audit table.
-- Depends on: 20260416170000_create_subscriptions_and_webhook_events.sql
-- Rollback:
--   DROP TABLE IF EXISTS subscription_admin_actions;
--   ALTER TABLE subscriptions DROP COLUMN IF EXISTS cancellation_reason;
--   ALTER TABLE subscriptions DROP COLUMN IF EXISTS canceled_at;
--   ALTER TABLE subscriptions DROP COLUMN IF EXISTS plan_interval;
--   ALTER TABLE profiles DROP COLUMN IF EXISTS is_active;
--   ALTER TABLE studies DROP COLUMN IF EXISTS unpublish_reason;

-- ============================================================================
-- 1. studies.unpublish_reason — moderation reason when admin unpublishes
-- ============================================================================

ALTER TABLE studies ADD COLUMN IF NOT EXISTS unpublish_reason TEXT;

-- ============================================================================
-- 2. profiles.is_active — admin account deactivation flag
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ============================================================================
-- 3. subscriptions — lifecycle tracking columns
-- ============================================================================

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_interval TEXT
  CHECK (plan_interval IN ('monthly', 'annual'));

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- ============================================================================
-- 4. subscription_admin_actions — audit log for admin grant/revoke/extend
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_admin_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type     TEXT NOT NULL CHECK (action_type IN ('grant', 'revoke', 'extend')),
  plan_interval   TEXT CHECK (plan_interval IN ('monthly', 'annual')),
  period_months   INTEGER,
  extend_days     INTEGER,
  reason          TEXT,
  performed_by    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 5. Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_subscription_admin_actions_user_id
  ON subscription_admin_actions (user_id);

CREATE INDEX IF NOT EXISTS idx_subscription_admin_actions_subscription_id
  ON subscription_admin_actions (subscription_id);

-- ============================================================================
-- 6. RLS — admin-only read, service_role writes (bypasses RLS)
-- ============================================================================

ALTER TABLE subscription_admin_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_admin_actions_select_admin" ON subscription_admin_actions;
CREATE POLICY "subscription_admin_actions_select_admin" ON subscription_admin_actions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
