-- Migration: 20260415200000_study_sections_user_credits_alter_studies.sql
-- Description: Evolves studies table (new columns + content→JSONB), replaces section_type
--   enum with TEXT CHECK constraint (7 new canonical types), creates user_credits table
--   (separate from profiles.credits_remaining), and adds atomic RPCs for credit consumption
--   and credit checking.
-- Rollback:
--   DROP FUNCTION IF EXISTS public.check_user_credits(UUID);
--   DROP FUNCTION IF EXISTS public.consume_credit_and_save_study(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, JSONB);
--   DROP TRIGGER IF EXISTS trg_user_credits_updated_at ON public.user_credits;
--   DROP TABLE IF EXISTS public.user_credits;
--   -- Reverse study_sections changes (column renames, type changes, constraint swap) manually
--   -- Reverse studies ALTER columns manually
--   -- Re-create section_type enum if needed

-- =============================================================================
-- Divergences from current database.ts types (consensus correction #4):
--
-- 1. studies.content: database.ts has `string` (TEXT) → this migration changes to JSONB
--    TypeScript type should become `Json` after regeneration.
-- 2. studies: new columns book_id, chapter, verse_start, verse_end, version_id,
--    generation_time_ms not yet in database.ts — will appear after type regeneration.
-- 3. studies.language: DEFAULT changes from 'pt' to 'pt-BR'. Existing rows keep 'pt'.
-- 4. study_sections.section_type: database.ts has enum with 7 old values → changes to
--    TEXT with CHECK for 7 new values (introduction, historical_context, verse_analysis,
--    theological_reflection, cross_references, practical_application, prayer).
-- 5. study_sections.content: TEXT → JSONB (same as studies.content).
-- 6. study_sections.display_order (SMALLINT) → renamed to order_index (INTEGER).
-- 7. study_sections: adds UNIQUE(study_id, order_index) constraint.
-- 8. user_credits: entirely new table, not in current database.ts.
-- 9. New RPCs consume_credit_and_save_study and check_user_credits not in database.ts.
-- =============================================================================

-- =============================================================================
-- 1. ALTER studies table — add new columns and change content to JSONB
-- =============================================================================

-- 1a. Add structured reference columns (nullable — existing rows lack these)
ALTER TABLE public.studies
  ADD COLUMN IF NOT EXISTS book_id INTEGER REFERENCES public.books(id),
  ADD COLUMN IF NOT EXISTS chapter INTEGER,
  ADD COLUMN IF NOT EXISTS verse_start INTEGER,
  ADD COLUMN IF NOT EXISTS verse_end INTEGER,
  ADD COLUMN IF NOT EXISTS version_id INTEGER REFERENCES public.bible_versions(id),
  ADD COLUMN IF NOT EXISTS generation_time_ms INTEGER;

-- 1b. Change language DEFAULT from 'pt' to 'pt-BR' for new rows
-- (existing rows keep their current value)
ALTER TABLE public.studies
  ALTER COLUMN language SET DEFAULT 'pt-BR';

-- 1c. Change content from TEXT to JSONB
-- Existing TEXT values (markdown) are wrapped as JSON strings via to_jsonb()
ALTER TABLE public.studies
  ALTER COLUMN content TYPE JSONB USING to_jsonb(content);

-- 1d. Indexes for new FK columns
CREATE INDEX IF NOT EXISTS idx_studies_book ON public.studies(book_id);
CREATE INDEX IF NOT EXISTS idx_studies_version ON public.studies(version_id);

-- =============================================================================
-- 2. ALTER study_sections — new section_type values, content→JSONB, rename column
-- =============================================================================

-- 2a. Convert section_type column from enum to TEXT
-- This drops the enum dependency so we can use a CHECK constraint instead
ALTER TABLE public.study_sections
  ALTER COLUMN section_type TYPE TEXT USING section_type::TEXT;

-- 2b. Drop old values, add CHECK constraint for the 7 new canonical types
-- Remove any existing check constraint on section_type first
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'study_sections'
      AND constraint_name = 'study_sections_section_type_check'
  ) THEN
    ALTER TABLE public.study_sections DROP CONSTRAINT study_sections_section_type_check;
  END IF;
END $$;

ALTER TABLE public.study_sections
  ADD CONSTRAINT study_sections_section_type_check
  CHECK (section_type IN (
    'introduction',
    'historical_context',
    'verse_analysis',
    'theological_reflection',
    'cross_references',
    'practical_application',
    'prayer'
  ));

-- 2c. Convert content from TEXT to JSONB
ALTER TABLE public.study_sections
  ALTER COLUMN content TYPE JSONB USING to_jsonb(content);

-- 2d. Rename display_order → order_index (idempotent) and widen to INTEGER
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'study_sections'
      AND column_name = 'display_order'
  ) THEN
    ALTER TABLE public.study_sections RENAME COLUMN display_order TO order_index;
  END IF;
END $$;

ALTER TABLE public.study_sections
  ALTER COLUMN order_index TYPE INTEGER;

-- 2e. Add UNIQUE constraint on (study_id, order_index)
-- Drop the old non-unique index first, replace with unique constraint
DROP INDEX IF EXISTS idx_study_sections_order;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'study_sections_study_id_order_index_key'
  ) THEN
    ALTER TABLE public.study_sections
      ADD CONSTRAINT study_sections_study_id_order_index_key UNIQUE (study_id, order_index);
  END IF;
END $$;

-- 2f. Drop the old section_type enum (no longer used)
DROP TYPE IF EXISTS section_type;

-- =============================================================================
-- 3. CREATE user_credits table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_credits (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  credits_remaining       INTEGER NOT NULL DEFAULT 0 CHECK (credits_remaining >= 0),
  credits_used            INTEGER NOT NULL DEFAULT 0,
  has_active_subscription BOOLEAN NOT NULL DEFAULT false,
  subscription_end        TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_credits_user_id_key UNIQUE (user_id)
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Index on user_id (covered by UNIQUE but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_user_credits_user ON public.user_credits(user_id);

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_user_credits_updated_at ON public.user_credits;
CREATE TRIGGER trg_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- RLS policies for user_credits
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_credits' AND policyname = 'user_credits_select_own'
  ) THEN
    CREATE POLICY user_credits_select_own ON public.user_credits
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_credits' AND policyname = 'user_credits_update_own'
  ) THEN
    CREATE POLICY user_credits_update_own ON public.user_credits
      FOR UPDATE USING (user_id = auth.uid());
  END IF;
END $$;

-- Seed user_credits rows for existing profiles that have credits_remaining
-- This migrates data from profiles.credits_remaining to the new table
INSERT INTO public.user_credits (user_id, credits_remaining, credits_used)
SELECT
  p.id,
  GREATEST(p.credits_remaining, 0),
  0
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_credits uc WHERE uc.user_id = p.id
);

-- =============================================================================
-- 4. RPC: consume_credit_and_save_study
-- =============================================================================

CREATE OR REPLACE FUNCTION public.consume_credit_and_save_study(
  p_user_id         UUID,
  p_slug            TEXT,
  p_title           TEXT,
  p_verse_reference TEXT,
  p_content         JSONB,
  p_model_used      TEXT,
  p_book_id         INTEGER DEFAULT NULL,
  p_chapter         INTEGER DEFAULT NULL,
  p_verse_start     INTEGER DEFAULT NULL,
  p_verse_end       INTEGER DEFAULT NULL,
  p_version_id      INTEGER DEFAULT NULL,
  p_generation_time_ms INTEGER DEFAULT NULL,
  p_language        TEXT DEFAULT 'pt-BR',
  p_sections        JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_sub        BOOLEAN;
  v_sub_end        TIMESTAMPTZ;
  v_credits        INTEGER;
  v_rows_affected  INTEGER;
  v_study_id       UUID;
  v_section        JSONB;
  v_idx            INTEGER := 0;
BEGIN
  -- (a) Check subscription status
  SELECT has_active_subscription, subscription_end, credits_remaining
  INTO v_has_sub, v_sub_end, v_credits
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;  -- lock row for atomicity

  -- If no user_credits row exists, create one with 0 credits
  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, credits_remaining, credits_used)
    VALUES (p_user_id, 0, 0)
    RETURNING has_active_subscription, subscription_end, credits_remaining
    INTO v_has_sub, v_sub_end, v_credits;
  END IF;

  -- (b) If user has active subscription (and not expired), skip credit decrement
  IF v_has_sub = true AND v_sub_end > now() THEN
    -- Subscription active — no credit cost
    NULL;
  ELSE
    -- No active subscription — must consume a credit
    UPDATE public.user_credits
    SET credits_remaining = credits_remaining - 1,
        credits_used = credits_used + 1,
        updated_at = now()
    WHERE user_id = p_user_id
      AND credits_remaining > 0;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    IF v_rows_affected = 0 THEN
      RAISE EXCEPTION 'NO_CREDITS'
        USING HINT = 'User has no remaining credits and no active subscription';
    END IF;

    -- Refresh credits after decrement
    SELECT credits_remaining INTO v_credits
    FROM public.user_credits WHERE user_id = p_user_id;
  END IF;

  -- (c) INSERT into studies
  INSERT INTO public.studies (
    owner_id, slug, title, verse_reference, content, model_used,
    book_id, chapter, verse_start, verse_end, version_id,
    generation_time_ms, language
  )
  VALUES (
    p_user_id, p_slug, p_title, p_verse_reference, p_content, p_model_used,
    p_book_id, p_chapter, p_verse_start, p_verse_end, p_version_id,
    p_generation_time_ms, p_language
  )
  RETURNING id INTO v_study_id;

  -- (d) INSERT sections from JSONB array
  FOR v_section IN SELECT * FROM jsonb_array_elements(p_sections)
  LOOP
    INSERT INTO public.study_sections (
      study_id, section_type, title, content, order_index
    )
    VALUES (
      v_study_id,
      v_section->>'section_type',
      v_section->>'title',
      (v_section->'content')::JSONB,
      v_idx
    );
    v_idx := v_idx + 1;
  END LOOP;

  -- (e) RETURN study record + credits_remaining
  RETURN jsonb_build_object(
    'study_id', v_study_id,
    'slug', p_slug,
    'title', p_title,
    'verse_reference', p_verse_reference,
    'model_used', p_model_used,
    'credits_remaining', v_credits,
    'sections_inserted', v_idx
  );
END;
$$;

-- =============================================================================
-- 5. RPC: check_user_credits
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_user_credits(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'credits_remaining', uc.credits_remaining,
    'has_active_subscription', uc.has_active_subscription,
    'subscription_end', uc.subscription_end
  )
  INTO v_result
  FROM public.user_credits uc
  WHERE uc.user_id = p_user_id;

  -- If no record exists, return defaults
  IF v_result IS NULL THEN
    v_result := jsonb_build_object(
      'credits_remaining', 0,
      'has_active_subscription', false,
      'subscription_end', NULL
    );
  END IF;

  RETURN v_result;
END;
$$;

-- =============================================================================
-- 6. Remove old decrement trigger (credits now handled by RPC atomically)
-- =============================================================================

DROP TRIGGER IF EXISTS decrement_credits_on_study ON public.studies;
-- Keep the function for rollback safety, just detach the trigger
