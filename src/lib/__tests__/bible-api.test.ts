import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchBiblePassage } from "../bible-api";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { createServerSupabaseClient } from "@/lib/supabase/server";

function createMockSupabase(
  bookData: unknown,
  versionData: unknown,
  versesData: unknown,
) {
  const fromMock = vi.fn().mockImplementation((table: string) => {
    // Each call to from() returns a fresh chainable query builder
    // that is also a thenable (so `await query` works).
    let resolvedData: unknown;

    if (table === "books") {
      resolvedData = bookData;
    } else if (table === "bible_versions") {
      resolvedData = versionData;
    } else {
      resolvedData = versesData;
    }

    const needsSingle = table === "books" || table === "bible_versions";

    const builder: Record<string, unknown> = {};
    const chainMethods = ["select", "eq", "gte", "lte", "order"];
    for (const m of chainMethods) {
      builder[m] = vi.fn().mockReturnValue(builder);
    }
    if (needsSingle) {
      builder.single = vi
        .fn()
        .mockResolvedValue({ data: resolvedData });
    }
    // Make the builder itself thenable so `const { data } = await query` works
    builder.then = (
      onFulfilled?: (v: unknown) => unknown,
      onRejected?: (e: unknown) => unknown,
    ) =>
      Promise.resolve({ data: resolvedData }).then(onFulfilled, onRejected);

    return builder;
  });

  return { from: fromMock };
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
          {
            verse_number: 1,
            text: "No princípio, Deus criou os céus e a terra.",
          },
          { verse_number: 2, text: "A terra era sem forma e vazia." },
        ],
      );
      vi.mocked(createServerSupabaseClient).mockResolvedValue(
        mockSupabase as never,
      );

      const result = await fetchBiblePassage("1", 1, 1, 2, "1");

      expect(result.text).toBe(
        "1. No princípio, Deus criou os céus e a terra.\n2. A terra era sem forma e vazia.",
      );
      expect(result.verseReference).toBe("Gênesis 1:1-2");
    });

    it("should return single verse text when no verseEnd provided", async () => {
      const mockSupabase = createMockSupabase(
        { name: "Salmos", abbr: "sl" },
        { abbr: "nvi" },
        [
          {
            verse_number: 1,
            text: "O Senhor é meu pastor, nada me faltará.",
          },
        ],
      );
      vi.mocked(createServerSupabaseClient).mockResolvedValue(
        mockSupabase as never,
      );

      const result = await fetchBiblePassage("19", 23, 1, undefined, "1");

      expect(result.text).toBe(
        "1. O Senhor é meu pastor, nada me faltará.",
      );
      expect(result.verseReference).toBe("Salmos 23:1");
    });

    it("should return empty text when no verses found", async () => {
      const mockSupabase = createMockSupabase(
        { name: "Gênesis", abbr: "gn" },
        { abbr: "nvi" },
        [],
      );
      vi.mocked(createServerSupabaseClient).mockResolvedValue(
        mockSupabase as never,
      );

      const result = await fetchBiblePassage("1", 99, 1, undefined, "1");

      expect(result.text).toBe("");
      expect(result.verseReference).toBe("Gênesis 99:1");
    });

    it("should return empty text when verses data is null", async () => {
      const mockSupabase = createMockSupabase(
        { name: "Gênesis", abbr: "gn" },
        { abbr: "nvi" },
        null,
      );
      vi.mocked(createServerSupabaseClient).mockResolvedValue(
        mockSupabase as never,
      );

      const result = await fetchBiblePassage("1", 1, 1, undefined, "1");

      expect(result.text).toBe("");
    });

    it("should use bookId as fallback when book lookup returns null", async () => {
      const mockSupabase = createMockSupabase(null, { abbr: "nvi" }, [
        { verse_number: 1, text: "Test verse." },
      ]);
      vi.mocked(createServerSupabaseClient).mockResolvedValue(
        mockSupabase as never,
      );

      const result = await fetchBiblePassage("gn", 1, 1, undefined, "1");

      expect(result.verseReference).toBe("gn 1:1");
    });

    it("should format verse reference with range when verseEnd is provided", async () => {
      const mockSupabase = createMockSupabase(
        { name: "João", abbr: "jo" },
        { abbr: "acf" },
        [
          { verse_number: 16, text: "Porque Deus amou o mundo." },
          { verse_number: 17, text: "Porque Deus enviou o seu Filho." },
        ],
      );
      vi.mocked(createServerSupabaseClient).mockResolvedValue(
        mockSupabase as never,
      );

      const result = await fetchBiblePassage("43", 3, 16, 17, "2");

      expect(result.verseReference).toBe("João 3:16-17");
    });

    it("should reject when fetch takes too long (timeout)", async () => {
      vi.useFakeTimers();

      vi.mocked(createServerSupabaseClient).mockImplementation(
        () => new Promise(() => {}), // never resolves
      );

      const resultPromise = fetchBiblePassage("1", 1, 1, undefined, "1");
      await vi.advanceTimersByTimeAsync(6000);

      await expect(resultPromise).rejects.toThrow("timed out");

      vi.useRealTimers();
    });
  });
});
