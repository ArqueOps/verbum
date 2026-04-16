/**
 * Typed fixtures matching Supabase REST API response shapes.
 * Used by page.route() to intercept client-side Supabase queries.
 *
 * Types align with BibleVersion / BibleBook from src/types/bible.ts.
 */

/** Shape returned by: supabase.from("bible_versions").select("abbr, name, language, description") */
export interface BibleVersionRow {
  abbr: string;
  name: string;
  language: string;
  description: string | null;
}

/** Shape returned by: supabase.from("bible_books").select("id, name, abbreviation, testament, total_chapters, position") */
export interface BibleBookRow {
  id: string;
  name: string;
  abbreviation: string;
  testament: string;
  total_chapters: number;
  position: number;
}

export const VERSIONS: BibleVersionRow[] = [
  { abbr: "acf", name: "Almeida Corrigida Fiel", language: "pt", description: "Tradução clássica em português" },
  { abbr: "nvi", name: "Nova Versão Internacional", language: "pt", description: "Tradução moderna em português" },
];

// Small subset: 3 OT books + 2 NT books — enough to verify grouping and flow
export const BOOKS: BibleBookRow[] = [
  { id: "book-gen", name: "Gênesis", abbreviation: "Gn", testament: "old", total_chapters: 50, position: 1 },
  { id: "book-exo", name: "Êxodo", abbreviation: "Êx", testament: "old", total_chapters: 40, position: 2 },
  { id: "book-lev", name: "Levítico", abbreviation: "Lv", testament: "old", total_chapters: 27, position: 3 },
  { id: "book-mat", name: "Mateus", abbreviation: "Mt", testament: "new", total_chapters: 28, position: 40 },
  { id: "book-rom", name: "Romanos", abbreviation: "Rm", testament: "new", total_chapters: 16, position: 45 },
];
