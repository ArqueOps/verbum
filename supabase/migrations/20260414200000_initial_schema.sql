-- Verbum: Initial Database Schema
-- Designed by Esdras (Schema Designer)
-- Follows consensus-corrected spec: 5 core tables + 1 optional
-- Reference tables use SERIAL PKs for performance; domain entities use UUID

-- =============================================================================
-- 1. Custom Types
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('free', 'premium', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 2. Profiles (linked to auth.users)
-- =============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name      TEXT,
  avatar_url        TEXT,
  role              user_role NOT NULL DEFAULT 'free',
  preferred_version INTEGER,  -- FK added after bible_versions exists
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 3. Bible Reference Tables (SERIAL PKs for performance)
-- =============================================================================

CREATE TABLE IF NOT EXISTS bible_versions (
  id          SERIAL PRIMARY KEY,
  abbr        TEXT NOT NULL UNIQUE,         -- e.g. 'NVI', 'ARA', 'KJV', 'BHS', 'NA28'
  name        TEXT NOT NULL,                -- full name
  language    TEXT NOT NULL DEFAULT 'pt',   -- ISO 639-1
  is_original BOOLEAN NOT NULL DEFAULT false, -- true for Hebrew/Greek source texts
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK from profiles.preferred_version -> bible_versions
ALTER TABLE profiles
  ADD CONSTRAINT fk_profiles_preferred_version
  FOREIGN KEY (preferred_version) REFERENCES bible_versions(id);

CREATE TABLE IF NOT EXISTS books (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,               -- canonical Portuguese name
  abbr           TEXT NOT NULL UNIQUE,         -- e.g. 'Gn', 'Ex', 'Mt'
  testament      TEXT NOT NULL CHECK (testament IN ('OT', 'NT')),
  position       INTEGER NOT NULL UNIQUE,      -- canonical order 1-66
  chapters_count INTEGER NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chapters (
  id             SERIAL PRIMARY KEY,
  book_id        INTEGER NOT NULL REFERENCES books(id),
  chapter_number INTEGER NOT NULL,
  verses_count   INTEGER NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (book_id, chapter_number)
);

-- =============================================================================
-- 4. Studies (UUID PK - user-generated content)
-- =============================================================================

CREATE TABLE IF NOT EXISTS studies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  verse_reference TEXT NOT NULL,         -- e.g. 'Jo 3:16', 'Gn 1:1-3'
  content         TEXT NOT NULL,         -- markdown blob (AI-generated study)
  model_used      TEXT NOT NULL,         -- e.g. 'gpt-5.4'
  language        TEXT NOT NULL DEFAULT 'pt',
  is_published    BOOLEAN NOT NULL DEFAULT false,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 5. User API Credentials (optional - for users with own API keys)
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_api_credentials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL DEFAULT 'openai',
  encrypted_key TEXT NOT NULL,            -- encrypted API key (never plain text)
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

-- =============================================================================
-- 6. Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_chapters_book ON chapters(book_id);
CREATE INDEX IF NOT EXISTS idx_studies_owner ON studies(owner_id);
CREATE INDEX IF NOT EXISTS idx_studies_slug ON studies(slug);
CREATE INDEX IF NOT EXISTS idx_studies_published ON studies(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_books_position ON books(position);
CREATE INDEX IF NOT EXISTS idx_bible_versions_language ON bible_versions(language);
CREATE INDEX IF NOT EXISTS idx_user_api_credentials_user ON user_api_credentials(user_id);

-- =============================================================================
-- 7. Updated_at Trigger Function
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bible_versions_updated_at
  BEFORE UPDATE ON bible_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_chapters_updated_at
  BEFORE UPDATE ON chapters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_studies_updated_at
  BEFORE UPDATE ON studies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_user_api_credentials_updated_at
  BEFORE UPDATE ON user_api_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- 8. Handle New User (auto-create profile on signup)
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- 9. Row Level Security
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_credentials ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles, update only their own
CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (true);

CREATE POLICY profiles_update ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Bible reference tables: public read (no auth required)
CREATE POLICY bible_versions_select ON bible_versions
  FOR SELECT USING (true);

CREATE POLICY books_select ON books
  FOR SELECT USING (true);

CREATE POLICY chapters_select ON chapters
  FOR SELECT USING (true);

-- Studies: published studies are public (blog), own studies always visible
CREATE POLICY studies_select ON studies
  FOR SELECT USING (
    is_published = true
    OR owner_id = auth.uid()
  );

CREATE POLICY studies_insert ON studies
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY studies_update ON studies
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY studies_delete ON studies
  FOR DELETE USING (owner_id = auth.uid());

-- User API credentials: only own credentials
CREATE POLICY user_api_credentials_select ON user_api_credentials
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY user_api_credentials_insert ON user_api_credentials
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY user_api_credentials_update ON user_api_credentials
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY user_api_credentials_delete ON user_api_credentials
  FOR DELETE USING (user_id = auth.uid());
