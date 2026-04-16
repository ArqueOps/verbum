-- Migration: Create webhook_events table for idempotency and audit of Caramelou/Stripe webhooks
-- Description:
--   Stores every webhook event received from the payments provider (Caramelou relaying
--   Stripe events) so the webhook endpoint can guarantee idempotent processing and
--   retain a full audit trail of subscription-related events.
-- Rollback:
--   DROP TABLE IF EXISTS public.webhook_events CASCADE;

-- =============================================================================
-- Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      TEXT NOT NULL UNIQUE,
  event_type    TEXT NOT NULL,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  payload       JSONB NOT NULL,
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.webhook_events IS
  'Idempotency and audit log for payment provider webhooks (Caramelou/Stripe). Only writable by service_role via the webhook endpoint.';
COMMENT ON COLUMN public.webhook_events.event_id IS
  'Provider-assigned unique event identifier (e.g. Stripe evt_...). UNIQUE to block duplicate processing.';
COMMENT ON COLUMN public.webhook_events.user_id IS
  'Resolved Verbum user. NULL when the customer email cannot be matched to an existing profile.';
COMMENT ON COLUMN public.webhook_events.payload IS
  'Full webhook payload as received from the provider, retained for audit and re-processing.';

-- =============================================================================
-- Indexes
-- Note: the UNIQUE constraint on event_id auto-creates a btree index, which
-- already provides the O(1) idempotency lookup required by the endpoint.
-- An explicit index on user_id supports audit/history queries per user.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_webhook_events_user_id
  ON public.webhook_events (user_id)
  WHERE user_id IS NOT NULL;

-- =============================================================================
-- Row Level Security
-- No policies are defined on purpose: webhook ingestion runs exclusively with
-- the service_role key (which bypasses RLS), and no client role should ever
-- read or write this table. Enabling RLS without policies denies all access
-- to anon and authenticated roles by default.
-- =============================================================================

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
