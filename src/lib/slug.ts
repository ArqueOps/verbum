import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type BookRow = Database["public"]["Tables"]["bible_books"]["Row"];

interface ParsedReference {
  abbreviation: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

function parseVerseReference(verseReference: string): ParsedReference {
  const trimmed = verseReference.trim();

  // Match pattern: "Gn 1:1-3" or "Jo 3:16" or "1Co 15:1-4"
  const match = trimmed.match(
    /^(\d?\s*[A-Za-zÀ-ÿ]+)\s+(\d+):(\d+)(?:-(\d+))?$/,
  );
  if (!match || !match[1] || !match[2] || !match[3]) {
    throw new Error(`Invalid verse reference format: "${verseReference}"`);
  }

  const abbreviation = match[1].trim();
  const chapter = parseInt(match[2], 10);
  const verseStart = parseInt(match[3], 10);
  const verseEnd = match[4] ? parseInt(match[4], 10) : verseStart;

  return { abbreviation, chapter, verseStart, verseEnd };
}

function buildSlug(
  bookName: string,
  chapter: number,
  verseStart: number,
  verseEnd: number,
): string {
  const normalizedBook = normalizeText(bookName);
  const isSingleVerse = verseStart === verseEnd;

  if (isSingleVerse) {
    return `${normalizedBook}-${chapter}-${verseStart}-estudo`;
  }

  return `${normalizedBook}-${chapter}-${verseStart}-${verseEnd}-estudo`;
}

function resolveBookName(abbreviation: string, books: BookRow[]): string {
  const normalizedAbbr = abbreviation
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const book = books.find((b) => {
    const normalizedBookAbbr = b.abbreviation
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return normalizedBookAbbr === normalizedAbbr;
  });

  if (!book) {
    throw new Error(`Unknown book abbreviation: "${abbreviation}"`);
  }

  return book.name;
}

async function resolveConflict(
  baseSlug: string,
  supabase: SupabaseClient<Database>,
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
  books: BookRow[],
  supabase: SupabaseClient<Database>,
): Promise<string> {
  const parsed = parseVerseReference(verseReference);
  const bookName = resolveBookName(parsed.abbreviation, books);
  const baseSlug = buildSlug(
    bookName,
    parsed.chapter,
    parsed.verseStart,
    parsed.verseEnd,
  );

  return resolveConflict(baseSlug, supabase);
}
