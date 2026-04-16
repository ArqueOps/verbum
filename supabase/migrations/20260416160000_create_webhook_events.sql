-- Migration: 20260416160000_create_webhook_events.sql
-- Description: Creates webhook_events table to log incoming payment webhooks
--   (Stripe events relayed through Caramelou) for idempotent processing and audit.
--   stripe_event_id is UNIQUE to guarantee a given event is processed only once.
-- Rollback:
--   DROP TRIGGER IF EXISTS set_updated_at ON public.webhook_events;
--   DROP TABLE IF EXISTS public.webhook_events;

-- =============================================================================
-- 1. Create webhook_events table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id   TEXT NOT NULL UNIQUE,
  event_type        TEXT NOT NULL,
  payload           JSONB NOT NULL,
  processed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2. Indexes
-- =============================================================================

-- stripe_event_id already has a unique index from the UNIQUE constraint.
-- Filter by event type (e.g. 'invoice.paid', 'customer.subscription.updated').
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type
  ON public.webhook_events(event_type);

-- Partial index to efficiently find unprocessed events for the worker.
CREATE INDEX IF NOT EXISTS idx_webhook_events_unprocessed
  ON public.webhook_events(created_at)
  WHERE processed_at IS NULL;

-- Time-based queries (audit, recent activity).
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at
  ON public.webhook_events(created_at DESC);

-- =============================================================================
-- 3. Updated_at trigger
-- =============================================================================

DROP TRIGGER IF EXISTS set_updated_at ON public.webhook_events;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- 4. Row Level Security
-- =============================================================================

-- This is a server-only audit table: the webhook endpoint (service role) writes
-- and reads it. No policies are created, so end-user clients (anon/authenticated)
-- cannot see or modify rows. Service role bypasses RLS by design.

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
