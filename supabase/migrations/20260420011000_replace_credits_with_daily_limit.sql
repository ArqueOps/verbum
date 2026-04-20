-- Realignment — Fase 2.2
-- Remover sistema de créditos (nunca foi pedido). Modelo correto:
--   - Free: 1 estudo/dia por usuário
--   - Pago (assinatura ativa): ilimitado
-- Fonte da verdade: companion_memory/verbum-features-completo.md item 6

BEGIN;

-- ============================================================================
-- 1. Nova RPC: check_user_daily_limit
-- Retorna: { can_generate, has_active_subscription, studies_today, daily_limit }
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_user_daily_limit(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_subscription BOOLEAN;
  v_studies_today INT;
  v_daily_limit INT := 1;
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id) INTO v_exists;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'USER_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM subscriptions
    WHERE user_id = p_user_id
      AND status = 'active'
      AND current_period_end > now()
  ) INTO v_has_subscription;

  SELECT COUNT(*) INTO v_studies_today
  FROM studies
  WHERE owner_id = p_user_id
    AND created_at::date = (now() AT TIME ZONE 'UTC')::date;

  RETURN jsonb_build_object(
    'has_active_subscription', COALESCE(v_has_subscription, false),
    'studies_today', v_studies_today,
    'daily_limit', v_daily_limit,
    'can_generate', COALESCE(v_has_subscription, false) OR v_studies_today < v_daily_limit
  );
END;
$$;

-- ============================================================================
-- 2. Nova RPC: save_study_with_daily_limit (substitui consume_credit_and_save_study)
-- Insere estudo se o limite diário não foi atingido. Estudos free sempre is_published=true.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.save_study_with_daily_limit(
  p_user_id uuid,
  p_title text,
  p_content text,
  p_book text DEFAULT NULL,
  p_chapter integer DEFAULT NULL,
  p_verse_start integer DEFAULT NULL,
  p_verse_end integer DEFAULT NULL,
  p_sections jsonb DEFAULT '[]'::jsonb,
  p_version_id uuid DEFAULT NULL,
  p_slug text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_subscription BOOLEAN;
  v_studies_today INT;
  v_study_id UUID;
  v_section JSONB;
  v_is_public BOOLEAN;
  v_verse_ref TEXT;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM subscriptions
    WHERE user_id = p_user_id
      AND status = 'active'
      AND current_period_end > now()
  ) INTO v_has_subscription;

  -- Check daily limit only if no subscription
  IF NOT v_has_subscription THEN
    SELECT COUNT(*) INTO v_studies_today
    FROM studies
    WHERE owner_id = p_user_id
      AND created_at::date = (now() AT TIME ZONE 'UTC')::date;

    IF v_studies_today >= 1 THEN
      RAISE EXCEPTION 'DAILY_LIMIT_REACHED' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  -- Free tier: studies are always public. Paid: default to public, user can toggle later.
  v_is_public := true;

  -- Build verse reference
  v_verse_ref := p_book;
  IF p_chapter IS NOT NULL THEN
    v_verse_ref := v_verse_ref || ' ' || p_chapter::text;
  END IF;
  IF p_verse_start IS NOT NULL THEN
    v_verse_ref := v_verse_ref || ':' || p_verse_start::text;
    IF p_verse_end IS NOT NULL AND p_verse_end <> p_verse_start THEN
      v_verse_ref := v_verse_ref || '-' || p_verse_end::text;
    END IF;
  END IF;

  INSERT INTO studies (
    owner_id, user_id, title, content, book, chapter,
    verse_start, verse_end, verse_reference,
    is_public, is_published, version_id, slug
  )
  VALUES (
    p_user_id, p_user_id, p_title, p_content, p_book, p_chapter,
    p_verse_start, p_verse_end, v_verse_ref,
    v_is_public, v_is_public, p_version_id, p_slug
  )
  RETURNING id INTO v_study_id;

  -- Insert sections
  FOR v_section IN SELECT * FROM jsonb_array_elements(p_sections)
  LOOP
    INSERT INTO study_sections (
      study_id, section_type, title, content, display_order, order_index
    )
    VALUES (
      v_study_id,
      (v_section->>'section_type')::section_type,
      v_section->>'title',
      v_section->>'content',
      COALESCE((v_section->>'display_order')::SMALLINT, (v_section->>'order_index')::SMALLINT, 0),
      COALESCE((v_section->>'order_index')::INT, (v_section->>'display_order')::INT, 0)
    );
  END LOOP;

  RETURN v_study_id;
END;
$$;

-- ============================================================================
-- 3. Drop RPCs antigas (frontend foi migrado nesta PR)
-- ============================================================================
DROP FUNCTION IF EXISTS public.check_user_credits(uuid);
DROP FUNCTION IF EXISTS public.consume_credit_and_save_study(uuid, text, text, text, integer, integer, integer, jsonb);

-- ============================================================================
-- 4. Drop coluna credits_remaining de profiles (agora é inútil)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'credits_remaining'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN credits_remaining;
  END IF;
END $$;

-- ============================================================================
-- 5. Drop tabela user_credits se ela ainda existir (não é usada)
-- ============================================================================
DROP TABLE IF EXISTS public.user_credits CASCADE;

-- ============================================================================
-- 6. Índice btree composto em studies(owner_id, created_at DESC).
-- O planner usa range scan em created_at para COUNT do daily limit.
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_studies_owner_created
  ON public.studies (owner_id, created_at DESC);

COMMIT;
