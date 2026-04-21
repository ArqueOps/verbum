-- Realignment — Fase 3.7
-- Blog expandido. Fonte: verbum-features-completo.md funcionalidade #3.
-- Adiciona joinha (feedback), comentários, CTAs configuráveis por admin,
-- anúncios configuráveis por admin, e compartilhamentos por canal.

BEGIN;

-- ============================================================================
-- Feedback (joinha up/down) por estudo
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.study_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id uuid NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  anon_fingerprint text,                         -- hash IP+UA para anon
  useful boolean NOT NULL,                       -- true = joinha up, false = down
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (study_id, user_id),
  CHECK (user_id IS NOT NULL OR anon_fingerprint IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_study_feedback_study ON public.study_feedback(study_id);

ALTER TABLE public.study_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_feedback_public_read" ON public.study_feedback;
CREATE POLICY "study_feedback_public_read"
  ON public.study_feedback FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "study_feedback_auth_insert" ON public.study_feedback;
CREATE POLICY "study_feedback_auth_insert"
  ON public.study_feedback FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- Comentários em estudos
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.study_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id uuid NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  is_hidden boolean DEFAULT false,               -- admin pode ocultar
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_study_comments_study ON public.study_comments(study_id, created_at DESC);

ALTER TABLE public.study_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_comments_public_read" ON public.study_comments;
CREATE POLICY "study_comments_public_read"
  ON public.study_comments FOR SELECT
  TO anon, authenticated USING (is_hidden = false);

DROP POLICY IF EXISTS "study_comments_auth_insert" ON public.study_comments;
CREATE POLICY "study_comments_auth_insert"
  ON public.study_comments FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "study_comments_owner_update" ON public.study_comments;
CREATE POLICY "study_comments_owner_update"
  ON public.study_comments FOR UPDATE
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "study_comments_owner_delete" ON public.study_comments;
CREATE POLICY "study_comments_owner_delete"
  ON public.study_comments FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- ============================================================================
-- CTAs configuráveis por admin
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.site_ctas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement text NOT NULL CHECK (placement IN ('blog_end','blog_inline','sidebar','popup')),
  title text NOT NULL,
  body text,
  button_text text NOT NULL,
  button_href text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_site_ctas_placement_active ON public.site_ctas(placement, active);

ALTER TABLE public.site_ctas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_ctas_public_read" ON public.site_ctas;
CREATE POLICY "site_ctas_public_read"
  ON public.site_ctas FOR SELECT
  TO anon, authenticated
  USING (active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));

-- admin write via service_role only; no policies for user roles.

-- ============================================================================
-- Anúncios configuráveis
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.site_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement text NOT NULL CHECK (placement IN ('popup','banner_top','banner_side','inline')),
  title text,
  body text,
  image_url text,
  link_href text,
  target_audience jsonb DEFAULT '{}'::jsonb,     -- ex: {"locale":"pt-BR","min_age":18}
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  impressions_count int NOT NULL DEFAULT 0,
  clicks_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_site_ads_placement_active ON public.site_ads(placement, active);

ALTER TABLE public.site_ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_ads_public_read" ON public.site_ads;
CREATE POLICY "site_ads_public_read"
  ON public.site_ads FOR SELECT
  TO anon, authenticated
  USING (active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));

-- ============================================================================
-- Eventos de compartilhamento por canal
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.share_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id uuid NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  channel text NOT NULL,                         -- 'web_share_api','whatsapp','copy_link','twitter','facebook'
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  anon_fingerprint text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_share_events_study ON public.share_events(study_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_share_events_channel ON public.share_events(channel, created_at DESC);

ALTER TABLE public.share_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "share_events_public_insert" ON public.share_events;
CREATE POLICY "share_events_public_insert"
  ON public.share_events FOR INSERT
  TO anon, authenticated WITH CHECK (true);

COMMIT;
