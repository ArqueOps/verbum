import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

interface BookMapping {
  abbreviation: string;
  name: string;
}

interface ParsedReference {
  abbreviation: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
}

function normalizeBookName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

function parseVerseReference(verseReference: string): ParsedReference {
  // Matches patterns like "Gn 1:1-3", "Jo 3:16", "1Co 15:1-4", "2Cr 7:14-16"
  const match = verseReference
    .trim()
    .match(/^(\d?\s?[A-Za-zÀ-ÿ]+)\s+(\d+):(\d+)(?:-(\d+))?$/);

  if (!match) {
    throw new Error(
      `Invalid verse reference format: "${verseReference}". Expected format: "Gn 1:1-3" or "Jo 3:16"`,
    );
  }

  const abbreviation = match[1]!.replace(/\s+/g, "").toLowerCase();
  const chapter = parseInt(match[2]!, 10);
  const verseStart = parseInt(match[3]!, 10);
  const verseEnd = match[4] ? parseInt(match[4], 10) : verseStart;

  return { abbreviation, chapter, verseStart, verseEnd };
}

function buildSlug(
  bookName: string,
  chapter: number,
  verseStart: number,
  verseEnd: number,
): string {
  const normalizedBook = normalizeBookName(bookName);

  if (verseStart === verseEnd) {
    return `${normalizedBook}-${chapter}-${verseStart}-estudo`;
  }

  return `${normalizedBook}-${chapter}-${verseStart}-${verseEnd}-estudo`;
}

async function fetchBookMappings(
  supabase: SupabaseClient<Database>,
): Promise<BookMapping[]> {
  const { data, error } = await supabase
    .from("bible_books")
    .select("abbreviation, name");

  if (error) {
    throw new Error(`Failed to fetch bible_books: ${error.message}`);
  }

  return data;
}

async function resolveSlugConflict(
  supabase: SupabaseClient<Database>,
  baseSlug: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("studies")
    .select("slug")
    .like("slug", `${baseSlug}%`);

  if (error) {
    throw new Error(`Failed to check slug conflicts: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return baseSlug;
  }

  const existingSlugs = new Set(data.map((row) => row.slug));

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix++;
  }

  return `${baseSlug}-${suffix}`;
}

export async function generateStudySlug(
  verseReference: string,
  supabase: SupabaseClient<Database>,
): Promise<string> {
  const parsed = parseVerseReference(verseReference);

  const bookMappings = await fetchBookMappings(supabase);

  const book = bookMappings.find(
    (b) => b.abbreviation.toLowerCase() === parsed.abbreviation,
  );

  if (!book) {
    throw new Error(
      `Unknown book abbreviation: "${parsed.abbreviation}". Not found in bible_books table.`,
    );
  }

  const baseSlug = buildSlug(
    book.name,
    parsed.chapter,
    parsed.verseStart,
    parsed.verseEnd,
  );

  return resolveSlugConflict(supabase, baseSlug);
}
