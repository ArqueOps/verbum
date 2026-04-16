import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockLte = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();

vi.hoisted(() => {
  // Reset mocks before module resolution
});

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() =>
    Promise.resolve({
      from: mockFrom,
    }),
  ),
}));

import { fetchBiblePassage } from "../bible-api";

describe("bible-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchBiblePassage", () => {
    it("should return joined verse text for a valid passage", async () => {
      const verses = [
        { verse_number: 1, text: "No princípio, Deus criou os céus e a terra." },
        { verse_number: 2, text: "A terra era sem forma e vazia." },
      ];

      // Book lookup
      const bookResult = { data: { name: "Gênesis", abbr: "gn" } };
      // Version lookup
      const versionResult = { data: { abbr: "nvi" } };
      // Verses query
      const versesResult = { data: verses };

      mockSingle
        .mockResolvedValueOnce(bookResult)
        .mockResolvedValueOnce(versionResult);
      mockOrder.mockResolvedValueOnce(versesResult);
      mockLte.mockReturnValue({ order: mockOrder });
      mockGte.mockReturnValue({ lte: mockLte, eq: mockEq });
      mockEq.mockReturnValue({
        eq: mockEq,
        gte: mockGte,
        single: mockSingle,
        order: mockOrder,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
        single: mockSingle,
      });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await fetchBiblePassage("1", 1, 1, 2, "1");

      expect(result.verseReference).toBe("Gênesis 1:1-2");
      expect(result.text).toContain("No princípio");
      expect(result.text).toContain("A terra era sem forma");
    });

    it("should return empty text when no verses found", async () => {
      const bookResult = { data: { name: "Gênesis", abbr: "gn" } };
      const versionResult = { data: { abbr: "nvi" } };
      const versesResult = { data: [] };

      mockSingle
        .mockResolvedValueOnce(bookResult)
        .mockResolvedValueOnce(versionResult);
      mockOrder.mockResolvedValueOnce(versesResult);
      mockLte.mockReturnValue({ order: mockOrder });
      mockGte.mockReturnValue({ lte: mockLte, eq: mockEq });
      mockEq.mockReturnValue({
        eq: mockEq,
        gte: mockGte,
        single: mockSingle,
        order: mockOrder,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
        single: mockSingle,
      });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await fetchBiblePassage("1", 1, 1, undefined, "1");

      expect(result.text).toBe("");
      expect(result.verseReference).toBe("Gênesis 1:1");
    });

    it("should format single verse reference without dash", async () => {
      const bookResult = { data: { name: "Salmos", abbr: "sl" } };
      const versionResult = { data: { abbr: "acf" } };
      const versesResult = {
        data: [{ verse_number: 1, text: "O Senhor é meu pastor, nada me faltará." }],
      };

      mockSingle
        .mockResolvedValueOnce(bookResult)
        .mockResolvedValueOnce(versionResult);
      mockOrder.mockResolvedValueOnce(versesResult);
      mockGte.mockReturnValue({ eq: mockEq, order: mockOrder });
      mockEq.mockReturnValue({
        eq: mockEq,
        gte: mockGte,
        single: mockSingle,
        order: mockOrder,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
        single: mockSingle,
      });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await fetchBiblePassage("19", 23, 1, undefined, "2");

      expect(result.verseReference).toBe("Salmos 23:1");
      expect(result.text).toContain("O Senhor é meu pastor");
    });
  });
});
