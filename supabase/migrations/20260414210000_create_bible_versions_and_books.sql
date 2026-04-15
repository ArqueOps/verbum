-- Migration: Create bible_versions and bible_books tables
-- Description: Core reference tables for Bible translations and canonical book catalog

-- =============================================================================
-- Table: bible_versions
-- Stores Bible translations/versions (e.g., NVI, ARA, KJV)
-- =============================================================================
CREATE TABLE IF NOT EXISTS bible_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  language TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE bible_versions IS 'Bible translations and versions available in the system';
COMMENT ON COLUMN bible_versions.slug IS 'Unique short identifier (e.g., nvi, ara, acf, kjv, niv)';
COMMENT ON COLUMN bible_versions.language IS 'ISO 639-1 language code (e.g., pt, en, es)';
COMMENT ON COLUMN bible_versions.is_active IS 'Whether this version is available for reading';

-- Indexes for bible_versions
CREATE INDEX IF NOT EXISTS idx_bible_versions_language ON bible_versions (language);
CREATE INDEX IF NOT EXISTS idx_bible_versions_is_active ON bible_versions (is_active);

-- =============================================================================
-- Table: bible_books
-- Stores the 66 canonical Bible books with ordering and metadata
-- =============================================================================
CREATE TABLE IF NOT EXISTS bible_books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL UNIQUE,
  testament TEXT NOT NULL CHECK (testament IN ('old', 'new')),
  position INTEGER NOT NULL UNIQUE,
  total_chapters INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Sanity constraints
  CONSTRAINT bible_books_position_positive CHECK (position > 0),
  CONSTRAINT bible_books_total_chapters_positive CHECK (total_chapters > 0)
);

COMMENT ON TABLE bible_books IS 'Canonical Bible books (66 books, Old and New Testament)';
COMMENT ON COLUMN bible_books.abbreviation IS 'Standard abbreviation (e.g., Gn, Ex, Mt, Jo)';
COMMENT ON COLUMN bible_books.testament IS 'old = Old Testament (1-39), new = New Testament (40-66)';
COMMENT ON COLUMN bible_books.position IS 'Canonical order (1 = Genesis, 66 = Revelation)';

-- Indexes for bible_books
CREATE INDEX IF NOT EXISTS idx_bible_books_testament ON bible_books (testament);
CREATE INDEX IF NOT EXISTS idx_bible_books_position ON bible_books (position);

-- =============================================================================
-- Trigger: updated_at auto-update
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bible_versions_updated_at
  BEFORE UPDATE ON bible_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bible_books_updated_at
  BEFORE UPDATE ON bible_books
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- RLS: Enable Row Level Security (policies delegated to Obadias)
-- =============================================================================
ALTER TABLE bible_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_books ENABLE ROW LEVEL SECURITY;
