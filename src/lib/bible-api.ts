const BIBLE_API_BASE_URL = "https://www.abibliadigital.com.br/api";
const FETCH_TIMEOUT_MS = 5000;

type BibleApiSuccess = {
  success: true;
  text: string;
};

type BibleApiError = {
  success: false;
  error: string;
};

export type BibleApiResult = BibleApiSuccess | BibleApiError;

interface FetchVersesParams {
  version: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
}

export function buildVerseUrl(params: FetchVersesParams): string {
  const { version, book, chapter, verseStart, verseEnd } = params;

  if (verseEnd && verseEnd !== verseStart) {
    return `${BIBLE_API_BASE_URL}/verses/${version}/${book}/${chapter}/${verseStart}-${verseEnd}`;
  }

  return `${BIBLE_API_BASE_URL}/verses/${version}/${book}/${chapter}/${verseStart}`;
}

export async function fetchVerses(
  params: FetchVersesParams
): Promise<BibleApiResult> {
  const url = buildVerseUrl(params);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `API returned status ${response.status}`,
      };
    }

    const data = await response.json();

    const verses: { text: string }[] = Array.isArray(data) ? data : [data];
    const text = verses.map((v) => v.text).join(" ");

    return { success: true, text };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        success: false,
        error: "Request timed out after 5 seconds",
      };
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
