import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchBiblePassage } from "../bible-api";

// Mock the supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { createServerSupabaseClient } from "@/lib/supabase/server";

function createMockQuery(overrides: Record<string, unknown> = {}) {
  const defaultData = { data: null, error: null };
  const query: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnValue({ ...defaultData, ...overrides }),
    single: vi.fn().mockReturnValue({ ...defaultData, ...overrides }),
  };
  return query;
}

describe("bible-api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchBiblePassage", () => {
    it("should return joined verse text with reference on success", async () => {
      const bookQuery = createMockQuery({
        data: { name: "Gênesis", abbr: "gn" },
      });
      const versionQuery = createMockQuery({
        data: { abbr: "nvi" },
      });
      const versesQuery = createMockQuery({
        data: [
          { verse_number: 1, text: "No princípio, Deus criou os céus e a terra." },
          { verse_number: 2, text: "A terra era sem forma e vazia." },
        ],
      });

      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "books") return bookQuery;
          if (table === "bible_versions") return versionQuery;
          if (table === "bible_verses") return versesQuery;
          return createMockQuery();
        }),
      };

      vi.mocked(createServerSupabaseClient).mockResolvedValue(
        mockSupabase as never
      );

      const result = await fetchBiblePassage("1", 1, 1, 2, "1");

      expect(result.verseReference).toBe("Gênesis 1:1-2");
      expect(result.text).toContain("No princípio, Deus criou os céus e a terra.");
      expect(result.text).toContain("A terra era sem forma e vazia.");
    });

    it("should return empty text when no verses found", async () => {
      const bookQuery = createMockQuery({
        data: { name: "Gênesis", abbr: "gn" },
      });
      const versionQuery = createMockQuery({
        data: { abbr: "nvi" },
      });
      const versesQuery = createMockQuery({ data: [] });

      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "books") return bookQuery;
          if (table === "bible_versions") return versionQuery;
          if (table === "bible_verses") return versesQuery;
          return createMockQuery();
        }),
      };

      vi.mocked(createServerSupabaseClient).mockResolvedValue(
        mockSupabase as never
      );

      const result = await fetchBiblePassage("1", 1, 99, undefined, "1");

      expect(result.text).toBe("");
      expect(result.verseReference).toBe("Gênesis 1:99");
    });

    it("should build correct reference for single verse (no verseEnd)", async () => {
      const bookQuery = createMockQuery({
        data: { name: "Salmos", abbr: "sl" },
      });
      const versionQuery = createMockQuery({
        data: { abbr: "nvi" },
      });
      const versesQuery = createMockQuery({
        data: [{ verse_number: 1, text: "O Senhor é meu pastor, nada me faltará." }],
      });

      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "books") return bookQuery;
          if (table === "bible_versions") return versionQuery;
          if (table === "bible_verses") return versesQuery;
          return createMockQuery();
        }),
      };

      vi.mocked(createServerSupabaseClient).mockResolvedValue(
        mockSupabase as never
      );

      const result = await fetchBiblePassage("19", 23, 1, undefined, "1");

      expect(result.verseReference).toBe("Salmos 23:1");
      expect(result.text).toBe("1. O Senhor é meu pastor, nada me faltará.");
    });

    it("should fallback to bookId when book lookup returns null", async () => {
      const bookQuery = createMockQuery({ data: null });
      const versionQuery = createMockQuery({ data: null });
      const versesQuery = createMockQuery({
        data: [{ verse_number: 1, text: "Test verse." }],
      });

      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "books") return bookQuery;
          if (table === "bible_versions") return versionQuery;
          if (table === "bible_verses") return versesQuery;
          return createMockQuery();
        }),
      };

      vi.mocked(createServerSupabaseClient).mockResolvedValue(
        mockSupabase as never
      );

      const result = await fetchBiblePassage("42", 1, 1, undefined, "1");

      expect(result.verseReference).toBe("42 1:1");
    });

    it("should reject when fetch takes longer than timeout", async () => {
      vi.useFakeTimers();

      vi.mocked(createServerSupabaseClient).mockReturnValue(
        new Promise(() => {
          // Never resolves — simulates a hung connection
        }) as never
      );

      const resultPromise = fetchBiblePassage("1", 1, 1, undefined, "1");
      await vi.advanceTimersByTimeAsync(6000);

      await expect(resultPromise).rejects.toThrow("timed out");

      vi.useRealTimers();
    });
  });
});
