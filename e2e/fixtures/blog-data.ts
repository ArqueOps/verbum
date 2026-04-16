/**
 * Fixtures for blog search & filter E2E tests.
 * Mocks the search_published_studies RPC response shape
 * and bible_books for filter dropdowns.
 */

export interface StudyResult {
  id: string;
  title: string;
  slug: string;
  verse_reference: string;
  published_at: string | null;
  book_name: string | null;
  book_abbreviation: string | null;
  book_testament: string | null;
}

export const PUBLISHED_STUDIES: StudyResult[] = [
  {
    id: "study-1",
    title: "A Criação do Mundo",
    slug: "a-criacao-do-mundo",
    verse_reference: "Gênesis 1:1-3",
    published_at: "2026-03-15T10:00:00Z",
    book_name: "Gênesis",
    book_abbreviation: "Gn",
    book_testament: "old",
  },
  {
    id: "study-2",
    title: "O Êxodo do Egito",
    slug: "o-exodo-do-egito",
    verse_reference: "Êxodo 14:21-22",
    published_at: "2026-03-10T08:00:00Z",
    book_name: "Êxodo",
    book_abbreviation: "Êx",
    book_testament: "old",
  },
  {
    id: "study-3",
    title: "O Sermão do Monte",
    slug: "o-sermao-do-monte",
    verse_reference: "Mateus 5:1-12",
    published_at: "2026-03-05T12:00:00Z",
    book_name: "Mateus",
    book_abbreviation: "Mt",
    book_testament: "new",
  },
  {
    id: "study-4",
    title: "A Ressurreição de Cristo",
    slug: "a-ressurreicao-de-cristo",
    verse_reference: "Romanos 6:4-9",
    published_at: "2026-02-28T09:00:00Z",
    book_name: "Romanos",
    book_abbreviation: "Rm",
    book_testament: "new",
  },
];

/** Subset of bible_books used by the BlogFilters dropdown */
export const BLOG_BOOKS = [
  { id: "book-gen", name: "Gênesis", abbreviation: "Gn", testament: "old", total_chapters: 50, position: 1 },
  { id: "book-exo", name: "Êxodo", abbreviation: "Êx", testament: "old", total_chapters: 40, position: 2 },
  { id: "book-mat", name: "Mateus", abbreviation: "Mt", testament: "new", total_chapters: 28, position: 40 },
  { id: "book-rom", name: "Romanos", abbreviation: "Rm", testament: "new", total_chapters: 16, position: 45 },
];
