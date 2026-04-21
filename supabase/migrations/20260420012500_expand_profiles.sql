-- Realignment — Fase 3.3
-- Perfil expandido. Fonte: verbum-features-completo.md funcionalidade #4.
-- Campos: sexo (M/F apenas), idade, curiosidade, redes sociais (username-only).

BEGIN;

-- Gender enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender') THEN
    CREATE TYPE public.gender AS ENUM ('male', 'female');
  END IF;
END $$;

-- Profile columns
DO $$
DECLARE
  col_name TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='sex') THEN
    ALTER TABLE public.profiles ADD COLUMN sex public.gender;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='age') THEN
    ALTER TABLE public.profiles ADD COLUMN age SMALLINT CHECK (age IS NULL OR (age >= 10 AND age <= 120));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='curiosity') THEN
    ALTER TABLE public.profiles ADD COLUMN curiosity TEXT CHECK (curiosity IS NULL OR char_length(curiosity) <= 500);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='locale') THEN
    ALTER TABLE public.profiles ADD COLUMN locale TEXT DEFAULT 'pt-BR' CHECK (locale IN ('pt-BR','en','es'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='phone') THEN
    ALTER TABLE public.profiles ADD COLUMN phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='country_code') THEN
    ALTER TABLE public.profiles ADD COLUMN country_code TEXT;
  END IF;
  -- Social usernames (username-only, never URL)
  FOREACH col_name IN ARRAY ARRAY[
    'social_instagram','social_facebook','social_linkedin',
    'social_youtube','social_threads','social_tiktok','social_substack'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='profiles' AND column_name=col_name
    ) THEN
      EXECUTE format('ALTER TABLE public.profiles ADD COLUMN %I TEXT CHECK (%I IS NULL OR char_length(%I) <= 64)', col_name, col_name, col_name);
    END IF;
  END LOOP;
END $$;

COMMENT ON COLUMN public.profiles.sex IS 'male or female (per product spec, only these 2 options)';
COMMENT ON COLUMN public.profiles.curiosity IS 'free text field: "curiosidade sobre a pessoa"';
COMMENT ON COLUMN public.profiles.social_instagram IS 'username only, without @ or URL';

COMMIT;
