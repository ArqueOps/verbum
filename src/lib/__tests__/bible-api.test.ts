import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PassageResult } from "../bible-api";

// Mock the supabase server module before importing
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { fetchBiblePassage } from "../bible-api";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const mockCreateServerSupabaseClient =
  createServerSupabaseClient as ReturnType<typeof vi.fn>;

function createMockSupabase(options: {
  book?: { name: string; abbr: string } | null;
  version?: { abbr: string } | null;
  verses?: Array<{ verse_number: number; text: string }> | null;
}) {
  const versesQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnValue({
      data: options.verses ?? null,
    }),
  };

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "books") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi
                .fn()
                .mockResolvedValue({ data: options.book ?? null }),
            }),
          }),
        };
      }
      if (table === "bible_versions") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi
                .fn()
                .mockResolvedValue({ data: options.version ?? null }),
            }),
          }),
        };
      }
      if (table === "bible_verses") {
        return versesQuery;
      }
      return {};
    }),
  };
}

describe("bible-api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
      mockCreateServerSupabaseClient.mockResolvedValue(mockSupabase);

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
      mockCreateServerSupabaseClient.mockResolvedValue(mockSupabase);

      const result = await fetchBiblePassage("19", 23, 1, undefined, "1");

      expect(result.text).toBe(
        "1. O Senhor é meu pastor, nada me faltará."
      );
      expect(result.verseReference).toBe("Salmos 23:1");
    });

    it("should return empty text when no verses found", async () => {
      const mockSupabase = createMockSupabase({
        book: { name: "Gênesis", abbr: "gn" },
        version: { abbr: "nvi" },
        verses: [],
      });
      mockCreateServerSupabaseClient.mockResolvedValue(mockSupabase);

      const result = await fetchBiblePassage("1", 99, 1, undefined, "1");

      expect(result.text).toBe("");
      expect(result.verseReference).toBe("Gênesis 99:1");
    });

    it("should use bookId as fallback when book not found in DB", async () => {
      const mockSupabase = createMockSupabase({
        book: null,
        version: { abbr: "nvi" },
        verses: [{ verse_number: 1, text: "Test verse." }],
      });
      mockCreateServerSupabaseClient.mockResolvedValue(mockSupabase);

      const result = await fetchBiblePassage("gn", 1, 1, undefined, "1");

      expect(result.verseReference).toBe("gn 1:1");
    });

    it("should timeout after 5 seconds", async () => {
      vi.useFakeTimers();
      mockCreateServerSupabaseClient.mockImplementation(
        () => new Promise(() => {}) // never resolves
      );

      const resultPromise = fetchBiblePassage("1", 1, 1, undefined, "1");
      await vi.advanceTimersByTimeAsync(6000);

      await expect(resultPromise).rejects.toThrow("timed out");

      vi.useRealTimers();
    });

    it("should include verse range in reference when verseEnd is provided", async () => {
      const mockSupabase = createMockSupabase({
        book: { name: "João", abbr: "jo" },
        version: { abbr: "acf" },
        verses: [
          { verse_number: 16, text: "Porque Deus amou o mundo." },
          { verse_number: 17, text: "Deus enviou o seu Filho." },
        ],
      });
      mockCreateServerSupabaseClient.mockResolvedValue(mockSupabase);

      const result = await fetchBiblePassage("43", 3, 16, 17, "2");

      expect(result.verseReference).toBe("João 3:16-17");
    });
  });
});
