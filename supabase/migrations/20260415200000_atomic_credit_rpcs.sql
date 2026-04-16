-- Migration: 20260415200000_atomic_credit_rpcs.sql
-- Description: Creates atomic RPC functions for credit management:
--   1) check_user_credits(UUID) — returns credit state + subscription status
--   2) consume_credit_and_save_study(...) — atomically checks credits, saves study + sections, decrements credit
--   Replaces the non-atomic decrement_credits_on_study trigger with a transactional RPC approach
--   that prevents race conditions via SELECT FOR UPDATE row locking.
-- Rollback:
--   DROP FUNCTION IF EXISTS public.consume_credit_and_save_study(UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, JSONB);
--   DROP FUNCTION IF EXISTS public.check_user_credits(UUID);
--   -- Re-create the old trigger if needed (see migration 20260415100000)

-- =============================================================================
-- 1. Drop the old non-atomic trigger (replaced by RPC)
-- =============================================================================

DROP TRIGGER IF EXISTS decrement_credits_on_study ON public.studies;
DROP FUNCTION IF EXISTS public.decrement_credits_on_study();

-- =============================================================================
-- 2. check_user_credits(p_user_id UUID)
--    Returns JSONB: { credits_remaining, has_active_subscription, can_generate }
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_user_credits(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits INTEGER;
  v_has_subscription BOOLEAN;
BEGIN
  SELECT credits_remaining INTO v_credits
  FROM profiles
  WHERE id = p_user_id;

  IF v_credits IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM subscriptions
    WHERE user_id = p_user_id
      AND status = 'active'
      AND current_period_end > now()
  ) INTO v_has_subscription;

  RETURN jsonb_build_object(
    'credits_remaining', v_credits,
    'has_active_subscription', COALESCE(v_has_subscription, false),
    'can_generate', COALESCE(v_has_subscription, false) OR v_credits > 0
  );
END;
$$;

-- =============================================================================
-- 3. consume_credit_and_save_study(...)
--    Atomic: locks profile row → checks credits/subscription → inserts study
--    + sections → decrements credit (if not subscriber) → returns study_id.
--    Raises NO_CREDITS if user has 0 credits and no active subscription.
--    The entire operation rolls back on any failure (e.g., bad section data).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.consume_credit_and_save_study(
  p_user_id UUID,
  p_title TEXT,
  p_content TEXT,
  p_book TEXT DEFAULT NULL,
  p_chapter INTEGER DEFAULT NULL,
  p_verse_start INTEGER DEFAULT NULL,
  p_verse_end INTEGER DEFAULT NULL,
  p_sections JSONB DEFAULT '[]'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits INTEGER;
  v_has_subscription BOOLEAN;
  v_study_id UUID;
  v_section JSONB;
BEGIN
  -- Lock the profile row to prevent concurrent credit consumption
  SELECT credits_remaining INTO v_credits
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_credits IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND'
      USING ERRCODE = 'P0001';
  END IF;

  -- Check for active subscription
  SELECT EXISTS(
    SELECT 1 FROM subscriptions
    WHERE user_id = p_user_id
      AND status = 'active'
      AND current_period_end > now()
  ) INTO v_has_subscription;

  -- No subscription and no credits → reject
  IF NOT v_has_subscription AND v_credits <= 0 THEN
    RAISE EXCEPTION 'NO_CREDITS'
      USING ERRCODE = 'P0002';
  END IF;

  -- Insert the study
  INSERT INTO studies (user_id, title, content, book, chapter, verse_start, verse_end)
  VALUES (p_user_id, p_title, p_content, p_book, p_chapter, p_verse_start, p_verse_end)
  RETURNING id INTO v_study_id;

  -- Insert sections from JSONB array
  FOR v_section IN SELECT * FROM jsonb_array_elements(p_sections)
  LOOP
    INSERT INTO study_sections (study_id, section_type, title, content, display_order)
    VALUES (
      v_study_id,
      (v_section->>'section_type')::section_type,
      v_section->>'title',
      v_section->>'content',
      (v_section->>'display_order')::SMALLINT
    );
  END LOOP;

  -- Decrement credits only if user does NOT have an active subscription
  IF NOT v_has_subscription THEN
    UPDATE profiles
    SET credits_remaining = credits_remaining - 1,
        updated_at = now()
    WHERE id = p_user_id;
  END IF;

  RETURN v_study_id;
END;
$$;
