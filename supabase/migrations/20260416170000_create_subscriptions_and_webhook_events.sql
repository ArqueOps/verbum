-- ============================================================================
-- Verbum — subscriptions + webhook_events tables
-- ============================================================================
-- Required by POST /api/webhooks/caramelou.
--
--   subscriptions   — one row per user, mirrors Caramelou subscription state
--   webhook_events  — append-only log of processed webhook payloads, keyed by
--                     event_id for idempotency
--
-- Access model:
--   - service_role bypasses RLS and is the ONLY writer (used by the webhook).
--   - Authenticated users may read their own subscription row.
--   - webhook_events has RLS enabled with no permissive policies, so
--     anon/authenticated cannot read it (deny-by-default).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. subscriptions
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS subscriptions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  caramelou_subscription_id TEXT UNIQUE,
  plan_id                   TEXT NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'past_due', 'canceled', 'expired')),
  current_period_start      TIMESTAMPTZ,
  current_period_end        TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON subscriptions (status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_caramelou_id
  ON subscriptions (caramelou_subscription_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_select_own" ON subscriptions;
CREATE POLICY "subscriptions_select_own" ON subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2. webhook_events
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS webhook_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     TEXT NOT NULL UNIQUE,
  event_type   TEXT NOT NULL,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payload      JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id
  ON webhook_events (event_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_user_id
  ON webhook_events (user_id);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. updated_at trigger for subscriptions
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS set_updated_at ON subscriptions;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
