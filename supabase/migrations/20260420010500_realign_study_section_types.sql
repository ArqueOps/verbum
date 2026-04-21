-- Realignment — Fase 2.1
-- Adicionar os 7 section_type corretos (fonte: companion_memory/verbum-prompt.md)
-- e marcar estudos antigos com legacy_structure=true para render compatível.
--
-- Enum antigo (no DB): context, key_words, cross_references, theological_analysis,
--   historical_context, practical_application, reflection_questions
-- Enum novo (pedido pelo usuário):
--   panorama, contexto, estrutura_contextual, sintese_exegetica,
--   analise_hermeneutica, analise_escatologica, conclusao

BEGIN;

-- ============================================================================
-- 1. Adicionar novos labels ao enum section_type
-- ============================================================================
-- ALTER TYPE ... ADD VALUE não pode rodar em transação junto com outras
-- operações DDL em Postgres < 14. Verbum está em PG 17 onde isso é suportado
-- dentro de um bloco DO.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'panorama' AND enumtypid = 'public.section_type'::regtype) THEN
    ALTER TYPE public.section_type ADD VALUE IF NOT EXISTS 'panorama';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'contexto' AND enumtypid = 'public.section_type'::regtype) THEN
    ALTER TYPE public.section_type ADD VALUE IF NOT EXISTS 'contexto';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'estrutura_contextual' AND enumtypid = 'public.section_type'::regtype) THEN
    ALTER TYPE public.section_type ADD VALUE IF NOT EXISTS 'estrutura_contextual';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'sintese_exegetica' AND enumtypid = 'public.section_type'::regtype) THEN
    ALTER TYPE public.section_type ADD VALUE IF NOT EXISTS 'sintese_exegetica';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'analise_hermeneutica' AND enumtypid = 'public.section_type'::regtype) THEN
    ALTER TYPE public.section_type ADD VALUE IF NOT EXISTS 'analise_hermeneutica';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'analise_escatologica' AND enumtypid = 'public.section_type'::regtype) THEN
    ALTER TYPE public.section_type ADD VALUE IF NOT EXISTS 'analise_escatologica';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'conclusao' AND enumtypid = 'public.section_type'::regtype) THEN
    ALTER TYPE public.section_type ADD VALUE IF NOT EXISTS 'conclusao';
  END IF;
END $$;

-- ============================================================================
-- 2. Adicionar coluna legacy_structure em studies
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'studies' AND column_name = 'legacy_structure'
  ) THEN
    ALTER TABLE public.studies ADD COLUMN legacy_structure BOOLEAN NOT NULL DEFAULT false;
    COMMENT ON COLUMN public.studies.legacy_structure IS
      'true = estudo foi gerado com estrutura antiga de 7 seções (context, key_words, theological_analysis, etc.). false = estrutura correta atual (panorama, contexto, estrutura_contextual, sintese_exegetica, analise_hermeneutica, analise_escatologica, conclusao).';
  END IF;
END $$;

-- ============================================================================
-- 3. Backfill: todos estudos existentes são legacy (foram gerados com prompt antigo)
-- ============================================================================
UPDATE public.studies
SET legacy_structure = true
WHERE created_at < NOW()
  AND legacy_structure = false;

COMMIT;
