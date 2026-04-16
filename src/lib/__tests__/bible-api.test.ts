import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase server before importing the module under test
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { fetchBiblePassage } from "../bible-api";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const mockedCreateClient = vi.mocked(createServerSupabaseClient);

function createMockSupabase(overrides: {
  bookData?: { name: string; abbr: string } | null;
  versionData?: { abbr: string } | null;
  versesData?: { verse_number: number; text: string }[] | null;
}) {
  const { bookData = null, versionData = null, versesData = null } = overrides;

  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnValue({ data: versesData }),
    single: vi.fn(),
  };

  // Track which table is being queried to return appropriate data
  let currentTable = "";
  queryBuilder.single.mockImplementation(() => {
    if (currentTable === "books") return { data: bookData };
    if (currentTable === "bible_versions") return { data: versionData };
    return { data: null };
  });

  const mockClient = {
    from: vi.fn((table: string) => {
      currentTable = table;
      return queryBuilder;
    }),
  };

  return { mockClient, queryBuilder };
}

describe("bible-api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchBiblePassage", () => {
    it("should return joined verse text for a verse range", async () => {
      const { mockClient } = createMockSupabase({
        bookData: { name: "Gênesis", abbr: "gn" },
        versionData: { abbr: "nvi" },
        versesData: [
          { verse_number: 1, text: "No princípio, Deus criou os céus e a terra." },
          { verse_number: 2, text: "A terra era sem forma e vazia." },
        ],
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await fetchBiblePassage("1", 1, 1, 2, "1");

      expect(result.text).toBe(
        "1. No princípio, Deus criou os céus e a terra.\n2. A terra era sem forma e vazia.",
      );
      expect(result.verseReference).toBe("Gênesis 1:1-2");
    });

    it("should return single verse text when no verseEnd", async () => {
      const { mockClient } = createMockSupabase({
        bookData: { name: "Salmos", abbr: "sl" },
        versionData: { abbr: "nvi" },
        versesData: [
          { verse_number: 1, text: "O Senhor é meu pastor, nada me faltará." },
        ],
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await fetchBiblePassage("19", 23, 1, undefined, "1");

      expect(result.text).toBe("1. O Senhor é meu pastor, nada me faltará.");
      expect(result.verseReference).toBe("Salmos 23:1");
    });

    it("should return empty text when no verses found", async () => {
      const { mockClient } = createMockSupabase({
        bookData: { name: "Gênesis", abbr: "gn" },
        versionData: { abbr: "nvi" },
        versesData: [],
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await fetchBiblePassage("1", 99, 1, undefined, "1");

      expect(result.text).toBe("");
      expect(result.verseReference).toBe("Gênesis 99:1");
    });

    it("should return empty text when verses is null", async () => {
      const { mockClient } = createMockSupabase({
        bookData: { name: "Gênesis", abbr: "gn" },
        versionData: { abbr: "nvi" },
        versesData: null,
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await fetchBiblePassage("1", 1, 1, undefined, "1");

      expect(result.text).toBe("");
    });

    it("should use bookId as fallback when book lookup returns null", async () => {
      const { mockClient } = createMockSupabase({
        bookData: null,
        versionData: { abbr: "nvi" },
        versesData: [{ verse_number: 1, text: "Test verse." }],
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await fetchBiblePassage("gn", 1, 1, undefined, "1");

      expect(result.verseReference).toBe("gn 1:1");
    });

    it("should use 'nvi' as fallback when version lookup returns null", async () => {
      const { mockClient, queryBuilder } = createMockSupabase({
        bookData: { name: "Gênesis", abbr: "gn" },
        versionData: null,
        versesData: [{ verse_number: 1, text: "Test verse." }],
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      await fetchBiblePassage("1", 1, 1, undefined, "999");

      // Verify that "nvi" fallback was used in the query
      const eqCalls = queryBuilder.eq.mock.calls as [string, unknown][];
      const versionEqCall = eqCalls.find(
        (call) => call[0] === "version",
      );
      expect(versionEqCall).toBeDefined();
      expect(versionEqCall![1]).toBe("nvi");
    });

    it("should format verse reference with range when verseEnd is provided", async () => {
      const { mockClient } = createMockSupabase({
        bookData: { name: "João", abbr: "jo" },
        versionData: { abbr: "acf" },
        versesData: [
          { verse_number: 16, text: "Porque Deus amou o mundo." },
          { verse_number: 17, text: "Porque Deus enviou o seu Filho." },
        ],
      });
      mockedCreateClient.mockResolvedValue(mockClient as never);

      const result = await fetchBiblePassage("43", 3, 16, 17, "2");

      expect(result.verseReference).toBe("João 3:16-17");
    });
  });
});
