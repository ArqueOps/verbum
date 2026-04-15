-- Verbum: Seed Data
-- Bible versions, books (66), and chapters (1189)

-- =============================================================================
-- Bible Versions (10 versions)
-- =============================================================================

INSERT INTO bible_versions (abbr, name, language, is_original, description) VALUES
  ('NVI',  'Nova Versao Internacional',           'pt', false, 'Traducao moderna em portugues, equilibrio entre fidelidade e legibilidade'),
  ('ARA',  'Almeida Revista e Atualizada',        'pt', false, 'Revisao classica de Joao Ferreira de Almeida, linguagem formal'),
  ('ARC',  'Almeida Revista e Corrigida',         'pt', false, 'Versao tradicional de Almeida, linguagem classica'),
  ('NAA',  'Nova Almeida Atualizada',             'pt', false, 'Revisao contemporanea da Almeida, linguagem acessivel'),
  ('NTLH', 'Nova Traducao na Linguagem de Hoje',  'pt', false, 'Linguagem simples e cotidiana'),
  ('KJV',  'King James Version',                  'en', false, 'Traducao classica inglesa de 1611'),
  ('ESV',  'English Standard Version',            'en', false, 'Traducao literal moderna em ingles'),
  ('NIV',  'New International Version',           'en', false, 'Traducao moderna em ingles, ampla adocao'),
  ('BHS',  'Biblia Hebraica Stuttgartensia',      'he', true,  'Texto masoretico padrao do Antigo Testamento em hebraico'),
  ('NA28', 'Nestle-Aland 28th Edition',           'el', true,  'Texto critico do Novo Testamento em grego');

-- =============================================================================
-- Books (66 canonical books)
-- =============================================================================

-- Old Testament (39 books)
INSERT INTO books (name, abbr, testament, position, chapters_count) VALUES
  ('Genesis',          'Gn',  'OT',  1, 50),
  ('Exodo',            'Ex',  'OT',  2, 40),
  ('Levitico',         'Lv',  'OT',  3, 27),
  ('Numeros',          'Nm',  'OT',  4, 36),
  ('Deuteronomio',     'Dt',  'OT',  5, 34),
  ('Josue',            'Js',  'OT',  6, 24),
  ('Juizes',           'Jz',  'OT',  7, 21),
  ('Rute',             'Rt',  'OT',  8,  4),
  ('1 Samuel',         '1Sm', 'OT',  9, 31),
  ('2 Samuel',         '2Sm', 'OT', 10, 24),
  ('1 Reis',           '1Rs', 'OT', 11, 22),
  ('2 Reis',           '2Rs', 'OT', 12, 25),
  ('1 Cronicas',       '1Cr', 'OT', 13, 29),
  ('2 Cronicas',       '2Cr', 'OT', 14, 36),
  ('Esdras',           'Ed',  'OT', 15, 10),
  ('Neemias',          'Ne',  'OT', 16, 13),
  ('Ester',            'Et',  'OT', 17, 10),
  ('Jó',               'Jó',  'OT', 18, 42),
  ('Salmos',           'Sl',  'OT', 19, 150),
  ('Proverbios',       'Pv',  'OT', 20, 31),
  ('Eclesiastes',      'Ec',  'OT', 21, 12),
  ('Canticos',         'Ct',  'OT', 22,  8),
  ('Isaias',           'Is',  'OT', 23, 66),
  ('Jeremias',         'Jr',  'OT', 24, 52),
  ('Lamentacoes',      'Lm',  'OT', 25,  5),
  ('Ezequiel',         'Ez',  'OT', 26, 48),
  ('Daniel',           'Dn',  'OT', 27, 12),
  ('Oseias',           'Os',  'OT', 28, 14),
  ('Joel',             'Jl',  'OT', 29,  3),
  ('Amos',             'Am',  'OT', 30,  9),
  ('Obadias',          'Ob',  'OT', 31,  1),
  ('Jonas',            'Jn',  'OT', 32,  4),
  ('Miqueias',         'Mq',  'OT', 33,  7),
  ('Naum',             'Na',  'OT', 34,  3),
  ('Habacuque',        'Hc',  'OT', 35,  3),
  ('Sofonias',         'Sf',  'OT', 36,  3),
  ('Ageu',             'Ag',  'OT', 37,  2),
  ('Zacarias',         'Zc',  'OT', 38, 14),
  ('Malaquias',        'Ml',  'OT', 39,  4);

-- New Testament (27 books)
INSERT INTO books (name, abbr, testament, position, chapters_count) VALUES
  ('Mateus',           'Mt',  'NT', 40, 28),
  ('Marcos',           'Mc',  'NT', 41, 16),
  ('Lucas',            'Lc',  'NT', 42, 24),
  ('Joao',             'Jo',  'NT', 43, 21),
  ('Atos',             'At',  'NT', 44, 28),
  ('Romanos',          'Rm',  'NT', 45, 16),
  ('1 Corintios',      '1Co', 'NT', 46, 16),
  ('2 Corintios',      '2Co', 'NT', 47, 13),
  ('Galatas',          'Gl',  'NT', 48,  6),
  ('Efesios',          'Ef',  'NT', 49,  6),
  ('Filipenses',       'Fp',  'NT', 50,  4),
  ('Colossenses',      'Cl',  'NT', 51,  4),
  ('1 Tessalonicenses','1Ts', 'NT', 52,  5),
  ('2 Tessalonicenses','2Ts', 'NT', 53,  3),
  ('1 Timoteo',        '1Tm', 'NT', 54,  6),
  ('2 Timoteo',        '2Tm', 'NT', 55,  4),
  ('Tito',             'Tt',  'NT', 56,  3),
  ('Filemom',          'Fm',  'NT', 57,  1),
  ('Hebreus',          'Hb',  'NT', 58, 13),
  ('Tiago',            'Tg',  'NT', 59,  5),
  ('1 Pedro',          '1Pe', 'NT', 60,  5),
  ('2 Pedro',          '2Pe', 'NT', 61,  3),
  ('1 Joao',           '1Jo', 'NT', 62,  5),
  ('2 Joao',           '2Jo', 'NT', 63,  1),
  ('3 Joao',           '3Jo', 'NT', 64,  1),
  ('Judas',            'Jd',  'NT', 65,  1),
  ('Apocalipse',       'Ap',  'NT', 66, 22);

-- =============================================================================
-- Chapters (1189 total)
-- Generated from books.chapters_count
-- =============================================================================

DO $$
DECLARE
  book RECORD;
  ch INTEGER;
  verse_counts INTEGER[];
BEGIN
  FOR book IN SELECT id, abbr, chapters_count FROM books ORDER BY position LOOP
    FOR ch IN 1..book.chapters_count LOOP
      -- Default verses_count to 0; will be updated when verse data is loaded
      INSERT INTO chapters (book_id, chapter_number, verses_count)
      VALUES (book.id, ch, 0);
    END LOOP;
  END LOOP;
END;
$$;
