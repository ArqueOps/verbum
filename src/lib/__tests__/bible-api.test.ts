import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase before importing the module
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { fetchBiblePassage } from "../bible-api";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function createMockQuery(versesData: { verse_number: number; text: string }[] | null) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };

  // single() calls return book/version data
  let singleCallCount = 0;
  query.single.mockImplementation(() => {
    singleCallCount++;
    if (singleCallCount === 1) {
      return Promise.resolve({ data: { name: "Gênesis", abbr: "gn" } });
    }
    return Promise.resolve({ data: { abbr: "nvi" } });
  });

  // The final query (without single) resolves with verses
  query.order.mockReturnValue({ data: versesData });

  return query;
}

describe("bible-api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchBiblePassage", () => {
    it("should return joined verse text for a range of verses", async () => {
      const mockVerses = [
        { verse_number: 1, text: "No princípio, Deus criou os céus e a terra." },
        { verse_number: 2, text: "A terra era sem forma e vazia." },
      ];

      const mockQuery = createMockQuery(mockVerses);
      const mockSupabase = { from: vi.fn().mockReturnValue(mockQuery) };
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never);

      const result = await fetchBiblePassage("1", 1, 1, 2, "1");

      expect(result.text).toBe(
        "1. No princípio, Deus criou os céus e a terra.\n2. A terra era sem forma e vazia."
      );
      expect(result.verseReference).toBe("Gênesis 1:1-2");
    });

    it("should return single verse without range in reference", async () => {
      const mockVerses = [
        { verse_number: 1, text: "O Senhor é meu pastor, nada me faltará." },
      ];

      const mockQuery = createMockQuery(mockVerses);
      const mockSupabase = { from: vi.fn().mockReturnValue(mockQuery) };
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never);

      const result = await fetchBiblePassage("1", 23, 1, undefined, "1");

      expect(result.text).toBe("1. O Senhor é meu pastor, nada me faltará.");
      expect(result.verseReference).toBe("Gênesis 23:1");
    });

    it("should return empty text when no verses found", async () => {
      const mockQuery = createMockQuery(null);
      const mockSupabase = { from: vi.fn().mockReturnValue(mockQuery) };
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never);

      const result = await fetchBiblePassage("1", 1, 999, undefined, "1");

      expect(result.text).toBe("");
    });

    it("should include verse range in reference when verseEnd is provided", async () => {
      const mockVerses = [{ verse_number: 16, text: "Porque Deus amou o mundo." }];

      const mockQuery = createMockQuery(mockVerses);
      const mockSupabase = { from: vi.fn().mockReturnValue(mockQuery) };
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never);

      const result = await fetchBiblePassage("1", 3, 16, 17, "1");

      expect(result.verseReference).toBe("Gênesis 3:16-17");
    });
  });
});
