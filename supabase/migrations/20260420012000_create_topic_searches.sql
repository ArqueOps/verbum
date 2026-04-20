-- Realignment — Fase 3.2
-- "O que a Bíblia diz sobre...?" — busca por tema.
-- Fonte: verbum-features-completo.md funcionalidade #2.
-- Retorna síntese geral + lista de referências bíblicas (texto original como
-- fonte de verdade, zero referência externa).

BEGIN;

CREATE TABLE IF NOT EXISTS public.topic_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  synthesis text,                 -- síntese geral do que a Bíblia diz
  results jsonb DEFAULT '[]'::jsonb,
  -- results = array de { title, book, chapter, verse_start, verse_end, abbrev, summary, detail }
  language text DEFAULT 'pt-BR',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_topic_searches_user_id_created
  ON public.topic_searches(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_topic_searches_query_gin
  ON public.topic_searches USING gin (to_tsvector('portuguese', query));

-- RLS
ALTER TABLE public.topic_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "topic_searches_owner_all" ON public.topic_searches;
CREATE POLICY "topic_searches_owner_all"
  ON public.topic_searches
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Anon users: nothing visible
DROP POLICY IF EXISTS "topic_searches_anon_deny" ON public.topic_searches;

COMMIT;
