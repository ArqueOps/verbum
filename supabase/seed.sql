-- Verbum Seed Data
-- Bible versions and canonical books with accurate chapter counts
-- Idempotent: safe to run multiple times (ON CONFLICT DO NOTHING)

-- ============================================================================
-- Bible Versions
-- ============================================================================

INSERT INTO bible_versions (id, slug, name, language, description, is_active)
VALUES
  (gen_random_uuid(), 'nvi', 'Nova Versão Internacional', 'pt', 'Tradução moderna em português, linguagem acessível e fiel aos manuscritos originais.', true),
  (gen_random_uuid(), 'ara', 'Almeida Revista e Atualizada', 'pt', 'Revisão da tradução de João Ferreira de Almeida com linguagem atualizada.', true),
  (gen_random_uuid(), 'acf', 'Almeida Corrigida Fiel', 'pt', 'Tradução fiel ao Textus Receptus, linguagem formal e tradicional.', true),
  (gen_random_uuid(), 'arc', 'Almeida Revista e Corrigida', 'pt', 'Versão clássica de Almeida amplamente usada nas igrejas brasileiras.', true),
  (gen_random_uuid(), 'kjv', 'King James Version', 'en', 'Classic English translation from 1611, widely regarded for its literary quality.', true),
  (gen_random_uuid(), 'niv', 'New International Version', 'en', 'Modern English translation balancing accuracy and readability.', true),
  (gen_random_uuid(), 'nlt', 'New Living Translation', 'en', 'Thought-for-thought English translation emphasizing clarity and natural language.', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- Bible Books — Old Testament (39 books, positions 1-39)
-- ============================================================================

INSERT INTO bible_books (id, name, abbreviation, testament, position, total_chapters)
VALUES
  -- Pentateuco
  (gen_random_uuid(), 'Gênesis',       'Gn',  'old', 1,  50),
  (gen_random_uuid(), 'Êxodo',         'Ex',  'old', 2,  40),
  (gen_random_uuid(), 'Levítico',      'Lv',  'old', 3,  27),
  (gen_random_uuid(), 'Números',       'Nm',  'old', 4,  36),
  (gen_random_uuid(), 'Deuteronômio',  'Dt',  'old', 5,  34),

  -- Históricos
  (gen_random_uuid(), 'Josué',         'Js',  'old', 6,  24),
  (gen_random_uuid(), 'Juízes',        'Jz',  'old', 7,  21),
  (gen_random_uuid(), 'Rute',          'Rt',  'old', 8,   4),
  (gen_random_uuid(), '1 Samuel',      '1Sm', 'old', 9,  31),
  (gen_random_uuid(), '2 Samuel',      '2Sm', 'old', 10, 24),
  (gen_random_uuid(), '1 Reis',        '1Rs', 'old', 11, 22),
  (gen_random_uuid(), '2 Reis',        '2Rs', 'old', 12, 25),
  (gen_random_uuid(), '1 Crônicas',    '1Cr', 'old', 13, 29),
  (gen_random_uuid(), '2 Crônicas',    '2Cr', 'old', 14, 36),
  (gen_random_uuid(), 'Esdras',        'Ed',  'old', 15, 10),
  (gen_random_uuid(), 'Neemias',       'Ne',  'old', 16, 13),
  (gen_random_uuid(), 'Ester',         'Et',  'old', 17, 10),

  -- Poéticos
  (gen_random_uuid(), 'Jó',            'Jó',  'old', 18, 42),
  (gen_random_uuid(), 'Salmos',        'Sl',  'old', 19, 150),
  (gen_random_uuid(), 'Provérbios',    'Pv',  'old', 20, 31),
  (gen_random_uuid(), 'Eclesiastes',   'Ec',  'old', 21, 12),
  (gen_random_uuid(), 'Cantares',      'Ct',  'old', 22,  8),

  -- Profetas Maiores
  (gen_random_uuid(), 'Isaías',        'Is',  'old', 23, 66),
  (gen_random_uuid(), 'Jeremias',      'Jr',  'old', 24, 52),
  (gen_random_uuid(), 'Lamentações',   'Lm',  'old', 25,  5),
  (gen_random_uuid(), 'Ezequiel',      'Ez',  'old', 26, 48),
  (gen_random_uuid(), 'Daniel',        'Dn',  'old', 27, 12),

  -- Profetas Menores
  (gen_random_uuid(), 'Oséias',        'Os',  'old', 28, 14),
  (gen_random_uuid(), 'Joel',          'Jl',  'old', 29,  3),
  (gen_random_uuid(), 'Amós',          'Am',  'old', 30,  9),
  (gen_random_uuid(), 'Obadias',       'Ob',  'old', 31,  1),
  (gen_random_uuid(), 'Jonas',         'Jn',  'old', 32,  4),
  (gen_random_uuid(), 'Miquéias',      'Mq',  'old', 33,  7),
  (gen_random_uuid(), 'Naum',          'Na',  'old', 34,  3),
  (gen_random_uuid(), 'Habacuque',     'Hc',  'old', 35,  3),
  (gen_random_uuid(), 'Sofonias',      'Sf',  'old', 36,  3),
  (gen_random_uuid(), 'Ageu',          'Ag',  'old', 37,  2),
  (gen_random_uuid(), 'Zacarias',      'Zc',  'old', 38, 14),
  (gen_random_uuid(), 'Malaquias',     'Ml',  'old', 39,  4),

-- ============================================================================
-- Bible Books — New Testament (27 books, positions 40-66)
-- ============================================================================

  -- Evangelhos
  (gen_random_uuid(), 'Mateus',        'Mt',  'new', 40, 28),
  (gen_random_uuid(), 'Marcos',        'Mc',  'new', 41, 16),
  (gen_random_uuid(), 'Lucas',         'Lc',  'new', 42, 24),
  (gen_random_uuid(), 'João',          'Jo',  'new', 43, 21),

  -- Histórico
  (gen_random_uuid(), 'Atos',          'At',  'new', 44, 28),

  -- Epístolas Paulinas
  (gen_random_uuid(), 'Romanos',       'Rm',  'new', 45, 16),
  (gen_random_uuid(), '1 Coríntios',   '1Co', 'new', 46, 16),
  (gen_random_uuid(), '2 Coríntios',   '2Co', 'new', 47, 13),
  (gen_random_uuid(), 'Gálatas',       'Gl',  'new', 48,  6),
  (gen_random_uuid(), 'Efésios',       'Ef',  'new', 49,  6),
  (gen_random_uuid(), 'Filipenses',    'Fp',  'new', 50,  4),
  (gen_random_uuid(), 'Colossenses',   'Cl',  'new', 51,  4),
  (gen_random_uuid(), '1 Tessalonicenses', '1Ts', 'new', 52, 5),
  (gen_random_uuid(), '2 Tessalonicenses', '2Ts', 'new', 53, 3),
  (gen_random_uuid(), '1 Timóteo',     '1Tm', 'new', 54,  6),
  (gen_random_uuid(), '2 Timóteo',     '2Tm', 'new', 55,  4),
  (gen_random_uuid(), 'Tito',          'Tt',  'new', 56,  3),
  (gen_random_uuid(), 'Filemom',       'Fm',  'new', 57,  1),

  -- Epístola aos Hebreus
  (gen_random_uuid(), 'Hebreus',       'Hb',  'new', 58, 13),

  -- Epístolas Gerais
  (gen_random_uuid(), 'Tiago',         'Tg',  'new', 59,  5),
  (gen_random_uuid(), '1 Pedro',       '1Pe', 'new', 60,  5),
  (gen_random_uuid(), '2 Pedro',       '2Pe', 'new', 61,  3),
  (gen_random_uuid(), '1 João',        '1Jo', 'new', 62,  5),
  (gen_random_uuid(), '2 João',        '2Jo', 'new', 63,  1),
  (gen_random_uuid(), '3 João',        '3Jo', 'new', 64,  1),
  (gen_random_uuid(), 'Judas',         'Jd',  'new', 65,  1),

  -- Profético
  (gen_random_uuid(), 'Apocalipse',    'Ap',  'new', 66, 22)
ON CONFLICT (abbreviation) DO NOTHING;
