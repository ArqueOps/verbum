-- Migration: 00001_seed_bible_versions_and_books.sql
-- Description: Creates bible_versions and bible_books tables, enables RLS,
--              and seeds canonical Bible data (7 versions, 66 books).
-- Rollback: DROP TABLE IF EXISTS bible_books; DROP TABLE IF EXISTS bible_versions;

-- =============================================================================
-- UP: Create tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS bible_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  language TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE bible_versions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS bible_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL UNIQUE,
  testament TEXT NOT NULL CHECK (testament IN ('OT', 'NT')),
  position INTEGER NOT NULL,
  total_chapters INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE bible_books ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- SEED: Bible Versions (4 Portuguese + 3 English)
-- =============================================================================

INSERT INTO bible_versions (name, slug, language, description) VALUES
  ('Nova Versão Internacional',       'nvi', 'pt', 'Tradução em português contemporâneo com linguagem acessível'),
  ('Almeida Revista e Atualizada',    'ara', 'pt', 'Revisão moderna da tradução clássica de João Ferreira de Almeida'),
  ('Almeida Corrigida Fiel',          'acf', 'pt', 'Tradução fiel ao Textus Receptus em português'),
  ('Almeida Revista e Corrigida',     'arc', 'pt', 'Versão tradicional amplamente usada nas igrejas brasileiras'),
  ('King James Version',              'kjv', 'en', 'Classic English translation from 1611, widely revered'),
  ('New International Version',       'niv', 'en', 'Modern English translation balancing accuracy and readability'),
  ('New Living Translation',          'nlt', 'en', 'Thought-for-thought English translation in contemporary language')
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- SEED: Bible Books (66 canonical books)
-- =============================================================================

INSERT INTO bible_books (name, abbreviation, testament, position, total_chapters) VALUES
  -- Old Testament (39 books)
  ('Gênesis',            'gn',  'OT',  1, 50),
  ('Êxodo',              'ex',  'OT',  2, 40),
  ('Levítico',           'lv',  'OT',  3, 27),
  ('Números',            'nm',  'OT',  4, 36),
  ('Deuteronômio',       'dt',  'OT',  5, 34),
  ('Josué',              'js',  'OT',  6, 24),
  ('Juízes',             'jz',  'OT',  7, 21),
  ('Rute',               'rt',  'OT',  8,  4),
  ('1 Samuel',           '1sm', 'OT',  9, 31),
  ('2 Samuel',           '2sm', 'OT', 10, 24),
  ('1 Reis',             '1rs', 'OT', 11, 22),
  ('2 Reis',             '2rs', 'OT', 12, 25),
  ('1 Crônicas',         '1cr', 'OT', 13, 29),
  ('2 Crônicas',         '2cr', 'OT', 14, 36),
  ('Esdras',             'ed',  'OT', 15, 10),
  ('Neemias',            'ne',  'OT', 16, 13),
  ('Ester',              'et',  'OT', 17, 10),
  ('Jó',                 'jo',  'OT', 18, 42),
  ('Salmos',             'sl',  'OT', 19, 150),
  ('Provérbios',         'pv',  'OT', 20, 31),
  ('Eclesiastes',        'ec',  'OT', 21, 12),
  ('Cânticos',           'ct',  'OT', 22,  8),
  ('Isaías',             'is',  'OT', 23, 66),
  ('Jeremias',           'jr',  'OT', 24, 52),
  ('Lamentações',        'lm',  'OT', 25,  5),
  ('Ezequiel',           'ez',  'OT', 26, 48),
  ('Daniel',             'dn',  'OT', 27, 12),
  ('Oséias',             'os',  'OT', 28, 14),
  ('Joel',               'jl',  'OT', 29,  3),
  ('Amós',               'am',  'OT', 30,  9),
  ('Obadias',            'ob',  'OT', 31,  1),
  ('Jonas',              'jn',  'OT', 32,  4),
  ('Miquéias',           'mq',  'OT', 33,  7),
  ('Naum',               'na',  'OT', 34,  3),
  ('Habacuque',          'hc',  'OT', 35,  3),
  ('Sofonias',           'sf',  'OT', 36,  3),
  ('Ageu',               'ag',  'OT', 37,  2),
  ('Zacarias',           'zc',  'OT', 38, 14),
  ('Malaquias',          'ml',  'OT', 39,  4),
  -- New Testament (27 books)
  ('Mateus',             'mt',  'NT', 40, 28),
  ('Marcos',             'mc',  'NT', 41, 16),
  ('Lucas',              'lc',  'NT', 42, 24),
  ('João',               'jo2', 'NT', 43, 21),
  ('Atos',               'at',  'NT', 44, 28),
  ('Romanos',            'rm',  'NT', 45, 16),
  ('1 Coríntios',        '1co', 'NT', 46, 16),
  ('2 Coríntios',        '2co', 'NT', 47, 13),
  ('Gálatas',            'gl',  'NT', 48,  6),
  ('Efésios',            'ef',  'NT', 49,  6),
  ('Filipenses',         'fp',  'NT', 50,  4),
  ('Colossenses',        'cl',  'NT', 51,  4),
  ('1 Tessalonicenses',  '1ts', 'NT', 52,  5),
  ('2 Tessalonicenses',  '2ts', 'NT', 53,  3),
  ('1 Timóteo',          '1tm', 'NT', 54,  6),
  ('2 Timóteo',          '2tm', 'NT', 55,  4),
  ('Tito',               'tt',  'NT', 56,  3),
  ('Filemom',            'fm',  'NT', 57,  1),
  ('Hebreus',            'hb',  'NT', 58, 13),
  ('Tiago',              'tg',  'NT', 59,  5),
  ('1 Pedro',            '1pe', 'NT', 60,  5),
  ('2 Pedro',            '2pe', 'NT', 61,  3),
  ('1 João',             '1jo', 'NT', 62,  5),
  ('2 João',             '2jo', 'NT', 63,  1),
  ('3 João',             '3jo', 'NT', 64,  1),
  ('Judas',              'jd',  'NT', 65,  1),
  ('Apocalipse',         'ap',  'NT', 66, 22)
ON CONFLICT (abbreviation) DO NOTHING;
