-- Add columns required by admin dashboard metrics:
--   plan_interval      — monthly / yearly / etc.
--   canceled_at        — when the subscription was canceled
--   cancellation_reason — free-text reason from Caramelou webhook

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS plan_interval        TEXT,
  ADD COLUMN IF NOT EXISTS canceled_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason  TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_canceled_at
  ON subscriptions (canceled_at)
  WHERE canceled_at IS NOT NULL;
