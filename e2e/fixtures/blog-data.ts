/**
 * Fixture data for /blog page E2E tests.
 * Represents published studies returned by the Supabase PostgREST API.
 */

export interface PublishedStudy {
  id: string;
  title: string;
  slug: string;
  verse_reference: string;
  is_published: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
  book_id: number;
  chapter: number;
  verse_start: number;
  verse_end: number;
}

function makeStudy(index: number): PublishedStudy {
  const date = new Date(2026, 3, 15 - index); // April 15 backwards
  return {
    id: `study-${String(index).padStart(3, "0")}`,
    title: `Estudo sobre passagem bíblica ${index + 1}`,
    slug: `estudo-passagem-${index + 1}`,
    verse_reference: `Gn ${index + 1}:1-5`,
    is_published: true,
    published_at: date.toISOString(),
    created_at: date.toISOString(),
    updated_at: date.toISOString(),
    book_id: 1,
    chapter: index + 1,
    verse_start: 1,
    verse_end: 5,
  };
}

/** 3 published studies — fits in one page */
export const PUBLISHED_STUDIES_SMALL = Array.from({ length: 3 }, (_, i) => makeStudy(i));

/** 15 published studies — exceeds page size of 12, triggers pagination */
export const PUBLISHED_STUDIES_PAGINATED = Array.from({ length: 15 }, (_, i) => makeStudy(i));

/** Page 1 slice (first 12) */
export const PAGE_1 = PUBLISHED_STUDIES_PAGINATED.slice(0, 12);

/** Page 2 slice (remaining 3) */
export const PAGE_2 = PUBLISHED_STUDIES_PAGINATED.slice(12, 15);
