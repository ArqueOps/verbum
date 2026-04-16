-- Migration: 20260415100000_add_credits_remaining_and_study_sections.sql
-- Description: Adds credits_remaining column to profiles (free tier = 3 credits),
--   creates section_type enum and study_sections table for the 7 canonical study
--   sections, and adds a trigger to decrement credits on study creation.
-- Rollback:
--   DROP TRIGGER IF EXISTS decrement_credits_on_study ON public.studies;
--   DROP FUNCTION IF EXISTS public.decrement_credits_on_study();
--   DROP TRIGGER IF EXISTS set_updated_at ON public.study_sections;
--   DROP TABLE IF EXISTS public.study_sections;
--   DROP TYPE IF EXISTS section_type;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS credits_remaining;

-- =============================================================================
-- 1. Add credits_remaining to profiles
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credits_remaining INTEGER NOT NULL DEFAULT 3;

-- =============================================================================
-- 2. Create section_type enum
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'section_type') THEN
    CREATE TYPE section_type AS ENUM (
      'context',
      'key_words',
      'cross_references',
      'theological_analysis',
      'historical_context',
      'practical_application',
      'reflection_questions'
    );
  END IF;
END
$$;

-- =============================================================================
-- 3. Create study_sections table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.study_sections (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id       UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  section_type   section_type NOT NULL,
  title          TEXT NOT NULL,
  content        TEXT NOT NULL,
  display_order  SMALLINT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS (idempotent — safe even if already enabled by prior migration)
ALTER TABLE public.study_sections ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_study_sections_study ON public.study_sections(study_id);
CREATE INDEX IF NOT EXISTS idx_study_sections_order ON public.study_sections(study_id, display_order);

-- Updated_at trigger for study_sections
DROP TRIGGER IF EXISTS set_updated_at ON public.study_sections;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.study_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- 4. Trigger: decrement credits_remaining on study INSERT
-- =============================================================================

CREATE OR REPLACE FUNCTION public.decrement_credits_on_study()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET credits_remaining = GREATEST(credits_remaining - 1, 0),
      updated_at = NOW()
  WHERE id = NEW.owner_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS decrement_credits_on_study ON public.studies;
CREATE TRIGGER decrement_credits_on_study
  AFTER INSERT ON public.studies
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_credits_on_study();
