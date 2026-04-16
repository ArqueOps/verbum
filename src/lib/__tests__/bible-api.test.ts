import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchBiblePassage } from "../bible-api";

// Mock the supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { createServerSupabaseClient } from "@/lib/supabase/server";

function createMockSupabase(bookData: unknown, versionData: unknown, versesData: unknown) {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };

  const fromMap: Record<string, typeof mockQuery> = {
    books: {
      ...mockQuery,
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: bookData }),
        }),
      }),
    } as unknown as typeof mockQuery,
    bible_versions: {
      ...mockQuery,
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: versionData }),
        }),
      }),
    } as unknown as typeof mockQuery,
    bible_verses: (() => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockImplementation(() => ({ data: versesData })),
      };
      return chain;
    })() as unknown as typeof mockQuery,
  };

  return {
    from: vi.fn((table: string) => fromMap[table] ?? mockQuery),
  };
}

describe("bible-api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchBiblePassage", () => {
    it("should return joined verse text for a verse range", async () => {
      const mockSupabase = createMockSupabase(
        { name: "Gênesis", abbr: "gn" },
        { abbr: "nvi" },
        [
          { verse_number: 1, text: "No princípio, Deus criou os céus e a terra." },
          { verse_number: 2, text: "A terra era sem forma e vazia." },
        ]
      );
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never);

      const result = await fetchBiblePassage("1", 1, 1, 2, "1");

      expect(result.text).toBe(
        "1. No princípio, Deus criou os céus e a terra.\n2. A terra era sem forma e vazia."
      );
      expect(result.verseReference).toBe("Gênesis 1:1-2");
    });

    it("should return single verse text when no verseEnd", async () => {
      const mockSupabase = createMockSupabase(
        { name: "Salmos", abbr: "sl" },
        { abbr: "nvi" },
        [{ verse_number: 1, text: "O Senhor é meu pastor, nada me faltará." }]
      );
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never);

      const result = await fetchBiblePassage("19", 23, 1, undefined, "1");

      expect(result.text).toBe("1. O Senhor é meu pastor, nada me faltará.");
      expect(result.verseReference).toBe("Salmos 23:1");
    });

    it("should return empty text when no verses found", async () => {
      const mockSupabase = createMockSupabase(
        { name: "Gênesis", abbr: "gn" },
        { abbr: "nvi" },
        []
      );
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never);

      const result = await fetchBiblePassage("1", 99, 1, undefined, "1");

      expect(result.text).toBe("");
    });

    it("should return empty text when verses data is null", async () => {
      const mockSupabase = createMockSupabase(
        { name: "Gênesis", abbr: "gn" },
        { abbr: "nvi" },
        null
      );
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never);

      const result = await fetchBiblePassage("1", 1, 1, undefined, "1");

      expect(result.text).toBe("");
    });

    it("should use bookId as fallback when book lookup returns null", async () => {
      const mockSupabase = createMockSupabase(
        null,
        { abbr: "nvi" },
        [{ verse_number: 1, text: "Test verse." }]
      );
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never);

      const result = await fetchBiblePassage("gn", 1, 1, undefined, "1");

      expect(result.verseReference).toBe("gn 1:1");
    });

    it("should reject when fetch takes too long (timeout)", async () => {
      vi.useFakeTimers();

      vi.mocked(createServerSupabaseClient).mockReturnValue(
        new Promise(() => {}) as never
      );

      const resultPromise = fetchBiblePassage("1", 1, 1, undefined, "1");
      await vi.advanceTimersByTimeAsync(6000);

      await expect(resultPromise).rejects.toThrow("timed out");

      vi.useRealTimers();
    });
  });
});
