-- Migration: 20260417200000_add_firebase_uid_to_profiles.sql
-- Description: Adds firebase_uid column to profiles and helper function for OAuth identity insertion.
--   Used by scripts/migrate-firebase-auth to track which Firebase users have already been migrated.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS firebase_uid TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_firebase_uid
  ON public.profiles (firebase_uid)
  WHERE firebase_uid IS NOT NULL;

CREATE OR REPLACE FUNCTION public.insert_oauth_identity(
  p_id TEXT,
  p_user_id UUID,
  p_provider_id TEXT,
  p_provider TEXT,
  p_identity_data JSONB,
  p_timestamp TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES (p_id, p_user_id, p_provider_id, p_provider, p_identity_data, p_timestamp, p_timestamp, p_timestamp)
  ON CONFLICT (provider, provider_id) DO NOTHING;
END;
$$;
