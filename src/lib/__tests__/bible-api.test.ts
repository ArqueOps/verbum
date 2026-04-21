import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchBiblePassage } from "../bible-api";

// Mock the server supabase client
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { createServerSupabaseClient } from "@/lib/supabase/server";

function createMockSupabase(overrides: {
  book?: { name: string; abbr: string } | null;
  version?: { abbr: string } | null;
  verses?: Array<{ verse_number: number; text: string }> | null;
}) {
  const bookResult = { data: overrides.book ?? null, error: null };
  const versionResult = { data: overrides.version ?? null, error: null };
  const versesResult = { data: overrides.verses ?? null, error: null };

  const versesChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnValue(versesResult),
  };

  const bookChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue(bookResult),
  };

  const versionChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue(versionResult),
  };

  const fromMap: Record<string, unknown> = {
    books: bookChain,
    bible_versions: versionChain,
    bible_verses: versesChain,
  };

  return {
    from: vi.fn((table: string) => fromMap[table] ?? versesChain),
  };
}

describe("bible-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchBiblePassage", () => {
    it("should return joined verse text for a verse range", async () => {
      const mockSupabase = createMockSupabase({
        book: { name: "Gênesis", abbr: "gn" },
        version: { abbr: "nvi" },
        verses: [
          { verse_number: 1, text: "No princípio, Deus criou os céus e a terra." },
          { verse_number: 2, text: "A terra era sem forma e vazia." },
        ],
      });
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never);

      const result = await fetchBiblePassage("1", 1, 1, 2, "1");

      expect(result.text).toBe(
        "1. No princípio, Deus criou os céus e a terra.\n2. A terra era sem forma e vazia."
      );
      expect(result.verseReference).toBe("Gênesis 1:1-2");
    });

    it("should return single verse text", async () => {
      const mockSupabase = createMockSupabase({
        book: { name: "Salmos", abbr: "sl" },
        version: { abbr: "nvi" },
        verses: [
          { verse_number: 1, text: "O Senhor é meu pastor, nada me faltará." },
        ],
      });
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never);

      const result = await fetchBiblePassage("19", 23, 1, undefined, "1");

      expect(result.text).toBe("1. O Senhor é meu pastor, nada me faltará.");
      expect(result.verseReference).toBe("Salmos 23:1");
    });

    it("should return empty text when no verses found", async () => {
      const mockSupabase = createMockSupabase({
        book: { name: "Gênesis", abbr: "gn" },
        version: { abbr: "nvi" },
        verses: [],
      });
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never);

      const result = await fetchBiblePassage("1", 99, 1, undefined, "1");

      expect(result.text).toBe("");
      expect(result.verseReference).toBe("Gênesis 99:1");
    });

    it("should return empty text when verses is null", async () => {
      const mockSupabase = createMockSupabase({
        book: { name: "Gênesis", abbr: "gn" },
        version: { abbr: "nvi" },
        verses: null,
      });
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never);

      const result = await fetchBiblePassage("1", 1, 1, undefined, "1");

      expect(result.text).toBe("");
    });

    it("should use bookId as fallback when book lookup returns null", async () => {
      const mockSupabase = createMockSupabase({
        book: null,
        version: { abbr: "nvi" },
        verses: [
          { verse_number: 16, text: "Porque Deus amou o mundo." },
        ],
      });
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never);

      const result = await fetchBiblePassage("43", 3, 16, undefined, "1");

      expect(result.verseReference).toBe("43 3:16");
    });

    it("should format verse reference with range when verseEnd is provided", async () => {
      const mockSupabase = createMockSupabase({
        book: { name: "João", abbr: "jo" },
        version: { abbr: "acf" },
        verses: [
          { verse_number: 16, text: "Porque Deus amou o mundo." },
          { verse_number: 17, text: "Porque Deus enviou o seu Filho." },
        ],
      });
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never);

      const result = await fetchBiblePassage("43", 3, 16, 17, "2");

      expect(result.verseReference).toBe("João 3:16-17");
    });

    it("should time out after 5 seconds", async () => {
      vi.useFakeTimers();
      vi.mocked(createServerSupabaseClient).mockImplementation(
        () => new Promise(() => {}) // never resolves
      );

      const resultPromise = fetchBiblePassage("1", 1, 1, undefined, "1");
      await vi.advanceTimersByTimeAsync(6000);

      await expect(resultPromise).rejects.toThrow("timed out");

      vi.useRealTimers();
    });
  });
});
