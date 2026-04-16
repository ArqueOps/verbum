import { createServerSupabaseClient } from "@/lib/supabase/server";

const BIBLE_API_BASE = "https://www.abibliadigital.com.br/api/verses";
const FETCH_TIMEOUT_MS = 5000;

interface VerseRequest {
  version: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
}

type FetchVersesResult =
  | { success: true; text: string }
  | { success: false; error: string };

export function buildVerseUrl(req: VerseRequest): string {
  const { version, book, chapter, verseStart, verseEnd } = req;
  const versePart =
    verseEnd !== undefined && verseEnd !== verseStart
      ? `${verseStart}-${verseEnd}`
      : `${verseStart}`;
  return `${BIBLE_API_BASE}/${version}/${book}/${chapter}/${versePart}`;
}

export async function fetchVerses(req: VerseRequest): Promise<FetchVersesResult> {
  const url = buildVerseUrl(req);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return { success: false, error: `API returned status ${response.status}` };
    }
    const data = await response.json();
    const verses: { text: string }[] = Array.isArray(data) ? data : [data];
    const text = verses.map((v) => v.text).join(" ");
    return { success: true, text };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { success: false, error: "Request timed out" };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  } finally {
    clearTimeout(timer);
  }
}

export interface PassageResult {
  text: string;
  verseReference: string;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Bible passage fetch timed out")), ms),
    ),
  ]);
}

export async function fetchBiblePassage(
  bookId: string,
  chapter: number,
  verseStart: number,
  verseEnd: number | undefined,
  versionId: string,
): Promise<PassageResult> {
  return withTimeout(fetchPassageInternal(bookId, chapter, verseStart, verseEnd, versionId), 5000);
}

async function fetchPassageInternal(
  bookId: string,
  chapter: number,
  verseStart: number,
  verseEnd: number | undefined,
  versionId: string,
): Promise<PassageResult> {
  const supabase = await createServerSupabaseClient();

  const { data: book } = await supabase
    .from("books")
    .select("name, abbr")
    .eq("id", Number(bookId))
    .single();

  const { data: version } = await supabase
    .from("bible_versions")
    .select("abbr")
    .eq("id", Number(versionId))
    .single();

  let query = supabase
    .from("bible_verses")
    .select("verse_number, text")
    .eq("book", book?.abbr ?? bookId)
    .eq("chapter", chapter)
    .eq("version", version?.abbr ?? "nvi")
    .gte("verse_number", verseStart)
    .order("verse_number", { ascending: true });

  if (verseEnd !== undefined) {
    query = query.lte("verse_number", verseEnd);
  } else {
    query = query.eq("verse_number", verseStart);
  }

  const { data: verses } = await query;

  const bookName = book?.name ?? bookId;
  const endRef = verseEnd ? `-${verseEnd}` : "";
  const verseReference = `${bookName} ${chapter}:${verseStart}${endRef}`;

  if (!verses || verses.length === 0) {
    return { text: "", verseReference };
  }

  const text = verses
    .map((v) => `${v.verse_number}. ${v.text}`)
    .join("\n");

  return { text, verseReference };
}
