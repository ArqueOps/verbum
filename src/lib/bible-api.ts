const BIBLE_API_BASE_URL = "https://www.abibliadigital.com.br/api";
const FETCH_TIMEOUT_MS = 5000;

export interface FetchBiblePassageParams {
  bookAbbrev: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  versionId: string;
}

export type BiblePassageResult =
  | { success: true; text: string }
  | { success: false; error: string };

interface BibleApiVerse {
  book: { abbrev: { pt: string; en: string }; name: string };
  chapter: number;
  number: number;
  text: string;
}

export async function fetchBiblePassage(
  params: FetchBiblePassageParams
): Promise<BiblePassageResult> {
  const { bookAbbrev, chapter, verseStart, verseEnd, versionId } = params;

  const versePath =
    verseEnd !== undefined
      ? `${verseStart}-${verseEnd}`
      : String(verseStart);

  const url = `${BIBLE_API_BASE_URL}/verses/${encodeURIComponent(versionId)}/${encodeURIComponent(bookAbbrev)}/${chapter}/${versePath}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      return {
        success: false,
        error: `API returned status ${response.status}`,
      };
    }

    const data: unknown = await response.json();

    if (verseEnd !== undefined) {
      // Range endpoint returns { verses: [...] }
      const parsed = data as { verses?: BibleApiVerse[] };
      if (!Array.isArray(parsed.verses) || parsed.verses.length === 0) {
        return { success: false, error: "No verses returned from API" };
      }
      const text = parsed.verses.map((v) => v.text).join(" ");
      return { success: true, text };
    }

    // Single verse endpoint returns the verse object directly
    const parsed = data as BibleApiVerse;
    if (typeof parsed.text !== "string" || parsed.text.length === 0) {
      return { success: false, error: "Invalid verse data returned from API" };
    }
    return { success: true, text: parsed.text };
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { success: false, error: "Request timed out after 5 seconds" };
    }
    const message =
      error instanceof Error ? error.message : "Unknown network error";
    return { success: false, error: message };
  } finally {
    clearTimeout(timeoutId);
  }
}
