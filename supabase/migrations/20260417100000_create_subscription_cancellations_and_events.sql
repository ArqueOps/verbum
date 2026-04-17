-- Migration: 20260417100000_create_subscription_cancellations_and_events.sql
-- Description: Creates subscription_cancellations and subscription_events tables with RLS policies
-- Rollback: DROP POLICY IF EXISTS "events_select_own" ON subscription_events;
--           DROP POLICY IF EXISTS "cancellations_select_own" ON subscription_cancellations;
--           DROP POLICY IF EXISTS "cancellations_insert_own" ON subscription_cancellations;
--           DROP TABLE IF EXISTS subscription_events;
--           DROP TABLE IF EXISTS subscription_cancellations;

-- Up

-- ============================================================
-- Table: subscription_cancellations
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  feedback TEXT,
  cancelled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_cancellations_user_id
  ON subscription_cancellations (user_id);

ALTER TABLE subscription_cancellations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cancellations_insert_own" ON subscription_cancellations
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "cancellations_select_own" ON subscription_cancellations
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- Table: subscription_events
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('subscription_monthly', 'subscription_annual', 'renewal', 'cancellation')),
  amount NUMERIC(10,2),
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
  event_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  caramelou_event_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_user_event
  ON subscription_events (user_id, event_date DESC);

ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select_own" ON subscription_events
  FOR SELECT TO authenticated USING (user_id = auth.uid());
