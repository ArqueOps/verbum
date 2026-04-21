-- Migration: 20260415200000_rls_user_credits_and_fix_study_sections.sql
-- Description: Creates user_credits table with RLS (SELECT own only, no direct
--   INSERT/UPDATE/DELETE), fixes study_sections RLS to use correct column names
--   (owner_id, is_published), and creates consume_credit_and_save_study RPC
--   as SECURITY DEFINER for atomic credit consumption + study persistence.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.consume_credit_and_save_study(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB);
--   DROP TRIGGER IF EXISTS on_profile_created_credits ON public.profiles;
--   DROP FUNCTION IF EXISTS public.create_user_credits();
--   DROP POLICY IF EXISTS "user_credits_select_own" ON public.user_credits;
--   DROP TABLE IF EXISTS public.user_credits;
--   -- (study_sections policies would need manual re-creation if rolled back)

-- =============================================================================
-- 1. Create user_credits table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id     UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance     INTEGER NOT NULL DEFAULT 3,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_credits IS 'Per-user credit balance. One row per user. Writes only via SECURITY DEFINER functions or service_role.';
COMMENT ON COLUMN public.user_credits.balance IS 'Available credits for study generation. Decremented atomically by consume_credit_and_save_study().';

-- Index for quick lookups (PK already covers user_id, but explicit for clarity)
-- No additional index needed since user_id is the PK.

-- Updated_at trigger
CREATE TRIGGER set_updated_at_user_credits
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- 2. Auto-create user_credits row when a profile is created
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, balance)
  VALUES (NEW.id, 3)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_credits ON public.profiles;
CREATE TRIGGER on_profile_created_credits
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_credits();

-- Backfill: create user_credits rows for existing profiles that don't have one
INSERT INTO public.user_credits (user_id, balance)
SELECT p.id, p.credits_remaining
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_credits uc WHERE uc.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- =============================================================================
-- 3. RLS on user_credits — SELECT own only, no direct INSERT/UPDATE/DELETE
-- =============================================================================

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Users can only read their own credit balance
DROP POLICY IF EXISTS "user_credits_select_own" ON public.user_credits;
CREATE POLICY "user_credits_select_own" ON public.user_credits
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- No INSERT, UPDATE, or DELETE policies for authenticated/anon.
-- Only service_role (which bypasses RLS) and SECURITY DEFINER functions
-- can modify user_credits rows.


-- =============================================================================
-- 4. Fix study_sections RLS — correct column references
-- =============================================================================
-- The previous migration used studies.user_id and studies.is_public, but the
-- actual columns are studies.owner_id and studies.is_published.
-- =============================================================================

-- SELECT for authenticated: own studies + published studies
DROP POLICY IF EXISTS "study_sections_select" ON public.study_sections;
CREATE POLICY "study_sections_select" ON public.study_sections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.studies
      WHERE studies.id = study_sections.study_id
        AND (studies.owner_id = auth.uid() OR studies.is_published = true)
    )
  );

-- SELECT for anon: only published studies
DROP POLICY IF EXISTS "study_sections_select_anon" ON public.study_sections;
CREATE POLICY "study_sections_select_anon" ON public.study_sections
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.studies
      WHERE studies.id = study_sections.study_id
        AND studies.is_published = true
    )
  );

-- INSERT: denied to all (only via consume_credit_and_save_study RPC)
-- Drop any existing insert policy to enforce denial
DROP POLICY IF EXISTS "study_sections_insert" ON public.study_sections;

-- UPDATE: users can update sections of their own studies
DROP POLICY IF EXISTS "study_sections_update" ON public.study_sections;
CREATE POLICY "study_sections_update" ON public.study_sections
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.studies
      WHERE studies.id = study_sections.study_id
        AND studies.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.studies
      WHERE studies.id = study_sections.study_id
        AND studies.owner_id = auth.uid()
    )
  );

-- DELETE: users can delete sections of their own studies
DROP POLICY IF EXISTS "study_sections_delete" ON public.study_sections;
CREATE POLICY "study_sections_delete" ON public.study_sections
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.studies
      WHERE studies.id = study_sections.study_id
        AND studies.owner_id = auth.uid()
    )
  );

-- =============================================================================
-- 5. Fix studies RLS — correct column references
-- =============================================================================
-- The studies RLS policies in enable_rls_policies.sql also used incorrect
-- column names (user_id instead of owner_id, is_public instead of is_published).
-- Fix them here for consistency.
-- =============================================================================

DROP POLICY IF EXISTS "studies_select_own" ON public.studies;
CREATE POLICY "studies_select_own" ON public.studies
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR is_published = true
  );

DROP POLICY IF EXISTS "studies_select_anon" ON public.studies;
CREATE POLICY "studies_select_anon" ON public.studies
  FOR SELECT
  TO anon
  USING (is_published = true);

DROP POLICY IF EXISTS "studies_insert" ON public.studies;
CREATE POLICY "studies_insert" ON public.studies
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "studies_update" ON public.studies;
CREATE POLICY "studies_update" ON public.studies
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "studies_delete" ON public.studies;
CREATE POLICY "studies_delete" ON public.studies
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- =============================================================================
-- 6. consume_credit_and_save_study — SECURITY DEFINER RPC
-- =============================================================================
-- Atomically: check credit → decrement → insert study → insert sections.
-- Runs as the function owner (bypasses RLS), ensuring the atomic operation
-- cannot be circumvented by client-side policy restrictions.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.consume_credit_and_save_study(
  p_title TEXT,
  p_slug TEXT,
  p_verse_reference TEXT,
  p_content TEXT,
  p_model_used TEXT,
  p_language TEXT DEFAULT 'pt',
  p_sections JSONB DEFAULT '[]'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_study_id UUID;
  v_credit_balance INTEGER;
  v_section JSONB;
BEGIN
  -- Identify the calling user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock and check credit balance
  SELECT balance INTO v_credit_balance
  FROM user_credits
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_credit_balance IS NULL THEN
    RAISE EXCEPTION 'No credit record found for user';
  END IF;

  IF v_credit_balance <= 0 THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Decrement credit atomically
  UPDATE user_credits
  SET balance = balance - 1,
      updated_at = now()
  WHERE user_id = v_user_id;

  -- Also keep profiles.credits_remaining in sync
  UPDATE profiles
  SET credits_remaining = GREATEST(credits_remaining - 1, 0),
      updated_at = now()
  WHERE id = v_user_id;

  -- Insert the study
  INSERT INTO studies (owner_id, slug, title, verse_reference, content, model_used, language)
  VALUES (v_user_id, p_slug, p_title, p_verse_reference, p_content, p_model_used, p_language)
  RETURNING id INTO v_study_id;

  -- Insert sections from JSONB array
  INSERT INTO study_sections (study_id, section_type, title, content, display_order)
  SELECT
    v_study_id,
    (elem->>'section_type')::section_type,
    elem->>'title',
    elem->>'content',
    (elem->>'display_order')::SMALLINT
  FROM jsonb_array_elements(p_sections) AS elem;

  RETURN v_study_id;
END;
$$;

COMMENT ON FUNCTION public.consume_credit_and_save_study IS 'Atomically consumes one credit and persists a study with its sections. SECURITY DEFINER to bypass RLS for the atomic operation.';

-- Grant execute to authenticated users only
REVOKE ALL ON FUNCTION public.consume_credit_and_save_study(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_credit_and_save_study(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
